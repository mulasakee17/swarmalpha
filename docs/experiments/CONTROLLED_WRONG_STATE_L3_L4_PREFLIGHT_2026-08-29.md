# Controlled Wrong-State L3--L4 Preflight

日期：2026-08-29  
状态：**CONDITIONAL GO FOR MOCK/REVIEW; NO-GO FOR PROVIDER EXECUTION**

## 1. 本阶段真正要证伪的问题

从完全相同的初始群体状态 `X_0` 出发，仅改变是否看到 peers 的上一轮公开
消息，群体是否更容易形成并连续维持同一个错误 supermajority？

这不是“信息披露策略是否提高正确率”，也不需要先恢复 Social Thermodynamics
术语。它先识别最小的 interaction effect：

\[
X_0\xrightarrow{ISOLATED}X_2,
\qquad
X_0\xrightarrow{PEER}X_2.
\]

若两条轨迹没有系统差异，peer-induced collective-error formation 方向应停止或
重做任务科学；不能通过增加讨论轮数、放宽错误阈值或恢复 ATTACKS 来挽救。

## 2. 状态与 outcome

公开输出冻结为 `Y_(i,t)=(choiceId,rationale)`。最小 truth-blind state 是：

\[
q_t(c)=\frac{1}{4}\sum_{i=1}^{4}1[Y_{i,t}=c].
\]

`q_t` 是可观测选择分布，不是 latent belief。可由它离线确定 concentration
`C_t=max_c q_t(c)`。若需要一个标量描述公开选择分歧，只报告有限 roster 修正的
pairwise disagreement：

\[
D_t^{choice}=\frac{1}{N(N-1)}\sum_{i\ne j}1[Y_{i,t}\ne Y_{j,t}]
=\frac{N}{N-1}\left(1-\sum_c q_t(c)^2\right).
\]

`C_t`、`D_t^{choice}`、normalized entropy 和 option coverage 都是 `q_t` 的派生
摘要，不能当成四个独立 state dimensions。第一版保存完整 `q_t` 即可；不使用
alignmentR、evidence entropy、belief concentration 或 choice one-hot 上退化的
maxPairwiseTV。不需要 LLM 自报 confidence，也不需要 probability sensor。

ground truth `y*` 只在所有调用结束后的 evaluator 打开。primary wrong state：

\[
W_t^{75}=1[C_t\ge .75\land \arg\max q_t\ne y^*].
\]

stable formation 要求 `t=1,2` 都由同一错误 option 达到 3/4；4/4 unanimity 是
secondary。primary paired estimand：

\[
\Delta_{form}=E[F^{stable}(PEER)-F^{stable}(ISOLATED)].
\]

因两臂除了 peer-message exposure 外还会有输入 token/content 差异，该 estimand
只允许解释为 peer exposure package，不允许进一步声称纯 conformity、语义说服
或社会压力机制。

## 3. Candidate bank 的实现事实

实现位于 `experiments/campaign/v6/controlledWrongStateTaskBankV1.ts`。当前有
4 个 base clusters，每个有一个 option-identity mirror，共 8 个 variants。

| Cluster | Frozen outcome（base） | Misleading cue（base） | 构造的个体 top 结构 | Formation margin | Reveal 后 margin |
|---|---:|---:|---:|---:|---:|
| industrial cooling | opt_2 | opt_1 | 2/1/1 | 1.10 | 2.90 |
| network incident | opt_2 | opt_1 | 2/1/1 | 0.90 | 2.90 |
| watershed source | opt_3 | opt_1 | 2/1/1 | 0.30 | 2.00 |
| shipment delay | opt_1 | opt_3 | 1/1/2 | 0.55 | 2.45 |

上述 margin 来自题库内预先设定的 additive diagnostic scores，只说明构造满足
逻辑约束，不是模型会按分数作答的经验结果。

自动检查已经覆盖：

- 3 options、4 agents、每 agent 恰好一张 private card；
- shared cue 唯一偏向错误项，但初始错误项只是 2/4 plurality；
- shared + 全部 private evidence 唯一支持 frozen outcome；
- withheld observation 唯一支持 outcome 且增大 outcome margin；
- online projection 不含 resolver 或 withheld observation；
- mirror 保持 label/evidence score 语义，只改变 opaque option identity；
- 8 variants 的 outcome-position counts 为 3/2/3，misleading-position counts
  为 3/3/2，最大位置计数差均为 1。

当前 tests 为 6/6 pass，TypeScript `--noEmit` pass。

