# Collective Dynamics M1 Peer-Message Bundle Response Results

Status: **DEVELOPMENT EVIDENCE — ONE-STEP RESPONSE ONLY; NO GOVERNANCE AUTHORITY**  
Date: 2026-08-28

## 1. Decision

**FACT.** The authorized M1 screen completed 152/152 registered GLM-4.6V
probability-sensor calls on 38 frozen task-agent views from 10 development
tasks. Each view received two `NO_PEER` and two `PEER` reports; the only
intended treatment difference was the frozen R1 peer-message block.

**FACT.** The mean replicate-averaged individual report movement was
`0.153114` TV. The corresponding mean exact-duplicate gaps were `0.049737`
for `NO_PEER` and `0.074649` for `PEER`. Seven of ten task rows had response
movement greater than the larger of their two task-level duplicate gaps.

**DECISION.** This is evidence of a descriptive, heterogeneous response to
the **peer-message exposure bundle** under this instrument. It is not evidence
of a discussion-specific semantic effect, social persuasion, collective-error
dynamics, recoverability, or governance efficacy. The experiment has one
checkpoint, one model, one seed, and no independent sham condition.

## 2. Frozen scope and provenance

| Field | Value |
|---|---|
| Provider/model | Zhipu GLM-4.6V |
| Tasks | HiddenBench 1, 8, 15, 22, 29, 36, 43, 50, 57, 64 |
| Source selection | Truth-free systematic development order |
| Seed | 1 |
| Checkpoint | Post-round-1 frozen public view |
| Views | 38 task-agent views; source roster counts 4/3/4/4/4/4/4/3/4/4 |
| Conditions | `NO_PEER_A/B`, `PEER_A/B` |
| Registered/valid cells | 152/152 |
| Retries/repair | None; raw response preserved; no renormalization |
| Inference cluster | Task |
| Truth access | None |
| Plan hash | `sha256:db58c4195bac549c6471f5a63736d9bbec647b1f381e86aebc7ade2e9fec6f98` |
| Freeze hash | `sha256:5d05a7f3e15b4516174c79aebd2810537841de7840571bb983bef36bd7550ea1` |
| Run hash | `sha256:7b11b649fadf182ad0750c6016b250ccdd6656cdd424b2be20b62b3aaa2be11c` |
| Analysis hash | `sha256:9916a59908c77f4e517210a5263012bfebd4b7301349a15b2d7e8ae07ec0a512` |

The authoritative raw and derived artifacts are under
`results/v6_collective_dynamics_peer_bundle_freeze_v1_glm46v_seed1/`.
The run verifier accepts the terminal bindings, response hashes, parser
replay, timestamps, and run hash. The zero-provider matched-sham freeze is
under `results/v6_collective_dynamics_matched_sham_freeze_v1_glm46v_seed1/`;
it contains a plan/freeze only and has not been executed.

## 3. Estimands

For task-agent view (i), let (p_i^{c,A}) and (p_i^{c,B}) be the two
probability reports under condition (c). The analyzer uses

\[
\tilde p_i^c=\tfrac12(p_i^{c,A}+p_i^{c,B}),
\qquad
R_{task}=N^{-1}\sum_i TV(\tilde p_i^{PEER},\tilde p_i^{NO\_PEER}).
\]

The within-condition duplicate gaps are

\[
G_{task}(c)=N^{-1}\sum_iTV(p_i^{c,A},p_i^{c,B}).
\]

`G` is a repeatability diagnostic. It is not subtracted from `R` and is not
called an unbiased noise correction. The signed macro comparisons in the
analysis are differences between condition-wise means of pooled entropy,
mean report entropy, and generalized JSD; they are likewise descriptive.

## 4. Task-level response summary

Values are copied from the immutable `analysis.json`; small values are rounded
for readability. `ΔH_pool` is peer minus no-peer pooled normalized entropy and
`ΔJSD` is peer minus no-peer normalized generalized JSD.

