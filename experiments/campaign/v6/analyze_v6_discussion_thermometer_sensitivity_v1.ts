/** Zero-provider sensitivity audit for primary-A, B-only, and legacy A/B-mean views. */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  projectDiscussionThermometerTransitionV1,
  type DiscussionThermometerStateV1,
} from "../../../src/lib/epistemic";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  loadVerifiedDataset,
  type ThermometerReprojectionDatasetV1,
} from "./analyze_v6_discussion_thermometer_reprojection_v1";
import { projectTrajectoryThermometerStateV1 } from
  "./collectiveDynamicsTrajectoryThermometerAdapterV1";

export const DISCUSSION_THERMOMETER_SENSITIVITY_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.discussion-thermometer-sensitivity",
  version: "1.0.0",
});

type Checkpoint = 0 | 1 | 2 | 3;
type Variant = "primary_A" | "primary_B";

interface MacroReadoutV1 {
  coverage: number;
  pooledProbabilitiesByOptionId: Record<string, number> | null;
  meanNormalizedReportEntropy: number | null;
  normalizedGeneralizedJsd: number | null;
  pooledConcentration: number | null;
  meanPairwiseTotalVariation: number | null;
  maxPairwiseTotalVariation: number | null;
}

interface SensitivityRowV1 {
  sourceTaskId: number;
  checkpointRound: Checkpoint;
  primaryA: MacroReadoutV1;
  primaryB: MacroReadoutV1;
  legacyABMean: MacroReadoutV1;
  pooledTvAtoB: number | null;
  primaryARepeatMeanTV: number | null;
  primaryARepeatMaxTV: number | null;
}

