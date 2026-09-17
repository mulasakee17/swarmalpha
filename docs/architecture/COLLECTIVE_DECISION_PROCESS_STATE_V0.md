# 多通道集体决策过程状态 V0 合同

状态：**FROZEN V0 CONTRACT / CORE IMPLEMENTED / SYNTHETIC QUALIFICATION ONLY / NO PROVIDER AUTHORITY**

日期：2026-09-02

本文件冻结
`docs/plans/COLLECTIVE_DECISION_PROCESS_DESCRIPTOR_ENGINEERING_FIRST_PLAN_V1_2026-09-02.md`
的 E0-L/S 工程合同。V0 core 已实现，当前表示资格见 Q0 合同 §8；本文件继续冻结字段语义，
不代表构念已经有效、治理动作已经获权或决策质量已经改善。2026-09-08 的 X0 设计和当前
执行顺序由上述现有计划统一管理；下文 E0 审核记录保留其当时的权限，不再充当当前队列。

冻结后，E1-L 只能实现本文件的字段、枚举、分支、公式与错误边界。任何新增字段、默认值、
推断来源或解释权限都必须停止并返回强模型复核。

---

## 0. 目标、支持域与非目标

### 0.1 目标

在即时真值不可见的条件下，用同一 claim、checkpoint 与事件前缀的结构化架构记录描述：

- operational belief state 引用与显式 public choice；
- 注册信息池、exposure、注册池覆盖与 source/lineage/duplicate 记录；
- 已暴露信息是否出现显式引用、质疑、整合或冲突处理事件；
- participation、显式 response edge 与信息关联响应；
- model、capability、role、information access、speaker order 与 authority 元数据；
- missingness、资源使用、预算与候选动作表面。

### 0.2 V0 支持域

V0 的单位是一个 claim 在 `checkpointIndex`、`asOfSequence` 所确定事件前缀上的 immutable
projection。所有 exposure、discussion act 和 public choice 都必须具有架构分配的全局唯一
`eventSequence`。输入必须已是 `eventSequence <= asOfSequence` 的前缀；projector 遇到未来
事件时 fail-closed，不静默截断。

### 0.3 非目标与 claim ceiling

V0：

- 不读取或计算 `groundTruth`、`correctAnswer`、`resolution`、`finalOutcome`、`quality`、
  `utility` 或 evaluator outcome；
- 不从自由文本、关键词、embedding 或 LLM judge 推断 utilization、influence、choice 或
  correctness；
- 不把 source identity、lineage count、duplicate membership 或 response concentration
  解释为统计独立、因果影响、公平、协同或决策质量；
- 不产生总分、健康度、风险分、协同分、action value、排序或 recommendation；
- 不修改既有 thermometer、collective state、replay artifact、历史结果或旧 hash；
- 不比较 provider/model 优劣，不把 cohort 标签当作处理效应。

---

## 1. 通道与未来动作相关性

| 通道 | V0 允许描述 | 未来可能区分的动作 | 当前解释权限 |
|---|---|---|---|
| belief/choice | thermometer 引用、显式选择与 roster coverage | 重新询问或保留 baseline | 描述性 |
| registered information | 完整注册池内已暴露 distinct unit 比例 | 获取未暴露 unit | coverage hypothesis |
| discussion utilization | 已暴露 unit 的显式结构化使用事件 | 逐项审查、质疑、整合 | observed association |
| source dependence | declared lineage 与 duplicate membership | 获取关系不同或未知的新来源 | dependence description |
| participation/response | 发言、发出/收到回应及显式 response edge | 重排顺序、私人报告、复核 | observed association |
| heterogeneity | model/capability/role/access/order/authority 原子字段 | 改变一个注册条件 | descriptive factors |
| resources/action surface | 已用资源、剩余预算、候选动作可用性 | 继续、升级、弃权或停止 | surface only |

该映射是 DESIGN INTENT，不授予 projector 或下游 policy 动作权限。动作是否改善独立 outcome
必须由后续、独立、预注册的实验评估。

---

## 2. 冻结输入合同

### 2.1 公共原子类型

```text
ContractRefV0 {
  id: string
  version: string
}

DiscussionThermometerStateRefV0 {
  schemaRef: ContractRefV0
  claimId: string
  checkpointIndex: number
  optionIds: string[]
  contentHash: string
}

ObservationStatusV0 = "complete" | "partial" | "missing"

ObservationUnavailableReasonV0 =
  | null
  | "not_collected"
  | "invalid"
  | "provider_failure"
  | "partial_record"
```

