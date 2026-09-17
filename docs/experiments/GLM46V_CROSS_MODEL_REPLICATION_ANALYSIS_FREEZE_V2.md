# GLM-4.6V Cross-Model Replication Analysis Freeze V2 (V4 run)

Date: 2026-08-20  
Status: **FROZEN BEFORE THE V4 FORMAL PROVIDER RUN**  
Role: second-paper Stage A prospective cross-model replication gate; it does not amend the frozen first paper.

This document supersedes the V3 analysis freeze (`GLM46V_CROSS_MODEL_REPLICATION_ANALYSIS_FREEZE_V1.md`,
which remains as the V3 stop record). V4 freezes the full-roster completion
eligibility rules and the missingness classification that the V3 run lacked.

## 1. Research question and claim boundary

**HYPOTHESIS.** Under the implemented same-state fork protocol, disconfirming disclosure (`ATTACKS`) reduces final multiclass Brier loss relative to no disclosure (`CONTROL`) on GLM-4.6V.

This is a prospectively specified cross-model replication of the DeepSeek treatment contrast. It is not an external preregistration, an independent task-family replication, evidence for a truth-blind detector, or evidence that ATTACKS is a universal booster.

## 2. Frozen experimental population

The formal V4 population contains 44 task clusters, seed 0, and exactly two arms (`CONTROL`, `ATTACKS`):

```text
15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26,
27, 29, 30, 31, 34, 35, 36, 37, 38, 40, 41,
42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53,
55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65
```

Task 14 is excluded because the repository already contains a GLM-4.6V, seed-0 fork output with CONTROL and ATTACKS outcomes. Task 14 may be used only as an engineering canary and never enters the V4 primary or secondary effect estimates.

Some retained tasks appeared in earlier experiments on other mechanisms. The resulting claim is therefore limited to the tested protocol and task set; it does not establish semantic-family heldout generalization.

## 3. Scientific completion eligibility (frozen before the run)

A task is **completed and eligible for a run result file** only if ALL of the following hold under the v4-strict completion policy:

1. Round 1 received a valid discussion report (parseable belief JSON with a valid categorical probability vector) from **every** expected agent of the task roster.
2. For **each** arm, round 2 received a valid discussion report from **every** expected agent.
3. For **each** arm, the final private elicitation was **answered** (canonical final parser status `answered`) by **every** expected agent.

Any violation — a provider failure, a parser-invalid discussion or final response, an abstention, an adapter unavailability, or any missing agent — makes the task **failed**: the runner records the task as `failed` with the failing phase/agent/diagnostic in the attempts ledger, issues **no scientific run file** for it, and continues with subsequent tasks. Ledger entries retain the actual attempts, usage, and the explicit failure stage/reason.

Consequences, frozen:

- **No empty-transcript or empty-disclosure results**: the runner must not complete a task whose round 1 produced no valid reports, because CONTROL and ATTACKS would then be identical interventions.
- **No cross-arm roster mismatch**: a task whose final reports cover different agent subsets across arms is never compared; it is failed instead.
- Ineligible tasks never enter the primary-effect run JSONL. Their planned deltas are accounted for by the missingness rules in §5.

## 4. Primary estimand

For each eligible task `i`, define

```text
delta_i = finalBrier_i(ATTACKS) - finalBrier_i(CONTROL)
```

The sole primary estimand is the equal-task mean of `delta_i`. Negative values favor ATTACKS. Agents, reports, options, and provider calls are not independent analysis units; the task is the resampling unit.

An eligible complete pair requires both arm rows to pass artifact verification and both arms to have non-null final Brier values. No task weighting by agent count, token count, confidence, apparent difficulty, or observed effect is permitted.

## 5. Missingness and execution failures

Report, before effect estimates:

- planned (44), completed, failed, and skipped task counts;
- physical attempts, observed known tokens, and unknown-usage attempts;
- parser-invalid and provider-unavailable counts by phase and arm;
- the number of complete task pairs used by the primary estimator.

Missingness is classified per planned task into exactly one of:

