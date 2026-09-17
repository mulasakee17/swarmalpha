import type { DiscussionThermometerStateV1 } from "../../../src/lib/epistemic";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import type { DiscussionThermometerDesignRegimeV1 } from
  "./discussionThermometerStateSpaceCoveragePlanV1";
import {
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1,
  type DiscussionThermometerStateSpaceCalibrationPlanV1,
} from "./discussionThermometerStateSpaceCalibrationPlanV1";
import { DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1 } from
  "./discussionThermometerStateSpaceTaskBankV1";
import {
  verifyDiscussionThermometerCalibrationObservationV1,
  type DiscussionThermometerCalibrationObservationV1,
  type DiscussionThermometerCalibrationPublicRunV1,
  type DiscussionThermometerCalibrationSensorFreezeV1,
  type DiscussionThermometerCalibrationSensorRunV1,
} from "./runDiscussionThermometerStateSpaceCalibrationV1";

export const DISCUSSION_THERMOMETER_STATE_SPACE_CALIBRATION_ANALYSIS_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.discussion-thermometer-state-space-calibration",
  version: "1.0.0",
});

type BaseScenarioId = "thermal-loop" | "service-access";

export interface DiscussionThermometerStateSpaceCalibrationAnalysisV1 {
  analysisRef: typeof DISCUSSION_THERMOMETER_STATE_SPACE_CALIBRATION_ANALYSIS_V1;
  evidenceClass: "synthetic_mock" | "provider_observation";
  inferenceStatus: "descriptive_resource_gate_only";
  truthAccess: "none";
  predictionUsed: false;
  statePanels: Array<{
    taskId: string;
    baseScenarioId: BaseScenarioId;
    designRegime: DiscussionThermometerDesignRegimeV1;
    checkpoint: number;
    coverage: number;
    pooledProbabilitiesByOptionId: Record<string, number> | null;
    meanNormalizedReportEntropy: number | null;
    normalizedGeneralizedJsd: number | null;
    meanPairwiseTotalVariation: number | null;
    maxPairwiseTotalVariation: number | null;
  }>;
  stateResolution: {
    regimePairs: Array<{
      leftRegime: DiscussionThermometerDesignRegimeV1;
      rightRegime: DiscussionThermometerDesignRegimeV1;
      bases: Array<{
        baseScenarioId: BaseScenarioId;
        replicateComparableAgentCount: number;
        separatedAgentCount: number;
        separatedFraction: number | null;
        passMajority: boolean;
      }>;
      passBothBases: boolean;
    }>;
    pairCountPassingBothBases: number;
  };
  lateMotion: {
    regimes: Array<{
      designRegime: DiscussionThermometerDesignRegimeV1;
      bases: Array<{
        baseScenarioId: BaseScenarioId;
        replicateComparableAgentCount: number;
        separatedAgentCount: number;
        separatedFraction: number | null;
        passMajority: boolean;
      }>;
      passBothBases: boolean;
    }>;
    regimeCountPassingBothBases: number;
  };
  gates: Array<{
    id: "G0_TERMINAL_ACCOUNTING" | "G1_SENSOR_USABILITY"
      | "G2_STATE_RESOLUTION" | "G3_LATE_MOTION";
    pass: boolean;
    detail: string;
  }>;
  allResourceGatesPass: boolean;
  routing: "MOCK_WIRING_ONLY" | "READY_FOR_HUMAN_REVIEW_NOT_EXECUTION" | "NO_GO_REDESIGN";
  claimCeiling: string;
  contentHash: string;
}

function task(taskId: string) {
  const value = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1
    .find(candidate => candidate.taskId === taskId);
  if (!value) throw new Error("thermometer_calibration_analysis_task_missing");
  return value;
}

function state(input: {
  observation: DiscussionThermometerCalibrationObservationV1;
  taskId: string;
  checkpoint: 0 | 1 | 2;
}): DiscussionThermometerStateV1 {
  const trajectory = input.observation.trajectories
    .find(value => value.taskId === input.taskId)?.trajectory;
  const reading = trajectory?.readings.find(value => value.checkpointIndex === input.checkpoint);
  if (!reading) throw new Error("thermometer_calibration_analysis_state_missing");
  return reading.state;
}

