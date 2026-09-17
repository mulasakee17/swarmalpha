# 社会热力学应用定义与分阶段研究方案 V1

日期：2026-08-24  
状态：**OWNER-DIRECTED DESIGN DRAFT / 待教授复核；不是运行时控制授权**  
研究顺序：**监测（measurement）→ 干预响应（intervention response）→ 治理（governance）**  
适用对象：有限选项、可注册 claim、可记录证据/暴露/修订、最终可独立评分的 LLM 多智能体讨论  

> 本方案执行项目所有者 2026-08-24 的方向决定：恢复社会热力学为核心科学计划，但从应用定义和测量资格开始，不从治理效果或物理类比倒推定义。方案继承旧版本的五维状态、测量层独立、信息流干预与分层成本哲学；同时服从当前认识论合同、truth firewall 和已经观察到的负结果。

> **2026-08-24 M0 execution addendum：**项目所有者随后指示执行 Phase M0。零 provider 审计、候选量注册表与阶段裁决见 [`SOCIAL_THERMODYNAMICS_M0_ZERO_PROVIDER_AUDIT_2026-08-24.md`](../../../docs/experiments/SOCIAL_THERMODYNAMICS_M0_ZERO_PROVIDER_AUDIT_2026-08-24.md) 和 [`SOCIAL_THERMODYNAMICS_QUANTITY_CANDIDATE_REGISTRY_V1.md`](../../../docs/research/SOCIAL_THERMODYNAMICS_QUANTITY_CANDIDATE_REGISTRY_V1.md)。M0 通过 ST-0 ontology 与 synthetic non-equivalence，但未达到 ST-1；该执行不授权 provider run、detector、router、F/T/phase 或治理部署。

---

## 0. 执行裁决

### 0.1 母问题

**DESIGN INTENT**

> 在在线阶段不知道 ground truth 的多智能体讨论中，能否从可审计的个体报告、证据结构、暴露拓扑与修订轨迹，构造一个低维但不失真的群体状态；该状态能否预测群体下一步如何变化，以及面对新增信息时何时恢复、何时不动、何时被带偏？

该问题依次分为三层：

1. **监测：**把“模糊的群体讨论状态”变成有明确样本空间、仪器合同和缺失语义的数字；
2. **干预：**把随机化的新信息视为外场，估计不同初始状态下的响应，而不是把一次正确率提升直接叫治理成功；
3. **治理：**只有当状态能在未见任务上稳定预测动作响应时，才允许它参与真值盲的动作选择、停止、弃权或升级人工。

### 0.2 近期最强论文定位

**INFERENCE**

最有论文价值的近期方向不是“提出一个社会自由能”，而是：

> **A measurement-and-response science for LLM collectives：在不宣称读取模型内心的前提下，定义可观测集体状态，并用随机信息外场验证这些状态是否组织群体响应。**

