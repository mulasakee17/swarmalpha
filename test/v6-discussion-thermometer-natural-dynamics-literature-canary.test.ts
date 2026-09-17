import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1 } from "../experiments/campaign/v6/discussionThermometerNaturalDynamicsLiteratureCanaryManifestV1";
import { buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1 } from "../experiments/campaign/v6/discussionThermometerNaturalDynamicsLiteratureCanaryPlanV1";
import {
  DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1,
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1,
} from "../experiments/campaign/v6/discussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1";
import { evaluateDiscussionThermometerNaturalDynamicsLiteratureCanaryV1 } from "../experiments/campaign/v6/evaluateDiscussionThermometerNaturalDynamicsLiteratureCanaryV1";
import type { SingleAttemptTextInvokeRequest, SingleAttemptTextInvoker } from "../experiments/campaign/v6/providerAdapters";
import {
  buildNaturalDynamicsSensorFreezeV1,
  executeNaturalDynamicsPublicV1,
  executeNaturalDynamicsSensorV1,
  projectNaturalDynamicsObservationV1,
} from "../experiments/campaign/v6/runDiscussionThermometerNaturalDynamicsV1";
import { buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1 } from "../experiments/campaign/v6/run_v6_discussion_thermometer_natural_dynamics_literature_canary_preflight_v1";
import {
  auditLiteratureCanaryAttemptLedgerV1,
  createLiteratureCanaryLoggedInvokerV1,
} from "../experiments/campaign/v6/run_v6_discussion_thermometer_natural_dynamics_literature_canary_v1";

function mockInvoker(): { invoker: SingleAttemptTextInvoker; calls: SingleAttemptTextInvokeRequest[] } {
  const calls: SingleAttemptTextInvokeRequest[] = [];
  return {
    calls,
    invoker: {
      async invoke(request) {
        calls.push(structuredClone(request));
        if (request.requestId.includes("-sensor:")) {
          return { rawContent: JSON.stringify({ probabilities: {
            opt_1: 0.55, opt_2: 0.2, opt_3: 0.15, opt_4: 0.1,
          } }) };
        }
        return { rawContent: JSON.stringify({
          choiceId: "opt_1", message: "Synthetic fixture response.",
        }) };
      },
    },
  };
}

