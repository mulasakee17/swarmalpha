/** File-backed, owner-gated runner for the 160-call controlled formation canary. */
import dotenv from "dotenv";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { analyzeControlledWrongStateFormationV1 } from
  "./analyzeControlledWrongStateFormationV1";
import {
  buildControlledWrongStateFormationManifestV1,
  verifyControlledWrongStateFormationManifestV1,
  type ControlledWrongStateFormationManifestV1,
} from "./controlledWrongStateFormationManifestV1";
import {
  buildControlledWrongStateFormationPlanV1,
  executeControlledWrongStateFormationV1,
  verifyControlledWrongStateFormationPlanV1,
  verifyControlledWrongStateFormationRunV1,
  type ControlledWrongStateFormationPlanV1,
  type ControlledWrongStateFormationRunV1,
} from "./controlledWrongStateFormationV1";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";
import { providerFailureCode } from "./providerDiagnostics";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

export const CONTROLLED_WRONG_STATE_FORMATION_OUTPUT_V1 =
  "results/v6_controlled_wrong_state_formation_v1_glm46v_seed1";

const PLAN_FILE = "plan.json";
const MANIFEST_FILE = "manifest.json";
const ATTEMPTS_FILE = "attempts.jsonl";
const RUN_FILE = "run.json";
const ANALYSIS_FILE = "analysis.json";

type AttemptEventV1 = {
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

function exactJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeExactOrVerify(file: string, value: unknown): void {
  const text = exactJson(value);
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) {
      throw new Error(`controlled_formation_no_overwrite_conflict:${file}`);
    }
    return;
  }
  writeFileSync(file, text, { flag: "wx" });
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function appendEvent(file: string, event: AttemptEventV1): void {
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

export function freezeControlledWrongStateFormationV1(outputDirectoryInput?: string): {
  outputDirectory: string;
  plan: ControlledWrongStateFormationPlanV1;
  manifest: ControlledWrongStateFormationManifestV1;
} {
  const outputDirectory = resolve(outputDirectoryInput
    ?? CONTROLLED_WRONG_STATE_FORMATION_OUTPUT_V1);
  const plan = buildControlledWrongStateFormationPlanV1();
  const manifest = buildControlledWrongStateFormationManifestV1(plan);
  writeExactOrVerify(join(outputDirectory, PLAN_FILE), plan);
  writeExactOrVerify(join(outputDirectory, MANIFEST_FILE), manifest);
  return { outputDirectory, plan, manifest };
}

export function loadFrozenControlledWrongStateFormationV1(outputDirectoryInput?: string) {
  const outputDirectory = resolve(outputDirectoryInput
    ?? CONTROLLED_WRONG_STATE_FORMATION_OUTPUT_V1);
  const plan = readJson<ControlledWrongStateFormationPlanV1>(join(outputDirectory, PLAN_FILE));
  const manifest = readJson<ControlledWrongStateFormationManifestV1>(join(outputDirectory, MANIFEST_FILE));
  verifyControlledWrongStateFormationPlanV1(plan);
  verifyControlledWrongStateFormationManifestV1({ plan, manifest });
  return { outputDirectory, plan, manifest };
}

export function preflightControlledWrongStateFormationV1(outputDirectoryInput?: string) {
  const frozen = loadFrozenControlledWrongStateFormationV1(outputDirectoryInput);
  return {
    outputDirectory: frozen.outputDirectory,
    planHash: frozen.plan.contentHash,
    manifestHash: frozen.manifest.contentHash,
    scientificRole: frozen.manifest.scientificRole,
    humanSemanticReview: frozen.manifest.humanSemanticReview,
    plannedProviderCalls: frozen.plan.plannedProviderCalls,
    maximumTotalCompletionTokens: frozen.manifest.executionBudget.maximumTotalCompletionTokens,
    officialPriceStatus: frozen.manifest.priceCheck.status,
    outputFresh: !existsSync(join(frozen.outputDirectory, ATTEMPTS_FILE))
      && !existsSync(join(frozen.outputDirectory, RUN_FILE))
      && !existsSync(join(frozen.outputDirectory, ANALYSIS_FILE)),
  };
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
        throw new Error("controlled_formation_provider_attempt_budget_exceeded");
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
          requestId: request.requestId, requestHash,
          status: providerFailureCode(error),
        });
        throw error;
      }
    },
  };
}

export function auditControlledWrongStateFormationAttemptsV1(input: {
  file: string;
  run: ControlledWrongStateFormationRunV1;
}): void {
  const lines = readFileSync(input.file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length !== 320) throw new Error("controlled_formation_attempt_event_count_invalid");
  const events = lines.map(line => JSON.parse(line) as AttemptEventV1);
  input.run.terminals.forEach((terminal, index) => {
    const started = events[index * 2];
    const completed = events[index * 2 + 1];
    if (started.type !== "started" || completed.type !== "terminal"
      || completed.status !== "response"
      || started.sequence !== index + 1 || completed.sequence !== index + 1
      || started.requestId !== terminal.cellId || completed.requestId !== terminal.cellId
      || started.requestHash !== terminal.requestHash
      || completed.requestHash !== terminal.requestHash
      || completed.responseHash !== terminal.responseHash) {
      throw new Error("controlled_formation_attempt_binding_invalid");
    }
  });
}

