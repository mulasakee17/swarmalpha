# Controlled Wrong-State Task Bank 科学合同 V1

日期：2026-08-29  
状态：**DESIGN CONTRACT — ZERO-PROVIDER; HUMAN SEMANTIC REVIEW REQUIRED**

## 1. 目标与非目标

本 task bank 只解决一个问题：能否在不依赖自然题库偶遇的情况下，重复产生
可审计的错误群体状态，并从完全相同的 pre-treatment state 随机分叉，识别
新观测是否使最终独立决策质量改善。

它不负责证明真实世界错误共识的发生率，不负责直接训练治理器，也不以生成
“好看的 phase diagram”为目标。task `57/64` 仅作为 development motifs，
不得进入新的 qualification denominator。

## 2. 最小任务结构

首版固定 categorical contract：`K=3`、固定 roster、固定三轮上限。每个任务
必须包含：

1. 一个所有 agent 都可见、表面有说服力但不充分的 shared cue；
2. 分布在 agent 间、来源与 lineage 显式记录的 private observations；
3. 一个在 formation 阶段不提供的 withheld observation；
4. 一个由独立 resolver 冻结的单一 outcome；
5. 三个互斥、穷尽且语义清晰的选项；
6. 任务文本不得直接要求服从多数、追求共识或提高 confidence。

shared cue 不能是任意虚假注入。它必须在不见 withheld observation 时具有合理
诊断价值，否则实验测到的只是“先骗再揭晓答案”。withheld observation 必须是
可独立获得的新观测、工具结果或受治理来源的报告；重述既有 public messages
不算验证。

## 3. 最小观测与可选 shadow channel

首轮形成实验的 primary observation 是：

- `Y_(i,t)`：公开选择 ID + 有限长度自然语言理由；
- `q_t(c)=N^{-1}\sum_i 1[Y_(i,t)=c]`：公开选择直方图。

这两项可直接观测且不依赖 ground truth。`q_t` 描述选择分布，不等同于 latent
belief、confidence 或讨论质量。concentration、normalized entropy、option
coverage 与 pairwise choice disagreement 都只是 `q_t` 的确定派生量，不作为
额外独立状态变量。既有 D1 中 probability sensor 对下一轮公开选择
不优于 public persistence baseline，因此 `p_(i,t)` 不进入最小形成实验，也不再
作为完整 collective state 的必要条件。若后续另行调用 non-participating sensor，
它只能作为不回流讨论的可选 shadow channel，并与 public trajectory 分别报告。

这一收缩同时降低调用量和构念混淆。它不是声称 choice 足以表示全部认知状态，
而是先识别最小且可审计的群体行为动力学。

## 4. Same-state formation 与错误状态

所有 agent 先从相同 shared cue 和各自 private card 产生一次初始输出，冻结为
`X_0`。随后从完全相同的 `X_0` 分叉：

- `ISOLATED`：每个 agent 只看到任务、自己的 evidence 与自己的上一轮输出；
- `PEER`：每个 agent 额外看到其他 agent 的上一轮公开输出。

两臂使用相同 model/config、roster、轮数、调用次数和 parser。这个 treatment
识别的是 **peer-message exposure 这一整体处理**；它不单独识别语义内容、token
数量、社会身份或提醒效应。为主问题预建同长度中性文本 placebo 不是必要条件，
但没有该 placebo 时不得作更细的机制主张。

对 offline resolver outcome `y*`，定义 ground-truth-blind 状态摘要
`q_t`，并在离线 evaluation 才打开错误标签。primary wrong supermajority 为：

\[
W_t^{75}=1\iff
\max_c q_t(c)\ge 3/4\ \land\ \arg\max_c q_t(c)\ne y^*.
\]

strict unanimity `W_t^{100}=1`（4/4 选择同一错误项）是 secondary。稳定错误形成
要求两个 post-fork checkpoint 由同一个错误选项占据 supermajority：

\[
F^{stable}=1\iff W_1^{75}=W_2^{75}=1
\ \land\ \arg\max q_1=\arg\max q_2.
\]

primary formation estimand 是 task-cluster 配对差：

\[
\Delta_{form}=E[F^{stable}(PEER)-F^{stable}(ISOLATED)].
\]

option-identity mirror 是位置敏感性检查，不是独立 task cluster。必须完整报告
所有 attempted clusters、mirrors、executions 和失败；不能只保留形成错误状态的
样本。

## 5. 最小 same-state recovery 实验

最关键的新增实验不是更多自然讨论轮，而是：

> 先让群体在固定协议下形成稳定错误状态，在 checkpoint `X_f` 完整冻结 public
> transcript、选择直方图和 hashes，然后随机分叉为 `WAIT` 与
> `REVEAL_WITHHELD_OBSERVATION`。

两臂共享完全相同的 `X_f`：相同任务、agent、public history、private history、
model/config 和冻结 checkpoint。随机化 unit 为完整 task-execution fork，不是
agent 或消息。

- `WAIT`：不取得新观测，继续同样的讨论预算；
- `REVEAL_WITHHELD_OBSERVATION`：取得预先冻结的新来源观测，并对所有 agent
  以相同 delivery contract 提供。

“同长度中性文本”不是这个 primary policy estimand 的必要对照，因为主问题是
“购买/取得新观测是否优于等待”。若以后要区分语义内容与额外 token、提醒或
新一轮本身，才增加 carrier-matched placebo；不为当前问题预建第三臂。

