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
import { buildCollectiveDynamicsTrajectorySensorFreezeV1 } from
  "../experiments/campaign/v6/collectiveDynamicsTrajectorySensorFreezeV1";
import {
  executeCollectiveDynamicsTrajectorySensorV1,
  verifyCollectiveDynamicsTrajectorySensorRunV1,
} from "../experiments/campaign/v6/runCollectiveDynamicsTrajectorySensorV1";
import type {
  SingleAttemptTextInvoker,
} from "../experiments/campaign/v6/providerAdapters";
import type { V6PublicTranscriptEntry } from
  "../experiments/campaign/v6/productionVerticalSlice";

const TASK_IDS = [1, 8, 15, 22, 29] as const;

function artifacts() {
  const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
  return {
    plan,
    artifacts: TASK_IDS.map(sourceTaskId => {
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
    }),
  };
}

function equalWeightInvoker(failFirst = false): {
  invoker: SingleAttemptTextInvoker;
  calls: number;
} {
  let calls = 0;
  return {
    get calls() { return calls; },
    invoker: {
      async invoke(request) {
        calls += 1;
        if (failFirst && calls === 1) throw new Error("synthetic-provider-failure");
        const match = request.userPrompt.match(/OPTIONS_PRESENTATION_JSON:\n(\[.*?\])\n\nPROBABILITY_REPORT_INSTRUCTION/);
        const options = JSON.parse(match![1]) as Array<{ optionId: string; label: string }>;
        const probability = 1 / options.length;
        return {
          rawContent: JSON.stringify({
            probabilities: Object.fromEntries(options.map(option => [option.optionId, probability])),
          }),
        };
      },
    },
  };
}

function clock(): () => string {
  let millis = Date.parse("2026-08-28T00:00:00.000Z");
  return () => new Date(millis++).toISOString();
}

describe("Collective Dynamics M2 sensor runner", () => {
  it("executes every frozen cell exactly once and replays valid parses", async () => {
    const { plan, artifacts: publicArtifacts } = artifacts();
    const freeze = buildCollectiveDynamicsTrajectorySensorFreezeV1({
      plan, artifacts: publicArtifacts,
    });
    const source = equalWeightInvoker();
    const starts: number[] = [];
    const terminals: number[] = [];
    const run = await executeCollectiveDynamicsTrajectorySensorV1({
      plan,
      artifacts: publicArtifacts,
      freeze,
      invoker: source.invoker,
      clock: clock(),
      onStart: event => starts.push(event.sequence),
      onTerminal: event => terminals.push(event.sequence),
    });
    expect(source.calls).toBe(152);
    expect(starts).toEqual(Array.from({ length: 152 }, (_, index) => index + 1));
    expect(terminals).toEqual(starts);
    expect(run.terminals.every(terminal => terminal.status === "valid")).toBe(true);
    expect(() => verifyCollectiveDynamicsTrajectorySensorRunV1({
      plan, freeze, artifact: run,
    })).not.toThrow();
  });

  it("records a provider failure once and never retries the cell", async () => {
    const { plan, artifacts: publicArtifacts } = artifacts();
    const freeze = buildCollectiveDynamicsTrajectorySensorFreezeV1({
      plan, artifacts: publicArtifacts,
    });
    const source = equalWeightInvoker(true);
    const run = await executeCollectiveDynamicsTrajectorySensorV1({
      plan,
      artifacts: publicArtifacts,
      freeze,
      invoker: source.invoker,
      clock: clock(),
    });
    expect(source.calls).toBe(152);
    expect(run.terminals[0].status).toBe("provider_error");
    expect(run.terminals).toHaveLength(152);
  });

  it("resumes only after a verified terminal prefix", async () => {
    const { plan, artifacts: publicArtifacts } = artifacts();
    const freeze = buildCollectiveDynamicsTrajectorySensorFreezeV1({
      plan, artifacts: publicArtifacts,
    });
    const firstSource = equalWeightInvoker();
    const complete = await executeCollectiveDynamicsTrajectorySensorV1({
      plan,
      artifacts: publicArtifacts,
      freeze,
      invoker: firstSource.invoker,
      clock: clock(),
    });
    const resumedSource = equalWeightInvoker();
    let millis = Date.parse(complete.terminals[1].terminalAt) + 1;
    const resumed = await executeCollectiveDynamicsTrajectorySensorV1({
      plan,
      artifacts: publicArtifacts,
      freeze,
      initialTerminals: complete.terminals.slice(0, 2),
      invoker: resumedSource.invoker,
      clock: () => new Date(millis++).toISOString(),
    });
    expect(resumedSource.calls).toBe(150);
    expect(resumed.terminals.slice(0, 2)).toEqual(complete.terminals.slice(0, 2));
    expect(() => verifyCollectiveDynamicsTrajectorySensorRunV1({
      plan, freeze, artifact: resumed,
    })).not.toThrow();
  });
});
