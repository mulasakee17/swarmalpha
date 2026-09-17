import { describe, expect, it } from "vitest";
import {
  buildDiscussionThermometerStateSpaceCoveragePreflightV1,
  verifyDiscussionThermometerStateSpaceCoveragePreflightV1,
} from "../experiments/campaign/v6/discussionThermometerStateSpaceCoveragePlanV1";

describe("discussion thermometer state-space coverage preflight v1", () => {
  it("freezes an observation-only 256-call canary without creating a new engine", () => {
    const artifact = buildDiscussionThermometerStateSpaceCoveragePreflightV1();
    expect(artifact.enginePolicy.newDiscussionEngine).toBe(false);
    expect(artifact.enginePolicy.truthAccess).toBe("none");
    expect(artifact.enginePolicy.sensorWriteback).toBe("none");
    expect(artifact.design.registeredVariantCount).toBe(8);
    expect(artifact.callBudget).toMatchObject({
      publicCallsPerVariant: 8,
      primarySensorCallsPerVariant: 12,
      duplicateSensorCallsPerVariant: 12,
      totalCallsPerVariant: 32,
      totalFrozenCalls: 256,
      providerCallsDuringPreflight: 0,
    });
    expect(artifact.predictionRole)
      .toBe("optional_later_coarse_graining_test_not_monitoring_gate");
    verifyDiscussionThermometerStateSpaceCoveragePreflightV1(artifact);
  });

  it("does not smuggle intended states or old numeric-card semantics into prompts", () => {
    const artifact = buildDiscussionThermometerStateSpaceCoveragePreflightV1();
    const regimeText = JSON.stringify(artifact.design.regimes).toLowerCase();
    expect(artifact.design.stateLabelPolicy)
      .toBe("labels_come_from_observed_readings_not_design_regime");
    expect(artifact.prohibitedFeatures).toContain(
      "numeric_evidence_scores_or_instruction_to_sum_cards",
    );
    expect(artifact.design.regimes).toHaveLength(4);
    for (const regime of artifact.design.regimes) {
      expect(regime.forbiddenPromptShortcut.length).toBeGreaterThan(20);
    }
    expect(regimeText).not.toContain("correctanswer");
    expect(regimeText).not.toContain("groundtruth");
  });

  it("keeps advancement criteria descriptive rather than predictive", () => {
    const artifact = buildDiscussionThermometerStateSpaceCoveragePreflightV1();
    expect(artifact.advancementGates.map(gate => gate.id)).toEqual([
      "G0_TERMINAL_ACCOUNTING",
      "G1_SENSOR_USABILITY",
      "G2_STATE_RESOLUTION",
      "G3_LATE_MOTION",
    ]);
    expect(artifact.advancementGates.every(gate =>
      gate.role === "resource_gate_not_scientific_claim")).toBe(true);
    expect(JSON.stringify(artifact.advancementGates).toLowerCase())
      .not.toContain("predict");
  });
});
