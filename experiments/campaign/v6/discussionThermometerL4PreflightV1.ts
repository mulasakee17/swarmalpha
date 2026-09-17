import { createHash } from "node:crypto";
import {
  createHiddenBenchTaskProjectionV1,
  loadCanonicalHiddenBenchTasksV1,
} from "./hiddenBenchTaskAdapter";
import { computeV6TaskDefinitionHashV1 } from "./v6TaskManifest";

export const L4_ENGINEERING_CANARY_TASK_IDS_V1 = [1, 4, 8, 9, 17] as const;
export const L4_OBSERVED_TASK_IDS_V1 = [
  2, 6, 10, 25, 26, 30, 34, 36, 41, 42, 43, 44, 46, 48, 53, 56, 58, 59, 60, 62,
  50, 57, 64,
] as const;
export const L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1 = [
  3, 5, 7, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29,
  31, 32, 33, 35, 37, 38, 39, 40, 45, 47, 49, 51, 52, 54, 55, 61, 63, 65,
] as const;

/**
 * Conservative AI adjudication for development-only grouped validation.
 * These broad mechanism families prevent task-level pseudo-replication, but
 * they do not grant human-reviewed held-out or confirmatory authority.
 */
export const L4_AI_ADJUDICATED_DEVELOPMENT_GROUPS_V1 = Object.freeze([
  { groupId: "dev-semantic:formal-personnel-selection", sourceTaskIds: [5] },
  { groupId: "dev-semantic:formal-procurement-criteria", sourceTaskIds: [7] },
  { groupId: "dev-semantic:forensic-localization", sourceTaskIds: [13, 47, 61, 65] },
  {
    groupId: "dev-semantic:shelter-venue-suitability",
    sourceTaskIds: [11, 12, 15, 18, 19, 20, 22, 29, 35, 52, 63],
  },
  {
    groupId: "dev-semantic:infrastructure-site-viability",
    sourceTaskIds: [16, 24, 27, 31, 37, 45, 51, 54],
  },
  {
    groupId: "dev-semantic:route-transport-accessibility",
    sourceTaskIds: [3, 21, 28, 32, 39, 40, 49, 55],
  },
  { groupId: "dev-semantic:ordinary-event-suitability", sourceTaskIds: [14, 23] },
] as const);

export const DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1 = Object.freeze({
  id: "swarmalpha.experiment.discussion-thermometer-l4-preflight",
  version: "1.0.0",
  targetIndependentSemanticGroups: 32,
  requiredAgentCount: 4,
  requiredOptionCount: 3,
  discussionRounds: 3,
  checkpoints: 4,
  publicMaxOutputTokens: 768,
  sensorMaxOutputTokens: 256,
  duplicateSensorCellsPerTask: 1,
});

export type L4SemanticReviewStatusV1 = "pending" | "accepted" | "rejected";
export type L4CrossSplitStatusV1 = "pending" | "clear" | "overlap";

export interface L4HumanSemanticReviewDecisionV1 {
  sourceTaskId: number;
  reviewStatus: L4SemanticReviewStatusV1;
  semanticLeakageGroupId: string | null;
  crossSplitStatus: L4CrossSplitStatusV1;
  overlapSourceTaskIds: number[];
  reviewer: null | {
    kind: "human";
    reviewerId: string;
    reviewedAt: string;
  };
}

export interface L4SemanticReviewPacketEntryV1 {
  sourceTaskId: number;
  taskDefinitionHash: string;
  name: string;
  description: string;
  sharedInformation: string[];
  privateInformation: string[];
  possibleAnswers: string[];
  agentCount: number;
  optionCount: number;
  shapeEligible: boolean;
  decision: L4HumanSemanticReviewDecisionV1;
}

export interface L4ProviderCallBudgetV1 {
  selectedTaskCount: number;
  publicDiscussionCalls: number;
  primarySensorCalls: number;
  duplicateSensorCalls: number;
  totalProviderCalls: number;
  maximumOutputTokens: number;
  inputTokens: null;
  monetaryCost: null;
  unresolvedCostFields: readonly ["serialized_input_tokens", "current_glm_price", "user_currency_cap"];
}

