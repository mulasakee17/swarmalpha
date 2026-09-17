import { describe, expect, it } from "vitest";
import { buildDiscussionThermometerReprojectionV1 } from
  "../experiments/campaign/v6/analyze_v6_discussion_thermometer_reprojection_v1";
import type {
  ThermometerReprojectionDatasetV1,
} from "../experiments/campaign/v6/analyze_v6_discussion_thermometer_reprojection_v1";

function dataset(): ThermometerReprojectionDatasetV1 {
  const optionIds = ["opt_1", "opt_2"];
  const expectedAgentIds = ["agent_1", "agent_2"];
  const unitRows = expectedAgentIds.flatMap(agentId => ([0, 1, 2, 3] as const).map(round => ({
    unitId: `${agentId}:X${round}`,
    sourceTaskId: 1,
    agentId,
    checkpointRound: round,
    repeatStatuses: { A: "valid", B: "valid" },
    pairStatus: "valid" as const,
    repeatA: { optionIds, values: agentId === "agent_1"
      ? [0.7 - round * 0.05, 0.3 + round * 0.05]
      : [0.3 + round * 0.05, 0.7 - round * 0.05] },
    repeatB: { optionIds, values: agentId === "agent_1"
      ? [0.7 - round * 0.05, 0.3 + round * 0.05]
      : [0.3 + round * 0.05, 0.7 - round * 0.05] },
    averagedReport: null,
    duplicateTotalVariation: 0,
    repeatUniqueTops: { A: null, B: null },
    averagedUniqueTop: null,
  })));
  const legacyCheckpointRows = ([0, 1, 2, 3] as const).map(checkpointRound => ({
    sourceTaskId: 1,
    checkpointRound,
    reportedState: {
      pooledProbabilities: { optionIds, values: [0.5, 0.5] },
      meanNormalizedReportEntropy: 1,
      normalizedGeneralizedJsd: 0,
      pooledConcentration: 0.5,
    },
  })) as unknown as ThermometerReprojectionDatasetV1["legacyCheckpointRows"];
  return {
    corpusId: "SYNTHETIC",
    planHash: "sha256:plan",
    freezeHash: "sha256:freeze",
    runHash: "sha256:run",
    legacyAnalysisHash: "sha256:analysis",
    tasks: [{
      sourceTaskId: 1,
      optionIds,
      expectedAgentIds,
      checkpointSnapshotHashes: {
        0: "sha256:x0", 1: "sha256:x1", 2: "sha256:x2", 3: "sha256:x3",
      },
    }],
    unitRows,
    legacyCheckpointRows,
  };
}

describe("discussion thermometer reprojection", () => {
  it("projects primary reports into four truth-blind states and three transitions", () => {
    const result = buildDiscussionThermometerReprojectionV1([dataset()]);
    expect(result.summary).toMatchObject({
      taskCount: 1,
      checkpointCount: 4,
      adjacentTransitionCount: 3,
      validPrimaryReportCount: 8,
      validRepeatPairCount: 8,
      fullCoverageCheckpointCount: 4,
      completeMatchedTransitionCount: 3,
      publicChoiceCrossCheckAvailableCheckpointCount: 0,
    });
    expect(result.datasets[0].states[0].inferenceStatus)
      .toBe("operational_self_reported_belief_state");
    expect(JSON.stringify(result)).not.toMatch(/groundTruth|correctAnswer|outcomeOptionId|brier/i);
  });
});
