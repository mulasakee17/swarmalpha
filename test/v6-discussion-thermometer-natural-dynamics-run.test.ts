import { describe, expect, it } from "vitest";
import { buildDiscussionThermometerNaturalDynamicsPlanV1 } from "../experiments/campaign/v6/discussionThermometerNaturalDynamicsPlanV1";
import { buildDiscussionThermometerNaturalDynamicsManifestV1, verifyDiscussionThermometerNaturalDynamicsManifestV1 } from "../experiments/campaign/v6/discussionThermometerNaturalDynamicsManifestV1";
import { buildNaturalDynamicsSensorFreezeV1, executeNaturalDynamicsPublicV1, executeNaturalDynamicsSensorV1, projectNaturalDynamicsObservationV1, verifyNaturalDynamicsPublicRunV1, verifyNaturalDynamicsSensorFreezeV1, verifyNaturalDynamicsSensorRunV1 } from "../experiments/campaign/v6/runDiscussionThermometerNaturalDynamicsV1";
import type { SingleAttemptTextInvoker } from "../experiments/campaign/v6/providerAdapters";

function mockInvoker(): { invoker: SingleAttemptTextInvoker; calls: string[] } {
  const calls: string[] = [];
  return { calls, invoker: { async invoke(request) { calls.push(request.requestId); if (request.requestId.includes("-sensor:")) return { rawContent: JSON.stringify({ probabilities: { opt_1: 0.6, opt_2: 0.3, opt_3: 0.1 } }) }; return { rawContent: JSON.stringify({ choiceId: "opt_1", message: "Synthetic fixture response." }) }; } } };
}

describe("discussion thermometer natural dynamics four-round runner", () => {
  it("freezes a non-authorizing manifest and closes the 224-cell mock path", async () => {
    const plan = buildDiscussionThermometerNaturalDynamicsPlanV1();
    const manifest = buildDiscussionThermometerNaturalDynamicsManifestV1(plan);
    verifyDiscussionThermometerNaturalDynamicsManifestV1(manifest, plan);
    const mock = mockInvoker();
    const publicRun = await executeNaturalDynamicsPublicV1({ plan, invoker: mock.invoker });
    verifyNaturalDynamicsPublicRunV1({ plan, run: publicRun });
    const freeze = buildNaturalDynamicsSensorFreezeV1({ plan, publicRun });
    verifyNaturalDynamicsSensorFreezeV1({ plan, publicRun, freeze });
    const sensorRun = await executeNaturalDynamicsSensorV1({ plan, publicRun, freeze, invoker: mock.invoker });
    verifyNaturalDynamicsSensorRunV1({ freeze, run: sensorRun });
    const observation = projectNaturalDynamicsObservationV1({ plan, publicRun, sensorFreeze: freeze, sensorRun });
    expect(publicRun.terminals).toHaveLength(64);
    expect(freeze.views).toHaveLength(80);
    expect(freeze.cells).toHaveLength(160);
    expect(sensorRun.terminals).toHaveLength(160);
    expect(mock.calls).toHaveLength(224);
    expect(observation.trajectories).toHaveLength(4);
    expect(observation.trajectories.every(item => item.trajectory.readings.length === 5)).toBe(true);
    const firstTrajectory = observation.trajectories[0].trajectory.readings;
    expect(firstTrajectory[0].state.behavioralCrossCheck.status).toBe("unavailable");
    for (const round of plan.publicRounds) {
      const expectedChoices = Object.fromEntries(publicRun.terminals
        .filter(item => item.taskId === plan.taskIds[0] && item.round === round)
        .map(item => [item.agentId, item.parsed.choiceId]));
      expect(firstTrajectory[round].state.behavioralCrossCheck.publicChoiceByAgentId)
        .toEqual(expectedChoices);
    }
    expect(observation.truthAccess).toBe("none");
    expect(observation.predictionUsed).toBe(false);
    expect(observation.actionProduced).toBe(false);
    expect(manifest.executionAuthority).toBe("none");
    expect(JSON.stringify({ plan, manifest, observation })).not.toMatch(/groundTruth|correctAnswer|latentOutcome/i);
  });

  it("passes only the immediately preceding public round to each later round", async () => {
    const plan = buildDiscussionThermometerNaturalDynamicsPlanV1();
    const invoker: SingleAttemptTextInvoker = { async invoke(request) { if (request.requestId.includes("-sensor:")) return { rawContent: JSON.stringify({ probabilities: { opt_1: 0.5, opt_2: 0.3, opt_3: 0.2 } }) }; return { rawContent: JSON.stringify({ choiceId: "opt_1", message: "ok" }) }; } };
    const publicRun = await executeNaturalDynamicsPublicV1({ plan, invoker });
    const task = plan.taskIds[0];
    expect(publicRun.terminals.find(item => item.cellId === `thermometer-natural-dynamics:${task}:r1:agent_1`)!.request.visibleTranscript).toHaveLength(0);
    expect(publicRun.terminals.find(item => item.cellId === `thermometer-natural-dynamics:${task}:r4:agent_1`)!.request.visibleTranscript).toHaveLength(4);
    expect(publicRun.terminals.filter(item => item.taskId === task)).toHaveLength(16);
  });
});
