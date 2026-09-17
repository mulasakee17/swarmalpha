# Collective Epistemic Dynamics V1

Status: **FROZEN DEVELOPMENT ARTIFACT; V1 RESPONSE EXECUTION RETIRED; NOT CONFIRMATORY**  
Date: 2026-08-24

## 1. Scientific claim ceiling

**HYPOTHESIS.** From the same observed round-3 group state, different information exposures can change whether a group maintains, escapes, or corrects a collective error.

**IMPLEMENTED.** The repository now supports a three-round formation trajectory, an exact R3 artifact fork, three response arms, R4 public responses, R5 isolated belief measurement, deterministic state projection, raw provider-call records, content hashes, replay, and offline outcome analysis.

**DEVELOPMENT EVIDENCE.** A 10-task, one-seed GLM-4.6V screen has now been executed. It observed two R3 wrong-consensus tasks and arm-dependent terminal states, but ATTACKS was heterogeneous and did not outperform RANDOM_MATCHED within those two tasks. These results are documented in [`COLLECTIVE_EPISTEMIC_DYNAMICS_GLM46V_SCREEN10_RESULTS_2026-08-24.md`](COLLECTIVE_EPISTEMIC_DYNAMICS_GLM46V_SCREEN10_RESULTS_2026-08-24.md). They do not establish incidence, recoverability, or state predictiveness beyond this development sample. The term “dynamics” refers to repeated observations and controlled transitions, not a demonstrated physical law.

**DECISION.** The V1 response carrier is under-specified because `supports|attacks` has no categorical option target. New `--response` CLI execution is retired. Existing artifacts remain replayable and analyzable as a negative result; formation-only monitoring remains available. The engine-level reuse/retirement audit is [`COLLECTIVE_DYNAMICS_ENGINE_REUSE_AND_RETIREMENT_AUDIT_2026-08-24.md`](COLLECTIVE_DYNAMICS_ENGINE_REUSE_AND_RETIREMENT_AUDIT_2026-08-24.md).

**MEASUREMENT PROGRESS.** A zero-provider audit subsequently passed 170/170
computational invariance/equivariance checks on the stored screen. This supports
the projection implementation only. LLM report stability remains untested and
is governed by the frozen 48-call
[`COLLECTIVE_DYNAMICS_PROMPT_SENSITIVITY_CANARY_V1.md`](COLLECTIVE_DYNAMICS_PROMPT_SENSITIVITY_CANARY_V1.md).

## 2. Minimal state and outcome separation

For agent (i), round (t), and canonical option (y), the model emits a prompt-conditioned report (p_{i,t}(y)). This is an observable sensor response, not direct access to latent belief.

The minimal truth-blind reported-belief macrostate is:

\[
S_t^{obs} = (\bar p_t, H_{\mathrm{within},t}, D_{\mathrm{between},t}, A_t, M_t),
\]

where:

- \(\bar p_t(y)=N^{-1}\sum_i p_{i,t}(y)\) is the full equal-weight pooled distribution;
- \(H_{\mathrm{within},t}=N^{-1}\sum_i H(p_{i,t})/\log K\);
- \(H_{\mathrm{pool},t}=H(\bar p_t)/\log K\);
- \(D_{\mathrm{between},t}=\max(0,H_{\mathrm{pool},t}-H_{\mathrm{within},t})\), the normalized generalized-JSD decomposition;
- \(C_{\mathrm{pool},t}=\max_y \bar p_t(y)\), not (1-H_{\mathrm{pool},t});
- \(A_t=N^{-1}\sum_i \operatorname{TV}(p_{i,t-1},p_{i,t})\), with (A_1=null);
- \(M_t\) is roster completeness/missingness, not a numeric zero.

Only \(\bar p_t\), \(H_{\mathrm{within},t}\), adjacent-round reports, and roster validity are needed to reconstruct this geometry. \(H_{\mathrm{pool}}\), \(D_{\mathrm{between}}\), and \(C_{\mathrm{pool}}\) are derived views, not independent coordinates. Raw confidence text, `alignmentR`, old evidence entropy, option coverage, and `maxPairwiseTV` are not primary state coordinates. This state describes explicit report geometry, not message semantics or a complete latent group state.

Ground-truth-dependent quantities are offline evaluation only:

- multiclass Brier loss \(\sum_y(\bar p_t(y)-\mathbf{1}[y=y^*])^2\), range \([0,2]\);
- pooled top-choice accuracy;
- wrong/correct consensus strata;
- escape, recovery, stability, and relapse.

## 3. Interaction protocol

### Formation (R1–R3)

1. R1: every agent receives public context plus only its private information. No peer transcript is visible.
2. R2: every agent sees exactly the complete R1 public-message set.
3. R3: every agent sees exactly the complete R2 public-message set.

Collection is synchronous and previous-round-only. Messages produced inside the current collection loop are not visible to later agents in that round. There is no judge, majority early stop, or consensus early stop. Peers see natural-language public messages; the probability reports are recorded for measurement but are not inserted into peer transcripts. Provider temperature is frozen at zero, provider seed is precommitted, and thinking is disabled for the current GLM runner.

The entire truth-free R3 carrier is content-addressed. Every response arm records that same `r3SnapshotHash`.

### Same-state response fork (R4–R5)

The arms are:

- `CONTROL`: no inserted disclosure;
- `RANDOM_MATCHED`: deterministic truth-blind sample from all R3 self-reported evidence, with the same deduplicated item count as ATTACKS;
- `ATTACKS_NEUTRAL`: all deduplicated R3 evidence that agents themselves labeled `attacks`.

