import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import type { DiscussionThermometerDesignRegimeV1 } from
  "./discussionThermometerStateSpaceCoveragePlanV1";
import type { DiscussionThermometerStateSpaceCalibrationPlanV1 } from
  "./discussionThermometerStateSpaceCalibrationPlanV1";
import { DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1 } from
  "./discussionThermometerStateSpaceTaskBankV1";
import {
  verifyDiscussionThermometerCalibrationObservationV1,
  type DiscussionThermometerCalibrationObservationV1,
  type DiscussionThermometerCalibrationPublicRunV1,
  type DiscussionThermometerCalibrationSensorFreezeV1,
  type DiscussionThermometerCalibrationSensorRunV1,
} from "./runDiscussionThermometerStateSpaceCalibrationV1";
import {
  verifyNaturalDynamicsObservationV1,
  type NaturalDynamicsObservationV1,
  type NaturalDynamicsPublicRunV1,
  type NaturalDynamicsSensorFreezeV1,
  type NaturalDynamicsSensorRunV1,
} from "./runDiscussionThermometerNaturalDynamicsV1";
import type { DiscussionThermometerNaturalDynamicsPlanV1 } from
  "./discussionThermometerNaturalDynamicsPlanV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_ANALYSIS_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.discussion-thermometer-natural-dynamics",
  version: "1.0.0",
  tolerance: 1e-12,
});

type BaseScenarioId = "thermal-loop" | "service-access";
type TransitionClass = "resolved_majority_motion"
  | "within_repeatability_envelope_all_agents"
  | "heterogeneous_submajority_motion"
  | "incomplete_measurement";

export interface DiscussionThermometerNaturalDynamicsAnalysisV1 {
  analysisRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_ANALYSIS_V1;
  evidenceClass: "synthetic_mock" | "provider_observation";
  inferenceStatus: "descriptive_natural_dynamics_development_only";
  truthAccess: "none";
  predictionUsed: false;
  actionUsed: false;
  operationalDefinition: {
    agentActivity: "TV(primary_from,primary_to)";
    localRepeatabilityEnvelope: "max(TV(primary_from,duplicate_from),TV(primary_to,duplicate_to))";
    resolvedAgentMotion: "agent_activity>local_repeatability_envelope+tolerance";
    resolvedGroupMotion: "complete_roster_and_strict_majority_resolved_agent_motion";
    envelopeMeaning: string;
  };
  transitionRows: Array<{
    taskId: string;
    baseScenarioId: BaseScenarioId;
    designRegime: DiscussionThermometerDesignRegimeV1;
    fromCheckpoint: number;
    toCheckpoint: number;
    completeMatchedRoster: boolean;
    replicateComparableAgentCount: number;
    resolvedMoverAgentIds: string[];
    resolvedMoverFraction: number | null;
    meanAgentTotalVariation: number | null;
    pooledTotalVariation: number | null;
    endpointMeanReplicateTotalVariation: number | null;
    minimumAgentMargin: number | null;
    maximumAgentMargin: number | null;
    exactPrimaryPlateau: boolean;
    classification: TransitionClass;
  }>;
  crossScenarioPatterns: Array<{
    designRegime: DiscussionThermometerDesignRegimeV1;
    bases: Array<{
      baseScenarioId: BaseScenarioId;
      earlyClass: TransitionClass;
      lateClass: TransitionClass;
    }>;
    sameLateClassAcrossBases: boolean;
    replicatedLateResolvedMajorityMotion: boolean;
    replicatedLateEnvelopeCandidate: boolean;
  }>;
  summary: {
    transitionCount: number;
    completeTransitionCount: number;
    resolvedMajorityMotionCount: number;
    withinRepeatabilityEnvelopeCount: number;
    heterogeneousSubmajorityMotionCount: number;
    exactPrimaryPlateauCount: number;
    replicatedLateResolvedMotionRegimes: DiscussionThermometerDesignRegimeV1[];
    replicatedLateEnvelopeCandidateRegimes: DiscussionThermometerDesignRegimeV1[];
  };
  identificationLimits: {
    checkpointCountPerTrajectory: number;
    transitionCountPerTrajectory: number;
    dwellTimeIdentifiable: false;
    transitionHazardIdentifiable: false;
    attractorOrMetastabilityIdentifiable: false;
    reasons: string[];
  };
  routing: "MOCK_WIRING_ONLY" | "LONGER_WITHIN_BATCH_TRAJECTORY_REQUIRED";
  claimCeiling: string;
  contentHash: string;
}

