# Controlled Interaction Canary V1.1 Results

日期：2026-08-29  
状态：**COMPLETED — NO-GO FOR FORMATION SCALING; WRONG-STATE PERSISTENCE CANDIDATE ONLY**

## 1. 研究问题与协议边界

V1.1 只检验一个 development 问题：移除 model-facing additive scores、改用
自然语言 observation 并修复 choice parser 后，单个四 agent 任务是否产生可解析、
可分叉且对 peer-message exposure 有选择层响应的有限轨迹。

该批不是总体效应实验、任务 replication、随机化干预或治理实验。`ISOLATED`
固定先于 `PEER`，因此不赋予 arm-order 因果解释；online prompt 不含 resolver、
outcome 或 offline diagnostic scores。

## 2. 执行事实

- model：GLM-4.6V；temperature `0`；seed `1`；thinking disabled；
- planned/provider calls：20/20；unique request IDs：20；
- attempt ledger：20 `started` + 20 `response`；failure：0；retry：0；
- parsed choices：20/20；额外字段：0；completion-ceiling hits：0；
- usage：10,449 prompt、1,122 completion、11,571 total tokens；
- run hash：`sha256:e0a14aa6d612f0581fdd0dfcf17f7a5e538cce67a4ac1a214743ad044996dfba`；
- analysis hash：`sha256:7ca93d2a5cf2a2ad1c54b25cd3eaafa45c2af47a8d6728f1d43e7c53e4e1abf6`。

因此 V1 的 parser/ceiling failure 已在此单任务 instrument canary 中消失；这只说明
本批输出合同可用，不证明任务构念或测量层已经获得外部效度。

## 3. 有限统计物理投影

令第 `t` 个 checkpoint 的选择微观态为

\[
\boldsymbol{\sigma}_t=(\sigma_{1t},\ldots,\sigma_{Nt}),\qquad
\sigma_{it}\in\{1,2,3\},\quad N=4.
\]

设 `n_(kt)` 是选择状态 `k` 的 agent 数，`p_(kt)=n_(kt)/N`。本批离线计算：

\[
C_t=\max_k p_{kt},\qquad
m_t=\frac{K C_t-1}{K-1},\quad K=3,
\]

其中 `m_t` 是有限三态 Potts-style order parameter；它只描述选择集中度，不等于
正确性、社会影响或热力学极限中的自发磁化。

这里还存在一个必须显式保留的有限尺寸事实：`N=4` 不能在 `K=3` 个状态上精确
均匀分配，最分散 occupancy 是 `(2,1,1)`，所以 raw `m` 的可达最低值为

\[
m_{\min}(4,3)=\frac{3(2/4)-1}{2}=0.25,
\]

而不是 0。本批报告冻结的 raw `m=0.625`；若未来跨 `N/K` 比较，可另外报告
`m_FS=(m-m_min)/(1-m_min)`，本批对应 `0.5`。该 finite-size normalization 是
结果审阅后补充的数学说明，不伪装成预声明主指标；在本批所有 checkpoint 的
`N/K` 相同且 raw `Delta m=0`，所以不会改变分支无响应的裁决。

精确的无放回 agent-pair 分歧率为

\[
D_t=\frac{N}{N-1}\left(1-\sum_kp_{kt}^2\right),
\]

相邻 checkpoint 的选择活动为

\[
A_{t\rightarrow t+1}=\sum_i\mathbf 1[\sigma_{it}\ne\sigma_{i,t+1}],
\]

两分支响应为 matched microstate 的 normalized Hamming distance。以上均是
descriptive finite-system quantities；本批不使用 `phase transition`、
`susceptibility`、`attractor` 或 `metastability` 作为经验结论。

`wrong supermajority` 另用 offline outcome 定义为 `C_t >= 0.75` 且唯一多数
option 错误。它是 evaluation label，不是 truth-blind state variable。当前
`analysis.json` 为实现方便把该 flag 放在每个 state object 内；后续 analyzer
应在 schema 上把 state 与 offline evaluation 分开，避免概念混淆。

