# Collective Epistemic Dynamics GLM-4.6V Screen-10 Results

Status: **DEVELOPMENT EVIDENCE — NOT CONFIRMATORY, NOT GOVERNANCE AUTHORITY**  
Date: 2026-08-24

## 1. Decision

**FACT.** The screen contains concrete instances in which the same frozen R3 collective state reaches different R4/R5 terminal states under different information exposures.

**FACT.** The implemented `ATTACKS_NEUTRAL` selector is not a general recovery operator. Across the two observed R3 wrong-consensus tasks, one was stably recovered by ATTACKS and the other was stably recovered by RANDOM_MATCHED while ATTACKS failed.

**DECISION.** Do not scale the current ATTACKS policy, call it governance, or use this screen to upgrade a paper claim. The deeper state-response question remains experimentally meaningful, but the current evidence-polarity carrier must be repaired before confirmatory execution.

## 2. Frozen execution

| Field | Value |
|---|---|
| Provider/model | Zhipu GLM-4.6V |
| Development tasks | HiddenBench 1, 8, 15, 22, 29, 36, 43, 50, 57, 64 |
| Selection | truth-free systematic task-ID sample |
| Seed | 1 |
| Formation | R1–R3, synchronous previous-round-only |
| Response | CONTROL, RANDOM_MATCHED, ATTACKS_NEUTRAL; R4 plus isolated R5 |
| Plan hash | `sha256:c5b6e20b332cdf9a6d0b40964deb0249da63407111b9e415f7cee388eab449e9` |
| Formation manifest hash | `sha256:d835899509dc8e2d20816e43c4a6846b01054d15dcdf00314e0e6cbc2801a22e` |
| Full manifest hash | `sha256:9edc829c374cbb681d3e06616afa638c9d87b07d0a92cb5bf14ef25b7c462e04` |
| Formation analysis hash | `sha256:d97dda7a35e95e1391f454ac18fb5d58ff463eeec578c4355cb63bbad37f8083` |
| Outcome analysis hash | `sha256:5127012107bd9f15a5c45ad294a9c1b7528008a2e2f2531e03015c0f954f85a1` |
| Formation calls/tokens | 114 / 120,410 |
| Response calls/tokens | 228 / 334,031 |
| Total calls/tokens | 342 / 454,441 |
| Missing usage | 0 |

All ten formation artifacts, all ten response artifacts, and the full manifest replayed successfully before outcome analysis. The separate task-14 canary used 12 calls and 11,323 tokens; it is not part of the screen estimand.

Artifacts are under `results/v6_collective_dynamics_v1_glm46v_monitor_screen10_seed1/`.

## 3. Formation observations

At R3:

- wrong strict consensus: 2/10;
- correct strict consensus: 3/10;
- no strict consensus: 5/10;
- newly formed wrong consensus between R1 and R3: 0/10;
- `disagreement↓`, `pooledCertainty↑`, and `Brier↑`: 3/10.

The mean one-hot individual-report fraction over all task-round cells was 0.3472. Among R2/R3 transition cells, 0.15 had zero mean agent TV. The probability sensor therefore showed substantial boundary mass but was not universally frozen.

Across all ten tasks from R1 to R3:

- mean between-agent disagreement change: −0.01428;
- mean pooled-certainty change: +0.14792;
- mean pooled-Brier change: −0.03342.

The pooled average improved slightly, while three individual tasks exhibited error-amplifying concentration. This is why pooled means cannot establish or refute collective-error dynamics.

Both observed wrong consensuses were already present independently at R1 and persisted through R3. This screen therefore observes stabilization and response, not discussion-induced entry into wrong consensus.

## 4. Wrong-consensus response

| Task | R3 wrong option | CONTROL | RANDOM_MATCHED | ATTACKS_NEUTRAL | ATTACKS − RANDOM Brier |
|---|---|---|---|---|---:|
| 43 | Aurora Station | persists; final Brier 1.61586 | persists; 1.14000 | stable recovery to Canyon Depot; 0.02375 | −1.11625 |
| 57 | Site B | persists; 1.85375 | stable recovery to Site C; 0.07125 | persists; 1.90125 | +1.83000 |

For both tasks, CONTROL maintained strict consensus on the same wrong option at R4 and R5.

