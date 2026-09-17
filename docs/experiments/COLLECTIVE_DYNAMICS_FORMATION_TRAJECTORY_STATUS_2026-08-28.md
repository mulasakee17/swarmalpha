# Collective Dynamics Formation Trajectory Status

Status: **OFFLINE DEVELOPMENT DESCRIPTION — NOT DYNAMICS VALIDATION**  
Date: 2026-08-28

## 1. Question and scope

This report asks the smallest trajectory question available in the frozen
formation screen:

> Did a task enter, persist in, escape from, or relapse into a strict wrong
> consensus during the observed R1–R3 formation trajectory?

The source is the existing GLM-4.6V, seed-1, ten-task formation artifact. It
contains three rounds per task and no new provider calls were made. The public
formation prompt jointly requested message, categorical report, and evidence
fields; therefore this is not yet the final independent shadow-measurement
protocol.

## 2. Operational events

For offline evaluation only, define (W_t=1) when the complete roster has a
strict common reported top option at round (t), and that option is not the
recorded task outcome. A tie, missing report, or non-consensus is not (W_t=1).

For (t\in\{2,3\}):

- **entry:** (W_{t-1}=0, W_t=1);
- **persistence:** (W_{t-1}=1, W_t=1);
- **escape:** (W_{t-1}=1, W_t=0);
- **relapse:** after an escape, a later round returns to (W_t=1).

These events use ground truth and are offline strata. They are not admissible
online state variables or routing inputs.

## 3. Observed status

| Quantity | Observed count |
|---|---:|
| Tasks | 10 |
| R1–R3 snapshots | 30 |
| Adjacent transitions | 20 |
| Tasks with wrong consensus at any observed round | 2 (`43`, `57`) |
| Wrong-consensus snapshots | 6 |
| Entry transitions | 0 |
| Persistence transitions | 4 |
| Escape transitions | 0 |
| Relapse events | 0 |
| Error-amplifying concentration signatures | 3 |

The two wrong-consensus trajectories were:

```text
task 43: W -> W -> W   (Aurora Station)
task 57: W -> W -> W   (Site B)
```

Both wrong states were already present in the isolated R1 report and remained
present through R3. No task that was non-wrong at R1 entered a strict wrong
consensus by R2 or R3. No observed wrong state escaped, so escape and relapse
cannot be estimated from this screen.

## 4. Reported-state movement

Across all ten tasks, the existing analyzer reports the following R1-to-R3
descriptive means:

| Quantity | Mean change (R3 − R1) |
|---|---:|
| Between-agent disagreement | `−0.014282` |
| Pooled certainty | `+0.147917` |
| Pooled Brier (offline) | `−0.033417` |
| Zero-update transition fraction | `0.15` |

The pooled means mix correct, incorrect, and non-consensus trajectories. They
therefore do not establish a general convergence law. Three individual tasks
(15, 43, 57) satisfy the offline signature “disagreement down, pooled
certainty up, Brier worse”; this is a descriptive warning pattern, not a
causal or online detector result.

## 5. What this establishes

- The current artifact contains genuine multi-round reported trajectories,
  not only final-round summaries.
- In this development batch, wrong consensus is observed as **persistence of
  states already present at R1**, not discussion-induced formation.
- The trajectories are heterogeneous: some tasks become more concentrated,
  some become more dispersed, and some improve in offline Brier.

## 6. What this does not establish

- No evidence of collective-error entry, escape, or relapse was observed.
- Two persistent wrong trajectories are insufficient to identify an attractor,
  basin of attraction, or metastable state.
- The data do not distinguish peer content from prompt format, message length,
  or the joint message/report/evidence elicitation protocol.
- One seed, ten tasks, and one model do not support cross-task or cross-model
  generalization.
- The reported quantities are prompt-conditioned report geometry, not latent
  group belief or a physical thermodynamic state.

## 7. Project decision

The project now has a valid **status result**: the formation screen shows
pre-existing wrong-consensus persistence and heterogeneous state movement, but
not wrong-consensus formation or recovery. This is enough to motivate a small
trajectory-focused follow-up; it is not enough to promote the collective-
error-dynamics claim.

The next experiment, when explicitly authorized, should use a message-only
public process and an offline private sensor at fixed checkpoints. It should
be sized to test whether entry/escape events exist at all before adding
matched-sham controls, perturbation strengths, topology, or governance.

