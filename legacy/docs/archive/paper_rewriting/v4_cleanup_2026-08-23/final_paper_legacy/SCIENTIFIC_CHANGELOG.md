# SCIENTIFIC_CHANGELOG — 投稿前定稿（scientific discipline + narrative + related work + future work）

> **V2 取代注记（2026-08-21）**：本文件记录 2026-08-20 之前的 V1 修订历史，其中 "pre-registered" 为 V1 时期对 "project-internal prospective specification" 的简写。V2 已按 `FIRST_PAPER_CROSS_MODEL_FREEZE_V2_2026-08-21.md` 与 `CROSS_MODEL_INTEGRATION_REPORT_2026-08-21.md` 重开封：GLM-4.6V 三执行（seed0/1 双臂 + seed2 三臂）作为核心复现证据纳入正文，"one model / cross-model validity unknown" 表述已删除。本文件作为历史记录保留，不再反映论文当前状态。

Scope: 本轮只做科学纪律、叙事、相关工作与未来工作。无新实验、无新模型/benchmark/detector、
无 SCDG 实现、无新干预臂。所有数字沿用 v3（2-seed）冻结数据。

## 影响科学有效性的修改

1. **锁定全文主线。** 收敛为一条链：
   same round-1 state → different disclosure → different outcomes → targeted rescue → routing unsolved。
   最终 framing = Epistemic Exposure Governance。核心一句（Abstract 首句）：
   "From the same realized epistemic state, changing which direction of evidence becomes public
   causally changes collective decision quality."

2. **Introduction 重构为 puzzle 开场。** 首段改为"多智能体系统通常假设暴露更多互补信息应改善
   集体推理，我们的结果说明这不完整"。定位 prior work 的四个维度（是否交流 / 如何 debate /
   谁与谁通信 / 如何 aggregate），本文显式研究"已发出证据的哪个方向成为公共"。

3. **Contributions 重写为三点。** (1) counterfactual evidence-disclosure experiment（identical
   realized state + 三臂 fork + proper loss + truth firewall）；(2) targeted rescue（pre-treatment
   severity 单调，标 post-hoc exploratory）；(3) intervention–routing boundary（"intervention
   problem appears easier than routing problem"）。

4. **seed 统计身份显式化。** 明确三个对象：
   - pre-registered confirmatory = seed 0（H1 −0.343 / H2 −0.308，冻结后才看结果）；
   - post-hoc second seed = seed 1（H1 −0.481 / H2 −0.360，方向保持且更强）；
   - pooled two-seed = 稳健性汇总，**不重新称为 preregistered primary**。
   相应措辞："The pre-registered single-seed confirmatory analysis detected both effects. We
   subsequently added a second seed as an explicitly post-hoc replication; it preserved the
   effect direction, and pooled two-seed estimates strengthened rather than reversed the original result."

5. **two-seed aggregation 写清。** Δ_{t,s} = Brier^A_{t,s} − Brier^B_{t,s}；task 内先平均 seed：
   \bar Δ_t = (1/S)Σ_s Δ_{t,s}；然后 45 task 等权；bootstrap unit = task；LOTO unit = task。
   明确避免把 task×seed 当独立样本。

6. **收敛过强 claim。**
   - "evidence coupling, not belief alignment" → "the exploratory pattern is more consistent with
     evidence coupling than with belief alignment, but this does not establish the distinction"。
   - "intervention never hurts correct groups" → "little change was observed in the two low-severity
     tasks"（good 组 n=2，不一般化）。
   - "two-sided mediocre" 收敛为 "confirming disclosure shows no comparable targeting effect"
     （正文只保留实质数据 1.22 vs 1.17、0.39 vs 0.26）。

7. **Results 重排为 3.1 / 3.2 / 3.3。** 3.1 pre-registered + second-seed replication（seed0/seed1/pooled
   三列表）；3.2 rescue scales with pre-treatment severity（empirical climax，ρ=−0.56）；3.3 boundary
   cases（7 个 ATTACKS 失败任务 → 引出 routing problem）。

8. **Section 5 重写为 "Why Truth-Blind Routing Remains Hard"。** 三步：semantic wall（self-label
   attacks 可命中正确项）→ detector 不迁移（development within-task +0.388 → confirmatory −0.08，
   标注 2 seeds 弱检验 + verbatim-only）→ Epistemic Exposure Governance 定义克制为
   "deciding which evidence enters the group's public cognitive space"，明确本文解决的是
   disclosure-direction，未解决 when / which item / how much / to whom。

9. **Related Work 扩为四类（A/B/C/D），并联网核实真实文献。**
   - A 多智能体辩论/信息交换：MAD(2305.14325)、CHAL(2605.12718)。
   - B 分布式信息/hidden-profile：Stasser & Titus 1985、HiddenBench(2505.11556)。
   - C 从众/错误级联：Easier to Mislead Than to Correct(2606.01637)、From Spark to Fire(2603.04474)。
   - D 共识效度/源依赖：Emergent Consensus(2606.22203)、CAGE-CAL=Counterfactual Graph for
     Multi-Agent LLM Calibration(2605.30653)。SCDG 仅作 future measurement，不暗示本文实现。

10. **Future Work 精简为三层。** (1) better source dependence（SCDG）；(2) truth-blind routing；
    (3) budgeted allocation。多模型/多 benchmark 降为次要一句。

11. **Conclusion 压缩为三句。** same state → materially different outcomes；targeted rescue scales
    with pre-treatment severity；detector failure → effective intervention ≠ solved routing → EEG。

## 数字一致性声明

- 所有数字来自 v3 冻结数据（45 task × 2 seed × 3 臂，270 rows，replay ok）。
- 本轮未改动任何数字；只改了数字的"统计身份"（seed0/seed1/pooled 三者区分）与措辞强度。
- 唯一新增的数据事实：seed1 单独口径 H1 −0.481 / H2 −0.360（此前只报告过 pooled），用于
  支撑"post-hoc second seed 保持方向"的陈述。seed1 H2 的 n=44（task 60 某 seed 的 CONTROL 臂
  0 报告）已在 §3.3/限制中隐含，需在 camera-ready 附注。
