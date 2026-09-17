/**
 * GLM-4.6V two-arm cross-model gate runner.
 *
 * Second-paper Stage A: pre-specified prospective cross-model replication
 * gate. The first paper remains frozen and is not automatically amended by
 * this result. This is a pre-specified cross-model replication / robustness
 * gate, NOT the original confirmatory experiment.
 *
 * It reuses the frozen fork machinery (same-state fork, round1StateHash,
 * canonical final parser, Brier semantics) with:
 *   1. arms = CONTROL + ATTACKS only — SUPPORTS is never constructed or run;
 *   2. every Zhipu request is a TRUE single attempt (callZhipuOnce; no retry
 *      envelope anywhere) with explicit max_tokens and thinking disabled;
 *   3. a versioned forkInputHashV1 per (task, seed), identical for both arms;
 *   4. Plan V3 frozen as plan.json (fail-closed, non-overwritable). The
 *      hashed plan holds only repository-relative artifact paths / stable
 *      experiment identity — the same plan builds byte-identically on any
 *      machine or checkout path (absolute machine paths are non-authoritative
 *      runtime metadata in execution.json, never part of the plan hash);
 *   5. an execution.json identity frozen BEFORE the first provider call
 *      (git commit, source bundle hash, runner config hash, plan hash);
 *   6. an append-only attempts.jsonl execution/attempt ledger: one started +
 *      one finished line per physical provider attempt, written before/after
 *      the request. Cross-process recovery rebuilds cumulative calls/tokens
 *      from the ledger — the budget never resets, failed/interrupted attempts
 *      are never re-sent, and incomplete tasks are marked failed (not re-run);
 *   7. completed + failed + skipped task statuses always partition the 44
 *      planned tasks exactly;
 *   8. a directory-level verifier (V2) with internal consistency checks:
 *      finalAgentBeliefs-derived statistics, raw-response hashes, manifest/
 *      plan/execution/ledger/summary hashes, task coverage.
 *
 * Token budget semantics (see GLM46V_TOKEN_STOP_THRESHOLD):
 *   - planned logical calls: 865; physical attempts: ledger-observed;
 *   - 5.2M is a STOP THRESHOLD on observed KNOWN usage, not a mathematical
 *     hard ceiling: the in-flight request may overshoot by one attempt, and
 *     failed / no-usage calls carry unknown usage (never encoded as zero);
 *   - quota 6.0M; recovery never resets the budget or grants extra quota.
 *
 * Output lands in a SEPARATE V3 directory (V1/V2 plan.json files are
 * historical and are never touched):
 *   experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-v3-20260820
 *
 * Usage:
 *   npx tsx experiments/campaign/v6/run_v6_fork_glm46v_two_arm.ts --plan
 *   npx tsx experiments/campaign/v6/run_v6_fork_glm46v_two_arm.ts --replay
 *   npx tsx experiments/campaign/v6/run_v6_fork_glm46v_two_arm.ts --execute
 *   (--execute requires RUN_AUTHORIZED=yes and a real ZHIPU_API_KEY; it spends
 *   quota and was NOT run during gate preparation.)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import { listHiddenBenchTaskCatalogV1, createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import { V6ProviderCallBudget } from "./run_v6_smoke";
import { ProviderExecutionHaltError } from "../../../src/lib/experimentation";
import {
  FORK_CONFIRMATORY_TASK_IDS,
  forkPlannedCallsForRunV1,
  forkRunId,
  forkRunPath,
  runFork,
  type ForkArm,
  type ForkRow,
} from "./run_v6_fork";
import { V6ProviderInvocationError } from "./providerDiagnostics";
import { FINAL_ELICITATION_ADAPTER_REQUEST_V1 } from "../../../src/lib/experimentation/finalElicitationAdapter";
import { FINAL_ELICITATION_PROMPT_V1, FINAL_ELICITATION_RESPONSE_SCHEMA_V1 } from "../../../src/lib/experimentation/finalOutcome";
import type { SingleAttemptTextInvoker, SingleAttemptTextInvokeRequest } from "./providerAdapters";

// ---------------------------------------------------------------------------
// Frozen gate constants (Plan V3)
// ---------------------------------------------------------------------------

export const GLM46V_MODEL = "zhipu:glm-4.6v";
export const GLM46V_MODEL_ID = "glm-4.6v";
export const GLM46V_SEEDS: readonly number[] = [0];
export const GLM46V_ARMS: readonly ForkArm[] = ["CONTROL", "ATTACKS"];
/**
 * Repository-relative artifact directory. The ONLY path inside the hashed
 * plan; absolute machine paths never enter the plan hash (cross-machine
 * reproducibility). The V1 output directory is historical and untouched.
 */
export const GLM46V_ARTIFACT_PATH = "experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-v3-20260820";
export const GLM46V_ANALYSIS_SPEC_PATH = "docs/experiments/GLM46V_CROSS_MODEL_REPLICATION_ANALYSIS_FREEZE_V1.md";
/** Runtime metadata only (non-authoritative): resolved against the current cwd. */
export const GLM46V_OUTPUT_DIR = path.resolve(process.cwd(), GLM46V_ARTIFACT_PATH);
/**
 * Token STOP THRESHOLD (5.2M of the 6.0M user quota; ~800k margin) on OBSERVED
 * KNOWN usage. NOT a hard ceiling: the request already in flight may push
 * observed usage one attempt past the threshold (bounded overshoot), and
 * failed / no-usage calls carry unknown usage (never zero).
 */
export const GLM46V_TOKEN_STOP_THRESHOLD = 5_200_000;
/** Informational per-call estimate. Only for planning. */
export const GLM46V_PER_CALL_TOKEN_ESTIMATE = 5_875;
/** Explicit provider-side output caps — never the model default. */
export const GLM46V_DISCUSSION_MAX_TOKENS = 768;
export const GLM46V_FINAL_MAX_TOKENS = 256;
/** Reasoning must be explicitly off on every call; nothing may rely on defaults. */
export const GLM46V_THINKING = "disabled" as const;
export const GLM46V_CONCURRENCY = 1;
export const GLM46V_PROVIDER_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
export const GLM46V_TOTAL_TOKEN_QUOTA = 6_000_000;

export const GLM46V_DISCUSSION_INVOCATION = Object.freeze({
  maxTokens: GLM46V_DISCUSSION_MAX_TOKENS,
  thinking: GLM46V_THINKING,
});
export const GLM46V_FINAL_INVOCATION = Object.freeze({
  maxTokens: GLM46V_FINAL_MAX_TOKENS,
  thinking: GLM46V_THINKING,
});

export const GLM46V_TWO_ARM_PLAN_REF = Object.freeze({
  id: "swarmalpha.experiment.v6-fork-glm46v-twoarm-plan-v3",
  version: "1.0.0",
});

/**
 * Task 14 already has a stored GLM-4.6V seed-0 CONTROL/ATTACKS fork outcome
 * from the 2026-08-16 engineering xval. It is therefore development/canary
 * only for this model and is excluded from the prospective replication set.
 */
export const GLM46V_PREVIOUSLY_OBSERVED_TASK_IDS: readonly number[] = Object.freeze([14]);
export const GLM46V_PROSPECTIVE_TASK_IDS: readonly number[] = Object.freeze(
  FORK_CONFIRMATORY_TASK_IDS.filter(taskId => !GLM46V_PREVIOUSLY_OBSERVED_TASK_IDS.includes(taskId)),
);
export const GLM46V_TWO_ARM_MANIFEST_REF = Object.freeze({
  id: "swarmalpha.experiment.v6-fork-glm46v-twoarm-manifest-v2",
  version: "1.0.0",
});
export const GLM46V_TWO_ARM_SUMMARY_REF = Object.freeze({
  id: "swarmalpha.experiment.v6-fork-glm46v-twoarm-summary-v2",
  version: "1.0.0",
});
export const GLM46V_TWO_ARM_EXECUTION_REF = Object.freeze({
  id: "swarmalpha.experiment.v6-fork-glm46v-twoarm-execution",
  version: "1.0.0",
});
export const GLM46V_ATTEMPTS_LEDGER_REF = Object.freeze({
  id: "swarmalpha.experiment.v6-fork-glm46v-twoarm-attempts-ledger",
  version: "1.0.0",
});

function sha256Text(s: string): string {
  return `sha256:${createHash("sha256").update(s, "utf8").digest("hex")}`;
}

function canonicalize(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (ancestors.has(value as object)) throw new Error("cannot canonicalize a cyclic value");
  const next = new Set(ancestors);
  next.add(value as object);
  if (Array.isArray(value)) return value.map(entry => canonicalize(entry, next));
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map(key => [key, canonicalize(record[key], next)]));
}

function hashCanonical(value: unknown): string {
  return sha256Text(JSON.stringify(canonicalize(value)));
}

export function computeGlm46vAnalysisSpecHash(): string {
  return sha256Text(fs.readFileSync(path.resolve(process.cwd(), GLM46V_ANALYSIS_SPEC_PATH), "utf8"));
}

// ---------------------------------------------------------------------------
// Plan V3 — the SINGLE call authority (precise per-task agent counts),
// machine-independent (no absolute paths in the hashed body).
// ---------------------------------------------------------------------------

