# 多通道集体决策过程状态 Q0 资格合同 V1

状态：**FROZEN / Q2-S QUALIFIED_FOR_OBSERVATION_CANARY / ZERO-PROVIDER ONLY**
日期：2026-09-07

本文件冻结 `CollectiveDecisionProcessStateV0` 的最小表示资格检查。它不是实验结果、
构念有效性证明、预测合同或治理策略。Q0-S 曾只批准进入 Q1 synthetic fixture runner；
Q1 已完成，Q2-S 现只将 V0 资格化为 observation canary 的候选表示。该结论至多允许项目
所有者决定是否起草 X0 观察性实验合同；未批准 provider 调用、真实实验、动作选择、
治理结论或对 V0 核心 schema 的修改。

## 0. Q0 的问题与边界

Q0 只回答表示层问题：一个包含多通道结构字段的状态，是否能区分
probability-only 状态无法区分的、预先登记的过程差异。

Q0 不回答：

- 哪个状态更正确、更安全或决策质量更高；
- 哪个候选动作应当执行；
- 某通道是否具有因果影响；
- belief、讨论、来源或影响是否代表真实认知；
- 描述器能否预测未来状态或治理效果。

所有 Q0 fixture 都必须是 zero-provider、truth-blind、deterministic 的纯结构对象。
不得读取 `groundTruth`、`correctAnswer`、`resolution`、`finalOutcome`、`quality`、
`utility` 或 evaluator 字段；不得从自由文本、关键词、embedding 或 LLM judge
推断 structured use、influence 或 choice。

## 1. 冻结术语

### 1.1 状态对与声明差异

一个 counterexample case 包含一对合法 `CollectiveDecisionProcessStateInputV0`：
`stateA` 与 `stateB`。二者必须具有相同的：

- `claimId`、`checkpointIndex`、`asOfSequence`、`optionIds` 与 roster；
- 固定 synthetic `DiscussionThermometerStateV1` 及其引用；
- 本节 1.3 定义的三个 baseline signature；
- 候选动作的 identity 集合；仅 C6-action-surface 可以改变预注册动作的
  `available` 字段，不得增删或重命名动作。

每个 case 必须预先登记：

1. `declaredInputMutationPaths`：允许不同的输入路径；
2. `derivedOutputClosurePaths`：这些输入差异按当前 V0 实现必然影响的全部输出路径；
3. `ablationOmissionPaths`：比较层必须忽略的闭包，等于目标输出、对应
   `sourceFingerprints` 键、直接派生的 `resources.missingness` 条目及顶层
   `contentHash`。

状态对在 `declaredInputMutationPaths` 之外必须严格相同；完整输出在
`derivedOutputClosurePaths` 之外也必须严格相同。合法的跨通道派生不能被误判为
fixture 污染，但必须进入声明闭包；不得在运行后为使 case 通过而扩大闭包。

### 1.2 结构可区分

满足以下条件才叫结构可区分：

- 两个完整 V0 输出的 `contentHash` 不同；
- 所有输出差异均落在预注册 `derivedOutputClosurePaths`；
- 差异不能只来自未声明的时间戳、排序、序列化或 fixture metadata。

这不表示两个状态的构念值不同，也不表示其中一个更好。

### 1.3 baseline tie

Q0 固定以下三个最低基线，均直接使用现有
`src/lib/epistemic/estimators.ts::fingerprintEstimatorValue` 生成确定性 signature；Q1
不得另写一套 canonicalization 或 hash：

1. `B_prob`：来自同一个 fixed synthetic thermometer state，只包含完整 `microstate`
   与完整 `macrostate`。这覆盖 per-agent probability vector、pooled probability、entropy、
   JSD、concentration、order 与 pairwise dispersion，且只使用现有字段。不得重新定义
   probability metric，也不得加入 evidence、讨论、来源、角色或资源。
2. `B_msg`：只包含 `discussionActLog.acts.length`。这是“架构记录的结构化 act 数量”
   基线，不是实际 public message 数量，也不保留 act kind、证据引用或 response edge。
3. `B_source`：只包含 `registeredEvidencePool.units[].sourceRef.id` 的 distinct count；
   不读取 lineage 或 duplicate membership，也不把 source identity diversity 称为独立证据。

三个 signature 在每一个有效 pair 中都必须相等。它们只比较表示能力，不是预测模型，
也不产生 outcome claim。

### 1.4 依赖闭包 ablation

ablation 是比较层操作，不修改 V0 输入、V0 输出或 source artifact。Q1 必须从两个完整
V0 输出构造 `ablationComparisonView`，删除该 case 预注册的
`ablationOmissionPaths` 后，用 `fingerprintEstimatorValue` 比较。

