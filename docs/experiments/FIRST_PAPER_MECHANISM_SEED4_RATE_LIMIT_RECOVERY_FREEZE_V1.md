# Seed-4 rate-limit recovery freeze V1

Status: frozen after Batch B rate-limit failure and before any recovery call.

Batch B produced complete artifacts for tasks 37, 40–49 except 38. Task 38
failed strict parsing and is not eligible for recovery. Tasks 50–65 failed
after the provider began returning `provider_rate_limit`; these failures and
the original Batch-B manifest remain authoritative and are never overwritten.

This secondary recovery stratum reruns complete blocks for exactly tasks
50–65 with seed 4, the already frozen arm order, prompts, parsers, model and
truth firewall. It contains 59 agent positions, 413 planned calls, a planning
estimate of 793,800 tokens, and a 900,000-token hard stop. The first
`provider_rate_limit`, unknown usage, identity failure, or token stop halts the
entire recovery stratum. There is no retry inside this identity.

Recovered rows cannot replace original Batch-B failures in the primary
missing-data accounting. They may be used in a separately labelled recovery
sensitivity analysis and in a full-seed descriptive reconstruction whose
provenance explicitly identifies the provider/time batch. Task 38 and the
Batch-A parser failures remain missing. No outcome value was used to select
the recovery roster.
