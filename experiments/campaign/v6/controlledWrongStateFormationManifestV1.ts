/** Frozen development-only authority for the first controlled formation canary. */
import {
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  CONTROLLED_WRONG_STATE_REVIEW_PACKET_V1,
} from "./controlledWrongStateTaskBankV1";
import {
  verifyControlledWrongStateFormationPlanV1,
  type ControlledWrongStateFormationPlanV1,
} from "./controlledWrongStateFormationV1";

export const CONTROLLED_WRONG_STATE_FORMATION_MANIFEST_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.controlled-wrong-state-formation.manifest",
  version: "1.0.0",
});

export interface ControlledWrongStateFormationManifestV1 {
  manifestRef: typeof CONTROLLED_WRONG_STATE_FORMATION_MANIFEST_V1;
  planHash: string;
  taskBankHash: string;
  scientificRole: "engineering_development_canary_only";
  heldoutAuthority: "none";
  humanSemanticReview: "not_completed";
  aiSemanticReview: {
    reviewer: "codex-ai";
    status: "pass_for_development_only";
    reviewedClusterCount: 4;
    structuralLeakageFinding: "hiddenbench_skeleton_overlap_present";
    clusterFindings: Array<{
      clusterId: string;
      verdict: "pass_for_development_only";
      rationale: string;
    }>;
  };
  executionBudget: {
    plannedProviderCalls: 160;
    maximumProviderAttempts: 160;
    maximumCompletionTokensPerCall: 512;
    maximumTotalCompletionTokens: 81920;
    attemptsPerCell: 1;
    retry: "none";
  };
  priceCheck: {
    status: "official_page_unavailable_at_freeze";
    currencyCostClaim: "none";
    comparableHistoricalUsage: {
      artifact: "results/v6_collective_dynamics_peer_bundle_freeze_v1_glm46v_seed1/run.json";
      providerCalls: 152;
      totalTokens: 142205;
    };
  };
  stopPolicy: {
    invalidResponse: "halt";
    providerAuth: "halt";
    providerNetwork: "halt";
    providerRateLimit: "halt";
    providerTimeout: "halt";
    overwrite: "forbidden";
  };
  analysis: {
    initialEligibility: "x0_not_wrong_supermajority_75";
    primaryOutcome: "same_wrong_option_supermajority_75_at_both_postfork_rounds";
    inferenceUnit: "task_cluster";
    mirrorRole: "option_identity_sensitivity_not_independent_cluster";
    advancementRule: "at_least_3_peer_vs_isolated_discordant_variants_and_2_peer_direction_clusters_no_mirror_conflict_multiple_wrong_positions";
  };
  authorization: {
    source: "explicit_user_instruction_in_current_codex_task";
    date: "2026-08-29";
  };
  contentHash: string;
}

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

const CLUSTER_RATIONALES = new Map<string, string>([
  ["cluster:controlled:industrial-cooling",
    "Options are mutually exclusive under the frozen primary-fault stipulation; the shared alarm is plausible but non-dispositive, private cards split the initial constructed tops, and a separately obtainable flow-meter reading supports the frozen outcome."],
  ["cluster:controlled:network-incident",
    "The incident classes are distinct under the primary-incident stipulation; traffic volume is a plausible noisy cue, while token-lineage observations and a separately governed identity audit support credential compromise."],
  ["cluster:controlled:watershed-source",
    "The three drivers can co-occur in nature but are mutually exclusive as frozen primary drivers; the shared chlorophyll cue is plausible, and the isotope assay is a genuinely new source-attribution observation."],
  ["cluster:controlled:shipment-delay",
    "The delay sources are distinct under the frozen primary-delay stipulation; routing evidence plausibly misleads, while document checksum and customs-portal receipt support the frozen outcome."],
]);

