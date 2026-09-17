/**
 * Thin L4 qualification adapter over an already frozen structured-choice run.
 *
 * Each sensor request is rendered from the exact public request view before
 * that public response existed. The public response is used only by the
 * offline analyzer. This module does not create a second discussion engine.
 */
import {
  buildCollectiveDynamicsSensorPromptPayloadV1,
  COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
  parseCollectiveDynamicsSensorReportV1_1,
  type ParsedSensorReportV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";
import { providerFailureCode, type V6ProviderFailureCode } from "./providerDiagnostics";
import {
  verifyCollectiveDynamicsTrajectoryPublicRunV1,
  type CollectiveDynamicsTrajectoryPublicRunV1,
} from "./runCollectiveDynamicsTrajectoryPublicV1";
import type { CollectiveDynamicsTrajectoryPilotPlanV1 } from
  "./collectiveDynamicsTrajectoryPilotV1";
import type { V6DiscussionRequestV1 } from "./productionVerticalSlice";

export const DISCUSSION_THERMOMETER_PREACTION_FREEZE_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-preaction-freeze",
  version: "1.0.0",
});

export const DISCUSSION_THERMOMETER_PREACTION_RUN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-preaction-run",
  version: "1.0.0",
});

export const DISCUSSION_THERMOMETER_PREACTION_ANALYSIS_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.discussion-thermometer-preaction-qualification",
  version: "1.0.0",
});

type PublicRound = 1 | 2 | 3;
type Checkpoint = 0 | 1 | 2;

export interface DiscussionThermometerPreActionCellV1 {
  cellId: string;
  sourcePublicCellId: string;
  sourceTaskId: number;
  publicRound: PublicRound;
  checkpointRound: Checkpoint;
  agentId: string;
  optionIds: string[];
  sourcePublicRequestHash: string;
  globalSequence: number;
  request: SingleAttemptTextInvokeRequest;
  promptHash: string;
  requestHash: string;
}

export interface DiscussionThermometerPreActionFreezeV1 {
  freezeRef: typeof DISCUSSION_THERMOMETER_PREACTION_FREEZE_V1;
  planHash: string;
  sourcePublicRunHash: string;
  cells: DiscussionThermometerPreActionCellV1[];
  registeredCellCount: number;
  orderingPolicy: "source_public_terminal_order";
  viewSemantics: "exact_pre_public_action_information_view";
  sensorTimingSemantics: "stateless_replay_of_pre_action_view";
  promptRef: typeof COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1;
  truthAccess: "none";
  contentHash: string;
}

type TerminalBase = {
  cellId: string;
  requestHash: string;
  promptHash: string;
  startedAt: string;
  terminalAt: string;
};

export type DiscussionThermometerPreActionTerminalV1 = TerminalBase & ({
  status: "valid";
  rawResponse: string;
  responseHash: string;
  parsed: ParsedSensorReportV1;
  usage?: SingleAttemptTextInvokeResult["usage"];
  providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"];
} | {
  status: "invalid_response";
  rawResponse: string;
  responseHash: string;
  parseFailureCode: string;
  usage?: SingleAttemptTextInvokeResult["usage"];
  providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"];
} | {
  status: V6ProviderFailureCode | "provider_error";
});

