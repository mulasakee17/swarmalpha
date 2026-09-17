# SwarmAlpha 研究底色、设计哲学与反偏航权威

状态：**NORMATIVE RESEARCH IDENTITY AUTHORITY — OWNER APPROVED**
日期：2026-09-17（补充交接前方向审查；原定义、历史决定与收尾想法保留）
所有者裁决：2026-08-31 初始通过；2026-09-02 方向收紧；第 11 节保留历史，第 13 节记录停止决定，第 14 节记录交接边界
适用范围：未来理论、任务、测量、实验、引擎复用、论文叙事与 AI 协作决策
不替代：具体对象的数学/代码合同、冻结实验计划、原始结果与论文 claim audit

本文回答一个比“下一步实现什么”更上位的问题：**SwarmAlpha 究竟为什么存在，哪些
看似不整齐的设计是刻意保留的研究结构，未来修改怎样避免把项目修成另一个东西。**

本文服从 [`REASONING_PROTOCOL.md`](../REASONING_PROTOCOL.md) 的证据与因果纪律。
当本文的项目身份判断与普通计划文档冲突时，本文优先；当本文的事实状态与代码、
可重放结果或对象级合同冲突时，后者优先。

---

## 0. 核心裁决

### 0.1 一句话研究身份

> **SwarmAlpha 是隔离在多 Agent 讨论之外的群体认知观测与实验层：它把语言中
> 模糊、异质、随时间变化的讨论状态映射为有合同、有缺失语义、可重算的数学对象；
> 先描述群体处于什么状态，再研究外部信息如何改变状态，最后才研究能否据此治理。**

顺序不可倒置：

```text
异质讨论过程
  -> 外部观测合同
  -> 微观状态与宏观读数
  -> 状态轨迹（包括运动和稳定）
  -> 受控信息响应
  -> 独立 outcome 评价
  -> 有限、真值盲治理
```

观测层本身可以具有科学价值，但“把含混状态变成数字”不是充分条件。一个量即使
暂时不能授权治理，也必须具有明确对象、稳定合同、可解释反例、非退化信息和具体
分析用途；项目级优先量还必须说明它最终可能区分哪类行动决策。预测、干预和治理
价值不是定义一个描述量的前提，但缺少真实决策问题的数值面板不是项目终点。

### 0.2 教授指导的规范化解释（2026-08-30 历史转述）

本节保留当时转述；不是教授现在的意见。2026-09-14 所有者报告的新反馈见 §13，
不得用本节“并未根本走错”的旧表述覆盖新反馈，也不得推断教授未陈述的具体理由。

**OWNER-RECORDED PROFESSOR GUIDANCE（2026-08-30）：**原社会热力学方向并未根本
走错；问题是部分量定义不清、治理效果不突出。把研究急速压缩成“某种信息暴露策略
是否有效”虽然获得了较清楚的实验对象，却丢失了更深的科学对象。项目应为第一篇
收尾，然后恢复“监测 -> 干预 -> 治理”的顺序。即使一个群体状态量暂时不能成为
治理操作量，把模糊讨论状态定义成数字本身也有意义。

本文将该指导落实为三条规范：

1. 不再要求每个描述量立即证明预测或控制价值，才允许其作为观测量存在；
2. 不因治理失败而回溯删除合法的状态定义；
3. 不恢复旧 `R/T/H/F` 的物理话术，而恢复“外部测量群体动力系统”的研究方法。

### 0.3 三个绝不能再混淆的判断

1. **状态可描述**不等于**状态可预测未来**；后者失败不删除前者。
2. **状态会变化**不等于**变化是好的**；只有独立 outcome 能评价质量。
3. **状态可测量**不等于**状态有控制权**；治理权限必须由随机动作与独立结果取得。

### 0.4 2026-09-02 所有者冻结的方向收紧

**OWNER DECISION：**当前 categorical probability thermometer、entropy、JSD、
离散度、集中度和稳定性只保留为一个操作性信念观测通道及简单基线。继续让 Agent
输出选择题概率并增加几何读数，不再被视为项目母问题，也不足以构成后续阶段的默认
研究进展。

项目的下一核心对象改为**多通道集体决策过程状态描述器**：在不知道即时真值时，
描述群体已经接触什么信息、哪些信息真正进入讨论、来源之间如何依赖、谁对谁产生
了何种可观察影响、强弱模型和角色如何协同，以及剩余资源允许采取什么行动。该对象
服务于一个实际问题：在相关来源与有限预算下，决定下一项证据、来源、工具、私人
报告、强模型或人工复核是否值得获取，以及何时弃权、升级或停止。

以下语义边界立即生效：

1. **信息覆盖不是信息正确性。** 在受控任务中，coverage 的分母必须是预注册证据池；
   开放世界中分母未知时，只能称 observed/registered-pool coverage，不得声称覆盖真相。
2. **讨论利用不是说话数量。** discussion utilization 描述独特已暴露信息是否被引用、
   质疑、整合或用于解决冲突；message count、token volume 和轮数不能替代它。
3. **影响不是声量或身份。** influence 必须区分携带新信息造成的响应与能力标签、表达
   风格、发言权或权威造成的支配；没有时间、随机化或反事实设计时不得升级为因果影响。
4. **强弱模型标签不是处理效应。** 能力、信息访问、角色、provider、发言顺序和权限
   必须分开；混合 cohort 的差异不能直接称为异质协同收益。
