import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1";
import {
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
  type DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryPlanV1";
import {
  verifyNaturalDynamicsObservationV1,
  type NaturalDynamicsObservationV1,
  type NaturalDynamicsPublicRunV1,
  type NaturalDynamicsSensorFreezeV1,
  type NaturalDynamicsSensorRunV1,
} from "./runDiscussionThermometerNaturalDynamicsV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_EVALUATION_V1 = Object.freeze({
  id: "swarmalpha.evaluation.v6.discussion-thermometer-natural-dynamics-literature-canary",
  version: "1.1.0",
  tolerance: 1e-12,
});

type TransitionClass = "resolved_majority_motion" | "within_repeatability_envelope_all_agents" | "heterogeneous_submajority_motion" | "incomplete_measurement";

export interface DiscussionThermometerNaturalDynamicsLiteratureCanaryEvaluationV1 {
  evaluationRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_EVALUATION_V1;
  planHash: string;
  sourceObservationHash: string;
  evidenceClass: "synthetic_mock" | "provider_observation";
  onlineTruthAccess: "none";
  truthAccess: "offline_analyzer_only";
  predictionUsed: false;
  actionUsed: false;
  operationalDefinition: {
    agentActivity: "TV(primary_from,primary_to)";
    localRepeatabilityEnvelope: "max(TV(primary_from,duplicate_from),TV(primary_to,duplicate_to))";
    resolvedAgentMotion: "agent_activity>local_repeatability_envelope+tolerance";
    resolvedGroupMotion: "complete_roster_and_strict_majority_resolved_agent_motion";
  };
  trajectoryRows: Array<{
    taskId: string;
    sourceTaskId: 4 | 6;
    sourceTaskName: string;
    agentCount: number;
    optionCount: number;
    checkpoints: Array<{ checkpoint: number; pooledMulticlassBrierSum: number | null; pooledTopOptionId: string | null; pooledConcentration: number | null }>;
    transitions: Array<{ fromCheckpoint: number; toCheckpoint: number; meanAgentTotalVariation: number | null; pooledTotalVariation: number | null; classification: TransitionClass }>;
  }>;
  observationCompleteness: {
    expectedTaskCount: 2;
    expectedCheckpointCountPerTrajectory: 5;
    expectedTransitionCount: 8;
    observedTaskCount: number;
    observedCheckpointCount: number;
    observedTransitionCount: number;
    completeMatchedTransitionCount: number;
    validRepeatPairCount: number;
    allCellsComplete: boolean;
  };
  offlineCorrectness: {
    pooledMulticlassBrierSumAvailableCheckpointCount: number;
    pooledTopOptionAvailableCheckpointCount: number;
    pooledTopOptionCorrectCount: number;
    note: "Uses the pinned resolver only after truth-blind observation is sealed.";
  };
  interpretationStatus: "MOCK_WIRING_ONLY" | "LITERATURE_CANARY_OBSERVATION_READY";
  claimCeiling: string;
  contentHash: string;
}

function topOption(optionIds: readonly string[], probabilities: Readonly<Record<string, number>> | null): string | null {
  if (!probabilities) return null;
  const max = Math.max(...optionIds.map(optionId => probabilities[optionId]));
  const tops = optionIds.filter(optionId => probabilities[optionId] === max);
  return tops.length === 1 ? tops[0] : null;
}

function brier(optionIds: readonly string[], probabilities: Readonly<Record<string, number>> | null, correctOptionId: string): number | null {
  if (!probabilities) return null;
  return optionIds.reduce((sum, optionId) => sum + (probabilities[optionId] - (optionId === correctOptionId ? 1 : 0)) ** 2, 0);
}

function classify(input: { completeMatchedRoster: boolean; expectedAgentCount: number; comparableAgentCount: number; resolvedMoverCount: number }): TransitionClass {
  if (!input.completeMatchedRoster || input.comparableAgentCount !== input.expectedAgentCount) return "incomplete_measurement";
  if (input.resolvedMoverCount > input.comparableAgentCount / 2) return "resolved_majority_motion";
  if (input.resolvedMoverCount === 0) return "within_repeatability_envelope_all_agents";
  return "heterogeneous_submajority_motion";
}

