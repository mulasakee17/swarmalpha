/**
 * Pure in-memory analysis math for the first-paper neutral/labeled mechanism
 * probe. No file I/O, no provider, no plotting, no prose claims, no pooling
 * across models/seeds, no wrong/correct stratification, and no significance
 * tests. All statistics are task-level; agent rows are not the unit.
 *
 * Freeze constants and classification rules are verbatim from
 * docs/experiments/FIRST_PAPER_MECHANISM_NEUTRAL_LABELED_FREEZE_V1.md section 8
 * and the CLAUDE_CODE_MECHANISM_V1_LOW_RISK_HANDOFF_2026-08-22.md handoff.
 */

import { MECHANISM_ARMS, type MechanismArmV1 } from "./mechanismDisclosureContractV1";
import {
  MECHANISM_BOOTSTRAP_DRAWS,
  MECHANISM_BOOTSTRAP_SEED,
  MECHANISM_FORMAL_TASK_IDS,
} from "./mechanismExperimentPlanV1";

/** Planned formal analysis units (44 task x seed blocks), frozen. */
export const MECHANISM_PLANNED_DENOMINATOR = MECHANISM_FORMAL_TASK_IDS.length;
/** Missing-task worst-case contrast range, frozen: Brier delta bounds [-2,+2]. */
export const MECHANISM_MISSING_DELTA_LO = -2;
export const MECHANISM_MISSING_DELTA_HI = 2;

export const MECHANISM_ARM_SET: readonly MechanismArmV1[] = MECHANISM_ARMS;

export interface MechanismAnalysisRowV1 {
  taskId: number;
  arm: MechanismArmV1;
  finalBrier: number;
}

export type MechanismM1ClassificationV1 =
  | "LABEL_BENEFIT"
  | "LABEL_HARM"
  | "PRACTICALLY_SMALL"
  | "INCONCLUSIVE";

export interface MechanismContrastSummaryV1 {
  contrast: "M1" | "M2" | "M3";
  completeTasks: number;
  mean: number | null;
  ci95: { lo: number; hi: number } | null;
}

export interface MechanismTaskDeltasV1 {
  taskId: number;
  /** M1 = B_LABELED - B_NEUTRAL (primary incremental labeled-frame effect). */
  M1: number;
  /** M2 = B_NEUTRAL - B_CONTROL (structured re-exposure effect, secondary). */
  M2: number;
  /** M3 = B_LABELED - B_CONTROL (full-treatment replication contrast, secondary). */
  M3: number;
}

export interface MechanismMissingBoundsV1 {
  lowerMeanDelta: number;
  upperMeanDelta: number;
  missingCount: number;
}

export interface MechanismAnalysisV1 {
  plannedTasks: number;
  completeTaskIds: number[];
  missingTaskIds: number[];
  taskDeltas: MechanismTaskDeltasV1[];
  M1: MechanismContrastSummaryV1 & { classification: MechanismM1ClassificationV1 };
  M2: MechanismContrastSummaryV1;
  M3: MechanismContrastSummaryV1;
  missingBounds: { M1: MechanismMissingBoundsV1; M2: MechanismMissingBoundsV1; M3: MechanismMissingBoundsV1 };
}

/** Small deterministic PRNG local to this file; no dependency added. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/** Linear-interpolation percentile over sorted values, matching the frozen analyzers. */
function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
}

/**
 * Deterministic percentile task bootstrap over per-task deltas using the
 * frozen draw count and seed. Reproducible byte-for-byte for identical input.
 */
export function bootstrapMechanismContrastV1(
  taskDeltas: number[],
  draws: number = MECHANISM_BOOTSTRAP_DRAWS,
  seed: number = MECHANISM_BOOTSTRAP_SEED,
): { lo: number; hi: number } | null {
  if (taskDeltas.length === 0) return null;
  const rng = mulberry32(seed);
  const n = taskDeltas.length;
  const means: number[] = new Array(draws);
  for (let d = 0; d < draws; d++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += taskDeltas[Math.floor(rng() * n)];
    means[d] = sum / n;
  }
  means.sort((a, b) => a - b);
  return { lo: percentile(means, 0.025), hi: percentile(means, 0.975) };
}

/**
 * Primary M1 classification, verbatim from freeze section 8:
 *  - LABEL_BENEFIT    if the 95% interval is entirely below zero;
 *  - LABEL_HARM       if the 95% interval is entirely above zero;
 *  - PRACTICALLY_SMALL if the entire interval lies inside [-band,+band];
 *  - INCONCLUSIVE     otherwise.
 */
export function classifyMechanismM1V1(
  ci: { lo: number; hi: number } | null,
  band: number = 0.1,
): MechanismM1ClassificationV1 {
  if (ci === null) return "INCONCLUSIVE";
  if (ci.hi < 0) return "LABEL_BENEFIT";
  if (ci.lo > 0) return "LABEL_HARM";
  if (ci.lo >= -band && ci.hi <= band) return "PRACTICALLY_SMALL";
  return "INCONCLUSIVE";
}

