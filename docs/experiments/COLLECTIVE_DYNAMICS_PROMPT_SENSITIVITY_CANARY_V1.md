# Collective Dynamics Prompt-Sensitivity Canary V1

Status: **EXECUTED; PRIMARY H1 RESULT = SENSOR_FAIL**  
Date: 2026-08-28

## 1. Question

From one identical frozen information state, how much does an agent's private
categorical probability report change under an exact repeat, option-order
reversal, or semantically equivalent elicitation wording?

This canary qualifies a prompt-conditioned report sensor. It is not a discussion
experiment, intervention, governance policy, calibration test, or latent-belief
measurement.

## 2. Frozen source states

Use seed-1 R3 artifacts for task IDs `1, 36, 64` from the existing systematic
screen. These are positions 1, 6, and 10 in the pre-existing truth-free task-ID
sample; selection does not use outcome, consensus correctness, or response-arm
behavior.

Each task has four agents. Every elicitation for one task-agent receives exactly:

- the stored public context;
- that agent's stored private information;
- the complete stored R3 public-message set in canonical order;
- a declared finite, mutually exclusive, exhaustive, single-outcome claim;
- stable option IDs (`opt_1`, ...) plus their canonical labels;
- no outcome, resolver artifact, peer probability report, or response-arm text.

The elicitation is private. Its output is never returned to another agent.

## 3. Variants and call budget

| Variant | Change from baseline | Calls |
|---|---|---:|
| `BASELINE_A` | Canonical private probability prompt | 12 |
| `BASELINE_B` | Exact prompt repeat; only request identity differs | 12 |
| `OPTION_ORDER_REVERSED` | Reverse only option presentation; stable IDs and required-key list remain canonical | 12 |
| `PARAPHRASED_ELICITATION` | Change only the probability-report instruction wording | 12 |
| **Total** | 3 tasks × 4 agents × 4 variants | **48** |

Provider/model remains Zhipu GLM-4.6V, temperature 0, seed 1, thinking disabled,
single attempt, no retry, and a 256-token output cap. Raw system prompt, user
prompt, response, token usage, latency, request hash, response hash, and model
identity must be stored.

The instrument identity is the full tuple `(model ref, invocation config,
prompt ref and exact bytes, parser ref, language, task-view contract)`. Passing
this canary qualifies only that tuple on this GLM/HiddenBench development slice;
it is not transferable evidence for another model, language, prompt, or task
family.

## 4. Response contract

The model returns only:

```json
{
  "probabilities": {
    "opt_1": "<finite JSON number>"
  }
}
```

The displayed label is never used as the response key. The parser requires
every stable option ID exactly once, rejects duplicate JSON keys and extra root
fields, requires finite values in ([0,1]), and requires a total within
(10^{-6}) of one. It must not strip markdown fences, repair missing
options, infer numbers from prose, renormalize an invalid vector, or retry a
failed response. Missingness is reported by variant.

The prompt contains no numerical example distribution, because an all-zero or
otherwise salient example can anchor the report and can itself violate the
sum-to-one contract.

The pre-response wording pair was tightened on 2026-08-28 before provider
execution:

```text
Canonical:
For every listed option ID, report the probability that it is the single
correct outcome under the supplied view.

Paraphrase:
Using the supplied view, assign each listed option ID its probability of being
the one correct outcome.
```

Both sentences target the same estimand,
`P(option is the single correct outcome | supplied view)`. A machine test
replaces the respective sentence with one placeholder and requires all
remaining user-prompt bytes to be identical. This removes the earlier
`most likely` versus `express uncertainty` framing difference. The project
owner approved adopting this pair and classified it `EQUIVALENT` before any
provider response was generated or inspected.

Pre-response semantic-review record:

| Check | Protocol/owner review |
|---|---|
| same object: every stable option ID | pass |
| same estimand: probability of the single correct outcome | pass |
| same conditioning information: supplied view only | pass |
| same cardinal response scale and normalization contract | pass |
| neither asks for reasoning, confidence prose, or evidence | pass |
| neither asks for sharper, flatter, conservative, or first-place-only reports | pass |
| exact remaining prompt bytes after sentence replacement | machine-test pass |

Review status: `OWNER_REVIEWED_EQUIVALENT`. This is sufficient for the small
development canary and permits setting `SENSOR_CANARY_SEMANTIC_REVIEWED=yes`
when provider execution is separately authorized. Independent review is
deferred to a paper-level confirmatory instrument freeze; it is not required
for this development batch.

No message, reasoning, confidence, evidence, `supports|attacks`, or target
option annotation is requested. This isolates the probability sensor from the
earlier evidence carrier.

