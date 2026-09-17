import {
  projectDiscussionThermometerStateV1,
  projectDiscussionThermometerTrajectoryV1,
  verifyDiscussionThermometerTrajectoryV1,
  type DiscussionThermometerTrajectoryV1,
} from "../../../src/lib/epistemic";
import {
  buildCollectiveDynamicsSensorPromptPayloadV1,
  COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
  parseCollectiveDynamicsSensorReportV1_1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  buildDiscussionThermometerCalibrationPublicRequestV1,
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1,
  type DiscussionThermometerStateSpaceCalibrationPlanV1,
} from "./discussionThermometerStateSpaceCalibrationPlanV1";
import {
  DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1,
  projectDiscussionThermometerCoverageOnlineTaskV1,
} from "./discussionThermometerStateSpaceTaskBankV1";
import {
  createV6DiscussionAdapter,
  type SingleAttemptTextInvokeRequest,
  type SingleAttemptTextInvokeResult,
  type SingleAttemptTextInvoker,
} from "./providerAdapters";
import type { V6PublicTranscriptEntry } from "./productionVerticalSlice";
import {
  parseL4StructuredPublicTurnV1,
  type L4StructuredPublicTurnV1,
} from "./discussionThermometerL4PreflightV1";

export const DISCUSSION_THERMOMETER_CALIBRATION_PUBLIC_RUN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-state-space-public-run",
  version: "1.0.0",
});

export const DISCUSSION_THERMOMETER_CALIBRATION_SENSOR_FREEZE_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-state-space-sensor-freeze",
  version: "1.0.0",
});

export const DISCUSSION_THERMOMETER_CALIBRATION_SENSOR_RUN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-state-space-sensor-run",
  version: "1.0.0",
});

export const DISCUSSION_THERMOMETER_CALIBRATION_OBSERVATION_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-state-space-observation",
  version: "1.0.0",
});

export interface DiscussionThermometerCalibrationPublicTerminalV1 {
  sequence: number;
  cellId: string;
  taskId: string;
  round: 1 | 2;
  agentId: string;
  requestHash: string;
  request: ReturnType<typeof buildDiscussionThermometerCalibrationPublicRequestV1>;
  rawResponse: string;
  responseHash: string;
  parsed: L4StructuredPublicTurnV1;
  usage?: SingleAttemptTextInvokeResult["usage"];
}