该 view 不是合法 V0 状态，不得称为 V0 fingerprint，不得送回 validator 或 projector。
若删除冻结闭包后仍有差异，case 判 `invalid`；不得追加忽略路径。若完整 `contentHash`
相同，则目标差异未被 V0 保留，该 case 不通过。

### 1.5 动作输入见证

Q0 使用 `actionInputWitness`，不使用“动作适用性已经不同”的强表述。每个 witness 只含：

- 一个预注册候选动作 `actionRef`；
- 一个目标输出中的 `fieldPath`；
- 该字段在 stateA/stateB 中均可审计，且值不同；
- 一句静态说明：后续策略若评估该候选动作，为什么需要读取该字段。

witness 不得计算 applicability、eligibility、selection、recommendation、score、expected
value 或 outcome。它只证明目标通道可为一个候选动作提供非恒定输入；动作是否有益必须
由后续独立 outcome 设计评估。

## 2. 三个冻结问题

Q0 必须逐 case 报告，不能用 pooled total score 代替。

### Q0-1：超越固定基线

每个强制 case 必须满足：

```text
B_prob(stateA)   == B_prob(stateB)
B_msg(stateA)    == B_msg(stateB)
B_source(stateA) == B_source(stateB)
fullContentHash(stateA) != fullContentHash(stateB)
```

任一 baseline 不相等，则不是 minimal counterexample，case 判 `invalid`。

### Q0-2：为候选动作提供非恒定结构输入

每个强制 case 必须有合法 `actionInputWitness`。witness 只检查冻结字段路径是否存在、
是否可审计、A/B 值是否不同，不运行任何策略或动作规则。

### Q0-3：去掉声明闭包后差异消失

每个强制 case 必须满足：

```text
fullContentHash(stateA) != fullContentHash(stateB)
ablationComparisonHash(stateA) == ablationComparisonHash(stateB)
```

## 3. 预注册反例矩阵

Q1 必须实现下列 15 个 synthetic pair。本节保存预注册要求；实现与判定记录见 §8。

| family / case | target output | 唯一输入差异 | 必须进入 ablation 的派生闭包 | action-input witness |
|---|---|---|---|---|
| C1-exposure-coverage | `registeredInformation` | `exposureLog` 中已暴露 unit 集合；registered pool 相同且 denominator 已知 | `registeredInformation`、exposure-dependent `discussionUtilization`、对应 missingness、`sourceFingerprints.exposureLog`、`contentHash` | 信息获取候选动作读取 `unexposedRegisteredUnitIds` |
| C1-exposure-missing | `registeredInformation` | exposure observation complete 与 missing；registered pool 相同 | 同上 | 信息获取候选动作读取 `registeredPoolCoverage` 与 `unavailableReason` |
| C2-utilization | `discussionUtilization` | 同数量、同 act ID/author/sequence/kind 且 `respondsToActIds` 均为空的 act，仅 `evidenceUnitIds` 不同 | `discussionUtilization`、对应 missingness、`sourceFingerprints.discussionActLog`、`contentHash` | 结构化 follow-up 候选动作读取 `utilizedUnitIds` 或 utilization status |
| C3-lineage | `sourceDependence` | 同 unit/source identity，仅 lineage identity 不同 | `sourceDependence`、对应 missingness、`sourceFingerprints.registeredEvidencePool`、`contentHash` | 新来源候选动作读取 unit lineage 字段 |
| C3-duplicate | `sourceDependence` | 同 unit/source identity，仅 duplicate membership 不同 | 同上 | 新来源候选动作读取 duplicate membership |
| C4-response | `participationResponse` | 同 act 数、kind、evidence refs，仅合法 `respondsToActIds` 不同 | `participationResponse`、`sourceFingerprints.discussionActLog`、`contentHash` | response-routing 候选动作读取 `responseEdges` |
| C5-model | `heterogeneity` | 一个 agent 的非空 model identity 不同 | `heterogeneity`、`sourceFingerprints.agentContexts`、`contentHash` | assignment 候选动作读取该 model 字段 |
| C5-capability | `heterogeneity` | 一个 agent 的非空 `declaredCapabilityClass` 不同 | 同上 | assignment 候选动作读取 `declaredCapabilityClass` |
| C5-role | `heterogeneity` | 一个 agent 的非空 role ref 不同 | 同上 | role-assignment 候选动作读取 role 字段 |
| C5-access | `heterogeneity` | 一个 agent 的非空 information-access ref 不同 | 同上 | evidence-routing 候选动作读取 access 字段 |
| C5-order | `heterogeneity` | 一个 agent 的非空 speaker-order 值不同 | 同上 | speaking-order 候选动作读取 order 字段 |
| C5-authority | `heterogeneity` | 一个 agent 的非空 authority ref 不同 | 同上 | authority-layout 候选动作读取 authority 字段 |
| C6-use | `resources` | observed use 不同，budget/action surface 相同 | `resources`、`sourceFingerprints.resources`、`contentHash` | resource-sensitive 候选动作读取 observed use |
| C6-budget | `resources` | budget 不同，observed use/action surface 相同 | 同上 | resource-sensitive 候选动作读取 budget |
| C6-action-surface | `resources` | 固定 action identity 集合中一个 `available` 不同，其余资源相同 | 同上 | 固定候选动作读取自身 `available` |