export function evaluateDiscussionThermometerNaturalDynamicsLiteratureCanaryV1(input: {
  plan: DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1;
  publicRun: NaturalDynamicsPublicRunV1;
  sensorFreeze: NaturalDynamicsSensorFreezeV1;
  sensorRun: NaturalDynamicsSensorRunV1;
  observation: NaturalDynamicsObservationV1;
  evidenceClass: "synthetic_mock" | "provider_observation";
}): DiscussionThermometerNaturalDynamicsLiteratureCanaryEvaluationV1 {
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1(input.plan);
  verifyNaturalDynamicsObservationV1({ plan: input.plan, publicRun: input.publicRun, sensorFreeze: input.sensorFreeze, sensorRun: input.sensorRun, observation: input.observation });
  const trajectoryRows = input.observation.trajectories.map(item => {
    const task = DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1.find(candidate => candidate.taskId === item.taskId);
    if (!task) throw new Error("natural_dynamics_literature_canary_task_missing");
    const optionIds = task.claim.options.map(option => option.optionId);
    const checkpoints = item.trajectory.readings.map(reading => ({
      checkpoint: reading.checkpointIndex,
      pooledMulticlassBrierSum: brier(optionIds, reading.state.macrostate.pooledProbabilitiesByOptionId, task.offlineResolution.correctOptionId),
      pooledTopOptionId: topOption(optionIds, reading.state.macrostate.pooledProbabilitiesByOptionId),
      pooledConcentration: reading.state.macrostate.pooledConcentration,
    }));
    const transitions = item.trajectory.readings.filter(reading => reading.transitionFromPrevious).map(reading => {
      const transition = reading.transitionFromPrevious!;
      const reference = transition.repeatabilityReference;
      return {
        fromCheckpoint: reading.checkpointIndex - 1,
        toCheckpoint: reading.checkpointIndex,
        meanAgentTotalVariation: transition.meanAgentTotalVariation,
        pooledTotalVariation: transition.pooledTotalVariation,
        classification: classify({
          completeMatchedRoster: transition.completeMatchedRoster,
          expectedAgentCount: task.agents.length,
          comparableAgentCount: reference.replicateComparableAgentIds.length,
          resolvedMoverCount: reference.primaryActivityAboveBothEndpointRepeatabilitiesAgentIds.length,
        }),
      };
    });
    return { taskId: item.taskId, sourceTaskId: task.sourceTaskId, sourceTaskName: task.sourceTaskName, agentCount: task.agents.length, optionCount: optionIds.length, checkpoints, transitions };
  });
  const transitions = trajectoryRows.flatMap(row => row.transitions);
  const checkpointRows = trajectoryRows.flatMap(row => row.checkpoints);
  const pooledBrierAvailable = checkpointRows.filter(row => row.pooledMulticlassBrierSum !== null);
  const topAvailable = checkpointRows.filter(row => row.pooledTopOptionId !== null);
  const taskStates = input.observation.trajectories.flatMap(item => item.trajectory.readings);
  const validRepeatPairCount = taskStates.reduce((sum, reading) => sum + reading.state.measurement.validRepeatPairCount, 0);
  const pooledTopOptionCorrectCount = trajectoryRows.reduce((sum, row) => {
    const task = DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1.find(candidate => candidate.taskId === row.taskId)!;
    return sum + row.checkpoints.filter(checkpoint => checkpoint.pooledTopOptionId === task.offlineResolution.correctOptionId).length;
  }, 0);
  const body: Omit<DiscussionThermometerNaturalDynamicsLiteratureCanaryEvaluationV1, "contentHash"> = {
    evaluationRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_EVALUATION_V1,
    planHash: input.plan.contentHash,
    sourceObservationHash: input.observation.contentHash,
    evidenceClass: input.evidenceClass,
    onlineTruthAccess: "none",
    truthAccess: "offline_analyzer_only",
    predictionUsed: false,
    actionUsed: false,
    operationalDefinition: {
      agentActivity: "TV(primary_from,primary_to)",
      localRepeatabilityEnvelope: "max(TV(primary_from,duplicate_from),TV(primary_to,duplicate_to))",
      resolvedAgentMotion: "agent_activity>local_repeatability_envelope+tolerance",
      resolvedGroupMotion: "complete_roster_and_strict_majority_resolved_agent_motion",
    },
    trajectoryRows,
    observationCompleteness: {
      expectedTaskCount: 2,
      expectedCheckpointCountPerTrajectory: 5,
      expectedTransitionCount: 8,
      observedTaskCount: trajectoryRows.length,
      observedCheckpointCount: checkpointRows.length,
      observedTransitionCount: transitions.length,
      completeMatchedTransitionCount: transitions.filter(row => row.classification !== "incomplete_measurement").length,
      validRepeatPairCount,
      allCellsComplete: trajectoryRows.length === 2 && checkpointRows.length === 10 && transitions.length === 8 && transitions.every(row => row.classification !== "incomplete_measurement") && validRepeatPairCount === 30,
    },
    offlineCorrectness: {
      pooledMulticlassBrierSumAvailableCheckpointCount: pooledBrierAvailable.length,
      pooledTopOptionAvailableCheckpointCount: topAvailable.length,
      pooledTopOptionCorrectCount,
      note: "Uses the pinned resolver only after truth-blind observation is sealed.",
    },
    interpretationStatus: input.evidenceClass === "synthetic_mock" ? "MOCK_WIRING_ONLY" : "LITERATURE_CANARY_OBSERVATION_READY",
    claimCeiling: "The canary tests whether the existing observation layer can be applied to two pinned, literature-adapted HiddenBench tasks with three agents and four options. It does not establish a general collective-dynamics law, task-family transport, intervention effect, or governance value.",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
