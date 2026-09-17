/**
 * Two-stage M2 trajectory binding.
 *
 * Stage 1 freezes a completed message-only public trajectory. Stage 2 derives
 * truth-blind sensor views from that frozen trajectory. No provider is called
 * here, and the checkpoint contract intentionally represents X0 without a
 * fabricated round-0 provider call.
 */
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
  type CollectiveDynamicsOnlineTaskV1,
} from "./collectiveDynamicsV1";
import {
  buildCollectiveDynamicsTrajectoryPilotPlanV1,
  verifyCollectiveDynamicsTrajectoryPilotPlanV1,
  type CollectiveDynamicsTrajectoryPilotPlanV1,
} from "./collectiveDynamicsTrajectoryPilotV1";
import type { V6PublicTranscriptEntry } from "./productionVerticalSlice";

export const COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_ARTIFACT_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-trajectory-public-artifact",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_TRAJECTORY_CHECKPOINT_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-trajectory-checkpoint",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_VIEW_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-trajectory-sensor-view",
  version: "1.0.0",
});

export type TrajectoryCheckpointRoundV1 = 0 | 1 | 2 | 3;

export interface CollectiveDynamicsTrajectoryPublicCallRefV1 {
  requestId: string;
  round: 1 | 2 | 3;
  agentId: string;
  requestHash: string;
  responseHash: string;
}

export interface CollectiveDynamicsTrajectoryPublicRoundV1 {
  round: 1 | 2 | 3;
  messages: V6PublicTranscriptEntry[];
  calls: CollectiveDynamicsTrajectoryPublicCallRefV1[];
  contentHash: string;
}

export interface CollectiveDynamicsTrajectoryCheckpointV1 {
  checkpointRef: typeof COLLECTIVE_DYNAMICS_TRAJECTORY_CHECKPOINT_V1;
  checkpointId: string;
  checkpointRound: TrajectoryCheckpointRoundV1;
  visibleMessages: V6PublicTranscriptEntry[];
  sourceRequestHashes: string[];
  contentHash: string;
}

export interface CollectiveDynamicsTrajectoryPublicArtifactV1 {
  artifactRef: typeof COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_ARTIFACT_V1;
  planHash: string;
  runId: string;
  seed: 1;
  modelRef: { id: "zhipu:glm-4.6v"; version: "1.0.0" };
  onlineTask: CollectiveDynamicsOnlineTaskV1;
  rounds: [
    CollectiveDynamicsTrajectoryPublicRoundV1,
    CollectiveDynamicsTrajectoryPublicRoundV1,
    CollectiveDynamicsTrajectoryPublicRoundV1,
  ];
  checkpoints: [
    CollectiveDynamicsTrajectoryCheckpointV1,
    CollectiveDynamicsTrajectoryCheckpointV1,
    CollectiveDynamicsTrajectoryCheckpointV1,
    CollectiveDynamicsTrajectoryCheckpointV1,
  ];
  contentHash: string;
}

export interface CollectiveDynamicsTrajectorySensorViewV1 {
  viewRef: typeof COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_VIEW_V1;
  sourceTrajectoryHash: string;
  sourceCheckpointHash: string;
  sourceRequestHashes: string[];
  taskId: string;
  sourceTaskId: number;
  agentId: string;
  checkpointId: string;
  checkpointRound: TrajectoryCheckpointRoundV1;
  expectedAgentIds: string[];
  publicContext: string;
  ownPrivateInformation: string;
  ownPublicMessage: V6PublicTranscriptEntry | null;
  peerPublicMessages: V6PublicTranscriptEntry[];
  claim: CollectiveDynamicsOnlineTaskV1["claim"];
  informationPolicy: "supplied_information_only";
  contentHash: string;
}

