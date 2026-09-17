/**
 * Zero-provider matched-sham freeze following the M1 one-step peer screen.
 * SHAM preserves message count and source-message character lengths while
 * replacing task content with deterministic neutral filler. It is a bundle
 * control, not a claim of semantic equivalence to peer discussion.
 */
import {
  buildCollectiveDynamicsPeerBundlePlanV1,
  buildCollectiveDynamicsPeerBundlePromptV1,
  buildCollectiveDynamicsPeerBundleSnapshotV1,
  type CollectiveDynamicsPeerBundleSnapshotV1,
} from "./collectiveDynamicsPeerBundleFreezeV1";
import {
  buildCollectiveDynamicsSensorSnapshotV1,
  COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
  type ShadowSensorPublicMessageV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
} from "./collectiveDynamicsV1";
import type { SingleAttemptTextInvokeRequest } from "./providerAdapters";

export const COLLECTIVE_DYNAMICS_MATCHED_SHAM_CANARY_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-matched-sham-canary",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_MATCHED_SHAM_FREEZE_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-matched-sham-canary.freeze",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_MATCHED_SHAM_VARIANTS_V1 = [
  "NO_PEER_A", "NO_PEER_B", "PEER_A", "PEER_B", "SHAM_A", "SHAM_B",
] as const;

export type CollectiveDynamicsMatchedShamVariantV1 =
  typeof COLLECTIVE_DYNAMICS_MATCHED_SHAM_VARIANTS_V1[number];

type MatchedShamConditionV1 = "NO_PEER" | "PEER" | "SHAM";

export interface CollectiveDynamicsMatchedShamPlanV1 {
  planRef: typeof COLLECTIVE_DYNAMICS_MATCHED_SHAM_CANARY_V1;
  sourceFormationDirectory: string;
  sourceTaskIds: number[];
  sourceAgentCounts: number[];
  sourceTaskSelection: "preexisting_truth_free_systematic_dev10_order";
  sourceSeed: 1;
  checkpointRound: 1;
  registeredUnitCount: 38;
  variants: CollectiveDynamicsMatchedShamVariantV1[];
  plannedProviderCalls: 228;
  modelRef: { id: "zhipu:glm-4.6v"; version: "1.0.0" };
  promptRef: typeof COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1;
  parserRef: { id: string; version: "1.1.0" };
  invocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 256;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  orderingPolicy: "six_condition_cyclic_near_balance_v1";
  primaryComparison: "peer_minus_sham_and_no_peer_bundle_response";
  inferenceUnit: "task";
  pairedObservationUnit: "task_agent_frozen_view";
  truthAccess: "none";
  contentHash: string;
}

export interface CollectiveDynamicsMatchedShamSnapshotV1
  extends CollectiveDynamicsPeerBundleSnapshotV1 {
  matchedShamSnapshotRef: typeof COLLECTIVE_DYNAMICS_MATCHED_SHAM_CANARY_V1;
  shamMessageShapeHash: string;
}

export interface CollectiveDynamicsMatchedShamPromptV1 {
  promptRef: typeof COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1;
  snapshotHash: string;
  condition: MatchedShamConditionV1;
  repeatLabel: "A" | "B";
  systemPrompt: string;
  userPrompt: string;
  auxiliaryBlockHash: string;
  contentHash: string;
}

export interface CollectiveDynamicsMatchedShamCellV1 {
  cellId: string;
  unitId: string;
  sourceTaskId: number;
  agentId: string;
  snapshotHash: string;
  condition: MatchedShamConditionV1;
  repeatLabel: "A" | "B";
  withinUnitPosition: 1 | 2 | 3 | 4 | 5 | 6;
  globalSequence: number;
  request: SingleAttemptTextInvokeRequest;
  promptHash: string;
  auxiliaryBlockHash: string;
  requestHash: string;
}

