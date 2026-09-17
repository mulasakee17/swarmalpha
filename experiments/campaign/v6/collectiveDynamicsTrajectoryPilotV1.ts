/**
 * Zero-provider M2 trajectory-pilot contract.
 *
 * This module freezes the development scope and the truth-blind public
 * discussion request boundary. It deliberately does not execute providers or
 * define an outcome-aware analyzer.
 */
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import type {
  V6DiscussionRequestV1,
  V6PublicTranscriptEntry,
} from "./productionVerticalSlice";

export const COLLECTIVE_DYNAMICS_TRAJECTORY_PILOT_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-trajectory-pilot",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_TRAJECTORY_TASK_IDS_V1 = [1, 8, 15, 22, 29] as const;
export const COLLECTIVE_DYNAMICS_TRAJECTORY_AGENT_COUNTS_V1 = [4, 3, 4, 4, 4] as const;
export const COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_ROUNDS_V1 = [1, 2, 3] as const;
export const COLLECTIVE_DYNAMICS_TRAJECTORY_CHECKPOINTS_V1 = [0, 1, 2, 3] as const;
export const COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_REPEATS_V1 = ["A", "B"] as const;

export interface CollectiveDynamicsTrajectoryPilotPlanV1 {
  planRef: { id: string; version: string };
  sourceTaskIds: number[];
  sourceTaskSelection: string;
  sourceAgentCounts: number[];
  registeredAgentCount: number;
  seed: 1;
  modelRef: { id: "zhipu:glm-4.6v"; version: "1.0.0" };
  publicRounds: [1, 2, 3];
  checkpoints: [0, 1, 2, 3];
  interaction: "synchronous_previous_round_only";
  publicResponseContract: "plain_text" | "choice_message_json_v1";
  publicInvocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 768;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  sensorRepeats: ["A", "B"];
  sensorEstimator: "equal_weight_mean_of_two_exact_canonical_repeats"
    | "primary_only_with_one_stratified_duplicate_per_task";
  sensorDuplicateSchedule?: Array<{
    sourceTaskId: number;
    agentPosition: 1 | 2 | 3 | 4;
    checkpointRound: 0 | 1 | 2 | 3;
  }>;
  sensorInvocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 256;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  publicCallCount: number;
  sensorCallCount: number;
  totalProviderCallCount: number;
  sensorTiming: "after_complete_public_trajectory_freeze";
  runIdPrefix?: string;
  truthAccess: "offline_analyzer_only";
  status: "proposed_no_provider_calls_executed";
  contentHash: string;
}

