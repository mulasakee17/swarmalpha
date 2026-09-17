# Collective Dynamics State-Invariance Audit Results

Status: **ZERO-PROVIDER COMPUTATIONAL AUDIT — PASS**  
Date: 2026-08-24

## 1. Result

**FACT.** The deterministic reported-belief projection and offline scoring path
passed all 170 predeclared invariance/equivariance checks over the 10-task,
30-round GLM-4.6V formation screen.

| Field | Value |
|---|---:|
| Tasks | 10 |
| Rounds | 30 |
| Checks | 170 |
| Failures | 0 |
| Audit hash | `sha256:f499ae6244026eaa636d5aa5f2e2c0f0390e2a0283edd5fa82cef8eb8af9edba` |

The replayable artifact is
`results/v6_collective_dynamics_v1_glm46v_monitor_screen10_seed1/state-invariance-audit.json`.

## 2. Checks

The audit reconstructed every stored state and tested:

1. exact invariance to reversing agent roster, report input, and evidence input order;
2. exact invariance to probability-object key insertion order;
3. metric invariance to reversing the canonical option sequence;
4. metric equivariance under a bijective synthetic relabeling of every option;
5. adjacent-round total-variation invariance under option order/relabeling;
6. offline multiclass-Brier invariance under option order/relabeling.

Maximum absolute numerical differences were:

| Check | Maximum difference |
|---|---:|
| Agent/record input order | 0 |
| Probability key order | 0 |
| Claim option order | (2.22\times10^{-16}) |
| Option relabeling | (2.22\times10^{-16}) |
| Adjacent-round TV | (5.55\times10^{-17}) |
| Offline Brier | (2.22\times10^{-16}) |

The nonzero values are floating-point roundoff below the frozen (10^{-12})
tolerance.

## 3. Interpretation

**SUPPORTED.** The stored macro quantities are reproducible functions of the
categorical reports. Their values are not artifacts of JavaScript record order,
agent input order, or arbitrary option naming/order.

**NOT SUPPORTED.** This audit does not show that GLM-4.6V emits the same report
when option order or elicitation wording changes. It does not validate latent
belief, message semantics, calibration, state sufficiency, Markovianity, or a
governance rule.

This distinction is decisive: computational invariance qualifies the measuring
code; prompt-sensitivity experiments qualify the LLM report as a sensor.

## 4. Decision

Proceed to the smallest repeated private-elicitation canary. Do not add
ATTACKS, new discussion rounds, topology, early stopping, or thermodynamic
control variables before the canary estimates the report-sensor noise floor.