5. **决策质量不属于在线状态。** correctness、proper loss、任务效用、灾难性错误和
   cost-adjusted quality 只由独立离线 evaluator 计算，不得泄漏到描述器或在线策略。
6. **不建立指标动物园。** 每个候选量必须写出允许的在线输入、它区分的状态反例、
   可能改变的具体动作、证伪测试和独立 outcome；缺一项则不进入核心状态。

这是对 2026-08-31 “描述性测量有独立权限”的收紧，而不是否定合法旧测量：旧温度计
继续作为已实现子通道、测量案例和 baseline 保存，但“单纯数值可区分”不再足以决定
项目优先级。任何与本节冲突的旧近期路线，以本节和第 11 节最新 owner decision 为准。

---

## 1. 从历史倒推项目真正的不变量

本节是概念史，不把旧实现当当前证据。

### 1.1 起点：异质主体、信息盲区与群体涌现

**FACT（仓库历史 `9b94ada`、`ae658ea`）：**项目最初是金融多 Agent 推演。其最有
生命力的想法不是金融预测器，而是让不同角色拥有不同观察面、响应函数、资源权重
和信息盲区，再研究互动后出现的群体状态。历史系统曾主动追求 agent 间的真实差异，
而不是把所有 agent 标准化成同一份输入上的重复采样。

**INFERENCE：**项目最初的底色是“异质局部视角如何形成宏观结果”，不是“把多个
相同模型平均起来提高答题率”。任务与角色的非同质性是研究对象的一部分。

### 1.2 第一次明确定位：讨论之外的 sidecar

**FACT（`0664fd3`、`95e9405`）：**2026-07-04 项目被明确定位为不创建 agent、
不管理业务工作流、而是接入现有多 Agent 系统的外部治理 runtime。其架构主张是
`observe -> model -> detect -> intervene -> evaluate`，并强调 LLM 负责把语言映射为
结构化感知，数学层负责可重复计算。

旧版本对“数学不可欺骗”和治理能力的表述过强，但以下结构判断仍应保留：

- SwarmAlpha 不应成为另一套 Agent 编排框架；
- 观测层与被观测讨论应解耦；
- 不同框架通过 adapter 接入，不要求内部实现相同；
- 数学层应尽量确定、低成本、可解释；
- detect-only 是合法终态，不是 incomplete governance。

### 1.3 社会热力学的原始贡献：给讨论建立外部坐标

**FACT（`48e2713`）：**2026-07-16 的社会热力学实现试图用 `R/T/H/F` 区分结构性
无序与波动性无序，并把状态坐标用于终止和干预排序。后续数据表明旧变量强耦合、
旧 `F` 排序没有改善决策质量，部分终止语义存在缺陷。

**应保留的不是公式，而是研究问题：**

> 当自然语言讨论无法直接概括时，能否在讨论之外建立一个状态坐标系，使不同群体
> 形态、时间变化和外部响应可以被观察、比较和反驳？

这是社会热力学的合法核心。`temperature`、`free energy`、`phase transition` 等
名称必须重新挣得，但“统计描述群体状态”不需要等待这些名称。

### 1.4 五维认知阶段的精华：不要把个体压成一个数

历史 `U/E/C/I/Lambda` 体系试图区分报告位置、证据、自报信心、持续性和响应性；
虽然旧构念与估计器混合，部分维度未经验证，但它留下两条正确原则：

1. 群体状态不能只由一个最终选择或一个共识分数代表；
2. agent 自报、系统行为记录和外部评价必须分层，不能互相覆盖。

### 1.5 v6 的贡献与代价

**FACT（2026-08-07 起的 v6 提交）：**v6 建立了 claim-owned probability contract、
evidence/exposure identity、truth firewall、随机分配、final-private outcome 与 replay。
这修复了旧版最危险的语义混合与因果跳跃。

它的代价是研究表面被压缩到有限选项、proper loss 和清晰处理对比。该压缩适合
第一篇论文和因果实验，但不能被误认为 SwarmAlpha 永久只能研究选择题，或所有
群体状态都必须接受同一 categorical schema。

### 1.6 第一篇压缩的正确位置

same-state fork 与信息暴露实验是有价值的局部问题：它隔离一个已实现的信息处理
差异。但它不是项目母问题，也不能替代群体状态科学。第一篇应作为“外部信息能改变
后续结果”的有限证据收尾；第二阶段恢复讨论状态的观测、形成、稳定和响应。

---

## 2. 项目的研究本体

### 2.1 被研究对象不是 prompt，也不是最终答案

设一个讨论过程为 `D`，包含 agent、局部信息、角色、拓扑、消息、时间和任务边界。
SwarmAlpha 不直接宣称访问 `D` 中不可见的内部激活，而是在 checkpoint `t` 通过
冻结的 `ClaimContract + SensorContract` 得到可观测状态。

对当前 categorical contract：

\[
p_{i,t}\in\Delta^{K-1}
\]

**规范定义：**预声明 canonical probability report `p_(i,t)` 是该 agent 在该
checkpoint、该仪器合同下的**操作性信念状态**。这不是任意文本特征，也不是只有
在预测公开选择成功后才算 belief。它同时不声称读取隐藏激活、不保证概率校准、
不保证客观正确。

这一定义解决了两个相反的误修风险：

- 不能把自报神化为 prompt-invariant 的“内心真值”；
- 也不能因它不是隐藏激活，就把它降级成无状态地位的可有可无 telemetry。

### 2.2 概率温度计是子通道，不是完整决策过程状态