## 5. Predeclared comparisons

The experimental unit is a task-agent frozen state. For variant (v), compare
its report (p_i^v) with `BASELINE_A` using:

\[
TV_i^v=\frac12\sum_y|p_i^v(y)-p_i^A(y)|.
\]

Report for each comparison:

- all 12 paired TVs, mean, median, maximum, and bootstrap interval;
- unique-top agreement count, with ties reported separately;
- absolute normalized-entropy change;
- task-level change in pooled belief, mean report entropy, generalized-JSD
  disagreement, and pooled maximum mass;
- parse/missingness count by variant.

`BASELINE_A` versus `BASELINE_B` estimates provider/repeat noise.
`OPTION_ORDER_REVERSED` estimates option-presentation sensitivity above that
noise floor. `PARAPHRASED_ELICITATION` estimates wording sensitivity above the
same floor. No ground truth is required or admitted.

## 6. Development gates

These are design tolerances for whether the sensor is usable in the next
experiment; they are not population-calibrated scientific constants.

1. Every variant must parse for all 12 units. Otherwise qualification fails.
2. Exact repeat: 12/12 unique-top agreement and mean TV no greater than 0.05.
3. Reversed options: at least 11/12 top agreement and mean TV no greater than 0.10.
4. Paraphrase: at least 11/12 top agreement and mean TV no greater than 0.10.
5. Variant-induced task-level macrostate changes must be reported even when the
   individual gates pass; they must not be hidden by averaging.

Because (n=12) is a canary, passing authorizes only a formation-monitoring
development batch. It does not validate the sensor for a paper claim.

Provider/network/auth/rate-limit failures make the batch
`CANARY_INVALID_PROVIDER`, not `SENSOR_FAIL`, because no sensor report was
observed. A versioned transport retry may reuse the exact frozen requests while
preserving the failed ledger. `invalid_response` after a completed provider
call remains a sensor qualification failure.

## 7. Consequences

- If exact-repeat fails, stop: provider nondeterminism is too large for the
  current single-elicitation state representation.
- If only option order or paraphrase fails, either use a precommitted multi-prompt
  measurement ensemble or narrow the state to more stable categorical features;
  do not average silently after seeing outcomes.
- If all gates pass, expand formation-only task-seed trajectories and test
  whether discussion-induced wrong consensus occurs after a non-wrong R1 state.
- Do not build an option-targeted perturbation carrier until the formation and
  sensor stages both survive their gates.

The zero-provider path is:

```text
npm run dynamics:sensor-canary -- --plan
```

It reads and verifies the three formation artifacts, materializes 12
truth-blind post-R3 snapshots and 48 position-balanced request cells, and writes
`plan.json` plus `freeze.json` with no provider call. The four variants are
cyclically balanced so every variant appears three times in each within-unit
position. `BASELINE_A/B` have byte-identical prompt hashes but distinct request
identities.

Real execution remains behind `--execute`, `RUN_AUTHORIZED=yes`, and
`SENSOR_CANARY_SEMANTIC_REVIEWED=yes`. The second gate means a human has checked
that the canonical and paraphrased instructions preserve the intended
semantics before any response is observed. Execution uses the raw provider
boundary, makes one attempt per frozen cell without retry, appends a `started`
event before each call and its complete terminal record before the next call,
and refuses to overwrite an existing ledger or run artifact.

The contract is implemented in
`experiments/campaign/v6/collectiveDynamicsPromptSensitivityCanaryV1.ts`; the
fail-closed file runner is
`experiments/campaign/v6/run_v6_collective_dynamics_sensor_canary_v1.ts`, and
the truth-blind paired/task-cluster analyzer is
`experiments/campaign/v6/analyze_v6_collective_dynamics_sensor_canary_v1.ts`.
Adversarial parser, freeze, position-balance, raw-response, terminal-ledger and
replay-tamper tests pass locally. A zero-provider integration test also verifies
the current stored task `1/36/64` formation artifacts and reconstructs all 12
post-R3 views and 48 cells. This is implementation/artifact-compatibility
evidence only; the empirical result is the separately recorded H1
`SENSOR_FAIL`, not a consequence of these implementation tests.

## 8. Result pointer

The canary was executed on 2026-08-28. The first sandboxed batch was transport
invalid; a byte-identical freeze was then completed with network access. The
primary result is `SENSOR_FAIL`, localized to one task-agent view but robust to
the identified decimal-boundary parser sensitivity. See
`COLLECTIVE_DYNAMICS_PROMPT_SENSITIVITY_CANARY_V1_RESULT_2026-08-28.md`.