function taskMetadata(taskId: string): {
  baseScenarioId: BaseScenarioId;
  designRegime: DiscussionThermometerDesignRegimeV1;
} {
  const value = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1
    .find(candidate => candidate.taskId === taskId);
  if (!value) throw new Error("natural_dynamics_task_missing");
  return {
    baseScenarioId: value.baseScenarioId,
    designRegime: value.designRegime,
  };
}

function classify(input: {
  completeMatchedRoster: boolean;
  expectedAgentCount: number;
  comparableAgentCount: number;
  resolvedMoverCount: number;
}): TransitionClass {
  if (!input.completeMatchedRoster
    || input.comparableAgentCount !== input.expectedAgentCount) {
    return "incomplete_measurement";
  }
  if (input.resolvedMoverCount > input.comparableAgentCount / 2) {
    return "resolved_majority_motion";
  }
  if (input.resolvedMoverCount === 0) {
    return "within_repeatability_envelope_all_agents";
  }
  return "heterogeneous_submajority_motion";
}

export function analyzeDiscussionThermometerNaturalDynamicsV1(input: {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1 | DiscussionThermometerNaturalDynamicsPlanV1;
  publicRun: DiscussionThermometerCalibrationPublicRunV1 | NaturalDynamicsPublicRunV1;
  sensorFreeze: DiscussionThermometerCalibrationSensorFreezeV1 | NaturalDynamicsSensorFreezeV1;
  sensorRun: DiscussionThermometerCalibrationSensorRunV1 | NaturalDynamicsSensorRunV1;
  observation: DiscussionThermometerCalibrationObservationV1 | NaturalDynamicsObservationV1;
  evidenceClass: "synthetic_mock" | "provider_observation";
}): DiscussionThermometerNaturalDynamicsAnalysisV1 {
  if ("variantTaskIds" in input.plan) {
    verifyDiscussionThermometerCalibrationObservationV1(input as {
      plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
      publicRun: DiscussionThermometerCalibrationPublicRunV1;
      sensorFreeze: DiscussionThermometerCalibrationSensorFreezeV1;
      sensorRun: DiscussionThermometerCalibrationSensorRunV1;
      observation: DiscussionThermometerCalibrationObservationV1;
    });
  } else {
    verifyNaturalDynamicsObservationV1(input as {
      plan: DiscussionThermometerNaturalDynamicsPlanV1;
      publicRun: NaturalDynamicsPublicRunV1;
      sensorFreeze: NaturalDynamicsSensorFreezeV1;
      sensorRun: NaturalDynamicsSensorRunV1;
      observation: NaturalDynamicsObservationV1;
    });
  }
  const transitionRows: DiscussionThermometerNaturalDynamicsAnalysisV1["transitionRows"] = [];
  for (const item of input.observation.trajectories) {
    const metadata = taskMetadata(item.taskId);
    const readings = [...item.trajectory.readings]
      .sort((left, right) => left.checkpointIndex - right.checkpointIndex);
    for (const reading of readings) {
      const transition = reading.transitionFromPrevious;
      if (!transition) continue;
      const reference = transition.repeatabilityReference;
      const margins = reference.replicateComparableAgentIds
        .map(agentId => reference.primaryActivityMinusMaxEndpointRepeatabilityByAgentId[agentId]);
      const classification = classify({
        completeMatchedRoster: transition.completeMatchedRoster,
        expectedAgentCount: input.plan.agentIds.length,
        comparableAgentCount: reference.replicateComparableAgentIds.length,
        resolvedMoverCount: reference.primaryActivityAboveBothEndpointRepeatabilitiesAgentIds.length,
      });
      transitionRows.push({
        taskId: item.taskId,
        ...metadata,
        fromCheckpoint: reading.checkpointIndex - 1,
        toCheckpoint: reading.checkpointIndex,
        completeMatchedRoster: transition.completeMatchedRoster,
        replicateComparableAgentCount: reference.replicateComparableAgentIds.length,
        resolvedMoverAgentIds:
          [...reference.primaryActivityAboveBothEndpointRepeatabilitiesAgentIds],
        resolvedMoverFraction:
          reference.primaryActivityAboveBothEndpointRepeatabilitiesFraction,
        meanAgentTotalVariation: transition.meanAgentTotalVariation,
        pooledTotalVariation: transition.pooledTotalVariation,
        endpointMeanReplicateTotalVariation: reference.endpointMeanReplicateTotalVariation,
        minimumAgentMargin: margins.length ? Math.min(...margins) : null,
        maximumAgentMargin: margins.length ? Math.max(...margins) : null,
        exactPrimaryPlateau: transition.meanAgentTotalVariation !== null
          && transition.meanAgentTotalVariation <=
            DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_ANALYSIS_V1.tolerance,
        classification,
      });
    }
  }

  const regimes = [...new Set(transitionRows.map(row => row.designRegime))];
  const bases: BaseScenarioId[] = ["thermal-loop", "service-access"];
  const crossScenarioPatterns = regimes.map(designRegime => {
    const baseRows = bases.map(baseScenarioId => {
      const rows = transitionRows.filter(row => row.designRegime === designRegime
        && row.baseScenarioId === baseScenarioId);
      const early = rows.find(row => row.toCheckpoint === 1);
      const late = rows.find(row => row.toCheckpoint === 2);
      if (!early || !late) throw new Error("natural_dynamics_transition_missing");
      return {
        baseScenarioId,
        earlyClass: early.classification,
        lateClass: late.classification,
      };
    });
    const lateClasses = baseRows.map(row => row.lateClass);
    return {
      designRegime,
      bases: baseRows,
      sameLateClassAcrossBases: new Set(lateClasses).size === 1,
      replicatedLateResolvedMajorityMotion: lateClasses.every(value =>
        value === "resolved_majority_motion"),
      replicatedLateEnvelopeCandidate: lateClasses.every(value =>
        value === "within_repeatability_envelope_all_agents"),
    };
  });

  const body: Omit<DiscussionThermometerNaturalDynamicsAnalysisV1, "contentHash"> = {
    analysisRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_ANALYSIS_V1,
    evidenceClass: input.evidenceClass,
    inferenceStatus: "descriptive_natural_dynamics_development_only",
    truthAccess: "none",
    predictionUsed: false,
    actionUsed: false,
    operationalDefinition: {
      agentActivity: "TV(primary_from,primary_to)",
      localRepeatabilityEnvelope:
        "max(TV(primary_from,duplicate_from),TV(primary_to,duplicate_to))",
      resolvedAgentMotion: "agent_activity>local_repeatability_envelope+tolerance",
      resolvedGroupMotion: "complete_roster_and_strict_majority_resolved_agent_motion",
      envelopeMeaning: "Failure to exceed one exact-duplicate envelope is an instrument-resolution statement, not proof of latent stability or equivalence.",
    },
    transitionRows,
    crossScenarioPatterns,
    summary: {
      transitionCount: transitionRows.length,
      completeTransitionCount: transitionRows.filter(row =>
        row.classification !== "incomplete_measurement").length,
      resolvedMajorityMotionCount: transitionRows.filter(row =>
        row.classification === "resolved_majority_motion").length,
      withinRepeatabilityEnvelopeCount: transitionRows.filter(row =>
        row.classification === "within_repeatability_envelope_all_agents").length,
      heterogeneousSubmajorityMotionCount: transitionRows.filter(row =>
        row.classification === "heterogeneous_submajority_motion").length,
      exactPrimaryPlateauCount: transitionRows.filter(row => row.exactPrimaryPlateau).length,
      replicatedLateResolvedMotionRegimes: crossScenarioPatterns
        .filter(row => row.replicatedLateResolvedMajorityMotion)
        .map(row => row.designRegime),
      replicatedLateEnvelopeCandidateRegimes: crossScenarioPatterns
        .filter(row => row.replicatedLateEnvelopeCandidate)
        .map(row => row.designRegime),
    },
    identificationLimits: {
      checkpointCountPerTrajectory: input.plan.checkpoints.length,
      transitionCountPerTrajectory: input.plan.checkpoints.length - 1,
      dwellTimeIdentifiable: false,
      transitionHazardIdentifiable: false,
      attractorOrMetastabilityIdentifiable: false,
      reasons: [
        "Only two adjacent transitions are observed per trajectory, so a late envelope event has no observed continuation.",
        "There is one task per base-scenario/regime cell and one provider batch; task and batch variation are not estimable.",
        "One exact duplicate per endpoint supplies a local resolution reference, not an equivalence distribution.",
        "The information-allocation regimes are development designs, not randomized treatment arms for causal comparison.",
      ],
    },
    routing: input.evidenceClass === "synthetic_mock"
      ? "MOCK_WIRING_ONLY" : "LONGER_WITHIN_BATCH_TRAJECTORY_REQUIRED",
    claimCeiling: input.evidenceClass === "synthetic_mock"
      ? "Synthetic trajectories validate classification and replay only."
      : "The frozen run supports duplicate-adjusted descriptions of two natural discussion transitions and cross-scenario late stability candidates only; it does not identify dwell time, transition hazards, attractors, metastability, prediction, intervention, or governance.",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
