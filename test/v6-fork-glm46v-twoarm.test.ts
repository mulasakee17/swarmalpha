/**
 * GLM-4.6V two-arm gate runner tests (zero network), Plan V3:
 *  1. plan: 44 tasks / 1 seed / 2 arms / 865 calls / 5.2M stop threshold;
 *     cross-machine hash identity (two different cwd roots -> same hash);
 *     no absolute paths inside the hashed plan;
 *  2. plan + execution-identity freeze/load fail-closed semantics;
 *  3. forkInputHashV1: arm-invariant, seed/task-sensitive, per-call records;
 *  4. canonical final parser: illegal option, NaN/Inf, negative, wrong sum,
 *     wrong claimId, fenced JSON, provider failure; diagnostics recompute;
 *  5. attempts ledger + cross-process recovery: budget restored from history,
 *     no re-send of finished/interrupted attempts, failed tasks not re-run,
 *     summary cumulative == ledger, ledger attempts == mock fetch count,
 *     idempotent multi-resume, no extra quota on restore;
 *  6. execute gate: manifest/execution/ledger binding, halt semantics,
 *     summary write rules;
 *  7. verifier V2: finalAgentBeliefs-derived stats, raw-response hashes, task
 *     coverage, and tamper detection (nulled beliefs, modified counts, ledger
 *     and summary tampering, manifest file removal).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync, cpSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  runFork,
  runForkExecute,
  verifyForkOutput,
  buildForkPlanV1,
  forkPlannedCallsForRunV1,
  FORK_CONFIRMATORY_TASK_IDS,
  type ForkRunDiagnostics,
} from "../experiments/campaign/v6/run_v6_fork";
import { V6ProviderCallBudget } from "../experiments/campaign/v6/run_v6_smoke";
import { createZhipuSingleAttemptInvoker } from "../experiments/campaign/v6/zhipuSingleAttemptInvoker";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import {
  buildGlm46vTwoArmPlanV3,
  freezeGlm46vTwoArmPlanV3,
  loadGlm46vTwoArmPlanV3,
  executeGlm46vTwoArmGate,
  verifyGlm46vTwoArmOutput,
  recomputeGlm46vPlanHash,
  recomputeGlm46vExecutionHash,
  recomputeGlm46vSummaryHash,
  writeGlm46vSummaryFile,
  freezeGlm46vTwoArmExecutionV1,
  buildGlm46vTwoArmExecutionV1,
  readGlm46vLedgerScan,
  readGlm46vLedgerEvents,
  appendGlm46vLedgerEvent,
  scanGlm46vLedgerEvents,
  GLM46V_ARMS,
  GLM46V_MODEL,
  GLM46V_SEEDS,
  GLM46V_TOKEN_STOP_THRESHOLD,
  GLM46V_TOTAL_TOKEN_QUOTA,
  GLM46V_DISCUSSION_MAX_TOKENS,
  GLM46V_FINAL_MAX_TOKENS,
  GLM46V_THINKING,
  GLM46V_ARTIFACT_PATH,
  GLM46V_ANALYSIS_SPEC_PATH,
  GLM46V_PREVIOUSLY_OBSERVED_TASK_IDS,
  GLM46V_PROSPECTIVE_TASK_IDS,
  type Glm46vTwoArmPlanV3,
  type Glm46vTwoArmSummaryV2,
} from "../experiments/campaign/v6/run_v6_fork_glm46v_two_arm";
import type { SingleAttemptTextInvoker, SingleAttemptTextInvokeRequest } from "../experiments/campaign/v6/providerAdapters";
import { V6ProviderInvocationError } from "../experiments/campaign/v6/providerDiagnostics";

const TASK_ID = 14;
const options = createHiddenBenchTaskProjectionV1({ sourceTaskId: TASK_ID }).adapter.task.claim.options;
const claimId = `claim:hiddenbench:${TASK_ID}:answer`;

const USAGE10 = { promptTokens: 5, completionTokens: 5, totalTokens: 10 };

function probsFor(agentIdx: number): Record<string, number> {
  return Object.fromEntries(options.map((o, i) => [o, i === agentIdx % options.length ? 0.9 : 0.1 / (options.length - 1)]));
}

function taskIdOf(requestId: string): number {
  const m = /fork:task-(\d+):seed-/.exec(requestId);
  return m ? parseInt(m[1], 10) : TASK_ID;
}

function runIdOf(requestId: string): string {
  const m = /(fork:task-\d+:seed-\d+)/.exec(requestId);
  return m ? m[1] : "";
}

function agentIdxOf(requestId: string): number {
  const m = /agent:hiddenbench:\d+:(\d+)/.exec(requestId);
  return m ? parseInt(m[1], 10) - 1 : 0;
}

function discussionPayloadForTask(taskId: number, idx: number): string {
  const opts = createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task.claim.options;
  const probs = Object.fromEntries(opts.map((o, i) => [o, i === idx % opts.length ? 0.9 : 0.1 / (opts.length - 1)]));
  return JSON.stringify({
    message: `mock message ${idx}`,
    belief: { kind: "categorical", probabilities: probs },
    evidence: [
      { content: `pro-${opts[0]} fact`, relation: "supports" },
      { content: `anti-${opts[1]} fact`, relation: "attacks" },
    ],
  });
}

function finalPayloadForTask(taskId: number, probs?: Record<string, number>): string {
  const opts = createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task.claim.options;
  const p = probs ?? Object.fromEntries(opts.map((o, i) => [o, i === 0 ? 0.9 : 0.1 / (opts.length - 1)]));
  return JSON.stringify({
    status: "answered",
    reports: [{ claimId: `claim:hiddenbench:${taskId}:answer`, value: { kind: "categorical", probabilities: p } }],
  });
}

function discussionPayload(idx: number): string {
  return discussionPayloadForTask(TASK_ID, idx);
}

function finalPayload(probs?: Record<string, number>): string {
  return finalPayloadForTask(TASK_ID, probs);
}

/** Deterministic zero-network invoker, task-aware; every call reports usage (10 tokens). */
function mockInvoker(): SingleAttemptTextInvoker & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async invoke(request: SingleAttemptTextInvokeRequest) {
      calls.push(request.requestId);
      const taskId = taskIdOf(request.requestId);
      if (request.requestId.startsWith("final:")) {
        return { rawContent: finalPayloadForTask(taskId, undefined), usage: USAGE10 };
      }
      return { rawContent: discussionPayloadForTask(taskId, agentIdxOf(request.requestId)), usage: USAGE10 };
    },
  };
}

/** Invoker that throws a provider failure for discussion calls of the given runIds. */
function failingDiscussionInvoker(failRunIds: Set<string>): SingleAttemptTextInvoker & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async invoke(request: SingleAttemptTextInvokeRequest) {
      calls.push(request.requestId);
      const runId = runIdOf(request.requestId);
      if (failRunIds.has(runId) && !request.requestId.startsWith("final:")) {
        throw new V6ProviderInvocationError("provider_api_error");
      }
      const taskId = taskIdOf(request.requestId);
      if (request.requestId.startsWith("final:")) {
        return { rawContent: finalPayloadForTask(taskId, undefined), usage: USAGE10 };
      }
      return { rawContent: discussionPayloadForTask(taskId, agentIdxOf(request.requestId)), usage: USAGE10 };
    },
  };
}