## 4. 观察结果

正确 option 为 `opt_2`。所有 checkpoint 的选择向量均为
`(opt_1,opt_1,opt_1,opt_2)`：

| Checkpoint | Histogram (`opt_1/2/3`) | `C` | `m` | `D` | Wrong supermajority |
|---|---:|---:|---:|---:|---|
| X0 | 3/1/0 | 0.75 | 0.625 | 0.5 | yes |
| ISOLATED R1 | 3/1/0 | 0.75 | 0.625 | 0.5 | yes |
| ISOLATED R2 | 3/1/0 | 0.75 | 0.625 | 0.5 | yes |
| PEER R1 | 3/1/0 | 0.75 | 0.625 | 0.5 | yes |
| PEER R2 | 3/1/0 | 0.75 | 0.625 | 0.5 | yes |

由此得到：四个相邻 branch transitions 的 `A=0`；R1/R2 的 branch Hamming
divergence 都为 `0`；Potts order difference 也都为 `0`。预声明资格裁决为
`NO_INTERACTION_SIGNAL`。

一个 post-hoc、仅词面的 diagnostic 是：8 个 PEER rationales 中 7 个字面包含
`peer/peers`，而 8 个 ISOLATED 和 4 个 X0 rationales 中均为 0。它说明模型输出
读取并复述了 peer block；它不证明 peer content 改变了 latent belief，也不能把
选择不变误写为“没有任何语言层响应”。

## 5. 优先证伪后的解释

### FACT

1. 自然语言任务在 `X0` 已产生 3/4 错误超多数，而不是由讨论从异质非错误态
   进入错误态。
2. 两轮重复与 peer exposure 均未改变任何 agent 的 categorical choice。
3. 多数错误 agent 在 PEER rationale 中引用 peer support；唯一正确 agent 保持
   `opt_2`，并在第二轮明确反驳其他 peer 缺少 flow evidence。

### INFERENCE

当前最简单解释是各 agent 的私有 observation 已把选择锁定，peer reports 主要被
用于事后论证，而未提供足以跨越 choice boundary 的新观测。重复更多相同轮次大概率
只会复制零活动，因此不是高信息增益的下一步。

### 不能得出的结论

- 不能说 peer interaction 形成或稳定了 wrong consensus；
- 不能说观察到了 attractor 或 metastable phase；
- 不能说 `m=0.625` 比其他状态更好或更坏；正确性来自独立 resolver；
- 不能从一个任务、一个 seed、固定 arm order 推广到其他任务或模型；
- 不能把 75% wrong supermajority 称为 unanimity consensus。

## 6. 裁决与最小下一步

**NO-GO for scaling the current formation protocol to eight variants.** V1.1 解决了
输出工具问题，但没有获得 interaction-driven formation signal，而且 task-bank 的
offline constructed initial histogram 没有预测自然语言模型的实际 X0。

该任务可保留为一个 **wrong-state persistence candidate**。信息增益最高的下一步
不是加讨论轮数，也不是恢复抽象 `ATTACKS/SUPPORTS`，而是从已冻结的同一 X0
checkpoint 单独增加一个最小 `NEW_INDEPENDENT_OBSERVATION` 分支：向四个 agent
披露此前未见、独立 lineage 的 flow-meter observation，观察是否从 3/4 wrong
state 脱离。第一轮只需四个新调用，并与现有 X0→ISOLATED R1 作为 development
reference 比较；若无 agent escape，则停止该 task；若出现 escape，再冻结带
carrier/process control 的 randomized recovery experiment。这个四调用 proposal
不由本报告授权。

这一顺序对应统计物理上的有限响应测试：先观察冻结微观态，再施加定义清楚的
外部信息扰动，最后测量 `Delta m`、`Delta D`、activity 和 truth-dependent escape；
只有跨任务、跨 dose 重复后，才讨论 susceptibility 或 recoverability 曲线。
