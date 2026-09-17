import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeMechanismOrderSensitivityV1,
  assertMechanismOrderAgreementV1,
  classifyMechanismOrderStratumV1,
  MECHANISM_ORDER_SENSITIVITY_EVIDENCE_CLASS,
  recomputeMechanismOrderSensitivityHashV1,
  writeMechanismOrderSensitivityV1,
} from "../experiments/campaign/v6/analyze_v6_mechanism_order_sensitivity_v1";

const ROOT = "experiments/campaign/pilot_output";
const INPUTS = {
  seed3Dir: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed3-20260822`,
  seed3AnalysisFile: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed3-20260822-analysis-v1/analysis.json`,
  batchADir: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed4-batch-a-20260823`,
  batchBDir: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed4-batch-b-20260823`,
  recoveryDir: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed4-rate-limit-recovery-20260823`,
  seed4AnalysisFile: `${ROOT}/v6-fork-mechanism-neutral-labeled-seed4-recovery-sensitivity-analysis-v1/analysis.json`,
};

describe("mechanism order sensitivity V1", () => {
  it("classifies all frozen rotations and fails closed on order mismatch", () => {
    expect(classifyMechanismOrderStratumV1([
      "CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED",
    ])).toBe("neutral_after_control");
    expect(classifyMechanismOrderStratumV1([
      "ATTACKS_NEUTRAL", "ATTACKS_LABELED", "CONTROL",
    ])).toBe("neutral_before_control");
    expect(classifyMechanismOrderStratumV1([
      "ATTACKS_LABELED", "CONTROL", "ATTACKS_NEUTRAL",
    ])).toBe("neutral_after_control");
    expect(() => assertMechanismOrderAgreementV1({
      planned: ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"],
      recorded: ["ATTACKS_NEUTRAL", "ATTACKS_LABELED", "CONTROL"],
      executed: ["ATTACKS_NEUTRAL", "ATTACKS_LABELED", "CONTROL"],
    })).toThrow(/plan_recorded_mismatch/);
    expect(() => assertMechanismOrderAgreementV1({
      planned: ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"],
      recorded: ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"],
      executed: ["CONTROL", "ATTACKS_LABELED", "ATTACKS_NEUTRAL"],
    })).toThrow(/recorded_executed_mismatch/);
  });

  it("recomputes frozen inputs and reproduces the inspected order strata exactly", () => {
    const result = analyzeMechanismOrderSensitivityV1(INPUTS);
    expect(result.evidenceClass).toBe(MECHANISM_ORDER_SENSITIVITY_EVIDENCE_CLASS);
    expect(result.inputBindings.seed3.recordedAnalysisHash).toBe(
      result.inputBindings.seed3.recomputedAnalysisHash,
    );
    expect(result.inputBindings.seed4.recordedAnalysisHash).toBe(
      result.inputBindings.seed4.recomputedAnalysisHash,
    );
    expect(result.orderAudit.acquisitions.map(row => row.completedTasks)).toEqual([40, 16, 10, 14]);
    expect(result.orderAudit.acquisitions.every(row =>
      row.planRecordedOrderMismatches === 0 && row.recordedExecutedOrderMismatches === 0)).toBe(true);
    expect(result.orderAudit.recoveryEligibleTasksCheckedAgainstOriginalBatchBOrder).toBe(15);
    expect(result.orderAudit.recoveryOriginalOrderMismatches).toBe(0);

    const seed3 = result.sets.seed3CompleteCase;
    expect(seed3.completedTasks).toBe(40);
    expect(seed3.overallMeanM2).toBeCloseTo(-0.4047721493472222, 14);
    expect(seed3.byStratum.neutral_before_control.completedTasks).toBe(14);
    expect(seed3.byStratum.neutral_before_control.meanM2).toBeCloseTo(-0.3935809525, 14);
    expect(seed3.byStratum.neutral_before_control.signCounts).toEqual({ negative: 8, zero: 5, positive: 1 });
    expect(seed3.byStratum.neutral_after_control.completedTasks).toBe(26);
    expect(seed3.byStratum.neutral_after_control.meanM2).toBeCloseTo(-0.4107981784188034, 14);
    expect(seed3.byStratum.neutral_after_control.signCounts).toEqual({ negative: 19, zero: 2, positive: 5 });

    const primary = result.sets.seed4PrimaryCompleteCase;
    expect(primary.completedTasks).toBe(26);
    expect(primary.overallMeanM2).toBeCloseTo(-0.5581648531143162, 14);
    expect(primary.byStratum.neutral_before_control.completedTasks).toBe(9);
    expect(primary.byStratum.neutral_before_control.meanM2).toBeCloseTo(-0.4032054089969135, 14);
    expect(primary.byStratum.neutral_before_control.signCounts).toEqual({ negative: 8, zero: 0, positive: 1 });
    expect(primary.byStratum.neutral_after_control.completedTasks).toBe(17);
    expect(primary.byStratum.neutral_after_control.meanM2).toBeCloseTo(-0.6402022058823529, 14);
    expect(primary.byStratum.neutral_after_control.signCounts).toEqual({ negative: 15, zero: 0, positive: 2 });

    const recovery = result.sets.seed4RecoverySensitivityCompleteCase;
    expect(recovery.completedTasks).toBe(40);
    expect(recovery.overallMeanM2).toBeCloseTo(-0.49857451563541655, 14);
    expect(recovery.byStratum.neutral_before_control.completedTasks).toBe(14);
    expect(recovery.byStratum.neutral_before_control.meanM2).toBeCloseTo(-0.4407213343551587, 14);
    expect(recovery.byStratum.neutral_before_control.signCounts).toEqual({ negative: 12, zero: 0, positive: 2 });
    expect(recovery.byStratum.neutral_after_control.completedTasks).toBe(26);
    expect(recovery.byStratum.neutral_after_control.meanM2).toBeCloseTo(-0.5297262286324785, 14);
    expect(recovery.byStratum.neutral_after_control.signCounts).toEqual({ negative: 21, zero: 2, positive: 3 });
    expect(result.contentHash).toBe(
      "sha256:ce022d11c35ea91974e808ae5e5266bbcea7ce84cb0def4e81d3a2279293c2b6",
    );
  });

  it("writes idempotently and rejects a conflicting existing output", () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-order-sensitivity-"));
    try {
      const output = join(dir, "analysis.json");
      const artifact = analyzeMechanismOrderSensitivityV1(INPUTS);
      writeMechanismOrderSensitivityV1(output, artifact);
      const first = readFileSync(output, "utf8");
      writeMechanismOrderSensitivityV1(output, artifact);
      expect(readFileSync(output, "utf8")).toBe(first);
      const conflictingBody = {
        ...artifact,
        interpretationLimits: [...artifact.interpretationLimits, "conflict"],
      };
      const conflicting = {
        ...conflictingBody,
        contentHash: recomputeMechanismOrderSensitivityHashV1(conflictingBody),
      };
      expect(() => writeMechanismOrderSensitivityV1(output, conflicting)).toThrow(/no_overwrite_conflict/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("contains no provider, network, credential, or environment access", () => {
    const source = readFileSync(
      "experiments/campaign/v6/analyze_v6_mechanism_order_sensitivity_v1.ts",
      "utf8",
    );
    expect(source).not.toMatch(/process\.env|\.env|fetch\s*\(|axios|https?:\/\//);
    expect(source).not.toMatch(/providerAdapters|zhipuSingleAttempt|invoke\s*\(/);
  });
});
