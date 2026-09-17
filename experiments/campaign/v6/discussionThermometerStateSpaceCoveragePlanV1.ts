import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";

export const DISCUSSION_THERMOMETER_STATE_SPACE_COVERAGE_PLAN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-state-space-coverage-plan",
  version: "1.0.0",
});

export type DiscussionThermometerDesignRegimeV1 =
  | "DISTRIBUTED_COMPLEMENTARY"
  | "SHARED_CUE_PRIVATE_CORRECTION"
  | "POLARIZED_PRIVATE_BLOCKS"
  | "ASYMMETRIC_INFORMED_MINORITY";

export interface DiscussionThermometerStateSpaceCoveragePreflightV1 {
  planRef: typeof DISCUSSION_THERMOMETER_STATE_SPACE_COVERAGE_PLAN_V1;
  scientificRole: "observation_only_state_space_calibration";
  enginePolicy: {
    implementation: "reuse_collective_dynamics_trajectory_engine";
    newDiscussionEngine: false;
    checkpoints: readonly ["X0", "X1", "X2"];
    publicDiscussionRounds: 2;
    agentsPerVariant: 4;
    optionsPerTask: 3;
    sensorExecution: "prefix_snapshot_immediate_or_exact_shadow_replay";
    sensorWriteback: "none";
    truthAccess: "none";
  };
  design: {
    baseScenarioCount: 2;
    regimes: Array<{
      id: DiscussionThermometerDesignRegimeV1;
      allocationRule: string;
      intendedChallenge: string;
      forbiddenPromptShortcut: string;
    }>;
    registeredVariantCount: 8;
    inclusionPolicy: "all_registered_variants_remain_in_denominator";
    stateLabelPolicy: "labels_come_from_observed_readings_not_design_regime";
  };
  sensorSchedule: {
    primaryReportsPerCheckpoint: 4;
    exactDuplicateReportsPerCheckpoint: 4;
    duplicatePurpose: "estimate_same_snapshot_sensor_repeatability";
    duplicateCentrality: "quality_channel_not_state_definition";
  };
  callBudget: {
    publicCallsPerVariant: 8;
    primarySensorCallsPerVariant: 12;
    duplicateSensorCallsPerVariant: 12;
    totalCallsPerVariant: 32;
    registeredVariants: 8;
    totalFrozenCalls: 256;
    providerCallsDuringPreflight: 0;
  };
  prohibitedFeatures: string[];
  reportedWithoutGroundTruth: string[];
  advancementGates: Array<{
    id: string;
    rule: string;
    role: "resource_gate_not_scientific_claim";
  }>;
  predictionRole: "optional_later_coarse_graining_test_not_monitoring_gate";
  readiness: "DEFER_TASK_CONTENT_PENDING_HUMAN_SEMANTIC_REVIEW";
  contentHash: string;
}

const REGIMES: DiscussionThermometerStateSpaceCoveragePreflightV1["design"]["regimes"] = [
  {
    id: "DISTRIBUTED_COMPLEMENTARY",
    allocationRule:
      "Give each agent a different non-redundant observation; do not give any agent the full evidence set.",
    intendedChallenge:
      "Tests whether initially distributed information remains diffuse or becomes integrated during public exchange.",
    forbiddenPromptShortcut:
      "Do not tell agents that their evidence is complementary or that they should pool it.",
  },
  {
    id: "SHARED_CUE_PRIVATE_CORRECTION",
    allocationRule:
      "Give all agents the same plausible cue and distribute distinct observations that can qualify or correct it.",
    intendedChallenge:
      "Tests whether a shared cue produces concentrated agreement despite heterogeneous private qualifications.",
    forbiddenPromptShortcut:
      "Do not label the shared cue misleading and do not identify a corrective option.",
  },
  {
    id: "POLARIZED_PRIVATE_BLOCKS",
    allocationRule:
      "Give two matched agent pairs coherent but opposing evidence blocks while keeping the task jointly resolvable.",
    intendedChallenge:
      "Tests whether pairwise-separated information yields observable polarization or is reconciled through discussion.",
    forbiddenPromptShortcut:
      "Do not ask agents to debate sides, preserve disagreement, or form two camps.",
  },
  {
    id: "ASYMMETRIC_INFORMED_MINORITY",
    allocationRule:
      "Give three agents weak concordant observations and one agent a distinct, stronger but non-conclusive observation.",
    intendedChallenge:
      "Tests whether an information minority changes the belief geometry without assigning it authority.",
    forbiddenPromptShortcut:
      "Do not call the minority expert, correct, contrarian, or privileged.",
  },
];

