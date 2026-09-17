/** Content-addressed completed-task artifact for the isolated mechanism V1 experiment. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MECHANISM_ARMS,
  assertMechanismDisclosureTripleV1,
  assertMechanismOnlinePayloadTruthBlindV1,
  type MechanismArmV1,
  type MechanismDisclosureArtifactV1,
} from "./mechanismDisclosureContractV1";
import { computeMechanismSnapshotHashV1 } from "./mechanismForkCoreV1";
import type {
  MechanismGlmRound1SnapshotV1,
  MechanismParsedRecordV1,
} from "./mechanismGlmTaskExecutionV1";
import type { MechanismProviderAttemptV1 } from "./mechanismProviderTraceV1";
import type { MechanismTaskRunV1 } from "./mechanismTaskRunnerV1";

export const MECHANISM_TASK_ARTIFACT_REF = Object.freeze({
  id: "swarmalpha.experiment.v6.mechanism-task-artifact",
  version: "1.0.0",
});

export interface MechanismTaskArtifactV1 {
  artifactRef: { id: string; version: string };
  planHash: string;
  executionHash: string;
  model: string;
  taskRun: MechanismTaskRunV1;
  round1Snapshot: MechanismGlmRound1SnapshotV1;
  parsedRecords: MechanismParsedRecordV1[];
  /** Complete per-call trace; rawResponse is the adapter-returned text, not transport bytes. */
  providerAttempts: MechanismProviderAttemptV1[];
  observedTokens: number;
  contentHash: string;
}

function canonical(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("mechanism_task_artifact_non_finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== "object") throw new Error("mechanism_task_artifact_not_json");
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonical((value as Record<string, unknown>)[key])]));
}

