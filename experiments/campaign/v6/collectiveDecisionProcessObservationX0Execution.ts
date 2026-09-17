/**
 * X0's deliberately narrow live boundary.
 *
 * Construction never emits a provider request. The caller explicitly selects a
 * provider-specific, new-directory bound handle and then starts public/sensor
 * execution. A directory with any prior state is refused: an interrupted call
 * is an unknown terminal observation, never a retryable job.
 */
import { mkdir, open, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fingerprintEstimatorValue } from "../../../src/lib/epistemic/estimators";
import {
  createZhipuRawSingleAttemptInvoker,
  ZHIPU_GLM_MODEL_REF,
} from "./zhipuSingleAttemptInvoker";
import type {
  SingleAttemptTextInvoker,
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvokeResult,
} from "./providerAdapters";
import {
  planX0Cells,
  runX0PublicPhase,
  runX0Sensors,
  type X0Cell,
  type X0Journal,
  type X0PublicRun,
  type X0Settings,
  type X0Task,
} from "./collectiveDecisionProcessObservationX0";

export const X0_DURABLE_JOURNAL_V1 = Object.freeze({
  id: "swarmalpha.experiment.x0.durable-journal",
  version: "1.2.0",
});

export const X0_ZHIPU_RAW_MODEL_REF_V1 = ZHIPU_GLM_MODEL_REF;
export const X0_QWEN_DASHSCOPE_MODEL_REF_V1 = Object.freeze({
  id: "dashscope:qwen3.7-flash-2026-07-15",
  version: "1.0.0",
});

/** Only the two documented Model Studio regions needed by the current X0 candidate are admitted. */
export type X0DashScopeRegionV1 = "cn-beijing" | "ap-southeast-1";

/**
 * The secret stays in the invoker closure. `workspaceId` is accepted only to
 * derive an official direct endpoint; neither value is written to the journal.
 */
export interface X0DashScopeConnectionV1 {
  region: X0DashScopeRegionV1;
  workspaceId: string;
  apiKey: string;
}

/** Non-secret endpoint provenance frozen in the manifest before any request. */
export interface X0ExecutionConnectionRefV1 {
  id: "zhipu-direct" | "dashscope-model-studio";
  version: "1.0.0";
  region: X0DashScopeRegionV1 | null;
  workspaceFingerprint: string | null;
}

export const X0_ZHIPU_DIRECT_CONNECTION_REF_V1: X0ExecutionConnectionRefV1 = Object.freeze({
  id: "zhipu-direct",
  version: "1.0.0",
  region: null,
  workspaceFingerprint: null,
});

type X0ExecutionPhase = "canary" | "remainder";
type CellTerminalStatus = "returned" | "unknown";
type JournalEventStatus = "started" | CellTerminalStatus;

export interface X0JournalManifestV1 {
  journalRef: typeof X0_DURABLE_JOURNAL_V1;
  runId: string;
  phase: X0ExecutionPhase;
  settings: X0Settings;
  connectionRef: X0ExecutionConnectionRefV1;
  onlineTaskHash: string;
  planHash: string;
  cellPlan: Array<Pick<X0Cell, "id" | "seed" | "block" | "slot" | "agentId" | "phase" | "maxTokens">>;
  genesisHash: string;
  contentHash: string;
}

export interface X0JournalEventV1 {
  journalRef: typeof X0_DURABLE_JOURNAL_V1;
  eventIndex: number;
  priorEventHash: string;
  status: JournalEventStatus;
  cell: X0Cell;
  contentHash: string;
}

export interface X0RecoveredJournalV1 {
  manifest: X0JournalManifestV1;
  events: readonly X0JournalEventV1[];
  terminalCells: readonly X0Cell[];
  /** A started call without a terminal record may have reached the provider. */
  unknownAfterInterruption: readonly X0Cell[];
}

interface X0PersistentJournalV1 {
  directory: string;
  manifest: X0JournalManifestV1;
  read(): Promise<X0RecoveredJournalV1>;
  /** The only durable-run entry; it freezes and verifies task/settings binding. */
  bindCanary(input: {
    settings: X0Settings;
    onlineTasks: readonly X0Task[];
    invoker: SingleAttemptTextInvoker;
  }): X0BoundCanaryExecutionV1;
}

