# SwarmAlpha 第二阶段 Post-M2 执行计划 V3

日期：2026-08-29  
状态：**CURRENT PLAN — POST-D1 PLANNING AUTHORITY; NO NEW PROVIDER AUTHORITY**  
研究顺序：**实时监测 → 状态空间标定 → 可选粗粒化检验 → 随机响应 → 治理**
取代范围：本文件在 M2 之后的路线、实验门和术语权限上取代
`SOCIAL_THERMODYNAMICS_STAGE2_REVIEW_PLAN_V2_2026-08-27.md`；V2 继续保留为
M0--M2 的设计与历史记录。

本计划服从 [`REASONING_PROTOCOL.md`](../../../docs/REASONING_PROTOCOL.md)、
[`ACTIVE_RESEARCH_SURFACE.md`](../../../docs/ACTIVE_RESEARCH_SURFACE.md) 和
[`COLLECTIVE_DYNAMICS_POST_M2_ENGINE_REUSE_BOUNDARY_2026-08-29.md`](../../../docs/experiments/COLLECTIVE_DYNAMICS_POST_M2_ENGINE_REUSE_BOUNDARY_2026-08-29.md)。
它不授权任何 provider 调用。

### 0.0.0 观测层纠偏（2026-08-29，当前优先级）

**DESIGN DECISION** — 暂停 formation、recovery、ATTACKS 和任何治理扩张。
当前唯一主线是先完成与讨论过程隔离的 Discussion Thermometer。规范化 primary
自报被定义为 checkpoint 上 agent 的操作性信念 `p_i(t)`；exact duplicate 只作
仪器质量元数据，缺失 duplicate 不删除 primary belief。结构化公开选择若存在，
作为独立 cross-channel readout，不从自由文本另行推断。

**IMPLEMENTED** — categorical V1 已实现
完整观测态 `S_t^obs=(P_t,roster_t)` 与最小独立宏观坐标
`M_t=(q_t,U_t,coverage_t)`；`J_t=H(q_t)-U_t`、concentration 和 order 为派生
读数，pairwise-TV 为保留的微观几何诊断。matched-roster transition、可选复测和
公开选择交叉检查已经实现。数学与语义合同见
[`DISCUSSION_THERMOMETER_V1.md`](../../../docs/architecture/DISCUSSION_THERMOMETER_V1.md)。

**BOUNDARY** — “Thermometer”是隔离观测仪器的名称，不把 entropy 任意重命名为
物理温度。当前不根据状态触发任何 action，也不以复测稳定性替代群体状态研究。

### 0.0 已执行的零调用工作（2026-08-29）

- `analysis-v1.4.json` 已把 conservative replicate-separation margin 接入
  离线 analyzer；M2 仍为 `NO_TRAJECTORY_SIGNAL`，结果为 3/15 majority-
  separated adjacent transitions、3/5 tasks，且全部发生在 `X0 -> X1`。
- D1 remaining-dev5 的任务、roster 与 209-call 预算已冻结为
  `collectiveDynamicsPostM2BridgePlanV1.ts`，并通过 mock/结构校验；该计划
  通过显式 `post-m2-bridge` flag 进入同一 provider-neutral runner，并已完成
  一次真实 GLM 执行；首次沙箱禁网失败记录保留在独立目录。
- `collectiveDynamicsTrajectoryPredictionV1.ts` 只提供 truth-blind 的 B0/B1/M/R
  特征 schema 与 option-permutation-invariant pooled vector 排序；没有拟合
  GLM，也没有在 M2 上宣称预测有效性。

### 0.0.1 D1 执行结果（2026-08-29）

**FACT** — D1 已完成 57/57 public 和 152/152 sensor valid responses。结果为
`DESCRIPTIVE_TRAJECTORY_SIGNAL`：4 次 strict persistence 和 1 次 strict escape。
但是 late majority-agent `M>0` 只来自 task `64` 一个任务；旧 known-wrong
候选 `43/57` 中只有 `57` 重现稳定 wrong state。预先定义的 H3 与 recovery
resource gates 均未通过。

**DECISION** — 停止继续扩大 natural HiddenBench rounds；不运行 ATTACKS、
corrective perturbation 或 recovery-effect 实验。下一步只允许零 provider 的
controlled wrong-state task-bank 构造与 semantic/leakage review。完整结果见
[`COLLECTIVE_DYNAMICS_D1_POST_M2_BRIDGE_RESULTS_2026-08-29.md`](../../../docs/experiments/COLLECTIVE_DYNAMICS_D1_POST_M2_BRIDGE_RESULTS_2026-08-29.md)。

### 0.0.2 Post-D1 cross-channel gate（2026-08-29）

**FACT** — 合法时间对齐是 `X_t -> Y_(t+1)`。D1 的 38 个 late agent-pairs
中，averaged sensor top 命中下一轮公开选择 27 次，上一轮公开选择持久性基线
命中 33 次；paired discordance 为 sensor-only 1、persistence-only 7。A/B
stable subset 上二者打平，但该子集不能替代 all-attempted denominator。

**DECISION** — cross-channel construct qualification 未通过。后续 H3 必须把
previous-public-choice/history 加入强基线，并分别预测 public-choice trajectory
与 reported-probability trajectory。详见
[`COLLECTIVE_DYNAMICS_D1_CROSS_CHANNEL_CONSTRUCT_AUDIT_2026-08-29.md`](../../../docs/experiments/COLLECTIVE_DYNAMICS_D1_CROSS_CHANNEL_CONSTRUCT_AUDIT_2026-08-29.md)、
[`POST_D1_L3_L4_SCIENTIFIC_RED_TEAM_2026-08-29.md`](../../../docs/experiments/POST_D1_L3_L4_SCIENTIFIC_RED_TEAM_2026-08-29.md) 和
[`CONTROLLED_WRONG_STATE_TASK_BANK_CONTRACT_V1_2026-08-29.md`](../../../docs/plans/CONTROLLED_WRONG_STATE_TASK_BANK_CONTRACT_V1_2026-08-29.md)。

### 0.0.3 L3--L4 controlled-bank preflight（2026-08-29）

