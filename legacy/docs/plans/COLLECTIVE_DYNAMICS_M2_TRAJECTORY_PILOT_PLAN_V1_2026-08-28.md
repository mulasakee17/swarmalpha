# Collective Dynamics M2 Trajectory Pilot Plan

Status: **FROZEN DEVELOPMENT PLAN — EXECUTED; SEE RESULT RECORD**  
Date: 2026-08-28

Execution/result authority:
[`../experiments/COLLECTIVE_DYNAMICS_M2_TRAJECTORY_RESULTS_2026-08-28.md`](../../../docs/experiments/COLLECTIVE_DYNAMICS_M2_TRAJECTORY_RESULTS_2026-08-28.md).
The sections below preserve the pre-execution design and thresholds; later
execution facts must be read from the result record rather than backfilled into
the frozen plan.

## 1. Purpose

The pilot answers one project-status question before any mechanism or
governance work:

> Does a fixed multi-round public discussion produce observable entry,
> persistence, escape, or relapse patterns in the reported collective state?

It does not test ATTACKS, peer-content semantics, topology, recovery policy, or
governance value. A positive result would justify a larger trajectory study; a
null result would stop the collective-dynamics expansion.

## 2. Minimal design

| Item | Frozen proposal |
|---|---|
| Task set | First five task IDs in the existing truth-free dev order: `1, 8, 15, 22, 29` |
| Source rosters | `4, 3, 4, 4, 4` agents; 19 agent trajectories total |
| Model | GLM-4.6V, one declared seed, one fixed generation configuration |
| Public rounds | Three; synchronous, previous-round-only visibility, no early stopping |
| Public output | Message only; no probability, confidence, evidence, verdict, or state fields |
| Checkpoints | `X_0` before discussion and `X_1,X_2,X_3` after each public round |
| Shadow sensor | Two byte-identical canonical probability-only reports per agent/checkpoint, run after the public trajectory is frozen |
| New public calls | 57 (19 agents × 3 rounds) |
| Shadow sensor calls | 152 (19 agents × 4 checkpoints × 2 exact repeats) |
| Total planned provider calls | 209 (retries are not allowed in the registered run) |

The five-task set is a development pilot, not a confirmatory sample. Its task
selection is fixed by task ID order and is not re-optimized after inspecting
new outcomes. Existing historical outcomes are not supplied to the online
runner or the sensor.

## 3. Data flow and isolation

```text
message-only public process
    -> freeze transcript, checkpoint bytes, and hashes
    -> run private probability sensor offline
    -> compute P_t and X_t
    -> open outcome mapping only in offline analysis
```

The public runner never receives `P_t`, `X_t`, Brier, correctness, or any
sensor result. The shadow sensor receives only the frozen task view at one
checkpoint and cannot alter subsequent public prompts because all public
rounds have already closed.

## 4. Quantities

For agent (i), round/checkpoint (t), exact-repeat label
(r\in\{A,B\}), and (K) canonical options, preserve every raw report
(p^{(r)}_{i,t}) and define the development estimate

\[
\tilde p_{i,t}=\frac{p^{(A)}_{i,t}+p^{(B)}_{i,t}}{2}.
\]

The two calls are an exact-repeat consistency probe, not independent samples
from a latent belief distribution and not the already-qualified four-call V2
split-half estimator. This cheaper estimator is admissible only for the M2
development pilot. Also report per-view duplicate disagreement

\[
G_{i,t}=TV\left(p^{(A)}_{i,t},p^{(B)}_{i,t}\right).
\]

Using (\tilde p_{i,t}), derive:

\[
\bar p_t=N^{-1}\sum_i \tilde p_{i,t},
\quad
U_t=N^{-1}\sum_i H_K(\tilde p_{i,t}),
\quad
J_t=H_K(\bar p_t)-U_t,
\]

where (H_K) is normalized Shannon entropy. Retain pooled concentration
`C_t=max(bar p_t)`, mean report activity

\[
A_t=N^{-1}\sum_i TV(\tilde p_{i,t-1},\tilde p_{i,t}),
\]

and pooled drift `D_t=TV(bar p_{t-1},bar p_t)` as derived/transition views.
Report the comparable roster for every value; missing agents remain missing.

Offline only, define a three-valued (W_t):

- `wrong_consensus` only when both exact repeats have the same unique top for
  every agent, every agent's averaged report has that same unique top, and that
  option differs from the recorded outcome;
- `not_wrong_consensus` only when every agent's repeated unique top is stable
  and the complete-roster condition above is false;
- `indeterminate` when either report is missing/invalid/tied or an agent's two
  exact repeats disagree on the unique top.