### 3.1 通用 fixture 约束

- 所有 pair 都必须满足三个 baseline tie；不得使用自由文本。
- C1 的 registered pool 必须非空。`open_world_unknown` coverage 保持 `null`；未知不得
  编码成 0。C1 的 exposure 变化必然影响 utilization 分母/状态，因此冻结为合法派生闭包。
- C2 的 act 必须由 fixture 显式构造，不得从消息词语推断。至少一侧必须表示
  “已暴露但未利用”，另一侧表示“已暴露且有结构化证据关联”。C2 的 response edge
  必须为空，避免 evidence linkage 连带改变 `participationResponse.informationLinked`。
- C3 分别覆盖 lineage 与 duplicate；source 数与 source identity 集合必须保持相同。
- C4 的 act ID 必须唯一，response target 的 event sequence 必须严格更小。
- C5 六个原子维度分别使用一个单字段 pair；不得用 cohort label 推断 model capability，
  也不得用一个维度的通过替代其他维度。pair 两侧均用非空值，使 completeness 相同。
- C6-use、C6-budget、C6-action-surface 都是强制子例。resource use、budget 与 action
  surface 不得合并成总资源分数；complete zero 与 missing 不得混同。
- `resources` 与 `action surface` 在 Q0 保持一个 family，是因为当前 V0 将二者投影在同一
  顶层通道；Q1 仍必须用三个独立子例，不能据此宣称它们是同一构念。
- missingness filter 固定为：C1 仅 `registered_information` 与
  `discussion_utilization`；C2 仅 `discussion_utilization`；C3-lineage 仅
  `source_dependence_lineage`；C3-duplicate 仅 `source_dependence_duplicate`；C4 仅
  `participation_response`；C5 各自对应其原子维度（model 无 missingness 项）；C6-use、
  budget、action-surface 分别对应 `resource_use`、`resource_budget`、`action_surface`。
  只有 A/B 实际产生差异的这些条目才从 comparison view 过滤。

## 4. Q1 输出合同

Q1 的逐 case proposed output shape 固定为：

```text
CaseResult {
  caseFamily: "C1" | "C2" | "C3" | "C4" | "C5" | "C6"
  caseId: string
  targetChannel: "registered_information" | "discussion_utilization" |
    "source_dependence" | "participation_response" | "heterogeneity" |
    "resources" | "action_surface"
  inputValidation: "pass" | "invalid"
  declaredInputMutationPaths: string[]
  derivedOutputClosurePaths: string[]
  baselineTies: {
    probabilityOnly: boolean
    structuredActCount: boolean
    registeredSourceCount: boolean
  }
  fullStateDistinct: boolean
  differencesOutsideDeclaredClosure: string[]
  actionInputWitness: {
    actionRef: { id: string, version: string }
    fieldPath: string
    valuesDiffer: boolean
    rationale: string
  } | null
  ablationCollapsesDifference: boolean
  unavailableReasons: { stateA: string[], stateB: string[] }
  stateAContentHash: string | null
  stateBContentHash: string | null
  ablationAComparisonHash: string | null
  ablationBComparisonHash: string | null
  failureReason: string | null
}
```

`CaseResult` 不是 V0 核心 schema。不得加入 score、rank、recommendation、outcome、
quality 或 learned decision。

## 5. 冻结判定规则

- `QUALIFIED_FOR_OBSERVATION_CANARY`：表中 15 个强制 pair 全部合法；每个 pair 的三个
  baseline 均 tie、完整状态不同、无闭包外差异、action-input witness 合法、ablation
  collapse 且 missingness/truth-blind 检查通过。
- `REVISE_CONTRACT`：fixture、冻结闭包或 witness 表达有错，但存在不修改 V0 schema
  即可实现的明确结构反例。无效 fixture 不能直接升级为 STOP。
- `STOP_NO_INCREMENTAL_STATE_VALUE`：在合法 fixture 已建立的前提下，V0 仍不保留目标
  差异；或目标差异在禁止 schema 扩张、文本推断、outcome 输入的边界内根本无法表达。

判定不得通过加权平均、总分、“多数 case 通过”或 family 内部分通过替代。任何强制
子例失败时不得给出全局 `QUALIFIED`；应按上述证据选择 `REVISE` 或 `STOP`。