| Task | Agents | (R_{task}) | (G_{NO\_PEER}) | (G_{PEER}) | ΔH_pool | ΔJSD |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 4 | 0.175 | 0.050 | 0.013 | −0.338 | −0.002 |
| 8 | 3 | 0.083 | 0.033 | 0.000 | −0.034 | +0.016 |
| 15 | 4 | 0.088 | 0.075 | 0.000 | +0.020 | −0.034 |
| 22 | 4 | 0.513 | 0.025 | 0.088 | −0.380 | −0.220 |
| 29 | 4 | 0.153 | 0.085 | 0.439 | −0.094 | −0.118 |
| 36 | 4 | 0.097 | 0.100 | 0.050 | −0.139 | +0.118 |
| 43 | 4 | 0.025 | 0.075 | 0.025 | −0.018 | +0.007 |
| 50 | 3 | 0.100 | 0.000 | 0.000 | +0.022 | +0.266 |
| 57 | 4 | 0.110 | 0.000 | 0.020 | −0.294 | −0.043 |
| 64 | 4 | 0.156 | 0.038 | 0.075 | −0.062 | −0.125 |

The signed macro directions are not uniform across tasks. This heterogeneity
is a result, not a missing average: pooling it into a universal “peer effect”
would discard the task-level estimand.

## 5. Leave-one-task-out sensitivity

As an offline robustness description, the task-equal mean and all ten
leave-one-task-out (LOTO) means were recomputed from the same frozen rows. For
pooled entropy, the mean peer-minus-no-peer difference was `−0.131692` and the
LOTO range was `[−0.148817, −0.104065]`. For mean per-agent report entropy
(`U`), the mean was `−0.118076` and the LOTO range was
`[−0.138189, −0.093935]`; every LOTO mean retained the negative sign. JSD was
not sign-stable: its mean was `−0.013616`, with LOTO range
`[−0.044652, +0.009353]`.

This supports a limited descriptive statement that the added peer-message
bundle was accompanied by lower pooled and mean-report entropy in this batch,
not a universal semantic or causal peer effect. The JSD result remains
heterogeneous, and no inferential interval is claimed from ten development
tasks.

## 6. What this result supports

- The frozen source views, option-ID mapping, prompt construction, raw
  provider boundary, terminal ledger, parser replay, and truth firewall are
  executable for this screen.
- Under the canonical GLM-4.6V instrument, peer-message exposure can produce
  report changes larger than exact-repeat movement for many—but not all—tasks.
- The response is task-dependent and can change pooled concentration/entropy
  and between-agent dispersion in different directions.

## 7. What it does not support

- `PEER` as a discussion-specific causal treatment: peer content, extra text,
  formatting, salience, and token length are still bundled.
- A general or semantic “social influence” measure. The sensor observes
  prompt-conditioned reports, not latent belief or attention.
- Formation, persistence, escape, or relapse of wrong consensus. This screen
  has only a single post-round-1 checkpoint and never observes a transition.
- Recoverability. No corrective perturbation was delivered and no escape event
  was defined.
- Any physical claim involving temperature, free energy, phase transition,
  attractors, or metastability.
- Cross-task, cross-seed, cross-model, or cross-instrument generalization.

The earlier single-report sensitivity failure also remains relevant: the V2
canonical repeatability pass qualifies only the exact canonical instrument and
does not make the broader prompt/wording instrument generally valid.

## 8. Adversarial interpretation

The simplest explanation consistent with the data is that the added public
text changes the model-conditioned report, with a heterogeneous mixture of
content sensitivity, prompt-length/format sensitivity, and repeated-call
variation. The current screen cannot separate these explanations. In
particular, seven task rows exceeding their duplicate gaps is not a proof that
the peer messages were semantically processed as peers or that they improved
decision quality.

## 9. Next admissible step

Do not add rounds, topology, ATTACKS, a detector, or a thermodynamic engine.
The next discriminating experiment is the already frozen 228-cell
`NO_PEER_A/B` versus `PEER_A/B` versus length/shape-matched `SHAM_A/B` batch,
after explicit provider authorization and credential hygiene. Its maximum
claim is the task-relevant peer-content increment over generic peer-shaped text.
If that comparison does not exceed duplicate and sham variability at the
task-cluster level, stop the peer-response/dynamics narrative and retain only
the measurement-boundary result.
