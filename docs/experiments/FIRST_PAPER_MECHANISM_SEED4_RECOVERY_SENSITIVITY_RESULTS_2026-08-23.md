# Seed-4 mechanism recovery sensitivity results

Status: completed post-hoc secondary sensitivity analysis. Date: 2026-08-23.

## 1. Evidence status

**FACT** — The original seed-4 Batch A and Batch B artifacts remain the primary
acquisition record. They contain 26 complete tasks, 18 failed tasks, 786
physical attempts, and 1,129,644 observed tokens. No recovery row replaces an
original failure in this accounting.

**FACT** — The separately frozen recovery stratum was eligible only for the 15
Batch-B tasks whose original failure code was `provider_rate_limit`: 50, 51,
52, 53, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, and 65. It recovered 14 tasks.
Task 53 failed strict final parsing with `invalid_belief_value`. The stratum
used 394 physical attempts and 603,948 observed tokens, had no provider errors,
and passed manifest verification.

**DESIGN STATUS** — Results that append those 14 later-acquired rows are
labelled recovery sensitivity or descriptive reconstruction. They are not a
retroactive completion of the primary Batch-B acquisition.

## 2. Estimands

All contrasts are paired within task and use multiclass Brier loss; negative
values favor the intervention named second below:

- M1 = `ATTACKS_LABELED - ATTACKS_NEUTRAL`, the incremental label/frame effect.
- M2 = `ATTACKS_NEUTRAL - CONTROL`, the structured evidence re-exposure effect.
- M3 = `ATTACKS_LABELED - CONTROL`, the full labelled-treatment effect.

Confidence intervals are the frozen 10,000-draw task bootstrap. Cross-seed
summaries first average seed-specific deltas within each task and then bootstrap
tasks. Task-seed rows are never treated as independent.

## 3. Results

| Analysis set | Complete tasks | M1 mean [95% CI] | M2 mean [95% CI] | M3 mean [95% CI] |
|---|---:|---:|---:|---:|
| seed 3 reference | 40/44 | -0.126 [-0.252, -0.006] | -0.405 [-0.591, -0.229] | -0.531 [-0.702, -0.361] |
| seed 4 primary A+B | 26/44 | +0.035 [-0.044, +0.128] | -0.558 [-0.747, -0.376] | -0.523 [-0.728, -0.329] |
| seed 4 recovery sensitivity | 40/44 | +0.058 [-0.007, +0.134] | -0.499 [-0.654, -0.353] | -0.441 [-0.607, -0.277] |
| cross-seed, original seed-4 rows | 26 tasks | -0.048 [-0.156, +0.053] | -0.458 [-0.613, -0.304] | -0.505 [-0.670, -0.334] |
| cross-seed, recovery sensitivity | 39 tasks | -0.037 [-0.116, +0.033] | -0.448 [-0.593, -0.307] | -0.485 [-0.628, -0.343] |

The seed-4 recovery reconstruction is missing tasks 17, 25, 38, and 53. Under
the frozen `[-2,+2]` value assigned to every missing task over denominator 44,
the M2 bound is [-0.635, -0.271] and the M3 bound is [-0.583, -0.219]. Both
remain below zero. The corresponding M1 bound is [-0.129, +0.234] and crosses
zero.

## 4. Mechanism interpretation

**INFERENCE** — The most defensible replicated mechanism result is evidence
re-exposure, not the ATTACKS label. M2 is negative in seed 3, the original
seed-4 acquisition, the recovery sensitivity reconstruction, and both
cross-seed summaries. It also survives the full planned-denominator missing
bound after recovery. M3 follows the same pattern.

**INFERENCE** — The incremental label effect is not stable. Seed 3 favored the
label, but seed 4 was slightly positive and inconclusive; both cross-seed
intervals include zero. The experiment therefore does not support claiming
that an explicit ATTACKS label adds a reproducible benefit beyond exposing the
same selected content.

**FACT, descriptive stratum** — In the 40-task seed-4 reconstruction, 28 tasks
had a wrong Round-1 top choice. For these tasks M2 was -0.593, compared with
-0.277 on the 12 initially correct tasks. Final top-choice accuracy on the
wrong-state stratum was 0.286 for CONTROL, 0.857 for ATTACKS_NEUTRAL, and 0.786
for ATTACKS_LABELED. This is consistent with targeted rescue, but the stratum
uses offline correctness and was not an online detector or independently
randomized moderator.

## 5. Limits and admissible paper claim

The recovery acquisition occurred in a later provider/time/credential batch.
This does not break the within-task identical-state fork inside each recovered
task, but it prevents treating acquisition batch as irrelevant. Recovery is
therefore sensitivity evidence, not missing-at-random proof.

The strongest supported statement is:

> Under the tested GLM-4.6V identical-state forks, re-exposing selected
> counter-consensus evidence reduced final Brier loss relative to control in
> both seeds; the effect remained negative in the recovery sensitivity and its
> conservative missing-task bound. Explicitly labelling that same content as
> ATTACKS did not provide a reproducible incremental benefit.

This is a bounded mechanism claim about the tested tasks, model, prompts, and
selection rule. It does not establish a truth-blind detector, universal
ATTACKS semantics, or general multi-agent governance efficacy.

## 6. Frozen-document erratum

The content-addressed recovery freeze document contains one arithmetic typo:
it states a planning estimate of 793,800 tokens. The frozen machine plan used
59 agent positions × 7 calls × 1,800 tokens = 743,400 planned tokens, with a
900,000-token hard stop. The phrase “tasks 50–65” in that document denotes the
15 formal-roster IDs listed in section 1; task 54 is not in the formal roster.

The frozen file is not edited after execution because its exact bytes are bound
into `plan.json`. This erratum records the discrepancy without changing the
plan, execution identity, outputs, or results.

## 7. Reproducibility

- Analyzer: `experiments/campaign/v6/analyze_v6_mechanism_seed4_recovery_sensitivity_v1.ts`
- Output: `experiments/campaign/pilot_output/v6-fork-mechanism-neutral-labeled-seed4-recovery-sensitivity-analysis-v1/analysis.json`
- Analysis content hash: `sha256:3c2a51f945ee6404d166bf231ba552b87627f3432fd7a06992c8ca2ac2fc6a76`
- Recovery manifest hash: `sha256:86b5803f7ea75f4c774f1ee433023a8e2165a6f6d1c7123c1bd72e1240521199`

The analyzer verifies each plan, manifest, task artifact, ledger partition,
execution binding, recovery eligibility, and the seed-3 analysis hash before
computing any result. It contains no provider call and uses ground truth only
in offline scoring.
