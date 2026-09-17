# Collective Dynamics Engine Reuse and Retirement Audit

Status: **CURRENT DESIGN DECISION — NO NEW PROVIDER RESULT**  
Date: 2026-08-24

## 1. Decision

**FACT.** The legacy engines contain useful execution mechanics, but they do
not provide valid evidence for the current Collective Epistemic State–Response
claim. They are `LEGACY_READ_ONLY`; this audit promotes no legacy result.

**DECISION.** Reuse only the timing, isolation, and artifact ideas that survive
current contracts. Retire the old state-mutation, influence-attribution,
thermodynamic naming, and global-polarity intervention logic.

**DECISION.** New CLI execution of the V1 `ATTACKS_NEUTRAL` response phase is
retired. Existing artifacts, hashes, replay, and offline analyses remain
available as a negative development result. Formation-only monitoring remains
available behind the existing execution authorization gate.

The reason is semantic, not cosmetic: an evidence item labeled only
`supports|attacks` does not identify which categorical option it supports or
attacks. More seeds would replicate an undefined mixture rather than qualify a
corrective operator.

## 2. Audit rule

Every retained quantity or mechanism must name:

1. its observable input;
2. the construct it is allowed to describe;
3. what it must not be interpreted as;
4. the future decision or experiment it changes;
5. a falsification or qualification test independent of that decision.

Mechanisms that directly rewrite a model's recorded belief, infer causal
influence from text correlation, or use outcome authority online fail this rule.

## 3. What is retained unchanged in principle

| Historical mechanism | Decision | Current admissible meaning |
|---|---|---|
| Per-round memory and cloned event records (`discussion/memory.ts`, `eventTracker.ts`) | **RETAIN CONCEPT** | Append-only observations with no cross-run aliasing |
| One committed round before the next intervention takes effect (`discussion/index.ts`) | **RETAIN** | Measure at (t); deliver an assigned action at (t+1) |
| Explicit `reset()` of engine, estimator, termination state, and PRNG | **RETAIN** | Prevent cross-run state leakage |
| Seeded ordering and exact artifact hashes | **RETAIN** | Reproducible scheduling and same-state binding |
| Fixed-round execution (`TerminationDecider`, current V6 runner) | **RETAIN FOR MEASUREMENT** | Comparable observation horizons without post-treatment early truncation |
| Previous-round-only synchronous visibility | **RETAIN** | Every agent at round (t) sees the same completed public carrier from (t-1) |
| Full raw prompt/response capture plus isolated final elicitation | **RETAIN** | Audit delivered information separately from terminal measurement |

These are research-infrastructure safeguards. They do not themselves establish
dynamics, state sufficiency, recovery, or governance efficacy.

## 4. What may be adapted, but not copied

| Historical mechanism | Admissible adaptation | Required change before use |
|---|---|---|
| Cross-examination (`crossExamination.ts`) | A content-neutral protocol baseline that asks agents to address named claims | Remove binary pro/con camps, confidence-weighted argument ranking, keyword concession detection, heuristic belief shifts, and synthesized verdicts; retain individual post-protocol reports and independent outcome scoring |
| Agent dropout (`sensitivityTrace.ts`) | A presence/absence perturbation for estimating response sensitivity | Run exact same-state forks with randomized omission; never compare unmatched rounds or label the result causal influence without an identification design |
| Discussion topology (`topology.ts`) | A later randomized interaction factor | Treat flat/grouped topology as a treatment, keep information budgets comparable, and do not add it before the basic trajectory is qualified |
| Asynchronous speaking (`asyncEngine.ts`) | A later timing/scheduling factor | Randomize or predeclare schedules; remove heuristic willingness scores and system-driven passive belief updates |
| Continue discussion | A compute-duration baseline | Add rounds symmetrically or randomize duration; remove keyword-based claims that information coverage is complete or genuine |
| Force reflection prompt | A separately randomized protocol arm | Deliver only text; do not numerically pull beliefs toward the group mean or reduce confidence in code |
| MeasurementLayer vector calculations | Candidate descriptive observables | Rename by formula, qualify prompt sensitivity and predictive sufficiency, and keep them out of control until held-out tests pass |

