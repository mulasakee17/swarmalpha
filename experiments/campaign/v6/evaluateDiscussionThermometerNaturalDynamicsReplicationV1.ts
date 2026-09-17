import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import type { DiscussionThermometerNaturalDynamicsAnalysisV1 } from
  "./analyzeDiscussionThermometerNaturalDynamicsV1";
import type { DiscussionThermometerNaturalDynamicsPlanV1 } from
  "./discussionThermometerNaturalDynamicsPlanV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_REPLICATION_EVALUATION_V1 =
  Object.freeze({
    id: "swarmalpha.evaluation.v6.discussion-thermometer-natural-dynamics-replication",
    version: "1.0.0",
  });

type BaseScenarioId = "thermal-loop" | "service-access";
type TransitionClass = DiscussionThermometerNaturalDynamicsAnalysisV1["transitionRows"][number]["classification"];

export interface DiscussionThermometerNaturalDynamicsReplicationEvaluationV1 {
  evaluationRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_REPLICATION_EVALUATION_V1;
  planHash: string;
  sourceAnalysisHash: string;
  evidenceClass: "provider_observation";
  truthAccess: "none";
  predictionUsed: false;
  actionUsed: false;
  executionCompleteness: {
    taskCount: 4;
    checkpointCountPerTrajectory: 5;
    transitionCountPerTrajectory: 4;
    observedTransitionCount: 16;
  };
  registeredRules: {
    polarizedLateEnvelopeReplication: {
      requiredConsecutiveLateEnvelopeTransitionsPerBase: 2;
      byBase: Array<{
        baseScenarioId: BaseScenarioId;
        lateClasses: TransitionClass[];
        maximumConsecutiveEnvelopeTransitions: number;
        pass: boolean;
      }>;
      pass: boolean;
    };
    sharedCueMotionResourceReplication: {
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
  interpretationStatus: "TARGETED_REPLICATION_CRITERIA_PASS"
    | "TARGETED_REPLICATION_CRITERIA_FAIL";
  identificationCeiling: string;
  nextScientificRequirement: string;
  contentHash: string;
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

export function evaluateDiscussionThermometerNaturalDynamicsReplicationV1(input: {
  plan: DiscussionThermometerNaturalDynamicsPlanV1;
  analysis: DiscussionThermometerNaturalDynamicsAnalysisV1;
}): DiscussionThermometerNaturalDynamicsReplicationEvaluationV1 {
  if (input.analysis.evidenceClass !== "provider_observation"
    || input.analysis.truthAccess !== "none"
    || input.plan.taskIds.length !== 4
    || input.plan.checkpoints.length !== 5
    || input.analysis.transitionRows.length !== 16) {
    throw new Error("natural_dynamics_replication_input_invalid");
  }

  const bases: BaseScenarioId[] = ["thermal-loop", "service-access"];
  const polarizedByBase = bases.map(baseScenarioId => {
    const rows = input.analysis.transitionRows
      .filter(row => row.baseScenarioId === baseScenarioId
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
    const rows = input.analysis.transitionRows
      .filter(row => row.baseScenarioId === baseScenarioId
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
  const body: Omit<DiscussionThermometerNaturalDynamicsReplicationEvaluationV1,
  "contentHash"> = {
    evaluationRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_REPLICATION_EVALUATION_V1,
    planHash: input.plan.contentHash,
    sourceAnalysisHash: input.analysis.contentHash,
    evidenceClass: "provider_observation",
    truthAccess: "none",
    predictionUsed: false,
    actionUsed: false,
    executionCompleteness: {
      taskCount: 4,
      checkpointCountPerTrajectory: 5,
      transitionCountPerTrajectory: 4,
      observedTransitionCount: 16,
    },
    registeredRules: {
      polarizedLateEnvelopeReplication: {
        requiredConsecutiveLateEnvelopeTransitionsPerBase: 2,
        byBase: polarizedByBase,
        pass: polarizedPass,
      },
      sharedCueMotionResourceReplication: {
        requiredResolvedMajorityTransitionsPerBase: 1,
        byBase: sharedCueByBase,
        pass: sharedCuePass,
      },
    },
    overallRegisteredRulesPass: overallPass,
    interpretationStatus: overallPass
      ? "TARGETED_REPLICATION_CRITERIA_PASS"
      : "TARGETED_REPLICATION_CRITERIA_FAIL",
    identificationCeiling: "Passing these post-development, same-task criteria establishes repeatable observation resources at exact-duplicate resolution only. It does not identify transport, latent stability, dwell-time distributions, hazards, attractors, metastability, correctness, intervention effects, or governance value.",
    nextScientificRequirement: "Use new task instances or a new scenario family before making a transport claim; retain the same observation contract and registered rules.",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
