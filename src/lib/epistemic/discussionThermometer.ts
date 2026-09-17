import { fingerprintEstimatorValue } from "./estimators";
import { projectCollectiveEpistemicStateV1 } from "./collectiveState";
import type { BeliefReport, CategoricalEpistemicClaim } from "./types";

export const DISCUSSION_THERMOMETER_STATE_V1 = Object.freeze({
  id: "swarmalpha.epistemic.discussion-thermometer-state",
  version: "1.0.0",
});

export const DISCUSSION_THERMOMETER_TRANSITION_V1 = Object.freeze({
  id: "swarmalpha.epistemic.discussion-thermometer-transition",
  version: "1.0.0",
});

export const DISCUSSION_THERMOMETER_READING_V1 = Object.freeze({
  id: "swarmalpha.epistemic.discussion-thermometer-reading",
  version: "1.0.0",
});

export const DISCUSSION_THERMOMETER_TRAJECTORY_V1 = Object.freeze({
  id: "swarmalpha.epistemic.discussion-thermometer-trajectory",
  version: "1.0.0",
});

export type DiscussionThermometerReplicateV1 = {
  status: "valid";
  probabilitiesByOptionId: Record<string, number>;
} | {
  status: "unavailable";
  reason: string;
};

export interface DiscussionThermometerAgentPairV1 {
  agentId: string;
  A: DiscussionThermometerReplicateV1;
  B: DiscussionThermometerReplicateV1;
}

export interface DiscussionThermometerInputV1 {
  claimId: string;
  checkpointId: string;
  checkpointIndex: number;
  optionIds: readonly string[];
  expectedAgentIds: readonly string[];
  reportPairs: readonly DiscussionThermometerAgentPairV1[];
  /** Optional directly recorded categorical action; never inferred from free text here. */
  publicChoiceByAgentId?: Readonly<Record<string, string>>;
  sensorRef: { id: string; version: string };
  snapshotHash: string;
}

export interface DiscussionThermometerStateV1 {
  schemaRef: typeof DISCUSSION_THERMOMETER_STATE_V1;
  inferenceStatus: "operational_self_reported_belief_state";
  truthAccess: "none";
  claimId: string;
  checkpointId: string;
  checkpointIndex: number;
  optionIds: string[];
  sensorRef: { id: string; version: string };
  snapshotHash: string;
  roster: {
    expectedAgentIds: string[];
    activeAgentIds: string[];
    missingAgentIds: string[];
    coverage: number;
    missingReasonByAgentId: Record<string, string>;
  };
  measurement: {
    estimator: "primary_canonical_self_report";
    validPrimaryReportCount: number;
    validRepeatPairCount: number;
    replicateTotalVariationByAgentId: Record<string, number>;
    meanReplicateTotalVariation: number | null;
    maxReplicateTotalVariation: number | null;
  };
  behavioralCrossCheck: {
    status: "available" | "unavailable";
    choiceCoverage: number;
    publicChoiceByAgentId: Record<string, string>;
    choiceShareByOptionId: Record<string, number> | null;
    majorityChoiceShare: number | null;
    beliefChoiceComparableAgentCount: number;
    beliefTopChoiceCompatibilityRate: number | null;
  };
  microstate: {
    beliefProbabilitiesByAgentId: Record<string, Record<string, number>>;
  };
  macrostate: {
    pooledProbabilitiesByOptionId: Record<string, number> | null;
    meanNormalizedReportEntropy: number | null;
    pooledNormalizedEntropy: number | null;
    normalizedGeneralizedJsd: number | null;
    pooledConcentration: number | null;
    pottsStyleOrder: number | null;
    meanPairwiseTotalVariation: number | null;
    maxPairwiseTotalVariation: number | null;
  };
  contentHash: string;
}

