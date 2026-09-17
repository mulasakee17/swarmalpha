/**
 * Minimal V1.1 interaction qualification canary.
 *
 * Statistical-physics quantities live only in the offline projection. The
 * model sees natural-language observations, never diagnostic weights or an
 * alleged thermodynamic state.
 */
import type { VersionedGovernanceRef } from "../../../src/lib/governance";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  CONTROLLED_WRONG_STATE_TASK_BANK_V1,
  type ControlledWrongStateTaskV1,
} from "./controlledWrongStateTaskBankV1";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";

export const CONTROLLED_INTERACTION_CANARY_V1_1 = Object.freeze({
  id: "swarmalpha.experiment.v6.controlled-interaction-canary",
  version: "1.1.0",
});

export type InteractionArmV1_1 = "ISOLATED" | "PEER";
export type InteractionRoundV1_1 = 0 | 1 | 2;

export interface InteractionChoiceV1_1 {
  choiceId: string;
  rationale: string;
  extraFieldNames: string[];
}

export interface ControlledInteractionPlanV1_1 {
  planRef: typeof CONTROLLED_INTERACTION_CANARY_V1_1;
  scientificRole: "single_task_instrument_interaction_development";
  sourceProtocolFailureRef: "controlled_wrong_state_formation_v1_halted_56_of_160";
  taskId: "task:controlled:industrial-cooling:v1";
  taskHash: string;
  agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"];
  arms: ["ISOLATED", "PEER"];
  armOrder: ["ISOLATED", "PEER"];
  armOrderInterpretation: "development_only_no_causal_order_claim";
  rounds: [0, 1, 2];
  modelRef: VersionedGovernanceRef;
  invocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 1024;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  plannedProviderCalls: 20;
  maximumTotalCompletionTokens: 20480;
  truthAccess: "offline_analysis_only";
  contentHash: string;
}

export interface InteractionTerminalV1_1 {
  sequence: number;
  taskId: string;
  phase: "X0" | InteractionArmV1_1;
  round: InteractionRoundV1_1;
  agentId: string;
  request: SingleAttemptTextInvokeRequest;
  requestHash: string;
  promptHash: string;
  rawResponse: string;
  responseHash: string;
  parsed: InteractionChoiceV1_1;
  providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"];
  usage?: SingleAttemptTextInvokeResult["usage"];
}

