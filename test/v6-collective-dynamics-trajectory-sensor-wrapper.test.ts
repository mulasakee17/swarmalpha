import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHiddenBenchTaskProjectionV1 } from
  "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import { buildCollectiveDynamicsTrajectoryPilotPlanV1 } from
  "../experiments/campaign/v6/collectiveDynamicsTrajectoryPilotV1";
import {
  buildCollectiveDynamicsTrajectoryPublicArtifactV1,
  type CollectiveDynamicsTrajectoryPublicCallRefV1,
} from "../experiments/campaign/v6/collectiveDynamicsTrajectoryCheckpointV1";
import {
  executeFrozenCollectiveDynamicsTrajectorySensorV1,
  freezeCollectiveDynamicsTrajectorySensorV1,
  preflightCollectiveDynamicsTrajectorySensorV1,
  trajectorySensorExecuteGateV1,
  writeCollectiveDynamicsTrajectoryPublicArtifactsV1,
} from "../experiments/campaign/v6/run_v6_collective_dynamics_trajectory_sensor_v1";
import type { SingleAttemptTextInvoker } from
  "../experiments/campaign/v6/providerAdapters";
import type { V6PublicTranscriptEntry } from
  "../experiments/campaign/v6/productionVerticalSlice";

const TASK_IDS = [1, 8, 15, 22, 29] as const;

function makeArtifacts() {
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
  return { plan, artifacts };
}

function equalWeightInvoker(): SingleAttemptTextInvoker {
  return {
    async invoke(request) {
      const match = request.userPrompt.match(/OPTIONS_PRESENTATION_JSON:\n(\[.*?\])\n\nPROBABILITY_REPORT_INSTRUCTION/);
      const options = JSON.parse(match![1]) as Array<{ label: string }>;
      const probability = 1 / options.length;
      return { rawContent: JSON.stringify({
        probabilities: Object.fromEntries(options.map(option => [option.label, probability])),
      }) };
    },
  };
}

function clock(): () => string {
  let millis = Date.parse("2026-08-28T00:00:00.000Z");
  return () => new Date(millis++).toISOString();
}

describe("Collective Dynamics M2 file-backed wrapper", () => {
  it("writes public artifacts, freezes sensor cells, and reports a zero-call preflight", () => {
    const directory = mkdtempSync(join(tmpdir(), "swarmalpha-m2-wrapper-"));
    try {
      const { plan, artifacts } = makeArtifacts();
      writeCollectiveDynamicsTrajectoryPublicArtifactsV1({
        outputDirectory: directory,
        plan,
        artifacts,
      });
      const frozen = freezeCollectiveDynamicsTrajectorySensorV1({ outputDirectory: directory });
      const preflight = preflightCollectiveDynamicsTrajectorySensorV1(directory);
      expect(existsSync(join(directory, "plan.json"))).toBe(true);
      expect(existsSync(join(directory, "sensor-freeze.json"))).toBe(true);
      expect(frozen.freeze.registeredCellCount).toBe(152);
      expect(preflight.plannedProviderCalls).toBe(152);
      expect(preflight.registeredViewCount).toBe(76);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("persists append-only attempt events and run artifact without retry", async () => {
    const directory = mkdtempSync(join(tmpdir(), "swarmalpha-m2-wrapper-"));
    try {
      const { plan, artifacts } = makeArtifacts();
      writeCollectiveDynamicsTrajectoryPublicArtifactsV1({ outputDirectory: directory, plan, artifacts });
      freezeCollectiveDynamicsTrajectorySensorV1({ outputDirectory: directory });
      const run = await executeFrozenCollectiveDynamicsTrajectorySensorV1({
        outputDirectory: directory,
        invoker: equalWeightInvoker(),
        clock: clock(),
      });
      const lines = readFileSync(join(directory, "attempts.jsonl"), "utf8")
        .split(/\r?\n/).filter(Boolean);
      expect(run.terminals).toHaveLength(152);
      expect(lines).toHaveLength(304);
      expect(existsSync(join(directory, "run.json"))).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("requires both explicit execution gates", () => {
    expect(trajectorySensorExecuteGateV1({})).toMatchObject({ ok: false, code: 5 });
    expect(trajectorySensorExecuteGateV1({ RUN_AUTHORIZED: "yes" }))
      .toMatchObject({ ok: false, code: 5 });
    expect(trajectorySensorExecuteGateV1({
      RUN_AUTHORIZED: "yes",
      M2_SENSOR_EXECUTION_REVIEWED: "yes",
    })).toEqual({ ok: true });
  });
});
