/**
 * Focused synthetic tests for the frozen V3 analysis
 * (analyze_v6_fork_glm46v_v3.ts). Synthetic rows only — no formal outcome is
 * inspected here. Covers:
 *  - PASS / DIRECTIONAL / FAIL classification;
 *  - missing-pair boundaries and the all-44 worst/best bounds;
 *  - task 14 (and out-of-plan tasks) rejection;
 *  - bootstrap reproducibility;
 *  - full-directory pipeline (read -> compute -> write -> verify) with the
 *    frozen plan and the pinned analysis-spec hash.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import * as path from "node:path";
import {
  computeV3Analysis,
  readV3OutputDirectory,
  writeV3AnalysisOutput,
  verifyV3AnalysisOutput,
  createV3SeededRng,
  V3_BOOTSTRAP_MASTER_SEED,
  V3_BOOTSTRAP_REPETITIONS,
  type V3AnalysisInput,
} from "../experiments/campaign/v6/analyze_v6_fork_glm46v_v3";
import {
  buildGlm46vTwoArmPlanV3,
  freezeGlm46vTwoArmPlanV3,
  buildGlm46vTwoArmExecutionV1,
  buildGlm46vTwoArmManifestV2,
  recomputeGlm46vSummaryHash,
  GLM46V_MODEL,
  GLM46V_ARMS,
  type Glm46vTwoArmPlanV3,
  type Glm46vTwoArmSummaryV2,
} from "../experiments/campaign/v6/run_v6_fork_glm46v_two_arm";
import { forkRunId, forkRunPath, type ForkRow } from "../experiments/campaign/v6/run_v6_fork";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";

const FROZEN_ANALYSIS_SPEC_HASH = "sha256:ba05f4e38f64285c8f45f467480ef24b7cedbcd4b73eae1fd740ff1b00984c02";

function sha(s: string): string {
  return `sha256:${createHash("sha256").update(s, "utf8").digest("hex")}`;
}

function optionsOf(taskId: number): string[] {
  return createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task.claim.options;
}

function outcomeOf(taskId: number): string {
  return createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task.outcome;
}

function synthRow(
  taskId: number,
  arm: "CONTROL" | "ATTACKS",
  brier: number | null,
  accuracy: number | null,
): ForkRow {
  const options = optionsOf(taskId);
  const round1Probs = Object.fromEntries(options.map((o, i) => [o, i === 0 ? 0.9 : 0.1 / (options.length - 1)]));
  return {
    taskId,
    seed: 0,
    model: GLM46V_MODEL,
    round1StateHash: "sha256:" + "0".repeat(64),
    arm,
    finalBrier: brier,
    finalAccuracy: accuracy,
    resolvedOption: outcomeOf(taskId),
    round1AgentBeliefs: [round1Probs, round1Probs],
  } as unknown as ForkRow;
}

function synthInput(
  plan: Glm46vTwoArmPlanV3,
  spec: Array<{ taskId: number; controlBrier: number | null; attacksBrier: number | null }>,
): V3AnalysisInput {
  const runFiles = spec.map(entry => ({
    taskId: entry.taskId,
    rows: [
      synthRow(entry.taskId, "CONTROL", entry.controlBrier, entry.controlBrier === null ? null : entry.controlBrier < 0.5 ? 1 : 0),
      synthRow(entry.taskId, "ATTACKS", entry.attacksBrier, entry.attacksBrier === null ? null : entry.attacksBrier < 0.5 ? 1 : 0),
    ],
  }));
  return {
    plan,
    manifest: {
      contentHash: "sha256:" + "a".repeat(64),
      ledgerHash: "sha256:" + "b".repeat(64),
    } as never,
    summary: {
      completedTasks: spec.length,
      failedTasks: 0,
      skippedTasks: 0,
      contentHash: "sha256:" + "c".repeat(64),
    } as never,
    ledgerScan: {
      events: [],
      unfinishedAttemptIds: [],
      physicalAttempts: 0,
      observedTokens: 0,
      unknownUsageCalls: 0,
      runsAttempted: [],
      failedRunIds: [],
    },
    runFiles,
  };
}

const plan = buildGlm46vTwoArmPlanV3();
const TASK_IDS = plan.taskIds;

describe("V3 analysis: primary classification", () => {
  it("classifies PASS when mean < 0 and the bootstrap CI upper endpoint < 0", () => {
    const spec = TASK_IDS.map(taskId => ({
      taskId,
      controlBrier: 0.5,
      attacksBrier: 0.3, // delta = -0.2 everywhere
    }));
    const analysis = computeV3Analysis(synthInput(plan, spec));
    expect(analysis.primary.completePairs).toBe(44);
    expect(analysis.primary.missingPairs).toBe(0);
    expect(analysis.primary.meanDelta!).toBeCloseTo(-0.2, 9);
    expect(analysis.primary.ci95.lo!).toBeLessThan(0);
    expect(analysis.primary.ci95.hi!).toBeLessThan(0);
    expect(analysis.primary.classification).toBe("PASS");
  });

  it("classifies DIRECTIONAL when mean < 0 but the CI includes 0", () => {
    // 20 tasks delta=-0.5, 24 tasks delta=+0.35 -> mean = (-10+8.4)/44 < 0,
    // large dispersion -> the bootstrap CI spans 0 deterministically.
    const spec = TASK_IDS.map((taskId, i) => ({
      taskId,
      controlBrier: 0.5,
      attacksBrier: i < 20 ? 0.0 : 0.85,
    }));
    const analysis = computeV3Analysis(synthInput(plan, spec));
    expect(analysis.primary.meanDelta!).toBeLessThan(0);
    expect(analysis.primary.ci95.hi!).toBeGreaterThanOrEqual(0);
    expect(analysis.primary.classification).toBe("DIRECTIONAL");
  });

  it("classifies FAIL when the mean is zero or positive", () => {
    const spec = TASK_IDS.map(taskId => ({
      taskId,
      controlBrier: 0.3,
      attacksBrier: 0.5, // delta = +0.2 everywhere
    }));
    const analysis = computeV3Analysis(synthInput(plan, spec));
    expect(analysis.primary.meanDelta!).toBeGreaterThan(0);
    expect(analysis.primary.classification).toBe("FAIL");
  });
});

describe("V3 analysis: missingness boundaries", () => {
  it("reports complete/missing pairs and the all-44 worst/best bounds with -2/+2", () => {
    const spec = TASK_IDS.map((taskId, i) => ({
      taskId,
      controlBrier: i === 0 ? null : 0.5, // task 1 missing (CONTROL null brier)
      attacksBrier: i === 0 ? null : 0.4, // delta = -0.1 for the other 43
    }));
    const analysis = computeV3Analysis(synthInput(plan, spec));
    expect(analysis.primary.completePairs).toBe(43);
    expect(analysis.primary.missingPairs).toBe(1);
    expect(analysis.primary.missingReasons).toEqual({ both_arms_null_brier: 1 });
    // bounds: (43 * -0.1 + (-2)) / 44 and (43 * -0.1 + (+2)) / 44
    expect(analysis.primary.bounds44.lowerMeanDelta!).toBeCloseTo((43 * -0.1 - 2) / 44, 9);
    expect(analysis.primary.bounds44.upperMeanDelta!).toBeCloseTo((43 * -0.1 + 2) / 44, 9);
    expect(analysis.primary.bounds44.incompleteAssigned).toBe(2);
    // the incomplete task never contributes a delta to the primary mean
    expect(analysis.taskTable[0].delta).toBeNull();
    expect(analysis.taskTable[0].missingReason).toBe("both_arms_null_brier");
  });

  it("rejects task 14 from the formal sample", () => {
    const spec = TASK_IDS.map(taskId => ({
      taskId,
      controlBrier: 0.5,
      attacksBrier: 0.3,
    }));
    const input = synthInput(plan, spec);
    input.runFiles.push({
      taskId: 14,
      rows: [synthRow(14, "CONTROL", 0.5, 1), synthRow(14, "ATTACKS", 0.3, 1)],
    });
    expect(() => computeV3Analysis(input)).toThrow(/task 14 must never enter the formal sample/);
  });

  it("rejects tasks outside the frozen 44-task population", () => {
    const spec = TASK_IDS.map(taskId => ({
      taskId,
      controlBrier: 0.5,
      attacksBrier: 0.3,
    }));
    const input = synthInput(plan, spec);
    input.runFiles[0] = { taskId: 99, rows: input.runFiles[0].rows.map(r => ({ ...r, taskId: 99 })) };
    expect(() => computeV3Analysis(input)).toThrow(/outside the frozen 44-task population/);
  });
});

describe("V3 analysis: reproducibility and protocol pinning", () => {
  it("bootstrap is deterministic: identical inputs produce identical outputs", () => {
    const spec = TASK_IDS.map((taskId, i) => ({
      taskId,
      controlBrier: 0.5,
      attacksBrier: i < 20 ? 0.0 : 0.85,
    }));
    const first = computeV3Analysis(synthInput(plan, spec));
    const second = computeV3Analysis(synthInput(plan, spec));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.contentHash).toBe(second.contentHash);
    // the master seed is pinned by the protocol
    expect(V3_BOOTSTRAP_MASTER_SEED).toBe(0x5eed0f);
    expect(V3_BOOTSTRAP_REPETITIONS).toBe(10_000);
    // direct RNG determinism
    expect(createV3SeededRng(0x5eed0f)()).toBe(createV3SeededRng(0x5eed0f)());
  });

  it("binds the frozen analysis-spec hash inside the analysis inputs", () => {
    const spec = TASK_IDS.map(taskId => ({
      taskId,
      controlBrier: 0.5,
      attacksBrier: 0.3,
    }));
    const analysis = computeV3Analysis(synthInput(plan, spec));
    expect(analysis.inputs.analysisSpec.contentHash).toBe(FROZEN_ANALYSIS_SPEC_HASH);
    expect(analysis.inputs.planHash).toBe(plan.contentHash);
    expect(analysis.population.plannedTasks).toBe(44);
    expect(analysis.population.taskIds).not.toContain(14);
  });

  it("writeV3AnalysisOutput is fail-closed and idempotent; verify recomputes", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "v3-analysis-"));
    try {
      const spec = TASK_IDS.map(taskId => ({
        taskId,
        controlBrier: 0.5,
        attacksBrier: 0.3,
      }));
      const analysis = computeV3Analysis(synthInput(plan, spec));
      writeV3AnalysisOutput(dir, analysis);
      expect(existsSync(path.join(dir, "analysis-v1.json"))).toBe(true);
      expect(existsSync(path.join(dir, "analysis-v1.md"))).toBe(true);
      // idempotent re-write
      writeV3AnalysisOutput(dir, analysis);
      // conflicting content must refuse
      const tampered = { ...analysis, contentHash: "sha256:" + "0".repeat(64) };
      expect(() => writeV3AnalysisOutput(dir, tampered)).toThrow(/no_replace_conflict/);
      // verify on a directory WITHOUT the run artifacts cannot recompute from disk,
      // but the recompute path is exercised by the full-directory test below.
      expect(readFileSync(path.join(dir, "analysis-v1.json"), "utf8")).toContain(analysis.contentHash);
      expect(readFileSync(path.join(dir, "analysis-v1.md"), "utf8")).toContain(analysis.contentHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("V3 analysis: full-directory pipeline (synthetic 44-task output)", () => {
  it("reads the frozen plan + manifest + summary + ledger + run files and verifies", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "v3-full-"));
    try {
      freezeGlm46vTwoArmPlanV3(dir);
      const plan = buildGlm46vTwoArmPlanV3();

      // synthetic run files: 44 tasks, delta = -0.1 (CONTROL 0.5, ATTACKS 0.4)
      const files: Array<{ runId: string; taskId: number; seed: number; fileName: string; rowCount: number; contentHash: string; forkInputHashV1: string }> = [];
      for (const taskId of plan.taskIds) {
        const runId = forkRunId(taskId, 0);
        const rows = [
          synthRow(taskId, "CONTROL", 0.5, 1),
          synthRow(taskId, "ATTACKS", 0.4, 1),
        ];
        const text = `${rows.map(r => JSON.stringify(r)).join("\n")}\n`;
        const filePath = forkRunPath(dir, runId);
        writeFileSync(filePath, text, { flag: "wx" });
        files.push({
          runId,
          taskId,
          seed: 0,
          fileName: path.basename(filePath),
          rowCount: 2,
          contentHash: sha(text),
          forkInputHashV1: sha("synthetic"),
        });
      }

      // synthetic ledger (empty) + execution + manifest + summary
      writeFileSync(path.join(dir, "attempts.jsonl"), "", { flag: "wx" });
      const ledgerHash = sha("");
      const execution = buildGlm46vTwoArmExecutionV1({
        plan,
        repoState: { gitCommit: "synthetic", worktreeDirty: false },
        startedAt: "2026-08-20T00:00:00.000Z",
      });
      const manifest = buildGlm46vTwoArmManifestV2({
        plan,
        execution,
        ledgerHash,
        taskStatus: plan.taskIds.map(taskId => ({
          runId: forkRunId(taskId, 0), taskId, seed: 0, status: "completed" as const,
        })),
        startedAt: "2026-08-20T00:00:00.000Z",
        completedAt: "2026-08-20T00:01:00.000Z",
        files,
        totalRows: 88,
      });
      writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
      const summaryBody: Omit<Glm46vTwoArmSummaryV2, "contentHash" | "completedAt"> = {
        summarySchemaRef: { id: "s", version: "1.0.0" },
        experimentRef: { id: "e", version: "1.0.0" },
        model: GLM46V_MODEL,
        seeds: [0],
        arms: [...GLM46V_ARMS],
        taskCount: 44,
        plannedProviderCalls: plan.plannedProviderCalls,
        plannedEstimateTokens: plan.plannedEstimateTokens,
        tokenStopThreshold: plan.tokenStopThreshold,
        discussionMaxTokens: plan.discussionMaxTokens,
        finalMaxTokens: plan.finalMaxTokens,
        thinking: "disabled",
        concurrency: 1,
        stopReason: "completed",
        actualProviderCalls: 0,
        actualProviderTokens: 0,
        callsWithUnknownUsage: 0,
        discussionParserFailures: 0,
        finalInvalid: 0,
        finalUnavailable: 0,
        completedTasks: 44,
        failedTasks: 0,
        skippedTasks: 0,
        runsCompleted: 44,
        rows: 88,
        reused: 0,
        outputDir: dir,
        startedAt: "2026-08-20T00:00:00.000Z",
      };
      const summary: Glm46vTwoArmSummaryV2 = {
        ...summaryBody,
        completedAt: "2026-08-20T00:01:00.000Z",
        contentHash: recomputeGlm46vSummaryHash({ ...summaryBody, completedAt: "x", contentHash: "" }),
      };
      writeFileSync(path.join(dir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });

      // pipeline: read -> compute -> write -> verify
      const input = readV3OutputDirectory(dir);
      expect(input.runFiles).toHaveLength(44);
      const analysis = computeV3Analysis(input);
      expect(analysis.primary.completePairs).toBe(44);
      expect(analysis.primary.classification).toBe("PASS");
      writeV3AnalysisOutput(dir, analysis);
      const verification = verifyV3AnalysisOutput(dir);
      expect(verification.ok).toBe(true);
      // plan + analysis spec hashes pinned
      expect(analysis.inputs.planHash).toBe(plan.contentHash);
      expect(analysis.inputs.analysisSpec.contentHash).toBe(FROZEN_ANALYSIS_SPEC_HASH);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
