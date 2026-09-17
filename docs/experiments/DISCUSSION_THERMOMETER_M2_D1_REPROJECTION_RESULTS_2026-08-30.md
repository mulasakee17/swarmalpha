# Discussion Thermometer M2/D1 零调用重投影结果

日期：2026-08-30  
状态：**ZERO-PROVIDER DESCRIPTIVE REPROJECTION — NOT CONSTRUCT VALIDATION**

本文报告把已经冻结的 M2 与 D1 raw logs、manifest、sensor freeze、run 和
`analysis-v1.4.json` 重新投影到 Discussion Thermometer V1。没有新增 provider
调用，没有读取答案进入 thermometer state，也没有执行干预。

## 1. 审计边界

执行器为
`experiments/campaign/v6/analyze_v6_discussion_thermometer_reprojection_v1.ts`。
它先验证：

- freeze、public artifact、run 与既有 `analysis-v1.4.json` 的 deterministic replay；
- D1 的单一 304-event attempt ledger；
- M2 的历史 split recovery：原始 ledger 52 个完整 invalid-response attempts
  加 1 个 started-only cell，recovery ledger 完整覆盖 cells 54--152，合并 run
  为 151 valid + 1 interrupted-unobserved。

M2 的 split recovery 不是被忽略的缺失，而是按已有 recovery 记录单独验证后才
接受。概率向量的 `1e-6` 和项数相关机器求和余量也按 sensor contract 处理；不做
重新归一化。

## 2. 数据规模

| corpus | tasks | checkpoints | adjacent transitions | primary reports | complete checkpoints |
|---|---:|---:|---:|---:|---:|
| M2 first five | 5 | 20 | 15 | 75 | 19 |
| D1 remaining five | 5 | 20 | 15 | 76 | 20 |
| 合计 | 10 | 40 | 30 | 151 | 39 |

唯一不完整 checkpoint 是 M2 task 8、agent 3、X2 的 primary A
`interrupted_unobserved`。B 虽然存在，但按预先定义的 primary semantics 不替代
A。该缺失导致 28/30 个相邻转移具备完整 matched roster。

## 3. primary self-report thermometer 读数

新状态使用每个 agent 的 primary A probability report 作为操作性信念；B 只作为
复测质量通道。所有 151 个 primary reports 都被用于相应 checkpoint 的状态投影。

全体 40 个 checkpoint 的复测指标：

- valid repeat pairs：151；
- mean duplicate TV：`0.05940395695`；
- max duplicate TV：`1.0`；
- transitions above endpoint repeatability reference：24/30；
- movement with no agent top-set change：12/30；
- pooled movement with no pooled top-set change：15/30；
- structured public-choice cross-check available：0/40。

最后一项为 0 是有意的：历史 public messages 是自然语言，没有冻结的结构化
choice ID；本次不调用第二个 LLM 从文本猜 choice。因此不能把已有人工 coding
审计结果冒充本次 thermometer 的机器交叉通道。

`12/30` 只说明连续 probability geometry 捕获了离散 top choice 不显示的变化，
不是预测效度或集体认知动力学成立的证据。`max duplicate TV=1` 则是明显的质量
风险：某些 checkpoint 的 self-report 对 exact repeat 极不稳定，任何后续标量或
预测模型都必须报告该风险，不能只保留稳定子集。

## 4. 与旧 A/B 平均 analyzer 的数值差异

旧 `analysis-v1.4` 把 A/B 平均后作为 `averagedReport`；新 thermometer 按语义
改为 primary A 作为状态，B 不进入状态估计。因此新旧读数不应被期待逐项相等。
两者的 pooled probability TV 差异为：

| corpus | mean TV(primary A pool, legacy A/B-mean pool) | max TV |
|---|---:|---:|
| M2 | 0.03273957 | 0.0875 |
| D1 | 0.02220138 | 0.1250 |

对应的 mean normalized report entropy、JSD 和 pooled concentration 的最大绝对
差异分别为：

| corpus | max \(|\Delta U|\) | max \(|\Delta J|\) | max \(|\Delta C|\) |
|---|---:|---:|---:|
| M2 | 0.12796488 | 0.06963446 | 0.0750 |
| D1 | 0.15773243 | 0.12107498 | 0.1250 |

这不是实现错误，而是两个不同 estimator 的结果。论文中必须明确声明估计对象，
不能把旧 A/B 平均和新的 primary belief 混写成同一状态。

## 5. 目前可以说什么

**FACT** — 现有冻结数据可以被无 provider 地重新投影为 40 个 truth-blind
operational self-reported belief states 和 30 个 descriptive transitions；roster
缺失、复测差异和 pooled drift 的可比性均被显式记录。

**FACT** — 连续 probability movement 在相当一部分转移中不等价于 top-option
flip；因此只记录离散 choice 会丢失状态变化信息。

**NOT ESTABLISHED** — 该状态是否 prompt-invariant、是否比 public-choice history
更有增量预测信息、是否足以描述完整讨论、是否存在 attractor/temperature/
recoverability，均未由这次重投影建立。

**NOT ESTABLISHED** — 由于没有机器结构化 public choice，本文不重新估计
belief-to-action alignment。D1 既有人工 cross-channel audit 仍保持独立状态，
不能与本工件混合计算。

## 6. 下一步边界

下一步仍是零调用：把新 thermometer state 与已有 trajectory/public artifact
逐任务对齐，生成 primary-A、B-only 和 legacy A/B-mean 的 sensitivity table，
并预先决定如何处理高 duplicate-TV checkpoint。只有观测层合同稳定后，才重新
讨论预测或干预；本结果不授权 ATTACKS、recovery 或治理实验。
