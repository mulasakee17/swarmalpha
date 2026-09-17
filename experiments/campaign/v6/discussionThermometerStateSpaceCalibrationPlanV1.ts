import type { EpistemicClaim } from "../../../src/lib/epistemic";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import { buildDiscussionThermometerStateSpaceCoveragePreflightV1 } from
  "./discussionThermometerStateSpaceCoveragePlanV1";
import {
  DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1,
  projectDiscussionThermometerCoverageOnlineTaskV1,
  verifyDiscussionThermometerStateSpaceTaskBankV1,
} from "./discussionThermometerStateSpaceTaskBankV1";
import type {
  V6DiscussionRequestV1,
  V6PublicTranscriptEntry,
} from "./productionVerticalSlice";

export const DISCUSSION_THERMOMETER_STATE_SPACE_CALIBRATION_PLAN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-state-space-calibration-plan",
  version: "1.0.0",
});

export interface DiscussionThermometerStateSpaceCalibrationPlanV1 {
  planRef: typeof DISCUSSION_THERMOMETER_STATE_SPACE_CALIBRATION_PLAN_V1;
  preflightHash: string;
  taskBankHash: string;
  variantTaskIds: string[];
  taskOrderPolicy: "base_then_registered_regime_order";
  agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"];
  publicRounds: [1, 2];
  checkpoints: [0, 1, 2];
  sensorRepeats: ["A", "B"];
  interaction: "synchronous_previous_round_only";
  stateEstimator: "primary_canonical_self_report";
  duplicateRole: "instrument_quality_only";
  publicResponseContract: "choice_message_json_v1";
  modelRef: { id: "zhipu:glm-4.6v"; version: "1.0.0" };
  publicInvocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 512;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  sensorInvocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 256;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  callBudget: {
    publicCalls: 64;
    sensorCalls: 192;
    totalProviderCalls: 256;
    maximumCompletionTokens: 81920;
  };
  onlineTruthAccess: "none";
  sensorWriteback: "none";
  regimeContrastCausalAuthority: "none";
  semanticReview: "PENDING";
  executionAuthority: "none";
  contentHash: string;
}

const FIXED_CREATED_AT = "2026-08-30T00:00:00.000Z";

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

