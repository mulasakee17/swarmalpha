import { describe, expect, it } from "vitest";
import {
  appendDiscussionThermometerStateV1,
  projectDiscussionThermometerStateV1,
  projectDiscussionThermometerTrajectoryV1,
  projectDiscussionThermometerTransitionV1,
  verifyDiscussionThermometerStateV1,
  verifyDiscussionThermometerTrajectoryV1,
  type DiscussionThermometerInputV1,
} from "../src/lib/epistemic";

const sensorRef = { id: "sensor:canonical-probability", version: "2.0.0" };

function input(
  checkpointId: string,
  checkpointIndex: number,
  vectors: Record<string, [number, number, number]>,
): DiscussionThermometerInputV1 {
  return {
    claimId: "claim:test",
    checkpointId,
    checkpointIndex,
    optionIds: ["opt_1", "opt_2", "opt_3"],
    expectedAgentIds: Object.keys(vectors),
    reportPairs: Object.entries(vectors).map(([agentId, values]) => ({
      agentId,
      A: { status: "valid", probabilitiesByOptionId: {
        opt_1: values[0], opt_2: values[1], opt_3: values[2],
      } },
      B: { status: "valid", probabilitiesByOptionId: {
        opt_1: values[0], opt_2: values[1], opt_3: values[2],
      } },
    })),
    sensorRef,
    snapshotHash: `sha256:${String.fromCharCode(97 + checkpointIndex % 26).repeat(64)}`,
  };
}

