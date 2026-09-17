# Collective Dynamics D1 Post-M2 Bridge Result

Status: **TESTED DEVELOPMENT BRIDGE — DESCRIPTIVE SIGNAL, QUALIFICATION GATES NOT MET**  
Date: 2026-08-29

## 1. Decision

**FACT** — The frozen D1 run completed with 57/57 valid public responses and
152/152 valid shadow-sensor responses. Under analyzer `1.4.0`, its operational
classification is `DESCRIPTIVE_TRAJECTORY_SIGNAL`: strict wrong-consensus
persistence occurred four times and one strict wrong-consensus escape occurred.

**DECISION** — D1 does not authorize a held-out collective-dynamics claim, a
recoverability experiment, or governance. The predeclared resource gates were
not met:

- only task `64` produced majority-agent replicate-separated movement at late
  transitions (`X1 -> X2` and `X2 -> X3`), rather than at least two tasks;
- of the two previously known wrong-state candidates (`43/57`), only task `57`
  reproduced a stable strict wrong state under the shadow protocol;
- task `64` escaped strict wrong consensus at `X2 -> X3`, but its pooled top
  remained wrong. This is not recovery to a correct collective decision.

The next admissible step is therefore zero-provider construction and review of
a new controlled wrong-state task bank. Do not expand natural HiddenBench
rounds, run ATTACKS, or begin a recovery-effect experiment from D1.

## 2. Execution and provenance

The successful run used tasks `36/43/50/57/64`, roster sizes `4/4/3/4/4`,
three synchronous previous-round-only public rounds, four checkpoints, and two
exact canonical sensor repeats per agent/checkpoint. Temperature was zero,
thinking was disabled, each cell had one attempt, and there was no retry.

| Artifact | Hash or count |
|---|---:|
| plan | `sha256:012fbe8b9974250820100bbaefcd04c9cf4603ea976404aa5aa5a4fa87c5413c` |
| public run | `sha256:9df0675a08de59ca1ec67167bb7e16d87d4af8aea081d68068a8c39127025afc` |
| sensor freeze | `sha256:3a08f6d70158cfa22ec50136c63fcc6eedd4726d249babe409413b9befc128f7` |
| sensor run | `sha256:98d42caba3dba2cc4c3a4f3cc479bbcb88bc1083f45e00c65be18035e1fe2e04` |
| analysis `1.4.0` | `sha256:98f29c23a84efd3e9883061d5c30a2b064f269fcb5183f69884ca022142dd72c` |
| valid public calls | 57 / 57 |
| valid sensor cells | 152 / 152 |
| valid A/B units | 76 / 76 |
| complete checkpoints | 20 / 20 |
| complete adjacent transitions | 15 / 15 |

An earlier execution directory recorded one first-cell `provider_network`
terminal before any valid response. This was caused by the local command
sandbox's network boundary. The failed ledger was preserved and not retried or
overwritten. The successful run was newly frozen in the separate `attempt2`
directory with the same plan hash. Across both directories there are 210
physical invocation attempts: one network failure and 209 valid responses.
Exact billed token usage is not retained by the current artifacts and is
therefore unknown.

## 3. Operational definitions

Strict wrong consensus at checkpoint `t` requires a complete roster and, for
every agent, a stable non-tied top option across exact repeats A/B. All stable
individual tops must be identical and different from the offline outcome.

The post-hoc conservative separation margin is

\[
M_{i,t\to t+1}=\min_{r,s\in\{A,B\}}
TV(p_{i,t}^{(r)},p_{i,t+1}^{(s)})
-\max\{G_{i,t},G_{i,t+1}\},
\]

where `G` is within-checkpoint A/B total variation. A transition has
majority-agent separation only when more than half of comparable agents have
`M>0`. This is a measurement-separation diagnostic, not a latent-state
estimator and not a causal test.

## 4. Aggregate results

