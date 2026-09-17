import { describe, expect, it } from "vitest";
import { createHiddenBenchTaskProjectionV1 } from
  "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import { buildCollectiveDynamicsTrajectoryPilotPlanV1 } from
  "../experiments/campaign/v6/collectiveDynamicsTrajectoryPilotV1";
import {
  buildCollectiveDynamicsTrajectoryPublicArtifactV1,
  type CollectiveDynamicsTrajectoryPublicCallRefV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectoryCheckpointV1";
import { buildCollectiveDynamicsTrajectorySensorFreezeV1 } from
  "../experiments/campaign/v6/collectiveDynamicsTrajectorySensorFreezeV1";
import { executeCollectiveDynamicsTrajectorySensorV1 } from
  "../experiments/campaign/v6/runCollectiveDynamicsTrajectorySensorV1";
import { analyzeCollectiveDynamicsTrajectoryV1 } from
  "../experiments/campaign/v6/analyze_v6_collective_dynamics_trajectory_v1";
import { buildCollectiveDynamicsCrossChannelReviewV1 } from
  "../experiments/campaign/v6/build_v6_collective_dynamics_cross_channel_review_v1";
import type { V6PublicTranscriptEntry } from
  "../experiments/campaign/v6/productionVerticalSlice";

const TASK_IDS = [1, 8, 15, 22, 29] as const;

function fixture() {
  const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
  const artifacts = TASK_IDS.map(sourceTaskId => {
    const task = createHiddenBenchTaskProjectionV1({ sourceTaskId }).adapter.task;
    const rounds = [1, 2, 3].map(round => {
      const messages: V6PublicTranscriptEntry[] = task.agents.map(agent => ({
        round,
        agentId: agent.agentId,
        content: `public-r${round}-${agent.agentId}`,
        source: "agent",
      }));
      const calls: CollectiveDynamicsTrajectoryPublicCallRefV1[] = task.agents.map((agent, index) => ({
        requestId: `discussion:collective-dynamics-m2:${sourceTaskId}:seed-1:r${round}:${agent.agentId}`,
        round: round as 1 | 2 | 3,
        agentId: agent.agentId,
        requestHash: `sha256:${String(sourceTaskId).padStart(2, "0")}${String(round)}${String(index).padStart(61, "0")}`,
        responseHash: `sha256:${String(sourceTaskId).padStart(2, "0")}${String(round + 3)}${String(index).padStart(61, "0")}`,
      }));
      return { round: round as 1 | 2 | 3, messages, calls };
    }) as unknown as Parameters<typeof buildCollectiveDynamicsTrajectoryPublicArtifactV1>[0]["rounds"];
    return buildCollectiveDynamicsTrajectoryPublicArtifactV1({
      plan,
      sourceTaskId,
      runId: `collective-dynamics-m2:${sourceTaskId}:seed-1`,
      rounds,
    });
  });
  const freeze = buildCollectiveDynamicsTrajectorySensorFreezeV1({ plan, artifacts });
  return { plan, artifacts, freeze };
}

function clock(): () => string {
  let millis = Date.parse("2026-08-28T00:00:00.000Z");
  return () => new Date(millis++).toISOString();
}

describe("Collective Dynamics M2 trajectory analyzer", () => {
  it("keeps exact-repeat noise, truth-blind state, and outcome evaluation separate", async () => {
    const { plan, artifacts, freeze } = fixture();
    const run = await executeCollectiveDynamicsTrajectorySensorV1({
      plan,
      artifacts,
      freeze,
      clock: clock(),
      invoker: {
        async invoke(request) {
          const checkpoint = Number(request.requestId.match(/:X([0-3]):/)![1]);
          const probabilities = checkpoint === 1 || checkpoint === 2
            ? { opt_1: 0.1, opt_2: 0.8, opt_3: 0.1 }
            : { opt_1: 0.8, opt_2: 0.1, opt_3: 0.1 };
          return { rawContent: JSON.stringify({ probabilities }) };
        },
      },
    });
    const analysis = analyzeCollectiveDynamicsTrajectoryV1({ plan, freeze, run });
    expect(analysis.summary.validCellCount).toBe(152);
    expect(analysis.summary.validUnitCount).toBe(76);
    expect(analysis.summary.completeCheckpointCount).toBe(20);
    expect(analysis.summary.completeAdjacentTransitionCount).toBe(15);
    expect(analysis.summary.exactDuplicatePairCount).toBe(76);
    expect(analysis.summary.meanDuplicateTotalVariation).toBe(0);
    expect(analysis.checkpointRows.every(row =>
      row.reportedState.normalizedGeneralizedJsd === 0
      && row.reportedState.maxPairwiseTotalVariation === 0)).toBe(true);
    analysis.transitionRows.forEach(row => {
      expect(row.reportedTransition.meanAgentActivity)
        .toBeCloseTo(row.reportedTransition.pooledDrift!, 12);
    });
    expect(analysis.summary.adjacentTransitionCountActivityExceedsDuplicateMean).toBe(10);
    expect(analysis.summary.taskCountWithActivityExceedingDuplicateMean).toBe(5);
    expect(analysis.summary.adjacentTransitionCountWithMajorityReplicateSeparation).toBe(10);
    expect(analysis.summary.taskCountWithMajorityReplicateSeparation).toBe(5);
    expect(analysis.transitionRows.filter(row =>
      row.reportedTransition.replicateSeparation.majoritySeparated === true).length).toBe(10);
    expect(JSON.stringify(analysis.checkpointRows.map(row => row.reportedState)))
      .not.toMatch(/outcome|brier|correct/i);
    expect(analysis.decision.candidateBlockers).not.toContain("one_interrupted_sensor_cell");

    const review = buildCollectiveDynamicsCrossChannelReviewV1({ plan, artifacts, analysis });
    expect(review.rows).toHaveLength(15);
    expect(review.timeAlignment).toBe("checkpoint_t_predicts_public_round_t_plus_1");
    expect(review.semanticInference).toBe("none_human_coding_required");
    expect(review.rows[0]).toMatchObject({ checkpointRound: 0, nextPublicRound: 1 });
    expect(review.rows[2]).toMatchObject({ checkpointRound: 2, nextPublicRound: 3 });
    expect(review.rows[0].optionMapping).toEqual(
      artifacts[0].onlineTask.claim.options.map((publicOptionLabel, index) => ({
        sensorOptionId: `opt_${index + 1}`,
        publicOptionLabel,
      })),
    );
    expect(review.rows[0].nextPublicMessages[0].content)
      .toBe(`public-r1-${artifacts[0].onlineTask.agents[0].agentId}`);
    expect(review.rows.every(row => row.sensorReports.length === row.expectedAgentIds.length))
      .toBe(true);
    expect(JSON.stringify(review)).not.toMatch(/outcome|brier|ground.?truth|correctAnswer/i);
  });
});
