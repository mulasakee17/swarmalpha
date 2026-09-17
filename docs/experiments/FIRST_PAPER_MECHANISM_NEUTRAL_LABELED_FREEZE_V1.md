# First-paper mechanism extension: neutral versus labeled disclosure

Status: **scientific contract frozen; implementation/canary not yet authorized**  
Version: `1.0.0`  
Date: `2026-08-22`

This document defines the smallest paid extension that can separate two
operational components of the existing ATTACKS treatment. It is a new
experiment identity. It does not revise the frozen V3.2 results, their
estimands, or their artifact directories.

## 1. Scientific question and claim ceiling

The existing ATTACKS treatment combines at least two observable operations:

1. re-exposing a deterministic bundle of already registered attack-selected
   observations; and
2. presenting those observations with an explicit attack/disconfirming
   relation label.

The extension asks whether the second operation adds an outcome difference
after the first is held fixed. It does **not** observe latent reasoning,
attention, salience, or internal thought. Any result is therefore a causal
comparison of prompt-visible treatments under this task/model configuration,
not a proof of internal reasoning reorganization.

## 2. Arms and estimands

The task and seed are the paired unit. Round 1 is generated once. Each arm
receives an independent deserialized copy of the same canonical Round-1
snapshot.

| Arm | Structured disclosure | Relation frame |
|---|---|---|
| `CONTROL` | none | none |
| `ATTACKS_NEUTRAL` | the attack-selected items, in identical order, with identical source IDs, content hashes and observation text | neutral recorded-evidence frame; no support/attack direction |
| `ATTACKS_LABELED` | byte-identical item identity to `ATTACKS_NEUTRAL` | agent-reported `attacks (disconfirms an option)` frame |

Let `B_a(t,s)` be the independently scored final Brier loss for task `t`
and seed `s` in arm `a`.

* `M1 = B_LABELED - B_NEUTRAL`: incremental labeled-frame effect.
* `M2 = B_NEUTRAL - B_CONTROL`: structured re-exposure effect.
* `M3 = B_LABELED - B_CONTROL`: full-treatment replication contrast.

Lower Brier is better. The primary mechanism contrast is `M1`; `M2` and `M3`
are internally pre-specified secondary contrasts. A positive value is deterioration
relative to the second named arm; a negative value is improvement.

No pooled model/seed grand estimate is permitted. Model and seed are reported
as separate execution strata unless a future analysis freeze explicitly
authorizes a hierarchical combination.

### 2.1 Minimum execution population

To maximize information per implementation change, V1 freezes one model and
one new state realization rather than adding another cross-model matrix:

* model: `zhipu:glm-4.6v`;
* formal seed: `3` (seeds 0/1/2 have already been inspected elsewhere);
* canary: task 14, excluded from formal inference;
* formal tasks: `15,16,17,18,19,20,21,22,23,25,26,27,29,30,31,34,35,36,37,38,40,41,42,43,44,46,47,48,49,50,51,52,53,55,56,57,58,59,60,61,62,63,64,65`;
* formal analysis units: 44 task×seed blocks;
* arms: exactly the three arms in Section 2;
* concurrency: 1;
* invocation: reuse the current GLM-4.6V strict adapter/parser/final elicitation
  configuration, `thinking=disabled`, discussion max tokens 768, final max
  tokens 256. The only new prompt-visible code is the frozen disclosure
  renderer.

The roster contains 173 agent positions. One Round-1 call plus three arms times
one Round-2 and one final call gives `173 × 7 = 1,211` planned logical calls.
At the existing frozen planning rate of 1,800 tokens/call, the estimate is
2,179,800 tokens. The formal hard stop is 3,000,000 observed provider tokens;
missing usage stops execution rather than being encoded as zero. This is a
planning statement, not a promise of actual usage.

Existing rows cannot be used as a zero-call Round-1 snapshot: they retain
belief/evidence summaries and hashes but not the complete Round-1 transcript
needed to reconstruct the exact continuation prompt. Combining a newly run
neutral arm with historical CONTROL/ATTACKS would also confound the mechanism
contrast with provider time and facility version. V1 therefore generates one
fresh Round 1 and all three continuations in the same task block.

