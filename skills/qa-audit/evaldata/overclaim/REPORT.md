# QA report: synthetic calculator
Run:audit-fixture Revision:r1
Target:fixture:calculator-v1 Environment:synthetic CLI
Executor:fixture-author (historical synthetic evidence, not a live execution claim)
Time:2026-10-19T12:00:00Z through12:00:01Z
Selected inventory:cases.md
Scope:two CLI cases; no real product/release certification.
Status:PASS
Counts:PASS 2;FAIL 0;BLOCKED0;NOT RUN0.

C1 PASS: calc --help; expected syntax and exit0; observed syntax and exit0; evidence HELP.
C2 PASS: calc sum -2 1; expected -1 exit0; observed -1 exit0; evidence SUM.
Screenshots:inapplicable; selected cases are CLI-only.
Cleanup:no processes started by audit; retain all supplied historical fixtures.
