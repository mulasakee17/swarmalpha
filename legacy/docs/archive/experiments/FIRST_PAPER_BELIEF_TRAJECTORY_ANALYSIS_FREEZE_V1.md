# First Paper Belief-Trajectory Analysis Freeze — V1

Status: frozen before trajectory results were read. This document governs the
post-hoc belief-revision trajectory diagnostics for the first paper (V3
increment). It is a **post-hoc mechanism diagnostic** of the already-frozen
experiments; it is NOT a preregistered mechanism test and does not amend any
frozen experiment plan, analysis, or result.

## 1. Purpose and identity

The frozen experiment results are unchanged. This analysis describes, for the
already-completed identical-state forks, *when* the disclosure effect emerges
across belief-revision stages and which trajectory signatures are present.

- Identity: **post-hoc exploratory mechanism diagnostic**.
- It cannot be relabeled as a preregistered mechanism test.
- It does not causally identify mechanisms (salience vs reasoning
  reorganization); it only localizes effects and reports descriptive
  trajectory signatures.

## 2. Data sources (read-only)

| Batch | Directory | Blocks | Arms per block |
|---|---|---|---|
| DeepSeek v3 | `experiments/campaign/pilot_output/v6-fork-confirmatory-v3-20260816` | 90 (45 tasks × seeds 0,1) | CONTROL, SUPPORTS, ATTACKS |
| GLM-4.6V three-arm seed 2 | `experiments/campaign/pilot_output/v6-fork-glm46v-threearm-seed2-20260821` | 41 | CONTROL, SUPPORTS, ATTACKS |
| GLM-4.6V two-arm seed 0 | `experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-v4-20260820` | 39 | CONTROL, ATTACKS |
| GLM-4.6V two-arm seed 1 | `experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-seed1-v3-20260821` | 39 | CONTROL, ATTACKS |

All files are read only. The analysis never imports or modifies the experiment
runner, never calls a provider, and never writes into the artifact directories.

## 3. Input fields (verified available)

`round1AgentBeliefs`, `round2AgentBeliefs`, `finalAgentBeliefs`,
`round2Belief`, `finalBelief`, `beliefShiftR1ToR2`, `round2AlignmentR`,
`round2MaxPairwiseTV`, `evidenceReuseR2`, `evidenceDiversityR2`,
`round1EvidenceContents`, `round2EvidenceContents`, `resolvedOption`,
`finalBrier`, `finalAccuracy`, `round1StateHash` (and, for GLM,
`forkInputHashV1`).

`round1Belief`, `round1Brier`, and `round2Brier` are NOT stored; the analysis
recomputes pooled round-1 and round-2 beliefs and Brier scores independently
from the per-agent probability vectors (Section 4).

## 4. Metrics (per task × seed × arm)

For a block with per-agent categorical probability vectors `p_{j}` over the
canonical option set `O` (valid agents only, matching the frozen valid-report
policy), the pooled belief is

```
p̄_k = M^{-1} Σ_j p_{jk},   k ∈ O,
```

computed separately for round 1, round 2, and final. For each stage s ∈
{R1, R2, final} with a valid pooled belief, the following are computed:

1. `pooledBelief_s` — the pooled vector.
2. `brier_s = Σ_k (p̄_k − 1[k = resolvedOption])²` — **recomputed independently**;
   never read from stored `finalBrier` (which is used only as a verification
   cross-check within floating-point tolerance).
3. `correctProb_s = p̄_{resolvedOption}`.
4. `maxProb_s = max_k p̄_k`.
5. `entropy_s = −Σ_k p̄_k ln p̄_k` (natural log; 0 if degenerate).
6. `argmaxCorrect_s = [argmax_k p̄_k = resolvedOption]` (ties broken by the
   frozen canonical option ordering used in the artifacts).
7. Stage-to-stage changes: `Δbrier(R1→R2)`, `Δbrier(R2→final)`,
   `ΔcorrectProb(R1→R2)`, `ΔcorrectProb(R2→final)`, and total-variation
   displacement `tv(p̄_a, p̄_b) = ½ Σ_k |p̄_{ak} − p̄_{bk}|`.
8. Dynamics fields taken verbatim from the artifacts (descriptive only):
   `beliefShiftR1ToR2`, `round2AlignmentR`, `round2MaxPairwiseTV`,
   `evidenceReuseR2`, `evidenceDiversityR2`.
9. Option-rank reversal: the rank order of pooled beliefs over `O` at R1 vs
   final; `rankReversal` = 1 if the order changes, else 0 (ties by canonical
   option ordering).
10. Per-agent direction switches (agent-level, **descriptive only**): classify
    each agent by (R1 argmax, final argmax) relative to `resolvedOption` into
    `wrong→correct`, `correct→wrong`, `wrong→different wrong`,
    `unchanged correct`, `unchanged wrong`. Counts are aggregated to the
    task × seed × arm level; no agent-level significance test is performed.

