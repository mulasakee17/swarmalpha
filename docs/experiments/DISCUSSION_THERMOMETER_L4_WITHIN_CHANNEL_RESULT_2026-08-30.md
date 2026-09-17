# Discussion Thermometer L4 同通道粗粒化检验

日期：2026-08-30
状态：**DEVELOPMENT RESULT / ZERO NEW PROVIDER CALLS / PROFESSOR DECISION MEMO**

## 一句话结论

**FACT** — 在当前 7 个任务、14 个晚期转移上，最小宏观态
`(sorted q_t, U_t)` 没有比公开选择历史更好地预测下一段自报概率运动；完整
agent-by-option 微观态也没有优于最小宏观态。当前温度计可继续作为描述层，但
不应直接扩大现有 32-task/928-call 预测资格方案。

**范围纠正** — 本检验不是实时监测资格测试。实时 monitor 只要求 `S_t` 能由
当前讨论前缀定义、重放和更新，不读取未来或真值；本检验额外问低维投影是否保留
未来信息。因而负结果只否决当前 predictive macrostate 主张，不否决温度计。

## 检验的问题

本次不再用未来公开选择评价自报，而是在同一观测通道内检验：

\[
(P_t,\text{public history})\longrightarrow
\{A_{t+1},D_{t+1}\},
\]

其中 `A` 是下一段 matched-agent mean TV，`D` 是下一段 pooled TV。比较阶梯为：

1. `BEHAVIOR`：round、roster、coverage、当前/历史公开选择；
2. `MACRO`：`BEHAVIOR + sorted q_t + U_t`；
3. `MICROSTATE`：`MACRO +` 完整、agent/option-permutation-safe 的 `P_t`。

使用固定 `lambda=1` 的 ridge fractional-logit GLM，训练折内标准化，
leave-one-task-out；`lambda=0.1/1/10` 只作敏感性分析。agent 和 checkpoint
不增加推断样本量，实际推断单位仍为 7 个 task。

## 结果

| 下一段目标 | BEHAVIOR MSE | MACRO MSE | `MACRO-BEHAVIOR` | exact task sign-flip p |
|---|---:|---:|---:|---:|
| mean-agent TV | 0.04086 | 0.05135 | +0.01049 | 0.2344 |
| pooled TV | 0.04436 | 0.05583 | +0.01147 | 0.2188 |

正差值表示新增宏观态后 held-out loss 更高。两个目标在全部三档 lambda 下均为
正差值。进一步加入完整 `P_t` 也没有改善：

| 下一段目标 | MACRO MSE | MICROSTATE MSE | `MICROSTATE-MACRO` | p |
|---|---:|---:|---:|---:|
| mean-agent TV | 0.05135 | 0.06183 | +0.01048 | 0.3594 |
| pooled TV | 0.05583 | 0.06401 | +0.00818 | 0.6094 |

14 行中有 7 行的下一段运动恰为零，说明当前 development slice 的晚期动力学
信息稀疏。公开选择历史相对结构基线也不稳定：mean-agent TV 只有极小方向优势，
且随 lambda 变号；pooled TV 没有优势。

## 严格解释

- **FACT**：当前任务切片没有观察到 macro 或 microstate 的 task-heldout 增量信息。
- **不能推出**：自报信念无效、宏观量没有描述价值，或所有任务都不存在动力学。
- **INFERENCE**：当前主要瓶颈更像是轨迹缺乏可预测的晚期变化，而不是缺少更多
  scalar 指标。继续增加 entropy、temperature 或复合量不会修复目标稀疏。
- **LIMITATION**：只有 7 个 development tasks，目标零膨胀，semantic groups 为
  AI development grouping；本结果不是 confirmatory transport test。

## 给教授的路线选择

**建议保留两层结论：**

1. 近端可交付成果：一个与讨论隔离、真值盲、保留微态并输出最小宏观几何的
   Discussion Thermometer；其描述语义已经清楚，但 predictive sufficiency 尚未成立。
2. 若继续追求 Collective Epistemic Dynamics，下一批不能简单扩大现有自然任务，
   应先设计能够覆盖不同初始微态并产生可观测晚期转移的独立 task bank；任务按
   信息分配结构预注册，不能按运行后的 movement 或 correctness 筛选。

**DESIGN DECISION** — 暂停当前 32-task/928-call 扩张。下一项高难工作是冻结一个
低调用的 state-space-coverage 任务设计，先证明“存在可重复、非仪器噪声的晚期
转移”，再谈宏观态预测、外场响应和治理。

**后续已完成（零 provider）** — prefix-causal trajectory monitor 已实现，追加
新 checkpoint 不改写历史 reading hash；9 项 state-space counterexample audit
通过。标定场预检已冻结为 2 base scenarios × 4 information-allocation regimes，
复用现有两轮 trajectory engine，`X0/X1/X2` 全 roster primary + duplicate，
总预算 256 calls。它只检验当前状态分辨力和晚期运动，不含 prediction、干预或
治理。当前 8 个任务、薄调度器、G0--G3 analyzer 和 synthetic mock replay 已完成；
mock 只证明接线。自动审计曾发现 regime 名称通过 task ID 泄漏，已改为 opaque
`v1...v4` 并通过复查。人工语义接受与预算批准仍待完成，因此没有执行权限。

可重放结果：
`results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1/analysis-within-channel-v1.2.json`
（content hash：`sha256:774b227dc309c63584c5399d36d3feb994e87c2d4796d879741a5f89661be493`）。
