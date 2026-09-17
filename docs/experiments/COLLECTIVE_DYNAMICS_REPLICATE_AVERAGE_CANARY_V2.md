# Collective Dynamics Replicate-Average Canary V2

Status: **EXECUTED; CANONICAL REPEATABILITY GATES PASS**  
Date: 2026-08-28

## 1. Question and claim ceiling

**DESIGN INTENT** — Test whether averaging two byte-identical probability
elicitation calls yields a reported-belief measurement that is reproducible
against a second two-call block on the same frozen task-agent view.

**CLAIM CEILING** — A pass would qualify this exact GLM-4.6V instrument for the
next development screen. It would not establish latent-belief access,
cross-model reliability, construct validity, collective dynamics, or governance
efficacy. A fail would close the current numeric self-report sensor path unless
a substantively different instrument is justified.

## 2. Frozen units and calls

The tasks are positions `2/5/8` of the pre-existing truth-free systematic dev10
order: `8/29/50`. Their stored post-round-3 rosters contain `3/4/3` agents.
Therefore the registered denominator is:

```text
10 task-agent frozen views × 4 exact repeats = 40 calls
```

The earlier planning assumption of four agents per task was false for tasks 8
and 50. It was corrected before any V2 provider call; no synthetic or missing
agent was added and the held-out tasks were not replaced to preserve a round
number.

For each frozen view, the four distinct request identities are `A1/B1/A2/B2`.
Their system prompt, user prompt, response format, model configuration and
prompt hash are byte-identical within the view. A cyclic order makes each label
appear in every position either two or three times; the two-report A and B
blocks are exactly balanced over positions at the registered-sample level.

## 3. Parser and estimator

Parser V1.1.0 retains the strict JSON-only schema and the inclusive sum
tolerance `1e-6`. It adds only a bounded binary64 accumulation allowance:

\[
8\,\epsilon_{64}\max(1,K).
\]

It does not renormalize, fill keys, remove Markdown fences, retry, or repair a
response. Historical V1 results continue to replay with parser V1.0.0.

For agent-view \(i\), define:

\[
\hat p_i^A=\frac{p_i^{A1}+p_i^{A2}}{2},\qquad
\hat p_i^B=\frac{p_i^{B1}+p_i^{B2}}{2}.
\]

The primary unit quantity is
\(TV(\hat p_i^A,\hat p_i^B)\). Unique top is diagnostic only: a tie in either
block is `indeterminate_tie`, not an automatic continuous-measurement failure.

For each task and each block, the analyzer also computes the equal-agent pooled
report, mean normalized report entropy, and normalized generalized Jensen--
Shannon disagreement. Task is the inference cluster; the 10 agent views are not
treated as 10 independent task replicates.

## 4. Predeclared development gates

All 40 reports must parse as valid. Then all of the following must hold:

- mean unit split-half TV `<= 0.05`;
- nearest-rank P90 unit split-half TV `<= 0.10`;
- for every task, pooled-report TV `<= 0.05`;
- for every task, absolute mean-normalized-entropy difference `<= 0.05`;
- for every task, absolute normalized-generalized-JSD difference `<= 0.05`.

Provider transport/authentication failures make the batch
`CANARY_INVALID_PROVIDER`. A completed batch with malformed reports or any
failed measurement gate is `SENSOR_FAIL`. These are development tolerances, not
estimated universal constants.

## 5. Frozen provenance

**FACT** — The zero-provider freeze was generated and independently reloaded by
the verifier:

```text
output:
  results/v6_collective_dynamics_replicate_average_canary_v2_glm46v_seed1
planHash:
  sha256:656b9fc3526efa84798e54f63359d86dd22fffac30c0ce5df4b2a2dee25897d5
freezeHash:
  sha256:41043a9ca5e7fe231a588c68d2e4fdd0efe7167e1b5f1a74ca4b0f71a27d6bc9
sourceFormationHashes:
  task 8  sha256:d349551a63d77e717679d5cc4e5d8ae35eeb45e526135943ff0cf627e5578928
  task 29 sha256:3b0fccbd43596d60677dc285049d9eccdb7a0a48dbcbba3ec25ec34268b37f9d
  task 50 sha256:2a34b83faa37a1ce5c3df2a71c0c76abc7e6d8ab7eae467a059dc1a8160dc181
```

**FACT** — Deterministic tests cover plan/freeze verification, exact duplicate
prompt hashes, distinct request hashes, position near-balance, parser V1.1
replay, append-only terminal accounting, estimator analysis, and tamper
rejection. Type checking passes. The authorized V2 batch completed 40/40
valid reports and passed all predeclared canonical repeatability gates. See
`COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_CANARY_V2_RESULT_2026-08-28.md`.

**LIMITATION** — The batch repeats one exact canonical prompt under one
GLM-4.6V configuration and therefore does not test option-order, wording,
model, seed, language, or task-family invariance. The V1 cross-prompt
sensitivity failure remains in force. M1 has no execution authority unless a
new owner-approved freeze is supplied.

## 6. Code authority

- contract/freeze/execution semantics:
  `experiments/campaign/v6/collectiveDynamicsReplicateAverageCanaryV2.ts`
- fail-closed file runner:
  `experiments/campaign/v6/run_v6_collective_dynamics_replicate_average_canary_v2.ts`
- truth-blind analyzer:
  `experiments/campaign/v6/analyze_v6_collective_dynamics_replicate_average_canary_v2.ts`
