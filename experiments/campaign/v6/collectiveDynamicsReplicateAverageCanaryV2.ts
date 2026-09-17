/**
 * V2 repair contract after the single-elicitation V1 canary failed. This file
 * defines and verifies the replicate-average estimand, held-out freeze, and
 * single-attempt execution semantics. Provider execution remains owner-gated;
 * this contract never authorizes M1.
 */
import {
  COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1,
  COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
  buildCollectiveDynamicsSensorPromptV1,
  buildCollectiveDynamicsSensorSnapshotV1,
  compareCollectiveDynamicsSensorReportsV1_1,
  parseMappedCollectiveDynamicsSensorReportV1_1,
  type CollectiveDynamicsSensorCanaryTerminalV1,
  type CollectiveDynamicsSensorSnapshotV1,
  type ParsedSensorReportV1,
  type SensorPairDifferenceV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
} from "./collectiveDynamicsV1";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";
import { providerFailureCode } from "./providerDiagnostics";

export const COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_CANARY_V2 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-replicate-average-canary",
  version: "2.0.0",
});

export const COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_ESTIMATOR_V2 = Object.freeze({
  id: "swarmalpha.estimator.replicate-average-categorical-report",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_FREEZE_V2 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-replicate-average-canary.freeze",
  version: "2.0.0",
});

export const COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_RUN_V2 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-replicate-average-canary.run",
  version: "2.0.0",
});

export const COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2 = [
  "A1", "B1", "A2", "B2",
] as const;

export type CollectiveDynamicsReplicateLabelV2 =
  typeof COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2[number];

export interface CollectiveDynamicsReplicateAverageCanaryPlanV2 {
  planRef: typeof COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_CANARY_V2;
  sourceFormationDirectory: string;
  sourceTaskIds: [8, 29, 50];
  sourceTaskSelection:
    "positions_2_5_8_of_preexisting_truth_free_systematic_dev10_order";
  sourceSeed: 1;
  checkpointRound: 3;
  sourceAgentCounts: [3, 4, 3];
  registeredUnitCount: 10;
  replicateLabels: CollectiveDynamicsReplicateLabelV2[];
  blockA: ["A1", "A2"];
  blockB: ["B1", "B2"];
  plannedProviderCalls: 40;
  promptVariant: "canonical_only_exact_duplicate";
  modelRef: { id: "zhipu:glm-4.6v"; version: "1.0.0" };
  promptRef: typeof COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1;
  parserRef: typeof COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1;
  estimatorRef: typeof COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_ESTIMATOR_V2;
  invocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 256;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  orderingPolicy: "four_label_cyclic_position_near_balance_v1";
  primaryComparison:
    "tv_between_equal_weight_mean_A1_A2_and_equal_weight_mean_B1_B2";
  primaryMacroQuantities: [
    "pooled_report_tv",
    "mean_normalized_entropy_abs_difference",
    "normalized_generalized_jsd_abs_difference",
  ];
  uniqueTopPolicy: "diagnostic_only_ties_are_indeterminate";
  developmentTolerances: {
    requireAllPlannedReportsValid: true;
    maximumMeanUnitSplitHalfTv: 0.05;
    maximumP90UnitSplitHalfTv: 0.10;
    maximumEachTaskPooledTv: 0.05;
    maximumEachTaskMeanEntropyAbsDifference: 0.05;
    maximumEachTaskJsdAbsDifference: 0.05;
  };
  inferenceUnit: "task";
  pairedObservationUnit: "task_agent_frozen_view";
  truthAccess: "none";
  contentHash: string;
}

export interface ReplicateAverageSplitHalfV2 {
  blockAReport: ParsedSensorReportV1;
  blockBReport: ParsedSensorReportV1;
  difference: SensorPairDifferenceV1;
  uniqueTopInterpretation: "agreement" | "disagreement" | "indeterminate_tie";
}

export interface CollectiveDynamicsReplicateAverageCellV2 {
  cellId: string;
  unitId: string;
  sourceTaskId: number;
  agentId: string;
  snapshotHash: string;
  replicateLabel: CollectiveDynamicsReplicateLabelV2;
  withinUnitPosition: 1 | 2 | 3 | 4;
  globalSequence: number;
  request: SingleAttemptTextInvokeRequest;
  promptHash: string;
  requestHash: string;
}

