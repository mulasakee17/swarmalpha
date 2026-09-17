import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildDiscussionThermometerNaturalDynamicsPlanV1,
  verifyDiscussionThermometerNaturalDynamicsPlanV1,
} from "./discussionThermometerNaturalDynamicsPlanV1";
import {
  buildDiscussionThermometerNaturalDynamicsManifestV1,
  verifyDiscussionThermometerNaturalDynamicsManifestV1,
} from "./discussionThermometerNaturalDynamicsManifestV1";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import { DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1 } from
  "./discussionThermometerStateSpaceTaskBankV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_PREFLIGHT_V1 = Object.freeze({
  id: "swarmalpha.preflight.v6.discussion-thermometer-natural-dynamics",
  version: "1.0.0",
  providerCalls: 0,
});

export interface DiscussionThermometerNaturalDynamicsPreflightV1 {
  preflightRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_PREFLIGHT_V1;
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

function withoutHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}

export function buildDiscussionThermometerNaturalDynamicsPreflightV1():
DiscussionThermometerNaturalDynamicsPreflightV1 {
  const plan = buildDiscussionThermometerNaturalDynamicsPlanV1();
  verifyDiscussionThermometerNaturalDynamicsPlanV1(plan);
  const manifest = buildDiscussionThermometerNaturalDynamicsManifestV1(plan);
  verifyDiscussionThermometerNaturalDynamicsManifestV1(manifest, plan);
  const checks: DiscussionThermometerNaturalDynamicsPreflightV1["checks"] = [
    {
      id: "TARGET_TASK_COUNT",
      pass: plan.taskIds.length === 4,
      detail: `${plan.taskIds.length}/4 targeted tasks are registered.`,
    },
    {
      id: "WITHIN_BATCH_ROUND_DEPTH",
      pass: JSON.stringify(plan.publicRounds) === JSON.stringify([1, 2, 3, 4])
        && JSON.stringify(plan.checkpoints) === JSON.stringify([0, 1, 2, 3, 4]),
      detail: "Four public rounds and five observed checkpoints are predeclared.",
    },
    {
      id: "CALL_BUDGET_ARITHMETIC",
      pass: plan.callBudget.publicCalls === 64
        && plan.callBudget.sensorCalls === 160
        && plan.callBudget.totalProviderCalls === 224
        && plan.callBudget.maximumCompletionTokens === 73728,
      detail: "64 public + 160 sensor = 224 calls; completion ceiling 73,728 tokens.",
    },
    {
      id: "DUPLICATE_RESOLUTION_COVERAGE",
      pass: plan.sensorRepeats.length === 2
        && plan.sensorRepeats[0] === "A" && plan.sensorRepeats[1] === "B"
        && plan.checkpoints.length === 5,
      detail: "Primary and exact duplicate are retained at every checkpoint.",
    },
    {
      id: "TRUTH_FIREWALL_AND_NO_WRITEBACK",
      pass: plan.onlineTruthAccess === "none" && plan.sensorWriteback === "none"
        && !plan.predictionUsed && !plan.actionUsed,
      detail: "The proposed run has no online truth, prediction target, or action output.",
    },
    {
      id: "NO_EXECUTION_AUTHORITY",
      pass: plan.providerCallsAuthorized === 0 && plan.executionAuthority === "none",
      detail: "Preflight cannot authorize provider calls.",
    },
    {
      id: "TASK_BANK_BINDING",
      pass: plan.taskBankHash === hashCollectiveDynamicsValueV1(
        DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1),
      detail: "Target plan binds the current task-bank hash without changing task content.",
    },
    {
      id: "SAME_BATCH_REQUIREMENT",
      pass: plan.executionMode === "new_full_within_batch_rerun_not_historical_append",
      detail: "Historical X2 cannot be silently extended with a later X3/X4 batch.",
    },
    {
      id: "MANIFEST_BINDING",
      pass: manifest.planHash === plan.contentHash
        && manifest.providerBudget.maximumTotalCalls === plan.callBudget.totalProviderCalls
        && manifest.executionAuthority === "none",
      detail: "Versioned manifest binds the plan and leaves execution authority unset.",
    },
  ];
  const body: Omit<DiscussionThermometerNaturalDynamicsPreflightV1, "contentHash"> = {
    preflightRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_PREFLIGHT_V1,
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
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`natural_dynamics_preflight_no_overwrite_conflict:${path}`);
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

function main(): void {
  const outputDirectory = resolve(process.cwd(),
    process.env.THERMOMETER_NATURAL_DYNAMICS_PREFLIGHT_OUTPUT_DIR
      ?? "results/v6_discussion_thermometer_natural_dynamics_preflight_v1");
  mkdirSync(outputDirectory, { recursive: true });
  const preflight = buildDiscussionThermometerNaturalDynamicsPreflightV1();
  writeExactOrVerify(join(outputDirectory, "preflight.json"), preflight);
  process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);
}

if (process.argv[1]?.endsWith("run_v6_discussion_thermometer_natural_dynamics_preflight_v1.ts")) {
  main();
}
