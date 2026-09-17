/** Offline-only analysis for the five-task, one-seed M2 trajectory pilot. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import type { CollectiveDynamicsTrajectorySensorFreezeV1 } from
  "./collectiveDynamicsTrajectorySensorFreezeV1";
import {
  verifyCollectiveDynamicsTrajectorySensorRunV1,
  type CollectiveDynamicsTrajectorySensorRunV1,
} from "./runCollectiveDynamicsTrajectorySensorV1";
import {
  COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1,
  loadFrozenCollectiveDynamicsTrajectorySensorV1,
} from "./run_v6_collective_dynamics_trajectory_sensor_v1";
import { projectTrajectoryAveragedReportsV1 } from
  "./collectiveDynamicsTrajectoryEpistemicAdapterV1";

export const COLLECTIVE_DYNAMICS_TRAJECTORY_ANALYSIS_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.collective-dynamics-trajectory",
  version: "1.4.0",
});

type CheckpointRoundV1 = 0 | 1 | 2 | 3;
type WrongConsensusStatusV1 = "wrong_consensus" | "not_wrong_consensus" | "indeterminate";
type TransitionEventV1 = "entry" | "persistence" | "escape" | "relapse" | "none" | "unavailable";

interface ProbabilityVectorV1 {
  optionIds: string[];
  values: number[];
}

export interface TrajectorySensorUnitRowV1 {
  unitId: string;
  sourceTaskId: number;
  agentId: string;
  checkpointRound: CheckpointRoundV1;
  repeatStatuses: { A: string; B: string };
  pairStatus: "valid" | "unavailable_missing_or_invalid";
  repeatA: ProbabilityVectorV1 | null;
  repeatB: ProbabilityVectorV1 | null;
  averagedReport: ProbabilityVectorV1 | null;
  duplicateTotalVariation: number | null;
  repeatUniqueTops: { A: string | null; B: string | null } | null;
  averagedUniqueTop: string | null;
}

interface ReportedMacrostateV1 {
  comparableAgentIds: string[];
  missingOrInvalidAgentIds: string[];
  rosterComplete: boolean;
  pooledProbabilities: ProbabilityVectorV1 | null;
  meanNormalizedReportEntropy: number | null;
  pooledNormalizedEntropy: number | null;
  normalizedGeneralizedJsd: number | null;
  pooledConcentration: number | null;
  maxPairwiseTotalVariation: number | null;
  duplicateDiagnostics: {
    validPairCount: number;
    meanDuplicateTotalVariation: number | null;
    p90DuplicateTotalVariation: number | null;
    maxDuplicateTotalVariation: number | null;
    uniqueTopAgreementCount: number;
    uniqueTopDisagreementCount: number;
    tieIndeterminateCount: number;
  };
}

export interface TrajectoryCheckpointRowV1 {
  sourceTaskId: number;
  checkpointRound: CheckpointRoundV1;
  reportedState: ReportedMacrostateV1;
  offlineEvaluation: {
    outcomeOptionId: string;
    pooledBrier: number | null;
    meanAgentBrier: number | null;
    pooledUniqueTop: string | null;
    pooledTopCorrect: boolean | null;
  };
  wrongConsensus: {
    status: WrongConsensusStatusV1;
    consensusOptionId: string | null;
    reason: "complete_stable_wrong_top" | "complete_stable_not_wrong"
      | "incomplete_roster" | "repeat_top_tie_or_disagreement";
  };
}

export interface TrajectoryTransitionRowV1 {
  sourceTaskId: number;
  fromCheckpoint: CheckpointRoundV1;
  toCheckpoint: CheckpointRoundV1;
  comparableAgentIds: string[];
  missingFromComparableRoster: string[];
  completeComparableRoster: boolean;
  reportedTransition: {
    meanAgentActivity: number | null;
    meanEndpointDuplicateTotalVariation: number | null;
    activityMinusMeanEndpointDuplicateTotalVariation: number | null;
    activityExceedsMeanEndpointDuplicateTotalVariation: boolean | null;
    pooledDrift: number | null;
    meanNormalizedReportEntropyDelta: number | null;
    normalizedGeneralizedJsdDelta: number | null;
    pooledConcentrationDelta: number | null;
    replicateSeparation: {
      eligibleAgentCount: number;
      separatedAgentCount: number;
      separatedAgentFraction: number | null;
      medianMargin: number | null;
      minMargin: number | null;
      maxMargin: number | null;
      majoritySeparated: boolean | null;
    };
  };
  offlineEvaluation: {
    comparablePooledBrierFrom: number | null;
    comparablePooledBrierTo: number | null;
    comparablePooledBrierDelta: number | null;
  };
  wrongConsensusTransition: {
    from: WrongConsensusStatusV1;
    to: WrongConsensusStatusV1;
    event: TransitionEventV1;
  };
}

export interface CollectiveDynamicsTrajectoryAnalysisV1 {
  analysisRef: typeof COLLECTIVE_DYNAMICS_TRAJECTORY_ANALYSIS_V1;
  planHash: string;
  freezeHash: string;
  runHash: string;
  inferenceUnit: "task";
  sensorUnit: "task_agent_checkpoint_exact_repeat_pair";
  stateTruthAccess: "none";
  evaluationTruthAccess: "offline_resolution_only";
  terminalCounts: Record<string, number>;
  unitRows: TrajectorySensorUnitRowV1[];
  checkpointRows: TrajectoryCheckpointRowV1[];
  transitionRows: TrajectoryTransitionRowV1[];
  taskTrajectories: Array<{
    sourceTaskId: number;
    eventCounts: Record<TransitionEventV1, number>;
    x0ToX3: TrajectoryTransitionRowV1;
    errorAmplifyingConcentrationSignature: boolean | null;
  }>;
  summary: {
    registeredCellCount: 152;
    validCellCount: number;
    interruptedOrInvalidCellCount: number;
    registeredUnitCount: 76;
    validUnitCount: number;
    invalidOrMissingUnitCount: number;
    completeCheckpointCount: number;
    incompleteCheckpointCount: number;
    completeAdjacentTransitionCount: number;
    incompleteAdjacentTransitionCount: number;
    adjacentTransitionCountActivityExceedsDuplicateMean: number;
    taskCountWithActivityExceedingDuplicateMean: number;
    adjacentTransitionCountWithMajorityReplicateSeparation: number;
    taskCountWithMajorityReplicateSeparation: number;
    exactDuplicatePairCount: number;
    meanDuplicateTotalVariation: number | null;
    medianDuplicateTotalVariation: number | null;
    p75DuplicateTotalVariation: number | null;
    p90DuplicateTotalVariation: number | null;
    maxDuplicateTotalVariation: number | null;
    eventCounts: Record<TransitionEventV1, number>;
    taskCountWithEntry: number;
    taskCountWithEscape: number;
    taskCountWithRelapse: number;
    errorAmplifyingConcentrationSignatureCount: number;
    meanX0ToX3Activity: number | null;
    meanX0ToX3PooledDrift: number | null;
    meanX0ToX3JsdDelta: number | null;
    meanX0ToX3ConcentrationDelta: number | null;
    meanX0ToX3PooledBrierDelta: number | null;
  };
  decision: {
    classification: "NO_TRAJECTORY_SIGNAL" | "DESCRIPTIVE_TRAJECTORY_SIGNAL";
    observedEntryOrEscapeCount: number;
    candidateDynamicsEligible: false;
    operationalMeaning: "no_identifiable_wrong_consensus_entry_or_escape"
      | "at_least_one_identifiable_wrong_consensus_entry_or_escape";
    candidateBlockers: string[];
  };
  claimCeiling: "five_task_one_seed_descriptive_reported_belief_trajectory_only";
  contentHash: string;
}

function mean(values: readonly number[]): number {
  if (!values.length) throw new Error("trajectory_analysis_empty_mean");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function optionalMean(values: readonly number[]): number | null {
  return values.length ? mean(values) : null;
}

function quantileNearestRank(values: readonly number[], probability: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(probability * sorted.length) - 1)];
}

function tv(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || !left.length) throw new Error("trajectory_analysis_tv_shape_invalid");
  return 0.5 * left.reduce((sum, value, index) => sum + Math.abs(value - right[index]), 0);
}

function replicateSeparationMargin(input: {
  from: TrajectorySensorUnitRowV1;
  to: TrajectorySensorUnitRowV1;
}): number {
  if (input.from.pairStatus !== "valid" || input.to.pairStatus !== "valid"
    || !input.from.repeatA || !input.from.repeatB || !input.to.repeatA || !input.to.repeatB
    || input.from.duplicateTotalVariation === null || input.to.duplicateTotalVariation === null) {
    throw new Error("trajectory_analysis_replicate_separation_ineligible");
  }
  const fromRepeats = [input.from.repeatA, input.from.repeatB];
  const toRepeats = [input.to.repeatA, input.to.repeatB];
  if (fromRepeats.some(repeat => JSON.stringify(repeat.optionIds)
      !== JSON.stringify(input.from.repeatA!.optionIds))
    || toRepeats.some(repeat => JSON.stringify(repeat.optionIds)
      !== JSON.stringify(input.from.repeatA!.optionIds))) {
    throw new Error("trajectory_analysis_replicate_separation_option_set_mismatch");
  }
  const crossRepeatDistances = fromRepeats.flatMap(from =>
    toRepeats.map(to => tv(from.values, to.values)));
  return Math.min(...crossRepeatDistances)
    - Math.max(input.from.duplicateTotalVariation, input.to.duplicateTotalVariation);
}

function summarizeReplicateSeparation(margins: readonly number[]): TrajectoryTransitionRowV1["reportedTransition"]["replicateSeparation"] {
  const separatedAgentCount = margins.filter(margin => margin > 0).length;
  return {
    eligibleAgentCount: margins.length,
    separatedAgentCount,
    separatedAgentFraction: margins.length ? separatedAgentCount / margins.length : null,
    medianMargin: quantileNearestRank(margins, 0.50),
    minMargin: margins.length ? Math.min(...margins) : null,
    maxMargin: margins.length ? Math.max(...margins) : null,
    majoritySeparated: margins.length ? separatedAgentCount > margins.length / 2 : null,
  };
}

function vector(optionIds: readonly string[], probabilities: Readonly<Record<string, number>>): ProbabilityVectorV1 {
  const values = optionIds.map(optionId => probabilities[optionId]);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 1)
    || Math.abs(total - 1) > 1e-6 + 8 * Number.EPSILON * Math.max(1, values.length)) {
    throw new Error("trajectory_analysis_vector_invalid");
  }
  return { optionIds: [...optionIds], values };
}

function vectorMean(vectors: readonly ProbabilityVectorV1[]): ProbabilityVectorV1 {
  if (!vectors.length) throw new Error("trajectory_analysis_empty_vectors");
  const optionIds = vectors[0].optionIds;
  if (vectors.some(item => JSON.stringify(item.optionIds) !== JSON.stringify(optionIds))) {
    throw new Error("trajectory_analysis_option_set_mismatch");
  }
  return {
    optionIds: [...optionIds],
    values: optionIds.map((_, index) => mean(vectors.map(item => item.values[index]))),
  };
}

function uniqueTop(vectorValue: ProbabilityVectorV1): string | null {
  const maximum = Math.max(...vectorValue.values);
  const indices = vectorValue.values.map((value, index) => ({ value, index }))
    .filter(item => item.value === maximum).map(item => item.index);
  return indices.length === 1 ? vectorValue.optionIds[indices[0]] : null;
}

function brier(vectorValue: ProbabilityVectorV1, outcomeOptionId: string): number {
  return vectorValue.optionIds.reduce((sum, optionId, index) => sum
    + (vectorValue.values[index] - (optionId === outcomeOptionId ? 1 : 0)) ** 2, 0);
}

function summarizeVectors(input: {
  expectedAgentIds: readonly string[];
  units: readonly TrajectorySensorUnitRowV1[];
}): ReportedMacrostateV1 {
  const byAgent = new Map(input.units.filter(unit => unit.pairStatus === "valid")
    .map(unit => [unit.agentId, unit]));
  const comparableAgentIds = input.expectedAgentIds.filter(agentId => byAgent.has(agentId));
  const missingOrInvalidAgentIds = input.expectedAgentIds.filter(agentId => !byAgent.has(agentId));
  const vectors = comparableAgentIds.map(agentId => byAgent.get(agentId)!.averagedReport!);
  const duplicateValues = comparableAgentIds.map(agentId => byAgent.get(agentId)!.duplicateTotalVariation!);
  const interpretations = comparableAgentIds.map(agentId => {
    const tops = byAgent.get(agentId)!.repeatUniqueTops!;
    if (tops.A === null || tops.B === null) return "tie" as const;
    return tops.A === tops.B ? "agreement" as const : "disagreement" as const;
  });
  const kernelState = vectors.length ? projectTrajectoryAveragedReportsV1({
    sourceTaskId: input.units[0].sourceTaskId,
    checkpointRound: input.units[0].checkpointRound,
    optionIds: vectors[0].optionIds,
    expectedAgentIds: input.expectedAgentIds,
    reports: comparableAgentIds.map(agentId => {
      const report = byAgent.get(agentId)!;
      return {
        reportId: `report:trajectory:${report.unitId}:mean-ab`,
        agentId,
        probabilitiesByOptionId: Object.fromEntries(
          report.averagedReport!.optionIds.map((optionId, index) => [
            optionId, report.averagedReport!.values[index],
          ]),
        ),
      };
    }),
  }) : null;
  const pooled = kernelState?.pooledBelief.kind === "categorical"
    ? vector(vectors[0].optionIds, kernelState.pooledBelief.probabilities) : null;
  const within = kernelState?.withinAgentUncertainty ?? null;
  const pooledEntropy = kernelState?.pooledUncertainty ?? null;
  let maxPairwise: number | null = null;
  if (vectors.length) {
    maxPairwise = 0;
    for (let left = 0; left < vectors.length; left += 1) {
      for (let right = left + 1; right < vectors.length; right += 1) {
        maxPairwise = Math.max(maxPairwise, tv(vectors[left].values, vectors[right].values));
      }
    }
  }
  const state: ReportedMacrostateV1 = {
    comparableAgentIds,
    missingOrInvalidAgentIds,
    rosterComplete: missingOrInvalidAgentIds.length === 0,
    pooledProbabilities: pooled,
    meanNormalizedReportEntropy: within,
    pooledNormalizedEntropy: pooledEntropy,
    normalizedGeneralizedJsd: kernelState?.betweenAgentDisagreement ?? null,
    pooledConcentration: kernelState?.pooledCertainty ?? null,
    maxPairwiseTotalVariation: maxPairwise,
    duplicateDiagnostics: {
      validPairCount: vectors.length,
      meanDuplicateTotalVariation: optionalMean(duplicateValues),
      p90DuplicateTotalVariation: quantileNearestRank(duplicateValues, 0.90),
      maxDuplicateTotalVariation: duplicateValues.length ? Math.max(...duplicateValues) : null,
      uniqueTopAgreementCount: interpretations.filter(value => value === "agreement").length,
      uniqueTopDisagreementCount: interpretations.filter(value => value === "disagreement").length,
      tieIndeterminateCount: interpretations.filter(value => value === "tie").length,
    },
  };
  assertCollectiveDynamicsTruthBlindV1(state);
  return state;
}

function optionIdsForTask(freeze: CollectiveDynamicsTrajectorySensorFreezeV1, sourceTaskId: number): string[] {
  const view = freeze.views.find(candidate => candidate.sourceTaskId === sourceTaskId);
  if (!view) throw new Error("trajectory_analysis_task_view_missing");
  return view.claim.options.map((_, index) => `opt_${index + 1}`);
}

function outcomeOptionForTask(
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1,
  sourceTaskId: number,
): string {
  const view = freeze.views.find(candidate => candidate.sourceTaskId === sourceTaskId);
  if (!view) throw new Error("trajectory_analysis_outcome_view_missing");
  // Outcome access is deliberately opened only in this offline analyzer.
  const outcome = createHiddenBenchTaskProjectionV1({ sourceTaskId }).adapter.task.outcome;
  const index = view.claim.options.indexOf(outcome);
  if (index < 0) throw new Error("trajectory_analysis_outcome_option_missing");
  return `opt_${index + 1}`;
}

function buildUnitRows(input: {
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
  run: CollectiveDynamicsTrajectorySensorRunV1;
}): TrajectorySensorUnitRowV1[] {
  const terminalByCell = new Map(input.run.terminals.map(terminal => [terminal.cellId, terminal]));
  return input.freeze.views.map(view => {
    const cells = input.freeze.cells.filter(cell => cell.snapshotHash === view.contentHash);
    const cellA = cells.find(cell => cell.repeatLabel === "A");
    const cellB = cells.find(cell => cell.repeatLabel === "B");
    if (!cellA || !cellB) throw new Error("trajectory_analysis_repeat_cells_missing");
    const terminalA = terminalByCell.get(cellA.cellId);
    const terminalB = terminalByCell.get(cellB.cellId);
    if (!terminalA || !terminalB) throw new Error("trajectory_analysis_terminal_missing");
    const optionIds = optionIdsForTask(input.freeze, view.sourceTaskId);
    const repeatA = terminalA.status === "valid"
      ? vector(optionIds, terminalA.parsed.probabilities) : null;
    const repeatB = terminalB.status === "valid"
      ? vector(optionIds, terminalB.parsed.probabilities) : null;
    const pairValid = repeatA !== null && repeatB !== null;
    const averaged = pairValid ? vectorMean([repeatA, repeatB]) : null;
    return {
      unitId: cellA.unitId,
      sourceTaskId: view.sourceTaskId,
      agentId: view.agentId,
      checkpointRound: view.checkpointRound,
      repeatStatuses: { A: terminalA.status, B: terminalB.status },
      pairStatus: pairValid ? "valid" : "unavailable_missing_or_invalid",
      repeatA,
      repeatB,
      averagedReport: averaged,
      duplicateTotalVariation: pairValid ? tv(repeatA.values, repeatB.values) : null,
      repeatUniqueTops: pairValid ? { A: uniqueTop(repeatA), B: uniqueTop(repeatB) } : null,
      averagedUniqueTop: averaged ? uniqueTop(averaged) : null,
    };
  });
}

function wrongConsensus(input: {
  expectedAgentIds: readonly string[];
  units: readonly TrajectorySensorUnitRowV1[];
  outcomeOptionId: string;
}): TrajectoryCheckpointRowV1["wrongConsensus"] {
  const byAgent = new Map(input.units.map(unit => [unit.agentId, unit]));
  if (input.expectedAgentIds.some(agentId => byAgent.get(agentId)?.pairStatus !== "valid")) {
    return { status: "indeterminate", consensusOptionId: null, reason: "incomplete_roster" };
  }
  const stableTops = input.expectedAgentIds.map(agentId => {
    const unit = byAgent.get(agentId)!;
    const tops = unit.repeatUniqueTops!;
    return tops.A !== null && tops.A === tops.B && unit.averagedUniqueTop === tops.A ? tops.A : null;
  });
  if (stableTops.some(top => top === null)) {
    return {
      status: "indeterminate",
      consensusOptionId: null,
      reason: "repeat_top_tie_or_disagreement",
    };
  }
  const consensusOptionId = stableTops.every(top => top === stableTops[0]) ? stableTops[0] : null;
  if (consensusOptionId !== null && consensusOptionId !== input.outcomeOptionId) {
    return { status: "wrong_consensus", consensusOptionId, reason: "complete_stable_wrong_top" };
  }
  return { status: "not_wrong_consensus", consensusOptionId, reason: "complete_stable_not_wrong" };
}

function buildCheckpointRows(input: {
  planTaskIds: readonly number[];
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
  unitRows: readonly TrajectorySensorUnitRowV1[];
}): TrajectoryCheckpointRowV1[] {
  return input.planTaskIds.flatMap(sourceTaskId => {
    const taskView = input.freeze.views.find(view => view.sourceTaskId === sourceTaskId)!;
    const outcomeOptionId = outcomeOptionForTask(input.freeze, sourceTaskId);
    return ([0, 1, 2, 3] as const).map(checkpointRound => {
      const units = input.unitRows.filter(unit => unit.sourceTaskId === sourceTaskId
        && unit.checkpointRound === checkpointRound);
      const reportedState = summarizeVectors({ expectedAgentIds: taskView.expectedAgentIds, units });
      const pooled = reportedState.pooledProbabilities;
      const agentVectors = units.filter(unit => unit.pairStatus === "valid")
        .map(unit => unit.averagedReport!);
      const pooledTop = pooled ? uniqueTop(pooled) : null;
      return {
        sourceTaskId,
        checkpointRound,
        reportedState,
        offlineEvaluation: {
          outcomeOptionId,
          pooledBrier: pooled ? brier(pooled, outcomeOptionId) : null,
          meanAgentBrier: agentVectors.length
            ? mean(agentVectors.map(item => brier(item, outcomeOptionId))) : null,
          pooledUniqueTop: pooledTop,
          pooledTopCorrect: pooledTop === null ? null : pooledTop === outcomeOptionId,
        },
        wrongConsensus: wrongConsensus({
          expectedAgentIds: taskView.expectedAgentIds,
          units,
          outcomeOptionId,
        }),
      };
    });
  });
}

function transitionBetween(input: {
  sourceTaskId: number;
  fromCheckpoint: CheckpointRoundV1;
  toCheckpoint: CheckpointRoundV1;
  expectedAgentIds: readonly string[];
  unitRows: readonly TrajectorySensorUnitRowV1[];
  checkpointRows: readonly TrajectoryCheckpointRowV1[];
  outcomeOptionId: string;
}): TrajectoryTransitionRowV1 {
  const fromUnits = new Map(input.unitRows.filter(unit => unit.sourceTaskId === input.sourceTaskId
    && unit.checkpointRound === input.fromCheckpoint && unit.pairStatus === "valid")
    .map(unit => [unit.agentId, unit]));
  const toUnits = new Map(input.unitRows.filter(unit => unit.sourceTaskId === input.sourceTaskId
    && unit.checkpointRound === input.toCheckpoint && unit.pairStatus === "valid")
    .map(unit => [unit.agentId, unit]));
  const comparableAgentIds = input.expectedAgentIds.filter(agentId =>
    fromUnits.has(agentId) && toUnits.has(agentId));
  const missing = input.expectedAgentIds.filter(agentId => !comparableAgentIds.includes(agentId));
  const fromVectors = comparableAgentIds.map(agentId => fromUnits.get(agentId)!.averagedReport!);
  const toVectors = comparableAgentIds.map(agentId => toUnits.get(agentId)!.averagedReport!);
  const endpointDuplicateValues = comparableAgentIds.map(agentId => mean([
    fromUnits.get(agentId)!.duplicateTotalVariation!,
    toUnits.get(agentId)!.duplicateTotalVariation!,
  ]));
  const replicateSeparationMargins = comparableAgentIds.map(agentId => replicateSeparationMargin({
    from: fromUnits.get(agentId)!,
    to: toUnits.get(agentId)!,
  }));
  const fromState = summarizeVectors({
    expectedAgentIds: comparableAgentIds,
    units: comparableAgentIds.map(agentId => fromUnits.get(agentId)!),
  });
  const toState = summarizeVectors({
    expectedAgentIds: comparableAgentIds,
    units: comparableAgentIds.map(agentId => toUnits.get(agentId)!),
  });
  const fromPooled = fromState.pooledProbabilities;
  const toPooled = toState.pooledProbabilities;
  const fromWrong = input.checkpointRows.find(row => row.sourceTaskId === input.sourceTaskId
    && row.checkpointRound === input.fromCheckpoint)!.wrongConsensus.status;
  const toWrong = input.checkpointRows.find(row => row.sourceTaskId === input.sourceTaskId
    && row.checkpointRound === input.toCheckpoint)!.wrongConsensus.status;
  const fromBrier = fromPooled ? brier(fromPooled, input.outcomeOptionId) : null;
  const toBrier = toPooled ? brier(toPooled, input.outcomeOptionId) : null;
  const meanAgentActivity = fromVectors.length
    ? mean(fromVectors.map((item, index) => tv(item.values, toVectors[index].values))) : null;
  const meanEndpointDuplicateTotalVariation = optionalMean(endpointDuplicateValues);
  const result: TrajectoryTransitionRowV1 = {
    sourceTaskId: input.sourceTaskId,
    fromCheckpoint: input.fromCheckpoint,
    toCheckpoint: input.toCheckpoint,
    comparableAgentIds,
    missingFromComparableRoster: missing,
    completeComparableRoster: missing.length === 0,
    reportedTransition: {
      meanAgentActivity,
      meanEndpointDuplicateTotalVariation,
      activityMinusMeanEndpointDuplicateTotalVariation:
        meanAgentActivity !== null && meanEndpointDuplicateTotalVariation !== null
          ? meanAgentActivity - meanEndpointDuplicateTotalVariation : null,
      activityExceedsMeanEndpointDuplicateTotalVariation:
        meanAgentActivity !== null && meanEndpointDuplicateTotalVariation !== null
          ? meanAgentActivity > meanEndpointDuplicateTotalVariation + 1e-12 : null,
      pooledDrift: fromPooled && toPooled ? tv(fromPooled.values, toPooled.values) : null,
      meanNormalizedReportEntropyDelta: fromState.meanNormalizedReportEntropy !== null
        && toState.meanNormalizedReportEntropy !== null
        ? toState.meanNormalizedReportEntropy - fromState.meanNormalizedReportEntropy : null,
      normalizedGeneralizedJsdDelta: fromState.normalizedGeneralizedJsd !== null
        && toState.normalizedGeneralizedJsd !== null
        ? toState.normalizedGeneralizedJsd - fromState.normalizedGeneralizedJsd : null,
      pooledConcentrationDelta: fromState.pooledConcentration !== null
        && toState.pooledConcentration !== null
        ? toState.pooledConcentration - fromState.pooledConcentration : null,
      replicateSeparation: summarizeReplicateSeparation(replicateSeparationMargins),
    },
    offlineEvaluation: {
      comparablePooledBrierFrom: fromBrier,
      comparablePooledBrierTo: toBrier,
      comparablePooledBrierDelta: fromBrier !== null && toBrier !== null ? toBrier - fromBrier : null,
    },
    wrongConsensusTransition: { from: fromWrong, to: toWrong, event: "none" },
  };
  if (result.reportedTransition.meanAgentActivity !== null
    && result.reportedTransition.pooledDrift !== null
    && result.reportedTransition.pooledDrift
      > result.reportedTransition.meanAgentActivity + 1e-12) {
    throw new Error("trajectory_analysis_pooling_contraction_violated");
  }
  return result;
}

function assignEvents(rows: TrajectoryTransitionRowV1[]): void {
  let escapedEarlier = false;
  rows.forEach(row => {
    const transition = row.wrongConsensusTransition;
    if (transition.from === "indeterminate" || transition.to === "indeterminate") {
      transition.event = "unavailable";
    } else if (transition.from === "wrong_consensus" && transition.to === "wrong_consensus") {
      transition.event = "persistence";
    } else if (transition.from === "wrong_consensus" && transition.to === "not_wrong_consensus") {
      transition.event = "escape";
      escapedEarlier = true;
    } else if (transition.from === "not_wrong_consensus" && transition.to === "wrong_consensus") {
      transition.event = escapedEarlier ? "relapse" : "entry";
    } else transition.event = "none";
  });
}

function emptyEventCounts(): Record<TransitionEventV1, number> {
  return { entry: 0, persistence: 0, escape: 0, relapse: 0, none: 0, unavailable: 0 };
}

export function analyzeCollectiveDynamicsTrajectoryV1(input: {
  plan: ReturnType<typeof loadFrozenCollectiveDynamicsTrajectorySensorV1>["plan"];
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
  run: CollectiveDynamicsTrajectorySensorRunV1;
}): CollectiveDynamicsTrajectoryAnalysisV1 {
  verifyCollectiveDynamicsTrajectorySensorRunV1({
    plan: input.plan,
    freeze: input.freeze,
    artifact: input.run,
  });
  const terminalCounts: Record<string, number> = {};
  input.run.terminals.forEach(terminal => {
    terminalCounts[terminal.status] = (terminalCounts[terminal.status] ?? 0) + 1;
  });
  const unitRows = buildUnitRows({ freeze: input.freeze, run: input.run });
  const checkpointRows = buildCheckpointRows({
    planTaskIds: input.plan.sourceTaskIds,
    freeze: input.freeze,
    unitRows,
  });
  const transitionRows: TrajectoryTransitionRowV1[] = [];
  const taskTrajectories = input.plan.sourceTaskIds.map(sourceTaskId => {
    const view = input.freeze.views.find(candidate => candidate.sourceTaskId === sourceTaskId)!;
    const outcomeOptionId = outcomeOptionForTask(input.freeze, sourceTaskId);
    const adjacent = ([[0, 1], [1, 2], [2, 3]] as const).map(([fromCheckpoint, toCheckpoint]) =>
      transitionBetween({
        sourceTaskId,
        fromCheckpoint,
        toCheckpoint,
        expectedAgentIds: view.expectedAgentIds,
        unitRows,
        checkpointRows,
        outcomeOptionId,
      }));
    assignEvents(adjacent);
    transitionRows.push(...adjacent);
    const x0ToX3 = transitionBetween({
      sourceTaskId,
      fromCheckpoint: 0,
      toCheckpoint: 3,
      expectedAgentIds: view.expectedAgentIds,
      unitRows,
      checkpointRows,
      outcomeOptionId,
    });
    const eventCounts = emptyEventCounts();
    adjacent.forEach(row => { eventCounts[row.wrongConsensusTransition.event] += 1; });
    const x0 = checkpointRows.find(row => row.sourceTaskId === sourceTaskId && row.checkpointRound === 0)!;
    const x3 = checkpointRows.find(row => row.sourceTaskId === sourceTaskId && row.checkpointRound === 3)!;
    const signature = x0.reportedState.normalizedGeneralizedJsd !== null
      && x3.reportedState.normalizedGeneralizedJsd !== null
      && x0.reportedState.pooledConcentration !== null
      && x3.reportedState.pooledConcentration !== null
      && x0.offlineEvaluation.pooledBrier !== null
      && x3.offlineEvaluation.pooledBrier !== null
      ? x3.reportedState.normalizedGeneralizedJsd < x0.reportedState.normalizedGeneralizedJsd - 1e-12
        && x3.reportedState.pooledConcentration > x0.reportedState.pooledConcentration + 1e-12
        && x3.offlineEvaluation.pooledBrier > x0.offlineEvaluation.pooledBrier + 1e-12
      : null;
    return {
      sourceTaskId,
      eventCounts,
      x0ToX3,
      errorAmplifyingConcentrationSignature: signature,
    };
  });
  const globalEventCounts = emptyEventCounts();
  transitionRows.forEach(row => { globalEventCounts[row.wrongConsensusTransition.event] += 1; });
  const validUnits = unitRows.filter(unit => unit.pairStatus === "valid");
  const duplicateValues = validUnits.map(unit => unit.duplicateTotalVariation!);
  const completeTransitions = transitionRows.filter(row => row.completeComparableRoster);
  const transitionsExceedingDuplicateMean = transitionRows.filter(row =>
    row.reportedTransition.activityExceedsMeanEndpointDuplicateTotalVariation === true);
  const transitionsWithMajorityReplicateSeparation = transitionRows.filter(row =>
    row.reportedTransition.replicateSeparation.majoritySeparated === true);
  const x0ToX3Rows = taskTrajectories.map(task => task.x0ToX3);
  const observedEntryOrEscapeCount = globalEventCounts.entry + globalEventCounts.escape;
  const body: Omit<CollectiveDynamicsTrajectoryAnalysisV1, "contentHash"> = {
    analysisRef: COLLECTIVE_DYNAMICS_TRAJECTORY_ANALYSIS_V1,
    planHash: input.plan.contentHash,
    freezeHash: input.freeze.contentHash,
    runHash: input.run.contentHash,
    inferenceUnit: "task",
    sensorUnit: "task_agent_checkpoint_exact_repeat_pair",
    stateTruthAccess: "none",
    evaluationTruthAccess: "offline_resolution_only",
    terminalCounts,
    unitRows,
    checkpointRows,
    transitionRows,
    taskTrajectories,
    summary: {
      registeredCellCount: 152,
      validCellCount: input.run.terminals.filter(terminal => terminal.status === "valid").length,
      interruptedOrInvalidCellCount:
        input.run.terminals.filter(terminal => terminal.status !== "valid").length,
      registeredUnitCount: 76,
      validUnitCount: validUnits.length,
      invalidOrMissingUnitCount: unitRows.length - validUnits.length,
      completeCheckpointCount: checkpointRows.filter(row => row.reportedState.rosterComplete).length,
      incompleteCheckpointCount: checkpointRows.filter(row => !row.reportedState.rosterComplete).length,
      completeAdjacentTransitionCount: completeTransitions.length,
      incompleteAdjacentTransitionCount: transitionRows.length - completeTransitions.length,
      adjacentTransitionCountActivityExceedsDuplicateMean: transitionsExceedingDuplicateMean.length,
      taskCountWithActivityExceedingDuplicateMean: new Set(
        transitionsExceedingDuplicateMean.map(row => row.sourceTaskId),
      ).size,
      adjacentTransitionCountWithMajorityReplicateSeparation:
        transitionsWithMajorityReplicateSeparation.length,
      taskCountWithMajorityReplicateSeparation: new Set(
        transitionsWithMajorityReplicateSeparation.map(row => row.sourceTaskId),
      ).size,
      exactDuplicatePairCount: duplicateValues.filter(value => value === 0).length,
      meanDuplicateTotalVariation: optionalMean(duplicateValues),
      medianDuplicateTotalVariation: quantileNearestRank(duplicateValues, 0.50),
      p75DuplicateTotalVariation: quantileNearestRank(duplicateValues, 0.75),
      p90DuplicateTotalVariation: quantileNearestRank(duplicateValues, 0.90),
      maxDuplicateTotalVariation: duplicateValues.length ? Math.max(...duplicateValues) : null,
      eventCounts: globalEventCounts,
      taskCountWithEntry: taskTrajectories.filter(task => task.eventCounts.entry > 0).length,
      taskCountWithEscape: taskTrajectories.filter(task => task.eventCounts.escape > 0).length,
      taskCountWithRelapse: taskTrajectories.filter(task => task.eventCounts.relapse > 0).length,
      errorAmplifyingConcentrationSignatureCount: taskTrajectories.filter(task =>
        task.errorAmplifyingConcentrationSignature === true).length,
      meanX0ToX3Activity: optionalMean(x0ToX3Rows.flatMap(row =>
        row.reportedTransition.meanAgentActivity === null ? [] : [row.reportedTransition.meanAgentActivity])),
      meanX0ToX3PooledDrift: optionalMean(x0ToX3Rows.flatMap(row =>
        row.reportedTransition.pooledDrift === null ? [] : [row.reportedTransition.pooledDrift])),
      meanX0ToX3JsdDelta: optionalMean(x0ToX3Rows.flatMap(row =>
        row.reportedTransition.normalizedGeneralizedJsdDelta === null
          ? [] : [row.reportedTransition.normalizedGeneralizedJsdDelta])),
      meanX0ToX3ConcentrationDelta: optionalMean(x0ToX3Rows.flatMap(row =>
        row.reportedTransition.pooledConcentrationDelta === null
          ? [] : [row.reportedTransition.pooledConcentrationDelta])),
      meanX0ToX3PooledBrierDelta: optionalMean(x0ToX3Rows.flatMap(row =>
        row.offlineEvaluation.comparablePooledBrierDelta === null
          ? [] : [row.offlineEvaluation.comparablePooledBrierDelta])),
    },
    decision: {
      classification: observedEntryOrEscapeCount > 0
        ? "DESCRIPTIVE_TRAJECTORY_SIGNAL" : "NO_TRAJECTORY_SIGNAL",
      observedEntryOrEscapeCount,
      candidateDynamicsEligible: false,
      operationalMeaning: observedEntryOrEscapeCount > 0
        ? "at_least_one_identifiable_wrong_consensus_entry_or_escape"
        : "no_identifiable_wrong_consensus_entry_or_escape",
      candidateBlockers: [
        "five_task_development_sample",
        "single_seed_fixed_call_order",
        ...(input.run.terminals.some(terminal => terminal.status === "interrupted_unobserved")
          ? ["one_interrupted_sensor_cell"] : []),
        ...(globalEventCounts.unavailable > 0 ? ["indeterminate_wrong_consensus_checkpoints"] : []),
      ],
    },
    claimCeiling: "five_task_one_seed_descriptive_reported_belief_trajectory_only",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): number {
  const outputDirectory = resolve(
    process.env.M2_TRAJECTORY_SENSOR_OUTPUT_DIR
      ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1,
  );
  const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(outputDirectory);
  const runFile = join(outputDirectory, "run.json");
  if (!existsSync(runFile)) throw new Error("trajectory_analysis_run_missing");
  const run = JSON.parse(readFileSync(runFile, "utf8")) as CollectiveDynamicsTrajectorySensorRunV1;
  const analysis = analyzeCollectiveDynamicsTrajectoryV1({
    plan: frozen.plan,
    freeze: frozen.freeze,
    run,
  });
  const target = join(outputDirectory, "analysis-v1.4.json");
  const text = `${JSON.stringify(analysis, null, 2)}\n`;
  if (existsSync(target) && readFileSync(target, "utf8") !== text) {
    throw new Error("trajectory_analysis_no_overwrite_conflict");
  }
  if (!existsSync(target)) writeFileSync(target, text, { flag: "wx" });
  console.log(JSON.stringify({
    status: "analyzed",
    classification: analysis.decision.classification,
    summary: analysis.summary,
    contentHash: analysis.contentHash,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