所有 ID、ref、hash 和 version 必须是 trim 后非空字符串。所有数组是集合语义的地方，输入
顺序不影响输出；projector 按 ECMAScript 默认字符串升序（UTF-16 code-unit order）规范化。

带 observation status 的输入必须满足：complete 对应 null reason；partial 对应
`partial_record`；missing 对应 `not_collected`、`invalid` 或 `provider_failure`。这里的
`invalid` 是上游观测的合法 terminal fact；projector 输入本身若结构非法则直接失败。

### 2.2 注册信息池

```text
RegisteredEvidenceUnitV0 {
  evidenceUnitId: string
  claimId: string
  sourceRef: {
    id: string
    kind: "agent" | "tool" | "dataset" | "external"
  }
  lineage: null | {
    id: string
    basis: "declared" | "ingestion" | "estimated"
  }
  duplicateMembership: null | {
    groupId: string
    basis: "declared" | "deterministic" | "estimated"
  }
}

RegisteredEvidencePoolV0 {
  denominatorStatus:
    | "registered_complete"
    | "registered_partial"
    | "open_world_unknown"
  lineageObservationStatus: ObservationStatusV0
  duplicateObservationStatus: ObservationStatusV0
  units: RegisteredEvidenceUnitV0[]
}
```

`denominatorStatus` 只回答注册池能否作为 coverage denominator，不回答信息是否真实、充分或
独立。`lineageObservationStatus=complete` 要求每个 unit 的 `lineage` 非空；`missing` 要求
全部为空；`partial` 要求至少一项为空且至少一项非空。注册池为空时，lineage 与 duplicate
observation status 均固定为 complete（空集合上的完整记录）；coverage 仍因空 denominator
而 not applicable。

`duplicateObservationStatus=complete` 时，`duplicateMembership=null` 明确表示该 unit 没有
已注册 duplicate group；`partial` 或 `missing` 时，null 不得解释为“没有重复”。duplicate
group 不是统计相关性估计。missing 要求全部 membership 为 null；partial 要求至少一个
membership 非空且至少一个为 null；complete 允许全空、全非空或混合，因为其中的 null 是
显式“没有已注册 group”。

### 2.3 Exposure

```text
EvidenceExposureV0 {
  exposureId: string
  evidenceUnitId: string
  targetAgentId: string
  checkpointIndex: number
  eventSequence: number
  channel: "private" | "public" | "tool"
}

ExposureLogV0 {
  observationStatus: ObservationStatusV0
  unavailableReason: ObservationUnavailableReasonV0
  records: EvidenceExposureV0[]
}
```

Exposure 表示架构观察到一个注册信息单元被交付或置于 agent 可见上下文；不表示已阅读、
理解、相信、引用或正确使用。每个 record 必须引用本 claim 的已注册 unit 和 roster agent。

### 2.4 Structured discussion act

```text
DiscussionActKindV0 =
  | "introduce"
  | "cite"
  | "challenge"
  | "integrate"
  | "conflict_addressed"

DiscussionActV0 {
  actId: string
  agentId: string
  checkpointIndex: number
  eventSequence: number
  actKind: DiscussionActKindV0
  evidenceUnitIds: string[]
  respondsToActIds: string[]
  observationBasis: "architecture_recorded"
}

DiscussionActLogV0 {
  observationStatus: ObservationStatusV0
  unavailableReason: ObservationUnavailableReasonV0
  acts: DiscussionActV0[]
}
```

act kind、evidence ref 和 response ref 必须来自系统显式事件或受控结构化输出协议。不得读取
自由文本构造这些字段。exposure log complete 时，每个 evidence ref 必须在该 act 之前，
即在 checkpoint 不晚于该 act 且具有更小 `eventSequence` 的 exposure 中对同一 acting agent
可见；否则 fail-closed。exposure log partial/missing 时，未观察到先前 exposure 只会使
utilization unavailable，不得被补造，也不得误判为合同违规。每个 response ref 必须指向
具有更小 `eventSequence` 的 act；自引用、环、同序或未来引用均 fail-closed。

`observationStatus=complete` 且 `acts=[]` 表示已完整观察到零 act；partial/missing 不是零。

