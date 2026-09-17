/**
 * Thin structured-choice adapter for the controlled wrong-state formation
 * canary.  This is deliberately a protocol boundary, not a second engine:
 * task projection, hashing and the single-attempt invoker remain reusable V6
 * primitives.  It contains no resolver access and makes no provider call by
 * itself.
 */
import type { VersionedGovernanceRef } from "../../../src/lib/governance";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  CONTROLLED_WRONG_STATE_TASK_BANK_V1,
  projectControlledWrongStateOnlineTaskV1,
  type ControlledWrongStateOnlineTaskV1,
  type ControlledWrongStateTaskV1,
} from "./controlledWrongStateTaskBankV1";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";

export const CONTROLLED_WRONG_STATE_FORMATION_PROTOCOL_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.controlled-wrong-state-formation",
  version: "1.0.0",
});

export const CONTROLLED_WRONG_STATE_FORMATION_PLAN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.controlled-wrong-state-formation.plan",
  version: "1.0.0",
});

export const CONTROLLED_WRONG_STATE_FORMATION_ARMS_V1 = ["ISOLATED", "PEER"] as const;
export type ControlledWrongStateFormationArmV1 =
  typeof CONTROLLED_WRONG_STATE_FORMATION_ARMS_V1[number];

export type ControlledWrongStateFormationRoundV1 = 0 | 1 | 2;

export interface ControlledChoiceResponseV1 {
  choiceId: string;
  rationale: string;
}