export interface DiscussionThermometerCalibrationPublicRunV1 {
  runRef: typeof DISCUSSION_THERMOMETER_CALIBRATION_PUBLIC_RUN_V1;
  planHash: string;
  terminals: DiscussionThermometerCalibrationPublicTerminalV1[];
  taskTrajectories: Array<{
    taskId: string;
    rounds: Array<{ round: 1 | 2; messages: V6PublicTranscriptEntry[] }>;
    contentHash: string;
  }>;
  registeredCellCount: 64;
  terminalCellCount: 64;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

export interface DiscussionThermometerCalibrationSensorViewV1 {
  taskId: string;
  agentId: string;
  checkpoint: 0 | 1 | 2;
  publicContext: string;
  ownPrivateInformation: string;
  ownPublicMessage: { round: number; agentId: string; content: string } | null;
  peerPublicMessages: Array<{ round: number; agentId: string; content: string }>;
  claim: {
    claimId: string;
    proposition: string;
    options: Array<{ optionId: string; canonicalLabel: string }>;
  };
  sourcePublicRequestHashes: string[];
  contentHash: string;
}

export interface DiscussionThermometerCalibrationSensorCellV1 {
  sequence: number;
  cellId: string;
  taskId: string;
  agentId: string;
  checkpoint: 0 | 1 | 2;
  repeatLabel: "A" | "B";
  viewHash: string;
  promptHash: string;
  requestHash: string;
  request: SingleAttemptTextInvokeRequest;
}

export interface DiscussionThermometerCalibrationSensorFreezeV1 {
  freezeRef: typeof DISCUSSION_THERMOMETER_CALIBRATION_SENSOR_FREEZE_V1;
  planHash: string;
  publicRunHash: string;
  views: DiscussionThermometerCalibrationSensorViewV1[];
  cells: DiscussionThermometerCalibrationSensorCellV1[];
  registeredViewCount: 96;
  registeredCellCount: 192;
  orderingPolicy: "task_agent_checkpoint_repeat";
  truthAccess: "none";
  writeback: "none";
  contentHash: string;
}

export interface DiscussionThermometerCalibrationSensorTerminalV1 {
  sequence: number;
  cellId: string;
  requestHash: string;
  rawResponse: string;
  responseHash: string;
  probabilitiesByOptionId: Record<string, number>;
  usage?: SingleAttemptTextInvokeResult["usage"];
}

export interface DiscussionThermometerCalibrationSensorRunV1 {
  runRef: typeof DISCUSSION_THERMOMETER_CALIBRATION_SENSOR_RUN_V1;
  freezeHash: string;
  terminals: DiscussionThermometerCalibrationSensorTerminalV1[];
  registeredCellCount: 192;
  terminalCellCount: 192;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

export interface DiscussionThermometerCalibrationObservationV1 {
  observationRef: typeof DISCUSSION_THERMOMETER_CALIBRATION_OBSERVATION_V1;
  planHash: string;
  publicRunHash: string;
  sensorFreezeHash: string;
  sensorRunHash: string;
  trajectories: Array<{
    taskId: string;
    trajectory: DiscussionThermometerTrajectoryV1;
  }>;
  truthAccess: "none";
  predictionUsed: false;
  actionProduced: false;
  contentHash: string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function taskById(taskId: string) {
  const value = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1
    .find(task => task.taskId === taskId);
  if (!value) throw new Error("thermometer_calibration_task_missing");
  return value;
}

function adapter(plan: DiscussionThermometerStateSpaceCalibrationPlanV1,
  invoker: SingleAttemptTextInvoker) {
  return createV6DiscussionAdapter({
    contract: {
      id: "discussion-thermometer-state-space-calibration-adapter",
      version: "1.0.0",
      adapterRef: { id: "provider-adapter:single-attempt", version: "1.0.0" },
      agentBindings: plan.agentIds.map(agentId => ({
        agentId,
        modelRef: clone(plan.modelRef),
        invocationConfig: {
          temperature: plan.publicInvocation.temperature,
          seed: plan.publicInvocation.seed,
          maxTokens: plan.publicInvocation.maxTokens,
          thinking: plan.publicInvocation.thinking,
        },
      })),
      timeoutMs: 120_000,
      retryPolicy: "none",
      executionOrder: "round_then_precommitted_agent",
    },
    invoker,
  });
}

export async function executeDiscussionThermometerCalibrationPublicV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  invoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
  onAttemptStart?: (value: {
    sequence: number;
    cellId: string;
    requestHash: string;
  }) => void;
  onTerminal?: (terminal: DiscussionThermometerCalibrationPublicTerminalV1) => void;
}): Promise<DiscussionThermometerCalibrationPublicRunV1> {
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1(input.plan);
  const signal = input.signal ?? new AbortController().signal;
  const discussion = adapter(input.plan, input.invoker);
  const terminals: DiscussionThermometerCalibrationPublicTerminalV1[] = [];
  const taskTrajectories: DiscussionThermometerCalibrationPublicRunV1["taskTrajectories"] = [];
  let sequence = 0;
  for (const taskId of input.plan.variantTaskIds) {
    const rounds: Array<{ round: 1 | 2; messages: V6PublicTranscriptEntry[] }> = [];
    let previous: V6PublicTranscriptEntry[] = [];
    for (const round of input.plan.publicRounds) {
      const messages: V6PublicTranscriptEntry[] = [];
      for (const agentId of input.plan.agentIds) {
        sequence += 1;
        const request = buildDiscussionThermometerCalibrationPublicRequestV1({
          plan: input.plan, taskId, agentId, round, previousRoundMessages: previous,
        });
        input.onAttemptStart?.({
          sequence,
          cellId: request.requestId,
          requestHash: hashCollectiveDynamicsValueV1(request),
        });
        const response = await discussion.respond(clone(request), signal);
        if (response.status !== "response" || !response.rawResponse.trim()) {
          throw new Error(`thermometer_calibration_public_halt:${request.requestId}`);
        }
        const parsed = parseL4StructuredPublicTurnV1(
          response.rawResponse, ["opt_1", "opt_2", "opt_3"],
        );
        const terminal: DiscussionThermometerCalibrationPublicTerminalV1 = {
          sequence,
          cellId: request.requestId,
          taskId,
          round,
          agentId,
          requestHash: hashCollectiveDynamicsValueV1(request),
          request: clone(request),
          rawResponse: response.rawResponse,
          responseHash: hashCollectiveDynamicsValueV1(response.rawResponse),
          parsed,
          ...(response.usage ? { usage: clone(response.usage) } : {}),
        };
        terminals.push(terminal);
        input.onTerminal?.(clone(terminal));
        messages.push({
          round,
          agentId,
          content: `[choiceId=${parsed.choiceId}]\n${parsed.message}`,
          source: "agent",
        });
      }
      rounds.push({ round, messages: clone(messages) });
      previous = clone(messages);
    }
    const trajectoryBody = { taskId, rounds };
    taskTrajectories.push({
      ...trajectoryBody,
      contentHash: hashCollectiveDynamicsValueV1(trajectoryBody),
    });
  }
  const body: Omit<DiscussionThermometerCalibrationPublicRunV1, "contentHash"> = {
    runRef: DISCUSSION_THERMOMETER_CALIBRATION_PUBLIC_RUN_V1,
    planHash: input.plan.contentHash,
    terminals,
    taskTrajectories,
    registeredCellCount: 64,
    terminalCellCount: 64,
    attemptsPerCell: 1,
    retry: "none",
  };
  const run = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyDiscussionThermometerCalibrationPublicRunV1({ plan: input.plan, run });
  return run;
}

export function verifyDiscussionThermometerCalibrationPublicRunV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  run: DiscussionThermometerCalibrationPublicRunV1;
}): void {
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1(input.plan);
  const run = input.run;
  const { contentHash, ...body } = run;
  if (run.planHash !== input.plan.contentHash
    || run.registeredCellCount !== input.plan.callBudget.publicCalls
    || run.terminalCellCount !== run.registeredCellCount
    || run.terminals.length !== run.registeredCellCount
    || run.taskTrajectories.length !== input.plan.variantTaskIds.length
    || hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("thermometer_calibration_public_run_invalid");
  }
  let sequence = 0;
  for (const taskId of input.plan.variantTaskIds) {
    const trajectory = run.taskTrajectories.find(value => value.taskId === taskId);
    if (!trajectory || trajectory.rounds.length !== 2) {
      throw new Error("thermometer_calibration_public_trajectory_missing");
    }
    let previous: V6PublicTranscriptEntry[] = [];
    for (const round of input.plan.publicRounds) {
      const roundArtifact = trajectory.rounds.find(value => value.round === round);
      if (!roundArtifact || roundArtifact.messages.length !== 4) {
        throw new Error("thermometer_calibration_public_round_invalid");
      }
      for (const agentId of input.plan.agentIds) {
        sequence += 1;
        const terminal = run.terminals[sequence - 1];
        const expectedRequest = buildDiscussionThermometerCalibrationPublicRequestV1({
          plan: input.plan, taskId, agentId, round, previousRoundMessages: previous,
        });
        if (terminal.sequence !== sequence || terminal.taskId !== taskId
          || terminal.agentId !== agentId || terminal.round !== round
          || JSON.stringify(terminal.request) !== JSON.stringify(expectedRequest)
          || terminal.requestHash !== hashCollectiveDynamicsValueV1(expectedRequest)
          || terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)
          || JSON.stringify(terminal.parsed) !== JSON.stringify(
            parseL4StructuredPublicTurnV1(terminal.rawResponse, ["opt_1", "opt_2", "opt_3"])
          )) {
          throw new Error("thermometer_calibration_public_terminal_invalid");
        }
      }
      previous = clone(roundArtifact.messages);
    }
    const { contentHash: trajectoryHash, ...trajectoryBody } = trajectory;
    if (hashCollectiveDynamicsValueV1(trajectoryBody) !== trajectoryHash) {
      throw new Error("thermometer_calibration_public_trajectory_hash_invalid");
    }
  }
}