export interface ThermometerSensitivityV1 {
  analysisRef: typeof DISCUSSION_THERMOMETER_SENSITIVITY_V1;
  inferenceStatus: "descriptive_instrument_sensitivity_only";
  truthAccess: "none";
  datasets: Array<{
    corpusId: string;
    planHash: string;
    freezeHash: string;
    runHash: string;
    legacyAnalysisHash: string;
    rows: SensitivityRowV1[];
    transitionSummary: {
      variant: Variant;
      transitionCount: number;
      completeMatchedRosterCount: number;
      meanAgentTV: number | null;
      meanPooledTV: number | null;
    }[];
    qualityStratum: {
      duplicateTVQuantile: "empirical_p95_in_corpus";
      threshold: number;
      validDuplicateCount: number;
      highDuplicateCheckpointCount: number;
      highDuplicateAgentCount: number;
      handling: "retain_primary_state_report_quality_stratum";
    };
  }>;
  summary: {
    checkpointCount: number;
    transitionCount: number;
    meanPooledTVPrimaryAtoB: number | null;
    maxPooledTVPrimaryAtoB: number | null;
    primaryCoverageDifferenceCheckpointCount: number;
    primaryAStateUsedWhenRepeatBMissingCount: number;
    primaryBStateUsedWhenRepeatAMissingCount: number;
  };
  contentHash: string;
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function tv(left: Readonly<Record<string, number>>, right: Readonly<Record<string, number>>, optionIds: readonly string[]): number {
  return optionIds.reduce((sum, optionId) => sum + Math.abs(left[optionId] - right[optionId]), 0) / 2;
}

function macro(state: DiscussionThermometerStateV1): MacroReadoutV1 {
  return {
    coverage: state.roster.coverage,
    pooledProbabilitiesByOptionId: state.macrostate.pooledProbabilitiesByOptionId,
    meanNormalizedReportEntropy: state.macrostate.meanNormalizedReportEntropy,
    normalizedGeneralizedJsd: state.macrostate.normalizedGeneralizedJsd,
    pooledConcentration: state.macrostate.pooledConcentration,
    meanPairwiseTotalVariation: state.macrostate.meanPairwiseTotalVariation,
    maxPairwiseTotalVariation: state.macrostate.maxPairwiseTotalVariation,
  };
}

function variantState(dataset: ThermometerReprojectionDatasetV1, task: ThermometerReprojectionDatasetV1["tasks"][number], checkpoint: Checkpoint, variant: Variant): DiscussionThermometerStateV1 {
  const units = dataset.unitRows.filter(row => row.sourceTaskId === task.sourceTaskId)
    .map(row => variant === "primary_A" ? row : ({
      ...row,
      repeatA: row.repeatB,
      repeatB: row.repeatA,
      repeatStatuses: { A: row.repeatStatuses.B, B: row.repeatStatuses.A },
    }));
  return projectTrajectoryThermometerStateV1({
    sourceTaskId: task.sourceTaskId,
    checkpointRound: checkpoint,
    optionIds: task.optionIds,
    expectedAgentIds: task.expectedAgentIds,
    units,
    snapshotHash: task.checkpointSnapshotHashes[checkpoint],
  });
}

function percentile95(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

export function buildThermometerSensitivityV1(datasets: readonly ThermometerReprojectionDatasetV1[]): ThermometerSensitivityV1 {
  const projected = datasets.map(dataset => {
    const rows: SensitivityRowV1[] = [];
    const statesA = new Map<string, DiscussionThermometerStateV1>();
    const statesB = new Map<string, DiscussionThermometerStateV1>();
    const duplicateValues: number[] = [];
    dataset.tasks.forEach(task => ([0, 1, 2, 3] as const).forEach(checkpoint => {
      const a = variantState(dataset, task, checkpoint, "primary_A");
      const b = variantState(dataset, task, checkpoint, "primary_B");
      const legacy = dataset.legacyCheckpointRows.find(item =>
        item.sourceTaskId === task.sourceTaskId && item.checkpointRound === checkpoint)!;
      if (!legacy) throw new Error("thermometer_sensitivity_legacy_row_missing");
      const legacyReported = legacy.reportedState;
      const legacyMacro: MacroReadoutV1 = {
        coverage: legacyReported.rosterComplete ? 1 : legacyReported.comparableAgentIds.length / task.expectedAgentIds.length,
        pooledProbabilitiesByOptionId: legacyReported.pooledProbabilities
          ? Object.fromEntries(legacyReported.pooledProbabilities.optionIds.map((optionId, index) =>
            [optionId, legacyReported.pooledProbabilities!.values[index]])) : null,
        meanNormalizedReportEntropy: legacyReported.meanNormalizedReportEntropy,
        normalizedGeneralizedJsd: legacyReported.normalizedGeneralizedJsd,
        pooledConcentration: legacyReported.pooledConcentration,
        meanPairwiseTotalVariation: null,
        maxPairwiseTotalVariation: legacyReported.maxPairwiseTotalVariation,
      };
      if (!a.macrostate.pooledProbabilitiesByOptionId || !b.macrostate.pooledProbabilitiesByOptionId
        || !legacyMacro.pooledProbabilitiesByOptionId) {
        throw new Error("thermometer_sensitivity_pooled_state_missing");
      }
      const repeatValues = Object.values(a.measurement.replicateTotalVariationByAgentId);
      repeatValues.forEach(value => duplicateValues.push(value));
      const key = `${task.sourceTaskId}:X${checkpoint}`;
      statesA.set(key, a);
      statesB.set(key, b);
      rows.push({
        sourceTaskId: task.sourceTaskId,
        checkpointRound: checkpoint,
        primaryA: macro(a),
        primaryB: macro(b),
        legacyABMean: legacyMacro,
        pooledTvAtoB: tv(a.macrostate.pooledProbabilitiesByOptionId,
          b.macrostate.pooledProbabilitiesByOptionId, task.optionIds),
        primaryARepeatMeanTV: a.measurement.meanReplicateTotalVariation,
        primaryARepeatMaxTV: a.measurement.maxReplicateTotalVariation,
      });
    }));
    const transitions = ([0, 1, 2] as const).flatMap(checkpoint => dataset.tasks.map(task => {
      const key = (round: number) => `${task.sourceTaskId}:X${round}`;
      return { a: projectDiscussionThermometerTransitionV1({ from: statesA.get(key(checkpoint))!, to: statesA.get(key(checkpoint + 1))! }),
        b: projectDiscussionThermometerTransitionV1({ from: statesB.get(key(checkpoint))!, to: statesB.get(key(checkpoint + 1))! }) };
    }));
    const qualityThreshold = percentile95(duplicateValues);
    const highRows = rows.filter(row => (row.primaryARepeatMaxTV ?? -1) >= qualityThreshold);
    return {
      corpusId: dataset.corpusId,
      planHash: dataset.planHash,
      freezeHash: dataset.freezeHash,
      runHash: dataset.runHash,
      legacyAnalysisHash: dataset.legacyAnalysisHash,
      rows,
      transitionSummary: (["primary_A", "primary_B"] as const).map(variant => {
        const values = transitions.map(item => item[variant === "primary_A" ? "a" : "b"]);
        return {
          variant,
          transitionCount: values.length,
          completeMatchedRosterCount: values.filter(item => item.completeMatchedRoster).length,
          meanAgentTV: mean(values.flatMap(item => item.meanAgentTotalVariation === null ? [] : [item.meanAgentTotalVariation])),
          meanPooledTV: mean(values.flatMap(item => item.pooledTotalVariation === null ? [] : [item.pooledTotalVariation])),
        };
      }),
      qualityStratum: {
        duplicateTVQuantile: "empirical_p95_in_corpus",
        threshold: qualityThreshold,
        validDuplicateCount: duplicateValues.length,
        highDuplicateCheckpointCount: highRows.length,
        highDuplicateAgentCount: duplicateValues.filter(value => value >= qualityThreshold).length,
        handling: "retain_primary_state_report_quality_stratum",
      },
    };
  });
  const rows = projected.flatMap(dataset => dataset.rows);
  const pooled = rows.flatMap(row => row.pooledTvAtoB === null ? [] : [row.pooledTvAtoB]);
  const body: Omit<ThermometerSensitivityV1, "contentHash"> = {
    analysisRef: DISCUSSION_THERMOMETER_SENSITIVITY_V1,
    inferenceStatus: "descriptive_instrument_sensitivity_only",
    truthAccess: "none",
    datasets: projected,
    summary: {
      checkpointCount: rows.length,
      transitionCount: projected.reduce((sum, dataset) =>
        sum + dataset.transitionSummary[0].transitionCount, 0),
      meanPooledTVPrimaryAtoB: mean(pooled),
      maxPooledTVPrimaryAtoB: pooled.length ? Math.max(...pooled) : null,
      primaryCoverageDifferenceCheckpointCount: rows.filter(row => row.primaryA.coverage !== row.primaryB.coverage).length,
      primaryAStateUsedWhenRepeatBMissingCount: rows.filter(row => row.primaryA.coverage > 0
        && row.primaryB.coverage < row.primaryA.coverage).length,
      primaryBStateUsedWhenRepeatAMissingCount: rows.filter(row => row.primaryB.coverage > 0
        && row.primaryA.coverage < row.primaryB.coverage).length,
    },
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function writeExactOrVerify(path: string, value: unknown): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== text) throw new Error("thermometer_sensitivity_no_overwrite_conflict");
    return;
  }
  writeFileSync(path, text, { flag: "wx" });
}

function main(): number {
  const workspace = resolve(process.cwd());
  const datasets = [
    loadVerifiedDataset("M2_FIRST_FIVE", resolve(workspace, "results/v6_collective_dynamics_trajectory_sensor_v1_glm46v_seed1"), "split_recovery"),
    loadVerifiedDataset("D1_REMAINING_FIVE", resolve(workspace, "results/v6_collective_dynamics_post_m2_bridge_v1_glm46v_seed1_attempt2"), "single"),
  ];
  const result = buildThermometerSensitivityV1(datasets);
  const outputDirectory = resolve(workspace, "results/v6_discussion_thermometer_m2_d1_reprojection_v1");
  mkdirSync(outputDirectory, { recursive: true });
  writeExactOrVerify(join(outputDirectory, "sensitivity.json"), result);
  console.log(JSON.stringify({ status: "sensitivity_analyzed", providerCalls: 0, output: join(outputDirectory, "sensitivity.json"), summary: result.summary, contentHash: result.contentHash }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
