import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  buildDiscussionThermometerStateSpaceCalibrationPlanV1,
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1,
} from "./discussionThermometerStateSpaceCalibrationPlanV1";
import { buildDiscussionThermometerStateSpaceCalibrationReviewV1 } from
  "./discussionThermometerStateSpaceCalibrationReviewV1";

export const DISCUSSION_THERMOMETER_STATE_SPACE_EXECUTION_MANIFEST_V1 = Object.freeze({
  id: "swarmalpha.manifest.v6.discussion-thermometer-state-space-calibration",
  version: "1.0.0",
});

export interface DiscussionThermometerStateSpaceExecutionManifestV1 {
  manifestRef: typeof DISCUSSION_THERMOMETER_STATE_SPACE_EXECUTION_MANIFEST_V1;
  planHash: string;
  reviewHash: string;
  acceptedAt: "2026-08-30";
  authority: "explicit_user_acceptance_in_current_codex_task";
  semanticAcceptance: {
    status: "ACCEPTED_DEVELOPMENT_ONLY";
    scope: "two_fictional_bases_eight_qualitative_information_allocations";
  };
  providerBudget: {
    model: "zhipu:glm-4.6v";
    publicCalls: 64;
    sensorCalls: 192;
    maximumTotalCalls: 256;
    maximumCompletionTokens: 81920;
    retry: "none";
  };
  executionPolicy: {
    phaseOrder: ["public", "freeze", "sensor", "offline_analysis"];
    attemptsPerCell: 1;
    backgroundExecution: "forbidden";
    overwrite: "forbidden";
    haltOnAnyFailure: true;
    attemptLedger: "append_before_and_after_each_provider_call";
  };
  scientificBoundary: {
    onlineTruthAccess: "none";
    sensorWriteback: "none";
    crossRegimeCausalAuthority: "none";
    claimCeiling: "development_only_observation_resource_gate";
  };
  contentHash: string;
}

export function buildDiscussionThermometerStateSpaceExecutionManifestV1():
DiscussionThermometerStateSpaceExecutionManifestV1 {
  const plan = buildDiscussionThermometerStateSpaceCalibrationPlanV1();
  const review = buildDiscussionThermometerStateSpaceCalibrationReviewV1(plan);
  const body: Omit<DiscussionThermometerStateSpaceExecutionManifestV1, "contentHash"> = {
    manifestRef: DISCUSSION_THERMOMETER_STATE_SPACE_EXECUTION_MANIFEST_V1,
    planHash: plan.contentHash,
    reviewHash: review.contentHash,
    acceptedAt: "2026-08-30",
    authority: "explicit_user_acceptance_in_current_codex_task",
    semanticAcceptance: {
      status: "ACCEPTED_DEVELOPMENT_ONLY",
      scope: "two_fictional_bases_eight_qualitative_information_allocations",
    },
    providerBudget: {
      model: "zhipu:glm-4.6v",
      publicCalls: 64,
      sensorCalls: 192,
      maximumTotalCalls: 256,
      maximumCompletionTokens: 81920,
      retry: "none",
    },
    executionPolicy: {
      phaseOrder: ["public", "freeze", "sensor", "offline_analysis"],
      attemptsPerCell: 1,
      backgroundExecution: "forbidden",
      overwrite: "forbidden",
      haltOnAnyFailure: true,
      attemptLedger: "append_before_and_after_each_provider_call",
    },
    scientificBoundary: {
      onlineTruthAccess: "none",
      sensorWriteback: "none",
      crossRegimeCausalAuthority: "none",
      claimCeiling: "development_only_observation_resource_gate",
    },
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerStateSpaceExecutionManifestV1(
  manifest: DiscussionThermometerStateSpaceExecutionManifestV1,
): void {
  const plan = buildDiscussionThermometerStateSpaceCalibrationPlanV1();
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1(plan);
  const expected = buildDiscussionThermometerStateSpaceExecutionManifestV1();
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) {
    throw new Error("thermometer_state_space_execution_manifest_invalid");
  }
}
