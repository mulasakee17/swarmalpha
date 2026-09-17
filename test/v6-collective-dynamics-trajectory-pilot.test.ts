import { describe, expect, it } from "vitest";
import { createHiddenBenchTaskProjectionV1 } from
  "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import {
  buildCollectiveDynamicsTrajectoryPilotPlanV1,
  buildCollectiveDynamicsTrajectoryPublicRequestV1,
  verifyCollectiveDynamicsTrajectoryPilotPlanV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectoryPilotV1";
import type { V6PublicTranscriptEntry } from
  "../experiments/campaign/v6/productionVerticalSlice";

function messages(sourceTaskId: 1 | 8 | 15 | 22 | 29, round: number): V6PublicTranscriptEntry[] {
  const task = createHiddenBenchTaskProjectionV1({ sourceTaskId }).adapter.task;
  return task.agents.map(agent => ({
    round,
    agentId: agent.agentId,
    content: `public-r${round}-${agent.agentId}`,
    source: "agent",
  }));
}

describe("Collective Dynamics M2 trajectory pilot contract", () => {
  it("freezes the corrected two-repeat 209-call development scope", () => {
    const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    expect(() => verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan)).not.toThrow();
    expect(plan).toMatchObject({
      sourceTaskIds: [1, 8, 15, 22, 29],
      sourceAgentCounts: [4, 3, 4, 4, 4],
      registeredAgentCount: 19,
      publicCallCount: 57,
      sensorCallCount: 152,
      totalProviderCallCount: 209,
      publicResponseContract: "plain_text",
      sensorRepeats: ["A", "B"],
      truthAccess: "offline_analyzer_only",
      status: "proposed_no_provider_calls_executed",
    });
  });

  it("builds a truth-blind message-only R1 request with no transcript", () => {
    const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: 8 }).adapter.task;
    const request = buildCollectiveDynamicsTrajectoryPublicRequestV1({
      plan,
      sourceTaskId: 8,
      round: 1,
      agentId: task.agents[0].agentId,
      previousRoundMessages: [],
    });
    expect(request).toMatchObject({
      round: 1,
      protocol: "text_communication_v1",
      responseContract: "plain_text",
      visibleTranscript: [],
    });
    expect(JSON.stringify(request)).not.toMatch(
      /correctAnswer|correct_answer|groundTruth|ground_truth|resolvedOutcome|resolved_outcome|"outcome"/,
    );
  });

  it("exposes exactly the complete preceding round in frozen roster order", () => {
    const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: 1 }).adapter.task;
    const previous = messages(1, 1);
    const request = buildCollectiveDynamicsTrajectoryPublicRequestV1({
      plan,
      sourceTaskId: 1,
      round: 2,
      agentId: task.agents[1].agentId,
      previousRoundMessages: previous,
    });
    expect(request.visibleTranscript).toEqual(previous);
    expect(request.visibleTranscript.every(entry => entry.round === 1)).toBe(true);
  });

  it("rejects incomplete, cumulative, or within-round transcript leakage", () => {
    const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: 15 }).adapter.task;
    const base = {
      plan,
      sourceTaskId: 15 as const,
      round: 3 as const,
      agentId: task.agents[0].agentId,
    };
    expect(() => buildCollectiveDynamicsTrajectoryPublicRequestV1({
      ...base,
      previousRoundMessages: messages(15, 2).slice(1),
    })).toThrow("trajectory_pilot_previous_round_view_invalid");
    expect(() => buildCollectiveDynamicsTrajectoryPublicRequestV1({
      ...base,
      previousRoundMessages: [...messages(15, 1), ...messages(15, 2)],
    })).toThrow("trajectory_pilot_previous_round_view_invalid");
    expect(() => buildCollectiveDynamicsTrajectoryPublicRequestV1({
      ...base,
      previousRoundMessages: messages(15, 3),
    })).toThrow("trajectory_pilot_previous_round_view_invalid");
  });

  it("fails closed on plan drift", () => {
    const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    const tampered = { ...plan, totalProviderCallCount: 208 } as unknown as typeof plan;
    expect(() => verifyCollectiveDynamicsTrajectoryPilotPlanV1(tampered))
      .toThrow("trajectory_pilot_plan_drift");
  });
});