### 2.5 Belief 与显式 public choice

```text
ExplicitPublicChoiceV0 {
  agentId: string
  choiceId: string
  checkpointIndex: number
  eventSequence: number
}

BeliefChoiceInputV0 {
  thermometerStateRef: DiscussionThermometerStateRefV0 | null
  publicChoiceObservationStatus: ObservationStatusV0
  publicChoiceUnavailableReason: ObservationUnavailableReasonV0
  publicChoices: ExplicitPublicChoiceV0[]
}
```

`thermometerStateRef` 只引用已有 operational self-reported belief state，不复制或改写其
probability geometry。ref 的 claim、checkpoint 和 canonical optionIds 必须与顶层输入完全
相同，否则 fail-closed。choice 必须由架构显式记录，且 `choiceId` 属于顶层 `optionIds`；
不得从 discussion text 反推。每个 agent 在支持前缀中最多有一条 choice。

### 2.6 Agent process context

```text
AgentProcessContextV0 {
  agentId: string
  modelRef: ContractRefV0
  declaredCapabilityClass: string | null
  roleRef: ContractRefV0 | null
  informationAccessRef: ContractRefV0 | null
  speakerOrder: number | null
  authorityRef: ContractRefV0 | null
}
```

这些字段分别保存，不生成 heterogeneity 或 synergy score。capability 是声明分类，不是真实
能力；authority 是实验条件，不是合法性或因果支配；model identity 不是独立样本。每个
roster agent 恰有一个 context。

### 2.7 资源与候选动作表面

```text
ObservedResourceUseV0 {
  observationStatus: ObservationStatusV0
  unavailableReason: ObservationUnavailableReasonV0
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  totalLatencyMs: number | null
  invalidOrFailed: number | null
}

ObservedResourceBudgetV0 {
  observationStatus: ObservationStatusV0
  unavailableReason: ObservationUnavailableReasonV0
  computeUnits: number | null
  latencyUnits: number | null
}

CandidateActionAvailabilityV0 {
  candidateId: string
  actionRef: ContractRefV0
  available: boolean
}

CandidateActionSurfaceInputV0 {
  observationStatus: ObservationStatusV0
  unavailableReason: ObservationUnavailableReasonV0
  candidates: CandidateActionAvailabilityV0[]
}

ResourceStateInputV0 {
  observedUse: ObservedResourceUseV0
  budgetBefore: ObservedResourceBudgetV0
  candidateActionSurface: CandidateActionSurfaceInputV0
}
```

V0 定义本地、架构中性的资源观测形状，不从 `src/lib/experimentation/` 反向导入类型。后续
adapter 可以逐字段映射现有 `CostRecord`，但不得改变 null 或 status。`complete` 要求五个
资源字段均为数值，`missing` 要求均为 null，`partial` 要求数值与 null 同时存在。
budget observation 同理：complete 要求两个 budget 字段均为数值，missing 要求均为 null，
partial 要求一项数值、一项 null。

token 与 failure count 必须是非负安全整数；latency、compute 和 budget 必须是非负有限数。
当三个 token 字段均可用时，`totalTokens = promptTokens + completionTokens`，否则 fail-closed。
候选动作只记录可用性，不携带 score、rank、selected、recommended 或 expected value。
candidate-action observation complete 且 `candidates=[]` 表示完整观察到没有候选动作；
partial/missing 的空数组不是“没有动作”。

### 2.8 顶层输入

```text
CollectiveDecisionProcessStateInputV0 {
  claimId: string
  checkpointIndex: number
  asOfSequence: number
  optionIds: string[]
  expectedAgentIds: string[]
  registeredEvidencePool: RegisteredEvidencePoolV0
  exposureLog: ExposureLogV0
  discussionActLog: DiscussionActLogV0
  beliefChoice: BeliefChoiceInputV0
  agentContexts: AgentProcessContextV0[]
  resources: ResourceStateInputV0
}
```

`optionIds` 至少两项，`expectedAgentIds` 至少一项。checkpoint、sequence 和 speaker order
是非负安全整数。exposure、act 或 choice 的 checkpoint 不得大于顶层 checkpoint，
`eventSequence` 不得大于 `asOfSequence`；三类事件的 sequence 在合并后必须全局唯一。输入
对象及每个嵌套对象采用 exact-key validation；V0 顶层禁止增加 outcome/evaluator/truth
字段，也不接受未声明扩展字段。

