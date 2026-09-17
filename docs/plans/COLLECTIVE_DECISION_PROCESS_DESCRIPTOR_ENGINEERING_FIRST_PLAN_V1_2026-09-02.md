# 多通道集体决策过程状态：当前实验与执行合同

更新：2026-09-14。状态：**STOPPED / X0 CONTRACT PRESERVED / NO PROVIDER EXECUTION**。

2026-09-14 所有者决定收尾并保留想法。本合同保留停止时的设计与实现边界，
不再是活动队列；下文流程仅在另行决定恢复且仍采用本合同时适用。
本文件保留原路径，取代旧版 E0–E7 / X0–X4 派发模板；V0 字段合同、Q0/Q2 判定和历史结果不变。
2026-09-08 所有者要求构造可隔离的真实实验、控制研究流程和文档膨胀，并只处理高难部分；
本轮据此完成识别设计、隔离执行代码、两条原始响应调用边界、持久 journal 和流程收敛。模型、费用
和 provider phase 尚未确定，未启动调用。

## 0. 当前唯一问题与状态

**问题：在同一证据协作协议下，要求 Agent 额外标注“引用／整合／回应”，是否改变讨论行为；
这些结构化标注与独立审查的实际证据使用是否一致？**

这对应两个不同判断：标签能否作为有限观察量，以及生成标签的协议是否具有反应性。
标签会改变行为时，仍可研究“该协议下的集体状态”；不得把它包装成不干扰自然讨论的仪器。
不以高 utilization、低熵或高共识作为成功，不在本实验中选择治理动作。

| 状态 | 当前事实与边界 |
|---|---|
| V0 | 单模块 projector/validator 已实现；字段语义仍由 [V0 合同](../architecture/COLLECTIVE_DECISION_PROCESS_STATE_V0.md) 决定 |
| Q2 | [Q0 合同 §8](COLLECTIVE_DECISION_PROCESS_STATE_Q0_QUALIFICATION_CONTRACT_V1_2026-09-07.md) 仅支持 15 组人工结构差异被保留 |
| E5/E6 决定 | 现有 natural-dynamics producer 只有 choice/message；没有本实验需要的完整 packet delivery 与结构化 act。拒绝逆向猜测；不新建旧 artifact adapter，E6 跳过 |
| 旧 EG-0 | 不追认未找到的完整历史裁决。现有验证记录保留；本轮按 §8 验证受影响路径，不以重复全仓检查代替隔离证明 |
| X0 | §8 的 X0 core/execution/test 及必要的共享 raw-boundary 收紧已实现并通过无 provider 的直接检查；尚无 provider、标注实测、独立盲审或协议效应结果 |
| 停止点 | 不执行 canary；恢复须另行决定。若沿用本合同，仍需明确模型/费用/phase 并从 66-call canary 开始 |
| 暂缓 | 新核心指标、来源独立性、权威因果效应、强弱协同、治理策略、额外任务族、通用框架 |

上位约束：[研究身份 §0.4/§11](../research/SWARMALPHA_RESEARCH_IDENTITY_AND_DESIGN_PHILOSOPHY.md)、
[推理协议](../REASONING_PROTOCOL.md)、[当前入口](../ACTIVE_RESEARCH_SURFACE.md)。
只有实际结果能改变实验结论，设计审查和 mock 均不能。

## 1. 复用裁决与材料

