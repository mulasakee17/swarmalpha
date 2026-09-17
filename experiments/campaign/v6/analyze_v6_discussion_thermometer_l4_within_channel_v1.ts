/**
 * Development-only, zero-provider coarse-graining adequacy analysis.
 *
 * The target is the next primary-report transition, not a later public choice
 * and not ground truth. Models are evaluated by leave-one-task-out loss. This
 * answers whether the minimal reported-belief macrostate retains incremental
 * future information beyond structured public-choice history, and whether the
 * complete primary-report matrix retains information lost by that macrostate.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  DiscussionThermometerStateV1,
  DiscussionThermometerTransitionV1,
} from "../../../src/lib/epistemic";
import {
  buildThermometerQualificationFeaturesV1,
  compareThermometerQualificationFamiliesV1,
  type ThermometerQualificationComparisonV1,
  type ThermometerQualificationFeatureFamilyV1,
  type ThermometerQualificationModelRowV1,
} from "./collectiveDynamicsTrajectoryPredictionV1";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import { L4_AI_ADJUDICATED_DEVELOPMENT_GROUPS_V1 } from
  "./discussionThermometerL4PreflightV1";
import { analyzeL4DevelopmentStage1V1 } from
  "./analyze_v6_discussion_thermometer_l4_development_stage1";

export const DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.discussion-thermometer-l4-within-channel",
  version: "1.2.0",
  estimator: "standardized_fractional_logit_ridge_v1" as const,
  primaryLambda: 1,
  sensitivityLambdas: [0.1, 1, 10] as const,
  predictionCheckpoints: [1, 2] as const,
});

type TargetId = "next_mean_agent_total_variation" | "next_pooled_total_variation";
type IncrementClassification =
  | "development_stable_increment_observed"
  | "development_directional_only"
  | "no_development_increment_observed";

interface ComparisonWithSensitivityV1 {
  primary: ThermometerQualificationComparisonV1;
  sensitivity: Array<{
    lambda: number;
    candidateMinusBaselineMeanSquaredError: number;
    pairedSignFlipTwoSidedPValue: number;
  }>;
  classification: IncrementClassification;
}

interface TargetAnalysisV1 {
  targetId: TargetId;
  rowCount: number;
  taskCount: number;
  targetMean: number;
  zeroTargetRowCount: number;
  byCheckpoint: Array<{
    checkpoint: 1 | 2;
    rowCount: number;
    meanTarget: number;
  }>;
  structuralToBehavior: ComparisonWithSensitivityV1;
  behaviorToMacro: ComparisonWithSensitivityV1;
  macroToMicrostate: ComparisonWithSensitivityV1;
  behaviorToMicrostate: ComparisonWithSensitivityV1;
}

export interface DiscussionThermometerL4WithinChannelAnalysisV1 {
  analysisRef: typeof DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1;
  source: {
    outputDirectory: string;
    baseAnalysisHash: string;
  };
  design: {
    authority: "development_only_not_confirmatory";
    truthAccess: "none";
    inferenceUnit: "task";
    observationUnit: "task_checkpoint_transition";
    taskCount: number;
    semanticGroupCount: number;
    predictionCheckpoints: readonly [1, 2];
    targetChannel: "next_primary_report_transition";
    estimator: "standardized_fractional_logit_ridge_v1";
    primaryLambda: number;
    sensitivityLambdas: readonly number[];
    featureLadder: readonly ["BEHAVIOR", "MACRO", "MICROSTATE"];
    loss: "mean_squared_error_on_bounded_fractional_target";
  };
  targets: TargetAnalysisV1[];
  routing: {
    macroIncrement: "both_targets" | "partial" | "none";
    microstateBeyondMacro: "both_targets" | "partial" | "none";
    decision:
      | "prepare_independent_task_bank_only_after_human_review"
      | "do_not_scale_current_macro_prediction_design";
  };
  interpretation: string[];
  contentHash: string;
}

function mean(values: readonly number[]): number {
  if (!values.length) throw new Error("l4_within_channel_mean_empty");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classify(
  primary: ThermometerQualificationComparisonV1,
  sensitivity: readonly ComparisonWithSensitivityV1["sensitivity"][number][],
): IncrementClassification {
  const primaryNegative = primary.candidateMinusBaselineMeanSquaredError < 0;
  const stableNegative = sensitivity.every(row =>
    row.candidateMinusBaselineMeanSquaredError < 0);
  if (primaryNegative && stableNegative && primary.signFlip.twoSidedExceedance <= 0.05) {
    return "development_stable_increment_observed";
  }
  if (primaryNegative) return "development_directional_only";
  return "no_development_increment_observed";
}

function compareWithSensitivity(input: {
  rows: readonly ThermometerQualificationModelRowV1[];
  baselineFamily: ThermometerQualificationFeatureFamilyV1;
  candidateFamily: ThermometerQualificationFeatureFamilyV1;
}): ComparisonWithSensitivityV1 {
  const run = (lambda: number): ThermometerQualificationComparisonV1 =>
    compareThermometerQualificationFamiliesV1({
      rows: input.rows,
      baselineFamily: input.baselineFamily,
      candidateFamily: input.candidateFamily,
      holdoutKey: "taskId",
      lambda,
      estimator: DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.estimator,
    });
  const primary = run(DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.primaryLambda);
  const sensitivity = DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.sensitivityLambdas
    .map(lambda => {
      const result = lambda === DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.primaryLambda
        ? primary : run(lambda);
      return {
        lambda,
        candidateMinusBaselineMeanSquaredError:
          result.candidateMinusBaselineMeanSquaredError,
        pairedSignFlipTwoSidedPValue: result.signFlip.twoSidedExceedance,
      };
    });
  return { primary, sensitivity, classification: classify(primary, sensitivity) };
}

function groupMap(): Map<number, string> {
  const output = new Map<number, string>();
  L4_AI_ADJUDICATED_DEVELOPMENT_GROUPS_V1.forEach(group => {
    group.sourceTaskIds.forEach(sourceTaskId => {
      if (output.has(sourceTaskId)) throw new Error("l4_within_channel_duplicate_group_task");
      output.set(sourceTaskId, group.groupId);
    });
  });
  return output;
}

function buildRows(input: {
  states: readonly DiscussionThermometerStateV1[];
  transitions: readonly DiscussionThermometerTransitionV1[];
  sourceTaskIds: readonly number[];
  targetId: TargetId;
}): Array<ThermometerQualificationModelRowV1 & { checkpoint: 1 | 2 }> {
  const groups = groupMap();
  const stateByKey = new Map(input.states.map(state => [
    `${state.claimId}:X${state.checkpointIndex}`, state,
  ]));
  const transitionByFromHash = new Map(input.transitions.map(transition => [
    transition.fromStateHash, transition,
  ]));
  return input.sourceTaskIds.flatMap(sourceTaskId => {
    const semanticGroupId = groups.get(sourceTaskId);
    if (!semanticGroupId) throw new Error("l4_within_channel_semantic_group_missing");
    const claimId = `claim:trajectory:${sourceTaskId}`;
    return DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.predictionCheckpoints.map(checkpoint => {
      const current = stateByKey.get(`${claimId}:X${checkpoint}`);
      const previous = stateByKey.get(`${claimId}:X${checkpoint - 1}`);
      if (!current || !previous) throw new Error("l4_within_channel_state_missing");
      const transition = transitionByFromHash.get(current.contentHash);
      if (!transition) throw new Error("l4_within_channel_transition_missing");
      const target = input.targetId === "next_mean_agent_total_variation"
        ? transition.meanAgentTotalVariation : transition.pooledTotalVariation;
      if (target === null || !Number.isFinite(target) || target < 0 || target > 1) {
        throw new Error("l4_within_channel_target_invalid");
      }
      const families = ["STRUCTURAL", "BEHAVIOR", "MACRO", "MICROSTATE"] as const;
      return {
        taskId: `task:${sourceTaskId}`,
        semanticGroupId,
        checkpoint,
        target,
        featuresByFamily: Object.fromEntries(families.map(family => [
          family,
          buildThermometerQualificationFeaturesV1({ family, current, previous }),
        ])),
      };
    });
  });
}

function targetAnalysis(input: {
  states: readonly DiscussionThermometerStateV1[];
  transitions: readonly DiscussionThermometerTransitionV1[];
  sourceTaskIds: readonly number[];
  targetId: TargetId;
}): TargetAnalysisV1 {
  const rows = buildRows(input);
  return {
    targetId: input.targetId,
    rowCount: rows.length,
    taskCount: new Set(rows.map(row => row.taskId)).size,
    targetMean: mean(rows.map(row => row.target)),
    zeroTargetRowCount: rows.filter(row => row.target <= 1e-12).length,
    byCheckpoint: DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.predictionCheckpoints
      .map(checkpoint => {
        const selected = rows.filter(row => row.checkpoint === checkpoint);
        return { checkpoint, rowCount: selected.length, meanTarget: mean(selected.map(row => row.target)) };
      }),
    structuralToBehavior: compareWithSensitivity({
      rows, baselineFamily: "STRUCTURAL", candidateFamily: "BEHAVIOR",
    }),
    behaviorToMacro: compareWithSensitivity({
      rows, baselineFamily: "BEHAVIOR", candidateFamily: "MACRO",
    }),
    macroToMicrostate: compareWithSensitivity({
      rows, baselineFamily: "MACRO", candidateFamily: "MICROSTATE",
    }),
    behaviorToMicrostate: compareWithSensitivity({
      rows, baselineFamily: "BEHAVIOR", candidateFamily: "MICROSTATE",
    }),
  };
}

function countStable(
  targets: readonly TargetAnalysisV1[],
  key: "behaviorToMacro" | "macroToMicrostate",
): number {
  return targets.filter(target =>
    target[key].classification === "development_stable_increment_observed").length;
}

export function analyzeDiscussionThermometerL4WithinChannelV1(
  outputDirectoryInput?: string,
): DiscussionThermometerL4WithinChannelAnalysisV1 {
  const outputDirectory = resolve(outputDirectoryInput
    ?? "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1");
  const base = analyzeL4DevelopmentStage1V1(outputDirectory);
  const states = base.states as DiscussionThermometerStateV1[];
  const transitions = base.transitions as DiscussionThermometerTransitionV1[];
  const sourceTaskIds = base.findings.taskLevelFutureChoice.map(row => row.sourceTaskId);
  const targets = ([
    "next_mean_agent_total_variation",
    "next_pooled_total_variation",
  ] as const).map(targetId => targetAnalysis({ states, transitions, sourceTaskIds, targetId }));
  const macroStableCount = countStable(targets, "behaviorToMacro");
  const microStableCount = countStable(targets, "macroToMicrostate");
  const macroIncrement = macroStableCount === targets.length ? "both_targets" as const
    : macroStableCount > 0 ? "partial" as const : "none" as const;
  const microstateBeyondMacro = microStableCount === targets.length ? "both_targets" as const
    : microStableCount > 0 ? "partial" as const : "none" as const;
  const body: Omit<DiscussionThermometerL4WithinChannelAnalysisV1, "contentHash"> = {
    analysisRef: DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1,
    source: { outputDirectory, baseAnalysisHash: base.contentHash },
    design: {
      authority: "development_only_not_confirmatory",
      truthAccess: "none",
      inferenceUnit: "task",
      observationUnit: "task_checkpoint_transition",
      taskCount: new Set(sourceTaskIds).size,
      semanticGroupCount: new Set(sourceTaskIds.map(sourceTaskId => groupMap().get(sourceTaskId))).size,
      predictionCheckpoints: DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.predictionCheckpoints,
      targetChannel: "next_primary_report_transition",
      estimator: DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.estimator,
      primaryLambda: DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.primaryLambda,
      sensitivityLambdas: DISCUSSION_THERMOMETER_L4_WITHIN_CHANNEL_V1.sensitivityLambdas,
      featureLadder: ["BEHAVIOR", "MACRO", "MICROSTATE"],
      loss: "mean_squared_error_on_bounded_fractional_target",
    },
    targets,
    routing: {
      macroIncrement,
      microstateBeyondMacro,
      decision: macroIncrement === "both_targets"
        ? "prepare_independent_task_bank_only_after_human_review"
        : "do_not_scale_current_macro_prediction_design",
    },
    interpretation: [
      "The targets are next-checkpoint movements of primary probability reports, not future public choices and not correctness.",
      "All repeated checkpoints from one task remain in one held-out fold; agent and checkpoint rows do not increase the inferential task count.",
      "BEHAVIOR, MACRO, and MICROSTATE are compared on identical eligible rows with training-fold-only standardization.",
      "STRUCTURAL to BEHAVIOR is reported as a baseline diagnostic and does not alter the registered macro routing decision.",
      "The primary estimator is a ridge-penalized fractional-logit GLM with a fixed lambda; the lambda grid is sensitivity analysis, not model selection.",
      "This seven-task screen is development evidence only and cannot qualify transport, causality, recoverability, or governance.",
    ],
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): void {
  const outputDirectory = resolve(process.env.L4_DEVELOPMENT_OUTPUT_DIR
    ?? "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1");
  const analysis = analyzeDiscussionThermometerL4WithinChannelV1(outputDirectory);
  const file = join(outputDirectory, "analysis-within-channel-v1.2.json");
  const serialized = `${JSON.stringify(analysis, null, 2)}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") !== serialized) {
    throw new Error("l4_within_channel_no_overwrite_conflict");
  }
  if (!existsSync(file)) writeFileSync(file, serialized, "utf8");
  console.log(JSON.stringify({
    outputDirectory,
    analysisHash: analysis.contentHash,
    design: analysis.design,
    targets: analysis.targets.map(target => ({
      targetId: target.targetId,
      structuralToBehavior: target.structuralToBehavior,
      behaviorToMacro: target.behaviorToMacro,
      macroToMicrostate: target.macroToMicrostate,
    })),
    routing: analysis.routing,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) main();