export interface L4PreflightSummaryV1 {
  schema: "discussion-thermometer-l4-preflight-v1";
  authority: typeof DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1;
  contaminationSnapshot: {
    engineeringCanaryTaskIds: number[];
    observedTaskIds: number[];
    unreviewedCandidateTaskIds: number[];
  };
  reviewPacket: L4SemanticReviewPacketEntryV1[];
  shapeEligibleTaskIds: number[];
  acceptedTaskIds: number[];
  acceptedIndependentSemanticGroupCount: number;
  developmentGrouping: {
    authority: "ai_adjudicated_development_only";
    scientificSplitAuthority: "none";
    groupCount: number;
    groups: Array<{ groupId: string; sourceTaskIds: number[] }>;
  };
  developmentScreen: {
    authority: "exploratory_only";
    selectionRule: "lowest_source_task_id_per_ai_adjudicated_group_before_provider_calls";
    stage1TaskIds: number[];
    stage1Budget: L4ProviderCallBudgetV1;
    stage2SelectionRule: "second_lowest_source_task_id_for_groups_with_at_least_two_tasks";
    stage2TaskIds: number[];
    stage2IncrementalBudget: L4ProviderCallBudgetV1;
  };
  selectedTaskIds: number[];
  duplicateSensorSchedule: Array<{
    sourceTaskId: number;
    agentPosition: 1 | 2 | 3 | 4;
    checkpointRound: 0 | 1 | 2 | 3;
  }>;
  budget: L4ProviderCallBudgetV1;
  readiness: "DEFER" | "READY_FOR_COST_FREEZE";
  blockers: string[];
  contentHash: string;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("l4_preflight_non_finite_number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object") throw new Error("l4_preflight_non_json_value");
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => [key, canonicalize(child)]));
}

