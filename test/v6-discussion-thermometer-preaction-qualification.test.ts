import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFrozenCollectiveDynamicsTrajectorySensorV1 } from
  "../experiments/campaign/v6/run_v6_collective_dynamics_trajectory_sensor_v1";
import type { CollectiveDynamicsTrajectoryPublicRunV1 } from
  "../experiments/campaign/v6/runCollectiveDynamicsTrajectoryPublicV1";
import {
  analyzeDiscussionThermometerPreActionV1,
  buildDiscussionThermometerPreActionFreezeV1,
  executeDiscussionThermometerPreActionV1,
  preflightDiscussionThermometerPreActionV1,
  verifyDiscussionThermometerPreActionFreezeV1,
  verifyDiscussionThermometerPreActionRunV1,
} from "../experiments/campaign/v6/discussionThermometerPreActionQualificationV1";

const directory = resolve(
  "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1",
);

function clock(): () => string {
  let time = Date.parse("2026-08-30T00:00:00.000Z");
  return () => new Date(time++).toISOString();
}

describe("discussion thermometer pre-action qualification", () => {
  it("freezes one truth-blind pre-action sensor per existing public action", () => {
    const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(directory);
    const publicRun = JSON.parse(readFileSync(resolve(directory, "public-run.json"), "utf8")) as
      CollectiveDynamicsTrajectoryPublicRunV1;
    const freeze = buildDiscussionThermometerPreActionFreezeV1({
      plan: frozen.plan,
      publicRun,
    });
    expect(freeze.registeredCellCount).toBe(84);
    expect(freeze.cells.filter(cell => cell.checkpointRound === 0)).toHaveLength(28);
    expect(freeze.cells.filter(cell => cell.checkpointRound === 1)).toHaveLength(28);
    expect(freeze.cells.filter(cell => cell.checkpointRound === 2)).toHaveLength(28);
    expect(() => verifyDiscussionThermometerPreActionFreezeV1({
      plan: frozen.plan, publicRun, freeze,
    })).not.toThrow();
    publicRun.terminals.forEach((terminal, index) => {
      if (terminal.status !== "valid") throw new Error("test_public_terminal_invalid");
      expect(freeze.cells[index].request.userPrompt).not.toContain(terminal.rawResponse);
      expect(freeze.cells[index].sourcePublicRequestHash).toBe(terminal.requestHash);
    });
    expect(JSON.stringify(freeze)).not.toMatch(/groundTruth|correctAnswer|correct_answer/);
    expect(preflightDiscussionThermometerPreActionV1({ freeze, publicRun })).toMatchObject({
      providerCallsExecuted: 0,
      registeredSensorCallCount: 84,
      futurePublicChoiceComparisonCount: 56,
      observedSwitchCount: 3,
      bestCaseExactTwoSidedPairedSignPValue: 0.25,
      providerExecutionDecision: "no_go_insufficient_frozen_switch_information",
    });
  });

  it("executes a no-provider mock and keeps the low-switch qualification gate closed", async () => {
    const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(directory);
    const publicRun = JSON.parse(readFileSync(resolve(directory, "public-run.json"), "utf8")) as
      CollectiveDynamicsTrajectoryPublicRunV1;
    const freeze = buildDiscussionThermometerPreActionFreezeV1({ plan: frozen.plan, publicRun });
    const observedByCell = new Map(publicRun.terminals.map(terminal => [terminal.cellId, terminal]));
    const run = await executeDiscussionThermometerPreActionV1({
      plan: frozen.plan,
      publicRun,
      freeze,
      clock: clock(),
      invoker: {
        async invoke(request) {
          const sourceId = request.requestId.replace(/^preaction-sensor:/, "");
          const source = observedByCell.get(sourceId);
          if (!source || source.status !== "valid" || !source.parsedPublicTurn) {
            throw new Error("mock_source_missing");
          }
          const cell = freeze.cells.find(candidate => candidate.request.requestId === request.requestId)!;
          return {
            rawContent: JSON.stringify({ probabilities: Object.fromEntries(
              cell.optionIds.map(optionId => [optionId,
                optionId === source.parsedPublicTurn!.choiceId ? 1 : 0]),
            ) }),
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          };
        },
      },
    });
    expect(() => verifyDiscussionThermometerPreActionRunV1({ freeze, run })).not.toThrow();
    const analysis = analyzeDiscussionThermometerPreActionV1({ freeze, run, publicRun });
    expect(analysis.summary).toMatchObject({
      registeredCellCount: 84,
      validSensorCount: 84,
      currentPublicResponseLeakageCount: 0,
      futureEligibleUniqueTopCount: 56,
      observedSwitchCount: 3,
      sensorCorrectCount: 56,
      persistenceCorrectCount: 53,
      sensorOnlyCorrectCount: 3,
      persistenceOnlyCorrectCount: 0,
      discordantPairCount: 3,
      exactTwoSidedPairedSignPValue: 0.25,
      candidateMinusPersistenceAccuracy: 3 / 56,
      qualification: "underpowered_positive_difference",
    });
  }, 30_000);
});
