# SwarmAlpha 项目发展方案：从证据暴露效应到群体状态—响应治理

日期：2026-08-22  
状态：**PRESERVED DECISION HISTORY / ACTIVE RESEARCH STOPPED 2026-09-14**
适用范围：第一篇 AAMAS 2027 候选论文的条件式解冻、第二篇状态—响应研究、后续真值盲认知分配器  

本方案记录项目所有者于 2026-08-22 确认的三项决定：

1. 第一篇曾允许进行一个严格隔离、可失败的最小机制实验；该实验现已完成，第一篇 provider execution 关闭；
2. 第二阶段恢复 **Social Thermodynamics of Deliberation** 作为粗粒化状态与受控响应的研究纲领，但不恢复旧物理公式；
3. 在建立跨任务族、模型、规模和 topology 的 Atlas 前，先隔离 peer exposure、repeated elicitation 与 provider noise，再决定是否增加轮数。

**历史机制路线（已完成）：**在代码审计确认现有 replay 只是 artifact-integrity replay、历史工件不能恢复完整 Round-1 continuation snapshot、且当前 evidence relation 不包含 target option 后，本方案曾允许 `CONTROL / ATTACKS_NEUTRAL / ATTACKS_LABELED`。该实验及敏感性分析已经完成；其 M2 缺少 generic matched re-exposure comparator，因此不再追加第一篇机制实验。

本方案更新项目的**执行顺序**，不改写既有实验事实。它取代
`../archive/plans/SWARMALPHA_INTEGRATED_RESEARCH_EXECUTION_GUIDE_2026-08-14.md`
中已经被新实验结果超越的近期排序，并取代
`../archive/plans/SECOND_PAPER_TRUTH_BLIND_ROUTING_PLAN_2026-08-20.md`
中“立即训练三变量 detector”的默认路径。
旧文档仍保留为历史记录。实现、原始结果和冻结报告仍具有高于本方案的事实权限。

## 收尾覆盖决定（2026-09-14）

