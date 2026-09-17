# Collective Dynamics M2 Trajectory Pilot Result

Status: **TESTED DEVELOPMENT PILOT — NEGATIVE FOR IDENTIFIABLE WRONG-CONSENSUS DYNAMICS**  
Date: 2026-08-28

## 1. Decision

**FACT** — Under the frozen five-task, one-seed M2 definitions, the result is
`NO_TRAJECTORY_SIGNAL`. Operationally, this means that no adjacent checkpoint
pair exhibited an identifiable entry into or escape from strict wrong
consensus. It does **not** mean that the probability reports remained
numerically constant.

**DECISION** — Do not advance this run into corrective perturbation,
recoverability, attractor, phase, or governance claims. The run supports a
descriptive continuous reported-state trajectory, but not the proposed
collective-error transition story.

## 2. Evidence boundary

- Public discussion: 57/57 frozen message-only calls completed.
- Shadow sensor: 151/152 valid terminal reports.
- One cell, task 8 / agent 3 / `X2` / repeat A, is explicitly
  `interrupted_unobserved`; it was not imputed or retried.
- Final sensor run hash:
  `sha256:9b7c26777a11e281da57f466ae85d5380736d3509fca25ffe891c6ff0474b314`.
- Original analysis `1.2.0` hash:
  `sha256:389204ddbed1bdbf43116bd33ca23ce7eec255d553b9f50482aab2fe1050c87b`.
- Current-kernel analysis `1.3.0` hash:
  `sha256:6275f838e9e6c95572d4410b31da099d59d12e29e18beb2421b1d7e0f6404ca2`.
- Conservative repeat-separation diagnostic analysis `1.4.0` hash:
  `sha256:bd91fca83d9cc3bb5a2a1bfc50e99306d710d3911542cde449286cfd6667d128`.
  This adds only truth-blind per-transition `M` summaries; it does not alter
  the primary classification or any offline outcome evaluation.
- The `1.3.0` refactor routes pool, entropy and generalized JSD through the
  current epistemic kernel. After aligning version metadata and excluding the
  content hash, its 31 changed numeric leaves differ from `1.2.0` by at most
  `2.220446049250313e-16`; all reported classifications and scientific
  conclusions are unchanged. See the
  [post-M2 engine reuse boundary](COLLECTIVE_DYNAMICS_POST_M2_ENGINE_REUSE_BOUNDARY_2026-08-29.md).
- Inference unit is the task. The five fixed development tasks and one seed do
  not support population inference.

An execution defect initially compared the returned opaque keys
`opt_1..opt_3` with canonical natural-language labels. The original ledger was
preserved. Fifty-two captured responses were replay-parsed under the corrected
frozen option-ID contract, the in-flight cell was marked unobserved, and only
the remaining 99 cells were invoked. The recovery artifact binds the original
ledger hash and final run hash. This repair recovers parseable observations; it
does not erase the single missing report or convert the run into a clean 152/152
execution.

## 3. Operational quantities

For each task, agent, and checkpoint, the analyzer averages the two exact
repeat reports only when both are valid:

\[
\tilde p_{i,t}=\frac{p^{(A)}_{i,t}+p^{(B)}_{i,t}}{2}.
\]

The truth-blind reported macrostate contains:

\[
\bar p_t=\frac{1}{N_t}\sum_i\tilde p_{i,t},\quad
U_t=\frac{1}{N_t}\sum_i H_K(\tilde p_{i,t}),\quad
J_t=H_K(\bar p_t)-U_t,
\]

plus pooled concentration, maximum pairwise total variation, roster identity,
and missingness. Adjacent activity is the mean matched-agent TV and pooled
drift is the TV between matched-roster pools. Every transition reports the
actual intersection roster. No missing report is encoded as zero.

Duplicate TV

\[
G_{i,t}=TV(p^{(A)}_{i,t},p^{(B)}_{i,t})
\]

is a measurement diagnostic, not an independent sample or a latent-belief
variance estimate. Brier and strict wrong consensus are opened only in the
offline evaluation layer.

## 4. Results

