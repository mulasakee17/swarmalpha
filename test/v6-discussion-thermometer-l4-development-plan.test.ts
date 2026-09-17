import { describe, expect, it } from "vitest";
import {
  buildDiscussionThermometerL4DevelopmentStage1PlanV1,
  estimatedObservedCostCnyV1,
  verifyDiscussionThermometerL4DevelopmentStage1PlanV1,
} from "../experiments/campaign/v6/discussionThermometerL4DevelopmentPlanV1";
import { executeCollectiveDynamicsTrajectoryPublicV1 } from
  "../experiments/campaign/v6/runCollectiveDynamicsTrajectoryPublicV1";
import { buildCollectiveDynamicsTrajectorySensorFreezeV1 } from
  "../experiments/campaign/v6/collectiveDynamicsTrajectorySensorFreezeV1";
import { executeCollectiveDynamicsTrajectorySensorV1 } from
  "../experiments/campaign/v6/runCollectiveDynamicsTrajectorySensorV1";
import type { SingleAttemptTextInvoker } from
  "../experiments/campaign/v6/providerAdapters";

function clock(): () => string {
  let millis = Date.parse("2026-08-30T00:00:00.000Z");
  return () => new Date(millis++).toISOString();
}

describe("discussion thermometer L4 development Stage 1", () => {
  it("freezes seven semantic-family representatives and exactly 203 attempts", () => {
    const plan = buildDiscussionThermometerL4DevelopmentStage1PlanV1();
    expect(plan.sourceTaskIds).toEqual([5, 7, 13, 11, 16, 3, 14]);
    expect(plan).toMatchObject({
      registeredAgentCount: 28,
      publicResponseContract: "choice_message_json_v1",
      publicCallCount: 84,
      sensorCallCount: 119,
      totalProviderCallCount: 203,
      sensorEstimator: "primary_only_with_one_stratified_duplicate_per_task",
    });
    expect(() => verifyDiscussionThermometerL4DevelopmentStage1PlanV1(plan)).not.toThrow();
    expect(estimatedObservedCostCnyV1({ promptTokens: 100_000, completionTokens: 20_000 }))
      .toBeCloseTo(0.16, 12);
  });

  it("reuses the trajectory engine with structured choices and selective duplicate sensors", async () => {
    const plan = buildDiscussionThermometerL4DevelopmentStage1PlanV1();
    let publicCalls = 0;
    const publicInvoker: SingleAttemptTextInvoker = {
      async invoke(request) {
        publicCalls += 1;
        expect(request.responseFormat).toBe("json");
        return {
          rawContent: JSON.stringify({
            choiceId: "opt_1",
            message: `Evidence assessment for ${request.requestId}`,
          }),
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        };
      },
    };
    const publicRun = await executeCollectiveDynamicsTrajectoryPublicV1({
      plan,
      invoker: publicInvoker,
      clock: clock(),
    });
    expect(publicCalls).toBe(84);
    expect(publicRun.terminals.every(terminal => terminal.status === "valid"
      && terminal.parsedPublicTurn?.choiceId === "opt_1")).toBe(true);
    expect(publicRun.taskArtifacts[0].rounds[0].messages[0].content)
      .toMatch(/^\[choiceId=opt_1\]/);

    const freeze = buildCollectiveDynamicsTrajectorySensorFreezeV1({
      plan,
      artifacts: publicRun.taskArtifacts,
    });
    expect(freeze.registeredTrajectoryCount).toBe(7);
    expect(freeze.registeredViewCount).toBe(112);
    expect(freeze.registeredCellCount).toBe(119);
    expect(freeze.cells.filter(cell => cell.repeatLabel === "A")).toHaveLength(112);
    expect(freeze.cells.filter(cell => cell.repeatLabel === "B")).toHaveLength(7);
    expect(new Set(freeze.cells.filter(cell => cell.repeatLabel === "B")
      .map(cell => cell.sourceTaskId)).size).toBe(7);

    let sensorCalls = 0;
    const sensorInvoker: SingleAttemptTextInvoker = {
      async invoke(request) {
        sensorCalls += 1;
        const match = request.userPrompt.match(/OPTIONS_PRESENTATION_JSON:\n(\[.*?\])\n\nPROBABILITY_REPORT_INSTRUCTION/);
        const options = JSON.parse(match![1]) as Array<{ optionId: string }>;
        return {
          rawContent: JSON.stringify({
            probabilities: Object.fromEntries(options.map(option =>
              [option.optionId, 1 / options.length])),
          }),
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        };
      },
    };
    const sensorRun = await executeCollectiveDynamicsTrajectorySensorV1({
      plan,
      artifacts: publicRun.taskArtifacts,
      freeze,
      invoker: sensorInvoker,
      clock: clock(),
    });
    expect(sensorCalls).toBe(119);
    expect(sensorRun.terminals).toHaveLength(119);
    expect(sensorRun.terminals.every(terminal => terminal.status === "valid")).toBe(true);
  }, 30_000);

  it("fails closed on a malformed structured public choice", async () => {
    const plan = buildDiscussionThermometerL4DevelopmentStage1PlanV1();
    let calls = 0;
    await expect(executeCollectiveDynamicsTrajectoryPublicV1({
      plan,
      invoker: {
        async invoke() {
          calls += 1;
          return { rawContent: '{"choiceId":"opt_9","message":"invalid"}' };
        },
      },
      clock: clock(),
    })).rejects.toThrow(/trajectory_public_run_halted:invalid_response/);
    expect(calls).toBe(1);
  });
});