/** Invoker with a pluggable final-response factory (null -> provider failure). */
function finalOverrideInvoker(finalContent: (agentIdx: number) => string | null): SingleAttemptTextInvoker {
  return {
    async invoke(request: SingleAttemptTextInvokeRequest) {
      if (request.requestId.startsWith("final:")) {
        const content = finalContent(agentIdxOf(request.requestId));
        if (content === null) {
          throw new V6ProviderInvocationError("provider_timeout");
        }
        return { rawContent: content, usage: USAGE10 };
      }
      return { rawContent: discussionPayload(agentIdxOf(request.requestId)), usage: USAGE10 };
    },
  };
}

function rawFinal(inner: string): string {
  return JSON.stringify({ status: "answered", reports: [{ claimId, value: { kind: "categorical", probabilities: inner } }] });
}

function tempDir(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

/** Run JSONL files only (attempts.jsonl is the ledger, never a run file). */
function runFiles(dir: string): string[] {
  return readdirSync(dir).filter(f => f.endsWith(".jsonl") && f !== "attempts.jsonl").sort();
}

/** Small deterministic plan V3 (test-only; contentHash recomputed from its body). */
function smallPlan(taskIds: number[]): Glm46vTwoArmPlanV3 {
  const base = buildGlm46vTwoArmPlanV3();
  const { contentHash: _c, ...body } = base;
  let plannedProviderCalls = 0;
  for (const taskId of taskIds) plannedProviderCalls += forkPlannedCallsForRunV1(taskId, GLM46V_ARMS);
  const next = {
    ...body,
    taskIds,
    totalRuns: taskIds.length,
    plannedProviderCalls,
    plannedEstimateTokens: plannedProviderCalls * base.perCallTokenEstimate,
    estimateWithinStopThreshold: plannedProviderCalls * base.perCallTokenEstimate <= base.tokenStopThreshold,
  };
  return { ...next, contentHash: recomputeGlm46vPlanHash({ ...next, contentHash: "" }) };
}

// ---------------------------------------------------------------------------
// Plan V3
// ---------------------------------------------------------------------------

describe("GLM-4.6V two-arm gate plan V3", () => {
  it("plans 44 prospective tasks, excludes observed task 14, and uses 865 calls", () => {
    const plan = buildGlm46vTwoArmPlanV3();
    expect(plan.taskIds).toHaveLength(44);
    expect(plan.taskIds).toEqual([...GLM46V_PROSPECTIVE_TASK_IDS]);
    expect(GLM46V_PREVIOUSLY_OBSERVED_TASK_IDS).toEqual([14]);
    expect(plan.taskIds).not.toContain(14);
    expect(FORK_CONFIRMATORY_TASK_IDS).toContain(14);
    expect(plan.seeds).toEqual([...GLM46V_SEEDS]);
    expect(plan.seeds).toHaveLength(1);
    expect(plan.arms).toEqual(["CONTROL", "ATTACKS"]);
    expect(plan.arms).toHaveLength(2);
    expect(plan.arms).not.toContain("SUPPORTS");
    expect(plan.totalRuns).toBe(44);
    expect(plan.plannedProviderCalls).toBe(865);
    expect(plan.tokenStopThreshold).toBe(5_200_000);
    expect(plan.totalTokenQuota).toBe(6_000_000);
    expect(plan.plannedEstimateTokens).toBeLessThanOrEqual(plan.tokenStopThreshold);
    expect(plan.estimateWithinStopThreshold).toBe(true);
    expect(plan.discussionMaxTokens).toBe(768);
    expect(plan.finalMaxTokens).toBe(256);
    expect(plan.thinking).toBe("disabled");
    expect(plan.model).toBe(GLM46V_MODEL);
  });

  it("the precise call count is the single authority: equals the per-task roster sum (865), never the uniform 880", () => {
    const plan = buildGlm46vTwoArmPlanV3();
    const recomputed = plan.taskIds.reduce(
      (sum, taskId) => sum + forkPlannedCallsForRunV1(taskId, GLM46V_ARMS),
      0,
    );
    expect(recomputed).toBe(plan.plannedProviderCalls);
    expect(recomputed).toBe(865);
    expect(plan.plannedProviderCalls).not.toBe(44 * 20);
  });

  it("the hashed plan contains only the repository-relative artifact path, never an absolute machine path", () => {
    const plan = buildGlm46vTwoArmPlanV3();
    const serialized = JSON.stringify(plan);
    expect(plan.artifactPath).toBe(GLM46V_ARTIFACT_PATH);
    expect(plan.analysisSpec.path).toBe(GLM46V_ANALYSIS_SPEC_PATH);
    expect(plan.analysisSpec.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(path.isAbsolute(plan.artifactPath)).toBe(false);
    expect(serialized).not.toContain("C:");
    expect(serialized).not.toContain(path.sep === "\\" ? "\\" : "/");
    expect(serialized).not.toContain(process.cwd());
  });

  it("builds the identical plan hash from two different repository roots (cross-machine reproducibility)", async () => {
    const root1 = tempDir("glm46v-root1-");
    const root2 = tempDir("glm46v-root2-");
    try {
      const sourceDataset = path.resolve(process.cwd(), "experiments/campaign/tasks/hiddenbench/benchmark.json");
      const sourceAnalysisSpec = path.resolve(process.cwd(), GLM46V_ANALYSIS_SPEC_PATH);
      for (const root of [root1, root2]) {
        const dest = path.join(root, "experiments/campaign/tasks/hiddenbench");
        mkdirSync(dest, { recursive: true });
        copyFileSync(sourceDataset, path.join(dest, "benchmark.json"));
        const analysisDest = path.join(root, GLM46V_ANALYSIS_SPEC_PATH);
        mkdirSync(path.dirname(analysisDest), { recursive: true });
        copyFileSync(sourceAnalysisSpec, analysisDest);
      }
      const cwdSpy = vi.spyOn(process, "cwd");
      cwdSpy.mockReturnValue(root1);
      const plan1 = buildGlm46vTwoArmPlanV3();
      cwdSpy.mockReturnValue(root2);
      const plan2 = buildGlm46vTwoArmPlanV3();
      cwdSpy.mockRestore();
      expect(plan1.contentHash).toBe(plan2.contentHash);
      expect(plan1.artifactPath).toBe(plan2.artifactPath);
    } finally {
      rmSync(root1, { recursive: true, force: true });
      rmSync(root2, { recursive: true, force: true });
      vi.restoreAllMocks();
    }
  });
});

// ---------------------------------------------------------------------------
// Plan + execution freeze / load
// ---------------------------------------------------------------------------

describe("plan and execution freeze/load (fail-closed)", () => {
  it("freezes plan.json with wx semantics and accepts an identical re-freeze", () => {
    const dir = tempDir("glm46v-plan-");
    try {
      const plan = freezeGlm46vTwoArmPlanV3(dir);
      expect(existsSync(path.join(dir, "plan.json"))).toBe(true);
      expect(freezeGlm46vTwoArmPlanV3(dir).contentHash).toBe(plan.contentHash);
      expect(loadGlm46vTwoArmPlanV3(dir).contentHash).toBe(plan.contentHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to overwrite a frozen plan whose body no longer matches its recorded hash", () => {
    const dir = tempDir("glm46v-plan-");
    try {
      freezeGlm46vTwoArmPlanV3(dir);
      const target = path.join(dir, "plan.json");
      const tampered = JSON.parse(readFileSync(target, "utf8"));
      tampered.model = "zhipu:glm-4.5-air";
      writeFileSync(target, JSON.stringify(tampered, null, 2));
      expect(() => freezeGlm46vTwoArmPlanV3(dir)).toThrow(/glm46v_plan_no_replace_conflict/);
      expect(() => loadGlm46vTwoArmPlanV3(dir)).toThrow(/glm46v_plan_freeze_mismatch/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to execute without a frozen plan", async () => {
    const dir = tempDir("glm46v-plan-");
    try {
      await expect(executeGlm46vTwoArmGate({ outputDir: dir, invoker: mockInvoker() }))
        .rejects.toThrow(/glm46v_plan_not_frozen/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("execution identity is frozen before the first call and can never be overwritten with different content", async () => {
    const dir = tempDir("glm46v-exec-");
    try {
      const plan = smallPlan([TASK_ID]);
      const repoA = { gitCommit: "aaaa1111", worktreeDirty: false };
      const repoB = { gitCommit: "bbbb2222", worktreeDirty: false };
      const startedAt = "2026-08-20T00:00:00.000Z";
      const executionA = buildGlm46vTwoArmExecutionV1({ plan, repoState: repoA, startedAt });
      const executionB = buildGlm46vTwoArmExecutionV1({ plan, repoState: repoB, startedAt });
      freezeGlm46vTwoArmExecutionV1(dir, executionA);
      expect(() => freezeGlm46vTwoArmExecutionV1(dir, executionB)).toThrow(/glm46v_execution_no_replace_conflict/);
      expect(readFileSync(path.join(dir, "execution.json"), "utf8")).toContain("aaaa1111");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects execution source/config mismatch BEFORE any provider call", async () => {
    const dir = tempDir("glm46v-exec-");
    try {
      const plan = smallPlan([TASK_ID]);
      const invoker = mockInvoker();
      // First process freezes execution.json with a valid identity.
      await executeGlm46vTwoArmGate({ outputDir: dir, invoker, plan, repoState: { gitCommit: "abc", worktreeDirty: false } });
      const invoker2 = mockInvoker();
      const before = invoker2.calls.length;
      // Tamper runnerConfigHash in execution.json (recompute the hash so the
      // config-mismatch check itself is what rejects) -> resume must refuse pre-call.
      const execPath = path.join(dir, "execution.json");
      const exec = JSON.parse(readFileSync(execPath, "utf8"));
      exec.runnerConfigHash = "sha256:" + "0".repeat(64);
      exec.contentHash = recomputeGlm46vExecutionHash(exec);
      writeFileSync(execPath, JSON.stringify(exec, null, 2));
      await expect(executeGlm46vTwoArmGate({ outputDir: dir, invoker: invoker2, plan, repoState: { gitCommit: "abc", worktreeDirty: false } }))
        .rejects.toThrow(/glm46v_execution_config_mismatch/);
      expect(invoker2.calls.length).toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// forkInputHash + per-call records
// ---------------------------------------------------------------------------

describe("forkInputHashV1 (arm-invariant full-input fingerprint)", () => {
  it("both arms share one forkInputHashV1; round1StateHash preserved; records carry request/raw hashes", async () => {
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: mockInvoker(), arms: GLM46V_ARMS });
    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.arm)).toEqual([...GLM46V_ARMS]);
    expect(new Set(rows.map(r => r.forkInputHashV1)).size).toBe(1);
    expect(rows[0].forkInputHashV1).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(new Set(rows.map(r => r.round1StateHash)).size).toBe(1);
    expect(rows[0].forkInputHashV1).not.toBe(rows[0].round1StateHash);
    for (const row of rows) {
      expect(row.callRecords).toHaveLength(12);
      expect(row.callRecords!.filter(r => r.phase === "discussion_r1")).toHaveLength(4);
      expect(row.callRecords!.filter(r => r.phase === "discussion_r2" && r.arm === row.arm)).toHaveLength(4);
      expect(row.callRecords!.filter(r => r.phase === "final" && r.arm === row.arm)).toHaveLength(4);
      for (const record of row.callRecords!) {
        expect(record.requestHash).toMatch(/^sha256:/);
        expect(record.usage?.totalTokens).toBe(10);
        if (record.status === "response") expect(record.rawResponseHash).toMatch(/^sha256:/);
      }
      expect(row.finalRawResponses).toHaveLength(4);
      for (const raw of row.finalRawResponses!) {
        expect(raw.arm).toBe(row.arm);
        expect(raw.rawResponse.length).toBeGreaterThan(0);
      }
      expect(row.finalReportedCount).toBe(4);
    }
    expect(JSON.stringify(rows[0].callRecords!.filter(r => r.phase === "discussion_r1")))
      .toBe(JSON.stringify(rows[1].callRecords!.filter(r => r.phase === "discussion_r1")));
  });

  it("differs across seeds, tasks, and invocation configs", async () => {
    const rowsA = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: mockInvoker(), arms: GLM46V_ARMS });
    const rowsB = await runFork({ taskId: TASK_ID, seed: 1, model: GLM46V_MODEL, invoker: mockInvoker(), arms: GLM46V_ARMS });
    expect(rowsA[0].forkInputHashV1).not.toBe(rowsB[0].forkInputHashV1);
    const rowsC = await runFork({ taskId: 15, seed: 0, model: GLM46V_MODEL, invoker: mockInvoker(), arms: GLM46V_ARMS });
    expect(rowsA[0].forkInputHashV1).not.toBe(rowsC[0].forkInputHashV1);
    const rowsD = await runFork({
      taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: mockInvoker(), arms: GLM46V_ARMS,
      discussionConfigOverride: { maxTokens: 768, thinking: "disabled" },
      finalConfigOverride: { maxTokens: 256, thinking: "disabled" },
    });
    expect(rowsD[0].forkInputHashV1).not.toBe(rowsA[0].forkInputHashV1);
  });
});

// ---------------------------------------------------------------------------
// Canonical final parser discipline
// ---------------------------------------------------------------------------

describe("final elicitation uses the canonical parser (audit F1)", () => {
  it("rejects an illegal option: invalid_belief_value, no silent entry into finalProbs", async () => {
    const bad = rawFinal(JSON.stringify(Object.fromEntries(options.map((o, i) => [i === 0 ? "WRONG_OPTION" : o, i === 0 ? 0.9 : 0.1 / (options.length - 1)]))));
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: finalOverrideInvoker(() => bad), arms: GLM46V_ARMS });
    for (const row of rows) {
      expect(row.finalReportedCount).toBe(0);
      expect(row.finalBelief).toBeNull();
      for (const record of row.callRecords!.filter(r => r.phase === "final")) {
        expect(record.parseStatus).toBe("invalid");
        expect(record.parseErrorCode).toBe("invalid_belief_value");
      }
    }
  });

  it("rejects NaN/Infinity probabilities (1e999 parses to Infinity)", async () => {
    const raw = `{"${options[0]}":1e999,${options.slice(1).map(o => `"${o}":0`).join(",")}}`;
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: finalOverrideInvoker(() => rawFinal(raw)), arms: GLM46V_ARMS });
    for (const row of rows) {
      expect(row.finalReportedCount).toBe(0);
      expect(row.callRecords!.find(r => r.phase === "final")!.parseErrorCode).toBe("invalid_belief_value");
    }
  });

  it("rejects negative probabilities", async () => {
    const raw = `{"${options[0]}":-0.5,${options.slice(1).map(o => `"${o}":0.5`).join(",")}}`;
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: finalOverrideInvoker(() => rawFinal(raw)), arms: GLM46V_ARMS });
    for (const row of rows) {
      expect(row.finalReportedCount).toBe(0);
      expect(row.callRecords!.find(r => r.phase === "final")!.parseErrorCode).toBe("invalid_belief_value");
    }
  });

  it("rejects a probability vector that does not sum to 1", async () => {
    const probs = Object.fromEntries(options.map(o => [o, 0.2]));
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: finalOverrideInvoker(() => finalPayload(probs)), arms: GLM46V_ARMS });
    for (const row of rows) {
      expect(row.finalReportedCount).toBe(0);
      expect(row.callRecords!.find(r => r.phase === "final")!.parseErrorCode).toBe("invalid_belief_value");
    }
  });

  it("rejects a wrong claimId: unknown_claim", async () => {
    const wrong = JSON.stringify({ status: "answered", reports: [{ claimId: "claim:hiddenbench:99:answer", value: { kind: "categorical", probabilities: probsFor(0) } }] });
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: finalOverrideInvoker(() => wrong), arms: GLM46V_ARMS });
    for (const row of rows) {
      expect(row.finalReportedCount).toBe(0);
      expect(row.callRecords!.find(r => r.phase === "final")!.parseErrorCode).toBe("unknown_claim");
    }
  });

  it("accepts fenced JSON finals (code_fence_json parse mode) and reports the belief", async () => {
    const fenced = "```json\n" + finalPayload(probsFor(0)) + "\n```";
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: finalOverrideInvoker(() => fenced), arms: GLM46V_ARMS });
    for (const row of rows) {
      expect(row.finalReportedCount).toBe(4);
      expect(row.finalBelief).not.toBeNull();
      const record = row.callRecords!.find(r => r.phase === "final")!;
      expect(record.parseStatus).toBe("answered");
      expect(record.parseErrorCode).toBeUndefined();
    }
  });

  it("provider failure on a final call is recorded (unavailable) and the run continues", async () => {
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: finalOverrideInvoker(() => null), arms: GLM46V_ARMS });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.finalReportedCount).toBe(0);
      expect(row.finalBelief).toBeNull();
      for (const record of row.callRecords!.filter(r => r.phase === "final")) {
        expect(record.status).toBe("unavailable");
        expect(record.parseErrorCode).toBe("provider_timeout");
        expect(record.usage).toBeUndefined();
        expect(record.rawResponseHash).toBeUndefined();
      }
      expect(row.finalRawResponses).toHaveLength(0);
    }
  });

  it("diagnostics are recomputable from per-call records", async () => {
    const faulty: SingleAttemptTextInvoker = {
      async invoke(request: SingleAttemptTextInvokeRequest) {
        const idx = agentIdxOf(request.requestId);
        if (request.requestId.startsWith("final:")) {
          if (idx === 1) throw new V6ProviderInvocationError("provider_timeout");
          return { rawContent: finalPayload(probsFor(0)), usage: USAGE10 };
        }
        if (idx === 2) return { rawContent: "this is not json at all", usage: USAGE10 };
        return { rawContent: discussionPayload(idx), usage: USAGE10 };
      },
    };
    const diagnostics: ForkRunDiagnostics = { parserFailures: 0, missingReports: 0 };
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker: faulty, arms: GLM46V_ARMS, diagnostics });
    expect(diagnostics.parserFailures).toBe(3);
    expect(diagnostics.missingReports).toBe(2);
    let parserFailures = 0, missingReports = 0;
    const round1Seen = new Set<string>();
    for (const row of rows) {
      for (const record of row.callRecords ?? []) {
        if (record.phase === "discussion_r1") {
          if (round1Seen.has(record.requestHash)) continue;
          round1Seen.add(record.requestHash);
        }
        if (record.phase.startsWith("discussion") && record.parseErrorCode !== undefined) parserFailures += 1;
        if (record.status === "unavailable" || (record.phase === "final" && record.parseStatus === "invalid")) missingReports += 1;
      }
    }
    expect(parserFailures).toBe(3);
    expect(missingReports).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Attempts ledger + cross-process recovery
