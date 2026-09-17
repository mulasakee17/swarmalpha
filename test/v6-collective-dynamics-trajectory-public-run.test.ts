import { describe, expect, it } from "vitest";
import {
  buildCollectiveDynamicsTrajectoryPilotPlanV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectoryPilotV1";
import {
  executeCollectiveDynamicsTrajectoryPublicV1,
  verifyCollectiveDynamicsTrajectoryPublicRunV1,
} from "../experiments/campaign/v6/runCollectiveDynamicsTrajectoryPublicV1";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvoker,
} from "../experiments/campaign/v6/providerAdapters";

function clock(): () => string {
  let millis = Date.parse("2026-08-28T00:00:00.000Z");
  return () => new Date(millis++).toISOString();
}

describe("Collective Dynamics M2 public trajectory runner", () => {
  it("executes 57 message-only calls with synchronous previous-round visibility", async () => {
    const requests: SingleAttemptTextInvokeRequest[] = [];
    const invoker: SingleAttemptTextInvoker = {
      async invoke(request) {
        requests.push(structuredClone(request));
        return { rawContent: `public:${request.requestId}` };
      },
    };
    const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    const run = await executeCollectiveDynamicsTrajectoryPublicV1({
      plan,
      invoker,
      clock: clock(),
    });
    expect(requests).toHaveLength(57);
    expect(run.taskArtifacts).toHaveLength(5);
    expect(run.terminals).toHaveLength(57);
    expect(run.terminals.every(terminal => terminal.status === "valid")).toBe(true);
    expect(requests.every(request => request.responseFormat === "text")).toBe(true);
    expect(requests[0].userPrompt).toContain("Visible discussion transcript:\n(none)");
    const firstRoundTwo = requests.find(request => request.requestId.includes(":1:seed-1:r2:"))!;
    expect(firstRoundTwo.userPrompt).toContain("public:discussion:collective-dynamics-m2:1:seed-1:r1:");
    expect(firstRoundTwo.userPrompt).not.toContain(":r2:");
    expect(() => verifyCollectiveDynamicsTrajectoryPublicRunV1({ plan, artifact: run })).not.toThrow();
  });

  it("halts after a recorded provider failure and never retries", async () => {
    let calls = 0;
    const starts: number[] = [];
    const terminals: string[] = [];
    const invoker: SingleAttemptTextInvoker = {
      async invoke() {
        calls += 1;
        throw new Error("synthetic-provider-failure");
      },
    };
    await expect(executeCollectiveDynamicsTrajectoryPublicV1({
      invoker,
      clock: clock(),
      onStart: event => starts.push(event.sequence),
      onTerminal: event => terminals.push(event.status),
    })).rejects.toThrow("trajectory_public_run_halted:provider_error");
    expect(calls).toBe(1);
    expect(starts).toEqual([1]);
    expect(terminals).toEqual(["provider_error"]);
  });
});
