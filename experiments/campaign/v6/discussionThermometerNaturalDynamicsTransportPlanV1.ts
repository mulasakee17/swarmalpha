import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1,
  verifyDiscussionThermometerNaturalDynamicsTransportTaskBankV1,
} from "./discussionThermometerNaturalDynamicsTransportTaskBankV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_PLAN_V1 =
  Object.freeze({
    id: "swarmalpha.experiment.v6.discussion-thermometer-natural-dynamics-transport-plan",
    version: "1.0.0",
  });

export interface DiscussionThermometerNaturalDynamicsTransportPlanV1 {
  planRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_PLAN_V1;
  sourceReplicationEvaluationHash:
    "sha256:f56588edc512d0eddff738565070a30f5d2eb46d3538fc1358427109a214f492";
  scientificStatus: "engineering_mock_only_rejected_for_transport_evidence";
  selectionStatus: "prospective_new_scenario_transport_before_provider_observation";
  taskBankHash: string;
  taskIds: string[];
  baseScenarioIds: ["backup-power", "aerial-navigation"];
  targetRegimes: ["SHARED_CUE_PRIVATE_CORRECTION", "POLARIZED_PRIVATE_BLOCKS"];
  agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"];
  publicRounds: [1, 2, 3, 4];
  checkpoints: [0, 1, 2, 3, 4];
  sensorRepeats: ["A", "B"];
  executionMode: "new_full_within_batch_transport_not_historical_append";
  interaction: "synchronous_previous_round_only";
  stateEstimator: "primary_canonical_self_report";
  duplicateRole: "local_transition_resolution_reference_only";
  modelRef: { id: "zhipu:glm-4.6v"; version: "1.0.0" };
  publicInvocation: {
    temperature: 0; seed: 1; maxTokens: 512; thinking: "disabled";
    attemptsPerCell: 1; retry: "none";
  };
  sensorInvocation: {
    temperature: 0; seed: 1; maxTokens: 256; thinking: "disabled";
    attemptsPerCell: 1; retry: "none";
  };
  callBudget: {
    publicCalls: 64; sensorCalls: 160; totalProviderCalls: 224;
    maximumCompletionTokens: 73728;
  };
  registeredTransportRules: {
    polarizedLateEnvelopeReplication: string;
    sharedCueMotionResourceReplication: string;
    failureMeaning: string;
  };
  onlineTruthAccess: "none";
  sensorWriteback: "none";
  predictionUsed: false;
  actionUsed: false;
  providerCallsAuthorized: 0;
  executionAuthority: "none";
  contentHash: string;
}

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T,
"contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

export function buildDiscussionThermometerNaturalDynamicsTransportPlanV1():
DiscussionThermometerNaturalDynamicsTransportPlanV1 {
  verifyDiscussionThermometerNaturalDynamicsTransportTaskBankV1();
  const body: Omit<DiscussionThermometerNaturalDynamicsTransportPlanV1,
  "contentHash"> = {
    planRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_PLAN_V1,
    sourceReplicationEvaluationHash:
      "sha256:f56588edc512d0eddff738565070a30f5d2eb46d3538fc1358427109a214f492",
    scientificStatus: "engineering_mock_only_rejected_for_transport_evidence",
    selectionStatus: "prospective_new_scenario_transport_before_provider_observation",
    taskBankHash: hashCollectiveDynamicsValueV1(
      DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1),
    taskIds: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1
      .map(task => task.taskId),
    baseScenarioIds: ["backup-power", "aerial-navigation"],
    targetRegimes: ["SHARED_CUE_PRIVATE_CORRECTION", "POLARIZED_PRIVATE_BLOCKS"],
    agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"],
    publicRounds: [1, 2, 3, 4],
    checkpoints: [0, 1, 2, 3, 4],
    sensorRepeats: ["A", "B"],
    executionMode: "new_full_within_batch_transport_not_historical_append",
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
    registeredTransportRules: {
      polarizedLateEnvelopeReplication: "In each new base scenario, POLARIZED_PRIVATE_BLOCKS must contain at least two consecutive late transitions classified within_repeatability_envelope_all_agents.",
      sharedCueMotionResourceReplication: "In each new base scenario, SHARED_CUE_PRIVATE_CORRECTION must contain at least one transition classified resolved_majority_motion.",
      failureMeaning: "Failure rejects transport of the corresponding observation resource to these new scenarios; it does not invalidate the operational belief-state measurement contract.",
    },
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

export function verifyDiscussionThermometerNaturalDynamicsTransportPlanV1(
  plan: DiscussionThermometerNaturalDynamicsTransportPlanV1,
): void {
  const expected = buildDiscussionThermometerNaturalDynamicsTransportPlanV1();
  if (JSON.stringify(plan) !== JSON.stringify(expected)
    || hashCollectiveDynamicsValueV1(withoutHash(plan)) !== plan.contentHash
    || plan.callBudget.publicCalls !== plan.taskIds.length * plan.agentIds.length
      * plan.publicRounds.length
    || plan.callBudget.sensorCalls !== plan.taskIds.length * plan.agentIds.length
      * plan.checkpoints.length * plan.sensorRepeats.length
    || plan.providerCallsAuthorized !== 0
    || plan.executionAuthority !== "none") {
    throw new Error("natural_dynamics_transport_plan_invalid");
  }
}
