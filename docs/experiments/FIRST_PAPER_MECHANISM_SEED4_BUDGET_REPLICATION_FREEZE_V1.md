# Mechanism seed-4 budget replication freeze V1

Status: frozen before any seed-4 provider call. Date: 2026-08-23.

Seed 3 has already been observed: on 40 complete tasks M1 was -0.126, M2 was
-0.405, and M3 was -0.531. This new run is therefore a confirmatory replication,
not an unobserved primary experiment. It does not replace or modify seed 3.

The available provider budget is 1,000,000 tokens, below the 1,748,143 tokens
observed for the 44-task seed-3 run. Seed 4 is split before execution at complete
task boundaries using only the original frozen roster order and the prior
planning rate of 1,800 tokens per logical call.

Batch A contains the longest roster prefix whose planned cost is at most
900,000 tokens: tasks 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 29, 30,
31, 34, 35, and 36. These 18 tasks contain 70 agent positions and 490 planned
calls, for 882,000 planned tokens. The observed seed-3 rate gives a non-binding
point estimate of about 744,000 tokens. The hard observed-usage stop is 900,000.

Batch B is predeclared, not selected later: tasks 37, 38, 40, 41, 42, 43, 44,
46, 47, 48, 49, 50, 51, 52, 53, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, and
65. If funded later, it must use a new output identity and report provider/time
batch separately. No task may be resumed after a partial failure.

All scientific facilities remain unchanged: GLM-4.6V, thinking disabled,
discussion/final limits 768/256, one physical attempt, concurrency one, strict
parsers, fresh Round 1, identical-state three-arm fork, and offline truth only.
Seed is 4. Arm order is shifted by one rotation relative to the seed-3 schedule
to reduce repeated position confounding. No paid canary is repeated because the
model, prompts, parsers, provider adapter, and task core already passed the
seed-3 canary and 1,155-call formal execution; only seed and schedule change.

Batch-A outcomes are reported independently. The confirmatory questions are
whether M1, M2, and M3 retain their negative direction and whether the
wrong-Round-1 rescue pattern recurs. Seed-3 and seed-4 estimates must be shown
side by side. A later combined estimate may average seed-specific deltas within
tasks complete in both seeds and bootstrap tasks; it must not treat task-seed
rows as independent. Failure and missing bounds remain mandatory. No further
seed is authorized in this contract.