所有 ID 域分别唯一，所有 ID/ref 数组内部不得重复；每个 agent 最多一条 public choice。
observation status 为 missing 时，exposure、act、choice 与 candidate-action 数组必须为空；
partial 允许空数组，用 terminal reason 与“完整观察到零事件”区分。所有已出现的 unit、agent
和 act reference 仍必须满足本节的 claim、roster、支持域与时序约束。

---

## 3. 冻结输出合同

### 3.1 Belief/choice

```text
BeliefChoiceStateV0 {
  thermometerStateRef: DiscussionThermometerStateRefV0 | null
  publicChoiceObservationStatus: ObservationStatusV0
  publicChoiceUnavailableReason: ObservationUnavailableReasonV0
  explicitChoiceByAgentId: Record<string, string>
  observedChoiceCount: number
  choiceCoverage: number | null
  missingAgentIds: string[]
  choiceCoverageUnavailableReason:
    | null
    | "public_choice_observation_incomplete"
}
```

只有 public-choice observation complete 时 `choiceCoverage` 为数值；roster 非空，因此无空
分母。complete 下没有 choice 的 agent 才进入 `missingAgentIds`。partial/missing 下，该数组
只列出“当前未观察到选择”的 agent，不得解释为确定未选择。

### 3.2 Registered information

```text
RegisteredInformationStateV0 {
  denominatorStatus:
    | "registered_complete"
    | "registered_partial"
    | "open_world_unknown"
  exposureObservationStatus: ObservationStatusV0
  registeredUnitIds: string[]
  observedExposedUnitIds: string[]
  unexposedRegisteredUnitIds: string[] | null
  registeredDistinctUnitCount: number
  observedExposedDistinctUnitCount: number
  observedExposedUnitIdsByAgentId: Record<string, string[]>
  registeredPoolCoverage: number | null
  unavailableReason:
    | null
    | "denominator_not_complete"
    | "exposure_observation_incomplete"
    | "registered_pool_empty"
  interpretation: "registered_unit_exposure_only"
}
```

coverage 只有在 denominator registered-complete、exposure observation complete 且注册池
非空时可用。空池是 `not_applicable` 语义，不得输出 0/0 或 0 coverage。observed exposed
count 在 partial log 下只是已观察下界。unavailable reason 的确定顺序固定为：denominator
不完整优先，其次 exposure observation 不完整，最后是完整但为空的注册池。
`unexposedRegisteredUnitIds` 仅在 coverage 可用时计算，供未来动作比较定位候选 unit；它不
表示这些 unit 有价值、独立或应被获取。

### 3.3 Source/lineage dependence

```text
SourceDependenceStateV0 {
  lineageObservationStatus: ObservationStatusV0
  evidenceUnitCountWithLineage: number
  evidenceUnitCountWithoutLineage: number
  recordedLineageCount: number | null
  lineageBasisUnitCount: {
    declared: number
    ingestion: number
    estimated: number
  }
  duplicateObservationStatus: ObservationStatusV0
  evidenceUnitCountWithDuplicateGroup: number
  evidenceUnitCountWithoutDuplicateGroup: number
  observedDuplicateGroupCount: number | null
  duplicateBasisUnitCount: {
    declared: number
    deterministic: number
    estimated: number
  }
  evidenceUnitDependence: Array<{
    evidenceUnitId: string
    sourceRef: {
      id: string
      kind: "agent" | "tool" | "dataset" | "external"
    }
    lineage: RegisteredEvidenceUnitV0["lineage"]
    duplicateMembership: RegisteredEvidenceUnitV0["duplicateMembership"]
  }>
  interpretation: "recorded_dependence_description_only"
}
```

lineage/duplicate distinct count 仅在对应 observation complete 时为数值，否则为 null；
with/without 与 basis counts 始终按记录本身报告，但 incomplete 下不能解释为总体比例或
“未重复”。`evidenceUnitDependence` 按 evidenceUnitId 排序并原样保留 basis，不能把 estimated
改名为 declared 或 verified。

### 3.4 Discussion utilization

