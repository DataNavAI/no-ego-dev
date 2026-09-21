# Checkpoint-preserving decomposition

Use when a user asks for smaller workers after a large issue has accumulated a draft implementation checkpoint.

1. Freeze and read the actual latest draft SHA, PR TODO/check evidence, and source before splitting. Historical audits describe their own SHA and are not reset instructions.
2. Search open and closed canonical issues before creating children. Reuse an issue when its acceptance already covers the remaining outcome; preserve its history and append current scope.
3. Keep the cumulative draft as integration target. Child drafts fork the frozen SHA, incorporate only verified prerequisite integration commits, record effective bases, and target the integration branch.
4. Give shared runtime, browser boot, manifests, and infrastructure composition to one integrator. Child-specific tests may use real factories, but concurrent workers must not edit shared journey tests.
5. Prefer serial scheduling when contracts or shared artifacts couple outcomes. Authorization for multiple workers does not require concurrent writers.
6. Distinguish child implementation acceptance from final integration, real-provider, release, and production acceptance. Child approval never substitutes for fresh whole-candidate review against current main.
7. Re-read every issue mutation, dependency, priority, milestone, retained PR SHA/body, and clean worktree before claiming preservation.
