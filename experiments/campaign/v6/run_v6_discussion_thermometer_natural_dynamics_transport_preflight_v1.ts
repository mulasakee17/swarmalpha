import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  buildDiscussionThermometerNaturalDynamicsTransportManifestV1,
  verifyDiscussionThermometerNaturalDynamicsTransportManifestV1,
} from "./discussionThermometerNaturalDynamicsTransportManifestV1";
import {
  buildDiscussionThermometerNaturalDynamicsTransportPlanV1,
  verifyDiscussionThermometerNaturalDynamicsTransportPlanV1,
} from "./discussionThermometerNaturalDynamicsTransportPlanV1";
import {
  DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1,
  verifyDiscussionThermometerNaturalDynamicsTransportTaskBankV1,
} from "./discussionThermometerNaturalDynamicsTransportTaskBankV1";

export const DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_PREFLIGHT_V1 =
  Object.freeze({
    id: "swarmalpha.preflight.v6.discussion-thermometer-natural-dynamics-transport",
    version: "1.0.0",
    providerCalls: 0,
  });

export interface DiscussionThermometerNaturalDynamicsTransportPreflightV1 {
  preflightRef: typeof DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_PREFLIGHT_V1;
  planHash: string;
  manifestHash: string;
  taskBankHash: string;
  sourceReplicationEvaluationHash: string;
  providerCalls: 0;
  checks: Array<{ id: string; pass: boolean; detail: string }>;
  allChecksPass: boolean;
  executionReady: false;
  nextRequiredStep: "REPLACE_SYNTHETIC_TASK_BANK_WITH_EXTERNAL_LITERATURE_AUTHORITY";
  contentHash: string;
}

export function buildDiscussionThermometerNaturalDynamicsTransportPreflightV1():
DiscussionThermometerNaturalDynamicsTransportPreflightV1 {
  verifyDiscussionThermometerNaturalDynamicsTransportTaskBankV1();
  const plan = buildDiscussionThermometerNaturalDynamicsTransportPlanV1();
  verifyDiscussionThermometerNaturalDynamicsTransportPlanV1(plan);
  const manifest = buildDiscussionThermometerNaturalDynamicsTransportManifestV1(plan);
  verifyDiscussionThermometerNaturalDynamicsTransportManifestV1(manifest, plan);
  const tasks = DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1;
  const checks: DiscussionThermometerNaturalDynamicsTransportPreflightV1["checks"] = [
    {
      id: "EXTERNAL_LITERATURE_TASK_AUTHORITY",
      pass: false,
      detail: "The four custom tasks are retained for mock wiring only and are rejected as scientific transport evidence.",
    },
    {
      id: "PROSPECTIVE_NEW_SCENARIOS",
      pass: plan.selectionStatus ===
        "prospective_new_scenario_transport_before_provider_observation"
        && JSON.stringify(plan.baseScenarioIds) ===
          JSON.stringify(["backup-power", "aerial-navigation"])
        && tasks.every(task => task.taskId.startsWith("thermometer-transport:")),
      detail: "Two scenario families were frozen before any transport provider observation.",
    },
    {
      id: "BALANCED_TASK_GEOMETRY",
      pass: tasks.length === 4
        && plan.baseScenarioIds.every(base => tasks.filter(task =>
          String(task.baseScenarioId) === base).length === 2)
        && plan.targetRegimes.every(regime => tasks.filter(task =>
          task.designRegime === regime).length === 2),
      detail: "Each new scenario has one shared-cue and one polarized task.",
    },
    {
      id: "UNCHANGED_MEASUREMENT_DEPTH",
      pass: JSON.stringify(plan.publicRounds) === JSON.stringify([1, 2, 3, 4])
        && JSON.stringify(plan.checkpoints) === JSON.stringify([0, 1, 2, 3, 4])
        && JSON.stringify(plan.sensorRepeats) === JSON.stringify(["A", "B"]),
      detail: "The four-round, five-checkpoint, exact-duplicate thermometer is unchanged.",
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
      id: "REGISTERED_RULES_CARRIED_FORWARD",
      pass: plan.registeredTransportRules.polarizedLateEnvelopeReplication
          .includes("two consecutive late transitions")
        && plan.registeredTransportRules.sharedCueMotionResourceReplication
          .includes("at least one transition"),
      detail: "The two post-development rules are frozen before transport observation.",
    },
    {
      id: "SOURCE_EVALUATION_BINDING",
      pass: plan.sourceReplicationEvaluationHash ===
        "sha256:f56588edc512d0eddff738565070a30f5d2eb46d3538fc1358427109a214f492",
      detail: "The transport plan binds the frozen same-task replication evaluation.",
    },
    {
      id: "TASK_BANK_BINDING",
      pass: plan.taskBankHash === hashCollectiveDynamicsValueV1(tasks),
      detail: "The plan binds the exact prospective task-bank hash.",
    },
    {
      id: "TRUTH_FIREWALL_AND_NO_WRITEBACK",
      pass: plan.onlineTruthAccess === "none" && plan.sensorWriteback === "none"
        && !plan.predictionUsed && !plan.actionUsed,
      detail: "Online discussion and sensing receive no truth, prediction target, or action output.",
    },
    {
      id: "FRESH_SAME_BATCH_REQUIREMENT",
      pass: plan.executionMode ===
        "new_full_within_batch_transport_not_historical_append"
        && manifest.executionPolicy.sameBatchRequired
        && manifest.executionPolicy.overwrite === "forbidden",
      detail: "Transport must be a fresh complete batch; historical append and overwrite are forbidden.",
    },
    {
      id: "NO_EXECUTION_AUTHORITY",
      pass: plan.providerCallsAuthorized === 0
        && plan.executionAuthority === "none"
        && manifest.executionAuthority === "none",
      detail: "Preflight freezes the design but cannot authorize provider calls.",
    },
  ];
  const body: Omit<DiscussionThermometerNaturalDynamicsTransportPreflightV1,
  "contentHash"> = {
    preflightRef: DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_PREFLIGHT_V1,
    planHash: plan.contentHash,
    manifestHash: manifest.contentHash,
    taskBankHash: plan.taskBankHash,
    sourceReplicationEvaluationHash: plan.sourceReplicationEvaluationHash,
    providerCalls: 0,
    checks,
    allChecksPass: checks.every(check => check.pass),
    executionReady: false,
    nextRequiredStep: "REPLACE_SYNTHETIC_TASK_BANK_WITH_EXTERNAL_LITERATURE_AUTHORITY",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`natural_dynamics_transport_preflight_no_overwrite_conflict:${path}`);
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

function main(): void {
  const outputDirectory = resolve(process.cwd(),
    process.env.THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_PREFLIGHT_OUTPUT_DIR
      ?? "results/v6_discussion_thermometer_natural_dynamics_transport_preflight_v1");
  mkdirSync(outputDirectory, { recursive: true });
  const preflight = buildDiscussionThermometerNaturalDynamicsTransportPreflightV1();
  writeExactOrVerify(join(outputDirectory, "preflight.json"), preflight);
  process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);
}

if (process.argv[1]?.endsWith(
  "run_v6_discussion_thermometer_natural_dynamics_transport_preflight_v1.ts")) {
  main();
}
