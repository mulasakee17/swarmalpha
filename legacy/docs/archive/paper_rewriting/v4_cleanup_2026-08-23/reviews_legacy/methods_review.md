# Methods & Reproducibility Review

## Recommendation

**Major Revision**

The identical-state fork is a strong design for isolating a post-round-1 policy contrast within the recorded protocol, and the manuscript is unusually careful about self-label semantics, prior task use, and the post-hoc status of seed 1. The main treatment direction is credibly reported for the analyzed artifacts. However, the primary outcome under differential report validity is not fully defined, the complete-case analysis is overinterpreted, and the inferential procedure is not specified well enough to reproduce or delimit the confidence intervals. These issues affect the estimand and claim strength, not merely presentation.

## Rubric scores

| Dimension | Score | Justification |
|---|---:|---|
| Method description completeness | 3/5 | The protocol, arms, pooling rule, and task-level pairing are clear at a high level. Reproduction still requires the prompt templates, exact model/provider snapshot, seed derivation, retry and parsing rules, invalid-report handling, deduplication details, and bootstrap specification. |
| Assumption justification | 4/5 | The manuscript explicitly limits label validity, exposure matching, task novelty, provenance, and external validity. It should additionally state the branch-isolation assumption and the assumptions required to interpret outcomes under arm-dependent missing reports. |
| Experimental design | 3/5 | The within-state fork removes pre-treatment transcript variation and the task is correctly treated as the main analysis unit. Confidence is limited by one model/benchmark, two seeds, unresolved post-treatment missingness, and incomplete reporting of confirmatory decision and multiplicity rules. |
| Limitations acknowledgment | 4/5 | The six listed limitations are substantive and appropriately scoped. Missing are the selection implications of complete-case conditioning and the fact that task-bootstrap intervals are conditional on the two realized seeds and cannot quantify provider/model stochastic variability. |

## Findings

### 1. Major: the outcome and estimand under missing final reports are undefined

**FACT:** Section 2.2 defines the pooled belief using `M` agent reports, while Section 3.2 reports arm-dependent validity: 331/354 reports for CONTROL, 347/354 for SUPPORTS, and 345/354 for ATTACKS. The manuscript does not state whether `M` is the expected number of agents or only the number of valid reports, how a block with one or more invalid reports receives a Brier score, or whether any retries or repairs occur.

**INFERENCE:** If pooling uses only valid reports, the reported policy contrast bundles changes in beliefs with treatment-induced changes in who contributes to the pool. If incomplete blocks are dropped, the analysis instead conditions on a post-treatment event. Either choice is defensible as an operational policy outcome, but they estimate different quantities.

Define the seed-0 confirmatory estimand and the two-seed summary explicitly over the finite 45-task set, including the outcome rule for every invalid or absent report. Treat report validity as a policy outcome, report block-level missingness patterns, and add a bounded or otherwise assumption-indexed sensitivity analysis. Because the stated multiclass Brier loss is bounded, a worst-case analysis is feasible. The current sentence that complete-block results show the primary direction “is not created by incomplete blocks” is too strong: complete-case restriction shows a negative contrast among selected fully observed blocks, but it does not identify the missingness mechanism or remove post-treatment selection bias.

### 2. Major: same-state equality supports pairing, but not every part of the isolation claim

**FACT:** Section 2.3 and the evidence bank establish that arms within each task-seed share the recorded round-1 state hash and that recorded Brier values replay. This supports equality of the recorded pre-treatment state.

**INFERENCE:** The stronger statement in the Introduction that “only the post-round-1 selection policy changes” additionally requires identical continuation prompts apart from disclosure, identical elicitation/parsing/retry logic, and no arm-specific execution path that affects outcomes. State-hash equality and score replay do not alone establish those continuation invariants.

Either document the branch-level invariants and their verification or narrow the identification language to a paired contrast between the implemented continuation arms from the same recorded state. Also define the target explicitly: seed 0 estimates an equal-task average over the 45 realized task states; the pooled statistic averages the two realized seed-specific contrasts within task and then weights tasks equally. Neither quantity, without further sampling assumptions, is a population-average effect over models, providers, task families, or future seeds.