## 5. What is retired

### 5.1 Intervention and causal semantics

- **RETIRE:** global `supports|attacks` selection as a categorical corrective
  evidence operator. `ATTACKS_NEUTRAL` is now a frozen historical arm label.
- **RETIRE:** `IntroduceDiversityIntervention`'s random numerical mutation of
  agent beliefs. It simulates the desired outcome instead of eliciting a model
  response to an intervention.
- **RETIRE:** `ForceReflectionIntervention`'s code-side movement toward the
  group mean and code-side confidence reduction.
- **RETIRE:** `ReduceWeightIntervention`'s interpretation of graph-edge edits as
  reduced real influence. The prompt can be studied separately; the mutated
  edge is not evidence that a model discounted a source.
- **RETIRE:** bundled `random-intervene`. It mixes mechanisms and cannot identify
  which carrier changed the result.
- **RETIRE:** `DecisionTraceBuilder` answers such as “who influenced whom” when
  based on graph weights, references, belief similarity, or adjacent belief
  change. Those are associations or parser heuristics, not influence estimates.
- **RETIRE:** heuristic cross-examination `beliefShift`, concession-keyword
  detection, and synthesized verdict as outcome.
- **RETIRE:** legacy dropout outputs as counterfactual or causal effects when
  with/without observations do not share the same frozen state.

### 5.2 State and physical semantics

- **RETIRE:** scalar belief in ([-1,1]) as the state of a multi-option ranking
  task. It collapses different categorical distributions into one number.
- **RETIRE:** legacy `R/T/H/F` as four independent physical coordinates. In the
  asynchronous path, `R`, `T`, and `H` are different transforms of the same
  scalar-belief dispersion; `F` is a hand-built composite.
- **RETIRE:** `temperature`, `free energy`, `crystallized`, `quenched`, `chaotic`,
  `phase transition`, `attractor`, and `basin` as empirical claims from current
  data. Literal use would require independently validated dynamics, repeated
  transition behavior, and appropriate scaling or stability evidence.
- **RETIRE FOR DYNAMICS STUDIES:** state-dependent early stopping. It truncates
  precisely the trajectories needed to test persistence and relapse and makes
  observation length a post-state variable.
- **RETIRE:** evidence-item count, keyword coverage, declared lineage count, or
  source diversity as evidence correctness or statistical independence.
- **RETIRE:** LLM self-reported confidence as calibrated correctness
  probability. It remains an optional prompt-conditioned sensor only.

### 5.3 Historical experimental evidence

- **DO NOT PROMOTE:** `legacy/experiments/v2`, `legacy/experiments/lunar_survival`, the frozen
  async engine, or old thermodynamic outputs as current V6 evidence.
- The lunar-survival path used keyword-position accuracy, contained documented
  intervention-delivery and random-arm bugs, and sometimes modified state in a
  way the model could not observe. It is useful as a failure ledger only.
- The V2 cross-examination path exposed ground truth in stored result objects,
  reduced multi-option tasks to a scalar belief, and used a synthesized verdict.
  Its protocol idea may be rebuilt, but its estimates do not transfer.

## 6. Current quantities: exact claim ceiling

Let (p_{i,t}) be agent (i)'s normalized categorical probability report and
(ar p_t=n^{-1}\sum_i p_{i,t}).

| Stored field | Formula/observable | Allowed interpretation | Prohibited interpretation |
|---|---|---|---|
| `pooledBelief` | (ar p_t) | Equal-weight mean of current prompt-conditioned reports | True group belief or optimal aggregation |
| `withinAgentUncertainty` | (n^{-1}\sum_i H(p_{i,t})/\log K) | Mean reported distributional entropy | Psychological uncertainty or calibrated confidence |
| `pooledUncertainty` | (H(\bar p_t)/\log K) | Entropy of the pooled report | Evidence entropy |
| `betweenAgentDisagreement` | (H(\bar p_t)-n^{-1}\sum_iH(p_{i,t})), normalized | Generalized Jensen–Shannon disagreement among reports | Semantic disagreement, causal conflict, or independence |
| `pooledCertainty` | (max_y \bar p_t(y)) | Maximum pooled probability mass | Probability the group is correct |
| `updateActivityFromPrior` | (n^{-1}\sum_i TV(p_{i,t-1},p_{i,t})) | Mean adjacent-round report revision | Social influence or learning from correct evidence |
| strict consensus | Complete roster and identical unique individual argmax | Unanimous reported top option | Agreement in reasoning or truth |
| Brier loss | (sum_y(\bar p_t(y)-1[y=y^*])^2) | Offline outcome-dependent evaluation | Online state variable or routing input |

