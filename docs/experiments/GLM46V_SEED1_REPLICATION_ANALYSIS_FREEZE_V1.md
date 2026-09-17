# GLM-4.6V Seed-1 Random-Repetition Analysis Freeze V1

Date: 2026-08-21  
Status: **FROZEN BEFORE ANY FORMAL SEED-1 PROVIDER CALL**  
Role: prospective random-seed robustness replication for the second-paper program; it does not amend the frozen first paper.

## 1. Evidence status and research question

**FACT.** The GLM-4.6V seed-0 result and its V4 analysis were inspected before this protocol was written. Seed 0 produced a favorable primary result. Therefore seed 1 is not part of the original seed-0 preregistration and no pooled seed-0/seed-1 estimate may be described as that original confirmatory result.

**HYPOTHESIS.** Under the unchanged same-state fork protocol, disconfirming disclosure (`ATTACKS`) reduces final multiclass Brier loss relative to no disclosure (`CONTROL`) in a new GLM-4.6V random realization, seed 1.

The scientific value of this run is stochastic robustness under the same model and task family. It is not a new model replication, a new task-family replication, evidence for a truth-blind detector, or evidence that ATTACKS is a universal booster.

## 2. Frozen population and intervention

The formal population is the same 44 task clusters used by the seed-0 V4 run, with exactly seed 1 and arms `CONTROL` and `ATTACKS`:

```text
15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26,
27, 29, 30, 31, 34, 35, 36, 37, 38, 40, 41,
42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53,
55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65
```

Task 14 remains excluded to preserve exact task-roster comparability with seed 0 and may be used only as an isolated engineering canary. Prompts, canonical options, same-state fork construction, disclosure selector, full-roster qualification, output caps (768 discussion, 256 final), `thinking: disabled`, provider, model request identifier (`glm-4.6v`), concurrency 1, and single-attempt/no-retry discipline remain unchanged.

No seed-0 response, outcome, task effect, or answer-key-derived severity is an online input to seed 1.

## 3. Completion eligibility and missingness

The V4 strict policy remains unchanged. A task is eligible only if every expected agent supplies a valid round-1 discussion report, every expected agent supplies a valid round-2 report in both arms, and every expected agent has an `answered` canonical final elicitation in both arms. Any violation marks the task failed and emits no scientific run file.

Report planned, completed, failed, and skipped task counts; physical attempts; known gross tokens; unknown-usage attempts; and invalid/provider-unavailable counts by phase and arm. Missing tasks are classified as `failed_task`, `skipped_task`, `null_brier`, or `unexplained_missing`. Any unexplained inconsistency fails the analysis closed.

The primary complete-pair estimate excludes incomplete tasks. Also report the deterministic all-44 sensitivity bound obtained by assigning every incomplete task a contrast in `[-2,+2]`, the mathematical range of an ATTACKS-minus-CONTROL multiclass Brier contrast.

## 4. Primary estimand and frozen decision rule

For every eligible task `i`:

```text
delta_i = finalBrier_i(ATTACKS) - finalBrier_i(CONTROL)
```

The sole primary estimand is the equal-task mean of `delta_i`; negative favors ATTACKS. The task is the analysis and resampling unit. No weighting by agent count, token count, confidence, severity, seed-0 effect, or apparent difficulty is permitted.

Use 10,000 percentile task-bootstrap resamples with deterministic master seed `0x5EED0F`. Report the mean and 2.5th/97.5th percentiles.

- **PASS:** mean below zero and bootstrap upper endpoint below zero.
- **DIRECTIONAL / INCONCLUSIVE:** mean below zero but interval includes zero.
- **FAIL:** mean is zero or positive.

Accuracy and subgroup results cannot overturn this classification.

## 5. Frozen secondary analyses

1. Paired ATTACKS-minus-CONTROL final accuracy difference.
2. Offline Spearman association between pooled round-1 Brier and `delta_i`, with task bootstrap.
3. Frozen round-1 severity bins: below `0.3`, `0.3` through `1.0`, and above `1.0`.
4. A task-level table including every favorable, null, and unfavorable complete effect.

After the standalone seed-1 classification is fixed, seed-0 versus seed-1 task-effect correlation, sign agreement, and pooled summaries may be reported only as **post-seed-0, prospectively declared descriptive robustness analyses**. They are not substitutes for the seed-1 primary result and are not the original seed-0 confirmatory estimate.

## 6. Operational and provenance gates

Before the 44-task formal run:

1. The seed-1 plan, this document, execution-shaping code, and isolated artifact paths must be content-addressed.
2. The formal seed-1 directory may contain only its frozen `plan.json`.
3. A task-14 seed-1 canary must complete 20 started and 20 finished attempts with no retry, duplicate request hash, unknown usage, invalid discussion/final report, roster loss, or fork-input mismatch.
4. Every successful canary response must record a server-returned model identifier exactly equal to `glm-4.6v` and a non-empty provider request identifier. Cache-token detail is recorded when the provider exposes it; absence of cache detail alone does not fail the gate.
5. The canary must exercise a non-empty ATTACKS disclosure and pass replay verification.
6. If the canary fails, stop. Do not modify prompts, parser, intervention, population, outcome, or analysis and then reuse the same formal identity.

The operational planning estimate is `1,800` gross API-reported tokens per call, set before seed-1 execution from the completed seed-0 ledger mean of approximately `1,359` and rounded upward. Across 865 planned calls this is `1,557,000`, below the `4,500,000` gross-token stop threshold and the user-reported `5,000,000` remaining resource amount. This estimate governs only execution feasibility; it does not enter any scientific outcome or exclusion rule. An earlier seed1-V1 plan using the obsolete pre-seed-0 estimate (`5,875` per call) failed its own feasibility gate and has zero provider attempts. Seed1-V2 then stopped after one sandbox-blocked network attempt with unknown usage and no scientific output; an out-of-sandbox TCP check established endpoint connectivity before the V3 identity was created. Neither stopped identity enters any estimate.

After the first formal seed-1 provider call, no change to task roster, prompts, caps, eligibility, missingness, estimand, bootstrap, or decision rule is permitted.

## 7. Post-run order and claim boundary

1. Verify the seed-1 directory and ledger.
2. If verification fails, emit no treatment-effect conclusion.
3. Report accounting and missingness.
4. Compute and classify the standalone seed-1 primary estimate.
5. Inspect frozen secondary results.
6. Only then compare seeds descriptively.

Even a second PASS supports stochastic robustness only for the tested GLM-4.6V/HiddenBench/same-state-fork configuration. It does not establish broad model generality or solve pre-action truth-blind routing.
