/** Truth-blind analysis for the V2 replicate-average qualification canary. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2,
  estimateReplicateAverageSplitHalfV2,
  verifyCollectiveDynamicsReplicateAverageRunV2,
  type CollectiveDynamicsReplicateAverageCanaryPlanV2,
  type CollectiveDynamicsReplicateAverageFreezeV2,
  type CollectiveDynamicsReplicateAverageRunV2,
  type CollectiveDynamicsReplicateLabelV2,
  type ReplicateAverageSplitHalfV2,
} from "./collectiveDynamicsReplicateAverageCanaryV2";
import type {
  CollectiveDynamicsSensorCanaryTerminalV1,
  ParsedSensorReportV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_OUTPUT_V2,
  loadFrozenCollectiveDynamicsReplicateAverageCanaryV2,
} from "./run_v6_collective_dynamics_replicate_average_canary_v2";

export const COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_ANALYSIS_V2 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-replicate-average-canary.analysis",
  version: "2.0.0",
});

export interface ReplicateAverageUnitRowV2 {
  unitId: string;
  sourceTaskId: number;
  agentId: string;
  terminalStatusByLabel: Record<CollectiveDynamicsReplicateLabelV2, string>;
  pairStatus: "valid" | "missing_or_invalid";
  blockAProbabilitiesByOptionId: Record<string, number> | null;
  blockBProbabilitiesByOptionId: Record<string, number> | null;
  splitHalfTotalVariation: number | null;
  absoluteNormalizedEntropyDifference: number | null;
  blockAUniqueTop: string | null;
  blockBUniqueTop: string | null;
  uniqueTopInterpretation: ReplicateAverageSplitHalfV2["uniqueTopInterpretation"] | null;
}

export interface ReplicateAverageBlockMacrostateV2 {
  sourceTaskId: number;
  block: "A" | "B";
  expectedAgentIds: string[];
  validAgentIds: string[];
  missingOrInvalidAgentIds: string[];
  rosterComplete: boolean;
  optionIds: string[];
  pooledProbabilitiesByOptionId: Record<string, number> | null;
  meanNormalizedEntropy: number | null;
  normalizedGeneralizedJsd: number | null;
}

export interface ReplicateAverageTaskMacroDifferenceV2 {
  sourceTaskId: number;
  status: "available" | "unavailable_incomplete_roster";
  pooledTotalVariation: number | null;
  meanNormalizedEntropyAbsDifference: number | null;
  normalizedGeneralizedJsdAbsDifference: number | null;
}

export interface CollectiveDynamicsReplicateAverageAnalysisV2 {
  analysisRef: typeof COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_ANALYSIS_V2;
  planHash: string;
  freezeHash: string;
  runHash: string;
  inferenceUnit: "task";
  pairedObservationUnit: "task_agent_frozen_view";
  truthAccess: "none";
  terminalCountsByLabel: Record<CollectiveDynamicsReplicateLabelV2, Record<string, number>>;
  unitRows: ReplicateAverageUnitRowV2[];
  unitSummary: {
    registeredUnitCount: 10;
    validUnitCount: number;
    invalidOrMissingUnitCount: number;
    meanSplitHalfTotalVariation: number | null;
    p90SplitHalfTotalVariation: number | null;
    uniqueTopAgreementCount: number;
    uniqueTopDisagreementCount: number;
    indeterminateTieCount: number;
  };
  blockMacrostates: ReplicateAverageBlockMacrostateV2[];
  taskMacroDifferences: ReplicateAverageTaskMacroDifferenceV2[];
  developmentGates: {
    providerExecutionValid: boolean;
    allReportsValid: boolean;
    meanUnitSplitHalfTvPass: boolean;
    p90UnitSplitHalfTvPass: boolean;
    eachTaskPooledTvPass: boolean;
    eachTaskMeanEntropyPass: boolean;
    eachTaskJsdPass: boolean;
    overall: "SENSOR_PASS" | "SENSOR_FAIL" | "CANARY_INVALID_PROVIDER";
  };
  claimCeiling: "development_instrument_qualification_only";
  contentHash: string;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantileNearestRank(values: readonly number[], probability: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(probability * sorted.length) - 1)];
}

function normalizedEntropy(
  optionIds: readonly string[],
  probabilities: Readonly<Record<string, number>>,
): number {
  return optionIds.reduce((sum, optionId) => {
    const probability = probabilities[optionId];
    return probability > 0 ? sum - probability * Math.log(probability) : sum;
  }, 0) / Math.log(optionIds.length);
}

function validReportByOptionId(
  terminal: CollectiveDynamicsSensorCanaryTerminalV1 | undefined,
): ParsedSensorReportV1 | null {
  return terminal?.status === "valid"
    ? { probabilities: terminal.parsed.probabilitiesByOptionId }
    : null;
}

function buildUnitRows(input: {
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
  terminalByCell: ReadonlyMap<string, CollectiveDynamicsSensorCanaryTerminalV1>;
}): ReplicateAverageUnitRowV2[] {
  return input.freeze.snapshots.map(snapshot => {
    const cells = input.freeze.cells.filter(cell => cell.snapshotHash === snapshot.contentHash);
    const terminalByLabel = Object.fromEntries(COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2.map(label => {
      const cell = cells.find(candidate => candidate.replicateLabel === label)!;
      return [label, input.terminalByCell.get(cell.cellId)!];
    })) as Record<CollectiveDynamicsReplicateLabelV2, CollectiveDynamicsSensorCanaryTerminalV1>;
    const terminalStatusByLabel = Object.fromEntries(COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2.map(
      label => [label, terminalByLabel[label].status],
    )) as Record<CollectiveDynamicsReplicateLabelV2, string>;
    const reports = Object.fromEntries(COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2.map(label => [
      label, validReportByOptionId(terminalByLabel[label]),
    ])) as Record<CollectiveDynamicsReplicateLabelV2, ParsedSensorReportV1 | null>;
    const base = {
      unitId: cells[0].unitId,
      sourceTaskId: snapshot.sourceTaskId,
      agentId: snapshot.agentId,
      terminalStatusByLabel,
    };
    if (COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2.some(label => reports[label] === null)) {
      return {
        ...base,
        pairStatus: "missing_or_invalid" as const,
        blockAProbabilitiesByOptionId: null,
        blockBProbabilitiesByOptionId: null,
        splitHalfTotalVariation: null,
        absoluteNormalizedEntropyDifference: null,
        blockAUniqueTop: null,
        blockBUniqueTop: null,
        uniqueTopInterpretation: null,
      };
    }
    const estimate = estimateReplicateAverageSplitHalfV2({
      canonicalOptions: snapshot.claim.options.map(option => option.optionId),
      reports: reports as Record<CollectiveDynamicsReplicateLabelV2, ParsedSensorReportV1>,
    });
    return {
      ...base,
      pairStatus: "valid" as const,
      blockAProbabilitiesByOptionId: estimate.blockAReport.probabilities,
      blockBProbabilitiesByOptionId: estimate.blockBReport.probabilities,
      splitHalfTotalVariation: estimate.difference.totalVariation,
      absoluteNormalizedEntropyDifference: estimate.difference.normalizedEntropyDifference,
      blockAUniqueTop: estimate.difference.leftUniqueTop,
      blockBUniqueTop: estimate.difference.rightUniqueTop,
      uniqueTopInterpretation: estimate.uniqueTopInterpretation,
    };
  });
}

function buildBlockMacrostate(input: {
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
  unitRows: readonly ReplicateAverageUnitRowV2[];
  sourceTaskId: number;
  block: "A" | "B";
}): ReplicateAverageBlockMacrostateV2 {
  const snapshots = input.freeze.snapshots.filter(snapshot => snapshot.sourceTaskId === input.sourceTaskId);
  const expectedAgentIds = snapshots[0].expectedAgentIds;
  const optionIds = snapshots[0].claim.options.map(option => option.optionId);
  const taskRows = input.unitRows.filter(row => row.sourceTaskId === input.sourceTaskId);
  const validRows = taskRows.filter(row => row.pairStatus === "valid");
  const validAgentIds = validRows.map(row => row.agentId);
  const missingOrInvalidAgentIds = expectedAgentIds.filter(agentId => !validAgentIds.includes(agentId));
  const base = {
    sourceTaskId: input.sourceTaskId,
    block: input.block,
    expectedAgentIds: [...expectedAgentIds],
    validAgentIds,
    missingOrInvalidAgentIds,
    rosterComplete: missingOrInvalidAgentIds.length === 0,
    optionIds,
  };
  if (missingOrInvalidAgentIds.length > 0) {
    return {
      ...base,
      pooledProbabilitiesByOptionId: null,
      meanNormalizedEntropy: null,
      normalizedGeneralizedJsd: null,
    };
  }
  const reports = validRows.map(row => input.block === "A"
    ? row.blockAProbabilitiesByOptionId! : row.blockBProbabilitiesByOptionId!);
  const pooled = Object.fromEntries(optionIds.map(optionId => [
    optionId, mean(reports.map(report => report[optionId])),
  ]));
  const withinEntropy = mean(reports.map(report => normalizedEntropy(optionIds, report)));
  const pooledEntropy = normalizedEntropy(optionIds, pooled);
  return {
    ...base,
    pooledProbabilitiesByOptionId: pooled,
    meanNormalizedEntropy: withinEntropy,
    normalizedGeneralizedJsd: Math.max(0, pooledEntropy - withinEntropy),
  };
}

function buildTaskMacroDifference(
  left: ReplicateAverageBlockMacrostateV2,
  right: ReplicateAverageBlockMacrostateV2,
): ReplicateAverageTaskMacroDifferenceV2 {
  if (!left.rosterComplete || !right.rosterComplete) {
    return {
      sourceTaskId: left.sourceTaskId,
      status: "unavailable_incomplete_roster",
      pooledTotalVariation: null,
      meanNormalizedEntropyAbsDifference: null,
      normalizedGeneralizedJsdAbsDifference: null,
    };
  }
  return {
    sourceTaskId: left.sourceTaskId,
    status: "available",
    pooledTotalVariation: 0.5 * left.optionIds.reduce((sum, optionId) => sum
      + Math.abs(left.pooledProbabilitiesByOptionId![optionId]
        - right.pooledProbabilitiesByOptionId![optionId]), 0),
    meanNormalizedEntropyAbsDifference: Math.abs(
      left.meanNormalizedEntropy! - right.meanNormalizedEntropy!,
    ),
    normalizedGeneralizedJsdAbsDifference: Math.abs(
      left.normalizedGeneralizedJsd! - right.normalizedGeneralizedJsd!,
    ),
  };
}

export function analyzeCollectiveDynamicsReplicateAverageCanaryV2(input: {
  plan: CollectiveDynamicsReplicateAverageCanaryPlanV2;
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
  run: CollectiveDynamicsReplicateAverageRunV2;
}): CollectiveDynamicsReplicateAverageAnalysisV2 {
  verifyCollectiveDynamicsReplicateAverageRunV2({ freeze: input.freeze, artifact: input.run });
  if (input.plan.contentHash !== input.freeze.planHash) {
    throw new Error("replicate_average_canary_v2_analysis_plan_mismatch");
  }
  const terminalByCell = new Map(input.run.terminals.map(terminal => [terminal.cellId, terminal]));
  const terminalCountsByLabel = Object.fromEntries(COLLECTIVE_DYNAMICS_REPLICATE_LABELS_V2.map(label => {
    const counts: Record<string, number> = {};
    input.freeze.cells.filter(cell => cell.replicateLabel === label).forEach(cell => {
      const status = terminalByCell.get(cell.cellId)!.status;
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return [label, counts];
  })) as Record<CollectiveDynamicsReplicateLabelV2, Record<string, number>>;
  const unitRows = buildUnitRows({ freeze: input.freeze, terminalByCell });
  const validRows = unitRows.filter(row => row.pairStatus === "valid");
  const splitHalfTv = validRows.map(row => row.splitHalfTotalVariation!);
  const taskIds = [...input.plan.sourceTaskIds];
  const blockMacrostates = taskIds.flatMap(sourceTaskId => (["A", "B"] as const).map(block =>
    buildBlockMacrostate({ freeze: input.freeze, unitRows, sourceTaskId, block })));
  const taskMacroDifferences = taskIds.map(sourceTaskId => buildTaskMacroDifference(
    blockMacrostates.find(state => state.sourceTaskId === sourceTaskId && state.block === "A")!,
    blockMacrostates.find(state => state.sourceTaskId === sourceTaskId && state.block === "B")!,
  ));
  const providerExecutionValid = input.run.terminals.every(terminal =>
    terminal.status === "valid" || terminal.status === "invalid_response");
  const allReportsValid = input.run.terminals.every(terminal => terminal.status === "valid");
  const meanUnitSplitHalfTvPass = allReportsValid
    && splitHalfTv.length === input.plan.registeredUnitCount
    && mean(splitHalfTv) <= input.plan.developmentTolerances.maximumMeanUnitSplitHalfTv;
  const p90UnitSplitHalfTvPass = allReportsValid
    && splitHalfTv.length === input.plan.registeredUnitCount
    && quantileNearestRank(splitHalfTv, 0.90)
      <= input.plan.developmentTolerances.maximumP90UnitSplitHalfTv;
  const everyMacroAvailable = taskMacroDifferences.every(difference => difference.status === "available");
  const eachTaskPooledTvPass = allReportsValid && everyMacroAvailable
    && taskMacroDifferences.every(difference => difference.pooledTotalVariation!
      <= input.plan.developmentTolerances.maximumEachTaskPooledTv);
  const eachTaskMeanEntropyPass = allReportsValid && everyMacroAvailable
    && taskMacroDifferences.every(difference => difference.meanNormalizedEntropyAbsDifference!
      <= input.plan.developmentTolerances.maximumEachTaskMeanEntropyAbsDifference);
  const eachTaskJsdPass = allReportsValid && everyMacroAvailable
    && taskMacroDifferences.every(difference => difference.normalizedGeneralizedJsdAbsDifference!
      <= input.plan.developmentTolerances.maximumEachTaskJsdAbsDifference);
  const allMeasurementGatesPass = meanUnitSplitHalfTvPass && p90UnitSplitHalfTvPass
    && eachTaskPooledTvPass && eachTaskMeanEntropyPass && eachTaskJsdPass;
  const body: Omit<CollectiveDynamicsReplicateAverageAnalysisV2, "contentHash"> = {
    analysisRef: COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_ANALYSIS_V2,
    planHash: input.plan.contentHash,
    freezeHash: input.freeze.contentHash,
    runHash: input.run.contentHash,
    inferenceUnit: "task",
    pairedObservationUnit: "task_agent_frozen_view",
    truthAccess: "none",
    terminalCountsByLabel,
    unitRows,
    unitSummary: {
      registeredUnitCount: 10,
      validUnitCount: validRows.length,
      invalidOrMissingUnitCount: unitRows.length - validRows.length,
      meanSplitHalfTotalVariation: splitHalfTv.length ? mean(splitHalfTv) : null,
      p90SplitHalfTotalVariation: splitHalfTv.length
        ? quantileNearestRank(splitHalfTv, 0.90) : null,
      uniqueTopAgreementCount: validRows.filter(row =>
        row.uniqueTopInterpretation === "agreement").length,
      uniqueTopDisagreementCount: validRows.filter(row =>
        row.uniqueTopInterpretation === "disagreement").length,
      indeterminateTieCount: validRows.filter(row =>
        row.uniqueTopInterpretation === "indeterminate_tie").length,
    },
    blockMacrostates,
    taskMacroDifferences,
    developmentGates: {
      providerExecutionValid,
      allReportsValid,
      meanUnitSplitHalfTvPass,
      p90UnitSplitHalfTvPass,
      eachTaskPooledTvPass,
      eachTaskMeanEntropyPass,
      eachTaskJsdPass,
      overall: !providerExecutionValid
        ? "CANARY_INVALID_PROVIDER"
        : allReportsValid && allMeasurementGatesPass ? "SENSOR_PASS" : "SENSOR_FAIL",
    },
    claimCeiling: "development_instrument_qualification_only",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): number {
  const outputDirectory = resolve(
    process.env.REPLICATE_AVERAGE_CANARY_OUTPUT_DIR
      ?? COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_OUTPUT_V2,
  );
  const frozen = loadFrozenCollectiveDynamicsReplicateAverageCanaryV2(outputDirectory);
  const runPath = join(outputDirectory, "run.json");
  if (!existsSync(runPath)) throw new Error("replicate_average_canary_v2_run_missing");
  const run = JSON.parse(readFileSync(runPath, "utf8")) as CollectiveDynamicsReplicateAverageRunV2;
  const analysis = analyzeCollectiveDynamicsReplicateAverageCanaryV2({
    plan: frozen.plan,
    freeze: frozen.freeze,
    run,
  });
  const target = join(outputDirectory, "analysis.json");
  const text = `${JSON.stringify(analysis, null, 2)}\n`;
  if (existsSync(target)) {
    if (readFileSync(target, "utf8") !== text) {
      throw new Error("replicate_average_canary_v2_analysis_no_overwrite_conflict");
    }
  } else writeFileSync(target, text, { flag: "wx" });
  console.log(JSON.stringify({
    analysisHash: analysis.contentHash,
    overall: analysis.developmentGates.overall,
    inferenceUnit: analysis.inferenceUnit,
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