`RANDOM_MATCHED` and `ATTACKS_NEUTRAL` use the same renderer. It omits the supports/attacks label and makes no correctness claim. Matching is by item count; character counts and attack-set overlap are recorded rather than silently treated as equal. A zero-attack task produces two empty evidence arms and has no substantive treatment contrast; it must be reported, not interpreted as a rescue test.

R4 sees the exact R3 public-message set plus its arm disclosure. R5 is isolated per agent: it sees the arm disclosure and complete R4 public-message set, but R5 reports never re-enter discussion. Arm order is a deterministic task-and-seed permutation.

## 4. Operational definitions

Strict consensus at round (t) requires all three conditions:

1. the complete predeclared roster reports;
2. each agent has one unique argmax;
3. every agent's argmax is the same option.

There is no confidence threshold. Exact ties fail strict consensus.

Offline labels and endpoints are:

- `wrong_consensus`: strict R3 consensus option is not the canonical outcome;
- `correct_consensus`: strict R3 consensus option equals the outcome;
- `escape`: at final R5 the group no longer has strict consensus on the same wrong R3 option;
- `recovery`: the unique pooled R5 top option is correct;
- `stableRecovery`: the unique pooled top option is correct at both R4 and R5;
- `relapse`: pooled top is correct at R4 and not correct at R5;
- `controlWrongStateStable`: CONTROL has strict consensus on the same wrong option at both R4 and R5.

These are intentionally distinct. Escape can produce uncertainty or a different wrong answer; it is not recovery. ATTACKS effectiveness is not used to define recoverability. Recoverability is estimated by a predeclared response probability among tasks already classified as wrong consensus before treatment.

## 5. Frozen V1 estimand and falsification outcome

The V1 experimental unit was a task-seed trajectory, not an agent report. Its frozen primary contrast was:

\[
\mathbb{E}[L_{R5}(\text{ATTACKS_NEUTRAL})-L_{R5}(\text{RANDOM_MATCHED})
\mid \text{R3 wrong consensus}],
\]

where (L) is pooled multiclass Brier loss. The development screen did not support this carrier: within the two wrong-consensus tasks, ATTACKS minus RANDOM mean Brier was positive and the stable-recovery-rate difference was zero. With (n=2), this is not a population effect estimate; it is sufficient to reject immediate scaling of the under-specified selector.

Required harm reporting:

- ATTACKS minus RANDOM on R3 correct-consensus tasks;
- all-task effects without presenting them as the targeted-rescue estimand;
- zero-attack and identical-disclosure counts;
- failures/missingness by arm and step.

The V1 carrier or the broader state-response hypothesis is falsified or sharply weakened by different failures:

- wrong consensus is too rare to estimate response;
- the same-state or truth-firewall replay fails;
- **V1 carrier failure:** ATTACKS does not outperform the count-matched random exposure within wrong-consensus tasks, or its option target is undefined; both problems occurred in the development screen;
- apparent gain is explained by additional text volume, labels, missingness, or task leakage;
- rescue does not replicate across seeds and at least one additional model family;
- correct-state harm eliminates practical value.

## 6. Artifact and execution boundary

The implementation is isolated in:

- `experiments/campaign/v6/collectiveDynamicsV1.ts` — definitions, selection, state/replay, offline estimands;
- `experiments/campaign/v6/run_v6_collective_dynamics_v1.ts` — formation/response runner, raw prompt/response call records, plan and manifest writers;
- `experiments/campaign/v6/analyze_v6_collective_dynamics_v1.ts` — the only outcome-aware boundary;
- `test/v6-collective-dynamics-v1.test.ts` — deterministic wiring and corruption tests.

The frozen two-round production call record remains unchanged. Only the provider request boundary was generalized to accept a positive step number; the existing production trace and its validation remain two-round.

Zero-provider planning:

```bash
npm run dynamics:plan -- --tasks=14,39 --seeds=1,2 --output=results/v6_collective_dynamics_v1
```

New real execution is formation-only and requires `--formation`, `--execute`, `RUN_AUTHORIZED=yes`, and a locally available Zhipu credential. `--response` fails before credential loading or provider construction. Stored V1 formation/response artifacts retain deterministic replay and offline analysis; the exported response function remains only for injected-provider tests and historical code-level reproduction, not as an admissible new experiment.

## 7. Reuse decision

The implementation reuses SwarmAlpha's current HiddenBench authority, strict belief parser, provider adapter, evidence selector, collective-state kernel, content hashing, and no-retry provider boundary. No new package was added.

External assets remain useful for replication, not for the internal fork:

- [MALLM](https://github.com/Multi-Agent-LLMs/mallm) is Apache-2.0 and exposes configurable rounds, memory/discussion paradigms, agents, and decision protocols. It is the strongest candidate for a later independent orchestration replication.
- [Du et al.'s multiagent-debate code](https://github.com/composable-models/llm_multiagent_debate) supplies canonical multi-round debate baselines for GSM, biography, and MMLU, but it does not supply SwarmAlpha's distributed-private-information task carrier, per-round categorical reports, or an R3 same-state exposure fork.

Adopting either now would add a Python execution stack and translation layer without replacing the experiment-specific truth firewall, state projection, or artifact contract. The current decision is therefore reuse of protocol ideas and later external replication, not source-code integration.

## 8. Physical-language discipline

`entropy` is formally usable only as Shannon entropy of an explicit probability report. `attractor`, `basin of attraction`, `metastability`, `phase transition`, `free energy`, `temperature`, and `external field` are not empirical claims of this V1 experiment. “Perturbation” is acceptable as experimental language for randomized information exposure; it does not make the system thermodynamic.