function viewFor(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  publicRun: DiscussionThermometerCalibrationPublicRunV1;
  taskId: string;
  agentId: string;
  checkpoint: 0 | 1 | 2;
}): DiscussionThermometerCalibrationSensorViewV1 {
  const online = projectDiscussionThermometerCoverageOnlineTaskV1(taskById(input.taskId));
  const trajectory = input.publicRun.taskTrajectories.find(value => value.taskId === input.taskId)!;
  const messages = input.checkpoint === 0 ? []
    : trajectory.rounds.find(value => value.round === input.checkpoint)!.messages;
  const priorTerminals = input.publicRun.terminals.filter(terminal =>
    terminal.taskId === input.taskId && terminal.round <= input.checkpoint);
  const agent = online.agents.find(value => value.agentId === input.agentId)!;
  const viewBody: Omit<DiscussionThermometerCalibrationSensorViewV1, "contentHash"> = {
    taskId: input.taskId,
    agentId: input.agentId,
    checkpoint: input.checkpoint,
    publicContext: online.publicContext,
    ownPrivateInformation: agent.privateInformation,
    ownPublicMessage: input.checkpoint === 0 ? null : clone(messages.find(message =>
      message.agentId === input.agentId)!),
    peerPublicMessages: input.checkpoint === 0 ? [] : clone(messages.filter(message =>
      message.agentId !== input.agentId)),
    claim: {
      claimId: online.claim.claimId,
      proposition: online.claim.proposition,
      options: online.claim.options.map(option => ({
        optionId: option.optionId,
        canonicalLabel: option.label,
      })),
    },
    sourcePublicRequestHashes: priorTerminals.map(terminal => terminal.requestHash),
  };
  assertCollectiveDynamicsTruthBlindV1(viewBody);
  return { ...viewBody, contentHash: hashCollectiveDynamicsValueV1(viewBody) };
}

