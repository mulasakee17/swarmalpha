import { describe, expect, it } from "vitest";
import { analyzeSeed4RecoverySensitivityV1 } from "../experiments/campaign/v6/analyze_v6_mechanism_seed4_recovery_sensitivity_v1";

const ROOT = "experiments/campaign/pilot_output";

describe("seed4 recovery sensitivity analysis", () => {
  it("preserves primary failures and adds only eligible recovery rows", () => {
    const result = analyzeSeed4RecoverySensitivityV1({
      seed3Dir: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed3-20260822`,
      seed3AnalysisFile: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed3-20260822-analysis-v1/analysis.json`,
      batchADir: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed4-batch-a-20260823`,
      batchBDir: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed4-batch-b-20260823`,
      recoveryDir: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed4-rate-limit-recovery-20260823`,
    });

    expect(result.evidenceClass).toBe("post_hoc_secondary_recovery_sensitivity");
    expect(result.primarySeed4.inference.completeTaskIds).toHaveLength(26);
    expect(result.primarySeed4.inference.missingTaskIds).toHaveLength(18);
    expect(result.acquisitionAccounting.primarySeed4.failedTaskIds).toContain(50);
    expect(result.acquisitionAccounting.recovery.recoveredTaskIds).toHaveLength(14);
    expect(result.acquisitionAccounting.recovery.failedTaskIds).toEqual([53]);
    expect(result.recoverySensitivity.inference.completeTaskIds).toHaveLength(40);
    expect(result.recoverySensitivity.inference.missingTaskIds).toEqual([17, 25, 38, 53]);
    expect(result.recoverySensitivity.crossSeed.completeBothTaskIds).toHaveLength(39);
    expect(result.recoverySensitivity.inference.M1.classification).toBe("INCONCLUSIVE");
    expect(result.recoverySensitivity.inference.M2.ci95?.hi).toBeLessThan(0);
    expect(result.recoverySensitivity.inference.M3.ci95?.hi).toBeLessThan(0);
    expect(result.recoverySensitivity.inference.missingBounds.M2.upperMeanDelta).toBeLessThan(0);
    expect(result.recoverySensitivity.inference.missingBounds.M3.upperMeanDelta).toBeLessThan(0);
    expect(result.recoverySensitivity.crossSeed.M1.classification).toBe("INCONCLUSIVE");
    expect(result.recoverySensitivity.crossSeed.M2.ci95?.hi).toBeLessThan(0);
    expect(result.recoverySensitivity.crossSeed.M3.ci95?.hi).toBeLessThan(0);
    expect(new Set(result.taskResults.map((task) => task.taskId)).size).toBe(40);
    expect(result.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
