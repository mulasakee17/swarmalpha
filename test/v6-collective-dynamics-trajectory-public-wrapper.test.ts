import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executeFrozenCollectiveDynamicsTrajectoryPublicV1,
  preflightCollectiveDynamicsTrajectoryPublicV1,
  trajectoryPublicExecuteGateV1,
  writeCollectiveDynamicsTrajectoryPublicPlanV1,
} from "../experiments/campaign/v6/run_v6_collective_dynamics_trajectory_public_v1";
import {
  executeFrozenCollectiveDynamicsTrajectorySensorV1,
  freezeCollectiveDynamicsTrajectorySensorV1,
} from "../experiments/campaign/v6/run_v6_collective_dynamics_trajectory_sensor_v1";
import type { SingleAttemptTextInvoker } from
  "../experiments/campaign/v6/providerAdapters";

function clock(): () => string {
  let millis = Date.parse("2026-08-28T00:00:00.000Z");
  return () => new Date(millis++).toISOString();
}

describe("Collective Dynamics M2 public file wrapper", () => {
  it("writes 57-call public run, ledger, and five trajectory artifacts", async () => {
    const directory = mkdtempSync(join(tmpdir(), "swarmalpha-m2-public-"));
    try {
      writeCollectiveDynamicsTrajectoryPublicPlanV1(directory);
      expect(preflightCollectiveDynamicsTrajectoryPublicV1(directory)).toMatchObject({
        plannedProviderCalls: 57,
        outputFresh: true,
      });
      let calls = 0;
      const invoker: SingleAttemptTextInvoker = {
        async invoke(request) {
          calls += 1;
          return { rawContent: `public:${request.requestId}` };
        },
      };
      const run = await executeFrozenCollectiveDynamicsTrajectoryPublicV1({
        outputDirectory: directory,
        invoker,
        clock: clock(),
      });
      const attempts = readFileSync(join(directory, "public-attempts.jsonl"), "utf8")
        .split(/\r?\n/).filter(Boolean);
      expect(calls).toBe(57);
      expect(run.taskArtifacts).toHaveLength(5);
      expect(attempts).toHaveLength(114);
      expect(existsSync(join(directory, "public-run.json"))).toBe(true);
      expect(existsSync(join(directory, "public-manifest.json"))).toBe(true);
      expect([1, 8, 15, 22, 29].every(taskId =>
        existsSync(join(directory, `public-task-${taskId}-seed-1.json`)))).toBe(true);
      expect(preflightCollectiveDynamicsTrajectoryPublicV1(directory).outputFresh).toBe(false);

      const sensorFreeze = freezeCollectiveDynamicsTrajectorySensorV1({ outputDirectory: directory });
      const sensorRun = await executeFrozenCollectiveDynamicsTrajectorySensorV1({
        outputDirectory: directory,
        clock: clock(),
        invoker: {
          async invoke(request) {
            const match = request.userPrompt.match(/OPTIONS_PRESENTATION_JSON:\n(\[.*?\])\n\nPROBABILITY_REPORT_INSTRUCTION/);
            const options = JSON.parse(match![1]) as Array<{ label: string }>;
            const probability = 1 / options.length;
            return { rawContent: JSON.stringify({
              probabilities: Object.fromEntries(options.map(option => [option.label, probability])),
            }) };
          },
        },
      });
      expect(sensorFreeze.freeze.registeredCellCount).toBe(152);
      expect(sensorRun.terminals).toHaveLength(152);
      expect(readFileSync(join(directory, "attempts.jsonl"), "utf8")
        .split(/\r?\n/).filter(Boolean)).toHaveLength(304);
      expect(existsSync(join(directory, "run.json"))).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("requires both public execution gates", () => {
    expect(trajectoryPublicExecuteGateV1({})).toMatchObject({ ok: false, code: 5 });
    expect(trajectoryPublicExecuteGateV1({ RUN_AUTHORIZED: "yes" }))
      .toMatchObject({ ok: false, code: 5 });
    expect(trajectoryPublicExecuteGateV1({
      RUN_AUTHORIZED: "yes",
      M2_PUBLIC_EXECUTION_REVIEWED: "yes",
    })).toEqual({ ok: true });
  });

  it("runs the complete D1 bridge pipeline with mock invokers", async () => {
    const directory = mkdtempSync(join(tmpdir(), "swarmalpha-d1-plan-"));
    try {
      const result = writeCollectiveDynamicsTrajectoryPublicPlanV1(
        directory,
        "post-m2-bridge",
      );
      expect(result.plan.planRef.id)
        .toBe("swarmalpha.experiment.v6.collective-dynamics-post-m2-bridge");
      expect(preflightCollectiveDynamicsTrajectoryPublicV1(directory)).toMatchObject({
        sourceTaskCount: 5,
        registeredAgentCount: 19,
        plannedProviderCalls: 57,
        outputFresh: true,
      });
      const publicRun = await executeFrozenCollectiveDynamicsTrajectoryPublicV1({
        outputDirectory: directory,
        clock: clock(),
        invoker: {
          async invoke(request) {
            return { rawContent: `bridge:${request.requestId}` };
          },
        },
      });
      expect(publicRun.taskArtifacts.map(artifact => artifact.onlineTask.sourceTaskId))
        .toEqual([36, 43, 50, 57, 64]);
      const frozen = freezeCollectiveDynamicsTrajectorySensorV1({ outputDirectory: directory });
      expect(frozen.plan.planRef.id)
        .toBe("swarmalpha.experiment.v6.collective-dynamics-post-m2-bridge");
      expect(frozen.freeze.cells).toHaveLength(152);
      expect(new Set(frozen.freeze.cells.map(cell => cell.sourceTaskId)))
        .toEqual(new Set([36, 43, 50, 57, 64]));
      const sensorRun = await executeFrozenCollectiveDynamicsTrajectorySensorV1({
        outputDirectory: directory,
        clock: clock(),
        invoker: {
          async invoke(request) {
            const match = request.userPrompt.match(/OPTIONS_PRESENTATION_JSON:\n(\[.*?\])\n\nPROBABILITY_REPORT_INSTRUCTION/);
            const options = JSON.parse(match![1]) as Array<{ label: string }>;
            const probability = 1 / options.length;
            return { rawContent: JSON.stringify({
              probabilities: Object.fromEntries(options.map(option => [option.label, probability])),
            }) };
          },
        },
      });
      expect(sensorRun.terminals).toHaveLength(152);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 15_000);
});
