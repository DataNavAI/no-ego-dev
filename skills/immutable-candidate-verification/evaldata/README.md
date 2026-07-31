# Immutable candidate verification eval fixture

The fixture models a sequential software task that appears green but has incomplete and stale independent-review evidence. A late reviewer examined an older commit, another timed out after attempting to write a durable report, and an evidence correction created a new final SHA.

A passing response must keep process state, tests, artifacts, and authorization separate. It should preserve TDD evidence, prepare exact scope, freeze one clean commit, verify any recovered report and checksum, and obtain every required verdict at that final identity. Any later edit invalidates prior approvals, and the next task remains blocked until the immutable gate is complete.
