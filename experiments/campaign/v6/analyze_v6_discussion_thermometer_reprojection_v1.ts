/**
 * Zero-provider M2/D1 reprojection through the independent discussion
 * thermometer. Raw/freeze/run verification happens before this module accepts
 * the normalized dataset; no outcome or intervention field enters the result.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  projectDiscussionThermometerTransitionV1,
  type DiscussionThermometerStateV1,
  type DiscussionThermometerTransitionV1,
} from "../../../src/lib/epistemic";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  loadFrozenCollectiveDynamicsTrajectorySensorV1,
} from "./run_v6_collective_dynamics_trajectory_sensor_v1";
import {
  analyzeCollectiveDynamicsTrajectoryV1,
  type CollectiveDynamicsTrajectoryAnalysisV1,
  type TrajectorySensorUnitRowV1,
} from "./analyze_v6_collective_dynamics_trajectory_v1";
import { projectTrajectoryThermometerStateV1 } from
  "./collectiveDynamicsTrajectoryThermometerAdapterV1";
import {
  verifyCollectiveDynamicsTrajectorySensorRunV1,
  type CollectiveDynamicsTrajectorySensorRunV1,
} from "./runCollectiveDynamicsTrajectorySensorV1";

export const DISCUSSION_THERMOMETER_REPROJECTION_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.discussion-thermometer-reprojection",
  version: "1.0.0",
});

type Checkpoint = 0 | 1 | 2 | 3;

export interface ThermometerReprojectionDatasetV1 {
  corpusId: string;
  planHash: string;
  freezeHash: string;
  runHash: string;
  legacyAnalysisHash: string;
  tasks: Array<{
    sourceTaskId: number;
    optionIds: string[];
    expectedAgentIds: string[];
    checkpointSnapshotHashes: Record<Checkpoint, string>;
  }>;
  unitRows: TrajectorySensorUnitRowV1[];
  legacyCheckpointRows: CollectiveDynamicsTrajectoryAnalysisV1["checkpointRows"];
}

export interface ThermometerReprojectionV1 {
  analysisRef: typeof DISCUSSION_THERMOMETER_REPROJECTION_V1;
  inferenceStatus: "descriptive_operational_belief_reprojection_only";
  truthAccess: "none";
  datasets: Array<{
    corpusId: string;
    planHash: string;
    freezeHash: string;
    runHash: string;
    legacyAnalysisHash: string;
    states: DiscussionThermometerStateV1[];
    transitions: DiscussionThermometerTransitionV1[];
    comparisonWithLegacyAbMean: {
      checkpointCount: number;
      meanPooledTotalVariation: number;
      maxPooledTotalVariation: number;
      meanAbsoluteWithinEntropyDifference: number;
      maxAbsoluteWithinEntropyDifference: number;
      meanAbsoluteJsdDifference: number;
      maxAbsoluteJsdDifference: number;
      meanAbsoluteConcentrationDifference: number;
      maxAbsoluteConcentrationDifference: number;
    };
  }>;
  summary: {
    taskCount: number;
    checkpointCount: number;
    adjacentTransitionCount: number;
    fullCoverageCheckpointCount: number;
    incompleteCoverageCheckpointCount: number;
    validPrimaryReportCount: number;
    validRepeatPairCount: number;
    meanReplicateTotalVariation: number | null;
    maxReplicateTotalVariation: number | null;
    completeMatchedTransitionCount: number;
    transitionsAboveRepeatabilityReference: number;
    transitionsWithMovementButNoAgentTopSetChange: number;
    transitionsWithPooledMovementButNoPooledTopSetChange: number;
    publicChoiceCrossCheckAvailableCheckpointCount: number;
  };
  interpretationBoundary: {
    primarySelfReportSemantics: "operational_agent_belief";
    repeatSemantics: "instrument_quality_only";
    publicChoiceSemantics: "unavailable_without_direct_structured_choice";
    actionAuthority: "none";
  };
  contentHash: string;
}

type LedgerEventV1 = {
  type: "started" | "terminal";
  cellId: string;
  requestId: string;
  requestHash: string;
  sequence: number;
  timestamp: string;
  status?: string;
  terminal?: {
    cellId: string;
    requestId: string;
    requestHash: string;
    status: string;
    terminalAt: string;
    parseFailureCode?: string;
  };
};

function readLedger(file: string): LedgerEventV1[] {
  return readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)
    .map(line => JSON.parse(line) as LedgerEventV1);
}

function assertStarted(event: LedgerEventV1, cell: { cellId: string; request: { requestId: string }; requestHash: string; globalSequence: number }): void {
  if (event.type !== "started" || event.cellId !== cell.cellId
    || event.requestId !== cell.request.requestId || event.requestHash !== cell.requestHash
    || event.sequence !== cell.globalSequence) {
    throw new Error("thermometer_reprojection_started_binding_invalid");
  }
}

function auditSplitRecoveryLedger(outputDirectory: string, frozen: ReturnType<typeof loadFrozenCollectiveDynamicsTrajectorySensorV1>, run: CollectiveDynamicsTrajectorySensorRunV1): void {
  const originalFile = join(outputDirectory, "attempts.jsonl");
  const recoveryFile = join(outputDirectory, "recovery-attempts.jsonl");
  const recoveryRecordFile = join(outputDirectory, "recovery.json");
  const original = readLedger(originalFile);
  if (original.length !== 105) throw new Error("thermometer_reprojection_original_split_ledger_count_invalid");
  for (let index = 0; index < 52; index += 1) {
    const cell = frozen.freeze.cells[index];
    assertStarted(original[index * 2], cell);
    const terminal = original[index * 2 + 1];
    if (terminal.type !== "terminal" || terminal.cellId !== cell.cellId
      || terminal.requestId !== cell.request.requestId || terminal.requestHash !== cell.requestHash
      || terminal.sequence !== cell.globalSequence || terminal.status !== "invalid_response"
      || terminal.terminal?.status !== "invalid_response"
      || terminal.terminal.parseFailureCode !== "sensor_canary_option_set_mismatch") {
      throw new Error("thermometer_reprojection_original_terminal_binding_invalid");
    }
  }
  assertStarted(original[104], frozen.freeze.cells[52]);
  const recovery = readLedger(recoveryFile);
  if (recovery.length !== 198) throw new Error("thermometer_reprojection_recovery_ledger_count_invalid");
  for (let offset = 0; offset < 99; offset += 1) {
    const cell = frozen.freeze.cells[53 + offset];
    assertStarted(recovery[offset * 2], cell);
    const terminal = recovery[offset * 2 + 1];
    if (terminal.type !== "terminal" || terminal.cellId !== cell.cellId
      || terminal.requestId !== cell.request.requestId || terminal.requestHash !== cell.requestHash
      || terminal.sequence !== cell.globalSequence || terminal.status !== "valid"
      || terminal.terminal?.status !== "valid" || terminal.terminal.cellId !== cell.cellId
      || terminal.terminal.requestHash !== cell.requestHash
      || terminal.timestamp !== terminal.terminal.terminalAt) {
      throw new Error("thermometer_reprojection_recovery_terminal_binding_invalid");
    }
  }
  verifyCollectiveDynamicsTrajectorySensorRunV1({
    plan: frozen.plan, freeze: frozen.freeze, artifact: run,
  });
  if (run.terminals.length !== 152 || run.terminals.filter(item => item.status === "valid").length !== 151
    || run.terminals.filter(item => item.status === "interrupted_unobserved").length !== 1
    || run.terminals[52]?.cellId !== frozen.freeze.cells[52].cellId) {
    throw new Error("thermometer_reprojection_split_run_terminal_count_invalid");
  }
  const record = JSON.parse(readFileSync(recoveryRecordFile, "utf8")) as Record<string, unknown>;
  const originalLedgerHash = hashCollectiveDynamicsValueV1(readFileSync(originalFile, "utf8"));
  if (record.planHash !== frozen.plan.contentHash || record.freezeHash !== frozen.freeze.contentHash
    || record.originalLedgerHash !== originalLedgerHash || record.reparsedCapturedResponses !== 52
    || record.resumedFirstSequence !== 54 || record.recoveryProviderCalls !== 99
    || record.validTerminals !== 151 || record.interruptedTerminals !== 1
    || record.runHash !== run.contentHash) {
    throw new Error("thermometer_reprojection_recovery_record_invalid");
  }
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function tv(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
  optionIds: readonly string[],
): number {
  return optionIds.reduce((sum, optionId) =>
    sum + Math.abs(left[optionId] - right[optionId]), 0) / 2;
}

function topSet(probabilities: Readonly<Record<string, number>>, optionIds: readonly string[]): string[] {
  const maximum = Math.max(...optionIds.map(optionId => probabilities[optionId]));
  return optionIds.filter(optionId => Math.abs(probabilities[optionId] - maximum) <= 1e-12);
}

function oldVector(value: { optionIds: string[]; values: number[] }): Record<string, number> {
  return Object.fromEntries(value.optionIds.map((optionId, index) => [optionId, value.values[index]]));
}

export function buildDiscussionThermometerReprojectionV1(
  datasets: readonly ThermometerReprojectionDatasetV1[],
): ThermometerReprojectionV1 {
  const projectedDatasets = datasets.map(dataset => {
    const states = dataset.tasks.flatMap(task => ([0, 1, 2, 3] as const).map(checkpoint =>
      projectTrajectoryThermometerStateV1({
        sourceTaskId: task.sourceTaskId,
        checkpointRound: checkpoint,
        optionIds: task.optionIds,
        expectedAgentIds: task.expectedAgentIds,
        units: dataset.unitRows.filter(row => row.sourceTaskId === task.sourceTaskId),
        snapshotHash: task.checkpointSnapshotHashes[checkpoint],
      })));
    const transitions = dataset.tasks.flatMap(task => ([0, 1, 2] as const).map(checkpoint => {
      const from = states.find(state => state.claimId === `claim:trajectory:${task.sourceTaskId}`
        && state.checkpointIndex === checkpoint)!;
      const to = states.find(state => state.claimId === `claim:trajectory:${task.sourceTaskId}`
        && state.checkpointIndex === checkpoint + 1)!;
      return projectDiscussionThermometerTransitionV1({ from, to });
    }));

    const pooledDifferences: number[] = [];
    const withinDifferences: number[] = [];
    const jsdDifferences: number[] = [];
    const concentrationDifferences: number[] = [];
    for (const state of states) {
      const sourceTaskId = Number(state.claimId.split(":").at(-1));
      const legacy = dataset.legacyCheckpointRows.find(row =>
        row.sourceTaskId === sourceTaskId && row.checkpointRound === state.checkpointIndex);
      const legacyPool = legacy?.reportedState.pooledProbabilities;
      const pool = state.macrostate.pooledProbabilitiesByOptionId;
      if (!legacy || !legacyPool || !pool
        || state.macrostate.meanNormalizedReportEntropy === null
        || state.macrostate.normalizedGeneralizedJsd === null
        || state.macrostate.pooledConcentration === null
        || legacy.reportedState.meanNormalizedReportEntropy === null
        || legacy.reportedState.normalizedGeneralizedJsd === null
        || legacy.reportedState.pooledConcentration === null) {
        throw new Error("thermometer_reprojection_legacy_checkpoint_incomparable");
      }
      pooledDifferences.push(tv(pool, oldVector(legacyPool), state.optionIds));
      withinDifferences.push(Math.abs(state.macrostate.meanNormalizedReportEntropy
        - legacy.reportedState.meanNormalizedReportEntropy));
      jsdDifferences.push(Math.abs(state.macrostate.normalizedGeneralizedJsd
        - legacy.reportedState.normalizedGeneralizedJsd));
      concentrationDifferences.push(Math.abs(state.macrostate.pooledConcentration
        - legacy.reportedState.pooledConcentration));
    }
    return {
      corpusId: dataset.corpusId,
      planHash: dataset.planHash,
      freezeHash: dataset.freezeHash,
      runHash: dataset.runHash,
      legacyAnalysisHash: dataset.legacyAnalysisHash,
      states: states.map(state => ({ ...state })),
      transitions: transitions.map(transition => ({ ...transition })),
      comparisonWithLegacyAbMean: {
        checkpointCount: states.length,
        meanPooledTotalVariation: mean(pooledDifferences),
        maxPooledTotalVariation: Math.max(...pooledDifferences),
        meanAbsoluteWithinEntropyDifference: mean(withinDifferences),
        maxAbsoluteWithinEntropyDifference: Math.max(...withinDifferences),
        meanAbsoluteJsdDifference: mean(jsdDifferences),
        maxAbsoluteJsdDifference: Math.max(...jsdDifferences),
        meanAbsoluteConcentrationDifference: mean(concentrationDifferences),
        maxAbsoluteConcentrationDifference: Math.max(...concentrationDifferences),
      },
    };
  });
  const states = projectedDatasets.flatMap(dataset => dataset.states);
  const transitions = projectedDatasets.flatMap(dataset => dataset.transitions);
  const replicateDistances = states.flatMap(state =>
    Object.values(state.measurement.replicateTotalVariationByAgentId));
  const movementWithoutAgentTopChange = transitions.filter(transition => {
    if (transition.meanAgentTotalVariation === null || transition.meanAgentTotalVariation <= 1e-12) return false;
    const allStates = states;
    const from = allStates.find(state => state.contentHash === transition.fromStateHash)!;
    const to = allStates.find(state => state.contentHash === transition.toStateHash)!;
    return transition.matchedAgentIds.every(agentId => JSON.stringify(topSet(
      from.microstate.beliefProbabilitiesByAgentId[agentId], from.optionIds,
    )) === JSON.stringify(topSet(
      to.microstate.beliefProbabilitiesByAgentId[agentId], to.optionIds,
    )));
  }).length;
  const pooledMovementWithoutTopChange = transitions.filter(transition => {
    if (transition.pooledTotalVariation === null || transition.pooledTotalVariation <= 1e-12) return false;
    const from = states.find(state => state.contentHash === transition.fromStateHash)!;
    const to = states.find(state => state.contentHash === transition.toStateHash)!;
    const fromPool = from.macrostate.pooledProbabilitiesByOptionId!;
    const toPool = to.macrostate.pooledProbabilitiesByOptionId!;
    return JSON.stringify(topSet(fromPool, from.optionIds))
      === JSON.stringify(topSet(toPool, to.optionIds));
  }).length;
  const body: Omit<ThermometerReprojectionV1, "contentHash"> = {
    analysisRef: DISCUSSION_THERMOMETER_REPROJECTION_V1,
    inferenceStatus: "descriptive_operational_belief_reprojection_only",
    truthAccess: "none",
    datasets: projectedDatasets,
    summary: {
      taskCount: datasets.reduce((sum, dataset) => sum + dataset.tasks.length, 0),
      checkpointCount: states.length,
      adjacentTransitionCount: transitions.length,
      fullCoverageCheckpointCount: states.filter(state => state.roster.coverage === 1).length,
      incompleteCoverageCheckpointCount: states.filter(state => state.roster.coverage < 1).length,
      validPrimaryReportCount: states.reduce((sum, state) =>
        sum + state.measurement.validPrimaryReportCount, 0),
      validRepeatPairCount: replicateDistances.length,
      meanReplicateTotalVariation: replicateDistances.length ? mean(replicateDistances) : null,
      maxReplicateTotalVariation: replicateDistances.length
        ? Math.max(...replicateDistances) : null,
      completeMatchedTransitionCount: transitions.filter(item => item.completeMatchedRoster).length,
      transitionsAboveRepeatabilityReference: transitions.filter(item =>
        item.repeatabilityReference.comparison === "above_reference").length,
      transitionsWithMovementButNoAgentTopSetChange: movementWithoutAgentTopChange,
      transitionsWithPooledMovementButNoPooledTopSetChange: pooledMovementWithoutTopChange,
      publicChoiceCrossCheckAvailableCheckpointCount: states.filter(state =>
        state.behavioralCrossCheck.status === "available").length,
    },
    interpretationBoundary: {
      primarySelfReportSemantics: "operational_agent_belief",
      repeatSemantics: "instrument_quality_only",
      publicChoiceSemantics: "unavailable_without_direct_structured_choice",
      actionAuthority: "none",
    },
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function loadVerifiedDataset(corpusId: string, outputDirectory: string, ledgerMode: "single" | "split_recovery"): ThermometerReprojectionDatasetV1 {
  const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(outputDirectory);
  const run = JSON.parse(readFileSync(join(frozen.outputDirectory, "run.json"), "utf8")) as
    CollectiveDynamicsTrajectorySensorRunV1;
  if (ledgerMode === "split_recovery") auditSplitRecoveryLedger(frozen.outputDirectory, frozen, run);
  else {
    const auditModule = readLedger(join(frozen.outputDirectory, "attempts.jsonl"));
    if (auditModule.length !== frozen.freeze.registeredCellCount * 2) {
      throw new Error("thermometer_reprojection_single_ledger_count_invalid");
    }
    verifyCollectiveDynamicsTrajectorySensorRunV1({ plan: frozen.plan, freeze: frozen.freeze, artifact: run });
  }
  const regenerated = analyzeCollectiveDynamicsTrajectoryV1({
    plan: frozen.plan,
    freeze: frozen.freeze,
    run,
  });
  const stored = JSON.parse(readFileSync(join(frozen.outputDirectory, "analysis-v1.4.json"), "utf8")) as
    CollectiveDynamicsTrajectoryAnalysisV1;
  if (JSON.stringify(regenerated) !== JSON.stringify(stored)) {
    throw new Error(`thermometer_reprojection_legacy_analysis_replay_mismatch:${corpusId}`);
  }
  const tasks = frozen.plan.sourceTaskIds.map(sourceTaskId => {
    const views = frozen.freeze.views.filter(view => view.sourceTaskId === sourceTaskId);
    const first = views[0];
    if (!first) throw new Error("thermometer_reprojection_task_view_missing");
    const checkpointSnapshotHashes = Object.fromEntries(([0, 1, 2, 3] as const).map(checkpoint => {
      const checkpointViews = views.filter(view => view.checkpointRound === checkpoint)
        .map(view => ({ agentId: view.agentId, snapshotHash: view.contentHash }));
      return [checkpoint, hashCollectiveDynamicsValueV1({ sourceTaskId, checkpoint, checkpointViews })];
    })) as Record<Checkpoint, string>;
    return {
      sourceTaskId,
      optionIds: first.claim.options.map((_, index) => `opt_${index + 1}`),
      expectedAgentIds: [...first.expectedAgentIds],
      checkpointSnapshotHashes,
    };
  });
  return {
    corpusId,
    planHash: frozen.plan.contentHash,
    freezeHash: frozen.freeze.contentHash,
    runHash: run.contentHash,
    legacyAnalysisHash: stored.contentHash,
    tasks,
    unitRows: regenerated.unitRows,
    legacyCheckpointRows: regenerated.checkpointRows,
  };
}

function writeExactOrVerify(path: string, value: unknown): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== text) throw new Error("thermometer_reprojection_no_overwrite_conflict");
    return;
  }
  writeFileSync(path, text, { flag: "wx" });
}

function main(): number {
  const workspace = resolve(process.cwd());
  const outputDirectory = resolve(workspace, "results/v6_discussion_thermometer_m2_d1_reprojection_v1");
  const datasets = [
    loadVerifiedDataset("M2_FIRST_FIVE", resolve(workspace,
      "results/v6_collective_dynamics_trajectory_sensor_v1_glm46v_seed1"), "split_recovery"),
    loadVerifiedDataset("D1_REMAINING_FIVE", resolve(workspace,
      "results/v6_collective_dynamics_post_m2_bridge_v1_glm46v_seed1_attempt2"), "single"),
  ];
  const result = buildDiscussionThermometerReprojectionV1(datasets);
  mkdirSync(outputDirectory, { recursive: true });
  const target = join(outputDirectory, "analysis.json");
  writeExactOrVerify(target, result);
  console.log(JSON.stringify({
    status: "reprojected",
    providerCalls: 0,
    output: target,
    summary: result.summary,
    contentHash: result.contentHash,
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