export interface Glm46vTwoArmPlanV3 {
  planSchemaRef: { id: string; version: string };
  model: string;
  taskIds: number[];
  seeds: number[];
  arms: ForkArm[];
  totalRuns: number;
  /** Precise planned provider calls: round-1 once + 2 arms × (round-2 + final), per real agent count. */
  plannedProviderCalls: number;
  perCallTokenEstimate: number;
  /** Planned estimate only (informational); the stop threshold governs stopping. */
  plannedEstimateTokens: number;
  /** Stop threshold on observed known usage; possible one-attempt overshoot and unknown failure usage are NOT covered by it. */
  tokenStopThreshold: number;
  totalTokenQuota: number;
  estimateWithinStopThreshold: boolean;
  discussionMaxTokens: number;
  finalMaxTokens: number;
  thinking: "disabled";
  concurrency: number;
  /** Repository-relative artifact directory (stable experiment identity; cross-machine identical). */
  artifactPath: string;
  /** Frozen analysis rules are content-addressed by the scientific plan. */
  analysisSpec: { path: string; contentHash: string };
  createdAt: string;
  contentHash: string;
}

export function buildGlm46vTwoArmPlanV3(): Glm46vTwoArmPlanV3 {
  const taskIds = [...GLM46V_PROSPECTIVE_TASK_IDS];
  const taskSet = new Set(taskIds);
  // Precise per-task roster sizes from the pinned catalog authority.
  const catalog = listHiddenBenchTaskCatalogV1();
  let plannedProviderCalls = 0;
  for (const entry of catalog) {
    if (!taskSet.has(entry.sourceTaskId)) continue;
    plannedProviderCalls += entry.agentCount + GLM46V_ARMS.length * entry.agentCount * 2;
  }
  const plannedEstimateTokens = plannedProviderCalls * GLM46V_PER_CALL_TOKEN_ESTIMATE;
  const body: Omit<Glm46vTwoArmPlanV3, "contentHash"> = {
    planSchemaRef: { ...GLM46V_TWO_ARM_PLAN_REF },
    model: GLM46V_MODEL,
    taskIds,
    seeds: [...GLM46V_SEEDS],
    arms: [...GLM46V_ARMS],
    totalRuns: taskIds.length * GLM46V_SEEDS.length,
    plannedProviderCalls,
    perCallTokenEstimate: GLM46V_PER_CALL_TOKEN_ESTIMATE,
    plannedEstimateTokens,
    tokenStopThreshold: GLM46V_TOKEN_STOP_THRESHOLD,
    totalTokenQuota: GLM46V_TOTAL_TOKEN_QUOTA,
    estimateWithinStopThreshold: plannedEstimateTokens <= GLM46V_TOKEN_STOP_THRESHOLD,
    discussionMaxTokens: GLM46V_DISCUSSION_MAX_TOKENS,
    finalMaxTokens: GLM46V_FINAL_MAX_TOKENS,
    thinking: GLM46V_THINKING,
    concurrency: GLM46V_CONCURRENCY,
    artifactPath: GLM46V_ARTIFACT_PATH,
    analysisSpec: {
      path: GLM46V_ANALYSIS_SPEC_PATH,
      contentHash: computeGlm46vAnalysisSpecHash(),
    },
    createdAt: "2026-08-20T00:00:00.000Z",
  };
  return { ...body, contentHash: hashCanonical(body) };
}

/** Recompute a plan's contentHash from its body (the recorded field excluded). */
export function recomputeGlm46vPlanHash(plan: Glm46vTwoArmPlanV3): string {
  const { contentHash: _recorded, ...body } = plan;
  return hashCanonical(body);
}

/**
 * Freeze the plan as an immutable JSON file before any execution. Fail-closed:
 * an existing plan must be byte-identical (same contentHash, and the recorded
 * hash must recompute from the body) or the freeze refuses to overwrite it.
 */
export function freezeGlm46vTwoArmPlanV3(outputDir: string = GLM46V_OUTPUT_DIR): Glm46vTwoArmPlanV3 {
  const plan = buildGlm46vTwoArmPlanV3();
  const target = path.join(outputDir, "plan.json");
  const text = `${JSON.stringify(plan, null, 2)}\n`;
  if (fs.existsSync(target)) {
    const existing = JSON.parse(fs.readFileSync(target, "utf8")) as Glm46vTwoArmPlanV3;
    if (existing.contentHash !== plan.contentHash) {
      throw new Error("glm46v_plan_no_replace_conflict: frozen plan.json differs from current constants; refusing to overwrite");
    }
    if (recomputeGlm46vPlanHash(existing) !== existing.contentHash) {
      throw new Error("glm46v_plan_no_replace_conflict: frozen plan.json body no longer matches its recorded contentHash; refusing to overwrite");
    }
  } else {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(target, text, { flag: "wx" });
  }
  return plan;
}

/** Load the frozen plan; refuses to run when the plan is missing or stale relative to current constants. */
export function loadGlm46vTwoArmPlanV3(outputDir: string = GLM46V_OUTPUT_DIR): Glm46vTwoArmPlanV3 {
  const target = path.join(outputDir, "plan.json");
  if (!fs.existsSync(target)) {
    throw new Error("glm46v_plan_not_frozen: run --plan first");
  }
  const plan = JSON.parse(fs.readFileSync(target, "utf8")) as Glm46vTwoArmPlanV3;
  const rebuilt = buildGlm46vTwoArmPlanV3();
  if (plan.contentHash !== rebuilt.contentHash) {
    throw new Error("glm46v_plan_freeze_mismatch: frozen plan.json no longer matches current runner constants");
  }
  if (recomputeGlm46vPlanHash(plan) !== plan.contentHash) {
    throw new Error("glm46v_plan_freeze_mismatch: frozen plan.json body no longer matches its recorded contentHash");
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Execution identity — frozen BEFORE the first provider call.
// ---------------------------------------------------------------------------

export interface Glm46vTwoArmExecutionV1 {
  executionSchemaRef: { id: string; version: string };
  planHash: string;
  model: string;
  providerEndpoint: string;
  gitCommit: string | null;
  worktreeDirty: boolean;
  /** sha256 over the FORMAL execution-shaping source files; recorded when the worktree is dirty or git is unavailable. */
  sourceBundleHash: string | null;
  runnerConfigHash: string;
  promptSchemaRefs: Record<string, { id: string; version: string }>;
  startedAt: string;
  contentHash: string;
}

const SOURCE_BUNDLE_FILES = [
  "src/lib/llm/providers.ts",
  "src/lib/epistemic/contracts.ts",
  "src/lib/experimentation/finalOutcome.ts",
  "src/lib/experimentation/finalElicitationAdapter.ts",
  "experiments/campaign/v6/zhipuSingleAttemptInvoker.ts",
  "experiments/campaign/v6/providerAdapters.ts",
  "experiments/campaign/v6/providerDiagnostics.ts",
  "experiments/campaign/v6/productionVerticalSlice.ts",
  "experiments/campaign/v6/hiddenBenchTaskAdapter.ts",
  "experiments/campaign/v6/v6TaskManifest.ts",
  "experiments/campaign/v6/deepseekSingleAttemptInvoker.ts",
  "experiments/campaign/v6/run_v6_fork.ts",
  "experiments/campaign/v6/run_v6_fork_glm46v_two_arm.ts",
];

export function computeGlm46vSourceBundleHash(): string {
  const parts = SOURCE_BUNDLE_FILES.map(file => {
    const text = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    return `${file}\n${text}`;
  });
  return sha256Text(parts.join("\n<file>\n"));
}

export function computeGlm46vRunnerConfigHash(): string {
  return sha256Text(JSON.stringify({
    model: GLM46V_MODEL,
    modelId: GLM46V_MODEL_ID,
    seeds: [...GLM46V_SEEDS],
    arms: [...GLM46V_ARMS],
    tokenStopThreshold: GLM46V_TOKEN_STOP_THRESHOLD,
    perCallTokenEstimate: GLM46V_PER_CALL_TOKEN_ESTIMATE,
    discussionMaxTokens: GLM46V_DISCUSSION_MAX_TOKENS,
    finalMaxTokens: GLM46V_FINAL_MAX_TOKENS,
    thinking: GLM46V_THINKING,
    concurrency: GLM46V_CONCURRENCY,
    providerEndpoint: GLM46V_PROVIDER_ENDPOINT,
    discussionInvocation: GLM46V_DISCUSSION_INVOCATION,
    finalInvocation: GLM46V_FINAL_INVOCATION,
    planSchemaRef: GLM46V_TWO_ARM_PLAN_REF,
  }));
}

export interface Glm46vRepoStateV1 {
  gitCommit: string | null;
  worktreeDirty: boolean;
}

/** Read-only git identity; falls back to {null, dirty} when git is unavailable. */
export function detectGlm46vRepoState(): Glm46vRepoStateV1 {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    let dirty = false;
    try {
      dirty = execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
      }).trim().length > 0;
    } catch {
      dirty = true;
    }
    return { gitCommit: commit.length > 0 ? commit : null, worktreeDirty: dirty };
  } catch {
    return { gitCommit: null, worktreeDirty: true };
  }
}