这比“一个 detector + 一个 prompt 干预”的贡献更深，也比未经验证的相变叙事更可守。AAMAS 2027 将 originality、significance、soundness、reproducibility、breadth of validation 和 state-of-the-art engagement 作为核心评价维度；本方案正面围绕这些标准组织贡献，而不是靠工程复杂度增加篇幅。[AAMAS 2027 Findings assessment principles](https://warwick.ac.uk/fac/sci/dcs/aamas2027/calls/findings/)；[AAMAS 2027 submission instructions](https://warwick.ac.uk/fac/sci/dcs/aamas2027/calls/instructions/)

### 0.3 三条红线

1. **LLM 自报是 prompt-conditioned report，不是 latent belief、真实信心或客观证据质量。**
2. **任何热力学术语都必须先有操作定义和经验资格；物理类比不能替代构念效度。**
3. **治理效果必须由独立 outcome 和随机对照识别；状态变化、共识变化或自报变化都不能代替决策质量。**

---

## 1. 资产恢复：继承、修复与封存

### 1.1 应当继承的旧设计哲学

| 旧资产 | 可继承内容 | 新体系中的位置 | 依据 |
|---|---|---|---|
| 五维认知状态 `U/E/C/I/Λ` | 不把群体压成单一 belief；同时观察位置、证据、信心、稳定性和响应 | 修复为可观测微态族，不再叫完整“心理画像” | [`PAPER_PROFESSOR_VERSION.md`](../archive/paper/PAPER_PROFESSOR_VERSION.md)；[`PROFESSOR_GUIDE.md`](../archive/PROFESSOR_GUIDE.md) |
| 测量优先 | 共识不等于正确；无可靠测量则干预盲目 | 三阶段第一门：先证明读数有意义 | [`SWARMALPHA_WHITEPAPER_V1.md`](../../../docs/strategy/SWARMALPHA_WHITEPAPER_V1.md) §2.2 |
| 测量层独立 | 测量不应依赖讨论模式或治理策略 | 新投影只读规范事件，不进入 legacy runtime | [`ARCHITECTURE_V3.md`](../archive/architecture/ARCHITECTURE_V3.md) §5.2 |
| `δ` 一致性思想 | 比较不同可观测信号，而不是假装知道“正常心智” | 作为候选异常特征；必须重新做增量预测验证 | [`computeDelta.ts`](../../src/lib/thermodynamics/computeDelta.ts) |
| 非破坏性干预 | 优先改变信息流，不直接压低某 agent 权重 | 第二阶段的外场候选 | [`PROFESSOR_GUIDE.md`](../archive/PROFESSOR_GUIDE.md) §2.4 |
| 分层成本 | 确定性测量优先，昂贵语义工具按需使用 | 第三阶段的成本约束，不是第一阶段卖点 | [`MeasurementLayer.ts`](../../src/lib/thermodynamics/MeasurementLayer.ts) |
| 负结果审计 | 定义耦合、投影伪发现、治理反火都是边界资产 | 成为 null model、反证门和论文局限 | [`THEORY.md`](../archive/research/THEORY.md) §0；[`SOT.md`](../archive/SOT.md) |

### 1.2 必须修复的语义

| 历史叫法 | 修复后的定义 | 禁止解释 |
|---|---|---|
| Utility `U` | 有明确任务合同的偏好或报告分布；认识任务优先使用 categorical probability vector `P` | 未注册任务中的真实效用或内部 belief |
| Evidence `E` | 带 content identity、lineage、source、relation、exposure 的结构化集合/图 | 自报 evidence quality、字符串数量或“独立证据数” |
| Confidence `C` | 明示自报信心 telemetry；概率向量的 entropy/margin 另算 | correctness probability；单样本 calibration |
| Inertia `I` | 同一仪器下可比较的跨时点行为持续性 | 人格固执度、角色先验或先验属性 |
| Susceptibility `Λ` | 随机外场下、状态分层的因果响应函数 | `(1-I)(1-C)`；一次暴露后的个体因果属性 |
| Temperature `T` | 资格通过前只叫 **update activity / 波动活性** | provider sampling temperature 或物理温度 |
| Entropy `H` | 明确说明随机变量和样本空间的 Shannon entropy | 混乱、信息质量、证据充分性的一般同义词 |
| Free energy `F` | 当前不定义 | `U-T·H` 或任意加权和的物理自由能 |

这些修复与当前规范 [`EPISTEMIC_QUANTITY_SEMANTICS.md`](../../../docs/architecture/EPISTEMIC_QUANTITY_SEMANTICS.md) 一致。该规范已把 reported belief、derived epistemic quantity、governance estimate、behavioral telemetry、outcome evaluation 和 governance state 分为六个互斥层。

### 1.3 必须封存、不再直接进入新论文主张的资产

- legacy scalar `belief ∈ [-1,1]` 的 Kuramoto 映射；
- 旧 `F=(1-R)+T·H` 和新旧兼容路径中的 `F=U-T·H`；
- 把 `r(R,T)≈-0.96` 当协同学伺服证据的旧解释；随机向量已显示这是定义性耦合；
- 固定跨模型 detector 阈值；
- 基于角色、确信度和 floor 构造的“易感性”；
- 用 `private/shared` 可见性标签当 evidence lineage；
- 用精确 hash 唯一性计算出的近满熵 `H_E` 及其 `κ=R(1-H_E)` 控制含义；
- legacy E12、旧治理闭环和 smoke pilot 作为新测量效度或治理效应证据。

**FACT**：现有 V6 审计中 `H_E∈[0.8988,1]`，`κ` 被其主导并近退化，因此当前 `H_E/κ` 假设已 STOP，不能换名后复活。[`V6_SOCIAL_THERMODYNAMIC_RESPONSE_AUDIT_2026-08-14.md`](../../../docs/experiments/V6_SOCIAL_THERMODYNAMIC_RESPONSE_AUDIT_2026-08-14.md)

---

## 2. 应用本体：究竟在测什么

### 2.1 最小研究单元

一个可纳入研究的观测单元必须绑定：

```text
<task contract,
 claim and canonical options,
 agent execution identity,
 elicitation instrument,
 report time,
 evidence identities and lineage declarations,
 exposure graph,
 supersession/revision edges,
 interaction topology,
 resource cost,
 randomized action,
 final private report,
 offline resolution and score>
```

不存在 canonical claim/options 的开放文本不能被强行映射成概率热力学。它可以先拆成可解析 claim，或者使用另一套清楚的评价合同。

### 2.2 LLM 自报的四层分离

这是新体系最重要的定义边界。

| 层 | 可记录内容 | 认识论地位 | 允许用途 |
|---|---|---|---|
| A. 显式任务报告 | `P(option)`、top choice、utility/ranking（若合同声明） | prompt-conditioned declaration | 描述报告几何、聚合、最终 proper score |
| B. 元认知自报 | verbal confidence、claimed coverage/quality、claimed relation、理由文本 | behavioral telemetry | 测 prompt 敏感性、与行为/结果的关联；不能直接当真值 |
| C. 系统行为记录 | exposure、source/lineage、引用、revision、latency、invalid/missing | architecture-observed event | 构造传播、覆盖、更新和成本量 |
| D. 评估者信息 | correct option、resolver、Brier/accuracy、human verdict | offline outcome authority | 校准和因果效果；严禁进入在线状态或分配 |

为什么必须分开：verbalized confidence 在部分设置下可以具有校准价值，但其比较对 elicitation protocol、conditioning context 和评分方式敏感，因此只能是命名仪器下的行为读数，而不能被称为内部不确定性。[Tian et al., 2023](https://arxiv.org/abs/2305.14975)；[Kim & Kang, 2026](https://arxiv.org/abs/2605.27752)

### 2.3 仪器身份

每条自报必须携带 `instrumentId`，至少由下列字段决定：

- prompt 模板及 hash；
- 可见上下文范围和消息顺序；
- provider/model/version；
- sampling configuration；
- JSON/schema/repair policy；
- option rendering 和 probability scale；
- 是否显示他人答案、理由、信心和角色；
- 是否存在治理载体或外场。

跨仪器数值默认不可直接比较。若同一 latent construct 在两个仪器下被声称可比，必须先通过 measurement-invariance 或桥接实验。

### 2.4 缺失和失败

- invalid output、拒答、截断、repair failure 与未采集是不同缺失原因；
- 缺失不编码成 0，不用默认中性概率替代；
- 任何宏观量必须同时报告支持样本、expected/active roster 和 missingness pattern；
- 若缺失与模型、任务难度、状态或 action 相关，必须把它视为结果的一部分，而不是只做 complete-case 美化。

---

## 3. 微观状态：五维哲学的可审计重构

定义 agent `i` 在时刻 `t`、针对 claim `c` 的可观测微态：

\[
X_{i,t}^{(c)}=(P_{i,t}, E_{i,t}, C^{self}_{i,t}, I^{obs}_{i,t}, Z_{i,t}).
\]

这里不用旧 `U/E/C/I/Λ` 原符号直接冒充同一构念；保留五维思想，但重新命名权限。

### 3.1 `P`：报告位置与不确定性几何

对 `K` 个 canonical options：

\[
P_{i,t}=(p_{i,t,1},\ldots,p_{i,t,K}),\quad p_k\ge0,\quad\sum_kp_k=1.
\]

至少并列保存：

- top choice；
- normalized entropy `h(P)`；
- top-two margin；
- certainty `max(P)`；
- 全分布，而非只保留标量 top choice。

这些量是同一报告的不同几何投影，不能假装统计独立。当前 [`CollectiveEpistemicStateV1`](../../../src/lib/epistemic/collectiveState.ts) 已提供 contract-relative uncertainty、pooled belief 和 disagreement，是首选实现基础。

### 3.2 `E`：证据状态图

`E` 不再是一维 coverage/quality，而是二部或多部图：

```text
agent/report ─references→ evidence item
evidence item ─declares→ source / lineage / relation
system ─records→ exposure and supersession
```

核心可观测量候选：

- registered item coverage；
- content reuse / duplication；
- declared lineage effective count（仅 completeness=complete 时）；
- exposure coverage matrix；
- unexposed evidence mass；
- source concentration；
- relation balance（必须标 `model-self-labeled` 或 `externally-adjudicated`）；
- evidence delivery novelty（按 item/lineage，而不是按字符串数）。

“不同 source ID”只说明身份多样性，不等于误差独立。只有跨来源错误相关性的经验分析才能谈统计独立性。

### 3.3 `C_self`：自报元认知

自报 confidence、claimed evidence coverage、claimed evidence quality 分字段保存，不合成一个可信度权重。其主要研究问题是：

1. 同仪器重复时是否稳定；
2. prompt/option order/context 改变时是否敏感；
3. 是否在 held-out resolved claims 上有校准信息；
4. 是否在控制 `P` 的几何量后仍有增量信息。

若 1–4 未通过，`C_self` 仍可以作为语言行为特征，但不能叫 uncertainty sensor。

### 3.4 `I_obs`：行为持续性

对同一 agent、同一 claim、同一仪器合同下可比较的连续报告：

\[
I^{obs}_{i,t\rightarrow t+1}=1-TV(P_{i,t},P_{i,t+1}).
\]

它描述一次转移中的 persistence；不是稳定人格。角色 prompt、表达次数、被反驳次数可以作为解释变量，不能预先混入 `I_obs` 的定义。

### 3.5 `Z`：运行与拓扑上下文

`Z` 显式保存传统“五维心理量”容易漏掉的条件：

- interaction topology 和 degree；
- turn protocol / speaker selection；
- roster size `N`、option count `K`；
- model composition 和 shared-provider lineage；
- task family、信息不对称程度；
- token/latency/tool/human cost；
- round/time and stopping rule。

拓扑不能被当成无关工程变量。观点动力学研究表明，高阶互动和网络类型可以改变甚至消除表面相变；LLM 多智能体研究也已报告 topology 与 wrong-but-sure cascade 的关联。[Schawe & Hernández, 2022](https://www.nature.com/articles/s42005-022-00807-4)；[Lorenz et al., 2023](https://www.nature.com/articles/s41598-023-50463-z)；[Han et al., 2026](https://arxiv.org/abs/2601.05606)

---

## 4. 宏观状态：先定义坐标系，不急着压成总标量

### 4.1 最小描述向量 `M_t`

第一版宏观态使用“坐标族”，不定义唯一健康分数：

\[
M_t=(H_{within},H_{pool},D_{between},L_{eff},Q_{exposure},A_{update},C_{response},Z).
\]

| 坐标 | 操作定义 | 描述什么 | 不描述什么 |
|---|---|---|---|
| `H_within` | 个体 normalized entropy 的 roster-aware 均值 | 个体报告不确定性 | 群体分歧、正确性 |
| `H_pool` | equal-weight pooled distribution entropy | 聚合后的不确定性 | 个体是否一致 |
| `D_between` | `H_pool - H_within`（generalized JSD） | agent 间分歧 | 证据多样性、质量 |
| `L_eff` | `exp(H(lineage mass))`，仅 lineage complete | 声明来源的有效数量 | 统计独立性 |
| `Q_exposure` | exposure coverage/inequality/novelty 向量 | 信息流分配 | 注意、理解、采纳 |
| `A_update` | `mean_i TV(P_i,t,P_i,t+1)` | 群体更新活性 | 物理温度 |
| `C_response` | exposure-conditioned response mass HHI | 响应集中于哪些来源 | 因果影响 |
| `Z` | N/K/topology/model/task/cost | 边界条件 | 可忽略 nuisance |

`H_within`、`H_pool` 和 `D_between` 的分解有一个重要好处：它把“大家各自不确定”和“大家彼此不同”分开，避免再次用多个同源 dispersion 指标伪装多维状态。

### 4.2 序参量不是一个固定公式，而是与任务问题绑定的候选族

监测阶段可以研究三类 order parameter：

1. **认知对齐：**`1-D_between`；
2. **选择集中：**top-choice cluster 的最大相对规模；
3. **证据结晶：**报告对少量 lineage/item 的共同依赖程度。

每个序参量必须先通过：

- permutation/option-label invariance；
- 非退化范围；
- 与简单统计量的增量性；
- null simulation 基线；
- 跨 `N/K/topology` 可比性或明确的条件化形式。

传统观点动力学通常明确指定序参量、噪声控制量、susceptibility 和有限尺寸标度；仅出现一条 S 形曲线或相关峰不足以声称相变。[Melo et al., 2020](https://www.nature.com/articles/s41598-020-63929-1)；[Lorenz et al., 2023](https://www.nature.com/articles/s41598-023-50463-z)

### 4.3 何时才允许叫“温度”

第一阶段统一用 `update activity`，不使用 `temperature`。只有满足下列至少一种识别路线后，才可讨论 effective temperature：

- 有明确外生噪声参数，改变它会系统性改变波动而非只改输出格式；
- 在固定边界条件下，波动与线性响应之间出现可复现关系；
- 该关系在多个 `N` 和至少两个模型/拓扑上保留函数形式；
- 替代解释（provider sampling、prompt variability、missingness、role bias）已被对照排除。

LLM 系统中 provider sampling temperature 不能自动成为社会温度。最新相邻工作发现 LLM 群体的表面对齐可能主要由模型内在偏置而非 agent 间耦合驱动，并且不同模型的有限尺寸指数不同，这正说明必须区分 intrinsic field 与 cooperative coupling。[De Nobili, 2026](https://arxiv.org/abs/2605.10528)

### 4.4 何时才允许定义 susceptibility

把随机化、内容匹配的新信息输入定义为外场 `a`，剂量为 `h`。对预先冻结的状态坐标 `m`：

\[
\chi_m^{(a)}(s;h)=\frac{E[m_{post}-m_{pre}\mid do(a,h),S_0=s]-E[m_{post}-m_{pre}\mid do(control),S_0=s]}{h}.
\]

另行定义 outcome response：

\[
\chi_Y^{(a)}(s;h)=E[Y\mid do(a,h),S_0=s]-E[Y\mid do(control),S_0=s],
\]

其中 `Y` 可为 final-private Brier、accuracy、abstention utility 或 cost-adjusted loss。两者必须分开：群体动得多不代表动得对。

### 4.5 暂不定义自由能/势函数

在以下条件满足前，禁止定义 `F`：

1. 选择了清楚的状态变量与边界条件；
2. 观察到近似 stationary distribution 或可重复稳态；
3. 路径依赖/滞回被显式测量；
4. 候选势函数对未见轨迹具有预测或压缩价值；
5. 与非势模型、简单统计模型比较；
6. 至少跨 `N` 或 topology 进行尺度检验。

否则“自由能”只会是一个无法证伪的加权和，重演旧 `F` 的问题。

---

## 5. 第一阶段：监测资格（当前只做这一阶段）

### 5.1 阶段目标

**RQ-M1：**这些量在固定仪器下是否可重放、非退化、对重命名和缺失诚实？  
**RQ-M2：**低维宏观态是否比简单基线更好地预测下一轮状态或最终风险？  
**RQ-M3：**这种增量预测能否跨 task family、model、N、K 和 topology 保留？

监测阶段不应用治理动作，也不从 outcome 反向调整在线阈值。

### 5.2 Phase M0：旧资产与零调用测量审计

不新增 provider 调用，完成以下产物：

1. **Quantity Registry：**每个量记录定义、semantic layer、online inputs、缺失、对称性、单位/值域、可比条件、allowed use、forbidden interpretation；
2. **Asset Disposition Table：**旧 `U/E/C/I/Λ/R/T/H/F/δ` 逐项标 `reuse / adapt / quarantine / retire`；
3. **Null Model Suite：**独立随机报告、共享偏置报告、复制证据、随机拓扑、固定 top-choice 但概率几何变化、只改 option order 等；
4. **Degeneracy Audit：**range、effective rank、pairwise dependence、与简单 count/entropy 的关系；
5. **Prompt Sensitivity Audit：**同一状态至少两种等价措辞/option order，估计 instrument-induced variance；
6. **Missingness Census：**按任务、模型、round、arm、状态切片 invalid/missing；
7. **Historical Projection：**只读投影现有 V6 artifact，明确哪些字段不能重建；不把旧结果当新假设的 confirmatory evidence。

**M0 退出门：**至少两个非同源宏观坐标在历史/合成数据中非退化；所有量通过 replay、option permutation 和 fail-closed 测试；否则不启动新实验。

### 5.3 Phase M1：最小监测实验

首个付费实验只回答“状态是否成立”，不比较治理策略。建议采用顺序式设计而不是一次铺满全矩阵。

#### M1-A：仪器资格批次

- 任务：受控 categorical evidence-integration tasks；每题可精确控制 option count、证据冗余、来源相关与信息不对称；
- 条件：`K∈{3,4}`，`N∈{3,5}`，两种 topology（fully connected / sparse ring 或 hub）；
- 模型：先单一低成本模型冻结定义；第二模型只做仪器复现；
- 轮次：至少 3 个可比较时点，以识别 update activity；
- 无外部治理；只改变预先设计的微观信息条件；
- 每个条件需要多个独立 task instance，不能把多 seed 当新任务。

核心对照：

- 同总证据量，不同 lineage redundancy；
- 同 top-choice count，不同概率几何；
- 同 pooled belief，不同 within/between decomposition；
- 同信息内容，不同 exposure topology；
- 同 task，不同 prompt-equivalent instrument。

#### M1-B：自然任务外部有效性批次

在冻结 M1-A 定义后，投影到 HiddenBench 或另一种真实分布式信息任务。HiddenBench 用 65 个 hidden-profile tasks 检验分布式信息整合，并显示多种 prompting 下仍存在集体推理失败，适合作为外部任务族而非定义数据源。[Li et al., 2025](https://arxiv.org/abs/2505.11556)

### 5.4 监测阶段基线

任何“社会热力学状态”必须超过以下简单基线，才有论文价值：

- agent count / option count / round；
- top-choice majority fraction；
- pooled max probability；
- mean self-reported confidence；
- mean pairwise TV/JSD；
- raw evidence count；
- model identity + task family fixed effects；
- single-agent full-information upper/lower comparison（若任务支持）。

预测目标分开：

1. next-state prediction：`M_t → M_{t+1}`；
2. final-risk prediction：`M_t → Y_final`；
3. missing/invalid prediction；
4. state compression：低维表示是否保留对未来的增量信息。

Riedl 的信息论框架说明，时序耦合可能是虚假的；需要与 coordination-free baseline 比较，并区分表现相关的跨 agent synergy。[Riedl, 2025](https://arxiv.org/abs/2510.05174) 这支持本方案把“预测未来/增量信息”作为宏观态资格，而不是只看可视化聚类。

### 5.5 监测阶段假设与反证

| ID | HYPOTHESIS | 支持门 | 反证/停止条件 |
|---|---|---|---|
| H-M1 | within/between decomposition 非退化 | effective rank 与 held-out variability 足够 | 被一个简单 dispersion/count 近乎完全决定 |
| H-M2 | 状态对下一轮有增量预测 | task-family-heldout 优于简单基线 | 仅随机 split 有效；heldout 消失 |
| H-M3 | 自报信心含增量信息 | 控制 probability geometry 后仍改善 heldout score | prompt variance 大于 task/state variance或无增量 |
| H-M4 | evidence lineage/exposure 提供独立维度 | 在固定 report geometry 后仍改善预测 | 退化为 content count 或 completeness 太低 |
| H-M5 | 状态结构跨边界条件可描述 | 至少能用条件化/尺度项解释 N/K/topology 差异 | 每个条件需完全不同定义 |

**监测成功不等于检测器成功。** 最低成功是“把群体状态定义为可比较数字并给出边界”；更强成功才是 held-out 预测。

---

## 6. 第二阶段：随机外场与干预响应

只有监测达到现有资格阶梯的 SR-2，才进入本阶段。[`SWARMALPHA_PROJECT_DEVELOPMENT_PLAN_2026-08-22.md`](../../../docs/plans/SWARMALPHA_PROJECT_DEVELOPMENT_PLAN_2026-08-22.md) §5.5

### 6.1 干预不是治理，先作为识别工具

本阶段的目的不是证明“系统会治理”，而是测量 response surface：

```text
frozen pre-action state S0
→ randomized, matched information field A
→ immediate report/state change
→ later private outcome
```

### 6.2 外场分类

| 外场 | 作用 | 必需对照 | 解释上限 |
|---|---|---|---|
| exact re-exposure | 重复已存在内容 | no-op + carrier-only | 注意/重复暴露效应 |
| same-lineage new wording | 同源信息重新表达 | exact repeat | 表述新颖性，不是独立验证 |
| new independent observation | 新来源/工具/人工报告 | matched same-lineage | 新信息价值 |
| counter-consensus evidence | 与当前主流相反的内容 | random-content + all-content | 方向选择效应，不自动等于真值救援 |
| minority-evidence protection | 递送被低暴露的已有证据 | exposure-matched random item | 覆盖修复效应 |
| topology intervention | 改发言/可见边 | content-matched topology control | 结构响应 |

每个外场必须记录：direction、dose、novelty、lineage independence status、carrier、token length、delivery time、target、cost。

### 6.3 明确处理当前“幸存者偏差/机械增益”风险

**FACT**：当前第一篇机制实验最稳定的结果是 `ATTACKS_NEUTRAL - CONTROL` 的 selected-content re-exposure，而不是 ATTACKS 标签的增量；wrong Round-1 stratum 上效果更大，但该 stratum 使用离线正确性，不是在线 detector。[`FIRST_PAPER_MECHANISM_SEED4_RECOVERY_SENSITIVITY_RESULTS_2026-08-23.md`](../../../docs/experiments/FIRST_PAPER_MECHANISM_SEED4_RECOVERY_SENSITIVITY_RESULTS_2026-08-23.md)

因此新阶段必须额外控制：

1. **choice-set mechanical opportunity：**`K=3/4` 分层；记录原始 top choice、证据所指 option、是否增加了正确 option 的可见质量；
2. **selection advantage：**比较 selected evidence、random evidence、all evidence、matched non-selected evidence；
3. **carrier effect：**同内容 labeled / neutral / carrier-only；
4. **re-exposure effect：**exact repeat 与 genuinely new observation 分开；
5. **offline survivor stratum：**“原本会错”的分析只作 evaluator-side heterogeneous effect，不作为在线选择器；
6. **initial-correct harm：**单独报告 correct→wrong 和 wrong→correct 转移，不能只报告净 accuracy；
7. **denominator integrity：**所有随机化任务进入 planned denominator，invalid/missing 不因效果方向移除。

这会把第一篇的结果正确地降位为“外场载体资格与机制先导”，而不是社会热力学已经成立的证据。

### 6.4 最小响应实验

先冻结一个 2×3 小实验，而不是大而全：

- 两个预先定义的 state strata（由监测阶段、无 outcome 阈值搜索得到）；
- 三臂：`CONTROL / SAME-LINEAGE-REEXPOSURE / NEW-INDEPENDENT-EVIDENCE`；
- 固定 dose、长度、carrier 和执行窗口；
- primary：final-private proper loss；
- secondary：`ΔM`、wrong→correct、correct→wrong、invalid/missing、cost；
- cluster unit：task；seed 只是 execution repeat；
- task-family-heldout 冻结后再看异质性。

如果新独立证据不优于同源重复，说明“独立性/新信息”的理论机制没有得到支持；若两者均优于 control，可能主要是注意或再处理；若只在某状态有效，才形成 state-response 论文核心。

### 6.5 响应阶段门槛

| 等级 | 要求 | 允许说法 |
|---|---|---|
| R0 | 随机化和载体匹配成立 | 测得动作平均效应 |
| R1 | dose-response 可重复 | 存在经验响应曲线 |
| R2 | 预冻结状态交互在 heldout 保方向 | 状态组织干预响应 |
| R3 | 跨模型/N/topology 至少部分复现 | thermodynamic-style response candidate |
| R4 | 有限尺寸/峰位/标度与替代模型比较 | 才可讨论 crossover/critical-like behavior |

没有 R4，不声称 phase transition、critical point 或 universality class。

---

## 7. 第三阶段：真值盲治理

### 7.1 进入条件

只有冻结状态在独立随机动作数据上达到 SR-3/R2，才实现策略。治理代码不得读取 ground truth、correct option、resolver outcome、post-action state 或未来 artifacts。

### 7.2 治理动作空间从小开始

第一版只允许：

- acquire one genuinely new evidence/source/tool observation；
- expose one under-shared registered item；
- abstain / escalate to human review；
- stop without action。

不要一开始加入信誉、stake、多级路由、学习型 controller 或多步规划。

### 7.3 策略比较

冻结 policy 必须与以下基线比较：

- never act；
- always act；
- random under same budget；
- low pooled certainty；
- high disagreement；
- low lineage diversity/coverage；
- simple logistic/tree baseline；
- oracle upper bound（只在 offline 评价，绝不部署）。

主要 estimand：

\[
\Delta\;\text{cost-adjusted loss}=\Delta Y+\lambda_{token}C_{token}+\lambda_{latency}C_{latency}+\lambda_{human}C_{human}.
\]

同时报告：catastrophic-error rescue、already-correct disturbance、coverage、abstention、invalidity 和 subgroup/task-family performance。

治理是 **targeted rescue**，不是 universal booster：如果动作主要挽救 truth-blind 可识别的 would-have-failed tasks，同时不扰动 already-correct tasks，这就是理想信号；不能被 pooled mean 稀释后误判为“缺乏一般性”。

### 7.4 治理失败条件

- policy 的优势只来自模型/任务 ID 记忆；
- 在 task-family-heldout 不优于 always/never/random；
- correct→wrong harm 抵消 rescue；
- 缺失或 prompt sensitivity 被编码为低风险；
- policy 依赖 evaluator-only 字段；
- 成本后收益消失；
- 需要不断增加变量/阈值才能保持有利结果。

---

## 8. 前沿坐标与论文路线

### 8.1 前沿已经做到哪里，真实空白在哪里

| 相邻方向 | 已有工作做到了什么 | 不能直接解决什么 | SwarmAlpha 的可守空白 |
|---|---|---|---|
| MAS failure taxonomy | MAST 从多框架轨迹归纳 14 类失败，并显示简单角色/编排修补不足 | 没有 claim-relative 的连续状态、随机外场和独立 outcome 链 | 从失败标签前移到可审计状态与响应测量 |
| Hidden-profile benchmark | HiddenBench 系统测量分布式信息整合失败 | benchmark score 不等于一般群体状态；没有 response model | 把任务中的 evidence/exposure/revision 变成跨任务候选状态 |
| LLM 集体统计物理 | De Nobili 在二元格点、邻居更新和外生 sampling temperature 下估计 magnetization、susceptibility、coupling 与 bias，并做有限尺寸分析 | 不覆盖有证据 lineage、proper loss、异步暴露和治理动作的决策讨论 | 在 epistemic decision setting 中区分 intrinsic bias、information field 与 cooperative response |
| 信息论 emergence | Riedl 用 TDMI/PID 区分虚假时序耦合与 performance-relevant synergy | 不直接给出在线可读的治理状态或动作价值 | 用其思想作为宏观态“预测未来且超过 null”的资格标准 |
| LLM conformity/topology | 现有研究显示 majority、模型能力、connectivity 和 hub competence 会改变 wrong-but-sure cascade | 多为特定 debate/task 上的结果，不提供统一 evidence-state ontology | 把 topology 放入状态边界，研究函数何时保持、何时失效 |
| confidence/diversity debate | 研究表明多样初始化和显式 calibrated confidence 可改善某些 debate | confidence 是否可比依赖 elicitation；初始多样性也可能只是正确候选更常出现 | 把自报当仪器读数，分离 measurement gain、selection gain 与 discussion response |

因此不能声称“首次把统计物理用于 LLM 多智能体”或“首次测量 LLM 群体状态”。更准确、也更有价值的差异化是：

> **首次尝试在同一条可审计识别链中，把 claim-relative 概率报告、证据 lineage、实际 exposure、跨轮 revision、随机信息外场和 final-private proper outcome 连接起来，并用 held-out prediction 与 response gates 限定宏观状态的命名和治理权限。**

“首次”最终仍需在正式系统综述后审慎确认；在此之前把它视为 **candidate novelty claim**，不能写成 FACT。

### 8.2 一项科学计划，三篇递进论文

### Paper A：Measurement of Collective Epistemic States

**核心贡献：**

1. LLM 自报、行为记录、证据结构和 evaluator outcome 的本体分离；
2. within/pooled/between uncertainty 与 evidence/exposure 的宏观状态坐标；
3. prompt sensitivity、null model、缺失、非退化和跨条件测量资格；
4. state 对未来讨论轨迹/风险的 held-out 增量预测。

**最低可发表结果：**即使预测增量弱，只要给出严格测量协议、退化边界和跨模型仪器敏感性，也可形成可靠的 measurement/negative-result paper。AAMAS 2027 明确说明强负结果、资源、benchmark 或 exploratory finding 并不天然低一级，关键在科学贡献和证据强度。[AAMAS 2027 Findings](https://warwick.ac.uk/fac/sci/dcs/aamas2027/calls/findings/)

### Paper B：Response of LLM Collectives to Information Fields

**核心贡献：**冻结宏观态下的随机外场、matched carrier、new-vs-repeat evidence、state-conditioned response curve，以及跨 N/K/topology/model 的响应边界。

### Paper C：Truth-Blind Governance under Bounded Cost

**核心贡献：**把已资格化的 response model 转成获取新证据、保护少数证据、停止或升级人工的预算策略，并在独立任务族上超过 always/never/random/simple baselines。

### 当前冻结第一篇的正确位置

当前 Evidence Exposure 论文不应被强行扩成 Paper A/B。它是：

- 一个 identical-state fork 和随机外场的先导；
- selected-content re-exposure 的机制证据；
- carrier/label 分解的资产；
- 暴露机械增益和 survivor-stratum 风险的经验警示。

它不建立社会热力学状态、独立证据价值、truth-blind detector 或 adaptive governance。这样收尾反而能为新篇章提供清楚的“为什么必须研究状态—响应”转场。

---

## 9. 每项设计的证据追踪矩阵

| 设计决定 | 项目内来源 | 外部依据 | 必须通过的操作测试 |
|---|---|---|---|
| 先监测后治理 | 旧教授版、白皮书 §2.2 | MAST 显示 MAS 失败复杂且简单 orchestration 不足：[Cemri et al., 2025](https://arxiv.org/abs/2503.13657) | SR-0→SR-3 gate |
| 自报只是仪器读数 | quantity semantics；CollectiveState 注释 | verbalized confidence protocol sensitivity：[Tian et al., 2023](https://arxiv.org/abs/2305.14975)；[Kim & Kang, 2026](https://arxiv.org/abs/2605.27752) | prompt/order/test-retest + heldout calibration |
| probability geometry 不压成 scalar belief | 旧高维投影伪发现；current belief contracts | controlled debate 显示多数压力、初始多样性影响修正：[Wu et al., 2025](https://arxiv.org/abs/2511.07784) | same top choice / different distribution counterexample |
| evidence 要有 lineage/exposure | V6 schema、H_E 退化审计 | HiddenBench 的 distributed information premise：[Li et al., 2025](https://arxiv.org/abs/2505.11556) | duplication/lineage controlled tasks |
| topology 进入边界条件 | ARCHITECTURE_V3；旧 sync/async 分裂 | higher-order interaction/topology changes dynamics：[Schawe & Hernández, 2022](https://www.nature.com/articles/s42005-022-00807-4)；[Lorenz et al., 2023](https://www.nature.com/articles/s41598-023-50463-z) | ≥2 topology heldout interaction |
| 宏观态须预测未来 | CollectiveState descriptive-only 边界 | information-theoretic emergence requires coordination-free baselines：[Riedl, 2025](https://arxiv.org/abs/2510.05174) | next-state heldout incremental score |
| susceptibility 必须随机化 | response research contract | statistical-physics response/finite-size practice；LLM adjacent work：[De Nobili, 2026](https://arxiv.org/abs/2605.10528) | randomized dose + control + repeated N |
| 相变需要有限尺寸 | old phase-transition claim 未验证 | majority-vote finite-size scaling：[Melo et al., 2020](https://www.nature.com/articles/s41598-020-63929-1) | N scaling、susceptibility peak、collapse、alternative model |
| 干预先区分重复与新信息 | 当前 mechanism result | debate/coordination work shows dialogue may preserve or amplify consensus rather than add information：[Zhu et al., 2026](https://arxiv.org/abs/2601.19921) | control / same-lineage / independent-source |
| governance 比较 always/never/random | current project normative lesson | AAMAS soundness/reproducibility criteria | frozen task-family-heldout cost-adjusted policy test |

---

## 10. 实施边界与仓库映射

### 10.1 复用优先

- 复用 [`CollectiveEpistemicStateV1`](../../../src/lib/epistemic/collectiveState.ts) 作为描述性宏观态内核；
- 复用 belief contract、categorical distance/entropy、lineage completeness、exposure-conditioned revision 和 response concentration；
- 复用 V6 的 randomization、final-private elicitation、proper loss、action lifecycle 和 replay；
- 只增加投影/分析层中现有 schema 确实无法表达的字段；
- legacy [`legacy/src/lib/thermodynamics`](../../src/lib/thermodynamics) 保持只读兼容，不在其中继续堆新理论。

### 10.2 暂不实现

- 新 `SocialThermodynamicsEngine`；
- `F`、phase detector、criticality alert；
- learned router、MCV engine、reputation/stake；
- 在线自适应阈值；
- 依赖 LLM judge 的状态真值；
- 为了“看起来完整”而新增 schema、adapter 或 action arm。

### 10.3 推荐的最小新增产物顺序

1. `SocialThermodynamicQuantityCandidateV1` 研究表（文档，不是 schema）；
2. zero-provider measurement audit；
3. synthetic/null fixture generator（只有现有 fixture 不足时）；
4. read-only state projection analyzer；
5. M1 instrument protocol + preregistration；
6. 通过 M1 后才写 response protocol；
7. 通过 response heldout 后才写 governance policy。

---

## 11. 阶段门与当前下一步

### 11.1 总资格阶梯

| Gate | 目标 | 未通过时的处置 |
|---|---|---|
| ST-0 Ontology | 自报/行为/证据/outcome 分层清楚 | 停止实现，修定义 |
| ST-1 Measurement | 非退化、可重放、prompt/缺失测试通过 | 保留描述性量或淘汰 |
| ST-2 Prediction | task-family-heldout 超过简单基线 | 不进入随机外场选择，只发表边界/负结果 |
| ST-3 Response | 随机外场的状态交互 heldout 复现 | 不做治理 router |
| ST-4 Governance | 冻结策略改善 cost-adjusted loss | 不部署，只保留实验工具 |
| ST-5 Scaling | 跨 N/K/topology/model 的函数关系 | 不谈 thermodynamic law/phase transition |

### 11.2 本轮之后唯一建议动作

**只启动 Phase M0，零 provider 调用。**

首份执行性产物应是 quantity candidate registry，逐项回答：

1. 它改变哪个研究判断或未来动作？
2. 在线允许读取什么？
3. 随机变量和样本空间是什么？
4. 缺失如何表达？
5. 与现有简单量是否定义性耦合？
6. null model 下应有什么值？
7. 什么观察会证伪它？
8. 通过哪一级后才获得何种命名/控制权限？

在这张表完成并由教授/项目所有者确认前，不修改 runtime、不新增 provider 实验、不定义 `F/T/phase`。

---

## 12. 成功标准

### 最低科学成功

得到一套经过仪器敏感性、缺失和 null model 审计的群体状态描述语言，能诚实指出哪些群体状态可测、哪些不可测。即使治理效果为零，这也实现教授所说的价值：把模糊群体状态转化为有边界的数字。

### 强科学成功

少量宏观坐标在 task-family-heldout 上预测下一状态，并在随机外场下组织 response heterogeneity，超过 confidence/disagreement/count 等简单基线。

### 理论成功

跨 `N/K/topology/model` 出现可重复的响应函数、峰位或尺度关系，且能排除 intrinsic model bias、prompt instrument 和 provider noise；此后才有资格讨论 effective temperature、crossover 或 phase-transition-like behavior。

### 治理成功

在完全 truth-blind、固定预算和独立任务族上，冻结策略优于 always/never/random/simple policies，主要挽救可识别的灾难任务，同时不显著扰动 already-correct tasks。

---

## 13. 结论

**INFERENCE**

教授的方向是正确的，但“回到社会热力学”不等于回到旧公式。真正值得恢复的是旧版本最有生命力的设计哲学：把群体当动力系统、把测量层独立出来、区分个体微态与群体宏态、观察一致性与信息流、用最小外场测响应，最后才谈治理。

本方案因此把主线冻结为：

```text
可审计微态
→ 资格化宏观坐标
→ held-out 动力预测
→ 随机信息外场与响应函数
→ truth-blind、成本受限治理
→ 仅在尺度证据充分后讨论热力学定律
```

这条路比当前单一 evidence-exposure 实验更难，但它也更接近一篇能形成持续研究计划的论文：第一篇回答“群体状态能否被可靠描述”，第二篇回答“这些状态如何响应新信息”，第三篇才回答“能否据此治理”。
