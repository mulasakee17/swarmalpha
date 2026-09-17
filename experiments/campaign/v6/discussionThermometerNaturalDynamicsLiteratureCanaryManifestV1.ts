import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
  type DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryPlanV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_MANIFEST_V1 = Object.freeze({
  id: "swarmalpha.manifest.v6.discussion-thermometer-natural-dynamics-literature-canary",
  version: "1.1.0",
});

export interface DiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1 {
  manifestRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_MANIFEST_V1;
  planHash: string;
  providerBudget: { model: "zhipu:glm-4.6v"; publicCalls: 24; sensorCalls: 60; maximumTotalCalls: 84; maximumCompletionTokens: 27648; retry: "none" };
  executionPolicy: { phaseOrder: ["public", "freeze", "sensor", "offline_analysis"]; attemptsPerCell: 1; backgroundExecution: "forbidden"; overwrite: "forbidden"; haltOnAnyFailure: true; sameBatchRequired: true };
  scientificBoundary: { onlineTruthAccess: "none"; sensorWriteback: "none"; taskSelectionStatus: "official_hiddenbench_manual_adapted_tasks"; claimCeiling: "literature_task_measurement_canary_only" };
  executionAuthority: "none";
  contentHash: string;
}

export function buildDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1(
  plan = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1(),
): DiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1 {
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1(plan);
  const body: Omit<DiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1, "contentHash"> = {
    manifestRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_MANIFEST_V1,
    planHash: plan.contentHash,
    providerBudget: { model: "zhipu:glm-4.6v", publicCalls: 24, sensorCalls: 60, maximumTotalCalls: 84, maximumCompletionTokens: 27648, retry: "none" },
    executionPolicy: { phaseOrder: ["public", "freeze", "sensor", "offline_analysis"], attemptsPerCell: 1, backgroundExecution: "forbidden", overwrite: "forbidden", haltOnAnyFailure: true, sameBatchRequired: true },
    scientificBoundary: { onlineTruthAccess: "none", sensorWriteback: "none", taskSelectionStatus: "official_hiddenbench_manual_adapted_tasks", claimCeiling: "literature_task_measurement_canary_only" },
    executionAuthority: "none",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1(
  manifest: DiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1,
  plan?: DiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
): void {
  const expected = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1(plan);
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) {
    throw new Error("natural_dynamics_literature_canary_manifest_invalid");
  }
}