export function buildDiscussionThermometerStateSpaceCalibrationPlanV1():
DiscussionThermometerStateSpaceCalibrationPlanV1 {
  verifyDiscussionThermometerStateSpaceTaskBankV1();
  const preflight = buildDiscussionThermometerStateSpaceCoveragePreflightV1();
  const taskBankHash = hashCollectiveDynamicsValueV1(
    DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1,
  );
  const body: Omit<DiscussionThermometerStateSpaceCalibrationPlanV1, "contentHash"> = {
    planRef: DISCUSSION_THERMOMETER_STATE_SPACE_CALIBRATION_PLAN_V1,
    preflightHash: preflight.contentHash,
    taskBankHash,
    variantTaskIds: DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.map(task => task.taskId),
    taskOrderPolicy: "base_then_registered_regime_order",
    agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"],
    publicRounds: [1, 2],
    checkpoints: [0, 1, 2],
    sensorRepeats: ["A", "B"],
    interaction: "synchronous_previous_round_only",
    stateEstimator: "primary_canonical_self_report",
    duplicateRole: "instrument_quality_only",
    publicResponseContract: "choice_message_json_v1",
    modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
    publicInvocation: {
      temperature: 0, seed: 1, maxTokens: 512, thinking: "disabled",
      attemptsPerCell: 1, retry: "none",
    },
    sensorInvocation: {
      temperature: 0, seed: 1, maxTokens: 256, thinking: "disabled",
      attemptsPerCell: 1, retry: "none",
    },
    callBudget: {
      publicCalls: 64,
      sensorCalls: 192,
      totalProviderCalls: 256,
      maximumCompletionTokens: 81920,
    },
    onlineTruthAccess: "none",
    sensorWriteback: "none",
    regimeContrastCausalAuthority: "none",
    semanticReview: "PENDING",
    executionAuthority: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerStateSpaceCalibrationPlanV1(
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1,
): void {
  assertCollectiveDynamicsTruthBlindV1(plan);
  const expected = buildDiscussionThermometerStateSpaceCalibrationPlanV1();
  if (JSON.stringify(plan) !== JSON.stringify(expected)
    || hashCollectiveDynamicsValueV1(withoutHash(plan)) !== plan.contentHash
    || plan.callBudget.publicCalls !== plan.variantTaskIds.length
      * plan.agentIds.length * plan.publicRounds.length
    || plan.callBudget.sensorCalls !== plan.variantTaskIds.length
      * plan.agentIds.length * plan.checkpoints.length * plan.sensorRepeats.length
    || plan.callBudget.totalProviderCalls !== plan.callBudget.publicCalls
      + plan.callBudget.sensorCalls) {
    throw new Error("thermometer_state_space_calibration_plan_invalid");
  }
}

function taskById(taskId: string) {
  const value = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1
    .find(task => task.taskId === taskId);
  if (!value) throw new Error("thermometer_calibration_task_not_registered");
  return value;
}

function categoricalClaim(taskId: string): Extract<
EpistemicClaim, { resolutionPolicy: { kind: "categorical" } }> {
  const online = projectDiscussionThermometerCoverageOnlineTaskV1(taskById(taskId));
  return {
    id: online.claim.claimId,
    proposition: online.claim.proposition,
    domain: "controlled_discussion_monitoring",
    createdAt: FIXED_CREATED_AT,
    options: online.claim.options.map(option => option.label),
    resolutionPolicy: {
      kind: "categorical",
      resolverId: "resolver:not_accessed_by_discussion_monitor",
    },
  };
}

function validatePreviousRound(input: {
  round: 1 | 2;
  previousRoundMessages: readonly V6PublicTranscriptEntry[];
  expectedAgentIds: readonly string[];
}): void {
  if (input.round === 1) {
    if (input.previousRoundMessages.length) {
      throw new Error("thermometer_calibration_round1_transcript_not_empty");
    }
    return;
  }
  const messages = input.previousRoundMessages;
  if (messages.length !== input.expectedAgentIds.length
    || JSON.stringify(messages.map(message => message.agentId))
      !== JSON.stringify(input.expectedAgentIds)
    || messages.some(message => message.round !== 1 || message.source !== "agent"
      || !message.content.trim())) {
    throw new Error("thermometer_calibration_previous_round_invalid");
  }
}

export function buildDiscussionThermometerCalibrationPublicRequestV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  taskId: string;
  agentId: string;
  round: 1 | 2;
  previousRoundMessages: readonly V6PublicTranscriptEntry[];
}): V6DiscussionRequestV1 {
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1(input.plan);
  if (!input.plan.variantTaskIds.includes(input.taskId)
    || !input.plan.agentIds.includes(input.agentId as typeof input.plan.agentIds[number])) {
    throw new Error("thermometer_calibration_public_cell_outside_plan");
  }
  const online = projectDiscussionThermometerCoverageOnlineTaskV1(taskById(input.taskId));
  validatePreviousRound({
    round: input.round,
    previousRoundMessages: input.previousRoundMessages,
    expectedAgentIds: input.plan.agentIds,
  });
  const agent = online.agents.find(value => value.agentId === input.agentId)!;
  const request: V6DiscussionRequestV1 = {
    requestSchemaRef: { id: "swarmalpha.v6.discussion-request", version: "1.0.0" },
    requestId: `thermometer-calibration:${input.taskId}:r${input.round}:${input.agentId}`,
    runId: "thermometer-state-space-calibration-v1",
    taskId: input.taskId,
    agentId: input.agentId,
    round: input.round,
    protocol: "text_communication_v1",
    publicContext: online.publicContext,
    ownPrivateInformation: agent.privateInformation,
    claim: categoricalClaim(input.taskId),
    visibleTranscript: structuredClone([...input.previousRoundMessages]),
    responseContract: "choice_message_json_v1",
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
