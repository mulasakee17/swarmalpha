import { describe, expect, it } from "vitest";
import {
  buildCollectiveDynamicsPostM2BridgePlanV1,
  verifyCollectiveDynamicsPostM2BridgePlanV1,
} from "../experiments/campaign/v6/collectiveDynamicsPostM2BridgePlanV1";
import { executeCollectiveDynamicsTrajectoryPublicV1 } from
  "../experiments/campaign/v6/runCollectiveDynamicsTrajectoryPublicV1";
import { verifyCollectiveDynamicsTrajectoryPilotPlanV1 } from
  "../experiments/campaign/v6/collectiveDynamicsTrajectoryPilotV1";
import type { SingleAttemptTextInvoker } from
  "../experiments/campaign/v6/providerAdapters";

describe("Collective Dynamics post-M2 bridge plan", () => {
  it("freezes the remaining development tasks and a zero-provider budget", () => {
    const plan = buildCollectiveDynamicsPostM2BridgePlanV1();
    verifyCollectiveDynamicsPostM2BridgePlanV1(plan);
    expect(() => verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan)).not.toThrow();
    expect(plan.sourceTaskIds).toEqual([36, 43, 50, 57, 64]);
    expect(plan.sourceAgentCounts).toEqual([4, 4, 3, 4, 4]);
    expect(plan.registeredAgentCount).toBe(19);
    expect(plan.publicCallCount).toBe(57);
    expect(plan.sensorCallCount).toBe(152);
    expect(plan.totalProviderCallCount).toBe(209);
    expect(plan.status).toBe("proposed_no_provider_calls_executed");
  });

  it("runs the bridge plan through the existing provider-neutral runner with a mock", async () => {
    const plan = buildCollectiveDynamicsPostM2BridgePlanV1();
    const invoker: SingleAttemptTextInvoker = {
      async invoke(request) {
        return { rawContent: `bridge:${request.requestId}` };
      },
    };
    const run = await executeCollectiveDynamicsTrajectoryPublicV1({
      plan,
      invoker,
      clock: (() => {
        let millis = Date.parse("2026-08-29T00:00:00.000Z");
        return () => new Date(millis++).toISOString();
      })(),
    });
    expect(run.providerCallCount).toBe(57);
    expect(run.taskArtifacts.map(artifact => artifact.onlineTask.sourceTaskId))
      .toEqual([36, 43, 50, 57, 64]);
    expect(run.taskArtifacts.every(artifact =>
      artifact.runId.startsWith("collective-dynamics-m2-bridge:"))).toBe(true);
  });
});