当前已实现的 categorical thermometer 微态是：

\[
S_t^{thermometer}=(P_t, roster_t),\qquad P_t=[p_{i,t,k}].
\]

`P_t` 必须保留。任何 belief-geometry 宏观量都是它的投影，不能替代原始微态。
但 `S_t^{thermometer}` 只描述冻结仪器下的操作性信念报告，不是完整的集体决策
过程状态。

**DESIGN TARGET（尚未实现或验证）：**完整过程描述器至少保持以下通道分离：

- belief 与公开 choice；
- 注册信息单元、exposure、coverage、重复与 source/lineage 依赖；
- 已暴露信息的 discussion utilization 与未解决冲突；
- 发言、回应、参与和 influence 结构；
- 模型能力、角色、信息权限与强弱模型异质性；
- missing/invalid、调用成本、剩余预算和可用动作；
- 仅离线可见的 resolution、outcome 与决策质量。

该 design target 不预设一个统一总分。首个 V0 合同应选择能区分真实动作的最小子集，
优先检验 information coverage、discussion utilization 与
information-bearing influence / authority dominance 的分离；具体 estimator、schema
和阈值必须另行冻结，本文不把候选维度写成已实现事实。

当前 thermometer 的最小独立宏观坐标仍为：

\[
M_t=(q_t,U_t,coverage_t),
\]

这里的 `coverage_t` 是 canonical report / declared-roster 覆盖，不是信息覆盖率。
information coverage 必须由单独注册的信息单元、exposure 和分母合同定义，二者不得
同名混用。

其中：

\[
q_t=\frac1{N_t}\sum_i p_{i,t},\qquad
U_t=\frac1{N_t}\sum_i H_K(p_{i,t}).
\]

派生读数包括：

\[
H_t=H_K(q_t),\qquad J_t=H_t-U_t,
\]

以及 pooled concentration、top margin、mean/max pairwise TV。`J_t` 描述报告分歧，
不是冲突价值判断；`U_t` 描述平均个体不确定性，不是正确性；`q_t` 是向量，不能
被一个“群体倾向值”无损替代。

### 2.3 稳定也是动力学结果

相邻状态的 agent-level activity 为：

\[
A_{t\to t+1}=\frac1{|I|}\sum_{i\in I}TV(p_{i,t},p_{i,t+1}).
\]

`A` 高表示操作性信念报告移动，`A` 低表示在当前合同和时间分辨率下稳定。两者都
是合法观察。不得为了证明“有动力学”而设计分析器把稳定状态判成仪器错误，或强迫
每个任务都在同一轮数内产生多数 agent 移动。

若存在 exact duplicate：

\[
G_{i,t}=TV(p^A_{i,t},p^B_{i,t})
\]

只作为仪器质量。primary `p^A` 定义状态；不得平均 A/B、不得挑更顺眼的一次、
不得因 B 缺失删除 A。跨时变化超过两端 duplicate gap 是保守诊断，不是状态存在
的必要条件。

### 2.4 多通道并存，不强行统一

下列通道必须并列保存：

- 操作性信念自报；
- 结构化公开选择；
- 自然语言讨论文本；
- 证据、source、lineage 与 exposure；
- roster、topology、cost、invalid/missing；
- 仅离线可见的 resolution 与 outcome。

通道不一致是结果，不是需要“修复”的数据污染。不能用公开选择覆盖 belief，不能
从自由文本猜一个选择后写回核心温度计，也不能用 outcome 反向改写在线状态。

### 2.5 观测层的隔离

温度计是 shadow layer：只读当前冻结前缀，计算 `S_t` 和读数，不向公开讨论写回
测量结果，不推荐动作，不读取未来消息或 ground truth。隔离的意义不是工程整洁，
而是防止测量改变被测过程，并让同一观测层可接入不同讨论引擎。

---

## 3. “非标化”不是缺陷：标准化边界

### 3.1 总原则：标准化接口，不标准化现象

SwarmAlpha 的普适性来自：

```text
native task/discussion
  -> task-owned adapter and sensor contract
  -> contract-valid microstate
  -> contract-appropriate mathematical projection
```

而不是来自：

```text
every task -> same multiple-choice prompt -> same universal scalar
```

adapter 的存在不是不普适；偷偷把任务特定量称为通用量才是不普适。

### 3.2 必须标准化的部分

以下是科研可比性与审计需要的标准化：

- claim、option/coordinate、roster 与时间身份；
- canonical primary instrument 及 prompt/config/parser version；
- 合法值域、缺失状态和 fail-closed 规则；
- exposure 与 source/lineage 的可审计身份；
- truth access 与 online/offline 时序；
- treatment assignment、outcome contract、cost 与 replay；
- 同一 estimand 内的冻结比较条件。

这些标准化保护“我们到底测了什么”。

### 3.3 必须保留非标化的部分

以下异质性可能正是研究信号，不能为代码整齐而消除：

1. **任务本体不同。** 诊断、排序、连续估计、开放创作和有限选择不共享一个天然
   样本空间。
2. **局部信息不同。** hidden-profile 任务的价值来自 agent 看见不同信息；强行补齐
   上下文会删除研究对象。
3. **角色和响应函数不同。** 异质权限、目标、专长和表达方式不是 parser bug。
4. **讨论协议不同。** sync/async、轮次、拓扑和发言权是边界条件，不是默认 nuisance。
5. **不同通道可能冲突。** belief、choice、text 与 evidence 不应被归一成同一标签。
6. **不同场景不会复制同一轨迹。** 同一个抽象信息结构在不同语义任务中可能收敛、
   极化或保持稳定；不能因为没有同向复制，就修改任务让曲线更漂亮。
