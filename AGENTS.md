# SwarmAlpha

## Persistent research-direction lesson (normative, updated 2026-09-02)

- Measurement qualification, replay, hashes, and schemas are safeguards, not the project's scientific endpoint. Do not let integrity engineering replace the operational decision problem.
- The default mother problem is governance without immediate ground truth: under correlated sources and bounded compute, decide which new evidence, source, tool, private report, or human review to acquire next, and when to abstain or escalate.
- The categorical probability thermometer, belief geometry, entropy, JSD, dispersion, and stability are at most one observable channel and simple baselines. They are not the project's endpoint, and turning discussion into another scalar is not sufficient scientific progress.
- The owner-frozen design target is a multi-channel collective decision-process state descriptor. It must keep belief/choice, registered information coverage, discussion utilization, source/lineage dependence, participation and influence, model/role capability heterogeneity, missingness, and cost as distinct observable channels. Decision quality remains an independently evaluated offline outcome, never an online state coordinate.
- Information coverage must name its registered denominator; when the total relevant information is unknown, call it observed/registered-pool coverage rather than coverage of truth. Discussion utilization means auditable engagement with distinct exposed information, not message count or token volume. Influence must distinguish information-bearing response from authority or presentation dominance and cannot be called causal without a temporal, randomized, or counterfactual design.
- Strong/weak-model collaboration is a priority testbed only when it preserves asymmetric information and separates model capability, information access, role, and speaking authority. Do not infer a pure heterogeneity or influence effect from a cohort label alone.
- Online governance code and policies must not read `groundTruth`, `correctAnswer`, resolver outcomes, or later evaluation artifacts. Revealed outcomes belong to offline calibration and effect evaluation only.
- Under a frozen `ClaimContract + SensorContract`, the canonical categorical probability self-report is the agent's **operational belief state at that checkpoint**. This is a measurement definition, not a claim that hidden activations were read, that the probability is calibrated, or that it is objectively correct.
- The predeclared primary report defines the operational belief state. An exact duplicate is instrument-quality metadata only: it must not be averaged into the primary state, must not determine whether a valid primary exists, and must not be selected post hoc. Missing repeat sensitivity must remain unavailable, never zero.
- Public choice, discussion text, source/evidence structure, and self-reported belief are distinct observable channels. Cross-channel disagreement is a result to describe, not permission to erase or overwrite the belief report. Never infer a structured public choice from free text inside the core thermometer.
- Build the discussion-state observation layer before prediction, intervention, or governance. The thermometer must remain isolated from the public discussion and must not emit action recommendations. No state variable earns control authority merely because it is measurable.
- A public-only second opinion is a consistency check, not independent verification. Call an action verification only when it can acquire a new observation or a separately governed source.
- Distinct source or lineage identity is not statistical independence. Never rename declared/verified identity diversity as independent evidence without an empirical error-correlation argument.
- Prefer the smallest experiment that distinguishes policies before adding schemas or bridges. Every proposed quantity must name the operational decision it changes, its admissible online inputs, its falsification test, and its independent outcome.
- Do not pursue engineering complexity as a proxy for progress. Prefer the smallest sufficient implementation that solves a real user or research need; reuse existing paths before adding abstractions, modules, schemas, adapters, engines, or comparison arms.
- Treat documentation as a research artifact, not a progress metric. Create or extend a document only when it is needed to freeze a definition, decision, protocol, result, limitation, or reproducibility boundary that cannot be expressed more clearly in existing authority. Prefer updating the current authoritative document over adding another report, and do not create narrative status documents when code, tests, results, or a concise commit message are sufficient.
- Every material increase in complexity must identify a concrete practical benefit, the evidence needed to verify that benefit, and the simpler alternative it displaces. If that benefit is absent, uncertain, or not required for the current claim, defer the complexity.
- Optimize for usable outcomes and real decision quality first. Theoretical rigor and auditability should constrain and clarify the solution, not turn safeguards into the product or make the application scenario artificially narrow.
- A governance intervention is a **targeted rescue, not a universal booster**. An effect concentrated on catastrophic (would-have-failed, confidently-wrong) tasks is the signal, not a dilution: moving already-correct tasks is wasted intervention, and "generality" means the rescue reproduces on every identifiable failure task, not a positive average sign across all tasks. The truth-blind detector's job is to identify those failure tasks *pre-action*; never judge an intervention by pooled mean over all tasks, and never label "effect concentrated on disaster tasks" as a weakness.

