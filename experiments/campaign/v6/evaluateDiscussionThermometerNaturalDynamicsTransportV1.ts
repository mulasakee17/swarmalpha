import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import type { DiscussionThermometerDesignRegimeV1 } from
  "./discussionThermometerStateSpaceCoveragePlanV1";
import {
  verifyDiscussionThermometerNaturalDynamicsTransportPlanV1,
  type DiscussionThermometerNaturalDynamicsTransportPlanV1,
} from "./discussionThermometerNaturalDynamicsTransportPlanV1";
import { DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1 } from
  "./discussionThermometerNaturalDynamicsTransportTaskBankV1";
import {
  verifyNaturalDynamicsObservationV1,
  type NaturalDynamicsObservationV1,
  type NaturalDynamicsPublicRunV1,
  type NaturalDynamicsSensorFreezeV1,
  type NaturalDynamicsSensorRunV1,
} from "./runDiscussionThermometerNaturalDynamicsV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_EVALUATION_V1 =
  Object.freeze({
    id: "swarmalpha.evaluation.v6.discussion-thermometer-natural-dynamics-transport",
    version: "1.0.0",
    tolerance: 1e-12,
  });

type BaseScenarioId = "backup-power" | "aerial-navigation";
type TransitionClass = "resolved_majority_motion"
  | "within_repeatability_envelope_all_agents"
  | "heterogeneous_submajority_motion"
  | "incomplete_measurement";

interface TransitionRow {
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
  exactPrimaryPlateau: boolean;
  classification: TransitionClass;
}

export interface DiscussionThermometerNaturalDynamicsTransportEvaluationV1 {
  evaluationRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_EVALUATION_V1;
  planHash: string;
  sourceObservationHash: string;
  sourceReplicationEvaluationHash: string;
  evidenceClass: "synthetic_mock" | "provider_observation";
  truthAccess: "none";
  predictionUsed: false;
  actionUsed: false;
  operationalDefinition: {
    agentActivity: "TV(primary_from,primary_to)";
    localRepeatabilityEnvelope: "max(TV(primary_from,duplicate_from),TV(primary_to,duplicate_to))";
    resolvedAgentMotion: "agent_activity>local_repeatability_envelope+tolerance";
    resolvedGroupMotion: "complete_roster_and_strict_majority_resolved_agent_motion";
  };
  transitionRows: TransitionRow[];
  executionCompleteness: {
    taskCount: number;
    checkpointCountPerTrajectory: number;
    transitionCountPerTrajectory: number;
    observedTransitionCount: number;
  };
  registeredRules: {
    polarizedLateEnvelopeTransport: {
      requiredConsecutiveLateEnvelopeTransitionsPerBase: 2;
      byBase: Array<{
        baseScenarioId: BaseScenarioId;
        lateClasses: TransitionClass[];
        maximumConsecutiveEnvelopeTransitions: number;
        pass: boolean;
      }>;
      pass: boolean;
    };
    sharedCueMotionResourceTransport: {
      requiredResolvedMajorityTransitionsPerBase: 1;
      byBase: Array<{
        baseScenarioId: BaseScenarioId;
        transitionClasses: TransitionClass[];
        resolvedMajorityTransitionCount: number;
        pass: boolean;
      }>;
      pass: boolean;
    };
  };
  overallRegisteredRulesPass: boolean;
  interpretationStatus: "MOCK_WIRING_ONLY"
    | "NEW_SCENARIO_TRANSPORT_CRITERIA_PASS"
    | "NEW_SCENARIO_TRANSPORT_CRITERIA_FAIL";
  identificationCeiling: string;
  contentHash: string;
}

