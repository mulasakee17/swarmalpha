/** File-backed, owner-gated runner for the 20-call V1.1 interaction canary. */
import dotenv from "dotenv";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  analyzeControlledInteractionCanaryV1_1,
  buildControlledInteractionPlanV1_1,
  executeControlledInteractionCanaryV1_1,
  verifyControlledInteractionPlanV1_1,
  type ControlledInteractionAnalysisV1_1,
  type ControlledInteractionPlanV1_1,
  type ControlledInteractionRunV1_1,
} from "./controlledWrongStateInteractionCanaryV1_1";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";
import { providerFailureCode } from "./providerDiagnostics";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

export const CONTROLLED_INTERACTION_CANARY_OUTPUT_V1_1 =
  "results/v6_controlled_interaction_canary_v1_1_glm46v_seed1";

const PLAN_FILE = "plan.json";
const MANIFEST_FILE = "manifest.json";
const ATTEMPTS_FILE = "attempts.jsonl";
const RUN_FILE = "run.json";
const ANALYSIS_FILE = "analysis.json";
const FAILURE_FILE = "execution-failure.json";

interface ControlledInteractionManifestV1_1 {
  manifestRef: {
    id: "swarmalpha.manifest.v6.controlled-interaction-canary";
    version: "1.1.0";
  };
  planHash: string;
  scientificRole: "single_task_instrument_interaction_development";
  authorizationBasis: "explicit_user_authorization_2026-08-29";
  taskSemanticReview: "not_completed";
  executionBudget: {
    maximumProviderAttempts: 20;
    maximumTotalCompletionTokens: 20480;
    retries: "none";
  };
  onlineTruthAccess: "forbidden";
  priceStatus: "not_independently_verified_no_currency_claim";
  finiteStatisticalPhysicsProjection: {
    microstate: "four_agent_categorical_choice_vector";
    pottsOrder: "m=(K*max_k(n_k/N)-1)/(K-1), K=3, N=4";
    pairwiseDisagreement: "D=N/(N-1)*(1-sum_k(n_k/N)^2)";
    switchingActivity: "count_of_agent_choice_changes_between_adjacent_rounds";
    branchDivergence: "normalized_hamming_distance_between_matched_branch_microstates";
    prohibitedClaims: ["phase_transition", "susceptibility", "attractor", "thermodynamic_limit"];
  };
  interpretationLimits: [
    "single_task_development_diagnostic",
    "fixed_isolated_then_peer_order_has_no_causal_order_interpretation",
    "interaction_signal_is_not_decision_quality_improvement",
    "wrong_supermajority_uses_truth_only_offline",
  ];
  contentHash: string;
}

type AttemptEventV1_1 = {
  type: "started";
  sequence: number;
  timestamp: string;
  requestId: string;
  requestHash: string;
  request: SingleAttemptTextInvokeRequest;
} | {
  type: "terminal";
  sequence: number;
  timestamp: string;
  requestId: string;
  requestHash: string;
  status: "response";
  rawResponse: string;
  responseHash: string;
  providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"];
  usage?: SingleAttemptTextInvokeResult["usage"];
} | {
  type: "terminal";
  sequence: number;
  timestamp: string;
  requestId: string;
  requestHash: string;
  status: ReturnType<typeof providerFailureCode>;
};

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

function exactJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeExactOrVerify(file: string, value: unknown): void {
  const text = exactJson(value);
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) {
      throw new Error(`interaction_canary_no_overwrite_conflict:${file}`);
    }
    return;
  }
  writeFileSync(file, text, { flag: "wx" });
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function buildManifest(plan: ControlledInteractionPlanV1_1): ControlledInteractionManifestV1_1 {
  const body: Omit<ControlledInteractionManifestV1_1, "contentHash"> = {
    manifestRef: {
      id: "swarmalpha.manifest.v6.controlled-interaction-canary",
      version: "1.1.0",
    },
    planHash: plan.contentHash,
    scientificRole: "single_task_instrument_interaction_development",
    authorizationBasis: "explicit_user_authorization_2026-08-29",
    taskSemanticReview: "not_completed",
    executionBudget: {
      maximumProviderAttempts: 20,
      maximumTotalCompletionTokens: 20480,
      retries: "none",
    },
    onlineTruthAccess: "forbidden",
    priceStatus: "not_independently_verified_no_currency_claim",
    finiteStatisticalPhysicsProjection: {
      microstate: "four_agent_categorical_choice_vector",
      pottsOrder: "m=(K*max_k(n_k/N)-1)/(K-1), K=3, N=4",
      pairwiseDisagreement: "D=N/(N-1)*(1-sum_k(n_k/N)^2)",
      switchingActivity: "count_of_agent_choice_changes_between_adjacent_rounds",
      branchDivergence: "normalized_hamming_distance_between_matched_branch_microstates",
      prohibitedClaims: ["phase_transition", "susceptibility", "attractor", "thermodynamic_limit"],
    },
    interpretationLimits: [
      "single_task_development_diagnostic",
      "fixed_isolated_then_peer_order_has_no_causal_order_interpretation",
      "interaction_signal_is_not_decision_quality_improvement",
      "wrong_supermajority_uses_truth_only_offline",
    ],
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function verifyManifest(input: {
  plan: ControlledInteractionPlanV1_1;
  manifest: ControlledInteractionManifestV1_1;
}): void {
  const expected = buildManifest(input.plan);
  if (JSON.stringify(input.manifest) !== JSON.stringify(expected)
    || hashCollectiveDynamicsValueV1(withoutHash(input.manifest)) !== input.manifest.contentHash) {
    throw new Error("interaction_canary_manifest_invalid");
  }
}

export function freezeControlledInteractionCanaryV1_1(outputDirectoryInput?: string) {
  const outputDirectory = resolve(outputDirectoryInput ?? CONTROLLED_INTERACTION_CANARY_OUTPUT_V1_1);
  const plan = buildControlledInteractionPlanV1_1();
  const manifest = buildManifest(plan);
  writeExactOrVerify(join(outputDirectory, PLAN_FILE), plan);
  writeExactOrVerify(join(outputDirectory, MANIFEST_FILE), manifest);
  return { outputDirectory, plan, manifest };
}

function loadFrozen(outputDirectoryInput?: string) {
  const outputDirectory = resolve(outputDirectoryInput ?? CONTROLLED_INTERACTION_CANARY_OUTPUT_V1_1);
  const plan = readJson<ControlledInteractionPlanV1_1>(join(outputDirectory, PLAN_FILE));
  const manifest = readJson<ControlledInteractionManifestV1_1>(join(outputDirectory, MANIFEST_FILE));
  verifyControlledInteractionPlanV1_1(plan);
  verifyManifest({ plan, manifest });
  return { outputDirectory, plan, manifest };
}

export function preflightControlledInteractionCanaryV1_1(outputDirectoryInput?: string) {
  const frozen = loadFrozen(outputDirectoryInput);
  const executionFiles = [ATTEMPTS_FILE, RUN_FILE, ANALYSIS_FILE, FAILURE_FILE];
  return {
    outputDirectory: frozen.outputDirectory,
    planHash: frozen.plan.contentHash,
    manifestHash: frozen.manifest.contentHash,
    scientificRole: frozen.manifest.scientificRole,
    plannedProviderCalls: frozen.plan.plannedProviderCalls,
    maximumTotalCompletionTokens: frozen.manifest.executionBudget.maximumTotalCompletionTokens,
    taskSemanticReview: frozen.manifest.taskSemanticReview,
    outputFresh: executionFiles.every(file => !existsSync(join(frozen.outputDirectory, file))),
  };
}

function appendEvent(file: string, event: AttemptEventV1_1): void {
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

function loggedInvoker(input: {
  inner: SingleAttemptTextInvoker;
  attemptsFile: string;
  maximumAttempts: number;
}): SingleAttemptTextInvoker {
  let sequence = 0;
  return {
    async invoke(request, signal) {
      sequence += 1;
      if (sequence > input.maximumAttempts) {
        throw new Error("interaction_canary_provider_attempt_budget_exceeded");
      }
      const requestHash = hashCollectiveDynamicsValueV1(request);
      appendEvent(input.attemptsFile, {
        type: "started", sequence, timestamp: new Date().toISOString(),
        requestId: request.requestId, requestHash, request: structuredClone(request),
      });
      try {
        const result = await input.inner.invoke(request, signal);
        appendEvent(input.attemptsFile, {
          type: "terminal", sequence, timestamp: new Date().toISOString(),
          requestId: request.requestId, requestHash, status: "response",
          rawResponse: result.rawContent,
          responseHash: hashCollectiveDynamicsValueV1(result.rawContent),
          ...(result.providerMetadata ? { providerMetadata: structuredClone(result.providerMetadata) } : {}),
          ...(result.usage ? { usage: structuredClone(result.usage) } : {}),
        });
        return result;
      } catch (error) {
        appendEvent(input.attemptsFile, {
          type: "terminal", sequence, timestamp: new Date().toISOString(),
          requestId: request.requestId, requestHash, status: providerFailureCode(error),
        });
        throw error;
      }
    },
  };
}

function auditAttempts(file: string, run: ControlledInteractionRunV1_1): void {
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length !== 40) throw new Error("interaction_canary_attempt_event_count_invalid");
  const events = lines.map(line => JSON.parse(line) as AttemptEventV1_1);
  run.terminals.forEach((terminal, index) => {
    const started = events[index * 2];
    const completed = events[index * 2 + 1];
    if (started.type !== "started" || completed.type !== "terminal"
      || completed.status !== "response"
      || started.sequence !== index + 1 || completed.sequence !== index + 1
      || started.requestId !== terminal.request.requestId
      || completed.requestId !== terminal.request.requestId
      || started.requestHash !== terminal.requestHash
      || completed.requestHash !== terminal.requestHash
      || completed.responseHash !== terminal.responseHash) {
      throw new Error("interaction_canary_attempt_binding_invalid");
    }
  });
}

export async function executeFrozenControlledInteractionCanaryV1_1(input: {
  outputDirectory?: string;
  invoker: SingleAttemptTextInvoker;
}): Promise<{ run: ControlledInteractionRunV1_1; analysis: ControlledInteractionAnalysisV1_1 }> {
  const frozen = loadFrozen(input.outputDirectory);
  const attemptsFile = join(frozen.outputDirectory, ATTEMPTS_FILE);
  const executionFiles = [attemptsFile, join(frozen.outputDirectory, RUN_FILE),
    join(frozen.outputDirectory, ANALYSIS_FILE), join(frozen.outputDirectory, FAILURE_FILE)];
  if (executionFiles.some(existsSync)) throw new Error("interaction_canary_execution_not_fresh");
  try {
    const run = await executeControlledInteractionCanaryV1_1({
      plan: frozen.plan,
      runId: "controlled-interaction-canary-v1.1-glm46v-seed1",
      invoker: loggedInvoker({ inner: input.invoker, attemptsFile, maximumAttempts: 20 }),
    });
    auditAttempts(attemptsFile, run);
    const usedCompletionTokens = run.terminals.reduce((sum, terminal) =>
      sum + (terminal.usage?.completionTokens ?? 0), 0);
    if (usedCompletionTokens > frozen.manifest.executionBudget.maximumTotalCompletionTokens) {
      throw new Error("interaction_canary_completion_token_budget_exceeded");
    }
    const analysis = analyzeControlledInteractionCanaryV1_1({ plan: frozen.plan, run });
    writeExactOrVerify(join(frozen.outputDirectory, RUN_FILE), run);
    writeExactOrVerify(join(frozen.outputDirectory, ANALYSIS_FILE), analysis);
    return { run, analysis };
  } catch (error) {
    const body = {
      failureRef: { id: "swarmalpha.failure.v6.controlled-interaction-canary", version: "1.1.0" },
      planHash: frozen.plan.contentHash,
      diagnostic: error instanceof Error ? error.message : "unknown_error",
      attemptsPreserved: existsSync(attemptsFile),
      noRetry: true,
    };
    writeExactOrVerify(join(frozen.outputDirectory, FAILURE_FILE), {
      ...body, contentHash: hashCollectiveDynamicsValueV1(body),
    });
    throw error;
  }
}

export function controlledInteractionCanaryExecuteGateV1_1(env: {
  RUN_AUTHORIZED?: string;
  CONTROLLED_INTERACTION_CANARY_V11_APPROVED?: string;
}) {
  if (env.RUN_AUTHORIZED !== "yes") {
    return { ok: false as const, code: 5,
      reason: "interaction_canary_execute_blocked: RUN_AUTHORIZED=yes not present" };
  }
  if (env.CONTROLLED_INTERACTION_CANARY_V11_APPROVED !== "yes") {
    return { ok: false as const, code: 5,
      reason: "interaction_canary_execute_blocked: CONTROLLED_INTERACTION_CANARY_V11_APPROVED=yes not present" };
  }
  return { ok: true as const };
}

async function main(): Promise<number> {
  const outputDirectory = process.env.CONTROLLED_INTERACTION_CANARY_OUTPUT_DIR
    ?? CONTROLLED_INTERACTION_CANARY_OUTPUT_V1_1;
  if (process.argv.includes("--plan")) {
    const frozen = freezeControlledInteractionCanaryV1_1(outputDirectory);
    console.log(JSON.stringify({ mode: "plan", providerCalls: 0,
      outputDirectory: frozen.outputDirectory, planHash: frozen.plan.contentHash,
      manifestHash: frozen.manifest.contentHash }));
    return 0;
  }
  if (process.argv.includes("--preflight")) {
    console.log(JSON.stringify({ mode: "preflight", providerCalls: 0,
      ...preflightControlledInteractionCanaryV1_1(outputDirectory) }));
    return 0;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --plan | --preflight (zero provider calls) | --execute (20 GLM calls)");
    return 2;
  }
  const gate = controlledInteractionCanaryExecuteGateV1_1({
    RUN_AUTHORIZED: process.env.RUN_AUTHORIZED,
    CONTROLLED_INTERACTION_CANARY_V11_APPROVED:
      process.env.CONTROLLED_INTERACTION_CANARY_V11_APPROVED,
  });
  if (!gate.ok) {
    console.error(gate.reason);
    return gate.code;
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("interaction_canary_execute_blocked: ZHIPU_API_KEY unavailable");
    return 3;
  }
  const { run, analysis } = await executeFrozenControlledInteractionCanaryV1_1({
    outputDirectory,
    invoker: createZhipuSingleAttemptInvoker("glm-4.6v"),
  });
  console.log(JSON.stringify({
    mode: "execute", providerCalls: run.providerCallCount, runHash: run.contentHash,
    analysisHash: analysis.contentHash, decision: analysis.qualification.decision,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
