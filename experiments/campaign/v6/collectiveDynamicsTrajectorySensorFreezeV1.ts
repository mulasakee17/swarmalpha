/**
 * M2 canonical sensor adapter and pre-execution freeze.
 *
 * The adapter consumes only the new trajectory sensor view. It reuses the
 * canonical probability prompt renderer, but does not coerce the trajectory
 * view into the legacy formation-snapshot schema. This module freezes 152
 * requests and never invokes a provider.
 */
import {
  buildCollectiveDynamicsSensorPromptPayloadV1,
  COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
  type CollectiveDynamicsSensorPromptV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  verifyCollectiveDynamicsTrajectoryPublicArtifactV1,
  buildCollectiveDynamicsTrajectorySensorViewV1,
  buildCollectiveDynamicsTrajectorySensorViewUncheckedV1,
  type CollectiveDynamicsTrajectoryPublicArtifactV1,
  type CollectiveDynamicsTrajectorySensorViewV1,
} from "./collectiveDynamicsTrajectoryCheckpointV1";
import {
  buildCollectiveDynamicsTrajectoryPilotPlanV1,
  COLLECTIVE_DYNAMICS_TRAJECTORY_CHECKPOINTS_V1,
  COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_REPEATS_V1,
  verifyCollectiveDynamicsTrajectoryPilotPlanV1,
  type CollectiveDynamicsTrajectoryPilotPlanV1,
} from "./collectiveDynamicsTrajectoryPilotV1";
import type { SingleAttemptTextInvokeRequest } from "./providerAdapters";

export const COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_FREEZE_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-trajectory-sensor-freeze",
  version: "1.0.0",
});

export type TrajectorySensorRepeatLabelV1 = "A" | "B";

export interface CollectiveDynamicsTrajectorySensorCellV1 {
  cellId: string;
  unitId: string;
  sourceTaskId: number;
  agentId: string;
  checkpointRound: 0 | 1 | 2 | 3;
  snapshotHash: string;
  repeatLabel: TrajectorySensorRepeatLabelV1;
  withinUnitPosition: 1 | 2;
  globalSequence: number;
  request: SingleAttemptTextInvokeRequest;
  promptHash: string;
  requestHash: string;
}

export interface CollectiveDynamicsTrajectorySensorFreezeV1 {
  freezeRef: typeof COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_FREEZE_V1;
  planHash: string;
  sourceTrajectoryHashes: string[];
  views: CollectiveDynamicsTrajectorySensorViewV1[];
  cells: CollectiveDynamicsTrajectorySensorCellV1[];
  registeredTrajectoryCount: number;
  registeredViewCount: number;
  registeredCellCount: number;
  orderingPolicy: "task_roster_checkpoint_repeat_v1"
    | "task_roster_checkpoint_primary_then_selected_duplicate_v1";
  promptRef: typeof COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1;
  responseContract: "strict_categorical_probabilities_only_v1";
  truthAccess: "none";
  contentHash: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function canonicalPromptHash(prompt: CollectiveDynamicsSensorPromptV1): string {
  return hashCollectiveDynamicsValueV1({
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    responseFormat: "json",
  });
}

function promptForView(view: CollectiveDynamicsTrajectorySensorViewV1): CollectiveDynamicsSensorPromptV1 {
  return buildCollectiveDynamicsSensorPromptPayloadV1({
    payload: {
      contentHash: view.contentHash,
      publicContext: view.publicContext,
      ownPrivateInformation: view.ownPrivateInformation,
      roleConstraints: null,
      ownPublicMessage: view.ownPublicMessage
        ? { round: view.ownPublicMessage.round, agentId: view.ownPublicMessage.agentId,
          content: view.ownPublicMessage.content }
        : null,
      peerPublicMessages: view.peerPublicMessages.map(message => ({
        round: message.round, agentId: message.agentId, content: message.content,
      })),
      claim: {
        claimId: view.claim.id,
        proposition: view.claim.proposition,
        outcomeSpace: "finite_mutually_exclusive_exhaustive",
        reportSemantics: "probability_of_single_outcome",
        options: view.claim.options.map((canonicalLabel, index) => ({
          optionId: `opt_${index + 1}`,
          canonicalLabel,
        })),
      },
    },
    variant: "BASELINE_A",
  });
}

function buildCell(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  view: CollectiveDynamicsTrajectorySensorViewV1;
  artifact: CollectiveDynamicsTrajectoryPublicArtifactV1;
  repeatLabel: TrajectorySensorRepeatLabelV1;
  withinUnitPosition: 1 | 2;
  globalSequence: number;
}): CollectiveDynamicsTrajectorySensorCellV1 {
  const prompt = promptForView(input.view);
  const unitId = `${input.artifact.onlineTask.sourceTaskId}:${input.view.agentId}:X${input.view.checkpointRound}`;
  const cellId = `trajectory-sensor:${input.artifact.runId}:${unitId}:${input.repeatLabel.toLowerCase()}`;
  const request: SingleAttemptTextInvokeRequest = {
    requestId: cellId,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    responseFormat: "json",
    modelRef: clone(input.plan.modelRef),
    invocationConfig: {
      temperature: input.plan.sensorInvocation.temperature,
      seed: input.plan.sensorInvocation.seed,
      maxTokens: input.plan.sensorInvocation.maxTokens,
      thinking: input.plan.sensorInvocation.thinking,
    },
  };
  assertCollectiveDynamicsTruthBlindV1(request);
  return {
    cellId,
    unitId,
    sourceTaskId: input.view.sourceTaskId,
    agentId: input.view.agentId,
    checkpointRound: input.view.checkpointRound,
    snapshotHash: input.view.contentHash,
    repeatLabel: input.repeatLabel,
    withinUnitPosition: input.withinUnitPosition,
    globalSequence: input.globalSequence,
    request,
    promptHash: canonicalPromptHash(prompt),
    requestHash: hashCollectiveDynamicsValueV1(request),
  };
}

