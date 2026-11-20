# Synthetic Docker workflow

The entry point is `workflows/task-management/EVAL.yaml`; run instructions are in
`workflows/task-management/README.md`. This directory contains the skill's
self-contained scenario, isolated configuration setup and post-agent verifier.
Setup does not seed goals or tasks. The evaluated agent must create them through
NED CLI. The verifier independently reads them back through the installed CLI.

`verify.py` intentionally invokes the absolute `/usr/local/bin/ned` executable
with argv-only fixed command verbs and record IDs as data, never a shell. Its
narrow Ruff S603 exception covers this trusted command boundary, not arbitrary
subprocess execution. Reports contain bounded state summaries and readback hashes,
not host credentials or full private runtime databases.
