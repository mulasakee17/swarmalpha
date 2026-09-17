/** Frozen analysis for the GLM-4.6V three-arm extension. */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { mulberry32 } from "../../../src/lib/utils/statsUtils";
import {
  GLM46V_OUTPUT_DIR,
  GLM46V_ANALYSIS_SPEC_PATH,
  GLM46V_ARMS,
  recomputeGlm46vPlanHash,
  recomputeGlm46vManifestHash,
  recomputeGlm46vSummaryHash,
  readGlm46vLedgerScan,
  verifyGlm46vTwoArmOutput,
} from "./run_v6_fork_glm46v_two_arm_v4";
import type { ForkRow } from "./run_v6_fork";

const BOOTSTRAP_SEED = 0x5EED0F;
const BOOTSTRAP_REPETITIONS = 10_000;
const EXPECTED_ARMS = ["ATTACKS", "CONTROL", "SUPPORTS"];
type MissingReason = "failed_task" | "skipped_task" | "null_brier" | "unexplained_missing";

function sha256Text(s: string): string { return `sha256:${createHash("sha256").update(s, "utf8").digest("hex")}`; }
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonicalize(v)]));
  }
  return value;
}
function hashCanonical(value: unknown): string { return sha256Text(JSON.stringify(canonicalize(value))); }
function mean(xs: number[]): number | null { return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null; }
function percentile(sorted: number[], p: number): number { const i = (sorted.length - 1) * p; const lo = Math.floor(i); const hi = Math.ceil(i); return lo === hi ? sorted[lo] : sorted[lo] * (hi - i) + sorted[hi] * (i - lo); }
function bootstrap(values: number[]): { lo: number; hi: number } | null {
  if (!values.length) return null;
  const rng = mulberry32(BOOTSTRAP_SEED);
  const means: number[] = [];
  for (let r = 0; r < BOOTSTRAP_REPETITIONS; r++) {
    let total = 0;
    for (let i = 0; i < values.length; i++) total += values[Math.floor(rng() * values.length)];
    means.push(total / values.length);
  }
  means.sort((a, b) => a - b);
  return { lo: percentile(means, 0.025), hi: percentile(means, 0.975) };
}

interface Plan { taskIds: number[]; seeds: number[]; arms: string[]; contentHash: string; analysisSpec: { path: string; contentHash: string }; artifactPath: string; }
interface Manifest { contentHash: string; planHash: string; taskStatus: Array<{ taskId: number; status: "completed" | "failed" | "skipped" }>; files: Array<{ taskId: number; fileName: string }>; ledgerHash: string; }
interface Summary { contentHash: string; stopReason: string; completedTasks: number; failedTasks: number; skippedTasks: number; }

export interface ThreeArmAnalysis {
  analysisSchemaRef: { id: string; version: string };
  inputs: { planHash: string; manifestHash: string; summaryHash: string; ledgerHash: string; analysisSpec: { path: string; contentHash: string }; outputDir: string };
  population: { plannedTasks: number; taskIds: number[] };
  accounting: { completedTasks: number; failedTasks: number; skippedTasks: number; physicalAttempts: number; observedKnownTokens: number; unknownUsageAttempts: number; duplicateRequestHashes: number };
  primary: { estimand: "ATTACKS-SUPPORTS"; completeTasks: number; missingTasks: number; meanDelta: number | null; ci95: { lo: number; hi: number } | null; classification: "PASS" | "DIRECTIONAL" | "FAIL" | "UNCLASSIFIED"; bounds: { lowerMeanDelta: number; upperMeanDelta: number; incompleteTaskCount: number } };
  secondary: { estimand: "ATTACKS-CONTROL"; completeTasks: number; meanDelta: number | null; ci95: { lo: number; hi: number } | null; classification: "PASS" | "DIRECTIONAL" | "FAIL" | "UNCLASSIFIED" };
  taskTable: Array<{ taskId: number; status: string; supportsBrier: number | null; attacksBrier: number | null; controlBrier: number | null; deltaDir: number | null; deltaDisc: number | null }>;
  contentHash: string;
}

function classify(delta: number | null, ci: { lo: number; hi: number } | null): ThreeArmAnalysis["primary"]["classification"] {
  if (delta === null || ci === null) return "UNCLASSIFIED";
  if (delta < 0 && ci.hi < 0) return "PASS";
  if (delta < 0) return "DIRECTIONAL";
  return "FAIL";
}

