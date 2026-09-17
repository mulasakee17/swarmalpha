/**
 * Zero-provider M1 freeze for the pre-peer NO_PEER/PEER bundle contrast.
 * This module deliberately stops at source projection and request freezing;
 * it does not execute a provider call or create a governance action.
 */
import {
  buildCollectiveDynamicsSensorPromptV1,
  buildCollectiveDynamicsSensorSnapshotV1,
  COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
  type CollectiveDynamicsSensorSnapshotV1,
  type ShadowSensorPublicMessageV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
} from "./collectiveDynamicsV1";
import type { SingleAttemptTextInvokeRequest } from "./providerAdapters";

export const COLLECTIVE_DYNAMICS_PEER_BUNDLE_CANARY_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-peer-bundle-canary",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-peer-bundle-canary.freeze",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_PEER_BUNDLE_VARIANTS_V1 = [
  "NO_PEER_A", "NO_PEER_B", "PEER_A", "PEER_B",
] as const;

export type CollectiveDynamicsPeerBundleVariantV1 =
  typeof COLLECTIVE_DYNAMICS_PEER_BUNDLE_VARIANTS_V1[number];

type PeerBundleConditionV1 = "NO_PEER" | "PEER";

const DEV10_TASK_IDS_V1 = [1, 8, 15, 22, 29, 36, 43, 50, 57, 64] as const;
const DEV10_AGENT_COUNTS_V1 = [4, 3, 4, 4, 4, 4, 4, 3, 4, 4] as const;

export interface CollectiveDynamicsPeerBundlePlanV1 {
  planRef: typeof COLLECTIVE_DYNAMICS_PEER_BUNDLE_CANARY_V1;
  sourceFormationDirectory: string;
  sourceTaskIds: [...typeof DEV10_TASK_IDS_V1];
  sourceAgentCounts: [...typeof DEV10_AGENT_COUNTS_V1];
  sourceTaskSelection: "preexisting_truth_free_systematic_dev10_order";
  sourceSeed: 1;
  checkpointRound: 1;
  registeredUnitCount: 38;
  variants: CollectiveDynamicsPeerBundleVariantV1[];
  plannedProviderCalls: 152;
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
  orderingPolicy: "four_condition_cyclic_near_balance_v1";
  primaryComparison: "peer_minus_no_peer_replicate_average";
  inferenceUnit: "task";
  pairedObservationUnit: "task_agent_frozen_view";
  truthAccess: "none";
  contentHash: string;
}

export interface CollectiveDynamicsPeerBundleSnapshotV1
  extends CollectiveDynamicsSensorSnapshotV1 {
  peerBundleSnapshotRef: typeof COLLECTIVE_DYNAMICS_PEER_BUNDLE_CANARY_V1;
  peerSourceMessageHash: string;
}

export interface CollectiveDynamicsPeerBundlePromptV1 {
  promptRef: typeof COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1;
  snapshotHash: string;
  condition: PeerBundleConditionV1;
  repeatLabel: "A" | "B";
  systemPrompt: string;
  userPrompt: string;
  peerBlockHash: string;
  contentHash: string;
}

export interface CollectiveDynamicsPeerBundleCellV1 {
  cellId: string;
  unitId: string;
  sourceTaskId: number;
  agentId: string;
  snapshotHash: string;
  condition: PeerBundleConditionV1;
  repeatLabel: "A" | "B";
  withinUnitPosition: 1 | 2 | 3 | 4;
  globalSequence: number;
  request: SingleAttemptTextInvokeRequest;
  promptHash: string;
  peerBlockHash: string;
  requestHash: string;
}

export interface CollectiveDynamicsPeerBundleFreezeV1 {
  freezeRef: typeof COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_V1;
  planHash: string;
  sourceFormationHashes: string[];
  snapshots: CollectiveDynamicsPeerBundleSnapshotV1[];
  cells: CollectiveDynamicsPeerBundleCellV1[];
  registeredUnitCount: 38;
  registeredCellCount: 152;
  orderingPolicy: "four_condition_cyclic_near_balance_v1";
  truthAccess: "none";
  contentHash: string;
}

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

