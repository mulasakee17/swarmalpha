/** File-backed, owner-gated runner for the four-call recovery probe. */
import dotenv from "dotenv";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  analyzeControlledRecoveryCanaryV1,
  buildControlledRecoveryPlanV1,
  executeControlledRecoveryCanaryV1,
  verifyControlledRecoveryPlanV1,
  type ControlledRecoveryAnalysisV1,
  type ControlledRecoveryPlanV1,
  type ControlledRecoveryRunV1,
} from "./controlledWrongStateRecoveryCanaryV1";
import type { SingleAttemptTextInvokeRequest, SingleAttemptTextInvokeResult, SingleAttemptTextInvoker } from "./providerAdapters";
import { providerFailureCode } from "./providerDiagnostics";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import type { ControlledInteractionRunV1_1 } from "./controlledWrongStateInteractionCanaryV1_1";

export const CONTROLLED_RECOVERY_CANARY_OUTPUT_V1 =
  "results/v6_controlled_recovery_canary_v1_glm46v_seed1";
const SOURCE_RUN = "results/v6_controlled_interaction_canary_v1_1_glm46v_seed1/run.json";
const PLAN_FILE = "plan.json"; const MANIFEST_FILE = "manifest.json";
const ATTEMPTS_FILE = "attempts.jsonl"; const RUN_FILE = "run.json";
const ANALYSIS_FILE = "analysis.json"; const FAILURE_FILE = "execution-failure.json";

