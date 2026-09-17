/**
 * Zero-network corruption matrix for the mechanism V1 integrity modules.
 * Every fixture lives under the OS temp directory and is removed in `finally`.
 * No provider, no canary, no formal run, no credential access.
 *
 * Cases covered (handoff CLAUDE_CODE_MECHANISM_V1_CORRUPTION_TEST_HANDOFF):
 *   1  ledger invalid JSON line
 *   2  finish without start
 *   3  duplicate attempt ID
 *   4  duplicate finish
 *   5  finish/start request identity mismatch
 *   6  unfinished attempt remains observable
 *   7  non-empty ledger refuses resume
 *   8  provider trace records terminal error without losing request identity
 *   9  manifest body hash tampering
 *  10  registered task-file content tampering
 *  11  unregistered .json/.jsonl file
 *  12  registered file missing
 *  13  manifest bound to the wrong plan hash
 *  14  execution identity source-file hash changes with an isolated temp fixture
 *  15  execution identity no-overwrite conflict
 *  16  canary and formal plans are distinct
 *  17  task 14 never appears in the formal roster
 *  18  integrity modules have no provider/credential path; output paths are relative
 */
import { describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import {
  auditMechanismAttemptLedgerV1,
  createMechanismAttemptLedgerV1,
  type MechanismAttemptLedgerEventV1,
} from "../experiments/campaign/v6/mechanismAttemptLedgerV1";
import { createMechanismTracedInvokerV1 } from "../experiments/campaign/v6/mechanismProviderTraceV1";
import type { SingleAttemptTextInvokeRequest } from "../experiments/campaign/v6/providerAdapters";
import {
  buildMechanismManifestV1,
  recomputeMechanismManifestHashV1,
  verifyMechanismArtifactDirectoryV1,
  writeMechanismManifestV1,
} from "../experiments/campaign/v6/mechanismManifestV1";
import {
  buildMechanismExecutionIdentityV1,
  MECHANISM_SOURCE_FILES_V1,
  writeMechanismExecutionIdentityV1,
} from "../experiments/campaign/v6/mechanismExecutionIdentityV1";
import {
  buildMechanismCanaryPlanV1,
  buildMechanismExperimentPlanV1,
  freezeMechanismExperimentPlanV1,
  MECHANISM_CANARY_OUTPUT_RELATIVE_PATH,
  MECHANISM_CANARY_TASK_ID,
  MECHANISM_OUTPUT_RELATIVE_PATH,
} from "../experiments/campaign/v6/mechanismExperimentPlanV1";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "v6-mechanism-corruption-"));
}

const request: SingleAttemptTextInvokeRequest = {
  requestId: "mechanism:corruption:1",
  systemPrompt: "system",
  userPrompt: "truth-blind task",
  responseFormat: "json",
  modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
  invocationConfig: { maxTokens: 768, thinking: "disabled", seed: 3 },
};

function started(attemptId: string, requestHash = "h1", requestId = "r1", sequence = 1): MechanismAttemptLedgerEventV1 {
  return { type: "started", attemptId, sequence, requestHash, requestId, ts: "t1" };
}

function finished(attemptId: string, requestHash = "h1", requestId = "r1", sequence = 1): MechanismAttemptLedgerEventV1 {
  return { type: "finished", attemptId, sequence, requestHash, requestId, status: "response", ts: "t2" };
}

