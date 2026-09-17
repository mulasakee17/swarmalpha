/** Minimal fail-closed artifact manifest for mechanism V1. */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadMechanismCanaryPlanV1,
  loadMechanismExperimentPlanV1,
  type MechanismCanaryPlanV1,
  type MechanismExperimentPlanV1,
} from "./mechanismExperimentPlanV1";
import { loadSeed4BatchAPlanV1, type Seed4BatchAPlanV1 } from "./mechanismSeed4BatchAPlanV1";
import { loadSeed4BatchBPlanV1, type Seed4BatchBPlanV1 } from "./mechanismSeed4BatchBPlanV1";
import { loadSeed4RecoveryPlanV1, type Seed4RecoveryPlanV1 } from "./mechanismSeed4RecoveryPlanV1";

type MechanismPlanWithHashV1 = MechanismExperimentPlanV1 | MechanismCanaryPlanV1 | Seed4BatchAPlanV1 | Seed4BatchBPlanV1 | Seed4RecoveryPlanV1;

export const MECHANISM_MANIFEST_REF = Object.freeze({
  id: "swarmalpha.experiment.v6.mechanism-manifest",
  version: "1.0.0",
});

export interface MechanismManifestFileV1 {
  role: "attempts" | "execution" | "summary" | "task";
  fileName: string;
  contentHash: string;
  taskId?: number;
}

export interface MechanismManifestV1 {
  manifestRef: { id: string; version: string };
  planHash: string;
  files: MechanismManifestFileV1[];
  contentHash: string;
}

function hashText(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function hashFile(file: string): string { return hashText(readFileSync(file, "utf8")); }

function canonical(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonical((value as Record<string, unknown>)[key])]));
}

export function recomputeMechanismManifestHashV1(manifest: MechanismManifestV1): string {
  const { contentHash: _recorded, ...body } = manifest;
  return hashText(JSON.stringify(canonical(body)));
}

export function buildMechanismManifestV1(input: {
  outputDir: string;
  plan: MechanismPlanWithHashV1;
  files: Array<Omit<MechanismManifestFileV1, "contentHash">>;
}): MechanismManifestV1 {
  const seen = new Set<string>();
  const files = input.files.map(entry => {
    if (seen.has(entry.fileName)) throw new Error("mechanism_manifest_duplicate_file");
    if (entry.fileName.includes("/") || entry.fileName.includes("\\") || entry.fileName === "plan.json" || entry.fileName === "manifest.json") {
      throw new Error("mechanism_manifest_invalid_file_name");
    }
    seen.add(entry.fileName);
    const file = join(input.outputDir, entry.fileName);
    if (!existsSync(file)) throw new Error("mechanism_manifest_missing_file");
    return { ...entry, contentHash: hashFile(file) };
  }).sort((a, b) => a.fileName.localeCompare(b.fileName));
  const body = { manifestRef: { ...MECHANISM_MANIFEST_REF }, planHash: input.plan.contentHash, files };
  return { ...body, contentHash: hashText(JSON.stringify(canonical(body))) };
}

export function writeMechanismManifestV1(outputDir: string, manifest: MechanismManifestV1): void {
  if (recomputeMechanismManifestHashV1(manifest) !== manifest.contentHash) throw new Error("mechanism_manifest_hash_mismatch");
  const file = join(outputDir, "manifest.json");
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) throw new Error("mechanism_manifest_no_overwrite_conflict");
    return;
  }
  writeFileSync(file, text, "utf8");
}

export function verifyMechanismArtifactDirectoryV1(outputDir: string): MechanismManifestV1 {
  const rawPlan = JSON.parse(readFileSync(join(outputDir, "plan.json"), "utf8")) as {
    planRef?: { id?: string };
  };
  const plan = rawPlan.planRef?.id === "swarmalpha.experiment.v6.mechanism-canary-plan"
    ? loadMechanismCanaryPlanV1(outputDir)
    : rawPlan.planRef?.id === "swarmalpha.experiment.v6.mechanism-seed4-batch-a-plan"
      ? loadSeed4BatchAPlanV1(outputDir)
      : rawPlan.planRef?.id === "swarmalpha.experiment.v6.mechanism-seed4-batch-b-plan"
        ? loadSeed4BatchBPlanV1(outputDir)
        : rawPlan.planRef?.id === "swarmalpha.experiment.v6.mechanism-seed4-rate-limit-recovery-plan"
          ? loadSeed4RecoveryPlanV1(outputDir)
          : loadMechanismExperimentPlanV1(outputDir);
  const file = join(outputDir, "manifest.json");
  if (!existsSync(file)) throw new Error("mechanism_manifest_missing");
  const manifest = JSON.parse(readFileSync(file, "utf8")) as MechanismManifestV1;
  if (recomputeMechanismManifestHashV1(manifest) !== manifest.contentHash) throw new Error("mechanism_manifest_hash_mismatch");
  if (manifest.planHash !== plan.contentHash) throw new Error("mechanism_manifest_plan_mismatch");
  const registered = new Set(["plan.json", "manifest.json"]);
  for (const entry of manifest.files) {
    if (registered.has(entry.fileName)) throw new Error("mechanism_manifest_duplicate_file");
    registered.add(entry.fileName);
    const registeredFile = join(outputDir, entry.fileName);
    if (!existsSync(registeredFile)) throw new Error("mechanism_manifest_missing_file");
    if (hashFile(registeredFile) !== entry.contentHash) throw new Error("mechanism_manifest_file_hash_mismatch");
  }
  const actual = readdirSync(outputDir)
    .filter(name => name.endsWith(".json") || name.endsWith(".jsonl"));
  const extras = actual.filter(name => !registered.has(name));
  const absent = [...registered].filter(name => !actual.includes(name));
  if (extras.length) throw new Error(`mechanism_manifest_unregistered_file:${extras.sort().join(",")}`);
  if (absent.length) throw new Error(`mechanism_manifest_missing_file:${absent.sort().join(",")}`);
  return manifest;
}
