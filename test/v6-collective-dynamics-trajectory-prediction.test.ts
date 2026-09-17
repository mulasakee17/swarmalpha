import { describe, expect, it } from "vitest";
import {
  buildThermometerQualificationFeaturesV1,
  buildTrajectoryPredictionFeaturesV1,
  canonicalizeThermometerMicrostateV1,
  compareThermometerQualificationFamiliesV1,
  leaveOneGroupOutFoldsV1,
  pairedSignFlipNullSummaryV1,
  simulatePairedSignFlipPowerV1,
  type ThermometerQualificationFeaturesV1,
} from
  "../experiments/campaign/v6/collectiveDynamicsTrajectoryPredictionV1";
import {
  projectDiscussionThermometerStateV1,
  type DiscussionThermometerInputV1,
} from "../src/lib/epistemic";

const state = {
  pooledProbabilities: { optionIds: ["opt_1", "opt_2", "opt_3"], values: [0.1, 0.7, 0.2] },
  meanNormalizedReportEntropy: 0.7,
  pooledNormalizedEntropy: 0.73,
  normalizedGeneralizedJsd: 0.08,
  pooledConcentration: 0.6,
  maxPairwiseTotalVariation: 0.4,
  comparableAgentIds: ["a1", "a2", "a3"],
  rosterComplete: true,
} as const;

describe("Collective Dynamics trajectory predictor scaffold", () => {
  it("keeps the feature layer truth-blind and option-permutation invariant", () => {
    const features = buildTrajectoryPredictionFeaturesV1({
      family: "M",
      checkpointRound: 1,
      expectedAgentCount: 4,
      state,
    });
    expect(features.observedAgentFraction).toBe(0.75);
    expect(features.pooledSortedProbabilities).toEqual([0.7, 0.2, 0.1]);
    expect(features).not.toHaveProperty("outcome");
    expect(features).not.toHaveProperty("brier");
    expect(features).not.toHaveProperty("groundTruth");
  });

  it("provides nested baseline families without fitting or provider calls", () => {
    const b0 = buildTrajectoryPredictionFeaturesV1({
      family: "B0", checkpointRound: 0, expectedAgentCount: 4, state,
    });
    const rich = buildTrajectoryPredictionFeaturesV1({
      family: "R", checkpointRound: 0, expectedAgentCount: 4, state,
    });
    expect(b0.pooledSortedProbabilities).toEqual([]);
    expect(b0.pooledConcentration).toBeNull();
    expect(rich.pooledSortedProbabilities).toEqual([0.7, 0.2, 0.1]);
    expect(rich.maxPairwiseTotalVariation).toBe(0.4);
  });

  it("keeps repeated rows inside one held-out task or semantic group", () => {
    const rows = [
      { taskId: "t1", semanticGroupId: "g1" },
      { taskId: "t1", semanticGroupId: "g1" },
      { taskId: "t2", semanticGroupId: "g1" },
      { taskId: "t3", semanticGroupId: "g2" },
    ];
    const taskFolds = leaveOneGroupOutFoldsV1(rows, "taskId");
    expect(taskFolds).toHaveLength(3);
    for (const fold of taskFolds) {
      expect(fold.testIndices.every(index => !fold.trainIndices.includes(index))).toBe(true);
      expect(fold.testIndices.every(index => rows[index].taskId === fold.holdoutGroupId)).toBe(true);
    }
    const semanticFolds = leaveOneGroupOutFoldsV1(rows, "semanticGroupId");
    expect(semanticFolds.map(fold => fold.holdoutGroupId)).toEqual(["g1", "g2"]);
    expect(semanticFolds[0].testIndices).toEqual([0, 1, 2]);
  });

  it("produces a deterministic paired sign-flip null without outcome access", () => {
    const input = { deltas: [0.2, -0.1, 0.05, 0.15], repetitions: 1000, seed: 17 };
    const first = pairedSignFlipNullSummaryV1(input);
    const second = pairedSignFlipNullSummaryV1(input);
    expect(first).toEqual(second);
    expect(first.method).toBe("exact");
    expect(first.repetitions).toBe(16);
    expect(first.observedMean).toBeCloseTo(0.075);
    expect(first.nullMean).toBeCloseTo(0, 1);
    expect(first.absoluteQuantile95).toBeGreaterThanOrEqual(0);
    expect(first.twoSidedExceedance).toBeGreaterThanOrEqual(0);
    expect(first.twoSidedExceedance).toBeLessThanOrEqual(1);
  });
});

const sensorRef = { id: "sensor:qualification-test", version: "1.0.0" };