### 3. Major: confirmatory qualification is mostly correct, but the decision rule and multiplicity are missing

**FACT:** Section 2.3 correctly calls seed 0 internally pre-specified rather than externally preregistered. The scope-resolution document states that the relevant repository commit was made after the run, seed 1 was added after seed-0 inspection, and the prior-use resolution is a post-run claim-scope clarification. The manuscript appropriately presents seed 1 and the pooled estimate as post-hoc robustness evidence.

The manuscript should retain “project-internal prospective specification” or equally explicit wording whenever confirmatory authority is invoked. It should also report the frozen decision rule for H1 and H2 and state whether these are co-primary hypotheses. If both interval-exclusion decisions support a joint confirmatory claim, explain the multiplicity policy; otherwise identify the intervals as task-bootstrap uncertainty summaries and avoid implying an unreported familywise test. The 27-task exclusion, seed-1 analysis, and pooled analysis must remain labeled post-hoc robustness analyses, not confirmatory repairs.

### 4. Major: the bootstrap is not reproducible and its uncertainty target is unclear

Section 2.2 says only “deterministic task bootstrap.” A reproducible account needs the number of resamples, RNG seed, percentile/BCa/basic interval construction, resampling algorithm, treatment of the two seed observations when a task is resampled, handling of tasks with only one retained complete block, and the exact leave-one-task-out statistic. With only two realized seeds, the intervals primarily quantify variation across the 45 tasks conditional on this model, provider setup, and these seeds; they do not estimate provider-seed or model-level uncertainty. State that boundary explicitly.

Report arm-level mean Brier scores alongside contrasts. Without baselines or a declared scale interpretation, the Abstract’s phrase “large within-protocol effect” is an unsupported magnitude classification; the numerical contrast is supported, but “large” is an inference lacking a benchmark.

### 5. Moderate: several claims are not aligned with the reviewed evidence artifacts

- The prior-use intervals differ slightly across current artifacts: the scope-resolution document gives approximately [-0.616, -0.213] and [-0.501, -0.127], whereas the manuscript/evidence bank give [-0.616, -0.211] and [-0.502, -0.126]. This may be rounding or an analysis-version difference, but a single canonical output should be cited and used consistently.
- The statements that no leave-one-task-out deletion changes either pooled sign and that H1 has 28 negative, 7 positive, and 10 zero task effects do not appear in the evidence bank or results-validation table. Add traceable evidence anchors or remove them.
- The complete-case phrase discussed above exceeds the evidence bank’s authorized claim that the effect “holds when all three arms have complete final reports”; the same artifact explicitly forbids upgrading this to ignorable missingness.
- The phrase “only the post-round-1 selection policy changes” is stronger than the evidence bank’s same-state fact, whose forbidden upgrade is “complete causal isolation from all implementation artifacts.”

### 6. Moderate: artifact-level reproducibility needs a compact specification

For an extended abstract, these details can be placed in a referenced artifact or appendix, but they must be available: pinned HiddenBench snapshot identifier and task list; exact prompts; model/provider identifier and access date; task/seed-to-provider-seed mapping; evidence schema; content normalization and hash-deduplication rule; response validation, retry, and failure policy; final probability parsing; manifest scope; and the full analysis command/configuration. Replay currently establishes consistency of recorded and manifest-listed files, not independent provider provenance, and the manuscript correctly acknowledges that boundary.

## Required revision threshold

A satisfactory revision should (1) define the all-block primary outcome and finite-sample estimand under missing reports, (2) replace the complete-case causal reassurance with an assumption-aware sensitivity statement, (3) fully specify bootstrap and confirmatory decision procedures, and (4) reconcile or remove the identified claim/evidence mismatches. These changes would preserve the paper’s central result while making its identification and uncertainty claims commensurate with the available evidence.