recovery 不与 formation 同批启动。只有错误状态在预先冻结的 cluster/mirror
重复规则下形成，才冻结所有 eligible pre-treatment states 并随机分叉；不得
挑选已知容易救回的 execution。

## 6. 非循环的 recoverability estimand

最小实验不依赖尚未资格化的 probability sensor。令独立 resolver 下的平均
agent 0--1 error 为：

\[
e_t=N^{-1}\sum_i 1[Y_{i,t}\ne y^*].
\]

令 `e_f` 为 frozen pre-treatment error、`e_T` 为 final error，定义：

\[
\Delta e=e_T-e_f,
\]

\[
R=E[\Delta e\mid Z=REVEAL,F_f^{stable}=1]
-E[\Delta e\mid Z=WAIT,F_f^{stable}=1].
\]

`R<0` 才表示新观测在 frozen wrong-state stratum 中减少公开选择错误。secondary
outcomes 包括 3/4 escape、4/4 escape、正确 plurality、relapse 和 agent-level
harm。若未来 probability sensor 独立通过资格化，Brier 才可作为额外 proper-loss
outcome；当前不能为了获得连续指标而把未通过构念门的 sensor 塞回 primary。
必须同时报告所有 eligible randomized states，防止只展示容易被救回的幸存状态。

这个实验允许研究者离线用真值定义 stratum，并让 treatment 携带 truth-aligned
withheld evidence，所以它只证明 **oracle-labeled recovery feasibility**。
它不证明在线 truth-blind governance；后者必须另行证明 action allocator 在
行动前不读取 `y*` 且能识别需要救援的状态。

## 7. Advancement gates 与最小预算

在数字规模由 semantic review 冻结前，不授权 provider 调用。最低资源门为：

1. 至少四个独立 task clusters，每个包含一个 option-identity mirror；
2. canary 先跑 `8 variants x 20 calls = 160 calls`：`X_0` 每 variant 4 calls，
   两个 formation arms 各 2 个 post-fork rounds、每轮 4 calls；
3. 只有至少两个 clusters 出现方向一致的 PEER-specific stable wrong formation，
   且 mirror 不显示答案位置反转，才允许对全部 8 variants 做一次冻结 replicate
   execution（再增加 160 calls）；
4. 若 PEER 不高于 ISOLATED、discordant variants 少于 3 个或效应完全由单一
   cluster/option position 主导，则 formation 假说判 `NO-GO/REVISE`，不得靠
   增加 rounds 或放宽阈值救结果；
5. recovery 只有在四个独立 clusters 均能跨 execution 重复形成预先定义的稳定
   wrong state 后才启动。每个 eligible frozen state 的 WAIT/REVEAL 两臂成本为
   `2 arms x 2 rounds x 4 agents = 16 calls`，实际总额由形成结果和新 manifest
   前瞻冻结；
6. formation denominator、失败率、重复形成率和所有 mirror sensitivity 完整报告。

`160` calls 是 development canary，不是显著性或总体外推保证。四个 clusters
只是防止再次由 task `57/64` 这样的个案触发恢复实验。任何 provider 调用仍需
单独冻结 token cap、实时价格与用户支出授权。

## 8. 人工 semantic/leakage review

每个任务由至少一名未看模型结果的人工 reviewer 检查：

- 选项互斥/穷尽，唯一答案可由 resolver 规则推出；
- shared cue 不是明示谎言，withheld observation 确实增加新信息；
- private observations 不互相逻辑矛盾，source/lineage 声明不冒充独立性；
- canonical 与 paraphrase 不改变答案、证据强弱等级或信息可得性；
- 不与 development tasks 共用实体、故事骨架、关键数字或答案模式；
- option order 可置换，答案位置在 bank 内平衡；
- reviewer 记录 `PASS / REVISE / REJECT` 和理由，不由实验结果反向修改。

当前只允许写题、审题、冻结 schema、mock 与 deterministic tests。人工确认和
新的预算/manifest 批准之前，不进入真实 formation 或 recovery run。

## 9. 当前实现状态（2026-08-29）

**IMPLEMENTED** — `controlledWrongStateTaskBankV1.ts` 已提供 4 个 base clusters
及各自 1 个 option-identity mirror，共 8 个 candidate variants；包括 content
hash、resolver/withheld truth firewall、additive evidence contract、自动结构审核
和位置平衡测试。

**TESTED LOCALLY** — 自动检查确认每题为 3 options/4 agents、按冻结 evidence
scores 构造的个体 top 异质且误导项仅占 2/4 plurality、shared+private aggregate
唯一支持 frozen outcome、
withheld observation 增大 outcome margin；正确答案位置与误导项位置在 8 variants
上均达到计数差不超过 1。这里的“支持”来自人工设定的 additive scores，不是 LLM
行为结果。

**UNKNOWN / PENDING** — 人工 semantic review 尚未接受；
`controlledWrongStateFormationV1.ts` 已完成 prompt/parser 与 provider-neutral
mock runner，160-cell artifact 可重放验证；真实 provider manifest、response 与
形成结果均未完成。对旧
HiddenBench 的 exact lexical scan 未发现当前题面实体重合，但其“共享误导线索 +
分布私有信息 + 三选一”的故事骨架存在明显 structural overlap。因此当前任务只能
标记为 engineering candidates，不能宣称 leakage-independent held-out bank。