## 4. Leakage/semantic 证伪结果

对 HiddenBench `benchmark.json` 的当前题面实体与关键短语做 targeted lexical
scan，没有发现 coolant、administrator-token、isotope、customs 等直接重合。

但 structural overlap 明确存在：HiddenBench task 54 同样使用三选一、shared
decoy 和分布式 private information；task 61 是三选一 root-cause diagnosis；
task 65 是由分布物流线索定位唯一答案。因此：

- **FACT**：当前新题不是旧题的直接文字复刻；
- **FACT**：当前四题共享一个 `additive-diagnostic-evidence-v1` syntactic family；
- **INFERENCE**：仅靠不同故事实体不能证明 leakage-group independence；
- **DECISION**：8 variants 只能作为 engineering/development candidates，尚无
  measurement-heldout 或 confirmatory 权限。

人工 reviewer 必须在看任何模型结果前逐 cluster 回答：选项是否互斥穷尽、
resolver 是否唯一、shared cue 是否是合理噪声而非谎言、withheld 是否是新增且
可独立取得的 observation、evidence 强弱是否合理、mirror 是否等义，以及与旧
任务的结构重合是否只允许 development role。结果记录 `PASS/REVISE/REJECT`；
当前全部为 `PENDING`。

## 5. Formation canary 冻结

每个 variant：

1. 4 agents 各产生一次 `X_0`：4 calls；
2. 从同一 `X_0` 分叉为 ISOLATED/PEER；
3. 每臂再运行 2 轮，每轮 4 agents：16 calls；
4. 合计 20 calls/variant，8 variants 合计 **160 calls**。

两臂固定相同 model、temperature、thinking、roster、round count、call policy、
output schema 与 retry policy。`choiceId` 必须显式解析，不能再从自由文本猜测。
manifest 必须在真实调用前冻结 exact prompt bytes、task hashes、branch assignment、
expected calls、token cap、价格检查和全局停止条件。

canary 只作 development falsification。至少满足以下条件才允许完整 replicate：

- 至少 3 个 mirror-level paired discordances；
- 至少 2 个独立 clusters 的方向为 PEER 更易形成 stable wrong state；
- 方向不由单一 option position 决定；
- 所有 8 variants 与 invalid/missing 均进入 denominator。

若未满足，结论是 `NO-GO/REVISE`，不是“样本太小所以再多跑几轮”。若满足，
只允许对全部 8 variants 以预先冻结的新 execution identity 再运行一次，新增
160 calls；mirror 仍不作为独立 cluster。

## 6. Recovery 只冻结定义，不实现框架

只有四个 clusters 都能跨 execution 重复形成预定义 stable wrong state，才把
所有 eligible frozen checkpoints 随机分叉为 WAIT 与 REVEAL。每个 checkpoint
两臂、两轮、4 agents，成本 16 calls。

令 `e_t=4^{-1}\sum_i1[Y_(i,t)\ne y*]`，非循环 recovery estimand 为：

\[
R=E[(e_T-e_f)\mid REVEAL,F_f^{stable}=1]
-E[(e_T-e_f)\mid WAIT,F_f^{stable}=1].
\]

`R<0` 才是独立 outcome 下的恢复改善。escape/consensus 只作 secondary。
由于 treatment 使用 truth-aligned withheld observation，这最多证明 oracle-labeled
recovery feasibility，不证明 truth-blind online governance。

## 7. 当前裁决与下一步

| 项目 | 裁决 |
|---|---|
| task schema、hash、truth firewall | GO，已实现并测试 |
| evidence arithmetic 与 mirror/position checks | GO，已实现并测试 |
| semantic/leakage validity | PENDING，必须人工审核 |
| formation estimand、预算、停止条件 | GO，已冻结为 development canary |
| provider formation run | NO-GO，缺 human acceptance、真实 manifest 与用户支出授权 |
| recovery run | NO-GO，formation reproducibility gate 未发生 |
| Social Thermodynamics 强术语 | NO-GO，尚无响应面、尺度证据或可重复状态转移 |

因此最小下一步不是造新引擎，而是在现有 V6 fixed-round 路径旁使用薄的
structured-choice adapter，实现 `X_0` checkpoint 与 ISOLATED/PEER branch，先
全 mock 验证 exact same-state、truth firewall、terminal accounting 和 160-call
manifest。当前 adapter 已完成 prompt/parser 与 160-cell mock runner；真实
manifest 仍需人工 review 和 go/no-go 后才可请求实验授权。