export interface ControlledWrongStateFormationPlanV1 {
  protocolRef: typeof CONTROLLED_WRONG_STATE_FORMATION_PROTOCOL_V1;
  planRef: typeof CONTROLLED_WRONG_STATE_FORMATION_PLAN_V1;
  taskBankHash: string;
  variantTaskIds: string[];
  clusterIds: string[];
  agentIds: [string, string, string, string];
  initialRound: 0;
  formationRounds: [1, 2];
  arms: [...typeof CONTROLLED_WRONG_STATE_FORMATION_ARMS_V1];
  armOrderPolicy: "within_cluster_base_mirror_counterbalanced_v1";
  armOrderByVariant: Array<{
    taskId: string;
    order: [ControlledWrongStateFormationArmV1, ControlledWrongStateFormationArmV1];
  }>;
  responseContract: "controlled_choice_json_v1";
  modelRef: VersionedGovernanceRef;
  invocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 512;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  interaction: "synchronous_previous_round_only";
  plannedProviderCalls: 160;
  truthAccess: "none";
  contentHash: string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

function requireSafeHash(value: string, field: string): void {
  if (!/^sha256:[0-9a-f]{64}$/.test(value)) throw new Error(`controlled_formation_${field}_invalid`);
}

function taskBankHash(): string {
  return hashCollectiveDynamicsValueV1(CONTROLLED_WRONG_STATE_TASK_BANK_V1);
}

export function buildControlledWrongStateFormationPlanV1(input?: {
  modelRef?: VersionedGovernanceRef;
}): ControlledWrongStateFormationPlanV1 {
  const tasks = CONTROLLED_WRONG_STATE_TASK_BANK_V1;
  const body: Omit<ControlledWrongStateFormationPlanV1, "contentHash"> = {
    protocolRef: CONTROLLED_WRONG_STATE_FORMATION_PROTOCOL_V1,
    planRef: CONTROLLED_WRONG_STATE_FORMATION_PLAN_V1,
    taskBankHash: taskBankHash(),
    variantTaskIds: tasks.map(task => task.taskId),
    clusterIds: [...new Set(tasks.map(task => task.clusterId))],
    agentIds: ["agent_1", "agent_2", "agent_3", "agent_4"],
    initialRound: 0,
    formationRounds: [1, 2],
    arms: [...CONTROLLED_WRONG_STATE_FORMATION_ARMS_V1],
    armOrderPolicy: "within_cluster_base_mirror_counterbalanced_v1",
    armOrderByVariant: tasks.map((task, index) => ({
      taskId: task.taskId,
      order: index % 2 === 0 ? ["ISOLATED", "PEER"] : ["PEER", "ISOLATED"],
    })),
    responseContract: "controlled_choice_json_v1",
    modelRef: clone(input?.modelRef ?? { id: "zhipu:glm-4.6v", version: "1.0.0" }),
    invocation: {
      temperature: 0,
      seed: 1,
      maxTokens: 512,
      thinking: "disabled",
      attemptsPerCell: 1,
      retry: "none",
    },
    interaction: "synchronous_previous_round_only",
    plannedProviderCalls: 160,
    truthAccess: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  const plan = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  return clone(plan);
}

export function verifyControlledWrongStateFormationPlanV1(
  plan: ControlledWrongStateFormationPlanV1,
): void {
  assertCollectiveDynamicsTruthBlindV1(plan);
  requireSafeHash(plan.taskBankHash, "task_bank_hash");
  if (hashCollectiveDynamicsValueV1(withoutHash(plan)) !== plan.contentHash) {
    throw new Error("controlled_formation_plan_hash_mismatch");
  }
  const expected = buildControlledWrongStateFormationPlanV1({ modelRef: plan.modelRef });
  if (JSON.stringify(plan) !== JSON.stringify(expected)
    || plan.variantTaskIds.length !== 8
    || plan.clusterIds.length !== 4
    || plan.plannedProviderCalls !== 160
    || plan.plannedProviderCalls !== plan.variantTaskIds.length * 20
    || JSON.stringify(plan.arms) !== JSON.stringify(CONTROLLED_WRONG_STATE_FORMATION_ARMS_V1)
    || plan.armOrderPolicy !== "within_cluster_base_mirror_counterbalanced_v1"
    || plan.armOrderByVariant.length !== 8
    || plan.armOrderByVariant.some((entry, index) => entry.taskId !== plan.variantTaskIds[index]
      || JSON.stringify(entry.order) !== JSON.stringify(index % 2 === 0
        ? ["ISOLATED", "PEER"] : ["PEER", "ISOLATED"]))
    || plan.interaction !== "synchronous_previous_round_only"
    || plan.truthAccess !== "none") {
    throw new Error("controlled_formation_plan_scope_invalid");
  }
}

function taskById(taskId: string): ControlledWrongStateTaskV1 {
  const task = CONTROLLED_WRONG_STATE_TASK_BANK_V1.find(candidate => candidate.taskId === taskId);
  if (!task) throw new Error("controlled_formation_task_not_registered");
  return task;
}

function onlineTask(task: ControlledWrongStateTaskV1): ControlledWrongStateOnlineTaskV1 {
  return projectControlledWrongStateOnlineTaskV1(task);
}

function strictChoiceInstruction(optionIds: readonly string[]): string {
  return [
    "Return exactly one JSON object with exactly these two fields:",
    '{"choiceId":"opt_1","rationale":"A short evidence-grounded explanation."}',
    `choiceId must be exactly one of: ${optionIds.join(" | ")}.`,
    "Do not output probabilities, confidence, hidden outcome information, markdown, or any other field.",
  ].join(" ");
}

function evidenceJson(value: unknown): string {
  return JSON.stringify(value);
}

export function buildControlledWrongStateChoicePromptV1(input: {
  task: ControlledWrongStateTaskV1;
  agentId: string;
  arm: ControlledWrongStateFormationArmV1;
  round: ControlledWrongStateFormationRoundV1;
  previousOwnResponse?: ControlledChoiceResponseV1;
  peerResponses?: Readonly<Record<string, ControlledChoiceResponseV1>>;
}): { systemPrompt: string; userPrompt: string; promptHash: string } {
  const projected = onlineTask(input.task);
  const agent = projected.agents.find(candidate => candidate.agentId === input.agentId);
  if (!agent) throw new Error("controlled_formation_agent_not_registered");
  if (input.round === 0 && (input.previousOwnResponse || input.peerResponses)) {
    throw new Error("controlled_formation_initial_context_invalid");
  }
  if (input.round > 0 && !input.previousOwnResponse) {
    throw new Error("controlled_formation_previous_response_missing");
  }
  const peerIds = projected.agents.map(candidate => candidate.agentId)
    .filter(agentId => agentId !== input.agentId);
  const providedPeerIds = Object.keys(input.peerResponses ?? {}).sort();
  if (input.arm === "ISOLATED" && providedPeerIds.length > 0) {
    throw new Error("controlled_formation_isolated_peer_leak");
  }
  if (input.arm === "PEER" && input.round > 0
    && JSON.stringify(providedPeerIds) !== JSON.stringify([...peerIds].sort())) {
    throw new Error("controlled_formation_peer_roster_invalid");
  }
  const peerBlock = input.round === 0
    ? "(none: no branch exposure at initial checkpoint X0)"
    : input.arm === "PEER"
    ? peerIds.map(agentId => `[agent_id=${agentId}] ${JSON.stringify(input.peerResponses![agentId])}`).join("\n")
    : "(none: isolated condition)";
  const previous = input.previousOwnResponse
    ? JSON.stringify(input.previousOwnResponse)
    : "(none: initial checkpoint X0)";
  const systemPrompt = [
    "You are one participant in a controlled multi-agent decision task.",
    "Use only the task context and evidence supplied in this request.",
    strictChoiceInstruction(projected.options.map(option => option.optionId)),
  ].join(" ");
  const userPrompt = [
    `TASK_ID: ${projected.taskId}`,
    `ROUND: ${input.round}`,
    `ARM: ${input.round === 0 ? "X0" : input.arm}`,
    `TASK_PUBLIC_CONTEXT_JSON: ${JSON.stringify(projected.publicContext)}`,
    `OPTIONS_JSON: ${evidenceJson(projected.options)}`,
    `SHARED_EVIDENCE_JSON: ${evidenceJson(projected.sharedEvidence)}`,
    `YOUR_PRIVATE_EVIDENCE_JSON: ${evidenceJson(agent.privateEvidence)}`,
    `YOUR_PREVIOUS_RESPONSE_JSON: ${previous}`,
    `PEER_PREVIOUS_RESPONSES_CANONICAL_ROSTER_ORDER:\n${peerBlock}`,
    strictChoiceInstruction(projected.options.map(option => option.optionId)),
  ].join("\n\n");
  const prompt = { systemPrompt, userPrompt };
  assertCollectiveDynamicsTruthBlindV1(prompt);
  return { ...prompt, promptHash: hashCollectiveDynamicsValueV1(prompt) };
}

export function parseControlledChoiceResponseV1(
  raw: string,
  optionIds: readonly string[],
): ControlledChoiceResponseV1 {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("controlled_choice_empty_response");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("controlled_choice_invalid_json");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("controlled_choice_object_required");
  }
  const record = value as Record<string, unknown>;
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(["choiceId", "rationale"])) {
    throw new Error("controlled_choice_fields_invalid");
  }
  if (typeof record.choiceId !== "string" || !optionIds.includes(record.choiceId)) {
    throw new Error("controlled_choice_id_invalid");
  }
  if (typeof record.rationale !== "string"
    || record.rationale.trim().length === 0
    || record.rationale.length > 4000) {
    throw new Error("controlled_choice_rationale_invalid");
  }
  return Object.freeze({ choiceId: record.choiceId, rationale: record.rationale });
}

