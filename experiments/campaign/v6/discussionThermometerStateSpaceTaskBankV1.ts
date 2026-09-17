import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import type { DiscussionThermometerDesignRegimeV1 } from
  "./discussionThermometerStateSpaceCoveragePlanV1";

export const DISCUSSION_THERMOMETER_STATE_SPACE_TASK_BANK_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.discussion-thermometer-state-space-task-bank",
  version: "1.0.0",
});

export interface DiscussionThermometerCoverageEvidenceV1 {
  evidenceId: string;
  sourceId: string;
  lineageId: string;
  statement: string;
}

export interface DiscussionThermometerCoverageTaskV1 {
  schemaRef: typeof DISCUSSION_THERMOMETER_STATE_SPACE_TASK_BANK_V1;
  taskId: string;
  baseScenarioId: "thermal-loop" | "service-access";
  designRegime: DiscussionThermometerDesignRegimeV1;
  publicContext: string;
  claim: {
    claimId: string;
    proposition: string;
    options: Array<{ optionId: "opt_1" | "opt_2" | "opt_3"; label: string }>;
  };
  agents: Array<{
    agentId: "agent_1" | "agent_2" | "agent_3" | "agent_4";
    privateEvidence: [DiscussionThermometerCoverageEvidenceV1,
      DiscussionThermometerCoverageEvidenceV1];
  }>;
  offlineDesignRecord: {
    latentOutcomeOptionId: "opt_1" | "opt_2" | "opt_3";
    role: "semantic_coherence_review_only_not_monitor_input";
    causalComparisonAcrossRegimes: "not_authorized";
  };
  humanSemanticReview: "PENDING";
  contentHash: string;
}

export interface DiscussionThermometerCoverageOnlineTaskV1 {
  taskId: string;
  publicContext: string;
  claim: DiscussionThermometerCoverageTaskV1["claim"];
  agents: Array<{ agentId: string; privateInformation: string }>;
}

type EvidenceTuple = [DiscussionThermometerCoverageEvidenceV1,
  DiscussionThermometerCoverageEvidenceV1];

const AGENT_IDS = ["agent_1", "agent_2", "agent_3", "agent_4"] as const;

const THERMAL_CONTEXT = [
  "A sealed industrial cooling loop has one primary fault. Determine which listed fault best explains the supplied observations.",
  "The service guide says a coolant-flow restriction usually combines weak downstream flow with increased pump effort. Heat-exchanger fouling usually preserves circuit flow while heat rejection worsens and exchanger surface gradients rise. A temperature-sensor offset usually creates disagreement between electronic temperature channels and independent physical proxies while hydraulic signs remain ordinary.",
  "Every observation is fallible. A single observation is not conclusive, and no source identity should be treated as statistical independence without further evidence.",
].join("\n\n");

const SERVICE_CONTEXT = [
  "A customer-facing service has one primary access failure. Determine which listed failure best explains the supplied observations.",
  "The operations guide says credential replay usually produces valid-token use from unfamiliar origins and identity-specific access anomalies. A routing loop usually produces repeating hop patterns and loss of packet lifetime while service capacity remains ordinary. Capacity saturation usually produces broad queue growth and high resource use across many legitimate sessions without a repeating path signature.",
  "Every observation is fallible. A single observation is not conclusive, and no source identity should be treated as statistical independence without further evidence.",
].join("\n\n");

function evidence(
  evidenceId: string,
  sourceId: string,
  lineageId: string,
  statement: string,
): DiscussionThermometerCoverageEvidenceV1 {
  return { evidenceId, sourceId, lineageId, statement };
}

