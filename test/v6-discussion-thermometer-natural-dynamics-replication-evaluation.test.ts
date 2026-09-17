import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { DiscussionThermometerNaturalDynamicsAnalysisV1 } from
  "../experiments/campaign/v6/analyzeDiscussionThermometerNaturalDynamicsV1";
import type { DiscussionThermometerNaturalDynamicsPlanV1 } from
  "../experiments/campaign/v6/discussionThermometerNaturalDynamicsPlanV1";
import {
  evaluateDiscussionThermometerNaturalDynamicsReplicationV1,
} from "../experiments/campaign/v6/evaluateDiscussionThermometerNaturalDynamicsReplicationV1";

const RESULT = resolve(process.cwd(),
  "results/v6_discussion_thermometer_natural_dynamics_glm46v_seed1_batch2");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(RESULT, name), "utf8")) as T;
}

describe("natural-dynamics targeted replication evaluation", () => {
  it("applies both registered rules to all four complete trajectories", () => {
    const plan = readJson<DiscussionThermometerNaturalDynamicsPlanV1>("plan.json");
    const analysis = readJson<DiscussionThermometerNaturalDynamicsAnalysisV1>(
      "analysis.json");
    const evaluation = evaluateDiscussionThermometerNaturalDynamicsReplicationV1({
      plan, analysis,
    });
    expect(evaluation.executionCompleteness).toEqual({
      taskCount: 4,
      checkpointCountPerTrajectory: 5,
      transitionCountPerTrajectory: 4,
      observedTransitionCount: 16,
    });
    expect(evaluation.registeredRules.polarizedLateEnvelopeReplication.pass).toBe(true);
    expect(evaluation.registeredRules.sharedCueMotionResourceReplication.pass).toBe(true);
    expect(evaluation.overallRegisteredRulesPass).toBe(true);
    expect(evaluation.interpretationStatus)
      .toBe("TARGETED_REPLICATION_CRITERIA_PASS");
  });

  it("is deterministic, truth-blind, and non-governing", () => {
    const plan = readJson<DiscussionThermometerNaturalDynamicsPlanV1>("plan.json");
    const analysis = readJson<DiscussionThermometerNaturalDynamicsAnalysisV1>(
      "analysis.json");
    const first = evaluateDiscussionThermometerNaturalDynamicsReplicationV1({
      plan, analysis,
    });
    const second = evaluateDiscussionThermometerNaturalDynamicsReplicationV1({
      plan, analysis,
    });
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.truthAccess).toBe("none");
    expect(first.predictionUsed).toBe(false);
    expect(first.actionUsed).toBe(false);
    expect(JSON.stringify(first)).not.toMatch(
      /groundTruth|correctAnswer|latentOutcome|brier|actionRecommendation/i);
  });
});