export function buildGlm46vTwoArmExecutionV1(input: {
  plan: Glm46vTwoArmPlanV3;
  repoState: Glm46vRepoStateV1;
  startedAt: string;
}): Glm46vTwoArmExecutionV1 {
  const sourceBundleHash = input.repoState.worktreeDirty || input.repoState.gitCommit === null
    ? computeGlm46vSourceBundleHash()
    : null;
  const body: Omit<Glm46vTwoArmExecutionV1, "contentHash"> = {
    executionSchemaRef: { ...GLM46V_TWO_ARM_EXECUTION_REF },
    planHash: input.plan.contentHash,
    model: GLM46V_MODEL,
    providerEndpoint: GLM46V_PROVIDER_ENDPOINT,
    gitCommit: input.repoState.gitCommit,
    worktreeDirty: input.repoState.worktreeDirty,
    sourceBundleHash,
    runnerConfigHash: computeGlm46vRunnerConfigHash(),
    promptSchemaRefs: {
      discussionPrompt: { id: "swarmalpha.v6.fork-discussion-prompt", version: "1.0.0" },
      discussionRequestSchema: { id: "swarmalpha.v6.discussion-request", version: "1.0.0" },
      beliefParser: { id: "swarmalpha.v6.belief-json-parser", version: "1.0.0" },
      finalPrompt: { ...FINAL_ELICITATION_PROMPT_V1 },
      finalRequestSchema: { ...FINAL_ELICITATION_ADAPTER_REQUEST_V1 },
      finalResponseSchema: { ...FINAL_ELICITATION_RESPONSE_SCHEMA_V1 },
    },
    startedAt: input.startedAt,
  };
  return { ...body, contentHash: hashCanonical(body) };
}

export function recomputeGlm46vExecutionHash(execution: Glm46vTwoArmExecutionV1): string {
  const { contentHash: _recorded, ...body } = execution;
  return hashCanonical(body);
}

/**
 * Freeze the execution identity BEFORE the first provider call (wx /
 * content-identical fail-closed; never overwritten later).
 */
export function freezeGlm46vTwoArmExecutionV1(
  outputDir: string,
  execution: Glm46vTwoArmExecutionV1,
): Glm46vTwoArmExecutionV1 {
  const target = path.join(outputDir, "execution.json");
  const text = `${JSON.stringify(execution, null, 2)}\n`;
  if (fs.existsSync(target)) {
    const existing = JSON.parse(fs.readFileSync(target, "utf8")) as Glm46vTwoArmExecutionV1;
    if (recomputeGlm46vExecutionHash(existing) !== existing.contentHash) {
      throw new Error("glm46v_execution_corrupt: execution.json contentHash does not recompute");
    }
    if (existing.contentHash !== execution.contentHash) {
      throw new Error("glm46v_execution_no_replace_conflict: execution.json is frozen and differs; refusing to overwrite");
    }
  } else {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(target, text, { flag: "wx" });
  }
  return execution;
}

/**
 * Load + validate the frozen execution identity. Rejects BEFORE any provider
 * call when the plan hash or the runner config hash no longer match.
 */
export function loadGlm46vTwoArmExecutionV1(
  outputDir: string,
  plan: Glm46vTwoArmPlanV3,
): Glm46vTwoArmExecutionV1 {
  const target = path.join(outputDir, "execution.json");
  if (!fs.existsSync(target)) {
    throw new Error("glm46v_execution_not_frozen: execution identity must be frozen before the first provider call");
  }
  const execution = JSON.parse(fs.readFileSync(target, "utf8")) as Glm46vTwoArmExecutionV1;
  if (recomputeGlm46vExecutionHash(execution) !== execution.contentHash) {
    throw new Error("glm46v_execution_corrupt: execution.json contentHash does not recompute");
  }
  if (execution.planHash !== plan.contentHash) {
    throw new Error("glm46v_execution_plan_mismatch: frozen execution binds a different plan");
  }
  if (execution.runnerConfigHash !== computeGlm46vRunnerConfigHash()) {
    throw new Error("glm46v_execution_config_mismatch: runner source/config no longer match the frozen execution identity");
  }
  return execution;
}

// ---------------------------------------------------------------------------
// Attempts ledger — append-only, single writer (concurrency = 1).
// One started + one finished line per PHYSICAL provider attempt.
// ---------------------------------------------------------------------------

export type Glm46vLedgerPhase = "discussion_r1" | "discussion_r2" | "final";

export interface Glm46vAttemptStartedV1 {
  type: "attempt_started";
  attemptId: string;
  requestHash: string;
  requestId: string;
  runId: string;
  taskId: number;
  seed: number;
  phase: Glm46vLedgerPhase;
  arm?: ForkArm;
  agentId: string;
  ts: string;
}

export interface Glm46vAttemptFinishedV1 {
  type: "attempt_finished";
  attemptId: string;
  outcome: "success" | "provider_failure" | "aborted_unknown";
  /** Provider usage; null = usage_unknown (never encoded as zero). */
  usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null;
  rawResponseHash?: string;
  errorCode?: string;
  ts: string;
}

export interface Glm46vTaskFailedV1 {
  type: "task_failed";
  runId: string;
  taskId: number;
  seed: number;
  reason: string;
  ts: string;
}

export type Glm46vLedgerEventV1 = Glm46vAttemptStartedV1 | Glm46vAttemptFinishedV1 | Glm46vTaskFailedV1;

export interface Glm46vLedgerScanV1 {
  events: Glm46vLedgerEventV1[];
  /** started attempts with no finished line (crashed mid-request). */
  unfinishedAttemptIds: string[];
  /** count of finished attempts (physical provider attempts). */
  physicalAttempts: number;
  /** sum of KNOWN usage over finished attempts. */
  observedTokens: number;
  /** finished attempts with null usage. */
  unknownUsageCalls: number;
  /** runIds with at least one finished attempt. */
  runsAttempted: string[];
  /** runIds with a task_failed event. */
  failedRunIds: string[];
}

export function appendGlm46vLedgerEvent(outputDir: string, event: Glm46vLedgerEventV1): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.appendFileSync(
    path.join(outputDir, "attempts.jsonl"),
    `${JSON.stringify(event)}\n`,
    "utf8",
  );
}

export function readGlm46vLedgerEvents(outputDir: string): Glm46vLedgerEventV1[] {
  const ledgerPath = path.join(outputDir, "attempts.jsonl");
  if (!fs.existsSync(ledgerPath)) return [];
  const events: Glm46vLedgerEventV1[] = [];
  const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(line => line.trim().length > 0);
  for (const line of lines) {
    let event: Glm46vLedgerEventV1;
    try {
      event = JSON.parse(line) as Glm46vLedgerEventV1;
    } catch {
      throw new Error("glm46v_ledger_corrupt: attempts.jsonl contains a non-JSON line");
    }
    if (event === null || typeof event !== "object" || typeof event.type !== "string"
      || (event.type !== "attempt_started" && event.type !== "attempt_finished" && event.type !== "task_failed")) {
      throw new Error("glm46v_ledger_corrupt: attempts.jsonl contains an unknown event type");
    }
    events.push(event);
  }
  return events;
}

export function scanGlm46vLedgerEvents(events: readonly Glm46vLedgerEventV1[]): Glm46vLedgerScanV1 {
  const started = new Set<string>();
  const finished = new Map<string, Glm46vAttemptFinishedV1>();
  const failedRunIds = new Set<string>();
  const runsAttempted = new Set<string>();
  for (const event of events) {
    if (event.type === "attempt_started") {
      if (started.has(event.attemptId)) throw new Error(`glm46v_ledger_corrupt: duplicate attempt_started ${event.attemptId}`);
      started.add(event.attemptId);
    } else if (event.type === "attempt_finished") {
      if (finished.has(event.attemptId)) throw new Error(`glm46v_ledger_corrupt: duplicate attempt_finished ${event.attemptId}`);
      finished.set(event.attemptId, event);
    } else {
      failedRunIds.add(event.runId);
    }
  }
  for (const event of events) {
    if (event.type === "attempt_finished") {
      if (!started.has(event.attemptId)) {
        throw new Error(`glm46v_ledger_corrupt: attempt_finished ${event.attemptId} has no attempt_started`);
      }
    }
  }
  for (const event of events) {
    if (event.type === "attempt_started") {
      if (finished.has(event.attemptId)) runsAttempted.add(event.runId);
    }
  }
  const unfinishedAttemptIds = [...started].filter(id => !finished.has(id));
  let physicalAttempts = 0;
  let observedTokens = 0;
  let unknownUsageCalls = 0;
  for (const event of finished.values()) {
    physicalAttempts += 1;
    if (event.usage === null) {
      unknownUsageCalls += 1;
    } else {
      observedTokens += event.usage.totalTokens ?? 0;
      if (event.usage.totalTokens === undefined) unknownUsageCalls += 1;
    }
  }
  return {
    events: [...events],
    unfinishedAttemptIds,
    physicalAttempts,
    observedTokens,
    unknownUsageCalls,
    runsAttempted: [...runsAttempted],
    failedRunIds: [...failedRunIds],
  };
}

export function readGlm46vLedgerScan(outputDir: string): Glm46vLedgerScanV1 {
  return scanGlm46vLedgerEvents(readGlm46vLedgerEvents(outputDir));
}

function parseGlm46vRequestIdentity(requestId: string): { phase: Glm46vLedgerPhase; arm?: ForkArm; agentId: string } {
  if (requestId.startsWith("final:")) {
    const parts = requestId.slice("final:".length).split(":");
    // final:fork:task-14:seed-0:CONTROL:agent:hiddenbench:14:1
    if (parts.length < 8) throw new Error(`cannot parse final requestId: ${requestId}`);
    return { phase: "final", arm: parts[3] as ForkArm, agentId: parts.slice(4).join(":") };
  }
  if (requestId.startsWith("discussion:")) {
    const parts = requestId.slice("discussion:".length).split(":");
    // discussion:fork:task-14:seed-0:r1:agent:hiddenbench:14:1
    // discussion:fork:task-14:seed-0:CONTROL:r2:agent:hiddenbench:14:1
    if (parts[3] === "r1") {
      if (parts.length < 8) throw new Error(`cannot parse discussion requestId: ${requestId}`);
      return { phase: "discussion_r1", agentId: parts.slice(4).join(":") };
    }
    if (parts[4] === "r2") {
      return { phase: "discussion_r2", arm: parts[3] as ForkArm, agentId: parts.slice(5).join(":") };
    }
    throw new Error(`cannot parse discussion requestId: ${requestId}`);
  }
  throw new Error(`unknown requestId shape: ${requestId}`);
}