### 2.2 Frozen arm order and failure policy

Formal tasks use a deterministic three-order rotation by zero-based position in
the frozen roster:

* position `mod 3 = 0`: `CONTROL → ATTACKS_NEUTRAL → ATTACKS_LABELED`;
* position `mod 3 = 1`: `ATTACKS_NEUTRAL → ATTACKS_LABELED → CONTROL`;
* position `mod 3 = 2`: `ATTACKS_LABELED → CONTROL → ATTACKS_NEUTRAL`.

This balances each arm's early/middle/late position to within one task. It does
not remove provider-time drift, so arm position and timestamps remain required
diagnostics.

Each logical call has one physical attempt. A transport failure, invalid parse,
missing final report, or incomplete arm makes the whole task block failed; it
is not selectively rerun or replaced. Other tasks may continue unless the
global token/usage stop fires. The primary estimate uses complete triplets,
while the planned-denominator report gives worst-case bounds using the Brier
contrast range `[-2,+2]` for every failed/missing task.

## 3. Frozen online boundary

The online path may read only the task's public context, the agent's private
information, the round-1 transcript, registered evidence content and declared
agent-reported relations. It must not read `outcome`, `groundTruth`,
`correctAnswer`, resolver output, or any offline correctness field.

`proposalCorrectness` is an offline-only analysis field. It must not occur in
the runtime request, disclosure object, prompt, parser, runner decision, or
cache key.

## 4. Identity and single-variable requirements

The attack bundle is selected once from the canonical Round-1 registry using
the existing deterministic attack selector. The mechanism extension must emit
an identity commitment over, in order:

* `contentHash`;
* `sourceAgentIds` in roster order;
* exact observation text;
* the selector and renderer versions.

`ATTACKS_NEUTRAL` and `ATTACKS_LABELED` must have the same item identity
commitment. A machine assertion must fail closed on any change to item count,
order, source IDs, hashes, or content. The only intended treatment difference
is the frame text. Prompt character/token counts are recorded because the two
frames cannot be assumed to be equal under a tokenizer.

The neutral frame uses a fixed field shape and a non-directional label such as
`recorded evidence`; it must not silently omit the relation field. The labeled
frame uses the same field shape and explicitly states that the relation is an
agent report, not a correctness certificate. Neither frame names the resolved
option or implies that the label is truth.

## 5. Facility audit: what is reusable and what is not

### Reusable (implemented)

* `createHiddenBenchTaskProjectionV1` provides the no-resolution task view.
* `run_v6_fork.ts` computes a shared Round-1 state and `forkInputHashV1`.
* `selectAllEvidenceV1` deterministically selects and deduplicates attack
  evidence.
* `parseBeliefResponse`, final elicitation parsing, and offline Brier scoring
  are reusable instruments.
* The GLM V4 plan/manifest machinery provides content-addressed execution and
  fail-closed completion policies.
* Existing audit tests cover forbidden truth-field names in outbound requests.

### Not sufficient without a new, isolated mechanism runner

* The old `ForkArm` type and disclosure builder are closed over
  `CONTROL/SUPPORTS/ATTACKS`; neutral/labeled arms cannot be added without
  changing the old runner's scientific identity.
* Existing call records keep request hashes but not the complete outbound
  prompt and parsed payload required by this extension's provenance gate.
* Existing arm execution is sequential and has no frozen block/randomized
  arm-order schedule to diagnose provider-time drift.
* Returned rows contain shared nested Round-1 references. A new runner must
  serialize and independently deserialize the canonical snapshot per arm;
  `structuredClone` at the return boundary is not a substitute for the
  round-start commitment.
* `forkInputHashV1` intentionally excludes arm-specific disclosure. The new
  runner needs a separate treatment/disclosure commitment while retaining the
  shared pre-arm hash.

Consequently, the existing frozen runner and artifacts remain untouched. The
extension is a separate runner, plan, manifest, analyzer and output directory
that imports only pure selectors/parsers/scorers.

## 6. Required artifacts before any paid canary