export function buildDiscussionThermometerCalibrationSensorFreezeV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  publicRun: DiscussionThermometerCalibrationPublicRunV1;
}): DiscussionThermometerCalibrationSensorFreezeV1 {
  verifyDiscussionThermometerCalibrationPublicRunV1({
    plan: input.plan,
    run: input.publicRun,
  });
  const views: DiscussionThermometerCalibrationSensorViewV1[] = [];
  const cells: DiscussionThermometerCalibrationSensorCellV1[] = [];
  let sequence = 0;
  for (const taskId of input.plan.variantTaskIds) {
    for (const agentId of input.plan.agentIds) {
      for (const checkpoint of input.plan.checkpoints) {
        const view = viewFor({ ...input, taskId, agentId, checkpoint });
        views.push(view);
        const prompt = buildCollectiveDynamicsSensorPromptPayloadV1({
          payload: {
            contentHash: view.contentHash,
            publicContext: view.publicContext,
            ownPrivateInformation: view.ownPrivateInformation,
            roleConstraints: null,
            ownPublicMessage: view.ownPublicMessage,
            peerPublicMessages: view.peerPublicMessages,
            claim: {
              claimId: view.claim.claimId,
              proposition: view.claim.proposition,
              outcomeSpace: "finite_mutually_exclusive_exhaustive",
              reportSemantics: "probability_of_single_outcome",
              options: view.claim.options,
            },
          },
          variant: "BASELINE_A",
        });
        const promptHash = hashCollectiveDynamicsValueV1({
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          responseFormat: "json",
        });
        for (const repeatLabel of input.plan.sensorRepeats) {
          sequence += 1;
          const cellId = `thermometer-calibration-sensor:${taskId}:x${checkpoint}:${agentId}:${repeatLabel.toLowerCase()}`;
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
          cells.push({
            sequence, cellId, taskId, agentId, checkpoint, repeatLabel,
            viewHash: view.contentHash, promptHash,
            requestHash: hashCollectiveDynamicsValueV1(request), request,
          });
        }
      }
    }
  }
  const body: Omit<DiscussionThermometerCalibrationSensorFreezeV1, "contentHash"> = {
    freezeRef: DISCUSSION_THERMOMETER_CALIBRATION_SENSOR_FREEZE_V1,
    planHash: input.plan.contentHash,
    publicRunHash: input.publicRun.contentHash,
    views,
    cells,
    registeredViewCount: 96,
    registeredCellCount: 192,
    orderingPolicy: "task_agent_checkpoint_repeat",
    truthAccess: "none",
    writeback: "none",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerCalibrationSensorFreezeV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  publicRun: DiscussionThermometerCalibrationPublicRunV1;
  freeze: DiscussionThermometerCalibrationSensorFreezeV1;
}): void {
  const expected = buildDiscussionThermometerCalibrationSensorFreezeV1(input);
  if (JSON.stringify(expected) !== JSON.stringify(input.freeze)
    || input.freeze.cells.some((cell, index) => cell.sequence !== index + 1
      || cell.requestHash !== hashCollectiveDynamicsValueV1(cell.request))) {
    throw new Error("thermometer_calibration_sensor_freeze_invalid");
  }
  const units = new Map<string, DiscussionThermometerCalibrationSensorCellV1[]>();
  input.freeze.cells.forEach(cell => {
    const key = `${cell.taskId}:${cell.agentId}:${cell.checkpoint}`;
    units.set(key, [...(units.get(key) ?? []), cell]);
  });
  if (units.size !== 96 || [...units.values()].some(pair => pair.length !== 2
    || pair[0].promptHash !== pair[1].promptHash
    || pair[0].viewHash !== pair[1].viewHash)) {
    throw new Error("thermometer_calibration_sensor_duplicate_binding_invalid");
  }
}

