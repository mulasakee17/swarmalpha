/** Truth-blind, task-cluster analysis for the one-step M1 peer bundle. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  verifyCollectiveDynamicsPeerBundleRunV1,
  type CollectiveDynamicsPeerBundleRunV1,
} from "./collectiveDynamicsPeerBundleExecutionV1";
import {
  loadFrozenCollectiveDynamicsPeerBundleV1,
  COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_OUTPUT_V1,
} from "./run_v6_collective_dynamics_peer_bundle_freeze_v1";
import type {
  CollectiveDynamicsPeerBundleFreezeV1,
  CollectiveDynamicsPeerBundlePlanV1,
} from "./collectiveDynamicsPeerBundleFreezeV1";

export const COLLECTIVE_DYNAMICS_PEER_BUNDLE_ANALYSIS_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-peer-bundle-canary.analysis",
  version: "1.0.0",
});

interface ProbabilityVectorV1 {
  optionIds: string[];
  values: number[];
}

export interface PeerBundleUnitRowV1 {
  unitId: string;
  sourceTaskId: number;
  agentId: string;
  conditionDuplicateTv: {
    noPeer: number;
    peer: number;
  };
  peerResponseTv: number;
  peerResponseExceedsBothDuplicateMeans: boolean;
  noPeerMean: ProbabilityVectorV1;
  peerMean: ProbabilityVectorV1;
}

export interface PeerBundleTaskRowV1 {
  sourceTaskId: number;
  agentCount: number;
  meanPeerResponseTv: number;
  meanNoPeerDuplicateTv: number;
  meanPeerDuplicateTv: number;
  peerResponseExceedsBothDuplicateMeans: boolean;
  noPeerPooledEntropy: number;
  peerPooledEntropy: number;
  deltaPooledEntropy: number;
  noPeerMeanAgentEntropy: number;
  peerMeanAgentEntropy: number;
  deltaMeanAgentEntropy: number;
  noPeerGeneralizedJsd: number;
  peerGeneralizedJsd: number;
  deltaGeneralizedJsd: number;
}

export interface CollectiveDynamicsPeerBundleAnalysisV1 {
  analysisRef: typeof COLLECTIVE_DYNAMICS_PEER_BUNDLE_ANALYSIS_V1;
  planHash: string;
  freezeHash: string;
  runHash: string;
  inferenceUnit: "task";
  pairedObservationUnit: "task_agent_frozen_view";
  truthAccess: "none";
  terminalCounts: Record<string, number>;
  unitRows: PeerBundleUnitRowV1[];
  taskRows: PeerBundleTaskRowV1[];
  summary: {
    registeredCellCount: 152;
    validCellCount: number;
    invalidOrMissingCellCount: number;
    registeredUnitCount: 38;
    validUnitCount: number;
    meanPeerResponseTv: number | null;
    p90PeerResponseTv: number | null;
    meanNoPeerDuplicateTv: number | null;
    meanPeerDuplicateTv: number | null;
    taskCount: number;
    tasksResponseExceedsBothDuplicateMeans: number;
  };
  claimCeiling: "one_step_peer_bundle_response_only";
  contentHash: string;
}

function mean(values: readonly number[]): number {
  if (!values.length) throw new Error("peer_bundle_analysis_empty_values");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantileNearestRank(values: readonly number[], probability: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(probability * sorted.length) - 1)];
}

function tv(left: readonly number[], right: readonly number[]): number {
  return 0.5 * left.reduce((sum, value, index) => sum + Math.abs(value - right[index]), 0);
}

function vector(optionIds: readonly string[], probabilities: Readonly<Record<string, number>>): ProbabilityVectorV1 {
  return { optionIds: [...optionIds], values: optionIds.map(optionId => probabilities[optionId]) };
}

function vectorMean(vectors: readonly ProbabilityVectorV1[]): ProbabilityVectorV1 {
  if (!vectors.length) throw new Error("peer_bundle_analysis_empty_vectors");
  const optionIds = vectors[0].optionIds;
  return {
    optionIds: [...optionIds],
    values: optionIds.map((_, index) => mean(vectors.map(item => item.values[index]))),
  };
}

function normalizedEntropy(values: readonly number[]): number {
  return -values.reduce((sum, value) => sum + (value > 0 ? value * Math.log(value) : 0), 0)
    / Math.log(values.length);
}

function generalizedJsd(vectors: readonly ProbabilityVectorV1[]): number {
  const pooled = vectorMean(vectors);
  return Math.max(0, normalizedEntropy(pooled.values)
    - mean(vectors.map(vectorValue => normalizedEntropy(vectorValue.values))));
}

export function analyzeCollectiveDynamicsPeerBundleV1(input: {
  plan: CollectiveDynamicsPeerBundlePlanV1;
  freeze: CollectiveDynamicsPeerBundleFreezeV1;
  run: CollectiveDynamicsPeerBundleRunV1;
}): CollectiveDynamicsPeerBundleAnalysisV1 {
  verifyCollectiveDynamicsPeerBundleRunV1({ freeze: input.freeze, artifact: input.run });
  if (input.plan.contentHash !== input.freeze.planHash) {
    throw new Error("peer_bundle_analysis_plan_mismatch");
  }
  const cellById = new Map(input.freeze.cells.map(cell => [cell.cellId, cell]));
  const terminalByCell = new Map(input.run.terminals.map(terminal => [terminal.cellId, terminal]));
  const terminalCounts: Record<string, number> = {};
  input.run.terminals.forEach(terminal => {
    terminalCounts[terminal.status] = (terminalCounts[terminal.status] ?? 0) + 1;
  });
  const optionIds = input.freeze.snapshots[0].claim.options.map(option => option.optionId);
  const units = new Map<string, {
    unitId: string;
    sourceTaskId: number;
    agentId: string;
    reports: Record<string, ProbabilityVectorV1>;
  }>();
  for (const cell of input.freeze.cells) {
    const terminal = terminalByCell.get(cell.cellId);
    if (!terminal || terminal.status !== "valid") continue;
    const key = cell.unitId;
    const unit = units.get(key) ?? {
      unitId: key,
      sourceTaskId: cell.sourceTaskId,
      agentId: cell.agentId,
      reports: {},
    };
    unit.reports[`${cell.condition}_${cell.repeatLabel}`] = vector(
      optionIds,
      terminal.parsed.probabilitiesByOptionId,
    );
    units.set(key, unit);
  }
  const unitRows: PeerBundleUnitRowV1[] = [];
  for (const unit of input.freeze.snapshots.map(snapshot => {
    const unitId = input.freeze.cells.find(cell => cell.snapshotHash === snapshot.contentHash)!.unitId;
    return units.get(unitId);
  })) {
    if (!unit) continue;
    const reports = unit.reports;
    const noPeerMean = vectorMean([reports.NO_PEER_A, reports.NO_PEER_B]);
    const peerMean = vectorMean([reports.PEER_A, reports.PEER_B]);
    const noPeerDuplicateTv = tv(reports.NO_PEER_A.values, reports.NO_PEER_B.values);
    const peerDuplicateTv = tv(reports.PEER_A.values, reports.PEER_B.values);
    const peerResponseTv = tv(peerMean.values, noPeerMean.values);
    unitRows.push({
      unitId: unit.unitId,
      sourceTaskId: unit.sourceTaskId,
      agentId: unit.agentId,
      conditionDuplicateTv: { noPeer: noPeerDuplicateTv, peer: peerDuplicateTv },
      peerResponseTv,
      peerResponseExceedsBothDuplicateMeans: peerResponseTv > mean([noPeerDuplicateTv, peerDuplicateTv]),
      noPeerMean,
      peerMean,
    });
  }
  const taskRows = input.plan.sourceTaskIds.map(sourceTaskId => {
    const rows = unitRows.filter(row => row.sourceTaskId === sourceTaskId);
    const noPeer = rows.map(row => row.noPeerMean);
    const peer = rows.map(row => row.peerMean);
    const noPeerPooled = vectorMean(noPeer);
    const peerPooled = vectorMean(peer);
    const noPeerPooledEntropy = normalizedEntropy(noPeerPooled.values);
    const peerPooledEntropy = normalizedEntropy(peerPooled.values);
    const noPeerMeanAgentEntropy = mean(noPeer.map(item => normalizedEntropy(item.values)));
    const peerMeanAgentEntropy = mean(peer.map(item => normalizedEntropy(item.values)));
    const noPeerJsd = generalizedJsd(noPeer);
    const peerJsd = generalizedJsd(peer);
    const meanPeerResponseTv = mean(rows.map(row => row.peerResponseTv));
    const meanNoPeerDuplicateTv = mean(rows.map(row => row.conditionDuplicateTv.noPeer));
    const meanPeerDuplicateTv = mean(rows.map(row => row.conditionDuplicateTv.peer));
    return {
      sourceTaskId,
      agentCount: rows.length,
      meanPeerResponseTv,
      meanNoPeerDuplicateTv,
      meanPeerDuplicateTv,
      peerResponseExceedsBothDuplicateMeans:
        meanPeerResponseTv > Math.max(meanNoPeerDuplicateTv, meanPeerDuplicateTv),
      noPeerPooledEntropy,
      peerPooledEntropy,
      deltaPooledEntropy: peerPooledEntropy - noPeerPooledEntropy,
      noPeerMeanAgentEntropy,
      peerMeanAgentEntropy,
      deltaMeanAgentEntropy: peerMeanAgentEntropy - noPeerMeanAgentEntropy,
      noPeerGeneralizedJsd: noPeerJsd,
      peerGeneralizedJsd: peerJsd,
      deltaGeneralizedJsd: peerJsd - noPeerJsd,
    };
  });
  const responses = unitRows.map(row => row.peerResponseTv);
  const validCellCount = input.run.terminals.filter(terminal => terminal.status === "valid").length;
  const body: Omit<CollectiveDynamicsPeerBundleAnalysisV1, "contentHash"> = {
    analysisRef: COLLECTIVE_DYNAMICS_PEER_BUNDLE_ANALYSIS_V1,
    planHash: input.plan.contentHash,
    freezeHash: input.freeze.contentHash,
    runHash: input.run.contentHash,
    inferenceUnit: "task",
    pairedObservationUnit: "task_agent_frozen_view",
    truthAccess: "none",
    terminalCounts,
    unitRows,
    taskRows,
    summary: {
      registeredCellCount: input.freeze.registeredCellCount,
      validCellCount,
      invalidOrMissingCellCount: input.freeze.registeredCellCount - validCellCount,
      registeredUnitCount: input.freeze.registeredUnitCount,
      validUnitCount: unitRows.length,
      meanPeerResponseTv: responses.length ? mean(responses) : null,
      p90PeerResponseTv: responses.length ? quantileNearestRank(responses, 0.9) : null,
      meanNoPeerDuplicateTv: unitRows.length
        ? mean(unitRows.map(row => row.conditionDuplicateTv.noPeer)) : null,
      meanPeerDuplicateTv: unitRows.length
        ? mean(unitRows.map(row => row.conditionDuplicateTv.peer)) : null,
      taskCount: taskRows.length,
      tasksResponseExceedsBothDuplicateMeans: taskRows.filter(row =>
        row.peerResponseExceedsBothDuplicateMeans).length,
    },
    claimCeiling: "one_step_peer_bundle_response_only",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): number {
  const outputDirectory = resolve(
    process.env.PEER_BUNDLE_FREEZE_OUTPUT_DIR ?? COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_OUTPUT_V1,
  );
  const frozen = loadFrozenCollectiveDynamicsPeerBundleV1(outputDirectory);
  const runPath = join(outputDirectory, "run.json");
  if (!existsSync(runPath)) throw new Error("peer_bundle_run_missing");
  const run = JSON.parse(readFileSync(runPath, "utf8")) as CollectiveDynamicsPeerBundleRunV1;
  const analysis = analyzeCollectiveDynamicsPeerBundleV1({
    plan: frozen.plan,
    freeze: frozen.freeze,
    run,
  });
  const target = join(outputDirectory, "analysis.json");
  const text = `${JSON.stringify(analysis, null, 2)}\n`;
  if (existsSync(target)) {
    if (readFileSync(target, "utf8") !== text) {
      throw new Error("peer_bundle_analysis_no_overwrite_conflict");
    }
  } else writeFileSync(target, text, { flag: "wx" });
  console.log(JSON.stringify({
    analysisHash: analysis.contentHash,
    validCells: analysis.summary.validCellCount,
    meanPeerResponseTv: analysis.summary.meanPeerResponseTv,
    meanNoPeerDuplicateTv: analysis.summary.meanNoPeerDuplicateTv,
    meanPeerDuplicateTv: analysis.summary.meanPeerDuplicateTv,
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
