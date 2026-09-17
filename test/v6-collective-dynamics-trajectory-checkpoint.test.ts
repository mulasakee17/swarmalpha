import { describe, expect, it } from "vitest";
import { createHiddenBenchTaskProjectionV1 } from
  "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import {
  buildCollectiveDynamicsTrajectoryPilotPlanV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectoryPilotV1";
import {
  hashCollectiveDynamicsValueV1,
} from "../experiments/campaign/v6/collectiveDynamicsV1";
import {
  buildCollectiveDynamicsTrajectoryPublicArtifactV1,
  buildCollectiveDynamicsTrajectorySensorViewV1,
  verifyCollectiveDynamicsTrajectoryPublicArtifactV1,
  verifyCollectiveDynamicsTrajectorySensorViewV1,
  type CollectiveDynamicsTrajectoryPublicCallRefV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectoryCheckpointV1";
import type { V6PublicTranscriptEntry } from
  "../experiments/campaign/v6/productionVerticalSlice";

function refs(taskId: 1 | 8 | 15 | 22 | 29, round: 1 | 2 | 3): {
  messages: V6PublicTranscriptEntry[];
  calls: CollectiveDynamicsTrajectoryPublicCallRefV1[];
} {
  const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task;
  return {
    messages: task.agents.map(agent => ({
      round,
      agentId: agent.agentId,
      content: `round-${round}-${agent.agentId}`,
      source: "agent",
    })),
    calls: task.agents.map((agent, index) => ({
      requestId: `discussion:collective-dynamics-m2:${taskId}:seed-1:r${round}:${agent.agentId}`,
      round,
      agentId: agent.agentId,
      requestHash: `sha256:${String(taskId).padStart(2, "0")}${String(round)}${String(index).padStart(61, "0")}`,
      responseHash: `sha256:${String(taskId).padStart(2, "0")}${String(round + 3)}${String(index).padStart(61, "0")}`,
    })),
  };
}

function makeArtifact() {
  const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
  const taskId = 8 as const;
  const rounds = [1, 2, 3].map(round => ({
    round: round as 1 | 2 | 3,
    ...refs(taskId, round as 1 | 2 | 3),
  })) as unknown as Parameters<typeof buildCollectiveDynamicsTrajectoryPublicArtifactV1>[0]["rounds"];
  return {
    plan,
    artifact: buildCollectiveDynamicsTrajectoryPublicArtifactV1({
      plan,
      sourceTaskId: taskId,
      runId: "collective-dynamics-m2:8:seed-1",
      rounds,
    }),
  };
}

describe("Collective Dynamics M2 checkpoint binding", () => {
  it("represents X0 without a fabricated provider request and binds X1-X3", () => {
    const { plan, artifact } = makeArtifact();
    expect(() => verifyCollectiveDynamicsTrajectoryPublicArtifactV1(artifact, plan)).not.toThrow();
    expect(artifact.checkpoints.map(checkpoint => checkpoint.checkpointRound)).toEqual([0, 1, 2, 3]);
    expect(artifact.checkpoints[0].visibleMessages).toEqual([]);
    expect(artifact.checkpoints[0].sourceRequestHashes).toEqual([]);
    expect(artifact.checkpoints.slice(1).every(checkpoint => checkpoint.sourceRequestHashes.length === 3)).toBe(true);
  });

  it("derives agent-specific truth-blind views from the frozen checkpoint", () => {
    const { plan, artifact } = makeArtifact();
    const agentId = artifact.onlineTask.agents[0].agentId;
    const x0 = buildCollectiveDynamicsTrajectorySensorViewV1({
      artifact, plan, agentId, checkpointRound: 0,
    });
    const x2 = buildCollectiveDynamicsTrajectorySensorViewV1({
      artifact, plan, agentId, checkpointRound: 2,
    });
    expect(() => verifyCollectiveDynamicsTrajectorySensorViewV1({
      view: x0, artifact, plan,
    })).not.toThrow();
    expect(() => verifyCollectiveDynamicsTrajectorySensorViewV1({
      view: x2, artifact, plan,
    })).not.toThrow();
    expect(x0.ownPublicMessage).toBeNull();
    expect(x0.peerPublicMessages).toEqual([]);
    expect(x2.ownPublicMessage?.round).toBe(2);
    expect(x2.peerPublicMessages).toHaveLength(2);
    expect(x2.sourceTrajectoryHash).toBe(artifact.contentHash);
    expect(JSON.stringify(x2)).not.toMatch(/correctAnswer|correct_answer|groundTruth|ground_truth|"outcome"/);
  });

  it("rejects cumulative visibility and post-freeze source drift", () => {
    const { plan, artifact } = makeArtifact();
    const tampered = structuredClone(artifact);
    tampered.checkpoints[2].visibleMessages.push({
      round: 1,
      agentId: artifact.onlineTask.agents[0].agentId,
      content: "leaked-prior-round",
      source: "agent",
    });
    expect(() => verifyCollectiveDynamicsTrajectoryPublicArtifactV1(tampered, plan))
      .toThrow("trajectory_public_artifact_drift");
  });

  it("does not accept a self-rehashed view from another trajectory", () => {
    const { plan, artifact } = makeArtifact();
    const view = buildCollectiveDynamicsTrajectorySensorViewV1({
      artifact,
      plan,
      agentId: artifact.onlineTask.agents[0].agentId,
      checkpointRound: 1,
    });
    const { contentHash: _oldHash, ...body } = view;
    const forged = {
      ...body,
      sourceTrajectoryHash: `sha256:${"a".repeat(64)}`,
      contentHash: hashCollectiveDynamicsValueV1({
        ...body,
        sourceTrajectoryHash: `sha256:${"a".repeat(64)}`,
      }),
    };
    expect(() => verifyCollectiveDynamicsTrajectorySensorViewV1({
      view: forged,
      artifact,
      plan,
    })).toThrow("trajectory_sensor_view_binding_invalid");
  });

  it("fails closed when a public round is incomplete", () => {
    const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    const one = refs(1, 1);
    const two = refs(1, 2);
    const three = refs(1, 3);
    expect(() => buildCollectiveDynamicsTrajectoryPublicArtifactV1({
      plan,
      sourceTaskId: 1,
      runId: "collective-dynamics-m2:1:seed-1",
      rounds: [
        { round: 1, ...one, messages: one.messages.slice(1) },
        { round: 2, ...two },
        { round: 3, ...three },
      ],
    })).toThrow("trajectory_public_round_messages_invalid");
  });
});