export function buildCollectiveDynamicsPeerBundlePlanV1(input?: {
  sourceFormationDirectory?: string;
}): CollectiveDynamicsPeerBundlePlanV1 {
  const body: Omit<CollectiveDynamicsPeerBundlePlanV1, "contentHash"> = {
    planRef: COLLECTIVE_DYNAMICS_PEER_BUNDLE_CANARY_V1,
    sourceFormationDirectory: input?.sourceFormationDirectory
      ?? "results/v6_collective_dynamics_v1_glm46v_monitor_screen10_seed1",
    sourceTaskIds: [...DEV10_TASK_IDS_V1],
    sourceAgentCounts: [...DEV10_AGENT_COUNTS_V1],
    sourceTaskSelection: "preexisting_truth_free_systematic_dev10_order",
    sourceSeed: 1,
    checkpointRound: 1,
    registeredUnitCount: 38,
    variants: [...COLLECTIVE_DYNAMICS_PEER_BUNDLE_VARIANTS_V1],
    plannedProviderCalls: 152,
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
    orderingPolicy: "four_condition_cyclic_near_balance_v1",
    primaryComparison: "peer_minus_no_peer_replicate_average",
    inferenceUnit: "task",
    pairedObservationUnit: "task_agent_frozen_view",
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsPeerBundlePlanV1(
  plan: CollectiveDynamicsPeerBundlePlanV1,
): void {
  assertCollectiveDynamicsTruthBlindV1(plan);
  const { contentHash, ...body } = plan;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("peer_bundle_plan_hash_mismatch");
  }
  const expected = buildCollectiveDynamicsPeerBundlePlanV1({
    sourceFormationDirectory: plan.sourceFormationDirectory,
  });
  if (JSON.stringify(plan) !== JSON.stringify(expected)) {
    throw new Error("peer_bundle_plan_drift");
  }
  if (plan.sourceTaskIds.length !== 10
    || plan.sourceAgentCounts.length !== 10
    || plan.sourceAgentCounts.reduce((sum, count) => sum + count, 0) !== 38
    || plan.registeredUnitCount !== 38
    || plan.plannedProviderCalls !== 152
    || plan.plannedProviderCalls !== plan.registeredUnitCount * plan.variants.length
    || JSON.stringify(plan.variants) !== JSON.stringify(COLLECTIVE_DYNAMICS_PEER_BUNDLE_VARIANTS_V1)
    || plan.checkpointRound !== 1
    || plan.parserRef.version !== "1.1.0") {
    throw new Error("peer_bundle_plan_scope_invalid");
  }
}

function canonicalPromptHash(input: { systemPrompt: string; userPrompt: string }): string {
  return hashCollectiveDynamicsValueV1({
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    responseFormat: "json",
  });
}

function buildPeerBlock(peerMessages: readonly ShadowSensorPublicMessageV1[]): string {
  return [
    "<OTHER_AGENTS_PUBLIC_MESSAGES_IN_CANONICAL_ROSTER_ORDER>",
    ...peerMessages.map(message => `[agent_id=${message.agentId}] ${message.content}`),
    "</OTHER_AGENTS_PUBLIC_MESSAGES_IN_CANONICAL_ROSTER_ORDER>",
  ].join("\n");
}

function peerBlockHash(peerMessages: readonly ShadowSensorPublicMessageV1[]): string {
  return hashCollectiveDynamicsValueV1(peerMessages);
}

export function buildCollectiveDynamicsPeerBundleSnapshotV1(input: {
  formation: CollectiveDynamicsFormationArtifactV1;
  agentId: string;
}): CollectiveDynamicsPeerBundleSnapshotV1 {
  const full = buildCollectiveDynamicsSensorSnapshotV1({
    formation: input.formation,
    agentId: input.agentId,
    checkpointRound: 1,
  });
  const peerMessages = full.peerPublicMessages;
  const { contentHash: _sourceContentHash, ...sourceBody } = full;
  const body: Omit<CollectiveDynamicsPeerBundleSnapshotV1, "contentHash"> = {
    ...sourceBody,
    peerBundleSnapshotRef: COLLECTIVE_DYNAMICS_PEER_BUNDLE_CANARY_V1,
    peerSourceMessageHash: peerBlockHash(peerMessages),
    peerPublicMessages: [],
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  const snapshot = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  return cloneJson(snapshot);
}

function commonUserPrompt(snapshot: CollectiveDynamicsPeerBundleSnapshotV1): string {
  const displayedOptions = snapshot.claim.options.map(option => ({
    optionId: option.optionId,
    label: option.canonicalLabel,
  }));
  const instruction =
    "For every listed option ID, report the probability that it is the single correct outcome under the supplied view.";
  return [
    "INFORMATION_POLICY: Use only the supplied view. Do not add outside facts.",
    `TASK_PUBLIC_CONTEXT_JSON:\n${JSON.stringify(snapshot.publicContext)}`,
    `YOUR_PRIVATE_INFORMATION_JSON:\n${JSON.stringify(snapshot.ownPrivateInformation)}`,
    `ROLE_CONSTRAINTS_JSON:\n${JSON.stringify(snapshot.roleConstraints)}`,
    `YOUR_PUBLIC_MESSAGE_AT_CHECKPOINT_JSON:\n${JSON.stringify(snapshot.ownPublicMessage)}`,
    `CLAIM_JSON:\n${JSON.stringify({
      claimId: snapshot.claim.claimId,
      proposition: snapshot.claim.proposition,
      outcomeSpace: snapshot.claim.outcomeSpace,
      reportSemantics: snapshot.claim.reportSemantics,
    })}`,
    `OPTIONS_PRESENTATION_JSON:\n${JSON.stringify(displayedOptions)}`,
    `PROBABILITY_REPORT_INSTRUCTION:\n${instruction}`,
    `REQUIRED_PROBABILITY_KEYS_JSON:\n${JSON.stringify(snapshot.claim.options.map(option => option.optionId))}`,
    "Return exactly one JSON object with the sole key \"probabilities\". Its value must be an object containing every required probability key exactly once and no other keys. Every value must be a finite JSON number in [0,1], and the values must sum to 1 within 0.000001. Do not copy any example values; no example distribution is supplied.",
  ].join("\n\n");
}

export function buildCollectiveDynamicsPeerBundlePromptV1(input: {
  snapshot: CollectiveDynamicsPeerBundleSnapshotV1;
  peerMessages: readonly ShadowSensorPublicMessageV1[];
  condition: PeerBundleConditionV1;
  repeatLabel: "A" | "B";
}): CollectiveDynamicsPeerBundlePromptV1 {
  const basePrompt = buildCollectiveDynamicsSensorPromptV1({
    snapshot: input.snapshot,
    variant: "BASELINE_A",
  });
  const noPeerUserPrompt = commonUserPrompt(input.snapshot);
  const block = buildPeerBlock(input.peerMessages);
  const userPrompt = input.condition === "PEER"
    ? `${noPeerUserPrompt}\n\n${block}`
    : noPeerUserPrompt;
  if (input.condition === "PEER"
    && userPrompt !== `${noPeerUserPrompt}\n\n${block}`) {
    throw new Error("peer_bundle_append_invariant_internal_failure");
  }
  const body: Omit<CollectiveDynamicsPeerBundlePromptV1, "contentHash"> = {
    promptRef: COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
    snapshotHash: input.snapshot.contentHash,
    condition: input.condition,
    repeatLabel: input.repeatLabel,
    systemPrompt: basePrompt.systemPrompt,
    userPrompt,
    peerBlockHash: peerBlockHash(input.peerMessages),
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

const POSITION_ORDERS_V1: ReadonlyArray<ReadonlyArray<CollectiveDynamicsPeerBundleVariantV1>> = [
  ["NO_PEER_A", "NO_PEER_B", "PEER_A", "PEER_B"],
  ["PEER_A", "PEER_B", "NO_PEER_A", "NO_PEER_B"],
  ["NO_PEER_B", "PEER_A", "PEER_B", "NO_PEER_A"],
  ["PEER_B", "NO_PEER_A", "NO_PEER_B", "PEER_A"],
];

function conditionOf(variant: CollectiveDynamicsPeerBundleVariantV1): PeerBundleConditionV1 {
  return variant.startsWith("PEER") ? "PEER" : "NO_PEER";
}

function repeatOf(variant: CollectiveDynamicsPeerBundleVariantV1): "A" | "B" {
  return variant.endsWith("A") ? "A" : "B";
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

export function buildCollectiveDynamicsPeerBundleFreezeV1(input: {
  plan: CollectiveDynamicsPeerBundlePlanV1;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
}): CollectiveDynamicsPeerBundleFreezeV1 {
  verifyCollectiveDynamicsPeerBundlePlanV1(input.plan);
  if (input.formations.length !== input.plan.sourceTaskIds.length) {
    throw new Error("peer_bundle_source_formation_count_invalid");
  }
  const formationByTask = new Map(input.formations.map(formation => [
    formation.onlineTask.sourceTaskId, formation,
  ]));
  if (formationByTask.size !== input.formations.length
    || input.plan.sourceTaskIds.some(taskId => !formationByTask.has(taskId))) {
    throw new Error("peer_bundle_source_formation_set_invalid");
  }
  const snapshots: CollectiveDynamicsPeerBundleSnapshotV1[] = [];
  input.plan.sourceTaskIds.forEach((taskId, taskIndex) => {
    const formation = formationByTask.get(taskId)!;
    verifyFormationArtifactV1(formation);
    if (formation.seed !== input.plan.sourceSeed
      || formation.modelRef.id !== input.plan.modelRef.id
      || formation.modelRef.version !== input.plan.modelRef.version
      || formation.onlineTask.agents.length !== input.plan.sourceAgentCounts[taskIndex]) {
      throw new Error("peer_bundle_source_formation_binding_invalid");
    }
    formation.onlineTask.agents.forEach(agent => {
      snapshots.push(buildCollectiveDynamicsPeerBundleSnapshotV1({
        formation,
        agentId: agent.agentId,
      }));
    });
  });
  if (snapshots.length !== input.plan.registeredUnitCount) {
    throw new Error("peer_bundle_registered_unit_count_invalid");
  }
  const cells: CollectiveDynamicsPeerBundleCellV1[] = [];
  let globalSequence = 0;
  snapshots.forEach((snapshot, unitIndex) => {
    const formation = formationByTask.get(snapshot.sourceTaskId)!;
    const peerMessages = sourcePeerMessages(formation, snapshot.agentId);
    if (peerBlockHash(peerMessages) !== snapshot.peerSourceMessageHash) {
      throw new Error("peer_bundle_source_message_hash_invalid");
    }
    const order = POSITION_ORDERS_V1[unitIndex % POSITION_ORDERS_V1.length];
    order.forEach((variant, positionIndex) => {
      globalSequence += 1;
      const condition = conditionOf(variant);
      const repeatLabel = repeatOf(variant);
      const prompt = buildCollectiveDynamicsPeerBundlePromptV1({
        snapshot,
        peerMessages,
        condition,
        repeatLabel,
      });
      const unitId = `task-${snapshot.sourceTaskId}:agent-${snapshot.expectedAgentIds.indexOf(snapshot.agentId) + 1}`;
      const requestId = `peer-bundle-canary:${unitId}:${variant.toLowerCase()}`;
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
        withinUnitPosition: (positionIndex + 1) as 1 | 2 | 3 | 4,
        globalSequence,
        request,
        promptHash: canonicalPromptHash(prompt),
        peerBlockHash: prompt.peerBlockHash,
        requestHash: hashCollectiveDynamicsValueV1(request),
      });
    });
  });
  const body: Omit<CollectiveDynamicsPeerBundleFreezeV1, "contentHash"> = {
    freezeRef: COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_V1,
    planHash: input.plan.contentHash,
    sourceFormationHashes: input.plan.sourceTaskIds.map(taskId => formationByTask.get(taskId)!.contentHash),
    snapshots,
    cells,
    registeredUnitCount: 38,
    registeredCellCount: 152,
    orderingPolicy: "four_condition_cyclic_near_balance_v1",
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  const freeze = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyCollectiveDynamicsPeerBundleFreezeV1({ ...input, freeze });
  return cloneJson(freeze);
}

export function verifyCollectiveDynamicsPeerBundleFreezeV1(input: {
  plan: CollectiveDynamicsPeerBundlePlanV1;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsPeerBundleFreezeV1;
}): void {
  verifyCollectiveDynamicsPeerBundlePlanV1(input.plan);
  assertCollectiveDynamicsTruthBlindV1(input.freeze);
  const freeze = input.freeze;
  if (freeze.freezeRef.id !== COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_V1.id
    || freeze.freezeRef.version !== COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_V1.version
    || freeze.planHash !== input.plan.contentHash
    || freeze.registeredUnitCount !== 38 || freeze.registeredCellCount !== 152
    || freeze.snapshots.length !== 38 || freeze.cells.length !== 152
    || freeze.orderingPolicy !== input.plan.orderingPolicy || freeze.truthAccess !== "none") {
    throw new Error("peer_bundle_freeze_scope_invalid");
  }
  if (new Set(freeze.snapshots.map(snapshot => snapshot.contentHash)).size !== 38
    || new Set(freeze.cells.map(cell => cell.cellId)).size !== 152
    || new Set(freeze.cells.map(cell => cell.request.requestId)).size !== 152) {
    throw new Error("peer_bundle_freeze_identity_invalid");
  }
  const formationByTask = new Map(input.formations.map(formation => [
    formation.onlineTask.sourceTaskId, formation,
  ]));
  const expectedSnapshots = input.plan.sourceTaskIds.flatMap(taskId => {
    const formation = formationByTask.get(taskId);
    if (!formation) throw new Error("peer_bundle_source_formation_set_invalid");
    verifyFormationArtifactV1(formation);
    return formation.onlineTask.agents.map(agent =>
      buildCollectiveDynamicsPeerBundleSnapshotV1({ formation, agentId: agent.agentId }));
  });
  if (JSON.stringify(freeze.snapshots) !== JSON.stringify(expectedSnapshots)) {
    throw new Error("peer_bundle_snapshot_binding_invalid");
  }
  const snapshotByHash = new Map(freeze.snapshots.map(snapshot => [snapshot.contentHash, snapshot]));
  const positionCounts = new Map<string, number>();
  freeze.cells.forEach((cell, index) => {
    const snapshot = snapshotByHash.get(cell.snapshotHash);
    const expectedVariant = POSITION_ORDERS_V1[Math.floor(index / 4) % 4][index % 4];
    const expectedCondition = conditionOf(expectedVariant);
    const expectedRepeat = repeatOf(expectedVariant);
    if (!snapshot || cell.globalSequence !== index + 1
      || cell.condition !== expectedCondition || cell.repeatLabel !== expectedRepeat
      || cell.request.requestId !== cell.cellId
      || cell.requestHash !== hashCollectiveDynamicsValueV1(cell.request)
      || cell.request.modelRef.id !== input.plan.modelRef.id
      || cell.request.modelRef.version !== input.plan.modelRef.version
      || cell.sourceTaskId !== snapshot.sourceTaskId || cell.agentId !== snapshot.agentId) {
      throw new Error("peer_bundle_cell_binding_invalid");
    }
    const formation = formationByTask.get(snapshot.sourceTaskId)!;
    const peerMessages = sourcePeerMessages(formation, snapshot.agentId);
    const prompt = buildCollectiveDynamicsPeerBundlePromptV1({
      snapshot,
      peerMessages,
      condition: cell.condition,
      repeatLabel: cell.repeatLabel,
    });
    if (cell.request.systemPrompt !== prompt.systemPrompt
      || cell.request.userPrompt !== prompt.userPrompt
      || cell.promptHash !== canonicalPromptHash(prompt)
      || cell.peerBlockHash !== prompt.peerBlockHash) {
      throw new Error("peer_bundle_prompt_mismatch");
    }
    positionCounts.set(`${expectedVariant}:${cell.withinUnitPosition}`,
      (positionCounts.get(`${expectedVariant}:${cell.withinUnitPosition}`) ?? 0) + 1);
  });
  for (const variant of COLLECTIVE_DYNAMICS_PEER_BUNDLE_VARIANTS_V1) {
    const counts = [1, 2, 3, 4].map(position =>
      positionCounts.get(`${variant}:${position}`) ?? 0);
    if (counts.reduce((sum, count) => sum + count, 0) !== 38
      || Math.max(...counts) - Math.min(...counts) > 1) {
      throw new Error("peer_bundle_position_balance_invalid");
    }
  }
  for (const position of [1, 2, 3, 4]) {
    const noPeerCount = ["NO_PEER_A", "NO_PEER_B"].reduce((sum, variant) =>
      sum + (positionCounts.get(`${variant}:${position}`) ?? 0), 0);
    const peerCount = ["PEER_A", "PEER_B"].reduce((sum, variant) =>
      sum + (positionCounts.get(`${variant}:${position}`) ?? 0), 0);
    if (Math.abs(noPeerCount - peerCount) > 1) {
      throw new Error("peer_bundle_condition_position_balance_invalid");
    }
  }
  for (const snapshot of freeze.snapshots) {
    const unitCells = freeze.cells.filter(cell => cell.snapshotHash === snapshot.contentHash);
    if (unitCells.length !== 4
      || new Set(unitCells.map(cell => `${cell.condition}_${cell.repeatLabel}`)).size !== 4
      || new Set(unitCells.filter(cell => cell.condition === "NO_PEER").map(cell => cell.promptHash)).size !== 1
      || new Set(unitCells.filter(cell => cell.condition === "PEER").map(cell => cell.promptHash)).size !== 1
      || new Set(unitCells.map(cell => cell.requestHash)).size !== 4) {
      throw new Error("peer_bundle_unit_duplicate_contract_invalid");
    }
    const noPeer = unitCells.find(cell => cell.condition === "NO_PEER" && cell.repeatLabel === "A")!;
    const peer = unitCells.find(cell => cell.condition === "PEER" && cell.repeatLabel === "A")!;
    const noPeerPrompt = noPeer.request.userPrompt;
    const peerPrompt = peer.request.userPrompt;
    const peerMessages = sourcePeerMessages(formationByTask.get(snapshot.sourceTaskId)!, snapshot.agentId);
    const expectedBlock = buildPeerBlock(peerMessages);
    if (peerPrompt !== `${noPeerPrompt}\n\n${expectedBlock}`) {
      throw new Error("peer_bundle_append_invariant_invalid");
    }
  }
  const expectedHashes = input.plan.sourceTaskIds.map(taskId => formationByTask.get(taskId)!.contentHash);
  if (JSON.stringify(freeze.sourceFormationHashes) !== JSON.stringify(expectedHashes)) {
    throw new Error("peer_bundle_source_hash_binding_invalid");
  }
  if (hashCollectiveDynamicsValueV1(withoutContentHash(freeze)) !== freeze.contentHash) {
    throw new Error("peer_bundle_freeze_hash_mismatch");
  }
}
