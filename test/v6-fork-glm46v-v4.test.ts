/**
 * V4 facility tests (synthetic/mock only; no formal outcome, no network):
 *  1. parseBeliefResponse lineageId normalization: null -> absent; empty string
 *     and numeric lineageId still rejected; message/belief/relation untouched;
 *  2. discussion prompt: real double-quoted JSON example + lineageId omit rule;
 *  3. final prompt: exact claimId as a standalone JSON-quoted field, no
 *     <id>/<canonical outcome> placeholders, bracket-closing instruction;
 *  4. v4-strict completion eligibility: all-discussion-failure yields
 *     completed=0 / failed=1 / no scientific run file; partial final invalid
 *     never yields an analyzable complete pair;
 *  5. V4 analyzer missingness: failed/skipped tasks without run files are
 *     missing (failed_task / skipped_task) and enter the -2/+2 bounds;
 *     completed-without-file, no-taskStatus, extra/duplicate tasks and task 14
 *     fail closed; bootstrap reproducibility.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { parseBeliefResponse } from "../experiments/campaign/v6/productionVerticalSlice";
import { buildFinalElicitationPrompt, createFinalElicitationContract } from "../src/lib/experimentation/finalOutcome";
import { createV6DiscussionAdapter, type SingleAttemptTextInvoker, type SingleAttemptTextInvokeRequest } from "../experiments/campaign/v6/providerAdapters";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import { executeGlm46vTwoArmGate, buildGlm46vTwoArmPlanV4, recomputeGlm46vPlanHash, GLM46V_ARMS, GLM46V_MODEL, type Glm46vTwoArmPlanV4 } from "../experiments/campaign/v6/run_v6_fork_glm46v_two_arm_v4";
import { forkPlannedCallsForRunV1 } from "../experiments/campaign/v6/run_v6_fork";
import {
  computeV4Analysis,
  createV4SeededRng,
  V4_BOOTSTRAP_MASTER_SEED,
  V4_BOOTSTRAP_REPETITIONS,
  type V4AnalysisInput,
} from "../experiments/campaign/v6/analyze_v6_fork_glm46v_v4";

const TASK_ID = 14;
const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId: TASK_ID });
const claim = projection.adapter.task.claim;

// ---------------------------------------------------------------------------
// 1. parseBeliefResponse lineageId normalization
// ---------------------------------------------------------------------------

function discussionPayload(probabilities: Record<string, number>, evidence: unknown[]): string {
  return JSON.stringify({ message: "m", belief: { kind: "categorical", probabilities }, evidence });
}

describe("parseBeliefResponse lineageId normalization (V4)", () => {
  it("normalizes lineageId:null to absent without inventing lineage", () => {
    const probs = Object.fromEntries(claim.options.map((o, i) => [o, i === 0 ? 0.9 : 0.1 / (claim.options.length - 1)]));
    const raw = discussionPayload(probs, [
      { content: "fact a", relation: "supports", lineageId: null },
      { content: "fact b", relation: "attacks" },
      { content: "fact c", relation: "supports", lineageId: "lineage:known" },
    ]);
    const parsed = parseBeliefResponse(raw, claim);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // null and absent are both absent; a real string survives
    expect(parsed.parsed.evidence[0]).toEqual({ content: "fact a", relation: "supports" });
    expect(parsed.parsed.evidence[1]).toEqual({ content: "fact b", relation: "attacks" });
    expect(parsed.parsed.evidence[2]).toEqual({ content: "fact c", relation: "supports", lineageId: "lineage:known" });
    // message/belief untouched
    expect(parsed.parsed.message).toBe("m");
    expect(parsed.parsed.value.kind).toBe("categorical");
  });

  it("still rejects an empty-string lineageId and a numeric lineageId", () => {
    const probs = Object.fromEntries(claim.options.map((o, i) => [o, i === 0 ? 0.9 : 0.1 / (claim.options.length - 1)]));
    const empty = parseBeliefResponse(discussionPayload(probs, [{ content: "x", relation: "supports", lineageId: "" }]), claim);
    expect(empty.ok).toBe(false);
    expect(empty.ok || empty.code).toBe("evidence_shape");
    const numeric = parseBeliefResponse(discussionPayload(probs, [{ content: "x", relation: "supports", lineageId: 42 }]), claim);
    expect(numeric.ok).toBe(false);
    expect(numeric.ok || numeric.code).toBe("evidence_shape");
  });
});

// ---------------------------------------------------------------------------
// 2. discussion prompt shape
// ---------------------------------------------------------------------------

describe("discussion prompt (V4)", () => {
  it("uses a real double-quoted JSON example and the lineageId omit rule", async () => {
    const contract = {
      id: "swarmalpha.adapter.discussion-fixture",
      version: "1.0.0",
      adapterRef: { id: "a", version: "1.0.0" },
      agentBindings: [{ agentId: "agent:a", modelRef: { id: "m", version: "1.0.0" }, invocationConfig: {} }],
      timeoutMs: 1000,
      retryPolicy: "none",
      executionOrder: "round_then_precommitted_agent",
    };
    const invoker: SingleAttemptTextInvoker = {
      async invoke(request: SingleAttemptTextInvokeRequest) {
        captured = request;
        return { rawContent: JSON.stringify({ message: "m", belief: { kind: "categorical", probabilities: Object.fromEntries(claim.options.map((o, i) => [o, i === 0 ? 1 : 0])) }, evidence: [] }) };
      },
    };
    let captured: SingleAttemptTextInvokeRequest | null = null;
    const adapter = createV6DiscussionAdapter({ contract: contract as never, invoker });
    await adapter.respond({
      requestSchemaRef: { id: "s", version: "1.0.0" },
      requestId: "discussion:fork:task-14:seed-0:r1:agent:a",
      runId: "fork:task-14:seed-0",
      taskId: "task:hiddenbench:14",
      agentId: "agent:a",
      round: 1,
      protocol: "epistemic_governance_v1",
      publicContext: "ctx",
      ownPrivateInformation: "priv",
      claim: structuredClone(claim),
      visibleTranscript: [],
      responseContract: "belief_json_v1",
      modelRef: { id: "m", version: "1.0.0" },
      invocationConfig: { temperature: 0 },
    } as never, new AbortController().signal);
    const userPrompt = captured!.userPrompt;
    // real double-quoted JSON example with the REAL first canonical option
    expect(userPrompt).toContain(`"${claim.options[0]}": 0.5`);
    expect(userPrompt).toContain('"message": "My assessment."');
    expect(userPrompt).toContain('never output "lineageId": null');
    expect(userPrompt).toContain('"lineageId" must be omitted unless you know a non-empty string');
  });
});

// ---------------------------------------------------------------------------
// 3. final prompt shape
// ---------------------------------------------------------------------------

describe("final prompt (V4)", () => {
  it("exposes the exact claimId as a JSON-quoted standalone field and real options", () => {
    const contract = createFinalElicitationContract({
      id: "fixture.final.v4", version: "1.0.0", claimIds: [claim.id],
    });
    const prompt = buildFinalElicitationPrompt({
      view: {
        publicContext: "ctx",
        ownPrivateInformation: "priv",
        discussionTranscript: [{ round: 1, agentId: "agent:a", content: "hi" }],
      },
      contract,
      claims: [claim],
    });
    expect(prompt).toContain(`- claimId: "${claim.id}"`);
    expect(prompt).toContain(`Proposition: ${claim.proposition}`);
    // no placeholder-driven concatenation
    expect(prompt).not.toContain(`claimId=${claim.id}: ${claim.proposition}`);
    expect(prompt).not.toContain('"<id>"');
    expect(prompt).not.toContain("<canonical outcome>");
    // response template embeds the REAL claimId and REAL options
    expect(prompt).toContain(`"claimId":"${claim.id}"`);
    for (const option of claim.options) {
      expect(prompt).toContain(`"${option}":`);
    }
    expect(prompt).toContain("verify that every bracket in your JSON is closed");
  });
});

// ---------------------------------------------------------------------------
// 4. v4-strict completion eligibility
// ---------------------------------------------------------------------------

function smallPlan(taskIds: number[]): Glm46vTwoArmPlanV4 {
  const base = buildGlm46vTwoArmPlanV4();
  const { contentHash: _c, ...body } = base;
  let calls = 0;
  for (const taskId of taskIds) calls += forkPlannedCallsForRunV1(taskId, GLM46V_ARMS);
  const next = {
    ...body,
    taskIds,
    totalRuns: taskIds.length,
    plannedProviderCalls: calls,
    plannedEstimateTokens: calls * base.perCallTokenEstimate,
    estimateWithinStopThreshold: true,
  };
  return { ...next, contentHash: recomputeGlm46vPlanHash({ ...next, contentHash: "" }) };
}

function tempDir(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

function validDiscussion(taskId: number): string {
  const opts = createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task.claim.options;
  const probs = Object.fromEntries(opts.map((o, i) => [o, i === 0 ? 0.9 : 0.1 / (opts.length - 1)]));
  return JSON.stringify({
    message: "m",
    belief: { kind: "categorical", probabilities: probs },
    evidence: [{ content: "fact", relation: "supports", lineageId: null }],
  });
}

function validFinal(taskId: number): string {
  const opts = createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task.claim.options;
  const probs = Object.fromEntries(opts.map((o, i) => [o, i === 0 ? 0.9 : 0.1 / (opts.length - 1)]));
  return JSON.stringify({
    status: "answered",
    reports: [{ claimId: `claim:hiddenbench:${taskId}:answer`, value: { kind: "categorical", probabilities: probs } }],
  });
}

describe("v4-strict completion eligibility", () => {
  it("all-discussion-failure: completed=0, failed=1, no scientific run file", async () => {
    const dir = tempDir("v4-elig-");
    try {
      const plan = smallPlan([15]);
      const invoker: SingleAttemptTextInvoker = {
        async invoke(request: SingleAttemptTextInvokeRequest) {
          if (request.requestId.startsWith("final:")) return { rawContent: validFinal(15), usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 } };
          return { rawContent: "this is not json at all", usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 } };
        },
      };
      const result = await executeGlm46vTwoArmGate({
        outputDir: dir, invoker, plan, repoState: { gitCommit: "v4test", worktreeDirty: false },
      });
      expect(result.status).toBe("completed");
      expect(result.completedTasks).toBe(0);
      expect(result.failedTasks).toBe(1);
      expect(result.skippedTasks).toBe(0);
      // no scientific run file; management artifacts only
      const files = readdirSync(dir).filter(f => f.endsWith(".jsonl") && f !== "attempts.jsonl");
      expect(files).toHaveLength(0);
      // ledger records the actual attempts and the explicit failure reason
      const ledgerText = readFileSync(path.join(dir, "attempts.jsonl"), "utf8");
      expect(ledgerText).toContain("task_failed");
      expect(ledgerText).toContain("discussion_r1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("partial final invalid: the task fails and never yields an analyzable complete pair", async () => {
    const dir = tempDir("v4-elig-");
    try {
      const plan = smallPlan([15]);
      const invoker: SingleAttemptTextInvoker = {
        async invoke(request: SingleAttemptTextInvokeRequest) {
          const usage = { promptTokens: 5, completionTokens: 5, totalTokens: 10 };
          if (request.requestId.startsWith("final:")) {
            const idx = /agent:hiddenbench:\d+:(\d+)/.exec(request.requestId)?.[1];
            // agent 1 returns a WRONG claimId -> canonical parser invalid
            if (idx === "1") return { rawContent: JSON.stringify({ status: "answered", reports: [{ claimId: "claim:hiddenbench:99:answer", value: { kind: "categorical", probabilities: { A: 1 } } }] }), usage };
            return { rawContent: validFinal(15), usage };
          }
          return { rawContent: validDiscussion(15), usage };
        },
      };
      const result = await executeGlm46vTwoArmGate({
        outputDir: dir, invoker, plan, repoState: { gitCommit: "v4test", worktreeDirty: false },
      });
      expect(result.status).toBe("completed");
      expect(result.completedTasks).toBe(0);
      expect(result.failedTasks).toBe(1);
      expect(readdirSync(dir).filter(f => f.endsWith(".jsonl") && f !== "attempts.jsonl")).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 5. V4 analyzer missingness
// ---------------------------------------------------------------------------

function synthRow(taskId: number, arm: "CONTROL" | "ATTACKS", brier: number | null): unknown {
  return {
    taskId, seed: 0, model: GLM46V_MODEL, round1StateHash: "sha256:" + "0".repeat(64), arm,
    finalBrier: brier, finalAccuracy: brier === null ? null : brier < 0.5 ? 1 : 0,
    resolvedOption: createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task.outcome,
    round1AgentBeliefs: [],
  };
}

function synthInput(overrides: {
  completedTaskIds?: number[];
  failedTaskIds?: number[];
  skippedTaskIds?: number[];
  nullBrierTaskIds?: number[];
  extraFileTaskId?: number;
  duplicateFileTaskId?: number;
  task14File?: boolean;
  dropTaskStatusFor?: number[];
  completedWithoutFile?: number[];
} = {}): V4AnalysisInput {
  const plan = buildGlm46vTwoArmPlanV4();
  const completed = overrides.completedTaskIds ?? plan.taskIds.filter(t => !(overrides.failedTaskIds ?? []).includes(t) && !(overrides.skippedTaskIds ?? []).includes(t));
  const nullBrier = overrides.nullBrierTaskIds ?? [];
  const taskStatus = plan.taskIds
    .filter(t => !(overrides.dropTaskStatusFor ?? []).includes(t))
    .map(taskId => {
      let status = "completed";
      if ((overrides.failedTaskIds ?? []).includes(taskId)) status = "failed";
      if ((overrides.skippedTaskIds ?? []).includes(taskId)) status = "skipped";
      if ((overrides.completedWithoutFile ?? []).includes(taskId)) status = "completed";
      return { runId: `run:fork-v1:task-${taskId}:seed-0`, taskId, seed: 0, status, ...(status !== "completed" ? { reason: status } : {}) };
    });
  const runFiles = completed
    .filter(t => !(overrides.completedWithoutFile ?? []).includes(t))
    .map(taskId => ({
      taskId,
      rows: [
        synthRow(taskId, "CONTROL", nullBrier.includes(taskId) ? null : 0.5),
        synthRow(taskId, "ATTACKS", nullBrier.includes(taskId) ? null : 0.4),
      ] as never,
    }));
  if (overrides.extraFileTaskId !== undefined) {
    runFiles.push({ taskId: overrides.extraFileTaskId, rows: [synthRow(overrides.extraFileTaskId, "CONTROL", 0.5), synthRow(overrides.extraFileTaskId, "ATTACKS", 0.4)] as never });
  }
  if (overrides.duplicateFileTaskId !== undefined) {
    runFiles.push({ taskId: overrides.duplicateFileTaskId, rows: [synthRow(overrides.duplicateFileTaskId, "CONTROL", 0.5), synthRow(overrides.duplicateFileTaskId, "ATTACKS", 0.4)] as never });
  }
  if (overrides.task14File) {
    runFiles.push({ taskId: 14, rows: [synthRow(14, "CONTROL", 0.5), synthRow(14, "ATTACKS", 0.4)] as never });
  }
  return {
    plan,
    manifest: {
      contentHash: "sha256:" + "a".repeat(64),
      ledgerHash: "sha256:" + "b".repeat(64),
      taskStatus,
    } as never,
    summary: { completedTasks: 0, failedTasks: 0, skippedTasks: 0, contentHash: "sha256:" + "c".repeat(64) } as never,
    ledgerScan: { events: [], unfinishedAttemptIds: [], physicalAttempts: 0, observedTokens: 0, unknownUsageCalls: 0, runsAttempted: [], failedRunIds: [] },
    runFiles,
  };
}

describe("V4 analyzer missingness rules", () => {
  it("validates rows against the single seed frozen in the plan instead of hard-coding seed 0", () => {
    const input = synthInput();
    input.plan.seeds = [1];
    for (const status of input.manifest.taskStatus) status.seed = 1;
    for (const file of input.runFiles) {
      for (const row of file.rows) row.seed = 1;
    }
    expect(computeV4Analysis(input).primary.completePairs).toBe(44);
    input.runFiles[0].rows[0].seed = 0;
    expect(() => computeV4Analysis(input)).toThrow(/does not match frozen plan seed 1/);
  });

  it("accepts a failed task WITHOUT a run file as missing (failed_task) and bounds it", () => {
    const input = synthInput({ failedTaskIds: [15] });
    const analysis = computeV4Analysis(input);
    expect(analysis.primary.completePairs).toBe(43);
    expect(analysis.primary.missingPairs).toBe(1);
    expect(analysis.primary.missingReasons).toEqual({ failed_task: 1, skipped_task: 0, null_brier: 0, unexplained_missing: 0 });
    const task15 = analysis.taskTable.find(t => t.taskId === 15)!;
    expect(task15.complete).toBe(false);
    expect(task15.missingReason).toBe("failed_task");
    // bounds: (43 * -0.1 + (-2)) / 44 and (43 * -0.1 + (+2)) / 44
    expect(analysis.primary.bounds44.assignedLowerDelta).toBe(-2);
    expect(analysis.primary.bounds44.assignedUpperDelta).toBe(+2);
    expect(analysis.primary.bounds44.incompleteTaskCount).toBe(1);
    expect(analysis.primary.bounds44.lowerMeanDelta!).toBeCloseTo((43 * -0.1 - 2) / 44, 9);
    expect(analysis.primary.bounds44.upperMeanDelta!).toBeCloseTo((43 * -0.1 + 2) / 44, 9);
    expect(analysis.primary.classification).toBe("PASS");
  });

  it("classifies skipped_task and null_brier missingness", () => {
    const input = synthInput({ skippedTaskIds: [16], nullBrierTaskIds: [17] });
    const analysis = computeV4Analysis(input);
    expect(analysis.primary.missingReasons).toEqual({ failed_task: 0, skipped_task: 1, null_brier: 1, unexplained_missing: 0 });
    expect(analysis.primary.bounds44.incompleteTaskCount).toBe(2);
    expect(analysis.taskTable.find(t => t.taskId === 16)!.missingReason).toBe("skipped_task");
    expect(analysis.taskTable.find(t => t.taskId === 17)!.missingReason).toBe("null_brier");
  });

  it("fails closed on a completed task without a run file", () => {
    expect(() => computeV4Analysis(synthInput({ completedWithoutFile: [18] })))
      .toThrow(/completed but no run file/);
  });

  it("fails closed on a task without any taskStatus entry", () => {
    expect(() => computeV4Analysis(synthInput({ dropTaskStatusFor: [19] })))
      .toThrow(/no taskStatus entry/);
  });

  it("fails closed on extra, duplicate, and task-14 run files", () => {
    // task 1 is a valid catalog task but NOT part of the frozen 44-task population
    expect(() => computeV4Analysis(synthInput({ extraFileTaskId: 1 })))
      .toThrow(/outside the frozen 44-task population/);
    expect(() => computeV4Analysis(synthInput({ duplicateFileTaskId: 20 })))
      .toThrow(/duplicate run file/);
    expect(() => computeV4Analysis(synthInput({ task14File: true })))
      .toThrow(/task 14 must never enter the formal sample/);
  });

  it("bootstrap is deterministic and the master seed is pinned", () => {
    const input = synthInput({ failedTaskIds: [15] });
    const first = computeV4Analysis(input);
    const second = computeV4Analysis(input);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(V4_BOOTSTRAP_MASTER_SEED).toBe(0x5eed0f);
    expect(V4_BOOTSTRAP_REPETITIONS).toBe(10_000);
    expect(createV4SeededRng(0x5eed0f)()).toBe(createV4SeededRng(0x5eed0f)());
  });
});