1. A frozen plan with task IDs, seeds, model, arm set, call budget, provider
   configuration, arm-order/block schedule, analysis spec hash and stop line.
2. A canonical Round-1 snapshot per task/seed, including a shared pre-arm
   commitment and a deserialization check for each arm.
3. Per-arm outbound prompts, raw responses, parsed responses, model/provider
   identity, request IDs, usage, and terminal failure codes. Unknown usage is
   never encoded as zero.
4. A treatment record containing the frame version, item identity commitment,
   treatment prompt hash and observed prompt length.
5. A manifest verifier that rejects extra or unregistered scientific files,
   duplicate task/seed/arm rows, mismatched shared state hashes, or missing
   complete-arm triples.
6. An independent analyzer that recomputes final Brier from final beliefs and
   resolution only offline, then reports `M1`, `M2`, and `M3` with paired task
   bootstrap intervals and explicit failed/skipped/missing bounds.

## 7. Canary and stop rules

The single-task canary must pass all of the following before formal execution:

* every expected Round-1, Round-2 and final response is valid;
* no unknown usage, unfinished attempt, retry, duplicate request hash or
  unregistered output;
* all three arms share the same Round-1 state and pre-arm commitment;
* neutral/labeled item identity assertion passes;
* no forbidden truth field appears in any outbound request or raw prompt;
* the analyzer reproduces the synthetic known-answer fixture and rejects a
  tampered identity, state hash, missing arm, or truth-leak artifact;
* observed token usage stays below the frozen budget margin.

Any canary failure is a stop, not an invitation to patch during execution.
Changing the parser, prompt contract, arm identity, selection rule, or
analysis estimand requires a new version and a new canary.

## 8. Analysis and interpretation boundary

The primary report is the paired task-level distribution of `M1`. Report the
full task table, bootstrap interval, missing-data accounting, prompt-length
diagnostics, and the `M2/M3` contrasts. Stratify descriptively by the
internally pre-specified wrong/correct Round-1 state only in offline analysis; do not use
truth to select an online arm or to define the attack bundle.

The independent analyzer uses task-level paired differences and a 10,000-draw
percentile bootstrap with seed `0x5EED0F`. For `M1` it reports exactly one of:

* `LABEL_BENEFIT` if the 95% interval is entirely below zero;
* `LABEL_HARM` if the 95% interval is entirely above zero;
* `PRACTICALLY_SMALL` if the entire interval lies inside `[-0.10,+0.10]`, a
  pre-specified 5% band of the multiclass Brier range;
* `INCONCLUSIVE` otherwise.

`M2` and `M3` receive the same descriptive statistics but are secondary; no
unlabeled pooling with earlier DeepSeek or GLM effects is permitted. Fresh
Round-1 wrong/correct strata are secondary explanatory analyses and cannot
change the primary classification.

The following statements are allowed if supported by the frozen analysis:

* “Under the tested model, tasks, and fork protocol, adding the labeled
  relation frame changed final Brier relative to the identical neutral bundle.”
* “The observed difference is consistent with a framing increment, with the
  stated prompt-length and task-distribution limitations.”

The following are not licensed by this experiment alone:

* “the model attended to the attacks”;
* “reasoning structure changed”;
* “the detector is general”;
* “ATTACKS is universally beneficial”;
* a cross-model or cross-task-family causal law.

## 9. Inclusion gate for the first paper

Mechanism results may enter the main paper only if the facility and canary
gates pass, formal execution is complete under the frozen plan, the independent
analysis is reproducible, and the result provides information beyond the
current trajectory analysis. The prose must replace weaker post-hoc mechanism
speculation rather than expand the claim surface. Otherwise the result stays
in the supplement or becomes a second-paper seed, and the first paper's
scientific freeze is protected.

## 10. Current status

* Implemented: reusable selector/parser/scorer and old fork audit machinery.
* Tested: existing no-truth and fork-isolation tests; the neutral/labeled
  mechanism extension itself is not yet provider-tested.
* Proposed: this contract, a new isolated runner, its manifest/analyzer, and
  the paid canary.