已检查官方 [HiddenBench 仓库](https://github.com/Yassellee/HiddenBench_ICML)、
[Hugging Face 数据集](https://huggingface.co/datasets/YuxuanLi1225/HiddenBench)、
[原论文](https://arxiv.org/abs/2505.11556) 和
[AutoGenBench](https://github.com/microsoft/autogen/blob/main/python/packages/agbench/README.md)。

- HiddenBench 适合分布式信息任务，MIT；本仓库已有 pinned JSON 和 loader，继续使用
  hiddenBenchTaskAdapter.ts 的 loadCanonicalHiddenBenchTasksV1 与 3be6ca16 数据。
  官方 GitHub 当前规模小；未做完整安全史审计，不把“没看到告警”写成安全。只复用已落地数据，
  不安装或执行上游代码。现成 hidden/full-profile 实验没有本文的标注处理，不能直接替代设计。
- AutoGenBench 提供干净启动条件，但以 Python/Docker 和 AutoGen 场景为主；代码 MIT，
  文档 CC BY 4.0，AutoGen 官方已声明维护模式。迁移不能自动解决标注反应性、信息权限和盲审，
  还会增加运行时与依赖。本轮不引入，不宣称其安全史已获资格。
- 现有 TS 单次调用接口、sensor prompt/parser、V0 足够。新增内容限于这一个实验的编排与分析，
  不创建可复用 helper、插件、图引擎或新生产依赖。

固定材料为 source task **4、6**；在线别名分别为 x0-a、x0-b。
task 4 有 3 条 shared packet、3 条 private packet、4 个选项；
task 6 有 4 条 shared packet、3 条 private packet、4 个选项。
沿用原任务正文及证据全文，不按答案或已有模型表现选取句子。它们是既有开发材料，不能称 held-out。
使用它们是为了审查标注协议，不预设任何单个 private packet 不足以解题；本实验不证明任务
必须协作才能解决，也不以这两个材料承担后续“缺信息／未利用”机制的资格。

**注册单元是一条原始 shared_information/hidden_information 数组元素，即 packet，不是原子事实。**
packet 内可能有多个命题；coverage 不代表已知命题比例，更不是掌握全部信息。
每个 task 按 shared 后 private 的原始次序编号 u01...；编号不包含答案、重要性或处理条件。
原始 packet 不拆分、不拼接、不按“关键证据”重命名。公共描述和选项清单不计入该 denominator。

全部 packet 来自同一 pinned dataset；sourceRef 相同，lineage 为同一 ingestion 身份。
只对全文完全相同的 packet 登记 deterministic duplicate group，其他完整记录为 null；
不估计语义重复或统计相关性。本实验不给 source-dependence 通道构念资格。
答案仅用于交互关闭后的 benchmark keyed outcome；不声称这是现实事故责任或招聘质量的真值。

## 2. 唯一处理、实验单位与预算

| 条件 | 每次讨论调用输出 | 双方共同条件 |
|---|---|---|
| P0 | message, shareUnitIds | 相同任务、个人 packet、可见历史、共享文档板、轮数、调用与输出上限 |
| P1 | 同上，加 actKind, evidenceUnitIds, respondsToActIds | 标签仅进入观察侧；不进入下一次公开或私有决策上下文 |

处理是**要求生成结构化标注的完整协议增量**，包含额外指令、生成负担和可能的行为改变。
不把结果进一步归因为某一个字段、纯格式、额外 token 或“认知能力”。P0 同样有显式 packet
共享操作，因此比较对象不是无限制自然聊天；没有标注对照就无法回答本问题。

一个 block = 一个 task × 一种 private-packet 分配 × 一种历史显示顺序。
每 block 开两个无共享可变状态的 session，分别接受 P0/P1；共同前状态是讨论前的全部可见输入，
不包含任何预先生成的回答，不要求两条随机输出轨迹后来保持相同。
不按 action 后 confidence、答对与否或是否出现目标状态筛选 block。

- 3 个同模型 Agent，角色和决策权完全相同；每人 1 个 private packet，shared packet 对三人可见。
- private 分配使用 [0,1,2] 的全部 6 个排列；历史显示采用 Agent ID 正序／逆序，交叉成 12 blocks/task。
  Agent 固定为 a1/a2/a3，agentIndex=0/1/2；permutation[i] 表示交给 Agent i 的原始 private 下标。
  历史首先按轮次正序，仅在同一轮内应用所分配的作者显示顺序，不把过去和未来颠倒。
- 2 tasks × 12 blocks = **24 paired blocks / 48 sessions**。选项 ID 按原始次序固定；
  不伪称仅旋转附加选项表就平衡了原题正文中的选项顺序。
- 每 session：2 轮 × 3 次讨论，随后 3 次同时提交的最终 choice；共 9 次交互调用。
- 私有 primary sensor：共同初态每 block 3 次；每 session 在 R1 结束及最终 choice 全部关闭后各 3 次。
  总交互 **432**，sensor **360**，完整计划上限 **792 calls**。
- 预先指定 canary 为两个 task 的 [0,1,2] + 正序 block：4 sessions，
  **36 交互 + 30 sensor = 66 calls**，包含在 792 内，不是额外追加；只作工程小试，不进入主效应检验。
- 剩余 22 blocks 使用单独 remainder phase：396 交互 + 330 sensor = 726 calls；
  与 canary 的 cell ID 不重叠，不用重跑整批来“接着跑”。
- 冻结上限：讨论 maxTokens=1024，最终 choice=64，sensor=256；
  两协议同类调用上限相同。全计划 completion 上限 396288，canary 33024；
  prompt token、实际计费与缓存分别记录，不称等调用数为等费用或等 FLOPs。
- provider 模型及版本、region、temperature、seed 支持、价格证据与日期、货币上限、quota
  snapshot、时段和 phase 授权须在实现审查后一次确定。上述 call/token 数是设计边界，不是
  付费授权。代码拒绝未绑定的模型和隐式路由，却不能自行证明价格、quota 或授权已经存在；
  这些记录缺失时不得启动 provider phase。

冻结分配种子 20260908。按 task 别名、排列的字典序、正序后逆序给 block 编号 b=0..23；
每 slot 的调用 seed 在处理分配前固定为 1000000+1000*b+100*slot+10*phase+agentIndex，
phase=1/2/3 为两轮讨论/最终 choice，4/5 为 R1/final sensor；初态 sensor 使用
2000000+10*b+agentIndex。它们是无语义路由元数据，不进入模型文字。每 block 的 slot 0/1
先确定请求 seed 和执行槽位，再用现有
fingerprintEstimatorValue({ seed, taskAlias, permutation, displayOrder, slot }) 排序，
将 P0 分配给较小 signature 的 slot，P1 给另一 slot；出现相同 signature 则停止。
这只是预先确定的伪随机分配，不是假设 provider 的同 seed 等于同噪声。
每轮调用在同一 block 的两个 slot 间交错，Agent 调用顺序固定；一轮内双方都只读取上一轮
已提交的历史，当前轮先返回者没有信息优势。不得先跑完所有 P0，再跑所有 P1。
实际 seed 如不受 provider 支持，记录 unsupported；不得伪称独立性或可控随机流。

canary 只检查执行与观测支持域；不据其 outcome 决定删题、选模型或修改标签语义。
若代码/提示/材料/口径改变，原 canary 保留为旧设计数据，不能并入新设计。
只有 66 个预定 cell 均已核算、30 个 primary 均有效、P1 的 12 个讨论 annotation 均可构造
合法前缀、公开部分与最终 choice 均有效，且无权限/前缀污染，才通过 canary 的工程使用门；
任一失败都保留整批结果并停止扩跑，不选择性重问。该门不使用答案或盲审效果，不能授予
语义有效性。设计不变且通过时，可另行批准剩余 22 blocks。
扩跑门依赖实际响应，故 canary 结果单列，**不能因通过小试而把它并入后续随机化效应检验**。
每 task 的主分析只使用剩余固定 11 blocks；它们不是完整 6×2 析因表，不外推为原来 12 blocks
或任务总体的平均效应。两个 phase 的时段与配额分开记录，不能假装全研究期间不存在资源共享。

## 3. 讨论协议与原始信息权限

所有调用使用新请求；只发送本 session 本 Agent 的 allowlist 视图，无共享 memory/thread、
检索、工具、外部文件、其他 session 输出或隐藏 scratchpad。原题收益／时长描述只是材料背景；
在两协议相同位置附加说明：本实验固定两轮、没有额外工具、材料中的奖励不触发实际支付。

共同 system 指令：

> You are one of three equal participants in an evidence-sharing discussion.
> Use only your supplied documents and visible discussion. Make one concise substantive contribution
> in at most 160 word-or-character units. Each Han, Hiragana, Katakana, Hangul, Thai, Lao,
> Khmer, or Myanmar character counts as one unit. You may share at most one document currently
> available to you.
> Sharing is optional. Return the requested JSON only.

共同 user 模板的顺序固定：
TASK_CONTEXT → OPTIONS → YOUR_AVAILABLE_DOCUMENTS → VISIBLE_MESSAGES → RESPONSE_FORMAT。
可见文档只包括 shared、自己的 private，以及已在上一轮 barrier 送达的原始共享 packet。
可见消息包括先前各轮，保留消息 ID/作者/轮次和 authored message；不暴露实验名称、P0/P1、
dataset/source task ID、gold/rationale、其他人的未共享 private、descriptor 或 sensor 输出。

P0 的 response format：

> Return exactly {"message": "<your contribution>", "shareUnitIds": []}.
> shareUnitIds may contain zero or one available document ID. No other fields.

P1 在相同位置替换为：

> Return exactly {"message": "<your contribution>", "shareUnitIds": [],
> "actKind": "introduce", "evidenceUnitIds": [], "respondsToActIds": []}.
> actKind must be introduce, cite, challenge, integrate, or conflict_addressed, describing the
> primary function of this contribution. evidenceUnitIds lists only available documents actually
> used in your message. respondsToActIds lists only visible earlier message IDs actually addressed.
> Empty reference arrays are allowed. Do not add content merely to fill these fields.
> shareUnitIds may contain zero or one available document ID. Do not output any other fields.

不增加“逐项使用全部信息”“务必挑战别人”或示例答案。一个有效 P1 消息只对应一个主 act；
其 actId 由架构分配，等于消息 ID。该单主 act 限制是本实验协议的支持域，不是语言行为理论。
actKind 仍是协议声明的类别；本实验不授予五种操作各自的语义资格，更不将 conflict_addressed
解释为冲突已经被解决。消息 ID 为 r{round}-{agentId}，只在本 session 内解析，不带条件或 slot。
R1 的 response refs 必须为空；R2 仅允许同 session R1 的有效 act ID。
初始阶段和两轮讨论不采集结构化 public choice；最终只采集一次，避免在 V0 单 Agent
单 choice 前缀约束下偷用“挑最后一条”的未冻结规则。

shareUnitIds 是两组共有的真实文档共享操作。barrier 后架构把选择的原始 packet 全文加入
收件人的文档板，下一轮提供；evidenceUnitIds 单独出现绝不自动发文档。
自由文本可能转述事实，但转述不是原始 packet 的完整交付，不能据此补造 exposure；
收件人对该转述的理解另由盲审描述。R2 的共享也在最终 choice 之前送达。
因此 registered-pool coverage 严格指注册原始 packet 的交付。初始全组 union 已经覆盖全部
packet，整体 coverage = 1 是预期边界；分析必须保留 per-agent access，不将它解释为协作成功。

最终 choice 指令两组完全相同：

> Based on your available documents and the complete visible discussion, choose the single option
> you would submit. Return exactly {"choiceId": "<one canonical option ID>"}. No explanation.

三个 choice 请求读取同一阶段的冻结信息，各自没有另外两人的最终 choice；全部返回后
同步公开并关闭交互。最终 sensor 的视图包含这次已公开的 choice，因而其 belief 是该明确
checkpoint 下的操作性信念，不能冒充 final-choice 前信念。没有 chair、二次投票、额外强模型、
平票后重问或按 confidence 选人。

## 4. 测量隔离与 V0 映射

**每个 phase 的所有公开交互先结束，再运行该 phase 全部 sensor。** 在实际 checkpoint 保存每个 Agent 的可见视图，
而非在结束后从最终视图倒推；sensor 响应、失败、调用次序和资源使用都没有公开路径的消费者。
P1 的标注从 authored message 中分离存储；公开 renderer 和后续请求 builder 无权读它们。
“代码没有 writeback”只能支持数字路径隔离，不能支持 P1 指令没有行为效应。

sensor 复用 buildCollectiveDynamicsSensorPromptPayloadV1(BASELINE_A) 与现有 v1.1 parser：
公共 context、已公开文档板、own private、截至 checkpoint 的可见消息及固定 option mapping。
历史中自己的消息按时间打包进 ownPublicMessage，其他人的历史保留逐条 peerPublicMessages；
不得把所有人的 private 打包进去。初态 primary 对 pair 共用，R1/final primary 分 session。
B 不调用，显式设为 unavailable/not_collected；重复敏感性不可用，不补零、不平均或挑 primary。
sensor 不是语义标签审查员，不验证实际理解，也不读取 offline outcome。

| V0 输入 | 精确来源与失效处理 |
|---|---|
| pool | 固定原始 packet registry；在执行前冻结，后续不补 lineage 或重要性 |
| exposureLog | 原始 packet 全文置入被指定 Agent 的输入板或 barrier 共享板的交付事件；target、checkpoint、sequence 来自架构；不保证 provider 已处理或理解，引用 ID 本身不算交付 |
| discussionActLog | P1 的单主 act，经完整结构验证；P0 为 missing/not_collected，不从其文字推断 act |
| beliefChoice | 当前 checkpoint 的 thermometer ref；只在最终 checkpoint 加那一次明确 public choice |
| agentContexts | 真实单模型 ref、相同 role/authority；private assignment 单独记录；capability 未测则 null；同步轮无因果发言顺序声明 |
| resources | 只统计截至 checkpoint 的公开交互；sensor 费用在外部另记，不从未来 sensor 调用回填在线成本 |
| budget/actions | 此实验不选择动作，candidate list 完整空集；预算口径为剩余交互调用额度，未记录的 latency budget 为 null |
| missingness | 保留原原因；thermometerRef=null 时另检查 primary roster，不能只靠 V0 missingness 判“全通道齐全” |

全局 eventSequence 在单 session 内唯一；每个引用须已有同 Agent exposure，每个 response 须指向
更早的有效 act。输入只使用截止该 checkpoint 的事件。claim/roster/option/ref 必须一致。
原始事件前缀独立保存；不因验证失败删掉坏边、补一个假 act 或更换 evidence ID。
若 P1 annotation 前缀不能构造合法的完整 V0 日志，该 checkpoint 使用 missing/invalid
（provider 失败时使用 provider_failure），原始有效/无效记录均保留，不能宣称完整 utilization。

JSON 整体不可解析时禁止 regex 救援。整体可解析时，分别验证：
① message/share 公共部分；② P1 annotation。②失败不取消①合法消息和文档共享；
P0 意外输出额外标注也不进入公共 renderer。协议违例单独计数。
重复公共字段或 choice 字段使对应部分无效，不默认采用最后一个值；重复或畸形标注字段
只使标注无效，仍保留合法公共部分。不存在重建、猜字段或选择有利解析的路径。
公共部分失败时，该轮该 Agent 使用统一的“无有效消息”占位符继续固定日程；
不转发错误文本、不重复询问；最终 choice 失败保留 unavailable。
跨 session 泄漏、未来信息或超出授权上限立即停止全 phase；普通终端失败不触发选择性补跑。

## 5. 独立审查、estimand 与否证

在线 structured use 定义不改变。额外的离线审查只问**作者文字中可核对的 substantive use**：
是否准确表达了 packet 中至少一个具体命题，并将它用于某个选项的支持/反驳、比较或明确质疑。
仅列 ID、笼统说“我整合了材料”、附上系统复制的全文、仅服从某人身份均不算。
错误引用与有理由质疑原材料区分；不是要求发言最终结论符合答案。
这个外部准则验证可观察的证据处理，不声称读取内在理解。

两名独立审阅者只看随机排列、去条件/去标签的 authored message、对应 source packet 和先前
可见历史；不看 gold、最终 choice、P1 refs 或 descriptor。逐 message × private packet 编码
substantive / absent / unresolved 并给支持片段，先独立完成再处理分歧。
只有双方 substantive 计确认使用；只有双方 absent 计确认未使用；其余保持 unresolved。
任务材料与局部选择字眼有时会透露 benchmark key；不能保证审阅者不知道任务答案，要求是
不提供 gold、最终评价或处理标签，不让正确选择替代逐条文本证据。
两人的条件猜测和猜测把握另记；无法保证文字风格不会暴露处理，不称完美盲法。
没有独立审阅时，语义可信度为 unknown，不用同一个模型自评替代。
buildX0ReviewPacket 的 reviewItems 才能交给审阅者；analystLinkage 只留离线分析者。

**主行为 endpoint**：每 session 3 个原始 private packet 中，至少在一条 authored message
出现确认 substantive use 的比例 U∈[0,1]，同时给 unresolved 的最坏/最好界限。
packet 是分母，消息重复不能累加。另报告由原持有者使用／由其他人使用，禁止把二者合并为
“群体已经吸收”。自动共享的原文不算 authored use。
这些是审查表中的有限 endpoint，不加入 V0 核心或任意综合分数。

每个 task 单独报告 ΔU = mean_block(U_P1 - U_P0)，目标为固定 11 个非 canary block、两个 slot 的
有限总体平均协议效应；先展示全部 paired block，canary 单列。不把 Agent、packet、消息和 sensor
当独立样本。两个 task 不支持任务总体的普适推断。

统计方法在本次设计中冻结，不交给实现者临场选择：
- 所有 U 均明确时，枚举该 task 的 2^11=2048 种 block 内 slot 交换，双侧 p 为
  abs(mean(sign_b*D_b)) ≥ abs(mean(D_b)) 的比例，D_b=U_P1-U_P0，等值全部计入。
  两个 task 各用 p≤0.025 控制两项检验的族错误率；无 Monte Carlo、挑单侧或 pooled 检验。
  该检验针对“所有 slot 均无协议效应”的 sharp null，不把其反演伪装成异质平均效应区间。
- 平均效应另报有界的 90% 保守区间：每个 D_b∈[-1,1]，半宽
  sqrt(2*ln(20)/11)≈0.738，截到 [-1,1]。它依赖预分配与 slot 潜在结果无关、blocks 无干扰；
  时段/配额/服务器共享导致这些假设不可信时，只保留成对描述，取消随机化推断。
- unresolved 时，逐 session 给 U 的下界 L 和上界 H，报告
  [mean(L_P1-H_P0), mean(H_P1-L_P0)]，保守区间在两端再加上述半宽；
  sharp-null p 标为 unavailable，禁止删除 unresolved block 或把它填成 absent。
- 这个样本规模不能精确证明小幅干扰不存在，故**本实验不设置或授予“无反应性／等效”通过门**。
  小 p 可否定完全不影响的假说；大 p 只能说明未充分区分，不能让它成为被动观察器的资格。

标签可信度独立报告：P1 每个 tagged private packet 是否被盲审确认；同时报告未标注但被确认
使用的 packet。主结果为逐 session 的 supported / unsupported / unresolved 数量和分母；
不把全量 tag 当独立样本。R2 对带证据发言的空泛回应保留为 V0 informationLinked=true，
外部审查却可为 absent；冲突是结果，不修改 core 让它消失。

**独立 outcome**：最终三人的明确 choice，≥2 人同选才形成群体 choice，否则 abstain；
invalid 单独列出，同时将其按失败计入预先定义的 keyed-success endpoint。
与 pinned answer 比较只发生在所有公开、sensor 和盲审输入冻结后；原始答题率、abstain、
invalid、各人的选择分布并列报告。task 6 的答案是 benchmark key，不是现实人事最优性。
ΔU 不能替代 outcome 差异；本实验不声称 targeted rescue 或治理有效性。

保留 Q0 的 probability-only / act-count / source-count 描述基线；P0 act-count unavailable，
不能填 0 来制造差异。公共 message count 和实际成本两组均可比较。
再给一个同信息的最简单参照：直接读取原始文档交付表和共享记录；V0 若只是等价投影，
如实报告，不把“比只看概率多读信息”当表示优势。

| 结果 | 本实验允许的决定 |
|---|---|
| 出现无 substantive 支持的 refs | 反驳“有标注必有实质使用”；逐 session 报频率，不能直接用于认知使用或治理阈值 |
| 边信息只能区分“回应带引用发言” | 保留该边界，不能宣称已分离信息贡献与权威影响 |
| P1 明显改变 U/outcome/失败或成本 | 研究对象限定为 P1 协议；不宣称被动自然观察 |
| effect 不精确、审阅 unresolved、有效记录少 | 结论未定；不以无显著结果放行，不临场补样本 |
| 同信息简单参照已足够 | 不新增 state 维度或 learned policy，使用简单参照 |
| 观察记录可用 | 只允许讨论下一个受控响应设计，不自动开启强弱模型或策略实验 |

## 6. 下一机制问题：只保留识别边界，暂不扩实验臂

观察层合格后，优先问“缺新证据”与“已具备但未使用”是否有不同的信息行动响应。
这两个状态不能由 outcome 倒推，也不能人为把未出现的 utilization 状态贴给 cohort。
届时在同一真实 action 前状态内部随机分配继续、旧材料重呈现、新材料获取；
每个动作的选择池、来源、载体、预算、执行时点和处理内容必须单独冻结。

行动前状态是效应分层变量，不能据 state × action 交互直接声称状态本身有因果作用。
“同样一次调用”不能排除信息增量、文字长度、身份权威和计算额度的混淆。
若旧／新材料无法匹配，先估计具体信息动作包的效应，不声称纯新颖性效应。
之后的 detector 只读取 action 前在线字段；在独立任务上报告救援、漏救、误触发和对原本正确
任务的伤害。灾难任务上的集中救援是目标；不按 pooled mean 否定它，也不按单次噪声控制
分支的失败结果挑子集再调阈值。当前没有该阶段的实现或调用权限。

## 7. 控制研究流程与文档规模

只保留三个工作节点：**设计裁决 → 一次有边界的实现/验证 → 结果解释**。
所有者对实际 provider phase 的授权位于实现审查之后；不为同一低风险动作逐子步骤申请许可。
设计中未定义而会改变科学解释的问题回到本文件解决；普通实现选择由执行者在既定范围内处理。

- 当前 WIP=0：主动研究已停止，仅保留本合同；若明确恢复本实验，则 WIP=1，不并行开新母问题、指标、Atlas、强弱协同和平台化队列。
- 一个实验只有本文一个当前合同；字段定义指向 V0，资格结果指向 Q0，入口只列状态和链接。
  不再创建 plan/review/final/status 四份同义文档，不为每次模型交接写 narrative report。
- 本轮只做识别设计、核心隔离与能推翻错误结论的检查；provider 接线不包装成科学进展。
- 每批改动必须说明它排除了哪个混淆／检验了哪个断言；没有对应判断的功能和文档不进入本批。
- 本轮新增三个 X0 专属文件。为使已存在的 Zhipu raw 路径符合 X0 的可见内容与缺失计费语义，
  只收紧了它及其直接测试；第三个文件承载持久化与真实调用边界，防止纯实验模块获得文件／
  密钥／provider 权限。不用空壳 adapter、通用 manifest 框架或 CLI 层制造工作量。第二个真实
  消费者出现前禁止提取框架；不能为了守文件数量写不可审查的巨文件，确需拆分时先给具体依赖理由。
- Codex 负责语义、识别、核心隔离和最终裁决。若另行委派 Claude Code/DeepSeek，
  只给精确文件/符号的文档同步、机械检查或测试输出任务，不委派实验定义和核心边界。
- 只运行能检验当前变更的检查。文档设计不重跑全仓构建；核心／公共依赖改变才扩大验证范围。
  检查通过后没有新证据就不重复跑；失败不能靠换期望或重问 provider 清除。
- 结果表直接进入实验 artifact；只在本文件末尾追加一次事实和裁决摘要，替换顶部状态。
  历史数据与旧判定保留，不滚动新建“最终最终版”文档。

## 8. 本轮实现边界与验证

已新增：
[实验代码](../../experiments/campaign/v6/collectiveDecisionProcessObservationX0.ts) 与
[执行边界](../../experiments/campaign/v6/collectiveDecisionProcessObservationX0Execution.ts) 与
[直接测试](../../test/collective-decision-process-observation-x0.test.ts)。
前者仅包含此实验的视图/请求/编排/冻结分析；通过注入 SingleAttemptTextInvoker 执行，
无 .env、credentials、自动 main、自动调用或 package command。核心 V0 和旧 runner 不改。
执行边界有两条原始响应候选：GLM-4.5-Air 的 explicit-key、visible-content-only 路径，与
Model Studio `qwen3.7-flash-2026-07-15` 的固定官方兼容端点路径（[兼容 Chat API](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions)
与 [JSON 输出要求](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-structured-output)）。后者固定
`enable_thinking:false`、`response_format:{type:"json_object"}`，并按该 snapshot 的不支持状态
不发送 provider seed；两者均不清理 Markdown 围栏或畸形 JSON。Qwen 构造器不接受 relay URL、
环境查找、model override、fallback、retry 或 resume；secret 留在 invoker closure，manifest 只记
region 和 workspace fingerprint。持久 journal 只创建全新的、以 runId 结尾的目录；原始 writer
不对外暴露，只返回一次性、再次核对 task hash/settings 的 bound canary handle。每个事件都带运行时 task
hash；它在实际调用前绑定 task/settings/phase/connectionRef/request，并先零网络构造、验证全部
66 个 canary 请求。
每个 started/returned/unknown 事件均在独立打开、sync、关闭后以哈希链写入。目录已存在即拒绝，
故没有 resume 或自动重发：进程中断留下的 started 在恢复读取中按 unknown 报告。测试中的内存
记录器不能用于真实运行。这只是代码支持的候选调用边界，不代表模型、费用或 provider phase 已获授权。

可复用依赖仅限当前 shared 的 pinned HiddenBench loader、单次 invoker 类型、
sensor payload/parser、V0、thermometer 与现有 canonicalization；不从 legacy 引入实现。
输入 offline task reader 先生成 allowlist online packets；在线 builder 不接收全 task 对象，
最终 evaluator 单独接收 gold。pool/分配/slot/参数在模型响应前固定。

直接检查覆盖的隔离断言（mock 只作工程证据）：
1. 改 gold、rationale、他人未共享 private 或未来事件，当前 Agent 的请求字节不变；
   合法共享 packet 后，仅有权限的后续视图变化。原始 packet 引用不自动共享内容。
2. 两个 session 共享前状态的副本；改变一个 session 的 message/annotation/memory，
   另一个不变。不同 task、block、slot 的日志和资源额度不互相引用。
3. P0/P1 首轮 system/user prompt 只有冻结的 RESPONSE_FORMAT 部分不同；可见信息/额度一致；
   slot 的 requestId/seed/先后时点预先固定，不假装这些路由元数据也完全相同。
   原始材料不能带条件、答案或重要性编码。后续历史差异作为处理结果，不能“清洗成相同”。
4. 替换、取消、逆序执行同一 phase 的全部 sensor，公开请求和结果不变；annotation 大改但公共部分
   不变时，下一公开请求不变。在线执行仅接收预先导出的 allowlist 数据，不调用原始
   task loader/evaluator，也不加载全量答案文件；这是输入/执行路径隔离，不宣称 OS 权限沙箱。
5. 文档确实全文送达、单轮 barrier、response 严格向过去、最终 choice 互不可见；
   任何非法 ref 不能通过删边或插假事件获得 complete 状态。
6. 分开覆盖公共 JSON 失败、metadata 失败、provider 失败、cost 缺失和真实零；Qwen 请求形状、
   disabled-thinking 响应 provenance、原始内容保留、无 seed 与无 relay 均有直接检查；Zhipu
   visible-content-only 路径拒绝意外 reasoning_content。started 先于实际调用同步落盘，终端事件
   再写入；已开始但无 terminal 的调用按未知结果保留，目录拒绝重开，不能自动重发。
7. 24 pairs 配对及 private 分配固定、canary 子集固定、66/726/792 调用上限正确；
   remainder 不重跑小试，主分析拒收 canary，无成功率筛题、重试或补样本。
8. 独立审查 unresolved 的界限、按 session/task 聚类、abstain/invalid 分母、
   非显著不等于等效均有能推翻错误结论的数值反例；基线不能读取更多私有材料。
9. 人为全 ID 引用、仅共享系统全文、空泛服从权威、原持有者独占使用等例子能保留
   V0 与外部审查的冲突；不得把两边改成同一个算法再称“独立验证”。

验证事实：X0 直接文件的 22 项测试、共享 Zhipu raw-boundary 的 30 项测试通过；完整 792 个
模拟调用、144 个 V0 checkpoint 投影通过；新目录 journal 的 66 个 cell、132 个事件、哈希链
不一致、重复目录、未终结 started 均有直接检查；TypeScript 检查通过。没有真实模型调用，语义
审阅尚未进行；这些结果不授予“无反应性”或治理效益。当前调用器和 journal 边界保持冻结；
实际 phase 前只在本文件登记已确定的 model snapshot/region/config、价格证据与货币上限、quota
snapshot、时段、runId/新目录和明确授权。公开与 sensor/audit 输入冻结前不得把 gold 交给最终
evaluator。首批始终是 66-call canary。执行入口必须显式构造，不能由 import、测试、计划或恢复读取触发。