Entry, persistence, escape, and relapse are counted only across adjacent
non-indeterminate checkpoints. Brier and (W_t) never enter the public process
or sensor prompt. Continuous state summaries remain report-derived sensor
observations even when a discrete (W_t) is indeterminate; they must be
accompanied by the distribution of (G_{i,t}).

## 5. Primary decision rule

The pilot has three possible outcomes:

1. **No trajectory signal:** no new entry or escape is observed, or every
   apparent event touches an indeterminate checkpoint. Keep only the
   descriptive formation result and stop the dynamics claim.
2. **Descriptive trajectory signal:** at least one non-trivial transition is
   observed and the shadow reports remain interpretable, but the sample is too
   small for a stable state claim. Expand only by predeclared task/seed
   replication.
3. **Candidate dynamics signal:** transitions recur across more than one task
   and the next-state summary is not explained by missingness, call order, or
   duplicate sentinels. This permits a larger held-out trajectory study, not a
   thermodynamic law or governance permission.

No threshold is chosen after seeing the results. With 19 trajectories, all
effect sizes and event counts remain development descriptions; no population
significance claim is planned.

## 6. What is deliberately excluded

- `PEER/NO_PEER/SHAM` mechanism controls;
- `ATTACKS`, corrective evidence, or any intervention arm;
- topology, asynchronous scheduling, learned detector, router, or RL;
- scalar temperature, free energy, phase, attractor, or metastability labels;
- online access to outcome, resolver, or later evaluation artifacts.

The matched-sham freeze remains available as an optional later control if the
project needs to attribute a response specifically to task-relevant peer
content. It is not required to establish whether multi-round trajectories
exist.

## 7. Acceptance and stop conditions

Before execution, verify only the following low-complexity invariants:

- exact task/roster binding and truth-free public requests;
- fixed three-round schedule and previous-round-only visibility;
- public transcript frozen before any shadow-sensor request;
- canonical option-ID mapping and strict parser closure;
- one terminal record per registered public and sensor cell;
- no sensor output appears in any public request;
- all 152 registered sensor cells receive one terminal record, with no retry;
- duplicate validity, per-view TV, tie rate, and unique-top agreement are
  reported rather than hidden behind a pooled average.

If any invariant fails, repair the runner before interpreting trajectories. If
the pilot completes but produces only pre-existing wrong-consensus persistence,
the correct conclusion is “formation screen shows persistence, not entry or
escape”; do not add rounds merely to manufacture an event.

## 8. Zero-provider implementation status

The following contracts are implemented and tested without loading provider
credentials:

- \`collectiveDynamicsTrajectoryPilotV1.ts\` freezes the task/roster, 3-round
  message-only request boundary, previous-round-only visibility, and the
  209-cell budget;
- \`collectiveDynamicsTrajectoryCheckpointV1.ts\` freezes a completed public
  trajectory, derives explicit \`X_0\`–\`X_3\` checkpoint records, and binds each
  sensor view to both the public-artifact hash and checkpoint hash;
- \`collectiveDynamicsTrajectorySensorFreezeV1.ts\` adapts the new view to the
  existing canonical probability prompt and freezes 152 request cells (two
  exact repeats per view) without executing them;
- \`runCollectiveDynamicsTrajectorySensorV1.ts\` provides an injected-invoker
  runner with sequential single attempts, monotonic timestamps, terminal
  replay checks, and no credential loading. Its mock tests execute all 152
  cells without any provider call.
- \`run_v6_collective_dynamics_trajectory_sensor_v1.ts\` adds the file-backed
  \`--plan\`, \`--freeze\`, and \`--preflight\` stages, immutable artifact
  writes, append-only \`attempts.jsonl\`, and \`run.json\` replay binding.
- \`runCollectiveDynamicsTrajectoryPublicV1.ts\` and its file-backed wrapper
  execute the preceding 57 message-only calls, persist
  \`public-attempts.jsonl\`/\`public-run.json\`, and emit the five trajectory
  artifacts required by the sensor freeze.
- \`X_0\` has an empty message window and no source request hashes. It is not
  represented by a fabricated round-0 provider call;
- the sensor-view verifier reconstructs the view from the frozen artifact, so
  self-rehashing a view cannot detach it from the public trajectory.

This is a contract milestone, not an execution result. The runner is
provider-neutral and does not authorize or initiate a GLM call; credential
loading and the 209-call paid execution remain an explicit operator action.

The file-backed execution path is intentionally two-stage: the 57-call public
trajectory must be produced and written first; only then can \`--freeze\`
derive the 152 sensor cells. A sensor-only preflight cannot manufacture a
missing public trajectory.

The complete two-stage path has been exercised with injected mock invokers:
57 public cells followed by 152 sensor cells, with no external provider call.
This establishes execution wiring only; it is not empirical evidence about
collective dynamics.