| Quantity | Observed value |
|---|---:|
| valid cells | 151 / 152 |
| valid A/B units | 75 / 76 |
| complete task checkpoints | 19 / 20 |
| complete-roster adjacent transitions | 13 / 15 |
| adjacent transitions with activity above endpoint duplicate-TV mean | 9 / 15 |
| tasks with at least one such transition | 5 / 5 |
| adjacent transitions with majority-agent `M>0` | 3 / 15 |
| tasks with at least one majority-agent `M>0` transition | 3 / 5 |
| exact duplicate pairs (`G=0`) | 50 / 75 |
| median / P75 / P90 / maximum duplicate TV | 0 / 0.1000 / 0.3267 / 0.8000 |
| wrong-consensus entry / persistence / escape / relapse | 0 / 0 / 0 / 0 |
| identifiable `not_wrong -> not_wrong` transitions | 5 / 15 |
| indeterminate wrong-consensus transitions | 10 / 15 |
| mean task-level `X0 -> X3` agent activity | 0.2614 |
| mean task-level `X0 -> X3` pooled drift | 0.1713 |
| mean task-level `X0 -> X3` generalized-JSD change | +0.1243 |
| mean task-level `X0 -> X3` concentration change | +0.1422 |
| mean task-level `X0 -> X3` pooled-Brier change | -0.0038 |
| error-amplifying concentration signatures | 0 / 5 tasks |

The repeat-top diagnostic contains 58 non-tied A/B agreements, 16 units
touching a tied repeat, and one non-tied disagreement. The maximum-TV case is
that disagreement. Thus the 10 indeterminate transitions cannot all be called
provider noise: the frozen definition itself intentionally treats ties as
indeterminate. The heavy duplicate-TV tail nevertheless prevents treating the
two-call average as a uniformly stable discrete-state sensor.

## 5. Interpretation

**FACT** — The continuous reported state moved. Nine adjacent transitions had
mean matched-agent activity above the mean of their two endpoint duplicate TVs,
and this occurred at least once in every task. This is descriptive evidence
that the public trajectory is associated with changes larger than a simple
local repeat mean in part of the run.

**FACT** — The strict collective-error state did not exhibit an identifiable
entry, persistence, escape, or relapse event. Several tasks had an incorrect
pooled top option, but an incorrect linear pool is not strict wrong consensus:
the latter requires a complete roster and stable, identical unique individual
tops. Conflating those constructs would manufacture the desired result.

**INFERENCE** — The current sensor/state pair is more suitable for describing
continuous report geometry than for discretizing four-step trajectories into
wrong-consensus states. The near-zero mean Brier change also supplies no
evidence that discussion systematically improved or worsened decision quality
in this five-task run.

### 5.1 Post-hoc conservative repeat-separation diagnostic

This diagnostic was defined after inspecting the frozen M2 result and is not a
preregistered replacement for the primary decision rule. For each agent and
adjacent checkpoint pair, define

\[
M_{i,t\to t+1}=
\min_{r,s\in\{A,B\}}TV(p_{i,t}^{(r)},p_{i,t+1}^{(s)})
-\max\{TV(p_{i,t}^{(A)},p_{i,t}^{(B)}),
TV(p_{i,t+1}^{(A)},p_{i,t+1}^{(B)})\}.
\]

`M>0` means every cross-time A/B pairing is farther apart than the largest
within-checkpoint duplicate discrepancy at either endpoint. It is a
conservative measurement-separation diagnostic, not an unbiased estimator of
latent state change.

The formal `analysis-v1.4.json` calculation found only three of 15 transitions in
which a majority of comparable agents had `M>0`: task `1`, task `8`, and task
`15`, all at `X0 -> X1`. No `X1 -> X2` or `X2 -> X3` transition met this
majority-agent condition. Task `8` transitions touching the missing `X2` cell
retain their observed comparable-agent denominators and are not promoted to
complete-roster results.

**POST-HOC INFERENCE** — Under this stricter diagnostic, the most clearly
repeat-separated movement is concentrated at first peer-view exposure. M2
does not supply comparable evidence of sustained later-round movement. This
further weakens a multi-round dynamics reading and motivates the post-M2 plan's
explicit late-transition gate; it does not change the frozen
`NO_TRAJECTORY_SIGNAL` classification.

## 6. Claim ceiling and next action

This pilot does not establish collective-error dynamics, stability,
recoverability, an attractor, a basin, metastability, a phase transition, or a
governance effect. It also cannot separate model evolution from fixed provider
call order or establish cross-seed reproducibility.

The scientifically conservative closeout is:

1. retain `P_t`, `U_t`, `J_t`, concentration, pairwise TV, activity, drift,
   roster, and duplicate TV as a truth-blind descriptive monitoring layer;
2. reject strict wrong-consensus dynamics as an empirical claim from M2;
3. do not run a corrective intervention from this result;
4. before any new paid run, decide whether Stage 2 studies reproducible
   continuous coarse-grained response or specifically wrong-consensus events.

The first option remains aligned with the original design philosophy—external
mathematical measurement of otherwise ambiguous discussion text—but it is a
new confirmatory target and must not be backfilled into this pilot.