export function buildControlledWrongStateChoiceRequestV1(input: {
  plan: ControlledWrongStateFormationPlanV1;
  runId: string;
  taskId: string;
  agentId: string;
  arm: ControlledWrongStateFormationArmV1;
  round: ControlledWrongStateFormationRoundV1;
  previousOwnResponse?: ControlledChoiceResponseV1;
  peerResponses?: Readonly<Record<string, ControlledChoiceResponseV1>>;
}): SingleAttemptTextInvokeRequest & { promptHash: string } {
  verifyControlledWrongStateFormationPlanV1(input.plan);
  if (!input.runId.trim()) throw new Error("controlled_formation_run_id_invalid");
  const task = taskById(input.taskId);
  const prompt = buildControlledWrongStateChoicePromptV1({
    task,
    agentId: input.agentId,
    arm: input.arm,
    round: input.round,
    previousOwnResponse: input.previousOwnResponse,
    peerResponses: input.peerResponses,
  });
  const suffix = input.round === 0
    ? "x0"
    : `${input.arm.toLowerCase()}:r${input.round}`;
  const request: SingleAttemptTextInvokeRequest = {
    requestId: `controlled-formation:${input.runId}:${input.taskId}:${suffix}:${input.agentId}`,
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
  assertCollectiveDynamicsTruthBlindV1(request);
  return { ...request, promptHash: prompt.promptHash };
}

export const CONTROLLED_WRONG_STATE_FORMATION_RUN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.controlled-wrong-state-formation.run",
  version: "1.0.0",
});

