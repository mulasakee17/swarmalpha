import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  buildDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1,
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryManifestV1";
import {
  buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryPlanV1";
import {
  DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1,
  projectDiscussionThermometerNaturalDynamicsLiteratureCanaryOnlineTaskV1,
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1,
} from "./discussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_PREFLIGHT_V1 = Object.freeze({
  id: "swarmalpha.preflight.v6.discussion-thermometer-natural-dynamics-literature-canary",
  version: "1.1.0",
  providerCalls: 0,
});

export interface DiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1 {
  preflightRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_PREFLIGHT_V1;
  planHash: string;
  manifestHash: string;
  taskBankHash: string;
  providerCalls: 0;
  checks: Array<{ id: string; pass: boolean; detail: string }>;
  allChecksPass: boolean;
  executionReady: false;
  nextRequiredStep: "MANUAL_SEMANTIC_REVIEW_AND_EXPLICIT_EXECUTION_AUTHORITY";
  contentHash: string;
}

export function buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1(): DiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1 {
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1();
  const plan = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1();
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryPlanV1(plan);
  const manifest = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1(plan);
  verifyDiscussionThermometerNaturalDynamicsLiteratureCanaryManifestV1(manifest, plan);
  const onlinePromptInputs = DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1
    .map(projectDiscussionThermometerNaturalDynamicsLiteratureCanaryOnlineTaskV1);
  const onlinePromptInputText = JSON.stringify(onlinePromptInputs);
  const expectedMaximumCompletionTokens =
    plan.callBudget.publicCalls * plan.publicInvocation.maxTokens
    + plan.callBudget.sensorCalls * plan.sensorInvocation.maxTokens;
  const checks: DiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1["checks"] = [
    { id: "OFFICIAL_SOURCE_BINDING", pass: plan.sourceRepository === "Yassellee/HiddenBench_ICML" && plan.sourceCommit === "3be6ca16" && plan.sourceLicense === "MIT", detail: "The canary is sourced from the pinned official HiddenBench content." },
    { id: "PUBLISHED_MANUAL_ADAPTATION_SCOPE", pass: JSON.stringify(plan.sourceTaskIds) === JSON.stringify([4, 6]) && plan.sourceTaskSelection === "official_manual_adapted_tasks_selected_before_canary_execution", detail: "Only the two official manual/adapted 3-agent, 4-option tasks are selected." },
    { id: "VARIABLE_ROSTER_AND_OPTION_COUNT", pass: plan.agentIds.length === 3 && plan.optionCount === 4 && DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1.every(task => task.agents.length === 3 && task.claim.options.length === 4), detail: "This is the smallest canary that tests non-4-agent and non-3-option support." },
    { id: "UNCHANGED_OBSERVATION_DEPTH", pass: JSON.stringify(plan.publicRounds) === JSON.stringify([1, 2, 3, 4]) && JSON.stringify(plan.checkpoints) === JSON.stringify([0, 1, 2, 3, 4]) && JSON.stringify(plan.sensorRepeats) === JSON.stringify(["A", "B"]), detail: "Discussion depth and duplicate-adjusted observation are unchanged." },
    { id: "CALL_BUDGET_ARITHMETIC", pass: plan.callBudget.publicCalls === 24 && plan.callBudget.sensorCalls === 60 && plan.callBudget.totalProviderCalls === 84 && plan.callBudget.maximumCompletionTokens === expectedMaximumCompletionTokens && expectedMaximumCompletionTokens === 27648, detail: "24 public calls at 512 tokens plus 60 sensor calls at 256 tokens equals 27,648 maximum completion tokens." },
    { id: "TRUTH_FIREWALL", pass: plan.onlineTruthAccess === "none" && plan.sensorWriteback === "none" && !plan.predictionUsed && !plan.actionUsed && !/correctOptionId|offlineResolution|groundTruth|correctAnswer/i.test(onlinePromptInputText), detail: "The actual projected online task inputs contain no correct answer or resolver outcome." },
    { id: "ONLINE_IDENTITY_FIREWALL", pass: !/hiddenbench|toma_butera|schulz_hardt|sourceTaskId|sourceTaskName/i.test(onlinePromptInputText), detail: "The projected online task inputs use opaque canary identities and do not disclose the public benchmark family, source task IDs, or source task names." },
    { id: "TASK_BANK_BINDING", pass: plan.taskBankHash === hashCollectiveDynamicsValueV1(DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_TASKS_V1), detail: "The plan binds the exact projected task-bank hash." },
    { id: "NO_EXECUTION_AUTHORITY", pass: plan.providerCallsAuthorized === 0 && plan.executionAuthority === "none" && manifest.executionAuthority === "none", detail: "Preflight freezes the design but cannot authorize paid calls." },
  ];
  const body: Omit<DiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1, "contentHash"> = {
    preflightRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_PREFLIGHT_V1,
    planHash: plan.contentHash,
    manifestHash: manifest.contentHash,
    taskBankHash: plan.taskBankHash,
    providerCalls: 0,
    checks,
    allChecksPass: checks.every(check => check.pass),
    executionReady: false,
    nextRequiredStep: "MANUAL_SEMANTIC_REVIEW_AND_EXPLICIT_EXECUTION_AUTHORITY",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) throw new Error(`literature_canary_preflight_no_overwrite_conflict:${path}`);
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

function main(): void {
  const output = resolve(process.cwd(), process.env.THERMOMETER_NATURAL_DYNAMICS_LITERATURE_CANARY_PREFLIGHT_OUTPUT_DIR ?? "results/v6_discussion_thermometer_natural_dynamics_literature_canary_preflight_v1");
  mkdirSync(output, { recursive: true });
  const preflight = buildDiscussionThermometerNaturalDynamicsLiteratureCanaryPreflightV1();
  writeExactOrVerify(join(output, "preflight.json"), preflight);
  process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);
}

if (process.argv[1]?.endsWith("run_v6_discussion_thermometer_natural_dynamics_literature_canary_preflight_v1.ts")) main();
