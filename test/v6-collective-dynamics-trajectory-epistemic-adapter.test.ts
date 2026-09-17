import { describe, expect, it } from "vitest";
import { projectTrajectoryAveragedReportsV1 } from
  "../experiments/campaign/v6/collectiveDynamicsTrajectoryEpistemicAdapterV1";

describe("M2 trajectory adapter to the active epistemic kernel", () => {
  it("projects categorical reports without inventing evidence, influence, or truth", () => {
    const state = projectTrajectoryAveragedReportsV1({
      sourceTaskId: 1,
      checkpointRound: 2,
      optionIds: ["opt_1", "opt_2", "opt_3"],
      expectedAgentIds: ["a", "b", "missing"],
      reports: [
        { reportId: "r:a", agentId: "a", probabilitiesByOptionId: { opt_1: 0.8, opt_2: 0.1, opt_3: 0.1 } },
        { reportId: "r:b", agentId: "b", probabilitiesByOptionId: { opt_1: 0.2, opt_2: 0.7, opt_3: 0.1 } },
      ],
    });
    expect(state.populationBasis).toBe("declared_roster");
    expect(state.missingExpectedAgentIds).toEqual(["missing"]);
    expect(state.pooledBelief.kind).toBe("categorical");
    if (state.pooledBelief.kind !== "categorical") throw new Error("expected categorical pooled belief");
    expect(state.pooledBelief.probabilities.opt_1).toBeCloseTo(0.5);
    expect(state.pooledBelief.probabilities.opt_2).toBeCloseTo(0.4);
    expect(state.pooledBelief.probabilities.opt_3).toBeCloseTo(0.1);
    expect(state.betweenAgentDisagreement).toBeGreaterThan(0);
    expect(state.declaredLineageDiversity).toMatchObject({
      completeness: "missing",
      effectiveLineageCount: null,
      normalizedLineageEntropy: null,
    });
    expect(state.exposureConditionedRevision).toMatchObject({
      revisionCount: 0,
      meanBeliefDistance: null,
    });
    expect(state.observedResponseConcentration.status).toBe("unavailable");
    expect(JSON.stringify(state)).not.toMatch(/correctAnswer|groundTruth|outcome/);
  });
});
