import { assertCollectiveDynamicsTruthBlindV1, hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import { buildDiscussionThermometerNaturalDynamicsPlanV1, verifyDiscussionThermometerNaturalDynamicsPlanV1, type DiscussionThermometerNaturalDynamicsPlanV1 } from "./discussionThermometerNaturalDynamicsPlanV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_MANIFEST_V1 = Object.freeze({ id: "swarmalpha.manifest.v6.discussion-thermometer-natural-dynamics", version: "1.0.0" });

export interface DiscussionThermometerNaturalDynamicsManifestV1 {
  manifestRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_MANIFEST_V1;
  planHash: string;
  semanticAcceptance: { status: "TARGETED_REPLICATION_DESIGN_ACCEPTED_EXECUTION_PENDING"; scope: "two_base_scenarios_two_target_regimes_four_rounds" };
  providerBudget: { model: "zhipu:glm-4.6v"; publicCalls: 64; sensorCalls: 160; maximumTotalCalls: 224; maximumCompletionTokens: 73728; retry: "none" };
  executionPolicy: { phaseOrder: ["public", "freeze", "sensor", "offline_analysis"]; attemptsPerCell: 1; backgroundExecution: "forbidden"; overwrite: "forbidden"; haltOnAnyFailure: true; attemptLedger: "append_before_and_after_each_provider_call"; sameBatchRequired: true };
  scientificBoundary: { onlineTruthAccess: "none"; sensorWriteback: "none"; crossRegimeCausalAuthority: "none"; predictionUsed: false; actionUsed: false; claimCeiling: string };
  executionAuthority: "none";
  contentHash: string;
}

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> { const { contentHash: _contentHash, ...body } = value; return body; }

export function buildDiscussionThermometerNaturalDynamicsManifestV1(plan = buildDiscussionThermometerNaturalDynamicsPlanV1()): DiscussionThermometerNaturalDynamicsManifestV1 {
  verifyDiscussionThermometerNaturalDynamicsPlanV1(plan);
  const body: Omit<DiscussionThermometerNaturalDynamicsManifestV1, "contentHash"> = {
    manifestRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_MANIFEST_V1,
    planHash: plan.contentHash,
    semanticAcceptance: { status: "TARGETED_REPLICATION_DESIGN_ACCEPTED_EXECUTION_PENDING", scope: "two_base_scenarios_two_target_regimes_four_rounds" },
    providerBudget: { model: "zhipu:glm-4.6v", publicCalls: 64, sensorCalls: 160, maximumTotalCalls: 224, maximumCompletionTokens: 73728, retry: "none" },
    executionPolicy: { phaseOrder: ["public", "freeze", "sensor", "offline_analysis"], attemptsPerCell: 1, backgroundExecution: "forbidden", overwrite: "forbidden", haltOnAnyFailure: true, attemptLedger: "append_before_and_after_each_provider_call", sameBatchRequired: true },
    scientificBoundary: { onlineTruthAccess: "none", sensorWriteback: "none", crossRegimeCausalAuthority: "none", predictionUsed: false, actionUsed: false, claimCeiling: "Targeted same-task natural-trajectory replication only; no transport, dwell-time, hazard, attractor, metastability, intervention, or governance claim." },
    executionAuthority: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerNaturalDynamicsManifestV1(input: DiscussionThermometerNaturalDynamicsManifestV1, plan?: DiscussionThermometerNaturalDynamicsPlanV1): void {
  const expected = buildDiscussionThermometerNaturalDynamicsManifestV1(plan);
  if (JSON.stringify(input) !== JSON.stringify(expected) || hashCollectiveDynamicsValueV1(withoutHash(input)) !== input.contentHash || input.executionAuthority !== "none" || input.providerBudget.maximumTotalCalls !== 224) throw new Error("natural_dynamics_manifest_invalid");
}
