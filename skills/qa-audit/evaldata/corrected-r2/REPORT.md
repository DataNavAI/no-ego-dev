# QA report: synthetic calculator
Run:audit-fixture Revision:r2
Target:fixture:calculator-v1 Environment:synthetic CLI
Executor:fixture-author (historical synthetic evidence, not a live execution claim)
Time:2026-10-19T12:00:00Z through12:00:01Z
Selected inventory:cases.md
Scope:two CLI cases; no real product/release certification.
Status:FAIL
Counts:PASS 1;FAIL 1;BLOCKED0;NOT RUN0.

C1 PASS: calc --help; expected syntax and exit0; observed syntax and exit0; evidence HELP.
C2 FAIL: calc sum -2 1; expected -1 exit0; observed 3 and assertion exit1; evidence SUM.
Screenshots:inapplicable; selected cases are CLI-only.
Prior QA-AUD-001:RESOLVED; C2 corrected from PASS to FAIL; original overclaim/r1 retained in sibling bundle.
Cleanup:no processes started by audit; retain all supplied historical fixtures.
