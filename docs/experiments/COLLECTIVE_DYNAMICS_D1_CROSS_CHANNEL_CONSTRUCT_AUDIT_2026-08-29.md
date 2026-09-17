# D1 跨通道构念审计

日期：2026-08-29  
状态：**ZERO-PROVIDER POST-HOC AUDIT — CONSTRUCT QUALIFICATION NOT MET**

> **2026-08-30 semantic addendum** — 本文的 `qualification not met` 只针对
> “probability report 对下一轮公开选择具有增量预测效度”以及“自报与公开行为可
> 合并为单一完整 latent cognition”这两个更强主张。按当前规范，冻结
> SensorContract 下的 canonical primary report 已定义为 agent 的**操作性信念**；
> 本文结果不否定该测量定义。公开选择是独立行为通道，二者不一致本身是观测结果，
> 不是删除或降格 primary belief 的理由。

## 1. 结论

**FACT** — D1 的 probability-only shadow sensor 与公开讨论不是同一个输出
通道。checkpoint `X_t` 在第 `t` 轮公开消息全部冻结之后测量，因此合法的行为
一致性问题是：

\[
p_{i,t}\longrightarrow y_{i,t+1},
\]

而不是把 `p_(i,t)` 与已经生成的 `y_(i,t)` 当作同一信息状态比较。

**FACT** — 按上述时间对齐，对 57 条下一轮公开消息做单审阅者人工 categorical
coding 后，averaged sensor unique-top 与下一轮公开选择一致 `38/57`
（66.7%）。只看存在上一轮公开行为的 `X1/X2 -> R2/R3`，sensor 为 `27/38`
（71.1%），简单的“下一轮保持上一轮公开选择”基线为 `33/38`（86.8%）。
两种预测成对不一致时，sensor-only correct 为 1，persistence-only correct 为
7；这个五任务 development 样本不支持 sensor 对公开行为具有增量预测信息。

**DECISION（按 2026-08-30 语义修订）** — 当前 `X_t` 可称冻结 instrument 下的
**operational self-reported belief state**。它不是 hidden-activation latent belief，
也不是包含公开行为、文本和证据结构的完整群体认知状态；本数据没有建立其对下一轮
公开选择的增量预测效度。恢复/治理实验继续 NO-GO，不得用 D1 的 strict escape
绕过观测层资格化。

## 2. 可重放审计工件

新增的 zero-provider builder：

- `experiments/campaign/v6/build_v6_collective_dynamics_cross_channel_review_v1.ts`；
- 输入 frozen public trajectories 与 `analysis-v1.4.json`；
- 只生成 `X0 -> R1`、`X1 -> R2`、`X2 -> R3` 三类合法配对；
- 显式记录 `opt_k <-> public label` 映射、A/B repeat tops、averaged top、
  duplicate TV、原始下一轮消息与各自 hash；
- 不复制 outcome、Brier、correctness 或 wrong-consensus 字段；
- 不自动从公开文本推断选择，避免用另一个 LLM judge 把构念问题藏起来。

D1 packet 位于
`results/v6_collective_dynamics_post_m2_bridge_v1_glm46v_seed1_attempt2/cross-channel-review-v1.json`，
包含 15 个 task-checkpoint review units，content hash 为
`sha256:64b1d9b24671c8bef34f7a21d047c31bf05cf0457f13e5261005a16023b10c78`。

## 3. 人工 coding 结果

公开消息均给出可辨识的单一选项。coding 只读取原始公开文本和冻结的 option
mapping，不读取答案。当前 coding 由 Codex 单审阅完成，不是双人独立标注，
所以是构念诊断，不是论文级 annotation evidence。

| task | `X0 -> R1` | `X1 -> R2` | `X2 -> R3` | averaged-top 合计 |
|---:|---:|---:|---:|---:|
| 36 | 1/4 | 4/4 | 4/4 | 9/12 |
| 43 | 1/4 | 1/4 | 1/4 | 3/12 |
| 50 | 2/3 | 3/3 | 3/3 | 8/9 |
| 57 | 3/4 | 3/4 | 3/4 | 9/12 |
| 64 | 4/4 | 4/4 | 1/4 | 9/12 |
| **合计** | **11/19** | **15/19** | **12/19** | **38/57** |

在 A/B unique top 完全一致的事后子集，sensor 为 `37/44`（84.1%）；其中
late pairs 为 `27/32`，恰好与同一子集上的公开选择持久性基线 `27/32`
相同，成对 discordance 为 1 对 1。这个子集由 sensor 自身稳定性事后决定，
不能替代 all-attempted 主分母，也不能证明增量效度。

## 4. 两个关键反例

### Task 64

在 `X2`，四个 agent 的 averaged sensor top 都是 `Cafeteria Food`；下一轮
公开消息中却有三个 agent 选择 `Airborne Toxin from HVAC`。因此 `X2` 没有
预示这次公开切换。`X3` 随后记录两个 agent 改报 airborne，说明传感器对已看见
第 3 轮消息后的 prompt-conditioned report 有响应；它不证明先前状态已经包含
这次切换，也不证明发生正确性恢复。

### Task 57

agent 2 在 `X1` 与 `X2` 的 A/B sensor reports 都稳定 top `Site B`，但其后
两轮公开消息都选择 `Site A`。这不是简单的同轮错位，而是同一 agent 的自报
通道与下一次公开行动持续分离。其余三名 agent 大体一致，所以 pooled state
会掩盖这一 agent-level 不一致。

## 5. 科学含义

**INFERENCE** — sensor 可能测到“在专门 probability prompt、完整已冻结 peer
context 下给出的判断”，而公开消息同时受既有发言承诺、角色私有信息、简短
回答格式和下一轮生成条件影响。两者都是真实可观测量，但不能在未经资格化时
合并为单一 latent cognition。

**FALSIFICATION RESULT** — 当前数据没有证明低维 `X_t` 比公开选择持久性更好
地保留下一轮行为信息。宏观量的数学计算可以正确，而构念仍可能不合格；这是
measurement validity 问题，不应靠增加 entropy、alignment 或物理术语解决。

## 6. 最小修复方向

1. 新 task bank 的 public response 必须在自然语言理由之外显式输出一个 frozen
   choice ID；这不是让公开通道也报概率，只是消除事后文本 coding 歧义。
2. predictive baseline 必须包含上一轮公开 choice、round 与简单 majority/
   persistence；sensor 只有在 task-heldout 上提供增量信息才通过。
3. A/B stability 作为预声明 reliability covariate 和 missingness 风险报告，
   不得事后只保留稳定样本制造高一致率。
4. 在本门通过前，reported-belief trajectory 与 public-choice trajectory 分开
   报告，不称二者共同构成已验证的 collective cognitive state。
