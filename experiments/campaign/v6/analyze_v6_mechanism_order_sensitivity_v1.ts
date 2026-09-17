/**
 * Post-hoc arm-order sensitivity diagnostic for the first-paper GLM component
 * experiment. This module is offline-only: it reads frozen plans, manifests,
 * task artifacts, and recorded analyses; it never calls a provider.
 *
 * Results were inspected before this analysis identity was frozen. The output
 * is therefore descriptive sensitivity evidence, not a preregistered order
 * effect and not a repair of the original selector experiments' fixed order.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { analyzeMechanismFormalArtifactsV1 } from "./analyze_v6_mechanism_formal_v1";
import { analyzeSeed4RecoverySensitivityV1 } from "./analyze_v6_mechanism_seed4_recovery_sensitivity_v1";
import type { MechanismArmV1 } from "./mechanismDisclosureContractV1";
import { loadMechanismExperimentPlanV1 } from "./mechanismExperimentPlanV1";
import { verifyMechanismArtifactDirectoryV1 } from "./mechanismManifestV1";
import { loadSeed4BatchAPlanV1 } from "./mechanismSeed4BatchAPlanV1";
import { loadSeed4BatchBPlanV1 } from "./mechanismSeed4BatchBPlanV1";
import { loadSeed4RecoveryPlanV1 } from "./mechanismSeed4RecoveryPlanV1";
import { loadMechanismTaskArtifactV1 } from "./mechanismTaskArtifactV1";

export const MECHANISM_ORDER_SENSITIVITY_EVIDENCE_CLASS =
  "POST_HOC_ORDER_SENSITIVITY_RESULTS_INSPECTED_BEFORE_FREEZE" as const;

export type MechanismOrderStratumV1 =
  | "neutral_before_control"
  | "neutral_after_control";

type AcquisitionLabelV1 = "seed3" | "batch_a" | "batch_b" | "recovery";

interface SummaryViewV1 {
  planHash: string;
  executionHash: string;
  completedTaskIds: number[];
}

interface PlanBlockViewV1 {
  taskId: number;
  armOrder: MechanismArmV1[];
}

interface PlanViewV1 {
  contentHash: string;
  blocks: PlanBlockViewV1[];
}

interface RecordedAnalysisViewV1 {
  contentHash: string;
  [key: string]: unknown;
}

export interface MechanismOrderTaskRowV1 {
  taskId: number;
  source: AcquisitionLabelV1;
  armOrder: MechanismArmV1[];
  stratum: MechanismOrderStratumV1;
  M2: number;
}

export interface MechanismOrderStratumSummaryV1 {
  plannedTasks: number;
  plannedTaskIds: number[];
  completedTasks: number;
  completedTaskIds: number[];
  meanM2: number | null;
  signCounts: { negative: number; zero: number; positive: number };
}

export interface MechanismOrderSetSummaryV1 {
  evidenceClass:
    | "first_frozen_component_execution_complete_case"
    | "original_batch_a_b_complete_case"
    | "post_hoc_reconstructed_seed4_complete_case";
  plannedTasks: number;
  completedTasks: number;
  overallMeanM2: number | null;
  byStratum: Record<MechanismOrderStratumV1, MechanismOrderStratumSummaryV1>;
  taskRows: MechanismOrderTaskRowV1[];
}

interface AcquisitionAuditV1 {
  label: AcquisitionLabelV1;
  directory: string;
  planHash: string;
  manifestHash: string;
  executionHash: string;
  completedTasks: number;
  completedTaskIds: number[];
  planRecordedOrderMismatches: number;
  recordedExecutedOrderMismatches: number;
  orderByTask: Map<number, MechanismArmV1[]>;
}

export interface MechanismOrderSensitivityInputsV1 {
  seed3Dir: string;
  seed3AnalysisFile: string;
  batchADir: string;
  batchBDir: string;
  recoveryDir: string;
  seed4AnalysisFile: string;
}

export interface MechanismOrderSensitivityArtifactV1 {
  analysisRef: {
    id: "swarmalpha.experiment.v6.mechanism-order-sensitivity-analysis";
    version: "1.0.0";
  };
  evidenceClass: typeof MECHANISM_ORDER_SENSITIVITY_EVIDENCE_CLASS;
  estimand: {
    taskDelta: "M2_i = Brier_i(ATTACKS_NEUTRAL) - Brier_i(CONTROL)";
    stratumRule: "relative position of ATTACKS_NEUTRAL and CONTROL in the actual recorded arm order";
    unit: "task";
    aggregation: "equal-weight arithmetic mean of task-level M2 within each order stratum";
  };
  inputBindings: {
    seed3: {
      directory: string;
      planHash: string;
      manifestHash: string;
      executionHash: string;
      recordedAnalysisFile: string;
      recordedAnalysisHash: string;
      recomputedAnalysisHash: string;
    };
    seed4: {
      batchA: { directory: string; planHash: string; manifestHash: string; executionHash: string };
      batchB: { directory: string; planHash: string; manifestHash: string; executionHash: string };
      recovery: { directory: string; planHash: string; manifestHash: string; executionHash: string };
      recordedAnalysisFile: string;
      recordedAnalysisHash: string;
      recomputedAnalysisHash: string;
    };
  };
  orderAudit: {
    acquisitions: Array<Omit<AcquisitionAuditV1, "orderByTask">>;
    recoveryEligibleTasksCheckedAgainstOriginalBatchBOrder: number;
    recoveryOriginalOrderMismatches: number;
  };
  sets: {
    seed3CompleteCase: MechanismOrderSetSummaryV1;
    seed4PrimaryCompleteCase: MechanismOrderSetSummaryV1;
    seed4RecoverySensitivityCompleteCase: MechanismOrderSetSummaryV1;
  };
  interpretationLimits: string[];
  contentHash: string;
}

function canonical(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("mechanism_order_analysis_non_finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== "object") throw new Error("mechanism_order_analysis_not_json");
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonical((value as Record<string, unknown>)[key])]));
}

function hashCanonical(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value)), "utf8").digest("hex")}`;
}

function portableRepositoryPath(path: string): string {
  const repositoryRoot = resolve(process.cwd());
  const repositoryRelative = relative(repositoryRoot, resolve(path));
  if (!repositoryRelative || repositoryRelative.startsWith("..") || isAbsolute(repositoryRelative)) {
    throw new Error("mechanism_order_input_outside_repository");
  }
  return repositoryRelative.replaceAll("\\", "/");
}

function sameArray<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameIds(left: readonly number[], right: readonly number[]): boolean {
  const a = [...left].sort((x, y) => x - y);
  const b = [...right].sort((x, y) => x - y);
  return sameArray(a, b);
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function loadRecordedAnalysis(file: string): RecordedAnalysisViewV1 {
  const resolved = resolve(file);
  const parsed = JSON.parse(readFileSync(resolved, "utf8")) as RecordedAnalysisViewV1;
  const { contentHash, ...body } = parsed;
  if (hashCanonical(body) !== contentHash) throw new Error("mechanism_order_recorded_analysis_hash_mismatch");
  return parsed;
}

export function classifyMechanismOrderStratumV1(
  armOrder: readonly MechanismArmV1[],
): MechanismOrderStratumV1 {
  const neutral = armOrder.indexOf("ATTACKS_NEUTRAL");
  const control = armOrder.indexOf("CONTROL");
  if (neutral < 0 || control < 0 || neutral === control) {
    throw new Error("mechanism_order_required_arm_missing");
  }
  return neutral < control ? "neutral_before_control" : "neutral_after_control";
}

export function assertMechanismOrderAgreementV1(input: {
  planned: readonly MechanismArmV1[];
  recorded: readonly MechanismArmV1[];
  executed: readonly MechanismArmV1[];
}): void {
  if (!sameArray(input.planned, input.recorded)) {
    throw new Error("mechanism_order_plan_recorded_mismatch");
  }
  if (!sameArray(input.recorded, input.executed)) {
    throw new Error("mechanism_order_recorded_executed_mismatch");
  }
}

function planOrderMap(blocks: readonly PlanBlockViewV1[]): Map<number, MechanismArmV1[]> {
  const out = new Map<number, MechanismArmV1[]>();
  for (const block of blocks) {
    if (out.has(block.taskId)) throw new Error("mechanism_order_duplicate_plan_task");
    classifyMechanismOrderStratumV1(block.armOrder);
    out.set(block.taskId, [...block.armOrder]);
  }
  return out;
}

function auditAcquisitionDirectory(input: {
  label: AcquisitionLabelV1;
  directory: string;
  plan: PlanViewV1;
}): AcquisitionAuditV1 {
  const directory = resolve(input.directory);
  const manifest = verifyMechanismArtifactDirectoryV1(directory);
  const summary = JSON.parse(readFileSync(join(directory, "summary.json"), "utf8")) as SummaryViewV1;
  if (summary.planHash !== input.plan.contentHash || manifest.planHash !== input.plan.contentHash) {
    throw new Error("mechanism_order_plan_binding_mismatch");
  }
  if (summary.completedTaskIds.some(taskId => !Number.isInteger(taskId))
    || new Set(summary.completedTaskIds).size !== summary.completedTaskIds.length) {
    throw new Error("mechanism_order_completed_task_ids_invalid");
  }
  const manifestTaskIds = manifest.files.filter(file => file.role === "task")
    .map(file => file.taskId as number);
  if (!sameIds(summary.completedTaskIds, manifestTaskIds)) {
    throw new Error("mechanism_order_manifest_task_partition_mismatch");
  }
  const planned = planOrderMap(input.plan.blocks);
  const orderByTask = new Map<number, MechanismArmV1[]>();
  for (const taskId of summary.completedTaskIds) {
    const plannedOrder = planned.get(taskId);
    if (!plannedOrder) throw new Error("mechanism_order_completed_task_not_planned");
    const artifact = loadMechanismTaskArtifactV1(directory, taskId);
    if (artifact.planHash !== input.plan.contentHash || artifact.executionHash !== summary.executionHash) {
      throw new Error("mechanism_order_task_binding_mismatch");
    }
    const recordedOrder = [...artifact.taskRun.armOrder];
    const executedOrder = artifact.taskRun.arms.map(arm => arm.arm);
    assertMechanismOrderAgreementV1({ planned: plannedOrder, recorded: recordedOrder, executed: executedOrder });
    orderByTask.set(taskId, recordedOrder);
  }
  return {
    label: input.label,
    directory: portableRepositoryPath(directory),
    planHash: input.plan.contentHash,
    manifestHash: manifest.contentHash,
    executionHash: summary.executionHash,
    completedTasks: summary.completedTaskIds.length,
    completedTaskIds: [...summary.completedTaskIds].sort((a, b) => a - b),
    planRecordedOrderMismatches: 0,
    recordedExecutedOrderMismatches: 0,
    orderByTask,
  };
}

function combineUniqueOrderMaps(
  inputs: ReadonlyArray<{ source: AcquisitionLabelV1; orders: Map<number, MechanismArmV1[]> }>,
): Map<number, { source: AcquisitionLabelV1; armOrder: MechanismArmV1[] }> {
  const out = new Map<number, { source: AcquisitionLabelV1; armOrder: MechanismArmV1[] }>();
  for (const input of inputs) {
    for (const [taskId, armOrder] of input.orders) {
      if (out.has(taskId)) throw new Error("mechanism_order_duplicate_completed_task_across_strata");
      out.set(taskId, { source: input.source, armOrder: [...armOrder] });
    }
  }
  return out;
}

function plannedIdsByStratum(blocks: readonly PlanBlockViewV1[]): Record<MechanismOrderStratumV1, number[]> {
  const out: Record<MechanismOrderStratumV1, number[]> = {
    neutral_before_control: [],
    neutral_after_control: [],
  };
  const seen = new Set<number>();
  for (const block of blocks) {
    if (seen.has(block.taskId)) throw new Error("mechanism_order_duplicate_planned_task_across_batches");
    seen.add(block.taskId);
    out[classifyMechanismOrderStratumV1(block.armOrder)].push(block.taskId);
  }
  out.neutral_before_control.sort((a, b) => a - b);
  out.neutral_after_control.sort((a, b) => a - b);
  return out;
}

function signCounts(values: readonly number[]) {
  return {
    negative: values.filter(value => value < 0).length,
    zero: values.filter(value => value === 0).length,
    positive: values.filter(value => value > 0).length,
  };
}

export function summarizeMechanismOrderRowsV1(input: {
  evidenceClass: MechanismOrderSetSummaryV1["evidenceClass"];
  plannedBlocks: readonly PlanBlockViewV1[];
  taskRows: readonly MechanismOrderTaskRowV1[];
}): MechanismOrderSetSummaryV1 {
  const planned = plannedIdsByStratum(input.plannedBlocks);
  const plannedTaskIds = [...planned.neutral_before_control, ...planned.neutral_after_control];
  const plannedSet = new Set(plannedTaskIds);
  const seen = new Set<number>();
  const taskRows = [...input.taskRows].sort((a, b) => a.taskId - b.taskId).map(row => {
    if (!plannedSet.has(row.taskId)) throw new Error("mechanism_order_unplanned_task_result");
    if (seen.has(row.taskId)) throw new Error("mechanism_order_duplicate_task_result");
    if (!Number.isFinite(row.M2) || row.M2 < -2 || row.M2 > 2) {
      throw new Error("mechanism_order_invalid_M2");
    }
    const actualStratum = classifyMechanismOrderStratumV1(row.armOrder);
    if (actualStratum !== row.stratum) throw new Error("mechanism_order_stratum_mismatch");
    seen.add(row.taskId);
    return { ...row, armOrder: [...row.armOrder] };
  });
  const byStratum = Object.fromEntries(([
    "neutral_before_control",
    "neutral_after_control",
  ] as const).map(stratum => {
    const rows = taskRows.filter(row => row.stratum === stratum);
    const values = rows.map(row => row.M2);
    return [stratum, {
      plannedTasks: planned[stratum].length,
      plannedTaskIds: [...planned[stratum]],
      completedTasks: rows.length,
      completedTaskIds: rows.map(row => row.taskId),
      meanM2: mean(values),
      signCounts: signCounts(values),
    }];
  })) as Record<MechanismOrderStratumV1, MechanismOrderStratumSummaryV1>;
  return {
    evidenceClass: input.evidenceClass,
    plannedTasks: plannedTaskIds.length,
    completedTasks: taskRows.length,
    overallMeanM2: mean(taskRows.map(row => row.M2)),
    byStratum,
    taskRows,
  };
}

function joinM2WithOrder(input: {
  tasks: ReadonlyArray<{ taskId: number; M2: number }>;
  orders: Map<number, { source: AcquisitionLabelV1; armOrder: MechanismArmV1[] }>;
}): MechanismOrderTaskRowV1[] {
  if (!sameIds(input.tasks.map(task => task.taskId), [...input.orders.keys()])) {
    throw new Error("mechanism_order_analysis_order_task_partition_mismatch");
  }
  return input.tasks.map(task => {
    const order = input.orders.get(task.taskId);
    if (!order) throw new Error("mechanism_order_task_order_missing");
    return {
      taskId: task.taskId,
      source: order.source,
      armOrder: [...order.armOrder],
      stratum: classifyMechanismOrderStratumV1(order.armOrder),
      M2: task.M2,
    };
  }).sort((a, b) => a.taskId - b.taskId);
}

export function analyzeMechanismOrderSensitivityV1(
  inputs: MechanismOrderSensitivityInputsV1,
): MechanismOrderSensitivityArtifactV1 {
  const seed3Dir = resolve(inputs.seed3Dir);
  const batchADir = resolve(inputs.batchADir);
  const batchBDir = resolve(inputs.batchBDir);
  const recoveryDir = resolve(inputs.recoveryDir);
  const seed3AnalysisFile = resolve(inputs.seed3AnalysisFile);
  const seed4AnalysisFile = resolve(inputs.seed4AnalysisFile);

  const seed3Plan = loadMechanismExperimentPlanV1(seed3Dir);
  const planA = loadSeed4BatchAPlanV1(batchADir);
  const planB = loadSeed4BatchBPlanV1(batchBDir);
  const recoveryPlan = loadSeed4RecoveryPlanV1(recoveryDir);

  const seed3Audit = auditAcquisitionDirectory({ label: "seed3", directory: seed3Dir, plan: seed3Plan });
  const batchAAudit = auditAcquisitionDirectory({ label: "batch_a", directory: batchADir, plan: planA });
  const batchBAudit = auditAcquisitionDirectory({ label: "batch_b", directory: batchBDir, plan: planB });
  const recoveryAudit = auditAcquisitionDirectory({ label: "recovery", directory: recoveryDir, plan: recoveryPlan });

  const batchBPlanned = planOrderMap(planB.blocks);
  let recoveryOriginalOrderMismatches = 0;
  for (const block of recoveryPlan.blocks) {
    const originalOrder = batchBPlanned.get(block.taskId);
    if (!originalOrder) throw new Error("mechanism_order_recovery_task_not_in_original_batch_b");
    if (!sameArray(originalOrder, block.armOrder)) recoveryOriginalOrderMismatches += 1;
  }
  if (recoveryOriginalOrderMismatches) throw new Error("mechanism_order_recovery_original_order_mismatch");

  const recordedSeed3 = loadRecordedAnalysis(seed3AnalysisFile);
  const recomputedSeed3 = analyzeMechanismFormalArtifactsV1(seed3Dir);
  if (recordedSeed3.contentHash !== recomputedSeed3.contentHash) {
    throw new Error("mechanism_order_seed3_analysis_recompute_mismatch");
  }

  const recordedSeed4 = loadRecordedAnalysis(seed4AnalysisFile);
  const recomputedSeed4 = analyzeSeed4RecoverySensitivityV1({
    seed3Dir,
    seed3AnalysisFile,
    batchADir,
    batchBDir,
    recoveryDir,
  });
  if (recordedSeed4.contentHash !== recomputedSeed4.contentHash) {
    throw new Error("mechanism_order_seed4_analysis_recompute_mismatch");
  }

  const seed3Orders = combineUniqueOrderMaps([{ source: "seed3", orders: seed3Audit.orderByTask }]);
  const primarySeed4Orders = combineUniqueOrderMaps([
    { source: "batch_a", orders: batchAAudit.orderByTask },
    { source: "batch_b", orders: batchBAudit.orderByTask },
  ]);
  const recoverySeed4Orders = combineUniqueOrderMaps([
    { source: "batch_a", orders: batchAAudit.orderByTask },
    { source: "batch_b", orders: batchBAudit.orderByTask },
    { source: "recovery", orders: recoveryAudit.orderByTask },
  ]);

  const primarySeed4Tasks = recomputedSeed4.taskResults.filter(task => task.source !== "recovery");
  const plannedSeed4Blocks = [...planA.blocks, ...planB.blocks];
  const seed3CompleteCase = summarizeMechanismOrderRowsV1({
    evidenceClass: "first_frozen_component_execution_complete_case",
    plannedBlocks: seed3Plan.blocks,
    taskRows: joinM2WithOrder({ tasks: recomputedSeed3.taskResults, orders: seed3Orders }),
  });
  const seed4PrimaryCompleteCase = summarizeMechanismOrderRowsV1({
    evidenceClass: "original_batch_a_b_complete_case",
    plannedBlocks: plannedSeed4Blocks,
    taskRows: joinM2WithOrder({ tasks: primarySeed4Tasks, orders: primarySeed4Orders }),
  });
  const seed4RecoverySensitivityCompleteCase = summarizeMechanismOrderRowsV1({
    evidenceClass: "post_hoc_reconstructed_seed4_complete_case",
    plannedBlocks: plannedSeed4Blocks,
    taskRows: joinM2WithOrder({ tasks: recomputedSeed4.taskResults, orders: recoverySeed4Orders }),
  });

  const acquisitions = [seed3Audit, batchAAudit, batchBAudit, recoveryAudit].map(audit => {
    const { orderByTask: _orders, ...publicAudit } = audit;
    return publicAudit;
  });
  const body = {
    analysisRef: {
      id: "swarmalpha.experiment.v6.mechanism-order-sensitivity-analysis" as const,
      version: "1.0.0" as const,
    },
    evidenceClass: MECHANISM_ORDER_SENSITIVITY_EVIDENCE_CLASS,
    estimand: {
      taskDelta: "M2_i = Brier_i(ATTACKS_NEUTRAL) - Brier_i(CONTROL)" as const,
      stratumRule: "relative position of ATTACKS_NEUTRAL and CONTROL in the actual recorded arm order" as const,
      unit: "task" as const,
      aggregation: "equal-weight arithmetic mean of task-level M2 within each order stratum" as const,
    },
    inputBindings: {
      seed3: {
        directory: seed3Dir,
        planHash: seed3Audit.planHash,
        manifestHash: seed3Audit.manifestHash,
        executionHash: seed3Audit.executionHash,
        recordedAnalysisFile: portableRepositoryPath(seed3AnalysisFile),
        recordedAnalysisHash: recordedSeed3.contentHash,
        recomputedAnalysisHash: recomputedSeed3.contentHash,
      },
      seed4: {
        batchA: {
          directory: batchADir,
          planHash: batchAAudit.planHash,
          manifestHash: batchAAudit.manifestHash,
          executionHash: batchAAudit.executionHash,
        },
        batchB: {
          directory: batchBDir,
          planHash: batchBAudit.planHash,
          manifestHash: batchBAudit.manifestHash,
          executionHash: batchBAudit.executionHash,
        },
        recovery: {
          directory: recoveryDir,
          planHash: recoveryAudit.planHash,
          manifestHash: recoveryAudit.manifestHash,
          executionHash: recoveryAudit.executionHash,
        },
        recordedAnalysisFile: portableRepositoryPath(seed4AnalysisFile),
        recordedAnalysisHash: recordedSeed4.contentHash,
        recomputedAnalysisHash: recomputedSeed4.contentHash,
      },
    },
    orderAudit: {
      acquisitions,
      recoveryEligibleTasksCheckedAgainstOriginalBatchBOrder: recoveryPlan.blocks.length,
      recoveryOriginalOrderMismatches,
    },
    sets: {
      seed3CompleteCase,
      seed4PrimaryCompleteCase,
      seed4RecoverySensitivityCompleteCase,
    },
    interpretationLimits: [
      "The order-stratified results were inspected before this analysis identity was frozen.",
      "Arm-order rotation was deterministic rather than randomized, so the strata can differ in task composition.",
      "The diagnostic weakens only a simple monotonic later-call explanation; it does not establish provider stationarity or no carry-over.",
      "The component diagnostic does not repair the fixed arm order in the original selector executions.",
      "Seed-4 recovery rows were acquired in a later provider/time/credential batch and remain sensitivity evidence only.",
    ],
  };
  return { ...body, contentHash: hashCanonical(body) };
}

export function writeMechanismOrderSensitivityV1(
  file: string,
  artifact: MechanismOrderSensitivityArtifactV1,
): void {
  const { contentHash } = artifact;
  if (recomputeMechanismOrderSensitivityHashV1(artifact) !== contentHash) {
    throw new Error("mechanism_order_analysis_hash_mismatch");
  }
  const target = resolve(file);
  mkdirSync(dirname(target), { recursive: true });
  const text = `${JSON.stringify(artifact, null, 2)}\n`;
  if (existsSync(target)) {
    if (readFileSync(target, "utf8") !== text) throw new Error("mechanism_order_analysis_no_overwrite_conflict");
    return;
  }
  writeFileSync(target, text, "utf8");
}

export function recomputeMechanismOrderSensitivityHashV1(
  artifact: MechanismOrderSensitivityArtifactV1,
): string {
  const { contentHash: _recorded, ...body } = artifact;
  return hashCanonical(body);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const [
    seed3Dir,
    seed3AnalysisFile,
    batchADir,
    batchBDir,
    recoveryDir,
    seed4AnalysisFile,
    outputFile,
  ] = process.argv.slice(2);
  if (!seed3Dir || !seed3AnalysisFile || !batchADir || !batchBDir
    || !recoveryDir || !seed4AnalysisFile || !outputFile) {
    console.error(
      "usage: <seed3-dir> <seed3-analysis.json> <batch-a-dir> <batch-b-dir> "
      + "<recovery-dir> <seed4-analysis.json> <output.json>",
    );
    process.exitCode = 2;
  } else {
    try {
      const artifact = analyzeMechanismOrderSensitivityV1({
        seed3Dir,
        seed3AnalysisFile,
        batchADir,
        batchBDir,
        recoveryDir,
        seed4AnalysisFile,
      });
      writeMechanismOrderSensitivityV1(outputFile, artifact);
      console.log(JSON.stringify({
        status: "complete",
        evidenceClass: artifact.evidenceClass,
        outputFile: resolve(outputFile),
        contentHash: artifact.contentHash,
      }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
