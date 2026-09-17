# SwarmAlpha Current Route and Methodology

Status: **METHODOLOGICAL AUTHORITY; EXECUTION ORDER UPDATED 2026-08-22**
Date: 2026-08-22
Purpose: answer what the project is solving now, how it studies the problem, what the evidence says, and what work is authorized next.

> **Current execution note:** the `H_E/kappa V1` audit ended with `STOP` for the
> degenerate macrostate and no policy authorization. Later identical-state fork
> experiments established a bounded evidence-exposure response across DeepSeek
> and GLM-4.6V batches. The current question is which operational component
> produces that response and which pre-action state variables generalize it.
> Execution authority is
> `docs/plans/SWARMALPHA_PROJECT_DEVELOPMENT_PLAN_2026-08-22.md`.

This document remains the methodological and definitions entry point. It does not replace object-level architecture contracts, experiment result reports, or the 2026-08-22 execution plan. When a claim conflicts with implementation or replayable artifacts, follow `docs/REASONING_PROTOCOL.md` and the stronger evidence.

## 1. Current route in one sentence

> SwarmAlpha studies whether observable micro-level reports and information flow can define a low-dimensional collective state that predicts when a truth-blind information intervention will help, do nothing, or harm independently evaluated multi-agent decision quality.

The current paper is not trying to prove a universal governance system, a literal physical thermodynamics, or access to latent belief. It is testing a narrower micro-to-meso response hypothesis with an auditable randomized experiment.

## 2. Practical problem

In a real multi-agent collaboration, the correct answer is normally unavailable when the system must decide whether to:

- continue discussion;
- request independent verification;
- introduce new evidence;
- protect a minority position;
- consult another model/tool/person;
- stop and act.

Simple majority, consensus, or reported confidence cannot solve this reliably. A group can agree and be wrong; several agents can repeat one source; a high-confidence report can be poorly calibrated; an intervention can disturb a correct group.

SwarmAlpha therefore asks two linked questions:

1. **State question:** what observable collective state is the group in before action?
2. **Response question:** in that state, what is the expected quality and cost effect of a particular information action?

The second question is conditional. The project no longer assumes one governance action is beneficial on average in every state.

## 3. Current empirical reality

### Implemented and tested

- architecture-enforced categorical probability reports and evidence/provenance events;
- event identity, exposure, supersession, treatment assignment, action lifecycle, and deterministic replay;
- public-only verification delivery with apply/sham/holdout Stage-2 randomization;
- independent final private elicitation;
- post-action claim resolution and pooled multiclass Brier outcome;
- schema-5 execution artifacts and 96/96 heldout replay.

### Observed

- identical-state forks show that the implemented direction-conditioned
  disclosure policy changes final pooled Brier relative to the implemented
  alternatives in DeepSeek and GLM-4.6V batches;
- the protected first-paper synthesis is frozen at V3.2; its evidence identity
  remains batch- and model-specific rather than a cross-model grand pool;
- a zero-provider post-hoc bundle audit found wrong-state
  `GAP_AS = Brier_SUPPORTS - Brier_ATTACKS` of `+0.5799` for task-equal pooled
  DeepSeek and `+0.4072` for GLM seed 2, with task-bootstrap intervals above
  zero in both views and no leave-one-task-out sign change;
- that L0 result concerns full selector bundles and model-self-labeled
  relations; it is not message-level trajectory value or an online detector;
- the earlier verdict development/continuation batch produced a favorable exploratory apply-minus-holdout direction, but its combined interval crossed zero;
- a frozen 96-run task-heldout replication produced `apply - holdout Brier = +0.0985`, with 95% interval `[-0.3697, +0.7424]`;
- this failed the frozen directional and interval gates and is `DEFER`;
- a separate four-feature task-heldout failure predictor performed worse than the constant baseline and is also `DEFER`;
- the `H_E/kappa V1` social-thermodynamic projection was degenerate and stopped;
- the current certainty-plus-lineage eligibility rule varies sharply across tasks;
- 19/30 heldout apply verdicts were `insufficient_evidence`.

### Not established

- general governance efficacy;
- task-invariant detector validity;
- measurement of latent belief or understanding;
- a state-conditioned policy advantage;
- physical-law status for social thermodynamic quantities;
- cross-model, cross-prompt, cross-benchmark generalization;
- production value in a real organization.

The old generic verification-benefit and detector hypotheses did not qualify.
The later disclosure-fork effect is a different, narrower result and does not
retroactively validate those failed routes.

## 4. Methodological identity

The project uses an **auditable micro-to-meso response methodology**:

```text
frozen elicitation instrument
-> explicit reports and evidence events
-> deterministic pre-action state projection
-> randomized information action
-> post-action state transition
-> independent private outcome
-> development-to-heldout falsification
```

It combines four traditions without conflating them:

- measurement theory: a report is an instrument-conditioned observation, not the latent construct;
- multi-agent dynamics: individual reports and exposures generate a collective state;
- causal experiment design: action effects require randomization and independent outcomes;
- social thermodynamics: macro order, activity, evidence entropy, concentration, and response summarize collective dynamics.

