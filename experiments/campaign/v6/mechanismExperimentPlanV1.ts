/**
 * Zero-provider frozen plan for the first-paper neutral/labeled mechanism probe.
 *
 * Credential-free plan builder with canonical SHA-256 content hashing and
 * no-overwrite plan-file semantics. This module performs no API call, no
 * environment access, no retry, no resume, no manifest, and no experiment
 * result writing. Provider wiring and final artifact semantics are owned by a
 * later Codex review; nothing here executes a provider.
 *
 * All scientific constants are frozen verbatim from
 * docs/experiments/FIRST_PAPER_MECHANISM_NEUTRAL_LABELED_FREEZE_V1.md and from
 * the CLAUDE_CODE_MECHANISM_V1_LOW_RISK_HANDOFF_2026-08-22.md handoff.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  MECHANISM_ARMS,
  MECHANISM_DISCLOSURE_CONTRACT_REF,
  type MechanismArmV1,
} from "./mechanismDisclosureContractV1";
import { MECHANISM_FORK_CORE_REF } from "./mechanismForkCoreV1";

export const MECHANISM_PLAN_REF = Object.freeze({
  id: "swarmalpha.experiment.v6.mechanism-plan",
  version: "1.0.0",
});

export const MECHANISM_MODEL = "zhipu:glm-4.6v";
export const MECHANISM_SEEDS = Object.freeze([3]);
export const MECHANISM_CANARY_TASK_ID = 14;
export const MECHANISM_FORMAL_TASK_IDS = Object.freeze([
  15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 29, 30, 31,
  34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49, 50,
  51, 52, 53, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
]);
export const MECHANISM_AGENT_POSITIONS = 173;
/** Round-1 once + 3 arms x (round-2 + final) = 173 x 7 logical calls. */
export const MECHANISM_PLANNED_LOGICAL_CALLS = 1211;
export const MECHANISM_PER_CALL_TOKEN_ESTIMATE = 1800;
export const MECHANISM_PLANNED_ESTIMATE_TOKENS = 2179800;
/** Hard stop on observed provider tokens; missing usage stops, never zero. */
export const MECHANISM_TOKEN_STOP_THRESHOLD = 3000000;
export const MECHANISM_DISCUSSION_MAX_TOKENS = 768;
export const MECHANISM_FINAL_MAX_TOKENS = 256;
export const MECHANISM_THINKING = "disabled" as const;
export const MECHANISM_CONCURRENCY = 1;
export const MECHANISM_BOOTSTRAP_DRAWS = 10000;
export const MECHANISM_BOOTSTRAP_SEED = 0x5eed0f;
/** Pre-specified 5% band of the multiclass Brier range [0,2]. */
export const MECHANISM_PRACTICAL_BAND = 0.1;
/** Repository-relative output path only; no absolute path enters the hash. */
export const MECHANISM_OUTPUT_RELATIVE_PATH =
  "experiments/campaign/pilot_output/v6-fork-mechanism-neutral-labeled-seed3-20260822";
export const MECHANISM_CANARY_OUTPUT_RELATIVE_PATH =
  "experiments/campaign/pilot_output/v6-fork-mechanism-neutral-labeled-canary-task14-seed3-20260823";
export const MECHANISM_ANALYSIS_SPEC_PATH =
  "docs/experiments/FIRST_PAPER_MECHANISM_NEUTRAL_LABELED_FREEZE_V1.md";

/**
 * Deterministic three-order arm rotation by zero-based roster position,
 * verbatim from the freeze document section 2.2.
 */
export const MECHANISM_ARM_ORDER_ROTATION = Object.freeze({
  0: ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"],
  1: ["ATTACKS_NEUTRAL", "ATTACKS_LABELED", "CONTROL"],
  2: ["ATTACKS_LABELED", "CONTROL", "ATTACKS_NEUTRAL"],
} as const);

export interface MechanismPlanBlockV1 {
  taskId: number;
  seed: number;
  /** Zero-based position inside the frozen formal roster. */
  position: number;
  /** position mod 3; selects the rotated arm order. */
  rotationIndex: 0 | 1 | 2;
  armOrder: MechanismArmV1[];
}

export interface MechanismExperimentPlanV1 {
  planRef: { id: string; version: string };
  model: string;
  seeds: number[];
  canaryTaskId: number;
  formalTaskIds: number[];
  arms: MechanismArmV1[];
  blocks: MechanismPlanBlockV1[];
  agentPositions: number;
  plannedLogicalCalls: number;
  perCallTokenEstimate: number;
  plannedEstimateTokens: number;
  tokenStopThreshold: number;
  discussionMaxTokens: number;
  finalMaxTokens: number;
  thinking: "disabled";
  concurrency: number;
  armOrderRotation: Record<0 | 1 | 2, MechanismArmV1[]>;
  bootstrap: { draws: number; seed: number; practicalBand: number };
  /** Repository-relative output path; never an absolute path. */
  outputDir: string;
  disclosureContractRef: { id: string; version: string };
  forkCoreRef: { id: string; version: string };
  analysisSpec: { path: string; contentHash: string };
  contentHash: string;
}