function tv(left: Record<string, number>, right: Record<string, number>,
  optionIds: readonly string[]): number {
  return 0.5 * optionIds.reduce((sum, optionId) =>
    sum + Math.abs(left[optionId] - right[optionId]), 0);
}

function regimePairs(regimes: readonly DiscussionThermometerDesignRegimeV1[]) {
  const pairs: Array<[DiscussionThermometerDesignRegimeV1,
    DiscussionThermometerDesignRegimeV1]> = [];
  regimes.forEach((left, index) => regimes.slice(index + 1).forEach(right =>
    pairs.push([left, right])));
  return pairs;
}

export function analyzeDiscussionThermometerStateSpaceCalibrationV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  publicRun: DiscussionThermometerCalibrationPublicRunV1;
  sensorFreeze: DiscussionThermometerCalibrationSensorFreezeV1;
  sensorRun: DiscussionThermometerCalibrationSensorRunV1;
  observation: DiscussionThermometerCalibrationObservationV1;
  evidenceClass: "synthetic_mock" | "provider_observation";
}): DiscussionThermometerStateSpaceCalibrationAnalysisV1 {
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1(input.plan);
  verifyDiscussionThermometerCalibrationObservationV1(input);
  const bases: BaseScenarioId[] = ["thermal-loop", "service-access"];
  const regimes: DiscussionThermometerDesignRegimeV1[] = [
    "DISTRIBUTED_COMPLEMENTARY",
    "SHARED_CUE_PRIVATE_CORRECTION",
    "POLARIZED_PRIVATE_BLOCKS",
    "ASYMMETRIC_INFORMED_MINORITY",
  ];
  const statePanels = input.plan.variantTaskIds.flatMap(taskId => {
    const metadata = task(taskId);
    return input.plan.checkpoints.map(checkpoint => {
      const current = state({ observation: input.observation, taskId, checkpoint });
      return {
        taskId,
        baseScenarioId: metadata.baseScenarioId,
        designRegime: metadata.designRegime,
        checkpoint,
        coverage: current.roster.coverage,
        pooledProbabilitiesByOptionId: current.macrostate.pooledProbabilitiesByOptionId,
        meanNormalizedReportEntropy: current.macrostate.meanNormalizedReportEntropy,
        normalizedGeneralizedJsd: current.macrostate.normalizedGeneralizedJsd,
        meanPairwiseTotalVariation: current.macrostate.meanPairwiseTotalVariation,
        maxPairwiseTotalVariation: current.macrostate.maxPairwiseTotalVariation,
      };
    });
  });

  const resolutionRows = regimePairs(regimes).map(([leftRegime, rightRegime]) => {
    const baseRows = bases.map(baseScenarioId => {
      const leftTask = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.find(value =>
        value.baseScenarioId === baseScenarioId && value.designRegime === leftRegime)!;
      const rightTask = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.find(value =>
        value.baseScenarioId === baseScenarioId && value.designRegime === rightRegime)!;
      const left = state({ observation: input.observation,
        taskId: leftTask.taskId, checkpoint: 0 });
      const right = state({ observation: input.observation,
        taskId: rightTask.taskId, checkpoint: 0 });
      const comparable = input.plan.agentIds.filter(agentId =>
        left.measurement.replicateTotalVariationByAgentId[agentId] !== undefined
        && right.measurement.replicateTotalVariationByAgentId[agentId] !== undefined);
      const separated = comparable.filter(agentId => {
        const between = tv(left.microstate.beliefProbabilitiesByAgentId[agentId],
          right.microstate.beliefProbabilitiesByAgentId[agentId], left.optionIds);
        const reference = Math.max(
          left.measurement.replicateTotalVariationByAgentId[agentId],
          right.measurement.replicateTotalVariationByAgentId[agentId],
        );
        return between > reference + 1e-12;
      });
      return {
        baseScenarioId,
        replicateComparableAgentCount: comparable.length,
        separatedAgentCount: separated.length,
        separatedFraction: comparable.length ? separated.length / comparable.length : null,
        passMajority: comparable.length === input.plan.agentIds.length
          && separated.length > comparable.length / 2,
      };
    });
    return {
      leftRegime, rightRegime, bases: baseRows,
      passBothBases: baseRows.every(row => row.passMajority),
    };
  });

  const lateRows = regimes.map(designRegime => {
    const baseRows = bases.map(baseScenarioId => {
      const metadata = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.find(value =>
        value.baseScenarioId === baseScenarioId && value.designRegime === designRegime)!;
      const trajectory = input.observation.trajectories.find(value =>
        value.taskId === metadata.taskId)!.trajectory;
      const transition = trajectory.readings.find(reading =>
        reading.checkpointIndex === 2)!.transitionFromPrevious!;
      const reference = transition.repeatabilityReference;
      return {
        baseScenarioId,
        replicateComparableAgentCount: reference.replicateComparableAgentIds.length,
        separatedAgentCount:
          reference.primaryActivityAboveBothEndpointRepeatabilitiesAgentIds.length,
        separatedFraction:
          reference.primaryActivityAboveBothEndpointRepeatabilitiesFraction,
        passMajority: reference.replicateComparableAgentIds.length === input.plan.agentIds.length
          && reference.primaryActivityAboveBothEndpointRepeatabilitiesAgentIds.length
            > reference.replicateComparableAgentIds.length / 2,
      };
    });
    return {
      designRegime, bases: baseRows,
      passBothBases: baseRows.every(row => row.passMajority),
    };
  });

  const validPrimaryCount = input.observation.trajectories.reduce((total, item) =>
    total + item.trajectory.readings.reduce((subtotal, reading) =>
      subtotal + reading.state.measurement.validPrimaryReportCount, 0), 0);
  const expectedPrimaryCount = input.plan.variantTaskIds.length
    * input.plan.checkpoints.length * input.plan.agentIds.length;
  const resolutionPassCount = resolutionRows.filter(row => row.passBothBases).length;
  const latePassCount = lateRows.filter(row => row.passBothBases).length;
  const gates: DiscussionThermometerStateSpaceCalibrationAnalysisV1["gates"] = [
    {
      id: "G0_TERMINAL_ACCOUNTING",
      pass: input.publicRun.terminalCellCount === input.publicRun.registeredCellCount
        && input.sensorRun.terminalCellCount === input.sensorRun.registeredCellCount,
      detail: `${input.publicRun.terminalCellCount}/${input.publicRun.registeredCellCount} public and ${input.sensorRun.terminalCellCount}/${input.sensorRun.registeredCellCount} sensor terminals accounted.`,
    },
    {
      id: "G1_SENSOR_USABILITY",
      pass: validPrimaryCount / expectedPrimaryCount >= 0.95,
      detail: `${validPrimaryCount}/${expectedPrimaryCount} primary reports valid; missing reports remain in the denominator.`,
    },
    {
      id: "G2_STATE_RESOLUTION",
      pass: resolutionPassCount >= 3,
      detail: `${resolutionPassCount}/6 regime pairs show majority per-agent X0 separation above duplicate references in both bases.`,
    },
    {
      id: "G3_LATE_MOTION",
      pass: latePassCount >= 2,
      detail: `${latePassCount}/4 regimes show majority per-agent X1-to-X2 motion above both endpoint duplicate gaps in both bases.`,
    },
  ];
  const allResourceGatesPass = gates.every(gate => gate.pass);
  const body: Omit<DiscussionThermometerStateSpaceCalibrationAnalysisV1, "contentHash"> = {
    analysisRef: DISCUSSION_THERMOMETER_STATE_SPACE_CALIBRATION_ANALYSIS_V1,
    evidenceClass: input.evidenceClass,
    inferenceStatus: "descriptive_resource_gate_only",
    truthAccess: "none",
    predictionUsed: false,
    statePanels,
    stateResolution: {
      regimePairs: resolutionRows,
      pairCountPassingBothBases: resolutionPassCount,
    },
    lateMotion: {
      regimes: lateRows,
      regimeCountPassingBothBases: latePassCount,
    },
    gates,
    allResourceGatesPass,
    routing: input.evidenceClass === "synthetic_mock" ? "MOCK_WIRING_ONLY"
      : allResourceGatesPass ? "READY_FOR_HUMAN_REVIEW_NOT_EXECUTION" : "NO_GO_REDESIGN",
    claimCeiling: input.evidenceClass === "synthetic_mock"
      ? "Synthetic data validate computation and replay only; they provide no evidence about LLM discussion states."
      : "Passing resource gates supports an observed reported-belief trajectory on these tasks, not prediction, causal regime effects, correctness, recovery, or governance.",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
