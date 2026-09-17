import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  DISCUSSION_THERMOMETER_STATE_SPACE_TASK_BANK_V1,
  projectDiscussionThermometerCoverageOnlineTaskV1,
  type DiscussionThermometerCoverageEvidenceV1,
  type DiscussionThermometerCoverageTaskV1,
} from "./discussionThermometerStateSpaceTaskBankV1";
import type { DiscussionThermometerDesignRegimeV1 } from
  "./discussionThermometerStateSpaceCoveragePlanV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASK_BANK_V1 =
  Object.freeze({
    id: "swarmalpha.experiment.v6.discussion-thermometer-natural-dynamics-transport-task-bank",
    version: "1.0.0",
    scientificStatus: "engineering_mock_only_rejected_for_transport_evidence",
  });

type EvidencePair = [DiscussionThermometerCoverageEvidenceV1,
  DiscussionThermometerCoverageEvidenceV1];

const AGENTS = ["agent_1", "agent_2", "agent_3", "agent_4"] as const;

function evidence(evidenceId: string, sourceId: string, lineageId: string,
  statement: string): DiscussionThermometerCoverageEvidenceV1 {
  return { evidenceId, sourceId, lineageId, statement };
}

function transportTask(input: {
  taskId: string;
  baseScenarioId: "backup-power" | "aerial-navigation";
  designRegime: Extract<DiscussionThermometerDesignRegimeV1,
    "SHARED_CUE_PRIVATE_CORRECTION" | "POLARIZED_PRIVATE_BLOCKS">;
  publicContext: string;
  proposition: string;
  options: DiscussionThermometerCoverageTaskV1["claim"]["options"];
  latentOutcomeOptionId: "opt_1" | "opt_2" | "opt_3";
  evidenceByAgent: [EvidencePair, EvidencePair, EvidencePair, EvidencePair];
}): DiscussionThermometerCoverageTaskV1 {
  const body: Omit<DiscussionThermometerCoverageTaskV1,
  "schemaRef" | "contentHash" | "baseScenarioId"> & {
    baseScenarioId: DiscussionThermometerCoverageTaskV1["baseScenarioId"];
  } = {
    taskId: input.taskId,
    // The existing schema has a closed development-only scenario union. The
    // transport bank keeps the same wire shape while its own verifier owns the
    // new scenario identity; online projections never expose this field.
    baseScenarioId: input.baseScenarioId as DiscussionThermometerCoverageTaskV1["baseScenarioId"],
    designRegime: input.designRegime,
    publicContext: input.publicContext,
    claim: {
      claimId: `claim:transport:${input.baseScenarioId}`,
      proposition: input.proposition,
      options: input.options.map(option => ({ ...option })),
    },
    agents: AGENTS.map((agentId, index) => ({
      agentId,
      privateEvidence: input.evidenceByAgent[index].map(item => ({ ...item })) as EvidencePair,
    })),
    offlineDesignRecord: {
      latentOutcomeOptionId: input.latentOutcomeOptionId,
      role: "semantic_coherence_review_only_not_monitor_input",
      causalComparisonAcrossRegimes: "not_authorized",
    },
    humanSemanticReview: "PENDING",
  };
  return {
    schemaRef: DISCUSSION_THERMOMETER_STATE_SPACE_TASK_BANK_V1,
    ...body,
    contentHash: hashCollectiveDynamicsValueV1(body),
  };
}

const BACKUP_CONTEXT = [
  "A remote facility's battery-backed power unit shows one primary anomaly. Determine which listed cause best explains the supplied observations.",
  "The service guide says battery aging usually combines reduced measured capacity, increased internal resistance, and voltage sag under an ordinary load. A persistent parasitic load usually leaves battery health tests ordinary but produces a continuous independently measured background draw. A current-sensor offset usually creates disagreement between the electronic current channel and an external clamp meter while physical runtime and voltage behavior remain ordinary.",
  "Every observation is fallible. A single observation is not conclusive, and source identity is not statistical independence.",
].join("\n\n");

const NAVIGATION_CONTEXT = [
  "An autonomous survey drone shows one primary navigation anomaly. Determine which listed cause best explains the supplied observations.",
  "The flight guide says magnetic-compass interference usually distorts heading while independent position and inertial motion remain coherent. GPS multipath usually creates position jumps near reflective structures while compass and inertial heading agree. Actuator imbalance usually creates persistent yaw under level-flight commands together with unequal motor current, without isolated position jumps.",
  "Every observation is fallible. A single observation is not conclusive, and source identity is not statistical independence.",
].join("\n\n");