**IMPLEMENTED** — 已建立零 provider 的 4-cluster/8-variant controlled
wrong-state candidate bank：每个 cluster 含一个 option-identity mirror；resolver
与 withheld observation 不进入 online projection；正确答案位置和 misleading-cue
位置均做 bank-level balance；automatic review 仍强制 `PENDING` human review。

**DESIGN DECISION** — 不把 D1 未通过资格化的 probability sensor 强行作为
完整状态。最小 formation 实验改用同一 `X_0` 的 `ISOLATED vs PEER` fork，公开
choice histogram 是 primary observable。该对照识别 peer-message exposure 的
整体效应，不声称分离了 token、提醒与社会身份机制。

**NO-GO BOUNDARY** — exact lexical scan 没有发现新题面实体与 HiddenBench
重合，但两者共享“误导 shared cue + 分布 private evidence + categorical choice”
骨架。当前 8 variants 只是 engineering candidates，不具有 held-out 或
leakage-independent 权限；human semantic/leakage acceptance、真实 manifest 与
单独支出授权之前不运行 provider。薄 adapter/mock 已实现但不构成 provider authority。

### 0.0.4 Controlled formation V1 halted pilot（2026-08-29）

**FACT** — 用户授权后，V1 在 sequence 56/160 按 fail-closed rule 停止。
sequence 56 返回额外 option 顶层字段，触发 strict parser failure；无重试，剩余
104 cells 未调用。两个 responses 命中 512-token ceiling，其中 sequence 43 虽然
schema-valid，但 choice 与 rationale 的最终推理不一致。

**PARTIAL DEVELOPMENT OBSERVATION** — 唯一完整的 industrial-cooling base/mirror
在 X0、ISOLATED R1/R2、PEER R1/R2 上逐 agent choice 完全持久，没有形成 3/4
wrong supermajority，也没有 peer-conditioned choice movement。

**DECISION** — current V1 为 `NO-GO`。不放宽 parser、不补失败 cell、不运行剩余
calls。显式 additive scores 与“只累加 supplied cards”使任务趋向个体算术，并让
peer rationale 的证据地位不清。下一版必须把 numeric scores 留在 offline
constructor，并先通过 20-call 单 variant instrument/interaction canary。完整记录见
[`CONTROLLED_WRONG_STATE_FORMATION_V1_HALTED_PILOT_2026-08-29.md`](../../../docs/experiments/CONTROLLED_WRONG_STATE_FORMATION_V1_HALTED_PILOT_2026-08-29.md)。

### 0.0.5 Controlled interaction canary V1.1（2026-08-29）

**FACT** — V1.1 已完成 20/20 GLM-4.6V calls，20/20 parsed、0 extra-field、
0 ceiling hit、0 retry。所有 checkpoint 的 choice microstate 均为
`(opt_1,opt_1,opt_1,opt_2)`；正确 option 为 `opt_2`。因此 `X0` 已是 3/4 wrong
supermajority，且 ISOLATED/PEER 两轮的 switching activity、branch Hamming
divergence 与 Potts-order difference 全为 0。

**DECISION** — 预声明裁决为 `NO_INTERACTION_SIGNAL`，不把当前 formation
协议扩大到 8 variants，不增加相同 discussion rounds。该任务只保留为
wrong-state persistence candidate。下一项最高信息增益 proposal 是从冻结 X0
施加一次真正的新 independent observation，先做四调用 escape canary；它尚未
获得 provider authority。完整结果见
[`CONTROLLED_INTERACTION_CANARY_V1_1_RESULTS_2026-08-29.md`](../../../docs/experiments/CONTROLLED_INTERACTION_CANARY_V1_1_RESULTS_2026-08-29.md)。

### 0.0.6 Controlled recovery canary（2026-08-29）

**FACT** — 从同一冻结 `X0` 注入一条新 flow-meter observation 后，4/4 GLM
responses 有效，但四个 choice 均保持 `(opt_1,opt_1,opt_1,opt_2)`；
`Delta m=0`、`Delta D=0`、activity `0`、escape `0/3`、harm `0/1`。

**DECISION** — 该单任务、单 dose probe 是 `NO_ESCAPE_OBSERVED`，不估计因果
recoverability 或 susceptibility，不继续扩大当前任务的调用。若未来继续，必须
先完成 semantic review，并使用 carrier/process-matched sham 与真正新来源的
随机化对照。完整记录见
[`CONTROLLED_RECOVERY_CANARY_V1_RESULTS_2026-08-29.md`](../../../docs/experiments/CONTROLLED_RECOVERY_CANARY_V1_RESULTS_2026-08-29.md)。

### 0.0.7 L4 同通道粗粒化 development gate（2026-08-30）

**FACT** — 当前 7-task L4 slice 已改用下一段 primary probability-report movement
作目标，而不是继续用未来公开选择评价自报。14 个 `X1/X2 -> next transition`
rows 采用 leave-one-task-out fractional-logit ridge；task 仍是 7 个推断单位。
`MACRO=(BEHAVIOR + sorted q + U)` 对 mean-agent TV 和 pooled TV 的 held-out MSE
均高于 `BEHAVIOR`，并在 `lambda=0.1/1/10` 下方向一致。完整 canonicalized `P_t`
也没有优于 MACRO。14 个目标中有 7 个为零。

**DECISION** — 当前温度计继续作为描述性 monitoring layer；不直接执行原
32-task/928-call predictive expansion。若继续动力学路线，先冻结能够按设计覆盖
初始状态空间并产生可辨晚期转移的独立任务合同，不能按运行后 movement 或正确性
选择任务。结果见
[`DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_RESULT_2026-08-30.md`](../../../docs/experiments/DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_RESULT_2026-08-30.md)。

**SCOPE CORRECTION** — 上述失败只否决“当前低维投影已经是有增量未来信息的
预测宏观态”，不否决它对当前讨论前缀的描述。实时监测才是主任务，预测只是未来
可选的 coarse-graining qualification。

