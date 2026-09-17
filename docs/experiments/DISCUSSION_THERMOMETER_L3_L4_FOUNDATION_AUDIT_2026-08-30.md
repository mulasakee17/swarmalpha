# Discussion Thermometer L3--L4 地基审计与资格合同

日期：2026-08-30  
状态：**L3 MATHEMATICAL AUDIT COMPLETE / L4 MEASUREMENT CONTRACT FROZEN / NO PROVIDER AUTHORITY**

本文完成当前观测层的 L3 数学审计，并冻结 L4 测量资格合同。它不设计治理动作，
不授权 provider 调用，也不把 `Social Thermodynamics` 当作已经成立的物理理论。

## 1. 已固化的新规则

根目录 `AGENTS.md` 已更新为规范性约束：

1. frozen `ClaimContract + SensorContract` 下的 canonical primary probability
   report 定义 agent 在 checkpoint 的操作性信念；
2. 它不是 hidden activation、客观正确率或已校准概率；
3. primary report 定义状态，exact duplicate 只作仪器质量元数据；
4. 缺少 duplicate 不删除 primary，缺失敏感性不编码为零；
5. public choice、文本、证据结构与 belief 是不同通道；
6. thermometer 与讨论隔离，在观测层完成前不进入 prediction/intervention/governance。

## 2. L3 数学审计

输入为 2026-08-30 M2/D1 truth-blind 重投影工件，包含 40 个状态和 30 个相邻
转移。审计结果：

| 检查 | 结果 |
|---|---:|
| max residual of `H(q)=U+J` | `1.1102230246251565e-16` |
| max residual of Potts-style order definition | `0` |
| complete matched transitions | 28 |
| max `pooled TV - mean agent TV` | `5.551115123125783e-17` |
| pooling-contraction violations above `1e-12` | 0 |
| option-permutation scalar residual | 0 |
| option-permutation pooled-vector equivariance residual | 0 |

这些结果支持实现与数学定义一致，但不等于构念效度或外部效度。

## 3. 最小状态表示已修正

完整观测态必须保留 agent-by-option probability matrix 与 roster：

\[
S_t^{obs}=(P_t,roster_t),\qquad P_t=[p_{ik,t}].
\]

最小独立宏观坐标为：

\[
M_t=(q_t,U_t,coverage_t).
\]

其中 `q_t` 已决定 `H_t`，而：

\[
J_t=H(q_t)-U_t.
\]

因此 `J_t` 是重要的解释性派生读数，但不是额外自由度。`C_t` 由 `q_t` 得出，
`m_t` 又由 `C_t` 得出。论文模型不得把 `q,U,J,H,C,m` 全部当作独立变量。

## 4. 粗粒化不可逆的明确反例

构造两个 binary、4-agent 状态：

- State A：两个 agent 报 `(p,1-p)`，两个报 `(1-p,p)`，其中
  `p=0.8899721355616403`；
- State B：四个 agent 分别报 `(1,0)`、`(0,1)`、`(0.5,0.5)`、`(0.5,0.5)`。

两状态的 `q=(0.5,0.5)`、`U=0.5`、`J=0.5` 在 `1e-12` 内相同，但：

| 量 | State A | State B |
|---|---:|---:|
| max pairwise TV | 0.77994427 | 1.0 |
| mean pairwise TV | 0.51996285 | 0.5 |

所以 `(q,U,J)` 不能唯一确定微观分歧结构。宏观量适合显示和比较，但原始 `P_t`
必须归档；若 full-microstate 明显比 macrostate 更好地保留下一步信息，应如实报告
coarse-graining 失败，而不是继续添加标量掩盖信息损失。

## 5. L4 测量资格合同

### 5.1 构念层级