export interface CollectiveDynamicsReplicateAverageFreezeV2 {
  freezeRef: typeof COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_FREEZE_V2;
  planHash: string;
  sourceFormationHashes: string[];
  snapshots: CollectiveDynamicsSensorSnapshotV1[];
  cells: CollectiveDynamicsReplicateAverageCellV2[];
  registeredUnitCount: 10;
  registeredCellCount: 40;
  orderingPolicy: "four_label_cyclic_position_near_balance_v1";
  truthAccess: "none";
  contentHash: string;
}

export interface CollectiveDynamicsReplicateAverageRunV2 {
  runRef: typeof COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_RUN_V2;
  planHash: string;
  freezeHash: string;
  terminals: CollectiveDynamicsSensorCanaryTerminalV1[];
  registeredCellCount: 40;
  terminalCellCount: 40;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

export interface ReplicateAverageAttemptStartV2 {
  type: "started";
  cellId: string;
  requestId: string;
  requestHash: string;
  sequence: number;
  timestamp: string;
}

export interface ReplicateAverageAttemptTerminalV2 {
  type: "terminal";
  cellId: string;
  requestId: string;
  requestHash: string;
  sequence: number;
  status: CollectiveDynamicsSensorCanaryTerminalV1["status"];
  timestamp: string;
  terminal: CollectiveDynamicsSensorCanaryTerminalV1;
}

export function buildCollectiveDynamicsReplicateAverageCanaryPlanV2(input?: {
  sourceFormationDirectory?: string;
}): CollectiveDynamicsReplicateAverageCanaryPlanV2 {
  const body: Omit<CollectiveDynamicsReplicateAverageCanaryPlanV2, "contentHash"> = {
    planRef: COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_CANARY_V2,
    sourceFormationDirectory: input?.sourceFormationDirectory
      ?? "results/v6_collective_dynamics_v1_glm46v_monitor_screen10_seed1",
    sourceTaskIds: [8, 29, 50],
    sourceTaskSelection: "positions_2_5_8_of_preexisting_truth_free_systematic_dev10_order",
    sourceSeed: 1,
    checkpointRound: 3,
    sourceAgentCounts: [3, 4, 3],
    registeredUnitCount: 10,
    replicateLabels: [...COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2],
    blockA: ["A1", "A2"],
    blockB: ["B1", "B2"],
    plannedProviderCalls: 40,
    promptVariant: "canonical_only_exact_duplicate",
    modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
    promptRef: COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
    parserRef: COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1,
    estimatorRef: COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_ESTIMATOR_V2,
    invocation: {
      temperature: 0,
      seed: 1,
      maxTokens: 256,
      thinking: "disabled",
      attemptsPerCell: 1,
      retry: "none",
    },
    orderingPolicy: "four_label_cyclic_position_near_balance_v1",
    primaryComparison:
      "tv_between_equal_weight_mean_A1_A2_and_equal_weight_mean_B1_B2",
    primaryMacroQuantities: [
      "pooled_report_tv",
      "mean_normalized_entropy_abs_difference",
      "normalized_generalized_jsd_abs_difference",
    ],
    uniqueTopPolicy: "diagnostic_only_ties_are_indeterminate",
    developmentTolerances: {
      requireAllPlannedReportsValid: true,
      maximumMeanUnitSplitHalfTv: 0.05,
      maximumP90UnitSplitHalfTv: 0.10,
      maximumEachTaskPooledTv: 0.05,
      maximumEachTaskMeanEntropyAbsDifference: 0.05,
      maximumEachTaskJsdAbsDifference: 0.05,
    },
    inferenceUnit: "task",
    pairedObservationUnit: "task_agent_frozen_view",
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsReplicateAverageCanaryPlanV2(
  plan: CollectiveDynamicsReplicateAverageCanaryPlanV2,
): void {
  assertCollectiveDynamicsTruthBlindV1(plan);
  const { contentHash, ...body } = plan;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("replicate_average_canary_v2_plan_hash_mismatch");
  }
  const expected = buildCollectiveDynamicsReplicateAverageCanaryPlanV2({
    sourceFormationDirectory: plan.sourceFormationDirectory,
  });
  if (JSON.stringify(plan) !== JSON.stringify(expected)) {
    throw new Error("replicate_average_canary_v2_plan_drift");
  }
  if (plan.registeredUnitCount !== plan.sourceAgentCounts.reduce((sum, count) => sum + count, 0)
    || plan.plannedProviderCalls !== plan.registeredUnitCount * plan.replicateLabels.length) {
    throw new Error("replicate_average_canary_v2_call_count_invalid");
  }
}

function averageTwoReports(
  canonicalOptions: readonly string[],
  left: ParsedSensorReportV1,
  right: ParsedSensorReportV1,
): ParsedSensorReportV1 {
  // Self-comparisons provide strict V1.1 validation without exposing a second
  // schema implementation in this module.
  compareCollectiveDynamicsSensorReportsV1_1({ canonicalOptions, left, right: left });
  compareCollectiveDynamicsSensorReportsV1_1({ canonicalOptions, left: right, right });
  return {
    probabilities: Object.fromEntries(canonicalOptions.map(option => [
      option,
      (left.probabilities[option] + right.probabilities[option]) / 2,
    ])),
  };
}

export function estimateReplicateAverageSplitHalfV2(input: {
  canonicalOptions: readonly string[];
  reports: Record<CollectiveDynamicsReplicateLabelV2, ParsedSensorReportV1>;
}): ReplicateAverageSplitHalfV2 {
  const blockAReport = averageTwoReports(
    input.canonicalOptions, input.reports.A1, input.reports.A2,
  );
  const blockBReport = averageTwoReports(
    input.canonicalOptions, input.reports.B1, input.reports.B2,
  );
  const difference = compareCollectiveDynamicsSensorReportsV1_1({
    canonicalOptions: input.canonicalOptions,
    left: blockAReport,
    right: blockBReport,
  });
  return {
    blockAReport,
    blockBReport,
    difference,
    uniqueTopInterpretation: difference.leftUniqueTop === null || difference.rightUniqueTop === null
      ? "indeterminate_tie"
      : difference.uniqueTopAgreement ? "agreement" : "disagreement",
  };
}

const REPLICATE_POSITION_ORDERS_V2: ReadonlyArray<
  ReadonlyArray<CollectiveDynamicsReplicateLabelV2>
> = [
  ["A1", "B1", "A2", "B2"],
  ["B1", "A2", "B2", "A1"],
  ["A2", "B2", "A1", "B1"],
  ["B2", "A1", "B1", "A2"],
];

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withoutContentHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

function canonicalPromptHash(input: { systemPrompt: string; userPrompt: string }): string {
  return hashCollectiveDynamicsValueV1({
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    responseFormat: "json",
  });
}

export function buildCollectiveDynamicsReplicateAverageFreezeV2(input: {
  plan: CollectiveDynamicsReplicateAverageCanaryPlanV2;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
}): CollectiveDynamicsReplicateAverageFreezeV2 {
  verifyCollectiveDynamicsReplicateAverageCanaryPlanV2(input.plan);
  if (input.formations.length !== input.plan.sourceTaskIds.length) {
    throw new Error("replicate_average_canary_v2_source_formation_count_invalid");
  }
  const formationByTask = new Map(input.formations.map(formation => [
    formation.onlineTask.sourceTaskId, formation,
  ]));
  if (formationByTask.size !== input.formations.length
    || input.plan.sourceTaskIds.some(taskId => !formationByTask.has(taskId))) {
    throw new Error("replicate_average_canary_v2_source_formation_set_invalid");
  }
  const snapshots: CollectiveDynamicsSensorSnapshotV1[] = [];
  input.plan.sourceTaskIds.forEach((sourceTaskId, taskIndex) => {
    const formation = formationByTask.get(sourceTaskId)!;
    verifyFormationArtifactV1(formation);
    if (formation.seed !== input.plan.sourceSeed
      || formation.modelRef.id !== input.plan.modelRef.id
      || formation.modelRef.version !== input.plan.modelRef.version
      || formation.onlineTask.agents.length !== input.plan.sourceAgentCounts[taskIndex]) {
      throw new Error("replicate_average_canary_v2_source_formation_binding_invalid");
    }
    for (const agent of formation.onlineTask.agents) {
      snapshots.push(buildCollectiveDynamicsSensorSnapshotV1({
        formation,
        agentId: agent.agentId,
        checkpointRound: input.plan.checkpointRound,
      }));
    }
  });
  if (snapshots.length !== input.plan.registeredUnitCount) {
    throw new Error("replicate_average_canary_v2_registered_unit_count_invalid");
  }
  const cells: CollectiveDynamicsReplicateAverageCellV2[] = [];
  let globalSequence = 0;
  snapshots.forEach((snapshot, unitIndex) => {
    const agentPosition = snapshot.expectedAgentIds.indexOf(snapshot.agentId) + 1;
    const unitId = `task-${snapshot.sourceTaskId}:agent-${agentPosition}`;
    const prompt = buildCollectiveDynamicsSensorPromptV1({
      snapshot,
      variant: "BASELINE_A",
    });
    const order = REPLICATE_POSITION_ORDERS_V2[unitIndex % REPLICATE_POSITION_ORDERS_V2.length];
    order.forEach((replicateLabel, positionIndex) => {
      globalSequence += 1;
      const requestId = `replicate-average-canary:${unitId}:${replicateLabel.toLowerCase()}`;
      const request: SingleAttemptTextInvokeRequest = {
        requestId,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        responseFormat: "json",
        modelRef: cloneJson(input.plan.modelRef),
        invocationConfig: {
          temperature: input.plan.invocation.temperature,
          seed: input.plan.invocation.seed,
          maxTokens: input.plan.invocation.maxTokens,
          thinking: input.plan.invocation.thinking,
        },
      };
      cells.push({
        cellId: requestId,
        unitId,
        sourceTaskId: snapshot.sourceTaskId,
        agentId: snapshot.agentId,
        snapshotHash: snapshot.contentHash,
        replicateLabel,
        withinUnitPosition: (positionIndex + 1) as 1 | 2 | 3 | 4,
        globalSequence,
        request,
        promptHash: canonicalPromptHash(prompt),
        requestHash: hashCollectiveDynamicsValueV1(request),
      });
    });
  });
  const body: Omit<CollectiveDynamicsReplicateAverageFreezeV2, "contentHash"> = {
    freezeRef: COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_FREEZE_V2,
    planHash: input.plan.contentHash,
    sourceFormationHashes: input.plan.sourceTaskIds.map(taskId => formationByTask.get(taskId)!.contentHash),
    snapshots,
    cells,
    registeredUnitCount: 10,
    registeredCellCount: 40,
    orderingPolicy: "four_label_cyclic_position_near_balance_v1",
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  const freeze = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyCollectiveDynamicsReplicateAverageFreezeV2({ ...input, freeze });
  return cloneJson(freeze);
}

export function verifyCollectiveDynamicsReplicateAverageFreezeV2(input: {
  plan: CollectiveDynamicsReplicateAverageCanaryPlanV2;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
}): void {
  verifyCollectiveDynamicsReplicateAverageCanaryPlanV2(input.plan);
  assertCollectiveDynamicsTruthBlindV1(input.freeze);
  const { freeze } = input;
  if (freeze.freezeRef.id !== COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_FREEZE_V2.id
    || freeze.freezeRef.version !== COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_FREEZE_V2.version
    || freeze.planHash !== input.plan.contentHash
    || freeze.registeredUnitCount !== input.plan.registeredUnitCount
    || freeze.registeredCellCount !== input.plan.plannedProviderCalls
    || freeze.snapshots.length !== input.plan.registeredUnitCount
    || freeze.cells.length !== input.plan.plannedProviderCalls
    || freeze.orderingPolicy !== input.plan.orderingPolicy || freeze.truthAccess !== "none") {
    throw new Error("replicate_average_canary_v2_freeze_scope_invalid");
  }
  if (new Set(freeze.snapshots.map(snapshot => snapshot.contentHash)).size
      !== input.plan.registeredUnitCount
    || new Set(freeze.cells.map(cell => cell.cellId)).size !== input.plan.plannedProviderCalls
    || new Set(freeze.cells.map(cell => cell.request.requestId)).size
      !== input.plan.plannedProviderCalls) {
    throw new Error("replicate_average_canary_v2_freeze_identity_invalid");
  }
  const formationByTask = new Map(input.formations.map(formation => [
    formation.onlineTask.sourceTaskId, formation,
  ]));
  if (formationByTask.size !== input.plan.sourceTaskIds.length) {
    throw new Error("replicate_average_canary_v2_source_formation_set_invalid");
  }
  const expectedSnapshots = input.plan.sourceTaskIds.flatMap(sourceTaskId => {
    const formation = formationByTask.get(sourceTaskId);
    if (!formation) throw new Error("replicate_average_canary_v2_source_formation_set_invalid");
    verifyFormationArtifactV1(formation);
    return formation.onlineTask.agents.map(agent => buildCollectiveDynamicsSensorSnapshotV1({
      formation,
      agentId: agent.agentId,
      checkpointRound: input.plan.checkpointRound,
    }));
  });
  if (JSON.stringify(freeze.snapshots) !== JSON.stringify(expectedSnapshots)) {
    throw new Error("replicate_average_canary_v2_snapshot_binding_invalid");
  }
  const snapshotByHash = new Map(freeze.snapshots.map(snapshot => [snapshot.contentHash, snapshot]));
  const positionCounts = new Map<string, number>();
  freeze.cells.forEach((cell, index) => {
    const snapshot = snapshotByHash.get(cell.snapshotHash);
    const expectedPosition = (index % 4) + 1;
    const expectedLabel = REPLICATE_POSITION_ORDERS_V2[Math.floor(index / 4) % 4][index % 4];
    if (!snapshot || cell.globalSequence !== index + 1
      || cell.withinUnitPosition !== expectedPosition || cell.replicateLabel !== expectedLabel
      || cell.request.requestId !== cell.cellId
      || cell.requestHash !== hashCollectiveDynamicsValueV1(cell.request)
      || cell.request.modelRef.id !== input.plan.modelRef.id
      || cell.request.modelRef.version !== input.plan.modelRef.version
      || cell.sourceTaskId !== snapshot.sourceTaskId || cell.agentId !== snapshot.agentId) {
      throw new Error("replicate_average_canary_v2_cell_binding_invalid");
    }
    const prompt = buildCollectiveDynamicsSensorPromptV1({ snapshot, variant: "BASELINE_A" });
    if (cell.request.systemPrompt !== prompt.systemPrompt
      || cell.request.userPrompt !== prompt.userPrompt
      || cell.promptHash !== canonicalPromptHash(prompt)) {
      throw new Error("replicate_average_canary_v2_prompt_mismatch");
    }
    const positionKey = `${cell.replicateLabel}:${cell.withinUnitPosition}`;
    positionCounts.set(positionKey, (positionCounts.get(positionKey) ?? 0) + 1);
  });
  for (const label of COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2) {
    const counts: number[] = [];
    for (const position of [1, 2, 3, 4]) {
      counts.push(positionCounts.get(`${label}:${position}`) ?? 0);
    }
    if (counts.reduce((sum, count) => sum + count, 0) !== input.plan.registeredUnitCount
      || Math.max(...counts) - Math.min(...counts) > 1) {
      throw new Error("replicate_average_canary_v2_position_balance_invalid");
    }
  }
  for (const position of [1, 2, 3, 4]) {
    const aCount = ["A1", "A2"].reduce((sum, label) => sum
      + (positionCounts.get(`${label}:${position}`) ?? 0), 0);
    const bCount = ["B1", "B2"].reduce((sum, label) => sum
      + (positionCounts.get(`${label}:${position}`) ?? 0), 0);
    if (aCount !== input.plan.registeredUnitCount / 2
      || bCount !== input.plan.registeredUnitCount / 2) {
      throw new Error("replicate_average_canary_v2_block_position_balance_invalid");
    }
  }
  for (const snapshot of freeze.snapshots) {
    const unitCells = freeze.cells.filter(cell => cell.snapshotHash === snapshot.contentHash);
    if (unitCells.length !== 4
      || new Set(unitCells.map(cell => cell.replicateLabel)).size !== 4
      || new Set(unitCells.map(cell => cell.promptHash)).size !== 1
      || new Set(unitCells.map(cell => cell.requestHash)).size !== 4) {
      throw new Error("replicate_average_canary_v2_duplicate_contract_invalid");
    }
  }
  const expectedSourceHashes = input.plan.sourceTaskIds.map(taskId => {
    const formation = formationByTask.get(taskId);
    if (!formation) throw new Error("replicate_average_canary_v2_source_formation_set_invalid");
    return formation.contentHash;
  });
  if (JSON.stringify(freeze.sourceFormationHashes) !== JSON.stringify(expectedSourceHashes)) {
    throw new Error("replicate_average_canary_v2_source_hash_binding_invalid");
  }
  if (hashCollectiveDynamicsValueV1(withoutContentHash(freeze)) !== freeze.contentHash) {
    throw new Error("replicate_average_canary_v2_freeze_hash_mismatch");
  }
}

function createMonotonicClock(clock?: () => string): () => string {
  if (clock) return clock;
  let previous = Number.NEGATIVE_INFINITY;
  return () => {
    const next = Math.max(Date.now(), previous + 1);
    previous = next;
    return new Date(next).toISOString();
  };
}

function requireCanonicalTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error("replicate_average_canary_v2_timestamp_invalid");
  }
  return parsed;
}

function parseFailureCode(error: unknown): string {
  return error instanceof Error && /^sensor_canary_[a-z0-9_]+$/.test(error.message)
    ? error.message
    : "sensor_canary_parse_unknown";
}

export async function executeCollectiveDynamicsReplicateAverageCanaryV2(input: {
  plan: CollectiveDynamicsReplicateAverageCanaryPlanV2;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
  invoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
  clock?: () => string;
  onStart?: (event: ReplicateAverageAttemptStartV2) => void;
  onTerminal?: (event: ReplicateAverageAttemptTerminalV2) => void;
}): Promise<CollectiveDynamicsReplicateAverageRunV2> {
  verifyCollectiveDynamicsReplicateAverageFreezeV2(input);
  const clock = createMonotonicClock(input.clock);
  const signal = input.signal ?? new AbortController().signal;
  const snapshotByHash = new Map(input.freeze.snapshots.map(snapshot => [snapshot.contentHash, snapshot]));
  const terminals: CollectiveDynamicsSensorCanaryTerminalV1[] = [];
  let lastTimestamp = Number.NEGATIVE_INFINITY;
  for (const cell of input.freeze.cells) {
    const startedAt = clock();
    const startedMillis = requireCanonicalTimestamp(startedAt);
    if (startedMillis <= lastTimestamp) {
      throw new Error("replicate_average_canary_v2_clock_not_monotonic");
    }
    lastTimestamp = startedMillis;
    input.onStart?.({
      type: "started",
      cellId: cell.cellId,
      requestId: cell.request.requestId,
      requestHash: cell.requestHash,
      sequence: cell.globalSequence,
      timestamp: startedAt,
    });
    let result: SingleAttemptTextInvokeResult | undefined;
    let invocationError: unknown;
    try {
      result = await input.invoker.invoke(cloneJson(cell.request), signal);
    } catch (error) {
      invocationError = error;
    }
    const terminalAt = clock();
    const terminalMillis = requireCanonicalTimestamp(terminalAt);
    if (terminalMillis <= lastTimestamp) {
      throw new Error("replicate_average_canary_v2_clock_not_monotonic");
    }
    lastTimestamp = terminalMillis;
    const base = {
      cellId: cell.cellId,
      requestId: cell.request.requestId,
      requestHash: cell.requestHash,
      promptHash: cell.promptHash,
      startedAt,
      terminalAt,
    };
    let terminal: CollectiveDynamicsSensorCanaryTerminalV1;
    if (!result) {
      terminal = { ...base, status: providerFailureCode(invocationError) };
    } else {
      const snapshot = snapshotByHash.get(cell.snapshotHash)!;
      try {
        const parsed = parseMappedCollectiveDynamicsSensorReportV1_1(result.rawContent, snapshot);
        terminal = {
          ...base,
          status: "valid",
          rawResponse: result.rawContent,
          responseHash: hashCollectiveDynamicsValueV1(result.rawContent),
          parsed,
          ...(result.providerMetadata ? { providerMetadata: cloneJson(result.providerMetadata) } : {}),
          ...(result.usage ? { usage: cloneJson(result.usage) } : {}),
        };
      } catch (error) {
        terminal = {
          ...base,
          status: "invalid_response",
          rawResponse: result.rawContent,
          responseHash: hashCollectiveDynamicsValueV1(result.rawContent),
          parseFailureCode: parseFailureCode(error),
          ...(result.providerMetadata ? { providerMetadata: cloneJson(result.providerMetadata) } : {}),
          ...(result.usage ? { usage: cloneJson(result.usage) } : {}),
        };
      }
    }
    terminals.push(terminal);
    input.onTerminal?.({
      type: "terminal",
      cellId: cell.cellId,
      requestId: cell.request.requestId,
      requestHash: cell.requestHash,
      sequence: cell.globalSequence,
      status: terminal.status,
      timestamp: terminal.terminalAt,
      terminal: cloneJson(terminal),
    });
  }
  const body: Omit<CollectiveDynamicsReplicateAverageRunV2, "contentHash"> = {
    runRef: COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_RUN_V2,
    planHash: input.plan.contentHash,
    freezeHash: input.freeze.contentHash,
    terminals,
    registeredCellCount: 40,
    terminalCellCount: 40,
    attemptsPerCell: 1,
    retry: "none",
  };
  const artifact = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyCollectiveDynamicsReplicateAverageRunV2({ freeze: input.freeze, artifact });
  return cloneJson(artifact);
}

export function verifyCollectiveDynamicsReplicateAverageRunV2(input: {
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
  artifact: CollectiveDynamicsReplicateAverageRunV2;
}): void {
  const { freeze, artifact } = input;
  if (artifact.runRef.id !== COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_RUN_V2.id
    || artifact.runRef.version !== COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_RUN_V2.version
    || artifact.planHash !== freeze.planHash || artifact.freezeHash !== freeze.contentHash
    || artifact.registeredCellCount !== freeze.registeredCellCount
    || artifact.terminalCellCount !== freeze.registeredCellCount
    || artifact.attemptsPerCell !== 1 || artifact.retry !== "none"
    || artifact.terminals.length !== freeze.registeredCellCount
    || new Set(artifact.terminals.map(terminal => terminal.cellId)).size
      !== freeze.registeredCellCount) {
    throw new Error("replicate_average_canary_v2_run_scope_invalid");
  }
  const cellById = new Map(freeze.cells.map(cell => [cell.cellId, cell]));
  const snapshotByHash = new Map(freeze.snapshots.map(snapshot => [snapshot.contentHash, snapshot]));
  for (const terminal of artifact.terminals) {
    const cell = cellById.get(terminal.cellId);
    if (!cell || terminal.requestId !== cell.request.requestId
      || terminal.requestHash !== cell.requestHash || terminal.promptHash !== cell.promptHash
      || requireCanonicalTimestamp(terminal.terminalAt) <= requireCanonicalTimestamp(terminal.startedAt)) {
      throw new Error("replicate_average_canary_v2_terminal_binding_invalid");
    }
    const snapshot = snapshotByHash.get(cell.snapshotHash)!;
    if (terminal.status === "valid") {
      if (terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)
        || JSON.stringify(parseMappedCollectiveDynamicsSensorReportV1_1(
          terminal.rawResponse, snapshot,
        )) !== JSON.stringify(terminal.parsed)) {
        throw new Error("replicate_average_canary_v2_parse_replay_mismatch");
      }
    } else if (terminal.status === "invalid_response") {
      if (terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)) {
        throw new Error("replicate_average_canary_v2_response_hash_mismatch");
      }
      let code = "";
      try { parseMappedCollectiveDynamicsSensorReportV1_1(terminal.rawResponse, snapshot); }
      catch (error) { code = parseFailureCode(error); }
      if (!code || code !== terminal.parseFailureCode) {
        throw new Error("replicate_average_canary_v2_invalid_response_replay_mismatch");
      }
    } else if (!["provider_timeout", "provider_network", "provider_rate_limit", "provider_auth",
      "provider_api_error", "provider_invalid_response", "provider_unknown", "provider_error"]
      .includes(terminal.status)) {
      throw new Error("replicate_average_canary_v2_terminal_status_invalid");
    }
  }
  if (hashCollectiveDynamicsValueV1(withoutContentHash(artifact)) !== artifact.contentHash) {
    throw new Error("replicate_average_canary_v2_run_hash_mismatch");
  }
}