function hash(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(value)), "utf8").digest("hex")}`;
}

function pendingDecision(sourceTaskId: number): L4HumanSemanticReviewDecisionV1 {
  return {
    sourceTaskId,
    reviewStatus: "pending",
    semanticLeakageGroupId: null,
    crossSplitStatus: "pending",
    overlapSourceTaskIds: [],
    reviewer: null,
  };
}

function validateDecision(
  decision: L4HumanSemanticReviewDecisionV1,
  candidateIds: ReadonlySet<number>,
  contaminatedIds: ReadonlySet<number>,
): void {
  if (decision === null || typeof decision !== "object" || Array.isArray(decision)
    || JSON.stringify(Object.keys(decision).sort()) !== JSON.stringify([
      "crossSplitStatus", "overlapSourceTaskIds", "reviewStatus", "reviewer",
      "semanticLeakageGroupId", "sourceTaskId",
    ])) {
    throw new Error("l4_review_fields_invalid");
  }
  if (!candidateIds.has(decision.sourceTaskId)) throw new Error("l4_review_non_candidate_task");
  if (!["pending", "accepted", "rejected"].includes(decision.reviewStatus)
    || !["pending", "clear", "overlap"].includes(decision.crossSplitStatus)
    || !Array.isArray(decision.overlapSourceTaskIds)
    || decision.overlapSourceTaskIds.some(id => !Number.isInteger(id))
    || new Set(decision.overlapSourceTaskIds).size !== decision.overlapSourceTaskIds.length) {
    throw new Error("l4_review_values_invalid");
  }
  if (decision.reviewer !== null) {
    if (typeof decision.reviewer !== "object" || Array.isArray(decision.reviewer)
      || JSON.stringify(Object.keys(decision.reviewer).sort()) !== JSON.stringify([
        "kind", "reviewedAt", "reviewerId",
      ])
      || decision.reviewer.kind !== "human"
      || decision.reviewer.reviewerId.trim().length === 0
      || !Number.isFinite(Date.parse(decision.reviewer.reviewedAt))
      || new Date(Date.parse(decision.reviewer.reviewedAt)).toISOString() !== decision.reviewer.reviewedAt) {
      throw new Error("l4_review_human_provenance_invalid");
    }
  }
  if (decision.overlapSourceTaskIds.some(id => !contaminatedIds.has(id))) {
    throw new Error("l4_review_overlap_must_reference_contaminated_task");
  }
  if (decision.reviewStatus === "pending") {
    if (decision.semanticLeakageGroupId !== null || decision.crossSplitStatus !== "pending"
      || decision.overlapSourceTaskIds.length !== 0 || decision.reviewer !== null) {
      throw new Error("l4_pending_review_must_be_empty");
    }
    return;
  }
  if (decision.reviewer === null) throw new Error("l4_completed_review_requires_human_reviewer");
  if (decision.reviewStatus === "accepted") {
    if (decision.crossSplitStatus !== "clear" || decision.overlapSourceTaskIds.length !== 0
      || decision.semanticLeakageGroupId === null
      || !/^semantic:[a-z0-9][a-z0-9._-]*$/.test(decision.semanticLeakageGroupId)) {
      throw new Error("l4_accepted_review_requires_fresh_semantic_group");
    }
  }
  if (decision.reviewStatus === "rejected" && decision.crossSplitStatus === "pending") {
    throw new Error("l4_rejected_review_requires_cross_split_decision");
  }
  if (decision.crossSplitStatus === "overlap" && decision.overlapSourceTaskIds.length === 0) {
    throw new Error("l4_overlap_review_requires_reference");
  }
}

export function buildL4SemanticReviewPacketV1(
  decisions: readonly L4HumanSemanticReviewDecisionV1[] = [],
): L4SemanticReviewPacketEntryV1[] {
  const candidateIds = new Set<number>(L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1);
  const contaminatedIds = new Set<number>([
    ...L4_ENGINEERING_CANARY_TASK_IDS_V1,
    ...L4_OBSERVED_TASK_IDS_V1,
  ]);
  const byTask = new Map<number, L4HumanSemanticReviewDecisionV1>();
  for (const decision of decisions) {
    validateDecision(decision, candidateIds, contaminatedIds);
    if (byTask.has(decision.sourceTaskId)) throw new Error("l4_duplicate_review_decision");
    byTask.set(decision.sourceTaskId, structuredClone(decision));
  }
  const tasks = loadCanonicalHiddenBenchTasksV1();
  return L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1.map(sourceTaskId => {
    const source = tasks[sourceTaskId - 1];
    const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId });
    const taskDefinitionHash = computeV6TaskDefinitionHashV1(projection.adapter.task, {
      adapterRef: projection.adapter.adapterRef,
      taskSchemaRef: projection.adapter.taskSchemaRef,
      resolution: projection.adapter.resolution,
    });
    return {
      sourceTaskId,
      taskDefinitionHash,
      name: source.name,
      description: source.description,
      sharedInformation: [...source.shared_information],
      privateInformation: [...source.hidden_information],
      possibleAnswers: [...source.possible_answers],
      agentCount: source.hidden_information.length,
      optionCount: source.possible_answers.length,
      shapeEligible: source.hidden_information.length === DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.requiredAgentCount
        && source.possible_answers.length === DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.requiredOptionCount,
      decision: byTask.get(sourceTaskId) ?? pendingDecision(sourceTaskId),
    };
  });
}

export function buildL4ProviderCallBudgetV1(selectedTaskCount: number): L4ProviderCallBudgetV1 {
  if (!Number.isInteger(selectedTaskCount) || selectedTaskCount < 0) {
    throw new Error("l4_selected_task_count_invalid");
  }
  const publicDiscussionCalls = selectedTaskCount
    * DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.requiredAgentCount
    * DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.discussionRounds;
  const primarySensorCalls = selectedTaskCount
    * DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.requiredAgentCount
    * DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.checkpoints;
  const duplicateSensorCalls = selectedTaskCount
    * DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.duplicateSensorCellsPerTask;
  return {
    selectedTaskCount,
    publicDiscussionCalls,
    primarySensorCalls,
    duplicateSensorCalls,
    totalProviderCalls: publicDiscussionCalls + primarySensorCalls + duplicateSensorCalls,
    maximumOutputTokens:
      publicDiscussionCalls * DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.publicMaxOutputTokens
      + (primarySensorCalls + duplicateSensorCalls)
        * DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.sensorMaxOutputTokens,
    inputTokens: null,
    monetaryCost: null,
    unresolvedCostFields: ["serialized_input_tokens", "current_glm_price", "user_currency_cap"],
  };
}

function duplicateSchedule(sourceTaskIds: readonly number[]): L4PreflightSummaryV1["duplicateSensorSchedule"] {
  return sourceTaskIds.map((sourceTaskId, index) => ({
    sourceTaskId,
    agentPosition: (Math.floor(index / 4) % 4 + 1) as 1 | 2 | 3 | 4,
    checkpointRound: (index % 4) as 0 | 1 | 2 | 3,
  }));
}

export function buildDiscussionThermometerL4PreflightV1(
  decisions: readonly L4HumanSemanticReviewDecisionV1[] = [],
): L4PreflightSummaryV1 {
  const allIds = [
    ...L4_ENGINEERING_CANARY_TASK_IDS_V1,
    ...L4_OBSERVED_TASK_IDS_V1,
    ...L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1,
  ];
  if (allIds.length !== 65 || new Set(allIds).size !== 65
    || [...allIds].sort((a, b) => a - b).some((id, index) => id !== index + 1)) {
    throw new Error("l4_contamination_snapshot_not_exhaustive");
  }
  const developmentGroupedIds = L4_AI_ADJUDICATED_DEVELOPMENT_GROUPS_V1
    .flatMap(group => group.sourceTaskIds);
  const shapeEligibleExpected = L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1
    .filter(id => id !== 33 && id !== 38);
  if (new Set(developmentGroupedIds).size !== developmentGroupedIds.length
    || JSON.stringify([...developmentGroupedIds].sort((a, b) => a - b))
      !== JSON.stringify([...shapeEligibleExpected].sort((a, b) => a - b))) {
    throw new Error("l4_development_groups_must_cover_each_shape_eligible_candidate_once");
  }
  const reviewPacket = buildL4SemanticReviewPacketV1(decisions);
  const shapeEligible = reviewPacket.filter(entry => entry.shapeEligible);
  const accepted = shapeEligible.filter(entry => entry.decision.reviewStatus === "accepted");
  const acceptedGroups = new Map<string, L4SemanticReviewPacketEntryV1[]>();
  for (const entry of accepted) {
    const group = entry.decision.semanticLeakageGroupId!;
    acceptedGroups.set(group, [...acceptedGroups.get(group) ?? [], entry]);
  }
  const representatives = [...acceptedGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, entries]) => [...entries].sort((left, right) => left.sourceTaskId - right.sourceTaskId)[0]);
  const target = DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1.targetIndependentSemanticGroups;
  const selected = representatives.slice(0, target);
  const blockers: string[] = [];
  if (decisions.length !== reviewPacket.length
    || reviewPacket.some(entry => entry.decision.reviewStatus === "pending")) {
    blockers.push("HUMAN_SEMANTIC_REVIEW_INCOMPLETE");
  }
  if (acceptedGroups.size < target) blockers.push("INSUFFICIENT_INDEPENDENT_SEMANTIC_GROUPS");
  blockers.push("SERIALIZED_INPUT_TOKEN_BUDGET_NOT_FROZEN");
  blockers.push("CURRENT_GLM_PRICE_NOT_FROZEN");
  blockers.push("USER_CURRENCY_CAP_NOT_APPROVED");
  const developmentGroups = L4_AI_ADJUDICATED_DEVELOPMENT_GROUPS_V1.map(group => ({
    groupId: group.groupId,
    sourceTaskIds: [...group.sourceTaskIds].sort((a, b) => a - b),
  }));
  const stage1TaskIds = developmentGroups.map(group => group.sourceTaskIds[0]);
  const stage2TaskIds = developmentGroups.flatMap(group => group.sourceTaskIds.length >= 2
    ? [group.sourceTaskIds[1]] : []);
  const body = {
    schema: "discussion-thermometer-l4-preflight-v1" as const,
    authority: DISCUSSION_THERMOMETER_L4_PREFLIGHT_V1,
    contaminationSnapshot: {
      engineeringCanaryTaskIds: [...L4_ENGINEERING_CANARY_TASK_IDS_V1],
      observedTaskIds: [...L4_OBSERVED_TASK_IDS_V1],
      unreviewedCandidateTaskIds: [...L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1],
    },
    reviewPacket,
    shapeEligibleTaskIds: shapeEligible.map(entry => entry.sourceTaskId),
    acceptedTaskIds: accepted.map(entry => entry.sourceTaskId),
    acceptedIndependentSemanticGroupCount: acceptedGroups.size,
    developmentGrouping: {
      authority: "ai_adjudicated_development_only" as const,
      scientificSplitAuthority: "none" as const,
      groupCount: L4_AI_ADJUDICATED_DEVELOPMENT_GROUPS_V1.length,
      groups: developmentGroups,
    },
    developmentScreen: {
      authority: "exploratory_only" as const,
      selectionRule: "lowest_source_task_id_per_ai_adjudicated_group_before_provider_calls" as const,
      stage1TaskIds,
      stage1Budget: buildL4ProviderCallBudgetV1(stage1TaskIds.length),
      stage2SelectionRule: "second_lowest_source_task_id_for_groups_with_at_least_two_tasks" as const,
      stage2TaskIds,
      stage2IncrementalBudget: buildL4ProviderCallBudgetV1(stage2TaskIds.length),
    },
    selectedTaskIds: selected.map(entry => entry.sourceTaskId),
    duplicateSensorSchedule: duplicateSchedule(selected.map(entry => entry.sourceTaskId)),
    budget: buildL4ProviderCallBudgetV1(target),
    readiness: blockers.length === 3 ? "READY_FOR_COST_FREEZE" as const : "DEFER" as const,
    blockers,
  };
  return { ...body, contentHash: hash(body) };
}

export interface L4StructuredPublicTurnV1 {
  choiceId: string;
  message: string;
}

/** Public choice is captured in the same discussion call; it never adds a provider call. */
export function parseL4StructuredPublicTurnV1(
  raw: string,
  allowedChoiceIds: readonly string[],
): L4StructuredPublicTurnV1 {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("l4_public_turn_invalid_json");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("l4_public_turn_invalid_shape");
  }
  const record = value as Record<string, unknown>;
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(["choiceId", "message"])) {
    throw new Error("l4_public_turn_fields_invalid");
  }
  if (typeof record.choiceId !== "string" || !allowedChoiceIds.includes(record.choiceId)) {
    throw new Error("l4_public_turn_choice_invalid");
  }
  if (typeof record.message !== "string" || record.message.trim().length === 0) {
    throw new Error("l4_public_turn_message_invalid");
  }
  return { choiceId: record.choiceId, message: record.message };
}
