# Durable controller authority

## Single authority

Pin one controller and exact Kanban board ID. Hooks and cron produce bounded wakes; they do not own dispatch truth. A controller tick reconciles issue/task/run, installed prompt, worker claim, PR, and dependency state before dispatch.

## Worker ownership

A claimed worker owns its candidate until terminal artifact readback. The controller does not race it, refill its slot blindly, or mutate its frozen target. An early draft PR is the durable checkpoint and is resumed after interruption.

## Convergence

Parallelize independent work. Declare sequential focus only for an explicit owner preference or overlap/dependency constraint. Merge overlapping PRs in dependency order, refresh remaining bases, and obtain final current-base/current-head approval for the aggregate.

GUI-dependent acceptance requires rendered and interactive readiness evidence, not process liveness alone.
