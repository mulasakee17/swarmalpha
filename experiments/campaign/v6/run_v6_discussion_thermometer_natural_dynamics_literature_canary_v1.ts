import dotenv from "dotenv";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SingleAttemptTextInvokeRequest, SingleAttemptTextInvokeResult, SingleAttemptTextInvoker } from "./providerAdapters";
import { providerFailureCode } from "./providerDiagnostics";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  buildDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1,
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1,
  type DiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryManifestV1";
import {
  buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
  type DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryPlanV1";
import { DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1 } from "./discussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1";
import { buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1 } from "./run_v6_discussion_thermometer_natural_dynamics_literature_canary_preflight_v1";
import {
  buildNaturalDynamicsSensorFreezeV1,
  executeNaturalDynamicsPublicV1,
  executeNaturalDynamicsSensorV1,
  projectNaturalDynamicsObservationV1,
  verifyNaturalDynamicsPublicRunV1,
  verifyNaturalDynamicsSensorFreezeV1,
  type NaturalDynamicsPublicRunV1,
  type NaturalDynamicsSensorFreezeV1,
  type NaturalDynamicsSensorRunV1,
} from "./runDiscussionThermometerNaturalDynamicsV1";
import { evaluateDiscussionThermometerNaturalDynamicsLiteratureCanaryV1 } from "./evaluateDiscussionThermometerNaturalDynamicsLiteratureCanaryV1";

const DEFAULT_OUTPUT = "results/v6_discussion_thermometer_natural_dynamics_literature_canary_v1_1_glm46v_seed1";
const EXPECTED_PROVIDER_MODEL = "glm-4.6v";
const FILES = Object.freeze({
  taskBank: "task-bank.json", plan: "plan.json", manifest: "execution-manifest.json", preflight: "preflight.json",
  publicAuthorization: "public-execution-authorization.json", publicAttempts: "public-attempts.jsonl",
  publicFailure: "public-execution-failure.json", publicRun: "public-run.json", sensorFreeze: "sensor-freeze.json",
  sensorAuthorization: "sensor-execution-authorization.json", sensorAttempts: "sensor-attempts.jsonl",
  sensorFailure: "sensor-execution-failure.json", sensorRun: "sensor-run.json",
  observation: "observation.json", evaluation: "evaluation.json",
});

type Phase = "public" | "sensor";
type AttemptEvent =
  | { type: "started"; phase: Phase; sequence: number; timestamp: string; requestId: string; requestHash: string; request: SingleAttemptTextInvokeRequest }
  | { type: "terminal"; phase: Phase; sequence: number; timestamp: string; requestId: string; requestHash: string; status: "response"; rawResponse: string; responseHash: string; providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"]; usage?: SingleAttemptTextInvokeResult["usage"] }
  | { type: "terminal"; phase: Phase; sequence: number; timestamp: string; requestId: string; requestHash: string; status: ReturnType<typeof providerFailureCode> };
type TraceableTerminal = { sequence: number; cellId: string; requestHash: string; responseHash: string; providerMetadata?: { model?: string; requestId?: string } };

function readJson<T>(path: string): T { return JSON.parse(readFileSync(path, "utf8")) as T; }
function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) throw new Error(`literature_canary_no_overwrite_conflict:${path}`);
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}
function appendEvent(path: string, event: AttemptEvent): void { appendFileSync(path, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" }); }
function frozen(output: string): { plan: DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1; manifest: DiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1 } {
  const plan = readJson<DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1>(join(output, FILES.plan));
  const manifest = readJson<DiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1>(join(output, FILES.manifest));
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1(plan);
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1(manifest, plan);
  return { plan, manifest };
}

export function createLiteratureCanaryLoggedInvokerV1(input: { inner: SingleAttemptTextInvoker; attemptsFile: string; phase: Phase; maximumAttempts: number }): SingleAttemptTextInvoker {
  let sequence = 0;
  return { async invoke(request, signal) {
    sequence += 1;
    if (sequence > input.maximumAttempts) throw new Error("literature_canary_provider_attempt_cap_reached");
    const requestHash = hashCollectiveDynamicsValueV1(request);
    appendEvent(input.attemptsFile, { type: "started", phase: input.phase, sequence, timestamp: new Date().toISOString(), requestId: request.requestId, requestHash, request: structuredClone(request) });
    try {
      const result = await input.inner.invoke(request, signal);
      appendEvent(input.attemptsFile, { type: "terminal", phase: input.phase, sequence, timestamp: new Date().toISOString(), requestId: request.requestId, requestHash, status: "response", rawResponse: result.rawContent, responseHash: hashCollectiveDynamicsValueV1(result.rawContent), ...(result.providerMetadata ? { providerMetadata: structuredClone(result.providerMetadata) } : {}), ...(result.usage ? { usage: structuredClone(result.usage) } : {}) });
      return result;
    } catch (error) {
      appendEvent(input.attemptsFile, { type: "terminal", phase: input.phase, sequence, timestamp: new Date().toISOString(), requestId: request.requestId, requestHash, status: providerFailureCode(error) });
      throw error;
    }
  } };
}

export function auditLiteratureCanaryAttemptLedgerV1(input: { attemptsFile: string; phase: Phase; terminals: readonly TraceableTerminal[]; expectedCount: number }): void {
  const events = readFileSync(input.attemptsFile, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as AttemptEvent);
  if (input.terminals.length !== input.expectedCount || events.length !== input.expectedCount * 2) throw new Error("literature_canary_attempt_event_count_invalid");
  const providerRequestIds = new Set<string>();
  input.terminals.forEach((terminal, index) => {
    const started = events[index * 2]; const ended = events[index * 2 + 1];
    if (started.type !== "started" || ended.type !== "terminal" || ended.status !== "response"
      || started.phase !== input.phase || ended.phase !== input.phase || started.sequence !== index + 1 || ended.sequence !== index + 1
      || started.requestId !== terminal.cellId || ended.requestId !== terminal.cellId
      || started.requestHash !== terminal.requestHash || ended.requestHash !== terminal.requestHash
      || hashCollectiveDynamicsValueV1(started.request) !== started.requestHash || ended.responseHash !== terminal.responseHash
      || terminal.providerMetadata?.model !== EXPECTED_PROVIDER_MODEL || ended.providerMetadata?.model !== EXPECTED_PROVIDER_MODEL
      || typeof terminal.providerMetadata.requestId !== "string" || !terminal.providerMetadata.requestId.trim()
      || terminal.providerMetadata.requestId !== ended.providerMetadata?.requestId) throw new Error("literature_canary_attempt_binding_invalid");
    if (providerRequestIds.has(terminal.providerMetadata.requestId)) throw new Error("literature_canary_provider_request_id_reused");
    providerRequestIds.add(terminal.providerMetadata.requestId);
  });
}

function startedAttemptCount(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as AttemptEvent).filter(event => event.type === "started").length;
}
function assertCombinedAttemptBudget(output: string, maximum: number): void {
  const attempts = startedAttemptCount(join(output, FILES.publicAttempts)) + startedAttemptCount(join(output, FILES.sensorAttempts));
  if (attempts > maximum) throw new Error("literature_canary_combined_provider_attempt_budget_exceeded");
}
function gate(phase: Phase): void {
  if (process.env.RUN_AUTHORIZED !== "yes" || process.env.THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_SEMANTIC_REVIEWED !== "yes" || process.env.THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_BUDGET_APPROVED !== "84" || process.env.THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_PHASE !== phase) throw new Error(`literature_canary_execute_blocked:${phase}: require explicit review, budget 84, phase and RUN_AUTHORIZED=yes`);
}
function recordAuthorization(output: string, phase: Phase): void {
  const file = phase === "public" ? FILES.publicAuthorization : FILES.sensorAuthorization;
  const body = { authorizationRef: { id: "swarmalpha.authorization.v6.discussion-thermometer-natural-dynamics-literature-canary", version: "1.1.0" }, phase, runAuthorized: true, semanticReviewed: true, approvedMaximumProviderCalls: 84, retry: "none" as const };
  writeExactOrVerify(join(output, file), { ...body, contentHash: hashCollectiveDynamicsValueV1(body) });
}
function writeFailure(output: string, phase: Phase, error: unknown): void {
  const attempts = phase === "public" ? FILES.publicAttempts : FILES.sensorAttempts;
  const failure = phase === "public" ? FILES.publicFailure : FILES.sensorFailure;
  const body = { failureRef: { id: "swarmalpha.failure.v6.discussion-thermometer-natural-dynamics-literature-canary", version: "1.1.0" }, phase, diagnostic: error instanceof Error ? error.message : "unknown_error", attemptsPreserved: existsSync(join(output, attempts)), physicalAttemptCount: startedAttemptCount(join(output, attempts)), noRetry: true };
  writeExactOrVerify(join(output, failure), { ...body, contentHash: hashCollectiveDynamicsValueV1(body) });
}

function mockInvoker(): SingleAttemptTextInvoker { return { async invoke(request) {
  const providerMetadata = { model: EXPECTED_PROVIDER_MODEL, requestId: `mock-provider:${request.requestId}` };
  if (request.requestId.includes("-sensor:")) return { rawContent: JSON.stringify({ probabilities: { opt_1: 0.55, opt_2: 0.2, opt_3: 0.15, opt_4: 0.1 } }), providerMetadata };
  return { rawContent: JSON.stringify({ choiceId: "opt_1", message: "Synthetic fixture response." }), providerMetadata };
} }; }
function planArtifacts(output: string): void {
  mkdirSync(output, { recursive: true }); const plan = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1();
  writeExactOrVerify(join(output, FILES.taskBank), DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1);
  writeExactOrVerify(join(output, FILES.plan), plan);
  writeExactOrVerify(join(output, FILES.manifest), buildDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1(plan));
}
function preflight(output: string): void { mkdirSync(output, { recursive: true }); writeExactOrVerify(join(output, FILES.preflight), buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1()); }
function finish(output: string, plan: DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1, publicRun: NaturalDynamicsPublicRunV1, freeze: NaturalDynamicsSensorFreezeV1, sensorRun: NaturalDynamicsSensorRunV1, evidenceClass: "synthetic_mock" | "provider_observation"): void {
  const observation = projectNaturalDynamicsObservationV1({ plan, publicRun, sensorFreeze: freeze, sensorRun });
  writeExactOrVerify(join(output, FILES.observation), observation);
  writeExactOrVerify(join(output, FILES.evaluation), evaluateDiscussionThermometerNaturalDynamicsLiteratureCanaryV1({ plan, publicRun, sensorFreeze: freeze, sensorRun, observation, evidenceClass }));
}
async function runMock(output: string): Promise<void> {
  const { plan } = frozen(output); const invoker = mockInvoker();
  const publicRun = await executeNaturalDynamicsPublicV1({ plan, invoker }); writeExactOrVerify(join(output, FILES.publicRun), publicRun);
  const freeze = buildNaturalDynamicsSensorFreezeV1({ plan, publicRun }); writeExactOrVerify(join(output, FILES.sensorFreeze), freeze);
  const sensorRun = await executeNaturalDynamicsSensorV1({ plan, publicRun, freeze, invoker }); writeExactOrVerify(join(output, FILES.sensorRun), sensorRun);
  finish(output, plan, publicRun, freeze, sensorRun, "synthetic_mock");
}

async function executePublic(output: string): Promise<void> {
  gate("public"); const { plan } = frozen(output); const attempts = join(output, FILES.publicAttempts);
  if ([FILES.publicAuthorization, FILES.publicAttempts, FILES.publicFailure, FILES.publicRun].some(file => existsSync(join(output, file)))) throw new Error("literature_canary_public_phase_not_fresh");
  dotenv.config({ path: resolve(".env.local") }); if (!process.env.ZHIPU_API_KEY) throw new Error("literature_canary_zhipu_key_unavailable"); recordAuthorization(output, "public");
  try {
    const publicRun = await executeNaturalDynamicsPublicV1({ plan, invoker: createLiteratureCanaryLoggedInvokerV1({ inner: createZhipuRawSingleAttemptInvoker(EXPECTED_PROVIDER_MODEL), attemptsFile: attempts, phase: "public", maximumAttempts: plan.callBudget.publicCalls }) });
    auditLiteratureCanaryAttemptLedgerV1({ attemptsFile: attempts, phase: "public", terminals: publicRun.terminals, expectedCount: plan.callBudget.publicCalls });
    assertCombinedAttemptBudget(output, plan.callBudget.totalProviderCalls); writeExactOrVerify(join(output, FILES.publicRun), publicRun);
  } catch (error) { writeFailure(output, "public", error); throw error; }
}
function freezeSensor(output: string): void {
  const { plan } = frozen(output); const publicRun = readJson<NaturalDynamicsPublicRunV1>(join(output, FILES.publicRun)); verifyNaturalDynamicsPublicRunV1({ plan, run: publicRun });
  auditLiteratureCanaryAttemptLedgerV1({ attemptsFile: join(output, FILES.publicAttempts), phase: "public", terminals: publicRun.terminals, expectedCount: plan.callBudget.publicCalls });
  if (existsSync(join(output, FILES.sensorFreeze))) throw new Error("literature_canary_sensor_freeze_already_exists");
  writeExactOrVerify(join(output, FILES.sensorFreeze), buildNaturalDynamicsSensorFreezeV1({ plan, publicRun }));
}
async function executeSensor(output: string): Promise<void> {
  gate("sensor"); const { plan } = frozen(output); const publicRun = readJson<NaturalDynamicsPublicRunV1>(join(output, FILES.publicRun)); const freeze = readJson<NaturalDynamicsSensorFreezeV1>(join(output, FILES.sensorFreeze));
  verifyNaturalDynamicsPublicRunV1({ plan, run: publicRun }); verifyNaturalDynamicsSensorFreezeV1({ plan, publicRun, freeze });
  auditLiteratureCanaryAttemptLedgerV1({ attemptsFile: join(output, FILES.publicAttempts), phase: "public", terminals: publicRun.terminals, expectedCount: plan.callBudget.publicCalls });
  if ([FILES.sensorAuthorization, FILES.sensorAttempts, FILES.sensorFailure, FILES.sensorRun].some(file => existsSync(join(output, file)))) throw new Error("literature_canary_sensor_phase_not_fresh");
  assertCombinedAttemptBudget(output, plan.callBudget.totalProviderCalls); dotenv.config({ path: resolve(".env.local") }); if (!process.env.ZHIPU_API_KEY) throw new Error("literature_canary_zhipu_key_unavailable"); recordAuthorization(output, "sensor");
  const attempts = join(output, FILES.sensorAttempts);
  try {
    const sensorRun = await executeNaturalDynamicsSensorV1({ plan, publicRun, freeze, invoker: createLiteratureCanaryLoggedInvokerV1({ inner: createZhipuRawSingleAttemptInvoker(EXPECTED_PROVIDER_MODEL), attemptsFile: attempts, phase: "sensor", maximumAttempts: plan.callBudget.sensorCalls }) });
    auditLiteratureCanaryAttemptLedgerV1({ attemptsFile: attempts, phase: "sensor", terminals: sensorRun.terminals, expectedCount: plan.callBudget.sensorCalls });
    assertCombinedAttemptBudget(output, plan.callBudget.totalProviderCalls); writeExactOrVerify(join(output, FILES.sensorRun), sensorRun);
  } catch (error) { writeFailure(output, "sensor", error); throw error; }
}
function analyze(output: string): void {
  const { plan } = frozen(output); const publicRun = readJson<NaturalDynamicsPublicRunV1>(join(output, FILES.publicRun)); const freeze = readJson<NaturalDynamicsSensorFreezeV1>(join(output, FILES.sensorFreeze)); const sensorRun = readJson<NaturalDynamicsSensorRunV1>(join(output, FILES.sensorRun));
  auditLiteratureCanaryAttemptLedgerV1({ attemptsFile: join(output, FILES.publicAttempts), phase: "public", terminals: publicRun.terminals, expectedCount: plan.callBudget.publicCalls });
  auditLiteratureCanaryAttemptLedgerV1({ attemptsFile: join(output, FILES.sensorAttempts), phase: "sensor", terminals: sensorRun.terminals, expectedCount: plan.callBudget.sensorCalls });
  assertCombinedAttemptBudget(output, plan.callBudget.totalProviderCalls); finish(output, plan, publicRun, freeze, sensorRun, "provider_observation");
}

async function main(): Promise<void> {
  const output = resolve(process.env.THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_OUTPUT_DIR ?? DEFAULT_OUTPUT);
  const mode = process.argv.find(argument => ["--plan", "--preflight", "--mock", "--execute-public", "--freeze-sensor", "--execute-sensor", "--analyze"].includes(argument));
  if (!mode) throw new Error("literature_canary_mode_required");
  if (mode === "--plan") planArtifacts(output); else if (mode === "--preflight") preflight(output); else if (mode === "--mock") { planArtifacts(output); await runMock(output); } else if (mode === "--execute-public") await executePublic(output); else if (mode === "--freeze-sensor") freezeSensor(output); else if (mode === "--execute-sensor") await executeSensor(output); else analyze(output);
  process.stdout.write(`${JSON.stringify({ mode, output, providerCalls: mode === "--execute-public" ? 24 : mode === "--execute-sensor" ? 60 : 0, planHash: existsSync(join(output, FILES.plan)) ? readJson<{ contentHash: string }>(join(output, FILES.plan)).contentHash : null, manifest: existsSync(join(output, FILES.manifest)), observation: existsSync(join(output, FILES.observation)), evaluation: existsSync(join(output, FILES.evaluation)) }, null, 2)}\n`);
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