Within the two-task wrong-consensus stratum:

- mean ATTACKS − RANDOM final Brier: **+0.356875**;
- ATTACKS − RANDOM stable-recovery-rate difference: **0**;
- ATTACKS stable recovery: 1/2;
- RANDOM stable recovery: 1/2.

With (n=2), no population estimate or significance claim is warranted. The valid observation is qualitative heterogeneity under an exact same-state fork.

## 5. Harm and all-task results

Among the three R3 correct-consensus tasks, ATTACKS had higher final Brier than RANDOM_MATCHED on two. Mean ATTACKS − RANDOM Brier in that stratum was +0.03417.

Across all ten development tasks:

- mean CONTROL final Brier: 0.61090;
- mean RANDOM_MATCHED final Brier: 0.34832;
- mean ATTACKS_NEUTRAL final Brier: 0.30794;
- mean ATTACKS − RANDOM final Brier: −0.04038.

These pooled figures are descriptive only. They mix wrong consensus, correct consensus, and no-consensus states and are not the targeted-rescue estimand.

## 6. Selector validity failure

RANDOM_MATCHED and ATTACKS_NEUTRAL were item-count matched but not character-count matched:

- task 43: RANDOM 1,550 characters vs ATTACKS 1,373;
- task 57: RANDOM 1,166 characters vs ATTACKS 1,069.

Their content also overlapped:

- task 43: RANDOM contained 3 of 5 ATTACKS items;
- task 57: RANDOM contained 2 of 4 ATTACKS items.

No task had a zero-item ATTACKS bundle or identical RANDOM/ATTACKS selection, so the two arm labels represented distinct delivered content. However, the categorical evidence schema records only `supports|attacks` and does not record the option being supported or attacked. The polarity is therefore under-specified.

Task 57 exposes the failure directly. The decisive observation that Site B was scheduled for explosive blasting appeared in RANDOM_MATCHED but not ATTACKS_NEUTRAL. The selector did not fail because ATTACKS was too weak in quantity; it failed because an agent's self-reported global polarity was not a well-defined relation to the group's wrong option.

Consequently:

- `ATTACKS_NEUTRAL` means “items carrying the model's self-reported attacks label”;
- it must not be renamed “corrective evidence”, “counterevidence to the wrong consensus”, or “external field toward truth”;
- more seeds with the same ambiguous carrier would replicate a mixture of semantics rather than qualify a recovery mechanism.

## 7. What the screen establishes and does not establish

**SUPPORTED IN THIS DEVELOPMENT SCREEN**

- strict wrong consensus exists in GLM-4.6V HiddenBench trajectories;
- those wrong states persisted under CONTROL in the two observed cases;
- from the same R3 state, different delivered evidence bundles produced different terminal states;
- recovery was content- and task-dependent, not an invariant effect of the ATTACKS label.

**NOT SUPPORTED**

- ATTACKS as a generally effective intervention;
- a state-independent governance rule;
- discussion-induced formation of wrong consensus;
- population recoverability rates;
- cross-seed or cross-model replication;
- attractors, metastability, phase transition, free energy, or any literal thermodynamic law.

## 8. Next admissible work

The project order is now monitoring, controlled perturbation, then governance. Do not execute another V1 response arm. First use formation-only trajectories to test whether discussion creates wrong consensus that was absent in the isolated R1 elicitation and whether report-state transitions reproduce across seeds. In parallel, qualify option-order and prompt sensitivity of the probability-report sensor. This reuses the current fixed-round runner and requires no intervention engine.

Only if monitoring survives those tests should ambiguous global polarity be replaced with an option-targeted evidence carrier such as:

```text
{ content, targetOption, relationToTarget: supports | attacks | unclear }
```

Its qualification must test whether independent annotators or a frozen parser can reproduce the option target and polarity without ground truth. Only after that test passes should frozen states be forked with:

1. option-targeted counterevidence to the current pooled top;
2. a length- and item-count-matched random bundle;
3. CONTROL;
4. held-out seeds and at least one additional model family.

This would test state recoverability without defining recovery by the success of today's ATTACKS selector. Governance claims remain out of scope until a truth-blind pre-action detector identifies failure-prone tasks and the action improves an independent outcome without unacceptable correct-state harm.
