import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import type { DiscussionThermometerDesignRegimeV1 } from
  "./discussionThermometerStateSpaceCoveragePlanV1";
import {
  DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1,
  verifyDiscussionThermometerStateSpaceTaskBankV1,
} from "./discussionThermometerStateSpaceTaskBankV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_PLAN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-natural-dynamics-plan",
  version: "1.0.0",
});

const TARGET_REGIMES = [
  "SHARED_CUE_PRIVATE_CORRECTION",
  "POLARIZED_PRIVATE_BLOCKS",
] as const satisfies readonly DiscussionThermometerDesignRegimeV1[];

export interface DiscussionThermometerNaturalDynamicsPlanV1 {
  planRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_PLAN_V1;
  developmentSourceAnalysisHash:
    "sha256:4fdde15bd394de523c8e176440ad4e87bf77ce0d53e074689e528c974988ab87";
  selectionStatus: "post_development_targeted_replication_not_confirmatory_transport";
  taskBankHash: string;
  taskIds: string[];
  targetRegimes: ["SHARED_CUE_PRIVATE_CORRECTION", "POLARIZED_PRIVATE_BLOCKS"];
  baseScenarioCount: 2;
  agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"];
  publicRounds: [1, 2, 3, 4];
  checkpoints: [0, 1, 2, 3, 4];
  lateTransitions: ["X1_X2", "X2_X3", "X3_X4"];
  sensorRepeats: ["A", "B"];
  executionMode: "new_full_within_batch_rerun_not_historical_append";
  interaction: "synchronous_previous_round_only";
  stateEstimator: "primary_canonical_self_report";
  duplicateRole: "local_transition_resolution_reference_only";
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
    sensorCalls: 160;
    totalProviderCalls: 224;
    maximumCompletionTokens: 73728;
  };
  registeredFalsificationRules: {
    polarizedLateEnvelopeReplication: string;
    sharedCueMotionResourceReplication: string;
    failureMeaning: string;
  };
  identificationCeiling: string;
  onlineTruthAccess: "none";
  sensorWriteback: "none";
  predictionUsed: false;
  actionUsed: false;
  providerCallsAuthorized: 0;
  executionAuthority: "none";
  contentHash: string;
}

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

export function buildDiscussionThermometerNaturalDynamicsPlanV1():
DiscussionThermometerNaturalDynamicsPlanV1 {
  verifyDiscussionThermometerStateSpaceTaskBankV1();
  const taskIds = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1
    .filter(task => TARGET_REGIMES.includes(task.designRegime as typeof TARGET_REGIMES[number]))
    .map(task => task.taskId);
  const body: Omit<DiscussionThermometerNaturalDynamicsPlanV1, "contentHash"> = {
    planRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_PLAN_V1,
    developmentSourceAnalysisHash:
      "sha256:4fdde15bd394de523c8e176440ad4e87bf77ce0d53e074689e528c974988ab87",
    selectionStatus: "post_development_targeted_replication_not_confirmatory_transport",
    taskBankHash: hashCollectiveDynamicsValueV1(DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1),
    taskIds,
    targetRegimes: ["SHARED_CUE_PRIVATE_CORRECTION", "POLARIZED_PRIVATE_BLOCKS"],
    baseScenarioCount: 2,
    agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"],
    publicRounds: [1, 2, 3, 4],
    checkpoints: [0, 1, 2, 3, 4],
    lateTransitions: ["X1_X2", "X2_X3", "X3_X4"],
    sensorRepeats: ["A", "B"],
    executionMode: "new_full_within_batch_rerun_not_historical_append",
    interaction: "synchronous_previous_round_only",
    stateEstimator: "primary_canonical_self_report",
    duplicateRole: "local_transition_resolution_reference_only",
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
      sensorCalls: 160,
      totalProviderCalls: 224,
      maximumCompletionTokens: 73728,
    },
    registeredFalsificationRules: {
      polarizedLateEnvelopeReplication: "In each of both base scenarios, POLARIZED_PRIVATE_BLOCKS must contain at least two consecutive late transitions classified within_repeatability_envelope_all_agents; otherwise the current cross-scenario late stability candidate is not replicated.",
      sharedCueMotionResourceReplication: "In each of both base scenarios, SHARED_CUE_PRIVATE_CORRECTION must contain at least one transition classified resolved_majority_motion; otherwise the intended natural-motion resource is not replicated.",
      failureMeaning: "Failure limits this task/regime design as a natural stability-motion resource; it does not invalidate the operational belief state or thermometer mathematics.",
    },
    identificationCeiling: "A pass supports targeted same-task natural trajectory replication at exact-duplicate resolution. It does not establish transport, dwell-time distributions, transition hazards, attractors, metastability, prediction, intervention, or governance.",
    onlineTruthAccess: "none",
    sensorWriteback: "none",
    predictionUsed: false,
    actionUsed: false,
    providerCallsAuthorized: 0,
    executionAuthority: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerNaturalDynamicsPlanV1(
  plan: DiscussionThermometerNaturalDynamicsPlanV1,
): void {
  assertCollectiveDynamicsTruthBlindV1(plan);
  const expected = buildDiscussionThermometerNaturalDynamicsPlanV1();
  if (JSON.stringify(plan) !== JSON.stringify(expected)
    || hashCollectiveDynamicsValueV1(withoutHash(plan)) !== plan.contentHash
    || plan.taskIds.length !== 4
    || plan.callBudget.publicCalls !== plan.taskIds.length * plan.agentIds.length
      * plan.publicRounds.length
    || plan.callBudget.sensorCalls !== plan.taskIds.length * plan.agentIds.length
      * plan.checkpoints.length * plan.sensorRepeats.length
    || plan.callBudget.totalProviderCalls !== plan.callBudget.publicCalls
      + plan.callBudget.sensorCalls
    || plan.providerCallsAuthorized !== 0
    || plan.executionAuthority !== "none") {
    throw new Error("thermometer_natural_dynamics_plan_invalid");
  }
}
