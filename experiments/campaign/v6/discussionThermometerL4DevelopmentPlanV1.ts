import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1,
  type CollectiveDynamicsTrajectoryPilotPlanV1,
} from "./collectiveDynamicsTrajectoryPilotV1";
import { buildDiscussionThermometerL4PreflightV1 } from "./discussionThermometerL4PreflightV1";

export const DISCUSSION_THERMOMETER_L4_DEVELOPMENT_STAGE1_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-l4-development-stage1",
  version: "1.0.0",
});

export const L4_DEVELOPMENT_OUTPUT_DIRECTORY_V1 =
  "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1";

export const L4_DEVELOPMENT_COST_GUARD_V1 = Object.freeze({
  provider: "zhipu",
  model: "glm-4.6v",
  pricingCheckedAt: "2026-08-30",
  inputCnyPerMillionTokens: 1,
  outputCnyPerMillionTokens: 3,
  maximumObservedCostCny: 2,
  maximumProviderAttempts: 203,
  retry: "none",
});

export function estimatedObservedCostCnyV1(usage: {
  promptTokens: number;
  completionTokens: number;
}): number {
  if (!Number.isFinite(usage.promptTokens) || usage.promptTokens < 0
    || !Number.isFinite(usage.completionTokens) || usage.completionTokens < 0) {
    throw new Error("l4_development_usage_invalid");
  }
  return usage.promptTokens / 1_000_000 * L4_DEVELOPMENT_COST_GUARD_V1.inputCnyPerMillionTokens
    + usage.completionTokens / 1_000_000 * L4_DEVELOPMENT_COST_GUARD_V1.outputCnyPerMillionTokens;
}

export function buildDiscussionThermometerL4DevelopmentStage1PlanV1():
CollectiveDynamicsTrajectoryPilotPlanV1 {
  const preflight = buildDiscussionThermometerL4PreflightV1();
  const sourceTaskIds = [...preflight.developmentScreen.stage1TaskIds];
  const sourceAgentCounts = sourceTaskIds.map(sourceTaskId =>
    createHiddenBenchTaskProjectionV1({ sourceTaskId }).adapter.task.agents.length);
  const registeredAgentCount = sourceAgentCounts.reduce((sum, count) => sum + count, 0);
  const sensorDuplicateSchedule = sourceTaskIds.map((sourceTaskId, index) => ({
    sourceTaskId,
    agentPosition: (Math.floor(index / 4) % 4 + 1) as 1 | 2 | 3 | 4,
    checkpointRound: (index % 4) as 0 | 1 | 2 | 3,
  }));
  const publicCallCount = registeredAgentCount * 3;
  const sensorCallCount = registeredAgentCount * 4 + sensorDuplicateSchedule.length;
  const body: Omit<CollectiveDynamicsTrajectoryPilotPlanV1, "contentHash"> = {
    planRef: DISCUSSION_THERMOMETER_L4_DEVELOPMENT_STAGE1_V1,
    sourceTaskIds,
    sourceTaskSelection:
      "lowest_source_task_id_per_precommitted_ai_adjudicated_development_group",
    sourceAgentCounts,
    registeredAgentCount,
    seed: 1,
    modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
    publicRounds: [1, 2, 3],
    checkpoints: [0, 1, 2, 3],
    interaction: "synchronous_previous_round_only",
    publicResponseContract: "choice_message_json_v1",
    publicInvocation: {
      temperature: 0,
      seed: 1,
      maxTokens: 768,
      thinking: "disabled",
      attemptsPerCell: 1,
      retry: "none",
    },
    sensorRepeats: ["A", "B"],
    sensorEstimator: "primary_only_with_one_stratified_duplicate_per_task",
    sensorDuplicateSchedule,
    sensorInvocation: {
      temperature: 0,
      seed: 1,
      maxTokens: 256,
      thinking: "disabled",
      attemptsPerCell: 1,
      retry: "none",
    },
    publicCallCount,
    sensorCallCount,
    totalProviderCallCount: publicCallCount + sensorCallCount,
    sensorTiming: "after_complete_public_trajectory_freeze",
    runIdPrefix: "collective-dynamics-l4-dev-stage1",
    truthAccess: "offline_analyzer_only",
    status: "proposed_no_provider_calls_executed",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  const plan = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan);
  return plan;
}

export function verifyDiscussionThermometerL4DevelopmentStage1PlanV1(
  plan: CollectiveDynamicsTrajectoryPilotPlanV1,
): void {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan);
  const expected = buildDiscussionThermometerL4DevelopmentStage1PlanV1();
  if (JSON.stringify(plan) !== JSON.stringify(expected)) {
    throw new Error("l4_development_stage1_plan_drift");
  }
  if (plan.totalProviderCallCount !== L4_DEVELOPMENT_COST_GUARD_V1.maximumProviderAttempts) {
    throw new Error("l4_development_stage1_attempt_cap_mismatch");
  }
}