| 层级 | 可回答问题 | 通过条件 | 失败含义 |
|---|---|---|---|
| operational definition | agent 自报的信念是什么 | primary 合法、claim/outcome space 冻结 | 该 checkpoint belief missing |
| mathematical validity | 外部计算是否自洽 | simplex、entropy decomposition、permutation、contraction 全通过 | 修 kernel，不跑实验 |
| instrument quality | exact repeat 对同一输入有多敏感 | 全分母报告 A/B TV 与 missingness | 限制精度；不删除 primary |
| cross-channel relation | belief 与公开选择/文本如何对应 | 通道独立记录、时序对齐 | 不一致是结果，不否定 belief 定义 |
| coarse-graining adequacy | macro 是否保留有用动力学信息 | 与 full `P_t`、choice/history baseline 做 task-heldout 比较 | 保留 microstate，弱化 macro claim |
| transport | 是否跨任务族/模型成立 | 新 task cluster 和新 model 独立复现 | 限制适用域 |

只有最后两层需要 predictive validation。不能用“未预测公开选择”反向否定
operational belief，也不能用数学恒等式正向证明 macrostate 足够。

### 5.2 下一批最小纯观测实验

下一批若获得单独 provider 授权，只允许 observation-only：

- categorical tasks，固定三轮、previous-round-only discussion；
- 每轮 public output 同时包含自然语言和一个结构化 opaque choice ID；
- 每个 checkpoint 一次 primary probability report；
- duplicate 只在预先分层抽取的质量审计子集调用，不再对全部 checkpoint 双调用；
- primary、duplicate、public choice、discussion text 分开落盘；
- 结束全部 online calls 后才打开 outcome 作离线评价；
- 不设 state-dependent early stop，不注入 ATTACKS/SUPPORTS，不触发治理。

该设计降低调用与工程量，同时允许同时估计 belief trajectory、行为 trajectory、
instrument sensitivity 和 macro coarse-graining loss。

### 5.3 预声明比较

未来分析按 task/cluster 分组，比较：

1. structural baseline：round、N、K、coverage；
2. behavioral baseline：上一轮 public choice/history；
3. minimal macro：baseline + sorted `q_t` + `U_t`；
4. full observed state：agent-level `P_t` 的 permutation-safe summary/regularized model。

若 minimal macro 未稳定优于 behavioral baseline，它仍可作为描述面板，但不能称为
具有预测充分性的 collective macrostate。若 full state 显著优于 minimal macro，
则承认低维 coarse-graining 丢失信息。

数值效应门不得从当前 10-task development 结果事后设置。必须先用 synthetic null
与冻结预算确定有限样本分辨率，再在新任务调用之前注册。

## 6. 物理术语权限

| 术语 | 当前权限 | 原因 |
|---|---|---|
| entropy | 可正式使用 | Shannon entropy 定义和分解已验证 |
| order parameter | 只能称 Potts-style derived readout | `m` 是 concentration 的重参数化 |
| thermometer | 可作为隔离观测仪器名称 | 不等于已定义物理温度 |
| temperature | 当前不能使用为经验量 | 无 energy/ensemble/response identification |
| susceptibility | 当前不能使用 | 无随机 dose-response |
| attractor/metastability/phase transition/free energy | 当前不能使用 | 无多初态、长时、尺度或势函数证据 |

## 7. L3--L4 裁决

**L3 PASS（数学实现）** — 核心恒等式、置换性质、roster 比较和 pooling contraction
通过；粗粒化非单射已由反例明确证明并写入边界。

**L4 CONTRACT COMPLETE, EMPIRICAL QUALIFICATION PENDING** — 测量资格问题、失败
含义、最小实验和分析阶梯已经冻结。当前数据仍不足以声称低维 collective
macrostate 具有跨任务预测充分性，也不授权进入干预。

对应工件：

- `results/v6_discussion_thermometer_m2_d1_reprojection_v1/mathematical-audit.json`；
- `experiments/campaign/v6/analyze_v6_discussion_thermometer_mathematical_audit_v1.ts`。
