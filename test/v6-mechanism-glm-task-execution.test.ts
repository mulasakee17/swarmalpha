import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMechanismGlmTaskV1 } from "../experiments/campaign/v6/mechanismGlmTaskExecutionV1";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import type { SingleAttemptTextInvoker } from "../experiments/campaign/v6/providerAdapters";
import { createMechanismTracedInvokerV1 } from "../experiments/campaign/v6/mechanismProviderTraceV1";
import {
  buildMechanismTaskArtifactV1,
  loadMechanismTaskArtifactV1,
  writeMechanismTaskArtifactV1,
} from "../experiments/campaign/v6/mechanismTaskArtifactV1";

describe("mechanism GLM task execution V1", () => {
  it("runs one R1 and three arms through the real parsers with a zero-network invoker", async () => {
    const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: 14 }).adapter.task;
    const probabilities = Object.fromEntries(task.claim.options.map((option, i) => [option, i === 0 ? 1 : 0]));
    const requests: string[] = [];
    const baseInvoker: SingleAttemptTextInvoker = { async invoke(request) {
      requests.push(request.requestId);
      if (request.requestId.startsWith("final:")) return { rawContent: JSON.stringify({
        status: "answered", reports: [{ claimId: task.claim.id, value: { kind: "categorical", probabilities } }],
      }), providerMetadata: { model: "glm-4.6v", requestId: request.requestId }, usage: { totalTokens: 10 } };
      return { rawContent: JSON.stringify({
        message: `report ${request.requestId}`,
        belief: { kind: "categorical", probabilities },
        evidence: [{ content: `evidence ${request.requestId}`, relation: "attacks" }],
      }), providerMetadata: { model: "glm-4.6v", requestId: request.requestId }, usage: { totalTokens: 10 } };
    } };
    const traced = createMechanismTracedInvokerV1({
      baseInvoker, maxObservedTokens: 1000, clock: () => "2026-08-23T00:00:00.000Z",
    });
    const result = await runMechanismGlmTaskV1({
      taskId: 14, seed: 3,
      armOrder: ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"], invoker: traced.invoker,
      clock: () => "2026-08-23T00:00:00.000Z",
    });
    expect(requests).toHaveLength(28);
    expect(requests.filter(id => id.includes(":r1:"))).toHaveLength(4);
    expect(result.task.arms).toHaveLength(3);
    expect(result.parsedRecords).toHaveLength(28);
    expect(JSON.stringify(result.round1Snapshot)).not.toMatch(/outcome|correctAnswer|groundTruth|resolvedOption/);
    expect(new Set(result.task.arms.map(arm => arm.selectionIdentityHash)).size).toBe(1);

    const artifact = buildMechanismTaskArtifactV1({
      planHash: `sha256:${"a".repeat(64)}`, executionHash: `sha256:${"b".repeat(64)}`,
      model: "zhipu:glm-4.6v", taskRun: result.task, round1Snapshot: result.round1Snapshot,
      parsedRecords: result.parsedRecords, providerAttempts: traced.attempts,
      observedTokens: traced.observedTokens(),
    });
    const dir = mkdtempSync(join(tmpdir(), "mechanism-task-artifact-"));
    try {
      expect(writeMechanismTaskArtifactV1(dir, artifact)).toBe("task-14.json");
      expect(loadMechanismTaskArtifactV1(dir, 14).contentHash).toBe(artifact.contentHash);
      expect(() => buildMechanismTaskArtifactV1({
        ...artifact, providerAttempts: artifact.providerAttempts.slice(1),
      })).toThrow("mechanism_task_artifact_call_count_mismatch");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
