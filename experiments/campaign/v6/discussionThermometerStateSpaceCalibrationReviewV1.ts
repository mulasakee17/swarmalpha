import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1,
  type DiscussionThermometerStateSpaceCalibrationPlanV1,
} from "./discussionThermometerStateSpaceCalibrationPlanV1";
import {
  DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1,
  projectDiscussionThermometerCoverageOnlineTaskV1,
  verifyDiscussionThermometerStateSpaceTaskBankV1,
} from "./discussionThermometerStateSpaceTaskBankV1";

export const DISCUSSION_THERMOMETER_STATE_SPACE_REVIEW_V1 = Object.freeze({
  id: "swarmalpha.review.v6.discussion-thermometer-state-space-calibration",
  version: "1.0.0",
});

export interface DiscussionThermometerStateSpaceCalibrationReviewV1 {
  reviewRef: typeof DISCUSSION_THERMOMETER_STATE_SPACE_REVIEW_V1;
  planHash: string;
  taskBankHash: string;
  providerCalls: 0;
  taskReviews: Array<{
    taskId: string;
    automaticChecks: {
      fourAgentsTwoItemsEach: boolean;
      noDirectDesignLabelLeak: boolean;
      noNumericScoreOrSummationInstruction: boolean;
      noExactOptionLabelInPrivateEvidence: boolean;
      onlineProjectionExcludesOfflineOutcome: boolean;
      sourceGeometryMatchesRegime: boolean;
    };
    privateInformationCharacterRange: { minimum: number; maximum: number };
    automaticStatus: "PASS" | "FAIL";
  }>;
  baseScenarioReviews: Array<{
    baseScenarioId: string;
    publicContextInvariantAcrossRegimes: boolean;
    claimInvariantAcrossRegimes: boolean;
    aiSemanticAssessment: "PLAUSIBLE_FOR_DEVELOPMENT_ONLY";
    unresolvedHumanQuestion: string;
  }>;
  executionBudget: {
    publicCalls: 64;
    sensorCalls: 192;
    totalCalls: 256;
    maximumCompletionTokens: 81920;
    officialPriceCheck: {
      checkedAt: "2026-08-30";
      source: "https://bigmodel.cn/pricing";
      inputCnyPerMillionTokensBelow32k: 1;
      outputCnyPerMillionTokensBelow32k: 3;
    };
    completionOnlyCeilingCny: 0.24576;
    totalCostStatus: "REQUIRES_FROZEN_PROMPT_TOKEN_OR_CONSERVATIVE_BYTE_AUDIT";
    retry: "none";
  };
  scientificBoundaries: string[];
  requiredUserDecisions: Array<{
    id: "D1_SEMANTIC_ACCEPTANCE" | "D2_PROVIDER_BUDGET";
    question: string;
    currentStatus: "PENDING";
  }>;
  automaticChecksPass: boolean;
  readyForUserDecision: boolean;
  executionReady: false;
  contentHash: string;
}

function privateLengths(taskId: string): number[] {
  const task = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.find(value =>
    value.taskId === taskId)!;
  return projectDiscussionThermometerCoverageOnlineTaskV1(task).agents
    .map(agent => agent.privateInformation.length);
}