## Current repository authority (normative)

- 2026-09-14 owner closeout: active research is stopped; preserve ideas and artifacts. Do not resume experiments, engine expansion, or submission from an old plan. 2026-09-17 narrow owner authorization adds handoff usability checks, a standalone offline Jev SemanticProbe, concise documentation, and GitHub delivery. This does not authorize provider experiments, controller/runtime expansion, or submission; any broader resumption needs an explicit new user request.

- Read `docs/ACTIVE_RESEARCH_SURFACE.md` before broad repository inspection.
- For current descriptor work, start with `src/lib/epistemic/collectiveDecisionProcessState.ts`, its three direct tests, the V0 architecture contract, and the Q0/Q2 qualification contract. Do not reread historical engines to reconstruct the current task.
- Historical engines, V2/lunar experiments, and superseded documentation are physically under `legacy/`; consult `legacy/README.md` only when historical compatibility or reproduction is in scope. Existing compatibility imports remain live dependencies, not new research authority.
- Default work surface: `src/lib/{epistemic,governance,experimentation}`, `experiments/campaign/{v6,measurement}`, and their direct tests/docs.
- `legacy/experiments/v2`, `legacy/experiments/lunar_survival`, legacy runtime/thermodynamics, and E12 scripts are `LEGACY_READ_ONLY` unless the user explicitly scopes work there.
- Do not use legacy outputs as current V6 measurement-validity or governance-effect evidence.
- Do not split V6, Measurement, kernel contracts, and replay across repositories before the split gates in `docs/ACTIVE_RESEARCH_SURFACE.md` pass.

多 agent 集体决策 + 治理机制实验项目（论文导向）。核心科学问题：可测量的治理干预能否在独立评估标准下改善集体决策质量。

## 文档写作铁律（强制）

写作或修改任何 SwarmAlpha 文档前，**必须阅读并遵守** [docs/REASONING_PROTOCOL.md](docs/REASONING_PROTOCOL.md)（文档推理协议）。其不可破坏的核心：

- 优先级：逻辑正确 > 事实准确 > 与仓库证据一致 > 定义清晰 > 研究严谨 > 可读性 > 说服力 > 风格。绝不为了显得更强而牺牲前五项。
- 严格区分 FACT / INFERENCE / HYPOTHESIS / DESIGN INTENT / SPECULATION；禁止 "designed to improve"→"improves"、"associated with"→"causes"、"we propose"→"we establish" 之类的升级。
- 证据层级：实际实现 > 可复现实验输出 > 测试 > schema/配置 > 技术文档 > 研究叙述 > README > 旧计划。旧文档不能压过实现。
- 因果纪律：治理干预 → 群体动态变化 → 独立评估的决策质量变化，**最后一段不能跳**；共识/影响分布/稳定性只是解释变量，不是决策质量改善的证据。
- 度量 ≠ 构念：度量有效性需论证（见协议 §5/§8）。
- Implemented / Tested / Proposed 分离；缺失证据标 unknown，不发明数字。
- 矛盾时解决而非并存：更新前提后必须追踪并修正基于旧前提的结论。

## 历史快照（2026-08-08；不是当前状态或待办）

- 当时记录完成四个批次（当时未提交，等 Codex 审查；不代表当前 Git 状态）：精确重放验证、susceptibility 语义拆分、role 策略版本化、文档同步。
- E8 susceptibility 中介对现有数据 fail-closed（全为 schema-1）；现有 E12 数据显示治理对 deepseek 净负向、对 glm 弱正向；群体协议显著低于单 agent 全信息个体上限。这些是如实写进 LIMITATIONS 的事实，不是可粉饰的宣传点。
- 核心文档：[docs/REASONING_PROTOCOL.md](docs/REASONING_PROTOCOL.md)、[docs/EPISTEMIC_QUANTITY_SEMANTICS.md](docs/architecture/EPISTEMIC_QUANTITY_SEMANTICS.md)、[docs/experiments/REPLAY_VERIFICATION.md](docs/experiments/REPLAY_VERIFICATION.md)、[docs/AUDIT_CLAIM_VERIFICATION.md](docs/AUDIT_CLAIM_VERIFICATION.md)。