function requireHash(value: string, field: string): void {
  if (!/^sha256:[0-9a-f]{64}$/.test(value)) throw new Error(`trajectory_${field}_invalid`);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function taskFor(sourceTaskId: number): CollectiveDynamicsOnlineTaskV1 {
  const task = createHiddenBenchTaskProjectionV1({ sourceTaskId }).adapter.task;
  return {
    sourceTaskId,
    taskId: task.id,
    publicContext: task.publicContext,
    claim: clone(task.claim),
    agents: clone(task.agents),
  };
}

function validateMessages(input: {
  task: CollectiveDynamicsOnlineTaskV1;
  round: 1 | 2 | 3;
  messages: readonly V6PublicTranscriptEntry[];
}): void {
  const expectedAgentIds = input.task.agents.map(agent => agent.agentId);
  const ids = input.messages.map(message => message.agentId);
  if (input.messages.length !== expectedAgentIds.length
    || JSON.stringify(ids) !== JSON.stringify(expectedAgentIds)
    || input.messages.some(message => message.round !== input.round
      || message.source !== "agent"
      || typeof message.content !== "string"
      || message.content.trim().length === 0)) {
    throw new Error("trajectory_public_round_messages_invalid");
  }
}

function validateCalls(input: {
  task: CollectiveDynamicsOnlineTaskV1;
  round: 1 | 2 | 3;
  runId: string;
  calls: readonly CollectiveDynamicsTrajectoryPublicCallRefV1[];
}): void {
  const expectedAgentIds = input.task.agents.map(agent => agent.agentId);
  if (input.calls.length !== expectedAgentIds.length
    || JSON.stringify(input.calls.map(call => call.agentId)) !== JSON.stringify(expectedAgentIds)) {
    throw new Error("trajectory_public_round_calls_invalid");
  }
  input.calls.forEach((call, index) => {
    requireHash(call.requestHash, "request_hash");
    requireHash(call.responseHash, "response_hash");
    if (call.round !== input.round
      || call.agentId !== expectedAgentIds[index]
      || call.requestId !== `discussion:${input.runId}:r${input.round}:${call.agentId}`
      || call.requestId.trim().length === 0) {
      throw new Error("trajectory_public_call_identity_invalid");
    }
  });
}

function checkpoint(input: {
  runId: string;
  taskId: string;
  checkpointRound: TrajectoryCheckpointRoundV1;
  visibleMessages: readonly V6PublicTranscriptEntry[];
  sourceRequestHashes: readonly string[];
}): CollectiveDynamicsTrajectoryCheckpointV1 {
  const body: Omit<CollectiveDynamicsTrajectoryCheckpointV1, "contentHash"> = {
    checkpointRef: COLLECTIVE_DYNAMICS_TRAJECTORY_CHECKPOINT_V1,
    checkpointId: `${input.taskId}:${input.runId}:X${input.checkpointRound}`,
    checkpointRound: input.checkpointRound,
    visibleMessages: clone([...input.visibleMessages]),
    sourceRequestHashes: [...input.sourceRequestHashes],
  };
  body.sourceRequestHashes.forEach(hash => requireHash(hash, "source_request_hash"));
  if (input.checkpointRound === 0 && body.sourceRequestHashes.length !== 0) {
    throw new Error("trajectory_x0_must_have_no_source_requests");
  }
  if (input.checkpointRound > 0 && body.sourceRequestHashes.length === 0) {
    throw new Error("trajectory_post_round_checkpoint_requires_source_requests");
  }
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function buildCollectiveDynamicsTrajectoryPublicArtifactV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  sourceTaskId: number;
  runId: string;
  seed?: 1;
  rounds: readonly [{
    round: 1;
    messages: readonly V6PublicTranscriptEntry[];
    calls: readonly CollectiveDynamicsTrajectoryPublicCallRefV1[];
  }, {
    round: 2;
    messages: readonly V6PublicTranscriptEntry[];
    calls: readonly CollectiveDynamicsTrajectoryPublicCallRefV1[];
  }, {
    round: 3;
    messages: readonly V6PublicTranscriptEntry[];
    calls: readonly CollectiveDynamicsTrajectoryPublicCallRefV1[];
  }];
}): CollectiveDynamicsTrajectoryPublicArtifactV1 {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(input.plan);
  if (!input.plan.sourceTaskIds.includes(input.sourceTaskId)) {
    throw new Error("trajectory_public_task_outside_plan");
  }
  if (input.seed !== undefined && input.seed !== 1) throw new Error("trajectory_public_seed_invalid");
  if (input.runId.trim().length === 0) throw new Error("trajectory_public_run_id_invalid");
  const onlineTask = taskFor(input.sourceTaskId);
  const rounds = input.rounds.map((roundInput, index) => {
    if (roundInput.round !== index + 1) throw new Error("trajectory_public_round_order_invalid");
    validateMessages({ task: onlineTask, round: roundInput.round, messages: roundInput.messages });
    validateCalls({
      task: onlineTask,
      round: roundInput.round,
      runId: input.runId,
      calls: roundInput.calls,
    });
    const body = {
      round: roundInput.round,
      messages: clone([...roundInput.messages]),
      calls: clone([...roundInput.calls]),
    };
    assertCollectiveDynamicsTruthBlindV1(body);
    return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  }) as unknown as CollectiveDynamicsTrajectoryPublicArtifactV1["rounds"];
  const checkpoints = [
    checkpoint({ runId: input.runId, taskId: onlineTask.taskId, checkpointRound: 0,
      visibleMessages: [], sourceRequestHashes: [] }),
    ...rounds.map(round => checkpoint({
      runId: input.runId,
      taskId: onlineTask.taskId,
      checkpointRound: round.round,
      // The public protocol is explicitly previous-round-only. X_t therefore
      // contains the exact message window supplied to the next public round.
      visibleMessages: round.messages,
      sourceRequestHashes: round.calls.map(call => call.requestHash),
    })),
  ] as CollectiveDynamicsTrajectoryPublicArtifactV1["checkpoints"];
  const body: Omit<CollectiveDynamicsTrajectoryPublicArtifactV1, "contentHash"> = {
    artifactRef: COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_ARTIFACT_V1,
    planHash: input.plan.contentHash,
    runId: input.runId,
    seed: 1,
    modelRef: clone(input.plan.modelRef),
    onlineTask,
    rounds,
    checkpoints,
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsTrajectoryPublicArtifactV1(
  artifact: CollectiveDynamicsTrajectoryPublicArtifactV1,
  plan: CollectiveDynamicsTrajectoryPilotPlanV1,
): void {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan);
  assertCollectiveDynamicsTruthBlindV1(artifact);
  const expected = buildCollectiveDynamicsTrajectoryPublicArtifactV1({
    plan,
    sourceTaskId: artifact.onlineTask.sourceTaskId,
    runId: artifact.runId,
    seed: artifact.seed,
    rounds: artifact.rounds.map(round => ({
      round: round.round,
      messages: round.messages,
      calls: round.calls,
    })) as unknown as Parameters<typeof buildCollectiveDynamicsTrajectoryPublicArtifactV1>[0]["rounds"],
  });
  if (JSON.stringify(artifact) !== JSON.stringify(expected)) {
    throw new Error("trajectory_public_artifact_drift");
  }
  if (artifact.planHash !== plan.contentHash
    || artifact.modelRef.id !== plan.modelRef.id
    || artifact.modelRef.version !== plan.modelRef.version) {
    throw new Error("trajectory_public_artifact_binding_invalid");
  }
}

function validateCheckpointView(
  view: Omit<CollectiveDynamicsTrajectorySensorViewV1, "contentHash"> | CollectiveDynamicsTrajectorySensorViewV1,
): void {
  assertCollectiveDynamicsTruthBlindV1(view);
  if (view.viewRef.id !== COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_VIEW_V1.id
    || view.viewRef.version !== COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_VIEW_V1.version) {
    throw new Error("trajectory_sensor_view_ref_invalid");
  }
  requireHash(view.sourceTrajectoryHash, "source_trajectory_hash");
  requireHash(view.sourceCheckpointHash, "source_checkpoint_hash");
  view.sourceRequestHashes.forEach(hash => requireHash(hash, "source_request_hash"));
  if (new Set(view.sourceRequestHashes).size !== view.sourceRequestHashes.length
    || new Set(view.expectedAgentIds).size !== view.expectedAgentIds.length
    || view.expectedAgentIds.some(agentId => agentId.trim().length === 0)) {
    throw new Error("trajectory_sensor_view_identity_invalid");
  }
  if (view.checkpointRound === 0 && view.sourceRequestHashes.length !== 0) {
    throw new Error("trajectory_sensor_x0_source_requests_invalid");
  }
  if (view.checkpointRound > 0 && view.sourceRequestHashes.length === 0) {
    throw new Error("trajectory_sensor_post_round_source_requests_invalid");
  }
  if (!view.expectedAgentIds.includes(view.agentId)
    || view.taskId.trim().length === 0
    || view.publicContext.trim().length === 0
    || view.informationPolicy !== "supplied_information_only") {
    throw new Error("trajectory_sensor_view_identity_invalid");
  }
  const messages = [
    ...(view.ownPublicMessage ? [view.ownPublicMessage] : []),
    ...view.peerPublicMessages,
  ];
  if (view.ownPublicMessage !== null && view.ownPublicMessage.agentId !== view.agentId
    || view.peerPublicMessages.some(message => message.agentId === view.agentId)
    || (view.checkpointRound > 0 && messages.length !== view.expectedAgentIds.length)
    || messages.some(message => message.round !== view.checkpointRound
      || message.source !== "agent"
      || !view.expectedAgentIds.includes(message.agentId)
      || typeof message.content !== "string"
      || message.content.trim().length === 0)
    || new Set(messages.map(message => message.agentId)).size !== messages.length) {
    throw new Error("trajectory_sensor_view_messages_invalid");
  }
  if (view.checkpointRound === 0 && messages.length !== 0) {
    throw new Error("trajectory_sensor_x0_messages_invalid");
  }
}

/** Internal derivation after the caller has verified the public artifact. */
export function buildCollectiveDynamicsTrajectorySensorViewUncheckedV1(input: {
  artifact: CollectiveDynamicsTrajectoryPublicArtifactV1;
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  agentId: string;
  checkpointRound: TrajectoryCheckpointRoundV1;
}): CollectiveDynamicsTrajectorySensorViewV1 {
  const checkpointValue = input.artifact.checkpoints.find(candidate =>
    candidate.checkpointRound === input.checkpointRound);
  if (!checkpointValue) throw new Error("trajectory_sensor_checkpoint_missing");
  const agent = input.artifact.onlineTask.agents.find(candidate => candidate.agentId === input.agentId);
  if (!agent) throw new Error("trajectory_sensor_agent_missing");
  const own = checkpointValue.visibleMessages.find(message => message.agentId === input.agentId) ?? null;
  const peers = checkpointValue.visibleMessages.filter(message => message.agentId !== input.agentId);
  const body: Omit<CollectiveDynamicsTrajectorySensorViewV1, "contentHash"> = {
    viewRef: COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_VIEW_V1,
    sourceTrajectoryHash: input.artifact.contentHash,
    sourceCheckpointHash: checkpointValue.contentHash,
    sourceRequestHashes: [...checkpointValue.sourceRequestHashes],
    taskId: input.artifact.onlineTask.taskId,
    sourceTaskId: input.artifact.onlineTask.sourceTaskId,
    agentId: input.agentId,
    checkpointId: checkpointValue.checkpointId,
    checkpointRound: checkpointValue.checkpointRound,
    expectedAgentIds: input.artifact.onlineTask.agents.map(candidate => candidate.agentId),
    publicContext: input.artifact.onlineTask.publicContext,
    ownPrivateInformation: agent.privateInformation,
    ownPublicMessage: own ? clone(own) : null,
    peerPublicMessages: clone(peers),
    claim: clone(input.artifact.onlineTask.claim),
    informationPolicy: "supplied_information_only",
  };
  validateCheckpointView(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

/** Derive one sensor view only after the complete public artifact is frozen. */
export function buildCollectiveDynamicsTrajectorySensorViewV1(input: {
  artifact: CollectiveDynamicsTrajectoryPublicArtifactV1;
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  agentId: string;
  checkpointRound: TrajectoryCheckpointRoundV1;
}): CollectiveDynamicsTrajectorySensorViewV1 {
  verifyCollectiveDynamicsTrajectoryPublicArtifactV1(input.artifact, input.plan);
  return buildCollectiveDynamicsTrajectorySensorViewUncheckedV1(input);
}

export function verifyCollectiveDynamicsTrajectorySensorViewV1(
  input: {
    view: CollectiveDynamicsTrajectorySensorViewV1;
    artifact: CollectiveDynamicsTrajectoryPublicArtifactV1;
    plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  },
): void {
  const { view } = input;
  validateCheckpointView(view);
  verifyCollectiveDynamicsTrajectoryPublicArtifactV1(input.artifact, input.plan);
  const expected = buildCollectiveDynamicsTrajectorySensorViewV1({
    artifact: input.artifact,
    plan: input.plan,
    agentId: view.agentId,
    checkpointRound: view.checkpointRound,
  });
  if (JSON.stringify(view) !== JSON.stringify(expected)) {
    throw new Error("trajectory_sensor_view_binding_invalid");
  }
  const { contentHash, ...body } = view;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("trajectory_sensor_view_hash_mismatch");
  }
}

export function defaultCollectiveDynamicsTrajectoryPilotPlanV1(): CollectiveDynamicsTrajectoryPilotPlanV1 {
  return buildCollectiveDynamicsTrajectoryPilotPlanV1();
}
