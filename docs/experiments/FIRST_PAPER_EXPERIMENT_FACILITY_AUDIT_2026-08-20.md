# 第一篇论文实验设施审计（2026-08-20）

状态：**论文可用；设施存在边界；本轮不扩建。**

本审计只回答两个问题：现有 fork 结果能否支撑第一篇论文，以及哪些实现缺口必须限制论文措辞。它不把完整性工程升级为第一篇论文的贡献，也不授权修改当前实验代码。

## 1. 总结判断

现有实验可以使用。三臂在每个 task×seed 内共享同一批 Round-1 报告与 `round1StateHash`，最终 Brier 可由保存的概率向量重算，主要对比在 seed 0、事后 seed 1、排除广义既往使用任务、完整报告区块四种口径下均保持方向与区间。这足以支持**当前实现协议内的选择策略效应**。

但现有设施不能支持下列更强表述：完整提供商溯源、任意目录内容的精确重放、模型关系标签的语义构念有效性、外部预注册、跨模型普适性或已解决在线检测/路由。

## 2. 发现

### F1（P1）：最终报告绕过规范解析器

- 证据：`experiments/campaign/v6/run_v6_fork.ts:309-313` 直接对 `rawResponse` 做 `safeJsonParse`，取首个 report 的概率；Round 1/2 则走 `parseBeliefResponse`（同文件 :213-225、:279-285）。
- 风险：最终概率未必经过与讨论报告同等级的 claim ID、选项集合、概率归一化和 schema 验证；无效但形状近似的 JSON 可能进入结局。
- 对第一篇的影响：这是 measurement-boundary limitation，不自动使已保存概率和由其重算的 Brier 无效；论文不得写“所有最终响应均经规范 schema 验证”。
- 最小后续修复：第二篇新数据采集前让 final elicitation 只接受正式 adapter 的已验证对象，并加一条故意错误 option/概率和的拒绝测试。不要为第一篇重跑而扩建。

### F2（P1）：失败状态与原始最终响应未进入分析工件

- 证据：非 `response` 与解析失败直接 `continue`（:307-313）；结果行只保存成功概率与 `finalReportedCount`（:351-353）。
- 风险：不能区分提供商失败、截断、schema 失败、空回答或策略相关拒答；缺失机制不可识别。
- 对第一篇的影响：CONTROL/SUPPORTS/ATTACKS 有效报告分别为 331/354、347/354、345/354，因此“无臂偏缺失”不成立。完整三臂报告区块敏感性仍保持 H1/H2，故主要效应可保留，但必须报告缺失差异。
- 最小后续修复：第二篇每次调用只增加 `status`、`parseErrorCode`、`rawResponseHash` 三个字段；原始全文是否保存取决于隐私与成本，不要求新增事件框架。

### F3（P2）：`round1StateHash` 是摘要指纹，不是完整系统状态证明

- 证据：哈希只覆盖 `{agentId, probabilities}` 与排序后的 evidence content hashes（:70-77）。它不直接覆盖 transcript 文本、relation 标签、evidence-to-agent 映射、task/options、private information、prompt、model/config 或 parser version。
- 风险：不同的完整状态可能共享该摘要；“identical state”若不加限定会过强。
- 对第一篇的影响：运行时三臂确实由同一内存中的 Round-1 对象分叉（:229-265），因此同一次执行中的 fork 设计仍成立；论文应写“same recorded round-1 state”并说明哈希验证字段，而不是形式化全状态等价。
- 最小后续修复：第二篇把现有 canonical task hash、prompt/schema/config version、完整 transcript hash 与 relation/source mapping hash合并进一个 `forkInputHash`。这是一个字段，不新增 schema 家族。

### F4（P2）：重放验证只检查 manifest 列出的文件

- 证据：`verifyForkOutput` 遍历 `manifest.files`（:792-801），校验 manifest 自身哈希（:802-805），但不枚举并拒绝目录中的未登记结果文件。
- 风险：`ok:true` 表示“列出的文件一致”，不是“目录内容完整且唯一”。
- 对第一篇的影响：不影响列出文件的哈希一致性，但必须把 “exact replay” 降为 “recorded-artifact verification”。
- 最小后续修复：第二篇验证时比较 `*.jsonl` 实际集合与 manifest 集合；十余行即可，不建设新 registry。

### F5（P3）：计划预算用首个任务的 agent 数外推全部任务

- 证据：`buildForkPlanV1` 从 `taskIds[0]` 取单一 `agentCount`（:632-648）。本数据中任务 30、34、50 为三 agent，其余为四 agent。
- 风险：计划调用数和预算上界不精确；如果预算恰好卡边，可能改变执行覆盖。
- 对第一篇的影响：结果文件实际存在，主要统计不依赖计划预算字段；Supplement 不应把计划 agent count 当作所有任务的实际 agent count。
- 最小后续修复：第二篇按任务求和 planned calls；不要引入新的预算抽象。

### F6（P2）：处理“方向”与披露量/来源未被实验性正交化

- 证据：SUPPORTS 与 ATTACKS 的平均条数、字符数、来源数接近但不同，且单 block 差异可大；relation 也没有目标 option。
- 风险：无法把结果解释成脱离 selector 实现的“纯语义方向定律”。
- 对第一篇的影响：将 estimand 定义为两个**已实现方向条件化选择策略**的差异即可；这不是实验失效，而是构念范围较窄。
- 最小后续实验：第二篇若需机制识别，只增加一个定额 top-k/等字符预算对照；先用小样判别，禁止扩成多臂工程矩阵。

## 3. 为什么这些漏洞没有使实验“不能用”

实验效度不是全有或全无。当前证据分别支持不同层级：

1. **内部结果可重算：支持。** 保存的 final belief 与 Brier 一致。
2. **同一运行状态后的处理对比：支持，但“状态”按实际 fork 与已记录字段限定。**
3. **seed-0 内部预先指定对比：支持。**
4. **外部预注册：不支持。**
5. **广义未使用任务/新任务族泛化：不支持；排除18任务的敏感性支持效应不由它们驱动。**
6. **跨模型、跨基准、部署级路由：未知。**

因此正确动作是缩窄 claim、加入敏感性、冻结第一篇，而不是废弃实验或先重建设施。

## 4. 第一篇冻结前的必要动作

- [x] 将 “pre-registered” 改为 “internally pre-specified”。
- [x] 将 “45 unseen tasks” 改为 “held out from ATTACKS/SUPPORTS outcome inspection”。
- [x] 加入广义既往使用任务排除敏感性。
- [x] 报告分臂缺失，并加入完整报告区块敏感性。
- [x] 将 direction claim 限定为 implemented selector bundle。
- [x] 将 replay claim 限定为 manifest-listed recorded artifacts。
- [x] 生成论文内容哈希并冻结；见 `paper_rewriting_output/FIRST_PAPER_FREEZE_2026-08-20.md`。

## 5. 第二篇前仅允许的最小设施修复

按优先级只做四项：规范 final parser；保存轻量失败码；扩展 `forkInputHash`；拒绝 manifest 外结果文件。完成后立即进入最小检测器实验，不建设新框架、bridge、engine 或 schema 家族。
