import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  freezeMechanismCanaryPlanV1,
  freezeMechanismExperimentPlanV1,
} from "../experiments/campaign/v6/mechanismExperimentPlanV1";
import {
  buildMechanismManifestV1,
  verifyMechanismArtifactDirectoryV1,
  writeMechanismManifestV1,
} from "../experiments/campaign/v6/mechanismManifestV1";

describe("mechanism manifest V1", () => {
  it("binds all registered files and rejects extras or tampering", () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-manifest-"));
    try {
      const plan = freezeMechanismExperimentPlanV1(dir);
      writeFileSync(join(dir, "attempts.jsonl"), "{\"attempt\":1}\n", "utf8");
      writeFileSync(join(dir, "task-15.json"), "{\"taskId\":15}\n", "utf8");
      const manifest = buildMechanismManifestV1({ outputDir: dir, plan, files: [
        { role: "attempts", fileName: "attempts.jsonl" },
        { role: "task", fileName: "task-15.json", taskId: 15 },
      ] });
      writeMechanismManifestV1(dir, manifest);
      expect(verifyMechanismArtifactDirectoryV1(dir).contentHash).toBe(manifest.contentHash);

      writeFileSync(join(dir, "extra.json"), "{}", "utf8");
      expect(() => verifyMechanismArtifactDirectoryV1(dir)).toThrow("mechanism_manifest_unregistered_file");
      rmSync(join(dir, "extra.json"));
      writeFileSync(join(dir, "task-15.json"), "{\"taskId\":999}\n", "utf8");
      expect(() => verifyMechanismArtifactDirectoryV1(dir)).toThrow("mechanism_manifest_file_hash_mismatch");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects duplicate or path-bearing registrations", () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-manifest-"));
    try {
      const plan = freezeMechanismExperimentPlanV1(dir);
      writeFileSync(join(dir, "attempts.jsonl"), "{}\n", "utf8");
      expect(() => buildMechanismManifestV1({ outputDir: dir, plan, files: [
        { role: "attempts", fileName: "attempts.jsonl" },
        { role: "attempts", fileName: "attempts.jsonl" },
      ] })).toThrow("mechanism_manifest_duplicate_file");
      expect(() => buildMechanismManifestV1({ outputDir: dir, plan, files: [
        { role: "attempts", fileName: "../attempts.jsonl" },
      ] })).toThrow("mechanism_manifest_invalid_file_name");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("verifies an isolated canary plan without treating it as a formal plan", () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-canary-manifest-"));
    try {
      const plan = freezeMechanismCanaryPlanV1(dir);
      writeFileSync(join(dir, "attempts.jsonl"), "{}\n", "utf8");
      const manifest = buildMechanismManifestV1({ outputDir: dir, plan, files: [
        { role: "attempts", fileName: "attempts.jsonl" },
      ] });
      writeMechanismManifestV1(dir, manifest);
      expect(verifyMechanismArtifactDirectoryV1(dir).planHash).toBe(plan.contentHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
