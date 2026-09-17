/** Offline outcome analysis for the development-only controlled formation canary. */
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import { CONTROLLED_WRONG_STATE_TASK_BANK_V1 } from "./controlledWrongStateTaskBankV1";
import {
  verifyControlledWrongStateFormationRunV1,
  type ControlledWrongStateFormationArmV1,
  type ControlledWrongStateFormationPlanV1,
  type ControlledWrongStateFormationRunV1,
} from "./controlledWrongStateFormationV1";

export const CONTROLLED_WRONG_STATE_FORMATION_ANALYSIS_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.controlled-wrong-state-formation",
  version: "1.0.0",
});

interface StateSummaryV1 {
  histogram: Record<string, number>;
  topOptionId: string;
  concentration: number;
  choiceDisagreement: number;
  wrongSupermajority75: boolean;
}

export interface ControlledWrongStateVariantAnalysisV1 {
  taskId: string;
  clusterId: string;
  mirrorOfTaskId: string | null;
  outcomeOptionId: string;
  x0: StateSummaryV1;
  eligibleAtX0: boolean;
  arms: Record<ControlledWrongStateFormationArmV1, {
    round1: StateSummaryV1;
    round2: StateSummaryV1;
    stableWrongFormation: boolean;
    stableWrongOptionId: string | null;
  }>;
  pairedDirection: "PEER" | "ISOLATED" | "TIE" | "INELIGIBLE";
}

export interface ControlledWrongStateFormationAnalysisV1 {
  analysisRef: typeof CONTROLLED_WRONG_STATE_FORMATION_ANALYSIS_V1;
  planHash: string;
  runHash: string;
  scientificRole: "engineering_development_canary_only";
  variants: ControlledWrongStateVariantAnalysisV1[];
  summary: {
    attemptedVariants: 8;
    eligibleVariants: number;
    peerStableWrongVariants: number;
    isolatedStableWrongVariants: number;
    peerSpecificVariants: number;
    isolatedSpecificVariants: number;
    discordantVariants: number;
    peerDirectionClusters: number;
    isolatedDirectionClusters: number;
    mirrorConflictClusters: number;
    peerSpecificWrongOptionPositionCount: number;
  };
  advancement: {
    decision: "GO_REPLICATE" | "NO_GO_REVISE";
    checks: {
      atLeastThreeDiscordantVariants: boolean;
      atLeastTwoPeerDirectionClusters: boolean;
      noMirrorConflict: boolean;
      multiplePeerSpecificWrongOptionPositions: boolean;
    };
  };
  contentHash: string;
}

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

function state(input: {
  choices: readonly string[];
  optionIds: readonly string[];
  outcomeOptionId: string;
}): StateSummaryV1 {
  if (input.choices.length !== 4) throw new Error("controlled_formation_analysis_roster_invalid");
  const histogram = Object.fromEntries(input.optionIds.map(optionId => [
    optionId, input.choices.filter(choice => choice === optionId).length,
  ]));
  const ordered = Object.entries(histogram).sort((left, right) => right[1] - left[1]);
  const topOptionId = ordered[0][0];
  const concentration = ordered[0][1] / input.choices.length;
  const q = input.optionIds.map(optionId => histogram[optionId] / input.choices.length);
  const choiceDisagreement = input.choices.length / (input.choices.length - 1)
    * (1 - q.reduce((sum, value) => sum + value * value, 0));
  return {
    histogram,
    topOptionId,
    concentration,
    choiceDisagreement,
    wrongSupermajority75: concentration >= 0.75 && topOptionId !== input.outcomeOptionId,
  };
}

