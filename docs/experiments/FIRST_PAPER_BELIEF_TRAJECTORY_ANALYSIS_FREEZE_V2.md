# First Paper Belief-Trajectory Analysis Freeze — V2 Correction

Status: correction specification fixed on 2026-08-22 before the corrected
analyzer was executed. V1 is preserved as the historical pre-read diagnostic
specification. This V2 supersedes V1 only where the implementation audit found
three discrepancies: canonical option ordering, the meaning of the reversal
indicator, and task-equal aggregation of the R1-wrong diagnostic.

This correction does not modify experiment plans, provider outputs, primary
Brier estimands, or the identity of the trajectory work as a **post-hoc
exploratory mechanism diagnostic**.

## 1. Thaw reason

The V3 audit found that:

1. the analyzer used `sorted(probability.keys())` rather than the pinned
   HiddenBench `possible_answers` order for argmax tie breaking;
2. V1 defined a change in the complete option ranking, while the implementation
   measured only whether the pooled top choice changed;
3. the Q2 R1-wrong summaries averaged eligible task × seed blocks directly,
   despite V1 declaring the task as the statistical unit, and labeled a net
   block count as rescued tasks.

These are analysis-definition errors and therefore satisfy the V3 paper
freeze's factual/analysis-error thaw condition. Primary proper-loss results do
not depend on argmax tie breaking and remain frozen.

## 2. Canonical option authority

For every task, option order and the resolved option are read from the pinned
source `experiments/campaign/tasks/hiddenbench/benchmark.json`:

- canonical order: `possible_answers`, without sorting;
- resolution: `correct_answer`;
- every stored probability vector must contain exactly the canonical option
  keys;
- argmax ties retain the first option in this canonical order.

The analyzer fails closed on an absent task, a resolution mismatch, or
probability-coordinate mismatch.

## 3. Corrected reversal metric

The analyzer reports `topChoiceReversal`, defined for a task × seed × arm as

```text
1[argmax_canonical(pooled R1 belief) != argmax_canonical(pooled final belief)].
```

It is a change in the pooled top choice, not a change in the complete ordering
of all options. The terms `option-rank reversal`, `rankReversal`, and claims
that this metric demonstrates reordering of multiple hypotheses are withdrawn.
The indicator remains a descriptive group-dynamics quantity and is not evidence
of deeper reasoning.

## 4. Corrected Q2 aggregation

Q2 retains the original block-level eligibility rule: a task × seed block is
eligible when the shared pooled R1 top choice is wrong in both CONTROL and
ATTACKS. The top choice must be identical across those arms; otherwise the
analyzer fails closed.

For DeepSeek:

1. compute each correction quantity inside every eligible task × seed block;
2. average eligible seed-level quantities within each task;
3. give every eligible task equal weight in the reported mean.

For a single-seed GLM batch, blocks and tasks coincide. Reports must state both
the number of eligible blocks and the number of unique eligible tasks.

The following task-equal quantities are permitted:

- final correct-option probability difference, ATTACKS − CONTROL;
- final probability difference for the R1 pooled wrong top choice;
- final top-choice accuracy difference, averaged across eligible seeds within
  task and then across tasks.

For the task rescue balance, a task is ATTACKS-better, CONTROL-better, or tied
according to the sign of its within-task mean final-accuracy difference. The net
balance is `ATTACKS-better − CONTROL-better`. Agent wrong→correct switches are
descriptive totals across eligible task × seed blocks and must be labeled as
such; they are not an inferential sample.

## 5. Unchanged analysis contract

All other V1 rules remain in force:

- read-only use of the four recorded batches;
- independent multiclass Brier recomputation;
- task as the statistical unit and seed averaging within task;
- separate reporting of GLM batches and no cross-model grand pool;
- 10,000-draw percentile task bootstrap with `mulberry32(0x5EED0F)`;
- frozen missingness policies;
- no provider calls, artifact repair, retry, or imputation;
- no causal mechanism, mediation, online detector, or universal-cognition
  claim.

The canonical paper boundary remains:

> Trajectory evidence localizes when the treatment effect emerges; it does not
> identify whether resurfacing acts through salience, reasoning reorganization,
> or both.

## 6. Required verification

The corrected synthetic tests must include:

1. a multi-seed counterexample distinguishing block-equal from task-equal Q2
   aggregation;
2. a canonical-order tie whose result differs from alphabetical sorting;
3. a lower-rank swap with unchanged top choice, which must not count as a
   top-choice reversal;
4. the existing Brier, pooling, missingness, and deterministic-bootstrap tests.

After execution, final Brier must still match stored `finalBrier` within
floating-point tolerance, shared-R1 arm Brier differences must remain zero, and
the frozen primary final-stage contrasts must remain unchanged.