**IMPLEMENTED / ZERO PROVIDER CALLS** — 当前 `DiscussionThermometerTrajectoryV1`
已实现 prefix-causal append、truth-blind/no-writeback 合同、历史 reading hash
不变性和 partial/missing 状态。零调用 state-space audit 用 9 个构造反例验证了：
一致但高/低置信状态可分；相同 `q/U/J` 可有不同 pairwise geometry；agent 更新
可以在 pooled drift 中相互抵消；低于复测参考的运动不会被标成超噪声变化。

**EXECUTED DEVELOPMENT CALIBRATION** — observation-only 标定场复用现有 trajectory engine，
不新建讨论引擎。首轮为 2 个 base scenarios × 4 个信息分配 regime = 8 variants；
每个 variant 两轮公开讨论、`X0/X1/X2` 三个 checkpoint、4 agents、全部 primary
和 exact duplicate，自报与讨论隔离，共 32 calls/variant、256 calls。人工接受和
预算授权后，GLM-4.6V 运行已完成 64/64 public、192/192 sensor terminal 与 96/96
有效 primary report。G0/G1/G2 通过，G3 失败；其冻结解释是“跨场景晚期运动覆盖
不足”，不是重造 thermometer 的授权。

### 0.0.8 自然稳定/运动 L3--L4 分型与最小复验（2026-08-31）

**IMPLEMENTED / ZERO NEW PROVIDER CALLS** — 新增真值盲离线分型，不再把 G3 的
“未跨场景复制多数运动”压成单一失败。对每个 agent 和相邻 transition 定义：

\[
a_{i,t}=TV(p^A_{i,t-1},p^A_{i,t}),\qquad
n_{i,t}=\max\{TV(p^A_{i,t-1},p^B_{i,t-1}),
TV(p^A_{i,t},p^B_{i,t})\}.
\]

仅当 `a_i,t > n_i,t + 1e-12` 才称该 agent 有 resolved motion；完整 roster 中严格
多数 agent 满足时，才称 group-level resolved majority motion。若所有 agent 都未
超过局部复测包络，只称 `within_repeatability_envelope_all_agents`，不称 latent
stability、equivalence、metastability 或 attractor。

**FACT** — 冻结的 8 条 GLM 轨迹含 16 个完整 transition：5 个 resolved-majority
motion、3 个 all-agent within-envelope、8 个 heterogeneous submajority motion。
没有任何 regime 在两个 base scenarios 都复制晚期 resolved-majority motion；但
`POLARIZED_PRIVATE_BLOCKS` 在两个 base scenarios 的 `X1 -> X2` 都落在 all-agent
复测包络内，是当前唯一跨场景 late stability candidate。两条 transition 不足以
识别 dwell time、transition hazard 或亚稳态。权威输出为
[`analysis-natural-dynamics-v1.json`](../../../results/v6_discussion_thermometer_state_space_calibration_glm46v_seed1/analysis-natural-dynamics-v1.json)。

**EXECUTED TARGETED DEVELOPMENT REPLICATION** — 该批次没有扩张为新引擎，也没有
追加历史轨迹。冻结的最小 targeted replication 使用已有两个 base scenarios，并只保留
`SHARED_CUE_PRIVATE_CORRECTION` 与 `POLARIZED_PRIVATE_BLOCKS`：4 tasks、4 agents、
4 public rounds、`X0...X4` 五个 checkpoint、每个 checkpoint primary + exact
duplicate，共 64 public + 160 sensor = 224 provider calls。必须作为一个新完整批次
执行，不能把跨日期 `X3/X4` 接到旧 `X2` 后伪装成连续轨迹。

该选择发生在看到 development 结果之后，只是同任务 targeted replication，不是
confirmatory transport。预注册反证是：若任一 base 的 polarized trajectory 不出现
至少两个连续 late all-agent envelope transition，则当前稳定候选未复现；若任一
base 的 shared-cue trajectory 没有至少一个 resolved-majority transition，则自然
运动资源也未复现。计划实现在
`experiments/campaign/v6/discussionThermometerNaturalDynamicsPlanV1.ts`；四轮 runner
在 `experiments/campaign/v6/run_v6_discussion_thermometer_natural_dynamics_v1.ts`，
manifest 在 `experiments/campaign/v6/discussionThermometerNaturalDynamicsManifestV1.ts`。
静态计划仍保持 `providerCallsAuthorized=0`、`executionAuthority=none`；实际调用仅由
用户当次明确授权和分阶段环境门控开放。零调用 preflight 的 9 项
检查全部通过，输出为
[`preflight.json`](../../../results/v6_discussion_thermometer_natural_dynamics_preflight_v1/preflight.json)。
四轮 runner 和 manifest 已通过 mock 闭环验证。显式授权后的 GLM-4.6V `batch2`
完成 64/64 public 与 160/160 sensor terminals；4 条轨迹均含 `X0...X4`，共 16 个
transition。机器化预注册判定显示：两个 polarized base 均出现至少两个连续 late
all-agent-envelope transition，两个 shared-cue base 均出现至少一个
resolved-majority transition，故 `TARGETED_REPLICATION_CRITERIA_PASS`。权威判定为
[`replication-evaluation.json`](../../../results/v6_discussion_thermometer_natural_dynamics_glm46v_seed1_batch2/replication-evaluation.json)。
这仍是 post-development、same-task observation-resource replication，不是跨任务
transport，也不识别 latent stability、dwell time、hazard、attractor、metastability、
正确性、干预效果或治理价值。

---

## 0. 结论先行

### 0.1 当前科学判断

**FACT** — M2 证明了冻结 public trajectory、独立 shadow sensor、概率几何
投影、缺失保持和离线 outcome 分离可以端到端运行。它没有识别出 strict
wrong-consensus 的 entry、persistence、escape 或 relapse。