/**
 * Planned-denominator worst-case bounds: every missing task is assigned the
 * full [-2,+2] contrast range and the mean is recomputed over the planned
 * denominator of 44.
 */
function missingBounds(taskDeltas: number[], missingCount: number): MechanismMissingBoundsV1 {
  const completeSum = taskDeltas.reduce((sum, v) => sum + v, 0);
  const denominator = MECHANISM_PLANNED_DENOMINATOR;
  return {
    lowerMeanDelta: (completeSum + missingCount * MECHANISM_MISSING_DELTA_LO) / denominator,
    upperMeanDelta: (completeSum + missingCount * MECHANISM_MISSING_DELTA_HI) / denominator,
    missingCount,
  };
}

/**
 * Pure analysis over in-memory rows. Rejects duplicate task/arm rows,
 * non-finite or out-of-range Brier, unknown arms, and incomplete triplets.
 * A complete task requires exactly CONTROL, ATTACKS_NEUTRAL and ATTACKS_LABELED.
 */
export function computeMechanismAnalysisV1(rows: readonly MechanismAnalysisRowV1[]): MechanismAnalysisV1 {
  const seen = new Set<string>();
  const byTask = new Map<number, Partial<Record<MechanismArmV1, number>>>();
  const plannedTaskSet = new Set<number>(MECHANISM_FORMAL_TASK_IDS);
  for (const row of rows) {
    if (!Number.isInteger(row.taskId) || row.taskId <= 0) {
      throw new Error("mechanism_invalid_task_id");
    }
    if (!plannedTaskSet.has(row.taskId)) throw new Error("mechanism_unplanned_task_id");
    if (!MECHANISM_ARM_SET.includes(row.arm)) {
      throw new Error("mechanism_unknown_arm");
    }
    if (!Number.isFinite(row.finalBrier) || row.finalBrier < 0 || row.finalBrier > 2) {
      throw new Error("mechanism_invalid_brier");
    }
    const key = `${row.taskId}:${row.arm}`;
    if (seen.has(key)) throw new Error("mechanism_duplicate_task_arm_row");
    seen.add(key);
    const entry = byTask.get(row.taskId) ?? {};
    if (entry[row.arm] !== undefined) throw new Error("mechanism_duplicate_task_arm_row");
    entry[row.arm] = row.finalBrier;
    byTask.set(row.taskId, entry);
  }

  const completeTaskIds: number[] = [];
  const missingTaskIds: number[] = [];
  const taskDeltas: MechanismTaskDeltasV1[] = [];
  for (const taskId of MECHANISM_FORMAL_TASK_IDS) {
    const briers = byTask.get(taskId) ?? {};
    const hasControl = briers.CONTROL !== undefined;
    const hasNeutral = briers.ATTACKS_NEUTRAL !== undefined;
    const hasLabeled = briers.ATTACKS_LABELED !== undefined;
    if (hasControl && hasNeutral && hasLabeled) {
      const c = briers.CONTROL as number;
      const n = briers.ATTACKS_NEUTRAL as number;
      const l = briers.ATTACKS_LABELED as number;
      completeTaskIds.push(taskId);
      taskDeltas.push({ taskId, M1: l - n, M2: n - c, M3: l - c });
    } else {
      missingTaskIds.push(taskId);
    }
  }
  completeTaskIds.sort((a, b) => a - b);
  missingTaskIds.sort((a, b) => a - b);

  const missingCount = missingTaskIds.length;
  const d1 = taskDeltas.map(t => t.M1);
  const d2 = taskDeltas.map(t => t.M2);
  const d3 = taskDeltas.map(t => t.M3);

  const M1: MechanismAnalysisV1["M1"] = {
    contrast: "M1",
    completeTasks: d1.length,
    mean: mean(d1),
    ci95: bootstrapMechanismContrastV1(d1),
    classification: classifyMechanismM1V1(bootstrapMechanismContrastV1(d1), 0.1),
  };
  const M2: MechanismAnalysisV1["M2"] = {
    contrast: "M2",
    completeTasks: d2.length,
    mean: mean(d2),
    ci95: bootstrapMechanismContrastV1(d2),
  };
  const M3: MechanismAnalysisV1["M3"] = {
    contrast: "M3",
    completeTasks: d3.length,
    mean: mean(d3),
    ci95: bootstrapMechanismContrastV1(d3),
  };

  return {
    plannedTasks: MECHANISM_PLANNED_DENOMINATOR,
    completeTaskIds,
    missingTaskIds,
    taskDeltas,
    M1,
    M2,
    M3,
    missingBounds: {
      M1: missingBounds(d1, missingCount),
      M2: missingBounds(d2, missingCount),
      M3: missingBounds(d3, missingCount),
    },
  };
}