所有者已决定停止本轮主动研究，整理文档并保留想法。当前不运行 X0、不扩建引擎、
不自动推进投稿。本文件保留完整历次决定与理论意向；下文所有“下一步”“必须先”及
阶段顺序均为相应日期的历史安排，不构成现在的待办或授权。
最新想法见[研究身份 §13](../research/SWARMALPHA_RESEARCH_IDENTITY_AND_DESIGN_PHILOSOPHY.md#13-2026-09-14-收尾决定与保留想法)，停止点见[项目入口](../ACTIVE_RESEARCH_SURFACE.md)。

## Owner override（2026-09-02；停止前的近程方向）

**OWNER DECISION：**本项目不再把 categorical probability thermometer、reported-
belief geometry、entropy、JSD、离散度或自然稳定/运动本身作为下一阶段终点。它们
保留为已实现观测通道、仪器研究对象和简单 baseline。仅继续让 Agent 输出选择题
概率并增加数学读数，不构成默认研究进展。

当前母对象冻结为**多通道集体决策过程状态描述器**。它要在即时真值不可见时描述：

- belief 与公开 choice 的分离状态；
- 注册证据池中的信息覆盖、重复、exposure 和 source/lineage 依赖；
- 独特已暴露信息被引用、质疑、整合或用于解决冲突的 discussion utilization；
- 参与、回应与 influence，以及信息贡献和权威/表达支配的分离；
- 强弱模型、角色、能力、信息访问和发言权限的异质性；
- missing/invalid、已用成本、剩余预算和可用认知动作。

correctness、proper loss、任务效用、灾难性错误与 cost-adjusted decision quality 只在
交互关闭后由独立 evaluator 读取，永远不进入在线状态。开放世界无法知道全部相关
信息时，只能报告 observed/registered-pool coverage，不得称为 truth coverage。
discussion utilization 不是消息数、轮数或 token 数。influence 没有时间、随机化或
反事实识别时只能称观察关联；混合强弱模型 cohort 不能自动识别纯异质协同效应。

下一步不是立即编码。必须先在现有权威文档中冻结最小 V0 合同，并为每个候选量写明：
在线输入、状态反例、可能改变的动作、证伪测试、独立 outcome 和更简单 baseline。
V0 优先考虑 information coverage、discussion utilization 与
information-bearing influence / authority dominance 的可分离表示，但不预注册一个
未经审核的总分。首个受控研究应比较状态描述器与 confidence/dispersion、随机动作、
always-strong-model 等简单策略，并保持相同调用预算。

本 override 覆盖本文件 §0.2--§0.7、§5.1、§5.4--§5.8 和 §10 中任何把
probability-only dynamics、自然稳定/运动或更多宏观读数列为默认下一步的指令；这些
段落继续作为历史设计与已完成结果解释保留。它不授权 provider 调用、强弱模型实验、
新 schema、复杂图模型、LLM judge、治理策略或新引擎。任何执行须由单独 V0 合同、
零调用反例审计和项目所有者明确授权开始。

详细分批顺序、强弱模型职责、工程冻结门和实验后置条件由
[`COLLECTIVE_DECISION_PROCESS_DESCRIPTOR_ENGINEERING_FIRST_PLAN_V1_2026-09-02.md`](COLLECTIVE_DECISION_PROCESS_DESCRIPTOR_ENGINEERING_FIRST_PLAN_V1_2026-09-02.md)
规定。V0 core 与 Q2 synthetic 资格已经完成。2026-09-08 所有者进一步要求构造可隔离的
真实实验并控制流程和文档膨胀；X0 设计及隔离执行边界已收敛到该计划，不在本文件
复制实验规格。X0 代码、原始 provider 边界、持久 journal 与直接测试已实现并通过无 provider
检查，尚无 provider 或语义有效性结果；下一步只在确定模型/费用/phase 后审核具体的 66-call
canary。此处不再把 E1--E4 列为下一批。

## 0. 2026-08-24 科学收尾与第二阶段增补（历史近程权威；冲突处由 2026-09-02 override 取代）

本增补取代本文件中“第一篇再做机制实验”的近程指令、§4.3--§4.6 的未完成态描述、§5 直接扩张 State--Response Atlas 的起步顺序，以及 §10 的旧立即执行序列。长期母问题、SR-0--SR-5 资格阶梯和第三阶段治理门仍保留。

### 0.1 第一篇正式收尾

**FACT / DECISION：**`CONTROL / ATTACKS_NEUTRAL / ATTACKS_LABELED` 组件实验及其 rate-limit-call sensitivity 已完成；第一篇不再执行任何 provider 实验。论文主张冻结为：

> identical-state fork 在已记录状态上估计实现出来的 post-state exposure bundles 之间的有限任务配对差异；原始固定 arm 顺序下的因果解释以 provider stability 为条件。

论文不得把以下内容升级为结论：

- `ATTACKS` 是跨状态有效的纠错算子；
- M2 识别了 attack selection 相对一般 re-exposure 的增量作用；
- M3 是独立机制证据（逐任务有 `M3=M1+M2`）；
- 两个模型族构成独立因果复制；
- 暴露 bundle 已获得在线治理权限。

组件实验只对 M1 做到 selected-item matching。`CONTROL` 没有 generic、item-count、length 和 salience matched 的 re-exposure bundle，因此 M2 同时包含 selected content、一般新增暴露、prompt 长度、格式和显著性。第一篇以后只允许事实纠错、语言压缩、正式模板迁移、匿名化和可复现包修复，不再用新实验追赶更强故事。

### 0.2 第二阶段科学定位：恢复 Social Thermodynamics，但先隔离 peer-message bundle

第二阶段恢复 **Social Thermodynamics of Deliberation** 作为可证伪的研究纲领，不恢复旧 `R/T/H/F`、`H_E/κ`、hand-built free energy 或 phase labels。它的操作性定义是：

> 检验多智能体讨论产生的微观、prompt-conditioned 显式报告，能否被稳定粗粒化为少量宏观可观测量；受控改变 peer information exposure 后，这些量是否出现超过 repeated elicitation 与 provider noise 的可重复响应。

这里的理论价值不以治理成功为前提。如果一组量只能稳定、可重放地描述群体讨论状态和轨迹，它已经获得 **描述性价值（SR-0/SR-1）**；只有 held-out response prediction 和 policy value 需要更高资格。不得为了最终治理目标否定合格的描述性标量，也不得因为标量可计算就跳过构念资格。

首要对象是一个与讨论过程隔离的 shadow monitoring layer：

```text
public discussion process
        ↓ read-only frozen snapshot
private probability sensor
        ↓ never returned to discussion
reported-belief macrostate X_t
        ↓
offline trajectory and outcome evaluation
```

监测调用的输出不得进入后续 Agent prompt、公共消息、证据选择、停止判断或 arm 分配。它观察讨论，不参与讨论。

### 0.3 LLM 自报与派生量必须分层

下列对象不得混称为“belief”或“confidence”：

1. **categorical probability report**：冻结 prompt 下的显式概率向量；它是 prompt-conditioned sensor，不是 latent belief；
2. **verbal/self-reported confidence**：可选语言自报，单独存储，不当作正确率概率或填补缺失 probability report；
3. **evidence relation self-label**：Agent 对文本给出的 `supports|attacks` 标签；旧 schema 无 `targetOption`，不能称为相对当前选项的正确 polarity；
4. **reported-belief macrostate**：由完整概率报告矩阵确定性派生的群体几何；不是“真实群体信念”；
5. **offline evaluation**：Brier、correctness、wrong consensus 和 harm；只在交互关闭后读取答案键，不进入在线状态。

第一版 monitoring sensor 只请求 strict categorical probabilities，不同时请求 reasoning、evidence、polarity 或 verbal confidence，从而减少测量提示本身改变讨论的风险。

### 0.4 最小状态与讨论响应量

必须保存完整微观报告矩阵

\[
P_t=\{p_{1,t},\ldots,p_{N,t}\}.
\]

当前最小宏观快照为

\[
X_t=(\bar p_t,\overline H_t,JSD_t,roster_t),
\]

其中

\[
\bar p_t=N^{-1}\sum_i p_{i,t},\qquad
\overline H_t=N^{-1}\sum_i H(p_{i,t})/\log K,
\]

\[
JSD_t=H(\bar p_t)/\log K-\overline H_t.
\]

- `pooled maximum mass`、strict consensus、top-choice histogram 从完整 `P_t` 派生，不重复充当独立坐标；
- `JSD` 在代数上由 `pooled entropy` 与 `mean within-agent entropy` 导出，保留它是为了可解释，不把它当额外独立自由度；
- 相邻轮修订量

  \[
  A_t=N^{-1}\sum_i TV(p_{i,t-1},p_{i,t})
  \]

  是 transition variable，不是瞬时状态；
- `maxPairwiseTV` 只作尾部/离群诊断，不作最小状态核心，因为它随 Agent 数和单个极端报告敏感；
- `alignmentR` 若不能证明相对 `P_t`/JSD 的增量解释，降为派生可视化；
- evidence/lineage entropy 只描述声明的信息流分布，不叫“证据正确性”或“独立证据”；option coverage 只有在 target-aware carrier 通过资格后才进入；
- Brier、正确性和 wrong consensus 始终位于 `X_t` 外部。

受控实验后首先允许定义有限差分的 discussion-response coefficient：

\[
\chi_Q^{disc}=E[Q\mid PEER]-E[Q\mid NO\_PEER],
\]

其中 `Q` 可取 `mean report entropy`、`JSD` 或 pooled concentration。完成 exposure-strength sweep 并得到可重复响应曲线前，不称其为 susceptibility；当前也不使用 temperature、free energy、phase transition、attractor 或 metastability。

### 0.5 传感器资格门

先执行已冻结的 probability-only prompt-sensitivity canary。其作用只是在未来实验中资格化独立私有概率传感器，不追认旧 joint message/belief prompt。

首版跨任务边界由三个合同限定，而不是宣称“提示词可测任意任务”：

- **Claim contract：**有限、互斥、穷尽、单一 outcome；stable option ID 与展示 label 分离。开放生成、多标签、排序与连续 outcome 暂不支持；
- **View contract：**绑定 formation/checkpoint/request hashes、完整 roster、public/private information、role constraint、checkpoint 时可见消息和 `supplied_information_only`；禁止 future/outcome/resolver/sensor-output 字段；
- **Sensor instrument contract：**绑定 model/config/prompt exact bytes/parser/language/view schema；任一改变都视为新仪器，不能直接继承资格。

- 冻结 source state、system/user prompt、option order、调用顺序和 hash；
- task 内 counterbalance exact repeat、option reversal 和 paraphrase；
- 监测输出为 private side channel，绝不回流讨论；
- 统计单位和重采样单位是 task，不把 Agent 当独立 task；
- exact-repeat 失败则 `SENSOR-FAIL`；option/paraphrase 失败则固定 canonical prompt 或预先定义 measurement ensemble，不事后挑稳定版本；
- missing sensor observation 保持 missing，不编码为零 revision、零 disagreement 或零 influence。

具体 48-call canary 门限以 `docs/experiments/COLLECTIVE_DYNAMICS_PROMPT_SENSITIVITY_CANARY_V1.md` 的冻结合同为准；结果通过前不得扩张轮数或命名新的物理量。

**EXECUTED / H1 FAIL（2026-08-28）：**48-call canary 已完成。联网有效批次有 47/48 strict-valid；唯一 parser failure 是 decimal `0.999999` 在二进制浮点边界被误拒，但不做 renormalization 的透明敏感性仍显示 exact repeat unique-top agreement 只有 11/12，未达冻结的 12/12 门。失败集中于 task 36 agent 2：同一 view 的四次报告在 uniform tie、two-way tie 与 `(0.7,0.1,0.2)` 间变化。故 H1=`SENSOR_FAIL`，不是 provider invalid，也不能用其余 11 个单元改写为通过。**在该结果当时，按停止规则暂不执行 M1 peer-message bundle screen；**结果见 `docs/experiments/COLLECTIVE_DYNAMICS_PROMPT_SENSITIVITY_CANARY_V1_RESULT_2026-08-28.md`。

**REPAIR IMPLEMENTED / V2 CANONICAL REPEATABILITY PASS（2026-08-28）：**新增 parser V1.1.0，以 bounded binary64 summation allowance 实现原本 inclusive `1e-6` 合同；不改变概率、不 renormalize，V1.0.0 继续用于历史重放。held-out replicate-average V2 使用 task `8/29/50`，每个 task-agent 四个 exact canonical repeats，`A1/A2` 与 `B1/B2` 分别求均值后比较连续概率几何；unique top/tie 退出核心通过门。冻结时发现源 roster 实为 `3/4/3`，因此注册分母是 10 个 view、40 calls，而不是早期误写的 48；该错误在任何 V2 provider 调用前修正，未换任务也未补造 agent。40/40 reports valid，mean/P90 split-half TV 均为 0，三个 task 的 pooled/entropy/JSD block differences 均为 0，预注册 V2 gate=`SENSOR_PASS`。该结果只支持 exact canonical instrument repeatability，不解决 V1 的 cross-prompt sensitivity；plan/freeze/run/analysis hash 与限制见 `docs/experiments/COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_CANARY_V2_RESULT_2026-08-28.md`。**随后在单独授权下完成 M1 one-step screen：152/152 cells valid，但 task-level response 异质，不能把 M0-C PASS 或 M1 有效解析升级为跨 prompt measurement validity；结果见 `docs/experiments/COLLECTIVE_DYNAMICS_PEER_BUNDLE_RESPONSE_RESULTS_2026-08-28.md`。**

### 0.6 首个最小实验：peer-message bundle response screen

实验候选名：`ONE_STEP_PEER_MESSAGE_BUNDLE_SCREEN_GLM_DEV10`。复用当前 truth-free 10-task development roster，只做一个 peer-message exposure step，不增加 R3--R5、topology、ATTACKS 或 intervention。它是讨论研究的前置识别门，不直接声称隔离了“讨论语义”。

从同一个完整、无真值、冻结的 pre-peer state 为每个 task-agent 构造四个私有 sensor calls：

- `NO_PEER_A/B`：byte-identical repeated elicitation，不包含其他 Agent 的 R1 消息；
- `PEER_A/B`：byte-identical repeated elicitation，唯一新增处理为其他 Agent 的冻结 R1 public messages。

A/B 是同条件 exact duplicates，用于描述 provider/repeated-measurement variability。必须验证并记录 prompt-difference invariant：`PEER_prompt = NO_PEER_prompt + canonical(other_agents_R1_block)`；system/user prompt、own-R1、private information、option order、agent/message order、generation parameters 和 snapshot bytes 之外不得有其他差异。四种调用采用冻结的 task-level block-balanced 顺序；保存完整 prompt、raw response、provider/model/request identity、时间、token、hash 和 terminal failure。优先先冻结完整 public trajectory，再离线调用 private sensor，以避免监测调用通过配额或限流间接改变讨论；启用与禁用监测时，public prompt、transcript、assignment 和 randomization hashes 必须完全相同。若旧 artifact 不能完整重建 pre-peer state，就为每个 task 只生成一次新的 R1 carrier 并序列化 snapshot；不得把重新生成的 R1 与旧 continuation 配对。

主 truth-free 诊断不是把两个 TV 距离相减。对每个预先声明的宏观量 Q，使用 A/B 平均后的组间差：

`Delta_hat_t(Q) = 0.5*[Q(PEER_A)+Q(PEER_B)] - 0.5*[Q(NO_PEER_A)+Q(NO_PEER_B)]`。

duplicate gap 单独报告为可靠性诊断。对每个条件 c，定义
`G_t(c) = N^-1 * sum_i TV(p_i(c,A), p_i(c,B))`。
这里的 G 只描述重复测量差异，不从 Delta_hat 中扣除，也不被称为无偏去噪效应。对微观向量同时报告四个条件的 cross-condition 距离和 replicate-split 一致性。

同时报告 task-level Delta_hat(Q)（Q 为 mean normalized report entropy、JSD 或 pooled concentration）、duplicate gaps、pooled-report change、top-choice/strict-consensus changes 和全部逐任务值。Brier 与 wrong-consensus entry 只在所有调用结束后离线计算。

该实验识别的是“增加 peer-message exposure”的操作 bundle，仍包含额外文本量、格式和语义内容；它不单独识别社会说服、信息价值、讨论语义或 token-length mechanism。只有 H2 通过后，才值得加入预先设计的 length/format/salience-matched `SHAM_A/B`；在 sham 之前不得把该 screen 称为 discussion-specific effect。

### 0.7 通过、修订与停止规则

- **H1 SENSOR：**probability-only sensor 在 exact repeat、option permutation 和 wording checks 中通过；canary 只资格化解析与提示敏感性，不把其噪声阈值移植为主实验效应阈值。
- **H2 BUNDLE RESPONSE：**task-equal Delta_hat(Q) 的方向不由单一任务决定，LOTO 不变号，task-bootstrap interval 排除零，duplicate gaps 足够小且 prompt-difference/non-interference invariants 全部通过；此时只允许把 `PEER vs NO_PEER` 延长到固定多轮，研究 persistence、escape 与 relapse。
- **H3 COARSE-GRAINING：**在 held-out task/condition 上，预冻结的低维 X_t 对后续 transition/outcome 的信息超过简单单变量基线；只有 H3 才允许把结果称为有资格的 coarse-graining。
- **REVISE-DESCRIPTIVE：**连续状态量有稳定 peer response，但没有 discussion-induced wrong-consensus entry；研究问题收缩为 peer-conditioned report dynamics，增加 held-out task coverage，不声称 collective-error formation；
- **STOP-FORMATION：**Delta_hat(Q) 不超过其自身 duplicate reliability envelope，或完全由一个 task、missingness、order、prompt-length 或其他 bundle 差异解释；停止增加轮数、topology、物理量和 intervention；
- **SENSOR-FAIL：**exact duplicates 经常改变 unique top、strict consensus 或 TV 超过冻结门；停止单次报告状态表示，先修测量；
- wrong-consensus event 只有在 A/B duplicates 对事件分类一致时才计数；若 PEER 与 NO_PEER 同率进入错误状态，不能归因于讨论。

只有 sensor 和 formation 都过门后，才设计带 `targetOption + supports|attacks|unclear` 的单因素受控扰动；治理仍需 held-out truth-blind detector、正确状态伤害和独立 policy-value 实验。

### 0.8 资产处置

**直接复用：**same-state fork、deep-cloned snapshot、truth firewall；fixed-round previous-round-only visibility；raw prompt/response、manifest、hash、replay、task-level analyzer；`CollectiveEpistemicStateV1` 中审计通过的 probability/entropy/JSD 公式；stable option-ID mapping、raw provider boundary、option-permutation audit、probability-only canary、append-only terminal ledger、explicit reset 和 block-balanced order。

**仅复用思想，不复用旧估计：**legacy per-round timing；cross-examination 作为未来可能的随机文本协议；dropout、topology、asynchrony 作为更晚的独立处理轴。

**停止或丢弃：**global `supports|attacks` corrective operator 和新的 V1 ATTACKS response；旧 scalar belief、`R/T/H/F`、`H_E/κ`、free energy 与 phase labels；code-side 数值移动 belief、confidence pull、graph-edge influence；keyword concession、自动 verdict、“谁影响谁”的启发式因果归因；evidence count/keyword coverage/source diversity 作为 correctness/independence；self-reported confidence 作为 calibrated probability；state-dependent early stopping；SR-3 前的 detector、allocator、RL、复杂 topology 或新 thermodynamic engine。

一句话路线：**恢复 Social Thermodynamics 的“粗粒化状态与受控响应”科学问题，不恢复旧物理命名；先证明监测器能区分 peer-message bundle、repeated elicitation 与 provider variability，再用 matched sham 才讨论 discussion-specific effect，之后才增加轮数、扰动和治理。**

---

## 1. 总目标与成功标准

### 1.1 长期母问题

> 在没有即时真值、来源可能相关、上下文和计算预算有限的条件下，如何从可观测的群体认识状态出发，选择下一项证据暴露、信息获取、工具调用、私人报告、人工复核、弃权或停止动作，使集体决策的独立评价质量与成本权衡得到改善？

项目治理对象是围绕具体 claim 发生的可观测报告、证据、来源、暴露与响应，不是 Agent 的人格分数，也不是不可观测的“真实内心信念”。

### 1.2 项目的最低、强和长期成功

**最低成功：**提交一篇逻辑闭合、数据可重算、边界诚实、作者本人能够逐段解释的第一篇论文。后续路线失败不得破坏这项成果。

**强科学成功：**找到一组在未见任务、模型或交互条件下仍能组织和预测干预响应的低维群体状态变量。

**长期系统成功：**在固定预算和严格 truth firewall 下，状态条件分配器在独立任务上优于 always-act、never-act、随机和简单单变量策略。

“社会热力学”不是第一篇或治理成功的必要条件。一个量若能在冻结测量条件下稳定、可重放地描述讨论状态，就已具有描述性科学价值；只有跨条件预测、响应曲线、尺度规律或治理权限需要更高证据门。

---

## 2. 当前事实基线

### 2.1 已有最强科学事实

第一篇已经记录一个有限但稳定的 implemented-bundle contrast：

- 在每个 task × seed 内，Round 1 只运行一次，后续从相同记录状态分叉；
- `CONTROL`、`SUPPORTS`、`ATTACKS` 改变的是已产生证据的结构化披露策略；
- 选择器在线不读取答案键，最终 pooled belief 在运行结束后用 multiclass Brier 评价；
- DeepSeek 项目内部前瞻指定 seed 0 中，`ATTACKS−SUPPORTS=-0.343`，95% 区间 `[-0.507,-0.193]`；`ATTACKS−CONTROL=-0.308`，区间 `[-0.496,-0.147]`；
- DeepSeek seed 1 保持方向；
- GLM-4.6V 两个双臂 seed 和一个完整三臂 seed 均得到负向 `ATTACKS−CONTROL`，完整三臂还得到负向 `ATTACKS−SUPPORTS`；
- 当前允许结论是两个模型族、一个任务族、若干分别冻结执行中的方向一致性，不是模型无关定律。

因此，近期科学问题已经从“信息动作是否能改变结果”推进到：

1. 当前效果由哪些可操作组成部分产生？
2. 哪些预行动状态决定不同动作的响应？
3. 这些状态—响应关系能否跨任务、模型、规模和拓扑保持？

### 2.2 已有负面资格结果

- 旧四特征 process-state predictor 在 task-heldout 评价中不优于常数基线；
- `H_E/κ V1` 状态投影退化，响应证据不足，不能授权 policy；
- exact evidence reuse 在开发集中的 within-task 相关没有在两-seed确认数据中复制；
- 因此，现有数据不支持直接训练或宣称一个通用 truth-blind failure detector。

这些结果否定的是具体表示和当前样本权限，不是否定群体状态—响应研究本身。

### 2.3 当前工程状态

**已实现并测试：**

- claim、canonical outcomes、显式概率报告、Evidence/lineage/exposure、final private elicitation、proper loss；
- `CollectiveEpistemicStateV1` 描述性宏观态与确定性 replay；
- truth-blind 风险向量、候选信息动作、预算过滤、启发式仲裁与 action lifecycle；
- 同状态 fork、provider adapters、任务级分析、manifest 与多项审计测试。

**尚未经验验证或尚未接线：**

- `CollectiveEpistemicStateV1` 尚未获得 detector 或控制权限；
- active information selector 尚未进入真实 provider policy experiment；
- 第一篇记录的“暴露已有证据”bundle 尚未成为长期 action taxonomy 的正式一等动作；
- 历史 DeepSeek 主批次缺少部分 outbound/raw/provider provenance，当前代码改进不能倒推补齐历史字节证据。

当前判断：设施足以继续做小而严格的实验，但不应建设新框架、总线、schema 家族或物理模拟器。

---

## 3. 统一科学模型

### 3.1 五层对象

```text
微观观测 x_t
  = 报告、概率向量、证据、来源/lineage、暴露、响应、缺失、成本
          ↓ 受测量合同约束的 coarse-graining
宏观状态 z_t = g(x_t)
          ↓
认知动作 a_t
  = 暴露已有证据 / 获取新报告 / 查询工具或来源 / 人工复核 / 弃权 / 停止
          ↓
状态响应 z_{t+1} - z_t 与最终 outcome response
          ↓
真值盲策略 π(a_t | z_t, available actions, budget, authority)
```

延迟真值只在所有在线动作和终局报告结束后进入 evaluator，用于校准 `g`、估计 action response 和比较策略，不得进入当前动作选择。

### 3.2 对外术语

论文和正式技术文档优先使用：

- **Collective Epistemic State**：由指定测量条件下的显式事件投影出的群体状态；
- **State–Response Model**：状态、动作与后续状态/结果响应之间的经验模型；
- **Epistemic Action Allocation**：在预算和权限约束下选择下一项认知动作。

“Social thermodynamics”仅表示以下研究直觉：大量微观认识事件可能存在有用的低维粗粒化状态和可重复的外场响应。它不授权以下措辞：自然定律、自由能最小化、相变、守恒量、真实温度或跨系统不变常数。

### 3.3 宏观状态的资格要求

候选宏观状态不是因为公式优美而成立。每一维必须满足：

1. **时序合法：**只使用动作发生前可见的信息；
2. **测量诚实：**显式报告不冒充 latent belief，missing 不编码为零；
3. **对称性：**尽量对 Agent 重命名保持不变，并对 outcome label 重命名保持不变或可解释等变；
4. **尺度处理：**明确 Agent 数、选项数和文本量变化时的归一化；
5. **扰动稳定：**在冻结的等价 elicitation 或合理缺失扰动下不过度漂移；
6. **增量价值：**在未见条件上胜过 confidence、margin、disagreement 等简单基线；
7. **决策相关：**能够改变并改善动作选择，而不只与 outcome 相关。

在满足第 6 项前，状态只能叫描述性投影；满足第 6 项但未通过策略实验时，只能叫响应预测器；满足第 7 项后才获得治理权限。

---

## 4. 第一阶段：保护并完成第一篇 AAMAS 论文

### 4.1 安全基线

`FIRST_PAPER_CROSS_MODEL_FREEZE_V3_2_2026-08-22.md` 是始终可恢复的科学安全基线。

条件式解冻遵守以下规则：

- 不修改、覆盖或回写任何 V3.2 provider artifact、analysis output 或 freeze manifest；
- 新实验使用新 experiment ref、plan、目录、manifest、analysis spec 和报告；
- 新实验失败不会触发修改旧结果、换 seed 寻找显著性或重新定义对比；
- 所有结果无论方向都保留并披露。若因篇幅或识别力不足不进入主文，应在 supplement、limitations 或单独结果报告中说明，不能把已运行的直接机制检验静默隐藏；
- 第一篇主结论始终是已实现 selector bundle 的有限 treatment effect，不依赖机制实验成功。

### 4.2 零调用 bundle-level 机制审计

执行状态（2026-08-22）：**COMPLETE；冻结闸门 `GO_L1`**。DeepSeek pooled 与
GLM seed 2 的 wrong-state `GAP_AS` 分别为 `+0.5799` 和 `+0.4072`，任务 bootstrap
区间均高于零，LOTO 均不变号。该 verdict 只把 AAMAS 后的 noise-calibrated L1
列为高优先级，不授权现在启动 LOO。完整资格、缺失、full-roster 敏感性与解释边界见
`docs/experiments/V6_POLARITY_BUNDLE_RESPONSE_L0_REPORT_2026-08-22.md`。

在任何新 provider 调用前，先对现有三臂工件做一个严格标为 post-hoc 的只读分析：

```text
V_bundle(ATTACKS)  = Brier_CONTROL - Brier_ATTACKS
V_bundle(SUPPORTS) = Brier_CONTROL - Brier_SUPPORTS
```

按披露前共享的 Round-1 pooled top choice 是否等于 resolution 分层，分别报告：

- 初始 pooled top choice 错误时的 ATTACKS 与 SUPPORTS bundle response；
- 初始 pooled top choice 正确时的两个 bundle response；
- 每个模型/冻结批次的 task-equal 估计、任务 bootstrap 和逐任务值。

术语纪律：

- 该分析测量完整 selector bundle response，不是单消息 trajectory value；
- `wrong` 是 evaluator-side 的离线分层，不具有在线 detector 权限；
- 当前 `supports/attacks` 是 Agent 的 model-self-labeled relation，不等于相对 pooled top choice 的 oracle polarity；
- DeepSeek 和 GLM 分别报告，不做无标记跨模型 grand pool；只有完整三臂批次可同时贡献两个 bundle response。

该审计的作用是判断 message-level LOO 是否值得在第二阶段开发，并为第一篇机制边界提供零成本证据。只有当结果提供当前 trajectory 分析没有表达的新信息，且能替换而非追加正文时，才考虑进入主文；否则只进入 supplement 或项目结果报告。

### 4.3 最小付费机制实验（历史设计；已完成并由 §0 收尾）

#### 研究问题

当前 ATTACKS 效果有两个尚未区分的可操作成分：

1. 把已经出现过的 attack-selected 内容再次结构化呈现；
2. 明确告诉模型这些内容是 `attacks/disconfirming`，形成挑战性关系框架。

实验不声称观测模型内部推理过程，也不使用“纯 salience”或“推理结构已经改变”作为可识别结论。

#### 三臂设计

| Arm | 内容选择 | 关系标签/框架 | 允许解释 |
|---|---|---|---|
| `CONTROL` | 不增加结构化 registry 披露 | 无 | 现有讨论 continuation |
| `ATTACKS_NEUTRAL` | 当前 ATTACKS selector 选出的完全相同 items、顺序、source IDs 和 content hashes | 中性类别，不声明支持或反对 | 结构化重新暴露 bundle |
| `ATTACKS_LABELED` | 与 neutral 臂逐条完全相同 | 保留 attacks/disconfirming 关系标签 | 关系标签/挑战框架增量 |

冻结对比：

- `M1 = Brier_LABELED − Brier_NEUTRAL`：关系标签/挑战框架增量；
- `M2 = Brier_NEUTRAL − Brier_CONTROL`：结构化重新暴露 bundle 的增量；
- `M3 = Brier_LABELED − Brier_CONTROL`：当前完整处理的复核对比。

任务为统计单位；结果按单独冻结执行报告，不与既有模型/seed 计算无标记 grand pool。

#### 结果解释矩阵

| M1 | M2 | 解释上限 |
|---|---|---|
| 负且有信息 | 接近零 | 标签/挑战框架是主要可见增量 |
| 接近零 | 负且有信息 | 结构化重新暴露更能解释效果 |
| 负且有信息 | 负且有信息 | 两个可操作组成部分都贡献 |
| 均不明确 | 任意 | 当前实验不能进一步分解机制 |
| 正向伤害 | 任意 | 对应组成部分存在反作用，必须报告 |

上述解释均不升级为“内部推理已经重组”。

**2026-08-24 识别边界：**M1 只比较 selected-item-matched neutral/labeled frame；M2 的 CONTROL 没有 generic、item-count、length 或 salience matched re-exposure，故上表关于“结构化重新暴露贡献”的旧解释上限过强。M2 现在只称 operational bundle contrast；M3 逐任务等于 M1+M2，不是独立机制证据。

### 4.4 新运行的最低设施门

本实验只修复会直接影响因果解释的最小项目：

1. online task view 在类型和实际对象上不包含 answer/resolution；
2. Round-1 canonical snapshot 在各 arm continuation 前独立 deserialize/deep-freeze；
3. 保存实际 outbound prompt、raw response、parsed result、provider/model identity、request ID（若 provider 提供）和 terminal failure code；
4. full fork-input commitment 覆盖任务无真值视图、roster、私有信息、完整 transcript、evidence relation/source mapping、prompt/schema/parser/config refs；
5. manifest verifier 拒绝结果目录中未登记的科学文件；
6. neutral 与 labeled 臂逐条 evidence identity 必须由机器断言完全一致；
7. 并发、arm order 和 provider 时间漂移风险必须使用冻结随机/平衡顺序或区块化顺序控制。

不得借本实验重写通用 runner、建立新事件总线、拆仓库或开发 detector。

### 4.5 第一篇纳入门

机制结果进入主文必须同时满足：

- 设施门和 canary 全部通过；
- 正式实验按冻结规则完成，无选择性补跑或换 seed；
- 结果对至少一个组成部分提供实质信息：区间支持方向，或足够窄以排除具有实际意义的大效果；
- 解释不超过实验对比；
- 新内容通过 claim audit、独立复算和红队审计；
- 在 AAMAS 八页内通过“替换而非追加”进入正文，优先替换部分 post-hoc trajectory 叙事；
- V3.2 安全基线仍能从 manifest 独立恢复。

未满足时，主文保留当前机制未知边界；结果进入 supplement 或独立报告。

### 4.6 AAMAS 2027 格式门（官方 2027 CFP 未核实）

截至 2026-08-24，项目未从 IFAAMAS/AAMAS 官方入口核实到已发布的 AAMAS 2027 CFP、正式日期、page limit 或 author kit。此前写入的 2026-09-17、10-01、10-08 日期与“官方八页”断言撤回，不作为执行权限。AAMAS 2026 规则只可作为 provisional predecessor；正式投稿前必须重新核实并迁移官方 2027 kit。

| 日期 | 必须完成 |
|---|---|
| 08-23 | 零调用 bundle-level 分层审计规格冻结并执行 |
| 08-24 | neutral/labeled 机制 estimand、arm 文本、分析和停止规则冻结 |
| 08-27 | 零网络测试、独立审计和单任务 canary 完成 |
| 09-03 | 正式运行结束；若未结束，停止扩张并保护 V3.2 |
| 09-07 | 分析、复算、结果解释和主文纳入决定完成 |
| 09-12 | 第一篇科学内容最终冻结 |
| 官方 CFP 发布后 48 小时内 | 核实 track、日期、page limit、AI policy、artifact 和双盲要求 |
| 官方 kit 获取后 | 在 clean directory 正式 LaTeX 编译并重新检查页数、引用和匿名性 |
| 官方截止前至少 7 天 | 冻结 submission PDF、匿名 supplement、authors/account 与 disclosure |

如果机制实验威胁 09-12 科学冻结，默认放弃其主文纳入，不牺牲第一篇。

### 4.7 “教授可审查、作者可读懂”质量门

第一篇最终冻结前，作者应能不用仓库辅助，清楚回答：

1. 每个 Agent 在每一轮看到了什么？
2. 三个原始 arm 唯一被设计改变的处理是什么，哪些数量没有严格匹配？
3. 为什么同状态 fork 支持当前有限因果对比？
4. 为什么答案键没有进入在线 selector？
5. Brier 是如何从 final private reports 计算的？
6. DeepSeek seed 0、seed 1 与三个 GLM 执行分别具有何种证据身份？
7. 结果证明了什么，没有证明什么？
8. 新机制三臂若进入论文，它分别识别了什么？

论文交付包必须包含：一页协议图、claim–evidence 表、关键数字独立复算、逐任务补充表、局限性表和从冻结数据重建图表的命令。工程哈希不替代方法解释。

---

## 5. 第二阶段：Social Thermodynamics of Deliberation / Collective Epistemic Dynamics

### 5.1 第二篇主问题

> peer discussion 相对 repeated elicitation 与 provider noise 是否产生可重复、可粗粒化的 reported-belief state response；若存在，该状态是否进一步组织错误共识的形成、持续和脱离？

第二篇首先按 §0 隔离讨论、资格化 sensor 和 state representation；只有一阶 peer response 过门后才进入多轮 formation、response generalization 和 Atlas，不直接承诺在线 allocator 优于基线。

### 5.2 为什么不能只继续使用当前 HiddenBench 任务

现有数据适合证明一种有限选择任务上的处理效应，但不适合单独训练“通用”状态监测器：

- 独立 task clusters 数量有限；
- 任务共享分布式信息、固定选项和相近交互结构；
- 任务数量不足以支撑高自由度文本 detector；
- 多 seed 增加状态实现，不增加同等数量的任务族独立性。

因此第二阶段需要建立一个小而受控的多任务族研究面，而不是在同一 45 个任务上增加模型复杂度。

### 5.3 最小任务与条件矩阵

推荐同时保留两类数据：

1. **自然/现有 benchmark 任务：**保留现实语言复杂性；
2. **可控生成任务：**允许独立操纵来源重复、证据冲突、少数派信息、Agent 数、选项数和拓扑。

首轮只选择三种具有独立 resolution 的任务族：

- 分布式证据有限选项决策；
- 故障/因果诊断或约束满足式选择；
- 代码、配置或安全审查中可由测试/规则独立解析的 claim。

跨条件轴保持最小但有辨识力：

- 至少两个模型族；
- Agent 数 `N` 至少两个水平；
- outcome 数 `K` 至少两个水平；
- 至少两种信息拓扑或暴露结构；
- 已有证据重新暴露与获取新信息至少各一个动作。

完整矩阵不一次跑满。先用功效与支持域模拟选择能区分候选表示的最小单元。

### 5.4 候选状态族

状态保持模块化，不预先规定一个总分：

- **belief geometry：**pooled uncertainty/margin、between-agent divergence、minority mass；
- **information structure：**evidence coverage、重复/近重复、declared lineage coverage、支持/反对结构、来源缺失；
- **exposure structure：**谁看过什么、信息分配不均和已发生的 response mass；
- **measurement stability：**冻结等价 prompt 条件下的报告敏感度和缺失；
- **resource state：**已消费资源、剩余预算、候选动作、权限和后果等级。

文本 embedding、复杂图模型或 LLM judge 只有在简单 identity/hash/coverage 特征不能解释响应、且有足够独立任务时才进入。

### 5.5 状态—响应资格阶梯

| 等级 | 要求 | 允许声称 |
|---|---|---|
| SR-0 描述 | 定义清楚、可重放、缺失诚实 | 描述群体状态 |
| SR-1 测量稳定 | prompt/缺失/重命名/尺度压力测试通过 | 在冻结条件下具有稳定读数 |
| SR-2 结果预测 | 在 task-family-heldout 上胜过简单基线 | 对结果风险有增量预测 |
| SR-3 动作响应 | 在独立随机动作数据上预测 treatment response | 状态组织动作响应 |
| SR-4 策略价值 | 冻结策略在独立任务上改善 loss/cost | 获得有限治理权限 |
| SR-5 尺度规律 | 跨 N、K、拓扑、模型复现函数关系 | 讨论 thermodynamic-style scaling |

未达到 SR-5，不讨论相变、势函数或通用状态方程。

### 5.6 可选子实验：单 evidence 条件边际响应

单 evidence leave-one-out 只在零调用 bundle 审计显示值得继续、且 AAMAS 第一篇提交完成后进入。其对象不是 message 的固有价值，而是特定状态与披露集合中的条件边际响应：

\[
TV_B(e \mid S,D)
=
Brier(D \setminus \{e\})-Brier(D),
\]

其中 `S` 是同一个完整 Round-1 snapshot，`D` 是冻结的披露 bundle，`e` 是一个按 `relation + contentHash` 识别、并聚合所有 `sourceAgentIds` 的去重 disclosed evidence item。

#### 必须遵守的语义边界

- `TV_B` 依赖状态、其余 bundle、prompt、模型和 continuation 规则，不是可永久存储的 message quality；
- ATTACKS/SUPPORTS 是 model-self-labeled relation，不声称相对 pooled top choice 的纯 polarity；
- relation 没有 target option，因此当前不能定义 `proposal_correctness`；
- `source_agent_top_choice_correct` 可以作为离线协变量，但必须明确它不是 evidence correctness；
- 删除 item 会同时改变可见内容、prompt 长度和后续 token position，因此 estimand 是 item availability/removal bundle，而不是纯语义效应；
- 多个 item 可能互补或冗余，LOO 不是 Shapley value，也不识别高阶组合价值。

#### 执行分级

| Level | 设计 | 权限 |
|---|---|---|
| L0 | 现有 artifact 的完整 ATTACKS/SUPPORTS bundle 分层审计 | 当前立即允许；零 provider |
| L1 | development-only；每 task 按冻结 hash 规则各取一个 ATTACKS 和 SUPPORTS item，运行同批 full/LOO，并重复完全相同输入估计 provider replay noise | AAMAS 后、单独合同通过后允许 |
| L2 | 所有 eligible item 的 full/LOO 与重复 replay | L1 显示可重复信号且功效/预算门通过后才允许 |

历史 DeepSeek/GLM 行不能直接作为生成式 LOO snapshot：`round1StateHash` 是摘要，`forkInputHashV1` 是不可逆承诺，现有 replay 只验证 artifact hashes。L1/L2 必须新运行 Round 1 一次，序列化无真值完整 snapshot，再从该 snapshot 分支；不得重新生成 Round 1 冒充 identical state，也不得用历史 full arm 与新 LOO arm直接配对。

统计上 messages/items 嵌套在 task 中，不能当独立样本扩大 `N`。先在 task 内汇总 relation-specific marginal response，再以 task 为重采样单位。缺失 continuation 必须保留并按冻结政策处理。

### 5.7 延后轴：cohort composition 与 heterogeneity

未来可在每个 cohort 内运行 `ATTACKS vs CONTROL` identical-state fork，再比较 cohort-level intervention effect。不同 cohort 的 Round-1 状态不相同，禁止声称跨 cohort identical state。

`DDD / QQQ / GGG / DQG` 同时改变模型身份、平均能力、校准、provider 行为和异质性，因此未经额外匹配时只能识别：

> cohort-composition moderation of the ATTACKS effect

不能识别纯 heterogeneity effect。该轴只有在第二阶段已有多个任务族和稳定 state-response 表示后才进入；第一篇不实现、不预留正文主张。

### 5.8 第二篇的通过与停止条件

**GO：**低维状态在至少一个 task-family-heldout 和一个跨模型/规模条件中，对 action response 提供超过 confidence、disagreement、任务表面特征和常数模型的稳定增量。

**REVISE：**只在明确支持域内成立，则收缩理论域和论文标题，不继续声称通用。

**STOP：**复杂状态不优于简单基线，或增量只来自 task identity、文本长度、Agent 数等捷径。此时发表边界/负结果或停止该表示，不升级为深度模型、RL 或更多公式。

### 5.9 第二篇允许结论上限

> 在测试的任务族、模型、规模和交互条件下，一组预行动可观测的群体状态变量对随机认知动作的结果响应具有 held-out 增量预测价值。

不得直接声称已发现通用社会定律、可读取真实群体信念或已经完成最优治理。

---

## 6. 第三阶段：真值盲认知动作分配器

### 6.1 进入条件

只有第二阶段至少达到 SR-3，才进入策略开发。没有可复现 treatment heterogeneity 时，always-ATTACKS 可能比任何复杂 router 更合理。

### 6.2 最小动作空间

第一版只允许一次动作：

- `SURFACE_EXISTING_EVIDENCE`：分配已有证据的公共注意力；
- `ACQUIRE_PRIVATE_REPORT`：从尚未暴露的资源取得新报告；
- `QUERY_EXTERNAL_SOURCE_OR_TOOL`：取得真正的新观察；
- `ESCALATE_OR_ABSTAIN`；
- `STOP/CONTROL`。

不同时引入多步规划、动态 reputation、强化学习和长期组织制度。

### 6.3 必须比较的策略

- never act / CONTROL；
- always use the best fixed action；
- matched-rate random；
- confidence-only；
- disagreement-only；
- task-feature-only/static router；
- state-response allocator；
- outcome-aware oracle 只作为不可达上界。

所有比较必须在同等预算、调用数、信息权限和 terminal missingness 规则下完成。

### 6.4 主结果

主结果是任务等权的 operational proper loss 加预冻结成本，不是 detector AUROC。共同报告：

- catastrophic failure recall；
- 非灾难任务的不必要干预率；
- worst-quantile loss；
- model calls、tokens、latency、human/tool actions；
- relative-to-oracle regret；
- abstention/escalation coverage。

分配器只有在独立任务上优于最佳简单策略后，才获得有限在线治理权限。

---

## 7. 最小架构演进

### 7.1 不重写现有地基

保留并复用：

- `BeliefReport`、EvidenceGraph、lineage、Exposure、final outcome 与 replay；
- `CollectiveEpistemicStateV1` 的描述性边界；
- active information risk/candidate/decision/action lifecycle；
- V6 fork 的同状态实验能力。

第一篇 runner 在最终冻结后保持只读。后续实验使用版本化 runner，不在历史 runner 上不断堆分支。

### 7.2 只补两条科学桥

1. **Attention-allocation action：**把“重新暴露/重排已有证据”正式表示为 action，与“获取新信息”分开；
2. **Action-response record：**最小记录 `preStateRef + actionRef + postStateRef + offline outcome + cost + assignment`，用于第二阶段分析。

不建立统一大而全 engine。只有两条桥在实际实验中被复用两次以上，才考虑抽象公共接口。

### 7.3 仓库与证据卫生

- 当前未提交和未跟踪的第一篇/GLM/审计产物应先形成一个由项目所有者确认的不可变快照；
- 新计划、正式输出、分析和论文源各自内容寻址；
- `docs/ACTIVE_RESEARCH_SURFACE.md` 最终应指向本方案作为近期执行权威；
- 旧 detector、旧社会热力学公式和 legacy runtime 保持历史只读；
- 每次论文冻结必须列出源文件、数据、分析器、图表和二进制新鲜度，不以“文件存在”代替可追溯构建。

---

## 8. 风险登记与应对

| 风险 | 对项目的真实影响 | 应对 |
|---|---|---|
| 第一篇因追加实验而失去清晰主线 | 高 | V3.2 永久安全基线；新结果只能替换正文，不无限追加 |
| 机制实验成为新的 prompt confound | 高 | 相同 evidence identity；只改变冻结标签字段；记录长度和 token 差异 |
| 运行后只报告有利结果 | 高 | 全结果留痕；不进主文也必须在 supplement/结果报告说明 |
| 把 integrity replay 误当生成式 replay | 高 | LOO 使用新序列化完整 snapshot；历史 hash 只作承诺和验证 |
| 把 self-labeled relation 误当 pooled-state polarity | 高 | 正式术语固定为 model-self-labeled relation；无 target option 不定义 proposal correctness |
| 单次 LOO 差异被 provider 噪声制造 | 高 | L1 先重复完全相同输入测 replay noise；未过门不进入全量 L2 |
| 社会热力学公式任意 | 高 | 先通过对称性、稳定性、held-out 和 response gate，再命名理论量 |
| HiddenBench 过拟合 | 高 | 第二阶段增加受控任务族，task-family-heldout，不把多 seed 当新任务 |
| provider 漂移 | 中高 | concurrent/block-balanced arms、记录执行时间和服务端身份、分别报告 batch |
| 历史 provenance 不完整 | 中 | 限定历史主张；新运行采用 hardened provenance，不伪造历史补全 |
| 工程复杂度替代科研 | 高 | 每个新模块必须对应一个待识别对比；没有实验消费者则不实现 |
| 过早做学习型 router | 高 | SR-3 前禁止；先比较固定规则和简单基线 |
| “通用”主张超出有限选项任务 | 高 | claim-relative 支持域；开放任务须先分解为可解析 claim 或另建评价合同 |

---

## 9. 论文序列与贡献隔离

### Paper 1：Post-State Evidence Re-Exposure under Identical-State Forks

- 核心：同记录状态分叉下，实现出来的 exposure bundles 产生有限配对 proper-loss 差异；
- 强化：跨模型方向再现；selected-item-matched label-frame probe 排除稳定 label-frame 增量，但不识别 generic re-exposure mechanism；
- 不认领：通用 detector、adaptive routing、社会热力学定律。

### Paper 2：Social Thermodynamics of Deliberation—Collective Epistemic Dynamics

- 核心：先通过 sensor、peer-message-bundle response 和 matched-sham 门，再研究低维 reported-belief macrostate、formation/persistence/escape 与受控响应；discussion-specific 解释只有在 matched sham 通过后才开放；
- 最低贡献门：H1 sensor stability；H2 超过 duplicate variability 的 bundle response；H3 held-out coarse-graining 增量。H1/H2 失败即停止动力学扩张，H3 未通过则只能报告描述性投影；
- 不认领：尚未通过策略实验的治理最优性。

### Paper 3：Truth-Blind Epistemic Action Allocation

- 核心：固定预算下一次认知动作的选择；
- 贡献门：独立任务上的 policy value；
- 后续才考虑：多步决策、在线学习、动态 reputation、人类制度层。

如果 Paper 2 失败，Paper 1 不受影响；如果 Paper 3 失败，Paper 2 的状态—响应边界仍可独立成立。

---

## 10. 历史立即执行顺序（已由 2026-09-02 latest owner override 取代）

1. 完成第一篇 V7 科学收尾、交叉引用、QA、hash manifest 与匿名 clean-package 规格；不再调用 provider；
2. 从官方入口持续核实 AAMAS 2027 CFP/kit；在发布前只保留 provisional preview，不伪称正式编译提交物；
3. 修正并执行 probability-only prompt-sensitivity canary，先决定 sensor 是否可用；
4. 若 sensor 过门，冻结并审计 `NO_PEER_A/B` 与 `PEER_A/B` one-step peer-message-bundle 合同；
5. 只复用现有 fork/formation/replay 路径，运行最小 development experiment，比较 discussion response 与 duplicate noise；
6. 依据 §0.7 作 GO/REVISE/STOP，不因为缺少 wrong-consensus formation 就掩盖稳定的描述性结果，也不因平均变化好看而扩张理论；
7. 只有 GO-MULTIROUND 后才增加固定轮数；之后依次是 target-aware perturbation、held-out response、最后才是 governance。