export interface DiscussionThermometerPreActionRunV1 {
  runRef: typeof DISCUSSION_THERMOMETER_PREACTION_RUN_V1;
  freezeHash: string;
  terminals: DiscussionThermometerPreActionTerminalV1[];
  registeredCellCount: number;
  terminalCellCount: number;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function promptFromPublicRequest(request: V6DiscussionRequestV1) {
  if (request.claim.resolutionPolicy.kind !== "categorical" || !("options" in request.claim)) {
    throw new Error("preaction_sensor_requires_categorical_claim");
  }
  const ownPrior = request.visibleTranscript
    .filter(message => message.agentId === request.agentId)
    .sort((left, right) => right.round - left.round)[0] ?? null;
  const peers = request.visibleTranscript.filter(message => message.agentId !== request.agentId);
  return buildCollectiveDynamicsSensorPromptPayloadV1({
    payload: {
      contentHash: hashCollectiveDynamicsValueV1(request),
      publicContext: request.publicContext,
      ownPrivateInformation: request.ownPrivateInformation,
      roleConstraints: null,
      ownPublicMessage: ownPrior ? {
        round: ownPrior.round,
        agentId: ownPrior.agentId,
        content: ownPrior.content,
      } : null,
      peerPublicMessages: peers.map(message => ({
        round: message.round,
        agentId: message.agentId,
        content: message.content,
      })),
      claim: {
        claimId: request.claim.id,
        proposition: request.claim.proposition,
        outcomeSpace: "finite_mutually_exclusive_exhaustive",
        reportSemantics: "probability_of_single_outcome",
        options: request.claim.options.map((canonicalLabel, index) => ({
          optionId: `opt_${index + 1}`,
          canonicalLabel,
        })),
      },
    },
    variant: "BASELINE_A",
  });
}

export function buildDiscussionThermometerPreActionFreezeV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  publicRun: CollectiveDynamicsTrajectoryPublicRunV1;
}): DiscussionThermometerPreActionFreezeV1 {
  verifyCollectiveDynamicsTrajectoryPublicRunV1({ plan: input.plan, artifact: input.publicRun });
  const cells = input.publicRun.terminals.map((terminal, index) => {
    if (terminal.status !== "valid" || !terminal.parsedPublicTurn) {
      throw new Error("preaction_source_public_terminal_invalid");
    }
    const prompt = promptFromPublicRequest(terminal.request);
    const cellId = `preaction-sensor:${terminal.cellId}`;
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
    const optionIds = terminal.request.claim.resolutionPolicy.kind === "categorical"
      && "options" in terminal.request.claim
      ? terminal.request.claim.options.map((_, optionIndex) => `opt_${optionIndex + 1}`)
      : [];
    if (!optionIds.length) throw new Error("preaction_option_ids_missing");
    if (request.userPrompt.includes(terminal.rawResponse)) {
      throw new Error("preaction_current_public_response_leaked_into_sensor_prompt");
    }
    assertCollectiveDynamicsTruthBlindV1(request);
    return {
      cellId,
      sourcePublicCellId: terminal.cellId,
      sourceTaskId: terminal.sourceTaskId,
      publicRound: terminal.round,
      checkpointRound: (terminal.round - 1) as Checkpoint,
      agentId: terminal.agentId,
      optionIds,
      sourcePublicRequestHash: terminal.requestHash,
      globalSequence: index + 1,
      request,
      promptHash: hashCollectiveDynamicsValueV1({
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        responseFormat: "json",
      }),
      requestHash: hashCollectiveDynamicsValueV1(request),
    };
  });
  const body: Omit<DiscussionThermometerPreActionFreezeV1, "contentHash"> = {
    freezeRef: DISCUSSION_THERMOMETER_PREACTION_FREEZE_V1,
    planHash: input.plan.contentHash,
    sourcePublicRunHash: input.publicRun.contentHash,
    cells,
    registeredCellCount: cells.length,
    orderingPolicy: "source_public_terminal_order",
    viewSemantics: "exact_pre_public_action_information_view",
    sensorTimingSemantics: "stateless_replay_of_pre_action_view",
    promptRef: COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerPreActionFreezeV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  publicRun: CollectiveDynamicsTrajectoryPublicRunV1;
  freeze: DiscussionThermometerPreActionFreezeV1;
}): void {
  const expected = buildDiscussionThermometerPreActionFreezeV1(input);
  if (JSON.stringify(expected) !== JSON.stringify(input.freeze)) {
    throw new Error("preaction_freeze_drift");
  }
}

function canonicalClock(clock?: () => string): () => string {
  if (clock) return clock;
  let prior = Number.NEGATIVE_INFINITY;
  return () => {
    const next = Math.max(Date.now(), prior + 1);
    prior = next;
    return new Date(next).toISOString();
  };
}