interface RecoveryManifestV1 {
  manifestRef: { id: "swarmalpha.manifest.v6.controlled-recovery-canary"; version: "1.0.0" };
  planHash: string;
  sourceRunHash: string;
  authorizationBasis: "explicit_user_authorization_2026-08-29";
  scientificRole: "single_task_escape_probe_development";
  executionBudget: { maximumProviderAttempts: 4; maximumTotalCompletionTokens: 4096; retries: "none" };
  onlineTruthAccess: "forbidden";
  inferenceLimit: "escape_probe_not_causal_recoverability";
  contentHash: string;
}
type AttemptEvent = { type: "started"; sequence: number; timestamp: string; requestId: string; requestHash: string; request: SingleAttemptTextInvokeRequest }
  | { type: "terminal"; sequence: number; timestamp: string; requestId: string; requestHash: string; status: "response"; rawResponse: string; responseHash: string; providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"]; usage?: SingleAttemptTextInvokeResult["usage"] }
  | { type: "terminal"; sequence: number; timestamp: string; requestId: string; requestHash: string; status: ReturnType<typeof providerFailureCode> };

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> { const { contentHash: _hash, ...body } = value; return body; }
function json(value: unknown): string { return `${JSON.stringify(value, null, 2)}\n`; }
function writeExactOrVerify(file: string, value: unknown): void {
  const text = json(value); mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) { if (readFileSync(file, "utf8") !== text) throw new Error(`recovery_canary_no_overwrite_conflict:${file}`); return; }
  writeFileSync(file, text, { flag: "wx" });
}
function readJson<T>(file: string): T { return JSON.parse(readFileSync(file, "utf8")) as T; }
function sourceRun(): ControlledInteractionRunV1_1 { return readJson<ControlledInteractionRunV1_1>(resolve(SOURCE_RUN)); }
function manifest(plan: ControlledRecoveryPlanV1): RecoveryManifestV1 {
  const body: Omit<RecoveryManifestV1, "contentHash"> = {
    manifestRef: { id: "swarmalpha.manifest.v6.controlled-recovery-canary", version: "1.0.0" },
    planHash: plan.contentHash, sourceRunHash: plan.sourceRunHash,
    authorizationBasis: "explicit_user_authorization_2026-08-29",
    scientificRole: "single_task_escape_probe_development",
    executionBudget: { maximumProviderAttempts: 4, maximumTotalCompletionTokens: 4096, retries: "none" },
    onlineTruthAccess: "forbidden", inferenceLimit: "escape_probe_not_causal_recoverability",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
function verifyManifest(plan: ControlledRecoveryPlanV1, value: RecoveryManifestV1): void {
  const expected = manifest(plan);
  if (JSON.stringify(expected) !== JSON.stringify(value)
    || hashCollectiveDynamicsValueV1(withoutHash(value)) !== value.contentHash) throw new Error("recovery_canary_manifest_invalid");
}

export function freezeControlledRecoveryCanaryV1(outputDirectoryInput?: string) {
  const outputDirectory = resolve(outputDirectoryInput ?? CONTROLLED_RECOVERY_CANARY_OUTPUT_V1);
  const plan = buildControlledRecoveryPlanV1({ sourceRun: sourceRun() });
  const value = manifest(plan);
  writeExactOrVerify(join(outputDirectory, PLAN_FILE), plan); writeExactOrVerify(join(outputDirectory, MANIFEST_FILE), value);
  return { outputDirectory, plan, manifest: value };
}
function loadFrozen(outputDirectoryInput?: string) {
  const outputDirectory = resolve(outputDirectoryInput ?? CONTROLLED_RECOVERY_CANARY_OUTPUT_V1);
  const plan = readJson<ControlledRecoveryPlanV1>(join(outputDirectory, PLAN_FILE));
  const value = readJson<RecoveryManifestV1>(join(outputDirectory, MANIFEST_FILE));
  verifyControlledRecoveryPlanV1(plan); verifyManifest(plan, value);
  if (plan.sourceRunHash !== sourceRun().contentHash) throw new Error("recovery_canary_source_hash_changed");
  return { outputDirectory, plan, manifest: value, source: sourceRun() };
}
export function preflightControlledRecoveryCanaryV1(outputDirectoryInput?: string) {
  const frozen = loadFrozen(outputDirectoryInput);
  return { outputDirectory: frozen.outputDirectory, planHash: frozen.plan.contentHash, manifestHash: frozen.manifest.contentHash,
    sourceRunHash: frozen.plan.sourceRunHash, plannedProviderCalls: 4, maximumTotalCompletionTokens: 4096,
    outputFresh: [ATTEMPTS_FILE, RUN_FILE, ANALYSIS_FILE, FAILURE_FILE].every(file => !existsSync(join(frozen.outputDirectory, file))) };
}
function append(file: string, event: AttemptEvent): void { appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" }); }
function logged(inner: SingleAttemptTextInvoker, file: string): SingleAttemptTextInvoker {
  let sequence = 0;
  return { async invoke(request, signal) {
    sequence += 1; if (sequence > 4) throw new Error("recovery_canary_provider_attempt_budget_exceeded");
    const requestHash = hashCollectiveDynamicsValueV1(request);
    append(file, { type: "started", sequence, timestamp: new Date().toISOString(), requestId: request.requestId, requestHash, request: structuredClone(request) });
    try { const result = await inner.invoke(request, signal); append(file, { type: "terminal", sequence, timestamp: new Date().toISOString(), requestId: request.requestId, requestHash, status: "response", rawResponse: result.rawContent, responseHash: hashCollectiveDynamicsValueV1(result.rawContent), ...(result.providerMetadata ? { providerMetadata: structuredClone(result.providerMetadata) } : {}), ...(result.usage ? { usage: structuredClone(result.usage) } : {}) }); return result; }
    catch (error) { append(file, { type: "terminal", sequence, timestamp: new Date().toISOString(), requestId: request.requestId, requestHash, status: providerFailureCode(error) }); throw error; }
  } };
}
function audit(file: string, run: ControlledRecoveryRunV1): void {
  const events = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as AttemptEvent);
  if (events.length !== 8) throw new Error("recovery_canary_attempt_event_count_invalid");
  run.terminals.forEach((terminal, index) => { const started = events[index * 2]; const ended = events[index * 2 + 1];
    if (started.type !== "started" || ended.type !== "terminal" || ended.status !== "response" || started.sequence !== index + 1 || ended.sequence !== index + 1 || started.requestId !== terminal.request.requestId || ended.requestId !== terminal.request.requestId || started.requestHash !== terminal.requestHash || ended.requestHash !== terminal.requestHash || ended.responseHash !== terminal.responseHash) throw new Error("recovery_canary_attempt_binding_invalid"); });
}
export async function executeFrozenControlledRecoveryCanaryV1(input: { outputDirectory?: string; invoker: SingleAttemptTextInvoker }): Promise<{ run: ControlledRecoveryRunV1; analysis: ControlledRecoveryAnalysisV1 }> {
  const frozen = loadFrozen(input.outputDirectory); const attempts = join(frozen.outputDirectory, ATTEMPTS_FILE);
  if ([attempts, join(frozen.outputDirectory, RUN_FILE), join(frozen.outputDirectory, ANALYSIS_FILE), join(frozen.outputDirectory, FAILURE_FILE)].some(existsSync)) throw new Error("recovery_canary_execution_not_fresh");
  try { const run = await executeControlledRecoveryCanaryV1({ plan: frozen.plan, sourceRun: frozen.source, runId: "controlled-recovery-canary-v1-glm46v-seed1", invoker: logged(input.invoker, attempts) }); audit(attempts, run); const analysis = analyzeControlledRecoveryCanaryV1({ plan: frozen.plan, sourceRun: frozen.source, run }); writeExactOrVerify(join(frozen.outputDirectory, RUN_FILE), run); writeExactOrVerify(join(frozen.outputDirectory, ANALYSIS_FILE), analysis); return { run, analysis }; }
  catch (error) { const body = { failureRef: { id: "swarmalpha.failure.v6.controlled-recovery-canary", version: "1.0.0" }, planHash: frozen.plan.contentHash, diagnostic: error instanceof Error ? error.message : "unknown_error", attemptsPreserved: existsSync(attempts), noRetry: true }; writeExactOrVerify(join(frozen.outputDirectory, FAILURE_FILE), { ...body, contentHash: hashCollectiveDynamicsValueV1(body) }); throw error; }
}
export function controlledRecoveryCanaryExecuteGateV1(env: { RUN_AUTHORIZED?: string; CONTROLLED_RECOVERY_CANARY_APPROVED?: string }) {
  if (env.RUN_AUTHORIZED !== "yes") return { ok: false as const, code: 5, reason: "recovery_canary_execute_blocked: RUN_AUTHORIZED=yes not present" };
  if (env.CONTROLLED_RECOVERY_CANARY_APPROVED !== "yes") return { ok: false as const, code: 5, reason: "recovery_canary_execute_blocked: CONTROLLED_RECOVERY_CANARY_APPROVED=yes not present" };
  return { ok: true as const };
}
async function main(): Promise<number> {
  const outputDirectory = process.env.CONTROLLED_RECOVERY_CANARY_OUTPUT_DIR ?? CONTROLLED_RECOVERY_CANARY_OUTPUT_V1;
  if (process.argv.includes("--plan")) { const frozen = freezeControlledRecoveryCanaryV1(outputDirectory); console.log(JSON.stringify({ mode: "plan", providerCalls: 0, outputDirectory: frozen.outputDirectory, planHash: frozen.plan.contentHash, manifestHash: frozen.manifest.contentHash })); return 0; }
  if (process.argv.includes("--preflight")) { console.log(JSON.stringify({ mode: "preflight", providerCalls: 0, ...preflightControlledRecoveryCanaryV1(outputDirectory) })); return 0; }
  if (!process.argv.includes("--execute")) { console.error("usage: --plan | --preflight | --execute (4 GLM calls)"); return 2; }
  const gate = controlledRecoveryCanaryExecuteGateV1({ RUN_AUTHORIZED: process.env.RUN_AUTHORIZED, CONTROLLED_RECOVERY_CANARY_APPROVED: process.env.CONTROLLED_RECOVERY_CANARY_APPROVED }); if (!gate.ok) { console.error(gate.reason); return gate.code; }
  dotenv.config({ path: resolve(".env.local") }); if (!process.env.ZHIPU_API_KEY) { console.error("recovery_canary_execute_blocked: ZHIPU_API_KEY unavailable"); return 3; }
  const { run, analysis } = await executeFrozenControlledRecoveryCanaryV1({ outputDirectory, invoker: createZhipuSingleAttemptInvoker("glm-4.6v") }); console.log(JSON.stringify({ mode: "execute", providerCalls: run.providerCallCount, runHash: run.contentHash, analysisHash: analysis.contentHash, decision: analysis.decision })); return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) main().then(code => { process.exitCode = code; }).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