```text
UtilizationCountByKindV0 {
  introduce: number
  cite: number
  challenge: number
  integrate: number
  conflict_addressed: number
}

UtilizationRateByKindV0 {
  introduce: number | null
  cite: number | null
  challenge: number | null
  integrate: number | null
  conflict_addressed: number | null
}

DiscussionUtilizationStateV0 {
  status: "available" | "unavailable" | "not_applicable"
  exposureObservationStatus: ObservationStatusV0
  actObservationStatus: ObservationStatusV0
  denominatorKind: "distinct_exposed_evidence_units"
  eligibleExposedDistinctUnitCount: number | null
  utilizedDistinctUnitCount: number | null
  utilizedUnitIds: string[] | null
  utilizedDistinctUnitCountByKind: UtilizationCountByKindV0
  utilizationRate: number | null
  utilizationRateByKind: UtilizationRateByKindV0
  unusedEligibleUnitCount: number | null
  unusedEligibleUnitIds: string[] | null
  unavailableReason:
    | null
    | "exposure_observation_incomplete"
    | "structured_use_observation_incomplete"
    | "no_eligible_exposed_units"
  interpretation: "architecture_observed_use_association_only"
}
```

- `available`：两个 observation 均 complete 且 eligible count > 0；所有 count/rate/ID set 可用。
- `not_applicable`：两个 observation 均 complete 且 eligible count = 0；eligible、overall/
  by-kind utilized count 与 unused count 均为 0，两个 ID set 为空数组，rate 为 null，reason 为
  `no_eligible_exposed_units`。
- `unavailable`：任一 observation incomplete；eligible、overall utilized、rate 与 unused 为
  null，两个 ID set 为 null；by-kind count 保留已观察事件的 distinct count，但不能解释为
  完整总体。

两个 observation 同时不完整时，unavailable reason 固定优先报告
`exposure_observation_incomplete`；否则报告 `structured_use_observation_incomplete`。

消息数、token volume、轮数或 speaker count 不能替代 utilization。

### 3.5 Participation/response

```text
ParticipationResponseStateV0 {
  speakingActCountByAgentId: Record<string, number>
  outgoingResponseEdgeCountByAgentId: Record<string, number>
  receivedResponseEdgeCountByAgentId: Record<string, number>
  responseAssociationStatus: "available" | "unavailable"
  responseEdgeCountBySourceAgentId: Record<string, number> | null
  informationLinkedResponseEdgeCountBySourceAgentId: Record<string, number> | null
  responseEdges: Array<{
    sourceActId: string
    targetActId: string
    sourceAgentId: string
    targetAgentId: string
    informationLinked: boolean
  }> | null
  unavailableReason:
    | null
    | "structured_response_observation_incomplete"
  attributionBasis: "explicit_response_edge"
  interpretation: "observed_association_not_causal_influence"
}
```

所有 per-agent map 对完整 roster 具有 exact keys。source agent 是被回应 act 的作者；一条
response edge 在 source act 的 `evidenceUnitIds` 非空时才计入 information-linked map。
discussion observation complete 且零 response edge 时 status 仍为 available，所有 map 为零；
`responseEdges` 为空数组。这与未采集严格分离；unavailable 时两个 source map 与
`responseEdges` 均为 null。edge count 不是 persuasion、authority effect 或 causal influence。
available 时 response edge 先按 target act 的 event sequence 升序，再按 sourceActId、
targetActId 升序输出。

### 3.6 Heterogeneity

```text
MetadataCompletenessByDimensionV0 {
  model: "complete"
  declaredCapabilityClass: ObservationStatusV0
  role: ObservationStatusV0
  informationAccess: ObservationStatusV0
  speakerOrder: ObservationStatusV0
  authority: ObservationStatusV0
}

HeterogeneityStateV0 {
  agentContexts: AgentProcessContextV0[]
  metadataCompletenessByDimension: MetadataCompletenessByDimensionV0
  interpretation: "descriptive_factors_only_not_separable_effects"
}
```

各维度 exact preservation 允许 C5 比较器识别究竟哪些注册条件变化；单个 state 不生成自由
文本 confounding 判断。若多个维度共同变化，后续实验不得把差异归因给其中一个维度。

### 3.7 Resources、action surface 与 missingness