export async function executeDiscussionThermometerCalibrationSensorV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  publicRun: DiscussionThermometerCalibrationPublicRunV1;
  freeze: DiscussionThermometerCalibrationSensorFreezeV1;
  invoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
  onAttemptStart?: (value: {
    sequence: number;
    cellId: string;
    requestHash: string;
  }) => void;
  onTerminal?: (terminal: DiscussionThermometerCalibrationSensorTerminalV1) => void;
}): Promise<DiscussionThermometerCalibrationSensorRunV1> {
  verifyDiscussionThermometerCalibrationSensorFreezeV1(input);
  const signal = input.signal ?? new AbortController().signal;
  const terminals: DiscussionThermometerCalibrationSensorTerminalV1[] = [];
  for (const cell of input.freeze.cells) {
    input.onAttemptStart?.({
      sequence: cell.sequence,
      cellId: cell.cellId,
      requestHash: cell.requestHash,
    });
    const result = await input.invoker.invoke(clone(cell.request), signal);
    const parsed = parseCollectiveDynamicsSensorReportV1_1(
      result.rawContent, ["opt_1", "opt_2", "opt_3"],
    );
    const terminal: DiscussionThermometerCalibrationSensorTerminalV1 = {
      sequence: cell.sequence,
      cellId: cell.cellId,
      requestHash: cell.requestHash,
      rawResponse: result.rawContent,
      responseHash: hashCollectiveDynamicsValueV1(result.rawContent),
      probabilitiesByOptionId: clone(parsed.probabilities),
      ...(result.usage ? { usage: clone(result.usage) } : {}),
    };
    terminals.push(terminal);
    input.onTerminal?.(clone(terminal));
  }
  const body: Omit<DiscussionThermometerCalibrationSensorRunV1, "contentHash"> = {
    runRef: DISCUSSION_THERMOMETER_CALIBRATION_SENSOR_RUN_V1,
    freezeHash: input.freeze.contentHash,
    terminals,
    registeredCellCount: 192,
    terminalCellCount: 192,
    attemptsPerCell: 1,
    retry: "none",
  };
  const run = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyDiscussionThermometerCalibrationSensorRunV1({ freeze: input.freeze, run });
  return run;
}

export function verifyDiscussionThermometerCalibrationSensorRunV1(input: {
  freeze: DiscussionThermometerCalibrationSensorFreezeV1;
  run: DiscussionThermometerCalibrationSensorRunV1;
}): void {
  const { contentHash, ...body } = input.run;
  if (input.run.freezeHash !== input.freeze.contentHash
    || input.run.registeredCellCount !== input.freeze.registeredCellCount
    || input.run.terminalCellCount !== input.run.registeredCellCount
    || input.run.terminals.length !== input.run.registeredCellCount
    || hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("thermometer_calibration_sensor_run_invalid");
  }
  input.run.terminals.forEach((terminal, index) => {
    const cell = input.freeze.cells[index];
    const parsed = parseCollectiveDynamicsSensorReportV1_1(
      terminal.rawResponse, ["opt_1", "opt_2", "opt_3"],
    );
    if (terminal.sequence !== index + 1 || terminal.cellId !== cell.cellId
      || terminal.requestHash !== cell.requestHash
      || terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)
      || JSON.stringify(terminal.probabilitiesByOptionId)
        !== JSON.stringify(parsed.probabilities)) {
      throw new Error("thermometer_calibration_sensor_terminal_invalid");
    }
  });
}

