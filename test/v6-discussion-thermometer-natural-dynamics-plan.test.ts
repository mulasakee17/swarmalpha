import { describe, expect, it } from "vitest";
import {
  buildDiscussionThermometerNaturalDynamicsPlanV1,
  verifyDiscussionThermometerNaturalDynamicsPlanV1,
} from "../experiments/campaign/v6/discussionThermometerNaturalDynamicsPlanV1";

describe("discussion thermometer natural dynamics plan v1", () => {
  it("freezes a four-task, five-checkpoint within-batch targeted replication", () => {
    const plan = buildDiscussionThermometerNaturalDynamicsPlanV1();
    verifyDiscussionThermometerNaturalDynamicsPlanV1(plan);
    expect(plan.taskIds).toHaveLength(4);
    expect(plan.targetRegimes).toEqual([
      "SHARED_CUE_PRIVATE_CORRECTION",
      "POLARIZED_PRIVATE_BLOCKS",
    ]);
    expect(plan.publicRounds).toEqual([1, 2, 3, 4]);
    expect(plan.checkpoints).toEqual([0, 1, 2, 3, 4]);
    expect(plan.callBudget).toMatchObject({
      publicCalls: 64, sensorCalls: 160, totalProviderCalls: 224,
    });
    expect(plan.executionMode).toBe("new_full_within_batch_rerun_not_historical_append");
  });

  it("predeclares falsification without granting execution or control authority", () => {
    const plan = buildDiscussionThermometerNaturalDynamicsPlanV1();
    expect(plan.selectionStatus)
      .toBe("post_development_targeted_replication_not_confirmatory_transport");
    expect(plan.registeredFalsificationRules.polarizedLateEnvelopeReplication)
      .toContain("at least two consecutive late transitions");
    expect(plan.providerCallsAuthorized).toBe(0);
    expect(plan.executionAuthority).toBe("none");
    expect(plan.onlineTruthAccess).toBe("none");
    expect(plan.sensorWriteback).toBe("none");
    expect(plan.predictionUsed).toBe(false);
    expect(plan.actionUsed).toBe(false);
    expect(JSON.stringify(plan)).not.toMatch(
      /groundTruth|correctAnswer|latentOutcome|brier|actionRecommendation/i,
    );
  });
});