describe("discussion thermometer v1", () => {
  it("projects a reproducible truth-blind continuous macrostate", () => {
    const source = input("X0", 0, {
      agent_1: [0.6, 0.3, 0.1],
      agent_2: [0.2, 0.7, 0.1],
    });
    const state = projectDiscussionThermometerStateV1(source);
    verifyDiscussionThermometerStateV1(source, state);
    expect(state.roster.coverage).toBe(1);
    expect(state.measurement.meanReplicateTotalVariation).toBe(0);
    expect(state.macrostate.pooledProbabilitiesByOptionId).toEqual({
      opt_1: 0.4, opt_2: 0.5, opt_3: 0.1,
    });
    expect(state.macrostate.pooledConcentration).toBe(0.5);
    expect(state.macrostate.pottsStyleOrder).toBe(0.25);
    expect(state.macrostate.meanPairwiseTotalVariation).toBeCloseTo(0.4, 12);
    expect(state.macrostate.maxPairwiseTotalVariation).toBeCloseTo(0.4, 12);
    const serialized = JSON.stringify(state);
    expect(serialized).not.toMatch(/groundTruth|outcomeOptionId|correctAnswer|brier/i);
  });

  it("detects continuous movement even when every categorical top stays unchanged", () => {
    const from = projectDiscussionThermometerStateV1(input("X0", 0, {
      agent_1: [0.55, 0.45, 0],
      agent_2: [0.6, 0.4, 0],
    }));
    const to = projectDiscussionThermometerStateV1(input("X1", 1, {
      agent_1: [0.9, 0.1, 0],
      agent_2: [0.8, 0.2, 0],
    }));
    const transition = projectDiscussionThermometerTransitionV1({ from, to });
    expect(transition.meanAgentTotalVariation).toBeCloseTo(0.275, 12);
    expect(transition.pooledTotalVariation).toBeCloseTo(0.275, 12);
    expect(transition.deltas.pooledConcentration).toBeCloseTo(0.275, 12);
    expect(transition.repeatabilityReference.comparison).toBe("above_reference");
    expect(transition.repeatabilityReference.comparisonSemantics)
      .toBe("aggregate_reference_only");
    expect(transition.repeatabilityReference.replicateComparableAgentIds)
      .toEqual(["agent_1", "agent_2"]);
    expect(transition.repeatabilityReference
      .primaryActivityAboveBothEndpointRepeatabilitiesAgentIds)
      .toEqual(["agent_1", "agent_2"]);
    expect(transition.repeatabilityReference
      .primaryActivityAboveBothEndpointRepeatabilitiesFraction).toBe(1);
  });

  it("keeps a valid primary belief when only the quality-control repeat is unavailable", () => {
    const source = input("X0", 0, {
      agent_1: [0.6, 0.3, 0.1],
      agent_2: [0.2, 0.7, 0.1],
    });
    source.reportPairs[1].B = { status: "unavailable", reason: "provider_timeout" };
    const state = projectDiscussionThermometerStateV1(source);
    expect(state.roster.activeAgentIds).toEqual(["agent_1", "agent_2"]);
    expect(state.roster.missingAgentIds).toEqual([]);
    expect(state.roster.coverage).toBe(1);
    expect(state.measurement.validPrimaryReportCount).toBe(2);
    expect(state.measurement.validRepeatPairCount).toBe(1);
    expect(state.measurement.replicateTotalVariationByAgentId).toEqual({ agent_1: 0 });
    expect(state.microstate.beliefProbabilitiesByAgentId.agent_2).toEqual({
      opt_1: 0.2, opt_2: 0.7, opt_3: 0.1,
    });
  });

  it("marks an agent missing only when its primary belief report is unavailable", () => {
    const source = input("X0", 0, {
      agent_1: [0.6, 0.3, 0.1],
      agent_2: [0.2, 0.7, 0.1],
    });
    source.reportPairs[1].A = { status: "unavailable", reason: "primary_parse_failure" };
    const state = projectDiscussionThermometerStateV1(source);
    expect(state.roster.activeAgentIds).toEqual(["agent_1"]);
    expect(state.roster.missingAgentIds).toEqual(["agent_2"]);
    expect(state.roster.coverage).toBe(0.5);
    expect(state.roster.missingReasonByAgentId).toEqual({
      agent_2: "primary_parse_failure",
    });
  });

  it("keeps directly observed public choices as a separate cross-check channel", () => {
    const source = input("X0", 0, {
      agent_1: [0.6, 0.3, 0.1],
      agent_2: [0.2, 0.7, 0.1],
      agent_3: [0.4, 0.4, 0.2],
    });
    source.publicChoiceByAgentId = {
      agent_1: "opt_1",
      agent_2: "opt_1",
      agent_3: "opt_2",
    };
    const state = projectDiscussionThermometerStateV1(source);
    expect(state.behavioralCrossCheck.status).toBe("available");
    expect(state.behavioralCrossCheck.choiceShareByOptionId).toEqual({
      opt_1: 2 / 3, opt_2: 1 / 3, opt_3: 0,
    });
    expect(state.behavioralCrossCheck.majorityChoiceShare).toBe(2 / 3);
    expect(state.behavioralCrossCheck.beliefChoiceComparableAgentCount).toBe(3);
    expect(state.behavioralCrossCheck.beliefTopChoiceCompatibilityRate).toBe(2 / 3);
  });

  it("fails closed on malformed probability vectors", () => {
    const source = input("X0", 0, { agent_1: [0.6, 0.3, 0.1] });
    const replicate = source.reportPairs[0].A;
    if (replicate.status !== "valid") throw new Error("test_fixture_invalid");
    replicate.probabilitiesByOptionId.opt_1 = 0.8;
    expect(() => projectDiscussionThermometerStateV1(source))
      .toThrow("discussion_thermometer_probability_sum_invalid");
  });

  it("keeps full microstate because identical q, U, and J can hide different geometry", () => {
    const binaryEntropy = (probability: number) => -(probability * Math.log2(probability)
      + (1 - probability) * Math.log2(1 - probability));
    let lower = 0.5;
    let upper = 1;
    for (let iteration = 0; iteration < 100; iteration += 1) {
      const middle = (lower + upper) / 2;
      if (binaryEntropy(middle) > 0.5) lower = middle;
      else upper = middle;
    }
    const p = (lower + upper) / 2;
    const make = (claimId: string, vectors: Record<string, [number, number]>) =>
      projectDiscussionThermometerStateV1({
        claimId, checkpointId: `${claimId}:X0`, checkpointIndex: 0,
        optionIds: ["opt_1", "opt_2"], expectedAgentIds: Object.keys(vectors),
        reportPairs: Object.entries(vectors).map(([agentId, values]) => ({
          agentId,
          A: { status: "valid", probabilitiesByOptionId: { opt_1: values[0], opt_2: values[1] } },
          B: { status: "unavailable", reason: "test_not_required" },
        })),
        sensorRef: { id: "sensor:test", version: "1" },
        snapshotHash: `sha256:${"d".repeat(64)}`,
      });
    const polarized = make("claim:polarized", {
      a1: [p, 1 - p], a2: [p, 1 - p], a3: [1 - p, p], a4: [1 - p, p],
    });
    const mixed = make("claim:mixed", {
      b1: [1, 0], b2: [0, 1], b3: [0.5, 0.5], b4: [0.5, 0.5],
    });
    expect(polarized.macrostate.pooledProbabilitiesByOptionId)
      .toEqual(mixed.macrostate.pooledProbabilitiesByOptionId);
    expect(polarized.macrostate.meanNormalizedReportEntropy)
      .toBeCloseTo(mixed.macrostate.meanNormalizedReportEntropy!, 12);
    expect(polarized.macrostate.normalizedGeneralizedJsd)
      .toBeCloseTo(mixed.macrostate.normalizedGeneralizedJsd!, 12);
    expect(polarized.macrostate.maxPairwiseTotalVariation)
      .not.toBeCloseTo(mixed.macrostate.maxPairwiseTotalVariation!, 3);
  });

  it("enforces pooled-drift contraction on a complete matched roster", () => {
    const from = projectDiscussionThermometerStateV1(input("X0", 0, {
      agent_1: [0.8, 0.1, 0.1], agent_2: [0.2, 0.7, 0.1],
    }));
    const to = projectDiscussionThermometerStateV1(input("X1", 1, {
      agent_1: [0.5, 0.4, 0.1], agent_2: [0.4, 0.5, 0.1],
    }));
    const transition = projectDiscussionThermometerTransitionV1({ from, to });
    expect(transition.completeMatchedRoster).toBe(true);
    expect(transition.pooledTotalVariation!).toBeLessThanOrEqual(
      transition.meanAgentTotalVariation! + 1e-12,
    );
  });

  it("appends prefix-causal real-time readings without changing earlier hashes", () => {
    const x0 = projectDiscussionThermometerStateV1(input("X0", 0, {
      agent_1: [0.6, 0.3, 0.1], agent_2: [0.2, 0.7, 0.1],
    }));
    const x1 = projectDiscussionThermometerStateV1(input("X1", 1, {
      agent_1: [0.7, 0.2, 0.1], agent_2: [0.3, 0.6, 0.1],
    }));
    const x2 = projectDiscussionThermometerStateV1(input("X2", 2, {
      agent_1: [0.8, 0.1, 0.1], agent_2: [0.4, 0.5, 0.1],
    }));
    const first = projectDiscussionThermometerTrajectoryV1([x0]);
    const second = appendDiscussionThermometerStateV1({ trajectory: first, state: x1 });
    const third = appendDiscussionThermometerStateV1({ trajectory: second, state: x2 });
    verifyDiscussionThermometerTrajectoryV1(third);
    expect(third.readings.map(reading => reading.contentHash).slice(0, 1))
      .toEqual(first.readings.map(reading => reading.contentHash));
    expect(third.readings.map(reading => reading.contentHash).slice(0, 2))
      .toEqual(second.readings.map(reading => reading.contentHash));
    expect(third.readings[0].transitionFromPrevious).toBeNull();
    expect(third.readings[2].transitionFromPrevious?.fromStateHash).toBe(x1.contentHash);
    expect(third.readings[2].transitionFromPrevious?.toStateHash).toBe(x2.contentHash);
    expect(third.prefixCausal).toBe(true);
    expect(third.writeback).toBe("none");
    expect(JSON.stringify(third)).not.toMatch(
      /groundTruth|correctAnswer|brier|actionRecommendation|futureState/i,
    );
  });

  it("marks partial real-time coverage and rejects chronology or sensor drift", () => {
    const x0Input = input("X0", 0, {
      agent_1: [0.6, 0.3, 0.1], agent_2: [0.2, 0.7, 0.1],
    });
    x0Input.reportPairs[1].A = { status: "unavailable", reason: "primary_timeout" };
    const x0 = projectDiscussionThermometerStateV1(x0Input);
    const trajectory = projectDiscussionThermometerTrajectoryV1([x0]);
    expect(trajectory.readings[0].stateStatus).toBe("partial");

    const duplicateIndex = projectDiscussionThermometerStateV1(input("X0-again", 0, {
      agent_1: [0.5, 0.4, 0.1], agent_2: [0.3, 0.6, 0.1],
    }));
    expect(() => appendDiscussionThermometerStateV1({
      trajectory, state: duplicateIndex,
    })).toThrow("discussion_thermometer_trajectory_checkpoint_order_invalid");

    const changedSensorInput = input("X1", 1, {
      agent_1: [0.5, 0.4, 0.1], agent_2: [0.3, 0.6, 0.1],
    });
    changedSensorInput.sensorRef = { id: "sensor:changed", version: "1" };
    const changedSensor = projectDiscussionThermometerStateV1(changedSensorInput);
    expect(() => appendDiscussionThermometerStateV1({
      trajectory, state: changedSensor,
    })).toThrow("discussion_thermometer_trajectory_contract_drift");
  });
});