export function buildCollectiveDynamicsTrajectoryPilotPlanV1():
CollectiveDynamicsTrajectoryPilotPlanV1 {
  const body: Omit<CollectiveDynamicsTrajectoryPilotPlanV1, "contentHash"> = {
    planRef: COLLECTIVE_DYNAMICS_TRAJECTORY_PILOT_V1,
    sourceTaskIds: [...COLLECTIVE_DYNAMICS_TRAJECTORY_TASK_IDS_V1],
    sourceTaskSelection: "first_five_of_preexisting_truth_free_systematic_dev10_order",
    sourceAgentCounts: [...COLLECTIVE_DYNAMICS_TRAJECTORY_AGENT_COUNTS_V1],
    registeredAgentCount: 19,
    seed: 1,
    modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
    publicRounds: [...COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_ROUNDS_V1],
    checkpoints: [...COLLECTIVE_DYNAMICS_TRAJECTORY_CHECKPOINTS_V1],
    interaction: "synchronous_previous_round_only",
    publicResponseContract: "plain_text",
    publicInvocation: {
      temperature: 0,
      seed: 1,
      maxTokens: 768,
      thinking: "disabled",
      attemptsPerCell: 1,
      retry: "none",
    },
    sensorRepeats: [...COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_REPEATS_V1],
    sensorEstimator: "equal_weight_mean_of_two_exact_canonical_repeats",
    sensorInvocation: {
      temperature: 0,
      seed: 1,
      maxTokens: 256,
      thinking: "disabled",
      attemptsPerCell: 1,
      retry: "none",
    },
    publicCallCount: 57,
    sensorCallCount: 152,
    totalProviderCallCount: 209,
    sensorTiming: "after_complete_public_trajectory_freeze",
    truthAccess: "offline_analyzer_only",
    status: "proposed_no_provider_calls_executed",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsTrajectoryPilotPlanV1(
  plan: CollectiveDynamicsTrajectoryPilotPlanV1,
): void {
  assertCollectiveDynamicsTruthBlindV1(plan);
  if (plan.planRef.id === COLLECTIVE_DYNAMICS_TRAJECTORY_PILOT_V1.id
    && plan.planRef.version === COLLECTIVE_DYNAMICS_TRAJECTORY_PILOT_V1.version) {
    const expected = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    if (JSON.stringify(plan) !== JSON.stringify(expected)) {
      throw new Error("trajectory_pilot_plan_drift");
    }
  } else {
    if (!plan.planRef.id.startsWith("swarmalpha.experiment.v6.collective-dynamics-")
      || plan.planRef.version.trim().length === 0
      || plan.sourceTaskIds.length === 0
      || plan.sourceTaskIds.length !== plan.sourceAgentCounts.length
      || plan.sourceTaskIds.some(taskId => !Number.isInteger(taskId) || taskId <= 0)
      || plan.sourceTaskIds.some(taskId => taskId > 65)
      || new Set(plan.sourceTaskIds).size !== plan.sourceTaskIds.length
      || plan.sourceAgentCounts.some(count => !Number.isInteger(count) || count <= 0)
      || plan.publicRounds.join(",") !== "1,2,3"
      || plan.checkpoints.join(",") !== "0,1,2,3"
      || plan.sensorRepeats.join(",") !== "A,B"
      || plan.interaction !== "synchronous_previous_round_only"
      || !["plain_text", "choice_message_json_v1"].includes(plan.publicResponseContract)
      || !["equal_weight_mean_of_two_exact_canonical_repeats",
        "primary_only_with_one_stratified_duplicate_per_task"].includes(plan.sensorEstimator)
      || plan.sensorTiming !== "after_complete_public_trajectory_freeze"
      || plan.modelRef.id !== "zhipu:glm-4.6v"
      || plan.modelRef.version !== "1.0.0"
      || plan.publicInvocation.temperature !== 0
      || plan.publicInvocation.seed !== 1
      || plan.publicInvocation.maxTokens !== 768
      || plan.publicInvocation.thinking !== "disabled"
      || plan.publicInvocation.attemptsPerCell !== 1
      || plan.publicInvocation.retry !== "none"
      || plan.sensorInvocation.temperature !== 0
      || plan.sensorInvocation.seed !== 1
      || plan.sensorInvocation.maxTokens !== 256
      || plan.sensorInvocation.thinking !== "disabled"
      || plan.sensorInvocation.attemptsPerCell !== 1
      || plan.sensorInvocation.retry !== "none"
      || (plan.runIdPrefix !== undefined
        && !/^collective-dynamics-[a-z0-9-]+$/.test(plan.runIdPrefix))
      || plan.truthAccess !== "offline_analyzer_only"
      || plan.status !== "proposed_no_provider_calls_executed") {
      throw new Error("trajectory_pilot_plan_shape_invalid");
    }
  }
  const agentCount = plan.sourceAgentCounts.reduce((sum, count) => sum + count, 0);
  const publicCalls = agentCount * plan.publicRounds.length;
  const selectiveDuplicates = plan.sensorEstimator === "primary_only_with_one_stratified_duplicate_per_task";
  if (selectiveDuplicates) {
    const schedule = plan.sensorDuplicateSchedule;
    if (!Array.isArray(schedule) || schedule.length !== plan.sourceTaskIds.length
      || new Set(schedule.map(cell => cell.sourceTaskId)).size !== plan.sourceTaskIds.length
      || schedule.some(cell => !plan.sourceTaskIds.includes(cell.sourceTaskId)
        || !Number.isInteger(cell.agentPosition) || cell.agentPosition < 1
        || cell.agentPosition > plan.sourceAgentCounts[plan.sourceTaskIds.indexOf(cell.sourceTaskId)]
        || !plan.checkpoints.includes(cell.checkpointRound))) {
      throw new Error("trajectory_pilot_selective_duplicate_schedule_invalid");
    }
  } else if (plan.sensorDuplicateSchedule !== undefined) {
    throw new Error("trajectory_pilot_legacy_estimator_must_not_have_selective_schedule");
  }
  const sensorCalls = selectiveDuplicates
    ? agentCount * plan.checkpoints.length + plan.sourceTaskIds.length
    : agentCount * plan.checkpoints.length * plan.sensorRepeats.length;
  if (agentCount !== plan.registeredAgentCount
    || publicCalls !== plan.publicCallCount
    || sensorCalls !== plan.sensorCallCount
    || publicCalls + sensorCalls !== plan.totalProviderCallCount) {
    throw new Error("trajectory_pilot_call_count_invalid");
  }
  const { contentHash, ...body } = plan;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("trajectory_pilot_plan_hash_mismatch");
  }
  plan.sourceTaskIds.forEach((sourceTaskId, index) => {
    const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId });
    if (projection.adapter.task.agents.length !== plan.sourceAgentCounts[index]) {
      throw new Error("trajectory_pilot_roster_binding_invalid");
    }
  });
}

