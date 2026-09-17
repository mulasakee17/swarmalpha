import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { analyzeL4DevelopmentStage1V1 } from
  "../experiments/campaign/v6/analyze_v6_discussion_thermometer_l4_development_stage1";

describe("discussion thermometer L4 development analysis v1.3", () => {
  it("audits future-choice prediction against persistence on identical eligible rows", () => {
    const analysis = analyzeL4DevelopmentStage1V1(resolve(
      "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1",
    ));
    expect(analysis.analysisRef.version).toBe("1.3.0");
    expect(analysis.findings.crossChannelQualification).toMatchObject({
      eligibleUniqueTopCount: 54,
      excludedSensorTieCount: 2,
      sensorCorrectCount: 51,
      persistenceCorrectCount: 51,
      bothCorrectCount: 51,
      sensorOnlyCorrectCount: 0,
      persistenceOnlyCorrectCount: 0,
      bothWrongCount: 3,
      sensorTopEqualsPreviousChoiceCount: 53,
      candidateMinusPersistenceAccuracy: 0,
      discordantPairCount: 0,
      exactTwoSidedPairedSignPValue: 1,
      qualification: "no_incremental_signal_observed",
    });
    expect(analysis.findings.publicChoicePersistence).toEqual([
      { transition: "R1_TO_R2", eligibleAgentTransitions: 28, changedChoiceCount: 2, persistedChoiceCount: 26 },
      { transition: "R2_TO_R3", eligibleAgentTransitions: 28, changedChoiceCount: 1, persistedChoiceCount: 27 },
    ]);
    expect(analysis.findings.sameCheckpointCompatibility).toEqual({
      interpretation: "non_independent_prompt_contains_current_public_choice",
      eligibleUniqueTopCount: 81,
      compatibleCount: 79,
      incompatibleCount: 2,
    });
    expect(analysis.findings.taskLevelInference).toMatchObject({
      inferenceUnit: "task",
      completeTaskCount: 7,
    });
    expect(analysis.findings.taskLevelFutureChoice).toHaveLength(7);
  });

  it("separates initial exposure movement from late-round movement", () => {
    const analysis = analyzeL4DevelopmentStage1V1(resolve(
      "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1",
    ));
    expect(analysis.findings.transitionTiming.map(row => ({
      transition: row.transition,
      nonzeroMeanAgentTvTaskCount: row.nonzeroMeanAgentTvTaskCount,
      nonzeroPooledTvTaskCount: row.nonzeroPooledTvTaskCount,
    }))).toEqual([
      { transition: "X0_TO_X1", nonzeroMeanAgentTvTaskCount: 7, nonzeroPooledTvTaskCount: 7 },
      { transition: "X1_TO_X2", nonzeroMeanAgentTvTaskCount: 3, nonzeroPooledTvTaskCount: 3 },
      { transition: "X2_TO_X3", nonzeroMeanAgentTvTaskCount: 4, nonzeroPooledTvTaskCount: 4 },
    ]);
  });
});
