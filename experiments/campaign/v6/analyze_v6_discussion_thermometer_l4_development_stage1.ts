/**
 * Offline analysis for the L4 development slice.
 *
 * This is deliberately a thermometer analysis, not a re-run of the legacy
 * trajectory analyzer: primary self-reports are the state estimate, selected
 * B reports are instrument checks, and truth is read only in this offline
 * module for evaluation labels.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  loadFrozenCollectiveDynamicsTrajectorySensorV1,
  auditCollectiveDynamicsTrajectorySensorAttemptLedgerV1,
} from "./run_v6_collective_dynamics_trajectory_sensor_v1";
import {
  auditCollectiveDynamicsTrajectoryPublicAttemptLedgerV1,
} from "./run_v6_collective_dynamics_trajectory_public_v1";
import {
  verifyCollectiveDynamicsTrajectoryPublicRunV1,
  type CollectiveDynamicsTrajectoryPublicRunV1,
} from "./runCollectiveDynamicsTrajectoryPublicV1";
import {
  verifyCollectiveDynamicsTrajectorySensorRunV1,
  type CollectiveDynamicsTrajectorySensorRunV1,
} from "./runCollectiveDynamicsTrajectorySensorV1";
import {
  projectDiscussionThermometerTransitionV1,
  type DiscussionThermometerStateV1,
} from "../../../src/lib/epistemic";
import {
  projectTrajectoryThermometerStateV1,
  type TrajectoryThermometerUnitV1,
} from "./collectiveDynamicsTrajectoryThermometerAdapterV1";
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import { pairedSignFlipNullSummaryV1 } from "./collectiveDynamicsTrajectoryPredictionV1";

export const L4_DEVELOPMENT_ANALYSIS_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-l4-development-analysis",
  version: "1.3.0",
});

type AnyRecord = Record<string, any>;

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function topOptions(probabilities: Record<string, number>): string[] {
  const max = Math.max(...Object.values(probabilities));
  return Object.keys(probabilities).filter(option =>
    Math.abs(probabilities[option] - max) <= 1e-12).sort();
}

function brier(probabilities: Record<string, number>, correctOption: string): number {
  return Object.entries(probabilities).reduce((sum, [option, probability]) =>
    sum + (probability - (option === correctOption ? 1 : 0)) ** 2, 0);
}

function brierAgainstChoice(probabilities: Readonly<Record<string, number>>, choice: string): number {
  return Object.entries(probabilities).reduce((sum, [option, probability]) =>
    sum + (probability - (option === choice ? 1 : 0)) ** 2, 0);
}

function exactPairedSignPValue(leftOnly: number, rightOnly: number): number {
  const discordant = leftOnly + rightOnly;
  if (discordant === 0) return 1;
  const tail = Math.min(leftOnly, rightOnly);
  const choose = (n: number, k: number): number => {
    let value = 1;
    for (let index = 1; index <= k; index += 1) value = value * (n - index + 1) / index;
    return value;
  };
  const lowerTail = Array.from({ length: tail + 1 }, (_, index) =>
    choose(discordant, index)).reduce((sum, value) => sum + value, 0) / 2 ** discordant;
  return Math.min(1, 2 * lowerTail);
}

function publicChoicesByCheckpoint(
  run: CollectiveDynamicsTrajectoryPublicRunV1,
  sourceTaskId: number,
  round: number,
): Record<string, string> {
  if (round === 0) return {};
  return Object.fromEntries(run.terminals.flatMap(terminal =>
    terminal.sourceTaskId === sourceTaskId && terminal.round === round
      && terminal.status === "valid" && terminal.parsedPublicTurn?.choiceId
      ? [[terminal.agentId, terminal.parsedPublicTurn.choiceId]] : []));
}

function snapshotHash(
  views: readonly AnyRecord[],
  sourceTaskId: number,
  checkpointRound: number,
): string {
  return hashCollectiveDynamicsValueV1({
    sourceTaskId,
    checkpointRound,
    viewHashes: views
      .filter(view => view.sourceTaskId === sourceTaskId
        && view.checkpointRound === checkpointRound)
      .sort((a, b) => a.agentId.localeCompare(b.agentId))
      .map(view => view.contentHash),
  });
}

function buildState(input: {
  sourceTaskId: number;
  checkpointRound: number;
  views: readonly AnyRecord[];
  terminals: readonly AnyRecord[];
  publicRun: CollectiveDynamicsTrajectoryPublicRunV1;
}): DiscussionThermometerStateV1 {
  const selectedViews = input.views.filter(view =>
    view.sourceTaskId === input.sourceTaskId && view.checkpointRound === input.checkpointRound);
  const expectedAgentIds = selectedViews[0]?.expectedAgentIds ?? [];
  const options: string[] = selectedViews[0]?.claim.options
    .map((_: string, index: number) => `opt_${index + 1}`) ?? [];
  const terminalByCell = new Map(input.terminals.map(terminal => [terminal.cellId, terminal]));
  const units: TrajectoryThermometerUnitV1[] = selectedViews.map(view => {
    const base = `trajectory-sensor:${input.terminals[0]?.cellId?.split(":")[1] ?? ""}`;
    const cellPrefix = input.terminals.find(terminal =>
      terminal.cellId.includes(`:${input.sourceTaskId}:`)
      && terminal.cellId.includes(`:${view.agentId}:X${input.checkpointRound}:`));
    const candidates = input.terminals.filter(terminal =>
      terminal.cellId.includes(`:${input.sourceTaskId}:`)
      && terminal.cellId.includes(`:${view.agentId}:X${input.checkpointRound}:`));
    const a = candidates.find(terminal => terminal.cellId.endsWith(":a"));
    const b = candidates.find(terminal => terminal.cellId.endsWith(":b"));
    const toVector = (terminal: AnyRecord | undefined) => terminal?.status === "valid"
      ? { optionIds: options, values: options.map(option => terminal.parsed.probabilities[option]) }
      : null;
    void base; void cellPrefix; void terminalByCell;
    return {
      agentId: view.agentId,
      checkpointRound: input.checkpointRound,
      repeatStatuses: { A: a?.status ?? "missing", B: b?.status ?? "missing" },
      repeatA: toVector(a),
      repeatB: toVector(b),
    };
  });
  return projectTrajectoryThermometerStateV1({
    sourceTaskId: input.sourceTaskId,
    checkpointRound: input.checkpointRound,
    optionIds: options,
    expectedAgentIds,
    units,
    snapshotHash: snapshotHash(input.views, input.sourceTaskId, input.checkpointRound),
    publicChoiceByAgentId: publicChoicesByCheckpoint(
      input.publicRun, input.sourceTaskId, input.checkpointRound),
  });
}

export interface L4DevelopmentAnalysisV1 {
  analysisRef: typeof L4_DEVELOPMENT_ANALYSIS_V1;
  source: { outputDirectory: string; planHash: string; freezeHash: string; publicRunHash: string; sensorRunHash: string };
  integrity: { publicLedger: "verified"; sensorLedger: "verified"; publicRun: "verified"; sensorRun: "verified" };
  measurement: {
    stateCount: number;
    transitionCount: number;
    expectedPrimaryReports: number;
    validPrimaryReports: number;
    primaryCoverage: number;
    selectedDuplicatePairs: number;
    duplicateMeanTV: number | null;
    duplicateMaxTV: number | null;
    publicChoiceCoveragePostRound: number;
  };
  states: Array<AnyRecord>;
  transitions: Array<AnyRecord>;
  offlineEvaluation: Array<AnyRecord>;
  findings: {
    stateVariation: { tasksWithNonzeroX0X3Movement: number; totalTasks: number; movementByTask: AnyRecord[] };
    transitionTiming: Array<{
      transition: "X0_TO_X1" | "X1_TO_X2" | "X2_TO_X3";
      taskCount: number;
      nonzeroMeanAgentTvTaskCount: number;
      nonzeroPooledTvTaskCount: number;
      meanAgentTv: number | null;
      meanPooledTv: number | null;
      aboveAvailableRepeatabilityReferenceCount: number;
    }>;
    publicChoicePersistence: Array<{
      transition: "R1_TO_R2" | "R2_TO_R3";
      eligibleAgentTransitions: number;
      changedChoiceCount: number;
      persistedChoiceCount: number;
    }>;
    crossChannelQualification: {
      estimand: "unique_primary_sensor_top_predicts_next_public_choice_beyond_previous_public_choice";
      eligibleUniqueTopCount: number;
      excludedSensorTieCount: number;
      sensorCorrectCount: number;
      persistenceCorrectCount: number;
      bothCorrectCount: number;
      sensorOnlyCorrectCount: number;
      persistenceOnlyCorrectCount: number;
      bothWrongCount: number;
      sensorTopEqualsPreviousChoiceCount: number;
      candidateMinusPersistenceAccuracy: number | null;
      discordantPairCount: number;
      exactTwoSidedPairedSignPValue: number;
      qualification: "incremental_signal_observed" | "no_incremental_signal_observed" | "underpowered_positive_difference";
    };
    sameCheckpointCompatibility: {
      interpretation: "non_independent_prompt_contains_current_public_choice";
      eligibleUniqueTopCount: number;
      compatibleCount: number;
      incompatibleCount: number;
    };
    taskLevelFutureChoice: Array<{
      sourceTaskId: number;
      eligibleAgentTransitions: number;
      sensorBrier: number | null;
      persistenceBrier: number | null;
      sensorMinusPersistenceBrier: number | null;
      sensorTopAccuracy: number | null;
      persistenceTopAccuracy: number | null;
    }>;
    taskLevelInference: {
      inferenceUnit: "task";
      completeTaskCount: number;
      meanSensorMinusPersistenceBrier: number | null;
      pairedSignFlipTwoSidedPValue: number | null;
      classification: "descriptive_negative_direction_only" | "no_incremental_signal_observed" | "incremental_signal_observed" | "unavailable";
    };
    strictWrongConsensus: { belief: AnyRecord[]; public: AnyRecord[] };
    interpretation: string[];
  };
  contentHash: string;
}

export function analyzeL4DevelopmentStage1V1(outputDirectoryInput?: string): L4DevelopmentAnalysisV1 {
  const outputDirectory = resolve(outputDirectoryInput ?? "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1");
  const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(outputDirectory);
  const publicRun = readJson<CollectiveDynamicsTrajectoryPublicRunV1>(join(outputDirectory, "public-run.json"));
  const sensorRun = readJson<CollectiveDynamicsTrajectorySensorRunV1>(join(outputDirectory, "run.json"));
  verifyCollectiveDynamicsTrajectoryPublicRunV1({ plan: frozen.plan, artifact: publicRun });
  verifyCollectiveDynamicsTrajectorySensorRunV1({ plan: frozen.plan, freeze: frozen.freeze, artifact: sensorRun });
  auditCollectiveDynamicsTrajectoryPublicAttemptLedgerV1({ artifact: publicRun, file: join(outputDirectory, "public-attempts.jsonl") });
  auditCollectiveDynamicsTrajectorySensorAttemptLedgerV1({ freeze: frozen.freeze, file: join(outputDirectory, "attempts.jsonl") });
  const sensorCells = new Map(frozen.freeze.cells.map(cell => [cell.cellId, cell]));
  const sensorTerminals = sensorRun.terminals.map(terminal => ({ ...terminal, cell: sensorCells.get(terminal.cellId) }));
  if (sensorTerminals.some(item => !item.cell)) throw new Error("l4_analysis_sensor_cell_missing");
  const states: DiscussionThermometerStateV1[] = [];
  for (const sourceTaskId of frozen.plan.sourceTaskIds) {
    for (const checkpointRound of frozen.plan.checkpoints) {
      states.push(buildState({
        sourceTaskId,
        checkpointRound,
        views: frozen.freeze.views,
        terminals: sensorTerminals,
        publicRun,
      }));
    }
  }
  const stateByKey = new Map(states.map(state => [
    `${state.claimId}:${state.checkpointIndex}`, state,
  ]));
  const transitions = [] as AnyRecord[];
  for (const sourceTaskId of frozen.plan.sourceTaskIds) {
    for (let round = 1; round <= 3; round += 1) {
      const from = stateByKey.get(`claim:trajectory:${sourceTaskId}:${round - 1}`)!;
      const to = stateByKey.get(`claim:trajectory:${sourceTaskId}:${round}`)!;
      transitions.push(projectDiscussionThermometerTransitionV1({ from, to }));
    }
  }
  const duplicateDistances = states.flatMap(state => Object.values(state.measurement.replicateTotalVariationByAgentId));
  const expectedPrimaryReports = frozen.plan.registeredAgentCount * frozen.plan.checkpoints.length;
  const validPrimaryReports = states.reduce((sum, state) => sum + state.measurement.validPrimaryReportCount, 0);
  const publicExpected = frozen.plan.registeredAgentCount * frozen.plan.publicRounds.length;
  const publicObserved = states.filter(state => state.checkpointIndex > 0)
    .reduce((sum, state) => sum + Object.keys(state.behavioralCrossCheck.publicChoiceByAgentId).length, 0);
  const offlineEvaluation: AnyRecord[] = [];
  const beliefWrongConsensus: AnyRecord[] = [];
  const publicWrongConsensus: AnyRecord[] = [];
  const movementByTask: AnyRecord[] = [];
  for (const sourceTaskId of frozen.plan.sourceTaskIds) {
    const task = createHiddenBenchTaskProjectionV1({ sourceTaskId }).adapter.task;
    const correctOption = `opt_${task.claim.options.indexOf(task.outcome) + 1}`;
    const taskStates = states.filter(state => state.claimId === `claim:trajectory:${sourceTaskId}`);
    taskStates.forEach(state => {
      const pooled = state.macrostate.pooledProbabilitiesByOptionId;
      offlineEvaluation.push({
        sourceTaskId, checkpointRound: state.checkpointIndex, correctOption,
        pooledBrier: pooled ? brier(pooled, correctOption) : null,
        pooledTopOptions: pooled ? topOptions(pooled) : [],
        pooledTopCorrect: pooled ? topOptions(pooled).includes(correctOption) : null,
      });
      const tops = state.roster.activeAgentIds.map(agentId =>
        topOptions(state.microstate.beliefProbabilitiesByAgentId[agentId]));
      const strictBelief = tops.length === state.roster.expectedAgentIds.length
        && tops.every(options => options.length === 1)
        && new Set(tops.map(options => options[0])).size === 1;
      if (strictBelief && tops[0][0] !== correctOption) {
        beliefWrongConsensus.push({ sourceTaskId, checkpointRound: state.checkpointIndex, optionId: tops[0][0] });
      }
      const choices = Object.values(state.behavioralCrossCheck.publicChoiceByAgentId);
      if (choices.length === state.roster.expectedAgentIds.length && new Set(choices).size === 1
        && choices[0] !== correctOption) {
        publicWrongConsensus.push({ sourceTaskId, checkpointRound: state.checkpointIndex, optionId: choices[0] });
      }
    });
    const x0 = taskStates.find(state => state.checkpointIndex === 0)!;
    const x3 = taskStates.find(state => state.checkpointIndex === 3)!;
    const transition = projectDiscussionThermometerTransitionV1({ from: x0, to: x3 });
    movementByTask.push({ sourceTaskId, meanAgentTV: transition.meanAgentTotalVariation, pooledTV: transition.pooledTotalVariation });
  }
  const transitionTiming = ([1, 2, 3] as const).map(round => {
    const rows = frozen.plan.sourceTaskIds.map(sourceTaskId => {
      const from = stateByKey.get(`claim:trajectory:${sourceTaskId}:${round - 1}`)!;
      const to = stateByKey.get(`claim:trajectory:${sourceTaskId}:${round}`)!;
      return projectDiscussionThermometerTransitionV1({ from, to });
    });
    return {
      transition: `X${round - 1}_TO_X${round}` as "X0_TO_X1" | "X1_TO_X2" | "X2_TO_X3",
      taskCount: rows.length,
      nonzeroMeanAgentTvTaskCount: rows.filter(row =>
        row.meanAgentTotalVariation !== null && row.meanAgentTotalVariation > 1e-12).length,
      nonzeroPooledTvTaskCount: rows.filter(row =>
        row.pooledTotalVariation !== null && row.pooledTotalVariation > 1e-12).length,
      meanAgentTv: mean(rows.flatMap(row => row.meanAgentTotalVariation === null
        ? [] : [row.meanAgentTotalVariation])),
      meanPooledTv: mean(rows.flatMap(row => row.pooledTotalVariation === null
        ? [] : [row.pooledTotalVariation])),
      aboveAvailableRepeatabilityReferenceCount: rows.filter(row =>
        row.repeatabilityReference.comparison === "above_reference").length,
    };
  });
  const publicChoicePersistence = ([1, 2] as const).map(round => {
    let eligibleAgentTransitions = 0;
    let changedChoiceCount = 0;
    frozen.plan.sourceTaskIds.forEach(sourceTaskId => {
      const previous = publicChoicesByCheckpoint(publicRun, sourceTaskId, round);
      const next = publicChoicesByCheckpoint(publicRun, sourceTaskId, round + 1);
      Object.keys(previous).filter(agentId => next[agentId] !== undefined).forEach(agentId => {
        eligibleAgentTransitions += 1;
        if (previous[agentId] !== next[agentId]) changedChoiceCount += 1;
      });
    });
    return {
      transition: `R${round}_TO_R${round + 1}` as "R1_TO_R2" | "R2_TO_R3",
      eligibleAgentTransitions,
      changedChoiceCount,
      persistedChoiceCount: eligibleAgentTransitions - changedChoiceCount,
    };
  });
  let eligibleUniqueTopCount = 0;
  let excludedSensorTieCount = 0;
  let sensorCorrectCount = 0;
  let persistenceCorrectCount = 0;
  let bothCorrectCount = 0;
  let sensorOnlyCorrectCount = 0;
  let persistenceOnlyCorrectCount = 0;
  let bothWrongCount = 0;
  let sensorTopEqualsPreviousChoiceCount = 0;
  for (const sourceTaskId of frozen.plan.sourceTaskIds) {
    for (const checkpointRound of [1, 2] as const) {
      const state = stateByKey.get(`claim:trajectory:${sourceTaskId}:${checkpointRound}`)!;
      const nextChoices = publicChoicesByCheckpoint(publicRun, sourceTaskId, checkpointRound + 1);
      for (const agentId of state.roster.expectedAgentIds) {
        const previousChoice = state.behavioralCrossCheck.publicChoiceByAgentId[agentId];
        const nextChoice = nextChoices[agentId];
        const probabilities = state.microstate.beliefProbabilitiesByAgentId[agentId];
        if (!previousChoice || !nextChoice || !probabilities) continue;
        const sensorTop = topOptions(probabilities);
        if (sensorTop.length !== 1) {
          excludedSensorTieCount += 1;
          continue;
        }
        eligibleUniqueTopCount += 1;
        const sensorCorrect = sensorTop[0] === nextChoice;
        const persistenceCorrect = previousChoice === nextChoice;
        if (sensorTop[0] === previousChoice) sensorTopEqualsPreviousChoiceCount += 1;
        if (sensorCorrect) sensorCorrectCount += 1;
        if (persistenceCorrect) persistenceCorrectCount += 1;
        if (sensorCorrect && persistenceCorrect) bothCorrectCount += 1;
        else if (sensorCorrect) sensorOnlyCorrectCount += 1;
        else if (persistenceCorrect) persistenceOnlyCorrectCount += 1;
        else bothWrongCount += 1;
      }
    }
  }
  let sameCheckpointEligible = 0;
  let sameCheckpointCompatible = 0;
  states.filter(state => state.checkpointIndex > 0).forEach(state => {
    state.roster.expectedAgentIds.forEach(agentId => {
      const probabilities = state.microstate.beliefProbabilitiesByAgentId[agentId];
      const choice = state.behavioralCrossCheck.publicChoiceByAgentId[agentId];
      if (!probabilities || !choice) return;
      const sensorTop = topOptions(probabilities);
      if (sensorTop.length !== 1) return;
      sameCheckpointEligible += 1;
      if (sensorTop[0] === choice) sameCheckpointCompatible += 1;
    });
  });
  const candidateMinusPersistenceAccuracy = eligibleUniqueTopCount
    ? (sensorCorrectCount - persistenceCorrectCount) / eligibleUniqueTopCount : null;
  const discordantPairCount = sensorOnlyCorrectCount + persistenceOnlyCorrectCount;
  const exactTwoSidedPairedSignPValue = exactPairedSignPValue(
    sensorOnlyCorrectCount, persistenceOnlyCorrectCount,
  );
  const qualification = sensorOnlyCorrectCount > persistenceOnlyCorrectCount
    ? exactTwoSidedPairedSignPValue <= 0.05
      ? "incremental_signal_observed" as const
      : "underpowered_positive_difference" as const
    : "no_incremental_signal_observed" as const;
  const taskLevelFutureChoice = frozen.plan.sourceTaskIds.map(sourceTaskId => {
    const sensorBriers: number[] = [];
    const persistenceBriers: number[] = [];
    let sensorTopCorrect = 0;
    let persistenceTopCorrect = 0;
    for (const checkpointRound of [1, 2] as const) {
      const state = stateByKey.get(`claim:trajectory:${sourceTaskId}:${checkpointRound}`)!;
      const nextChoices = publicChoicesByCheckpoint(publicRun, sourceTaskId, checkpointRound + 1);
      for (const agentId of state.roster.expectedAgentIds) {
        const probabilities = state.microstate.beliefProbabilitiesByAgentId[agentId];
        const previousChoice = state.behavioralCrossCheck.publicChoiceByAgentId[agentId];
        const nextChoice = nextChoices[agentId];
        if (!probabilities || !previousChoice || !nextChoice) continue;
        sensorBriers.push(brierAgainstChoice(probabilities, nextChoice));
        persistenceBriers.push(brierAgainstChoice(
          Object.fromEntries(Object.keys(probabilities).map(optionId => [
            optionId, optionId === previousChoice ? 1 : 0,
          ])),
          nextChoice,
        ));
        if (topOptions(probabilities).includes(nextChoice)) sensorTopCorrect += 1;
        if (previousChoice === nextChoice) persistenceTopCorrect += 1;
      }
    }
    const sensorBrier = mean(sensorBriers);
    const persistenceBrier = mean(persistenceBriers);
    return {
      sourceTaskId,
      eligibleAgentTransitions: sensorBriers.length,
      sensorBrier,
      persistenceBrier,
      sensorMinusPersistenceBrier: sensorBrier !== null && persistenceBrier !== null
        ? sensorBrier - persistenceBrier : null,
      sensorTopAccuracy: sensorBriers.length ? sensorTopCorrect / sensorBriers.length : null,
      persistenceTopAccuracy: persistenceBriers.length
        ? persistenceTopCorrect / persistenceBriers.length : null,
    };
  });
  const taskDeltas = taskLevelFutureChoice.flatMap(row =>
    row.sensorMinusPersistenceBrier === null ? [] : [row.sensorMinusPersistenceBrier]);
  const taskSignFlip = taskDeltas.length
    ? pairedSignFlipNullSummaryV1({ deltas: taskDeltas, exactWhenPossible: true }) : null;
  const taskMeanDelta = mean(taskDeltas);
  const taskLevelClassification = taskMeanDelta === null || !taskSignFlip
    ? "unavailable" as const
    : taskMeanDelta < 0 && taskSignFlip.twoSidedExceedance < 0.05
      ? "incremental_signal_observed" as const
      : taskMeanDelta < 0
        ? "descriptive_negative_direction_only" as const
        : "no_incremental_signal_observed" as const;
  const body: Omit<L4DevelopmentAnalysisV1, "contentHash"> = {
    analysisRef: L4_DEVELOPMENT_ANALYSIS_V1,
    source: { outputDirectory, planHash: frozen.plan.contentHash, freezeHash: frozen.freeze.contentHash, publicRunHash: publicRun.contentHash, sensorRunHash: sensorRun.contentHash },
    integrity: { publicLedger: "verified", sensorLedger: "verified", publicRun: "verified", sensorRun: "verified" },
    measurement: {
      stateCount: states.length, transitionCount: transitions.length,
      expectedPrimaryReports, validPrimaryReports, primaryCoverage: validPrimaryReports / expectedPrimaryReports,
      selectedDuplicatePairs: duplicateDistances.length, duplicateMeanTV: mean(duplicateDistances), duplicateMaxTV: duplicateDistances.length ? Math.max(...duplicateDistances) : null,
      publicChoiceCoveragePostRound: publicObserved / publicExpected,
    },
    states, transitions, offlineEvaluation,
    findings: {
      stateVariation: { tasksWithNonzeroX0X3Movement: movementByTask.filter(row => (row.meanAgentTV ?? 0) > 0).length, totalTasks: movementByTask.length, movementByTask },
      transitionTiming,
      publicChoicePersistence,
      crossChannelQualification: {
        estimand: "unique_primary_sensor_top_predicts_next_public_choice_beyond_previous_public_choice",
        eligibleUniqueTopCount,
        excludedSensorTieCount,
        sensorCorrectCount,
        persistenceCorrectCount,
        bothCorrectCount,
        sensorOnlyCorrectCount,
        persistenceOnlyCorrectCount,
        bothWrongCount,
        sensorTopEqualsPreviousChoiceCount,
        candidateMinusPersistenceAccuracy,
        discordantPairCount,
        exactTwoSidedPairedSignPValue,
        qualification,
      },
      sameCheckpointCompatibility: {
        interpretation: "non_independent_prompt_contains_current_public_choice",
        eligibleUniqueTopCount: sameCheckpointEligible,
        compatibleCount: sameCheckpointCompatible,
        incompatibleCount: sameCheckpointEligible - sameCheckpointCompatible,
      },
      taskLevelFutureChoice,
      taskLevelInference: {
        inferenceUnit: "task",
        completeTaskCount: taskDeltas.length,
        meanSensorMinusPersistenceBrier: taskMeanDelta,
        pairedSignFlipTwoSidedPValue: taskSignFlip?.twoSidedExceedance ?? null,
        classification: taskLevelClassification,
      },
      strictWrongConsensus: { belief: beliefWrongConsensus, public: publicWrongConsensus },
      interpretation: [
        "Primary canonical self-reports are the operational state estimate; selected B reports quantify repeatability only.",
        "Same-checkpoint belief-choice agreement is not an independent construct check because the frozen sensor view contains the current public choice.",
        "Future-choice qualification uses only X1/X2 primary reports and compares them on the same eligible rows with previous-choice persistence.",
        "Task-level future-choice Brier summaries are the primary inferential unit; agent rows remain descriptive within-task observations.",
        "Wrong-consensus labels and Brier scores are offline evaluation fields and are not available to the measurement layer.",
        "This slice identifies descriptive state trajectories; it does not identify a causal intervention effect or an attractor.",
      ],
    },
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): void {
  const outputDirectory = resolve(process.env.L4_DEVELOPMENT_OUTPUT_DIR ?? "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1");
  const analysis = analyzeL4DevelopmentStage1V1(outputDirectory);
  const file = join(outputDirectory, "analysis-v1.3.json");
  if (existsSync(file) && readFileSync(file, "utf8") !== `${JSON.stringify(analysis, null, 2)}\n`) {
    throw new Error("l4_analysis_no_overwrite_conflict");
  }
  if (!existsSync(file)) writeFileSync(file, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    outputDirectory,
    analysisHash: analysis.contentHash,
    measurement: analysis.measurement,
    stateVariation: analysis.findings.stateVariation,
    strictWrongConsensus: analysis.findings.strictWrongConsensus,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) main();