export type ControlledWrongStateFormationTerminalPhaseV1 =
  | "X0"
  | ControlledWrongStateFormationArmV1;

export interface ControlledWrongStateFormationTerminalV1 {
  sequence: number;
  cellId: string;
  taskId: string;
  phase: ControlledWrongStateFormationTerminalPhaseV1;
  round: ControlledWrongStateFormationRoundV1;
  agentId: string;
  request: SingleAttemptTextInvokeRequest;
  requestHash: string;
  promptHash: string;
  rawResponse: string;
  responseHash: string;
  parsed: ControlledChoiceResponseV1;
  providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"];
  usage?: SingleAttemptTextInvokeResult["usage"];
}

export interface ControlledWrongStateFormationRunV1 {
  runRef: typeof CONTROLLED_WRONG_STATE_FORMATION_RUN_V1;
  runId: string;
  planHash: string;
  terminals: ControlledWrongStateFormationTerminalV1[];
  registeredCellCount: 160;
  terminalCellCount: 160;
  providerCallCount: 160;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

function responseMap(
  terminals: readonly ControlledWrongStateFormationTerminalV1[],
  taskId: string,
  phase: ControlledWrongStateFormationTerminalPhaseV1,
  round: ControlledWrongStateFormationRoundV1,
): Record<string, ControlledChoiceResponseV1> {
  return Object.fromEntries(terminals
    .filter(terminal => terminal.taskId === taskId
      && terminal.phase === phase && terminal.round === round)
    .map(terminal => [terminal.agentId, terminal.parsed]));
}

function requestWithoutPromptHash(
  request: SingleAttemptTextInvokeRequest & { promptHash: string },
): SingleAttemptTextInvokeRequest {
  const { promptHash: _promptHash, ...payload } = request;
  return payload;
}

function terminalFromResponse(input: {
  sequence: number;
  taskId: string;
  phase: ControlledWrongStateFormationTerminalPhaseV1;
  round: ControlledWrongStateFormationRoundV1;
  agentId: string;
  request: SingleAttemptTextInvokeRequest & { promptHash: string };
  result: SingleAttemptTextInvokeResult;
  optionIds: readonly string[];
}): ControlledWrongStateFormationTerminalV1 {
  const requestPayload = requestWithoutPromptHash(input.request);
  const parsed = parseControlledChoiceResponseV1(input.result.rawContent, input.optionIds);
  return {
    sequence: input.sequence,
    cellId: requestPayload.requestId,
    taskId: input.taskId,
    phase: input.phase,
    round: input.round,
    agentId: input.agentId,
    request: clone(requestPayload),
    requestHash: hashCollectiveDynamicsValueV1(requestPayload),
    promptHash: input.request.promptHash,
    rawResponse: input.result.rawContent,
    responseHash: hashCollectiveDynamicsValueV1(input.result.rawContent),
    parsed,
    ...(input.result.providerMetadata
      ? { providerMetadata: clone(input.result.providerMetadata) } : {}),
    ...(input.result.usage ? { usage: clone(input.result.usage) } : {}),
  };
}

/**
 * Execute the frozen formation protocol through an injected invoker.  The
 * function is provider-neutral; tests use a deterministic invoker and no
 * credentials are read here.  A malformed/provider-failed cell throws and
 * produces no partial success artifact, which is fail-closed for this thin
 * canary adapter.
 */
export async function executeControlledWrongStateFormationV1(input: {
  plan: ControlledWrongStateFormationPlanV1;
  runId: string;
  invoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
}): Promise<ControlledWrongStateFormationRunV1> {
  verifyControlledWrongStateFormationPlanV1(input.plan);
  if (!input.runId.trim()) throw new Error("controlled_formation_run_id_invalid");
  const signal = input.signal ?? new AbortController().signal;
  const terminals: ControlledWrongStateFormationTerminalV1[] = [];
  let sequence = 0;
  for (const task of CONTROLLED_WRONG_STATE_TASK_BANK_V1) {
    const x0ByAgent: Record<string, ControlledChoiceResponseV1> = {};
    for (const agentId of input.plan.agentIds) {
      const request = buildControlledWrongStateChoiceRequestV1({
        plan: input.plan, runId: input.runId, taskId: task.taskId, agentId,
        arm: "ISOLATED", round: 0,
      });
      const result = await input.invoker.invoke(requestWithoutPromptHash(request), signal);
      sequence += 1;
      const terminal = terminalFromResponse({
        sequence, taskId: task.taskId, phase: "X0", round: 0, agentId,
        request, result,
        optionIds: task.options.map(option => option.optionId),
      });
      terminals.push(terminal);
      x0ByAgent[agentId] = terminal.parsed;
    }
    const armOrder = input.plan.armOrderByVariant
      .find(entry => entry.taskId === task.taskId)?.order;
    if (!armOrder) throw new Error("controlled_formation_arm_order_missing");
    for (const arm of armOrder) {
      let previousByAgent = x0ByAgent;
      for (const round of input.plan.formationRounds) {
        const nextByAgent: Record<string, ControlledChoiceResponseV1> = {};
        const peers = arm === "PEER" ? previousByAgent : undefined;
        for (const agentId of input.plan.agentIds) {
          const peerResponses = peers
            ? Object.fromEntries(Object.entries(peers).filter(([id]) => id !== agentId))
            : undefined;
          const request = buildControlledWrongStateChoiceRequestV1({
            plan: input.plan, runId: input.runId, taskId: task.taskId, agentId,
            arm, round, previousOwnResponse: previousByAgent[agentId], peerResponses,
          });
          const result = await input.invoker.invoke(requestWithoutPromptHash(request), signal);
          sequence += 1;
          const terminal = terminalFromResponse({
            sequence, taskId: task.taskId, phase: arm, round, agentId,
            request, result,
            optionIds: task.options.map(option => option.optionId),
          });
          terminals.push(terminal);
          nextByAgent[agentId] = terminal.parsed;
        }
        previousByAgent = nextByAgent;
      }
    }
  }
  if (terminals.length !== input.plan.plannedProviderCalls) {
    throw new Error("controlled_formation_terminal_count_invalid");
  }
  const body: Omit<ControlledWrongStateFormationRunV1, "contentHash"> = {
    runRef: CONTROLLED_WRONG_STATE_FORMATION_RUN_V1,
    runId: input.runId,
    planHash: input.plan.contentHash,
    terminals,
    registeredCellCount: 160,
    terminalCellCount: terminals.length,
    providerCallCount: terminals.length,
    attemptsPerCell: 1,
    retry: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  const artifact = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyControlledWrongStateFormationRunV1({ plan: input.plan, artifact });
  return clone(artifact);
}

export function verifyControlledWrongStateFormationRunV1(input: {
  plan: ControlledWrongStateFormationPlanV1;
  artifact: ControlledWrongStateFormationRunV1;
}): void {
  verifyControlledWrongStateFormationPlanV1(input.plan);
  const artifact = input.artifact;
  assertCollectiveDynamicsTruthBlindV1(artifact);
  if (artifact.runRef.id !== CONTROLLED_WRONG_STATE_FORMATION_RUN_V1.id
    || artifact.runRef.version !== CONTROLLED_WRONG_STATE_FORMATION_RUN_V1.version
    || artifact.planHash !== input.plan.contentHash
    || artifact.registeredCellCount !== 160
    || artifact.terminalCellCount !== 160
    || artifact.providerCallCount !== 160
    || artifact.attemptsPerCell !== 1 || artifact.retry !== "none"
    || artifact.terminals.length !== 160
    || new Set(artifact.terminals.map(terminal => terminal.cellId)).size !== 160
    || artifact.terminals.some((terminal, index) => terminal.sequence !== index + 1)) {
    throw new Error("controlled_formation_run_scope_invalid");
  }
  const taskByRegisteredId = new Map(CONTROLLED_WRONG_STATE_TASK_BANK_V1
    .map(task => [task.taskId, task]));
  for (const terminal of artifact.terminals) {
    const task = taskByRegisteredId.get(terminal.taskId);
    const previousPhase = terminal.round === 1 ? "X0" : terminal.phase;
    const previousRound = terminal.round === 1 ? 0 : 1;
    const previousResponses = terminal.round > 0
      ? responseMap(artifact.terminals, terminal.taskId, previousPhase, previousRound)
      : undefined;
    if (!task || !input.plan.variantTaskIds.includes(terminal.taskId)
      || !(input.plan.agentIds as readonly string[]).includes(terminal.agentId)
      || terminal.cellId !== terminal.request.requestId
      || terminal.requestHash !== hashCollectiveDynamicsValueV1(terminal.request)
      || terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)
      || terminal.promptHash !== buildControlledWrongStateChoiceRequestV1({
        plan: input.plan, runId: artifact.runId, taskId: terminal.taskId,
        agentId: terminal.agentId, arm: terminal.phase === "X0" ? "ISOLATED" : terminal.phase,
        round: terminal.round,
        previousOwnResponse: previousResponses?.[terminal.agentId],
        peerResponses: terminal.phase === "PEER" && terminal.round > 0
          ? Object.fromEntries(Object.entries(previousResponses ?? {})
            .filter(([agentId]) => agentId !== terminal.agentId))
          : undefined,
      }).promptHash
      || JSON.stringify(parseControlledChoiceResponseV1(
        terminal.rawResponse, task.options.map(option => option.optionId),
      )) !== JSON.stringify(terminal.parsed)) {
      throw new Error("controlled_formation_terminal_binding_invalid");
    }
  }
  for (const task of CONTROLLED_WRONG_STATE_TASK_BANK_V1) {
    for (const phase of ["X0", ...input.plan.arms] as const) {
      const expectedRounds = phase === "X0" ? [0] : [1, 2];
      for (const round of expectedRounds) {
        const cells = artifact.terminals.filter(terminal => terminal.taskId === task.taskId
          && terminal.phase === phase && terminal.round === round);
        if (cells.length !== 4 || new Set(cells.map(cell => cell.agentId)).size !== 4) {
          throw new Error("controlled_formation_round_scope_invalid");
        }
      }
    }
  }
  if (hashCollectiveDynamicsValueV1(withoutHash(artifact)) !== artifact.contentHash) {
    throw new Error("controlled_formation_run_hash_mismatch");
  }
}
