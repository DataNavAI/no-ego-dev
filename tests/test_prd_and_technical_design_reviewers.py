from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def read_skill(name: str) -> str:
    return (ROOT / "skills" / name / "SKILL.md").read_text(encoding="utf-8")


def test_prd_reviewer_is_fresh_leaf_only_and_has_context_firewall():
    skill = read_skill("prd-reviewer")
    evaluation = yaml.safe_load(
        (ROOT / "skills" / "prd-reviewer" / "EVAL.yaml").read_text(encoding="utf-8")
    )

    for marker in (
        "version: 0.1.0",
        "review-only leaf-subagent skill",
        "fresh delegated leaf subagent",
        "REVIEW_DELEGATION_REQUIRED",
        "self-review is not a fallback",
        "The orchestrator must not draft findings",
        "private scratchpad, chain-of-thought, hidden agent transcript",
        "desired verdict",
        "Never substitute a parent-written summary for the exact PRD",
        "must not edit the PRD",
    ):
        assert marker in skill

    expectations = "\n".join(evaluation["expectations"])
    fixture = (ROOT / "skills" / "prd-reviewer" / "evaldata" / "README.md").read_text(
        encoding="utf-8"
    )
    assert "fresh delegated leaf subagent" in expectations
    assert "without private author scratchpads hidden transcripts desired verdicts" in expectations
    assert "negative author or orchestrator invocation returns REVIEW_DELEGATION_REQUIRED" in expectations
    assert "Negative context-firewall scenario" in fixture
    assert "must not produce findings, satisfaction boosters, or an approval verdict" in fixture
    assert "unavailable delegation cannot be waived" in fixture


def test_prd_reviewer_centers_problem_ease_satisfaction_and_base_product_fit():
    skill = read_skill("prd-reviewer")
    fixture = (ROOT / "skills" / "prd-reviewer" / "evaldata" / "README.md").read_text(
        encoding="utf-8"
    )

    for marker in (
        "target-user pain → user action/product behavior → intermediate state → resolved outcome → observable evidence",
        "smallest understandable effort",
        "Prefer removing a step or reusing an existing interaction",
        "### 5. Satisfaction and confidence",
        "Satisfaction boosters",
        "zero to three evidence-grounded improvements",
        "Do not recommend decorative gamification, dark patterns",
        "outcome completion/time/failure/recovery data",
        "### 6. Base-product coherence and complexity budget",
        "Can the problem be solved by simplifying, extending, or making an existing capability discoverable?",
        "second source of truth, duplicate workflow, parallel settings surface",
        "Merge/remove/migrate/deprecate",
        "Base-product fit",
        "Outcome and satisfaction verification gaps",
    ):
        assert marker in skill

    for marker in (
        "existing dashboard/checklist/task drawer can be simplified or extended",
        "duplicate source-of-truth risk",
        "confidence/relief/control",
        "not animation alone",
        "time-to-value",
    ):
        assert marker in fixture


def test_technical_design_reviewer_is_fresh_leaf_only_and_reviews_integrity_simplicity():
    skill = read_skill("technical-design-reviewer")
    evaluation = yaml.safe_load(
        (ROOT / "skills" / "technical-design-reviewer" / "EVAL.yaml").read_text(
            encoding="utf-8"
        )
    )

    for marker in (
        "review-only leaf-subagent skill",
        "fresh delegated leaf subagent",
        "REVIEW_DELEGATION_REQUIRED",
        "self-review is not an acceptable fallback",
        "private author scratchpads, chain-of-thought, hidden transcripts",
        "### 2. Integrity",
        "Every material failure mode needs an observable state, bounded response, owner, and recovery path",
        "### 3. Simplest sustainable solution",
        "Start by trying to remove the proposed solution",
        "Can existing code, interfaces, storage, jobs, queues, providers, configuration, monitoring, or runbooks solve this",
        "Complexity and redundancy ledger",
        "fewest concepts and dependencies that satisfy integrity, automatic testability, and operability",
    ):
        assert marker in skill

    expectations = "\n".join(evaluation["expectations"])
    fixture = (
        ROOT / "skills" / "technical-design-reviewer" / "evaldata" / "README.md"
    ).read_text(encoding="utf-8")
    assert "fresh delegated leaf subagent" in expectations
    assert "simplest viable solution" in expectations
    assert "complexity and redundancy ledger" in expectations
    assert "negative architect implementer or orchestrator invocation returns REVIEW_DELEGATION_REQUIRED" in expectations
    assert "Negative context-firewall scenario" in fixture
    assert "must not produce technical findings or an approval verdict" in fixture
    assert "unavailable delegation cannot be waived" in fixture


