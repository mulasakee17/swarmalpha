# Discussion Thermometer A/B 敏感性与质量分层

日期：2026-08-30  
状态：**ZERO-PROVIDER INSTRUMENT AUDIT — DESCRIPTIVE ONLY**

本报告是 L1--L2 零调用审计。它把相同冻结 checkpoint 的两次 exact sensor
report 分别作为 primary-A 与 primary-B 投影，并把旧 analyzer 的 A/B 平均读数
作为第三个比较对象。没有新增 provider 调用，也没有根据答案筛选状态。

## 1. 预先固定的语义

- primary-A：预先登记的第一次 canonical report，定义操作性信念状态；
- primary-B：同一输入的第二次 report，用于 instrument sensitivity；
- legacy A/B-mean：历史 analyzer 的均值 estimator，不改写成新 thermometer state；
- A/B 不是两个独立 agent 或两个独立实验，只是同一传感器的重复调用；
- duplicate-TV 高的 checkpoint 保留在状态轨迹中，只增加质量分层标签，不删除、
  不插补、不事后选择更有利的重复。

## 2. 总体结果

| 量 | 结果 |
|---|---:|
| checkpoint rows | 40 |
| adjacent transitions | 30 |
| primary-A 与 primary-B pooled TV 均值 | 0.05410761 |
| primary-A 与 primary-B pooled TV 最大值 | 0.24999988 |
| A/B coverage 不同的 checkpoint | 1/40 |
| A 有状态而 B 缺失的 checkpoint | 0 |
| B 有状态而 A 缺失的 checkpoint | 1 |

唯一 coverage 差异来自 M2 task 8、agent 3、X2：A 是历史
`interrupted_unobserved`，B 已完成。因此 B-only 能恢复该 checkpoint，但这不
证明 B 更真实；它只说明重复位置与 missingness 相关，primary-A 仍因预先登记的
时序而保留。

## 3. 按 corpus 的转移敏感性

| corpus | variant | complete roster | mean agent TV | mean pooled TV |
|---|---|---:|---:|---:|
| M2 | primary-A | 13/15 | 0.15044436 | 0.13157047 |
| M2 | primary-B | 15/15 | 0.12722219 | 0.09372221 |
| D1 | primary-A | 15/15 | 0.16948149 | 0.15920371 |
| D1 | primary-B | 15/15 | 0.14344444 | 0.14261111 |

A/B 的状态转移量有实质差异，尤其 M2。这里不能选择其中较小或较大的那套来
支持某个故事；正确结论是当前传感器存在 repeat sensitivity，primary 语义必须
固定，复测差异必须单独报告。

## 4. 高 duplicate-TV 分层

阈值只用于描述，不用于过滤：每个 corpus 内取 valid duplicate-TV 的 empirical
p95。

| corpus | p95 threshold | valid duplicate pairs | high-TV checkpoint rows | high-TV agent reports |
|---|---:|---:|---:|---:|
| M2 | 0.4666665 | 75 | 5 | 5 |
| D1 | 0.2000000 | 76 | 4 | 4 |

“high-TV”不是错误标签，也不是 wrong state 标签。它表示 exact duplicate 对同一
冻结输入给出了较大不同的概率读数。后续分析应同时报告全样本和该质量分层，而不
能只分析低-TV 子集。

## 5. 与旧 A/B 平均的关系

primary-A 与旧 A/B-mean 的 pooled TV 平均差异为：M2 `0.03273957`、D1
`0.02220138`；最大差异分别为 `0.0875` 与 `0.1250`。这不是浮点错误，而是
估计对象不同：旧 analyzer 估计重复均值，新 thermometer 估计预先登记的 primary
reported belief。两者都可以重算，但不能混写。

## 6. 科学结论与限制

**FACT** — 现有冻结数据支持把 A/B 作为仪器敏感性与 missingness 审计，并显示
primary 选择会影响连续状态与转移读数。

**NOT ESTABLISHED** — A 或 B 哪一个更接近模型的“潜在信念”；这需要新的测量
资格化设计，不能从同一批重复中事后决定。也没有证明任何状态变量预测正确性或
公开行为。

**IMPLEMENTATION RULE** — 继续使用 primary-A 作为 state estimator，因为它是
预先登记的时间位置；B 只作质量元数据。无论 duplicate-TV 多大，primary state
都保留，除非 primary 本身 unavailable。后续若改变 primary 定义，必须升级
instrument version，不能在同一结果中切换。

工件位于
`results/v6_discussion_thermometer_m2_d1_reprojection_v1/sensitivity.json`，
生成器为
`experiments/campaign/v6/analyze_v6_discussion_thermometer_sensitivity_v1.ts`。
