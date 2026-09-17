# Collective Dynamics Post-M2 Engine Reuse Boundary

Status: **CURRENT IMPLEMENTATION AND RESEARCH BOUNDARY — NO NEW PROVIDER RUN**  
Date: 2026-08-29

## 1. Decision

**FACT** — M2 can now project its averaged categorical reports through the
current independent epistemic kernel. The adapter supplies reports and roster
identity only; it supplies no outcome, evidence, exposure, inferred influence,
or governance instruction.

**DECISION** — Reuse the old engine by extracting independently valid mechanics
and formulas behind current contracts. Do not execute the legacy engine as the
Stage-2 scientific model.

This is not a rejection of all previous work. It separates three layers that
the legacy runtime combined:

1. experiment mechanics that remain useful;
2. probability geometry that can be defined without physical interpretation;
3. heuristic state and intervention semantics that are not supported by the
   present evidence.

## 2. What is reused

| Asset | Reuse status | Current role |
|---|---|---|
| fixed-round scheduling, reset, previous-round visibility | direct reuse in principle | comparable observation horizons and temporal isolation |
| append-only prompts, responses, attempt ledgers, manifests and hashes | direct reuse | provenance, replay and failure accounting |
| equal-weight categorical pool | reused through `src/lib/epistemic` | descriptive pooled report |
| normalized report entropy and pooled entropy | reused through `src/lib/epistemic` | geometry of explicit probability reports |
| generalized Jensen–Shannon disagreement | reused through `src/lib/epistemic` | between-report distributional disagreement |
| total-variation distance | reused through the categorical belief contract | duplicate-call diagnostics, activity and pooled drift |

The M2-specific bridge is
`experiments/campaign/v6/collectiveDynamicsTrajectoryEpistemicAdapterV1.ts`.
It is deliberately thin: M2 option IDs and averaged reports are converted into
current categorical claims and belief reports, then projected by
`projectCollectiveEpistemicStateV1`.

## 3. Why the whole old engine is not directly reusable

The blocker is not code age. It is a mismatch in scientific semantics.

| Legacy coupling | Why direct reuse would be invalid here |
|---|---|
| scalar utility, confidence, inertia and evidence-support fields as cognitive state | M2 observes categorical probability reports; these fields are neither observed nor identified by the sensor |
| `R/T/H/F`, temperature, free energy and phase labels | several were transforms or composites of overlapping inputs; current data do not establish physical state laws, scaling, or transition behavior |
| detector and intervention suggestions emitted by the measurement layer | monitoring must remain a private, truth-blind observation layer; a number does not earn control authority merely by being computed |
| code-side belief/confidence mutation | this creates the desired state change without observing an LLM response to an information treatment |
| graph edits or text similarity interpreted as influence | declared connections and associations do not identify causal influence |
| state-dependent early stopping | it censors the persistence and relapse trajectories Stage 2 is meant to observe |
| global `supports|attacks` evidence semantics | without a categorical target option it is not a well-defined corrective operator |

Running the whole legacy engine would therefore import unobserved variables,
causal claims and control side effects into a measurement problem. Extraction
at a contract boundary preserves useful work without preserving unsupported
meaning.

## 4. Numerical cross-check

**TESTED** — The five-task M2 artifact was reanalyzed after replacing its local
pool/entropy/JSD implementation with the current epistemic kernel.

- analysis version: `1.3.0`;
- output: `results/v6_collective_dynamics_trajectory_sensor_v1_glm46v_seed1/analysis-v1.3.json`;
- content hash:
  `sha256:6275f838e9e6c95572d4410b31da099d59d12e29e18beb2421b1d7e0f6404ca2`;
- comparison with analysis `1.2.0`: 31 numeric leaf differences, all caused by
  floating-point evaluation order;
- maximum absolute difference: `2.220446049250313e-16`;
- non-numeric differences after aligning the analysis version and excluding the
  content hash: zero;
- scientific classification remains `NO_TRAJECTORY_SIGNAL`.

The bridge also exposed a boundary bug: decimal reports summing to `0.999999`
were within the declared `1e-6` sensor tolerance but could exceed it by about
`2.9e-17` after binary floating-point addition. The current belief contract now
adds only a term-count-scaled machine summation allowance. It does not
renormalize or modify reports. Tests verify both that the declared boundary is
accepted and that a true `2e-6` simplex error is rejected.

## 5. Claim ceiling

This refactor establishes implementation reuse and numerical equivalence. It
does not validate the LLM sensor, prove state sufficiency, identify influence,
demonstrate wrong-consensus dynamics, or authorize intervention.

The currently defensible monitoring object remains a reported-belief
macrostate:

\[
S_t^{obs}=(\bar p_t,\;\overline H_t,\;JSD_t,\;A_t,\;roster_t).
\]

Outcome-dependent Brier loss and correctness remain offline evaluation fields,
not coordinates available to the online monitoring layer. The next scientific
decision is still whether to study reproducible continuous coarse-grained
response or to redesign tasks so that wrong-consensus transitions are actually
observable. Reinstating the legacy runtime does not answer that question.
