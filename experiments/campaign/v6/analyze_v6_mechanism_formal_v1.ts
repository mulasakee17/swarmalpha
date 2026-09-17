/** Independent offline scorer/analyzer for the frozen mechanism V1 formal run. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadCanonicalHiddenBenchTasksV1 } from "./hiddenBenchTaskAdapter";
import { computeMechanismAnalysisV1, type MechanismAnalysisRowV1 } from "./mechanismAnalysisMathV1";
import { auditMechanismAttemptLedgerV1 } from "./mechanismAttemptLedgerV1";
import { loadMechanismExperimentPlanV1 } from "./mechanismExperimentPlanV1";
import { verifyMechanismArtifactDirectoryV1 } from "./mechanismManifestV1";
import { loadMechanismTaskArtifactV1 } from "./mechanismTaskArtifactV1";

interface FormalSummaryViewV1 {
  planHash: string;
  executionHash: string;
  completedTaskIds: number[];
  failures: Array<{ taskId: number }>;
  skippedTaskIds: number[];
  physicalAttempts: number;
  observedTokens: number;
}

export interface MechanismOfflineTaskResultV1 {
  taskId: number;
  round1: { topOption: string; correct: boolean; brier: number };
  arms: Record<string, {
    brier: number;
    topOption: string;
    correct: boolean;
    disclosureChars: number;
    meanRound2PromptChars: number;
    meanFinalPromptChars: number;
  }>;
  M1: number;
  M2: number;
  M3: number;
}

export interface MechanismOfflineAnalysisArtifactV1 {
  analysisRef: { id: "swarmalpha.experiment.v6.mechanism-offline-analysis"; version: "1.0.0" };
  planHash: string;
  executionHash: string;
  manifestHash: string;
  datasetHash: string;
  summary: { completedTasks: number; failedTasks: number; skippedTasks: number; physicalAttempts: number; observedTokens: number };
  taskResults: MechanismOfflineTaskResultV1[];
  inference: ReturnType<typeof computeMechanismAnalysisV1>;
  contentHash: string;
}

function canonical(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("mechanism_analysis_non_finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== "object") throw new Error("mechanism_analysis_not_json");
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonical((value as Record<string, unknown>)[key])]));
}

function hashCanonical(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value)), "utf8").digest("hex")}`;
}

function brier(probabilities: Record<string, number>, options: readonly string[], correct: string): number {
  if (Object.keys(probabilities).length !== options.length || options.some(option => !(option in probabilities))) {
    throw new Error("mechanism_analysis_belief_option_mismatch");
  }
  return options.reduce((sum, option) => sum + (probabilities[option] - (option === correct ? 1 : 0)) ** 2, 0);
}

function top(probabilities: Record<string, number>, options: readonly string[]): string {
  return [...options].sort((a, b) => probabilities[b] - probabilities[a] || a.localeCompare(b))[0];
}

function mean(values: number[]): number {
  if (!values.length) throw new Error("mechanism_analysis_prompt_group_empty");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function assertRosterPartition(planIds: readonly number[], summary: FormalSummaryViewV1): void {
  const combined = [...summary.completedTaskIds, ...summary.failures.map(item => item.taskId), ...summary.skippedTaskIds];
  if (combined.length !== planIds.length || new Set(combined).size !== planIds.length
    || planIds.some(taskId => !combined.includes(taskId))) {
    throw new Error("mechanism_analysis_roster_partition_invalid");
  }
}

export function analyzeMechanismFormalArtifactsV1(outputDir: string): MechanismOfflineAnalysisArtifactV1 {
  const resolved = resolve(outputDir);
  const plan = loadMechanismExperimentPlanV1(resolved);
  const manifest = verifyMechanismArtifactDirectoryV1(resolved);
  const summary = JSON.parse(readFileSync(join(resolved, "summary.json"), "utf8")) as FormalSummaryViewV1;
  if (summary.planHash !== plan.contentHash || summary.planHash !== manifest.planHash) {
    throw new Error("mechanism_analysis_plan_binding_mismatch");
  }
  assertRosterPartition(plan.formalTaskIds, summary);
  const ledger = auditMechanismAttemptLedgerV1(join(resolved, "attempts.jsonl"));
  if (ledger.started !== summary.physicalAttempts || ledger.finished !== summary.physicalAttempts
    || ledger.unfinishedAttemptIds.length || ledger.duplicateRequestHashes.length) {
    throw new Error("mechanism_analysis_ledger_mismatch");
  }
  const dataset = loadCanonicalHiddenBenchTasksV1();
  const byId = new Map(dataset.map(task => [task.id, task]));
  const rows: MechanismAnalysisRowV1[] = [];
  const taskResults: MechanismOfflineTaskResultV1[] = [];

  for (const taskId of summary.completedTaskIds) {
    const source = byId.get(taskId);
    if (!source) throw new Error("mechanism_analysis_task_source_missing");
    const artifact = loadMechanismTaskArtifactV1(resolved, taskId);
    if (artifact.planHash !== plan.contentHash || artifact.executionHash !== summary.executionHash) {
      throw new Error("mechanism_analysis_task_binding_mismatch");
    }
    const options = source.possible_answers;
    const correct = source.correct_answer;
    const round1Belief = Object.fromEntries(options.map(option => [
      option,
      artifact.round1Snapshot.reports.reduce((sum, report) => sum + report.probabilities[option], 0)
        / artifact.round1Snapshot.reports.length,
    ]));
    const round1Top = top(round1Belief, options);
    const armResults: MechanismOfflineTaskResultV1["arms"] = {};
    for (const arm of artifact.taskRun.arms) {
      const armBrier = brier(arm.result.finalBelief, options, correct);
      rows.push({ taskId, arm: arm.arm, finalBrier: armBrier });
      const r2PromptChars = artifact.providerAttempts
        .filter(attempt => attempt.requestId.includes(`:${arm.arm}:r2:`))
        .map(attempt => attempt.userPrompt.length);
      const finalPromptChars = artifact.providerAttempts
        .filter(attempt => attempt.requestId.startsWith(`final:mechanism:task-${taskId}:seed-${artifact.taskRun.seed}:${arm.arm}:`))
        .map(attempt => attempt.userPrompt.length);
      const armTop = top(arm.result.finalBelief, options);
      armResults[arm.arm] = {
        brier: armBrier,
        topOption: armTop,
        correct: armTop === correct,
        disclosureChars: arm.disclosure.messageCharCount,
        meanRound2PromptChars: mean(r2PromptChars),
        meanFinalPromptChars: mean(finalPromptChars),
      };
    }
    const control = armResults.CONTROL.brier;
    const neutral = armResults.ATTACKS_NEUTRAL.brier;
    const labeled = armResults.ATTACKS_LABELED.brier;
    taskResults.push({
      taskId,
      round1: { topOption: round1Top, correct: round1Top === correct, brier: brier(round1Belief, options, correct) },
      arms: armResults,
      M1: labeled - neutral,
      M2: neutral - control,
      M3: labeled - control,
    });
  }
  taskResults.sort((a, b) => a.taskId - b.taskId);
  const body = {
    analysisRef: { id: "swarmalpha.experiment.v6.mechanism-offline-analysis" as const, version: "1.0.0" as const },
    planHash: plan.contentHash,
    executionHash: summary.executionHash,
    manifestHash: manifest.contentHash,
    datasetHash: "sha256:901c94b6e4edbeebe51f3ecba7baf069cde1e64f8d0bdec0f4d5314b4258f123",
    summary: {
      completedTasks: summary.completedTaskIds.length,
      failedTasks: summary.failures.length,
      skippedTasks: summary.skippedTaskIds.length,
      physicalAttempts: summary.physicalAttempts,
      observedTokens: summary.observedTokens,
    },
    taskResults,
    inference: computeMechanismAnalysisV1(rows),
  };
  return { ...body, contentHash: hashCanonical(body) };
}

export function writeMechanismOfflineAnalysisV1(file: string, artifact: MechanismOfflineAnalysisArtifactV1): void {
  const { contentHash, ...body } = artifact;
  if (hashCanonical(body) !== contentHash) throw new Error("mechanism_analysis_hash_mismatch");
  const resolved = resolve(file);
  mkdirSync(dirname(resolved), { recursive: true });
  const text = `${JSON.stringify(artifact, null, 2)}\n`;
  if (existsSync(resolved)) {
    if (readFileSync(resolved, "utf8") !== text) throw new Error("mechanism_analysis_no_overwrite_conflict");
    return;
  }
  writeFileSync(resolved, text, "utf8");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const inputDir = process.argv[2];
  const outputFile = process.argv[3];
  if (!inputDir || !outputFile) {
    console.error("usage: <formal-output-dir> <analysis-output.json>");
    process.exitCode = 2;
  } else {
    try {
      const artifact = analyzeMechanismFormalArtifactsV1(inputDir);
      writeMechanismOfflineAnalysisV1(outputFile, artifact);
      console.log(JSON.stringify({ status: "complete", outputFile: resolve(outputFile), contentHash: artifact.contentHash }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