The entropy decomposition is mathematically well-defined. Its construct is
still narrow: it describes the geometry of explicit probability reports. The
current state does not encode message meaning, claim-level support relations,
who attended to which public message, or calibrated latent belief. Therefore it
is a **reported-belief macrostate**, not a complete group-discussion state.

`exposureConditionedRevision` and `observedResponseConcentration` are honestly
unavailable in the current dynamics artifacts because public messages were
visible but peer probability reports were not explicitly delivered as report
objects. Missing exposure is not encoded as zero influence.

## 7. Minimal current state

For monitoring, retain only:

\[
S_t^{obs}=(\bar p_t,\; \overline{H}_t,\; JSD_t,\; A_t,\; roster_t),
\]

where (A_t) is mean adjacent-round total variation and is undefined at the
first elicitation. `pooledCertainty` is a derived view of (ar p_t), not an
additional coordinate. Strict-consensus status is also derived. Ground-truth
error and Brier loss remain outside (S_t^{obs}).

This representation earns continued use only if perturbing the elicitation
prompt or option order does not dominate the between-state variation and if it
predicts held-out transition classes better than simpler baselines. Otherwise
the state-sufficiency hypothesis is rejected or narrowed.

## 8. Minimal execution path: monitor, then perturb, then govern

### Stage M — monitoring qualification

Use the existing formation-only path first. R1 is an isolated pre-discussion
elicitation; R2–R3 see only the immediately preceding public-message round.
Expand task-seed coverage without any disclosure arm and test task-level entry,
persistence, escape, and relapse. Keep fixed rounds and preserve all reports and
messages. Before scaling, add zero-provider option-permutation invariance tests
and a small repeated-elicitation prompt-sensitivity canary.

The monitoring claim passes only if trajectories contain transitions not
already present at R1 and report geometry is not mostly an elicitation artifact.

**CURRENT PROGRESS.** The zero-provider projection audit passed 170/170 checks
over 30 stored GLM rounds. This qualifies deterministic computation, not the LLM
sensor. See
[`COLLECTIVE_DYNAMICS_STATE_INVARIANCE_AUDIT_RESULTS_2026-08-24.md`](COLLECTIVE_DYNAMICS_STATE_INVARIANCE_AUDIT_RESULTS_2026-08-24.md).
The next frozen gate is
[`COLLECTIVE_DYNAMICS_PROMPT_SENSITIVITY_CANARY_V1.md`](COLLECTIVE_DYNAMICS_PROMPT_SENSITIVITY_CANARY_V1.md).

### Stage P — controlled perturbation

Only after Stage M, introduce one factor at a time from the same frozen state.
The first admissible evidence carrier must record an explicit categorical
`targetOption` and relation to that target, with an `unclear`/abstain value. Its
qualification must measure target and relation agreement under option-order and
prompt perturbations. The online selector may attack the current unique pooled
top; it may not read the correct answer.

Compare it against CONTROL and a content-, item-count-, and length-matched random
bundle. This is a perturbation experiment, not yet governance.

### Stage G — governance

Governance begins only when a truth-blind pre-action detector can identify a
failure-prone state on held-out tasks, an admissible action changes an
independent outcome, and correct-state harm plus abstention/escalation costs are
reported. No current macro quantity has that permission.

## 9. Lowest-engineering next decision

Do **not** build a new thermodynamic engine, asynchronous scheduler, topology,
cross-examination judge, or ATTACKS replacement now. Reuse the current
formation runner and analyzer to answer the prior question: does discussion
ever create a wrong consensus that was absent at R1, and are its transitions
stable across seeds? If the answer remains no, the formation-dynamics claim is
weakened before intervention engineering begins.