export function projectDiscussionThermometerCalibrationObservationV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  publicRun: DiscussionThermometerCalibrationPublicRunV1;
  sensorFreeze: DiscussionThermometerCalibrationSensorFreezeV1;
  sensorRun: DiscussionThermometerCalibrationSensorRunV1;
}): DiscussionThermometerCalibrationObservationV1 {
  verifyDiscussionThermometerCalibrationSensorFreezeV1({
    plan: input.plan, publicRun: input.publicRun, freeze: input.sensorFreeze,
  });
  verifyDiscussionThermometerCalibrationSensorRunV1({
    freeze: input.sensorFreeze, run: input.sensorRun,
  });
  const terminalsByCell = new Map(input.sensorRun.terminals.map(terminal =>
    [terminal.cellId, terminal]));
  const trajectories = input.plan.variantTaskIds.map(taskId => {
    const task = taskById(taskId);
    const states = input.plan.checkpoints.map(checkpoint => {
      const reportPairs = input.plan.agentIds.map(agentId => {
        const cells = input.sensorFreeze.cells.filter(cell => cell.taskId === taskId
          && cell.agentId === agentId && cell.checkpoint === checkpoint);
        const byRepeat = new Map(cells.map(cell => [cell.repeatLabel,
          terminalsByCell.get(cell.cellId)!]));
        return {
          agentId,
          A: { status: "valid" as const,
            probabilitiesByOptionId: clone(byRepeat.get("A")!.probabilitiesByOptionId) },
          B: { status: "valid" as const,
            probabilitiesByOptionId: clone(byRepeat.get("B")!.probabilitiesByOptionId) },
        };
      });
      const publicChoiceByAgentId = checkpoint === 0 ? undefined
        : Object.fromEntries(input.publicRun.terminals
          .filter(terminal => terminal.taskId === taskId && terminal.round === checkpoint)
          .map(terminal => [terminal.agentId, terminal.parsed.choiceId]));
      const viewHashes = input.sensorFreeze.views.filter(view => view.taskId === taskId
        && view.checkpoint === checkpoint).map(view => view.contentHash);
      return projectDiscussionThermometerStateV1({
        claimId: task.claim.claimId,
        checkpointId: `${taskId}:X${checkpoint}`,
        checkpointIndex: checkpoint,
        optionIds: task.claim.options.map(option => option.optionId),
        expectedAgentIds: [...input.plan.agentIds],
        reportPairs,
        ...(publicChoiceByAgentId ? { publicChoiceByAgentId } : {}),
        sensorRef: clone(COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1),
        snapshotHash: hashCollectiveDynamicsValueV1({ taskId, checkpoint, viewHashes }),
      });
    });
    const trajectory = projectDiscussionThermometerTrajectoryV1(states);
    verifyDiscussionThermometerTrajectoryV1(trajectory);
    return { taskId, trajectory: clone(trajectory) };
  });
  const body: Omit<DiscussionThermometerCalibrationObservationV1, "contentHash"> = {
    observationRef: DISCUSSION_THERMOMETER_CALIBRATION_OBSERVATION_V1,
    planHash: input.plan.contentHash,
    publicRunHash: input.publicRun.contentHash,
    sensorFreezeHash: input.sensorFreeze.contentHash,
    sensorRunHash: input.sensorRun.contentHash,
    trajectories,
    truthAccess: "none",
    predictionUsed: false,
    actionProduced: false,
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerCalibrationObservationV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  publicRun: DiscussionThermometerCalibrationPublicRunV1;
  sensorFreeze: DiscussionThermometerCalibrationSensorFreezeV1;
  sensorRun: DiscussionThermometerCalibrationSensorRunV1;
  observation: DiscussionThermometerCalibrationObservationV1;
}): void {
  const expected = projectDiscussionThermometerCalibrationObservationV1(input);
  if (JSON.stringify(expected) !== JSON.stringify(input.observation)) {
    throw new Error("thermometer_calibration_observation_replay_mismatch");
  }
}