function parseFailure(error: unknown): string {
  return error instanceof Error && /^sensor_canary_[a-z0-9_]+$/.test(error.message)
    ? error.message : "sensor_canary_parse_unknown";
}

export async function executeDiscussionThermometerPreActionV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  publicRun: CollectiveDynamicsTrajectoryPublicRunV1;
  freeze: DiscussionThermometerPreActionFreezeV1;
  invoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
  clock?: () => string;
}): Promise<DiscussionThermometerPreActionRunV1> {
  verifyDiscussionThermometerPreActionFreezeV1(input);
  const clock = canonicalClock(input.clock);
  const signal = input.signal ?? new AbortController().signal;
  const terminals: DiscussionThermometerPreActionTerminalV1[] = [];
  for (const cell of input.freeze.cells) {
    const startedAt = clock();
    let result: SingleAttemptTextInvokeResult | undefined;
    let invocationError: unknown;
    try {
      result = await input.invoker.invoke(clone(cell.request), signal);
    } catch (error) {
      invocationError = error;
    }
    const terminalAt = clock();
    const base: TerminalBase = {
      cellId: cell.cellId,
      requestHash: cell.requestHash,
      promptHash: cell.promptHash,
      startedAt,
      terminalAt,
    };
    if (!result) {
      terminals.push({ ...base, status: providerFailureCode(invocationError) });
      continue;
    }
    const rawResponse = String(result.rawContent);
    try {
      terminals.push({
        ...base,
        status: "valid",
        rawResponse,
        responseHash: hashCollectiveDynamicsValueV1(rawResponse),
        parsed: parseCollectiveDynamicsSensorReportV1_1(rawResponse, cell.optionIds),
        ...(result.usage ? { usage: clone(result.usage) } : {}),
        ...(result.providerMetadata ? { providerMetadata: clone(result.providerMetadata) } : {}),
      });
    } catch (error) {
      terminals.push({
        ...base,
        status: "invalid_response",
        rawResponse,
        responseHash: hashCollectiveDynamicsValueV1(rawResponse),
        parseFailureCode: parseFailure(error),
        ...(result.usage ? { usage: clone(result.usage) } : {}),
        ...(result.providerMetadata ? { providerMetadata: clone(result.providerMetadata) } : {}),
      });
    }
  }
  const body: Omit<DiscussionThermometerPreActionRunV1, "contentHash"> = {
    runRef: DISCUSSION_THERMOMETER_PREACTION_RUN_V1,
    freezeHash: input.freeze.contentHash,
    terminals,
    registeredCellCount: input.freeze.registeredCellCount,
    terminalCellCount: terminals.length,
    attemptsPerCell: 1,
    retry: "none",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerPreActionRunV1(input: {
  freeze: DiscussionThermometerPreActionFreezeV1;
  run: DiscussionThermometerPreActionRunV1;
}): void {
  const { freeze, run } = input;
  if (run.runRef.id !== DISCUSSION_THERMOMETER_PREACTION_RUN_V1.id
    || run.runRef.version !== DISCUSSION_THERMOMETER_PREACTION_RUN_V1.version
    || run.freezeHash !== freeze.contentHash
    || run.registeredCellCount !== freeze.registeredCellCount
    || run.terminalCellCount !== freeze.registeredCellCount
    || run.terminals.length !== freeze.registeredCellCount
    || run.attemptsPerCell !== 1 || run.retry !== "none") {
    throw new Error("preaction_run_scope_invalid");
  }
  run.terminals.forEach((terminal, index) => {
    const cell = freeze.cells[index];
    if (terminal.cellId !== cell.cellId || terminal.requestHash !== cell.requestHash
      || terminal.promptHash !== cell.promptHash
      || Date.parse(terminal.terminalAt) <= Date.parse(terminal.startedAt)) {
      throw new Error("preaction_run_terminal_binding_invalid");
    }
    if (terminal.status === "valid") {
      if (terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)
        || JSON.stringify(terminal.parsed) !== JSON.stringify(
          parseCollectiveDynamicsSensorReportV1_1(terminal.rawResponse, cell.optionIds))) {
        throw new Error("preaction_run_valid_parse_replay_invalid");
      }
    }
  });
  const { contentHash, ...body } = run;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("preaction_run_hash_invalid");
  }
}

