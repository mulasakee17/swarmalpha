import { describe, expect, it } from "vitest";
import { projectTrajectoryThermometerStateV1 } from
  "../experiments/campaign/v6/collectiveDynamicsTrajectoryThermometerAdapterV1";

describe("trajectory thermometer adapter v1", () => {
  it("uses repeat A as belief and repeat B only as a quality cross-check", () => {
    const state = projectTrajectoryThermometerStateV1({
      sourceTaskId: 14,
      checkpointRound: 1,
      optionIds: ["opt_1", "opt_2"],
      expectedAgentIds: ["a", "b"],
      snapshotHash: `sha256:${"b".repeat(64)}`,
      units: [
        {
          agentId: "a", checkpointRound: 1,
          repeatStatuses: { A: "valid", B: "valid" },
          repeatA: { optionIds: ["opt_1", "opt_2"], values: [0.8, 0.2] },
          repeatB: { optionIds: ["opt_1", "opt_2"], values: [0.6, 0.4] },
        },
        {
          agentId: "b", checkpointRound: 1,
          repeatStatuses: { A: "valid", B: "provider_timeout" },
          repeatA: { optionIds: ["opt_1", "opt_2"], values: [0.4, 0.6] },
          repeatB: null,
        },
      ],
    });
    expect(state.microstate.beliefProbabilitiesByAgentId).toEqual({
      a: { opt_1: 0.8, opt_2: 0.2 },
      b: { opt_1: 0.4, opt_2: 0.6 },
    });
    expect(state.macrostate.pooledProbabilitiesByOptionId).toEqual({
      opt_1: 0.6000000000000001,
      opt_2: 0.4,
    });
    expect(state.measurement.validPrimaryReportCount).toBe(2);
    expect(state.measurement.validRepeatPairCount).toBe(1);
    expect(state.measurement.replicateTotalVariationByAgentId.a).toBeCloseTo(0.2, 12);
  });
});