export interface CollectiveDynamicsMatchedShamFreezeV1 {
  freezeRef: typeof COLLECTIVE_DYNAMICS_MATCHED_SHAM_FREEZE_V1;
  planHash: string;
  sourceFormationHashes: string[];
  snapshots: CollectiveDynamicsMatchedShamSnapshotV1[];
  cells: CollectiveDynamicsMatchedShamCellV1[];
  registeredUnitCount: 38;
  registeredCellCount: 228;
  orderingPolicy: "six_condition_cyclic_near_balance_v1";
  truthAccess: "none";
  contentHash: string;
}

const NEUTRAL_SENTENCE_V1 =
  "A participant shared an ordinary observation for consideration in this round. ";

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withoutContentHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

function parserRef(): { id: string; version: "1.1.0" } {
  return {
    id: "swarmalpha.experiment.v6.shadow-probability-sensor-parser",
    version: "1.1.0",
  };
}

export function buildCollectiveDynamicsMatchedShamPlanV1(input?: {
  sourceFormationDirectory?: string;
}): CollectiveDynamicsMatchedShamPlanV1 {
  const peerPlan = buildCollectiveDynamicsPeerBundlePlanV1({
    sourceFormationDirectory: input?.sourceFormationDirectory,
  });
  const body: Omit<CollectiveDynamicsMatchedShamPlanV1, "contentHash"> = {
    planRef: COLLECTIVE_DYNAMICS_MATCHED_SHAM_CANARY_V1,
    sourceFormationDirectory: peerPlan.sourceFormationDirectory,
    sourceTaskIds: [...peerPlan.sourceTaskIds],
    sourceAgentCounts: [...peerPlan.sourceAgentCounts],
    sourceTaskSelection: peerPlan.sourceTaskSelection,
    sourceSeed: 1,
    checkpointRound: 1,
    registeredUnitCount: 38,
    variants: [...COLLECTIVE_DYNAMICS_MATCHED_SHAM_VARIANTS_V1],
    plannedProviderCalls: 228,
    modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
    promptRef: COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
    parserRef: parserRef(),
    invocation: {
      temperature: 0,
      seed: 1,
      maxTokens: 256,
      thinking: "disabled",
      attemptsPerCell: 1,
      retry: "none",
    },
    orderingPolicy: "six_condition_cyclic_near_balance_v1",
    primaryComparison: "peer_minus_sham_and_no_peer_bundle_response",
    inferenceUnit: "task",
    pairedObservationUnit: "task_agent_frozen_view",
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsMatchedShamPlanV1(
  plan: CollectiveDynamicsMatchedShamPlanV1,
): void {
  assertCollectiveDynamicsTruthBlindV1(plan);
  if (hashCollectiveDynamicsValueV1(withoutContentHash(plan)) !== plan.contentHash) {
    throw new Error("matched_sham_plan_hash_mismatch");
  }
  const expected = buildCollectiveDynamicsMatchedShamPlanV1({
    sourceFormationDirectory: plan.sourceFormationDirectory,
  });
  if (JSON.stringify(plan) !== JSON.stringify(expected)) {
    throw new Error("matched_sham_plan_drift");
  }
  if (plan.sourceTaskIds.length !== 10
    || plan.sourceAgentCounts.length !== 10
    || plan.sourceAgentCounts.reduce((sum, count) => sum + count, 0) !== 38
    || plan.registeredUnitCount !== 38
    || plan.plannedProviderCalls !== 228
    || plan.plannedProviderCalls !== plan.registeredUnitCount * plan.variants.length
    || JSON.stringify(plan.variants) !== JSON.stringify(COLLECTIVE_DYNAMICS_MATCHED_SHAM_VARIANTS_V1)
    || plan.checkpointRound !== 1 || plan.parserRef.version !== "1.1.0") {
    throw new Error("matched_sham_plan_scope_invalid");
  }
}

function peerBlock(peerMessages: readonly ShadowSensorPublicMessageV1[]): string {
  return [
    "<OTHER_AGENTS_PUBLIC_MESSAGES_IN_CANONICAL_ROSTER_ORDER>",
    ...peerMessages.map(message => `[agent_id=${message.agentId}] ${message.content}`),
    "</OTHER_AGENTS_PUBLIC_MESSAGES_IN_CANONICAL_ROSTER_ORDER>",
  ].join("\n");
}

function neutralText(length: number, messageIndex: number): string {
  const prefix = `Participant ${messageIndex + 1} observation. `;
  let text = prefix;
  while (text.length < length) text += NEUTRAL_SENTENCE_V1;
  return text.slice(0, length);
}

function shamBlock(peerMessages: readonly ShadowSensorPublicMessageV1[]): string {
  return [
    "<OTHER_AGENTS_PUBLIC_MESSAGES_IN_CANONICAL_ROSTER_ORDER>",
    ...peerMessages.map((message, index) =>
      `[agent_id=peer_${index + 1}] ${neutralText(message.content.length, index)}`),
    "</OTHER_AGENTS_PUBLIC_MESSAGES_IN_CANONICAL_ROSTER_ORDER>",
  ].join("\n");
}

function shamShapeHash(peerMessages: readonly ShadowSensorPublicMessageV1[]): string {
  return hashCollectiveDynamicsValueV1(peerMessages.map(message => ({
    round: message.round,
    contentLength: message.content.length,
  })));
}

export function buildCollectiveDynamicsMatchedShamSnapshotV1(input: {
  formation: CollectiveDynamicsFormationArtifactV1;
  agentId: string;
}): CollectiveDynamicsMatchedShamSnapshotV1 {
  const snapshot = buildCollectiveDynamicsPeerBundleSnapshotV1(input);
  const full = buildCollectiveDynamicsSensorSnapshotV1({
    formation: input.formation,
    agentId: input.agentId,
    checkpointRound: 1,
  });
  const { contentHash: _contentHash, ...snapshotBody } = snapshot;
  const body: Omit<CollectiveDynamicsMatchedShamSnapshotV1, "contentHash"> = {
    ...snapshotBody,
    matchedShamSnapshotRef: COLLECTIVE_DYNAMICS_MATCHED_SHAM_CANARY_V1,
    shamMessageShapeHash: shamShapeHash(full.peerPublicMessages),
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function promptHash(input: { systemPrompt: string; userPrompt: string }): string {
  return hashCollectiveDynamicsValueV1({
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    responseFormat: "json",
  });
}

export function buildCollectiveDynamicsMatchedShamPromptV1(input: {
  snapshot: CollectiveDynamicsMatchedShamSnapshotV1;
  peerMessages: readonly ShadowSensorPublicMessageV1[];
  condition: MatchedShamConditionV1;
  repeatLabel: "A" | "B";
}): CollectiveDynamicsMatchedShamPromptV1 {
  const base = buildCollectiveDynamicsPeerBundlePromptV1({
    snapshot: input.snapshot,
    peerMessages: input.peerMessages,
    condition: "NO_PEER",
    repeatLabel: input.repeatLabel,
  });
  const auxiliary = input.condition === "PEER"
    ? peerBlock(input.peerMessages)
    : input.condition === "SHAM" ? shamBlock(input.peerMessages) : "";
  const userPrompt = input.condition === "NO_PEER"
    ? base.userPrompt
    : `${base.userPrompt}\n\n${auxiliary}`;
  if (input.condition !== "NO_PEER" && userPrompt !== `${base.userPrompt}\n\n${auxiliary}`) {
    throw new Error("matched_sham_prompt_append_invariant_internal_failure");
  }
  const body: Omit<CollectiveDynamicsMatchedShamPromptV1, "contentHash"> = {
    promptRef: COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
    snapshotHash: input.snapshot.contentHash,
    condition: input.condition,
    repeatLabel: input.repeatLabel,
    systemPrompt: base.systemPrompt,
    userPrompt,
    auxiliaryBlockHash: hashCollectiveDynamicsValueV1(auxiliary),
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

type VariantOrderV1 = readonly CollectiveDynamicsMatchedShamVariantV1[];

const POSITION_ORDERS_V1: readonly VariantOrderV1[] = [
  ["NO_PEER_A", "NO_PEER_B", "PEER_A", "PEER_B", "SHAM_A", "SHAM_B"],
  ["PEER_A", "PEER_B", "SHAM_A", "SHAM_B", "NO_PEER_A", "NO_PEER_B"],
  ["SHAM_A", "SHAM_B", "NO_PEER_A", "NO_PEER_B", "PEER_A", "PEER_B"],
  ["NO_PEER_B", "PEER_A", "PEER_B", "SHAM_A", "SHAM_B", "NO_PEER_A"],
  ["PEER_B", "SHAM_A", "SHAM_B", "NO_PEER_A", "NO_PEER_B", "PEER_A"],
  ["SHAM_B", "NO_PEER_A", "NO_PEER_B", "PEER_A", "PEER_B", "SHAM_A"],
];

function conditionOf(variant: CollectiveDynamicsMatchedShamVariantV1): MatchedShamConditionV1 {
  if (variant.startsWith("NO_PEER")) return "NO_PEER";
  if (variant.startsWith("PEER")) return "PEER";
  return "SHAM";
}

function repeatOf(variant: CollectiveDynamicsMatchedShamVariantV1): "A" | "B" {
  return variant.endsWith("A") ? "A" : "B";
}

function canonicalPromptHash(prompt: { systemPrompt: string; userPrompt: string }): string {
  return promptHash(prompt);
}

function sourcePeerMessages(
  formation: CollectiveDynamicsFormationArtifactV1,
  agentId: string,
): ShadowSensorPublicMessageV1[] {
  return buildCollectiveDynamicsSensorSnapshotV1({
    formation,
    agentId,
    checkpointRound: 1,
  }).peerPublicMessages;
}

export function buildCollectiveDynamicsMatchedShamFreezeV1(input: {
  plan: CollectiveDynamicsMatchedShamPlanV1;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
}): CollectiveDynamicsMatchedShamFreezeV1 {
  verifyCollectiveDynamicsMatchedShamPlanV1(input.plan);
  if (input.formations.length !== input.plan.sourceTaskIds.length) {
    throw new Error("matched_sham_source_formation_count_invalid");
  }
  const formationByTask = new Map(input.formations.map(formation => [
    formation.onlineTask.sourceTaskId, formation,
  ]));
  if (formationByTask.size !== input.formations.length
    || input.plan.sourceTaskIds.some(taskId => !formationByTask.has(taskId))) {
    throw new Error("matched_sham_source_formation_set_invalid");
  }
  const snapshots: CollectiveDynamicsMatchedShamSnapshotV1[] = [];
  input.plan.sourceTaskIds.forEach((taskId, taskIndex) => {
    const formation = formationByTask.get(taskId)!;
    verifyFormationArtifactV1(formation);
    if (formation.seed !== input.plan.sourceSeed
      || formation.modelRef.id !== input.plan.modelRef.id
      || formation.modelRef.version !== input.plan.modelRef.version
      || formation.onlineTask.agents.length !== input.plan.sourceAgentCounts[taskIndex]) {
      throw new Error("matched_sham_source_formation_binding_invalid");
    }
    formation.onlineTask.agents.forEach(agent => {
      snapshots.push(buildCollectiveDynamicsMatchedShamSnapshotV1({
        formation,
        agentId: agent.agentId,
      }));
    });
  });
  if (snapshots.length !== input.plan.registeredUnitCount) {
    throw new Error("matched_sham_registered_unit_count_invalid");
  }
  const cells: CollectiveDynamicsMatchedShamCellV1[] = [];
  let globalSequence = 0;
  snapshots.forEach((snapshot, unitIndex) => {
    const formation = formationByTask.get(snapshot.sourceTaskId)!;
    const peerMessages = sourcePeerMessages(formation, snapshot.agentId);
    const expectedShapeHash = shamShapeHash(peerMessages);
    if (expectedShapeHash !== snapshot.shamMessageShapeHash) {
      throw new Error("matched_sham_message_shape_hash_invalid");
    }
    const order = POSITION_ORDERS_V1[unitIndex % POSITION_ORDERS_V1.length];
    order.forEach((variant, positionIndex) => {
      globalSequence += 1;
      const condition = conditionOf(variant);
      const repeatLabel = repeatOf(variant);
      const prompt = buildCollectiveDynamicsMatchedShamPromptV1({
        snapshot,
        peerMessages,
        condition,
        repeatLabel,
      });
      const unitId = `task-${snapshot.sourceTaskId}:agent-${snapshot.expectedAgentIds.indexOf(snapshot.agentId) + 1}`;
      const requestId = `matched-sham-canary:${unitId}:${variant.toLowerCase()}`;
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
        condition,
        repeatLabel,
        withinUnitPosition: (positionIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6,
        globalSequence,
        request,
        promptHash: canonicalPromptHash(prompt),
        auxiliaryBlockHash: prompt.auxiliaryBlockHash,
        requestHash: hashCollectiveDynamicsValueV1(request),
      });
    });
  });
  const body: Omit<CollectiveDynamicsMatchedShamFreezeV1, "contentHash"> = {
    freezeRef: COLLECTIVE_DYNAMICS_MATCHED_SHAM_FREEZE_V1,
    planHash: input.plan.contentHash,
    sourceFormationHashes: input.plan.sourceTaskIds.map(taskId => formationByTask.get(taskId)!.contentHash),
    snapshots,
    cells,
    registeredUnitCount: 38,
    registeredCellCount: 228,
    orderingPolicy: "six_condition_cyclic_near_balance_v1",
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  const freeze = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyCollectiveDynamicsMatchedShamFreezeV1({ ...input, freeze });
  return cloneJson(freeze);
}

export function verifyCollectiveDynamicsMatchedShamFreezeV1(input: {
  plan: CollectiveDynamicsMatchedShamPlanV1;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsMatchedShamFreezeV1;
}): void {
  verifyCollectiveDynamicsMatchedShamPlanV1(input.plan);
  assertCollectiveDynamicsTruthBlindV1(input.freeze);
  const freeze = input.freeze;
  if (freeze.freezeRef.id !== COLLECTIVE_DYNAMICS_MATCHED_SHAM_FREEZE_V1.id
    || freeze.freezeRef.version !== COLLECTIVE_DYNAMICS_MATCHED_SHAM_FREEZE_V1.version
    || freeze.planHash !== input.plan.contentHash
    || freeze.registeredUnitCount !== 38 || freeze.registeredCellCount !== 228
    || freeze.snapshots.length !== 38 || freeze.cells.length !== 228
    || freeze.orderingPolicy !== input.plan.orderingPolicy || freeze.truthAccess !== "none") {
    throw new Error("matched_sham_freeze_scope_invalid");
  }
  const formationByTask = new Map(input.formations.map(formation => [
    formation.onlineTask.sourceTaskId, formation,
  ]));
  const expectedSnapshots = input.plan.sourceTaskIds.flatMap(taskId => {
    const formation = formationByTask.get(taskId);
    if (!formation) throw new Error("matched_sham_source_formation_set_invalid");
    verifyFormationArtifactV1(formation);
    return formation.onlineTask.agents.map(agent =>
      buildCollectiveDynamicsMatchedShamSnapshotV1({ formation, agentId: agent.agentId }));
  });
  if (JSON.stringify(freeze.snapshots) !== JSON.stringify(expectedSnapshots)) {
    throw new Error("matched_sham_snapshot_binding_invalid");
  }
  const snapshotByHash = new Map(freeze.snapshots.map(snapshot => [snapshot.contentHash, snapshot]));
  const positionCounts = new Map<string, number>();
  freeze.cells.forEach((cell, index) => {
    const snapshot = snapshotByHash.get(cell.snapshotHash);
    const expectedVariant = POSITION_ORDERS_V1[Math.floor(index / 6) % 6][index % 6];
    const expectedCondition = conditionOf(expectedVariant);
    const expectedRepeat = repeatOf(expectedVariant);
    if (!snapshot || cell.globalSequence !== index + 1
      || cell.condition !== expectedCondition || cell.repeatLabel !== expectedRepeat
      || cell.request.requestId !== cell.cellId
      || cell.requestHash !== hashCollectiveDynamicsValueV1(cell.request)
      || cell.sourceTaskId !== snapshot.sourceTaskId || cell.agentId !== snapshot.agentId) {
      throw new Error("matched_sham_cell_binding_invalid");
    }
    const formation = formationByTask.get(snapshot.sourceTaskId)!;
    const peerMessages = sourcePeerMessages(formation, snapshot.agentId);
    const prompt = buildCollectiveDynamicsMatchedShamPromptV1({
      snapshot,
      peerMessages,
      condition: cell.condition,
      repeatLabel: cell.repeatLabel,
    });
    if (cell.request.systemPrompt !== prompt.systemPrompt
      || cell.request.userPrompt !== prompt.userPrompt
      || cell.promptHash !== canonicalPromptHash(prompt)
      || cell.auxiliaryBlockHash !== prompt.auxiliaryBlockHash) {
      throw new Error("matched_sham_prompt_mismatch");
    }
    positionCounts.set(`${expectedVariant}:${cell.withinUnitPosition}`,
      (positionCounts.get(`${expectedVariant}:${cell.withinUnitPosition}`) ?? 0) + 1);
  });
  for (const variant of COLLECTIVE_DYNAMICS_MATCHED_SHAM_VARIANTS_V1) {
    const counts = [1, 2, 3, 4, 5, 6].map(position =>
      positionCounts.get(`${variant}:${position}`) ?? 0);
    if (counts.reduce((sum, count) => sum + count, 0) !== 38
      || Math.max(...counts) - Math.min(...counts) > 1) {
      throw new Error("matched_sham_position_balance_invalid");
    }
  }
  for (const position of [1, 2, 3, 4, 5, 6]) {
    const counts = ["NO_PEER", "PEER", "SHAM"].map(condition =>
      [...positionCounts.entries()]
        .filter(([key]) => key.endsWith(`:${position}`) && key.startsWith(`${condition}_`))
        .reduce((sum, [, count]) => sum + count, 0));
    if (Math.max(...counts) - Math.min(...counts) > 1) {
      throw new Error("matched_sham_condition_position_balance_invalid");
    }
  }
  for (const snapshot of freeze.snapshots) {
    const unitCells = freeze.cells.filter(cell => cell.snapshotHash === snapshot.contentHash);
    if (unitCells.length !== 6
      || new Set(unitCells.map(cell => `${cell.condition}_${cell.repeatLabel}`)).size !== 6
      || new Set(unitCells.filter(cell => cell.condition === "NO_PEER").map(cell => cell.promptHash)).size !== 1
      || new Set(unitCells.filter(cell => cell.condition === "PEER").map(cell => cell.promptHash)).size !== 1
      || new Set(unitCells.filter(cell => cell.condition === "SHAM").map(cell => cell.promptHash)).size !== 1
      || new Set(unitCells.map(cell => cell.requestHash)).size !== 6) {
      throw new Error("matched_sham_unit_duplicate_contract_invalid");
    }
    const noPeer = unitCells.find(cell => cell.condition === "NO_PEER" && cell.repeatLabel === "A")!;
    const peer = unitCells.find(cell => cell.condition === "PEER" && cell.repeatLabel === "A")!;
    const sham = unitCells.find(cell => cell.condition === "SHAM" && cell.repeatLabel === "A")!;
    if (!peer.request.userPrompt.startsWith(`${noPeer.request.userPrompt}\n\n`)) {
      throw new Error("matched_sham_peer_append_invariant_invalid");
    }
    if (!sham.request.userPrompt.startsWith(`${noPeer.request.userPrompt}\n\n`)) {
      throw new Error("matched_sham_sham_append_invariant_invalid");
    }
  }
  const expectedHashes = input.plan.sourceTaskIds.map(taskId => formationByTask.get(taskId)!.contentHash);
  if (JSON.stringify(freeze.sourceFormationHashes) !== JSON.stringify(expectedHashes)) {
    throw new Error("matched_sham_source_hash_binding_invalid");
  }
  if (hashCollectiveDynamicsValueV1(withoutContentHash(freeze)) !== freeze.contentHash) {
    throw new Error("matched_sham_freeze_hash_mismatch");
  }
}