Social thermodynamics is the organizing scientific lens. Audit/replay is the experimental reliability layer. Governance is the intervention being tested. None can substitute for the others.

## 5. Core methodological principles

### 5.1 The prompt is part of the instrument

An explicit probability vector is conditioned on task, prompt, option coordinates, model, interaction history, and parser contract. Changing the prompt changes the measurement condition.

Therefore the system does not call the report an internal belief. It records the instrument contract and asks whether derived relations are stable enough to predict outcomes or intervention response.

Prompt robustness remains a measurement-validity question. It is not solved by replay.

### 5.2 Self-report, audited event, derived state, and outcome are separate

| Layer | Examples | Permitted interpretation |
|---|---|---|
| report | probability vector, public explanation | what the model emitted under the instrument |
| audited event | evidence hash, provenance, exposure, assignment | what the architecture recorded |
| derived state | alignment, update magnitude, entropy, concentration | deterministic property of recorded events |
| latent construct | true confidence, understanding, internal belief | unobserved |
| outcome | final pooled Brier, accuracy, cost | evaluator-side decision quality/cost |

No quantity gains control authority merely because it is structured or replayable.

### 5.3 Microstate before macrostate

The repaired five-dimensional observable microstate is:

\[
X_{i,t}=(P_{i,t},E_{i,t},C_{i,t},I_{i,t},S_{i,t}).
\]

- `P`: reported categorical probability/preference vector;
- `E`: evidence identities, relations, provenance, and exposure;
- `C`: concentration/calibration properties of the report;
- `I`: observed cross-round persistence, not a personality essence;
- `S`: susceptibility, defined causally at a population/state level from randomized response.

Historical Utility containers may be reused, but categorical probabilities are not silently renamed cardinal utility. Historical Evidence coverage/quality heuristics and `(1-I)*(1-C)` susceptibility do not enter the current authority path.

### 5.4 Macro variables require response qualification

The audited historical macro projection was:

- `R`: alignment from pairwise base-2 Jensen-Shannon divergence;
- `T`: cross-round update activity from total variation;
- `H_E`: entropy of represented canonical evidence identities;
- `G_E`: concentration of evidence-origin reference mass when origin is reconstructable;
- `kappa = R*(1-H_E)`: descriptive crystallization index.

High alignment is not correctness. High evidence entropy is not evidence quality.
`H_E/kappa V1` collapsed in the audited artifacts; `kappa` is not a current
state variable, false-consensus probability, or control signal.

The heldout protocol has one pre-action discussion round. It can support pre-action `R/H_E/kappa`; it cannot support a pre-action temporal `T`. Round-1-to-final update activity is post-treatment and may only be treated as a mediator/response.

### 5.5 Intervention is an external information field

The currently supported scientific abstraction is an epistemic action that
changes what generated information is surfaced after a shared Round-1 state.
The first-paper implementation compares `CONTROL`, `SUPPORTS`, and `ATTACKS`
disclosure bundles. The only newly authorized component experiment will hold
ATTACKS-selected items fixed while comparing neutral versus labeled framing.

Historical public-verifier `apply/holdout/sham` and source-disclosure actions
remain useful negative or exploratory evidence, but they are not the current
paper treatment. An action label never guarantees useful information; item
identity, delivery, framing, uptake, final quality, and cost are distinct links.

### 5.6 Ground truth is evaluator-only and time-bounded

Ground truth must not enter:

- pre-action state;
- eligibility diagnosis;
- assignment;
- verification request/delivery;
- final private elicitation request.

After action and final elicitation, resolution may be recorded and used to score Brier/accuracy and replay the analysis. The firewall is temporal/informational, not a promise that the final artifact never contains a resolved value.

This matches practical learning: online decisions can be truth-blind while later outcomes, human review, or delayed resolution train and evaluate governance policy.

### 5.7 Identical-state action contrasts separate response from state selection

State variables may correlate with failure without identifying which action
helps. The current fork design freezes the same realized Round-1 state and
continues it under different disclosure policies. For action `a` relative to
control, a state-conditioned response is:

\[
\chi_a(s)=E[Y(a)-Y(control)\mid S_0=s].
\]

Lower Brier is better, so negative `chi_a` favors the action. The present
experiments estimate bounded policy contrasts under recorded model/task/prompt
conditions; they do not identify a universal message property. An individual
Agent's single revision remains a mediator, not its individual causal
susceptibility.

### 5.8 Development defines; heldout tries to falsify

Development artifacts may define one simple state projection and one outcome-blind split. The same definition is then applied unchanged to heldout artifacts.

No result-driven task removal, threshold search, feature expansion, seed replacement, or subgroup rescue is permitted. If the heldout direction fails, the hypothesis stops rather than accumulating dimensions until it becomes positive.

### 5.9 Outcome quality is independent of intermediate dynamics

Consensus, entropy, stability, influence distribution, or crystallization may explain dynamics. They do not establish better collective intelligence.

The required chain is:

```text
intervention
-> changed information/dynamics
-> independently evaluated final quality
```