export interface MechanismCanaryPlanV1 {
  planRef: { id: "swarmalpha.experiment.v6.mechanism-canary-plan"; version: "1.0.0" };
  model: string; taskIds: [14]; seeds: [3]; arms: MechanismArmV1[];
  agentPositions: 4; plannedLogicalCalls: 28; perCallTokenEstimate: 1800;
  plannedEstimateTokens: 50400; tokenStopThreshold: 150000;
  discussionMaxTokens: 768; finalMaxTokens: 256; thinking: "disabled"; concurrency: 1;
  armOrder: MechanismArmV1[]; outputDir: string;
  disclosureContractRef: { id: string; version: string };
  forkCoreRef: { id: string; version: string };
  analysisSpec: { path: string; contentHash: string };
  contentHash: string;
}

function sha256Text(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function canonicalize(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("mechanism_plan_non_finite_number");
    return value;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error("mechanism_plan_cyclic_value");
    const next = new Set(ancestors);
    next.add(value);
    return value.map(entry => canonicalize(entry, next));
  }
  if (typeof value !== "object") throw new Error("mechanism_plan_not_json");
  if (ancestors.has(value as object)) throw new Error("mechanism_plan_cyclic_value");
  const next = new Set(ancestors);
  next.add(value as object);
  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      .sort()
      .map(key => [key, canonicalize((value as Record<string, unknown>)[key], next)]),
  );
}

function hashCanonical(value: unknown): string {
  return sha256Text(JSON.stringify(canonicalize(value)));
}

function buildBlocks(): MechanismPlanBlockV1[] {
  return MECHANISM_FORMAL_TASK_IDS.map((taskId, position) => {
    const rotationIndex = (position % 3) as 0 | 1 | 2;
    return {
      taskId,
      seed: MECHANISM_SEEDS[0],
      position,
      rotationIndex,
      armOrder: [...MECHANISM_ARM_ORDER_ROTATION[rotationIndex]],
    };
  });
}

/** Build the frozen plan body and its canonical content hash. */
export function buildMechanismExperimentPlanV1(): MechanismExperimentPlanV1 {
  const body: Omit<MechanismExperimentPlanV1, "contentHash"> = {
    planRef: { ...MECHANISM_PLAN_REF },
    model: MECHANISM_MODEL,
    seeds: [...MECHANISM_SEEDS],
    canaryTaskId: MECHANISM_CANARY_TASK_ID,
    formalTaskIds: [...MECHANISM_FORMAL_TASK_IDS],
    arms: [...MECHANISM_ARMS],
    blocks: buildBlocks(),
    agentPositions: MECHANISM_AGENT_POSITIONS,
    plannedLogicalCalls: MECHANISM_PLANNED_LOGICAL_CALLS,
    perCallTokenEstimate: MECHANISM_PER_CALL_TOKEN_ESTIMATE,
    plannedEstimateTokens: MECHANISM_PLANNED_ESTIMATE_TOKENS,
    tokenStopThreshold: MECHANISM_TOKEN_STOP_THRESHOLD,
    discussionMaxTokens: MECHANISM_DISCUSSION_MAX_TOKENS,
    finalMaxTokens: MECHANISM_FINAL_MAX_TOKENS,
    thinking: MECHANISM_THINKING,
    concurrency: MECHANISM_CONCURRENCY,
    armOrderRotation: {
      0: [...MECHANISM_ARM_ORDER_ROTATION[0]],
      1: [...MECHANISM_ARM_ORDER_ROTATION[1]],
      2: [...MECHANISM_ARM_ORDER_ROTATION[2]],
    },
    bootstrap: {
      draws: MECHANISM_BOOTSTRAP_DRAWS,
      seed: MECHANISM_BOOTSTRAP_SEED,
      practicalBand: MECHANISM_PRACTICAL_BAND,
    },
    outputDir: MECHANISM_OUTPUT_RELATIVE_PATH,
    disclosureContractRef: { ...MECHANISM_DISCLOSURE_CONTRACT_REF },
    forkCoreRef: { ...MECHANISM_FORK_CORE_REF },
    analysisSpec: {
      path: MECHANISM_ANALYSIS_SPEC_PATH,
      contentHash: sha256Text(readFileSync(resolve(process.cwd(), MECHANISM_ANALYSIS_SPEC_PATH), "utf8")),
    },
  };
  return { ...body, contentHash: hashCanonical(body) };
}

