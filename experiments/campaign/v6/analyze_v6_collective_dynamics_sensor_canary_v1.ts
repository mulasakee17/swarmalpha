/** Truth-blind H1 analysis for the shadow-sensor prompt-sensitivity canary. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  COLLECTIVE_DYNAMICS_SENSOR_VARIANTS_V1,
  compareCollectiveDynamicsSensorReportsV1,
  verifyCollectiveDynamicsSensorCanaryRunV1,
  type CollectiveDynamicsSensorCanaryFreezeV1,
  type CollectiveDynamicsSensorCanaryRunArtifactV1,
  type CollectiveDynamicsSensorCanaryTerminalV1,
  type CollectiveDynamicsSensorVariantV1,
  type ParsedSensorReportV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  COLLECTIVE_DYNAMICS_SENSOR_CANARY_OUTPUT_V1,
  loadFrozenCollectiveDynamicsSensorCanaryV1,
} from "./run_v6_collective_dynamics_sensor_canary_v1";

export const COLLECTIVE_DYNAMICS_SENSOR_CANARY_ANALYSIS_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-prompt-sensitivity.analysis",
  version: "1.0.0",
});

type ComparisonVariantV1 = Exclude<CollectiveDynamicsSensorVariantV1, "BASELINE_A">;

export interface SensorCanaryPairedRowV1 {
  unitId: string;
  sourceTaskId: number;
  agentId: string;
  comparisonVariant: ComparisonVariantV1;
  baselineStatus: string;
  comparisonStatus: string;
  pairStatus: "valid" | "missing_or_invalid";
  totalVariation: number | null;
  absoluteNormalizedEntropyDifference: number | null;
  baselineUniqueTop: string | null;
  comparisonUniqueTop: string | null;
  uniqueTopAgreement: boolean | null;
}

export interface SensorCanaryPairSummaryV1 {
  comparisonVariant: ComparisonVariantV1;
  registeredPairCount: 12;
  validPairCount: number;
  invalidOrMissingPairCount: number;
  meanTotalVariation: number | null;
  medianTotalVariation: number | null;
  maximumTotalVariation: number | null;
  taskClusterBootstrap95MeanTv: { lower: number; upper: number; supportSize: number } | null;
  meanAbsoluteNormalizedEntropyDifference: number | null;
  uniqueTopAgreementCount: number;
  uniqueTopEligibleCount: number;
  pairCountWithAnyTie: number;
}

export interface SensorCanaryMacrostateV1 {
  sourceTaskId: number;
  variant: CollectiveDynamicsSensorVariantV1;
  expectedAgentIds: string[];
  validAgentIds: string[];
  missingOrInvalidAgentIds: string[];
  rosterComplete: boolean;
  optionIds: string[];
  pooledProbabilitiesByOptionId: Record<string, number> | null;
  meanNormalizedEntropy: number | null;
  normalizedGeneralizedJsd: number | null;
  pooledNormalizedEntropy: number | null;
  pooledConcentration: number | null;
  decompositionResidual: number | null;
}

export interface SensorCanaryMacroDifferenceV1 {
  sourceTaskId: number;
  comparisonVariant: ComparisonVariantV1;
  status: "available" | "unavailable_incomplete_roster";
  pooledTotalVariation: number | null;
  meanNormalizedEntropyDifference: number | null;
  normalizedGeneralizedJsdDifference: number | null;
  pooledConcentrationDifference: number | null;
}

export interface CollectiveDynamicsSensorCanaryAnalysisV1 {
  analysisRef: typeof COLLECTIVE_DYNAMICS_SENSOR_CANARY_ANALYSIS_V1;
  freezeHash: string;
  runHash: string;
  inferenceUnit: "task";
  pairedObservationUnit: "task_agent_frozen_view";
  truthAccess: "none";
  terminalCountsByVariant: Record<CollectiveDynamicsSensorVariantV1, Record<string, number>>;
  pairedRows: SensorCanaryPairedRowV1[];
  pairSummaries: Record<ComparisonVariantV1, SensorCanaryPairSummaryV1>;
  macrostates: SensorCanaryMacrostateV1[];
  macroDifferences: SensorCanaryMacroDifferenceV1[];
  developmentGates: {
    providerExecutionValid: boolean;
    allReportsValid: boolean;
    exactRepeatPass: boolean;
    optionOrderPass: boolean;
    paraphrasePass: boolean;
    overall: "SENSOR_PASS" | "SENSOR_FAIL" | "CANARY_INVALID_PROVIDER";
  };
  claimCeiling: "development_instrument_qualification_only";
  contentHash: string;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quantileNearestRank(values: readonly number[], probability: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(probability * sorted.length) - 1);
  return sorted[index];
}

function normalizedEntropy(optionIds: readonly string[], probabilities: Readonly<Record<string, number>>): number {
  const raw = optionIds.reduce((sum, optionId) => {
    const probability = probabilities[optionId];
    return probability > 0 ? sum - probability * Math.log(probability) : sum;
  }, 0);
  return raw / Math.log(optionIds.length);
}

function validTerminalReport(
  terminal: CollectiveDynamicsSensorCanaryTerminalV1 | undefined,
): ParsedSensorReportV1 | null {
  return terminal?.status === "valid"
    ? { probabilities: terminal.parsed.probabilitiesByOptionId }
    : null;
}

function exhaustiveTaskClusterBootstrap95(rows: readonly SensorCanaryPairedRowV1[]): {
  lower: number;
  upper: number;
  supportSize: number;
} | null {
  const tasks = [...new Set(rows.map(row => row.sourceTaskId))].sort((left, right) => left - right);
  if (tasks.length === 0 || rows.some(row => row.pairStatus !== "valid")) return null;
  const rowsByTask = new Map(tasks.map(taskId => [taskId, rows.filter(row => row.sourceTaskId === taskId)]));
  const sampleMeans: number[] = [];
  const selections: number[][] = [[]];
  for (let position = 0; position < tasks.length; position += 1) {
    const prior = selections.splice(0, selections.length);
    for (const selection of prior) for (const taskId of tasks) selections.push([...selection, taskId]);
  }
  for (const selection of selections) {
    const sampledRows = selection.flatMap(taskId => rowsByTask.get(taskId)!);
    sampleMeans.push(mean(sampledRows.map(row => row.totalVariation!)));
  }
  return {
    lower: quantileNearestRank(sampleMeans, 0.025),
    upper: quantileNearestRank(sampleMeans, 0.975),
    supportSize: sampleMeans.length,
  };
}

function summarizePairs(
  comparisonVariant: ComparisonVariantV1,
  rows: readonly SensorCanaryPairedRowV1[],
): SensorCanaryPairSummaryV1 {
  const valid = rows.filter(row => row.pairStatus === "valid");
  const tv = valid.map(row => row.totalVariation!);
  const entropy = valid.map(row => row.absoluteNormalizedEntropyDifference!);
  return {
    comparisonVariant,
    registeredPairCount: 12,
    validPairCount: valid.length,
    invalidOrMissingPairCount: rows.length - valid.length,
    meanTotalVariation: tv.length ? mean(tv) : null,
    medianTotalVariation: tv.length ? median(tv) : null,
    maximumTotalVariation: tv.length ? Math.max(...tv) : null,
    taskClusterBootstrap95MeanTv: exhaustiveTaskClusterBootstrap95(rows),
    meanAbsoluteNormalizedEntropyDifference: entropy.length ? mean(entropy) : null,
    uniqueTopAgreementCount: valid.filter(row => row.uniqueTopAgreement).length,
    uniqueTopEligibleCount: valid.filter(row => row.baselineUniqueTop !== null
      && row.comparisonUniqueTop !== null).length,
    pairCountWithAnyTie: valid.filter(row => row.baselineUniqueTop === null
      || row.comparisonUniqueTop === null).length,
  };
}

function buildMacrostate(input: {
  freeze: CollectiveDynamicsSensorCanaryFreezeV1;
  terminalsByCell: ReadonlyMap<string, CollectiveDynamicsSensorCanaryTerminalV1>;
  sourceTaskId: number;
  variant: CollectiveDynamicsSensorVariantV1;
}): SensorCanaryMacrostateV1 {
  const snapshots = input.freeze.snapshots.filter(snapshot => snapshot.sourceTaskId === input.sourceTaskId);
  const expectedAgentIds = snapshots[0].expectedAgentIds;
  const optionIds = snapshots[0].claim.options.map(option => option.optionId);
  const reports: Array<{ agentId: string; probabilities: Record<string, number> }> = [];
  for (const snapshot of snapshots) {
    const cell = input.freeze.cells.find(candidate => candidate.snapshotHash === snapshot.contentHash
      && candidate.variant === input.variant)!;
    const report = validTerminalReport(input.terminalsByCell.get(cell.cellId));
    if (report) reports.push({ agentId: snapshot.agentId, probabilities: report.probabilities });
  }
  const validAgentIds = reports.map(report => report.agentId);
  const missingOrInvalidAgentIds = expectedAgentIds.filter(agentId => !validAgentIds.includes(agentId));
  const base = {
    sourceTaskId: input.sourceTaskId,
    variant: input.variant,
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
      pooledNormalizedEntropy: null,
      pooledConcentration: null,
      decompositionResidual: null,
    };
  }
  const pooled = Object.fromEntries(optionIds.map(optionId => [
    optionId,
    mean(reports.map(report => report.probabilities[optionId])),
  ]));
  const within = mean(reports.map(report => normalizedEntropy(optionIds, report.probabilities)));
  const pooledEntropy = normalizedEntropy(optionIds, pooled);
  const jsd = Math.max(0, pooledEntropy - within);
  return {
    ...base,
    pooledProbabilitiesByOptionId: pooled,
    meanNormalizedEntropy: within,
    normalizedGeneralizedJsd: jsd,
    pooledNormalizedEntropy: pooledEntropy,
    pooledConcentration: Math.max(...Object.values(pooled)),
    decompositionResidual: pooledEntropy - within - jsd,
  };
}

function macroDifference(
  baseline: SensorCanaryMacrostateV1,
  comparison: SensorCanaryMacrostateV1,
  comparisonVariant: ComparisonVariantV1,
): SensorCanaryMacroDifferenceV1 {
  if (!baseline.rosterComplete || !comparison.rosterComplete) {
    return {
      sourceTaskId: baseline.sourceTaskId,
      comparisonVariant,
      status: "unavailable_incomplete_roster",
      pooledTotalVariation: null,
      meanNormalizedEntropyDifference: null,
      normalizedGeneralizedJsdDifference: null,
      pooledConcentrationDifference: null,
    };
  }
  return {
    sourceTaskId: baseline.sourceTaskId,
    comparisonVariant,
    status: "available",
    pooledTotalVariation: 0.5 * baseline.optionIds.reduce((sum, optionId) => sum
      + Math.abs(baseline.pooledProbabilitiesByOptionId![optionId]
        - comparison.pooledProbabilitiesByOptionId![optionId]), 0),
    meanNormalizedEntropyDifference: comparison.meanNormalizedEntropy! - baseline.meanNormalizedEntropy!,
    normalizedGeneralizedJsdDifference: comparison.normalizedGeneralizedJsd!
      - baseline.normalizedGeneralizedJsd!,
    pooledConcentrationDifference: comparison.pooledConcentration! - baseline.pooledConcentration!,
  };
}

export function analyzeCollectiveDynamicsSensorCanaryV1(input: {
  freeze: CollectiveDynamicsSensorCanaryFreezeV1;
  run: CollectiveDynamicsSensorCanaryRunArtifactV1;
}): CollectiveDynamicsSensorCanaryAnalysisV1 {
  verifyCollectiveDynamicsSensorCanaryRunV1({ freeze: input.freeze, artifact: input.run });
  const terminalByCell = new Map(input.run.terminals.map(terminal => [terminal.cellId, terminal]));
  const terminalCountsByVariant = Object.fromEntries(COLLECTIVE_DYNAMICS_SENSOR_VARIANTS_V1.map(variant => {
    const counts: Record<string, number> = {};
    input.freeze.cells.filter(cell => cell.variant === variant).forEach(cell => {
      const status = terminalByCell.get(cell.cellId)!.status;
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return [variant, counts];
  })) as Record<CollectiveDynamicsSensorVariantV1, Record<string, number>>;
  const comparisonVariants: ComparisonVariantV1[] = [
    "BASELINE_B", "OPTION_ORDER_REVERSED", "PARAPHRASED_ELICITATION",
  ];
  const pairedRows: SensorCanaryPairedRowV1[] = [];
  for (const snapshot of input.freeze.snapshots) {
    const cells = input.freeze.cells.filter(cell => cell.snapshotHash === snapshot.contentHash);
    const baselineTerminal = terminalByCell.get(cells.find(cell => cell.variant === "BASELINE_A")!.cellId)!;
    const baselineReport = validTerminalReport(baselineTerminal);
    for (const comparisonVariant of comparisonVariants) {
      const comparisonTerminal = terminalByCell.get(cells.find(cell =>
        cell.variant === comparisonVariant)!.cellId)!;
      const comparisonReport = validTerminalReport(comparisonTerminal);
      if (!baselineReport || !comparisonReport) {
        pairedRows.push({
          unitId: cells[0].unitId,
          sourceTaskId: snapshot.sourceTaskId,
          agentId: snapshot.agentId,
          comparisonVariant,
          baselineStatus: baselineTerminal.status,
          comparisonStatus: comparisonTerminal.status,
          pairStatus: "missing_or_invalid",
          totalVariation: null,
          absoluteNormalizedEntropyDifference: null,
          baselineUniqueTop: null,
          comparisonUniqueTop: null,
          uniqueTopAgreement: null,
        });
        continue;
      }
      const optionIds = snapshot.claim.options.map(option => option.optionId);
      const difference = compareCollectiveDynamicsSensorReportsV1({
        canonicalOptions: optionIds,
        left: baselineReport,
        right: comparisonReport,
      });
      pairedRows.push({
        unitId: cells[0].unitId,
        sourceTaskId: snapshot.sourceTaskId,
        agentId: snapshot.agentId,
        comparisonVariant,
        baselineStatus: baselineTerminal.status,
        comparisonStatus: comparisonTerminal.status,
        pairStatus: "valid",
        totalVariation: difference.totalVariation,
        absoluteNormalizedEntropyDifference: difference.normalizedEntropyDifference,
        baselineUniqueTop: difference.leftUniqueTop,
        comparisonUniqueTop: difference.rightUniqueTop,
        uniqueTopAgreement: difference.uniqueTopAgreement,
      });
    }
  }
  const pairSummaries = Object.fromEntries(comparisonVariants.map(variant => [
    variant,
    summarizePairs(variant, pairedRows.filter(row => row.comparisonVariant === variant)),
  ])) as Record<ComparisonVariantV1, SensorCanaryPairSummaryV1>;
  const taskIds = [...new Set(input.freeze.snapshots.map(snapshot => snapshot.sourceTaskId))]
    .sort((left, right) => left - right);
  const macrostates = taskIds.flatMap(sourceTaskId => COLLECTIVE_DYNAMICS_SENSOR_VARIANTS_V1.map(variant =>
    buildMacrostate({ freeze: input.freeze, terminalsByCell: terminalByCell, sourceTaskId, variant })));
  const macroDifferences = taskIds.flatMap(sourceTaskId => {
    const baseline = macrostates.find(state => state.sourceTaskId === sourceTaskId
      && state.variant === "BASELINE_A")!;
    return comparisonVariants.map(variant => macroDifference(
      baseline,
      macrostates.find(state => state.sourceTaskId === sourceTaskId && state.variant === variant)!,
      variant,
    ));
  });
  const allReportsValid = COLLECTIVE_DYNAMICS_SENSOR_VARIANTS_V1.every(variant =>
    terminalCountsByVariant[variant].valid === 12
      && Object.entries(terminalCountsByVariant[variant]).every(([status, count]) => status === "valid" || count === 0));
  const providerExecutionValid = input.run.terminals.every(terminal =>
    terminal.status === "valid" || terminal.status === "invalid_response");
  const repeat = pairSummaries.BASELINE_B;
  const order = pairSummaries.OPTION_ORDER_REVERSED;
  const paraphrase = pairSummaries.PARAPHRASED_ELICITATION;
  const exactRepeatPass = allReportsValid && repeat.validPairCount === 12
    && repeat.uniqueTopAgreementCount === 12 && repeat.meanTotalVariation! <= 0.05;
  const optionOrderPass = allReportsValid && order.validPairCount === 12
    && order.uniqueTopAgreementCount >= 11 && order.meanTotalVariation! <= 0.10;
  const paraphrasePass = allReportsValid && paraphrase.validPairCount === 12
    && paraphrase.uniqueTopAgreementCount >= 11 && paraphrase.meanTotalVariation! <= 0.10;
  const body: Omit<CollectiveDynamicsSensorCanaryAnalysisV1, "contentHash"> = {
    analysisRef: COLLECTIVE_DYNAMICS_SENSOR_CANARY_ANALYSIS_V1,
    freezeHash: input.freeze.contentHash,
    runHash: input.run.contentHash,
    inferenceUnit: "task",
    pairedObservationUnit: "task_agent_frozen_view",
    truthAccess: "none",
    terminalCountsByVariant,
    pairedRows,
    pairSummaries,
    macrostates,
    macroDifferences,
    developmentGates: {
      providerExecutionValid,
      allReportsValid,
      exactRepeatPass,
      optionOrderPass,
      paraphrasePass,
      overall: !providerExecutionValid
        ? "CANARY_INVALID_PROVIDER"
        : exactRepeatPass && optionOrderPass && paraphrasePass ? "SENSOR_PASS" : "SENSOR_FAIL",
    },
    claimCeiling: "development_instrument_qualification_only",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): number {
  const outputDirectory = resolve(
    process.env.SENSOR_CANARY_OUTPUT_DIR ?? COLLECTIVE_DYNAMICS_SENSOR_CANARY_OUTPUT_V1,
  );
  const frozen = loadFrozenCollectiveDynamicsSensorCanaryV1(outputDirectory);
  const runPath = join(outputDirectory, "run.json");
  if (!existsSync(runPath)) throw new Error("sensor_canary_run_missing");
  const run = JSON.parse(readFileSync(runPath, "utf8")) as CollectiveDynamicsSensorCanaryRunArtifactV1;
  const analysis = analyzeCollectiveDynamicsSensorCanaryV1({ freeze: frozen.freeze, run });
  const target = join(outputDirectory, "analysis.json");
  const text = `${JSON.stringify(analysis, null, 2)}\n`;
  if (existsSync(target)) {
    if (readFileSync(target, "utf8") !== text) throw new Error("sensor_canary_analysis_no_overwrite_conflict");
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