function validatePreviousRoundMessages(input: {
  round: 1 | 2 | 3;
  expectedAgentIds: readonly string[];
  messages: readonly V6PublicTranscriptEntry[];
}): void {
  if (input.round === 1) {
    if (input.messages.length !== 0) throw new Error("trajectory_pilot_round1_must_have_empty_transcript");
    return;
  }
  const ids = input.messages.map(message => message.agentId);
  if (input.messages.length !== input.expectedAgentIds.length
    || JSON.stringify(ids) !== JSON.stringify(input.expectedAgentIds)
    || new Set(ids).size !== ids.length
    || input.messages.some(message => message.round !== input.round - 1
      || message.source !== "agent"
      || typeof message.content !== "string"
      || message.content.trim().length === 0)) {
    throw new Error("trajectory_pilot_previous_round_view_invalid");
  }
}

/** Internal request derivation after the caller has verified the frozen plan. */
export function buildCollectiveDynamicsTrajectoryPublicRequestUncheckedV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  sourceTaskId: number;
  round: 1 | 2 | 3;
  agentId: string;
  previousRoundMessages: readonly V6PublicTranscriptEntry[];
}): V6DiscussionRequestV1 {
  if (!input.plan.sourceTaskIds.includes(input.sourceTaskId)) {
    throw new Error("trajectory_pilot_task_outside_plan");
  }
  const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: input.sourceTaskId }).adapter.task;
  const agent = task.agents.find(candidate => candidate.agentId === input.agentId);
  if (!agent) throw new Error("trajectory_pilot_agent_outside_roster");
  const expectedAgentIds = task.agents.map(candidate => candidate.agentId);
  validatePreviousRoundMessages({
    round: input.round,
    expectedAgentIds,
    messages: input.previousRoundMessages,
  });
  const runId = `${input.plan.runIdPrefix ?? "collective-dynamics-m2"}:${input.sourceTaskId}:seed-${input.plan.seed}`;
  const request: V6DiscussionRequestV1 = {
    requestSchemaRef: { id: "swarmalpha.v6.discussion-request", version: "1.0.0" },
    requestId: `discussion:${runId}:r${input.round}:${agent.agentId}`,
    runId,
    taskId: task.id,
    agentId: agent.agentId,
    round: input.round,
    protocol: "text_communication_v1",
    publicContext: task.publicContext,
    ownPrivateInformation: agent.privateInformation,
    claim: structuredClone(task.claim),
    visibleTranscript: structuredClone([...input.previousRoundMessages]),
    responseContract: input.plan.publicResponseContract,
    modelRef: structuredClone(input.plan.modelRef),
    invocationConfig: {
      temperature: input.plan.publicInvocation.temperature,
      seed: input.plan.publicInvocation.seed,
      maxTokens: input.plan.publicInvocation.maxTokens,
      thinking: input.plan.publicInvocation.thinking,
    },
  };
  assertCollectiveDynamicsTruthBlindV1(request);
  return request;
}

/** Build one truth-blind public request; no provider is contacted. */
export function buildCollectiveDynamicsTrajectoryPublicRequestV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  sourceTaskId: number;
  round: 1 | 2 | 3;
  agentId: string;
  previousRoundMessages: readonly V6PublicTranscriptEntry[];
}): V6DiscussionRequestV1 {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(input.plan);
  return buildCollectiveDynamicsTrajectoryPublicRequestUncheckedV1(input);
}