function thermometerInput(input: {
  checkpointId: string;
  checkpointIndex: number;
  optionIds?: string[];
  vectors: Record<string, number[]>;
  choices?: Record<string, string>;
}): DiscussionThermometerInputV1 {
  const optionIds = input.optionIds ?? ["o1", "o2", "o3"];
  return {
    claimId: "claim:qualification-test",
    checkpointId: input.checkpointId,
    checkpointIndex: input.checkpointIndex,
    optionIds,
    expectedAgentIds: Object.keys(input.vectors),
    reportPairs: Object.entries(input.vectors).map(([agentId, values]) => ({
      agentId,
      A: {
        status: "valid",
        probabilitiesByOptionId: Object.fromEntries(optionIds.map((optionId, index) =>
          [optionId, values[index]])),
      },
      B: { status: "unavailable", reason: "not_sampled_for_quality_control" },
    })),
    publicChoiceByAgentId: input.choices,
    sensorRef,
    snapshotHash: `sha256:${"b".repeat(64)}`,
  };
}

describe("Discussion Thermometer L4 qualification core", () => {
  const previous = projectDiscussionThermometerStateV1(thermometerInput({
    checkpointId: "X0",
    checkpointIndex: 0,
    vectors: { a1: [0.7, 0.2, 0.1], a2: [0.2, 0.7, 0.1] },
    choices: { a1: "o1", a2: "o2" },
  }));
  const current = projectDiscussionThermometerStateV1(thermometerInput({
    checkpointId: "X1",
    checkpointIndex: 1,
    vectors: { a1: [0.8, 0.1, 0.1], a2: [0.4, 0.5, 0.1] },
    choices: { a1: "o1", a2: "o1" },
  }));

  it("uses a nested structural/behavior/minimal-macro/microstate ladder", () => {
    const structural = buildThermometerQualificationFeaturesV1({
      family: "STRUCTURAL", current, previous,
    });
    const behavior = buildThermometerQualificationFeaturesV1({
      family: "BEHAVIOR", current, previous,
    });
    const macro = buildThermometerQualificationFeaturesV1({
      family: "MACRO", current, previous,
    });
    const microstate = buildThermometerQualificationFeaturesV1({
      family: "MICROSTATE", current, previous,
    });
    expect([structural, behavior, macro, microstate].every(item => item.eligible)).toBe(true);
    expect(behavior.names.slice(0, structural.names.length)).toEqual(structural.names);
    expect(macro.names.slice(0, behavior.names.length)).toEqual(behavior.names);
    expect(microstate.names.slice(0, macro.names.length)).toEqual(macro.names);
    expect(macro.names).toContain("mean_normalized_report_entropy");
    expect(macro.names.join(" ")).not.toMatch(/generalized_jsd|pooled_normalized_entropy|concentration/);
    expect(macro.names).toContain("previous_choice_available");
    expect(macro.values[macro.names.indexOf("choice_lag_total_variation")]).toBeCloseTo(0.5);
  });

  it("canonicalizes the full primary matrix under agent and option renaming", () => {
    const renamed = projectDiscussionThermometerStateV1(thermometerInput({
      checkpointId: "X1-renamed",
      checkpointIndex: 1,
      optionIds: ["z", "x", "y"],
      vectors: { renamed_2: [0.5, 0.1, 0.4], renamed_1: [0.1, 0.1, 0.8] },
      choices: { renamed_2: "z", renamed_1: "y" },
    }));
    expect(canonicalizeThermometerMicrostateV1(renamed))
      .toEqual(canonicalizeThermometerMicrostateV1(current));
  });

  it("marks behavior-dependent families unavailable without structured choices", () => {
    const noChoice = projectDiscussionThermometerStateV1(thermometerInput({
      checkpointId: "X2",
      checkpointIndex: 2,
      vectors: { a1: [0.8, 0.1, 0.1], a2: [0.4, 0.5, 0.1] },
    }));
    const structural = buildThermometerQualificationFeaturesV1({
      family: "STRUCTURAL", current: noChoice,
    });
    const macro = buildThermometerQualificationFeaturesV1({
      family: "MACRO", current: noChoice,
    });
    expect(structural.eligible).toBe(true);
    expect(macro.eligible).toBe(false);
    expect(macro.missingReasons).toContain("current_structured_public_choice_unavailable");
  });

  it("compares nested families on identical rows and held-out groups", () => {
    const feature = (family: "STRUCTURAL" | "MACRO", names: string[], values: number[]):
    ThermometerQualificationFeaturesV1 => ({
      featureSchema: "discussion-thermometer-qualification-features-v1",
      family,
      eligible: true,
      missingReasons: [],
      shapeKey: "N2:K3",
      names,
      values,
    });
    const rows = [-3, -2, -1, 1, 2, 3].map((signal, index) => ({
      taskId: `t${index + 1}`,
      semanticGroupId: `g${index + 1}`,
      target: 2 * signal,
      featuresByFamily: {
        STRUCTURAL: feature("STRUCTURAL", ["constant_state"], [0]),
        MACRO: feature("MACRO", ["constant_state", "registered_signal"], [0, signal]),
      },
    }));
    const result = compareThermometerQualificationFamiliesV1({
      rows,
      baselineFamily: "STRUCTURAL",
      candidateFamily: "MACRO",
      holdoutKey: "taskId",
      lambda: 0.001,
    });
    expect(result.rowCount).toBe(6);
    expect(result.groupCount).toBe(6);
    expect(result.candidateMeanSquaredError).toBeLessThan(result.baselineMeanSquaredError);
    expect(result.groupLossDeltas).toHaveLength(6);
    expect(result.signFlip.method).toBe("exact");
  });

  it("fits bounded fractional-logit ridge inside each held-out task fold", () => {
    const feature = (family: "STRUCTURAL" | "MACRO", names: string[], values: number[]):
    ThermometerQualificationFeaturesV1 => ({
      featureSchema: "discussion-thermometer-qualification-features-v1",
      family,
      eligible: true,
      missingReasons: [],
      shapeKey: "N2:K3",
      names,
      values,
    });
    const rows = [-3, -2, -1, 1, 2, 3].map((signal, index) => ({
      taskId: `fractional-t${index + 1}`,
      semanticGroupId: `fractional-g${index + 1}`,
      target: 1 / (1 + Math.exp(-signal)),
      featuresByFamily: {
        STRUCTURAL: feature("STRUCTURAL", ["constant_state"], [0]),
        MACRO: feature("MACRO", ["constant_state", "registered_signal"], [0, signal]),
      },
    }));
    const result = compareThermometerQualificationFamiliesV1({
      rows,
      baselineFamily: "STRUCTURAL",
      candidateFamily: "MACRO",
      holdoutKey: "taskId",
      lambda: 0.1,
      estimator: "standardized_fractional_logit_ridge_v1",
    });
    expect(result.estimator).toBe("standardized_fractional_logit_ridge_v1");
    expect(result.lambda).toBe(0.1);
    expect(result.candidateMeanSquaredError).toBeLessThan(result.baselineMeanSquaredError);
    expect(result.groupLossDeltas).toHaveLength(6);
  });

  it("equal-weights held-out tasks when eligible row counts differ", () => {
    const feature = (family: "STRUCTURAL" | "MACRO", names: string[], values: number[]):
    ThermometerQualificationFeaturesV1 => ({
      featureSchema: "discussion-thermometer-qualification-features-v1",
      family,
      eligible: true,
      missingReasons: [],
      shapeKey: "N2:K3",
      names,
      values,
    });
    const source = [
      { taskId: "unequal-t1", signal: -2, target: 0.1 },
      { taskId: "unequal-t1", signal: -1, target: 0.2 },
      { taskId: "unequal-t2", signal: 1, target: 0.8 },
      { taskId: "unequal-t3", signal: 2, target: 0.9 },
    ];
    const result = compareThermometerQualificationFamiliesV1({
      rows: source.map(row => ({
        taskId: row.taskId,
        semanticGroupId: row.taskId,
        target: row.target,
        featuresByFamily: {
          STRUCTURAL: feature("STRUCTURAL", ["constant_state"], [0]),
          MACRO: feature("MACRO", ["constant_state", "registered_signal"], [0, row.signal]),
        },
      })),
      baselineFamily: "STRUCTURAL",
      candidateFamily: "MACRO",
      holdoutKey: "taskId",
      lambda: 1,
      estimator: "standardized_fractional_logit_ridge_v1",
    });
    const equalTaskMean = result.groupLossDeltas.reduce((sum, row) =>
      sum + row.candidateMinusBaseline, 0) / result.groupLossDeltas.length;
    expect(result.candidateMinusBaselineMeanSquaredError).toBeCloseTo(equalTaskMean, 12);
  });

  it("produces deterministic planning power without treating it as empirical evidence", () => {
    const input = {
      taskCounts: [8],
      standardizedMeanDeltas: [0, 2],
      trialCount: 100,
      seed: 71,
    } as const;
    const first = simulatePairedSignFlipPowerV1(input);
    const second = simulatePairedSignFlipPowerV1(input);
    expect(first).toEqual(second);
    expect(first[0].rejectionRate).toBeLessThanOrEqual(0.15);
    expect(first[1].rejectionRate).toBeGreaterThan(first[0].rejectionRate);
  });
});