export function buildDiscussionThermometerStateSpaceCalibrationReviewV1(
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1,
): DiscussionThermometerStateSpaceCalibrationReviewV1 {
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1(plan);
  verifyDiscussionThermometerStateSpaceTaskBankV1();
  const taskReviews = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.map(task => {
    const online = projectDiscussionThermometerCoverageOnlineTaskV1(task);
    const serialized = JSON.stringify(online);
    const privateText = online.agents.map(agent => agent.privateInformation).join("\n");
    const exactOptionLeak = task.claim.options.some(option =>
      privateText.toLowerCase().includes(option.label.toLowerCase()));
    const sourceCounts = new Map<string, number>();
    task.agents.flatMap(agent => agent.privateEvidence).forEach(item =>
      sourceCounts.set(item.sourceId, (sourceCounts.get(item.sourceId) ?? 0) + 1));
    const actualSourcePattern = [...sourceCounts.values()].sort((a, b) => b - a);
    const expectedSourcePattern = task.designRegime === "DISTRIBUTED_COMPLEMENTARY"
      ? [1, 1, 1, 1, 1, 1, 1, 1]
      : task.designRegime === "SHARED_CUE_PRIVATE_CORRECTION" ? [4, 1, 1, 1, 1]
        : task.designRegime === "POLARIZED_PRIVATE_BLOCKS" ? [2, 2, 2, 2]
          : [3, 3, 1, 1];
    const checks = {
      fourAgentsTwoItemsEach: task.agents.length === 4
        && task.agents.every(agent => agent.privateEvidence.length === 2),
      noDirectDesignLabelLeak: !serialized.toLowerCase().includes(task.designRegime.toLowerCase())
        && !/designRegime|polarized_private|informed_minority/i.test(serialized),
      noNumericScoreOrSummationInstruction:
        !/scoreByOption|additive score|sum (?:the )?(?:cards|scores)/i.test(serialized),
      noExactOptionLabelInPrivateEvidence: !exactOptionLeak,
      onlineProjectionExcludesOfflineOutcome:
        !/latentOutcome|groundTruth|correctAnswer|"resolver"/i.test(serialized),
      sourceGeometryMatchesRegime:
        JSON.stringify(actualSourcePattern) === JSON.stringify(expectedSourcePattern),
    };
    const lengths = privateLengths(task.taskId);
    return {
      taskId: task.taskId,
      automaticChecks: checks,
      privateInformationCharacterRange: {
        minimum: Math.min(...lengths), maximum: Math.max(...lengths),
      },
      automaticStatus: Object.values(checks).every(Boolean) ? "PASS" as const : "FAIL" as const,
    };
  });
  const baseScenarioReviews = ["thermal-loop", "service-access"].map(baseScenarioId => {
    const tasks = DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1.filter(task =>
      task.baseScenarioId === baseScenarioId);
    return {
      baseScenarioId,
      publicContextInvariantAcrossRegimes: new Set(tasks.map(task => task.publicContext)).size === 1,
      claimInvariantAcrossRegimes: new Set(tasks.map(task => JSON.stringify(task.claim))).size === 1,
      aiSemanticAssessment: "PLAUSIBLE_FOR_DEVELOPMENT_ONLY" as const,
      unresolvedHumanQuestion:
        "Does a domain-competent reviewer accept the three primary-cause options and every qualitative observation as coherent without relying on unstated outside knowledge?",
    };
  });
  const automaticChecksPass = taskReviews.every(review => review.automaticStatus === "PASS")
    && baseScenarioReviews.every(review => review.publicContextInvariantAcrossRegimes
      && review.claimInvariantAcrossRegimes);
  const body: Omit<DiscussionThermometerStateSpaceCalibrationReviewV1, "contentHash"> = {
    reviewRef: DISCUSSION_THERMOMETER_STATE_SPACE_REVIEW_V1,
    planHash: plan.contentHash,
    taskBankHash: plan.taskBankHash,
    providerCalls: 0,
    taskReviews,
    baseScenarioReviews,
    executionBudget: {
      publicCalls: 64,
      sensorCalls: 192,
      totalCalls: 256,
      maximumCompletionTokens: 81920,
      officialPriceCheck: {
        checkedAt: "2026-08-30",
        source: "https://bigmodel.cn/pricing",
        inputCnyPerMillionTokensBelow32k: 1,
        outputCnyPerMillionTokensBelow32k: 3,
      },
      completionOnlyCeilingCny: 0.24576,
      totalCostStatus: "REQUIRES_FROZEN_PROMPT_TOKEN_OR_CONSERVATIVE_BYTE_AUDIT",
      retry: "none",
    },
    scientificBoundaries: [
      "Design regimes are environments for state-space coverage, not observed state labels.",
      "Across-regime contrasts do not identify a causal information-allocation effect.",
      "Primary self-report defines the operational state; duplicate reports only quantify instrument variability.",
      "The experiment contains no prediction target, intervention, recovery, governance action, or online outcome access.",
      "Passing G0-G3 supports measurement resource on these tasks, not a universal latent belief or thermodynamic law.",
    ],
    requiredUserDecisions: [
      {
        id: "D1_SEMANTIC_ACCEPTANCE",
        question: "Accept these two fictional diagnostic bases and their eight qualitative evidence allocations for a development-only observation canary, or request revisions?",
        currentStatus: "PENDING",
      },
      {
        id: "D2_PROVIDER_BUDGET",
        question: "After an official price recheck, authorize at most 256 single-attempt GLM calls with no retry, or reduce the design?",
        currentStatus: "PENDING",
      },
    ],
    automaticChecksPass,
    readyForUserDecision: automaticChecksPass,
    executionReady: false,
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}