```text
MissingnessChannelV0 =
  | "belief_choice"
  | "registered_information"
  | "source_dependence_lineage"
  | "source_dependence_duplicate"
  | "discussion_utilization"
  | "participation_response"
  | "heterogeneity_capability"
  | "heterogeneity_role"
  | "heterogeneity_information_access"
  | "heterogeneity_speaker_order"
  | "heterogeneity_authority"
  | "resource_use"
  | "resource_budget"
  | "action_surface"

MissingnessReasonV0 =
  | "not_collected"
  | "invalid"
  | "provider_failure"
  | "not_applicable"
  | "partial_record"

MissingnessRecordV0 {
  channel: MissingnessChannelV0
  reason: MissingnessReasonV0
}

ResourcesStateV0 {
  observedUse: ObservedResourceUseV0
  budgetBefore: ObservedResourceBudgetV0
  candidateActionSurface: CandidateActionSurfaceInputV0
  missingness: MissingnessRecordV0[]
  actionAuthority: "none"
}
```

missingness 由输入 observation status/reason 和冻结分支确定，按 channel lexical order 输出，
每个 channel 最多一条。`partial -> partial_record`；missing 保留 `not_collected` 或
`invalid` 或 `provider_failure`；空 denominator 产生 `not_applicable`。结构非法的 projector
输入导致 throw，不生成看似有效的 state。E1 不得自行发明映射。

registered-information channel 的固定映射为：`registered_partial -> partial_record`，
`open_world_unknown -> not_applicable`；denominator complete 后才查看 exposure reason，
两者均 complete 但池为空则为 `not_applicable`。其余 observation channel 原样保留输入 reason。

source-dependence 与 heterogeneity 的 derived completeness 固定映射为：partial 对应
`partial_record`，missing 对应 `not_collected`，complete 不产生 missingness。discussion-
utilization 同时依赖 exposure 与 act，先采用 exposure 的 terminal reason，再采用 act reason；
两者 complete 但 eligible set 为空时采用 `not_applicable`。participation-response 只采用 act
observation reason。belief-choice、resource-use、resource-budget 与 action-surface 原样保留
各自输入 reason。

### 3.8 顶层输出

```text
CollectiveDecisionProcessStateV0 {
  artifactSchemaRef: {
    id: "swarmalpha.collective-decision-process-state"
    version: "0.1.0"
  }
  inferenceStatus: "online_descriptive_process_state_only"
  truthAccess: "none"
  writeback: "none"
  actionAuthority: "none"
  claimId: string
  checkpointIndex: number
  asOfSequence: number
  optionIds: string[]
  expectedAgentIds: string[]
  beliefChoice: BeliefChoiceStateV0
  registeredInformation: RegisteredInformationStateV0
  sourceDependence: SourceDependenceStateV0
  discussionUtilization: DiscussionUtilizationStateV0
  participationResponse: ParticipationResponseStateV0
  heterogeneity: HeterogeneityStateV0
  resources: ResourcesStateV0
  sourceFingerprints: {
    registeredEvidencePool: string
    exposureLog: string
    discussionActLog: string
    beliefChoice: string
    agentContexts: string
    resources: string
  }
  contentHash: string
}
```

上述每个对象都是 fixed exact-key structure；optional/undefined 字段不属于 V0。分支不适用
的值用合同规定的 null、枚举和 reason 表达。

---

## 4. 冻结计算定义

### 4.1 注册池 coverage

可用条件满足时：

```text
registeredPoolCoverage
  = observedExposedDistinctUnitCount / registeredDistinctUnitCount
```

分子在 agent 和 exposure 事件上按 `evidenceUnitId` 去重；不是消息、token、source、lineage
或“独立证据”数量。同一 unit 暴露给多人只计一个 pool-level exposed unit。

### 4.2 Discussion utilization

令 `E_t` 为支持前缀内至少被一个 agent 暴露的 distinct unit 集合，`U_t(k)` 为显式 act kind
`k` 引用且已通过“该 agent 事先 exposure”验证的 distinct unit 集合：

```text
utilizedDistinctUnitCount = |union_k U_t(k)|
utilizationRate           = |union_k U_t(k)| / |E_t|
utilizationRateByKind(k)  = |U_t(k)| / |E_t|
unusedEligibleUnitCount   = |E_t| - |union_k U_t(k)|
```

只有 §3.4 的 available 分支计算比率。该量不证明阅读、理解、采纳、正确性或讨论因果。

### 4.3 Response association

