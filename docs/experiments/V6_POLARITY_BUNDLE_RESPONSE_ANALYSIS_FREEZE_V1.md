# V6 Polarity-Bundle Response Analysis Freeze V1

Status: **FROZEN BEFORE EXECUTION; POST-HOC, ZERO-PROVIDER, READ-ONLY**  
Date: 2026-08-22  
Authority: governs only the L0 analysis implemented by
`experiments/campaign/audit/analyze_v6_polarity_bundle_response.py`.

## 1. Purpose and claim ceiling

This analysis asks whether the already-estimated effect of the implemented
ATTACKS and SUPPORTS disclosure bundles differs between states whose shared
Round-1 pooled top choice is correct and states whose shared Round-1 pooled top
choice is wrong.

It does **not** estimate message-level trajectory value. `supports` and
`attacks` are model-self-labeled evidence relations under the existing schema;
they are not oracle relations to the Round-1 pooled top choice and have no
target-option field. Round-1 correctness is joined offline with the pinned
answer key and has no detector or runtime authority.

## 2. Frozen inputs

The analyzer reads only:

1. DeepSeek V3 three-arm artifacts:
   `experiments/campaign/pilot_output/v6-fork-confirmatory-v3-20260816/`;
2. GLM-4.6V seed-2 three-arm artifacts:
   `experiments/campaign/pilot_output/v6-fork-glm46v-threearm-seed2-20260821/`;
3. pinned canonical options and resolutions:
   `experiments/campaign/tasks/hiddenbench/benchmark.json`.

It must not read a provider credential, call a provider, repair an artifact,
rewrite a result row, or modify a first-paper source or freeze manifest.

## 3. Qualification and recomputation

For each `task × seed` file, the analyzer must fail closed unless:

- exactly one `CONTROL`, one `SUPPORTS`, and one `ATTACKS` row exist;
- all rows have the same task, seed, model, resolution, and
  `round1StateHash`;
- all three `round1AgentBeliefs` arrays are canonically identical;
- every probability vector has exactly the pinned canonical option keys;
- the stored resolution equals the pinned resolution;
- every available final Brier recomputes from `finalAgentBeliefs` within
  `1e-12`.

A contrast-eligible block requires non-null recomputed final Brier in all three
arms. Incomplete blocks remain counted as missing and are not repaired or
imputed. This is a descriptive post-hoc complete-block estimand; missing counts
must be reported.

Round-1 pooled belief is the equal-agent mean of the shared
`round1AgentBeliefs`. Canonical argmax ties retain the first option in the
pinned `possible_answers` order. The stratum is:

```text
wrong   := pooled Round-1 top choice != pinned resolution
correct := pooled Round-1 top choice == pinned resolution
```

The term `consensus` is not used because no alignment threshold is required.

## 4. Estimands

Within each eligible `task × seed` block:

```text
V_ATTACKS  = Brier_CONTROL - Brier_ATTACKS
V_SUPPORTS = Brier_CONTROL - Brier_SUPPORTS
GAP_AS     = V_ATTACKS - V_SUPPORTS
           = Brier_SUPPORTS - Brier_ATTACKS
```

Positive `V` means the implemented disclosure bundle has lower Brier than
CONTROL. Positive `GAP_AS` means ATTACKS has larger bundle value than SUPPORTS.

The primary L0 diagnostic is `GAP_AS` in the wrong stratum. Secondary outputs
are both component values in the wrong stratum, all three quantities in the
correct stratum, and DeepSeek seed-specific views.

## 5. Statistical unit and summaries

The task is the statistical unit. For DeepSeek pooled summaries, eligible seed
values are first averaged within `task × stratum`; every task then receives
equal weight. A task may contribute to both descriptive strata when its two
seeds produce different Round-1 top choices; the analysis therefore makes no
formal between-stratum contrast.

The analyzer reports separately:

- DeepSeek seed 0;
- DeepSeek seed 1;
- DeepSeek pooled across available seeds within task and stratum;
- GLM-4.6V seed 2.

No cross-model grand pool is permitted. Each estimate reports task count,
block count, mean, median, sign counts, a 10,000-draw percentile task bootstrap
95% interval using `mulberry32(0x5EED0F)`, and leave-one-task-out range and sign
stability. The analyzer also writes every task-level value.

## 6. Frozen L1 decision rule

This gate controls only whether an AAMAS-postsubmission, development-only
single-item LOO pilot should be prioritized. It does not change the first
paper.

`GO_L1` requires all of:

1. wrong-stratum `GAP_AS > 0` in DeepSeek pooled and GLM seed 2;
2. at least 10 wrong-stratum tasks in each of those two views;
3. the wrong-stratum `GAP_AS` 95% interval is wholly above zero in at least one
   of those views;
4. leave-one-task-out does not change the sign of `GAP_AS` in either view.

`DEFER_L1` applies when both point estimates are positive but at least one
support/robustness condition fails. `NO_GO_L1_CURRENT` applies when either point
estimate is non-positive or either view has fewer than five eligible tasks.

This rule authorizes at most the separately frozen L1 noise-calibrated pilot in
the project development plan. It never authorizes full-item L2, an online
detector, or a claim that ATTACKS messages are intrinsically valuable.

## 7. Required outputs

The analyzer writes only under `experiments/campaign/audit/output/`:

- `polarity_bundle_response_v1.json`;
- `polarity_bundle_response_v1.md`;
- `polarity_bundle_response_per_task_v1.tsv`.

The machine-readable output must include input file hashes, qualification and
missingness counts, all frozen summaries, per-task values, the L1 verdict, and
the exact semantic limitations above.

