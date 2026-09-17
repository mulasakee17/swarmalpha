import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeFrozenDiscussionThermometerNaturalDynamicsV1,
} from "../experiments/campaign/v6/analyze_v6_discussion_thermometer_natural_dynamics_v1";

const RESULT_DIRECTORY = resolve(
  "results/v6_discussion_thermometer_state_space_calibration_glm46v_seed1",
);

describe("discussion thermometer natural dynamics development analysis", () => {
  it("separates resolved motion from a repeatability-envelope stability candidate", () => {
    const analysis = analyzeFrozenDiscussionThermometerNaturalDynamicsV1(RESULT_DIRECTORY);
    expect(analysis.evidenceClass).toBe("provider_observation");
    expect(analysis.truthAccess).toBe("none");
    expect(analysis.predictionUsed).toBe(false);
    expect(analysis.actionUsed).toBe(false);
    expect(analysis.summary.transitionCount).toBe(16);
    expect(analysis.summary.completeTransitionCount).toBe(16);
    expect(analysis.summary.replicatedLateResolvedMotionRegimes).toEqual([]);
    expect(analysis.summary.replicatedLateEnvelopeCandidateRegimes)
      .toEqual(["POLARIZED_PRIVATE_BLOCKS"]);
  });

  it("does not upgrade a two-transition envelope event to latent stability", () => {
    const analysis = analyzeFrozenDiscussionThermometerNaturalDynamicsV1(RESULT_DIRECTORY);
    const polarized = analysis.crossScenarioPatterns.find(row =>
      row.designRegime === "POLARIZED_PRIVATE_BLOCKS")!;
    expect(polarized.replicatedLateEnvelopeCandidate).toBe(true);
    expect(polarized.bases.every(row =>
      row.lateClass === "within_repeatability_envelope_all_agents")).toBe(true);
    expect(analysis.identificationLimits.dwellTimeIdentifiable).toBe(false);
    expect(analysis.identificationLimits.transitionHazardIdentifiable).toBe(false);
    expect(analysis.identificationLimits.attractorOrMetastabilityIdentifiable).toBe(false);
    expect(analysis.routing).toBe("LONGER_WITHIN_BATCH_TRAJECTORY_REQUIRED");
    expect(analysis.claimCeiling).toContain("does not identify dwell time");
  });

  it("remains deterministic and excludes outcome and governance fields", () => {
    const first = analyzeFrozenDiscussionThermometerNaturalDynamicsV1(RESULT_DIRECTORY);
    const second = analyzeFrozenDiscussionThermometerNaturalDynamicsV1(RESULT_DIRECTORY);
    expect(second.contentHash).toBe(first.contentHash);
    expect(JSON.stringify(first)).not.toMatch(
      /groundTruth|correctAnswer|latentOutcome|brier|actionRecommendation/i,
    );
  });
});