export function buildMechanismCanaryPlanV1(): MechanismCanaryPlanV1 {
  const body: Omit<MechanismCanaryPlanV1, "contentHash"> = {
    planRef: { id: "swarmalpha.experiment.v6.mechanism-canary-plan", version: "1.0.0" },
    model: MECHANISM_MODEL, taskIds: [14], seeds: [3], arms: [...MECHANISM_ARMS],
    agentPositions: 4, plannedLogicalCalls: 28, perCallTokenEstimate: 1800,
    plannedEstimateTokens: 50400, tokenStopThreshold: 150000,
    discussionMaxTokens: 768, finalMaxTokens: 256, thinking: "disabled", concurrency: 1,
    armOrder: [...MECHANISM_ARM_ORDER_ROTATION[0]], outputDir: MECHANISM_CANARY_OUTPUT_RELATIVE_PATH,
    disclosureContractRef: { ...MECHANISM_DISCLOSURE_CONTRACT_REF }, forkCoreRef: { ...MECHANISM_FORK_CORE_REF },
    analysisSpec: { path: MECHANISM_ANALYSIS_SPEC_PATH, contentHash: sha256Text(readFileSync(resolve(process.cwd(), MECHANISM_ANALYSIS_SPEC_PATH), "utf8")) },
  };
  return { ...body, contentHash: hashCanonical(body) };
}

export function recomputeMechanismCanaryPlanHashV1(plan: MechanismCanaryPlanV1): string {
  const { contentHash: _recorded, ...body } = plan;
  return hashCanonical(body);
}

export function freezeMechanismCanaryPlanV1(outputDir: string): MechanismCanaryPlanV1 {
  const plan = buildMechanismCanaryPlanV1();
  const file = join(resolve(outputDir), "plan.json");
  if (existsSync(file)) {
    const existing = JSON.parse(readFileSync(file, "utf8")) as MechanismCanaryPlanV1;
    if (recomputeMechanismCanaryPlanHashV1(existing) !== existing.contentHash || existing.contentHash !== plan.contentHash) {
      throw new Error("mechanism_canary_plan_no_overwrite_conflict");
    }
    return existing;
  }
  mkdirSync(resolve(outputDir), { recursive: true });
  writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}

/** Load the isolated canary plan and reject tampering or stale constants. */
export function loadMechanismCanaryPlanV1(outputDir: string): MechanismCanaryPlanV1 {
  const file = join(resolve(outputDir), "plan.json");
  if (!existsSync(file)) throw new Error("mechanism_canary_plan_missing");
  const plan = JSON.parse(readFileSync(file, "utf8")) as MechanismCanaryPlanV1;
  if (recomputeMechanismCanaryPlanHashV1(plan) !== plan.contentHash) {
    throw new Error("mechanism_canary_plan_hash_mismatch");
  }
  const current = buildMechanismCanaryPlanV1();
  if (plan.contentHash !== current.contentHash) throw new Error("mechanism_canary_plan_stale");
  return plan;
}

/** Recompute a plan's contentHash from its body (the recorded field excluded). */
export function recomputeMechanismExperimentPlanHashV1(plan: MechanismExperimentPlanV1): string {
  const { contentHash: _recorded, ...body } = plan;
  return hashCanonical(body);
}

function assertPlanHashConsistent(plan: MechanismExperimentPlanV1): void {
  if (recomputeMechanismExperimentPlanHashV1(plan) !== plan.contentHash) {
    throw new Error("mechanism_plan_hash_mismatch");
  }
}

/**
 * Fail-closed no-overwrite freeze. Refuses to replace an existing plan whose
 * content differs; an identical existing plan is accepted idempotently.
 */
export function freezeMechanismExperimentPlanV1(outputDir: string): MechanismExperimentPlanV1 {
  const plan = buildMechanismExperimentPlanV1();
  assertPlanHashConsistent(plan);
  const file = join(resolve(outputDir), "plan.json");
  if (existsSync(file)) {
    const existing = JSON.parse(readFileSync(file, "utf8")) as MechanismExperimentPlanV1;
    assertPlanHashConsistent(existing);
    if (existing.contentHash === plan.contentHash) return existing;
    throw new Error("mechanism_plan_no_overwrite_conflict");
  }
  mkdirSync(resolve(outputDir), { recursive: true });
  writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}

/** Load a plan and reject tampered bodies/hashes or stale constants. */
export function loadMechanismExperimentPlanV1(outputDir: string): MechanismExperimentPlanV1 {
  const file = join(resolve(outputDir), "plan.json");
  if (!existsSync(file)) throw new Error("mechanism_plan_missing");
  const plan = JSON.parse(readFileSync(file, "utf8")) as MechanismExperimentPlanV1;
  assertPlanHashConsistent(plan);
  const current = buildMechanismExperimentPlanV1();
  if (recomputeMechanismExperimentPlanHashV1(plan) !== current.contentHash) {
    throw new Error("mechanism_plan_stale");
  }
  return plan;
}
