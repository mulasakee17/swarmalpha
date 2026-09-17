# GLM-4.6V Seed-1 Random-Repetition Result

Date: 2026-08-21

Status: completed, replay-verified, frozen analysis verified

Role: second-paper stochastic-robustness evidence; does not amend the frozen first paper

## 1. Claim boundary

**FACT.** Seed 0 was inspected before the seed-1 protocol was frozen. Seed 1 is therefore a prospectively specified random repetition after the seed-0 result, not an additional run from the original seed-0 preregistration. The standalone seed-1 decision rule was frozen before any formal seed-1 provider call.

**SUPPORTED INTERPRETATION.** The implemented ATTACKS-versus-CONTROL same-state fork effect is robust to one additional GLM-4.6V random realization on the same 44-task HiddenBench population.

**NOT ESTABLISHED.** These two seeds do not establish new task-family generalization, broad model generality, a truth-blind detector, or universal benefit on every task.

## 2. Execution and identity audit

- Requested model: `glm-4.6v` through the official Zhipu chat-completions endpoint.
- Server-returned model: `glm-4.6v` on all 803 finished formal attempts.
- Server request identifiers: 803 present and 803 unique.
- Planned tasks: 44; completed: 39; failed: 5; skipped: 0.
- Physical attempts: 803 started and 803 finished; no retry or resend.
- Gross API-reported usage: 1,088,883 tokens.
  - prompt: 921,583
  - completion: 167,300
  - provider-reported cached prompt: 117,380
- Unknown usage: 0.
- Formal wall time: 2026-08-21T06:13:03.056Z through 2026-08-21T07:38:25.459Z.
- Directory replay: `verified`.
- Frozen analysis hash: `sha256:c21cb34f44d8a8497991447964eeefc31adecaa6b28b6393fcf89160e6fa563f`.

The server-returned model field closes the model-identity gap present in the seed-0 ledger. It directly shows that the seed-1 requests were served under the `glm-4.6v` identifier rather than merely carrying that client-side label.

## 3. Standalone seed-1 primary result

For 39 complete task pairs:

```text
mean[ATTACKS final Brier - CONTROL final Brier] = -0.5049933245
95% task-bootstrap CI = [-0.6708253846, -0.3421857835]
classification = PASS
```

The all-44 missingness sensitivity bound assigns every incomplete task an unidentified contrast in `[-2,+2]`:

```text
lower bound = -0.6748804467
upper bound = -0.2203349921
```

Even the maximally unfavorable assignment to all five failed tasks leaves the all-task mean below zero. This does not recover their unidentified effects; it shows that their mathematically worst possible values cannot reverse the favorable aggregate direction.

Task-level signs among the 39 complete pairs:

- 31 favorable (`delta < 0`)
- 2 null
- 6 unfavorable (`delta > 0`)

The intervention remains a targeted rescue rather than a universal booster.

## 4. Frozen secondary results

- Paired accuracy difference: `+0.4615384615`, 95% task-bootstrap CI `[+0.2820512821, +0.6410256410]`.
- Accuracy rescues: 19; accuracy harms: 1; both correct: 11; both wrong: 8.
- Spearman association between offline round-1 Brier and task effect: `rho=-0.3381273629`, CI `[-0.6427054352, +0.0110676770]`.
- Frozen severity bins:
  - `<0.3`: n=5, mean delta `-0.1207222222`
  - `0.3-1.0`: n=22, mean delta `-0.4755428220`
  - `>1.0`: n=12, mean delta `-0.7190988716`

**INFERENCE.** The point estimates again fit the targeted-rescue account: the largest mean improvement occurs in the worst pre-treatment severity bin. The seed-1 severity-gradient interval narrowly includes zero, so this mechanism pattern is secondary evidence rather than a separately confirmed claim.

## 5. Cross-seed descriptive robustness

Seed-level standalone results:

| Seed | complete / planned | mean delta | 95% CI | worst-case upper bound | classification |
|---|---:|---:|---:|---:|---|
| 0 | 39 / 44 | -0.493741 | [-0.639215, -0.347097] | -0.210362 | PASS |
| 1 | 39 / 44 | -0.504993 | [-0.670825, -0.342186] | -0.220335 | PASS |

The seed means differ by approximately `0.01125` Brier units. Across the 38 tasks complete in both seeds:

- Spearman correlation of task effects: `0.7704523793`.
- Both seeds favorable: 28 tasks.
- Exact sign agreement, counting negative/zero/positive separately: 30 of 38.
- At least one seed unfavorable: 6 tasks.

These are prospectively declared descriptive cross-seed comparisons, not a replacement confirmatory estimator. They show strong task-effect ordering stability while retaining real task-level stochastic variation.

## 6. Failed tasks and facility limitation

Seed-1 failed tasks:

- task 17: final `invalid_belief_value`
- task 25: final `invalid_belief_value`
- task 38: final `invalid_belief_value`
- task 47: round-2 `evidence_shape`
- task 53: round-1 `belief_shape`

Tasks 17, 25, 38, and 53 also failed under seed 0. Task 26 failed only under seed 0; task 47 failed only under seed 1. The four-task overlap indicates a stable model-instrument compatibility weakness for part of the task population. Strict qualification prevents malformed reports from entering the effect estimate, but the missing effects remain unidentified and must continue to be disclosed.

## 7. Post-run mechanical analysis fix

The seed-1 directory replay and provider-identity audit passed before effect analysis. The frozen analyzer then failed closed before reading any effect because its population validator contained the historical literal `row.seed !== 0` instead of validating rows against the single seed stored in the frozen plan.

The only post-run code correction replaced that literal with equality to `input.plan.seeds[0]` and added a gate requiring exactly one integer seed. It did not alter task inclusion, outcomes, estimand, missingness, bootstrap seed or repetitions, confidence interval, severity bins, or decision thresholds.

Verification after the fix:

- 23 focused V3/V4 analysis tests passed, including a new seed-1 acceptance and mismatch-rejection test.
- The original seed-0 analysis reverified with its unchanged hash `sha256:5f2c86b1cbf7b945be227373b9d0c1f98912aaa361c042c063aee85babacdc8e`.
- The seed-1 analysis generated once and reverified with hash `sha256:c21cb34f44d8a8497991447964eeefc31adecaa6b28b6393fcf89160e6fa563f`.

This is a disclosed mechanical generalization of the population gate, not an outcome-responsive analytical change.

## 8. Stopped pre-run identities

- Seed1-V1: zero provider calls; stopped because an obsolete pre-seed-0 token estimate exceeded its feasibility gate.
- Seed1-V2: one sandbox-blocked network attempt with unknown usage and no scientific output; stopped without retry.
- Seed1-V3: final completed identity reported above.

Neither stopped identity contributes to any scientific estimate.

## 9. Paper allocation

The first paper remains frozen. Seed 1 should accompany seed 0 as separately frozen stochastic-robustness evidence in the second-paper program or, if needed during review, as an explicitly post-seed-0 supplemental replication. The next scientific bottleneck remains pre-action truth-blind identification of rescue opportunities; additional same-model seeds have lower marginal paper value than validating that detector.
