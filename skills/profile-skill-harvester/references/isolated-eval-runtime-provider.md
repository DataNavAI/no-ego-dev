# Isolated Eval Runtime Provider Selection

Use this when a production eval runner creates a temporary `HERMES_HOME` and invokes real Hermes one-shot agent and judge runs.

## Problem class

An isolated distribution profile can contain valid skills/eval config while its checked-in default model is not authenticated on the executing machine. Copying only `auth.json` or `.env` is insufficient when the isolated `config.yaml` still selects another provider. Conversely, copying the entire live runtime config contaminates the eval with unrelated tool, gateway, path, or profile settings and may copy secrets.

## Safe overlay

1. Copy the distribution into the isolated profile first.
2. Resolve the credential source from an explicit `HERMES_EVAL_CREDENTIAL_HOME`, otherwise the active `HERMES_HOME`, otherwise the user's normal Hermes home.
3. Copy only the required runtime credential files into the non-repository run directory.
4. Parse source and isolated YAML. Overlay only non-secret model selector fields needed for the authenticated runtime, normally:
   - `model.default`
   - `model.provider`
   - `model.base_url` when it contains no embedded username/password
5. Preserve the distribution's agent, toolset, terminal, gateway, and product behavior configuration.
6. Never import API-key, token, password, cookie, client-secret, or arbitrary provider dictionaries from config. Provider credentials remain in the dedicated copied auth files or environment.
7. Set the isolated `HERMES_HOME` only after the copy/overlay is complete.

If either `model.default` or `model.provider` is missing or malformed, fail closed or retain the distribution model and surface the prerequisite; do not guess a provider.

## Diagnostic triage

When the real smoke reports `No LLM provider configured` even though credential files were copied, diagnose selector delivery before authentication:

1. inspect the generated isolated `config.yaml`, not the controller config;
2. confirm the overlay function actually ran after distribution copy and before setting `HERMES_HOME`;
3. compare only `model.default`, `model.provider`, and the permitted `model.base_url` against the credential source;
4. rerun both the fake argument-capture test and the real agent+judge smoke.

Do not treat a merged prerequisite PR or a passing fake-command test as proof that the current remote-default runner performs this overlay. Re-run the smoke from the freshly fetched remote-default worktree and reconcile any old continuation marker against live PR and merge state.

## Regression coverage

Use a disposable credential home containing:

- a distinct model/provider/base URL;
- a deliberately different unrelated setting such as `agent.max_turns`;
- fake credential bytes.

Run the eval with a fake Hermes one-shot command, then assert:

- the isolated model selector matches the runtime source;
- unrelated runtime settings did not replace distribution settings;
- credential files exist only under the isolated run directory;
- a base URL containing userinfo does not propagate;
- evaluated-agent and judge prompts both still receive fixture text literally.

Then run one real low-cost semantic smoke eval. A YAML load, prompt-file assertion, or fake command proves wiring but not provider operation. Require the real agent and judge to return successfully before publishing fixture-dependent skill updates.

Store all eval outputs outside git repositories and remove generated `__pycache__`/`.pyc` artifacts from publishable package trees after Python validation.