7. **缺失与失败不对称。** invalid、拒答、未采集、provider failure 具有不同含义，
   不能统一填 0 或 uniform。

### 3.4 局部仪器冻结不等于全局本体统一

在一个实验内冻结 categorical sensor 是必要的，因为否则 `p_(i,t)` 不可比较。
但这只建立该任务族内的测量合同。未来支持其他任务时，应增加新的
`SensorContract + MetricContract`，而不是扩张现有 categorical contract 冒充全能。

候选扩展包括但不限于：

- continuous：分布、区间或分位数报告；
- ranking：排名分布或成对偏好合同；
- constraint/diagnosis：对注册假设与约束满足状态的报告；
- open-ended generation：先注册可比较 claim、偏好、约束或评价对象；若无法定义，
  只保留文本/行为/证据通道，不伪造 probability simplex。

开放任务即使没有即时 ground truth，也可以有描述性状态；但没有独立评价合同时，
不得升级为“质量改善”或治理效果。

### 3.5 多读数面板优先于“总温度”

教授所说“把模糊状态定义成数字”不等于必须压成一个数字。`U`、`J`、concentration、
pairwise TV、coverage 和 activity 都可以是有意义的标量读数；它们描述不同问题。
只有在存在可识别能量模型、响应关系、稳态或尺度证据时，才讨论把它们组合成
effective temperature、free energy 或其他物理总量。

同时，多读数面板也不自动等于完整状态描述器。belief geometry 只能回答报告位置与
分散结构，不能替代信息覆盖、讨论利用、来源依赖、影响形成、能力异质性和资源状态。
候选量若不能说明它区分哪类过程状态或可能改变哪项认知动作，只能作为诊断读数，
不得因面板更丰富而升级为项目主贡献。

---

## 4. AI 最容易制造的“善意偏航”

下列模式以后默认视为高风险语义变更，不得作为普通修复直接执行。

### 4.1 把测量定义误当预测假设

错误模式：因为 `S_t` 未提升下一状态预测，就宣布 `S_t` 无法描述当前讨论，或把
状态中心改成更能预测 choice 的变量。

正确处理：预测失败只否定 coarse-graining sufficiency。保留观测态，单独降低其
预测权限。

### 4.2 把稳定状态误当“没识别出来”

错误模式：任务没有 late motion，便增加轮数、注入刺激或修改阈值，直到出现运动。

正确处理：先检查公开行为和微态是否实际稳定。稳定极化、稳定共识和稳定不确定都
是应被温度计区分的状态。只有已知输入状态发生变化而仪器不响应，才构成灵敏度问题。

### 4.3 把任务适配误当不通用

错误模式：为了跨任务复用，强制所有任务输出相同选择题概率、统一角色、统一证据数
和统一轮数。

正确处理：冻结公共接口与语义要求，允许每个任务族拥有本体合适的 adapter。跨任务
比较只发生在有明确桥接关系的坐标上。

### 4.4 把 operational belief 降级成任意 telemetry

错误模式：因为自报受 prompt 影响，就说它“不是真实信念”，从而用 choice、文本
分类器或重复平均替换 primary。

正确处理：在冻结合同下 primary report **定义**操作性信念。prompt sensitivity 是
仪器质量，不能回溯取消定义；跨仪器不可比时，应限制比较域，而不是删除状态。

### 4.5 把所有变量做 0--1 归一化后称为可加

相同值域不等于相同量纲、独立构念或可合法加权。未经模型和反例支持，不得用任意
权重形成健康分、风险分或自由能。

### 4.6 把通道冲突“清洗”掉

belief 与公开 choice 不一致、A/B duplicate 不一致、text 与 evidence relation
不一致都可能是关键现象。不得选择一个通道覆盖其他通道，也不得只留下相互一致的
子集。

### 4.7 把审计基础设施当科研成果

hash、manifest、replay、schema、ledger 是保护研究的设施。除非研究问题就是可靠
实验基础设施，否则不得用增加审计层代替状态、响应和 outcome 问题。

### 4.8 为“复用”重造大引擎

复用应优先发生在已有 V6 adapter、provider invoker、parser、epistemic kernel 和
replay 上。只有同一个新桥被两个真实实验消费者需要，才考虑抽象公共引擎。

### 4.9 结果出来后修 gate

冻结 gate 失败时可以指出 gate 过严、语义不完整或作用域有限，但原分析结果必须
保留。任何新判定必须版本化并标 post-hoc；不得覆盖旧结果或悄悄降低阈值。

### 4.10 用“物理不够严格”删除描述量

entropy、TV、JSD 等数学量不需要成为物理温度才有描述价值。应删除的是未经资格的
物理解释，不是合法计算本身。

---

## 5. 未来修改的反偏航协议

### 5.1 修改前必须分类

每个重要改动先标为以下一种，不允许用 `fix` 掩盖语义变化：

| 分类 | 含义 | 默认权限 |
|---|---|---|
| `IMPLEMENTATION_BUG` | 实现违反已冻结合同 | 可修；必须证明合同与 artifact 兼容性 |
| `MEASUREMENT_SEMANTIC_CHANGE` | 改变“量测什么” | 需新版本、反例与旧结果保留 |
| `SCOPE_CHANGE` | 新任务族、模型、拓扑或仪器 | 加 adapter/合同，不覆写旧支持域 |
| `HYPOTHESIS_CHANGE` | 改变待检验关系或 gate | 新计划；不得追溯改判旧实验 |
| `ENGINEERING_REFACTOR` | 理论上不改语义 | 必须做 replay/等价性证明，否则降级为语义变更 |

