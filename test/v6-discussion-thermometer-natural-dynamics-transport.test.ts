import { describe, expect, it } from "vitest";
import { buildDiscussionThermometerNaturalDynamicsTransportManifestV1 } from
  "../experiments/campaign/v6/discussionThermometerNaturalDynamicsTransportManifestV1";
import { buildDiscussionThermometerNaturalDynamicsTransportPlanV1 } from
  "../experiments/campaign/v6/discussionThermometerNaturalDynamicsTransportPlanV1";
import {
  DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1,
  verifyDiscussionThermometerNaturalDynamicsTransportTaskBankV1,
} from "../experiments/campaign/v6/discussionThermometerNaturalDynamicsTransportTaskBankV1";
import { evaluateDiscussionThermometerNaturalDynamicsTransportV1 } from
  "../experiments/campaign/v6/evaluateDiscussionThermometerNaturalDynamicsTransportV1";
import type { SingleAttemptTextInvoker } from
  "../experiments/campaign/v6/providerAdapters";
import {
  buildNaturalDynamicsSensorFreezeV1,
  executeNaturalDynamicsPublicV1,
  executeNaturalDynamicsSensorV1,
  projectNaturalDynamicsObservationV1,
} from "../experiments/campaign/v6/runDiscussionThermometerNaturalDynamicsV1";
import { buildDiscussionThermometerNaturalDynamicsTransportPreflightV1 } from
  "../experiments/campaign/v6/run_v6_discussion_thermometer_natural_dynamics_transport_preflight_v1";

function mockInvoker(): { invoker: SingleAttemptTextInvoker; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    invoker: {
      async invoke(request) {
        calls.push(request.requestId);
        if (request.requestId.includes("-sensor:")) {
          const checkpoint = Number(request.requestId.match(/:x([0-4]):/)?.[1] ?? 0);
          const vector = checkpoint < 2
            ? [0.7, 0.2, 0.1]
            : checkpoint === 2 ? [0.5, 0.4, 0.1] : [0.4, 0.5, 0.1];
          return { rawContent: JSON.stringify({ probabilities: {
            opt_1: vector[0], opt_2: vector[1], opt_3: vector[2],
          } }) };
        }
        return { rawContent: JSON.stringify({
          choiceId: "opt_1", message: "Synthetic fixture response.",
        }) };
      },
    },
  };
}

describe("discussion thermometer prospective transport", () => {
  it("freezes balanced new scenarios without online design or truth leakage", () => {
    verifyDiscussionThermometerNaturalDynamicsTransportTaskBankV1();
    const plan = buildDiscussionThermometerNaturalDynamicsTransportPlanV1();
    const manifest = buildDiscussionThermometerNaturalDynamicsTransportManifestV1(plan);
    const preflight = buildDiscussionThermometerNaturalDynamicsTransportPreflightV1();
    expect(plan.taskIds).toHaveLength(4);
    expect(plan.baseScenarioIds).toEqual(["backup-power", "aerial-navigation"]);
    expect(plan.callBudget.totalProviderCalls).toBe(224);
    expect(manifest.executionAuthority).toBe("none");
    expect(plan.scientificStatus).toBe(
      "engineering_mock_only_rejected_for_transport_evidence");
    expect(preflight.allChecksPass).toBe(false);
    expect(preflight.executionReady).toBe(false);
    expect(preflight.nextRequiredStep).toBe(
      "REPLACE_SYNTHETIC_TASK_BANK_WITH_EXTERNAL_LITERATURE_AUTHORITY");
    expect(JSON.stringify({ plan, manifest, preflight })).not.toMatch(
      /groundTruth|correctAnswer/i);
  });

  it("reuses the four-round engine and evaluates only the registered rules", async () => {
    const plan = buildDiscussionThermometerNaturalDynamicsTransportPlanV1();
    const mock = mockInvoker();
    const publicRun = await executeNaturalDynamicsPublicV1({
      plan, invoker: mock.invoker,
    });
    const freeze = buildNaturalDynamicsSensorFreezeV1({ plan, publicRun });
    const sensorRun = await executeNaturalDynamicsSensorV1({
      plan, publicRun, freeze, invoker: mock.invoker,
    });
    const observation = projectNaturalDynamicsObservationV1({
      plan, publicRun, sensorFreeze: freeze, sensorRun,
    });
    const evaluation = evaluateDiscussionThermometerNaturalDynamicsTransportV1({
      plan, publicRun, sensorFreeze: freeze, sensorRun, observation,
      evidenceClass: "synthetic_mock",
    });
    expect(publicRun.terminals).toHaveLength(64);
    expect(freeze.views).toHaveLength(80);
    expect(sensorRun.terminals).toHaveLength(160);
    expect(mock.calls).toHaveLength(224);
    expect(evaluation.transitionRows).toHaveLength(16);
    expect(evaluation.interpretationStatus).toBe("MOCK_WIRING_ONLY");
    expect(evaluation.truthAccess).toBe("none");
    expect(JSON.stringify({
      publicRun, freeze, observation, evaluation,
    })).not.toMatch(/groundTruth|correctAnswer|latentOutcome/i);

    const round4 = publicRun.terminals.find(item =>
      item.taskId === plan.taskIds[0] && item.round === 4 && item.agentId === "agent_1");
    expect(round4?.request.visibleTranscript).toHaveLength(4);
    expect(round4?.request.visibleTranscript.every(message => message.round === 3))
      .toBe(true);
    expect(DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1)
      .toHaveLength(4);
  });
});
