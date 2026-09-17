# Discussion Thermometer V1：讨论状态观测层

日期：2026-08-29  
状态：**IMPLEMENTED REAL-TIME CORE / DETERMINISTICALLY TESTED / NOT EXTERNALLY CONSTRUCT-VALIDATED**

本文服从 [`REASONING_PROTOCOL.md`](../REASONING_PROTOCOL.md) 与
[`ACTIVE_RESEARCH_SURFACE.md`](../ACTIVE_RESEARCH_SURFACE.md)。本层只描述讨论，
不选择干预、不读取正确答案，也不声称改善决策质量。

## 1. 目的与边界

Discussion Thermometer 是一个与公开讨论过程隔离的影子观测层：在冻结的
checkpoint 上读取每个 agent 的规范化信念自报，形成群体微观状态、宏观读数和
相邻 checkpoint 的变化量。传感器输出不得回流到同一讨论。

这里把规范化自报定义为 agent 在该 checkpoint 的**操作性信念**。这是实验中的
状态定义，不只是随意文本特征。它仍不等于“读取模型隐藏层中的本体信念”，也不
保证概率已经校准。后两项不是建立可观测动力学所必需的前提，但会限制外部效度和
概率值的真值解释。

当前实现只支持有限、互斥、穷尽的 categorical outcome space。它不把所有任务
强行改造成选择题；连续估计、排序和开放式创作需要各自的 SensorContract 与
MetricContract。

## 2. 三层观测，而不是围绕复测组织实验

### 2.1 信念通道（主状态）

每个 agent 在 checkpoint `t` 给出一次 canonical probability report：

\[
p_{i,t}=(p_{i1,t},\ldots,p_{iK,t}),\qquad
p_{ik,t}\ge 0,\quad \sum_k p_{ik,t}=1.
\]

实现把 primary report 直接作为 `p_{i,t}`。缺少 primary report 时，该 agent
在这一 checkpoint 为 missing；不使用均匀分布、上一时刻值或零变化插补。

### 2.2 行为交叉通道（可选）

若任务原生记录了结构化公开选择 `a_{i,t}`，温度计同时报告：

- 公开选择分布及 majority share；
- `a_{i,t}` 是否属于 `argmax_k p_{ik,t}`，并列最高项按 compatible 处理；
- 可比较 agent 数与 choice coverage。

它只检查“自报信念”和“公开选择”的跨通道一致性，不修改 `p_{i,t}`，也不从
自由文本中调用另一个 LLM 猜测选择。没有结构化选择时，此通道为 unavailable。

### 2.3 仪器质量通道（可选辅助）

若同一冻结输入存在 exact duplicate report `p'_{i,t}`，记录：