### 5.2 五问检查

AI 或开发者提出“修复”时，必须先回答：

1. 原设计意图是什么？有何历史或当前证据？
2. 这是违反合同，还是仅仅不符合常见工程风格？
3. 哪个具体科学判断会因当前行为而错误？
4. 最小修复能否保留异质性、原始通道和历史 artifact？
5. 若不修，会损害哪项可验证结果；若修错，会删除哪项研究信号？

无法回答第 3 或第 5 问时，默认不改核心语义。

### 5.3 语义保护清单

任何核心修改完成前后必须核查：

- primary belief 的定义是否改变；
- 任务原生信息不对称是否被抹平；
- missing 是否被插补；
- belief/choice/text/evidence 是否被合并；
- ground truth 是否提前进入；
- 观测结果是否写回讨论；
- 宏观投影是否替代了 `P_t`；
- 新量是否被赋予未经实验的控制权；
- 旧 artifact 是否仍可按旧合同重放；
- 失败结果是否仍然可见。

### 5.4 “先保留，再版本化”

- 不在 frozen runner 上继续堆条件分支；
- 不修改历史 raw log 以适应新 schema；
- 新语义用新 contract/version/adapter；
- 旧实现可以退役，但必须保留其证据身份；
- 对现有输出的重新解释写成新 analysis，不覆盖原 analysis。

---

## 6. 社会热力学的正确发展顺序

### 6.0 数学框架与统计物理的定位

**DESIGN INTENT：**项目优先建立隔离于讨论过程的数字观测框架，用严谨但直观的
数学对象描述群体状态及其随时间的变化。统计物理是候选变量、尺度分析、涨落、
响应、稳定性和状态转变假说的重要方法来源，但不是预设结论，也不要求被测系统
满足平衡态或热力学极限。

因此采用两层命名纪律：第一层只报告已经严格定义的概率、距离、熵、集中度、覆盖、
活动和持续性；第二层的温度、磁化、易感性、亚稳态、吸引子和相变名称，只有在相应
响应、时间、尺度或重复性证据成立后才启用。数学框架可以先于物理解释成立，物理
解释不能反过来决定观测结果应当长什么样。

### 6.1 阶段 O：Observation / Monitoring

目标：在不读取即时真值的前提下，建立多通道决策过程描述，区分群体缺信息、信息未
被讨论、来源高度相关、权威支配、真实信息贡献、资源耗尽等不同状态。观察阶段不要求
策略已经改善 outcome，但每个项目级核心量必须面向一个明确的潜在行动决策，而不是
仅把群体状态变成更多数字。

最低成功条件：

1. 对象和样本空间清楚；
2. primary 状态、缺失和 roster 规则清楚；
3. 典型反例可区分，如 concentrated consensus、diffuse consensus、polarization；
4. 不同状态差异可超过合理的仪器噪声，或噪声本身被诚实报告；
5. 运动与稳定都能记录；
6. 同一冻结前缀的历史读数不被未来信息改写；
7. 在至少一个额外任务族上通过合适 adapter 复现定义，而不是复制相同曲线。
8. 信息覆盖、讨论利用和影响的分母、事件单位与缺失语义明确；
9. 每个核心量声明允许的在线输入、目标动作、证伪测试和独立 outcome；
10. categorical probability geometry 作为一个通道和 baseline，而不是完整状态代理。

这一阶段允许的论文贡献是：状态定义、测量合同、描述性分辨力、轨迹现象和适用边界。
它不需要先证明预测增量。

### 6.2 阶段 I：Intervention Response

进入条件：观测层已经能区分目标状态，并且 action 前状态不读取 outcome。

研究对象是受控外部信息场对状态与 outcome 的响应，必须分开：

```text
state response: action -> Delta S
outcome response: action -> Delta Y
```

`Delta S` 大不代表 `Delta Y` 好。重新暴露已有信息、获取新信息、独立工具、人类复核
和 neutral carrier 是不同动作，不得只凭文本格式统一名称。

### 6.3 阶段 G：Governance

只有状态能在未见任务上识别“何时行动、采取什么行动”并改善独立 loss/cost，才允许
进入治理。治理是 targeted rescue，不是 universal booster；优先挽救可识别的灾难
状态，同时避免扰动已正确群体。

### 6.4 物理术语权限

| 术语 | 当前权限 | 升级所需证据 |
|---|---|---|
| entropy / JSD / TV | 可正式使用其数学名称 | 明确随机变量、样本空间和合同 |
| order/concentration/activity | 可作描述性名称 | 对称性、非退化、边界条件 |
| effective temperature | 当前不可正式使用 | 外生噪声或 fluctuation-response、跨条件复现 |
| susceptibility | 当前仅随机 action 的条件响应估计 | 随机化、剂量、对照和支持域 |
| metastability / attractor / basin | 当前只能假说 | 多初态、多轮、扰动后持续/返回证据 |
| phase transition | 当前不能使用 | 控制参数、有限尺寸/尺度、非平滑变化与替代解释 |
| free energy | 当前不能使用 | 势函数、稳态/路径、预测压缩与非势基线 |

