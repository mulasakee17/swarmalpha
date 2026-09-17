import { describe, expect, it } from "vitest";
import {
  buildDiscussionThermometerNaturalDynamicsPreflightV1,
} from "../experiments/campaign/v6/run_v6_discussion_thermometer_natural_dynamics_preflight_v1";

describe("discussion thermometer natural dynamics preflight v1", () => {
  it("passes zero-provider foundation checks without execution authority", () => {
    const preflight = buildDiscussionThermometerNaturalDynamicsPreflightV1();
    expect(preflight.providerCalls).toBe(0);
    expect(preflight.allChecksPass).toBe(true);
    expect(preflight.checks).toHaveLength(9);
    expect(preflight.checks.every(check => check.pass)).toBe(true);
    expect(preflight.executionReady).toBe(false);
    expect(preflight.nextRequiredStep)
      .toBe("MANUAL_SEMANTIC_REVIEW_AND_EXPLICIT_EXECUTION_AUTHORITY");
  });

  it("keeps the preflight truth blind and non-intervening", () => {
    const preflight = buildDiscussionThermometerNaturalDynamicsPreflightV1();
    expect(JSON.stringify(preflight)).not.toMatch(
      /groundTruth|correctAnswer|latentOutcome|brier|actionRecommendation/i,
    );
  });
});