| Quantity | Observed value |
|---|---:|
| adjacent activity above endpoint duplicate-TV mean | 8 / 15 |
| tasks with at least one such transition | 4 / 5 |
| majority-agent `M>0` adjacent transitions | 4 / 15 |
| tasks with at least one majority-agent `M>0` transition | 2 / 5 |
| strict entry / persistence / escape / relapse | 0 / 4 / 1 / 0 |
| indeterminate strict transitions | 6 / 15 |
| exact duplicate pairs | 62 / 76 |
| median / P75 / P90 / maximum duplicate TV | 0 / 0 / 0.1000 / 1.0000 |
| mean `X0 -> X3` agent activity | 0.1971 |
| mean `X0 -> X3` pooled drift | 0.1933 |
| mean `X0 -> X3` generalized-JSD change | +0.0807 |
| mean `X0 -> X3` concentration change | +0.0308 |
| mean `X0 -> X3` pooled-Brier change | +0.0470 |
| error-amplifying concentration signatures | 1 / 5 tasks |

The duplicate distribution improved relative to M2 at its center, but a severe
tail remained: 62/76 pairs were exact while the maximum duplicate TV was 1.
Thus repeated elicitation instability remains localized rather than absent.

## 5. Task-level interpretation

### Task 57

Task `57` was already known from the old joint-prompt formation analysis and is
development evidence only. `X0` was indeterminate because repeat stability was
insufficient. At `X1`, all agents had a stable wrong top (`opt_2`), which then
persisted through `X2` and `X3`. The `X0 -> X1` transition had majority-agent
`M>0`; the two later transitions did not. Pooled Brier increased by 1.1516 from
`X0` to `X3`, while concentration increased and generalized JSD decreased.
This is the run's single error-amplifying concentration signature.

**INFERENCE** — Task `57` is consistent with immediate peer-conditioned
formation followed by stability of a wrong reported state. Because `X0` was
indeterminate and the task was previously inspected, it is neither a formally
identified entry event nor new independent evidence.

### Task 64

Task `64` was in strict wrong consensus already at `X0`. It persisted through
`X1` and `X2`, then exited strict wrong consensus at `X3`. All three adjacent
transitions had majority-agent `M>0`. At `X2 -> X3`, pooled Brier improved by
0.7053 and concentration fell by 0.275, but the pooled unique top at `X3`
remained the wrong option `opt_1`.

**INFERENCE** — Task `64` supplies the clearest D1 evidence of a measured
late-round state transition. It shows natural discussion leaving a strict
unanimous wrong-top state, not correction to the true answer and not response
to a controlled corrective perturbation.

### Other tasks

- Task `43`, the other previously known wrong-state candidate, was
  indeterminate at every checkpoint and did not reproduce strict wrong-state
  persistence.
- Task `50` changed pooled top across rounds but never entered strict wrong
  consensus; `X2 -> X3` was exactly stationary under the reported sensor.
- Task `36` showed continuous movement and ended with a correct pooled top, but
  strict-state transitions touching `X0` or `X3` were indeterminate.

## 6. What D1 changes and does not change

**FACT** — Unlike M2, D1 contains an identifiable strict-state escape and late
replicate-separated movement. Therefore the claim “the instrument never
observes collective-error dynamics” is false for the combined development
evidence.

**FACT** — Across M2 and D1, late majority-agent separation is still supported
by only one of ten tasks: task `64`. D1 therefore fails the predeclared
two-task resource gate for preparing held-out continuous-state qualification.

**FACT** — Only one of the two previously identified wrong-state tasks
reproduced. D1 therefore fails the predeclared gate for a same-state recovery
feasibility experiment.

**CONCLUSION** — There is now a real, operationally observable descriptive
phenomenon deeper than pooled “information exposure effectiveness”: groups can
occupy, persist in, and leave a strict wrong-top state under the fixed shadow
instrument. The current evidence does not establish prevalence, generality,
causal recoverability, an attractor, or governance value. `Social
Thermodynamics` remains a research program and must not yet be presented as an
empirically validated physical theory.

## 7. Post-D1 construct-validity addendum

**FACT / LATER AUDIT (2026-08-29)** — The statement above applies specifically
to the prompt-conditioned **reported-belief** channel. A subsequent truth-blind
audit paired `X_t` with the next public action `Y_(t+1)`. On the 38 late
agent-pairs, sensor averaged top predicted 27 next public choices while the
previous public choice predicted 33. This does not invalidate the existence of
the recorded reported-state trajectory, but it blocks treating that trajectory
as an already qualified unified cognitive macrostate. See
[`COLLECTIVE_DYNAMICS_D1_CROSS_CHANNEL_CONSTRUCT_AUDIT_2026-08-29.md`](COLLECTIVE_DYNAMICS_D1_CROSS_CHANNEL_CONSTRUCT_AUDIT_2026-08-29.md).