\[
G_{i,t}=TV(p_{i,t},p'_{i,t})
=\frac12\sum_k|p_{ik,t}-p'_{ik,t}|.
\]

`G` 是复测差异，不是群体状态中心，也不决定 primary report 是否有效。缺少复测
只会令该 agent 的 `G` unavailable，不会把该 agent 从状态中删除。校准、Brier
和真实正确性只能在离线 outcome evaluator 中计算。

## 3. 最小状态读数

设 checkpoint `t` 有 `N_t` 个有效 primary reports。群体平均信念为：

\[
q_{k,t}=\frac1{N_t}\sum_i p_{ik,t}.
\]

归一化 Shannon entropy 为：

\[
h(p)=-\frac{\sum_k p_k\log p_k}{\log K}.
\]

V1 报告：

\[
U_t=\frac1{N_t}\sum_i h(p_{i,t}),
\qquad H_t=h(q_t),
\qquad J_t=H_t-U_t.
\]

- `U_t`：平均个体不确定性；
- `H_t`：群体 pooled belief 的不确定性；
- `J_t`：等权 generalized Jensen--Shannon divergence，表示 agent 间信念差异；
- `q_t`：不能被标量替代的群体平均信念向量；
- `coverage_t=N_t/N_expected`：观测覆盖率。

同时报告两个派生诊断：

\[
C_t=\max_k q_{k,t},\qquad
m_t=\frac{K C_t-1}{K-1}.
\]

`C_t` 与 `m_t` 完全冗余，不能在回归中同时冒充两个独立变量。pairwise TV 的
mean/max 用于显示平均分歧和尾部极化，但不属于最小状态。

因此需要区分完整观测态和最小独立宏观坐标。完整观测态是：

\[
S_t^{obs}=(P_t,roster_t),\qquad P_t=[p_{ik,t}].
\]

最小独立宏观坐标是：

\[
M_t=(q_t,U_t,coverage_t).
\]

因为 `q_t` 已决定 `H_t`，且 `J_t=H_t-U_t`，所以 `J_t` 是有解释价值的
派生读数，不是额外独立坐标；`C_t`、`m_t` 和 top margin 也由 `q_t` 派生。
`mean/max pairwise TV` 继续作为微观几何诊断，因为相同的 `q_t,U_t,J_t` 可以
对应不同的 pairwise structure。宏观投影不是一一映射，不能替代 `P_t` 归档。

## 4. 状态变化

对两端都存在的 agent 集合 `I`：

\[
A_{t\rightarrow t+1}=\frac1{|I|}\sum_{i\in I}
TV(p_{i,t},p_{i,t+1}).
\]

`A` 描述 agent-level belief activity。只有两端 expected roster 完全一致且全部
匹配时，才报告 pooled drift：

\[
V_{t\rightarrow t+1}=TV(q_t,q_{t+1}).
\]

roster 不完整时 `V=null`，避免把成员构成变化误报为群体信念漂移。实现还报告
`Delta U`、`Delta H`、`Delta J`、`Delta C` 和 `Delta m`。这些都是描述量，
不是 learning、causal influence、improvement 或 recovery。

全体 `mean(A)` 与全体 mean duplicate-TV 的差只标为 aggregate reference，不能
当作逐 agent 的测量分离。对两个端点都有 duplicate 的 agent，另报告：

\[
L_{i,t\to t+1}=TV(p^A_{i,t},p^A_{i,t+1})
-\max\{TV(p^A_{i,t},p^B_{i,t}),TV(p^A_{i,t+1},p^B_{i,t+1})\}.
\]

`L_i>0` 仅表示该 agent 的 primary 跨时运动大于两个端点各自的复测差异；它
仍不是显著性检验或无误差 latent change estimator。群体层只汇总合法可比 agent
的通过人数和比例，缺任一端 duplicate 时不把该 agent 记成零。

### 4.1 实时语义

**IMPLEMENTED** — `DiscussionThermometerTrajectoryV1` 只接受 checkpoint index
严格递增、claim/options/roster/sensor contract 不漂移的状态序列。每次 append
只产生当前 `S_t` 以及与前一个状态的 transition；追加 `S_(t+1)` 后，已有
reading 的 hash 必须逐项保持不变。因此其语义是 prefix-causal monitoring，
不是读完整轨迹后回填过去状态。

传感器既可在 checkpoint 后立即执行，也可从该 checkpoint 的冻结前缀做 exact
shadow replay。两者读取的允许信息相同；后者只是避免观测调用的延迟影响公开讨论
调度。任何方式都不得读取未来消息、ground truth 或把输出写回讨论。这里的
“实时”指状态在当前前缀即可定义和更新，不要求传感器必须与公开 agent 同时调用。

## 5. “温度计”目前不是一个伪造的温度标量

Discussion Thermometer 是仪器架构名称。当前正式数学量是 probability simplex、
entropy、JSD 和 total variation。不能把 `H`、`U` 或 `J` 任意重命名成物理温度：
统计物理中的温度需要能量模型、系综或可识别的响应关系，仅有熵不够。

因此 V1 采用多读数面板，而不是用任意权重把不确定性、分歧、集中度和覆盖率压成
一个“总温度”。如果以后随机化外场与响应曲线支持一个可识别的温度参数，再单独
定义；在此之前 `temperature`、`free energy`、`phase transition`、`attractor`
和 `susceptibility` 都不是经验结论。

## 6. 已实现、已测试、尚未知

**IMPLEMENTED**

- `src/lib/epistemic/discussionThermometer.ts`：truth-blind state/transition；
- 复用 `projectCollectiveEpistemicStateV1` 的 pooling 与 entropy decomposition；
- primary self-report、可选复测、可选结构化选择、roster/missingness、replay hash；
- prefix-causal trajectory append、合同漂移检查和历史 reading hash 不变性；
- 不含 ground truth、resolver outcome 或 intervention recommendation。

**TESTED**

- 精确宏观量与 deterministic replay；
- argmax 不变时仍能检测连续 belief movement；
- 复测缺失不删除 primary belief；
- primary 缺失不插补；
- 公开选择作为独立 cross-check；
- 非法概率向量 fail closed。
- unanimous-concentrated / unanimous-diffuse / polarization 的可分辨性；
- 相同宏观坐标下不同 pairwise geometry 的非单射反例；
- agent 更新相互抵消时 pooled drift 为零但 mean-agent TV 非零；
- 低于复测参考的运动、缺失 roster 和 partial coverage 不被伪装成完整状态；
- 实时 append 不改写历史前缀。
- 2 base × 4 information environments 的 256-cell synthetic mock 已贯通公开讨论、
  exact A/B sensor、状态投影、G0--G3 analyzer 与 replay；其权限严格为 wiring-only。

**UNKNOWN / NEXT VALIDATION**

- 自报 belief trajectory 是否在新任务和模型上稳定复现；
- 当前任务能否覆盖足够多、超出复测参考的讨论状态和晚期变化；
- 公开选择、自报概率与讨论文本之间不一致的机制；
- categorical contract 之外的任务适配。

“`S_t` 是否比上一轮公开选择更好预测下一状态”只是一项未来可选的
**coarse-graining sufficiency test**：通过时可支持把低维 `M_t` 当作有未来信息的
宏观态；失败时只否决该预测性主张，不能否决 `S_t^obs` 对当前讨论状态的描述。

这些 unknown 不妨碍把 `p_{i,t}` 定义为操作性信念，但阻止我们声称已测得模型的
prompt-invariant latent belief，或已建立通用社会热力学。
