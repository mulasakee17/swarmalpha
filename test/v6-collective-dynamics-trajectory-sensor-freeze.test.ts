import { describe, expect, it } from "vitest";
import { createHiddenBenchTaskProjectionV1 } from
  "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import {
  buildCollectiveDynamicsTrajectoryPilotPlanV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectoryPilotV1";
import {
  buildCollectiveDynamicsTrajectoryPublicArtifactV1,
  type CollectiveDynamicsTrajectoryPublicCallRefV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectoryCheckpointV1";
import {
  buildCollectiveDynamicsTrajectorySensorFreezeV1,
  verifyCollectiveDynamicsTrajectorySensorFreezeV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectorySensorFreezeV1";
import type { V6PublicTranscriptEntry } from
  "../experiments/campaign/v6/productionVerticalSlice";

const TASK_IDS = [1, 8, 15, 22, 29] as const;

function artifactFor(sourceTaskId: typeof TASK_IDS[number]) {
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
  const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
  return buildCollectiveDynamicsTrajectoryPublicArtifactV1({
    plan,
    sourceTaskId,
    runId: `collective-dynamics-m2:${sourceTaskId}:seed-1`,
    rounds,
  });
}

function fixture() {
  const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
  const artifacts = TASK_IDS.map(artifactFor);
  return {
    plan,
    artifacts,
    freeze: buildCollectiveDynamicsTrajectorySensorFreezeV1({ plan, artifacts }),
  };
}

describe("Collective Dynamics M2 canonical sensor freeze", () => {
  it("freezes 76 views and 152 canonical requests after public trajectories", () => {
    const { plan, artifacts, freeze } = fixture();
    expect(() => verifyCollectiveDynamicsTrajectorySensorFreezeV1({
      plan, artifacts, freeze,
    })).not.toThrow();
    expect(freeze).toMatchObject({
      registeredTrajectoryCount: 5,
      registeredViewCount: 76,
      registeredCellCount: 152,
      responseContract: "strict_categorical_probabilities_only_v1",
      truthAccess: "none",
    });
    expect(freeze.views[0].checkpointRound).toBe(0);
    expect(freeze.views[0].ownPublicMessage).toBeNull();
    expect(freeze.cells[0].checkpointRound).toBe(0);
    expect(freeze.cells[0].repeatLabel).toBe("A");
  });

  it("reuses the canonical prompt renderer while preserving checkpoint windows", () => {
    const { freeze } = fixture();
    const x0 = freeze.cells.find(cell => cell.checkpointRound === 0)!;
    const x1 = freeze.cells.find(cell => cell.checkpointRound === 1)!;
    expect(x0.request.responseFormat).toBe("json");
    expect(x0.request.userPrompt).toContain("YOUR_PUBLIC_MESSAGE_AT_CHECKPOINT_JSON:\nnull");
    expect(x1.request.userPrompt).toContain("YOUR_PUBLIC_MESSAGE_AT_CHECKPOINT_JSON:");
    expect(x1.request.userPrompt).not.toContain("leaked-prior-round");
    expect(new Set(freeze.cells.map(cell => cell.requestHash)).size).toBe(152);
  });

  it("rejects post-freeze request or prompt drift", () => {
    const { plan, artifacts, freeze } = fixture();
    const tampered = structuredClone(freeze);
    tampered.cells[0].request.userPrompt += "\nforged";
    expect(() => verifyCollectiveDynamicsTrajectorySensorFreezeV1({
      plan, artifacts, freeze: tampered,
    })).toThrow("trajectory_sensor_freeze_drift");
  });
});