function hashCanonical(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value)), "utf8").digest("hex")}`;
}

export function recomputeMechanismTaskArtifactHashV1(artifact: MechanismTaskArtifactV1): string {
  const { contentHash: _recorded, ...body } = artifact;
  return hashCanonical(body);
}

function countParsed(
  records: readonly MechanismParsedRecordV1[],
  phase: MechanismParsedRecordV1["phase"],
  arm?: (typeof MECHANISM_ARMS)[number],
): number {
  return records.filter(record => record.phase === phase && record.arm === arm).length;
}

export function assertMechanismTaskArtifactV1(artifact: MechanismTaskArtifactV1): void {
  if (artifact.artifactRef.id !== MECHANISM_TASK_ARTIFACT_REF.id
    || artifact.artifactRef.version !== MECHANISM_TASK_ARTIFACT_REF.version) {
    throw new Error("mechanism_task_artifact_ref_mismatch");
  }
  if (!artifact.planHash.startsWith("sha256:") || !artifact.executionHash.startsWith("sha256:")) {
    throw new Error("mechanism_task_artifact_binding_invalid");
  }
  if (artifact.taskRun.taskId !== artifact.round1Snapshot.taskId
    || artifact.taskRun.seed !== artifact.round1Snapshot.seed) {
    throw new Error("mechanism_task_artifact_task_identity_mismatch");
  }
  if (computeMechanismSnapshotHashV1(artifact.round1Snapshot) !== artifact.taskRun.sharedSnapshotHash) {
    throw new Error("mechanism_task_artifact_snapshot_hash_mismatch");
  }
  const expected = artifact.taskRun.expectedAgentCount;
  if (artifact.round1Snapshot.agents.length !== expected
    || artifact.round1Snapshot.reports.length !== expected
    || artifact.round1Snapshot.transcript.length !== expected) {
    throw new Error("mechanism_task_artifact_round1_incomplete");
  }
  const armNames = artifact.taskRun.arms.map(entry => entry.arm);
  if (artifact.taskRun.armOrder.length !== MECHANISM_ARMS.length
    || new Set(artifact.taskRun.armOrder).size !== MECHANISM_ARMS.length
    || MECHANISM_ARMS.some(arm => !artifact.taskRun.armOrder.includes(arm))
    || armNames.length !== MECHANISM_ARMS.length
    || new Set(armNames).size !== MECHANISM_ARMS.length
    || MECHANISM_ARMS.some(arm => !armNames.includes(arm))) {
    throw new Error("mechanism_task_artifact_arm_set_invalid");
  }
  const selectionHashes = new Set(artifact.taskRun.arms.map(entry => entry.selectionIdentityHash));
  const treatmentHashes = new Set(artifact.taskRun.arms.map(entry => entry.treatmentHash));
  if (selectionHashes.size !== 1) throw new Error("mechanism_task_artifact_selection_mismatch");
  if (treatmentHashes.size !== MECHANISM_ARMS.length) throw new Error("mechanism_task_artifact_treatment_not_distinct");
  const disclosures = Object.fromEntries(artifact.taskRun.arms.map(entry => {
    if (entry.disclosure.arm !== entry.arm
      || entry.disclosure.treatmentHash !== entry.treatmentHash
      || entry.disclosure.selectionIdentityHash !== entry.selectionIdentityHash) {
      throw new Error("mechanism_task_artifact_disclosure_binding_mismatch");
    }
    return [entry.arm, entry.disclosure];
  })) as Record<MechanismArmV1, MechanismDisclosureArtifactV1>;
  assertMechanismDisclosureTripleV1(disclosures);
  if (countParsed(artifact.parsedRecords, "round1") !== expected) {
    throw new Error("mechanism_task_artifact_parsed_round1_incomplete");
  }
  for (const arm of MECHANISM_ARMS) {
    if (countParsed(artifact.parsedRecords, "round2", arm) !== expected
      || countParsed(artifact.parsedRecords, "final", arm) !== expected) {
      throw new Error("mechanism_task_artifact_parsed_arm_incomplete");
    }
  }
  const expectedCalls = expected * 7;
  if (artifact.parsedRecords.length !== expectedCalls || artifact.providerAttempts.length !== expectedCalls) {
    throw new Error("mechanism_task_artifact_call_count_mismatch");
  }
  const requestIds = new Set<string>();
  const requestHashes = new Set<string>();
  const sequences = new Set<number>();
  const requestedProviderModel = artifact.model.replace(/^zhipu:/, "");
  let tokenSum = 0;
  for (const attempt of artifact.providerAttempts) {
    if (attempt.status !== "response" || typeof attempt.rawResponse !== "string") {
      throw new Error("mechanism_task_artifact_attempt_incomplete");
    }
    if (requestIds.has(attempt.requestId) || requestHashes.has(attempt.requestHash)) {
      throw new Error("mechanism_task_artifact_duplicate_attempt");
    }
    if (attempt.modelRef.id !== artifact.model
      || attempt.providerMetadata?.model !== requestedProviderModel) {
      throw new Error("mechanism_task_artifact_provider_model_mismatch");
    }
    assertMechanismOnlinePayloadTruthBlindV1({
      systemPrompt: attempt.systemPrompt,
      userPrompt: attempt.userPrompt,
    });
    requestIds.add(attempt.requestId);
    requestHashes.add(attempt.requestHash);
    sequences.add(attempt.sequence);
    const tokens = attempt.usage?.totalTokens;
    if (tokens === undefined || !Number.isFinite(tokens) || tokens < 0) {
      throw new Error("mechanism_task_artifact_usage_unknown");
    }
    tokenSum += tokens;
  }
  const orderedSequences = [...sequences].sort((a, b) => a - b);
  if (orderedSequences.length !== expectedCalls
    || orderedSequences.some((sequence, index) => index > 0 && sequence !== orderedSequences[index - 1] + 1)) {
    throw new Error("mechanism_task_artifact_sequence_invalid");
  }
  if (artifact.observedTokens !== tokenSum) throw new Error("mechanism_task_artifact_token_sum_mismatch");
  if (recomputeMechanismTaskArtifactHashV1(artifact) !== artifact.contentHash) {
    throw new Error("mechanism_task_artifact_hash_mismatch");
  }
}

export function buildMechanismTaskArtifactV1(
  body: Omit<MechanismTaskArtifactV1, "artifactRef" | "contentHash">,
): MechanismTaskArtifactV1 {
  const withoutHash = {
    artifactRef: { ...MECHANISM_TASK_ARTIFACT_REF },
    ...structuredClone(body),
  };
  const artifact = { ...withoutHash, contentHash: hashCanonical(withoutHash) };
  assertMechanismTaskArtifactV1(artifact);
  return artifact;
}

export function writeMechanismTaskArtifactV1(outputDir: string, artifact: MechanismTaskArtifactV1): string {
  assertMechanismTaskArtifactV1(artifact);
  const fileName = `task-${artifact.taskRun.taskId}.json`;
  const file = join(outputDir, fileName);
  const text = `${JSON.stringify(artifact, null, 2)}\n`;
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) throw new Error("mechanism_task_artifact_no_overwrite_conflict");
    return fileName;
  }
  writeFileSync(file, text, "utf8");
  return fileName;
}

export function loadMechanismTaskArtifactV1(outputDir: string, taskId: number): MechanismTaskArtifactV1 {
  const file = join(outputDir, `task-${taskId}.json`);
  if (!existsSync(file)) throw new Error("mechanism_task_artifact_missing");
  const artifact = JSON.parse(readFileSync(file, "utf8")) as MechanismTaskArtifactV1;
  assertMechanismTaskArtifactV1(artifact);
  return artifact;
}
