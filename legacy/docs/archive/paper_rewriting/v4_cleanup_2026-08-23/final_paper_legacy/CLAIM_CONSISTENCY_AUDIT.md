# CLAIM_CONSISTENCY_AUDIT — 最终一致性审查（freeze 后）

> **V2 取代注记（2026-08-21）**：本文件审查的是 V1（2026-08-20）冻结文本。V2 重开封后正文已重写（跨模型标题/贡献、Methods 2.2、Results 3.1–3.4、森林图表、Limitations），"pre-registered" 相关措辞由 "project-internal prospective specification" 取代；一致性以 V2 冻结版为准。详见 `FIRST_PAPER_CROSS_MODEL_FREEZE_V2_2026-08-21.md`。

逐段核对 7 类身份的用词一致性。审查发现一处**统计口径不一致**，已修正（见 §8）。

---

## 1. seed0 = PRE-REGISTERED CONFIRMATORY

- Abstract / §2 / §3.1 三处一致："pre-registered single-seed confirmatory"。
- 数字：H1 −0.343 [−0.507, −0.193]；H2 −0.308 [−0.496, −0.147]。✓ 全一致。

## 2. seed1 = POST-HOC REPLICATION

- 三处一致："post-hoc second seed" / "post-hoc replication"。
- 数字：H1 −0.481 [−0.678, −0.299]；H2 −0.360 [−0.556, −0.186]。✓

## 3. pooled = ROBUSTNESS SUMMARY

- Abstract / §2 / §3.1 三处均声明 "robustness summary, not a re-labeled pre-registered primary"。
- 数字：H1 −0.412 [−0.571, −0.267]；H2 −0.330 [−0.497, −0.188]。✓

## 4. severity heterogeneity = POST-HOC EXPLORATORY

- §2 "post-hoc exploratory"；§3.2 "corroborates rather than pre-registers"；Limitations "(3) Heterogeneity is post-hoc"。✓
- 数字（已修正为 paired 口径）：Spearman ρ = **−0.60** [−0.80, −0.34]；Pearson −0.50。✓

## 5. detector result = NON-REPLICATION IN A WEAK TWO-SEED CHECK

- 措辞统一为 "the development association does not replicate in our two-seed confirmatory check"。
- 明确 "failure to replicate is not proof of absence"、"not a validated general-purpose router"。
- 未出现 "disproved" 或泛化 "does not transfer"。✓

## 6. causal claim = direction-conditioned disclosure-policy effect under this protocol

- Abstract："changing the direction-conditioned evidence-disclosure policy causally changes collective
  decision quality **under our experimental protocol**"。
- Introduction："attribute outcome differences to the post-round-1 disclosure policy rather than
  differences in prior deliberation"。✓

## 7. Epistemic Exposure Governance = open framing，非已解决系统

- §4："this paper evaluates — and establishes the efficacy of — one direction-conditioned disclosure
  intervention"（未写 "solves"）。
- 未写 "disconfirming disclosure works once failure is identified"（已改为 "can strongly benefit
  high-severity states"）。✓

---

## 8. 本次审查发现的统计修正（FACT，必须记录）

**问题**：论文 §3.2 的 severity 异质性（Spearman −0.56）是用 **arm-wise** 口径（先分别平均各臂 Brier
再相减）算的；但 §2 定义与冻结 analyzer（`analyzeForkRows`）用的是 **paired** 口径（先算 task-seed 内
配对差，再跨 seed 平均）。task 60 某 seed 的 CONTROL 臂 0 报告，导致两种口径在它身上分歧。

**修正**：统一为 paired 口径（与 §2 定义、frozen analyzer 一致）：

| 量 | 修正前（arm-wise，错）| 修正后（paired，对）|
|---|---|---|
| Spearman ρ | −0.56 | **−0.60** |
| 95% CI | [−0.78, −0.30] | **[−0.80, −0.34]** |
| Pearson r | −0.47 | **−0.50** |
| moderate ΔAC | −0.09 | **−0.11** |

catastrophic（n=15，−0.79）与 good（n=2，+0.01）不变；n=15/28/2 分层不变（severity 本身不依赖口径）。
**不改变任何 claim 强度**（仍是"强负、CI 全负"），是纯口径一致性修正。

**待同步文件**（内容已冻结于 `paper.en.md`，以下为格式/翻译同步，冻结后允许）：
- `paper.zh.md`：−0.56 → −0.60，CI、Pearson、moderate −0.09 → −0.11。
- `main.tex`：同上。
- `CLAIM_STATUS_TABLE.md`、`CLAIM_AUDIT.md`、`CHANGELOG_PRE_SUBMISSION.md`、`SCIENTIFIC_CHANGELOG.md`
  中的 −0.56 一并更新。

---

## 9. 一致通过的三条核心记忆点

1. **Same realized state, different evidence exposure.** ✓
2. **Disconfirming disclosure produces a state-dependent rescue.** ✓
3. **Intervention is easier than truth-blind routing.** ✓

## 结论

除 §8 的统计口径修正（已修）与待同步的翻译/LaTeX/审计表数字外，**无 claim 身份不一致、无跨级升级、
无数据与结论矛盾**。