function taskMetadata(taskId: string): {
  baseScenarioId: BaseScenarioId;
  designRegime: DiscussionThermometerDesignRegimeV1;
} {
  const task = DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1
    .find(candidate => candidate.taskId === taskId);
  if (!task) throw new Error("natural_dynamics_transport_task_missing");
  return {
    baseScenarioId: String(task.baseScenarioId) as BaseScenarioId,
    designRegime: task.designRegime,
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

function maximumConsecutive(values: readonly boolean[]): number {
  let current = 0;
  let maximum = 0;
  for (const value of values) {
    current = value ? current + 1 : 0;
    maximum = Math.max(maximum, current);
  }
  return maximum;
}

export function evaluateDiscussionThermometerNaturalDynamicsTransportV1(input: {
  plan: DiscussionThermometerNaturalDynamicsTransportPlanV1;
  publicRun: NaturalDynamicsPublicRunV1;
  sensorFreeze: NaturalDynamicsSensorFreezeV1;
  sensorRun: NaturalDynamicsSensorRunV1;
  observation: NaturalDynamicsObservationV1;
  evidenceClass: "synthetic_mock" | "provider_observation";
}): DiscussionThermometerNaturalDynamicsTransportEvaluationV1 {
  verifyDiscussionThermometerNaturalDynamicsTransportPlanV1(input.plan);
  verifyNaturalDynamicsObservationV1({
    plan: input.plan,
    publicRun: input.publicRun,
    sensorFreeze: input.sensorFreeze,
    sensorRun: input.sensorRun,
    observation: input.observation,
  });
  const transitionRows: TransitionRow[] = [];
  for (const item of input.observation.trajectories) {
    const metadata = taskMetadata(item.taskId);
    for (const reading of [...item.trajectory.readings]
      .sort((left, right) => left.checkpointIndex - right.checkpointIndex)) {
      const transition = reading.transitionFromPrevious;
      if (!transition) continue;
      const reference = transition.repeatabilityReference;
      const movers = [...reference
        .primaryActivityAboveBothEndpointRepeatabilitiesAgentIds];
      transitionRows.push({
        taskId: item.taskId,
        ...metadata,
        fromCheckpoint: reading.checkpointIndex - 1,
        toCheckpoint: reading.checkpointIndex,
        completeMatchedRoster: transition.completeMatchedRoster,
        replicateComparableAgentCount: reference.replicateComparableAgentIds.length,
        resolvedMoverAgentIds: movers,
        resolvedMoverFraction:
          reference.primaryActivityAboveBothEndpointRepeatabilitiesFraction,
        meanAgentTotalVariation: transition.meanAgentTotalVariation,
        pooledTotalVariation: transition.pooledTotalVariation,
        endpointMeanReplicateTotalVariation:
          reference.endpointMeanReplicateTotalVariation,
        exactPrimaryPlateau: transition.meanAgentTotalVariation !== null
          && transition.meanAgentTotalVariation <=
            DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_EVALUATION_V1.tolerance,
        classification: classify({
          completeMatchedRoster: transition.completeMatchedRoster,
          expectedAgentCount: input.plan.agentIds.length,
          comparableAgentCount: reference.replicateComparableAgentIds.length,
          resolvedMoverCount: movers.length,
        }),
      });
    }
  }
  if (transitionRows.length !== 16) {
    throw new Error("natural_dynamics_transport_transition_count_invalid");
  }

  const bases: BaseScenarioId[] = ["backup-power", "aerial-navigation"];
  const polarizedByBase = bases.map(baseScenarioId => {
    const rows = transitionRows.filter(row => row.baseScenarioId === baseScenarioId
      && row.designRegime === "POLARIZED_PRIVATE_BLOCKS"
      && row.fromCheckpoint >= 1)
      .sort((left, right) => left.toCheckpoint - right.toCheckpoint);
    const lateClasses = rows.map(row => row.classification);
    const maximum = maximumConsecutive(lateClasses.map(value =>
      value === "within_repeatability_envelope_all_agents"));
    return {
      baseScenarioId,
      lateClasses,
      maximumConsecutiveEnvelopeTransitions: maximum,
      pass: rows.length === 3 && maximum >= 2,
    };
  });
  const sharedCueByBase = bases.map(baseScenarioId => {
    const rows = transitionRows.filter(row => row.baseScenarioId === baseScenarioId
      && row.designRegime === "SHARED_CUE_PRIVATE_CORRECTION")
      .sort((left, right) => left.toCheckpoint - right.toCheckpoint);
    const transitionClasses = rows.map(row => row.classification);
    const resolvedCount = transitionClasses.filter(value =>
      value === "resolved_majority_motion").length;
    return {
      baseScenarioId,
      transitionClasses,
      resolvedMajorityTransitionCount: resolvedCount,
      pass: rows.length === 4 && resolvedCount >= 1,
    };
  });
  const polarizedPass = polarizedByBase.every(row => row.pass);
  const sharedCuePass = sharedCueByBase.every(row => row.pass);
  const overallPass = polarizedPass && sharedCuePass;
  const body: Omit<DiscussionThermometerNaturalDynamicsTransportEvaluationV1,
  "contentHash"> = {
    evaluationRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_EVALUATION_V1,
    planHash: input.plan.contentHash,
    sourceObservationHash: input.observation.contentHash,
    sourceReplicationEvaluationHash: input.plan.sourceReplicationEvaluationHash,
    evidenceClass: input.evidenceClass,
    truthAccess: "none",
    predictionUsed: false,
    actionUsed: false,
    operationalDefinition: {
      agentActivity: "TV(primary_from,primary_to)",
      localRepeatabilityEnvelope:
        "max(TV(primary_from,duplicate_from),TV(primary_to,duplicate_to))",
      resolvedAgentMotion:
        "agent_activity>local_repeatability_envelope+tolerance",
      resolvedGroupMotion:
        "complete_roster_and_strict_majority_resolved_agent_motion",
    },
    transitionRows,
    executionCompleteness: {
      taskCount: input.observation.trajectories.length,
      checkpointCountPerTrajectory: input.plan.checkpoints.length,
      transitionCountPerTrajectory: input.plan.checkpoints.length - 1,
      observedTransitionCount: transitionRows.length,
    },
    registeredRules: {
      polarizedLateEnvelopeTransport: {
        requiredConsecutiveLateEnvelopeTransitionsPerBase: 2,
        byBase: polarizedByBase,
        pass: polarizedPass,
      },
      sharedCueMotionResourceTransport: {
        requiredResolvedMajorityTransitionsPerBase: 1,
        byBase: sharedCueByBase,
        pass: sharedCuePass,
      },
    },
    overallRegisteredRulesPass: overallPass,
    interpretationStatus: input.evidenceClass === "synthetic_mock"
      ? "MOCK_WIRING_ONLY"
      : overallPass
        ? "NEW_SCENARIO_TRANSPORT_CRITERIA_PASS"
        : "NEW_SCENARIO_TRANSPORT_CRITERIA_FAIL",
    identificationCeiling: "A provider pass supports transport of the two registered observation resources to these two prospective scenario families at exact-duplicate resolution. It does not establish universal task transport, latent-state validity, correctness, dwell-time distributions, hazards, attractors, metastability, intervention effects, or governance value.",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