function duplicateRequestHashes(events: ReturnType<typeof readGlm46vLedgerScan>["events"]): number {
  const seen = new Set<string>(); let duplicates = 0;
  for (const e of events) if (e.type === "attempt_started") { if (seen.has(e.requestHash)) duplicates++; else seen.add(e.requestHash); }
  return duplicates;
}

export function readThreeArmAnalysisInput(outputDir: string = GLM46V_OUTPUT_DIR) {
  const plan = JSON.parse(fs.readFileSync(path.join(outputDir, "plan.json"), "utf8")) as Plan;
  if (recomputeGlm46vPlanHash(plan as never) !== plan.contentHash) throw new Error("threearm_plan_hash_mismatch");
  if (JSON.stringify([...plan.arms].sort()) !== JSON.stringify(EXPECTED_ARMS)) throw new Error(`threearm_arm_set_mismatch: ${plan.arms.join(",")}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8")) as Manifest;
  if (recomputeGlm46vManifestHash(manifest as never) !== manifest.contentHash) throw new Error("threearm_manifest_hash_mismatch");
  if (manifest.planHash !== plan.contentHash) throw new Error("threearm_manifest_plan_mismatch");
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8")) as Summary;
  if (recomputeGlm46vSummaryHash(summary as never) !== summary.contentHash) throw new Error("threearm_summary_hash_mismatch");
  const ledger = readGlm46vLedgerScan(outputDir);
  const files = manifest.files.map(file => ({ taskId: file.taskId, rows: fs.readFileSync(path.join(outputDir, file.fileName), "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line) as ForkRow) }));
  return { plan, manifest, summary, ledger, files };
}

export function computeThreeArmAnalysis(input = readThreeArmAnalysisInput()): ThreeArmAnalysis {
  const { plan, manifest, summary, ledger, files } = input;
  const status = new Map(manifest.taskStatus.map(entry => [entry.taskId, entry.status]));
  const byTask = new Map(files.map(file => [file.taskId, file.rows]));
  const taskTable: ThreeArmAnalysis["taskTable"] = [];
  const dir: number[] = []; const disc: number[] = [];
  for (const taskId of plan.taskIds) {
    const rows = byTask.get(taskId) ?? [];
    const c = rows.find(r => r.arm === "CONTROL")?.finalBrier ?? null;
    const s = rows.find(r => r.arm === "SUPPORTS")?.finalBrier ?? null;
    const a = rows.find(r => r.arm === "ATTACKS")?.finalBrier ?? null;
    const complete = status.get(taskId) === "completed" && c !== null && s !== null && a !== null;
    const deltaDir = complete ? a! - s! : null;
    const deltaDisc = complete ? a! - c! : null;
    if (deltaDir !== null) dir.push(deltaDir);
    if (deltaDisc !== null) disc.push(deltaDisc);
    taskTable.push({ taskId, status: complete ? "complete" : (status.get(taskId) ?? "unexplained_missing"), supportsBrier: s, attacksBrier: a, controlBrier: c, deltaDir, deltaDisc });
  }
  const dirCi = bootstrap(dir); const discCi = bootstrap(disc);
  const incomplete = plan.taskIds.length - dir.length;
  const lowerMeanDelta = (dir.reduce((s, v) => s + v, 0) - 2 * incomplete) / plan.taskIds.length;
  const upperMeanDelta = (dir.reduce((s, v) => s + v, 0) + 2 * incomplete) / plan.taskIds.length;
  const body: Omit<ThreeArmAnalysis, "contentHash"> = {
    analysisSchemaRef: { id: "swarmalpha.experiment.v6-fork-glm46v-threearm-analysis", version: "1.0.0" },
    inputs: { planHash: plan.contentHash, manifestHash: manifest.contentHash, summaryHash: summary.contentHash, ledgerHash: manifest.ledgerHash, analysisSpec: { path: GLM46V_ANALYSIS_SPEC_PATH, contentHash: plan.analysisSpec.contentHash }, outputDir: plan.artifactPath },
    population: { plannedTasks: plan.taskIds.length, taskIds: [...plan.taskIds] },
    accounting: { completedTasks: summary.completedTasks, failedTasks: summary.failedTasks, skippedTasks: summary.skippedTasks, physicalAttempts: ledger.physicalAttempts, observedKnownTokens: ledger.observedTokens, unknownUsageAttempts: ledger.unknownUsageCalls, duplicateRequestHashes: duplicateRequestHashes(ledger.events) },
    primary: { estimand: "ATTACKS-SUPPORTS", completeTasks: dir.length, missingTasks: incomplete, meanDelta: mean(dir), ci95: dirCi, classification: classify(mean(dir), dirCi), bounds: { lowerMeanDelta, upperMeanDelta, incompleteTaskCount: incomplete } },
    secondary: { estimand: "ATTACKS-CONTROL", completeTasks: disc.length, meanDelta: mean(disc), ci95: discCi, classification: classify(mean(disc), discCi) },
    taskTable,
  };
  return { ...body, contentHash: hashCanonical(body) };
}

function renderMarkdown(a: ThreeArmAnalysis): string {
  const p = a.primary; const s = a.secondary;
  const ci = (x: { lo: number; hi: number } | null) => x ? `[${x.lo.toFixed(6)}, ${x.hi.toFixed(6)}]` : "null";
  const lines = [`# GLM-4.6V 三臂扩展分析 V1`, ``, `- contentHash: \`${a.contentHash}\``, `- planHash: \`${a.inputs.planHash}\``, `- population: ${a.population.plannedTasks} tasks`, ``, `## Accounting`, ``, `- completed=${a.accounting.completedTasks}, failed=${a.accounting.failedTasks}, skipped=${a.accounting.skippedTasks}`, `- physical attempts=${a.accounting.physicalAttempts}, observed known tokens=${a.accounting.observedKnownTokens}, unknown usage=${a.accounting.unknownUsageAttempts}`, `- duplicate request hashes=${a.accounting.duplicateRequestHashes}`, ``, `## H1 — ATTACKS − SUPPORTS`, ``, `- complete tasks: ${p.completeTasks}; missing: ${p.missingTasks}`, `- mean: ${p.meanDelta === null ? "null" : p.meanDelta.toFixed(6)}`, `- 95% CI: ${ci(p.ci95)}`, `- classification: **${p.classification}**`, `- conservative missing bound: [${p.bounds.lowerMeanDelta.toFixed(6)}, ${p.bounds.upperMeanDelta.toFixed(6)}]`, ``, `## H2 — ATTACKS − CONTROL`, ``, `- complete tasks: ${s.completeTasks}`, `- mean: ${s.meanDelta === null ? "null" : s.meanDelta.toFixed(6)}`, `- 95% CI: ${ci(s.ci95)}`, `- classification: **${s.classification}**`, ``, `| task | status | CONTROL | SUPPORTS | ATTACKS | ATTACKS−SUPPORTS | ATTACKS−CONTROL |`, `|---:|---|---:|---:|---:|---:|---:|`];
  for (const t of a.taskTable) lines.push(`| ${t.taskId} | ${t.status} | ${t.controlBrier ?? "-"} | ${t.supportsBrier ?? "-"} | ${t.attacksBrier ?? "-"} | ${t.deltaDir ?? "-"} | ${t.deltaDisc ?? "-"} |`);
  return `${lines.join("\n")}\n`;
}

export function writeThreeArmAnalysis(outputDir: string = GLM46V_OUTPUT_DIR): ThreeArmAnalysis {
  const replay = verifyGlm46vTwoArmOutput(outputDir);
  if (!replay.ok) throw new Error(`threearm_replay_rejected: ${replay.detail}`);
  const analysis = computeThreeArmAnalysis(readThreeArmAnalysisInput(outputDir));
  const jsonPath = path.join(outputDir, "analysis-v1.json"); const mdPath = path.join(outputDir, "analysis-v1.md");
  if (fs.existsSync(jsonPath)) { const existing = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as ThreeArmAnalysis; if (existing.contentHash !== analysis.contentHash) throw new Error("threearm_analysis_no_replace_conflict"); }
  else fs.writeFileSync(jsonPath, `${JSON.stringify(analysis, null, 2)}\n`, { flag: "wx" });
  if (fs.existsSync(mdPath)) { if (!fs.readFileSync(mdPath, "utf8").includes(analysis.contentHash)) throw new Error("threearm_analysis_markdown_conflict"); }
  else fs.writeFileSync(mdPath, renderMarkdown(analysis), { flag: "wx" });
  return analysis;
}

export async function runThreeArmAnalysisCli(): Promise<number> {
  const analysis = writeThreeArmAnalysis();
  console.log(JSON.stringify({ mode: "glm46v-threearm-analysis", contentHash: analysis.contentHash, h1: analysis.primary.classification, h2: analysis.secondary.classification }, null, 2));
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.env.GLM46V_EXPERIMENT_VARIANT = "three-arm-seed2";
  runThreeArmAnalysisCli().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 4; });
}
