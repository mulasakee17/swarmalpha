/** Minimal four-call escape probe from the frozen V1.1 X0 wrong state. */
import type { VersionedGovernanceRef } from "../../../src/lib/governance";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  CONTROLLED_WRONG_STATE_TASK_BANK_V1,
  type ControlledWrongStateTaskV1,
} from "./controlledWrongStateTaskBankV1";
import {
  buildInteractionPromptV1_1,
  buildControlledInteractionPlanV1_1,
  parseInteractionChoiceV1_1,
  type ControlledInteractionRunV1_1,
  type InteractionChoiceV1_1,
} from "./controlledWrongStateInteractionCanaryV1_1";
import type { SingleAttemptTextInvokeRequest, SingleAttemptTextInvoker } from "./providerAdapters";

export const CONTROLLED_RECOVERY_CANARY_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.controlled-recovery-canary",
  version: "1.0.0",
});

type AgentId = "agent_1" | "agent_2" | "agent_3" | "agent_4";
const AGENTS: readonly AgentId[] = ["agent_1", "agent_2", "agent_3", "agent_4"];

export interface ControlledRecoveryPlanV1 {
  planRef: typeof CONTROLLED_RECOVERY_CANARY_V1;
  scientificRole: "single_task_escape_probe_development";
  taskId: "task:controlled:industrial-cooling:v1";
  taskHash: string;
  sourceRunHash: string;
  sourceX0ResponseHashes: Record<AgentId, string>;
  intervention: {
    kind: "NEW_INDEPENDENT_OBSERVATION";
    evidenceId: string;
    sourceId: string;
    lineageId: string;
    statement: string;
    offlineSourceEvidenceId: string;
  };
  modelRef: VersionedGovernanceRef;
  invocation: {
    temperature: 0;
    seed: 1;
    maxTokens: 1024;
    thinking: "disabled";
    attemptsPerCell: 1;
    retry: "none";
  };
  plannedProviderCalls: 4;
  maximumTotalCompletionTokens: 4096;
  truthAccess: "offline_analysis_only";
  contentHash: string;
}

export interface ControlledRecoveryTerminalV1 {
  sequence: number;
  agentId: AgentId;
  request: SingleAttemptTextInvokeRequest;
  requestHash: string;
  promptHash: string;
  rawResponse: string;
  responseHash: string;
  parsed: InteractionChoiceV1_1;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; latencyMs?: number };
}

export interface ControlledRecoveryRunV1 {
  runRef: typeof CONTROLLED_RECOVERY_CANARY_V1;
  runId: string;
  planHash: string;
  sourceRunHash: string;
  terminals: ControlledRecoveryTerminalV1[];
  providerCallCount: 4;
  contentHash: string;
}

export interface ControlledRecoveryAnalysisV1 {
  analysisRef: { id: "swarmalpha.analysis.v6.controlled-recovery-canary"; version: "1.0.0" };
  planHash: string;
  runHash: string;
  inferenceScope: "single_finite_system_escape_probe";
  x0ChoiceHistogram: Record<string, number>;
  responseChoiceHistogram: Record<string, number>;
  x0Concentration: number;
  responseConcentration: number;
  x0PottsOrder: number;
  responsePottsOrder: number;
  x0PairwiseDisagreement: number;
  responsePairwiseDisagreement: number;
  switchingCount: number;
  switchingRate: number;
  escapeCount: number;
  harmCount: number;
  decision: "ESCAPE_OBSERVED" | "NO_ESCAPE_OBSERVED";
  contentHash: string;
}

function task(): ControlledWrongStateTaskV1 {
  const found = CONTROLLED_WRONG_STATE_TASK_BANK_V1.find(item =>
    item.taskId === "task:controlled:industrial-cooling:v1");
  if (!found) throw new Error("recovery_canary_task_missing");
  return found;
}

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

function sourceX0(sourceRun: ControlledInteractionRunV1_1): Record<AgentId, {
  choiceId: string; rationale: string; responseHash: string;
}> {
  const x0 = sourceRun.terminals.filter(item => item.phase === "X0" && item.round === 0);
  if (x0.length !== 4 || new Set(x0.map(item => item.agentId)).size !== 4) {
    throw new Error("recovery_canary_x0_invalid");
  }
  return Object.fromEntries(x0.map(item => [item.agentId, {
    choiceId: item.parsed.choiceId, rationale: item.parsed.rationale, responseHash: item.responseHash,
  }])) as Record<AgentId, { choiceId: string; rationale: string; responseHash: string }>;
}