**POST-HOC DIAGNOSTIC** — 用比原分析更保守的重复测量分离定义复查 M2：
15 个相邻 transition 中，只有 3 个 transition 出现“多数 agent 的最小
cross-time A/B 距离仍大于两端最大 within-time duplicate 距离”，且三者
全部是 `X0 -> X1`，来自 task `1/8/15`。`X1 -> X2` 与 `X2 -> X3` 均没有
多数-agent 的 replicate-separated transition。这不是预注册结果，但它
强烈提示 M2 的主要可辨移动可能是首次 peer-view exposure，而不是持续多轮
动力学。公式、逐 transition 重算边界和非预注册身份已追加到
[`COLLECTIVE_DYNAMICS_M2_TRAJECTORY_RESULTS_2026-08-28.md`](../../../docs/experiments/COLLECTIVE_DYNAMICS_M2_TRAJECTORY_RESULTS_2026-08-28.md)。

**DECISION** — 不进入 M3 corrective perturbation，不恢复 ATTACKS，不建设
新 thermodynamics engine。先回答监测层自己的问题：

> 在固定、独立的概率仪器下，低维 reported-belief macrostate 是否保留了
> 当前讨论前缀中可重放的群体信念几何，能否分辨不同讨论状态，并检测超过
> 同快照复测差异的状态变化？

“是否比行为历史更好预测下一轮变化”后移为可选问题；它只决定低维投影能否
获得 predictive/sufficient macrostate 的更强称谓，不决定实时描述层是否成立。

### 0.2 当前最有价值的下一步

D1、controlled formation/interaction/recovery canaries 和 L4 七任务同通道分析均已
完成。下一步不再扩大自然 HiddenBench，也不继续当前 wrong-state canary。最高
信息增益工作是执行已经冻结的 observation-only state-space-coverage task contract：
按信息分配结构预注册不同初始微态条件，保留相同 shadow thermometer，只检验是否
出现跨任务、超出复测参考的状态分离与晚期转移。任务不能按运行后的 movement、
Brier 或 wrong-state 结果筛选。首轮预检已冻结为 8 variants/256 calls，复用原
trajectory engine；题目内容和人工语义审核完成前不运行。若产生足够状态覆盖，
可以选择是否再做 macro prediction；即便不做，描述性监测结果仍独立成立。
recovery 和治理继续后置，真实执行仍须单独冻结 manifest、成本和用户授权。

---

## 1. 竞争格局与论文定位更新

### 1.1 不能再把什么当主要创新

Okawa 的 ICML 2026 工作已经用 Ising/Potts 型离散 choice、sampling
temperature、conformity、agent heterogeneity、有限群体 crossover 和多轮
实验研究 biased consensus emergence，并公开了 synthetic、investment 与
LLM-as-a-judge 路径。其论文报告 6/10/11-agent、多轮、temperature sweep 和
大量重复实验。因此以下主张不能再作为 SwarmAlpha 的核心新颖性：

- “首次把物理模型用于 LLM 多 agent 共识”；
- “首次观察 LLM 群体偏置或错误共识”；
- 单纯以 temperature sweep、magnetization 或 phase diagram 为贡献；
- 把有限任务上的集中化直接命名为 phase transition。