def test_technical_design_reviewer_requires_automatic_tests_and_testable_operations():
    skill = read_skill("technical-design-reviewer")
    fixture = (
        ROOT / "skills" / "technical-design-reviewer" / "evaldata" / "README.md"
    ).read_text(encoding="utf-8")

    for marker in (
        "### 4. Automatic testability",
        "without relying on an agent's prose judgment or routine manual inspection",
        "contract/schema tests",
        "migration/backfill compatibility, retry/idempotency, concurrency, timeout, and failure-injection tests",
        "release smoke/synthetic checks",
        "mocks that prove only the mock",
        "### 5. Operability and self-monitoring",
        "telemetry self-checks so missing metrics/logs/alerts fail closed",
        "Monitoring must be testable",
        "simulated faults prove alerts and recovery",
        "Automatic testability matrix",
        "Operability/self-monitoring matrix",
    ):
        assert marker in skill

    for marker in (
        "smaller viable alternative",
        "extend the monolith's existing task-ranking module",
        "automated testability matrix",
        "telemetry self-checks",
        "duplicated state",
    ):
        assert marker in fixture


def test_product_manager_and_architect_delegate_to_canonical_review_skills():
    product = read_skill("product-manager")
    architect = read_skill("architect")

    for marker in (
        "version: 0.4.0",
        "All PRD review judgment must be produced by a fresh delegated leaf subagent",
        "loads and uses `prd-reviewer`",
        "role=\"leaf\"",
        "must not perform the review, draft/supplement findings, or infer approval",
        "private scratchpad, chain-of-thought, hidden transcript",
        "Base-product fit",
        "Satisfaction boosters",
    ):
        assert marker in product

    for marker in (
        "version: 0.3.0",
        "All technical-design and tech-spec review judgment must be produced by a fresh delegated leaf subagent",
        "loads and uses `technical-design-reviewer`",
        "role=\"leaf\"",
        "must not perform the review, draft/supplement findings, or infer approval",
        "private scratchpads, chain-of-thought, hidden transcripts",
        "Complexity and redundancy ledger",
        "Automatic testability matrix",
        "Operability/self-monitoring matrix",
    ):
        assert marker in architect

    product_gate = product.split("## Independent PRD Review and Revision Gate", 1)[1].split(
        "## Human PRD Review Presentation Gate", 1
    )[0]
    architect_gate = architect.split(
        "## Independent Technical Review and Revision Gate", 1
    )[1].split("## Human Tech-Spec Review Presentation Gate", 1)[0]

    product_call = product_gate.split("```python", 1)[1].split("```", 1)[0]
    architect_call = architect_gate.split("```python", 1)[1].split("```", 1)[0]
    assert "`prd-reviewer` skill" in product_call
    assert 'role="leaf"' in product_call
    assert "background=" not in product_call
    assert "`technical-design-reviewer` skill" in architect_call
    assert 'role="leaf"' in architect_call
    assert "background=" not in architect_call

    for gate in (product_gate, architect_gate):
        assert "single-task `delegate_task` dispatch is automatically background" in gate
        assert "deprecated `background` argument is ignored" in gate
        assert "unavailable delegation" in gate
        assert "pending/missing/malformed review" in gate
        assert "revision mismatch" in gate
        assert "unresolved `BLOCKER`/`HIGH` findings" in gate
        assert "until this gate passes or the user explicitly accepts" not in gate
        assert "toolsets=[" not in gate


def test_integrated_eval_and_fixtures_lock_fresh_reviewer_behavior():
    product_eval = yaml.safe_load(
        (ROOT / "skills" / "product-manager" / "EVAL.yaml").read_text(encoding="utf-8")
    )
    architect_eval = yaml.safe_load(
        (ROOT / "skills" / "architect" / "EVAL.yaml").read_text(encoding="utf-8")
    )
    product_fixture = (
        ROOT / "skills" / "product-manager" / "evaldata" / "README.md"
    ).read_text(encoding="utf-8")
    architect_fixture = (ROOT / "skills" / "architect" / "evaldata" / "README.md").read_text(
        encoding="utf-8"
    )

    product_expectations = "\n".join(product_eval["expectations"])
    architect_expectations = "\n".join(architect_eval["expectations"])

    assert "fresh leaf subagent that loads prd-reviewer" in product_expectations
    assert "automatically background delegate_task lifecycle without the deprecated background argument" in product_expectations
    assert "never lets user residual risk acceptance substitute for unavailable delegation" in product_expectations
    assert "end of journey satisfaction" in product_expectations
    assert "duplicate workflows sources of truth" in product_expectations
    assert "fresh leaf subagent that loads technical-design-reviewer" in architect_expectations
    assert "automatically background delegate_task lifecycle without the deprecated background argument" in architect_expectations
    assert "never lets user residual risk acceptance substitute for unavailable delegation" in architect_expectations
    assert "simplest viable solution" in architect_expectations
    assert "telemetry alerts faults and recovery are themselves testable" in architect_expectations

    assert "fresh leaf subagent that loads and uses `prd-reviewer`" in product_fixture
    assert "base-product" in product_fixture
    assert "fresh leaf subagent that loads and uses `technical-design-reviewer`" in architect_fixture
    assert "complexity/redundancy ledger" in architect_fixture
