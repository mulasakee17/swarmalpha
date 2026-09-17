import { describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeMechanismFormalV1 } from "../experiments/campaign/v6/run_v6_mechanism_formal_v1";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import { verifyMechanismArtifactDirectoryV1 } from "../experiments/campaign/v6/mechanismManifestV1";
import type { SingleAttemptTextInvoker } from "../experiments/campaign/v6/providerAdapters";
import { analyzeMechanismFormalArtifactsV1 } from "../experiments/campaign/v6/analyze_v6_mechanism_formal_v1";

describe("mechanism formal pipeline V1", () => {
  it("materializes all 44 frozen blocks and 1211 calls with a zero-network invoker", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-formal-pipeline-"));
    const optionsByTask = new Map<number, { claimId: string; options: string[] }>();
    try {
      const baseInvoker: SingleAttemptTextInvoker = { async invoke(request) {
        const taskMatch = request.requestId.match(/task-(\d+)/);
        if (!taskMatch) throw new Error("mock_task_id_missing");
        const taskId = Number(taskMatch[1]);
        let cached = optionsByTask.get(taskId);
        if (!cached) {
          const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task;
          cached = { claimId: task.claim.id, options: task.claim.options };
          optionsByTask.set(taskId, cached);
        }
        const probabilities = Object.fromEntries(cached.options.map((option, index) => [option, index === 0 ? 1 : 0]));
        const common = {
          providerMetadata: { model: "glm-4.6v", requestId: request.requestId },
          usage: { promptTokens: 6, completionTokens: 4, totalTokens: 10 },
        };
        if (request.requestId.startsWith("final:")) return {
          rawContent: JSON.stringify({
            status: "answered",
            reports: [{ claimId: cached.claimId, value: { kind: "categorical", probabilities } }],
          }),
          ...common,
        };
        return {
          rawContent: JSON.stringify({
            message: `report ${request.requestId}`,
            belief: { kind: "categorical", probabilities },
            evidence: [{ content: `evidence ${request.requestId}`, relation: "attacks" }],
          }),
          ...common,
        };
      } };
      const result = await executeMechanismFormalV1({
        outputDir: dir,
        baseInvoker,
        clock: () => "2026-08-23T00:00:00.000Z",
      });
      expect(result.summary.status).toBe("completed");
      expect(result.summary.completedTaskIds).toHaveLength(44);
      expect(result.summary.failures).toEqual([]);
      expect(result.summary.physicalAttempts).toBe(1211);
      expect(result.summary.observedTokens).toBe(12110);
      expect(verifyMechanismArtifactDirectoryV1(dir).contentHash).toBe(result.manifestHash);
      expect(readdirSync(dir).filter(name => /^task-\d+\.json$/.test(name))).toHaveLength(44);
      const analysis = analyzeMechanismFormalArtifactsV1(dir);
      expect(analysis.summary.completedTasks).toBe(44);
      expect(analysis.taskResults).toHaveLength(44);
      expect(analysis.inference.completeTaskIds).toHaveLength(44);
      expect(analysis.inference.M1.mean).toBe(0);
      expect(analysis.inference.M2.mean).toBe(0);
      expect(analysis.inference.M3.mean).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("stops the roster on unknown usage and records the remaining tasks as skipped", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-formal-stop-"));
    try {
      const baseInvoker: SingleAttemptTextInvoker = { async invoke(request) {
        return {
          rawContent: "{}",
          providerMetadata: { model: "glm-4.6v", requestId: request.requestId },
        };
      } };
      const result = await executeMechanismFormalV1({ outputDir: dir, baseInvoker });
      expect(result.summary.status).toBe("stopped_global_gate");
      expect(result.summary.completedTaskIds).toEqual([]);
      expect(result.summary.failures).toEqual([{
        taskId: 15, seed: 3, code: "mechanism_usage_unknown", physicalAttempts: 1,
      }]);
      expect(result.summary.skippedTaskIds).toHaveLength(43);
      expect(result.summary.physicalAttempts).toBe(1);
      expect(verifyMechanismArtifactDirectoryV1(dir).contentHash).toBe(result.manifestHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