## 6. Q1 明确禁止事项

Q1 未经新的授权不得：

- 调用 provider、读取 `.env`、访问在线服务或创建 paid artifact；
- 修改 V0 核心 schema、实现、现有测试期望或历史结果；
- 读取任何 offline outcome 作为 projector 输入；
- 从 public/private message 文本推断 evidence、act、response、influence 或 choice；
- 添加 CLI、manifest、result directory、总分或 learned policy；
- 将可区分性写成 construct validity、预测能力、因果效应或决策质量改善。

## 7. Q0-S 裁决

裁决：`PASS / FROZEN_FOR_Q1_ONLY`。

冻结事项如下：

1. 接受 C1–C6 family；C6 保持一个 V0 顶层 family，但三个原子子例全部强制。
2. 仅接受“动作输入见证”，不接受适用性、选择或推荐结论。
3. C5 按 model、capability、role、information access、speaker order、authority 六个
   原子维度分别验证。
4. 接受依赖闭包 ablation；拒绝“只删目标字段”导致的伪失败，也拒绝运行后扩大闭包。
5. 全局资格要求 15 个强制 pair 全部通过；不允许多数票或总分。

当前证据状态：Q0 合同已冻结，Q1 runner 与 fixture 已实现并经 Q2-S 复核；结果见 §8。
Q0-S 本身仍不构成 V0 构念有效性、预测能力、治理效应或决策质量改善的证据。

## 8. Q1 实现与 Q2-S 资格判定（2026-09-08）

### 8.1 实现事实

- Q1 只新增 `test/collective-decision-process-state-q0-qualification.test.ts`，没有新增 CLI、
  manifest、结果目录、生产依赖或 provider 路径，也没有修改 V0 schema、projector、历史结果
  或既有测试期望。
- runner 实现了表中全部 15 个 synthetic pair，并逐 case 检查三个冻结 baseline signature、
  完整状态差异、声明闭包、动作输入见证、依赖闭包 ablation、missingness 与 truth-blind 边界。
- `B_prob` 的 signature 只含冻结 thermometer 的完整 `microstate` 与 `macrostate`；
  `B_msg` 只含 structured act count；`B_source` 只含 distinct `sourceRef.id` count。三者均使用
  现有 `fingerprintEstimatorValue`，没有新增 canonicalization 或概率指标。
- `C6-use` 明确区分 complete all-zero observation 与 `missing/not_collected`；未把缺失编码为零。
  未提供显式缺失预期的 case 默认要求 A/B 均无 missingness 条目，因此 15 个 case 都执行
  精确 missingness 检查，而不是只记录输出。
- negative controls 会使 baseline drift、不完整派生闭包、恒定 witness 或错误 missingness
  产生非空 `failureReason`；projector 可接受输入与资格规则失败保持分离。

### 8.2 验证证据

- Q1 资格测试：`3 passed`。
- Q1 加两组 V0 direct/adversarial tests：`3 files passed / 30 tests passed`。
- `npx tsc --noEmit`：通过。
- `npm run build`：通过；构建期间有 webpack cache snapshot warning，但退出码为 0。
- 串行全量测试：`154 files passed / 6 skipped / 1 failed`，`2082 tests passed / 12 skipped /
  1 failed`。唯一失败位于未修改的
  `test/v6-collective-dynamics-trajectory-public-wrapper.test.ts`，原因是默认 5000 ms timeout；
  该文件以 `--testTimeout=15000 --no-file-parallelism` 单独复跑时 `3 tests passed`。因此记录为
  Q1 修改范围外的全量运行性能阈值抖动，不把它隐去，也不修改 timeout 或测试期望来制造通过。

### 8.3 Q2-S 裁决

裁决：`QUALIFIED_FOR_OBSERVATION_CANARY`。

裁决依据是：15 个强制 pair 全部合法，且每个 pair 都满足三个 baseline tie、完整状态可区分、
无声明闭包外差异、动作输入见证非恒定、ablation collapse、missingness 精确匹配和 truth-blind
检查。未使用总分、多数票或 outcome 数据代替逐 case 判定。

该裁决只支持以下有限结论：在冻结的 deterministic synthetic fixtures 上，V0 能保存简单
probability-only、structured-act-count 与 registered-source-count baseline 没有保存的预注册结构
差异，并能为预注册候选动作提供非恒定的可审计输入。

该裁决不支持：构念有效性、校准或预测能力；真实运行中的字段可观测率；动作适用性、推荐或
收益；因果影响；治理效应；决策质量改善；对任务、模型或场景的外部有效性。下一步若由项目
所有者另行授权，只能进入 X0 观察性实验合同设计；本次裁决没有启动 X0、provider 或真实实验。