/**
 * Ledger-metered invoker: one started + one finished ledger line per physical
 * provider attempt. The started line is appended BEFORE the request; the
 * finished line records success / provider_failure with usage or explicit
 * usage_unknown. Budget halts propagate (the finished line is already on
 * disk); provider failures are recorded and rethrown (never re-sent on
 * recovery). One logical call == at most one provider attempt.
 */
function createGlm46vLedgerMeter(input: {
  delegate: SingleAttemptTextInvoker;
  budget: V6ProviderCallBudget;
  outputDir: string;
  currentRun: () => { runId: string; innerRunId: string; taskId: number; seed: number };
  nextSeq: () => number;
  clock: () => string;
}): SingleAttemptTextInvoker {
  return {
    async invoke(request: Readonly<SingleAttemptTextInvokeRequest>, signal: AbortSignal) {
      const run = input.currentRun();
      const kind = request.requestId.startsWith("final:") ? "final" : "discussion";
      if (!request.requestId.startsWith(`${kind}:${run.innerRunId}:`)) {
        throw new Error(`glm46v_ledger_run_mismatch: requestId ${request.requestId} does not belong to run ${run.innerRunId}`);
      }
      const identity = parseGlm46vRequestIdentity(request.requestId);
      const requestHash = sha256Text(JSON.stringify(canonicalize(request)));
      // Gate first: an exhausted budget never writes a ledger line or issues a request.
      input.budget.beforeProviderCall();
      const attemptId = `${run.runId}:${input.nextSeq()}`;
      appendGlm46vLedgerEvent(input.outputDir, {
        type: "attempt_started",
        attemptId,
        requestHash,
        requestId: request.requestId,
        runId: run.runId,
        taskId: run.taskId,
        seed: run.seed,
        phase: identity.phase,
        ...(identity.arm !== undefined ? { arm: identity.arm } : {}),
        agentId: identity.agentId,
        ts: input.clock(),
      });
      let result;
      try {
        result = await input.delegate.invoke(request, signal);
      } catch (error) {
        appendGlm46vLedgerEvent(input.outputDir, {
          type: "attempt_finished",
          attemptId,
          outcome: "provider_failure",
          usage: null,
          ...(error instanceof V6ProviderInvocationError ? { errorCode: error.code } : {}),
          ts: input.clock(),
        });
        throw error;
      }
      appendGlm46vLedgerEvent(input.outputDir, {
        type: "attempt_finished",
        attemptId,
        outcome: "success",
        usage: result.usage?.totalTokens !== undefined
          ? {
              ...(result.usage.promptTokens !== undefined ? { promptTokens: result.usage.promptTokens } : {}),
              ...(result.usage.completionTokens !== undefined ? { completionTokens: result.usage.completionTokens } : {}),
              totalTokens: result.usage.totalTokens,
            }
          : null,
        ...(result.rawContent !== undefined ? { rawResponseHash: sha256Text(result.rawContent) } : {}),
        ts: input.clock(),
      });
      // Account known usage AFTER the ledger line; a bounded overshoot halts here.
      if (result.usage?.totalTokens !== undefined) {
        input.budget.recordProviderUsage({
          ...(result.usage.promptTokens !== undefined ? { promptTokens: result.usage.promptTokens } : {}),
          ...(result.usage.completionTokens !== undefined ? { completionTokens: result.usage.completionTokens } : {}),
          totalTokens: result.usage.totalTokens,
        });
      }
      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// Manifest V2 — binds plan, execution identity, ledger, and files.
// ---------------------------------------------------------------------------

export interface Glm46vTwoArmManifestFileV1 {
  runId: string;
  taskId: number;
  seed: number;
  fileName: string;
  rowCount: number;
  contentHash: string;
  forkInputHashV1: string;
}

export type Glm46vTaskStatus = "completed" | "failed" | "skipped";

export interface Glm46vTaskStatusEntryV1 {
  runId: string;
  taskId: number;
  seed: number;
  status: Glm46vTaskStatus;
  reason?: string;
}

export interface Glm46vTwoArmManifestV2 {
  manifestSchemaRef: { id: string; version: string };
  experimentRef: { id: string; version: string };
  /** Exact frozen plan, embedded, plus its hash. */
  plan: Glm46vTwoArmPlanV3;
  planHash: string;
  executionHash: string;
  /** sha256 of attempts.jsonl at completion time. */
  ledgerHash: string;
  taskIds: number[];
  seeds: number[];
  arms: ForkArm[];
  taskStatus: Glm46vTaskStatusEntryV1[];
  startedAt: string;
  completedAt: string;
  files: Glm46vTwoArmManifestFileV1[];
  totalRuns: number;
  totalRows: number;
  contentHash: string;
}

export function buildGlm46vTwoArmManifestV2(input: {
  plan: Glm46vTwoArmPlanV3;
  execution: Glm46vTwoArmExecutionV1;
  ledgerHash: string;
  taskStatus: Glm46vTaskStatusEntryV1[];
  startedAt: string;
  completedAt: string;
  files: Glm46vTwoArmManifestFileV1[];
  totalRows: number;
}): Glm46vTwoArmManifestV2 {
  const body: Omit<Glm46vTwoArmManifestV2, "contentHash"> = {
    manifestSchemaRef: { ...GLM46V_TWO_ARM_MANIFEST_REF },
    experimentRef: { ...GLM46V_TWO_ARM_PLAN_REF },
    plan: structuredClone(input.plan),
    planHash: input.plan.contentHash,
    executionHash: input.execution.contentHash,
    ledgerHash: input.ledgerHash,
    taskIds: [...input.plan.taskIds],
    seeds: [...input.plan.seeds],
    arms: [...input.plan.arms],
    taskStatus: [...input.taskStatus],
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    files: [...input.files].sort((a, b) => a.runId.localeCompare(b.runId)),
    totalRuns: input.plan.totalRuns,
    totalRows: input.totalRows,
  };
  return { ...body, contentHash: hashCanonical(body) };
}

export function recomputeGlm46vManifestHash(manifest: Glm46vTwoArmManifestV2): string {
  const { contentHash: _recorded, ...body } = manifest;
  return hashCanonical(body);
}

function writeManifestFile(outputDir: string, manifest: Glm46vTwoArmManifestV2): void {
  const target = path.join(outputDir, "manifest.json");
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  if (fs.existsSync(target)) {
    const existing = JSON.parse(fs.readFileSync(target, "utf8")) as Glm46vTwoArmManifestV2;
    if (existing.contentHash !== manifest.contentHash) {
      throw new Error("glm46v_manifest_no_replace_conflict: manifest.json differs from the recomputed manifest; refusing to overwrite");
    }
  } else {
    fs.writeFileSync(target, text, { flag: "wx" });
  }
}

// ---------------------------------------------------------------------------
// Row validation + Brier recomputation (shared by resume and verifier).
// ---------------------------------------------------------------------------

function readForkRows(filePath: string): ForkRow[] {
  const text = fs.readFileSync(filePath, "utf8");
  return text.split("\n").filter(line => line.trim().length > 0).map(line => JSON.parse(line) as ForkRow);
}

export function validateGlm46vRunRows(
  rows: ForkRow[],
  expected: { taskId: number; seed: number; model: string; arms: readonly ForkArm[]; requireForkInputHash: boolean },
): string[] {
  const problems: string[] = [];
  if (rows.length !== expected.arms.length) {
    problems.push(`row count ${rows.length}, expected ${expected.arms.length}`);
  }
  const arms = [...new Set(rows.map(r => r.arm))].sort();
  const expectedArms = [...expected.arms].sort();
  if (JSON.stringify(arms) !== JSON.stringify(expectedArms)) {
    problems.push(`arm set [${arms.join(",")}] != expected [${expectedArms.join(",")}] (arm membership, not just row count)`);
  }
  for (const row of rows) {
    if (row.taskId !== expected.taskId) problems.push(`row taskId ${row.taskId} != ${expected.taskId}`);
    if (row.seed !== expected.seed) problems.push(`row seed ${row.seed} != ${expected.seed}`);
    if (row.model !== expected.model) problems.push(`row model ${row.model} != ${expected.model}`);
    if (!expected.arms.includes(row.arm)) problems.push(`unknown arm ${row.arm}`);
    if (expected.requireForkInputHash && typeof row.forkInputHashV1 !== "string") {
      problems.push("missing forkInputHashV1");
    }
  }
  if (expected.requireForkInputHash && rows.length > 0) {
    const hashes = new Set(rows.map(r => r.forkInputHashV1));
    if (hashes.size !== 1) {
      problems.push(`forkInputHashV1 differs across arms (${[...hashes].join(", ")})`);
    }
  }
  return problems;
}

/** Recompute multiclass Brier of a fork row's finalBelief against the frozen task outcome. */
export function recomputeRowBrier(row: ForkRow, options: readonly string[], outcome: string): number {
  return options.reduce((sum, option) => {
    const diff = (row.finalBelief?.[option] ?? 0) - (option === outcome ? 1 : 0);
    return sum + diff * diff;
  }, 0);
}

// ---------------------------------------------------------------------------
// Summary V2 — versioned, written under an explicit consistency rule.
// ---------------------------------------------------------------------------

export interface Glm46vTwoArmSummaryV2 {
  summarySchemaRef: { id: string; version: string };
  experimentRef: { id: string; version: string };
  model: string;
  seeds: number[];
  arms: ForkArm[];
  taskCount: number;
  plannedProviderCalls: number;
  plannedEstimateTokens: number;
  tokenStopThreshold: number;
  discussionMaxTokens: number;
  finalMaxTokens: number;
  thinking: "disabled";
  concurrency: number;
  stopReason: string;
  /** Cumulative physical attempts across ALL processes (ledger-derived). */
  actualProviderCalls: number;
  /** Cumulative observed known usage across ALL processes (ledger-derived). */
  actualProviderTokens: number;
  callsWithUnknownUsage: number;
  discussionParserFailures: number;
  finalInvalid: number;
  finalUnavailable: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  runsCompleted: number;
  rows: number;
  reused: number;
  outputDir: string;
  startedAt: string;
  completedAt: string;
  contentHash: string;
}

export function recomputeGlm46vSummaryHash(summary: Glm46vTwoArmSummaryV2): string {
  const { contentHash: _recorded, completedAt: _time, ...body } = summary;
  return hashCanonical(body);
}

/**
 * Summary write rule (versioned, fail-closed):
 *  - no existing summary -> write;
 *  - substantively equivalent existing summary (identical except completedAt /
 *    startedAt, e.g. a resumed completed run) -> no-op;
 *  - existing summary not "completed" and new summary "completed" -> overwrite
 *    (halt -> completed transition on a resumed run);
 *  - anything else -> conflict error.
 */
export function writeGlm46vSummaryFile(outputDir: string, summary: Glm46vTwoArmSummaryV2): void {
  const target = path.join(outputDir, "summary.json");
  const text = `${JSON.stringify(summary, null, 2)}\n`;
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, text, { flag: "wx" });
    return;
  }
  const existing = JSON.parse(fs.readFileSync(target, "utf8")) as Glm46vTwoArmSummaryV2;
  if (typeof existing.contentHash === "string" && existing.contentHash === summary.contentHash) return;
  const equivalent = (left: Glm46vTwoArmSummaryV2, right: Glm46vTwoArmSummaryV2): boolean => {
    const strip = (value: Glm46vTwoArmSummaryV2): string => {
      const { contentHash: _c, completedAt: _t, startedAt: _s, ...rest } = value;
      return JSON.stringify(rest);
    };
    return strip(left) === strip(right);
  };
  if (equivalent(existing, summary)) return;
  if (existing.stopReason !== "completed" && summary.stopReason === "completed") {
    fs.writeFileSync(target, text);
    return;
  }
  throw new Error("glm46v_summary_conflict: existing summary.json is neither identical nor a halt->completed transition");
}

// ---------------------------------------------------------------------------
// Task status derivation + per-run scan of completed rows.
// ---------------------------------------------------------------------------

export function deriveGlm46vTaskStatuses(input: {
  runs: Array<{ runId: string; taskId: number; seed: number }>;
  completedRunIds: Set<string>;
  ledgerScan: Glm46vLedgerScanV1;
}): { entries: Glm46vTaskStatusEntryV1[]; completed: number; failed: number; skipped: number } {
  const entries: Glm46vTaskStatusEntryV1[] = [];
  let completed = 0;
  let failed = 0;
  let skipped = 0;
  for (const run of input.runs) {
    let status: Glm46vTaskStatus;
    let reason: string | undefined;
    if (input.completedRunIds.has(run.runId)) {
      status = "completed";
      completed += 1;
    } else if (input.ledgerScan.runsAttempted.includes(run.runId)) {
      status = "failed";
      reason = input.ledgerScan.failedRunIds.includes(run.runId)
        ? "task_failed_event"
        : "attempted_without_completion";
      failed += 1;
    } else {
      status = "skipped";
      skipped += 1;
    }
    entries.push({ runId: run.runId, taskId: run.taskId, seed: run.seed, status, ...(reason ? { reason } : {}) });
  }
  return { entries, completed, failed, skipped };
}

/** Run JSONL files only — attempts.jsonl is a ledger, never a run file. */
function listGlm46vRunFiles(outputDir: string): string[] {
  return fs.readdirSync(outputDir)
    .filter(file => file.endsWith(".jsonl") && file !== "attempts.jsonl")
    .sort();
}

function scanCompletedRows(outputDir: string): {
  runs: number; rows: number;
  callsWithUnknownUsage: number; discussionParserFailures: number; finalInvalid: number; finalUnavailable: number;
} {
  const stats = {
    runs: 0, rows: 0,
    callsWithUnknownUsage: 0, discussionParserFailures: 0, finalInvalid: 0, finalUnavailable: 0,
  };
  if (!fs.existsSync(outputDir)) return stats;
  // Round-1 records are shared verbatim across arm rows; count each once.
  const round1Seen = new Set<string>();
  for (const file of listGlm46vRunFiles(outputDir)) {
    stats.runs += 1;
    for (const row of readForkRows(path.join(outputDir, file))) {
      stats.rows += 1;
      for (const record of row.callRecords ?? []) {
        if (record.phase === "discussion_r1") {
          if (round1Seen.has(record.requestHash)) continue;
          round1Seen.add(record.requestHash);
        }
        if (!record.usage) stats.callsWithUnknownUsage += 1;
        if (record.phase.startsWith("discussion") && record.parseErrorCode !== undefined) {
          stats.discussionParserFailures += 1;
        }
        if (record.phase === "final") {
          if (record.status === "unavailable") stats.finalUnavailable += 1;
          else if (record.parseStatus === "invalid") stats.finalInvalid += 1;
        }
      }
    }
  }
  return stats;
}

function buildSummary(input: {
  plan: Glm46vTwoArmPlanV3;
  tokenStopThreshold: number;
  stopReason: string;
  ledgerScan: Glm46vLedgerScanV1;
  rowStats: ReturnType<typeof scanCompletedRows>;
  taskCounts: { completed: number; failed: number; skipped: number };
  reused: number;
  outputDir: string;
  startedAt: string;
  completedAt: string;
}): Glm46vTwoArmSummaryV2 {
  const body: Omit<Glm46vTwoArmSummaryV2, "contentHash" | "completedAt"> = {
    summarySchemaRef: { ...GLM46V_TWO_ARM_SUMMARY_REF },
    experimentRef: { ...GLM46V_TWO_ARM_PLAN_REF },
    model: GLM46V_MODEL,
    seeds: [...GLM46V_SEEDS],
    arms: [...GLM46V_ARMS],
    taskCount: input.plan.taskIds.length,
    plannedProviderCalls: input.plan.plannedProviderCalls,
    plannedEstimateTokens: input.plan.plannedEstimateTokens,
    tokenStopThreshold: input.tokenStopThreshold,
    discussionMaxTokens: GLM46V_DISCUSSION_MAX_TOKENS,
    finalMaxTokens: GLM46V_FINAL_MAX_TOKENS,
    thinking: GLM46V_THINKING,
    concurrency: GLM46V_CONCURRENCY,
    stopReason: input.stopReason,
    actualProviderCalls: input.ledgerScan.physicalAttempts,
    actualProviderTokens: input.ledgerScan.observedTokens,
    callsWithUnknownUsage: input.ledgerScan.unknownUsageCalls,
    discussionParserFailures: input.rowStats.discussionParserFailures,
    finalInvalid: input.rowStats.finalInvalid,
    finalUnavailable: input.rowStats.finalUnavailable,
    completedTasks: input.taskCounts.completed,
    failedTasks: input.taskCounts.failed,
    skippedTasks: input.taskCounts.skipped,
    runsCompleted: input.rowStats.runs,
    rows: input.rowStats.rows,
    reused: input.reused,
    outputDir: input.outputDir,
    startedAt: input.startedAt,
  };
  return { ...body, completedAt: input.completedAt, contentHash: hashCanonical(body) };
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

export interface Glm46vTwoArmExecuteResultV2 {
  status: "completed" | "halted";
  stopReason: string;
  runs: number;
  reused: number;
  rows: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  /** Cumulative physical attempts across ALL processes (ledger-derived). */
  calls: number;
  /** Cumulative observed known usage across ALL processes (ledger-derived). */
  tokens: number;
  callsWithUnknownUsage: number;
  discussionParserFailures: number;
  finalInvalid: number;
  finalUnavailable: number;
}

/**
 * Execute the frozen gate plan. Recovery semantics:
 *  - the budget is restored from the attempts ledger (cumulative calls/tokens
 *    across all processes; never reset, never granted extra quota);
 *  - started-but-unfinished attempts are marked aborted_unknown and never
 *    re-sent; their runs become failed (not re-run);
 *  - runs with any finished attempt but no JSONL are failed, not re-run;
 *  - discussion provider failures fail the current task and execution
 *    continues with subsequent tasks; budget halts stop the gate (remaining
 *    tasks are skipped);
 *  - completed + failed + skipped always partition the planned tasks.
 * Execution identity (execution.json) is frozen BEFORE the first provider call
 * and must validate on resume (plan hash + runner config hash).
 */
export async function executeGlm46vTwoArmGate(input: {
  outputDir?: string;
  invoker: SingleAttemptTextInvoker;
  repoState?: Glm46vRepoStateV1;
  clock?: () => string;
  /** Optional injected budget (tests use tiny thresholds to exercise token-budget halts). */
  budget?: V6ProviderCallBudget;
  /** Optional injected plan (test-only shortcut; skips the plan.json freeze check). */
  plan?: Glm46vTwoArmPlanV3;
}): Promise<Glm46vTwoArmExecuteResultV2> {
  const outputDir = input.outputDir ?? GLM46V_OUTPUT_DIR;
  const plan = input.plan ?? loadGlm46vTwoArmPlanV3(outputDir);
  if (!plan.estimateWithinStopThreshold) {
    throw new Error(`glm46v_plan_over_threshold: planned estimate ${plan.plannedEstimateTokens} > stop threshold ${plan.tokenStopThreshold}`);
  }
  const clock = input.clock ?? (() => new Date().toISOString());
  const repoState = input.repoState ?? detectGlm46vRepoState();
  fs.mkdirSync(outputDir, { recursive: true });

  // Execution identity: freeze BEFORE the first provider call, or validate an
  // existing freeze (plan hash + runner config hash) — otherwise fail closed.
  const executionPath = path.join(outputDir, "execution.json");
  let execution: Glm46vTwoArmExecutionV1;
  if (fs.existsSync(executionPath)) {
    execution = loadGlm46vTwoArmExecutionV1(outputDir, plan);
  } else {
    execution = buildGlm46vTwoArmExecutionV1({ plan, repoState, startedAt: clock() });
    freezeGlm46vTwoArmExecutionV1(outputDir, execution);
  }

  // Ledger restore: mark interrupted attempts aborted_unknown (never re-sent),
  // rebuild the cumulative budget from the ledger.
  const events = readGlm46vLedgerEvents(outputDir);
  let scan = scanGlm46vLedgerEvents(events);
  if (scan.unfinishedAttemptIds.length > 0) {
    for (const attemptId of scan.unfinishedAttemptIds) {
      appendGlm46vLedgerEvent(outputDir, {
        type: "attempt_finished",
        attemptId,
        outcome: "aborted_unknown",
        usage: null,
        ts: clock(),
      });
    }
    scan = scanGlm46vLedgerEvents(readGlm46vLedgerEvents(outputDir));
  }

  // The budget owns both caps: precise planned calls and the stop threshold,
  // initialized from the ledger's cumulative history (never from zero).
  const budget = input.budget ?? new V6ProviderCallBudget(
    plan.plannedProviderCalls,
    plan.tokenStopThreshold,
    scan.physicalAttempts,
    scan.observedTokens,
  );
  // Effective stop threshold: the injected budget's cap when one is provided
  // (tests), otherwise the frozen plan constant.
  const stopThreshold = input.budget !== undefined ? budget.maxTotalTokensCap : plan.tokenStopThreshold;
  let seq = 0;
  const currentRun: { runId: string; innerRunId: string; taskId: number; seed: number } = {
    runId: "", innerRunId: "", taskId: 0, seed: 0,
  };
  const metered = createGlm46vLedgerMeter({
    delegate: input.invoker,
    budget,
    outputDir,
    currentRun: () => ({ ...currentRun }),
    nextSeq: () => ++seq,
    clock,
  });

  // Stale/incompatible manifest detection before any work.
  const manifestPath = path.join(outputDir, "manifest.json");
  let existingManifest: Glm46vTwoArmManifestV2 | null = null;
  if (fs.existsSync(manifestPath)) {
    existingManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Glm46vTwoArmManifestV2;
    if (recomputeGlm46vManifestHash(existingManifest) !== existingManifest.contentHash) {
      throw new Error("glm46v_manifest_corrupt: manifest.json contentHash does not recompute");
    }
    if (existingManifest.planHash !== plan.contentHash) {
      throw new Error("glm46v_manifest_plan_mismatch: manifest binds a different frozen plan");
    }
  }

  const runs: Array<{ runId: string; innerRunId: string; taskId: number; seed: number }> = [];
  for (const taskId of plan.taskIds) {
    for (const seed of plan.seeds) {
      runs.push({
        runId: forkRunId(taskId, seed),
        innerRunId: `fork:task-${taskId}:seed-${seed}`,
        taskId,
        seed,
      });
    }
  }

  const files: Glm46vTwoArmManifestFileV1[] = [];
  const completedRunIds = new Set<string>();
  let reused = 0;
  let totalRows = 0;
  let halted = false;
  let haltReason = "";

  try {
    for (const run of runs) {
      Object.assign(currentRun, run);
      const filePath = forkRunPath(outputDir, run.runId);
      if (fs.existsSync(filePath)) {
        const rows = readForkRows(filePath);
        const problems = validateGlm46vRunRows(rows, {
          taskId: run.taskId, seed: run.seed, model: plan.model, arms: plan.arms, requireForkInputHash: true,
        });
        if (problems.length > 0) {
          throw new Error(`glm46v_resume_conflict ${run.runId}: ${problems.join("; ")}`);
        }
        // A completed run must have its attempts in the ledger (else ambiguity).
        if (!scan.runsAttempted.includes(run.runId)) {
          throw new Error(`glm46v_ledger_missing_attempts_for_completed_run ${run.runId}`);
        }
        if (existingManifest) {
          const recorded = existingManifest.files.find(file => file.runId === run.runId);
          if (!recorded) throw new Error(`glm46v_resume_stale ${run.runId}: not recorded in manifest`);
          const contentHash = sha256Text(fs.readFileSync(filePath, "utf8"));
          if (recorded.contentHash !== contentHash) {
            throw new Error(`glm46v_resume_stale ${run.runId}: on-disk contentHash differs from manifest`);
          }
          if (recorded.forkInputHashV1 !== rows[0].forkInputHashV1) {
            throw new Error(`glm46v_resume_stale ${run.runId}: forkInputHashV1 differs from manifest`);
          }
        }
        files.push({
          runId: run.runId, taskId: run.taskId, seed: run.seed, fileName: path.basename(filePath),
          rowCount: rows.length, contentHash: sha256Text(fs.readFileSync(filePath, "utf8")),
          forkInputHashV1: rows[0].forkInputHashV1!,
        });
        completedRunIds.add(run.runId);
        reused += 1;
        totalRows += rows.length;
        continue;
      }
      if (scan.runsAttempted.includes(run.runId)) {
        // Attempted in a previous process but never completed: failed, never re-run.
        if (!scan.failedRunIds.includes(run.runId)) {
          appendGlm46vLedgerEvent(outputDir, {
            type: "task_failed", runId: run.runId, taskId: run.taskId, seed: run.seed,
            reason: "attempted_without_completion", ts: clock(),
          });
        }
        continue;
      }
      if (existingManifest) {
        throw new Error(`glm46v_manifest_incomplete ${run.runId}: manifest exists but the run has no file and no ledger attempts`);
      }
      const plannedCallsForRun = forkPlannedCallsForRunV1(run.taskId, plan.arms);
      budget.assertCanStartRun(plannedCallsForRun, plannedCallsForRun * plan.perCallTokenEstimate);
      try {
        const rows = await runFork({
          taskId: run.taskId, seed: run.seed, model: plan.model, invoker: metered, arms: plan.arms,
          discussionConfigOverride: { ...GLM46V_DISCUSSION_INVOCATION },
          finalConfigOverride: { ...GLM46V_FINAL_INVOCATION },
        });
        const text = `${rows.map(row => JSON.stringify(row)).join("\n")}\n`;
        fs.writeFileSync(filePath, text, { flag: "wx" });
        files.push({
          runId: run.runId, taskId: run.taskId, seed: run.seed, fileName: path.basename(filePath),
          rowCount: rows.length, contentHash: sha256Text(text), forkInputHashV1: rows[0].forkInputHashV1!,
        });
        completedRunIds.add(run.runId);
        totalRows += rows.length;
        console.log(`  completed ${run.runId} rows=${rows.length} (${reused > 0 ? `${reused} reused, ` : ""}${files.length}/${runs.length})`);
      } catch (error) {
        if (error instanceof ProviderExecutionHaltError) throw error;
        if (error instanceof V6ProviderInvocationError) {
          // Discussion provider failure: fail this task, continue with the rest.
          appendGlm46vLedgerEvent(outputDir, {
            type: "task_failed", runId: run.runId, taskId: run.taskId, seed: run.seed,
            reason: error.code, ts: clock(),
          });
          console.warn(`[fork] task failed ${run.runId}: ${error.code} — continuing with subsequent tasks`);
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof ProviderExecutionHaltError) {
      halted = true;
      haltReason = error.code;
    } else {
      throw error;
    }
  }

  const finalScan = readGlm46vLedgerScan(outputDir);
  const statuses = deriveGlm46vTaskStatuses({ runs, completedRunIds, ledgerScan: finalScan });
  const rowStats = scanCompletedRows(outputDir);
  const summary = buildSummary({
    plan,
    tokenStopThreshold: stopThreshold,
    stopReason: halted ? haltReason : "completed",
    ledgerScan: finalScan,
    rowStats,
    taskCounts: { completed: statuses.completed, failed: statuses.failed, skipped: statuses.skipped },
    reused,
    outputDir,
    startedAt: execution.startedAt,
    completedAt: clock(),
  });

  if (!halted) {
    // The manifest is written once for the artifact set it describes. A valid
    // pre-existing manifest (validated above) is preserved verbatim — rewriting
    // it would change startedAt/completedAt and break the freeze. A fully
    // resumed completed run also leaves summary.json untouched.
    if (!existingManifest) {
      const ledgerHash = sha256Text(fs.readFileSync(path.join(outputDir, "attempts.jsonl"), "utf8"));
      const manifest = buildGlm46vTwoArmManifestV2({
        plan,
        execution,
        ledgerHash,
        taskStatus: statuses.entries,
        startedAt: execution.startedAt,
        completedAt: clock(),
        files,
        totalRows,
      });
      writeManifestFile(outputDir, manifest);
      writeGlm46vSummaryFile(outputDir, summary);
    }
  } else {
    // Safe stop: completed JSONL files are preserved, no manifest is written
    // (fail-closed replay), and the halt is recorded with ledger-cumulative
    // usage and per-call stats recomputed from the preserved rows.
    writeGlm46vSummaryFile(outputDir, summary);
    console.error(JSON.stringify({ mode: "glm46v-twoarm-execute", ...summary }, null, 2));
  }
  console.log(JSON.stringify({
    mode: "glm46v-twoarm-execute",
    status: halted ? "halted" : "completed",
    ...summary,
  }, null, 2));

  return {
    status: halted ? "halted" : "completed",
    stopReason: summary.stopReason,
    runs: rowStats.runs,
    reused,
    rows: rowStats.rows,
    completedTasks: statuses.completed,
    failedTasks: statuses.failed,
    skippedTasks: statuses.skipped,
    calls: finalScan.physicalAttempts,
    tokens: finalScan.observedTokens,
    callsWithUnknownUsage: finalScan.unknownUsageCalls,
    discussionParserFailures: rowStats.discussionParserFailures,
    finalInvalid: rowStats.finalInvalid,
    finalUnavailable: rowStats.finalUnavailable,
  };
}

// ---------------------------------------------------------------------------
// Verifier V2
// ---------------------------------------------------------------------------

/**
 * Directory-level verification of a completed gate output (V2):
 *  - plan.json: exists, contentHash recomputes, matches current constants;
 *  - execution.json: exists, contentHash recomputes, planHash binds the plan,
 *    runnerConfigHash recomputes;
 *  - manifest: contentHash recomputes, planHash binds, embedded plan deep-equals
 *    plan.json and its own hash recomputes, executionHash binds execution.json,
 *    taskIds/seeds/arms match the plan, totalRuns/totalRows consistent;
 *  - attempts.jsonl: manifest.ledgerHash matches, every finished attempt has a
 *    started line, no duplicate attempt ids, no unfinished attempts;
 *  - JSONL enumeration: on-disk set == manifest file set;
 *  - per file: contentHash, row identity, exact arm set, forkInputHashV1
 *    equality (row-level + manifest record);
 *  - per row: finalAgentBeliefs-derived finalReportedCount/finalBelief/Brier/
 *    accuracy recompute; null-consistency rules; finalBelief option set /
 *    finite / non-negative / sum-to-1; finalRawResponses hash-match the final
 *    call records;
 *  - task coverage: completed + failed + skipped partition the planned runs
 *    exactly (no dup, no missing), matching manifest.taskStatus;
 *  - summary: contentHash recomputes, identity matches, cumulative calls/tokens
 *    recompute from the ledger.
 */
export function verifyGlm46vTwoArmOutput(outputDir: string = GLM46V_OUTPUT_DIR): { ok: boolean; detail: string } {
  const problems: string[] = [];

  // ---- plan ----
  const planPath = path.join(outputDir, "plan.json");
  let plan: Glm46vTwoArmPlanV3 | null = null;
  if (!fs.existsSync(planPath)) {
    problems.push("plan.json missing");
  } else {
    plan = JSON.parse(fs.readFileSync(planPath, "utf8")) as Glm46vTwoArmPlanV3;
    if (recomputeGlm46vPlanHash(plan) !== plan.contentHash) problems.push("plan.json contentHash does not recompute");
    const rebuilt = buildGlm46vTwoArmPlanV3();
    if (plan.contentHash !== rebuilt.contentHash) problems.push("plan.json no longer matches current runner constants");
  }

  // ---- execution identity ----
  const executionPath = path.join(outputDir, "execution.json");
  let execution: Glm46vTwoArmExecutionV1 | null = null;
  if (!fs.existsSync(executionPath)) {
    problems.push("execution.json missing");
  } else {
    execution = JSON.parse(fs.readFileSync(executionPath, "utf8")) as Glm46vTwoArmExecutionV1;
    if (recomputeGlm46vExecutionHash(execution) !== execution.contentHash) {
      problems.push("execution.json contentHash does not recompute");
    }
    if (plan && execution.planHash !== plan.contentHash) {
      problems.push("execution.json planHash does not bind plan.json");
    }
    if (execution.runnerConfigHash !== computeGlm46vRunnerConfigHash()) {
      problems.push("execution.json runnerConfigHash does not recompute from current runner source/config");
    }
  }

  // ---- ledger ----
  const ledgerPath = path.join(outputDir, "attempts.jsonl");
  if (!fs.existsSync(ledgerPath)) {
    problems.push("attempts.jsonl missing");
  }
  let ledgerScan: Glm46vLedgerScanV1 | null = null;
  if (fs.existsSync(ledgerPath)) {
    try {
      ledgerScan = readGlm46vLedgerScan(outputDir);
      if (ledgerScan.unfinishedAttemptIds.length > 0) {
        problems.push(`attempts.jsonl has unfinished attempts: ${ledgerScan.unfinishedAttemptIds.join(",")}`);
      }
    } catch (error) {
      problems.push(`attempts.jsonl corrupt: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ---- manifest ----
  const manifestPath = path.join(outputDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    problems.push("manifest.json missing");
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Glm46vTwoArmManifestV2;
    if (recomputeGlm46vManifestHash(manifest) !== manifest.contentHash) problems.push("manifest contentHash does not recompute");
    if (plan && manifest.planHash !== plan.contentHash) problems.push("manifest planHash does not bind plan.json");
    if (plan && JSON.stringify(manifest.plan) !== JSON.stringify(plan)) problems.push("manifest embedded plan differs from plan.json");
    if (manifest.plan && recomputeGlm46vPlanHash(manifest.plan) !== manifest.plan.contentHash) {
      problems.push("manifest embedded plan contentHash does not recompute");
    }
    if (execution && manifest.executionHash !== execution.contentHash) {
      problems.push("manifest executionHash does not bind execution.json");
    }
    if (ledgerPath && fs.existsSync(ledgerPath)) {
      const ledgerHash = sha256Text(fs.readFileSync(ledgerPath, "utf8"));
      if (manifest.ledgerHash !== ledgerHash) problems.push("manifest ledgerHash does not match attempts.jsonl");
    }
    if (plan) {
      if (JSON.stringify(manifest.taskIds) !== JSON.stringify(plan.taskIds)
        || JSON.stringify(manifest.seeds) !== JSON.stringify(plan.seeds)
        || JSON.stringify(manifest.arms) !== JSON.stringify(plan.arms)) {
        problems.push("manifest taskIds/seeds/arms do not match the frozen plan");
      }
      if (manifest.totalRuns !== plan.totalRuns) problems.push(`manifest totalRuns ${manifest.totalRuns} != plan ${plan.totalRuns}`);
    }
    const rowSum = manifest.files.reduce((sum, file) => sum + file.rowCount, 0);
    if (manifest.totalRows !== rowSum) problems.push(`manifest totalRows ${manifest.totalRows} != sum of file rowCounts ${rowSum}`);
    // files must equal the completed task statuses exactly (failed tasks have no file).
    const completedStatusCount = manifest.taskStatus.filter(entry => entry.status === "completed").length;
    if (manifest.files.length !== completedStatusCount) {
      problems.push(`manifest files ${manifest.files.length} != completed taskStatus entries ${completedStatusCount}`);
    }

    // ---- JSONL enumeration (run files only; attempts.jsonl is the ledger) ----
    const onDisk = listGlm46vRunFiles(outputDir);
    const recorded = manifest.files.map(file => file.fileName).sort();
    for (const file of onDisk) if (!recorded.includes(file)) problems.push(`unregistered file: ${file}`);
    for (const file of recorded) if (!onDisk.includes(file)) problems.push(`missing file: ${file}`);

    // ---- per-file + per-row checks ----
    for (const file of manifest.files) {
      const filePath = path.join(outputDir, file.fileName);
      if (!fs.existsSync(filePath)) continue;
      const contentHash = sha256Text(fs.readFileSync(filePath, "utf8"));
      if (contentHash !== file.contentHash) problems.push(`hash mismatch: ${file.fileName}`);
      const rows = readForkRows(filePath);
      const rowProblems = validateGlm46vRunRows(rows, {
        taskId: file.taskId, seed: file.seed, model: GLM46V_MODEL, arms: manifest.arms, requireForkInputHash: true,
      });
      for (const problem of rowProblems) problems.push(`${file.fileName}: ${problem}`);
      if (rows.length > 0 && rows[0].forkInputHashV1 !== file.forkInputHashV1) {
        problems.push(`${file.fileName}: forkInputHashV1 differs from the manifest record`);
      }
      for (const row of rows) {
        try {
          const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId: row.taskId });
          const outcome = projection.adapter.task.outcome;
          const taskOptions = projection.adapter.task.claim.options;
          if (row.resolvedOption !== outcome) {
            problems.push(`${file.fileName}: resolvedOption ${row.resolvedOption} != frozen outcome ${outcome}`);
          }
          // --- internal consistency from finalAgentBeliefs ---
          const beliefs = row.finalAgentBeliefs ?? [];
          if (row.finalReportedCount !== beliefs.length) {
            problems.push(`${file.fileName}: finalReportedCount ${row.finalReportedCount} != finalAgentBeliefs length ${beliefs.length}`);
          }
          if (beliefs.length > 0) {
            if (row.finalBelief === null || row.finalBrier === null || row.finalAccuracy === null) {
              problems.push(`${file.fileName}: finalBelief/Brier/accuracy must not be null when finalAgentBeliefs is non-empty`);
            } else {
              const recomputedBelief: Record<string, number> = {};
              for (const option of taskOptions) {
                recomputedBelief[option] = beliefs.reduce((sum, b) => sum + (b[option] ?? 0), 0) / beliefs.length;
              }
              if (Object.keys(row.finalBelief).length !== taskOptions.length
                || taskOptions.some(option => !Object.prototype.hasOwnProperty.call(row.finalBelief, option))) {
                problems.push(`${file.fileName}: finalBelief option set does not match frozen task options`);
              }
              let sum = 0;
              for (const option of taskOptions) {
                const p = row.finalBelief[option];
                if (!Number.isFinite(p) || p < 0 || p > 1) {
                  problems.push(`${file.fileName}: finalBelief ${option} must be finite and within [0,1]`);
                }
                sum += p;
              }
              if (Math.abs(sum - 1) > 1e-6) problems.push(`${file.fileName}: finalBelief must sum to 1 (got ${sum})`);
              for (const option of taskOptions) {
                if (Math.abs(recomputedBelief[option] - row.finalBelief[option]) > 1e-9) {
                  problems.push(`${file.fileName}: finalBelief does not recompute from finalAgentBeliefs (${option})`);
                }
              }
              const recomputedBrier = taskOptions.reduce((acc, option) => {
                const diff = row.finalBelief![option] - (option === outcome ? 1 : 0);
                return acc + diff * diff;
              }, 0);
              if (Math.abs(recomputedBrier - row.finalBrier) > 1e-9) {
                problems.push(`${file.fileName}: finalBrier ${row.finalBrier} does not recompute (${recomputedBrier})`);
              }
              const argmax = taskOptions.reduce((best, option) => (row.finalBelief![option] > (row.finalBelief![best] ?? -1) ? option : best), taskOptions[0]);
              const accuracy = argmax === outcome ? 1 : 0;
              if (row.finalAccuracy !== accuracy) {
                problems.push(`${file.fileName}: finalAccuracy ${row.finalAccuracy} does not recompute (${accuracy})`);
              }
            }
          } else {
            if (row.finalBelief !== null || row.finalBrier !== null || row.finalAccuracy !== null) {
              problems.push(`${file.fileName}: finalBelief/Brier/accuracy must be null when finalAgentBeliefs is empty`);
            }
          }
          // --- final raw responses hash-match their call records ---
          const finals = (row.callRecords ?? []).filter(record => record.phase === "final" && record.status === "response");
          const raws = row.finalRawResponses ?? [];
          for (const record of finals) {
            const match = raws.find(raw => raw.arm === record.arm && raw.agentId === record.agentId);
            if (!match) {
              problems.push(`${file.fileName}: missing final raw response for ${record.arm}/${record.agentId}`);
            } else if (sha256Text(match.rawResponse) !== record.rawResponseHash) {
              problems.push(`${file.fileName}: final raw response hash mismatch for ${record.arm}/${record.agentId}`);
            }
          }
          for (const raw of raws) {
            const record = finals.find(candidate => candidate.arm === raw.arm && candidate.agentId === raw.agentId);
            if (!record) problems.push(`${file.fileName}: orphan final raw response for ${raw.arm}/${raw.agentId}`);
          }
        } catch {
          problems.push(`${file.fileName}: cannot reload frozen task ${row.taskId}`);
        }
      }
    }

    // ---- task coverage: completed + failed + skipped partition the plan runs ----
    if (plan && ledgerScan) {
      const runs: Array<{ runId: string; taskId: number; seed: number }> = [];
      for (const taskId of plan.taskIds) {
        for (const seed of plan.seeds) runs.push({ runId: forkRunId(taskId, seed), taskId, seed });
      }
      const completedRunIds = new Set(manifest.files.map(file => file.runId));
      const derived = deriveGlm46vTaskStatuses({ runs, completedRunIds, ledgerScan });
      const runSet = new Set(runs.map(run => run.runId));
      const seen = new Set<string>();
      let partitionOk = derived.entries.length === runs.length;
      for (const entry of derived.entries) {
        if (!runSet.has(entry.runId)) partitionOk = false;
        if (seen.has(entry.runId)) partitionOk = false;
        seen.add(entry.runId);
      }
      if (!partitionOk) problems.push("task status partition does not cover the planned runs exactly (dup or missing)");
      if (JSON.stringify(manifest.taskStatus) !== JSON.stringify(derived.entries)) {
        problems.push("manifest taskStatus does not match the derived completed/failed/skipped partition");
      }
      if (derived.completed + derived.failed + derived.skipped !== plan.totalRuns) {
        problems.push(`task status counts (${derived.completed}+${derived.failed}+${derived.skipped}) != plan runs ${plan.totalRuns}`);
      }
    }

    // ---- summary ----
    const summaryPath = path.join(outputDir, "summary.json");
    if (!fs.existsSync(summaryPath)) {
      problems.push("summary.json missing");
    } else {
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as Glm46vTwoArmSummaryV2;
      if (recomputeGlm46vSummaryHash(summary) !== summary.contentHash) problems.push("summary contentHash does not recompute");
      if (summary.stopReason !== "completed") problems.push(`summary stopReason=${summary.stopReason}, expected completed`);
      if (summary.model !== GLM46V_MODEL
        || JSON.stringify(summary.seeds) !== JSON.stringify(manifest.seeds)
        || JSON.stringify(summary.arms) !== JSON.stringify(manifest.arms)) {
        problems.push("summary identity (model/seeds/arms) does not match manifest");
      }
      if (plan && summary.plannedProviderCalls !== plan.plannedProviderCalls) {
        problems.push("summary plannedProviderCalls does not match the frozen plan");
      }
      if (ledgerScan) {
        if (summary.actualProviderCalls !== ledgerScan.physicalAttempts) {
          problems.push(`summary actualProviderCalls ${summary.actualProviderCalls} != ledger physical attempts ${ledgerScan.physicalAttempts}`);
        }
        if (summary.actualProviderTokens !== ledgerScan.observedTokens) {
          problems.push(`summary actualProviderTokens ${summary.actualProviderTokens} != ledger observed tokens ${ledgerScan.observedTokens}`);
        }
        if (summary.callsWithUnknownUsage !== ledgerScan.unknownUsageCalls) {
          problems.push(`summary callsWithUnknownUsage ${summary.callsWithUnknownUsage} != ledger unknown-usage attempts ${ledgerScan.unknownUsageCalls}`);
        }
      }
    }
  }

  return { ok: problems.length === 0, detail: problems.length === 0 ? "verified" : problems.join("; ") };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function runPlan(): number {
  const plan = freezeGlm46vTwoArmPlanV3();
  console.log("GLM-4.6V two-arm cross-model gate plan (V3, frozen)");
  console.log(`  model:                    ${plan.model}`);
  console.log(`  tasks:                    ${plan.taskIds.length} prospective tasks (task 14 excluded: prior GLM-4.6V fork observed)`);
  console.log(`  seeds:                    [${plan.seeds.join(", ")}]`);
  console.log(`  arms:                     ${plan.arms.join(" + ")} (no SUPPORTS)`);
  console.log(`  runs:                     ${plan.totalRuns}`);
  console.log(`  estimated provider calls: ${plan.plannedProviderCalls} (precise per-task roster count)`);
  console.log(`  discussion max_tokens:    ${plan.discussionMaxTokens} (thinking: ${plan.thinking})`);
  console.log(`  final max_tokens:         ${plan.finalMaxTokens} (thinking: ${plan.thinking})`);
  console.log(`  planned estimate:         ${plan.plannedEstimateTokens.toLocaleString("en-US")} tokens (${plan.perCallTokenEstimate}/call estimate — informational)`);
  console.log(`  stop threshold:           ${plan.tokenStopThreshold.toLocaleString("en-US")} observed known usage (NOT a hard ceiling: one in-flight request may overshoot; failed/no-usage calls carry unknown usage)`);
  console.log(`  user quota:               ${plan.totalTokenQuota.toLocaleString("en-US")} tokens (threshold keeps ${(plan.totalTokenQuota - plan.tokenStopThreshold).toLocaleString("en-US")} margin)`);
  console.log(`  estimate within threshold:${plan.estimateWithinStopThreshold}`);
  console.log(`  concurrency:              ${plan.concurrency}`);
  console.log(`  artifact path:            ${plan.artifactPath} (repo-relative; plan hash is machine-independent)`);
  console.log(`  analysis freeze:          ${plan.analysisSpec.path} (${plan.analysisSpec.contentHash})`);
  console.log(`  output dir (runtime):     ${GLM46V_OUTPUT_DIR}`);
  console.log(JSON.stringify({ mode: "glm46v-twoarm-plan", ok: plan.estimateWithinStopThreshold, ...plan }, null, 2));
  return plan.estimateWithinStopThreshold ? 0 : 1;
}

function runReplay(): number {
  const result = verifyGlm46vTwoArmOutput();
  console.log(JSON.stringify({ mode: "glm46v-twoarm-replay", ok: result.ok, detail: result.detail }, null, 2));
  return result.ok ? 0 : 1;
}

async function runExecute(): Promise<number> {
  if (process.env.RUN_AUTHORIZED !== "yes") {
    console.error("glm46v_execute_blocked: RUN_AUTHORIZED=yes not present");
    return 5;
  }
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("zhipu_api_key_unavailable");
    return 3;
  }
  try {
    const result = await executeGlm46vTwoArmGate({
      invoker: createZhipuSingleAttemptInvoker(GLM46V_MODEL_ID),
    });
    return result.status === "completed" ? 0 : 4;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 4;
  }
}

async function main(): Promise<number> {
  if (process.argv.includes("--plan")) return runPlan();
  if (process.argv.includes("--replay")) return runReplay();
  if (process.argv.includes("--execute")) return runExecute();
  console.error("usage: --plan | --replay | --execute");
  return 2;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 4;
  });
}