const BACKUP_OPTIONS: DiscussionThermometerCoverageTaskV1["claim"]["options"] = [
  { optionId: "opt_1", label: "battery aging" },
  { optionId: "opt_2", label: "persistent parasitic load" },
  { optionId: "opt_3", label: "current-sensor offset" },
];
const NAVIGATION_OPTIONS: DiscussionThermometerCoverageTaskV1["claim"]["options"] = [
  { optionId: "opt_1", label: "magnetic-compass interference" },
  { optionId: "opt_2", label: "GPS multipath" },
  { optionId: "opt_3", label: "actuator imbalance" },
];

const sharedBackupAlert =
  "The central dashboard flagged an unexplained continuous background load.";
const sharedNavigationAlert =
  "The flight dashboard flagged a possible actuator-balance problem.";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1 =
  Object.freeze([
    transportTask({
      taskId: "thermometer-transport:backup-power:q1",
      baseScenarioId: "backup-power",
      designRegime: "SHARED_CUE_PRIVATE_CORRECTION",
      publicContext: BACKUP_CONTEXT,
      proposition: "Which primary cause generated the backup-power anomaly?",
      options: BACKUP_OPTIONS,
      latentOutcomeOptionId: "opt_1",
      evidenceByAgent: [
        [evidence("bp-sc-1a", "central-dashboard", "dashboard-lineage", sharedBackupAlert), evidence("bp-sc-1b", "capacity-tester", "capacity-test-lineage", "A controlled discharge test measured substantially less usable capacity than the unit's rated baseline.")],
        [evidence("bp-sc-2a", "central-dashboard", "dashboard-lineage", sharedBackupAlert), evidence("bp-sc-2b", "load-step-recorder", "voltage-response-lineage", "An ordinary load step produced a deeper voltage sag than the maintenance reference.")],
        [evidence("bp-sc-3a", "central-dashboard", "dashboard-lineage", sharedBackupAlert), evidence("bp-sc-3b", "impedance-meter", "impedance-test-lineage", "An independent impedance test found internal resistance above the service limit.")],
        [evidence("bp-sc-4a", "central-dashboard", "dashboard-lineage", sharedBackupAlert), evidence("bp-sc-4b", "clamp-meter", "external-current-lineage", "An external clamp meter did not reproduce the dashboard's claimed continuous background draw.")],
      ],
    }),
    transportTask({
      taskId: "thermometer-transport:backup-power:q2",
      baseScenarioId: "backup-power",
      designRegime: "POLARIZED_PRIVATE_BLOCKS",
      publicContext: BACKUP_CONTEXT,
      proposition: "Which primary cause generated the backup-power anomaly?",
      options: BACKUP_OPTIONS,
      latentOutcomeOptionId: "opt_1",
      evidenceByAgent: [
        [evidence("bp-pb-1a", "capacity-brief-a", "capacity-brief-lineage", "A capacity brief reported substantially reduced usable capacity."), evidence("bp-pb-1b", "impedance-brief-a", "impedance-brief-lineage", "An impedance brief reported internal resistance above the service limit.")],
        [evidence("bp-pb-2a", "capacity-brief-a", "capacity-brief-lineage", "A capacity brief reported substantially reduced usable capacity."), evidence("bp-pb-2b", "impedance-brief-a", "impedance-brief-lineage", "An impedance brief reported internal resistance above the service limit.")],
        [evidence("bp-pb-3a", "sensor-brief-b", "sensor-brief-lineage", "A sensor brief reported that the electronic current channel showed a draw that an external clamp meter did not reproduce."), evidence("bp-pb-3b", "runtime-brief-b", "runtime-brief-lineage", "A runtime brief reported ordinary physical runtime during a short field check.")],
        [evidence("bp-pb-4a", "sensor-brief-b", "sensor-brief-lineage", "A sensor brief reported that the electronic current channel showed a draw that an external clamp meter did not reproduce."), evidence("bp-pb-4b", "runtime-brief-b", "runtime-brief-lineage", "A runtime brief reported ordinary physical runtime during a short field check.")],
      ],
    }),
    transportTask({
      taskId: "thermometer-transport:aerial-navigation:q1",
      baseScenarioId: "aerial-navigation",
      designRegime: "SHARED_CUE_PRIVATE_CORRECTION",
      publicContext: NAVIGATION_CONTEXT,
      proposition: "Which primary cause generated the navigation anomaly?",
      options: NAVIGATION_OPTIONS,
      latentOutcomeOptionId: "opt_2",
      evidenceByAgent: [
        [evidence("an-sc-1a", "flight-dashboard", "dashboard-lineage", sharedNavigationAlert), evidence("an-sc-1b", "position-log", "position-lineage", "Position estimates jumped only when the drone passed beside a reflective warehouse wall.")],
        [evidence("an-sc-2a", "flight-dashboard", "dashboard-lineage", sharedNavigationAlert), evidence("an-sc-2b", "heading-comparison", "heading-lineage", "Compass and inertial heading agreed while the reported position jumped.")],
        [evidence("an-sc-3a", "flight-dashboard", "dashboard-lineage", sharedNavigationAlert), evidence("an-sc-3b", "motor-current-log", "motor-current-lineage", "Motor currents remained balanced during the position excursions.")],
        [evidence("an-sc-4a", "flight-dashboard", "dashboard-lineage", sharedNavigationAlert), evidence("an-sc-4b", "open-field-check", "environment-check-lineage", "The position jumps disappeared during an open-field repeat away from reflective structures.")],
      ],
    }),
    transportTask({
      taskId: "thermometer-transport:aerial-navigation:q2",
      baseScenarioId: "aerial-navigation",
      designRegime: "POLARIZED_PRIVATE_BLOCKS",
      publicContext: NAVIGATION_CONTEXT,
      proposition: "Which primary cause generated the navigation anomaly?",
      options: NAVIGATION_OPTIONS,
      latentOutcomeOptionId: "opt_2",
      evidenceByAgent: [
        [evidence("an-pb-1a", "structure-brief-a", "structure-brief-lineage", "A navigation brief reported position jumps only beside reflective structures."), evidence("an-pb-1b", "heading-brief-a", "heading-brief-lineage", "A heading brief reported compass and inertial agreement during the jumps.")],
        [evidence("an-pb-2a", "structure-brief-a", "structure-brief-lineage", "A navigation brief reported position jumps only beside reflective structures."), evidence("an-pb-2b", "heading-brief-a", "heading-brief-lineage", "A heading brief reported compass and inertial agreement during the jumps.")],
        [evidence("an-pb-3a", "compass-brief-b", "compass-brief-lineage", "A compass brief reported heading distortion near powered equipment."), evidence("an-pb-3b", "position-brief-b", "position-brief-lineage", "A position brief reported otherwise coherent inertial motion during the anomaly.")],
        [evidence("an-pb-4a", "compass-brief-b", "compass-brief-lineage", "A compass brief reported heading distortion near powered equipment."), evidence("an-pb-4b", "position-brief-b", "position-brief-lineage", "A position brief reported otherwise coherent inertial motion during the anomaly.")],
      ],
    }),
  ] as const);

export function verifyDiscussionThermometerNaturalDynamicsTransportTaskBankV1(): void {
  const tasks = DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1;
  if (tasks.length !== 4 || new Set(tasks.map(task => task.taskId)).size !== 4
    || new Set(tasks.map(task => task.claim.claimId)).size !== 2
    || tasks.some(task => task.agents.length !== 4
      || task.agents.some(agent => agent.privateEvidence.length !== 2))) {
    throw new Error("natural_dynamics_transport_task_bank_invalid");
  }
  tasks.forEach(task => {
    const { schemaRef: _schemaRef, contentHash, ...body } = task;
    if (contentHash !== hashCollectiveDynamicsValueV1(body)) {
      throw new Error("natural_dynamics_transport_task_hash_invalid");
    }
    const online = projectDiscussionThermometerCoverageOnlineTaskV1(task);
    assertCollectiveDynamicsTruthBlindV1(online);
    if (/baseScenario|designRegime|latentOutcome|humanSemanticReview|causalComparison/i
      .test(JSON.stringify(online))) {
      throw new Error("natural_dynamics_transport_online_design_leak");
    }
  });
}
