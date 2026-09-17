import { describe, expect, it } from "vitest";
import {
  DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1,
  projectDiscussionThermometerCoverageOnlineTaskV1,
  verifyDiscussionThermometerStateSpaceTaskBankV1,
} from "../experiments/campaign/v6/discussionThermometerStateSpaceTaskBankV1";
import { buildDiscussionThermometerStateSpaceCalibrationPlanV1 } from
  "../experiments/campaign/v6/discussionThermometerStateSpaceCalibrationPlanV1";
import { buildDiscussionThermometerStateSpaceCalibrationReviewV1 } from
  "../experiments/campaign/v6/discussionThermometerStateSpaceCalibrationReviewV1";

describe("discussion thermometer state-space task bank v1", () => {
  it("freezes two bases crossed with four designed information environments", () => {
    verifyDiscussionThermometerStateSpaceTaskBankV1();
    expect(DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1).toHaveLength(8);
    expect(new Set(DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1
      .map(task => task.baseScenarioId))).toEqual(new Set(["thermal-loop", "service-access"]));
    expect(new Set(DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1
      .map(task => task.designRegime))).toHaveProperty("size", 4);
  });

  it("keeps public task and claim fixed within each base while varying private source geometry", () => {
    for (const baseId of ["thermal-loop", "service-access"] as const) {
      const tasks = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1
        .filter(task => task.baseScenarioId === baseId);
      expect(new Set(tasks.map(task => task.publicContext)).size).toBe(1);
      expect(new Set(tasks.map(task => JSON.stringify(task.claim))).size).toBe(1);
      expect(new Set(tasks.map(task => JSON.stringify(task.agents))).size).toBe(4);
    }
  });

  it("projects a truth-blind online view without intended state or resolver labels", () => {
    for (const task of DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1) {
      const online = projectDiscussionThermometerCoverageOnlineTaskV1(task);
      const serialized = JSON.stringify(online);
      expect(serialized).not.toMatch(
        /designRegime|latentOutcome|humanSemanticReview|groundTruth|correctAnswer/i,
      );
      expect(serialized).not.toContain(task.designRegime);
      expect(online.agents).toHaveLength(4);
      expect(online.agents.every(agent => agent.privateInformation.includes("[source=")))
        .toBe(true);
    }
  });

  it("does not claim that regime contrasts isolate a causal allocation effect", () => {
    expect(DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.every(task =>
      task.offlineDesignRecord.causalComparisonAcrossRegimes === "not_authorized")).toBe(true);
    expect(DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.every(task =>
      task.humanSemanticReview === "PENDING")).toBe(true);
  });

  it("passes automatic leakage checks but remains blocked on human and budget decisions", () => {
    const review = buildDiscussionThermometerStateSpaceCalibrationReviewV1(
      buildDiscussionThermometerStateSpaceCalibrationPlanV1(),
    );
    expect(review.taskReviews.every(task => task.automaticStatus === "PASS")).toBe(true);
    expect(review.automaticChecksPass).toBe(true);
    expect(review.readyForUserDecision).toBe(true);
    expect(review.executionReady).toBe(false);
    expect(review.requiredUserDecisions.map(decision => decision.id)).toEqual([
      "D1_SEMANTIC_ACCEPTANCE", "D2_PROVIDER_BUDGET",
    ]);
  });
});
