# Collective Dynamics Prompt-Sensitivity Canary V1 Result

Date: 2026-08-28  
Status: **COMPLETE; PRIMARY H1 RESULT = SENSOR_FAIL**

This report follows `docs/REASONING_PROTOCOL.md`. It separates the frozen
primary result from a post-result numerical-boundary sensitivity check. It does
not use ground truth and does not qualify a paper-level measurement claim.

## 1. Execution provenance

The first registered execution directory closed all 48 cells as
`provider_network`; it observed no model response and is therefore
`CANARY_INVALID_PROVIDER`, not a sensor result:

```text
results/v6_collective_dynamics_sensor_canary_v1_glm46v_seed1
```

A versioned transport retry reused byte-identical plan and freeze hashes:

```text
results/v6_collective_dynamics_sensor_canary_v1_glm46v_seed1_transport_retry1
planHash   sha256:e0395f2769b45b8b522b48f406aa74e0a3f84760640277e224a5527c095c7e3d
freezeHash sha256:9de5dc9409328f3622499b13cc92b68204cd716374de85518e9700d71b5999c3
runHash    sha256:5daa43001b4f53b476729590607d495f7e8423129bb9f7bb2ac24773b6d25d60
analysis   sha256:09cfacf4d7aa478bda819e9c713d069beb9b5f22e0c25f1020653d366b5ee6b8
```

The retry recorded 48 distinct provider request IDs, 96 ledger events
(48 started and 48 terminal), 51,592 prompt tokens, 2,008 completion tokens,
53,600 total tokens, and mean observed latency 2,181 ms. Provider model identity
was `glm-4.6v` for every completed call.

## 2. Frozen primary result

Terminal counts:

| Variant | valid | invalid response | provider failure |
|---|---:|---:|---:|
| `BASELINE_A` | 11 | 1 | 0 |
| `BASELINE_B` | 12 | 0 | 0 |
| `OPTION_ORDER_REVERSED` | 12 | 0 | 0 |
| `PARAPHRASED_ELICITATION` | 12 | 0 | 0 |

Because the frozen gate required all 12 reports in every variant to parse,
`allReportsValid=false`. All three development gates are false and the primary
result is `SENSOR_FAIL`.

Among the 11 primary valid pairs:

| Comparison against `BASELINE_A` | valid pairs | mean TV | median TV | max TV | unique-top agreement |
|---|---:|---:|---:|---:|---:|
| exact repeat `BASELINE_B` | 11/12 | 0.013636 | 0 | 0.099999 | 11/11 |
| option order reversed | 11/12 | 0.031818 | 0 | 0.200000 | 11/11 |
| paraphrased elicitation | 11/12 | 0.027273 | 0 | 0.100000 | 11/11 |

These 11-pair values are descriptive. They cannot replace the registered
denominator or turn the failed canary into a pass.

## 3. Failure localization

The sole strict-parse failure was task 36, agent 2, `BASELINE_A`, position 4:

```json
{"probabilities":{"opt_1":0.333333,"opt_2":0.333333,"opt_3":0.333333}}
```

Its decimal values sum to `0.999999`, exactly the intended inclusive
`1e-6` boundary below one. Binary floating-point evaluation exceeded the code
tolerance by approximately `2.9e-17`, so the current parser classified it as
`sensor_canary_probability_sum_invalid`. This is a parser boundary defect and
must not be described as model format noncompliance.

The other three responses for the identical task-agent view were:

| Variant / position | Report over `(opt_1,opt_2,opt_3)` |
|---|---|
| `BASELINE_B` / 1 | `(0.4, 0.2, 0.4)` |
| `OPTION_ORDER_REVERSED` / 2 | `(0.7, 0.1, 0.2)` |
| `PARAPHRASED_ELICITATION` / 3 | `(0.7, 0.1, 0.2)` |
| `BASELINE_A` / 4 | `(0.333333, 0.333333, 0.333333)` |

Thus the scientific failure is not only the numerical parser boundary. The
same frozen view changed from a uniform tie to a two-way tie and then a unique
`0.7` top report across call positions/variants.

## 4. Transparent boundary sensitivity

This secondary check does not renormalize or change any raw value. It only
treats the exact decimal sum `0.999999` as within the intended inclusive
`1e-6` contract and recomputes all 12 pairs.

| Comparison | mean TV | median TV | max TV | unique-top agreement | pairs with any tie |
|---|---:|---:|---:|---:|---:|
| exact repeat | 0.023611 | 0 | 0.133334 | 11/12 | 1 |
| option order reversed | 0.059722 | 0.0000005 | 0.366667 | 11/12 | 1 |
| paraphrased elicitation | 0.055555 | 0 | 0.366667 | 11/12 | 1 |

Under this sensitivity, the mean-TV tolerances would pass. Option-order and
paraphrase would also meet their `>=11/12` top-agreement tolerances. The exact
repeat gate still fails its frozen `12/12` unique-top requirement. Therefore the
overall `SENSOR_FAIL` conclusion is robust to the parser-boundary correction.

## 5. Scientific decision

**FACT:** the current single-elicitation GLM-4.6V probability sensor is not
qualified under its predeclared H1 gate.

**INFERENCE:** instability is concentrated in one of 12 task-agent views, not
uniform across the canary. That concentration is useful diagnostic evidence,
but it does not authorize deleting the unit or reporting only the stable 11.

**DECISION:** do not start the 160-call peer-message-bundle screen and do not use
single private reports as if they were noiseless state coordinates. Preserve
the raw canary as a negative measurement result. Any revised instrument must
fix the decimal-boundary implementation, define how ties enter reliability,
and obtain new evidence on a new version/held-out slice rather than repeatedly
rerunning this batch until it passes.

**IMPLEMENTED REPAIR (after freezing this result):** parser V1.1.0 now preserves
the strict schema and raw probabilities but adds only a bounded binary64
summation allowance around the unchanged inclusive `1e-6` contract. Historical
V1.0.0 remains available for exact replay. A zero-provider V2 plan now defines
four byte-identical canonical reports per held-out task-agent view, averages
`A1/A2` and `B1/B2` separately, and compares the two means using continuous
report geometry. Ties are diagnostic/indeterminate rather than automatic
failure of the probability-vector sensor. No V2 provider call has been made.

No conclusion about latent belief, correctness, collective-error dynamics,
governance efficacy, or Social Thermodynamics follows from this canary.