export async function executeFrozenControlledWrongStateFormationV1(input: {
  outputDirectory?: string;
  invoker: SingleAttemptTextInvoker;
}): Promise<ControlledWrongStateFormationRunV1> {
  const frozen = loadFrozenControlledWrongStateFormationV1(input.outputDirectory);
  const attemptsFile = join(frozen.outputDirectory, ATTEMPTS_FILE);
  const runFile = join(frozen.outputDirectory, RUN_FILE);
  const analysisFile = join(frozen.outputDirectory, ANALYSIS_FILE);
  if (existsSync(attemptsFile) || existsSync(runFile) || existsSync(analysisFile)) {
    throw new Error("controlled_formation_execution_not_fresh");
  }
  const run = await executeControlledWrongStateFormationV1({
    plan: frozen.plan,
    runId: "controlled-wrong-state-formation-v1-glm46v-seed1",
    invoker: loggedInvoker({
      inner: input.invoker,
      attemptsFile,
      maximumAttempts: frozen.manifest.executionBudget.maximumProviderAttempts,
    }),
  });
  verifyControlledWrongStateFormationRunV1({ plan: frozen.plan, artifact: run });
  auditControlledWrongStateFormationAttemptsV1({ file: attemptsFile, run });
  const usedCompletionTokens = run.terminals.reduce((sum, terminal) =>
    sum + (terminal.usage?.completionTokens ?? 0), 0);
  if (usedCompletionTokens > frozen.manifest.executionBudget.maximumTotalCompletionTokens) {
    throw new Error("controlled_formation_completion_token_budget_exceeded");
  }
  writeExactOrVerify(runFile, run);
  const analysis = analyzeControlledWrongStateFormationV1({ plan: frozen.plan, run });
  writeExactOrVerify(analysisFile, analysis);
  return run;
}

export function controlledWrongStateFormationExecuteGateV1(env: {
  RUN_AUTHORIZED?: string;
  CONTROLLED_FORMATION_CANARY_APPROVED?: string;
}) {
  if (env.RUN_AUTHORIZED !== "yes") {
    return { ok: false as const, code: 5, reason: "controlled_formation_execute_blocked: RUN_AUTHORIZED=yes not present" };
  }
  if (env.CONTROLLED_FORMATION_CANARY_APPROVED !== "yes") {
    return { ok: false as const, code: 5, reason: "controlled_formation_execute_blocked: CONTROLLED_FORMATION_CANARY_APPROVED=yes not present" };
  }
  return { ok: true as const };
}

async function main(): Promise<number> {
  const outputDirectory = process.env.CONTROLLED_FORMATION_OUTPUT_DIR
    ?? CONTROLLED_WRONG_STATE_FORMATION_OUTPUT_V1;
  if (process.argv.includes("--plan")) {
    const frozen = freezeControlledWrongStateFormationV1(outputDirectory);
    console.log(JSON.stringify({
      mode: "plan", providerCalls: 0, outputDirectory: frozen.outputDirectory,
      planHash: frozen.plan.contentHash, manifestHash: frozen.manifest.contentHash,
    }));
    return 0;
  }
  if (process.argv.includes("--preflight")) {
    console.log(JSON.stringify({ mode: "preflight", providerCalls: 0,
      ...preflightControlledWrongStateFormationV1(outputDirectory) }));
    return 0;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --plan | --preflight (zero provider calls) | --execute (160 GLM calls)");
    return 2;
  }
  const gate = controlledWrongStateFormationExecuteGateV1({
    RUN_AUTHORIZED: process.env.RUN_AUTHORIZED,
    CONTROLLED_FORMATION_CANARY_APPROVED: process.env.CONTROLLED_FORMATION_CANARY_APPROVED,
  });
  if (!gate.ok) {
    console.error(gate.reason);
    return gate.code;
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("controlled_formation_execute_blocked: ZHIPU_API_KEY unavailable");
    return 3;
  }
  const run = await executeFrozenControlledWrongStateFormationV1({
    outputDirectory,
    invoker: createZhipuSingleAttemptInvoker("glm-4.6v"),
  });
  const analysis = readJson<{ advancement: { decision: string }; contentHash: string }>(
    join(resolve(outputDirectory), ANALYSIS_FILE),
  );
  console.log(JSON.stringify({
    mode: "execute", providerCalls: run.providerCallCount, runHash: run.contentHash,
    analysisHash: analysis.contentHash, decision: analysis.advancement.decision,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

