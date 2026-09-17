# Post-D1 L3--L4 科学红队审计

日期：2026-08-29  
状态：**DECISION RECORD — STOP INVALID ESCALATION**

## 1. 总判定

| 候选动作 | 判定 | 直接理由 |
|---|---|---|
| 用 D1 训练/宣称 H3 continuous macrostate | **NO-GO** | late signal 由 task 64 主导，且 sensor 未优于公开持久性基线 |
| 扩大 natural HiddenBench 轮数 | **NO-GO** | 预声明 late-transition gate 已失败；更多轮不能修复构念效度 |
| 从 task 57/64 直接跑 recovery | **NO-GO** | known/development survivor selection，且 report/public channels 不完全一致 |
| 构造并人工审查 controlled wrong-state bank | **GO，零调用** | 能直接提高 formation 与 recovery 识别能力 |
| same-state oracle recovery feasibility | **CONDITIONAL GO** | 仅在 formation 与 construct gates 通过后另行冻结/授权 |
| truth-blind governance / targeted rescue | **NO-GO** | 尚无可用的 pre-action detector 或 randomized response evidence |

因此本轮完成的是 L3 的构念审计和 L4 实验识别合同，不执行 L4 provider
实验。门控失败时停止，比“先跑再解释”更能保护论文价值。

## 2. 优先证伪结果

### 2.1 测量数学正确不等于构念有效

entropy、JSD、TV、concentration 与 Brier 的实现可被确定性重算；这只证明数值
函数正确。D1 跨通道 audit 显示，在 `X1/X2 -> next public choice` 的 38 个
agent-pairs 中：

- sensor averaged top correct：27；
- previous-public-choice persistence correct：33；
- 两者都对：26；
- 仅 sensor 对：1；
- 仅 persistence 对：7；
- 两者都错：4。

样本太小，不能据此估计总体性能；但它足以否定“当前 sensor 已经明显比公开
行为基线更接近下一轮讨论状态”的说法。

### 2.2 稳定子集不能救结论

A/B unique-top 稳定的 late subset 中，sensor 和 persistence 都是 `27/32`，
discordant pair 为 1 对 1。这个结果最多说明 exact-repeat stability 有助于筛出
较一致的报告；它是 post-instrument selection，不能把其 84.4% 当作 all-agent
效度，也不能忽略 6 个不稳定/无 unique-top 的 late units。

### 2.3 Wrong consensus 存在，但构念范围比原叙事窄

task 57/64 证明 strict **reported** wrong state 可出现、持续或离开。task 57
agent 2 和 task 64 的 late switch 又证明 report 与下一次 public choice 可明显
分离。因此当前可以研究“两类可观察轨迹及其耦合”，不能直接声称一个已验证的
统一 collective cognitive macrostate。

## 3. 主要威胁与处置

| 威胁 | 当前证据 | 处置 |
|---|---|---|
| survivor/task selection | 57/64 已被结果识别；43 未重现 | 旧任务只作 motif，不进入 qualification bank |
| prompt-conditioned self-report | option/paraphrase sensitivity 已知；跨通道不增量 | 固定 instrument；公开 choice 单独记录；先做预测资格化 |
| state 非 Markov | 当前只有四 checkpoints，无 sufficient-state test | 不称 attractor/basin；future prediction 必须加入 history baseline |
| single model/seed/order | D1 仅 GLM-4.6V、seed 1、fixed order | 新模型是 replication，不是扩充当前样本；先过 task-level gates |
| post-hoc threshold | `M>0` 为 post-hoc conservative diagnostic | 不把 M 当 primary effect，不据此放宽 D1 route |
| option/text coding | public response 原为 plain text | 新 bank 显式 choice ID + rationale；旧 D1 coding 标单审阅者 |
| intervention tautology | reveal correct evidence 可能天然提高正确率 | 与同 state WAIT 随机比较，以 proper-loss change 为 primary；仍只称 oracle feasibility |
| physics overclaim | 无 scaling、dose surface、landscape evidence | entropy 可数学使用；其余物理词维持受限/禁用 |

## 4. H3 合同的修订

原 B0/B1/M/R 阶梯缺少最强的低成本行为基线。任何后续 H3 必须增加：

- `B2 = B1 + previous public choice/top histogram + per-agent persistence`；
- history baseline：至少最近两个 public checkpoints，检查 `X_t` 是否只编码已知
  history；
- primary comparison 改为 `M versus B2`，而非只对 concentration/top-margin；
- prediction target 同时报告 public choice transition 与 reported probability
  transition，不把其中一个替代另一个；
- task-heldout 与 semantic-group-heldout 为唯一外推门；row split 禁止。

若 `M` 不优于 `B2`，低维 probability geometry 可作为描述仪表，但不能称
predictively qualified macrostate。若 richer history 明显优于 `M`，说明当前
coarse-graining 丢失了必要信息。

## 5. L4 的最小许可条件

L4 不是增加工程模块，而是一个满足以下条件的随机化识别：

1. 新 task bank，development 任务完全隔离；
2. pre-treatment public/report states 与 hashes 完整冻结；
3. 全部 eligible state 按 task-execution 随机分配 `WAIT/REVEAL`；
4. final proper loss 由独立 resolver 离线计算；
5. `escape` 只作 mechanism/secondary outcome；
6. unconditional 与 pre-treatment wrong-state conditional effect 同报；
7. 不把 oracle feasibility 宣称为 truth-blind governance。

在这些条件满足前，ATTACKS、SUPPORTS、SHAM、外场、susceptibility 和治理器
均不恢复。当前最值得做的高难工作是把失败条件固定清楚，而不是消耗调用量。

