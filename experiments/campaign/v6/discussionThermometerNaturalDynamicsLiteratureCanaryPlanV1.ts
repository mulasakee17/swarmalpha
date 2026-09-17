import { assertCollectiveDynamicsTruthBlindV1, hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_SOURCE_TASK_IDS_V1,
  DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1,
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1";
import { HIDDENBENCH_OFFICIAL_SOURCE_V1 } from "./hiddenBenchTaskAdapter";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_PLAN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-natural-dynamics-literature-canary-plan",
  version: "1.1.0",
});

export interface DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1 {
  planRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_PLAN_V1;
  sourceRepository: "Yassellee/HiddenBench_ICML";
  sourceCommit: "3be6ca16";
  sourceLicense: "MIT";
  sourceCanonicalContentHash: "sha256:901c94b6e4edbeebe51f3ecba7baf069cde1e64f8d0bdec0f4d5314b4258f123";
  sourceTaskIds: [4, 6];
  sourceTaskSelection: "official_manual_adapted_tasks_selected_before_canary_execution";
  taskBankHash: string;
  taskIds: string[];
  agentIds: ["agent_1", "agent_2", "agent_3"];
  optionCount: 4;
  publicRounds: [1, 2, 3, 4];
  checkpoints: [0, 1, 2, 3, 4];
  sensorRepeats: ["A", "B"];
  executionMode: "new_full_within_batch_literature_canary_not_historical_append";
  interaction: "synchronous_previous_round_only";
  stateEstimator: "primary_canonical_self_report";
  duplicateRole: "local_transition_resolution_reference_only";
  modelRef: { id: "zhipu:glm-4.6v"; version: "1.0.0" };
  publicInvocation: { temperature: 0; seed: 1; maxTokens: 512; thinking: "disabled"; attemptsPerCell: 1; retry: "none" };
  sensorInvocation: { temperature: 0; seed: 1; maxTokens: 256; thinking: "disabled"; attemptsPerCell: 1; retry: "none" };
  callBudget: { publicCalls: 24; sensorCalls: 60; totalProviderCalls: 84; maximumCompletionTokens: 27648 };
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

export function buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1():
DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1 {
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1();
  const body: Omit<DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1, "contentHash"> = {
    planRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_PLAN_V1,
    sourceRepository: HIDDENBENCH_OFFICIAL_SOURCE_V1.repository,
    sourceCommit: HIDDENBENCH_OFFICIAL_SOURCE_V1.commit,
    sourceLicense: HIDDENBENCH_OFFICIAL_SOURCE_V1.license,
    sourceCanonicalContentHash: HIDDENBENCH_OFFICIAL_SOURCE_V1.canonicalContentHash,
    sourceTaskIds: [...DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_SOURCE_TASK_IDS_V1],
    sourceTaskSelection: "official_manual_adapted_tasks_selected_before_canary_execution",
    taskBankHash: hashCollectiveDynamicsValueV1(DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1),
    taskIds: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1.map(task => task.taskId),
    agentIds: ["agent_1", "agent_2", "agent_3"],
    optionCount: 4,
    publicRounds: [1, 2, 3, 4],
    checkpoints: [0, 1, 2, 3, 4],
    sensorRepeats: ["A", "B"],
    executionMode: "new_full_within_batch_literature_canary_not_historical_append",
    interaction: "synchronous_previous_round_only",
    stateEstimator: "primary_canonical_self_report",
    duplicateRole: "local_transition_resolution_reference_only",
    modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
    publicInvocation: { temperature: 0, seed: 1, maxTokens: 512, thinking: "disabled", attemptsPerCell: 1, retry: "none" },
    sensorInvocation: { temperature: 0, seed: 1, maxTokens: 256, thinking: "disabled", attemptsPerCell: 1, retry: "none" },
    callBudget: { publicCalls: 24, sensorCalls: 60, totalProviderCalls: 84, maximumCompletionTokens: 27648 },
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

export function verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1(
  plan: DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
): void {
  const expected = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1();
  if (JSON.stringify(plan) !== JSON.stringify(expected)
    || hashCollectiveDynamicsValueV1(withoutHash(plan)) !== plan.contentHash
    || plan.taskIds.length !== 2
    || plan.agentIds.length !== 3
    || plan.callBudget.publicCalls !== plan.taskIds.length * plan.agentIds.length * plan.publicRounds.length
    || plan.callBudget.sensorCalls !== plan.taskIds.length * plan.agentIds.length * plan.checkpoints.length * plan.sensorRepeats.length
    || plan.callBudget.totalProviderCalls !== 84
    || plan.callBudget.maximumCompletionTokens
      !== plan.callBudget.publicCalls * plan.publicInvocation.maxTokens
        + plan.callBudget.sensorCalls * plan.sensorInvocation.maxTokens
    || plan.providerCallsAuthorized !== 0
    || plan.executionAuthority !== "none") {
    throw new Error("natural_dynamics_literature_canary_plan_invalid");
  }
}
