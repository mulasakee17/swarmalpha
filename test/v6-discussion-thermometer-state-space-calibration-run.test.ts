import { describe, expect, it } from "vitest";
import { buildDiscussionThermometerStateSpaceCalibrationPlanV1 } from
  "../experiments/campaign/v6/discussionThermometerStateSpaceCalibrationPlanV1";
import {
  buildDiscussionThermometerCalibrationSensorFreezeV1,
  executeDiscussionThermometerCalibrationPublicV1,
  executeDiscussionThermometerCalibrationSensorV1,
  projectDiscussionThermometerCalibrationObservationV1,
  verifyDiscussionThermometerCalibrationPublicRunV1,
  verifyDiscussionThermometerCalibrationSensorFreezeV1,
  verifyDiscussionThermometerCalibrationSensorRunV1,
} from "../experiments/campaign/v6/runDiscussionThermometerStateSpaceCalibrationV1";
import type { SingleAttemptTextInvoker } from
  "../experiments/campaign/v6/providerAdapters";
import { analyzeDiscussionThermometerStateSpaceCalibrationV1 } from
  "../experiments/campaign/v6/analyzeDiscussionThermometerStateSpaceCalibrationV1";

type Vector = [number, number, number];

function vectorFor(requestId: string): Vector {
  const match = requestId.match(/:v([1-4]):x([012]):(agent_[1-4]):[ab]$/);
  if (!match) throw new Error(`mock_sensor_request_unrecognized:${requestId}`);
  const [, regime, checkpointText, agentId] = match;
  const checkpoint = Number(checkpointText);
  if (regime === "1") {
    return ({ agent_1: [0.70, 0.20, 0.10], agent_2: [0.55, 0.30, 0.15],
      agent_3: [0.40, 0.45, 0.15], agent_4: [0.50, 0.20, 0.30] } as Record<string, Vector>)[agentId];
  }
  if (regime === "2") {
    return checkpoint < 2 ? [0.65, 0.25, 0.10] : [0.40, 0.50, 0.10];
  }
  if (regime === "3") {
    if (checkpoint === 2) return [0.60, 0.25, 0.15];
    return ["agent_1", "agent_2"].includes(agentId)
      ? [0.80, 0.10, 0.10] : [0.10, 0.10, 0.80];
  }
  return ["agent_1", "agent_2", "agent_3"].includes(agentId)
    ? [0.20, 0.70, 0.10] : [0.80, 0.10, 0.10];
}

function mockInvoker(): { invoker: SingleAttemptTextInvoker; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    invoker: {
      async invoke(request) {
        calls.push(request.requestId);
        if (request.requestId.startsWith("thermometer-calibration-sensor:")) {
          const [opt_1, opt_2, opt_3] = vectorFor(request.requestId);
          return { rawContent: JSON.stringify({ probabilities: { opt_1, opt_2, opt_3 } }) };
        }
        return {
          rawContent: JSON.stringify({
            choiceId: "opt_1",
            message: "I am reporting the option most consistent with my supplied observations.",
          }),
        };
      },
    },
  };
}

describe("discussion thermometer state-space calibration run v1", () => {
  it("reuses V6 request and sensor contracts for a 64+192 call mock trajectory", async () => {
    const plan = buildDiscussionThermometerStateSpaceCalibrationPlanV1();
    const mock = mockInvoker();
    const publicRun = await executeDiscussionThermometerCalibrationPublicV1({
      plan, invoker: mock.invoker,
    });
    verifyDiscussionThermometerCalibrationPublicRunV1({ plan, run: publicRun });
    const freeze = buildDiscussionThermometerCalibrationSensorFreezeV1({ plan, publicRun });
    verifyDiscussionThermometerCalibrationSensorFreezeV1({ plan, publicRun, freeze });
    const sensorRun = await executeDiscussionThermometerCalibrationSensorV1({
      plan, publicRun, freeze, invoker: mock.invoker,
    });
    verifyDiscussionThermometerCalibrationSensorRunV1({ freeze, run: sensorRun });
    const observation = projectDiscussionThermometerCalibrationObservationV1({
      plan, publicRun, sensorFreeze: freeze, sensorRun,
    });
    const analysis = analyzeDiscussionThermometerStateSpaceCalibrationV1({
      plan, publicRun, sensorFreeze: freeze, sensorRun, observation,
      evidenceClass: "synthetic_mock",
    });

    expect(publicRun.terminals).toHaveLength(64);
    expect(freeze.views).toHaveLength(96);
    expect(freeze.cells).toHaveLength(192);
    expect(sensorRun.terminals).toHaveLength(192);
    expect(mock.calls).toHaveLength(256);
    expect(observation.trajectories).toHaveLength(8);
    expect(observation.trajectories.every(value =>
      value.trajectory.readings.length === 3)).toBe(true);
    expect(observation.truthAccess).toBe("none");
    expect(observation.predictionUsed).toBe(false);
    expect(observation.actionProduced).toBe(false);
    expect(analysis.allResourceGatesPass).toBe(true);
    expect(analysis.stateResolution.pairCountPassingBothBases).toBeGreaterThanOrEqual(3);
    expect(analysis.lateMotion.regimeCountPassingBothBases).toBe(2);
    expect(analysis.routing).toBe("MOCK_WIRING_ONLY");
    expect(analysis.claimCeiling).toContain("no evidence about LLM discussion states");
  });

  it("freezes exact A/B prompts while retaining distinct request identities", async () => {
    const plan = buildDiscussionThermometerStateSpaceCalibrationPlanV1();
    const mock = mockInvoker();
    const publicRun = await executeDiscussionThermometerCalibrationPublicV1({
      plan, invoker: mock.invoker,
    });
    const freeze = buildDiscussionThermometerCalibrationSensorFreezeV1({ plan, publicRun });
    for (let index = 0; index < freeze.cells.length; index += 2) {
      const left = freeze.cells[index];
      const right = freeze.cells[index + 1];
      expect(left.repeatLabel).toBe("A");
      expect(right.repeatLabel).toBe("B");
      expect(left.promptHash).toBe(right.promptHash);
      expect(left.viewHash).toBe(right.viewHash);
      expect(left.request.requestId).not.toBe(right.request.requestId);
    }
    const serialized = JSON.stringify(freeze);
    expect(serialized).not.toMatch(/groundTruth|correctAnswer|latentOutcome|designRegime/i);
  });
});