function task(input: {
  baseScenarioId: DiscussionThermometerCoverageTaskV1["baseScenarioId"];
  designRegime: DiscussionThermometerDesignRegimeV1;
  publicContext: string;
  proposition: string;
  options: DiscussionThermometerCoverageTaskV1["claim"]["options"];
  latentOutcomeOptionId: DiscussionThermometerCoverageTaskV1["offlineDesignRecord"]["latentOutcomeOptionId"];
  evidenceByAgent: [EvidenceTuple, EvidenceTuple, EvidenceTuple, EvidenceTuple];
}): DiscussionThermometerCoverageTaskV1 {
  const opaqueVariant = ({
    DISTRIBUTED_COMPLEMENTARY: "v1",
    SHARED_CUE_PRIVATE_CORRECTION: "v2",
    POLARIZED_PRIVATE_BLOCKS: "v3",
    ASYMMETRIC_INFORMED_MINORITY: "v4",
  } as const)[input.designRegime];
  const taskId = `thermometer-calibration:${input.baseScenarioId}:${opaqueVariant}`;
  const body: Omit<DiscussionThermometerCoverageTaskV1, "schemaRef" | "contentHash"> = {
    taskId,
    baseScenarioId: input.baseScenarioId,
    designRegime: input.designRegime,
    publicContext: input.publicContext,
    claim: {
      claimId: `claim:${input.baseScenarioId}`,
      proposition: input.proposition,
      options: input.options.map(option => ({ ...option })),
    },
    agents: AGENT_IDS.map((agentId, index) => ({
      agentId,
      privateEvidence: input.evidenceByAgent[index].map(item => ({ ...item })) as EvidenceTuple,
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

const THERMAL_OPTIONS: DiscussionThermometerCoverageTaskV1["claim"]["options"] = [
  { optionId: "opt_1", label: "coolant-flow restriction" },
  { optionId: "opt_2", label: "heat-exchanger fouling" },
  { optionId: "opt_3", label: "temperature-sensor offset" },
];

const SERVICE_OPTIONS: DiscussionThermometerCoverageTaskV1["claim"]["options"] = [
  { optionId: "opt_1", label: "credential replay" },
  { optionId: "opt_2", label: "routing loop" },
  { optionId: "opt_3", label: "capacity saturation" },
];

function thermalTasks(): DiscussionThermometerCoverageTaskV1[] {
  const sharedAlert = "The main dashboard flagged reduced heat-exchanger efficiency during the incident.";
  return [
    task({
      baseScenarioId: "thermal-loop", designRegime: "DISTRIBUTED_COMPLEMENTARY",
      publicContext: THERMAL_CONTEXT,
      proposition: "Which primary fault generated the cooling-loop incident?",
      options: THERMAL_OPTIONS, latentOutcomeOptionId: "opt_1",
      evidenceByAgent: [
        [evidence("th-dc-1a", "ultrasonic-meter", "flow-meter-lineage", "A portable ultrasonic check found downstream flow weaker than the upstream reference."), evidence("th-dc-1b", "shift-log", "operations-log-lineage", "Operators heard the pump labor continuously after the loop warmed.")],
        [evidence("th-dc-2a", "pump-controller", "pump-control-lineage", "The pump controller recorded unusually sustained effort after startup."), evidence("th-dc-2b", "bypass-inspection", "mechanical-inspection-lineage", "The bypass valve was found seated rather than open during inspection.")],
        [evidence("th-dc-3a", "contact-probe", "physical-temperature-lineage", "An independent contact probe confirmed that the outlet pipe warmed beyond its usual range."), evidence("th-dc-3b", "surface-scan", "surface-scan-lineage", "The exchanger face did not show a persistent hot-side gradient." )],
        [evidence("th-dc-4a", "channel-comparison", "electronic-sensor-lineage", "The two installed electronic temperature channels agreed closely throughout the alert."), evidence("th-dc-4b", "maintenance-note", "maintenance-lineage", "The most recent sensor calibration check had no recorded discrepancy.")],
      ],
    }),
    task({
      baseScenarioId: "thermal-loop", designRegime: "SHARED_CUE_PRIVATE_CORRECTION",
      publicContext: THERMAL_CONTEXT,
      proposition: "Which primary fault generated the cooling-loop incident?",
      options: THERMAL_OPTIONS, latentOutcomeOptionId: "opt_1",
      evidenceByAgent: [
        [evidence("th-sc-1a", "main-dashboard", "dashboard-derived-lineage", sharedAlert), evidence("th-sc-1b", "ultrasonic-meter", "flow-meter-lineage", "A portable ultrasonic check found downstream flow weaker than the upstream reference.")],
        [evidence("th-sc-2a", "main-dashboard", "dashboard-derived-lineage", sharedAlert), evidence("th-sc-2b", "pump-controller", "pump-control-lineage", "The pump controller recorded unusually sustained effort after startup.")],
        [evidence("th-sc-3a", "main-dashboard", "dashboard-derived-lineage", sharedAlert), evidence("th-sc-3b", "surface-scan", "surface-scan-lineage", "The exchanger face showed no persistent hot-side gradient during a manual scan.")],
        [evidence("th-sc-4a", "main-dashboard", "dashboard-derived-lineage", sharedAlert), evidence("th-sc-4b", "channel-comparison", "electronic-sensor-lineage", "The two installed electronic temperature channels agreed closely throughout the alert.")],
      ],
    }),
    task({
      baseScenarioId: "thermal-loop", designRegime: "POLARIZED_PRIVATE_BLOCKS",
      publicContext: THERMAL_CONTEXT,
      proposition: "Which primary fault generated the cooling-loop incident?",
      options: THERMAL_OPTIONS, latentOutcomeOptionId: "opt_1",
      evidenceByAgent: [
        [evidence("th-pb-1a", "hydraulic-brief-a", "hydraulic-brief-lineage", "A hydraulic brief reported weak downstream flow."), evidence("th-pb-1b", "pump-brief-a", "pump-brief-lineage", "A pump brief reported sustained extra effort.")],
        [evidence("th-pb-2a", "hydraulic-brief-a", "hydraulic-brief-lineage", "A hydraulic brief reported weak downstream flow."), evidence("th-pb-2b", "pump-brief-a", "pump-brief-lineage", "A pump brief reported sustained extra effort.")],
        [evidence("th-pb-3a", "sensor-brief-b", "sensor-brief-lineage", "A sensor brief reported that the electronic outlet channel jumped while a contact probe stayed steady."), evidence("th-pb-3b", "stability-brief-b", "stability-brief-lineage", "A stability brief reported ordinary hydraulic behavior during the alert.")],
        [evidence("th-pb-4a", "sensor-brief-b", "sensor-brief-lineage", "A sensor brief reported that the electronic outlet channel jumped while a contact probe stayed steady."), evidence("th-pb-4b", "stability-brief-b", "stability-brief-lineage", "A stability brief reported ordinary hydraulic behavior during the alert.")],
      ],
    }),
    task({
      baseScenarioId: "thermal-loop", designRegime: "ASYMMETRIC_INFORMED_MINORITY",
      publicContext: THERMAL_CONTEXT,
      proposition: "Which primary fault generated the cooling-loop incident?",
      options: THERMAL_OPTIONS, latentOutcomeOptionId: "opt_1",
      evidenceByAgent: [
        [evidence("th-am-1a", "shift-bulletin", "shared-bulletin-lineage", "A shift bulletin described slower heat rejection than usual."), evidence("th-am-1b", "surface-bulletin", "shared-surface-lineage", "A surface bulletin described a mildly warmer exchanger face.")],
        [evidence("th-am-2a", "shift-bulletin", "shared-bulletin-lineage", "A shift bulletin described slower heat rejection than usual."), evidence("th-am-2b", "surface-bulletin", "shared-surface-lineage", "A surface bulletin described a mildly warmer exchanger face.")],
        [evidence("th-am-3a", "shift-bulletin", "shared-bulletin-lineage", "A shift bulletin described slower heat rejection than usual."), evidence("th-am-3b", "surface-bulletin", "shared-surface-lineage", "A surface bulletin described a mildly warmer exchanger face.")],
        [evidence("th-am-4a", "ultrasonic-meter", "flow-meter-lineage", "A portable ultrasonic check found a persistent downstream flow loss."), evidence("th-am-4b", "pump-controller", "pump-control-lineage", "The pump controller recorded sustained extra effort during the same interval.")],
      ],
    }),
  ];
}

function serviceTasks(): DiscussionThermometerCoverageTaskV1[] {
  const sharedAlert = "The central dashboard flagged broad queue latency during the access failure.";
  return [
    task({
      baseScenarioId: "service-access", designRegime: "DISTRIBUTED_COMPLEMENTARY",
      publicContext: SERVICE_CONTEXT,
      proposition: "Which primary failure generated the service-access incident?",
      options: SERVICE_OPTIONS, latentOutcomeOptionId: "opt_2",
      evidenceByAgent: [
        [evidence("sv-dc-1a", "edge-trace", "path-trace-lineage", "An edge trace revisited the same intermediate hops before failing."), evidence("sv-dc-1b", "session-sample", "session-lineage", "A sampled legitimate session failed before reaching the application tier.")],
        [evidence("sv-dc-2a", "packet-capture", "packet-capture-lineage", "Captured packets repeatedly exhausted their remaining lifetime."), evidence("sv-dc-2b", "resolver-log", "resolver-lineage", "Name resolution completed normally during the incident.")],
        [evidence("sv-dc-3a", "capacity-monitor", "capacity-lineage", "Application and worker utilization remained within their ordinary operating band."), evidence("sv-dc-3b", "queue-monitor", "queue-lineage", "Application request queues did not grow broadly across services.")],
        [evidence("sv-dc-4a", "identity-audit", "identity-lineage", "The identity audit found no concentration of failures around particular accounts."), evidence("sv-dc-4b", "origin-audit", "origin-lineage", "Valid-token use did not shift toward unfamiliar network origins.")],
      ],
    }),
    task({
      baseScenarioId: "service-access", designRegime: "SHARED_CUE_PRIVATE_CORRECTION",
      publicContext: SERVICE_CONTEXT,
      proposition: "Which primary failure generated the service-access incident?",
      options: SERVICE_OPTIONS, latentOutcomeOptionId: "opt_2",
      evidenceByAgent: [
        [evidence("sv-sc-1a", "central-dashboard", "dashboard-derived-lineage", sharedAlert), evidence("sv-sc-1b", "edge-trace", "path-trace-lineage", "An edge trace revisited the same intermediate hops before failing.")],
        [evidence("sv-sc-2a", "central-dashboard", "dashboard-derived-lineage", sharedAlert), evidence("sv-sc-2b", "packet-capture", "packet-capture-lineage", "Captured packets repeatedly exhausted their remaining lifetime.")],
        [evidence("sv-sc-3a", "central-dashboard", "dashboard-derived-lineage", sharedAlert), evidence("sv-sc-3b", "capacity-monitor", "capacity-lineage", "Application and worker utilization remained within their ordinary operating band.")],
        [evidence("sv-sc-4a", "central-dashboard", "dashboard-derived-lineage", sharedAlert), evidence("sv-sc-4b", "queue-monitor", "queue-lineage", "Application request queues did not grow broadly across services.")],
      ],
    }),
    task({
      baseScenarioId: "service-access", designRegime: "POLARIZED_PRIVATE_BLOCKS",
      publicContext: SERVICE_CONTEXT,
      proposition: "Which primary failure generated the service-access incident?",
      options: SERVICE_OPTIONS, latentOutcomeOptionId: "opt_2",
      evidenceByAgent: [
        [evidence("sv-pb-1a", "capacity-brief-a", "capacity-brief-lineage", "A capacity brief described widespread worker utilization near its alert boundary."), evidence("sv-pb-1b", "queue-brief-a", "queue-brief-lineage", "A queue brief described request backlog across several application workers.")],
        [evidence("sv-pb-2a", "capacity-brief-a", "capacity-brief-lineage", "A capacity brief described widespread worker utilization near its alert boundary."), evidence("sv-pb-2b", "queue-brief-a", "queue-brief-lineage", "A queue brief described request backlog across several application workers.")],
        [evidence("sv-pb-3a", "path-brief-b", "path-brief-lineage", "A path brief showed the same intermediate hops repeating before failure."), evidence("sv-pb-3b", "lifetime-brief-b", "lifetime-brief-lineage", "A packet brief showed repeated exhaustion of packet lifetime.")],
        [evidence("sv-pb-4a", "path-brief-b", "path-brief-lineage", "A path brief showed the same intermediate hops repeating before failure."), evidence("sv-pb-4b", "lifetime-brief-b", "lifetime-brief-lineage", "A packet brief showed repeated exhaustion of packet lifetime.")],
      ],
    }),
    task({
      baseScenarioId: "service-access", designRegime: "ASYMMETRIC_INFORMED_MINORITY",
      publicContext: SERVICE_CONTEXT,
      proposition: "Which primary failure generated the service-access incident?",
      options: SERVICE_OPTIONS, latentOutcomeOptionId: "opt_2",
      evidenceByAgent: [
        [evidence("sv-am-1a", "identity-bulletin", "shared-identity-lineage", "An identity bulletin mentioned a small rise in rejected token refreshes."), evidence("sv-am-1b", "origin-bulletin", "shared-origin-lineage", "An origin bulletin mentioned a few sessions from unfamiliar networks.")],
        [evidence("sv-am-2a", "identity-bulletin", "shared-identity-lineage", "An identity bulletin mentioned a small rise in rejected token refreshes."), evidence("sv-am-2b", "origin-bulletin", "shared-origin-lineage", "An origin bulletin mentioned a few sessions from unfamiliar networks.")],
        [evidence("sv-am-3a", "identity-bulletin", "shared-identity-lineage", "An identity bulletin mentioned a small rise in rejected token refreshes."), evidence("sv-am-3b", "origin-bulletin", "shared-origin-lineage", "An origin bulletin mentioned a few sessions from unfamiliar networks.")],
        [evidence("sv-am-4a", "edge-trace", "path-trace-lineage", "An edge trace revisited the same intermediate hops before failing."), evidence("sv-am-4b", "packet-capture", "packet-capture-lineage", "Captured packets repeatedly exhausted their remaining lifetime while service capacity remained ordinary.")],
      ],
    }),
  ];
}

export const DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1 = Object.freeze([
  ...thermalTasks(), ...serviceTasks(),
]);

export function projectDiscussionThermometerCoverageOnlineTaskV1(
  taskValue: DiscussionThermometerCoverageTaskV1,
): DiscussionThermometerCoverageOnlineTaskV1 {
  const value = {
    taskId: taskValue.taskId,
    publicContext: taskValue.publicContext,
    claim: structuredClone(taskValue.claim),
    agents: taskValue.agents.map(agent => ({
      agentId: agent.agentId,
      privateInformation: agent.privateEvidence.map(item =>
        `[source=${item.sourceId}] ${item.statement}`).join("\n"),
    })),
  };
  assertCollectiveDynamicsTruthBlindV1(value);
  return value;
}

function sourceMultiplicities(taskValue: DiscussionThermometerCoverageTaskV1): number[] {
  const counts = new Map<string, number>();
  taskValue.agents.flatMap(agent => agent.privateEvidence).forEach(item =>
    counts.set(item.sourceId, (counts.get(item.sourceId) ?? 0) + 1));
  return [...counts.values()].sort((left, right) => right - left);
}

export function verifyDiscussionThermometerStateSpaceTaskBankV1(
  tasks: readonly DiscussionThermometerCoverageTaskV1[] =
    DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1,
): void {
  if (tasks.length !== 8 || new Set(tasks.map(value => value.taskId)).size !== 8) {
    throw new Error("thermometer_coverage_task_bank_scope_invalid");
  }
  for (const taskValue of tasks) {
    const { schemaRef, contentHash, ...body } = taskValue;
    if (schemaRef.id !== DISCUSSION_THERMOMETER_STATE_SPACE_TASK_BANK_V1.id
      || schemaRef.version !== DISCUSSION_THERMOMETER_STATE_SPACE_TASK_BANK_V1.version
      || hashCollectiveDynamicsValueV1(body) !== contentHash
      || taskValue.claim.options.length !== 3
      || taskValue.agents.length !== 4
      || taskValue.agents.some(agent => agent.privateEvidence.length !== 2)
      || taskValue.humanSemanticReview !== "PENDING") {
      throw new Error("thermometer_coverage_task_invalid");
    }
    const online = projectDiscussionThermometerCoverageOnlineTaskV1(taskValue);
    const serialized = JSON.stringify(online);
    if (/designRegime|latentOutcome|humanSemanticReview|causalComparison/i.test(serialized)
      || serialized.toLowerCase().includes(taskValue.designRegime.toLowerCase())) {
      throw new Error("thermometer_coverage_online_design_leak");
    }
    const multiplicities = sourceMultiplicities(taskValue);
    const expected = taskValue.designRegime === "DISTRIBUTED_COMPLEMENTARY"
      ? [1, 1, 1, 1, 1, 1, 1, 1]
      : taskValue.designRegime === "SHARED_CUE_PRIVATE_CORRECTION"
        ? [4, 1, 1, 1, 1]
        : taskValue.designRegime === "POLARIZED_PRIVATE_BLOCKS"
          ? [2, 2, 2, 2]
          : [3, 3, 1, 1];
    if (JSON.stringify(multiplicities) !== JSON.stringify(expected)) {
      throw new Error("thermometer_coverage_source_geometry_invalid");
    }
  }
  for (const baseScenarioId of ["thermal-loop", "service-access"] as const) {
    const baseTasks = tasks.filter(value => value.baseScenarioId === baseScenarioId);
    if (baseTasks.length !== 4
      || new Set(baseTasks.map(value => value.designRegime)).size !== 4
      || new Set(baseTasks.map(value => value.publicContext)).size !== 1
      || new Set(baseTasks.map(value => JSON.stringify(value.claim))).size !== 1) {
      throw new Error("thermometer_coverage_base_scenario_binding_invalid");
    }
  }
}

verifyDiscussionThermometerStateSpaceTaskBankV1();
