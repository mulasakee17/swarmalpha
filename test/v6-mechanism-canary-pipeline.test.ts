import { describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeMechanismCanaryV1 } from "../experiments/campaign/v6/run_v6_mechanism_canary_v1";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import { verifyMechanismArtifactDirectoryV1 } from "../experiments/campaign/v6/mechanismManifestV1";
import type { SingleAttemptTextInvoker } from "../experiments/campaign/v6/providerAdapters";

describe("mechanism canary pipeline V1", () => {
  it("materializes and verifies the complete plan-to-manifest chain without network", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-canary-pipeline-"));
    try {
      const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: 14 }).adapter.task;
      const probabilities = Object.fromEntries(task.claim.options.map((option, index) => [option, index === 0 ? 1 : 0]));
      const baseInvoker: SingleAttemptTextInvoker = { async invoke(request) {
        if (request.requestId.startsWith("final:")) return {
          rawContent: JSON.stringify({
            status: "answered",
            reports: [{ claimId: task.claim.id, value: { kind: "categorical", probabilities } }],
          }),
          providerMetadata: { model: "glm-4.6v", requestId: request.requestId },
          usage: { promptTokens: 6, completionTokens: 4, totalTokens: 10 },
        };
        return {
          rawContent: JSON.stringify({
            message: `report ${request.requestId}`,
            belief: { kind: "categorical", probabilities },
            evidence: [{ content: `evidence ${request.requestId}`, relation: "attacks" }],
          }),
          providerMetadata: { model: "glm-4.6v", requestId: request.requestId },
          usage: { promptTokens: 6, completionTokens: 4, totalTokens: 10 },
        };
      } };
      const result = await executeMechanismCanaryV1({
        outputDir: dir,
        baseInvoker,
        clock: () => "2026-08-23T00:00:00.000Z",
      });
      expect(result.observedTokens).toBe(280);
      expect(verifyMechanismArtifactDirectoryV1(dir).contentHash).toBe(result.manifestHash);
      expect(readdirSync(dir).sort()).toEqual([
        "attempts.jsonl", "execution.json", "manifest.json", "plan.json", "task-14.json",
      ]);
      await expect(executeMechanismCanaryV1({ outputDir: dir, baseInvoker })).rejects
        .toThrow("mechanism_canary_output_not_fresh");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
