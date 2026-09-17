/**
 * Post-hoc recovery sensitivity analysis for the seed-4 mechanism experiment.
 *
 * The original Batch-A/Batch-B acquisition remains the primary seed-4 record.
 * Recovery rows are added only in an explicitly labelled sensitivity
 * reconstruction; they never replace Batch-B failures in primary accounting.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadCanonicalHiddenBenchTasksV1 } from "./hiddenBenchTaskAdapter";
import {
  bootstrapMechanismContrastV1,
  classifyMechanismM1V1,
  computeMechanismAnalysisV1,
  type MechanismAnalysisRowV1,
} from "./mechanismAnalysisMathV1";
import { auditMechanismAttemptLedgerV1 } from "./mechanismAttemptLedgerV1";
import { loadMechanismExperimentPlanV1 } from "./mechanismExperimentPlanV1";
import { verifyMechanismArtifactDirectoryV1 } from "./mechanismManifestV1";
import { loadSeed4BatchAPlanV1 } from "./mechanismSeed4BatchAPlanV1";
import { loadSeed4BatchBPlanV1 } from "./mechanismSeed4BatchBPlanV1";
import { loadSeed4RecoveryPlanV1 } from "./mechanismSeed4RecoveryPlanV1";
import { loadMechanismTaskArtifactV1 } from "./mechanismTaskArtifactV1";

type SourceStratum = "batch_a" | "batch_b" | "recovery";
type ContrastKey = "M1" | "M2" | "M3";

interface SummaryView {
  planHash: string;
  executionHash: string;
  completedTaskIds: number[];
  failures: Array<{ taskId: number; code: string; physicalAttempts: number }>;
  skippedTaskIds: number[];
  physicalAttempts: number;
  observedTokens: number;
}

interface ScoredTask {
  taskId: number;
  source: SourceStratum;
  round1Correct: boolean;
  arms: Record<string, { brier: number; correct: boolean }>;
  M1: number;
  M2: number;
  M3: number;
}

interface Seed3AnalysisView {
  analysisRef: { id: string; version: string };
  planHash: string;
  executionHash: string;
  manifestHash: string;
  taskResults: Array<{
    taskId: number;
    round1: { correct: boolean };
    arms: Record<string, { brier: number; correct: boolean }>;
    M1: number;
    M2: number;
    M3: number;
  }>;
  contentHash: string;
}

export interface Seed4RecoverySensitivityInputsV1 {
  seed3Dir: string;
  seed3AnalysisFile: string;
  batchADir: string;
  batchBDir: string;
  recoveryDir: string;
}

function canonical(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("recovery_analysis_non_finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== "object") throw new Error("recovery_analysis_not_json");
  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
  );
}

function hashCanonical(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value)), "utf8").digest("hex")}`;
}

function assertUniqueSortedIds(ids: readonly number[], code: string): void {
  if (ids.some((id) => !Number.isInteger(id)) || new Set(ids).size !== ids.length) throw new Error(code);
}

function sameIds(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && [...left].sort((a, b) => a - b)
    .every((id, index) => id === [...right].sort((a, b) => a - b)[index]);
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function brier(probabilities: Record<string, number>, options: readonly string[], correct: string): number {
  if (Object.keys(probabilities).length !== options.length || options.some((option) => !(option in probabilities))) {
    throw new Error("recovery_analysis_belief_option_mismatch");
  }
  return options.reduce(
    (sum, option) => sum + (probabilities[option] - (option === correct ? 1 : 0)) ** 2,
    0,
  );
}

function top(probabilities: Record<string, number>, options: readonly string[]): string {
  return [...options].sort((a, b) => probabilities[b] - probabilities[a] || a.localeCompare(b))[0];
}

function loadSummary(dir: string): SummaryView {
  return JSON.parse(readFileSync(join(dir, "summary.json"), "utf8")) as SummaryView;
}

function assertStratumIntegrity(input: {
  dir: string;
  planHash: string;
  planTaskIds: readonly number[];
  manifestHash: string;
  manifestTaskIds: readonly number[];
  summary: SummaryView;
}): void {
  const { dir, planHash, planTaskIds, manifestHash, manifestTaskIds, summary } = input;
  if (!manifestHash.startsWith("sha256:") || summary.planHash !== planHash) {
    throw new Error("recovery_analysis_plan_binding_mismatch");
  }
  assertUniqueSortedIds(summary.completedTaskIds, "recovery_analysis_completed_ids_invalid");
  assertUniqueSortedIds(summary.failures.map((failure) => failure.taskId), "recovery_analysis_failure_ids_invalid");
  assertUniqueSortedIds(summary.skippedTaskIds, "recovery_analysis_skipped_ids_invalid");
  const partition = [
    ...summary.completedTaskIds,
    ...summary.failures.map((failure) => failure.taskId),
    ...summary.skippedTaskIds,
  ];
  if (!sameIds(partition, planTaskIds)) throw new Error("recovery_analysis_roster_partition_invalid");
  if (!sameIds(manifestTaskIds, summary.completedTaskIds)) {
    throw new Error("recovery_analysis_manifest_task_partition_invalid");
  }
  const ledger = auditMechanismAttemptLedgerV1(join(dir, "attempts.jsonl"));
  if (ledger.started !== summary.physicalAttempts || ledger.finished !== summary.physicalAttempts
    || ledger.unfinishedAttemptIds.length || ledger.duplicateRequestHashes.length) {
    throw new Error("recovery_analysis_ledger_invalid");
  }
}

function scoreStratum(input: {
  dir: string;
  source: SourceStratum;
  planHash: string;
  summary: SummaryView;
  dataset: ReturnType<typeof loadCanonicalHiddenBenchTasksV1>;
}): ScoredTask[] {
  const byId = new Map(input.dataset.map((task) => [task.id, task]));
  return input.summary.completedTaskIds.map((taskId) => {
    const sourceTask = byId.get(taskId);
    if (!sourceTask) throw new Error("recovery_analysis_source_task_missing");
    const artifact = loadMechanismTaskArtifactV1(input.dir, taskId);
    if (artifact.planHash !== input.planHash || artifact.executionHash !== input.summary.executionHash
      || artifact.taskRun.seed !== 4 || artifact.model !== "zhipu:glm-4.6v") {
      throw new Error("recovery_analysis_task_binding_invalid");
    }
    const options = sourceTask.possible_answers;
    const correct = sourceTask.correct_answer;
    const round1 = Object.fromEntries(options.map((option) => [
      option,
      artifact.round1Snapshot.reports.reduce(
        (sum, report) => sum + report.probabilities[option],
        0,
      ) / artifact.round1Snapshot.reports.length,
    ]));
    const arms = Object.fromEntries(artifact.taskRun.arms.map((arm) => {
      const armBrier = brier(arm.result.finalBelief, options, correct);
      return [arm.arm, {
        brier: armBrier,
        correct: top(arm.result.finalBelief, options) === correct,
      }];
    })) as ScoredTask["arms"];
    if (!arms.CONTROL || !arms.ATTACKS_NEUTRAL || !arms.ATTACKS_LABELED) {
      throw new Error("recovery_analysis_arm_triplet_missing");
    }
    return {
      taskId,
      source: input.source,
      round1Correct: top(round1, options) === correct,
      arms,
      M1: arms.ATTACKS_LABELED.brier - arms.ATTACKS_NEUTRAL.brier,
      M2: arms.ATTACKS_NEUTRAL.brier - arms.CONTROL.brier,
      M3: arms.ATTACKS_LABELED.brier - arms.CONTROL.brier,
    };
  }).sort((a, b) => a.taskId - b.taskId);
}

function toAnalysisRows(tasks: readonly ScoredTask[]): MechanismAnalysisRowV1[] {
  return tasks.flatMap((task) => ([
    { taskId: task.taskId, arm: "CONTROL" as const, finalBrier: task.arms.CONTROL.brier },
    { taskId: task.taskId, arm: "ATTACKS_NEUTRAL" as const, finalBrier: task.arms.ATTACKS_NEUTRAL.brier },
    { taskId: task.taskId, arm: "ATTACKS_LABELED" as const, finalBrier: task.arms.ATTACKS_LABELED.brier },
  ]));
}

function descriptiveStrata(tasks: readonly ScoredTask[]) {
  return Object.fromEntries(([false, true] as const).map((round1Correct) => {
    const rows = tasks.filter((task) => task.round1Correct === round1Correct);
    return [round1Correct ? "correct" : "wrong", {
      n: rows.length,
      M1: mean(rows.map((row) => row.M1)),
      M2: mean(rows.map((row) => row.M2)),
      M3: mean(rows.map((row) => row.M3)),
      accuracy: {
        CONTROL: mean(rows.map((row) => row.arms.CONTROL.correct ? 1 : 0)),
        ATTACKS_NEUTRAL: mean(rows.map((row) => row.arms.ATTACKS_NEUTRAL.correct ? 1 : 0)),
        ATTACKS_LABELED: mean(rows.map((row) => row.arms.ATTACKS_LABELED.correct ? 1 : 0)),
      },
    }];
  }));
}

function contrastSummary(key: ContrastKey, values: readonly number[]) {
  const ci95 = bootstrapMechanismContrastV1([...values]);
  return {
    contrast: key,
    n: values.length,
    mean: mean(values),
    ci95,
    ...(key === "M1" ? { classification: classifyMechanismM1V1(ci95) } : {}),
  };
}

function crossSeedSummary(
  seed3Tasks: Seed3AnalysisView["taskResults"],
  seed4Tasks: readonly ScoredTask[],
) {
  const seed3 = new Map(seed3Tasks.map((task) => [task.taskId, task]));
  const paired = seed4Tasks.filter((task) => seed3.has(task.taskId)).map((task) => {
    const prior = seed3.get(task.taskId) as Seed3AnalysisView["taskResults"][number];
    return {
      taskId: task.taskId,
      M1: (prior.M1 + task.M1) / 2,
      M2: (prior.M2 + task.M2) / 2,
      M3: (prior.M3 + task.M3) / 2,
    };
  }).sort((a, b) => a.taskId - b.taskId);
  return {
    estimand: "task-level mean of seed-specific paired deltas; task bootstrap",
    completeBothTaskIds: paired.map((task) => task.taskId),
    M1: contrastSummary("M1", paired.map((task) => task.M1)),
    M2: contrastSummary("M2", paired.map((task) => task.M2)),
    M3: contrastSummary("M3", paired.map((task) => task.M3)),
  };
}

function assertDisjoint(left: readonly ScoredTask[], right: readonly ScoredTask[], code: string): void {
  const ids = new Set(left.map((task) => task.taskId));
  if (right.some((task) => ids.has(task.taskId))) throw new Error(code);
}

export function analyzeSeed4RecoverySensitivityV1(inputs: Seed4RecoverySensitivityInputsV1) {
  const seed3Dir = resolve(inputs.seed3Dir);
  const batchADir = resolve(inputs.batchADir);
  const batchBDir = resolve(inputs.batchBDir);
  const recoveryDir = resolve(inputs.recoveryDir);
  const dataset = loadCanonicalHiddenBenchTasksV1();

  const seed3Plan = loadMechanismExperimentPlanV1(seed3Dir);
  const seed3Manifest = verifyMechanismArtifactDirectoryV1(seed3Dir);
  const seed3Summary = loadSummary(seed3Dir);
  const seed3 = JSON.parse(readFileSync(resolve(inputs.seed3AnalysisFile), "utf8")) as Seed3AnalysisView;
  const { contentHash: seed3RecordedHash, ...seed3Body } = seed3;
  if (hashCanonical(seed3Body) !== seed3RecordedHash
    || seed3.planHash !== seed3Plan.contentHash
    || seed3.executionHash !== seed3Summary.executionHash
    || seed3.manifestHash !== seed3Manifest.contentHash
    || !sameIds(seed3.taskResults.map((task) => task.taskId), seed3Summary.completedTaskIds)) {
    throw new Error("recovery_analysis_seed3_binding_invalid");
  }

  const planA = loadSeed4BatchAPlanV1(batchADir);
  const manifestA = verifyMechanismArtifactDirectoryV1(batchADir);
  const summaryA = loadSummary(batchADir);
  assertStratumIntegrity({
    dir: batchADir,
    planHash: planA.contentHash,
    planTaskIds: planA.taskIds,
    manifestHash: manifestA.contentHash,
    manifestTaskIds: manifestA.files.filter((file) => file.role === "task").map((file) => file.taskId as number),
    summary: summaryA,
  });

  const planB = loadSeed4BatchBPlanV1(batchBDir);
  const manifestB = verifyMechanismArtifactDirectoryV1(batchBDir);
  const summaryB = loadSummary(batchBDir);
  assertStratumIntegrity({
    dir: batchBDir,
    planHash: planB.contentHash,
    planTaskIds: planB.taskIds,
    manifestHash: manifestB.contentHash,
    manifestTaskIds: manifestB.files.filter((file) => file.role === "task").map((file) => file.taskId as number),
    summary: summaryB,
  });

  const recoveryPlan = loadSeed4RecoveryPlanV1(recoveryDir);
  const recoveryManifest = verifyMechanismArtifactDirectoryV1(recoveryDir);
  const recoverySummary = loadSummary(recoveryDir);
  assertStratumIntegrity({
    dir: recoveryDir,
    planHash: recoveryPlan.contentHash,
    planTaskIds: recoveryPlan.taskIds,
    manifestHash: recoveryManifest.contentHash,
    manifestTaskIds: recoveryManifest.files.filter((file) => file.role === "task").map((file) => file.taskId as number),
    summary: recoverySummary,
  });

  if (!sameIds(planA.predeclaredBatchBTaskIds, planB.taskIds)) {
    throw new Error("recovery_analysis_batch_b_not_predeclared");
  }
  const rateLimitedBatchBTasks = summaryB.failures
    .filter((failure) => failure.code === "provider_rate_limit")
    .map((failure) => failure.taskId);
  if (!sameIds(rateLimitedBatchBTasks, recoveryPlan.taskIds)) {
    throw new Error("recovery_analysis_eligibility_mismatch");
  }

  const rowsA = scoreStratum({ dir: batchADir, source: "batch_a", planHash: planA.contentHash, summary: summaryA, dataset });
  const rowsB = scoreStratum({ dir: batchBDir, source: "batch_b", planHash: planB.contentHash, summary: summaryB, dataset });
  const recoveredRows = scoreStratum({
    dir: recoveryDir,
    source: "recovery",
    planHash: recoveryPlan.contentHash,
    summary: recoverySummary,
    dataset,
  });
  assertDisjoint(rowsA, rowsB, "recovery_analysis_primary_duplicate_task");
  const primaryRows = [...rowsA, ...rowsB].sort((a, b) => a.taskId - b.taskId);
  assertDisjoint(primaryRows, recoveredRows, "recovery_analysis_replaced_primary_row");
  const reconstructedRows = [...primaryRows, ...recoveredRows].sort((a, b) => a.taskId - b.taskId);

  const primary = computeMechanismAnalysisV1(toAnalysisRows(primaryRows));
  const recoverySensitivity = computeMechanismAnalysisV1(toAnalysisRows(reconstructedRows));
  const body = {
    analysisRef: {
      id: "swarmalpha.experiment.v6.mechanism-seed4-recovery-sensitivity",
      version: "1.0.0",
    },
    evidenceClass: "post_hoc_secondary_recovery_sensitivity",
    inputBindings: {
      seed3: { planHash: seed3Plan.contentHash, manifestHash: seed3Manifest.contentHash, analysisHash: seed3.contentHash },
      batchA: { planHash: planA.contentHash, manifestHash: manifestA.contentHash },
      batchB: { planHash: planB.contentHash, manifestHash: manifestB.contentHash },
      recovery: { planHash: recoveryPlan.contentHash, manifestHash: recoveryManifest.contentHash },
    },
    acquisitionAccounting: {
      primarySeed4: {
        completedTaskIds: primaryRows.map((task) => task.taskId),
        failedTaskIds: [...summaryA.failures, ...summaryB.failures].map((failure) => failure.taskId).sort((a, b) => a - b),
        skippedTaskIds: [...summaryA.skippedTaskIds, ...summaryB.skippedTaskIds].sort((a, b) => a - b),
        physicalAttempts: summaryA.physicalAttempts + summaryB.physicalAttempts,
        observedTokens: summaryA.observedTokens + summaryB.observedTokens,
      },
      recovery: {
        eligibleTaskIds: [...recoveryPlan.taskIds],
        recoveredTaskIds: recoveredRows.map((task) => task.taskId),
        failedTaskIds: recoverySummary.failures.map((failure) => failure.taskId),
        skippedTaskIds: [...recoverySummary.skippedTaskIds],
        physicalAttempts: recoverySummary.physicalAttempts,
        observedTokens: recoverySummary.observedTokens,
      },
      rule: "Recovery rows do not replace original Batch-B failures in primary acquisition accounting.",
    },
    taskResults: reconstructedRows,
    seed3Reference: {
      completedTaskIds: seed3.taskResults.map((task) => task.taskId).sort((a, b) => a - b),
      M1: contrastSummary("M1", seed3.taskResults.map((task) => task.M1)),
      M2: contrastSummary("M2", seed3.taskResults.map((task) => task.M2)),
      M3: contrastSummary("M3", seed3.taskResults.map((task) => task.M3)),
    },
    primarySeed4: {
      evidenceClass: "original_batch_a_b_complete_case",
      inference: primary,
      strata: descriptiveStrata(primaryRows),
      crossSeed: crossSeedSummary(seed3.taskResults, primaryRows),
    },
    recoverySensitivity: {
      evidenceClass: "post_hoc_reconstructed_seed4_complete_case",
      inference: recoverySensitivity,
      strata: descriptiveStrata(reconstructedRows),
      crossSeed: crossSeedSummary(seed3.taskResults, reconstructedRows),
    },
    interpretationLimits: [
      "Recovery was acquired under a later provider/time/credential batch.",
      "Recovery sensitivity is not a replacement for primary Batch-B missingness.",
      "Wrong/correct Round-1 strata are descriptive and outcome-defined offline.",
      "Cross-seed rows are averaged within task before task-level bootstrap.",
    ],
  };
  return { ...body, contentHash: hashCanonical(body) };
}

export function writeSeed4RecoverySensitivityV1(file: string, artifact: ReturnType<typeof analyzeSeed4RecoverySensitivityV1>): void {
  const { contentHash, ...body } = artifact;
  if (hashCanonical(body) !== contentHash) throw new Error("recovery_analysis_hash_mismatch");
  const target = resolve(file);
  mkdirSync(dirname(target), { recursive: true });
  const text = `${JSON.stringify(artifact, null, 2)}\n`;
  if (existsSync(target)) {
    if (readFileSync(target, "utf8") !== text) throw new Error("recovery_analysis_no_overwrite_conflict");
    return;
  }
  writeFileSync(target, text, "utf8");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const [seed3Dir, seed3AnalysisFile, batchADir, batchBDir, recoveryDir, outputFile] = process.argv.slice(2);
  if (!seed3Dir || !seed3AnalysisFile || !batchADir || !batchBDir || !recoveryDir || !outputFile) {
    console.error("usage: <seed3-dir> <seed3-analysis.json> <batch-a-dir> <batch-b-dir> <recovery-dir> <output.json>");
    process.exitCode = 2;
  } else {
    try {
      const artifact = analyzeSeed4RecoverySensitivityV1({ seed3Dir, seed3AnalysisFile, batchADir, batchBDir, recoveryDir });
      writeSeed4RecoverySensitivityV1(outputFile, artifact);
      console.log(JSON.stringify({ status: "complete", outputFile: resolve(outputFile), contentHash: artifact.contentHash }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