describe("literature-backed natural dynamics canary", () => {
  it("binds the official manual/adapted tasks and keeps preflight non-authorizing", () => {
    verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1();
    const plan = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1();
    const manifest = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1(plan);
    const preflight = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1();
    expect(plan.sourceTaskIds).toEqual([4, 6]);
    expect(plan.agentIds).toHaveLength(3);
    expect(plan.optionCount).toBe(4);
    expect(plan.callBudget.totalProviderCalls).toBe(84);
    expect(plan.callBudget.maximumCompletionTokens).toBe(27_648);
    expect(manifest.executionAuthority).toBe("none");
    expect(preflight.allChecksPass).toBe(true);
    expect(preflight.executionReady).toBe(false);
    expect(preflight.checks.find(check => check.id === "ONLINE_IDENTITY_FIREWALL")?.pass).toBe(true);
    expect(JSON.stringify({ plan, manifest, preflight })).not.toMatch(/correctAnswer|groundTruth/i);
  });

  it("runs the same observation layer for 3 agents and 4 options", async () => {
    const plan = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1();
    const mock = mockInvoker();
    const publicRun = await executeNaturalDynamicsPublicV1({ plan, invoker: mock.invoker });
    const freeze = buildNaturalDynamicsSensorFreezeV1({ plan, publicRun });
    const sensorRun = await executeNaturalDynamicsSensorV1({ plan, publicRun, freeze, invoker: mock.invoker });
    const observation = projectNaturalDynamicsObservationV1({ plan, publicRun, sensorFreeze: freeze, sensorRun });
    const evaluation = evaluateDiscussionThermometerNaturalDynamicsLiteratureCanaryV1({ plan, publicRun, sensorFreeze: freeze, sensorRun, observation, evidenceClass: "synthetic_mock" });
    expect(publicRun.terminals).toHaveLength(24);
    expect(freeze.views).toHaveLength(30);
    expect(freeze.cells).toHaveLength(60);
    expect(sensorRun.terminals).toHaveLength(60);
    expect(mock.calls).toHaveLength(84);
    expect(JSON.stringify(mock.calls)).not.toMatch(/hiddenbench|toma_butera|schulz_hardt/i);
    expect(observation.trajectories.every(item => item.trajectory.optionIds.length > 0)).toBe(true);
    expect(observation.trajectories.every(item => item.trajectory.optionIds.length === 4)).toBe(true);
    expect(observation.trajectories.every(item => item.trajectory.expectedAgentIds.length === 3)).toBe(true);
    expect(evaluation.observationCompleteness.allCellsComplete).toBe(true);
    expect(evaluation.interpretationStatus).toBe("MOCK_WIRING_ONLY");
    expect(JSON.stringify({ publicRun, freeze, sensorRun, observation })).not.toMatch(/correctOptionId|offlineResolution|groundTruth/i);
    expect(DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1).toHaveLength(2);
    const firstTrajectory = observation.trajectories[0].trajectory.readings;
    expect(firstTrajectory[0].state.behavioralCrossCheck.status).toBe("unavailable");
    expect(firstTrajectory[3].state.behavioralCrossCheck.status).toBe("available");
    expect(firstTrajectory[4].state.behavioralCrossCheck.status).toBe("available");
  });

  it("preserves raw provider traces and rejects missing provider identity", async () => {
    const directory = mkdtempSync(join(tmpdir(), "swarmalpha-literature-ledger-"));
    const attemptsFile = join(directory, "attempts.jsonl");
    const request: SingleAttemptTextInvokeRequest = {
      requestId: "cell-1",
      systemPrompt: "system",
      userPrompt: "user",
      responseFormat: "json",
      modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
      invocationConfig: { temperature: 0 },
    };
    const logged = createLiteratureCanaryLoggedInvokerV1({
      inner: { async invoke() { return { rawContent: "{}", providerMetadata: { model: "glm-4.6v", requestId: "provider-1" } }; } },
      attemptsFile,
      phase: "sensor",
      maximumAttempts: 1,
    });
    const response = await logged.invoke(request, new AbortController().signal);
    const terminal = { sequence: 1, cellId: request.requestId, requestHash: JSON.parse(readFileSync(attemptsFile, "utf8").split(/\r?\n/)[0]).requestHash as string, responseHash: JSON.parse(readFileSync(attemptsFile, "utf8").split(/\r?\n/)[1]).responseHash as string, providerMetadata: response.providerMetadata };
    expect(() => auditLiteratureCanaryAttemptLedgerV1({ attemptsFile, phase: "sensor", terminals: [terminal], expectedCount: 1 })).not.toThrow();
    expect(() => auditLiteratureCanaryAttemptLedgerV1({ attemptsFile, phase: "sensor", terminals: [{ ...terminal, providerMetadata: undefined }], expectedCount: 1 })).toThrow(/attempt_binding_invalid/);
  });

  it("records a terminal failure instead of leaving an ambiguous started-only call", async () => {
    const directory = mkdtempSync(join(tmpdir(), "swarmalpha-literature-failure-"));
    const attemptsFile = join(directory, "attempts.jsonl");
    const logged = createLiteratureCanaryLoggedInvokerV1({
      inner: { async invoke() { throw new Error("fixture failure"); } },
      attemptsFile,
      phase: "public",
      maximumAttempts: 1,
    });
    await expect(logged.invoke({
      requestId: "failed-cell",
      systemPrompt: "system",
      userPrompt: "user",
      responseFormat: "json",
      modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
      invocationConfig: { temperature: 0 },
    }, new AbortController().signal)).rejects.toThrow("fixture failure");
    const events = readFileSync(attemptsFile, "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line));
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("started");
    expect(events[1]).toMatchObject({ type: "terminal", status: "provider_error" });
  });
});