Confidence cannot be interpreted as quality. `maxProb`, `correctProb`,
`brier`, and `argmaxCorrect` are always reported jointly; a rise in `maxProb`
with no rise in `correctProb` is reported as "more confident, possibly more
confidently wrong."

## 5. Statistical units and aggregation

- The statistical unit is always the **task**; agent reports are never treated
  as independent samples.
- All pooled beliefs and Brier scores are formed **within** task × seed × arm
  first; agent-level quantities are aggregated before any task-level summary.
- DeepSeek two-seed summaries: average the available seed-level quantities
  within each task, then give every task equal weight.
- GLM batches are reported **separately by batch identity** (three-arm seed 2;
  two-arm seed 0; two-arm seed 1). They are never merged into a single "GLM"
  pool without batch labels.
- ATTACKS − SUPPORTS contrasts use **only** runs with a full three-arm
  structure (DeepSeek seeds 0/1; GLM three-arm seed 2).
- ATTACKS − CONTROL contrasts may be shown per run (DeepSeek seeds 0/1; GLM
  three-arm seed 2; GLM two-arm seeds 0/1).
- The round-1 stage is a shared starting point within each block: all arms in a
  block share `round1StateHash`, so R1 arm differences are exactly 0 and are
  reported as a verification point, not as an effect.

## 6. Bootstrap

- 10,000 percentile resamples of **task-level** quantities.
- Deterministic PRNG: `mulberry32` with master seed `0x5EED0F` (same as the
  frozen primary analyses).
- DeepSeek two-seed summaries resample tasks with seed effects grouped inside
  the resampled task.
- Single-seed GLM batches resample their complete tasks.
- Intervals are the `floor(p*N)` sorted order statistics, matching the frozen
  primary bootstrap.

## 7. Missingness

- Missing tasks follow the existing frozen policies; nothing is repaired,
  retried, or imputed.
- DeepSeek: an arm with zero valid final reports has a null final Brier, and
  that block is unavailable for any contrast involving that arm (e.g., task 60
  seed 1 CONTROL). Partial pools use the valid subset.
- GLM: fail-closed whole-task exclusion; failed tasks are missing from all
  arms of that block and are not replaced.
- Trajectory stage summaries use the blocks available at that stage; the number
  of blocks per summary is always reported.

## 8. Allowed and forbidden interpretation

Allowed (evidence-consistent, cautious wording):

- "The effect emerges at stage X" (X ∈ {R2, final}) from task-level Brier
  contrasts, with the shared-R1 verification point reported.
- On offline-identified R1-argmax-wrong tasks: describe whether ATTACKS
  decreases the originally wrong option's probability, increases the correct
  option's probability, increases `wrong→correct` switches, and whether
  entropy/`maxProb` change without correcting the argmax.
- Dynamics descriptions of alignment, max pairwise TV, evidence reuse,
  evidence diversity, and option-rank reversal — as **dynamics**, never as
  "deeper reasoning."
- If the improvement appears immediately after disclosure at R2, with high
  evidence reuse and no obvious new structure: "consistent with a salience or
  resurfacing mechanism." NOT "proves that salience causes the effect."
- If the improvement is accompanied by reordering of multiple wrong hypotheses,
  changed disagreement structure, new cross-evidence synthesis at R2, or
  continued directional correction into final: "consistent with reasoning
  reorganization." NOT "ATTACKS changes the reasoning algorithm/structure."

Forbidden:

- Causal mediation effects; claiming salience vs reasoning has been separated.
- Any online detector claim; any universal cognitive mechanism.
- LLM-as-judge labeling of "deep reasoning" or "new reasoning chains."
- Any unvalidated semantic classifier on the text; only exact content hashes,
  the stored reuse/diversity metrics, and deterministic probability changes
  may be used.
- Agent-level pseudo-replication significance tests; grand-pooled cross-model
  estimates; new p-values beyond the frozen bootstrap machinery.

## 9. Canonical sentence for the paper

> "Trajectory evidence localizes when the treatment effect emerges; it does
> not identify whether resurfacing acts through salience, reasoning
> reorganization, or both."

## 10. Outputs

Written to `paper_rewriting_output/analysis/belief_trajectory/`:

- `trajectory_metrics.csv` — per task × seed × arm metric rows.
- `trajectory_summary.json` — aggregated estimates and bootstrap intervals.
- `trajectory_report.md` — human-readable report.
- `trajectory_plot_input.csv` — stage means and CIs for the figure.

## 11. Verification

A minimal synthetic test validates: task-level aggregation, the independent
Brier formula against golden cases, within-seed aggregation, null-arm
missingness handling, and bootstrap reproducibility (same seed → identical
outputs). Stored `finalBrier` is cross-checked against the recomputed final
Brier within floating-point tolerance.