权威入口：
[Okawa, *Emergence of Biased Consensus in Multi-Agent LLM Debates*, ICML 2026](https://arxiv.org/abs/2608.02827)，
[official code](https://github.com/phys-ai/llm-biased-consensus)。本次审计未确认
该代码库的复用许可证，因此当前只复用论文协议思想，不复制代码。

### 1.2 SwarmAlpha 仍可能成立的差异化贡献

候选贡献不是另一个 spin model，而是以下识别链：

```text
message-only public deliberation
    -> immutable checkpoint
    -> non-participating private probability instrument
    -> categorical distribution matrix P_t
    -> deterministic low-dimensional macro-observables X_t
    -> held-out future-information test
    -> randomized information response
    -> truth-blind action allocation and independent outcome
```

它与现有工作的差异在于：

1. 监测不进入讨论，不改变后续 public trajectory；
2. 微观观测是完整 categorical probability report，不只是 discrete choice；
3. 描述性 state 的命名来自明确定义的观测坐标与复测边界，不来自设计标签或
   图形相似；held-out prediction 只资格化更强的 predictive macrostate 称谓；
4. outcome 和真值只在离线打开；
5. 最终目标是选择新证据、工具、人工复核、弃权或停止，而不是普遍提高共识。

Du 等人的 ICML 2024 multi-agent debate 可复用固定轮、同模板和多轮黑盒
交互结构，但性能提升不是状态有效性证据：
[Du et al., ICML 2024](https://proceedings.mlr.press/v235/du24e.html)。

Tian 等人的 verbalized probability 结果支持“显式概率可作为黑盒 sensor”
这一可能性，但其校准结论依赖模型、任务和 prompt，不能自动转移到本项目：
[Tian et al., EMNLP 2023](https://aclanthology.org/2023.emnlp-main.330/)。

---

## 2. 研究问题、构念与 claim ceiling

### 2.1 Mother question

> 在在线阶段不读取 ground truth 的条件下，一个不参与讨论的外部数学层，
> 能否从当前讨论前缀的显式报告中构造可重放、可比较的群体状态与变化读数；
> 在完成状态空间标定后，这些读数是否还足以组织随机信息动作的异质响应？

### 2.2 Post-M2 假设层级

**H-MONITOR（当前主）** — 在不读取未来消息、ground truth 或干预输出的条件下，
`S_t^obs=(P_t,roster_t)` 可在 checkpoint `t` 确定；不同信息分配条件产生的实际
状态差异与 `X1 -> X2` 状态变化，能够在多个 base scenarios 上超过同快照复测
参考。设计 regime 不是状态真值，未产生预期几何的 variant 仍保留在分母中。

**H3-CONTINUOUS（可选粗粒化资格）** — 相比只使用 round、roster、option count、pooled
concentration 和 top margin 的简单基线，加入 within/between probability
geometry 后，能在 task-heldout 数据上更好预测下一 transition 的
`update activity` 或 `pooled drift`。

**H3-RISK（远期次要）** — 同一 truth-blind state 相比简单 confidence/majority
基线，对 final offline Brier risk 有增量预测信息。

**H-WRONG（开发性诊断）** — 旧 joint-prompt 中 task `43/57` 的持续错误
共识是否会在新的 message-only + shadow-sensor 协议中重现。它不是新
incidence 假设，也不是 confirmatory evidence。

### 2.3 明确反证

以下情况会削弱或终止相应层级，不能混为一个总门：

- 若不同 regime 的实际 `S_t` 无法超过同快照复测差异，或所有晚期变化均被
  duplicate variability 覆盖，当前任务不能资格化动态状态空间；
- 若 macro model 不优于 concentration/top-margin/persistence baseline，只否决
  predictive/sufficient macrostate，不否决当前状态的描述与重放；
- 增量只在随机 row split 存在，在 task-heldout 或 semantic-group-heldout 消失；
- 结果由单一 task、task family、missingness、prompt position 或 provider batch 驱动；
- A-only 与 B-only replicate split 得出相反的模型排序；
- 需要事后增加物理量、阈值或自由参数才能得到正结果。

若 H3 失败，项目仍可保留为 **real-time descriptive shadow measurement
system**，但不能把 `M_t` 称为 sufficient/predictive macrostate。只有连
H-MONITOR 的分辨力、复测边界和跨任务覆盖也失败，才否决当前温度计作为经验
研究工具的价值。

---

## 3. 数学对象与变量冻结

### 3.1 微观底账

对 task、agent `i`、checkpoint `t` 和 repeat `r in {A,B}`：

\[
p_{i,t}^{(r)}\in\Delta^{K-1}.
\]

完整 `P_t`、option mapping、roster、missingness、instrument identity 和
checkpoint hash 是重算底账。任何宏观摘要均不能替代这些记录。

### 3.2 真值盲宏观量

当前状态只用 canonical primary report `p_(i,t)=p^(A)_(i,t)` 构造；duplicate
`p^(B)` 只进入仪器质量通道，不参与定义状态，也不决定 primary 是否存在：

\[
\bar p_t=\frac1{N_t}\sum_i p_{i,t},\qquad
U_t=\frac1{N_t}\sum_i H_K(p_{i,t}),
\]

\[
J_t=H_K(\bar p_t)-U_t,\qquad
C_t=\max_y\bar p_t(y).
\]

其中 `H_K` 为 normalized Shannon entropy。`J_t` 是 generalized-JSD
decomposition，不是语义冲突、社会张力或证据独立性。

相邻可比较 roster 上：

\[
A_{t+1}=\frac1{|I_t|}\sum_{i\in I_t}
TV(p_{i,t},p_{i,t+1}),
\]

\[
D_{t+1}=TV(\bar p_t,\bar p_{t+1}).
\]

`A` 是 agent-report update activity，`D` 是 pooled drift；两者都不是
learning、influence 或 correctness。早期 M2/L4 analyzer 对 A/B 取均值属于
已有 development analysis 的方法选择，不再作为 V1 温度计状态定义。

### 3.3 新增但不增加 LLM 调用的可靠性量

对完整 A/B endpoint，实时监测层定义：

\[
G_{i,t}=TV(p_{i,t}^{(A)},p_{i,t}^{(B)}),
\]

\[
L_{i,t\to t+1}=TV(p_{i,t}^{(A)},p_{i,t+1}^{(A)})
-\max(G_{i,t},G_{i,t+1}).
\]

`L>0` 的含义严格限制为：primary 的 cross-time movement 大于两个 endpoint
内部各自的 duplicate distance。它是逐 agent measurement-separation diagnostic，
不是显著性检验或无偏 latent-state change estimator。早期 M2 addendum 使用的
`min_(r,s) cross-time TV - max endpoint G` 是更保守的离线敏感性分析，继续保留在
旧结果中，但不改变 primary-defined 实时状态。

每个 transition 必须报告：可比较 agent 数、`L>0` 数和比例、逐 agent `L`、两端
duplicate distribution 和完整 roster status。不得只报告 pooled mean；缺任一
端 duplicate 的 agent 不进入 `L` 分母，也不被记作零。

### 3.4 预测模型中的最小表示

跨 task 时不能把 `opt_1/opt_2/opt_3` 当成共享语义坐标。第一版仅支持同一
`K`，并使用 option-permutation-invariant 表示：

\[
Z_t=(sort(\bar p_t)_{1:K-1},U_t,round,N,coverage).
\]

`J_t` 继续报告，但当完整 sorted pool 和 `U_t` 已进入模型时，`J_t` 是确定
派生量，不再作为额外回归变量，以避免伪造自由度。`C_t` 和 top margin 也
由 sorted pool 派生。

### 3.5 outcome-dependent evaluation

`Brier_t`、正确性、wrong consensus 和 harm 只在全部 public/sensor 调用
结束后由 offline evaluator 打开。它们不进入 sensor prompt、public prompt、
task selection、early stopping 或 online action。

---

## 4. 分阶段执行

### P0：零调用分析闭合

难度：**L1--L2，Codex 可独立承担。**

1. 把 `M_{i,t->t+1}` 加入现有 trajectory analyzer；
2. 为 M2 生成独立 post-hoc reliability addendum，不改写预注册分类；
3. 增加 A-only、B-only 和 A/B-mean 三套 state trajectory 输出；（A/B-mean
   已用作主分析，A-only/B-only 尚未实现）
4. 实现无 provider 的 predictor scaffold 和 synthetic null tests；
5. 冻结 D1 plan、task list、roster、call order、budget 和 stop rules；
6. 将当前 hard-coded five-task literal type 适配为 plan-owned frozen task list，
   但不新增通用 experiment framework。

P0 退出条件：mock 完整跑通；旧 M2 replay 不变；truth firewall、no-overwrite、
one-terminal-per-cell 和 exact prompt bytes 测试通过。

### D1：remaining-dev5 trajectory bridge（已完成）

难度：**L2 工程 + 真实 provider 成本；已在单独授权后完成。**

协议完全复用 M2：

- task `36/43/50/57/64`；
- GLM-4.6V exact pinned instrument；
- seed 作为 execution identity，不当作新 task；
- 三个 synchronous public rounds；
- 仅上一轮 public messages 可见；
- public response 为 plain text；
- public trajectory 全部冻结后才调用 private sensor；
- `X0--X3`、每 view `A/B` exact duplicates；
- temperature `0`、thinking disabled、single attempt、no retry；
- 57 public + 152 sensor = 209 calls。

D1 只回答三件事：

1. 新 shadow protocol 下，late transition 是否在第二批 tasks 出现；
2. task `43/57` 的旧 wrong-state persistence 是否可重现；
3. M2 的 duplicate-TV 重尾是否是任务/checkpoint 局部现象还是继续出现。

实际结果与这些问题的回答见
[`COLLECTIVE_DYNAMICS_D1_POST_M2_BRIDGE_RESULTS_2026-08-29.md`](../../../docs/experiments/COLLECTIVE_DYNAMICS_D1_POST_M2_BRIDGE_RESULTS_2026-08-29.md)。

### D1 路由门

合并 first-five M2 与 remaining-five D1 后，按以下预先解释路由：

| 观察 | 路由 |
|---|---|
| 至少两个 task 在 `X1->X2` 或 `X2->X3` 出现 majority-agent `M>0`，且不全来自一个 known-wrong task | 允许准备 continuous held-out qualification；仍不称动力学已成立 |
| 只有 `X0->X1` 稳定，late transition 仍缺失 | 收缩为 immediate peer-conditioned response；停止增加自然讨论轮数 |
| task `43/57` 都在新协议下重现稳定 wrong state | 可设计小型 same-state recovery feasibility；仍属 development |
| 只有一个 known-wrong task 重现 | 不运行 recovery effect 实验；先建立新的错误状态 task bank |
| 两者均不重现 | 放弃从自然 HiddenBench dev10 建立 wrong-consensus/recoverability 主线 |
| cross-time movement 与 duplicate variability 无法分开 | 停止付费扩张，保留 descriptive monitor |

“至少两个 task”只是防止由单一任务触发下一轮工程的 development resource
gate，不是统计显著性或一般性结论。

**D1 路由结论（FACT）** — late majority-agent `M>0` 只来自 task `64` 一个
任务；`43/57` 中只有 `57` 重现稳定 wrong state。因此 H3 与 recovery 两条
资源门均未通过，按预先冻结的规则停止自然 HiddenBench 扩张。

### H3：held-out continuous-state qualification

难度：**L3，高难科学设计；执行前建议使用更强模型复核统计合同。**

只有 D1 进入第一条路由时才准备。最低要求：

- 优先 20 个新 task clusters，至少 5 个预审 semantic/leakage groups；
- 若 task-bank 审查不足，最低不得低于 16 tasks / 4 groups，且必须标记
  `underpowered_development`，不能降格后仍称 confirmatory；
- task definition、semantic group、K、N、信息分布结构和 split role 在 provider
  调用前冻结；
- 所有任务来自未进入 M0--D1 结果审查的新 groups；
- 初版固定 `K=3`，避免把不同维数概率单纯拼接；跨 K 留给后续 replication；
- 使用与 D1 完全相同的 public/sensor instrument；
- primary resampling 和 CV unit 为 task，最终以 leave-one-semantic-group-out
  作为外推检查。

调用预算不是先猜一个整数，而是从冻结 roster 计算：

\[
calls=\sum_j N_j(3+4\times2)=11\sum_jN_j.
\]

若 `N=3--5`，20 tasks 的理论范围为 660--1100 calls；任何真实执行前必须
由 manifest 给出精确分母、token 上限和用户批准的支出上限。

### H4：随机信息响应

只有 H3 显示 held-out increment 后才进入。此阶段才允许使用“外场”作为
操作定义：一个预先随机化、带 source/lineage 合同、具有明确 dose 和 delivery
time 的新信息动作。

最小三臂：

1. carrier-matched sham；
2. same-lineage re-exposure；
3. genuinely new observation/tool/human report。

处理从同一冻结 checkpoint 分叉；后续至少保留 immediate response 和一个
额外 round。`recoverability` 只在 offline wrong-state stratum 中定义为相对
sham 的 escape/Brier improvement，不把“某 arm 平均更好”重新命名为恢复。

### H5：治理

治理目标是预算约束下的 targeted rescue：选择新证据、工具、人工复核、
弃权或停止。只有预行动 truth-blind state 在 held-out randomized response
data 上预测 action heterogeneity，才比较：never、always、random、simple
baseline 和 state-conditioned policy。

正确任务上的无效干预、伤害、cost、abstention 与 escalation 必须与救援
效果共同报告。治理不是 universal booster。

---

## 5. H3 统计合同草案

### 5.1 预测目标

Primary：

- `A_(t+1)`：下一段 mean agent update activity；
- `D_(t+1)`：下一段 pooled drift。

Secondary：

- 下一段 `Delta U / Delta J / Delta C`；
- final offline `Brier/2`；
- invalid/missing risk。

不把 raw next option ID 作为跨 task primary target，因为 option identity 没有
共享语义且必须保持 permutation invariance。

### 5.2 预声明模型阶梯

所有 bounded target 使用简单 fractional-response GLM；预测评价以 grouped
out-of-task loss 为主，不以训练集 p-value 为主。

| Model | Inputs | 问题 |
|---|---|---|
| B0 | round, N, K, coverage | 仅结构基线 |
| B1 | B0 + concentration + top margin | 简单共识/集中基线 |
| B2 | B1 + previous public choice/top histogram + persistence/history | 当前必须击败的行为基线 |
| M | B2 + sorted pooled distribution + U | 加入 public-history controls 后的最小 macrostate candidate |
| R | M + pairwise-TV quantiles + report-top histogram | richer micro-summary ceiling |

`M` 必须包含与 B2 相同的 public-history controls；只有其新增 probability
geometry 在 task-heldout loss 上稳定优于 B2，且与 R 的差距可接受时，才是
qualified coarse-graining candidate。若 R 明显优于 M，则低维压缩丢失了
未来信息；应报告失败，而不是继续加 scalar。

### 5.3 验证与不确定性

- development：leave-one-task-out；
- held-out：leave-one-semantic-group-out；
- loss difference 按 task 汇总；
- bootstrap/permutation 在 task 或 semantic-group 层进行；
- agent、round、repeat 都不是独立 task；
- A-only/B-only 只作 instrument sensitivity，不当作独立 replication；
- regularization、feature transform 和缺失规则在 held-out 前冻结；
- missing 不做 uniform、last observation carry-forward 或零 activity 插补。

H3 的数值最小效应门不在本文件拍脑袋设定。P0 必须先用 M2 + synthetic
null 估计 loss-difference 的有限样本分辨率，再在 D1 provider 调用前冻结
development resource gate；confirmatory gate 则必须在 H3 task bank 调用前
冻结，不能根据 D1 outcome 调整。

---

## 6. Prompt、任务与数据合同

### 6.1 Public prompt

保持 M2 message-only contract：只要求一段有限长度 public analysis，不要求
probability、confidence、evidence labels、state judgment 或 final verdict。同轮
agent 互不可见，仅查看上一轮完整 public messages。固定三轮，无 early stop。

### 6.2 Sensor prompt

保持 canonical probability-only exact bytes：

- stable opaque option IDs；
- canonical labels 与 ID mapping；
- strict JSON；
- 每个 key 恰好一次；
- finite values in `[0,1]`；
- sum within inclusive `1e-6` plus machine-only summation allowance；
- 无 reasoning、confidence prose、evidence 或 public message；
- sensor output 永不回流 public process。

V1 已知 option-order/paraphrase sensitivity 不被删除。D1/H3 只资格化 exact
canonical instrument；若要跨 prompt 泛化，必须另设 measurement ensemble，
不能在主实验中临时变 prompt。

### 6.3 Task data

D1 不改 HiddenBench 原题、答案、private information 或 option labels。H3 的
新 task bank 必须满足 [`TASK_CONTAMINATION_REGISTRY_V1.md`](../../../docs/plans/TASK_CONTAMINATION_REGISTRY_V1.md)：

- source identity/hash；
- reviewer/time；
- semantic/leakage group；
- family、K、N、信息分布结构；
- split role；
- manifest freeze earlier than provider calls。

不得按已知 Brier 或已知 wrong-consensus outcome 挑 H3 tasks。

### 6.4 Manifest 必填

每个批次至少冻结：task-bank hash、task/group roles、model/provider reference、
seed、temperature、thinking、rounds、checkpoint、prompt/parser refs、roster、
call sequence、expected call/token cap、attempt policy、public artifact hashes、
sensor snapshot hashes、offline outcome mapping ref 和 analysis ref。

---

## 7. 旧引擎与外部资产如何复用

### 7.1 直接复用

- V6 fixed-round、previous-round-only public runner；
- reset、append-only attempt ledger、raw prompt/response、hash、manifest、replay；
- current `src/lib/epistemic` categorical pool、entropy、JSD、TV；
- current strict parser、truth firewall、offline evaluator；
- M2 thin trajectory adapter 与 analyzer。

### 7.2 只适配，不恢复

- legacy MeasurementLayer 中可独立定义的向量计算；
- cross-examination、topology、dropout 作为未来单因素 treatment 思想；
- external physics/social-dynamics papers 的受控参数设计与 finite-size discipline。

### 7.3 不复用

- legacy scalar belief、confidence/inertia/utility 伪认知状态；
- `R/T/H/F`、free energy、phase labels；
- code-side belief/confidence mutation；
- graph edge 作为 causal influence；
- state-dependent early stopping；
- global untargeted `supports|attacks`；
- MeasurementLayer 自动 detector/intervention suggestions。

### 7.4 前人代码资产

- Okawa biased-consensus repo：可参考 provider-neutral sweep、finite-agent
  simulation 和 fitting 文件组织；许可证未确认前不复制代码，且其 spin/phase
  experiment 不是本项目主线。
- MAS Diversity repo 为 MIT license，可在未来开放式 ideation adapter 中参考
  Vendi Score、order parameter、PCD 与 Self-BLEU pipeline：
  [repository](https://github.com/Xtra-Computing/MAS_Diversity)。当前不把这些
  embedding/text-diversity metrics 混入 categorical state。

---

## 8. 跨任务场景适配边界

当前 `P_t -> X_t` 只适用于有限、互斥、穷尽、单一 outcome 的 categorical
claim。它不是“只能做选择题”的永久框架，但也不能假装已经适配纯想象任务。

未来按 measurement contract 分轨：

| Task family | 微观观测 | 可复用部分 | 不可直接复用 |
|---|---|---|---|
| categorical decision | probability vector | 当前全部 probability geometry | 无 |
| continuous estimate | quantile/CDF report | roster、shadow isolation、distance/replay | categorical entropy/top consensus |
| ranking | pairwise/ranking distribution | shadow layer、exposure、transition | simplex option pool 需重定义 |
| open-ended ideation | frozen texts + embedding/diversity distribution | public runner、hash、trajectory、missingness | LLM categorical self-report、Brier、wrong consensus |

因此架构上的通用性来自 `ClaimContract + SensorContract + MetricContract`，
不是强行把所有任务变成选择题。首篇 Stage-2 论文先把 categorical contract
做实；开放式 adapter 只有在当前监测门通过后再做，避免同时验证两个仪器。

---

## 9. 可复现性、成本与安全

### 9.1 Provider 安全门

任何真实 run 必须：

- 用户逐批明确授权；
- 显式 `RUN_AUTHORIZED=yes`，默认 dry-run；
- 输出精确 planned calls、token cap 和任务 block；
- single attempt、no hidden retry；
- rate-limit/auth/provider drift 触发全局停止；
- 每个 registered cell 恰好一个 terminal record；
- API key 只从进程环境读取，不写 prompt、ledger、manifest 或日志；
- 不启动后台常驻 provider 进程；
- 不调用 DeepSeek/Claude delegate 执行任何实验。

### 9.2 成本门

计划只冻结 call/token 上限，不在未核对实时官方价格时声称人民币成本。执行前
必须重新核对 provider 定价并让用户批准支出上限。达到上限立即停止；缺失保持
missing，不自动补跑。

### 9.3 复现层级

1. 数学重算：deterministic kernel + cross-implementation tests；
2. artifact replay：raw bytes、hash、manifest、terminal accounting；
3. instrument replication：A/B duplicates、A-only/B-only sensitivity；
4. task replication：new task clusters；
5. semantic-family replication：new leakage groups；
6. model replication：新模型视为新 instrument，单独报告。

---

## 10. 难度分级与责任分配

| 工作 | 难度 | 默认执行者 | 现在是否做 |
|---|---|---|---|
| conservative margin + M2 addendum | L1 | Codex | 是，零调用 |
| D1 plan/task/budget freeze + mock | L2 | Codex | 是，零调用 |
| runner 从 hard-coded five-task 变为 frozen plan list | L2 | Codex | 已完成，mock 重放通过 |
| predictor scaffold、null simulation、grouped CV tests | L2--L3 | Codex | 已完成 truth-blind schema、零调用 sign-flip null 与 grouped-CV split scaffold；尚未拟合模型或宣称预测有效性 |
| semantic/leakage task-bank review | L3 | Codex 初审 + 人工确认 | H3 前 |
| H3 statistical contract red-team | L3--L4 | Codex 初审 + 更强模型最终复核 | 初审完成：NO-GO；已补 B2/history baseline |
| cross-channel construct audit | L3 | Codex + 人工复核 | 单审阅者初审完成；qualification 未通过 |
| controlled wrong-state task-bank contract | L3--L4 | Codex + 人工 semantic review | 4 clusters/8 variants、自动检查与 formation/recovery gates 已实现/冻结；人工审核待完成 |
| ISOLATED vs PEER thin runner + mock | L3 | Codex | V1.1 20-call canary 已完成；`NO_INTERACTION_SIGNAL`，不扩大当前 formation protocol |
| D1 209-call execution | paid | 当前 runner | 已完成；结果仅为 development evidence |
| prefix-causal trajectory monitor + state-space counterexample audit | L3--L4 | Codex | 已完成；16 tests 与 9 audit checks 通过，零调用 |
| observation-only state-space preflight | L3--L4 | Codex + 人工语义复核 | 8 variants/256 calls 合同已冻结；题目内容待审，不授权执行 |
| H3 predictive expansion | paid/high | 再次授权 | 当前不做；不是 monitoring gate |
| M3 randomized response / governance | L4 | 更强模型 + 人工审阅 | 当前禁止 |

Codex 承担约 70% 的定义、代码、测试、重放、分析和文档工作。需要用户承担的
关键部分是：真实支出授权、semantic task-bank 最终确认、论文定位选择和高难
统计合同的最终审阅。

---

## 11. 论文价值阶梯

| 证据达到哪里 | 可守论文结论 | 学术价值 |
|---|---|---|
| prefix-causal monitor + 数学/反例验证 | 独立、真值盲的实时 shadow state protocol | 中（方法贡献，外部效度仍待实验） |
| 状态分离与 late transition 跨独立 tasks 超过复测参考 | continuous reported-belief dynamics | 中到中高 |
| H3 held-out future-information 通过 | qualified collective epistemic macrostate | 中高 |
| H4 state-conditioned randomized response | measurable susceptibility/recoverability response | 高 |
| H5 held-out targeted rescue | truth-blind epistemic governance | 高，最接近项目母问题 |

`Social Thermodynamics` 继续作为内部研究纲领。论文标题优先使用
`Shadow Measurement of Multi-Agent Deliberation` 或
`Collective Epistemic Dynamics`。只有以后获得可重复 response surface、
有限尺寸/尺度证据或经验证的外场响应时，才把 thermodynamics 放入强标题。

当前正式可用物理词只有数学定义清楚的 **entropy**。`external field` 只能在
H4 指代随机化信息动作；`susceptibility` 只能指 response/dose 的实验估计。
`temperature`、`free energy`、`phase transition`、`attractor`、`basin` 和
`metastability` 当前不能作为 SwarmAlpha 的经验结论。

---

## 12. 立即执行顺序

在下一次 provider 授权前，零调用任务状态如下：

1. P0 conservative margin analyzer 与测试；（已完成）
2. M2 post-hoc reliability addendum；（已完成）
3. D1 remaining-dev5 frozen plan、mock、精确 call/token budget；（计划对象、
   结构 mock、provider-neutral runner 适配与真实执行均已完成）
4. H3 predictor scaffold 只做 synthetic null 和现有 M2/D1-compatible schema，
   不在 5-task M2 上训练后宣称 predictive validity；（零调用 null 与 grouped-CV
   split scaffold 已完成，尚未拟合模型）
5. D1 cross-channel review packet、人工初审与 L3--L4 red-team；（已完成，
   construct gate 未通过）
6. controlled wrong-state task-bank 科学合同与 4-cluster/8-variant candidate bank；
   （自动结构、truth firewall、mirror/position balance 已完成；human review 待完成）
7. 冻结同一 `X_0` 的 `ISOLATED vs PEER` formation estimand、160-call canary
   预算与停止条件；（已完成设计冻结，不构成 provider 授权）
8. structured-choice V1.1、20-call runner 与真实 canary 已完成；结果为
   `NO_INTERACTION_SIGNAL`，且 X0 已是 wrong supermajority，不扩大当前 formation
   batch；（已完成）
9. 四调用 `NEW_INDEPENDENT_OBSERVATION` escape canary 已完成；结果为
   `NO_ESCAPE_OBSERVED`。当前不再扩大该 task 的 formation/recovery 调用；若重启
   路线，先做 semantic review 与 randomized sham/new-source 设计。（已完成）
10. prefix-causal trajectory monitor、非单射/抵消/缺失/复测边界 audit；（已完成）
11. observation-only state-space calibration preflight：复用现有引擎，
    2 base × 4 regimes × 32 calls = 256 calls；（任务、调度、analyzer、mock replay
    与自动泄漏审计已完成；人工语义接受和预算批准待完成，因此不运行 provider）

完成后向用户提交一个不超过一页的 go/no-go preflight。D1 已执行并未通过
late-transition 与 known-wrong 双重 resource gate；因此当前已经转向
descriptive real-time monitor 与状态空间标定，不运行 SHAM、ATTACKS、M3 或
更多轮数救故事。预测结果不得覆盖或否决当前状态描述的操作定义。
