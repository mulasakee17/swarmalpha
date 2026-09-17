import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  buildDiscussionThermometerNaturalDynamicsTransportPlanV1,
  verifyDiscussionThermometerNaturalDynamicsTransportPlanV1,
  type DiscussionThermometerNaturalDynamicsTransportPlanV1,
} from "./discussionThermometerNaturalDynamicsTransportPlanV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_MANIFEST_V1 =
  Object.freeze({
    id: "swarmalpha.manifest.v6.discussion-thermometer-natural-dynamics-transport",
    version: "1.0.0",
  });

export interface DiscussionThermometerNaturalDynamicsTransportManifestV1 {
  manifestRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_MANIFEST_V1;
  planHash: string;
  providerBudget: {
    model: "zhipu:glm-4.6v"; publicCalls: 64; sensorCalls: 160;
    maximumTotalCalls: 224; maximumCompletionTokens: 73728; retry: "none";
  };
  executionPolicy: {
    phaseOrder: ["public", "freeze", "sensor", "offline_analysis"];
    attemptsPerCell: 1;
    backgroundExecution: "forbidden";
    overwrite: "forbidden";
    haltOnAnyFailure: true;
    sameBatchRequired: true;
  };
  scientificBoundary: {
    onlineTruthAccess: "none";
    sensorWriteback: "none";
    taskSelectionStatus: "prospective_before_transport_provider_observation";
    claimCeiling: "engineering_mock_only_custom_tasks_rejected_for_scientific_transport";
  };
  executionAuthority: "none";
  contentHash: string;
}

export function buildDiscussionThermometerNaturalDynamicsTransportManifestV1(
  plan = buildDiscussionThermometerNaturalDynamicsTransportPlanV1(),
): DiscussionThermometerNaturalDynamicsTransportManifestV1 {
  verifyDiscussionThermometerNaturalDynamicsTransportPlanV1(plan);
  const body: Omit<DiscussionThermometerNaturalDynamicsTransportManifestV1,
  "contentHash"> = {
    manifestRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_MANIFEST_V1,
    planHash: plan.contentHash,
    providerBudget: {
      model: "zhipu:glm-4.6v",
      publicCalls: 64,
      sensorCalls: 160,
      maximumTotalCalls: 224,
      maximumCompletionTokens: 73728,
      retry: "none",
    },
    executionPolicy: {
      phaseOrder: ["public", "freeze", "sensor", "offline_analysis"],
      attemptsPerCell: 1,
      backgroundExecution: "forbidden",
      overwrite: "forbidden",
      haltOnAnyFailure: true,
      sameBatchRequired: true,
    },
    scientificBoundary: {
      onlineTruthAccess: "none",
      sensorWriteback: "none",
      taskSelectionStatus: "prospective_before_transport_provider_observation",
      claimCeiling: "engineering_mock_only_custom_tasks_rejected_for_scientific_transport",
    },
    executionAuthority: "none",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerNaturalDynamicsTransportManifestV1(
  manifest: DiscussionThermometerNaturalDynamicsTransportManifestV1,
  plan?: DiscussionThermometerNaturalDynamicsTransportPlanV1,
): void {
  const expected = buildDiscussionThermometerNaturalDynamicsTransportManifestV1(plan);
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) {
    throw new Error("natural_dynamics_transport_manifest_invalid");
  }
}