- `failed_task` — the task is marked `failed` in the manifest task status (any eligibility violation from §3, or an attempted-but-incomplete task from a previous process);
- `skipped_task` — the task is marked `skipped` (never attempted, e.g. after a budget halt);
- `null_brier` — both run files exist but at least one arm has a null final Brier (recorded as a complete-file anomaly; such a task is treated as missing);
- `unexplained_missing` — a completed task status without a run file, or any other inconsistency. **Any unexplained or inconsistent missingness fails the analysis closed** (no effect estimate is emitted).

No failed task or invalid report is encoded as zero loss, and no failed provider attempt is re-sent. The primary estimate uses complete pairs only.

Also report a deterministic all-44-task worst/best-case bound. Multiclass Brier loss lies in `[0, 2]`, so every task without a complete pair contributes an unidentified contrast in `[-2, +2]`. Compute the lower bound by assigning `-2` and the upper bound by assigning `+2` to each incomplete task, then average over all 44 planned tasks. The bound records `assignedLowerDelta: -2`, `assignedUpperDelta: +2`, and `incompleteTaskCount: n`. This bound is a missingness sensitivity analysis, not the primary estimate.

## 6. Frozen uncertainty calculation and decision rule

Use 10,000 percentile bootstrap resamples of complete task pairs, sampling tasks with replacement, with deterministic master seed `0x5EED0F`. Report the mean and the 2.5th/97.5th percentiles.

Classify the cross-model gate before inspecting any subgroup result:

- **PASS:** mean `ATTACKS - CONTROL < 0` and the bootstrap interval upper endpoint is below 0.
- **DIRECTIONAL / INCONCLUSIVE:** mean is below 0 but the interval includes 0.
- **FAIL:** mean is zero or positive.

The decision rule is not changed because accuracy, a subgroup, or a different aggregation looks more favorable.

## 7. Secondary analyses

All secondary results are labeled secondary and cannot overturn the primary gate classification.

1. **Accuracy:** paired ATTACKS-minus-CONTROL final accuracy difference.
2. **Pre-treatment severity gradient:** pooled round-1 Brier is computed offline using the answer key before disclosure. Report Spearman correlation between round-1 Brier and `delta_i`, with the same task bootstrap.
3. **Frozen severity bins:** below `0.3`, `0.3` through `1.0`, and above `1.0`; report task count and mean `delta_i` in each bin.
4. **Task-level table:** report both arm losses and `delta_i` for every completed pair, including unfavorable effects.

No new threshold, subgroup, task exclusion, feature, seed, model setting, or outcome is promoted to confirmatory status after results are viewed.

## 8. Operational gates before the 44-task run

Task 14 may be run in a separate V4 canary directory using the final GLM-4.6V request configuration. The formal V4 run starts only if:

1. the V4 plan, this analysis specification, and the execution-shaping code are committed or otherwise content-addressed;
2. the V4 output directory contains only its frozen `plan.json`;
3. the canary confirms: 20 started = 20 finished ledger attempts; no retry, no duplicate request hash, no unknown usage; discussion 12/12 valid; final 8/8 answered and valid; full round-1 and round-2 rosters; identical CONTROL/ATTACKS fork-input hashes; completed=1, failed=0; the ATTACKS disclosure path is confirmed executable; verifier replay passes; and the success-path token extrapolation stays compatible with the 6,000,000-token quota;
4. `thinking` is explicitly disabled and the request caps remain 768 discussion tokens and 256 final tokens;
5. no formal V4 outcome has been inspected.

If the canary fails any gate, stop; do not iterate the canary and do not touch the 44 formal tasks. Once the first V4 provider attempt is issued, the task set, prompts, caps, estimand, eligibility rules, missingness rules, bootstrap, and decision rule are frozen.

## 9. Post-run order

1. Run the V4 directory verifier.
2. If verification fails, do not compute or report the treatment effect.
3. If verification passes, produce the missingness/accounting table.
4. Compute the primary estimate and classify PASS / DIRECTIONAL / FAIL.
5. Only then inspect secondary severity and accuracy analyses.
6. Decide whether to proceed to truth-blind detector development without modifying the frozen first paper.
