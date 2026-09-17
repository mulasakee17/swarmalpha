# GLM-4.6V Cross-Model Replication Analysis Freeze V1

Date: 2026-08-20  
Status: **FROZEN BEFORE THE V3 FORMAL PROVIDER RUN**  
Role: second-paper Stage A prospective cross-model replication gate; it does not amend the frozen first paper.

## 1. Research question and claim boundary

**HYPOTHESIS.** Under the implemented same-state fork protocol, disconfirming disclosure (`ATTACKS`) reduces final multiclass Brier loss relative to no disclosure (`CONTROL`) on GLM-4.6V.

This is a prospectively specified cross-model replication of the DeepSeek treatment contrast. It is not an external preregistration, an independent task-family replication, evidence for a truth-blind detector, or evidence that ATTACKS is a universal booster.

## 2. Frozen experimental population

The formal V3 population contains 44 task clusters, seed 0, and exactly two arms (`CONTROL`, `ATTACKS`):

```text
15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26,
27, 29, 30, 31, 34, 35, 36, 37, 38, 40, 41,
42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53,
55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65
```

Task 14 is excluded because the repository already contains a GLM-4.6V, seed-0 fork output with CONTROL and ATTACKS outcomes dated 2026-08-16. Task 14 may be used only as an engineering canary and never enters the V3 primary or secondary effect estimates.

Some retained tasks appeared in earlier experiments on other mechanisms. The resulting claim is therefore limited to the tested protocol and task set; it does not establish semantic-family heldout generalization.

## 3. Primary estimand

For each eligible task `i`, define

```text
delta_i = finalBrier_i(ATTACKS) - finalBrier_i(CONTROL)
```

The sole primary estimand is the equal-task mean of `delta_i`. Negative values favor ATTACKS. Agents, reports, options, and provider calls are not independent analysis units; the task is the resampling unit.

An eligible complete pair requires both arm rows to pass artifact verification and both arms to have non-null final Brier values. No task weighting by agent count, token count, confidence, apparent difficulty, or observed effect is permitted.

## 4. Frozen uncertainty calculation and decision rule

Use 10,000 percentile bootstrap resamples of complete task pairs, sampling tasks with replacement, with deterministic master seed `0x5EED0F`. Report the mean and the 2.5th/97.5th percentiles.

Classify the cross-model gate before inspecting any subgroup result:

- **PASS:** mean `ATTACKS - CONTROL < 0` and the bootstrap interval upper endpoint is below 0.
- **DIRECTIONAL / INCONCLUSIVE:** mean is below 0 but the interval includes 0.
- **FAIL:** mean is zero or positive.

The decision rule is not changed because accuracy, a subgroup, or a different aggregation looks more favorable.

## 5. Missingness and execution failures

Report, before effect estimates:

- planned, completed, failed, and skipped task counts;
- physical attempts, observed known tokens, and unknown-usage attempts;
- parser-invalid and provider-unavailable counts by phase and arm;
- the number of complete task pairs used by the primary estimator.

No failed task or invalid report is encoded as zero loss, and no failed provider attempt is re-sent. The primary estimate uses complete pairs only.

Also report a deterministic all-44-task worst/best-case bound. Multiclass Brier loss lies in `[0, 2]`, so every task without a complete pair contributes an unidentified contrast in `[-2, +2]`. Compute the lower bound by assigning `-2` and the upper bound by assigning `+2` to each incomplete task, then average over all 44 planned tasks. This bound is a missingness sensitivity analysis, not the primary estimate.

## 6. Secondary analyses

All secondary results are labeled secondary and cannot overturn the primary gate classification.

1. **Accuracy:** paired ATTACKS-minus-CONTROL final accuracy difference.
2. **Pre-treatment severity gradient:** pooled round-1 Brier is computed offline using the answer key before disclosure. Report Spearman correlation between round-1 Brier and `delta_i`, with the same task bootstrap.
3. **Frozen severity bins:** below `0.3`, `0.3` through `1.0`, and above `1.0`; report task count and mean `delta_i` in each bin. These bins reproduce the first-paper descriptive definition but remain offline evaluator groups, not deployable detectors.
4. **Task-level table:** report both arm losses and `delta_i` for every completed pair, including unfavorable effects.

No new threshold, subgroup, task exclusion, feature, seed, model setting, or outcome is promoted to confirmatory status after results are viewed.

## 7. Operational gates before the 44-task run

Task 14 may be run in a separate canary directory using the final GLM-4.6V request configuration. The formal V3 run starts only if:

1. the V3 plan, this analysis specification, and the execution-shaping code are committed or otherwise content-addressed;
2. the V3 output directory contains only its frozen `plan.json`;
3. the canary confirms that successful responses expose `usage.total_tokens` and that the projected total remains compatible with the 6,000,000-token quota;
4. `thinking` is explicitly disabled and the request caps remain 768 discussion tokens and 256 final tokens;
5. no formal V3 outcome has been inspected.

If the canary fails any gate, revise and version the plan before starting V3. Once the first V3 provider attempt is issued, the task set, prompts, caps, estimand, missingness rules, bootstrap, and decision rule are frozen.

## 8. Post-run order

1. Run the V3 directory verifier.
2. If verification fails, do not compute or report the treatment effect.
3. If verification passes, produce the missingness/accounting table.
4. Compute the primary estimate and classify PASS / DIRECTIONAL / FAIL.
5. Only then inspect secondary severity and accuracy analyses.
6. Decide whether to proceed to truth-blind detector development without modifying the frozen first paper.