/** Not exported: raw durable writes may only be reached through bindCanary. */
interface X0PersistentJournalRuntimeV1 {
  directory: string;
  manifest: X0JournalManifestV1;
  journal: X0Journal;
  read(): Promise<X0RecoveredJournalV1>;
}

/**
 * The only live execution shape returned by provider-specific constructors.
 * It captures the frozen tasks/settings/phase internally, so an operator
 * cannot accidentally pair a manifest with a different runtime input.
 */
export interface X0BoundCanaryExecutionV1 {
  directory: string;
  manifest: X0JournalManifestV1;
  read(): Promise<X0RecoveredJournalV1>;
  runPublic(signal: AbortSignal): Promise<X0PublicRun>;
  runSensors(signal: AbortSignal): Promise<readonly X0Cell[]>;
}

function failX0Execution(reason: string): never { throw new Error(`x0_execution_${reason}`); }
function record(value: unknown, reason: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) failX0Execution(reason);
}
function same(left: unknown, right: unknown): boolean {
  return fingerprintEstimatorValue(left) === fingerprintEstimatorValue(right);
}
function clone<T>(value: T): T { return structuredClone(value); }
function knownPhase(value: unknown): value is X0ExecutionPhase { return value === "canary" || value === "remainder"; }

function cellProjection(cell: X0Cell): X0JournalManifestV1["cellPlan"][number] {
  return {
    id: cell.id,
    seed: cell.seed,
    block: cell.block,
    slot: cell.slot,
    agentId: cell.agentId,
    phase: cell.phase,
    maxTokens: cell.maxTokens,
  };
}
function manifestBody(input: Omit<X0JournalManifestV1, "genesisHash" | "contentHash">) {
  return input;
}
function eventBody(input: Omit<X0JournalEventV1, "contentHash">) { return input; }
function requireExactKeys(value: Record<string, unknown>, keys: readonly string[], reason: string): void {
  if (Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) failX0Execution(reason);
}

