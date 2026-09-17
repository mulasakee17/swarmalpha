/**
 * GLM-4.6V V3 cross-model replication gate — frozen analysis.
 *
 * Implements docs/experiments/GLM46V_CROSS_MODEL_REPLICATION_ANALYSIS_FREEZE_V1.md
 * (contentHash sha256:ba05f4e38f64285c8f45f467480ef24b7cedbcd4b73eae1fd740ff1b00984c02)
 * exactly. It is written BEFORE any formal V3 outcome is inspected; nothing in
 * this file may change after the first V3 provider attempt.
 *
 *  - reads ONLY the V3 output run JSONL as result data; attempts.jsonl is used
 *    exclusively for accounting / run-health reporting, never as outcome;
 *  - rejects task 14 (previously observed canary) and any task outside the
 *    frozen 44-task population;
 *  - primary estimand: equal-weight task mean of
 *        delta_i = finalBrier_i(ATTACKS) - finalBrier_i(CONTROL)
 *    over complete pairs (both arm rows artifact-verified with non-null Brier);
 *  - 10,000 task-level percentile bootstrap resamples, deterministic master
 *    seed 0x5EED0F (mulberry32), 2.5/97.5 percentiles;
 *  - classification: PASS (mean<0 and CI upper<0), DIRECTIONAL (mean<0, CI
 *    includes 0), FAIL (mean>=0);
 *  - missingness: complete-pair count, missing reasons, and an all-44-task
 *    worst/best bound assigning -2 / +2 to every incomplete task;
 *  - secondary (never overturns the primary): accuracy paired difference,
 *    Spearman(round-1 pooled Brier, delta) with the same task bootstrap,
 *    frozen severity bins (<0.3, 0.3..1.0, >1.0), per-task table;
 *  - outputs analysis-v1.json + analysis-v1.md into the V3 output directory,
 *    never silently overwriting (identical content is a no-op; --verify mode
 *    recomputes and compares without writing).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  GLM46V_OUTPUT_DIR,
  GLM46V_ANALYSIS_SPEC_PATH,
  GLM46V_PROSPECTIVE_TASK_IDS,
  buildGlm46vTwoArmPlanV3,
  recomputeGlm46vPlanHash,
  recomputeGlm46vManifestHash,
  recomputeGlm46vSummaryHash,
  readGlm46vLedgerScan,
  type Glm46vTwoArmPlanV3,
  type Glm46vTwoArmManifestV2,
  type Glm46vTwoArmSummaryV2,
  type Glm46vLedgerScanV1,
} from "./run_v6_fork_glm46v_two_arm";
import type { ForkRow } from "./run_v6_fork";

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) — bootstrap reproducibility.
// ---------------------------------------------------------------------------

export function createV3SeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const V3_BOOTSTRAP_MASTER_SEED = 0x5eed0f;
export const V3_BOOTSTRAP_REPETITIONS = 10_000;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

function bootstrapCis(values: number[], repetitions: number, seed: number): { lo: number; hi: number } | null {
  const n = values.length;
  if (n === 0) return null;
  const rng = createV3SeededRng(seed);
  const means: number[] = [];
  for (let r = 0; r < repetitions; r++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += values[Math.floor(rng() * n)];
    means.push(sum / n);
  }
  means.sort((a, b) => a - b);
  return { lo: percentile(means, 0.025), hi: percentile(means, 0.975) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256Text(s: string): string {
  return `sha256:${createHash("sha256").update(s, "utf8").digest("hex")}`;
}

function hashCanonical(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input !== null && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([l], [r]) => l.localeCompare(r))
          .map(([k, v]) => [k, normalize(v)]),
      );
    }
    return input;
  };
  return sha256Text(JSON.stringify(normalize(value)));
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : NaN;
}

function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length < 2 || xs.length !== ys.length) return null;
  const rank = (values: number[]): number[] => {
    const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(values.length);
    let i = 0;
    while (i < indexed.length) {
      let j = i;
      while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[indexed[k].i] = avg;
      i = j + 1;
    }
    return ranks;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < rx.length; i++) {
    const dx = rx[i] - mx;
    const dy = ry[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return null;
  return num / Math.sqrt(dx2 * dy2);
}

// ---------------------------------------------------------------------------
// Frozen population / artifact validation
// ---------------------------------------------------------------------------

export interface V3RunFileRows {
  taskId: number;
  rows: ForkRow[];
}

export interface V3AnalysisInput {
  plan: Glm46vTwoArmPlanV3;
  manifest: Glm46vTwoArmManifestV2;
  summary: Glm46vTwoArmSummaryV2;
  ledgerScan: Glm46vLedgerScanV1;
  runFiles: V3RunFileRows[];
}

/** Strict population gate: task 14 and out-of-plan tasks are rejected. */
export function validateV3Population(input: {
  plan: Glm46vTwoArmPlanV3;
  runFiles: V3RunFileRows[];
}): string[] {
  const problems: string[] = [];
  const planned = new Set(input.plan.taskIds);
  for (const file of input.runFiles) {
    if (file.taskId === 14) {
      problems.push(`task 14 must never enter the formal sample (found in run file rows)`);
    }
    if (!planned.has(file.taskId)) {
      problems.push(`task ${file.taskId} is outside the frozen 44-task population`);
    }
    if (file.rows.length !== 2) {
      problems.push(`task ${file.taskId}: expected 2 arm rows, got ${file.rows.length}`);
      continue;
    }
    const arms = [...new Set(file.rows.map(r => r.arm))].sort();
    if (JSON.stringify(arms) !== JSON.stringify(["ATTACKS", "CONTROL"])) {
      problems.push(`task ${file.taskId}: arm set must be exactly CONTROL+ATTACKS, got ${arms.join(",")}`);
    }
    for (const row of file.rows) {
      if (row.seed !== 0) problems.push(`task ${file.taskId}: seed must be 0`);
      if (row.model !== input.plan.model) problems.push(`task ${file.taskId}: model mismatch`);
    }
  }
  const observed = new Set(input.runFiles.map(f => f.taskId));
  for (const taskId of input.plan.taskIds) {
    if (!observed.has(taskId)) problems.push(`task ${taskId}: missing run file`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Core analysis (pure; testable with synthetic rows)
// ---------------------------------------------------------------------------

export interface V3TaskDelta {
  taskId: number;
  controlBrier: number | null;
  attacksBrier: number | null;
  delta: number | null;
  complete: boolean;
  missingReason?: string;
  controlAccuracy: number | null;
  attacksAccuracy: number | null;
  round1PooledBrier: number | null;
}

export interface V3SeverityBin {
  bin: string;
  taskCount: number;
  meanDelta: number | null;
}

export interface V3AnalysisV1 {
  analysisSchemaRef: { id: string; version: string };
  inputs: {
    planHash: string;
    manifestHash: string;
    summaryHash: string;
    ledgerHash: string;
    analysisSpec: { path: string; contentHash: string };
    outputDir: string;
  };
  population: { plannedTasks: number; taskIds: number[] };
  accounting: {
    completedTasks: number;
    failedTasks: number;
    skippedTasks: number;
    physicalAttempts: number;
    observedKnownTokens: number;
    unknownUsageAttempts: number;
    parserInvalidByPhaseArm: Record<string, number>;
    providerUnavailableByPhaseArm: Record<string, number>;
    duplicateRequestHashes: number;
  };
  primary: {
    completePairs: number;
    missingPairs: number;
    missingReasons: Record<string, number>;
    meanDelta: number | null;
    bootstrapRepetitions: number;
    masterSeed: number;
    ci95: { lo: number | null; hi: number | null };
    classification: "PASS" | "DIRECTIONAL" | "FAIL" | "UNCLASSIFIED";
    bounds44: { lowerMeanDelta: number | null; upperMeanDelta: number | null; incompleteAssigned: number };
  };
  secondary: {
    accuracy: { meanDelta: number | null; ci95: { lo: number | null; hi: number | null } | null };
    spearmanRound1BrierDelta: { rho: number | null; ci95: { lo: number | null; hi: number | null } | null };
    severityBins: V3SeverityBin[];
  };
  taskTable: V3TaskDelta[];
  contentHash: string;
}

export function computeV3Analysis(input: V3AnalysisInput): V3AnalysisV1 {
  // ---- population gate ----
  const problems = validateV3Population({ plan: input.plan, runFiles: input.runFiles });
  if (problems.length > 0) {
    throw new Error(`v3_analysis_population_rejected: ${problems.join("; ")}`);
  }

  // ---- pair construction ----
  const deltas: V3TaskDelta[] = [];
  const missingReasons: Record<string, number> = {};
  const taskIds = input.plan.taskIds;
  const byTask = new Map(input.runFiles.map(f => [f.taskId, f.rows]));
  for (const taskId of taskIds) {
    const rows = byTask.get(taskId);
    const control = rows?.find(r => r.arm === "CONTROL") ?? null;
    const attacks = rows?.find(r => r.arm === "ATTACKS") ?? null;
    let complete = true;
    let missingReason: string | undefined;
    if (!control || !attacks) {
      complete = false;
      missingReason = "missing_arm_row";
    } else if (control.finalBrier === null || attacks.finalBrier === null) {
      complete = false;
      missingReason = control.finalBrier === null && attacks.finalBrier === null
        ? "both_arms_null_brier"
        : control.finalBrier === null ? "control_null_brier" : "attacks_null_brier";
    }
    if (!complete) {
      missingReasons[missingReason!] = (missingReasons[missingReason!] ?? 0) + 1;
    }
    deltas.push({
      taskId,
      controlBrier: control?.finalBrier ?? null,
      attacksBrier: attacks?.finalBrier ?? null,
      delta: complete && control && attacks
        ? attacks.finalBrier! - control.finalBrier!
        : null,
      complete,
      ...(missingReason ? { missingReason } : {}),
      controlAccuracy: control?.finalAccuracy ?? null,
      attacksAccuracy: attacks?.finalAccuracy ?? null,
      round1PooledBrier: control ? computeRound1PooledBrier(control) : null,
    });
  }

  const completeDeltas = deltas.filter(d => d.complete && d.delta !== null).map(d => d.delta!);
  const ci = bootstrapCis(completeDeltas, V3_BOOTSTRAP_REPETITIONS, V3_BOOTSTRAP_MASTER_SEED);
  const meanDelta = completeDeltas.length > 0 ? mean(completeDeltas) : null;
  let classification: V3AnalysisV1["primary"]["classification"] = "UNCLASSIFIED";
  if (meanDelta !== null && ci !== null) {
    if (meanDelta < 0 && ci.hi < 0) classification = "PASS";
    else if (meanDelta < 0) classification = "DIRECTIONAL";
    else classification = "FAIL";
  }

  // ---- all-44-task conservative bounds: incomplete delta assigned -2 / +2 ----
  const lowerVals = deltas.map(d => d.complete ? d.delta! : -2);
  const upperVals = deltas.map(d => d.complete ? d.delta! : +2);
  const bounds44 = {
    lowerMeanDelta: mean(lowerVals),
    upperMeanDelta: mean(upperVals),
    incompleteAssigned: 2,
  };

  // ---- secondary: accuracy ----
  const accDeltas = deltas
    .filter(d => d.controlAccuracy !== null && d.attacksAccuracy !== null)
    .map(d => d.attacksAccuracy! - d.controlAccuracy!);

  // ---- secondary: Spearman(round-1 pooled Brier, delta) with task bootstrap ----
  const spInput = deltas.filter(d => d.complete && d.delta !== null && d.round1PooledBrier !== null);
  const rho = spInput.length >= 2
    ? spearman(spInput.map(d => d.round1PooledBrier!), spInput.map(d => d.delta!))
    : null;
  let rhoCi: { lo: number | null; hi: number | null } | null = null;
  if (spInput.length >= 2) {
    const rng = createV3SeededRng(V3_BOOTSTRAP_MASTER_SEED);
    const rhos: number[] = [];
    for (let r = 0; r < V3_BOOTSTRAP_REPETITIONS; r++) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < spInput.length; i++) {
        const idx = Math.floor(rng() * spInput.length);
        xs.push(spInput[idx].round1PooledBrier!);
        ys.push(spInput[idx].delta!);
      }
      const value = spearman(xs, ys);
      if (value !== null && Number.isFinite(value)) rhos.push(value);
    }
    if (rhos.length >= 100) {
      rhos.sort((a, b) => a - b);
      rhoCi = { lo: percentile(rhos, 0.025), hi: percentile(rhos, 0.975) };
    }
  }

  // ---- secondary: frozen severity bins ----
  const bins: V3SeverityBin[] = [
    { bin: "<0.3", taskCount: 0, meanDelta: null },
    { bin: "0.3-1.0", taskCount: 0, meanDelta: null },
    { bin: ">1.0", taskCount: 0, meanDelta: null },
  ];
  for (const d of spInput) {
    const b = d.round1PooledBrier! < 0.3 ? bins[0] : d.round1PooledBrier! <= 1.0 ? bins[1] : bins[2];
    b.taskCount += 1;
    b.meanDelta = b.meanDelta === null ? d.delta! : b.meanDelta + d.delta!;
  }
  for (const b of bins) {
    if (b.taskCount > 0) b.meanDelta = b.meanDelta! / b.taskCount;
  }

  // ---- run health / accounting (ledger + row records only; never outcome) ----
  const parserInvalidByPhaseArm: Record<string, number> = {};
  const providerUnavailableByPhaseArm: Record<string, number> = {};
  const round1Seen = new Set<string>();
  for (const file of input.runFiles) {
    for (const row of file.rows) {
      for (const record of row.callRecords ?? []) {
        if (record.phase === "discussion_r1") {
          if (round1Seen.has(record.requestHash)) continue;
          round1Seen.add(record.requestHash);
        }
        const key = `${record.phase}:${record.arm ?? "r1"}`;
        if (record.phase.startsWith("discussion") && record.parseErrorCode !== undefined) {
          parserInvalidByPhaseArm[key] = (parserInvalidByPhaseArm[key] ?? 0) + 1;
        }
        if (record.status === "unavailable") {
          providerUnavailableByPhaseArm[key] = (providerUnavailableByPhaseArm[key] ?? 0) + 1;
        }
      }
    }
  }
  // final parser-invalid counts come from final call records' parseStatus
  for (const file of input.runFiles) {
    for (const row of file.rows) {
      for (const record of row.callRecords ?? []) {
        if (record.phase === "final" && record.status === "response" && record.parseStatus === "invalid") {
          const key = `final:${record.arm}`;
          parserInvalidByPhaseArm[key] = (parserInvalidByPhaseArm[key] ?? 0) + 1;
        }
      }
    }
  }
  const duplicateRequestHashes = countDuplicateRequestHashes(input.ledgerScan);

  const body: Omit<V3AnalysisV1, "contentHash"> = {
    analysisSchemaRef: { id: "swarmalpha.experiment.v6-fork-glm46v-v3-analysis", version: "1.0.0" },
    inputs: {
      planHash: input.plan.contentHash,
      manifestHash: input.manifest.contentHash,
      summaryHash: input.summary.contentHash,
      ledgerHash: input.manifest.ledgerHash,
      analysisSpec: {
        path: GLM46V_ANALYSIS_SPEC_PATH,
        contentHash: input.plan.analysisSpec.contentHash,
      },
      outputDir: input.plan.artifactPath,
    },
    population: { plannedTasks: input.plan.taskIds.length, taskIds: [...input.plan.taskIds] },
    accounting: {
      completedTasks: input.summary.completedTasks,
      failedTasks: input.summary.failedTasks,
      skippedTasks: input.summary.skippedTasks,
      physicalAttempts: input.ledgerScan.physicalAttempts,
      observedKnownTokens: input.ledgerScan.observedTokens,
      unknownUsageAttempts: input.ledgerScan.unknownUsageCalls,
      parserInvalidByPhaseArm,
      providerUnavailableByPhaseArm,
      duplicateRequestHashes,
    },
    primary: {
      completePairs: completeDeltas.length,
      missingPairs: deltas.length - completeDeltas.length,
      missingReasons,
      meanDelta,
      bootstrapRepetitions: V3_BOOTSTRAP_REPETITIONS,
      masterSeed: V3_BOOTSTRAP_MASTER_SEED,
      ci95: { lo: ci?.lo ?? null, hi: ci?.hi ?? null },
      classification,
      bounds44,
    },
    secondary: {
      accuracy: {
        meanDelta: accDeltas.length > 0 ? mean(accDeltas) : null,
        ci95: bootstrapCis(accDeltas, V3_BOOTSTRAP_REPETITIONS, V3_BOOTSTRAP_MASTER_SEED),
      },
      spearmanRound1BrierDelta: { rho, ci95: rhoCi },
      severityBins: bins,
    },
    taskTable: deltas,
  };
  return { ...body, contentHash: hashCanonical(body) };
}

function computeRound1PooledBrier(row: ForkRow): number | null {
  if (!row.resolvedOption || row.round1AgentBeliefs.length === 0) return null;
  const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId: row.taskId });
  const options = projection.adapter.task.claim.options;
  const pooled: Record<string, number> = {};
  for (const option of options) {
    pooled[option] = row.round1AgentBeliefs.reduce((s, b) => s + (b[option] ?? 0), 0) / row.round1AgentBeliefs.length;
  }
  return options.reduce((s, option) => s + (pooled[option] - (option === row.resolvedOption ? 1 : 0)) ** 2, 0);
}