describe("mechanism corruption matrix", () => {
  it("case 1: rejects an invalid JSON line in the ledger", () => {
    const dir = tempDir();
    try {
      const file = join(dir, "attempts.jsonl");
      writeFileSync(file, `${JSON.stringify(started("a1"))}\nNOT_JSON\n`, "utf8");
      expect(() => auditMechanismAttemptLedgerV1(file)).toThrow("mechanism_ledger_invalid_json_line:2");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 2: rejects a finish without a start", () => {
    const dir = tempDir();
    try {
      const file = join(dir, "attempts.jsonl");
      writeFileSync(file, `${JSON.stringify(finished("a1"))}\n`, "utf8");
      expect(() => auditMechanismAttemptLedgerV1(file)).toThrow("mechanism_ledger_finish_without_start");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 3: rejects a duplicate attempt ID", () => {
    const dir = tempDir();
    try {
      const file = join(dir, "attempts.jsonl");
      writeFileSync(file, `${JSON.stringify(started("a1", "h1", "r1"))}\n${JSON.stringify(started("a1", "h2", "r2"))}\n`, "utf8");
      expect(() => auditMechanismAttemptLedgerV1(file)).toThrow("mechanism_ledger_duplicate_attempt_id");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 4: rejects a duplicate finish", () => {
    const dir = tempDir();
    try {
      const file = join(dir, "attempts.jsonl");
      writeFileSync(
        file,
        `${JSON.stringify(started("a1"))}\n${JSON.stringify(finished("a1"))}\n${JSON.stringify(finished("a1"))}\n`,
        "utf8",
      );
      expect(() => auditMechanismAttemptLedgerV1(file)).toThrow("mechanism_ledger_duplicate_finish");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 5: rejects a finish/start request identity mismatch", () => {
    const dir = tempDir();
    try {
      const file = join(dir, "attempts.jsonl");
      // requestHash mismatch
      writeFileSync(file, `${JSON.stringify(started("a1", "h1", "r1"))}\n${JSON.stringify(finished("a1", "h2", "r1"))}\n`, "utf8");
      expect(() => auditMechanismAttemptLedgerV1(file)).toThrow("mechanism_ledger_finish_identity_mismatch");
      // requestId mismatch
      writeFileSync(file, `${JSON.stringify(started("a2", "h1", "r1"))}\n${JSON.stringify(finished("a2", "h1", "r9"))}\n`, "utf8");
      expect(() => auditMechanismAttemptLedgerV1(file)).toThrow("mechanism_ledger_finish_identity_mismatch");
      // sequence mismatch
      writeFileSync(file, `${JSON.stringify(started("a3", "h1", "r1", 1))}\n${JSON.stringify(finished("a3", "h1", "r1", 2))}\n`, "utf8");
      expect(() => auditMechanismAttemptLedgerV1(file)).toThrow("mechanism_ledger_finish_identity_mismatch");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 6: an unfinished attempt remains observable", () => {
    const dir = tempDir();
    try {
      const file = join(dir, "attempts.jsonl");
      writeFileSync(file, `${JSON.stringify(started("a1"))}\n${JSON.stringify(started("a2"))}\n${JSON.stringify(finished("a2"))}\n`, "utf8");
      const audit = auditMechanismAttemptLedgerV1(file);
      expect(audit.started).toBe(2);
      expect(audit.finished).toBe(1);
      expect(audit.unfinishedAttemptIds).toEqual(["a1"]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 7: a non-empty ledger refuses resume", () => {
    const dir = tempDir();
    try {
      const file = join(dir, "attempts.jsonl");
      writeFileSync(file, `${JSON.stringify(started("a1"))}\n`, "utf8");
      expect(() => createMechanismAttemptLedgerV1({ file })).toThrow("mechanism_ledger_existing_refuse_resume");
      // an empty ledger is accepted and usable
      const empty = join(dir, "empty.jsonl");
      const ledger = createMechanismAttemptLedgerV1({ file: empty, clock: () => "t" });
      const attempt = ledger.start({ requestHash: "h1", requestId: "r1" });
      ledger.finish({ ...attempt, requestHash: "h1", requestId: "r1" }, "response");
      expect(ledger.audit().finished).toBe(1);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 8: provider trace records a terminal error without losing request identity", async () => {
    const dir = tempDir();
    try {
      const ledgerFile = join(dir, "attempts.jsonl");
      const ledger = createMechanismAttemptLedgerV1({ file: ledgerFile, clock: () => "t" });
      const traced = createMechanismTracedInvokerV1({
        maxObservedTokens: 1000,
        clock: (() => { let n = 0; return () => `t${++n}`; })(),
        ledger,
        baseInvoker: { async invoke() { throw new Error("mechanism_upstream_failed"); } },
      });
      await expect(traced.invoker.invoke(request, new AbortController().signal))
        .rejects.toThrow("mechanism_upstream_failed");
      expect(traced.attempts).toHaveLength(1);
      expect(traced.attempts[0]).toMatchObject({
        status: "error",
        errorCode: "mechanism_upstream_failed",
        sequence: 1,
        requestId: request.requestId,
        requestHash: expect.stringMatching(/^sha256:/),
        startedAt: "t1",
        finishedAt: "t2",
      });
      // the durable ledger closed the attempt as an error, preserving identity
      const audit = auditMechanismAttemptLedgerV1(ledgerFile);
      expect(audit.started).toBe(1);
      expect(audit.finished).toBe(1);
      expect(audit.unfinishedAttemptIds).toEqual([]);
      const events = readFileSync(ledgerFile, "utf8").trim().split("\n").map(l => JSON.parse(l));
      expect(events[1]).toMatchObject({ type: "finished", status: "error", errorCode: "mechanism_upstream_failed", attemptId: events[0].attemptId });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("cases 9-13: manifest integrity rejects tampering", () => {
    const dir = tempDir();
    try {
      const plan = freezeMechanismExperimentPlanV1(dir);
      const taskFile = join(dir, "task_15.jsonl");
      writeFileSync(taskFile, "{\"taskId\":15}\n", "utf8");
      const manifest = buildMechanismManifestV1({
        outputDir: dir, plan,
        files: [{ role: "task", fileName: "task_15.jsonl", taskId: 15 }],
      });
      writeMechanismManifestV1(dir, manifest);
      // baseline verifies
      expect(verifyMechanismArtifactDirectoryV1(dir).planHash).toBe(plan.contentHash);

      // case 9: manifest body hash tampering
      const tamperedManifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
      tamperedManifest.files[0].contentHash = "sha256:deadbeef";
      writeFileSync(join(dir, "manifest.json"), JSON.stringify(tamperedManifest), "utf8");
      expect(() => verifyMechanismArtifactDirectoryV1(dir)).toThrow("mechanism_manifest_hash_mismatch");
      // restore the original manifest bytes directly (writeMechanismManifestV1 is no-overwrite by design)
      writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

      // case 10: registered task-file content tampering
      writeFileSync(taskFile, "{\"taskId\":15,\"evil\":true}\n", "utf8");
      expect(() => verifyMechanismArtifactDirectoryV1(dir)).toThrow("mechanism_manifest_file_hash_mismatch");
      // restore
      writeFileSync(taskFile, "{\"taskId\":15}\n", "utf8");

      // case 11: unregistered .json/.jsonl file
      writeFileSync(join(dir, "extra.json"), "{}", "utf8");
      expect(() => verifyMechanismArtifactDirectoryV1(dir)).toThrow("mechanism_manifest_unregistered_file:extra.json");
      rmSync(join(dir, "extra.json"), { force: true });

      // case 12: registered file missing
      rmSync(taskFile, { force: true });
      expect(() => verifyMechanismArtifactDirectoryV1(dir)).toThrow("mechanism_manifest_missing_file");
      writeFileSync(taskFile, "{\"taskId\":15}\n", "utf8");

      // case 13: manifest bound to the wrong plan hash
      const rebound = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
      rebound.planHash = "sha256:" + "0".repeat(64);
      rebound.contentHash = recomputeMechanismManifestHashV1(rebound);
      writeFileSync(join(dir, "manifest.json"), JSON.stringify(rebound), "utf8");
      expect(() => verifyMechanismArtifactDirectoryV1(dir)).toThrow("mechanism_manifest_plan_mismatch");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 14: execution identity source-file hash changes with an isolated temp fixture", () => {
    const dir = tempDir();
    try {
      // materialize every source path under the temp repo root
      for (const rel of MECHANISM_SOURCE_FILES_V1) {
        const file = join(dir, rel);
        mkdirSync(resolve(file, ".."), { recursive: true });
        writeFileSync(file, `placeholder ${rel} v1`, "utf8");
      }
      const plan = buildMechanismExperimentPlanV1();
      const identity1 = buildMechanismExecutionIdentityV1({ planHash: plan.contentHash, model: plan.model, repoRoot: dir });
      // mutate one source file
      const target = join(dir, MECHANISM_SOURCE_FILES_V1[0]);
      writeFileSync(target, "placeholder v2", "utf8");
      const identity2 = buildMechanismExecutionIdentityV1({ planHash: plan.contentHash, model: plan.model, repoRoot: dir });
      expect(identity1.contentHash).not.toBe(identity2.contentHash);
      expect(identity1.sourceFiles[0].contentHash).not.toBe(identity2.sourceFiles[0].contentHash);
      expect(identity1.sourceFiles.slice(1)).toEqual(identity2.sourceFiles.slice(1));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 15: execution identity no-overwrite conflict", () => {
    const dir = tempDir();
    try {
      for (const rel of MECHANISM_SOURCE_FILES_V1) {
        const file = join(dir, rel);
        mkdirSync(resolve(file, ".."), { recursive: true });
        writeFileSync(file, `placeholder ${rel}`, "utf8");
      }
      const plan = buildMechanismExperimentPlanV1();
      const out = join(dir, "output");
      mkdirSync(out, { recursive: true });
      const identity = buildMechanismExecutionIdentityV1({ planHash: plan.contentHash, model: plan.model, repoRoot: dir });
      writeMechanismExecutionIdentityV1(out, identity);
      // identical write is idempotent
      writeMechanismExecutionIdentityV1(out, identity);
      // a hash-valid but different identity is refused
      const conflicting = buildMechanismExecutionIdentityV1({
        planHash: `sha256:${"0".repeat(64)}`, model: plan.model, repoRoot: dir,
      });
      expect(conflicting.contentHash).not.toBe(identity.contentHash);
      expect(() => writeMechanismExecutionIdentityV1(out, conflicting))
        .toThrow("mechanism_execution_no_overwrite_conflict");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("case 16: canary and formal plans have distinct refs, tasks, budgets, hashes and outputs", () => {
    const formal = buildMechanismExperimentPlanV1();
    const canary = buildMechanismCanaryPlanV1();
    expect(formal.planRef.id).not.toBe(canary.planRef.id);
    expect(canary.planRef.id).toBe("swarmalpha.experiment.v6.mechanism-canary-plan");
    expect(formal.formalTaskIds).toHaveLength(44);
    expect(canary.taskIds).toEqual([14]);
    expect(formal.plannedLogicalCalls).not.toBe(canary.plannedLogicalCalls);
    expect(formal.plannedEstimateTokens).not.toBe(canary.plannedEstimateTokens);
    expect(formal.tokenStopThreshold).not.toBe(canary.tokenStopThreshold);
    expect(formal.contentHash).not.toBe(canary.contentHash);
    expect(formal.outputDir).not.toBe(canary.outputDir);
    expect(formal.outputDir).toBe(MECHANISM_OUTPUT_RELATIVE_PATH);
    expect(canary.outputDir).toBe(MECHANISM_CANARY_OUTPUT_RELATIVE_PATH);
  });

  it("case 17: task 14 never appears in the formal roster", () => {
    const formal = buildMechanismExperimentPlanV1();
    expect(formal.canaryTaskId).toBe(MECHANISM_CANARY_TASK_ID);
    expect(formal.canaryTaskId).toBe(14);
    expect(formal.formalTaskIds).not.toContain(14);
    expect(formal.formalTaskIds).toHaveLength(44);
    expect(new Set(formal.formalTaskIds).size).toBe(44);
    expect(buildMechanismCanaryPlanV1().taskIds).toEqual([14]);
  });

  it("case 18: integrity modules have no provider/credential path and output paths are relative", () => {
    const production = [
      "experiments/campaign/v6/mechanismDisclosureContractV1.ts",
      "experiments/campaign/v6/mechanismForkCoreV1.ts",
      "experiments/campaign/v6/mechanismAttemptLedgerV1.ts",
      "experiments/campaign/v6/mechanismProviderTraceV1.ts",
      "experiments/campaign/v6/mechanismManifestV1.ts",
      "experiments/campaign/v6/mechanismExecutionIdentityV1.ts",
      "experiments/campaign/v6/mechanismExperimentPlanV1.ts",
    ];
    for (const file of production) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/process\.env/);
      expect(source).not.toMatch(/\.env/);
      expect(source).not.toMatch(/fetch\s*\(/);
      expect(source).not.toMatch(/https?:\/\//);
    }
    // Directory existence is execution-stage state, not a timeless code property.
    expect(isAbsolute(MECHANISM_OUTPUT_RELATIVE_PATH)).toBe(false);
    expect(isAbsolute(MECHANISM_CANARY_OUTPUT_RELATIVE_PATH)).toBe(false);
  });
});