“Social Thermodynamics”当前是研究计划名称，不是已证实物理理论。

---

## 7. 当前状态空间实验的规范解释

权威实测结果位于
[`results/v6_discussion_thermometer_state_space_calibration_glm46v_seed1/analysis.json`](../../results/v6_discussion_thermometer_state_space_calibration_glm46v_seed1/analysis.json)。

**FACT：**GLM-4.6V 运行完成 64/64 public 与 192/192 sensor terminal；96/96
canonical primary reports 有效。预注册 gate 中：

- G0 terminal accounting：PASS；
- G1 sensor usability：PASS；
- G2 state resolution：PASS，6 个状态对中 5 个在两个 base scenario 都超过 exact
  duplicate reference；
- G3 late motion：FAIL，没有一个 design regime 在两个 base scenario 都达到多数
  agent 的 `X1 -> X2` movement-above-both-duplicates。

**规范解释：**

1. 结果为当前 categorical 温度计提供了 development-only 的截面状态分辨证据；
2. 结果没有建立跨语义场景可复制的后段运动模式；
3. 极化条件在两轮间稳定不是测量失败，而是被观察到的稳定状态；
4. 同名 information regime 在不同 scenario 出现不同轨迹，不能自动归因于仪器错误；
5. analyzer 的 `NO_GO_REDESIGN` 是原冻结四门合取后的机器路由，**不是项目级“重造
   温度计”授权**。更准确的项目判断是：

```text
OBSERVATION_STATE_RESOLUTION_SUPPORTED_DEVELOPMENT_ONLY
DYNAMICS_CROSS_SCENARIO_COVERAGE_NOT_QUALIFIED
```

原 `analysis.json` 不得覆盖。若需要上述分层路由，应在审核后新增版本化 analyzer，
并明确其为解释权限拆分，不是对原 gate 的事后改判。

exact duplicate 的差异分布有重尾；这要求保留仪器质量通道，但不授权用 duplicate
平均替换 primary。当前实验的 A/B 是 exact duplicate，不是 paraphrase invariance
实验。

### 7.1 旧任务的正确用途

HiddenBench 与旧自然任务不是“不能用”，而是不能独自承担受控状态覆盖：

- 受控任务用于验证温度计能否区分预设的状态形态和反例；
- 自然任务用于检验 adapter、缺失语义与状态定义能否迁移；
- 两者均不要求出现同样的数值轨迹；
- 旧 raw logs 只在字段和 instrument 可比时离线投影，不伪造缺失 checkpoint。

下一步是否增加延迟信息、额外轮次或新任务，应在本文件审核后决定。不得仅因为 G3
失败就立即制造更强运动；先明确要验证“仪器响应”还是研究“自然稳定性”。

---

## 8. 资产继承与舍弃

### 8.1 必须继承

- 异质 agent、局部信息与不同响应函数；
- 讨论外部、framework-adapted 的 shadow measurement layer；
- LLM 产生 contract-owned 自报，数学层做确定投影；
- 完整微态优先、宏观态可重算；
- 监测、干预、治理权限分级；
- 非破坏性信息动作优先于压制 agent；
- 负结果、反火和稳定状态作为理论边界；
- truth firewall、随机化、独立 outcome 与 replay；
- 低复杂度优先，先复用现有 V6 路径。

### 8.2 必须舍弃或隔离

- 旧 scalar-belief Kuramoto `R` 的通用状态含义；
- `F=(1-R)+T*H`、`F=U-T*H` 的自由能解释；
- “数学不可欺骗”叙事；数学输入同样可被操纵或遗漏；
- 固定阈值跨任务/模型自然常数；
- 把共识、平滑、稳定或平衡影响直接叫健康；
- 从单次 revision 推断个体 susceptibility；
- 用 source identity diversity 冒充统计独立；
- 为了正结果事后增加维度、阈值或物理名称；
- 把工程可插拔、测试通过或 replay clean 写成构念效度。

### 8.3 可复用但必须重定义

- 历史五维状态：保留多通道思想，按当前合同重定义；
- async discussion：保留非统一发言和时间分辨思想，不自动恢复旧引擎；
- evidence pool：保留 item/exposure/lineage 结构，不继承自报质量含义；
- detector 与 termination：作为未来实验对象，不是当前观测层的默认消费者；
- same-state fork：作为响应实验能力，不是项目理论本身。

---

## 9. 未来论文与项目发展的底线

### Paper 1：有限处理效应收尾

只回答 identical-state fork 下已实现 exposure bundle 的有限结果差异，诚实保留
幸存者偏差、carrier/selection 混淆和模型批次边界。不把它扩张为通用治理。

### Paper 2：群体认知状态科学

主角是独立的多通道决策过程观测层：操作性信念、信息覆盖、讨论利用、来源依赖、
参与与影响、模型/角色异质性、成本与缺失。概率几何、稳定与运动只作为其中一个
通道及 baseline。论文贡献必须证明这些过程状态比简单 confidence/dispersion 基线
多区分了什么，并明确其面向的证据获取、强模型介入、人工升级、弃权或停止决策；
真正的决策质量仍由独立 outcome 评价。

### Paper 3：真值盲治理

只有第二阶段识别出可迁移的 action-response heterogeneity 后，才比较固定动作、
随机动作、简单规则和 state-conditioned policy。主结果必须是独立 outcome 与成本。

### 长期平台

SwarmAlpha 可以成为不同多 Agent 框架之上的认知观测与实验 sidecar。其普适性来自
合同与 adapter 的可扩展性，不来自一个统一 prompt、一个统一引擎或一个统一健康分。