async function writeNewSynced(path: string, content: string): Promise<void> {
  const handle = await open(path, "wx");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function appendSynced(path: string, content: string): Promise<void> {
  const handle = await open(path, "a");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function modelKind(settings: X0Settings): "zhipu" | "dashscope" {
  if (settings.modelRef.id === X0_ZHIPU_RAW_MODEL_REF_V1.id && settings.modelRef.version === X0_ZHIPU_RAW_MODEL_REF_V1.version) return "zhipu";
  if (settings.modelRef.id === X0_QWEN_DASHSCOPE_MODEL_REF_V1.id && settings.modelRef.version === X0_QWEN_DASHSCOPE_MODEL_REF_V1.version) return "dashscope";
  return failX0Execution("model_not_bound");
}

function validateSettings(settings: X0Settings): "zhipu" | "dashscope" {
  record(settings, "settings_not_object");
  requireExactKeys(settings, ["modelRef", "temperature", "thinking", "seedSupport"], "settings_fields");
  record(settings.modelRef, "model_ref_not_object");
  requireExactKeys(settings.modelRef, ["id", "version"], "model_ref_fields");
  if (!Number.isFinite(settings.temperature) || settings.temperature < 0 || settings.temperature > 2
    || settings.thinking !== "disabled" || !["supported", "unsupported"].includes(settings.seedSupport)) failX0Execution("settings_invalid");
  const kind = modelKind(settings);
  if ((kind === "zhipu" && settings.seedSupport !== "supported") || (kind === "dashscope" && settings.seedSupport !== "unsupported")) {
    failX0Execution("seed_support_not_bound");
  }
  return kind;
}

function validateX0Request(request: Readonly<SingleAttemptTextInvokeRequest>, settings: Readonly<X0Settings>): void {
  validateSettings(settings as X0Settings);
  record(request, "request_not_object");
  requireExactKeys(request, ["requestId", "systemPrompt", "userPrompt", "responseFormat", "modelRef", "invocationConfig"], "request_fields");
  if (typeof request.requestId !== "string" || typeof request.systemPrompt !== "string" || typeof request.userPrompt !== "string"
    || request.responseFormat !== "json" || !same(request.modelRef, settings.modelRef)) failX0Execution("request_model_or_format");
  record(request.invocationConfig, "invocation_config_not_object");
  const expectedKeys = settings.seedSupport === "supported"
    ? ["temperature", "maxTokens", "thinking", "seed"]
    : ["temperature", "maxTokens", "thinking"];
  requireExactKeys(request.invocationConfig, expectedKeys, "invocation_config_fields");
  if (request.invocationConfig.temperature !== settings.temperature
    || request.invocationConfig.thinking !== "disabled"
    || !Number.isSafeInteger(request.invocationConfig.maxTokens)
    || (request.invocationConfig.maxTokens as number) < 1
    || (settings.seedSupport === "supported" && (!Number.isSafeInteger(request.invocationConfig.seed) || (request.invocationConfig.seed as number) < 0))) {
    failX0Execution("invocation_config_invalid");
  }
}

/**
 * This is intentionally the raw Zhipu invoker. X0 parses strict JSON itself;
 * a provider adapter must not strip a code fence or repair malformed output.
 */
export function createX0ZhipuRawSingleAttemptInvoker(settings: Readonly<X0Settings>, apiKey: string): SingleAttemptTextInvoker {
  const frozenSettings = immutable(settings);
  if (validateSettings(frozenSettings) !== "zhipu") failX0Execution("zhipu_model_not_bound");
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) failX0Execution("zhipu_api_key_invalid");
  const delegate = createZhipuRawSingleAttemptInvoker("glm-4.5-air", apiKey, "content_only");
  return {
    async invoke(request, signal) {
      assertX0ZhipuRawRequest(request, frozenSettings);
      const result = await delegate.invoke(request, signal);
      if (result.providerMetadata?.model !== "glm-4.5-air" || typeof result.providerMetadata?.requestId !== "string" || result.providerMetadata.requestId.trim().length === 0) {
        failX0Execution("zhipu_response_provenance");
      }
      return result;
    },
  };
}

/** Pure pre-network check; direct tests use this rather than touching a provider. */
export function assertX0ZhipuRawRequest(request: Readonly<SingleAttemptTextInvokeRequest>, settings: Readonly<X0Settings>): void {
  if (validateSettings(settings as X0Settings) !== "zhipu") failX0Execution("zhipu_model_not_bound");
  validateX0Request(request, settings);
}

const DASHSCOPE_HOST_BY_REGION: Readonly<Record<X0DashScopeRegionV1, string>> = Object.freeze({
  "cn-beijing": "cn-beijing.maas.aliyuncs.com",
  "ap-southeast-1": "ap-southeast-1.maas.aliyuncs.com",
});
const X0_DASHSCOPE_MODEL_ID = "qwen3.7-flash-2026-07-15";

function validateDashScopeConnection(connection: Readonly<X0DashScopeConnectionV1>): void {
  record(connection, "dashscope_connection_not_object");
  requireExactKeys(connection, ["region", "workspaceId", "apiKey"], "dashscope_connection_fields");
  if (!Object.hasOwn(DASHSCOPE_HOST_BY_REGION, connection.region)
    || typeof connection.workspaceId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(connection.workspaceId)
    || typeof connection.apiKey !== "string" || connection.apiKey.trim().length === 0) {
    failX0Execution("dashscope_connection_invalid");
  }
}

function dashScopeConnectionRef(connection: Readonly<X0DashScopeConnectionV1>): X0ExecutionConnectionRefV1 {
  validateDashScopeConnection(connection);
  return Object.freeze({
    id: "dashscope-model-studio",
    version: "1.0.0",
    region: connection.region,
    workspaceFingerprint: fingerprintEstimatorValue({ provider: "dashscope-model-studio", region: connection.region, workspaceId: connection.workspaceId }),
  });
}

function dashScopeEndpoint(connection: Readonly<X0DashScopeConnectionV1>): string {
  validateDashScopeConnection(connection);
  return `https://${connection.workspaceId}.${DASHSCOPE_HOST_BY_REGION[connection.region]}/compatible-mode/v1/chat/completions`;
}

function dashScopeUsage(value: unknown): SingleAttemptTextInvokeResult["usage"] | undefined {
  if (value === undefined) return undefined;
  record(value, "dashscope_usage_not_object");
  const metric = (raw: unknown, reason: string): number | undefined => {
    if (raw === undefined) return undefined;
    if (!Number.isSafeInteger(raw) || (raw as number) < 0) failX0Execution(reason);
    return raw as number;
  };
  const promptTokens = metric(value.prompt_tokens, "dashscope_prompt_tokens_invalid");
  const completionTokens = metric(value.completion_tokens, "dashscope_completion_tokens_invalid");
  const totalTokens = metric(value.total_tokens, "dashscope_total_tokens_invalid");
  let cachedPromptTokens: number | undefined;
  if (value.prompt_tokens_details !== undefined) {
    record(value.prompt_tokens_details, "dashscope_cached_tokens_not_object");
    cachedPromptTokens = metric(value.prompt_tokens_details.cached_tokens, "dashscope_cached_tokens_invalid");
  }
  const usage = {
    ...(promptTokens !== undefined ? { promptTokens } : {}),
    ...(completionTokens !== undefined ? { completionTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
    ...(cachedPromptTokens !== undefined ? { cachedPromptTokens } : {}),
  };
  return Object.keys(usage).length === 0 ? undefined : usage;
}

function dashScopeResult(payload: unknown, startedAt: number): SingleAttemptTextInvokeResult {
  record(payload, "dashscope_response_not_object");
  if (payload.model !== X0_DASHSCOPE_MODEL_ID || typeof payload.id !== "string" || payload.id.trim().length === 0
    || !Array.isArray(payload.choices) || payload.choices.length !== 1) {
    failX0Execution("dashscope_response_provenance_or_choices");
  }
  const choice = payload.choices[0];
  record(choice, "dashscope_choice_not_object");
  record(choice.message, "dashscope_message_not_object");
  if (typeof choice.message.content !== "string") failX0Execution("dashscope_content_not_string");
  if (Object.hasOwn(choice.message, "reasoning_content")
    && choice.message.reasoning_content !== null && choice.message.reasoning_content !== "") {
    failX0Execution("dashscope_unexpected_reasoning");
  }
  const usage = dashScopeUsage(payload.usage);
  return {
    rawContent: choice.message.content,
    providerMetadata: { model: payload.model, requestId: payload.id },
    usage: { ...(usage ?? {}), latencyMs: Math.max(0, Date.now() - startedAt) },
  };
}

/** Pure pre-network check for the official snapshot, JSON mode, and disabled thinking. */
export function assertX0DashScopeRawRequest(request: Readonly<SingleAttemptTextInvokeRequest>, settings: Readonly<X0Settings>): void {
  if (validateSettings(settings as X0Settings) !== "dashscope") failX0Execution("dashscope_model_not_bound");
  validateX0Request(request, settings);
  if (!/json/iu.test(`${request.systemPrompt}\n${request.userPrompt}`)) failX0Execution("dashscope_json_prompt_missing");
}

/**
 * Direct, raw, one-request Model Studio boundary. It owns neither env lookup
 * nor routing/fallback configuration; malformed model output reaches X0 intact.
 */
export function createX0DashScopeRawSingleAttemptInvoker(
  settings: Readonly<X0Settings>,
  connection: Readonly<X0DashScopeConnectionV1>,
): SingleAttemptTextInvoker {
  const frozenSettings = immutable(settings);
  const frozenConnection = immutable(connection);
  if (validateSettings(frozenSettings) !== "dashscope") failX0Execution("dashscope_model_not_bound");
  const endpoint = dashScopeEndpoint(frozenConnection);
  return {
    async invoke(request, signal) {
      assertX0DashScopeRawRequest(request, frozenSettings);
      const startedAt = Date.now();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${frozenConnection.apiKey}` },
        body: JSON.stringify({
          model: X0_DASHSCOPE_MODEL_ID,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          temperature: request.invocationConfig.temperature,
          max_tokens: request.invocationConfig.maxTokens,
          n: 1,
          stream: false,
          enable_thinking: false,
          response_format: { type: "json_object" },
        }),
        redirect: "error",
        signal,
      });
      if (!response.ok) failX0Execution(`dashscope_http_${response.status}`);
      let payload: unknown;
      try { payload = await response.json(); } catch { return failX0Execution("dashscope_response_not_json"); }
      return dashScopeResult(payload, startedAt);
    },
  };
}

function validateConnectionRef(settings: X0Settings, ref: X0ExecutionConnectionRefV1): void {
  record(ref, "connection_ref_not_object");
  requireExactKeys(ref, ["id", "version", "region", "workspaceFingerprint"], "connection_ref_fields");
  const kind = validateSettings(settings);
  if (kind === "zhipu") {
    if (!same(ref, X0_ZHIPU_DIRECT_CONNECTION_REF_V1)) failX0Execution("connection_ref_not_bound");
    return;
  }
  if (ref.id !== "dashscope-model-studio" || ref.version !== "1.0.0"
    || !["cn-beijing", "ap-southeast-1"].includes(ref.region ?? "")
    || typeof ref.workspaceFingerprint !== "string" || ref.workspaceFingerprint.length === 0) {
    failX0Execution("connection_ref_not_bound");
  }
}

function validateRequestAgainstManifest(cell: X0Cell, manifest: X0JournalManifestV1): void {
  if (!cell.request) failX0Execution("started_request_missing");
  validateX0Request(cell.request, manifest.settings);
  if (cell.request.requestId !== cell.id || cell.request.invocationConfig.maxTokens !== cell.maxTokens) {
    failX0Execution("started_request_not_planned");
  }
}

function validateEventAgainstPlan(event: X0JournalEventV1, manifest: X0JournalManifestV1, plan: Map<string, X0JournalManifestV1["cellPlan"][number]>, previous: Map<string, X0Cell>): void {
  const expected = plan.get(event.cell.id);
  if (!expected || !same(cellProjection(event.cell), expected)) failX0Execution("event_cell_not_planned");
  if (event.cell.executionInputHash !== manifest.onlineTaskHash) failX0Execution("execution_input_hash_mismatch");
  if (event.status === "started") {
    if (event.cell.status !== "started" || previous.has(event.cell.id) || event.cell.result !== undefined) failX0Execution("started_transition_invalid");
    validateRequestAgainstManifest(event.cell, manifest);
  } else {
    const started = previous.get(event.cell.id);
    if (!started || started.status !== "started" || event.cell.status !== event.status || !same(event.cell.request, started.request)) failX0Execution("terminal_transition_invalid");
    if (event.status === "returned" && (!event.cell.result || typeof event.cell.result.rawContent !== "string")) failX0Execution("returned_result_invalid");
    if (event.status === "unknown" && event.cell.result !== undefined) failX0Execution("unknown_result_invalid");
  }
}

function validateManifest(value: unknown): X0JournalManifestV1 {
  record(value, "manifest_not_object");
  requireExactKeys(value, ["journalRef", "runId", "phase", "settings", "connectionRef", "onlineTaskHash", "planHash", "cellPlan", "genesisHash", "contentHash"], "manifest_fields");
  const manifest = value as unknown as X0JournalManifestV1;
  record(manifest.journalRef, "manifest_ref_not_object");
  if (manifest.journalRef.id !== X0_DURABLE_JOURNAL_V1.id || manifest.journalRef.version !== X0_DURABLE_JOURNAL_V1.version
    || typeof manifest.runId !== "string" || !/^[a-z0-9][a-z0-9_-]{2,63}$/u.test(manifest.runId) || !knownPhase(manifest.phase)
    || typeof manifest.onlineTaskHash !== "string" || typeof manifest.planHash !== "string" || typeof manifest.genesisHash !== "string" || typeof manifest.contentHash !== "string"
    || !Array.isArray(manifest.cellPlan)) failX0Execution("manifest_invalid");
  validateConnectionRef(manifest.settings, manifest.connectionRef);
  const plannedNow = planX0Cells(manifest.phase).map(cellProjection);
  if (!same(manifest.cellPlan, plannedNow) || manifest.planHash !== fingerprintEstimatorValue(plannedNow)) failX0Execution("manifest_plan_drift");
  const body = manifestBody({ journalRef: manifest.journalRef, runId: manifest.runId, phase: manifest.phase, settings: manifest.settings, connectionRef: manifest.connectionRef,
    onlineTaskHash: manifest.onlineTaskHash, planHash: manifest.planHash, cellPlan: manifest.cellPlan });
  if (manifest.genesisHash !== fingerprintEstimatorValue(body) || manifest.contentHash !== fingerprintEstimatorValue({ ...body, genesisHash: manifest.genesisHash })) failX0Execution("manifest_hash_invalid");
  return immutable(manifest);
}

function validateEvent(value: unknown, manifest: X0JournalManifestV1, index: number, priorHash: string, previous: Map<string, X0Cell>): X0JournalEventV1 {
  record(value, "event_not_object");
  requireExactKeys(value, ["journalRef", "eventIndex", "priorEventHash", "status", "cell", "contentHash"], "event_fields");
  const event = value as unknown as X0JournalEventV1;
  record(event.journalRef, "event_ref_not_object");
  if (event.journalRef.id !== manifest.journalRef.id || event.journalRef.version !== manifest.journalRef.version
    || event.eventIndex !== index || event.priorEventHash !== priorHash || !["started", "returned", "unknown"].includes(event.status)
    || typeof event.contentHash !== "string") failX0Execution("event_header_invalid");
  const body = eventBody({ journalRef: event.journalRef, eventIndex: event.eventIndex, priorEventHash: event.priorEventHash, status: event.status, cell: event.cell });
  if (event.contentHash !== fingerprintEstimatorValue(body)) failX0Execution("event_hash_invalid");
  validateEventAgainstPlan(event, manifest, new Map(manifest.cellPlan.map(c => [c.id, c])), previous);
  return clone(event);
}

export async function readX0PersistentJournal(directory: string): Promise<X0RecoveredJournalV1> {
  const resolved = resolve(directory);
  const manifest = validateManifest(JSON.parse(await readFile(resolve(resolved, "manifest.json"), "utf8")));
  const rawJournal = await readFile(resolve(resolved, "journal.jsonl"), "utf8");
  const rawEvents = rawJournal === "" ? [] : rawJournal.trimEnd().split("\n").map(line => JSON.parse(line));
  const events: X0JournalEventV1[] = [];
  const current = new Map<string, X0Cell>();
  let priorHash = manifest.genesisHash;
  rawEvents.forEach((raw, index) => {
    const event = validateEvent(raw, manifest, index, priorHash, current);
    current.set(event.cell.id, clone(event.cell));
    priorHash = event.contentHash;
    events.push(event);
  });
  return immutable({
    manifest,
    events,
    terminalCells: [...current.values()].filter(cell => cell.status !== "started").map(clone),
    unknownAfterInterruption: [...current.values()].filter(cell => cell.status === "started").map(cell => ({ ...cell, status: "unknown" as const, result: undefined })),
  });
}

/**
 * Creates a brand-new, phase-bound journal. There is intentionally no open or
 * resume operation: recover an interrupted directory for analysis, then start
 * a separately authorized new run rather than duplicating a possibly charged cell.
 */
async function createX0PersistentJournal(input: {
  directory: string;
  runId: string;
  phase: X0ExecutionPhase;
  settings: X0Settings;
  connectionRef: X0ExecutionConnectionRefV1;
  onlineTasks: readonly X0Task[];
}): Promise<X0PersistentJournalV1> {
  if (!knownPhase(input.phase) || !/^[a-z0-9][a-z0-9_-]{2,63}$/u.test(input.runId)) failX0Execution("run_identity_invalid");
  validateConnectionRef(input.settings, input.connectionRef);
  const directory = resolve(input.directory);
  if (basename(directory) !== input.runId) failX0Execution("directory_must_end_in_run_id");
  const cellPlan = planX0Cells(input.phase).map(cellProjection);
  const planHash = fingerprintEstimatorValue(cellPlan);
  const onlineTaskHash = fingerprintEstimatorValue(input.onlineTasks);
  const body = { journalRef: X0_DURABLE_JOURNAL_V1, runId: input.runId, phase: input.phase, settings: clone(input.settings), connectionRef: clone(input.connectionRef), onlineTaskHash, planHash, cellPlan };
  const genesisHash = fingerprintEstimatorValue(body);
  const manifest = immutable({ ...body, genesisHash, contentHash: fingerprintEstimatorValue({ ...body, genesisHash }) });
  await mkdir(directory); // Fails closed if a user path already contains a prior/incomplete run.
  try {
    await writeNewSynced(resolve(directory, "manifest.json"), `${JSON.stringify(manifest)}\n`);
    await writeNewSynced(resolve(directory, "journal.jsonl"), "");
  } catch (error) {
    // Do not delete the directory: its partial creation is evidence, and reuse remains forbidden.
    throw error;
  }
  const plan = new Map(cellPlan.map(cell => [cell.id, cell]));
  const current = new Map<string, X0Cell>();
  let eventIndex = 0;
  let priorHash = genesisHash;
  let serial = Promise.resolve();
  const journal: X0Journal = cell => {
    const snapshot = clone(cell);
    const write = async () => {
      const status = snapshot.status;
      if (status !== "started" && status !== "returned" && status !== "unknown") failX0Execution("journal_status_invalid");
      const body = { journalRef: X0_DURABLE_JOURNAL_V1, eventIndex, priorEventHash: priorHash, status, cell: snapshot };
      const event = { ...body, contentHash: fingerprintEstimatorValue(body) } as X0JournalEventV1;
      validateEventAgainstPlan(event, manifest, plan, current);
      await appendSynced(resolve(directory, "journal.jsonl"), `${JSON.stringify(event)}\n`);
      current.set(snapshot.id, clone(snapshot));
      priorHash = event.contentHash;
      eventIndex++;
    };
    const result = serial.then(write);
    serial = result.catch(() => undefined);
    return result;
  };
  const runtime: X0PersistentJournalRuntimeV1 = {
    directory,
    manifest,
    journal,
    read: () => readX0PersistentJournal(directory),
  };
  let bound = false;
  return Object.freeze({
    directory,
    manifest,
    read: runtime.read,
    bindCanary(input: { settings: X0Settings; onlineTasks: readonly X0Task[]; invoker: SingleAttemptTextInvoker }) {
      if (bound) failX0Execution("persistent_already_bound");
      const execution = bindCanaryExecution({ persistent: runtime, ...input });
      bound = true;
      return execution;
    },
  });
}

function immutable<T>(value: T): T {
  const copy = clone(value);
  const freeze = (current: unknown): void => {
    if (current !== null && typeof current === "object") {
      Object.values(current).forEach(freeze);
      Object.freeze(current);
    }
  };
  freeze(copy);
  return copy;
}

/**
 * Construct and validate every canary request before a run directory exists.
 * The probe has no provider boundary and returns deliberately invalid raw text:
 * it exercises input construction without supplying a synthetic pass result.
 */
async function preflightCanaryInputs(
  settings: X0Settings,
  onlineTasks: readonly X0Task[],
  assertRequest: (request: Readonly<SingleAttemptTextInvokeRequest>) => void,
): Promise<{ settings: X0Settings; onlineTasks: readonly X0Task[] }> {
  const frozenSettings = immutable(settings);
  const frozenTasks = immutable(onlineTasks);
  const probe = {
    invoke: async (request: Readonly<SingleAttemptTextInvokeRequest>) => {
      assertRequest(request);
      return { rawContent: "" };
    },
  } satisfies SingleAttemptTextInvoker;
  const publicRun = await runX0PublicPhase({
    settings: frozenSettings,
    online: frozenTasks,
    phase: "canary",
    signal: new AbortController().signal,
    invoker: probe,
    journal: async () => undefined,
  });
  if (!publicRun.closed) failX0Execution("preflight_public_not_closed");
  const sensors = await runX0Sensors({
    publicRun,
    signal: new AbortController().signal,
    invoker: probe,
    journal: async () => undefined,
  });
  if (sensors.length !== planX0Cells("canary").filter(cell => cell.phase === 0 || cell.phase >= 4).length) {
    failX0Execution("preflight_sensor_plan_mismatch");
  }
  return { settings: frozenSettings, onlineTasks: frozenTasks };
}

function bindCanaryExecution(input: {
  persistent: X0PersistentJournalRuntimeV1;
  settings: X0Settings;
  onlineTasks: readonly X0Task[];
  invoker: SingleAttemptTextInvoker;
}): X0BoundCanaryExecutionV1 {
  const settings = immutable(input.settings);
  const onlineTasks = immutable(input.onlineTasks);
  if (input.persistent.manifest.phase !== "canary" || !same(input.persistent.manifest.settings, settings)
    || input.persistent.manifest.onlineTaskHash !== fingerprintEstimatorValue(onlineTasks)) {
    failX0Execution("bound_canary_manifest_mismatch");
  }
  let publicStarted = false;
  let sensorStarted = false;
  let publicRun: X0PublicRun | null = null;
  return Object.freeze({
    directory: input.persistent.directory,
    manifest: input.persistent.manifest,
    read: input.persistent.read,
    async runPublic(signal: AbortSignal) {
      if (publicStarted) failX0Execution("bound_public_already_attempted");
      publicStarted = true;
      const run = await runX0PublicPhase({
        online: onlineTasks,
        phase: "canary",
        settings,
        invoker: input.invoker,
        journal: input.persistent.journal,
        signal,
      });
      publicRun = run;
      return run;
    },
    async runSensors(signal: AbortSignal) {
      if (!publicRun) failX0Execution("bound_sensors_before_public");
      if (sensorStarted) failX0Execution("bound_sensors_already_attempted");
      sensorStarted = true;
      return runX0Sensors({ publicRun, invoker: input.invoker, journal: input.persistent.journal, signal });
    },
  });
}

/**
 * Explicit, no-env GLM constructor. It validates its provider binding and all
 * X0 inputs before creating even an empty run directory.
 */
export async function createX0ZhipuCanaryExecution(input: {
  directory: string;
  runId: string;
  settings: X0Settings;
  onlineTasks: readonly X0Task[];
  apiKey: string;
}): Promise<X0BoundCanaryExecutionV1> {
  const candidateSettings = immutable(input.settings);
  const invoker = createX0ZhipuRawSingleAttemptInvoker(candidateSettings, input.apiKey);
  const frozen = await preflightCanaryInputs(candidateSettings, input.onlineTasks, request => assertX0ZhipuRawRequest(request, candidateSettings));
  const persistent = await createX0PersistentJournal({
    directory: input.directory,
    runId: input.runId,
    phase: "canary",
    settings: frozen.settings,
    connectionRef: X0_ZHIPU_DIRECT_CONNECTION_REF_V1,
    onlineTasks: frozen.onlineTasks,
  });
  return persistent.bindCanary({ ...frozen, invoker });
}

/**
 * Explicit, direct Model Studio canary constructor. It accepts no relay URL,
 * environment lookup, model override, fallback, retry, or resume path.
 */
export async function createX0DashScopeCanaryExecution(input: {
  directory: string;
  runId: string;
  settings: X0Settings;
  onlineTasks: readonly X0Task[];
  connection: X0DashScopeConnectionV1;
}): Promise<X0BoundCanaryExecutionV1> {
  const candidateSettings = immutable(input.settings);
  const candidateConnection = immutable(input.connection);
  const invoker = createX0DashScopeRawSingleAttemptInvoker(candidateSettings, candidateConnection);
  const connectionRef = dashScopeConnectionRef(candidateConnection);
  const frozen = await preflightCanaryInputs(candidateSettings, input.onlineTasks, request => assertX0DashScopeRawRequest(request, candidateSettings));
  const persistent = await createX0PersistentJournal({
    directory: input.directory,
    runId: input.runId,
    phase: "canary",
    settings: frozen.settings,
    connectionRef,
    onlineTasks: frozen.onlineTasks,
  });
  return persistent.bindCanary({ ...frozen, invoker });
}