function uniqueTop(probabilities: Readonly<Record<string, number>>): string | null {
  const maximum = Math.max(...Object.values(probabilities));
  const tops = Object.entries(probabilities).filter(([, value]) =>
    Math.abs(value - maximum) <= 1e-12).map(([optionId]) => optionId);
  return tops.length === 1 ? tops[0] : null;
}

function exactPairedSignPValue(leftOnly: number, rightOnly: number): number {
  const discordant = leftOnly + rightOnly;
  if (discordant === 0) return 1;
  const tail = Math.min(leftOnly, rightOnly);
  const choose = (n: number, k: number): number => {
    let value = 1;
    for (let index = 1; index <= k; index += 1) value = value * (n - index + 1) / index;
    return value;
  };
  const lowerTail = Array.from({ length: tail + 1 }, (_, index) =>
    choose(discordant, index)).reduce((sum, value) => sum + value, 0) / 2 ** discordant;
  return Math.min(1, 2 * lowerTail);
}

export function preflightDiscussionThermometerPreActionV1(input: {
  freeze: DiscussionThermometerPreActionFreezeV1;
  publicRun: CollectiveDynamicsTrajectoryPublicRunV1;
}) {
  if (input.freeze.sourcePublicRunHash !== input.publicRun.contentHash) {
    throw new Error("preaction_preflight_public_run_binding_invalid");
  }
  const previousChoice = new Map<string, string>();
  let observedSwitchCount = 0;
  input.publicRun.terminals.forEach(terminal => {
    if (terminal.status !== "valid" || !terminal.parsedPublicTurn) {
      throw new Error("preaction_preflight_public_terminal_invalid");
    }
    const key = `${terminal.sourceTaskId}:${terminal.agentId}`;
    const prior = previousChoice.get(key);
    if (prior !== undefined && prior !== terminal.parsedPublicTurn.choiceId) {
      observedSwitchCount += 1;
    }
    previousChoice.set(key, terminal.parsedPublicTurn.choiceId);
  });
  const bestCaseExactTwoSidedPairedSignPValue = exactPairedSignPValue(
    observedSwitchCount, 0,
  );
  const body = {
    preflightRef: {
      id: "swarmalpha.preflight.v6.discussion-thermometer-preaction-qualification",
      version: "1.0.0",
    },
    freezeHash: input.freeze.contentHash,
    sourcePublicRunHash: input.publicRun.contentHash,
    providerCallsExecuted: 0,
    registeredSensorCallCount: input.freeze.registeredCellCount,
    futurePublicChoiceComparisonCount: input.freeze.cells.filter(cell =>
      cell.publicRound > 1).length,
    observedSwitchCount,
    bestCaseAssumption: "sensor_correct_on_every_switch_and_never_worse_than_persistence",
    bestCaseExactTwoSidedPairedSignPValue,
    alpha: 0.05,
    providerExecutionDecision: bestCaseExactTwoSidedPairedSignPValue <= 0.05
      ? "eligible_for_development_execution" as const
      : "no_go_insufficient_frozen_switch_information" as const,
    implication: "sensor_execution_cannot_pass_the_frozen_incremental_pairwise_gate_on_this_public_run",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function analyzeDiscussionThermometerPreActionV1(input: {
  freeze: DiscussionThermometerPreActionFreezeV1;
  run: DiscussionThermometerPreActionRunV1;
  publicRun: CollectiveDynamicsTrajectoryPublicRunV1;
}) {
  verifyDiscussionThermometerPreActionRunV1(input);
  if (input.freeze.sourcePublicRunHash !== input.publicRun.contentHash) {
    throw new Error("preaction_analysis_public_run_binding_invalid");
  }
  const publicById = new Map(input.publicRun.terminals.map(terminal => [terminal.cellId, terminal]));
  const previousChoice = new Map<string, string>(input.publicRun.terminals.flatMap(terminal =>
    terminal.status === "valid" && terminal.parsedPublicTurn
      ? [[`${terminal.sourceTaskId}:${terminal.agentId}:R${terminal.round}`, terminal.parsedPublicTurn.choiceId] as const]
      : []));
  const rows = input.freeze.cells.map((cell, index) => {
    const sensor = input.run.terminals[index];
    const observed = publicById.get(cell.sourcePublicCellId);
    if (!observed || observed.status !== "valid" || !observed.parsedPublicTurn) {
      throw new Error("preaction_analysis_public_terminal_missing");
    }
    const sensorTop = sensor.status === "valid" ? uniqueTop(sensor.parsed.probabilities) : null;
    const prior = cell.publicRound > 1
      ? previousChoice.get(`${cell.sourceTaskId}:${cell.agentId}:R${cell.publicRound - 1}`) ?? null
      : null;
    return {
      sourceTaskId: cell.sourceTaskId,
      agentId: cell.agentId,
      checkpointRound: cell.checkpointRound,
      publicRound: cell.publicRound,
      sensorStatus: sensor.status,
      sensorUniqueTop: sensorTop,
      observedPublicChoice: observed.parsedPublicTurn.choiceId,
      previousPublicChoice: prior,
      sensorCorrect: sensorTop === null ? null : sensorTop === observed.parsedPublicTurn.choiceId,
      persistenceCorrect: prior === null ? null : prior === observed.parsedPublicTurn.choiceId,
      sourceViewExcludedCurrentPublicResponse: !cell.request.userPrompt.includes(observed.rawResponse),
    };
  });
  const futureRows = rows.filter(row => row.previousPublicChoice !== null && row.sensorCorrect !== null);
  const sensorCorrect = futureRows.filter(row => row.sensorCorrect === true).length;
  const persistenceCorrect = futureRows.filter(row => row.persistenceCorrect === true).length;
  const sensorOnly = futureRows.filter(row => row.sensorCorrect === true && row.persistenceCorrect === false).length;
  const persistenceOnly = futureRows.filter(row => row.sensorCorrect === false && row.persistenceCorrect === true).length;
  const switchCount = futureRows.filter(row => row.persistenceCorrect === false).length;
  const exactTwoSidedPairedSignPValue = exactPairedSignPValue(sensorOnly, persistenceOnly);
  const body = {
    analysisRef: DISCUSSION_THERMOMETER_PREACTION_ANALYSIS_V1,
    inferenceStatus: "development_cross_channel_qualification_only" as const,
    truthAccess: "none" as const,
    freezeHash: input.freeze.contentHash,
    runHash: input.run.contentHash,
    sourcePublicRunHash: input.publicRun.contentHash,
    rows,
    summary: {
      registeredCellCount: input.freeze.registeredCellCount,
      validSensorCount: input.run.terminals.filter(terminal => terminal.status === "valid").length,
      currentPublicResponseLeakageCount: rows.filter(row =>
        !row.sourceViewExcludedCurrentPublicResponse).length,
      futureEligibleUniqueTopCount: futureRows.length,
      observedSwitchCount: switchCount,
      sensorCorrectCount: sensorCorrect,
      persistenceCorrectCount: persistenceCorrect,
      sensorOnlyCorrectCount: sensorOnly,
      persistenceOnlyCorrectCount: persistenceOnly,
      discordantPairCount: sensorOnly + persistenceOnly,
      exactTwoSidedPairedSignPValue,
      candidateMinusPersistenceAccuracy: futureRows.length
        ? (sensorCorrect - persistenceCorrect) / futureRows.length : null,
      qualification: sensorOnly > persistenceOnly
        ? exactTwoSidedPairedSignPValue <= 0.05
          ? "incremental_signal_observed" as const
          : "underpowered_positive_difference" as const
        : "no_incremental_signal_observed" as const,
    },
    interpretationBoundary: [
      "The sensor is statelessly replayed after the public run but receives only the exact pre-action information view.",
      "No ground truth, current public response, or later discussion is present in a sensor request.",
      "Incremental qualification uses an exact two-sided paired sign test over sensor-only versus persistence-only correct rows.",
    ],
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
