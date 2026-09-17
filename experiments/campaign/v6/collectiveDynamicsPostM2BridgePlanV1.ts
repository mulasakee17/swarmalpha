/**
 * Zero-provider D1 bridge plan after the negative M2 trajectory pilot.
 *
 * This is a development-only task/roster/budget freeze. It contains no
 * outcome, answer, or governance decision and does not contact a provider.
 * The actual runner remains a separate, explicitly authorized step.
 */
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";

export const COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-post-m2-bridge",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_TASK_IDS_V1 =
  [36, 43, 50, 57, 64] as const;
export const COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_AGENT_COUNTS_V1 =
  [4, 4, 3, 4, 4] as const;

export interface CollectiveDynamicsPostM2BridgePlanV1 {
  planRef: typeof COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_V1;
  sourceTaskIds: [...typeof COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_TASK_IDS_V1];
  sourceTaskSelection: "remaining_five_of_preexisting_truth_free_systematic_dev10_order";
  sourceAgentCounts: [...typeof COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_AGENT_COUNTS_V1];
  registeredAgentCount: 19;
  seed: 1;
  modelRef: { id: "zhipu:glm-4.6v"; version: "1.0.0" };
  publicRounds: [1, 2, 3];
  checkpoints: [0, 1, 2, 3];
  interaction: "synchronous_previous_round_only";
  publicResponseContract: "plain_text";
  publicInvocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 768;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  sensorRepeats: ["A", "B"];
  sensorEstimator: "equal_weight_mean_of_two_exact_canonical_repeats";
  sensorInvocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 256;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  sensorTiming: "after_complete_public_trajectory_freeze";
  publicCallCount: 57;
  sensorCallCount: 152;
  totalProviderCallCount: 209;
  runIdPrefix: "collective-dynamics-m2-bridge";
  truthAccess: "offline_analyzer_only";
  status: "proposed_no_provider_calls_executed";
  contentHash: string;
}

export function buildCollectiveDynamicsPostM2BridgePlanV1():
CollectiveDynamicsPostM2BridgePlanV1 {
  const body: Omit<CollectiveDynamicsPostM2BridgePlanV1, "contentHash"> = {
    planRef: COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_V1,
    sourceTaskIds: [...COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_TASK_IDS_V1],
    sourceTaskSelection: "remaining_five_of_preexisting_truth_free_systematic_dev10_order",
    sourceAgentCounts: [...COLLECTIVE_DYNAMICS_POST_M2_BRIDGE_AGENT_COUNTS_V1],
    registeredAgentCount: 19,
    seed: 1,
    modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
    publicRounds: [1, 2, 3],
    checkpoints: [0, 1, 2, 3],
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
    sensorRepeats: ["A", "B"],
    sensorEstimator: "equal_weight_mean_of_two_exact_canonical_repeats",
    sensorInvocation: {
      temperature: 0,
      seed: 1,
      maxTokens: 256,
      thinking: "disabled",
      attemptsPerCell: 1,
      retry: "none",
    },
    sensorTiming: "after_complete_public_trajectory_freeze",
    publicCallCount: 57,
    sensorCallCount: 152,
    totalProviderCallCount: 209,
    runIdPrefix: "collective-dynamics-m2-bridge",
    truthAccess: "offline_analyzer_only",
    status: "proposed_no_provider_calls_executed",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsPostM2BridgePlanV1(
  plan: CollectiveDynamicsPostM2BridgePlanV1,
): void {
  assertCollectiveDynamicsTruthBlindV1(plan);
  const expected = buildCollectiveDynamicsPostM2BridgePlanV1();
  if (JSON.stringify(plan) !== JSON.stringify(expected)) {
    throw new Error("post_m2_bridge_plan_drift");
  }
  const rosterCount = plan.sourceAgentCounts.reduce((sum, count) => sum + count, 0);
  const publicCalls = rosterCount * plan.publicRounds.length;
  const sensorCalls = rosterCount * plan.checkpoints.length * plan.sensorRepeats.length;
  if (rosterCount !== plan.registeredAgentCount
    || publicCalls !== plan.publicCallCount
    || sensorCalls !== plan.sensorCallCount
    || publicCalls + sensorCalls !== plan.totalProviderCallCount) {
    throw new Error("post_m2_bridge_call_count_invalid");
  }
  plan.sourceTaskIds.forEach((sourceTaskId, index) => {
    const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId });
    if (projection.adapter.task.agents.length !== plan.sourceAgentCounts[index]) {
      throw new Error("post_m2_bridge_roster_binding_invalid");
    }
  });
}