---

## 10. 十条项目宪法

1. **先观察，后干预，最后治理。**
2. **操作性信念由冻结 primary self-report 定义，不由后验表现挑选。**
3. **完整微态必须保留；宏观量是投影，不是替代。**
4. **标准化接口、身份、时序和合同，不标准化任务现象与异质性。**
5. **稳定、分歧、收敛和不确定都可能是合法状态，不预设哪一个健康。**
6. **belief、choice、text、evidence 和 outcome 分层并存，冲突不得清洗。**
7. **描述量无需立即获得控制权，但必须有明确对象、反例、行动含义与证伪路径；把状态变成数字本身不是终点。**
8. **物理术语靠响应、尺度和持久性证据获得，不靠命名获得。**
9. **任何“修复”先证明它修的是合同违例，而不是刻意非标化。**
10. **项目进步以科学问题被区分和结果可使用为准，不以模块、文档或公式数量为准。**

---

## 11. 所有者审核决定与执行边界

**OWNER DECISION（2026-08-31）：**项目所有者对初稿作出以下正式裁决：

1. 接受“描述性状态本身可以是独立科学贡献”；
2. 接受 categorical contract 是第一个 adapter，不是项目永久任务边界；
3. 将当前 G3 解释冻结为：**跨场景晚期运动覆盖不足**；
4. 下一研究优先级是**自然稳定与自然运动**，不是先制造干预响应；
5. 确立测量先行原则：数字框架隔离于讨论，以严谨、直观的数学对象描述群体状态，
   并有纪律地吸收统计物理方法。治理仍是长期目标，但必须建立在合格测量和随后
   的响应证据之上，不得反向定义温度计。

这些决定授权继续开展 observation-stage 的低风险设计、离线分析和必要实现，但不
自动授权 provider 扩跑、干预实验、治理效果声称或新物理术语。下一次执行冻结前，
必须先把“自然稳定/运动”的对象、时间尺度、任务支持域、可证伪判据和最低实验写入
现有计划；优先复用当前 thermometer、trajectory 和 runner 路径，不新造大引擎。

未来 AI 和开发者必须先以本文件判断“什么不能被修掉”，再进入具体计划和代码。

**LATEST OWNER DECISION（2026-09-02；覆盖冲突的近期优先级）：**项目所有者认为，
若项目继续停留在 Agent 选择题概率、自报分布与群体离散度计算，它没有解决足够真实
的问题。后续方向冻结为多通道集体决策过程状态描述器，并优先研究信息覆盖、讨论
利用、来源依赖、影响结构以及强弱模型在非对称信息下的协同。第 11 节 2026-08-31
决定中“自然稳定与自然运动优先”的表述不再授权继续扩展 probability-only
thermometer；旧结果和合法测量保留，但它们只作为子通道、仪器案例与 baseline。

下一实现前必须先形成最小 V0 研究合同，回答：描述器的事件本体是什么；每个量允许
读取哪些在线字段；coverage 与 utilization 的分母是什么；influence 如何排除单纯
声量、顺序和身份效应；强弱模型的能力、信息、角色和权限如何分离；哪个具体动作会
因状态不同而改变；独立 outcome 与成本如何评价；什么结果会否定该表示。该 owner
decision 只冻结方向，不授权 provider 调用、新 schema、大引擎或治理有效性声称。

---

## 12. 证据与权限地图

本文不是从单一旧叙事中恢复“初心”，而是对历史实现、当前合同、实测结果和项目
所有者转述的教授指导进行受约束重建。各类来源的权限如下：

| 来源 | 本文使用方式 | 不允许据此声称 |
|---|---|---|
| Git 历史 `9b94ada`、`ae658ea` | 识别异质角色、局部信息与涌现问题的起点 | 旧金融系统已经有效 |
| Git 历史 `0664fd3`、`95e9405` | 识别外部 sidecar 和观测/建模分层 | 旧治理 runtime 已改善 outcome |
| Git 历史 `48e2713`、`0167929` | 识别外部数学坐标与 framework-agnostic 愿景，同时定位过强物理话术 | 旧 `R/T/H/F` 或“不可欺骗”成立 |
| [`DISCUSSION_THERMOMETER_V1.md`](../architecture/DISCUSSION_THERMOMETER_V1.md) | 当前观测对象、通道隔离和数学投影合同 | 构念效度或治理效度已建立 |
| [`EPISTEMIC_QUANTITY_SEMANTICS.md`](../architecture/EPISTEMIC_QUANTITY_SEMANTICS.md) | 当前量的语义、缺失与禁用推断 | 所有任务共享同一自然尺度 |
| [`SOCIAL_THERMODYNAMICS_APPLICATION_DEFINITION_AND_RESEARCH_PLAN_V1_2026-08-24.md`](../../legacy/docs/plans/SOCIAL_THERMODYNAMICS_APPLICATION_DEFINITION_AND_RESEARCH_PLAN_V1_2026-08-24.md) | 监测优先、响应后置的研究顺序 | 计划中的物理构念已经获得证据 |
| [`SWARMALPHA_WHITEPAPER_V1.md`](../strategy/SWARMALPHA_WHITEPAPER_V1.md) | 长期外部认知观测层定位 | 白皮书中的长期能力已经实现 |
| [`analysis.json`](../../results/v6_discussion_thermometer_state_space_calibration_glm46v_seed1/analysis.json) | 第 7 节的运行计数、gate 与冻结 routing | G3 失败要求重造温度计，或 G2 通过已证明普适性 |
| OWNER-RECORDED PROFESSOR GUIDANCE | 决定项目应恢复的研究顺序与描述性测量权限 | 独立可核验的教授原文或已完成同行评议 |

