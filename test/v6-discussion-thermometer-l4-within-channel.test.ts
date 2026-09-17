import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { analyzeDiscussionThermometerL4WithinChannelV1 } from
  "../experiments/campaign/v6/analyze_v6_discussion_thermometer_l4_within_channel_v1";

const OUTPUT = resolve(
  "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1",
);

describe("discussion thermometer L4 within-channel development analysis", () => {
  it("keeps the next-report estimand truth-blind and task-grouped", () => {
    const analysis = analyzeDiscussionThermometerL4WithinChannelV1(OUTPUT);
    expect(analysis.analysisRef.version).toBe("1.2.0");
    expect(analysis.design).toMatchObject({
      authority: "development_only_not_confirmatory",
      truthAccess: "none",
      inferenceUnit: "task",
      observationUnit: "task_checkpoint_transition",
      taskCount: 7,
      semanticGroupCount: 7,
      targetChannel: "next_primary_report_transition",
      estimator: "standardized_fractional_logit_ridge_v1",
      primaryLambda: 1,
    });
    expect(analysis.targets).toHaveLength(2);
    analysis.targets.forEach(target => {
      expect(target.rowCount).toBe(14);
      expect(target.taskCount).toBe(7);
      expect(target.zeroTargetRowCount).toBe(7);
      expect(target.behaviorToMacro.primary.groupCount).toBe(7);
      expect(target.behaviorToMacro.primary.rowCount).toBe(14);
      expect(target.behaviorToMacro.primary.signFlip.method).toBe("exact");
    });
  }, 20_000);

  it("does not promote a macro or microstate increment absent held-out loss gain", () => {
    const analysis = analyzeDiscussionThermometerL4WithinChannelV1(OUTPUT);
    analysis.targets.forEach(target => {
      expect(target.behaviorToMacro.classification)
        .toBe("no_development_increment_observed");
      expect(target.behaviorToMacro.primary.candidateMinusBaselineMeanSquaredError)
        .toBeGreaterThan(0);
      expect(target.behaviorToMacro.sensitivity.every(row =>
        row.candidateMinusBaselineMeanSquaredError > 0)).toBe(true);
      expect(target.macroToMicrostate.classification)
        .toBe("no_development_increment_observed");
    });
    expect(analysis.routing).toEqual({
      macroIncrement: "none",
      microstateBeyondMacro: "none",
      decision: "do_not_scale_current_macro_prediction_design",
    });
    expect(analyzeDiscussionThermometerL4WithinChannelV1(OUTPUT).contentHash)
      .toBe(analysis.contentHash);
  }, 20_000);
});