// ---------------------------------------------------------------------------

describe("attempts ledger and cross-process recovery", () => {
  it("process 1 fails a task; process 2 restores cumulative calls/tokens and never re-sends finished attempts", async () => {
    const dir = tempDir("glm46v-recover-");
    try {
      const plan = smallPlan([14, 15]);
      const repoState = { gitCommit: "abc123", worktreeDirty: false };
      // Process 1: task 14 fails on its first discussion call; task 15 completes.
      const invoker1 = failingDiscussionInvoker(new Set(["fork:task-14:seed-0"]));
      const first = await executeGlm46vTwoArmGate({ outputDir: dir, invoker: invoker1, plan, repoState });
      expect(first.status).toBe("completed");
      expect(first.completedTasks).toBe(1);
      expect(first.failedTasks).toBe(1);
      expect(first.skippedTasks).toBe(0);
      expect(first.calls).toBe(21); // 1 failed attempt + 20 for task 15
      expect(first.tokens).toBe(200); // task 15's known usage only

      // Process 2: resume. Task 14 must NOT be re-run; task 15 is reused.
      const invoker2 = mockInvoker();
      const second = await executeGlm46vTwoArmGate({ outputDir: dir, invoker: invoker2, plan, repoState });
      expect(second.status).toBe("completed");
      expect(second.failedTasks).toBe(1);
      expect(second.completedTasks).toBe(1);
      expect(second.reused).toBe(1);
      expect(second.calls).toBe(21); // cumulative, no new attempts
      expect(second.tokens).toBe(200);
      expect(invoker2.calls.some(id => id.includes("task-14"))).toBe(false); // no re-send of run 14
      expect(invoker2.calls.length).toBe(0); // run 15 file exists -> fully reused

      // ledger has exactly the same physical attempts as process 1's fetch count
      const ledger = readGlm46vLedgerScan(dir);
      expect(ledger.physicalAttempts).toBe(invoker1.calls.length);
      expect(ledger.physicalAttempts).toBe(21);
      expect(ledger.runsAttempted).toContain("run:fork-v1:task-14:seed-0");
      expect(ledger.failedRunIds).toContain("run:fork-v1:task-14:seed-0");

      // summary cumulative equals the ledger
      const summary = JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8"));
      expect(summary.actualProviderCalls).toBe(ledger.physicalAttempts);
      expect(summary.actualProviderTokens).toBe(ledger.observedTokens);
      expect(summary.callsWithUnknownUsage).toBe(ledger.unknownUsageCalls);

      // manifest records the completed/failed partition (verifier on a real
      // 44-task plan covers the full checks elsewhere)
      const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8"));
      expect(manifest.taskStatus.filter((e: { status: string }) => e.status === "completed")).toHaveLength(1);
      expect(manifest.taskStatus.filter((e: { status: string }) => e.status === "failed")).toHaveLength(1);
      expect(manifest.files).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("an interrupted (started, never finished) attempt is marked aborted_unknown and never re-sent", async () => {
    const dir = tempDir("glm46v-aborted-");
    try {
      const plan = smallPlan([14, 15]);
      const repoState = { gitCommit: "abc123", worktreeDirty: false };
      // Craft a ledger with ONE started line for run 14 and no finished line.
      appendGlm46vLedgerEvent(dir, {
        type: "attempt_started",
        attemptId: "run:fork-v1:task-14:seed-0:1",
        requestHash: "sha256:" + "1".repeat(64),
        requestId: "discussion:fork:task-14:seed-0:r1:agent:hiddenbench:14:1",
        runId: "run:fork-v1:task-14:seed-0",
        taskId: 14,
        seed: 0,
        phase: "discussion_r1",
        agentId: "agent:hiddenbench:14:1",
        ts: "2026-08-20T00:00:00.000Z",
      });
      const invoker = mockInvoker();
      const result = await executeGlm46vTwoArmGate({ outputDir: dir, invoker, plan, repoState });
      expect(result.status).toBe("completed");
      expect(result.failedTasks).toBe(1);
      expect(result.completedTasks).toBe(1);
      // the interrupted attempt is now marked aborted_unknown and counts as a physical attempt
      const ledger = readGlm46vLedgerScan(dir);
      expect(ledger.physicalAttempts).toBe(21); // 1 aborted + 20 for task 15
      expect(ledger.unknownUsageCalls).toBe(1);
      expect(ledger.unfinishedAttemptIds).toHaveLength(0);
      // run 14 never re-sent: the mock received no task-14 requests
      expect(invoker.calls.some(id => id.includes("task-14"))).toBe(false);
      // idempotent: a third process does not re-mark or re-run anything
      const again = await executeGlm46vTwoArmGate({ outputDir: dir, invoker: mockInvoker(), plan, repoState });
      expect(again.status).toBe("completed");
      expect(again.calls).toBe(21);
      expect(again.reused).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ledger physical attempts equal the mock fetch count exactly; multiple resumes stay idempotent", async () => {
    const dir = tempDir("glm46v-idem-");
    try {
      const plan = smallPlan([14, 15]);
      const repoState = { gitCommit: "abc123", worktreeDirty: false };
      const invoker = mockInvoker();
      const first = await executeGlm46vTwoArmGate({ outputDir: dir, invoker, plan, repoState });
      expect(first.status).toBe("completed");
      expect(first.calls).toBe(invoker.calls.length);
      expect(first.calls).toBe(40);
      for (let i = 0; i < 2; i++) {
        const again = await executeGlm46vTwoArmGate({ outputDir: dir, invoker: mockInvoker(), plan, repoState });
        expect(again.status).toBe("completed");
        expect(again.calls).toBe(40);
        expect(again.reused).toBe(2);
        expect(again.rows).toBe(4);
      }
      // final ledger state: 40 attempts, fully idempotent
      const ledger = readGlm46vLedgerScan(dir);
      expect(ledger.physicalAttempts).toBe(40);
      expect(ledger.observedTokens).toBe(400);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the restored budget never gains extra quota: cumulative history carries over", async () => {
    const dir = tempDir("glm46v-quota-");
    try {
      const plan = smallPlan([14, 15]);
      const repoState = { gitCommit: "abc123", worktreeDirty: false };
      const invoker = failingDiscussionInvoker(new Set(["fork:task-14:seed-0"]));
      const first = await executeGlm46vTwoArmGate({ outputDir: dir, invoker, plan, repoState });
      const ledgerAfter = readGlm46vLedgerScan(dir);
      // The gate restores the budget from the ledger: same caps, cumulative counters.
      const restored = new V6ProviderCallBudget(
        plan.plannedProviderCalls,
        plan.tokenStopThreshold,
        ledgerAfter.physicalAttempts,
        ledgerAfter.observedTokens,
      );
      expect(restored.maxTotalTokensCap).toBe(GLM46V_TOKEN_STOP_THRESHOLD);
      expect(restored.callCount).toBe(first.calls);
      expect(restored.tokenCount).toBe(first.tokens);
      expect(restored.maxTotalTokensCap - restored.tokenCount).toBe(GLM46V_TOKEN_STOP_THRESHOLD - first.tokens);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("one logical call yields exactly one provider attempt in the ledger", async () => {
    const dir = tempDir("glm46v-once-");
    try {
      const plan = smallPlan([TASK_ID]);
      const invoker = mockInvoker();
      await executeGlm46vTwoArmGate({ outputDir: dir, invoker, plan, repoState: { gitCommit: "abc", worktreeDirty: false } });
      const events = readGlm46vLedgerEvents(dir);
      const started = events.filter(e => e.type === "attempt_started");
      const finished = events.filter(e => e.type === "attempt_finished");
      expect(started).toHaveLength(20);
      expect(finished).toHaveLength(20);
      expect(new Set(started.map(e => e.attemptId)).size).toBe(20);
      expect(new Set(finished.map(e => e.attemptId)).size).toBe(20);
      expect(invoker.calls.length).toBe(20);
      // every logical request has a matching started line with the same requestHash
      const scan = scanGlm46vLedgerEvents(events);
      expect(scan.unfinishedAttemptIds).toHaveLength(0);
      expect(scan.physicalAttempts).toBe(20);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Execute gate
// ---------------------------------------------------------------------------

describe("execute gate (mock invoker, zero network)", { timeout: 120_000 }, () => {
  it("executes a frozen V3 plan end to end: files, ledger, manifest, execution, summary, verifier", async () => {
    const dir = tempDir("glm46v-exec-");
    try {
      freezeGlm46vTwoArmPlanV3(dir); // real 44-task prospective plan frozen
      const clock = (() => {
        let t = 0;
        return () => new Date(1_700_000_000_000 + t++).toISOString();
      })();
      const result = await executeGlm46vTwoArmGate({
        outputDir: dir, invoker: mockInvoker(),
        repoState: { gitCommit: "f00dcafe", worktreeDirty: false },
        clock,
      });
      expect(result.status).toBe("completed");
      expect(result.stopReason).toBe("completed");
      expect(result.runs).toBe(44);
      expect(result.reused).toBe(0);
      expect(result.rows).toBe(88);
      expect(result.completedTasks).toBe(44);
      expect(result.failedTasks).toBe(0);
      expect(result.skippedTasks).toBe(0);
      expect(result.calls).toBe(865);
      expect(result.tokens).toBe(8650);
      expect(result.callsWithUnknownUsage).toBe(0);

      // execution identity frozen with plan + repo state
      const execution = JSON.parse(readFileSync(path.join(dir, "execution.json"), "utf8"));
      expect(execution.planHash).toBe(buildGlm46vTwoArmPlanV3().contentHash);
      expect(execution.gitCommit).toBe("f00dcafe");
      expect(execution.sourceBundleHash).toBeNull(); // clean worktree in this test

      // manifest binds plan, execution, ledger, and files
      const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8"));
      expect(manifest.planHash).toBe(buildGlm46vTwoArmPlanV3().contentHash);
      expect(manifest.executionHash).toBe(execution.contentHash);
      expect(manifest.files).toHaveLength(44);
      expect(manifest.taskStatus.filter((e: { status: string }) => e.status === "completed")).toHaveLength(44);
      const ledgerText = readFileSync(path.join(dir, "attempts.jsonl"), "utf8");
      expect(manifest.ledgerHash).toMatch(/^sha256:/);
      expect(manifest.ledgerHash.length).toBe(71);

      // summary cumulative == ledger
      const summary = JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8"));
      expect(summary.actualProviderCalls).toBe(865);
      expect(summary.actualProviderTokens).toBe(8650);
      expect(recomputeGlm46vSummaryHash(summary)).toBe(summary.contentHash);

      expect(verifyGlm46vTwoArmOutput(dir).ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resume reuses completed runs and refuses stale/incompatible rows", async () => {
    const dir = tempDir("glm46v-exec-");
    try {
      const plan = smallPlan([TASK_ID, 15]);
      const repoState = { gitCommit: "f00dcafe", worktreeDirty: false };
      const first = await executeGlm46vTwoArmGate({ outputDir: dir, invoker: mockInvoker(), plan, repoState });
      expect(first.status).toBe("completed");

      const second = await executeGlm46vTwoArmGate({ outputDir: dir, invoker: mockInvoker(), plan, repoState });
      expect(second.status).toBe("completed");
      expect(second.reused).toBe(2);
      expect(second.calls).toBe(40);

      // tamper one row's arm -> resume must refuse
      const jsonl = runFiles(dir)[0];
      const filePath = path.join(dir, jsonl);
      const lines = readFileSync(filePath, "utf8").trim().split("\n");
      const tampered = JSON.parse(lines[0]);
      tampered.arm = "SUPPORTS";
      lines[0] = JSON.stringify(tampered);
      writeFileSync(filePath, lines.join("\n") + "\n");
      await expect(executeGlm46vTwoArmGate({ outputDir: dir, invoker: mockInvoker(), plan, repoState }))
        .rejects.toThrow(/glm46v_resume_conflict|glm46v_resume_stale/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("successful calls with missing provider usage are recorded as usage_unknown (never zero) and the run completes", async () => {
    const dir = tempDir("glm46v-usage-");
    try {
      const plan = smallPlan([TASK_ID]);
      const usageLess: SingleAttemptTextInvoker = {
        async invoke(request: SingleAttemptTextInvokeRequest) {
          if (request.requestId.startsWith("final:")) return { rawContent: finalPayload(probsFor(0)), usage: USAGE10 };
          return { rawContent: discussionPayload(agentIdxOf(request.requestId)), usage: undefined };
        },
      };
      const result = await executeGlm46vTwoArmGate({
        outputDir: dir, invoker: usageLess, plan,
        repoState: { gitCommit: "abc", worktreeDirty: false },
      });
      expect(result.status).toBe("completed");
      expect(result.calls).toBe(20);
      expect(result.tokens).toBe(80); // only final calls (8) have known usage
      expect(result.callsWithUnknownUsage).toBe(12);
      const ledger = readGlm46vLedgerScan(dir);
      expect(ledger.physicalAttempts).toBe(20);
      expect(ledger.unknownUsageCalls).toBe(12);
      expect(ledger.observedTokens).toBe(80);
      expect(existsSync(path.join(dir, "manifest.json"))).toBe(true);
      // summary records the unknown-usage state explicitly (never encoded as 0)
      const summary = JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8"));
      expect(summary.callsWithUnknownUsage).toBe(12);
      expect(summary.actualProviderTokens).toBe(80);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("halts at the token stop threshold via the per-run gate; halt summary records ledger-cumulative usage", async () => {
    const dir = tempDir("glm46v-exec-");
    try {
      const plan = smallPlan([14, 15]);
      const budget = new V6ProviderCallBudget(40, 100);
      const result = await executeGlm46vTwoArmGate({
        outputDir: dir, invoker: mockInvoker(), plan, budget,
        repoState: { gitCommit: "abc", worktreeDirty: false },
      });
      expect(result.status).toBe("halted");
      expect(result.stopReason).toBe("token_budget_exceeded");
      expect(result.calls).toBe(0);
      expect(result.tokens).toBe(0);
      expect(result.skippedTasks).toBe(2);
      expect(existsSync(path.join(dir, "manifest.json"))).toBe(false);
      const summary = JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8"));
      expect(summary.stopReason).toBe("token_budget_exceeded");
      expect(summary.tokenStopThreshold).toBe(100);
      expect(recomputeGlm46vSummaryHash(summary)).toBe(summary.contentHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("halt -> completed summary transition is allowed; conflicting completed summaries are rejected", () => {
    const dir = tempDir("glm46v-summary-");
    try {
      const plan = smallPlan([TASK_ID]);
      const base: Omit<Glm46vTwoArmSummaryV2, "contentHash" | "completedAt"> = {
        summarySchemaRef: { id: "s", version: "1.0.0" },
        experimentRef: { id: "e", version: "1.0.0" },
        model: GLM46V_MODEL, seeds: [...GLM46V_SEEDS], arms: [...GLM46V_ARMS],
        taskCount: 1, plannedProviderCalls: plan.plannedProviderCalls,
        plannedEstimateTokens: plan.plannedEstimateTokens, tokenStopThreshold: plan.tokenStopThreshold,
        discussionMaxTokens: GLM46V_DISCUSSION_MAX_TOKENS, finalMaxTokens: GLM46V_FINAL_MAX_TOKENS,
        thinking: GLM46V_THINKING, concurrency: 1,
        stopReason: "token_budget_exceeded", actualProviderCalls: 3, actualProviderTokens: 30,
        callsWithUnknownUsage: 0, discussionParserFailures: 0, finalInvalid: 0, finalUnavailable: 0,
        completedTasks: 0, failedTasks: 0, skippedTasks: 1,
        runsCompleted: 0, rows: 0, reused: 0, outputDir: dir, startedAt: "2026-08-20T00:00:00.000Z",
      };
      const halted: Glm46vTwoArmSummaryV2 = { ...base, completedAt: "2026-08-20T00:00:01.000Z", contentHash: "" };
      halted.contentHash = recomputeGlm46vSummaryHash(halted);
      writeGlm46vSummaryFile(dir, halted);

      const halted2: Glm46vTwoArmSummaryV2 = { ...base, completedAt: "2026-08-20T00:00:02.000Z", contentHash: "" };
      halted2.contentHash = recomputeGlm46vSummaryHash(halted2);
      writeGlm46vSummaryFile(dir, halted2); // idempotent no-op

      const completed: Glm46vTwoArmSummaryV2 = {
        ...base, stopReason: "completed", completedAt: "2026-08-20T00:00:03.000Z", contentHash: "",
      };
      completed.contentHash = recomputeGlm46vSummaryHash(completed);
      writeGlm46vSummaryFile(dir, completed); // halt -> completed allowed

      const other: Glm46vTwoArmSummaryV2 = {
        ...base, stopReason: "completed", actualProviderCalls: 99, completedAt: "2026-08-20T00:00:04.000Z", contentHash: "",
      };
      other.contentHash = recomputeGlm46vSummaryHash(other);
      expect(() => writeGlm46vSummaryFile(dir, other)).toThrow(/glm46v_summary_conflict/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Verifier V2 tamper detection
// ---------------------------------------------------------------------------

describe("verifier V2 tamper detection", { timeout: 120_000 }, () => {
  it("rejects structural tampering: extra/missing files, arm sets, forkInputHash divergence, Brier/summary/plan/execution", async () => {
    const base = tempDir("glm46v-verify-");
    try {
      freezeGlm46vTwoArmPlanV3(base);
      await executeGlm46vTwoArmGate({
        outputDir: base, invoker: mockInvoker(),
        repoState: { gitCommit: "f00dcafe", worktreeDirty: false },
      });
      expect(verifyGlm46vTwoArmOutput(base).ok).toBe(true);

      const jsonl = runFiles(base)[0];
      const readLines = (dir: string) => readFileSync(path.join(dir, jsonl), "utf8").trim().split("\n");

      // 1. extra file
      const extra = tempDir("glm46v-extra-");
      try {
        cpSync(base, extra, { recursive: true });
        writeFileSync(path.join(extra, "unregistered.jsonl"), "{}\n");
        expect(verifyGlm46vTwoArmOutput(extra).detail).toContain("unregistered file");
      } finally { rmSync(extra, { recursive: true, force: true }); }

      // 2. missing file
      const missing = tempDir("glm46v-missing-");
      try {
        cpSync(base, missing, { recursive: true });
        rmSync(path.join(missing, jsonl), { force: true });
        expect(verifyGlm46vTwoArmOutput(missing).detail).toContain("missing file");
      } finally { rmSync(missing, { recursive: true, force: true }); }

      // 3. wrong arm set (SUPPORTS row)
      const arms = tempDir("glm46v-arms-");
      try {
        cpSync(base, arms, { recursive: true });
        const lines = readLines(arms);
        const row = JSON.parse(lines[0]);
        row.arm = "SUPPORTS";
        lines[0] = JSON.stringify(row);
        writeFileSync(path.join(arms, jsonl), lines.join("\n") + "\n");
        expect(verifyGlm46vTwoArmOutput(arms).detail).toContain("arm set");
      } finally { rmSync(arms, { recursive: true, force: true }); }

      // 4. forkInputHash divergence between arms
      const diverge = tempDir("glm46v-diverge-");
      try {
        cpSync(base, diverge, { recursive: true });
        const lines = readLines(diverge);
        const row = JSON.parse(lines[1]);
        row.forkInputHashV1 = "sha256:" + "0".repeat(64);
        lines[1] = JSON.stringify(row);
        writeFileSync(path.join(diverge, jsonl), lines.join("\n") + "\n");
        expect(verifyGlm46vTwoArmOutput(diverge).detail).toContain("forkInputHashV1 differs across arms");
      } finally { rmSync(diverge, { recursive: true, force: true }); }

      // 5. tampered finalBrier (kept finalAgentBeliefs -> recompute mismatch)
      const brier = tempDir("glm46v-brier-");
      try {
        cpSync(base, brier, { recursive: true });
        const lines = readLines(brier);
        const row = JSON.parse(lines[0]);
        row.finalBrier = 0.0;
        lines[0] = JSON.stringify(row);
        writeFileSync(path.join(brier, jsonl), lines.join("\n") + "\n");
        expect(verifyGlm46vTwoArmOutput(brier).detail).toContain("does not recompute");
      } finally { rmSync(brier, { recursive: true, force: true }); }

      // 6. tampered manifest
      const manifestDir = tempDir("glm46v-manifest-");
      try {
        cpSync(base, manifestDir, { recursive: true });
        const manifestPath = path.join(manifestDir, "manifest.json");
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        manifest.model = "zhipu:glm-4.5-air";
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        expect(verifyGlm46vTwoArmOutput(manifestDir).detail).toContain("manifest contentHash");
      } finally { rmSync(manifestDir, { recursive: true, force: true }); }

      // 7. tampered summary (stopReason)
      const summaryDir = tempDir("glm46v-summary-");
      try {
        cpSync(base, summaryDir, { recursive: true });
        const summaryPath = path.join(summaryDir, "summary.json");
        const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
        summary.stopReason = "token_budget_exceeded";
        writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        expect(verifyGlm46vTwoArmOutput(summaryDir).ok).toBe(false);
      } finally { rmSync(summaryDir, { recursive: true, force: true }); }

      // 8. tampered plan.json
      const planDir = tempDir("glm46v-plan-");
      try {
        cpSync(base, planDir, { recursive: true });
        const planPath = path.join(planDir, "plan.json");
        const plan = JSON.parse(readFileSync(planPath, "utf8"));
        plan.model = "zhipu:glm-4.5-air";
        writeFileSync(planPath, JSON.stringify(plan, null, 2));
        expect(verifyGlm46vTwoArmOutput(planDir).ok).toBe(false);
      } finally { rmSync(planDir, { recursive: true, force: true }); }

      // 9. tampered execution.json (runnerConfigHash)
      const execDir = tempDir("glm46v-exec-");
      try {
        cpSync(base, execDir, { recursive: true });
        const execPath = path.join(execDir, "execution.json");
        const exec = JSON.parse(readFileSync(execPath, "utf8"));
        exec.runnerConfigHash = "sha256:" + "0".repeat(64);
        writeFileSync(execPath, JSON.stringify(exec, null, 2));
        expect(verifyGlm46vTwoArmOutput(execDir).detail).toContain("runnerConfigHash");
      } finally { rmSync(execDir, { recursive: true, force: true }); }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it("detects internal-consistency tampering: nulled finalBelief, modified finalReportedCount, ledger and summary tampering, manifest file removal", async () => {
    const base = tempDir("glm46v-verify2-");
    try {
      freezeGlm46vTwoArmPlanV3(base);
      await executeGlm46vTwoArmGate({
        outputDir: base, invoker: mockInvoker(),
        repoState: { gitCommit: "f00dcafe", worktreeDirty: false },
      });
      expect(verifyGlm46vTwoArmOutput(base).ok).toBe(true);

      const jsonl = runFiles(base)[0];
      const tamperRow = (dir: string, mutate: (row: Record<string, unknown>) => void, index = 0): void => {
        const filePath = path.join(dir, jsonl);
        const lines = readFileSync(filePath, "utf8").trim().split("\n");
        const row = JSON.parse(lines[index]);
        mutate(row);
        lines[index] = JSON.stringify(row);
        writeFileSync(filePath, lines.join("\n") + "\n");
      };

      // 1. finalBelief/Brier/accuracy nulled while finalAgentBeliefs is non-empty
      const nulled = tempDir("glm46v-nulled-");
      try {
        cpSync(base, nulled, { recursive: true });
        tamperRow(nulled, row => {
          row.finalBelief = null;
          row.finalBrier = null;
          row.finalAccuracy = null;
        });
        const result = verifyGlm46vTwoArmOutput(nulled);
        expect(result.ok).toBe(false);
        expect(result.detail).toContain("must not be null");
      } finally { rmSync(nulled, { recursive: true, force: true }); }

      // 2. modified finalReportedCount
      const count = tempDir("glm46v-count-");
      try {
        cpSync(base, count, { recursive: true });
        tamperRow(count, row => { row.finalReportedCount = 99; });
        const result = verifyGlm46vTwoArmOutput(count);
        expect(result.ok).toBe(false);
        expect(result.detail).toContain("finalReportedCount");
      } finally { rmSync(count, { recursive: true, force: true }); }

      // 3. manifest file entry removed (task dropped from the manifest)
      const drop = tempDir("glm46v-drop-");
      try {
        cpSync(base, drop, { recursive: true });
        const manifestPath = path.join(drop, "manifest.json");
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        manifest.files = manifest.files.slice(1);
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        const result = verifyGlm46vTwoArmOutput(drop);
        expect(result.ok).toBe(false);
        expect(result.detail).toContain("unregistered file");
      } finally { rmSync(drop, { recursive: true, force: true }); }

      // 4. ledger attempt deleted
      const ledgerDel = tempDir("glm46v-ledgerdel-");
      try {
        cpSync(base, ledgerDel, { recursive: true });
        const ledgerPath = path.join(ledgerDel, "attempts.jsonl");
        const lines = readFileSync(ledgerPath, "utf8").trim().split("\n");
        writeFileSync(ledgerPath, lines.slice(0, -1).join("\n") + (lines.length > 1 ? "\n" : ""));
        const result = verifyGlm46vTwoArmOutput(ledgerDel);
        expect(result.ok).toBe(false);
        expect(result.detail).toContain("ledgerHash");
      } finally { rmSync(ledgerDel, { recursive: true, force: true }); }

      // 5. ledger attempt duplicated
      const ledgerDup = tempDir("glm46v-ledgerdup-");
      try {
        cpSync(base, ledgerDup, { recursive: true });
        const ledgerPath = path.join(ledgerDup, "attempts.jsonl");
        const lines = readFileSync(ledgerPath, "utf8").trim().split("\n");
        writeFileSync(ledgerPath, lines.join("\n") + "\n" + lines[0] + "\n");
        const result = verifyGlm46vTwoArmOutput(ledgerDup);
        expect(result.ok).toBe(false);
        expect(result.detail).toContain("ledgerHash");
      } finally { rmSync(ledgerDup, { recursive: true, force: true }); }

      // 6. summary cumulative calls/tokens wrong
      const sum = tempDir("glm46v-summary-");
      try {
        cpSync(base, sum, { recursive: true });
        const summaryPath = path.join(sum, "summary.json");
        const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
        summary.actualProviderCalls = summary.actualProviderCalls + 1;
        writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        const result = verifyGlm46vTwoArmOutput(sum);
        expect(result.ok).toBe(false);
        expect(result.detail).toContain("actualProviderCalls");
      } finally { rmSync(sum, { recursive: true, force: true }); }

      // 7. final raw response hash mismatch
      const raw = tempDir("glm46v-raw-");
      try {
        cpSync(base, raw, { recursive: true });
        tamperRow(raw, row => {
          const raws = row.finalRawResponses as Array<{ arm: string; agentId: string; rawResponse: string }>;
          if (raws && raws.length > 0) raws[0].rawResponse = raws[0].rawResponse + "x";
        });
        const result = verifyGlm46vTwoArmOutput(raw);
        expect(result.ok).toBe(false);
        expect(result.detail).toContain("raw response hash mismatch");
      } finally { rmSync(raw, { recursive: true, force: true }); }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Shared engine (runForkExecute two-arm parameterization still works)
// ---------------------------------------------------------------------------

describe("shared fork engine two-arm parameterization (regression)", () => {
  it("runForkExecute writes 2-row files, accounts usage, replays and resumes (no SUPPORTS anywhere)", async () => {
    const invoker = mockInvoker();
    const outputDir = tempDir("glm46v-engine-");
    try {
      const plan = buildForkPlanV1([TASK_ID], [0], GLM46V_MODEL, GLM46V_ARMS);
      const budget = new V6ProviderCallBudget(plan.totalPlannedProviderCalls, 5_200_000);
      const diagnostics: ForkRunDiagnostics = { parserFailures: 0, missingReports: 0 };
      const result = await runForkExecute({ plan, invoker, outputDir, budget, arms: GLM46V_ARMS, diagnostics });
      expect(result.runs).toBe(1);
      expect(result.rows).toBe(2);
      expect(budget.callCount).toBe(20);
      expect(budget.tokenCount).toBe(200);
      expect(diagnostics.parserFailures).toBe(0);
      expect(diagnostics.missingReports).toBe(0);
      const manifest = JSON.parse(readFileSync(path.join(outputDir, "manifest.json"), "utf8"));
      expect(manifest.arms).toEqual([...GLM46V_ARMS]);
      for (const line of readFileSync(path.join(outputDir, manifest.files[0].fileName), "utf8").trim().split("\n")) {
        expect(JSON.parse(line).arm).not.toBe("SUPPORTS");
      }
      expect(verifyForkOutput(outputDir, GLM46V_ARMS).ok).toBe(true);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("budget fails closed when usage is missing or inconsistent (never treated as 0)", () => {
    const budget = new V6ProviderCallBudget(100, 5_200_000);
    expect(() => budget.recordProviderUsage({ promptTokens: 5 }))
      .toThrow(/provider_usage_required_for_budget/);
    expect(() => budget.recordProviderUsage({ promptTokens: 5, completionTokens: 5, totalTokens: 9 }))
      .toThrow(/provider_usage_invalid_for_budget/);
  });

  it("the token stop threshold allows a bounded one-attempt overshoot and accounts it", () => {
    const budget = new V6ProviderCallBudget(100, 25);
    budget.beforeProviderCall();
    budget.recordProviderUsage({ promptTokens: 10, completionTokens: 10, totalTokens: 20 });
    budget.beforeProviderCall();
    expect(() => budget.recordProviderUsage({ promptTokens: 5, completionTokens: 5, totalTokens: 10 }))
      .toThrow(/token_budget_exceeded/);
    expect(budget.tokenCount).toBe(30);
    expect(budget.callCount).toBe(2);
  });

  it("budget restore rejects a ledger history that exceeds the call cap (fail closed)", () => {
    expect(() => new V6ProviderCallBudget(885, 5_200_000, 886, 0)).toThrow(/initialCalls exceed/);
    const restored = new V6ProviderCallBudget(885, 5_200_000, 100, 5_200_100);
    expect(restored.callCount).toBe(100);
    expect(restored.tokenCount).toBe(5_200_100); // recorded overshoot survives restore
    expect(restored.maxTotalTokensCap).toBe(5_200_000);
  });
});

// ---------------------------------------------------------------------------
// End-to-end wire shape through the real zhipu invoker (mocked fetch)
// ---------------------------------------------------------------------------

describe("GLM-4.6V wire shape through runFork (mocked fetch, zero network)", () => {
  beforeEach(() => {
    process.env.ZHIPU_API_KEY = "sk-test-dummy";
  });
  afterEach(() => {
    delete process.env.ZHIPU_API_KEY;
    vi.unstubAllGlobals();
  });

  it("every discussion call sends max_tokens 768 + thinking disabled; finals 256 + thinking disabled", async () => {
    const calls: Array<{ body: { max_tokens?: number; thinking?: unknown; messages?: Array<{ role: string; content: string }> } }> = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { max_tokens?: number; thinking?: unknown; messages?: Array<{ role: string; content: string }> };
      calls.push({ body });
      const isFinal = body.messages?.[0]?.content?.includes("private outcome measurement");
      const content = isFinal ? finalPayload(probsFor(0)) : discussionPayload(0);
      return {
        ok: true, status: 200, statusText: "",
        json: async () => ({ choices: [{ message: { content } }], usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 } }),
        text: async () => "",
      } as unknown as Response;
    });

    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    const rows = await runFork({
      taskId: TASK_ID, seed: 0, model: GLM46V_MODEL, invoker, arms: GLM46V_ARMS,
      discussionConfigOverride: { maxTokens: GLM46V_DISCUSSION_MAX_TOKENS, thinking: GLM46V_THINKING },
      finalConfigOverride: { maxTokens: GLM46V_FINAL_MAX_TOKENS, thinking: GLM46V_THINKING },
    });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map(r => r.forkInputHashV1)).size).toBe(1);

    const discussion = calls.filter(c => !c.body.messages?.[0]?.content?.includes("private outcome measurement"));
    const finals = calls.filter(c => c.body.messages?.[0]?.content?.includes("private outcome measurement"));
    expect(discussion).toHaveLength(12);
    expect(finals).toHaveLength(8);
    for (const c of discussion) {
      expect(c.body.max_tokens).toBe(768);
      expect(c.body.thinking).toEqual({ type: "disabled" });
    }
    for (const c of finals) {
      expect(c.body.max_tokens).toBe(256);
      expect(c.body.thinking).toEqual({ type: "disabled" });
    }
    for (const row of rows) {
      expect(row.finalBelief).not.toBeNull();
      expect(row.finalReportedCount).toBe(4);
    }
  });
});