/**
 * Freeze the smallest observation-only calibration that can test whether the
 * thermometer resolves multiple discussion geometries and non-trivial motion.
 * This function performs no provider call and creates no task content.
 */
export function buildDiscussionThermometerStateSpaceCoveragePreflightV1():
DiscussionThermometerStateSpaceCoveragePreflightV1 {
  const body: Omit<DiscussionThermometerStateSpaceCoveragePreflightV1, "contentHash"> = {
    planRef: DISCUSSION_THERMOMETER_STATE_SPACE_COVERAGE_PLAN_V1,
    scientificRole: "observation_only_state_space_calibration",
    enginePolicy: {
      implementation: "reuse_collective_dynamics_trajectory_engine",
      newDiscussionEngine: false,
      checkpoints: ["X0", "X1", "X2"],
      publicDiscussionRounds: 2,
      agentsPerVariant: 4,
      optionsPerTask: 3,
      sensorExecution: "prefix_snapshot_immediate_or_exact_shadow_replay",
      sensorWriteback: "none",
      truthAccess: "none",
    },
    design: {
      baseScenarioCount: 2,
      regimes: REGIMES.map(regime => ({ ...regime })),
      registeredVariantCount: 8,
      inclusionPolicy: "all_registered_variants_remain_in_denominator",
      stateLabelPolicy: "labels_come_from_observed_readings_not_design_regime",
    },
    sensorSchedule: {
      primaryReportsPerCheckpoint: 4,
      exactDuplicateReportsPerCheckpoint: 4,
      duplicatePurpose: "estimate_same_snapshot_sensor_repeatability",
      duplicateCentrality: "quality_channel_not_state_definition",
    },
    callBudget: {
      publicCallsPerVariant: 8,
      primarySensorCallsPerVariant: 12,
      duplicateSensorCallsPerVariant: 12,
      totalCallsPerVariant: 32,
      registeredVariants: 8,
      totalFrozenCalls: 256,
      providerCallsDuringPreflight: 0,
    },
    prohibitedFeatures: [
      "online_ground_truth_or_resolver_access",
      "sensor_output_written_back_into_discussion",
      "attack_support_random_or_governance_arm",
      "numeric_evidence_scores_or_instruction_to_sum_cards",
      "prompted_consensus_polarization_or_state_label",
      "outcome_based_task_selection_or_post_hoc_exclusion",
      "prediction_success_as_requirement_for_descriptive_monitoring",
    ],
    reportedWithoutGroundTruth: [
      "checkpoint_probability_microstate_P_t",
      "pooled_belief_q_t",
      "mean_individual_uncertainty_U_t",
      "generalized_JSD_J_t_as_derived_disagreement",
      "mean_and_max_pairwise_total_variation",
      "coverage_and_missingness",
      "agent_level_transition_activity",
      "pooled_transition_drift_when_roster_complete",
      "same_snapshot_repeatability_gap",
    ],
    advancementGates: [
      {
        id: "G0_TERMINAL_ACCOUNTING",
        rule: "Every registered public and sensor cell has exactly one explicit terminal or missing status; no silent deletion.",
        role: "resource_gate_not_scientific_claim",
      },
      {
        id: "G1_SENSOR_USABILITY",
        rule: "At least 95% of registered primary reports are valid; all failures remain in coverage denominators.",
        role: "resource_gate_not_scientific_claim",
      },
      {
        id: "G2_STATE_RESOLUTION",
        rule: "For at least 3 of the 6 regime pairs, more than half of matched agents have between-regime X0 primary TV above the maximum of that agent's two same-snapshot duplicate TVs, in both base scenarios.",
        role: "resource_gate_not_scientific_claim",
      },
      {
        id: "G3_LATE_MOTION",
        rule: "At least 2 of the 4 regimes have more than half of replicate-comparable agents with X1-to-X2 primary TV above both endpoint duplicate TVs, in both base scenarios.",
        role: "resource_gate_not_scientific_claim",
      },
    ],
    predictionRole: "optional_later_coarse_graining_test_not_monitoring_gate",
    readiness: "DEFER_TASK_CONTENT_PENDING_HUMAN_SEMANTIC_REVIEW",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyDiscussionThermometerStateSpaceCoveragePreflightV1(
  artifact: DiscussionThermometerStateSpaceCoveragePreflightV1,
): void {
  const expected = buildDiscussionThermometerStateSpaceCoveragePreflightV1();
  if (JSON.stringify(expected) !== JSON.stringify(artifact)) {
    throw new Error("discussion_thermometer_state_space_coverage_preflight_drift");
  }
}