export function buildControlledRecoveryPlanV1(input: {
  sourceRun: ControlledInteractionRunV1_1;
  modelRef?: VersionedGovernanceRef;
}): ControlledRecoveryPlanV1 {
  if (hashCollectiveDynamicsValueV1(withoutHash(input.sourceRun)) !== input.sourceRun.contentHash) {
    throw new Error("recovery_canary_source_run_invalid");
  }
  const source = sourceX0(input.sourceRun);
  const withheld = task().evidence.find(item => item.availability === "withheld");
  if (!withheld) throw new Error("recovery_canary_observation_missing");
  const body: Omit<ControlledRecoveryPlanV1, "contentHash"> = {
    planRef: CONTROLLED_RECOVERY_CANARY_V1,
    scientificRole: "single_task_escape_probe_development",
    taskId: "task:controlled:industrial-cooling:v1",
    taskHash: task().contentHash,
    sourceRunHash: input.sourceRun.contentHash,
    sourceX0ResponseHashes: Object.fromEntries(AGENTS.map(agentId => [agentId, source[agentId].responseHash])) as Record<AgentId, string>,
    intervention: {
      kind: "NEW_INDEPENDENT_OBSERVATION",
      evidenceId: `${task().taskId}:evidence:independent-flow-meter-release`,
      sourceId: `${task().taskId}:source:independent-flow-meter-release`,
      lineageId: `${task().taskId}:lineage:independent-flow-meter-release`,
      statement: withheld.statement,
      offlineSourceEvidenceId: withheld.evidenceId,
    },
    modelRef: structuredClone(input.modelRef ?? { id: "zhipu:glm-4.6v", version: "1.0.0" }),
    invocation: { temperature: 0, seed: 1, maxTokens: 1024, thinking: "disabled", attemptsPerCell: 1, retry: "none" },
    plannedProviderCalls: 4,
    maximumTotalCompletionTokens: 4096,
    truthAccess: "offline_analysis_only",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyControlledRecoveryPlanV1(plan: ControlledRecoveryPlanV1): void {
  if (plan.plannedProviderCalls !== 4 || plan.maximumTotalCompletionTokens !== 4096
    || hashCollectiveDynamicsValueV1(withoutHash(plan)) !== plan.contentHash) {
    throw new Error("recovery_canary_plan_invalid");
  }
}

export async function executeControlledRecoveryCanaryV1(input: {
  plan: ControlledRecoveryPlanV1;
  sourceRun: ControlledInteractionRunV1_1;
  runId: string;
  invoker: SingleAttemptTextInvoker;
}): Promise<ControlledRecoveryRunV1> {
  verifyControlledRecoveryPlanV1(input.plan);
  if (input.plan.sourceRunHash !== input.sourceRun.contentHash
    || hashCollectiveDynamicsValueV1(withoutHash(input.sourceRun)) !== input.sourceRun.contentHash) {
    throw new Error("recovery_canary_source_binding_invalid");
  }
  const source = sourceX0(input.sourceRun);
  const optionIds = task().options.map(option => option.optionId);
  const terminals: ControlledRecoveryTerminalV1[] = [];
  const interactionPlan = buildControlledInteractionPlanV1_1({ modelRef: input.plan.modelRef });
  for (const [index, agentId] of AGENTS.entries()) {
    const built = buildInteractionPromptV1_1({
      plan: interactionPlan,
      agentId, arm: "ISOLATED", round: 1,
      previousOwn: { choiceId: source[agentId].choiceId, rationale: source[agentId].rationale, extraFieldNames: [] },
      additionalSharedObservations: [{
        evidenceId: input.plan.intervention.evidenceId,
        sourceId: input.plan.intervention.sourceId,
        lineageId: input.plan.intervention.lineageId,
        statement: input.plan.intervention.statement,
      }],
    });
    const request: SingleAttemptTextInvokeRequest = {
      requestId: `recovery-canary-v1:${input.runId}:new-observation:${agentId}`,
      systemPrompt: built.systemPrompt, userPrompt: built.userPrompt, responseFormat: "json",
      modelRef: structuredClone(input.plan.modelRef),
      invocationConfig: {
        temperature: input.plan.invocation.temperature,
        seed: input.plan.invocation.seed,
        maxTokens: input.plan.invocation.maxTokens,
        thinking: input.plan.invocation.thinking,
      },
    };
    const result = await input.invoker.invoke(request, new AbortController().signal);
    if ((result.usage?.completionTokens ?? 0) >= input.plan.invocation.maxTokens) {
      throw new Error("recovery_canary_completion_ceiling_hit");
    }
    const parsed = parseInteractionChoiceV1_1(result.rawContent, optionIds);
    terminals.push({ sequence: index + 1, agentId, request, requestHash: hashCollectiveDynamicsValueV1(request),
      promptHash: built.promptHash, rawResponse: result.rawContent,
      responseHash: hashCollectiveDynamicsValueV1(result.rawContent), parsed,
      ...(result.usage ? { usage: structuredClone(result.usage) } : {}) });
  }
  const body: Omit<ControlledRecoveryRunV1, "contentHash"> = {
    runRef: CONTROLLED_RECOVERY_CANARY_V1, runId: input.runId, planHash: input.plan.contentHash,
    sourceRunHash: input.sourceRun.contentHash, terminals, providerCallCount: 4,
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function summarize(choiceIds: readonly string[]) {
  const optionIds = task().options.map(option => option.optionId);
  const N = choiceIds.length;
  const histogram = Object.fromEntries(optionIds.map(optionId => [optionId,
    choiceIds.filter(choiceId => choiceId === optionId).length]));
  const concentration = Math.max(...Object.values(histogram)) / N;
  const q = optionIds.map(optionId => histogram[optionId] / N);
  return {
    histogram, concentration,
    pottsOrder: (optionIds.length * concentration - 1) / (optionIds.length - 1),
    pairwiseDisagreement: N / (N - 1) * (1 - q.reduce((sum, value) => sum + value * value, 0)),
  };
}

export function analyzeControlledRecoveryCanaryV1(input: {
  plan: ControlledRecoveryPlanV1;
  sourceRun: ControlledInteractionRunV1_1;
  run: ControlledRecoveryRunV1;
}): ControlledRecoveryAnalysisV1 {
  verifyControlledRecoveryPlanV1(input.plan);
  if (input.run.planHash !== input.plan.contentHash || input.run.sourceRunHash !== input.sourceRun.contentHash
    || input.run.terminals.length !== 4
    || hashCollectiveDynamicsValueV1(withoutHash(input.run)) !== input.run.contentHash) {
    throw new Error("recovery_canary_run_invalid");
  }
  const source = sourceX0(input.sourceRun);
  const x0 = AGENTS.map(agentId => source[agentId].choiceId);
  const response = input.run.terminals.sort((a, b) => a.sequence - b.sequence).map(item => item.parsed.choiceId);
  const x0Summary = summarize(x0); const responseSummary = summarize(response);
  const outcome = task().resolver.outcomeOptionId;
  const escapeCount = AGENTS.filter((agentId, index) => source[agentId].choiceId !== outcome
    && response[index] === outcome).length;
  const harmCount = AGENTS.filter((agentId, index) => source[agentId].choiceId === outcome
    && response[index] !== outcome).length;
  const body: Omit<ControlledRecoveryAnalysisV1, "contentHash"> = {
    analysisRef: { id: "swarmalpha.analysis.v6.controlled-recovery-canary", version: "1.0.0" },
    planHash: input.plan.contentHash, runHash: input.run.contentHash,
    inferenceScope: "single_finite_system_escape_probe",
    x0ChoiceHistogram: x0Summary.histogram, responseChoiceHistogram: responseSummary.histogram,
    x0Concentration: x0Summary.concentration, responseConcentration: responseSummary.concentration,
    x0PottsOrder: x0Summary.pottsOrder, responsePottsOrder: responseSummary.pottsOrder,
    x0PairwiseDisagreement: x0Summary.pairwiseDisagreement,
    responsePairwiseDisagreement: responseSummary.pairwiseDisagreement,
    switchingCount: x0.filter((choice, index) => choice !== response[index]).length,
    switchingRate: x0.filter((choice, index) => choice !== response[index]).length / AGENTS.length,
    escapeCount, harmCount, decision: escapeCount > 0 ? "ESCAPE_OBSERVED" : "NO_ESCAPE_OBSERVED",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