每个 `(targetAct, sourceAct)` 显式引用计一条 edge。可以按 source agent 汇总 edge count；不得
用重复引用权重、token 数或模型生成的“影响分”。没有随机化、时序干预或 counterfactual
设计时，禁止 causal language。

### 4.4 Metadata completeness

对每个 nullable context 维度：全部非 null 为 complete，全部 null 为 missing，其余为 partial。
modelRef 因为必填恒为 complete。此计算描述记录完整性，不估计条件效应可识别性。

### 4.5 Missingness

```text
not_collected != invalid != provider_failure != not_applicable != partial_record
```

任何下游分析不得将这些状态静默转换为 0、空集合或“无影响”。

---

## 5. 复用边界与依赖方向

| 现有资产 | V0 决定 | 边界 |
|---|---|---|
| `src/lib/epistemic/types.ts` evidence/provenance | adapter/reference | 复用 identity 概念，不把 evidence content 放入 projector |
| `BeliefExposure` | adapter/reference | delivery 语义可映射，但 V0 要求全局 event sequence |
| `EpistemicEvidenceGraph` | adapter/reference | lineage/relation basis 可映射，不升级 independence |
| `CollectiveEpistemicStateV1` | reference | 可复用 canonical/hash 模式，不改 V1 |
| `DiscussionThermometerStateV1` | hashed reference | belief/choice 仍由原合同负责，不复制 probability geometry |
| experimentation `CostRecord` | downstream adapter only | epistemic core 不反向导入 experimentation；null/status 不丢失 |
| `activeInformationGovernance` | downstream only | V0 不调用或授权 policy |
| `finalOutcome.ts` | offline only | outcome/quality 禁止进入 online input/hash |
| V6 artifacts | E5 audit first | structured use 或 denominator 缺失时保持 unavailable |

E1 core 只允许同目录内部的 canonical/hash 工具依赖；不得导入 governance、experimentation、
runner、provider、filesystem、clock、environment 或 legacy module。

禁止新增数据库、事件总线、通用 graph engine、LLM judge、embedding pipeline、learned policy、
统一总分或 provider adapter。出现第二个真实消费者前，不抽象公共框架。

---

## 6. Canonicalization、hash 与 replay

- schema ref 固定为 `swarmalpha.collective-decision-process-state@0.1.0`；版本低于 1 表示当前
  工程合同冻结，不表示科学构念已稳定；
- ID 数组、ref 数组和 map keys 采用 ECMAScript 默认字符串升序（UTF-16 code-unit order）；act/exposure/choice
  先按 `eventSequence` 升序，再以自身 ID lexical order 作不可达的防御性 tie-break；全局
  event sequence 重复本应在验证阶段失败；
- 所有重复 ID、空 ID、未知引用、跨 claim 引用、未来事件、非法 choice、非法时序和非有限
  数值 fail-closed；
- projector 是纯函数、确定性、无 clock/randomness/environment/filesystem/provider；
- projector defensive-clone 输入；调用方后续 mutation 不得改变 state/hash；
- projector 返回递归冻结的输出；调用方不得修改任何顶层或嵌套值；
- `sourceFingerprints` 分别对六个 canonical input component 计算 fingerprint，使 replay 可以
  定位输入域差异，但不把原始自由文本或 offline outcome 带入 state；
- `contentHash` 是 canonical output 在删除顶层 `contentHash` 后的 fingerprint；
- 同一 canonical input 必须得到 byte-equivalent canonical output 与相同 hash；
- C7 中 offline outcome 不属于输入，因此不能改变 online state/hash；
- 任何新增字段、枚举、公式或 missing reason 都必须升级版本并经强模型审查。

E1 冻结 public symbols：

```text
COLLECTIVE_DECISION_PROCESS_STATE_V0
validateCollectiveDecisionProcessStateInputV0
validateCollectiveDecisionProcessStateV0
projectCollectiveDecisionProcessStateV0
verifyCollectiveDecisionProcessStateV0
```

`validate...InputV0` 和 `validate...StateV0` 只验证各自合同；`project...V0` 先验证输入再投影；
`verify...V0(input, state)` 重算投影并要求 canonical state 与 contentHash 完全一致，失败使用
冻结的 hash/replay error code。不得增加 registry、class、I/O wrapper 或隐式默认 config。

---

## 7. 冻结错误代码

E1 validator 的 thrown `Error.message` 必须以以下稳定代码之一开头；冒号后的字段路径可以
补充但不能替代代码：