The last arrow cannot be replaced by a nicer-looking state trajectory.

### 5.10 Minimalism is a validity constraint

Every added construct, feature, baseline, or engineering layer increases researcher degrees of freedom. Near-term work therefore prefers:

- existing artifacts over new provider runs;
- deterministic projections over new LLM judges;
- one theory-motivated composite over feature search;
- one frozen action contrast over a growing arm zoo;
- tables over dashboards;
- a falsified hypothesis over an unfalsifiable platform narrative.

Engineering complexity is justified only when it closes a specific missing link in the research question.

## 6. Current hypothesis and analysis

The current first-paper component hypothesis is:

> The observed ATTACKS response contains separable contributions from
> re-exposing selected items and from labeling/framing those items as
> attacks/disconfirming.

The only authorized paid mechanism design holds ATTACKS-selected item identity,
order, source IDs, and content hashes fixed across:

```text
CONTROL / ATTACKS_NEUTRAL / ATTACKS_LABELED
```

The existing L0 bundle audit is complete and `GO_L1` for post-AAMAS pilot
priority. It does not identify the neutral/labeled components and does not
authorize message-level LOO before submission.

## 7. Current route

### Stage 0 — First-paper safety baseline: protected

V3.2 preserves the current cross-model paper and evidence chain. Any new
mechanism experiment uses a separate ref, plan, directory, manifest, and
analysis contract; failure does not rewrite the baseline.

### Stage 1 — Minimal neutral/labeled component experiment: conditional

Before provider use, freeze estimands, item-identity equality, prompt-difference
surface, missingness, budget, stop rules, and paper-inclusion criteria. Do not
refactor the production engine merely to make the experiment elegant.

### Stage 2 — AAMAS paper closure

Use a new result only if it identifies a component and can replace existing
post-hoc trajectory prose within the eight-page limit. Otherwise preserve it
in the supplement or a separate result report and submit the V3.2 baseline.

### Stage 3 — Collective Epistemic State–Response Atlas: post-submission

Test low-dimensional, truth-blind pre-action state variables across task
families, models, scales, and interaction structures. Require held-out
incremental prediction of randomized action response before granting control
meaning.

### Later — Truth-blind action allocation

Only a state representation that predicts randomized action response on held-out
task families may enter a frozen allocator comparison against never, always,
matched-rate random, confidence-only, disagreement-only, and static baselines.

## 8. Stop/go rules

### Run the first-paper component experiment only if

- neutral and labeled arms contain byte-identical selected items and order;
- the remaining prompt difference is explicit and auditable;
- the analysis contract and budget are frozen before results;
- canary and zero-provider tests pass without changing the old experiment;
- every result, including null or adverse results, will be retained.

### Do not promote a state representation if

- it depends on ground truth or post-action fields online;
- it collapses or is unstable under equivalent measurement conditions;
- it does not beat simple baselines on task-family-heldout action response;
- apparent value requires task, seed, threshold, or feature selection;
- its only positive change is consensus/stability without final-quality improvement.

## 9. Project scope after this consolidation

### Current paper scope

LLM multi-agent collectives, categorical hidden-profile decisions,
identical-state direction-conditioned evidence exposure, independent final
private reports, and pooled multiclass Brier loss.

### Reusable platform scope

Claim/report/evidence/exposure identity, randomization, action lifecycle, final elicitation, outcome, replay, and pluggable state projections/actions.

### Long-term scientific scope

State and response laws for heterogeneous Agent societies under partial information, correlated error, authority, cost, and delayed resolution.

The first scope must succeed scientifically before the third is claimed as an implemented platform.

## 10. Authoritative supporting documents

- reasoning discipline: `docs/REASONING_PROTOCOL.md`;
- current execution authority: `docs/plans/SWARMALPHA_PROJECT_DEVELOPMENT_PLAN_2026-08-22.md`;
- current implementation map: `docs/ACTIVE_RESEARCH_SURFACE.md`;
- protected paper baseline: `paper_rewriting_output/FIRST_PAPER_CROSS_MODEL_FREEZE_V3_2_2026-08-22.md`;
- L0 bundle audit: `docs/experiments/V6_POLARITY_BUNDLE_RESPONSE_L0_REPORT_2026-08-22.md`;
- historical social-thermodynamic negative qualification: `docs/experiments/V6_SOCIAL_THERMODYNAMIC_RESPONSE_AUDIT_2026-08-14.md`;
- task-heldout fact report: `docs/experiments/V6_VERDICT_TASK_HELDOUT_REPLICATION_RESULTS_2026-08-13.md`;
- negative prediction qualification: `docs/experiments/V6_PROCESS_STATE_FAILURE_PREDICTION_AUDIT_2026-08-13.md`;
- V6 execution architecture: `docs/architecture/V6_PRODUCTION_VERTICAL_SLICE_V1.md`;
- long-term strategic vision: `docs/strategy/SWARMALPHA_WHITEPAPER_V1.md`.

Plans, handoffs, older paper drafts, legacy thermodynamics code, and archived roadmaps are not current empirical authority.
