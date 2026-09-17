/**
 * Build a truth-blind, time-aligned review packet for checking whether a
 * checkpoint probability report predicts the agents' next public messages.
 *
 * No semantic choice is inferred automatically: public messages remain raw
 * text for independent human coding under a separately frozen rubric.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  verifyCollectiveDynamicsTrajectoryPublicArtifactV1,
  type CollectiveDynamicsTrajectoryPublicArtifactV1,
} from "./collectiveDynamicsTrajectoryCheckpointV1";
import type { CollectiveDynamicsTrajectoryPilotPlanV1 } from
  "./collectiveDynamicsTrajectoryPilotV1";
import type { V6PublicTranscriptEntry } from "./productionVerticalSlice";
import {
  COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1,
  loadFrozenCollectiveDynamicsTrajectorySensorV1,
} from "./run_v6_collective_dynamics_trajectory_sensor_v1";
import type {
  CollectiveDynamicsTrajectoryAnalysisV1,
  TrajectorySensorUnitRowV1,
} from "./analyze_v6_collective_dynamics_trajectory_v1";

export const COLLECTIVE_DYNAMICS_CROSS_CHANNEL_REVIEW_V1 = Object.freeze({
  id: "swarmalpha.review.v6.collective-dynamics-cross-channel",
  version: "1.0.0",
});

type PredictiveCheckpointV1 = 0 | 1 | 2;
type PublicRoundV1 = 1 | 2 | 3;

interface ProbabilityVectorV1 {
  optionIds: string[];
  values: number[];
}

export interface CrossChannelSensorReportV1 {
  agentId: string;
  averagedReport: ProbabilityVectorV1;
  duplicateTotalVariation: number;
  repeatUniqueTops: { A: string | null; B: string | null } | null;
  averagedUniqueTop: string | null;
}

export interface CrossChannelPublicMessageV1 {
  agentId: string;
  content: string;
  messageHash: string;
}

export interface CrossChannelReviewRowV1 {
  reviewUnitId: string;
  sourceTaskId: number;
  checkpointRound: PredictiveCheckpointV1;
  nextPublicRound: PublicRoundV1;
  sourceCheckpointHash: string;
  sourcePublicRoundHash: string;
  optionMapping: Array<{ sensorOptionId: string; publicOptionLabel: string }>;
  expectedAgentIds: string[];
  comparableAgentIds: string[];
  missingOrInvalidAgentIds: string[];
  pooledProbabilities: ProbabilityVectorV1 | null;
  sensorReports: CrossChannelSensorReportV1[];
  nextPublicMessages: CrossChannelPublicMessageV1[];
  humanCodingStatus: "not_collected";
}

export interface CollectiveDynamicsCrossChannelReviewV1 {
  reviewRef: typeof COLLECTIVE_DYNAMICS_CROSS_CHANNEL_REVIEW_V1;
  planHash: string;
  analysisHash: string;
  sourceTrajectoryHashes: string[];
  truthAccess: "none";
  timeAlignment: "checkpoint_t_predicts_public_round_t_plus_1";
  semanticInference: "none_human_coding_required";
  codingTarget: "next_public_message_categorical_choice";
  rows: CrossChannelReviewRowV1[];
  contentHash: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function verifyAnalysisHash(analysis: CollectiveDynamicsTrajectoryAnalysisV1): void {
  const { contentHash, ...body } = analysis;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("cross_channel_analysis_hash_mismatch");
  }
  if (analysis.stateTruthAccess !== "none") {
    throw new Error("cross_channel_analysis_not_truth_blind");
  }
}

function validSensorReports(input: {
  sourceTaskId: number;
  checkpointRound: PredictiveCheckpointV1;
  expectedAgentIds: readonly string[];
  unitRows: readonly TrajectorySensorUnitRowV1[];
}): CrossChannelSensorReportV1[] {
  const matching = input.unitRows.filter(row => row.sourceTaskId === input.sourceTaskId
    && row.checkpointRound === input.checkpointRound);
  if (matching.length !== input.expectedAgentIds.length
    || matching.some((row, index) => row.agentId !== input.expectedAgentIds[index])) {
    throw new Error("cross_channel_sensor_roster_invalid");
  }
  return matching.flatMap(row => row.pairStatus === "valid"
    && row.averagedReport !== null
    && row.duplicateTotalVariation !== null
    ? [{
      agentId: row.agentId,
      averagedReport: clone(row.averagedReport),
      duplicateTotalVariation: row.duplicateTotalVariation,
      repeatUniqueTops: clone(row.repeatUniqueTops),
      averagedUniqueTop: row.averagedUniqueTop,
    }]
    : []);
}

function publicMessages(messages: readonly V6PublicTranscriptEntry[]): CrossChannelPublicMessageV1[] {
  return messages.map(message => ({
    agentId: message.agentId,
    content: message.content,
    messageHash: hashCollectiveDynamicsValueV1({
      round: message.round,
      agentId: message.agentId,
      content: message.content,
      source: message.source,
    }),
  }));
}

export function buildCollectiveDynamicsCrossChannelReviewV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  artifacts: readonly CollectiveDynamicsTrajectoryPublicArtifactV1[];
  analysis: CollectiveDynamicsTrajectoryAnalysisV1;
}): CollectiveDynamicsCrossChannelReviewV1 {
  verifyAnalysisHash(input.analysis);
  if (input.analysis.planHash !== input.plan.contentHash) {
    throw new Error("cross_channel_plan_analysis_binding_invalid");
  }
  if (input.artifacts.length !== input.plan.sourceTaskIds.length) {
    throw new Error("cross_channel_trajectory_count_invalid");
  }
  input.artifacts.forEach(artifact =>
    verifyCollectiveDynamicsTrajectoryPublicArtifactV1(artifact, input.plan));

  const rows = input.plan.sourceTaskIds.flatMap(sourceTaskId => {
    const artifact = input.artifacts.find(candidate =>
      candidate.onlineTask.sourceTaskId === sourceTaskId);
    if (!artifact) throw new Error("cross_channel_source_trajectory_missing");
    const expectedAgentIds = artifact.onlineTask.agents.map(agent => agent.agentId);
    return ([0, 1, 2] as const).map(checkpointRound => {
      const nextPublicRound = (checkpointRound + 1) as PublicRoundV1;
      const checkpoint = artifact.checkpoints[checkpointRound];
      const round = artifact.rounds[checkpointRound];
      const checkpointRow = input.analysis.checkpointRows.find(candidate =>
        candidate.sourceTaskId === sourceTaskId
        && candidate.checkpointRound === checkpointRound);
      if (!checkpointRow || checkpoint.checkpointRound !== checkpointRound
        || round.round !== nextPublicRound) {
        throw new Error("cross_channel_time_binding_invalid");
      }
      const sensorReports = validSensorReports({
        sourceTaskId,
        checkpointRound,
        expectedAgentIds,
        unitRows: input.analysis.unitRows,
      });
      const comparableAgentIds = sensorReports.map(report => report.agentId);
      const missingOrInvalidAgentIds = expectedAgentIds.filter(agentId =>
        !comparableAgentIds.includes(agentId));
      const sensorOptionIds = sensorReports[0]?.averagedReport.optionIds
        ?? checkpointRow.reportedState.pooledProbabilities?.optionIds
        ?? [];
      if (sensorOptionIds.length !== artifact.onlineTask.claim.options.length
        || sensorReports.some(report => JSON.stringify(report.averagedReport.optionIds)
          !== JSON.stringify(sensorOptionIds))) {
        throw new Error("cross_channel_option_mapping_invalid");
      }
      if (JSON.stringify(comparableAgentIds)
        !== JSON.stringify(checkpointRow.reportedState.comparableAgentIds)
        || JSON.stringify(missingOrInvalidAgentIds)
        !== JSON.stringify(checkpointRow.reportedState.missingOrInvalidAgentIds)) {
        throw new Error("cross_channel_analysis_roster_binding_invalid");
      }
      return {
        reviewUnitId: `task-${sourceTaskId}:X${checkpointRound}->R${nextPublicRound}`,
        sourceTaskId,
        checkpointRound,
        nextPublicRound,
        sourceCheckpointHash: checkpoint.contentHash,
        sourcePublicRoundHash: round.contentHash,
        optionMapping: sensorOptionIds.map((sensorOptionId, index) => ({
          sensorOptionId,
          publicOptionLabel: artifact.onlineTask.claim.options[index],
        })),
        expectedAgentIds,
        comparableAgentIds,
        missingOrInvalidAgentIds,
        pooledProbabilities: clone(checkpointRow.reportedState.pooledProbabilities),
        sensorReports,
        nextPublicMessages: publicMessages(round.messages),
        humanCodingStatus: "not_collected" as const,
      };
    });
  });
  const body: Omit<CollectiveDynamicsCrossChannelReviewV1, "contentHash"> = {
    reviewRef: COLLECTIVE_DYNAMICS_CROSS_CHANNEL_REVIEW_V1,
    planHash: input.plan.contentHash,
    analysisHash: input.analysis.contentHash,
    sourceTrajectoryHashes: input.artifacts.map(artifact => artifact.contentHash),
    truthAccess: "none",
    timeAlignment: "checkpoint_t_predicts_public_round_t_plus_1",
    semanticInference: "none_human_coding_required",
    codingTarget: "next_public_message_categorical_choice",
    rows,
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): number {
  const outputDirectory = resolve(
    process.env.M2_TRAJECTORY_SENSOR_OUTPUT_DIR
      ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1,
  );
  const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(outputDirectory);
  const analysisFile = join(outputDirectory, "analysis-v1.4.json");
  if (!existsSync(analysisFile)) throw new Error("cross_channel_analysis_missing");
  const analysis = JSON.parse(readFileSync(analysisFile, "utf8")) as
    CollectiveDynamicsTrajectoryAnalysisV1;
  const review = buildCollectiveDynamicsCrossChannelReviewV1({
    plan: frozen.plan,
    artifacts: frozen.artifacts,
    analysis,
  });
  const target = join(outputDirectory, "cross-channel-review-v1.json");
  const text = `${JSON.stringify(review, null, 2)}\n`;
  if (existsSync(target) && readFileSync(target, "utf8") !== text) {
    throw new Error("cross_channel_review_no_overwrite_conflict");
  }
  if (!existsSync(target)) writeFileSync(target, text, { flag: "wx" });
  console.log(JSON.stringify({
    status: "cross_channel_review_built",
    reviewUnitCount: review.rows.length,
    contentHash: review.contentHash,
    output: target,
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
