# CLAIM_STATUS_TABLE — 统计身份分级（最终冻结版）

> **V2 取代注记（2026-08-21）**：本表基于 V1（2026-08-20）冻结的 DeepSeek v3 数据。V2 重开封后，GLM-4.6V 三执行（双臂 seed0/1 + 三臂 seed2）作为核心复现证据纳入正文；证据层级为：DS seed0（项目内部确认性）→ DS seed1（事后）→ GLM seed0（分别冻结双臂）→ GLM seed1（分别冻结随机重复）→ GLM seed2（分别冻结三臂扩展）。"pre-registered" 统一表述为 "project-internal prospective specification"。详见 `FIRST_PAPER_CROSS_MODEL_FREEZE_V2_2026-08-21.md`。

数字全部来自 v3 冻结数据（45 task × 2 seed × 3 臂，270 rows，replay ok）。任何跨级升级都是红线。

---

## PRE-REGISTERED CONFIRMATORY（seed 0，冻结后才看结果）

| Claim | 数字 | 95% CI |
|---|---|---|
| H1: ATTACKS − SUPPORTS 为负 | −0.343 | [−0.507, −0.193] |
| H2: ATTACKS − CONTROL 为负 | −0.308 | [−0.496, −0.147] |

- 这是唯一可写 "detected in predicted direction / confirmatory" 的两条。
- 45 task、task-level 配对、10k cluster bootstrap、LOTO signChanges=false。

## POST-HOC REPLICATION（seed 1，见 seed0 后追加）

| Claim | 数字 | 95% CI |
|---|---|---|
| H1 方向保持 | −0.481 | [−0.678, −0.299] |
| H2 方向保持 | −0.360 | [−0.556, −0.186] |

- 措辞固定 "post-hoc second seed preserved the direction (and strengthened it)"。
- seed1 H2 的 n=44（task 60 某 seed 的 CONTROL 臂 0 报告），诚实附注。

## POOLED ROBUSTNESS（两 seed 汇聚）

| Claim | 数字 | 95% CI |
|---|---|---|
| H1 pooled | −0.412 | [−0.571, −0.267] |
| H2 pooled | −0.330 | [−0.497, −0.188] |

- **robustness summary，不是重新标记的 pre-registered primary。** 全文三处声明（Abstract/§2/§3.1）。
- LOTO signChanges=false。

## EXPLORATORY（post-hoc，不构成确认性结论）

| Claim | 数字 | 边界 |
|---|---|---|
| rescue 随 pre-treatment severity 单调 | Spearman ρ = −0.60, CI [−0.80, −0.34]；Pearson −0.50 | severity 是 pre-treatment 协变量；但分析 post-hoc |
| 灾难组 rescue 最大 | catastrophic n=15 ΔAC −0.79；moderate n=28 −0.09；good n=2 +0.01 | good 组 n=2，只写 "little change in the two low-severity tasks"，不建立 non-harm claim |
| 证据耦合比信念对齐更相关 | reuse −0.372/−0.292；alignment −0.441/−0.228（反向）| "more consistent with... does not establish" |
| boundary cases | H1 7 正：2 真反号 + 5 噪声 | 机制解读为 INFERENCE |

## FUTURE WORK（未实现，禁止写成贡献）

| 项 | 状态 |
|---|---|
| SCDG（source-conditioned description-length gain，arXiv:2608.03859）| 仅作 future measurement，本文未实现 |
| truth-blind routing（CONTROL/confirming/disconfirming 选择器）| 未解决，核心开放问题 |
| budgeted allocation（有限注意力下的证据暴露）| 未做（full disclosure、无 budget） |
| multi-model / cross-benchmark | 未做，降为次要一句 |

---

## 最终核心结论（一句话）

> **We establish an intervention effect, not a solved adaptive routing policy.**

- 干预效应：pre-registered + post-hoc replication 双重支持（H1/H2 全负、LOTO 稳健）。
- 状态依赖：exploratory（Spearman −0.60）。
- 路由：未解决（detector 未复现，weak two-seed check，非证伪）。

## References 状态

- 9 条，全部联网核实到 lead-author/venue 级。作者全表/DOI 待 camera-ready 从 arXiv/ACM 页补齐。
- 无法确认的 venue 只写 arXiv，不猜。