function countDuplicateRequestHashes(ledger: Glm46vLedgerScanV1): number {
  const seen = new Map<string, number>();
  for (const event of ledger.events) {
    if (event.type === "attempt_started") {
      seen.set(event.requestHash, (seen.get(event.requestHash) ?? 0) + 1);
    }
  }
  let duplicates = 0;
  for (const count of seen.values()) if (count > 1) duplicates += count - 1;
  return duplicates;
}

// ---------------------------------------------------------------------------
// Output read (only for the real V3 directory)
// ---------------------------------------------------------------------------

export function readV3OutputDirectory(outputDir: string = GLM46V_OUTPUT_DIR): V3AnalysisInput {
  const plan = JSON.parse(fs.readFileSync(path.join(outputDir, "plan.json"), "utf8")) as Glm46vTwoArmPlanV3;
  if (recomputeGlm46vPlanHash(plan) !== plan.contentHash) {
    throw new Error("v3_analysis_plan_hash_mismatch");
  }
  const rebuilt = buildGlm46vTwoArmPlanV3();
  if (plan.contentHash !== rebuilt.contentHash) {
    throw new Error("v3_analysis_plan_not_current: frozen plan.json no longer matches current runner constants");
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8")) as Glm46vTwoArmManifestV2;
  if (recomputeGlm46vManifestHash(manifest) !== manifest.contentHash) {
    throw new Error("v3_analysis_manifest_hash_mismatch");
  }
  if (manifest.planHash !== plan.contentHash) {
    throw new Error("v3_analysis_manifest_plan_mismatch");
  }
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8")) as Glm46vTwoArmSummaryV2;
  if (recomputeGlm46vSummaryHash(summary) !== summary.contentHash) {
    throw new Error("v3_analysis_summary_hash_mismatch");
  }
  const ledgerScan = readGlm46vLedgerScan(outputDir);
  const runFiles: V3RunFileRows[] = [];
  for (const file of manifest.files) {
    const rows = fs.readFileSync(path.join(outputDir, file.fileName), "utf8")
      .split("\n").filter(line => line.trim().length > 0)
      .map(line => JSON.parse(line) as ForkRow);
    runFiles.push({ taskId: file.taskId, rows });
  }
  return { plan, manifest, summary, ledgerScan, runFiles };
}

// ---------------------------------------------------------------------------
// Output rendering + fail-closed persistence
// ---------------------------------------------------------------------------

export function renderV3AnalysisMarkdown(analysis: V3AnalysisV1): string {
  const p = analysis.primary;
  const lines: string[] = [];
  lines.push("# GLM-4.6V V3 Cross-Model Replication Gate — Analysis V1");
  lines.push("");
  lines.push(`- analysis contentHash: \`${analysis.contentHash}\``);
  lines.push(`- plan hash: \`${analysis.inputs.planHash}\``);
  lines.push(`- analysis spec: \`${analysis.inputs.analysisSpec.path}\` @ \`${analysis.inputs.analysisSpec.contentHash}\``);
  lines.push(`- population: ${analysis.population.plannedTasks} tasks (task 14 excluded, canary only)`);
  lines.push("");
  lines.push("## Accounting (ledger/run health, not outcome)");
  lines.push("");
  lines.push(`- completed tasks: ${analysis.accounting.completedTasks}; failed: ${analysis.accounting.failedTasks}; skipped: ${analysis.accounting.skippedTasks}`);
  lines.push(`- physical attempts: ${analysis.accounting.physicalAttempts}; observed known tokens: ${analysis.accounting.observedKnownTokens}; unknown-usage attempts: ${analysis.accounting.unknownUsageAttempts}`);
  lines.push(`- duplicate request hashes: ${analysis.accounting.duplicateRequestHashes}`);
  lines.push(`- parser-invalid by phase:arm: ${JSON.stringify(analysis.accounting.parserInvalidByPhaseArm)}`);
  lines.push(`- provider-unavailable by phase:arm: ${JSON.stringify(analysis.accounting.providerUnavailableByPhaseArm)}`);
  lines.push("");
  lines.push("## Primary estimand (equal-weight task mean of ATTACKS-CONTROL final Brier)");
  lines.push("");
  lines.push(`- complete pairs: ${p.completePairs}; missing pairs: ${p.missingPairs} (${JSON.stringify(p.missingReasons)})`);
  lines.push(`- mean delta: ${p.meanDelta === null ? "null" : p.meanDelta.toFixed(6)}`);
  lines.push(`- 95% CI (${p.bootstrapRepetitions} task bootstrap, seed 0x${p.masterSeed.toString(16)}): [${p.ci95.lo === null ? "null" : p.ci95.lo.toFixed(6)}, ${p.ci95.hi === null ? "null" : p.ci95.hi.toFixed(6)}]`);
  lines.push(`- classification: **${p.classification}**`);
  lines.push(`- all-44 worst/best bound (incomplete delta := -2/+2): [${p.bounds44.lowerMeanDelta === null ? "null" : p.bounds44.lowerMeanDelta.toFixed(6)}, ${p.bounds44.upperMeanDelta === null ? "null" : p.bounds44.upperMeanDelta.toFixed(6)}]`);
  lines.push("");
  lines.push("## Secondary (does not overturn the primary classification)");
  lines.push("");
  const acc = analysis.secondary.accuracy;
  lines.push(`- accuracy paired mean delta: ${acc.meanDelta === null ? "null" : acc.meanDelta.toFixed(6)}` +
    (acc.ci95 ? ` CI [${acc.ci95.lo!.toFixed(6)}, ${acc.ci95.hi!.toFixed(6)}]` : " (no CI)"));
  const sp = analysis.secondary.spearmanRound1BrierDelta;
  lines.push(`- Spearman(round-1 pooled Brier, delta): ${sp.rho === null ? "null" : sp.rho.toFixed(6)}` +
    (sp.ci95 ? ` CI [${sp.ci95.lo!.toFixed(6)}, ${sp.ci95.hi!.toFixed(6)}]` : " (no CI)"));
  for (const bin of analysis.secondary.severityBins) {
    lines.push(`- severity bin ${bin.bin}: ${bin.taskCount} tasks, mean delta ${bin.meanDelta === null ? "null" : bin.meanDelta.toFixed(6)}`);
  }
  lines.push("");
  lines.push("## Task-level table");
  lines.push("");
  lines.push("| taskId | CONTROL brier | ATTACKS brier | delta | CONTROL acc | ATTACKS acc | round-1 pooled brier |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const t of analysis.taskTable) {
    lines.push(`| ${t.taskId} | ${t.controlBrier === null ? "-" : t.controlBrier.toFixed(6)} | ${t.attacksBrier === null ? "-" : t.attacksBrier.toFixed(6)} | ${t.delta === null ? `missing(${t.missingReason})` : t.delta.toFixed(6)} | ${t.controlAccuracy === null ? "-" : t.controlAccuracy} | ${t.attacksAccuracy === null ? "-" : t.attacksAccuracy} | ${t.round1PooledBrier === null ? "-" : t.round1PooledBrier.toFixed(6)} |`);
  }
  lines.push("");
  return lines.join("\n");
}

export function writeV3AnalysisOutput(
  outputDir: string,
  analysis: V3AnalysisV1,
): void {
  const jsonPath = path.join(outputDir, "analysis-v1.json");
  const mdPath = path.join(outputDir, "analysis-v1.md");
  const jsonText = `${JSON.stringify(analysis, null, 2)}\n`;
  const mdText = renderV3AnalysisMarkdown(analysis);
  if (fs.existsSync(jsonPath)) {
    const existing = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as V3AnalysisV1;
    if (existing.contentHash !== analysis.contentHash) {
      throw new Error("v3_analysis_no_replace_conflict: analysis-v1.json exists with different content; refusing to overwrite");
    }
  } else {
    fs.writeFileSync(jsonPath, jsonText, { flag: "wx" });
  }
  if (fs.existsSync(mdPath)) {
    const existing = fs.readFileSync(mdPath, "utf8");
    if (!existing.includes(analysis.contentHash)) {
      throw new Error("v3_analysis_no_replace_conflict: analysis-v1.md exists with different content; refusing to overwrite");
    }
  } else {
    fs.writeFileSync(mdPath, mdText, { flag: "wx" });
  }
}

export function verifyV3AnalysisOutput(outputDir: string = GLM46V_OUTPUT_DIR): { ok: boolean; detail: string } {
  const jsonPath = path.join(outputDir, "analysis-v1.json");
  const mdPath = path.join(outputDir, "analysis-v1.md");
  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    return { ok: false, detail: "analysis-v1.json or analysis-v1.md missing" };
  }
  const recomputed = computeV3Analysis(readV3OutputDirectory(outputDir));
  const existing = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as V3AnalysisV1;
  if (existing.contentHash !== recomputed.contentHash) {
    return { ok: false, detail: "analysis-v1.json contentHash does not recompute from the same inputs" };
  }
  const md = fs.readFileSync(mdPath, "utf8");
  if (!md.includes(recomputed.contentHash)) {
    return { ok: false, detail: "analysis-v1.md does not reference the recomputed contentHash" };
  }
  return { ok: true, detail: `analysis-v1 verified (${recomputed.contentHash})` };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  if (process.argv.includes("--verify")) {
    const result = verifyV3AnalysisOutput();
    console.log(JSON.stringify({ mode: "v3-analysis-verify", ok: result.ok, detail: result.detail }, null, 2));
    return result.ok ? 0 : 1;
  }
  const analysis = computeV3Analysis(readV3OutputDirectory());
  writeV3AnalysisOutput(GLM46V_OUTPUT_DIR, analysis);
  console.log(JSON.stringify({ mode: "v3-analysis", analysisContentHash: analysis.contentHash, classification: analysis.primary.classification }, null, 2));
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 4;
  });
}
