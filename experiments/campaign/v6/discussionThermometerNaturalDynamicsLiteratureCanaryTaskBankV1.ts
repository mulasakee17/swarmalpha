import {
  createHiddenBenchTaskProjectionV1,
  HIDDENBENCH_OFFICIAL_SOURCE_V1,
} from "./hiddenBenchTaskAdapter";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASK_BANK_V1 =
  Object.freeze({
    id: "swarmalpha.experiment.v6.discussion-thermometer-natural-dynamics-literature-canary-task-bank",
    version: "1.1.0",
    sourceRepository: HIDDENBENCH_OFFICIAL_SOURCE_V1.repository,
    sourceCommit: HIDDENBENCH_OFFICIAL_SOURCE_V1.commit,
    sourceCanonicalContentHash: HIDDENBENCH_OFFICIAL_SOURCE_V1.canonicalContentHash,
    sourceLicense: HIDDENBENCH_OFFICIAL_SOURCE_V1.license,
  });

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_SOURCE_TASK_IDS_V1 =
  [4, 6] as const;

export interface LiteratureCanaryTaskV1 {
  schemaRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASK_BANK_V1;
  taskId: string;
  sourceTaskId: 4 | 6;
  sourceTaskName: string;
  publicContext: string;
  claim: {
    claimId: string;
    proposition: string;
    options: Array<{ optionId: string; label: string }>;
  };
  agents: Array<{ agentId: string; privateInformation: string }>;
  offlineResolution: {
    correctOptionId: string;
    resolverId: "resolver:hiddenbench-data-3be6ca16";
    role: "offline_evaluation_only_not_monitor_input";
  };
  contentHash: string;
}

function buildTask(sourceTaskId: 4 | 6): LiteratureCanaryTaskV1 {
  const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId });
  const sourceTask = projection.adapter.task;
  const body: Omit<LiteratureCanaryTaskV1, "schemaRef" | "contentHash"> = {
    taskId: sourceTaskId === 4
      ? "task:literature-canary:alpha"
      : "task:literature-canary:beta",
    sourceTaskId,
    sourceTaskName: sourceTaskId === 4 ? "toma_butera_2009" : "schulz_hardt_mojzisch_2012",
    publicContext: sourceTask.publicContext,
    claim: {
      claimId: sourceTaskId === 4
        ? "claim:literature-canary:alpha"
        : "claim:literature-canary:beta",
      proposition: "Select the single option best supported by the information available to the group.",
      options: sourceTask.claim.options.map((label, index) => ({
        optionId: `opt_${index + 1}`,
        label,
      })),
    },
    agents: sourceTask.agents.map((agent, index) => ({
      agentId: `agent_${index + 1}`,
      privateInformation: agent.privateInformation,
    })),
    offlineResolution: {
      correctOptionId: `opt_${sourceTask.claim.options.indexOf(sourceTask.outcome) + 1}`,
      resolverId: "resolver:hiddenbench-data-3be6ca16",
      role: "offline_evaluation_only_not_monitor_input",
    },
  };
  return {
    schemaRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASK_BANK_V1,
    ...body,
    contentHash: hashCollectiveDynamicsValueV1(body),
  };
}

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1 =
  Object.freeze(DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_SOURCE_TASK_IDS_V1
    .map(buildTask));

export function projectDiscussionThermometerNaturalDynamicsLiteratureCanaryOnlineTaskV1(
  task: LiteratureCanaryTaskV1,
): {
  taskId: string;
  publicContext: string;
  claim: LiteratureCanaryTaskV1["claim"];
  agents: LiteratureCanaryTaskV1["agents"];
} {
  const online = {
    taskId: task.taskId,
    publicContext: task.publicContext,
    claim: structuredClone(task.claim),
    agents: task.agents.map(agent => ({ ...agent })),
  };
  assertCollectiveDynamicsTruthBlindV1(online);
  return online;
}

export function verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1(): void {
  const tasks = DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1;
  if (tasks.length !== 2 || new Set(tasks.map(task => task.sourceTaskId)).size !== 2
    || tasks.some(task => task.agents.length !== 3
      || task.claim.options.length !== 4
      || task.offlineResolution.resolverId !== "resolver:hiddenbench-data-3be6ca16")) {
    throw new Error("natural_dynamics_literature_canary_geometry_invalid");
  }
  for (const task of tasks) {
    const { schemaRef: _schemaRef, contentHash, ...body } = task;
    if (contentHash !== hashCollectiveDynamicsValueV1(body)) {
      throw new Error("natural_dynamics_literature_canary_task_hash_invalid");
    }
    const online = projectDiscussionThermometerNaturalDynamicsLiteratureCanaryOnlineTaskV1(task);
    if (/correctOptionId|offlineResolution|sourceTaskName|sourceTaskId|hiddenbench|toma_butera|schulz_hardt/i
      .test(JSON.stringify(online))) {
      throw new Error("natural_dynamics_literature_canary_truth_leak");
    }
  }
}