export function analyzeControlledWrongStateFormationV1(input: {
  plan: ControlledWrongStateFormationPlanV1;
  run: ControlledWrongStateFormationRunV1;
}): ControlledWrongStateFormationAnalysisV1 {
  verifyControlledWrongStateFormationRunV1({ plan: input.plan, artifact: input.run });
  const variants = CONTROLLED_WRONG_STATE_TASK_BANK_V1.map(task => {
    const optionIds = task.options.map(option => option.optionId);
    const choices = (phase: "X0" | ControlledWrongStateFormationArmV1, round: 0 | 1 | 2) =>
      input.run.terminals.filter(terminal => terminal.taskId === task.taskId
        && terminal.phase === phase && terminal.round === round)
        .map(terminal => terminal.parsed.choiceId);
    const x0 = state({ choices: choices("X0", 0), optionIds,
      outcomeOptionId: task.resolver.outcomeOptionId });
    const armResults = Object.fromEntries((["ISOLATED", "PEER"] as const).map(arm => {
      const round1 = state({ choices: choices(arm, 1), optionIds,
        outcomeOptionId: task.resolver.outcomeOptionId });
      const round2 = state({ choices: choices(arm, 2), optionIds,
        outcomeOptionId: task.resolver.outcomeOptionId });
      const stableWrongFormation = !x0.wrongSupermajority75
        && round1.wrongSupermajority75 && round2.wrongSupermajority75
        && round1.topOptionId === round2.topOptionId;
      return [arm, {
        round1, round2, stableWrongFormation,
        stableWrongOptionId: stableWrongFormation ? round1.topOptionId : null,
      }];
    })) as ControlledWrongStateVariantAnalysisV1["arms"];
    const eligibleAtX0 = !x0.wrongSupermajority75;
    const pairedDirection = !eligibleAtX0 ? "INELIGIBLE"
      : armResults.PEER.stableWrongFormation === armResults.ISOLATED.stableWrongFormation
        ? "TIE"
        : armResults.PEER.stableWrongFormation ? "PEER" : "ISOLATED";
    return {
      taskId: task.taskId,
      clusterId: task.clusterId,
      mirrorOfTaskId: task.mirrorOfTaskId,
      outcomeOptionId: task.resolver.outcomeOptionId,
      x0,
      eligibleAtX0,
      arms: armResults,
      pairedDirection,
    } satisfies ControlledWrongStateVariantAnalysisV1;
  });
  const clusters = [...new Set(variants.map(variant => variant.clusterId))];
  const clusterDirections = clusters.map(clusterId => {
    const rows = variants.filter(variant => variant.clusterId === clusterId);
    const peer = rows.some(row => row.pairedDirection === "PEER");
    const isolated = rows.some(row => row.pairedDirection === "ISOLATED");
    return peer && isolated ? "CONFLICT" : peer ? "PEER" : isolated ? "ISOLATED" : "NONE";
  });
  const peerSpecific = variants.filter(variant => variant.pairedDirection === "PEER");
  const checks = {
    atLeastThreeDiscordantVariants: variants.filter(variant =>
      variant.pairedDirection === "PEER" || variant.pairedDirection === "ISOLATED").length >= 3,
    atLeastTwoPeerDirectionClusters: clusterDirections.filter(direction => direction === "PEER").length >= 2,
    noMirrorConflict: !clusterDirections.includes("CONFLICT"),
    multiplePeerSpecificWrongOptionPositions: new Set(peerSpecific
      .map(variant => variant.arms.PEER.stableWrongOptionId).filter(Boolean)).size >= 2,
  };
  const body: Omit<ControlledWrongStateFormationAnalysisV1, "contentHash"> = {
    analysisRef: CONTROLLED_WRONG_STATE_FORMATION_ANALYSIS_V1,
    planHash: input.plan.contentHash,
    runHash: input.run.contentHash,
    scientificRole: "engineering_development_canary_only",
    variants,
    summary: {
      attemptedVariants: 8,
      eligibleVariants: variants.filter(variant => variant.eligibleAtX0).length,
      peerStableWrongVariants: variants.filter(variant =>
        variant.arms.PEER.stableWrongFormation).length,
      isolatedStableWrongVariants: variants.filter(variant =>
        variant.arms.ISOLATED.stableWrongFormation).length,
      peerSpecificVariants: peerSpecific.length,
      isolatedSpecificVariants: variants.filter(variant =>
        variant.pairedDirection === "ISOLATED").length,
      discordantVariants: variants.filter(variant =>
        variant.pairedDirection === "PEER" || variant.pairedDirection === "ISOLATED").length,
      peerDirectionClusters: clusterDirections.filter(direction => direction === "PEER").length,
      isolatedDirectionClusters: clusterDirections.filter(direction => direction === "ISOLATED").length,
      mirrorConflictClusters: clusterDirections.filter(direction => direction === "CONFLICT").length,
      peerSpecificWrongOptionPositionCount: new Set(peerSpecific
        .map(variant => variant.arms.PEER.stableWrongOptionId).filter(Boolean)).size,
    },
    advancement: {
      decision: Object.values(checks).every(Boolean) ? "GO_REPLICATE" : "NO_GO_REVISE",
      checks,
    },
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyControlledWrongStateFormationAnalysisV1(input: {
  plan: ControlledWrongStateFormationPlanV1;
  run: ControlledWrongStateFormationRunV1;
  analysis: ControlledWrongStateFormationAnalysisV1;
}): void {
  const expected = analyzeControlledWrongStateFormationV1({ plan: input.plan, run: input.run });
  if (input.analysis.contentHash !== hashCollectiveDynamicsValueV1(withoutHash(input.analysis))
    || JSON.stringify(input.analysis) !== JSON.stringify(expected)) {
    throw new Error("controlled_formation_analysis_replay_mismatch");
  }
}