function expectedArtifacts(
  plan: CollectiveDynamicsTrajectoryPilotPlanV1,
  artifacts: readonly CollectiveDynamicsTrajectoryPublicArtifactV1[],
): CollectiveDynamicsTrajectoryPublicArtifactV1[] {
  const byTask = new Map(artifacts.map(artifact => [artifact.onlineTask.sourceTaskId, artifact]));
  if (byTask.size !== artifacts.length
    || artifacts.length !== plan.sourceTaskIds.length
    || plan.sourceTaskIds.some(taskId => !byTask.has(taskId))) {
    throw new Error("trajectory_sensor_freeze_source_artifact_set_invalid");
  }
  return plan.sourceTaskIds.map(taskId => byTask.get(taskId)!);
}

export function buildCollectiveDynamicsTrajectorySensorFreezeV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  artifacts: readonly CollectiveDynamicsTrajectoryPublicArtifactV1[];
}): CollectiveDynamicsTrajectorySensorFreezeV1 {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(input.plan);
  const artifacts = expectedArtifacts(input.plan, input.artifacts);
  artifacts.forEach(artifact => verifyCollectiveDynamicsTrajectoryPublicArtifactV1(artifact, input.plan));
  const views: CollectiveDynamicsTrajectorySensorViewV1[] = [];
  const cells: CollectiveDynamicsTrajectorySensorCellV1[] = [];
  let globalSequence = 0;
  const selectiveDuplicates = input.plan.sensorEstimator
    === "primary_only_with_one_stratified_duplicate_per_task";
  artifacts.forEach(artifact => {
    artifact.onlineTask.agents.forEach((agent, agentIndex) => {
      input.plan.checkpoints.forEach(checkpointRound => {
        const view = buildCollectiveDynamicsTrajectorySensorViewUncheckedV1({
          artifact,
          plan: input.plan,
          agentId: agent.agentId,
          checkpointRound,
        });
        views.push(view);
        const duplicateSelected = input.plan.sensorDuplicateSchedule?.some(cell =>
          cell.sourceTaskId === artifact.onlineTask.sourceTaskId
          && cell.agentPosition === agentIndex + 1
          && cell.checkpointRound === checkpointRound) ?? false;
        const repeats: TrajectorySensorRepeatLabelV1[] = selectiveDuplicates
          ? duplicateSelected ? ["A", "B"] : ["A"]
          : [...COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_REPEATS_V1];
        repeats.forEach((repeatLabel, index) => {
          globalSequence += 1;
          cells.push(buildCell({
            plan: input.plan,
            view,
            artifact,
            repeatLabel,
            withinUnitPosition: (index + 1) as 1 | 2,
            globalSequence,
          }));
        });
      });
    });
  });
  const expectedViewCount = input.plan.registeredAgentCount * input.plan.checkpoints.length;
  if (views.length !== expectedViewCount || cells.length !== input.plan.sensorCallCount) {
    throw new Error("trajectory_sensor_freeze_registered_count_invalid");
  }
  const body: Omit<CollectiveDynamicsTrajectorySensorFreezeV1, "contentHash"> = {
    freezeRef: COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_FREEZE_V1,
    planHash: input.plan.contentHash,
    sourceTrajectoryHashes: artifacts.map(artifact => artifact.contentHash),
    views,
    cells,
    registeredTrajectoryCount: artifacts.length,
    registeredViewCount: views.length,
    registeredCellCount: cells.length,
    orderingPolicy: selectiveDuplicates
      ? "task_roster_checkpoint_primary_then_selected_duplicate_v1"
      : "task_roster_checkpoint_repeat_v1",
    promptRef: COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
    responseContract: "strict_categorical_probabilities_only_v1",
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsTrajectorySensorFreezeV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  artifacts: readonly CollectiveDynamicsTrajectoryPublicArtifactV1[];
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
}): void {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(input.plan);
  assertCollectiveDynamicsTruthBlindV1(input.freeze);
  const expected = buildCollectiveDynamicsTrajectorySensorFreezeV1({
    plan: input.plan,
    artifacts: input.artifacts,
  });
  if (JSON.stringify(input.freeze) !== JSON.stringify(expected)) {
    throw new Error("trajectory_sensor_freeze_drift");
  }
  if (input.freeze.planHash !== input.plan.contentHash
    || input.freeze.freezeRef.id !== COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_FREEZE_V1.id
    || input.freeze.freezeRef.version !== COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_FREEZE_V1.version
    || input.freeze.promptRef.id !== COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1.id
    || input.freeze.promptRef.version !== COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1.version) {
    throw new Error("trajectory_sensor_freeze_binding_invalid");
  }
}

export function defaultCollectiveDynamicsTrajectorySensorFreezePlanV1(): CollectiveDynamicsTrajectoryPilotPlanV1 {
  return buildCollectiveDynamicsTrajectoryPilotPlanV1();
}