export function buildControlledWrongStateFormationManifestV1(
  plan: ControlledWrongStateFormationPlanV1,
): ControlledWrongStateFormationManifestV1 {
  verifyControlledWrongStateFormationPlanV1(plan);
  const clusters = [...new Set(CONTROLLED_WRONG_STATE_REVIEW_PACKET_V1
    .map(review => review.clusterId))];
  const body: Omit<ControlledWrongStateFormationManifestV1, "contentHash"> = {
    manifestRef: CONTROLLED_WRONG_STATE_FORMATION_MANIFEST_V1,
    planHash: plan.contentHash,
    taskBankHash: plan.taskBankHash,
    scientificRole: "engineering_development_canary_only",
    heldoutAuthority: "none",
    humanSemanticReview: "not_completed",
    aiSemanticReview: {
      reviewer: "codex-ai",
      status: "pass_for_development_only",
      reviewedClusterCount: 4,
      structuralLeakageFinding: "hiddenbench_skeleton_overlap_present",
      clusterFindings: clusters.map(clusterId => ({
        clusterId,
        verdict: "pass_for_development_only",
        rationale: CLUSTER_RATIONALES.get(clusterId) ?? "",
      })),
    },
    executionBudget: {
      plannedProviderCalls: 160,
      maximumProviderAttempts: 160,
      maximumCompletionTokensPerCall: 512,
      maximumTotalCompletionTokens: 81920,
      attemptsPerCell: 1,
      retry: "none",
    },
    priceCheck: {
      status: "official_page_unavailable_at_freeze",
      currencyCostClaim: "none",
      comparableHistoricalUsage: {
        artifact: "results/v6_collective_dynamics_peer_bundle_freeze_v1_glm46v_seed1/run.json",
        providerCalls: 152,
        totalTokens: 142205,
      },
    },
    stopPolicy: {
      invalidResponse: "halt",
      providerAuth: "halt",
      providerNetwork: "halt",
      providerRateLimit: "halt",
      providerTimeout: "halt",
      overwrite: "forbidden",
    },
    analysis: {
      initialEligibility: "x0_not_wrong_supermajority_75",
      primaryOutcome: "same_wrong_option_supermajority_75_at_both_postfork_rounds",
      inferenceUnit: "task_cluster",
      mirrorRole: "option_identity_sensitivity_not_independent_cluster",
      advancementRule: "at_least_3_peer_vs_isolated_discordant_variants_and_2_peer_direction_clusters_no_mirror_conflict_multiple_wrong_positions",
    },
    authorization: {
      source: "explicit_user_instruction_in_current_codex_task",
      date: "2026-08-29",
    },
  };
  const manifest = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyControlledWrongStateFormationManifestV1({ plan, manifest });
  return structuredClone(manifest);
}

export function verifyControlledWrongStateFormationManifestV1(input: {
  plan: ControlledWrongStateFormationPlanV1;
  manifest: ControlledWrongStateFormationManifestV1;
}): void {
  verifyControlledWrongStateFormationPlanV1(input.plan);
  const manifest = input.manifest;
  if (manifest.planHash !== input.plan.contentHash
    || manifest.taskBankHash !== input.plan.taskBankHash
    || manifest.scientificRole !== "engineering_development_canary_only"
    || manifest.heldoutAuthority !== "none"
    || manifest.humanSemanticReview !== "not_completed"
    || manifest.aiSemanticReview.reviewedClusterCount !== 4
    || manifest.aiSemanticReview.clusterFindings.length !== 4
    || manifest.aiSemanticReview.clusterFindings.some(finding => !finding.rationale)
    || manifest.executionBudget.plannedProviderCalls !== input.plan.plannedProviderCalls
    || manifest.executionBudget.maximumProviderAttempts !== 160
    || manifest.executionBudget.maximumTotalCompletionTokens !== 160 * 512
    || manifest.executionBudget.attemptsPerCell !== 1
    || manifest.executionBudget.retry !== "none"
    || hashCollectiveDynamicsValueV1(withoutHash(manifest)) !== manifest.contentHash) {
    throw new Error("controlled_formation_manifest_invalid");
  }
}