export interface DiscussionThermometerTransitionV1 {
  schemaRef: typeof DISCUSSION_THERMOMETER_TRANSITION_V1;
  inferenceStatus: "descriptive_reported_transition_only";
  truthAccess: "none";
  claimId: string;
  fromStateHash: string;
  toStateHash: string;
  fromCheckpointId: string;
  toCheckpointId: string;
  matchedAgentIds: string[];
  completeMatchedRoster: boolean;
  meanAgentTotalVariation: number | null;
  pooledTotalVariation: number | null;
  deltas: {
    meanNormalizedReportEntropy: number | null;
    pooledNormalizedEntropy: number | null;
    normalizedGeneralizedJsd: number | null;
    pooledConcentration: number | null;
    pottsStyleOrder: number | null;
  };
  repeatabilityReference: {
    endpointMeanReplicateTotalVariation: number | null;
    activityMinusEndpointRepeatability: number | null;
    comparison: "above_reference" | "not_above_reference" | "unavailable";
    /** Mean-minus-mean is a display diagnostic, not an agent-level separation test. */
    comparisonSemantics: "aggregate_reference_only";
    replicateComparableAgentIds: string[];
    primaryActivityMinusMaxEndpointRepeatabilityByAgentId: Record<string, number>;
    primaryActivityAboveBothEndpointRepeatabilitiesAgentIds: string[];
    primaryActivityAboveBothEndpointRepeatabilitiesFraction: number | null;
  };
  contentHash: string;
}

export interface DiscussionThermometerReadingV1 {
  schemaRef: typeof DISCUSSION_THERMOMETER_READING_V1;
  inferenceStatus: "prefix_causal_descriptive_monitoring";
  truthAccess: "none";
  writeback: "none";
  checkpointIndex: number;
  stateStatus: "complete" | "partial" | "unavailable";
  state: DiscussionThermometerStateV1;
  /** Uses only the immediately preceding observed state; null at the first reading. */
  transitionFromPrevious: DiscussionThermometerTransitionV1 | null;
  contentHash: string;
}

export interface DiscussionThermometerTrajectoryV1 {
  schemaRef: typeof DISCUSSION_THERMOMETER_TRAJECTORY_V1;
  inferenceStatus: "prefix_causal_descriptive_monitoring";
  truthAccess: "none";
  writeback: "none";
  prefixCausal: true;
  claimId: string;
  optionIds: string[];
  expectedAgentIds: string[];
  sensorRef: { id: string; version: string };
  readings: DiscussionThermometerReadingV1[];
  contentHash: string;
}

const FIXED_TIMESTAMP = "2026-08-29T00:00:00.000Z";

function requireNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field}_invalid`);
}

function sortedUnique(values: readonly string[], field: string): string[] {
  values.forEach(value => requireNonEmpty(value, field));
  if (new Set(values).size !== values.length) throw new Error(`${field}_duplicate`);
  return [...values].sort();
}

function validateProbabilities(
  probabilities: Readonly<Record<string, number>>,
  optionIds: readonly string[],
): void {
  const keys = Object.keys(probabilities).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...optionIds].sort())) {
    throw new Error("discussion_thermometer_probability_keys_invalid");
  }
  const values = optionIds.map(optionId => probabilities[optionId]);
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error("discussion_thermometer_probability_value_invalid");
  }
  // The declared sensor tolerance is inclusive. Add only a bounded term-count
  // machine-summation allowance; do not renormalize the submitted report.
  const machineAllowance = Number.EPSILON * optionIds.length * 4;
  if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 1)
    > 1e-6 + machineAllowance) {
    throw new Error("discussion_thermometer_probability_sum_invalid");
  }
}

function totalVariation(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
  optionIds: readonly string[],
): number {
  return 0.5 * optionIds.reduce((sum, optionId) =>
    sum + Math.abs(left[optionId] - right[optionId]), 0);
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function bodyWithoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

/**
 * Projects each agent's primary canonical self-report into a truth-blind
 * categorical belief state. An optional exact repeat is measurement-quality
 * metadata only: it never decides whether the primary belief exists and never
 * changes the state estimate. Missing primary reports remain missing; they are
 * never encoded as zero movement, uniform belief, or last observation.
 */
export function projectDiscussionThermometerStateV1(
  input: DiscussionThermometerInputV1,
): Readonly<DiscussionThermometerStateV1> {
  requireNonEmpty(input.claimId, "discussion_thermometer_claim_id");
  requireNonEmpty(input.checkpointId, "discussion_thermometer_checkpoint_id");
  requireNonEmpty(input.sensorRef.id, "discussion_thermometer_sensor_id");
  requireNonEmpty(input.sensorRef.version, "discussion_thermometer_sensor_version");
  requireNonEmpty(input.snapshotHash, "discussion_thermometer_snapshot_hash");
  if (!Number.isSafeInteger(input.checkpointIndex) || input.checkpointIndex < 0) {
    throw new Error("discussion_thermometer_checkpoint_index_invalid");
  }
  const optionIds = sortedUnique(input.optionIds, "discussion_thermometer_option_id");
  if (optionIds.length < 2) throw new Error("discussion_thermometer_option_count_invalid");
  const expectedAgentIds = sortedUnique(input.expectedAgentIds,
    "discussion_thermometer_expected_agent_id");
  if (!expectedAgentIds.length) throw new Error("discussion_thermometer_roster_empty");
  const pairAgentIds = sortedUnique(input.reportPairs.map(pair => pair.agentId),
    "discussion_thermometer_pair_agent_id");
  if (pairAgentIds.some(agentId => !expectedAgentIds.includes(agentId))) {
    throw new Error("discussion_thermometer_pair_outside_roster");
  }

  const beliefProbabilitiesByAgentId: Record<string, Record<string, number>> = {};
  const duplicateDistances: number[] = [];
  const replicateTotalVariationByAgentId: Record<string, number> = {};
  const missingReasonByAgentId: Record<string, string> = {};
  const pairs = new Map(input.reportPairs.map(pair => [pair.agentId, pair]));
  for (const agentId of expectedAgentIds) {
    const pair = pairs.get(agentId);
    if (!pair) {
      missingReasonByAgentId[agentId] = "pair_not_registered";
      continue;
    }
    if (pair.A.status !== "valid") {
      missingReasonByAgentId[agentId] = pair.A.reason;
      continue;
    }
    validateProbabilities(pair.A.probabilitiesByOptionId, optionIds);
    beliefProbabilitiesByAgentId[agentId] = { ...pair.A.probabilitiesByOptionId };
    if (pair.B.status === "valid") {
      validateProbabilities(pair.B.probabilitiesByOptionId, optionIds);
      const duplicateDistance = totalVariation(
        pair.A.probabilitiesByOptionId, pair.B.probabilitiesByOptionId, optionIds);
      duplicateDistances.push(duplicateDistance);
      replicateTotalVariationByAgentId[agentId] = duplicateDistance;
    }
  }
  const activeAgentIds = Object.keys(beliefProbabilitiesByAgentId).sort();
  const missingAgentIds = expectedAgentIds.filter(agentId => !activeAgentIds.includes(agentId));

  const publicChoiceByAgentId = { ...(input.publicChoiceByAgentId ?? {}) };
  for (const [agentId, optionId] of Object.entries(publicChoiceByAgentId)) {
    if (!expectedAgentIds.includes(agentId)) {
      throw new Error("discussion_thermometer_choice_outside_roster");
    }
    if (!optionIds.includes(optionId)) {
      throw new Error("discussion_thermometer_choice_option_invalid");
    }
  }
  const choiceAgentIds = Object.keys(publicChoiceByAgentId).sort();
  const choiceCounts = Object.fromEntries(optionIds.map(optionId => [optionId, 0]));
  choiceAgentIds.forEach(agentId => {
    choiceCounts[publicChoiceByAgentId[agentId]] += 1;
  });
  const comparableChoiceAgentIds = choiceAgentIds.filter(agentId =>
    beliefProbabilitiesByAgentId[agentId] !== undefined);
  const compatibleChoiceCount = comparableChoiceAgentIds.filter(agentId => {
    const probabilities = beliefProbabilitiesByAgentId[agentId];
    const maximum = Math.max(...optionIds.map(optionId => probabilities[optionId]));
    return Math.abs(probabilities[publicChoiceByAgentId[agentId]] - maximum) <= 1e-12;
  }).length;
  const behavioralCrossCheck: DiscussionThermometerStateV1["behavioralCrossCheck"] = {
    status: choiceAgentIds.length ? "available" : "unavailable",
    choiceCoverage: choiceAgentIds.length / expectedAgentIds.length,
    publicChoiceByAgentId,
    choiceShareByOptionId: choiceAgentIds.length
      ? Object.fromEntries(optionIds.map(optionId =>
        [optionId, choiceCounts[optionId] / choiceAgentIds.length])) : null,
    majorityChoiceShare: choiceAgentIds.length
      ? Math.max(...Object.values(choiceCounts)) / choiceAgentIds.length : null,
    beliefChoiceComparableAgentCount: comparableChoiceAgentIds.length,
    beliefTopChoiceCompatibilityRate: comparableChoiceAgentIds.length
      ? compatibleChoiceCount / comparableChoiceAgentIds.length : null,
  };

  let macrostate: DiscussionThermometerStateV1["macrostate"] = {
    pooledProbabilitiesByOptionId: null,
    meanNormalizedReportEntropy: null,
    pooledNormalizedEntropy: null,
    normalizedGeneralizedJsd: null,
    pooledConcentration: null,
    pottsStyleOrder: null,
    meanPairwiseTotalVariation: null,
    maxPairwiseTotalVariation: null,
  };
  if (activeAgentIds.length) {
    const claim: CategoricalEpistemicClaim = {
      id: input.claimId,
      proposition: "Categorical outcome space observed by the discussion thermometer.",
      domain: "discussion_thermometer",
      createdAt: FIXED_TIMESTAMP,
      options: optionIds,
      resolutionPolicy: { kind: "categorical", resolverId: "resolver:not_accessed_by_thermometer" },
    };
    const reports: BeliefReport[] = activeAgentIds.map(agentId => ({
      id: `thermometer:${input.checkpointId}:${agentId}`,
      claimId: input.claimId,
      agentId,
      round: input.checkpointIndex,
      value: { kind: "categorical", probabilities: beliefProbabilitiesByAgentId[agentId] },
      evidence: [], stake: 0, createdAt: FIXED_TIMESTAMP,
    }));
    const state = projectCollectiveEpistemicStateV1({
      claim, reports, evidence: [], exposures: [], asOfRound: input.checkpointIndex,
      expectedAgentIds,
    });
    if (state.pooledBelief.kind !== "categorical") {
      throw new Error("discussion_thermometer_categorical_pool_unavailable");
    }
    const pairwiseDistances: number[] = [];
    for (let left = 0; left < activeAgentIds.length; left += 1) {
      for (let right = left + 1; right < activeAgentIds.length; right += 1) {
        pairwiseDistances.push(totalVariation(
          beliefProbabilitiesByAgentId[activeAgentIds[left]],
          beliefProbabilitiesByAgentId[activeAgentIds[right]], optionIds));
      }
    }
    const concentration = state.pooledCertainty;
    macrostate = {
      pooledProbabilitiesByOptionId: { ...state.pooledBelief.probabilities },
      meanNormalizedReportEntropy: state.withinAgentUncertainty,
      pooledNormalizedEntropy: state.pooledUncertainty,
      normalizedGeneralizedJsd: state.betweenAgentDisagreement,
      pooledConcentration: concentration,
      pottsStyleOrder: (optionIds.length * concentration - 1) / (optionIds.length - 1),
      meanPairwiseTotalVariation: mean(pairwiseDistances),
      maxPairwiseTotalVariation: pairwiseDistances.length
        ? Math.max(...pairwiseDistances) : null,
    };
  }
  const body: Omit<DiscussionThermometerStateV1, "contentHash"> = {
    schemaRef: DISCUSSION_THERMOMETER_STATE_V1,
    inferenceStatus: "operational_self_reported_belief_state",
    truthAccess: "none",
    claimId: input.claimId,
    checkpointId: input.checkpointId,
    checkpointIndex: input.checkpointIndex,
    optionIds,
    sensorRef: { ...input.sensorRef },
    snapshotHash: input.snapshotHash,
    roster: {
      expectedAgentIds, activeAgentIds, missingAgentIds,
      coverage: activeAgentIds.length / expectedAgentIds.length,
      missingReasonByAgentId,
    },
    measurement: {
      estimator: "primary_canonical_self_report",
      validPrimaryReportCount: activeAgentIds.length,
      validRepeatPairCount: duplicateDistances.length,
      replicateTotalVariationByAgentId,
      meanReplicateTotalVariation: mean(duplicateDistances),
      maxReplicateTotalVariation: duplicateDistances.length
        ? Math.max(...duplicateDistances) : null,
    },
    behavioralCrossCheck,
    microstate: { beliefProbabilitiesByAgentId },
    macrostate,
  };
  return Object.freeze({ ...body, contentHash: fingerprintEstimatorValue(body) });
}

export function verifyDiscussionThermometerStateV1(
  input: DiscussionThermometerInputV1,
  state: DiscussionThermometerStateV1,
): void {
  const expected = projectDiscussionThermometerStateV1(input);
  if (JSON.stringify(expected) !== JSON.stringify(state)
    || fingerprintEstimatorValue(bodyWithoutHash(state)) !== state.contentHash) {
    throw new Error("discussion_thermometer_state_replay_mismatch");
  }
}

/** Compare two thermometer states without reading an outcome or intervention. */
export function projectDiscussionThermometerTransitionV1(input: {
  from: DiscussionThermometerStateV1;
  to: DiscussionThermometerStateV1;
}): Readonly<DiscussionThermometerTransitionV1> {
  if (input.from.claimId !== input.to.claimId
    || JSON.stringify(input.from.optionIds) !== JSON.stringify(input.to.optionIds)) {
    throw new Error("discussion_thermometer_transition_domain_mismatch");
  }
  if (input.to.checkpointIndex <= input.from.checkpointIndex) {
    throw new Error("discussion_thermometer_transition_order_invalid");
  }
  const matchedAgentIds = input.from.roster.activeAgentIds
    .filter(agentId => input.to.roster.activeAgentIds.includes(agentId)).sort();
  const completeMatchedRoster = JSON.stringify(matchedAgentIds)
    === JSON.stringify(input.from.roster.expectedAgentIds)
    && JSON.stringify(matchedAgentIds) === JSON.stringify(input.to.roster.expectedAgentIds);
  const optionIds = input.from.optionIds;
  const activities = matchedAgentIds.map(agentId => totalVariation(
    input.from.microstate.beliefProbabilitiesByAgentId[agentId],
    input.to.microstate.beliefProbabilitiesByAgentId[agentId], optionIds));
  const fromMacro = input.from.macrostate;
  const toMacro = input.to.macrostate;
  const delta = (left: number | null, right: number | null): number | null =>
    left === null || right === null ? null : right - left;
  const endpointRepeatability = mean(matchedAgentIds.flatMap(agentId => [
    input.from.measurement.replicateTotalVariationByAgentId[agentId],
    input.to.measurement.replicateTotalVariationByAgentId[agentId],
  ].filter((value): value is number => value !== undefined)));
  const meanAgentTotalVariation = mean(activities);
  const activityMinusReference = meanAgentTotalVariation === null || endpointRepeatability === null
    ? null : meanAgentTotalVariation - endpointRepeatability;
  const activityByAgentId = Object.fromEntries(matchedAgentIds.map((agentId, index) =>
    [agentId, activities[index]]));
  const replicateComparableAgentIds = matchedAgentIds.filter(agentId =>
    input.from.measurement.replicateTotalVariationByAgentId[agentId] !== undefined
    && input.to.measurement.replicateTotalVariationByAgentId[agentId] !== undefined);
  const marginsByAgentId = Object.fromEntries(replicateComparableAgentIds.map(agentId => {
    const endpointMaximum = Math.max(
      input.from.measurement.replicateTotalVariationByAgentId[agentId],
      input.to.measurement.replicateTotalVariationByAgentId[agentId],
    );
    return [agentId, activityByAgentId[agentId] - endpointMaximum];
  }));
  const separatedAgentIds = replicateComparableAgentIds.filter(agentId =>
    marginsByAgentId[agentId] > 1e-12);
  const fromPool = fromMacro.pooledProbabilitiesByOptionId;
  const toPool = toMacro.pooledProbabilitiesByOptionId;
  const body: Omit<DiscussionThermometerTransitionV1, "contentHash"> = {
    schemaRef: DISCUSSION_THERMOMETER_TRANSITION_V1,
    inferenceStatus: "descriptive_reported_transition_only",
    truthAccess: "none",
    claimId: input.from.claimId,
    fromStateHash: input.from.contentHash,
    toStateHash: input.to.contentHash,
    fromCheckpointId: input.from.checkpointId,
    toCheckpointId: input.to.checkpointId,
    matchedAgentIds,
    completeMatchedRoster,
    meanAgentTotalVariation,
    pooledTotalVariation: completeMatchedRoster && fromPool && toPool
      ? totalVariation(fromPool, toPool, optionIds) : null,
    deltas: {
      meanNormalizedReportEntropy: delta(fromMacro.meanNormalizedReportEntropy,
        toMacro.meanNormalizedReportEntropy),
      pooledNormalizedEntropy: delta(fromMacro.pooledNormalizedEntropy,
        toMacro.pooledNormalizedEntropy),
      normalizedGeneralizedJsd: delta(fromMacro.normalizedGeneralizedJsd,
        toMacro.normalizedGeneralizedJsd),
      pooledConcentration: delta(fromMacro.pooledConcentration,
        toMacro.pooledConcentration),
      pottsStyleOrder: delta(fromMacro.pottsStyleOrder, toMacro.pottsStyleOrder),
    },
    repeatabilityReference: {
      endpointMeanReplicateTotalVariation: endpointRepeatability,
      activityMinusEndpointRepeatability: activityMinusReference,
      comparison: activityMinusReference === null ? "unavailable"
        : activityMinusReference > 1e-12 ? "above_reference" : "not_above_reference",
      comparisonSemantics: "aggregate_reference_only",
      replicateComparableAgentIds,
      primaryActivityMinusMaxEndpointRepeatabilityByAgentId: marginsByAgentId,
      primaryActivityAboveBothEndpointRepeatabilitiesAgentIds: separatedAgentIds,
      primaryActivityAboveBothEndpointRepeatabilitiesFraction: replicateComparableAgentIds.length
        ? separatedAgentIds.length / replicateComparableAgentIds.length : null,
    },
  };
  return Object.freeze({ ...body, contentHash: fingerprintEstimatorValue(body) });
}

function verifyProjectedStateIntegrity(state: DiscussionThermometerStateV1): void {
  if (state.schemaRef.id !== DISCUSSION_THERMOMETER_STATE_V1.id
    || state.schemaRef.version !== DISCUSSION_THERMOMETER_STATE_V1.version
    || state.truthAccess !== "none"
    || fingerprintEstimatorValue(bodyWithoutHash(state)) !== state.contentHash) {
    throw new Error("discussion_thermometer_trajectory_state_integrity_invalid");
  }
}

function stateStatus(
  state: DiscussionThermometerStateV1,
): DiscussionThermometerReadingV1["stateStatus"] {
  if (state.roster.coverage === 1) return "complete";
  return state.roster.activeAgentIds.length > 0 ? "partial" : "unavailable";
}

/**
 * Build a real-time-capable trajectory from an observed prefix.
 *
 * Reading t uses only state t and, for its transition, state t-1. Appending a
 * later state therefore cannot change any earlier reading hash. The function
 * is a pure observer: it reads no outcome and emits no action or writeback.
 */
export function projectDiscussionThermometerTrajectoryV1(
  statesInput: readonly DiscussionThermometerStateV1[],
): Readonly<DiscussionThermometerTrajectoryV1> {
  if (!statesInput.length) throw new Error("discussion_thermometer_trajectory_empty");
  const states = [...statesInput];
  states.forEach(verifyProjectedStateIntegrity);
  const first = states[0];
  const optionIds = JSON.stringify(first.optionIds);
  const expectedAgentIds = JSON.stringify(first.roster.expectedAgentIds);
  const sensorRef = JSON.stringify(first.sensorRef);
  const seenCheckpointIndices = new Set<number>();
  const seenSnapshotHashes = new Set<string>();
  states.forEach((state, index) => {
    if (state.claimId !== first.claimId
      || JSON.stringify(state.optionIds) !== optionIds
      || JSON.stringify(state.roster.expectedAgentIds) !== expectedAgentIds
      || JSON.stringify(state.sensorRef) !== sensorRef) {
      throw new Error("discussion_thermometer_trajectory_contract_drift");
    }
    if ((index > 0 && state.checkpointIndex <= states[index - 1].checkpointIndex)
      || seenCheckpointIndices.has(state.checkpointIndex)) {
      throw new Error("discussion_thermometer_trajectory_checkpoint_order_invalid");
    }
    if (seenSnapshotHashes.has(state.snapshotHash)) {
      throw new Error("discussion_thermometer_trajectory_snapshot_reused");
    }
    seenCheckpointIndices.add(state.checkpointIndex);
    seenSnapshotHashes.add(state.snapshotHash);
  });
  const readings = states.map((state, index): DiscussionThermometerReadingV1 => {
    const transitionFromPrevious = index === 0 ? null
      : projectDiscussionThermometerTransitionV1({ from: states[index - 1], to: state });
    const body: Omit<DiscussionThermometerReadingV1, "contentHash"> = {
      schemaRef: DISCUSSION_THERMOMETER_READING_V1,
      inferenceStatus: "prefix_causal_descriptive_monitoring",
      truthAccess: "none",
      writeback: "none",
      checkpointIndex: state.checkpointIndex,
      stateStatus: stateStatus(state),
      state,
      transitionFromPrevious,
    };
    return { ...body, contentHash: fingerprintEstimatorValue(body) };
  });
  const body: Omit<DiscussionThermometerTrajectoryV1, "contentHash"> = {
    schemaRef: DISCUSSION_THERMOMETER_TRAJECTORY_V1,
    inferenceStatus: "prefix_causal_descriptive_monitoring",
    truthAccess: "none",
    writeback: "none",
    prefixCausal: true,
    claimId: first.claimId,
    optionIds: [...first.optionIds],
    expectedAgentIds: [...first.roster.expectedAgentIds],
    sensorRef: { ...first.sensorRef },
    readings,
  };
  return Object.freeze({ ...body, contentHash: fingerprintEstimatorValue(body) });
}

/** Append one newly observed state while verifying that the prior prefix is unchanged. */
export function appendDiscussionThermometerStateV1(input: {
  trajectory: DiscussionThermometerTrajectoryV1;
  state: DiscussionThermometerStateV1;
}): Readonly<DiscussionThermometerTrajectoryV1> {
  verifyDiscussionThermometerTrajectoryV1(input.trajectory);
  const projected = projectDiscussionThermometerTrajectoryV1([
    ...input.trajectory.readings.map(reading => reading.state),
    input.state,
  ]);
  input.trajectory.readings.forEach((reading, index) => {
    if (projected.readings[index].contentHash !== reading.contentHash) {
      throw new Error("discussion_thermometer_trajectory_prefix_changed");
    }
  });
  return projected;
}

export function verifyDiscussionThermometerTrajectoryV1(
  trajectory: DiscussionThermometerTrajectoryV1,
): void {
  const expected = projectDiscussionThermometerTrajectoryV1(
    trajectory.readings.map(reading => reading.state),
  );
  if (JSON.stringify(expected) !== JSON.stringify(trajectory)
    || fingerprintEstimatorValue(bodyWithoutHash(trajectory)) !== trajectory.contentHash) {
    throw new Error("discussion_thermometer_trajectory_replay_mismatch");
  }
}