当前研究工作面和遗留只读边界仍以
[`ACTIVE_RESEARCH_SURFACE.md`](../ACTIVE_RESEARCH_SURFACE.md) 为导航权威；本文负责回答
研究身份与反偏航问题，不扩张可修改的代码范围。

## 13. 2026-09-14 收尾决定与保留想法

**OWNER DECISION：**停止本轮主动研究，进行文档收尾，保留已有思想、实现、论文和
实验记录。没有自动恢复日期；当前 X0 不执行，模型内部或新 agent 架构也不立项。
停止不等于已证明研究方向错误，亦不要求通过追加实验来为停止取得资格。

**OWNER-REPORTED CONTEXT：**所有者转述老师认为项目“走偏了”，并表示双方目前
缺少继续投入的精力。老师具体否定理论、问题、实现路线还是贡献强度，当前未明确；
这不是独立同行评议或已经证实的科学结论，不据此改写既有实验结果。

**OWNER IDEA / DESIGN INTENT（保留，未立项）：**

1. 所有者认为，社会热力学的应用若只停留在选择分布及其熵、散度等读数，过于浅显；
   希望有机会深入模型内部或 agent 架构。这里记录的是其研究判断与探索愿望，
   不是“内部测量必然更有价值”的已证事实，也不改变现有 belief 通道的操作性定义。
2. 模型内部与 agent 架构是可能的探索方向，尚无具体机制、可访问变量、干预方案、
   预算或评价合同。不要把这个愿望扩写成已批准的研究计划或待开发清单。
3. 保留原来的问题意识：信息不对称、群体动态、来源依赖、信息使用与权威影响的
   区别，以及异质能力/角色/访问权如何共同影响决策。统计物理语言需要可检验的
   内容；不能用术语、更多标量或更复杂工程替代科学解释。
4. 可隔离、干净的实验条件仍是底线：观测与讨论分离，在线与离线真值分离，
   agent 私有信息与公共共享分离，能力、角色、信息和发言权不能混为一个处理。
   路径追踪与完整性检查只作保障，不替代这些识别条件。
5. 保存负面结果、未决问题和刻意设计；不因收尾删除，也不把未经验证的方向包装为成果。
   第一篇、状态描述器和未来内部/架构探索的价值分别判断。

以上想法按本节保留；原理论、白皮书和历次方案仍在[想法目录](../README.md)。
这些材料是可交接的研究资产，不是所有者必须继续承担的工作。

## 14. 2026-09-17 交接前方向审查与Jev候选边界

**OWNER DECISION（最新补充）：**在完成只读审查后，所有者明确要求同时改善交接可用性、
加入一个薄的离线 Jev SemanticProbe、压缩阅读入口并推送 GitHub；这覆盖此前“代码不动”
的收尾范围，但不授权真实 provider 实验、controller 或引擎扩建。第 13 节停止决定
在该窄工程例外之外继续有效，交接不以新实验成功为前提。

**FACT：**现有较成熟资产是有限选项 HiddenBench 中的非对称信息分配、共同起点的
曝光臂比较、概率报告及答案键离线评分。后续中性／带标签机制实验保留可见上下文、
材料正文和逐调用提示词／响应；早期 fork 的完整消息记录不足。V0 的合成资格与 X0
工程边界不构成真实语义测量效度、失控预测或自适应治理成果。

**OWNER IDEA / HYPOTHESIS（保留，未立项）：**研究决策相关信息进入多智能体后如何
传播、放大、衰减、失真及被利用；探索超越提示词的 agent 私有记忆、上下文构造、
信息接纳、隔离／重连及模型内部信号与干预。U／D／C（不确定性、多样性、耦合）可作
观测候选，尚不是被验证的充分状态或控制依据；有效讨论也不能以发言量或一致度代替。

**REVIEW INFERENCE：**Jev 的 typed probability 接口有利于具体的外部判读试验，
但没有消除曝光成分混杂或提供客观语义标尺。其唯一优先候选是后续机制记录上的离线
semantic probe：固定任务候选答案、匹配每个 agent 的合法可见输入，并与同轮实验臂
响应比较。外部判读不是 agent 内部 belief；`ΔAgent − ΔProbe` 只是响应差异，不能
未经识别定义成社会影响。答案键仅用于离线评分，不能进入 probe 的输入。

接手人若明确继续，先证伪 probe 的任务相关性与增量价值；模型先验、能力、校准、
来源线索、表述、调用时间与缺失都可能解释差异。暂不统一 self-report、logprob、
外部判读和内部 probe 为通用 observer，不建立新 controller。薄接口已实现，尚未实测
或获得测量资格；代码与运行入口见项目交接页。Jev 失败或消失不影响
原曝光干预问题成立；这一黑箱分支也不表示模型内部研究已完成或已被放弃。

供应商能力说明仅为外部接口证据，不是 SwarmAlpha 的资格结果：
[Choice](https://docs.typesafe.ai/primitives/choice)、
[confidence 的分布统计定义](https://docs.typesafe.ai/confidence)、
[发布与模型参考概率评估边界](https://typesafe.ai/blog/introducing-system-one-models-and-jev)。