export interface ControlledInteractionRunV1_1 {
  runRef: typeof CONTROLLED_INTERACTION_CANARY_V1_1;
  runId: string;
  planHash: string;
  terminals: InteractionTerminalV1_1[];
  providerCallCount: 20;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

interface ChoiceMacrostateV1_1 {
  histogram: Record<string, number>;
  concentration: number;
  pottsOrder: number;
  pairwiseDisagreement: number;
  wrongSupermajority75: boolean;
}

export interface ControlledInteractionAnalysisV1_1 {
  analysisRef: { id: "swarmalpha.analysis.v6.controlled-interaction-canary"; version: "1.1.0" };
  planHash: string;
  runHash: string;
  inferenceScope: "single_finite_system_instrument_diagnostic";
  states: {
    X0: ChoiceMacrostateV1_1;
    ISOLATED_R1: ChoiceMacrostateV1_1;
    ISOLATED_R2: ChoiceMacrostateV1_1;
    PEER_R1: ChoiceMacrostateV1_1;
    PEER_R2: ChoiceMacrostateV1_1;
  };
  switching: {
    isolatedR1: number;
    isolatedR2: number;
    peerR1: number;
    peerR2: number;
    isolatedTotal: number;
    peerTotal: number;
  };
  branchResponse: {
    hammingDivergenceR1: number;
    hammingDivergenceR2: number;
    pottsOrderDifferenceR1: number;
    pottsOrderDifferenceR2: number;
  };
  instrument: {
    parsedChoiceCount: 20;
    extraFieldResponseCount: number;
    completionCeilingHitCount: 0;
  };
  qualification: {
    x0Heterogeneous: boolean;
    peerHasExtraSwitching: boolean;
    branchesDiverge: boolean;
    decision: "INTERACTION_SIGNAL" | "NO_INTERACTION_SIGNAL";
  };
  contentHash: string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

function canaryTask(): ControlledWrongStateTaskV1 {
  const task = CONTROLLED_WRONG_STATE_TASK_BANK_V1.find(candidate =>
    candidate.taskId === "task:controlled:industrial-cooling:v1");
  if (!task) throw new Error("interaction_canary_task_missing");
  return task;
}

export function buildControlledInteractionPlanV1_1(input?: {
  modelRef?: VersionedGovernanceRef;
}): ControlledInteractionPlanV1_1 {
  const task = canaryTask();
  const body: Omit<ControlledInteractionPlanV1_1, "contentHash"> = {
    planRef: CONTROLLED_INTERACTION_CANARY_V1_1,
    scientificRole: "single_task_instrument_interaction_development",
    sourceProtocolFailureRef: "controlled_wrong_state_formation_v1_halted_56_of_160",
    taskId: "task:controlled:industrial-cooling:v1",
    taskHash: task.contentHash,
    agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"],
    arms: ["ISOLATED", "PEER"],
    armOrder: ["ISOLATED", "PEER"],
    armOrderInterpretation: "development_only_no_causal_order_claim",
    rounds: [0, 1, 2],
    modelRef: clone(input?.modelRef ?? { id: "zhipu:glm-4.6v", version: "1.0.0" }),
    invocation: {
      temperature: 0, seed: 1, maxTokens: 1024, thinking: "disabled",
      attemptsPerCell: 1, retry: "none",
    },
    plannedProviderCalls: 20,
    maximumTotalCompletionTokens: 20480,
    truthAccess: "offline_analysis_only",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyControlledInteractionPlanV1_1(plan: ControlledInteractionPlanV1_1): void {
  const expected = buildControlledInteractionPlanV1_1({ modelRef: plan.modelRef });
  if (JSON.stringify(plan) !== JSON.stringify(expected)
    || hashCollectiveDynamicsValueV1(withoutHash(plan)) !== plan.contentHash
    || plan.plannedProviderCalls !== 20
    || plan.maximumTotalCompletionTokens !== 20480) {
    throw new Error("interaction_canary_plan_invalid");
  }
}

function visibleEvidence(task: ControlledWrongStateTaskV1, agentId: string) {
  const select = (availability: "shared" | "private") => task.evidence
    .filter(item => item.availability === availability
      && (availability === "shared" || item.ownerAgentId === agentId))
    .map(item => ({
      evidenceId: item.evidenceId,
      sourceId: item.sourceId,
      lineageId: item.lineageId,
      statement: item.statement,
    }));
  return { shared: select("shared"), private: select("private") };
}

export function parseInteractionChoiceV1_1(
  raw: string,
  optionIds: readonly string[],
): InteractionChoiceV1_1 {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("interaction_canary_invalid_json");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("interaction_canary_object_required");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.choiceId !== "string" || !optionIds.includes(record.choiceId)) {
    throw new Error("interaction_canary_choice_invalid");
  }
  if (typeof record.rationale !== "string" || !record.rationale.trim()
    || record.rationale.length > 2000) {
    throw new Error("interaction_canary_rationale_invalid");
  }
  return {
    choiceId: record.choiceId,
    rationale: record.rationale,
    extraFieldNames: Object.keys(record)
      .filter(key => key !== "choiceId" && key !== "rationale").sort(),
  };
}

export function buildInteractionPromptV1_1(input: {
  plan: ControlledInteractionPlanV1_1;
  agentId: string;
  arm: InteractionArmV1_1;
  round: InteractionRoundV1_1;
  previousOwn?: InteractionChoiceV1_1;
  peerPrevious?: Readonly<Record<string, InteractionChoiceV1_1>>;
  additionalSharedObservations?: ReadonlyArray<{
    evidenceId: string;
    sourceId: string;
    lineageId: string;
    statement: string;
  }>;
}) {
  verifyControlledInteractionPlanV1_1(input.plan);
  const task = canaryTask();
  if (!input.plan.agentIds.includes(input.agentId as never)) {
    throw new Error("interaction_canary_agent_invalid");
  }
  if (input.round === 0 && (input.previousOwn || input.peerPrevious)) {
    throw new Error("interaction_canary_x0_context_invalid");
  }
  if (input.round > 0 && !input.previousOwn) {
    throw new Error("interaction_canary_previous_missing");
  }
  const peerIds = input.plan.agentIds.filter(agentId => agentId !== input.agentId);
  const suppliedPeerIds = Object.keys(input.peerPrevious ?? {}).sort();
  if (input.arm === "ISOLATED" && suppliedPeerIds.length) {
    throw new Error("interaction_canary_isolated_peer_leak");
  }
  if (input.arm === "PEER" && input.round > 0
    && JSON.stringify(suppliedPeerIds) !== JSON.stringify([...peerIds].sort())) {
    throw new Error("interaction_canary_peer_roster_invalid");
  }
  const evidence = visibleEvidence(task, input.agentId);
  const sharedObservations = [...evidence.shared, ...(input.additionalSharedObservations ?? [])];
  const options = task.options.map(option => ({ optionId: option.optionId, label: option.label }));
  const peerBlock = input.round === 0
    ? "(none: common pre-branch checkpoint X0)"
    : input.arm === "ISOLATED"
      ? "(none: isolated condition)"
      : peerIds.map(agentId => {
        const response = input.peerPrevious![agentId];
        return `[agent_id=${agentId}] choice=${response.choiceId}; report=${response.rationale}`;
      }).join("\n");
  const systemPrompt = [
    "You are one participant in a controlled group diagnosis.",
    "Use only supplied observations and reports; do not invent numerical scores.",
    "Peer reports may communicate second-hand observations. Evaluate their content and source, but do not assume the majority is correct.",
    "Return one JSON object with required fields choiceId and rationale. Keep rationale to at most two sentences and 80 words. Additional fields are discouraged.",
  ].join(" ");
  const userPrompt = [
    `TASK_PUBLIC_CONTEXT_JSON: ${JSON.stringify(task.publicContext.split("\n\n")[0])}`,
    `OPTIONS_JSON: ${JSON.stringify(options)}`,
    `SHARED_OBSERVATIONS_JSON: ${JSON.stringify(sharedObservations)}`,
    `YOUR_PRIVATE_OBSERVATIONS_JSON: ${JSON.stringify(evidence.private)}`,
    `ROUND: ${input.round}`,
    `ARM: ${input.round === 0 ? "X0" : input.arm}`,
    `YOUR_PREVIOUS_RESPONSE_JSON: ${input.previousOwn ? JSON.stringify({
      choiceId: input.previousOwn.choiceId, rationale: input.previousOwn.rationale,
    }) : "(none)"}`,
    `PEER_PREVIOUS_REPORTS:\n${peerBlock}`,
    `Return JSON now. choiceId must be one of ${options.map(option => option.optionId).join(" | ")}.`,
  ].join("\n\n");
  if (userPrompt.includes("scoreByOptionId") || userPrompt.includes("outcomeOptionId")
    || userPrompt.includes("withheld") || userPrompt.includes("resolver")) {
    throw new Error("interaction_canary_prompt_leak");
  }
  const prompt = { systemPrompt, userPrompt };
  return { ...prompt, promptHash: hashCollectiveDynamicsValueV1(prompt) };
}

function buildRequest(input: Parameters<typeof buildInteractionPromptV1_1>[0] & { runId: string }) {
  const prompt = buildInteractionPromptV1_1(input);
  const suffix = input.round === 0 ? "x0" : `${input.arm.toLowerCase()}:r${input.round}`;
  const request: SingleAttemptTextInvokeRequest = {
    requestId: `interaction-canary-v1.1:${input.runId}:${suffix}:${input.agentId}`,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    responseFormat: "json",
    modelRef: clone(input.plan.modelRef),
    invocationConfig: {
      temperature: input.plan.invocation.temperature,
      seed: input.plan.invocation.seed,
      maxTokens: input.plan.invocation.maxTokens,
      thinking: input.plan.invocation.thinking,
    },
  };
  return { request, promptHash: prompt.promptHash };
}

function mapResponses(
  terminals: readonly InteractionTerminalV1_1[],
  phase: "X0" | InteractionArmV1_1,
  round: InteractionRoundV1_1,
): Record<string, InteractionChoiceV1_1> {
  return Object.fromEntries(terminals.filter(terminal =>
    terminal.phase === phase && terminal.round === round)
    .map(terminal => [terminal.agentId, terminal.parsed]));
}

export async function executeControlledInteractionCanaryV1_1(input: {
  plan: ControlledInteractionPlanV1_1;
  runId: string;
  invoker: SingleAttemptTextInvoker;
}): Promise<ControlledInteractionRunV1_1> {
  verifyControlledInteractionPlanV1_1(input.plan);
  const task = canaryTask();
  const optionIds = task.options.map(option => option.optionId);
  const terminals: InteractionTerminalV1_1[] = [];
  let sequence = 0;
  const invoke = async (args: Parameters<typeof buildInteractionPromptV1_1>[0],
    phase: "X0" | InteractionArmV1_1) => {
    const built = buildRequest({ ...args, runId: input.runId });
    const result = await input.invoker.invoke(built.request, new AbortController().signal);
    if ((result.usage?.completionTokens ?? 0) >= input.plan.invocation.maxTokens) {
      throw new Error("interaction_canary_completion_ceiling_hit");
    }
    const parsed = parseInteractionChoiceV1_1(result.rawContent, optionIds);
    sequence += 1;
    terminals.push({
      sequence, taskId: task.taskId, phase, round: args.round, agentId: args.agentId,
      request: clone(built.request), requestHash: hashCollectiveDynamicsValueV1(built.request),
      promptHash: built.promptHash, rawResponse: result.rawContent,
      responseHash: hashCollectiveDynamicsValueV1(result.rawContent), parsed,
      ...(result.providerMetadata ? { providerMetadata: clone(result.providerMetadata) } : {}),
      ...(result.usage ? { usage: clone(result.usage) } : {}),
    });
  };
  for (const agentId of input.plan.agentIds) {
    await invoke({ plan: input.plan, agentId, arm: "ISOLATED", round: 0 }, "X0");
  }
  const x0 = mapResponses(terminals, "X0", 0);
  for (const arm of input.plan.armOrder) {
    let previous = x0;
    for (const round of [1, 2] as const) {
      for (const agentId of input.plan.agentIds) {
        const peers = arm === "PEER" ? Object.fromEntries(Object.entries(previous)
          .filter(([id]) => id !== agentId)) : undefined;
        await invoke({ plan: input.plan, agentId, arm, round,
          previousOwn: previous[agentId], peerPrevious: peers }, arm);
      }
      previous = mapResponses(terminals, arm, round);
    }
  }
  if (terminals.length !== 20) throw new Error("interaction_canary_terminal_count_invalid");
  const body: Omit<ControlledInteractionRunV1_1, "contentHash"> = {
    runRef: CONTROLLED_INTERACTION_CANARY_V1_1,
    runId: input.runId,
    planHash: input.plan.contentHash,
    terminals,
    providerCallCount: 20,
    attemptsPerCell: 1,
    retry: "none",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function choices(run: ControlledInteractionRunV1_1,
  phase: "X0" | InteractionArmV1_1, round: InteractionRoundV1_1): string[] {
  return run.terminals.filter(terminal => terminal.phase === phase && terminal.round === round)
    .map(terminal => terminal.parsed.choiceId);
}

function macrostate(input: { choiceIds: readonly string[]; outcomeOptionId: string }): ChoiceMacrostateV1_1 {
  const optionIds = canaryTask().options.map(option => option.optionId);
  const N = input.choiceIds.length;
  if (N !== 4) throw new Error("interaction_canary_analysis_roster_invalid");
  const histogram = Object.fromEntries(optionIds.map(optionId => [
    optionId, input.choiceIds.filter(choiceId => choiceId === optionId).length,
  ]));
  const concentration = Math.max(...Object.values(histogram)) / N;
  const q = optionIds.map(optionId => histogram[optionId] / N);
  const top = optionIds.find(optionId => histogram[optionId] === Math.max(...Object.values(histogram)))!;
  return {
    histogram,
    concentration,
    pottsOrder: (optionIds.length * concentration - 1) / (optionIds.length - 1),
    pairwiseDisagreement: N / (N - 1) * (1 - q.reduce((sum, value) => sum + value * value, 0)),
    wrongSupermajority75: concentration >= 0.75 && top !== input.outcomeOptionId,
  };
}

function switching(left: readonly string[], right: readonly string[]): number {
  return left.filter((choice, index) => choice !== right[index]).length;
}

export function analyzeControlledInteractionCanaryV1_1(input: {
  plan: ControlledInteractionPlanV1_1;
  run: ControlledInteractionRunV1_1;
}): ControlledInteractionAnalysisV1_1 {
  verifyControlledInteractionPlanV1_1(input.plan);
  if (input.run.planHash !== input.plan.contentHash || input.run.terminals.length !== 20
    || hashCollectiveDynamicsValueV1(withoutHash(input.run)) !== input.run.contentHash) {
    throw new Error("interaction_canary_run_invalid");
  }
  const task = canaryTask();
  const x0Choices = choices(input.run, "X0", 0);
  const iso1Choices = choices(input.run, "ISOLATED", 1);
  const iso2Choices = choices(input.run, "ISOLATED", 2);
  const peer1Choices = choices(input.run, "PEER", 1);
  const peer2Choices = choices(input.run, "PEER", 2);
  const outcome = task.resolver.outcomeOptionId;
  const states = {
    X0: macrostate({ choiceIds: x0Choices, outcomeOptionId: outcome }),
    ISOLATED_R1: macrostate({ choiceIds: iso1Choices, outcomeOptionId: outcome }),
    ISOLATED_R2: macrostate({ choiceIds: iso2Choices, outcomeOptionId: outcome }),
    PEER_R1: macrostate({ choiceIds: peer1Choices, outcomeOptionId: outcome }),
    PEER_R2: macrostate({ choiceIds: peer2Choices, outcomeOptionId: outcome }),
  };
  const switchCounts = {
    isolatedR1: switching(x0Choices, iso1Choices),
    isolatedR2: switching(iso1Choices, iso2Choices),
    peerR1: switching(x0Choices, peer1Choices),
    peerR2: switching(peer1Choices, peer2Choices),
  };
  const branchResponse = {
    hammingDivergenceR1: switching(iso1Choices, peer1Choices) / 4,
    hammingDivergenceR2: switching(iso2Choices, peer2Choices) / 4,
    pottsOrderDifferenceR1: states.PEER_R1.pottsOrder - states.ISOLATED_R1.pottsOrder,
    pottsOrderDifferenceR2: states.PEER_R2.pottsOrder - states.ISOLATED_R2.pottsOrder,
  };
  const isolatedTotal = switchCounts.isolatedR1 + switchCounts.isolatedR2;
  const peerTotal = switchCounts.peerR1 + switchCounts.peerR2;
  const qualification = {
    x0Heterogeneous: states.X0.concentration < 1,
    peerHasExtraSwitching: peerTotal > isolatedTotal,
    branchesDiverge: branchResponse.hammingDivergenceR1 > 0
      || branchResponse.hammingDivergenceR2 > 0,
  };
  const body: Omit<ControlledInteractionAnalysisV1_1, "contentHash"> = {
    analysisRef: { id: "swarmalpha.analysis.v6.controlled-interaction-canary", version: "1.1.0" },
    planHash: input.plan.contentHash,
    runHash: input.run.contentHash,
    inferenceScope: "single_finite_system_instrument_diagnostic",
    states,
    switching: { ...switchCounts, isolatedTotal, peerTotal },
    branchResponse,
    instrument: {
      parsedChoiceCount: 20,
      extraFieldResponseCount: input.run.terminals.filter(terminal =>
        terminal.parsed.extraFieldNames.length > 0).length,
      completionCeilingHitCount: 0,
    },
    qualification: {
      ...qualification,
      decision: Object.values(qualification).every(Boolean)
        ? "INTERACTION_SIGNAL" : "NO_INTERACTION_SIGNAL",
    },
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