```text
decision_process_state_input_keys_invalid
decision_process_state_output_keys_invalid
decision_process_state_id_invalid
decision_process_state_duplicate_id
decision_process_state_numeric_invalid
decision_process_state_observation_status_invalid
decision_process_state_denominator_contract_invalid
decision_process_state_reference_unknown
decision_process_state_claim_mismatch
decision_process_state_thermometer_ref_mismatch
decision_process_state_future_event
decision_process_state_response_order_invalid
decision_process_state_act_without_prior_exposure
decision_process_state_choice_option_invalid
decision_process_state_resource_status_invalid
decision_process_state_forbidden_truth_field
decision_process_state_hash_mismatch
decision_process_state_replay_mismatch
```

验证失败不产生 partial output，不修改输入，也不写 artifact。

---

## 8. C1--C7 的合同覆盖

| 反例 | 冻结区分量 |
|---|---|
| C1：暴露 1/4 vs 4/4 | `observedExposedDistinctUnitCount`、`registeredPoolCoverage` |
| C2：4/4 暴露但零使用 vs 显式引用/质疑 | overall/by-kind utilization |
| C3：同 lineage vs 四个 declared lineages | `recordedLineageCount`，仅 dependence description |
| C4：相同 message count、响应集中 vs 分散 | response edge maps；speaking counts 独立保存 |
| C5：多维共同变化 vs 单维变化 | canonical `agentContexts` 的逐维 exact preservation |
| C6：usage 未采集 vs 完整采集且零事件 | unavailable vs available-zero |
| C7：在线输入相同、离线答案相反 | state/hash 完全相同；offline 字段不可输入 |

C1--C7 是工程可区分性与真值防火墙最低测试，不证明描述器有预测效度、动作价值或治理效果。

---

## 9. E0-S 强模型复核与冻结决定

| # | 复核问题 | 决定 | 冻结处理 |
|---|---|---|---|
| 1 | denominator 是否阻止伪造 truth coverage | ACCEPT after revision | 注册池、exposure 完整性和空池分开 |
| 2 | exposure 与 utilization 是否分离 | ACCEPT after revision | delivery 与显式 use 采用不同日志与状态 |
| 3 | 不读自由文本能否支持 C2 | ACCEPT | 仅 `architecture_recorded` act ref 计数 |
| 4 | response 是否会升级为 causal influence | ACCEPT after revision | 只输出显式 edge count 与固定非因果解释 |
| 5 | capability/access/role/order/authority 是否可分 | ACCEPT after revision | 原子字段与逐维完整性固定，不输出总分 |
| 6 | action surface 是否无 recommendation authority | ACCEPT | 顶层与 resources 均固定 `actionAuthority:none` |
| 7 | 现有资产复用边界是否准确 | ACCEPT after revision | 移除 epistemic 对 experimentation `CostRecord` 的反向依赖 |
| 8 | C1--C7 是否可由 deterministic fixture 区分 | ACCEPT | §8 显式映射 |
| 9 | C7 是否保持同一 online state/hash | ACCEPT | outcome 字段禁入输入与 hash |
| 10 | 是否存在更小且同等充分方案 | ACCEPT WITH CEILING | 当前字段是 C1--C7 与缺失区分的最小可实现表面；禁止扩张 |

复核结论：**PASS / E0-L/S FROZEN**。

本轮修订属于合同澄清，不是实现或实验结果：增加事件时序、option 支持域、exposure 完整性、
空分母分支和稳定错误代码；把 response “mass” 收紧为 edge count；移除自由文本 warning 与
跨层 `CostRecord` 导入。E1-L 获得实现本合同的权限，但不获得 schema 扩张、provider、adapter、
artifact、实验或治理权限。

---

## 10. E0 冻结时的执行边界（历史记录，当前队列见执行计划）

E0 冻结后允许：

- E1-L 实现 core 类型、validator、pure projector、canonical hash 与 replay；
- 强模型仅在 E1-L 完整 diff 和验证后决定是否提交与进入 E2-L；
- 后续按计划依次执行缺失矩阵、truth firewall、反例和 artifact availability audit。

仍不允许：

- provider 实验或 production runner 连接；
- discussion utilization 的自由文本标注；
- influence causal inference；
- descriptor-guided action policy；
- 任何“决策质量改善”结论。
