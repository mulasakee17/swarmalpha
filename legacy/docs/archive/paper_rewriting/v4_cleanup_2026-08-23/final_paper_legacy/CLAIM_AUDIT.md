# CLAIM_AUDIT — 统计身份分级

> **V2 取代注记（2026-08-21）**：本文件为 V1（2026-08-20 冻结前）的统计身份审计。V2 重开封后主贡献升级为跨模型表述，证据层级扩为五层（DS seed0/seed1、GLM seed0/seed1/seed2），"pre-registered" 统一为 "project-internal prospective specification"，GLM 三执行作为核心复现证据进入正文。详见 `FIRST_PAPER_CROSS_MODEL_FREEZE_V2_2026-08-21.md`。本文保留为历史记录。

本文所有 claim 按统计身份分为四类，任何跨类升级都是红线。数字全部来自 v3 冻结数据
（45 task × 2 seed × 3 臂，270 rows，replay ok）。

---

## A. Pre-registered confirmatory（seed 0，冻结后才看结果）

| Claim | 数字 | 身份 |
|---|---|---|
| H1: ATTACKS − SUPPORTS 为负（ATTACKS 优）| −0.343, CI [−0.507, −0.193] | pre-registered primary |
| H2: ATTACKS − CONTROL 为负（披露优于不披露）| −0.308, CI [−0.496, −0.147] | pre-registered secondary |

- 这是唯一可以写 "detected in predicted direction / confirmatory" 的两条。
- 45 task、task-level 配对、10k cluster bootstrap、LOTO signChanges=false。

## B. Post-hoc replication（seed 1，见 seed0 后追加）

| Claim | 数字 | 身份 |
|---|---|---|
| 第二 seed 保持方向 | seed1 H1 −0.481 CI [−0.678, −0.299]；H2 −0.360 CI [−0.556, −0.186] | post-hoc replication |
| pooled 稳健性 | H1 −0.412 CI [−0.571, −0.267]；H2 −0.330 CI [−0.497, −0.188] | pooled robustness |

- 措辞固定为 "post-hoc second-seed replication"；pooled **不是**重新称为 preregistered primary。
- seed1 H2 的 n=44（task 60 某 seed 的 CONTROL 臂 0 final report），为诚实附注，不影响方向。

## C. Exploratory（post-hoc，不构成确认性结论）

| Claim | 数字 | 边界 |
|---|---|---|
| rescue 随 pre-treatment severity 单调放大 | Spearman ρ = −0.56, CI [−0.78, −0.30]；Pearson −0.47 | severity 是 pre-treatment 协变量，故非 outcome-based subgrouping；但分析本身 post-hoc |
| 灾难组 rescue 最大 | catastrophic n=15 ΔAC −0.79；moderate n=28 −0.09；good n=2 +0.01 | good 组 n=2，只写 "little change in the two low-severity tasks"，不写 "never hurts correct groups" |
| 证据耦合比信念对齐更相关 | reuse split −0.372/−0.292；alignment split −0.441/−0.228（反向）| 只写 "more consistent with evidence coupling than belief alignment, but does not establish" |
| boundary cases（ATTACKS 失败任务）| H1 7 正：2 真反号（task17/23）+ 5 噪声 | 机制解读为 INFERENCE，非因果 |

## D. Future work（未实现、未验证，禁止写成贡献）

| 项 | 状态 |
|---|---|
| SCDG（source-conditioned description-length gain）| 仅作 future measurement，本文未实现 |
| truth-blind routing（CONTROL/confirming/disconfirming 选择器）| 未解决，是核心开放问题 |
| budgeted allocation（有限注意力下的证据暴露）| 未做（本文 full disclosure、无 budget） |
| multi-model / cross-benchmark | 未做，降为次要一句 |

---

## 发现的 claim 强度 / 统计身份风险（诚实标注）

1. **"detector 未复现" 是弱检验下的负结果。** confirmatory within-task 只有 2 run/task（vs
   development 10 run/task），−0.08 是"未复现"，不是"强证伪"。正文已写成 "weak replication;
   a failure to replicate is not a proof of absence"。
2. **"good severity" 组 n=2。** 已收敛为 "little change in the two low-severity tasks"，不做
   "干预从不伤害正确群体" 的一般化。
3. **moderation（coupling vs alignment）是 exploratory。** 已从 "evidence coupling, not belief
   alignment" 降为 "more consistent with... does not establish"。
4. **pooled two-seed 的统计身份。** 已在正文 §2 与 CLAIM_AUDIT 双重声明 pooled 是 robustness
   汇总、非重新标记的 preregistered primary。
5. **References 的作者全表/venue 待 camera-ready 核对。** 本轮已联网核实到 lead-author 级 +
   arXiv ID；完整作者表、DOI、venue 需人工核对（MAD 的 venue 尤其需确认，当前仅标 arXiv）。
