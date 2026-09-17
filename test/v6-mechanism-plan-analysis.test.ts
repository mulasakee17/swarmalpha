/**
 * Synthetic tests for the frozen mechanism V1 plan and pure analysis math.
 * Zero provider, zero network, zero artifact mutation; temporary plan files
 * live only under the OS temp directory and are removed afterwards.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildMechanismExperimentPlanV1,
  buildMechanismCanaryPlanV1,
  freezeMechanismExperimentPlanV1,
  loadMechanismExperimentPlanV1,
  MECHANISM_ARM_ORDER_ROTATION,
  MECHANISM_PLANNED_LOGICAL_CALLS,
  recomputeMechanismExperimentPlanHashV1,
  type MechanismExperimentPlanV1,
} from "../experiments/campaign/v6/mechanismExperimentPlanV1";
import {
  bootstrapMechanismContrastV1,
  classifyMechanismM1V1,
  computeMechanismAnalysisV1,
  MECHANISM_MISSING_DELTA_HI,
  MECHANISM_MISSING_DELTA_LO,
  MECHANISM_PLANNED_DENOMINATOR,
  type MechanismAnalysisRowV1,
} from "../experiments/campaign/v6/mechanismAnalysisMathV1";

function triplet(taskId: number, c: number, n: number, l: number): MechanismAnalysisRowV1[] {
  return [
    { taskId, arm: "CONTROL", finalBrier: c },
    { taskId, arm: "ATTACKS_NEUTRAL", finalBrier: n },
    { taskId, arm: "ATTACKS_LABELED", finalBrier: l },
  ];
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "v6-mechanism-plan-analysis-"));
}

describe("mechanism plan V1", () => {
  it("keeps task-14 canary in a separate identity, budget, and output directory", () => {
    const formal = buildMechanismExperimentPlanV1();
    const canary = buildMechanismCanaryPlanV1();
    expect(canary.taskIds).toEqual([14]);
    expect(canary.plannedLogicalCalls).toBe(28);
    expect(canary.tokenStopThreshold).toBe(150000);
    expect(canary.outputDir).not.toBe(formal.outputDir);
    expect(canary.contentHash).not.toBe(formal.contentHash);
  });
  it("freezes 44 tasks, 1211 calls, and the three rotated arm orders", () => {
    const plan = buildMechanismExperimentPlanV1();
    expect(plan.formalTaskIds).toHaveLength(44);
    expect(plan.blocks).toHaveLength(44);
    expect(plan.plannedLogicalCalls).toBe(MECHANISM_PLANNED_LOGICAL_CALLS);
    expect(plan.plannedLogicalCalls).toBe(173 * 7);
    expect(plan.plannedEstimateTokens).toBe(1211 * 1800);
    expect(plan.seeds).toEqual([3]);
    expect(plan.model).toBe("zhipu:glm-4.6v");
    expect(plan.thinking).toBe("disabled");
    expect(plan.analysisSpec.path).toBe(
      "docs/experiments/FIRST_PAPER_MECHANISM_NEUTRAL_LABELED_FREEZE_V1.md",
    );
    expect(plan.analysisSpec.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(plan.canaryTaskId).toBe(14);
    expect(plan.formalTaskIds).not.toContain(14);
    const rotations = new Set(plan.blocks.map(b => JSON.stringify(b.armOrder)));
    expect(rotations.size).toBe(3);
    for (const key of [0, 1, 2] as const) {
      expect(plan.blocks.filter(b => b.rotationIndex === key).length).toBe(
        key === 2 ? 14 : 15,
      );
      expect(JSON.stringify(plan.armOrderRotation[key])).toBe(
        JSON.stringify(MECHANISM_ARM_ORDER_ROTATION[key]),
      );
    }
    plan.blocks.forEach((block, position) => {
      expect(block.position).toBe(position);
      expect(block.rotationIndex).toBe((position % 3) as 0 | 1 | 2);
      expect(block.armOrder).toHaveLength(3);
      expect(block.seed).toBe(3);
    });
  });

  it("hashes deterministically and changes on any scientific constant", () => {
    const a = buildMechanismExperimentPlanV1();
    const b = buildMechanismExperimentPlanV1();
    expect(a.contentHash).toBe(b.contentHash);
    const mutate = (edit: (p: MechanismExperimentPlanV1) => void) => {
      const clone = JSON.parse(JSON.stringify(a)) as MechanismExperimentPlanV1;
      edit(clone);
      return recomputeMechanismExperimentPlanHashV1(clone);
    };
    const original = recomputeMechanismExperimentPlanHashV1(a);
    expect(mutate(p => { p.model = "zhipu:glm-4.6v:changed"; })).not.toBe(original);
    expect(mutate(p => { p.seeds = [4]; })).not.toBe(original);
    expect(mutate(p => { p.formalTaskIds = [1, 2]; })).not.toBe(original);
    expect(mutate(p => { p.plannedLogicalCalls = 1000; })).not.toBe(original);
    expect(mutate(p => { p.tokenStopThreshold = 999; })).not.toBe(original);
    expect(mutate(p => { p.discussionMaxTokens = 100; })).not.toBe(original);
    expect(mutate(p => { (p as unknown as { thinking: string }).thinking = "enabled"; })).not.toBe(original);
    expect(mutate(p => { p.bootstrap.practicalBand = 0.2; })).not.toBe(original);
    expect(mutate(p => { p.outputDir = "tmp/other"; })).not.toBe(original);
    expect(mutate(p => { p.analysisSpec.contentHash = "sha256:changed"; })).not.toBe(original);
  });

  it("freezes with no-overwrite semantics and rejects conflicting existing plans", () => {
    const dir = tempDir();
    try {
      const first = freezeMechanismExperimentPlanV1(dir);
      expect(first.contentHash).toBe(buildMechanismExperimentPlanV1().contentHash);
      // identical re-freeze is idempotent
      expect(freezeMechanismExperimentPlanV1(dir).contentHash).toBe(first.contentHash);
      // a conflicting plan on disk is refused
      const other = buildMechanismExperimentPlanV1();
      other.model = "zhipu:glm-4.6v:conflict";
      const tamperedBody = { ...other, contentHash: recomputeMechanismExperimentPlanHashV1(other) };
      writeFileSync(join(dir, "plan.json"), JSON.stringify(tamperedBody), "utf8");
      expect(() => freezeMechanismExperimentPlanV1(dir)).toThrow(/no_overwrite_conflict/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("load rejects a tampered body or hash", () => {
    const dir = tempDir();
    try {
      freezeMechanismExperimentPlanV1(dir);
      const file = join(dir, "plan.json");
      const parsed = JSON.parse(readFileSync(file, "utf8")) as MechanismExperimentPlanV1;
      parsed.finalMaxTokens = 999; // body changed, hash not updated
      writeFileSync(file, JSON.stringify(parsed), "utf8");
      expect(() => loadMechanismExperimentPlanV1(dir)).toThrow(/hash_mismatch/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a stale plan whose constants no longer match the frozen build", () => {
    const dir = tempDir();
    try {
      const plan = buildMechanismExperimentPlanV1();
      plan.tokenStopThreshold = 111;
      const stale = { ...plan, contentHash: recomputeMechanismExperimentPlanHashV1(plan) };
      writeFileSync(join(dir, "plan.json"), JSON.stringify(stale), "utf8");
      expect(() => loadMechanismExperimentPlanV1(dir)).toThrow(/stale/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("mechanism analysis math V1", () => {
  it("computes exact M1/M2/M3 on known synthetic triplets", () => {
    // binary-exact values: M1 = L-N, M2 = N-C, M3 = L-C
    const rows = [
      ...triplet(15, 0.25, 0.5, 0.75), // M1=+0.25 M2=+0.25 M3=+0.5
      ...triplet(16, 0.75, 0.5, 0.25), // M1=-0.25 M2=-0.25 M3=-0.5
    ];
    const out = computeMechanismAnalysisV1(rows);
    expect(out.completeTaskIds).toEqual([15, 16]);
    expect(out.missingTaskIds).toHaveLength(42);
    expect(out.missingTaskIds).not.toContain(15);
    expect(out.missingTaskIds).not.toContain(16);
    const byTask = Object.fromEntries(out.taskDeltas.map(t => [t.taskId, t]));
    expect(byTask[15]).toEqual({ taskId: 15, M1: 0.25, M2: 0.25, M3: 0.5 });
    expect(byTask[16]).toEqual({ taskId: 16, M1: -0.25, M2: -0.25, M3: -0.5 });
    expect(out.M1.mean).toBe(0);
    expect(out.M2.mean).toBe(0);
    expect(out.M3.mean).toBe(0);
  });

  it("rejects duplicate rows, invalid Brier, unknown arms, and invalid task ids", () => {
    const base = triplet(15, 0.1, 0.2, 0.3);
    expect(() => computeMechanismAnalysisV1([...base, ...base])).toThrow(/duplicate/);
    expect(() =>
      computeMechanismAnalysisV1([...base.slice(0, 2), { taskId: 15, arm: "ATTACKS_LABELED", finalBrier: 0.3 }, ...base.slice(2)]),
    ).toThrow(/duplicate/);
    expect(() =>
      computeMechanismAnalysisV1([{ taskId: 15, arm: "CONTROL", finalBrier: 2.5 }]),
    ).toThrow(/invalid_brier/);
    expect(() =>
      computeMechanismAnalysisV1([{ taskId: 15, arm: "CONTROL", finalBrier: -0.1 }]),
    ).toThrow(/invalid_brier/);
    expect(() =>
      computeMechanismAnalysisV1([{ taskId: 15, arm: "CONTROL", finalBrier: Number.NaN }]),
    ).toThrow(/invalid_brier/);
    expect(() =>
      computeMechanismAnalysisV1([{ taskId: 15, arm: "CONTROL", finalBrier: Number.POSITIVE_INFINITY }]),
    ).toThrow(/invalid_brier/);
    expect(() =>
      computeMechanismAnalysisV1([
        { taskId: 15, arm: "SUPPORTS" } as unknown as MechanismAnalysisRowV1,
      ]),
    ).toThrow(/unknown_arm/);
    expect(() =>
      computeMechanismAnalysisV1([{ taskId: 0, arm: "CONTROL", finalBrier: 0.5 }]),
    ).toThrow(/invalid_task_id/);
    expect(() =>
      computeMechanismAnalysisV1([{ taskId: 1, arm: "CONTROL", finalBrier: 0.5 }]),
    ).toThrow(/unplanned_task_id/);
  });

  it("classifies incomplete triplets as missing tasks", () => {
    const rows: MechanismAnalysisRowV1[] = [
      ...triplet(15, 0.1, 0.2, 0.3),
      { taskId: 16, arm: "CONTROL", finalBrier: 0.5 },
      { taskId: 16, arm: "ATTACKS_NEUTRAL", finalBrier: 0.6 },
    ];
    const out = computeMechanismAnalysisV1(rows);
    expect(out.completeTaskIds).toEqual([15]);
    expect(out.missingTaskIds).toHaveLength(43);
    expect(out.missingTaskIds).toContain(16);
    expect(out.M1.completeTasks).toBe(1);
  });

  it("bootstrap is byte-for-byte reproducible with the frozen seed", () => {
    const deltas = Array.from({ length: 44 }, (_, i) => -0.05 - i * 0.01);
    const first = bootstrapMechanismContrastV1(deltas, 10000, 0x5eed0f);
    const second = bootstrapMechanismContrastV1(deltas, 10000, 0x5eed0f);
    expect(first).toEqual(second);
    expect(first).not.toBeNull();
    if (first) {
      expect(first.lo).toBeLessThan(first.hi);
      expect(first.hi).toBeLessThan(0);
    }
  });

  it("classifies all four M1 outcomes", () => {
    expect(classifyMechanismM1V1({ lo: -0.6, hi: -0.4 })).toBe("LABEL_BENEFIT");
    expect(classifyMechanismM1V1({ lo: 0.4, hi: 0.6 })).toBe("LABEL_HARM");
    expect(classifyMechanismM1V1({ lo: -0.05, hi: 0.05 })).toBe("PRACTICALLY_SMALL");
    expect(classifyMechanismM1V1({ lo: -0.2, hi: 0.2 })).toBe("INCONCLUSIVE");
    expect(classifyMechanismM1V1(null)).toBe("INCONCLUSIVE");
    // end-to-end: all-negative deltas yield LABEL_BENEFIT through the analysis
    const taskIds = buildMechanismExperimentPlanV1().formalTaskIds;
    const rows = taskIds.flatMap(taskId => triplet(taskId, 1.0, 0.5, 0.25));
    expect(computeMechanismAnalysisV1(rows).M1.classification).toBe("LABEL_BENEFIT");
  });

  it("computes planned-denominator missing bounds with [-2,+2] over 44 tasks", () => {
    // 2 complete tasks with known M1 deltas; 42 missing
    const rows = [
      ...triplet(15, 0.25, 0.5, 0.75), // M1 = +0.25
      ...triplet(16, 0.75, 0.5, 0.25), // M1 = -0.25
    ];
    const out = computeMechanismAnalysisV1(rows);
    expect(out.plannedTasks).toBe(MECHANISM_PLANNED_DENOMINATOR);
    expect(out.M1.completeTasks).toBe(2);
    const missing = 42;
    expect(out.missingBounds.M1.missingCount).toBe(missing);
    expect(out.missingBounds.M1.lowerMeanDelta).toBe(
      (0 + missing * MECHANISM_MISSING_DELTA_LO) / MECHANISM_PLANNED_DENOMINATOR,
    );
    expect(out.missingBounds.M1.upperMeanDelta).toBe(
      (0 + missing * MECHANISM_MISSING_DELTA_HI) / MECHANISM_PLANNED_DENOMINATOR,
    );
    expect(out.missingBounds.M1.lowerMeanDelta).toBeCloseTo(-84 / 44, 12);
    expect(out.missingBounds.M1.upperMeanDelta).toBeCloseTo(84 / 44, 12);
  });
});

describe("credential/provider isolation", () => {
  it("neither production module reads .env nor calls a provider", () => {
    const files = [
      "experiments/campaign/v6/mechanismExperimentPlanV1.ts",
      "experiments/campaign/v6/mechanismAnalysisMathV1.ts",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/process\.env/);
      expect(source).not.toMatch(/\.env/);
      expect(source).not.toMatch(/fetch\s*\(/);
      expect(source).not.toMatch(/axios|https?:\/\//);
      expect(source).not.toMatch(/invoker|zhipuSingleAttempt/);
    }
  });
});
