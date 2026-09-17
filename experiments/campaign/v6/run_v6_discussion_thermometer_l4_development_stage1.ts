import dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  L4_DEVELOPMENT_COST_GUARD_V1,
  L4_DEVELOPMENT_OUTPUT_DIRECTORY_V1,
  buildDiscussionThermometerL4DevelopmentStage1PlanV1,
  estimatedObservedCostCnyV1,
} from "./discussionThermometerL4DevelopmentPlanV1";
import {
  executeFrozenCollectiveDynamicsTrajectoryPublicV1,
  preflightCollectiveDynamicsTrajectoryPublicV1,
  writeCollectiveDynamicsTrajectoryPublicPlanV1,
} from "./run_v6_collective_dynamics_trajectory_public_v1";
import {
  executeFrozenCollectiveDynamicsTrajectorySensorV1,
  freezeCollectiveDynamicsTrajectorySensorV1,
  preflightCollectiveDynamicsTrajectorySensorV1,
} from "./run_v6_collective_dynamics_trajectory_sensor_v1";
import {
  createZhipuRawSingleAttemptInvoker,
  createZhipuSingleAttemptInvoker,
} from "./zhipuSingleAttemptInvoker";
import type {
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";
import type { CollectiveDynamicsTrajectoryPublicRunV1 } from
  "./runCollectiveDynamicsTrajectoryPublicV1";

const PUBLIC_RUN_FILE = "public-run.json";
const SENSOR_RUN_FILE = "run.json";
const COST_LEDGER_FILE = "cost-ledger.json";

interface UsageTotalsV1 {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  providerAttempts: number;
}

function emptyUsage(): UsageTotalsV1 {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0, providerAttempts: 0 };
}

function addUsage(target: UsageTotalsV1, result: SingleAttemptTextInvokeResult): void {
  const usage = result.usage;
  if (!usage || !Number.isFinite(usage.promptTokens) || !Number.isFinite(usage.completionTokens)) {
    throw new Error("l4_development_provider_usage_missing");
  }
  target.promptTokens += usage.promptTokens!;
  target.completionTokens += usage.completionTokens!;
  target.totalTokens += usage.totalTokens ?? usage.promptTokens! + usage.completionTokens!;
  target.providerAttempts += 1;
}

function publicUsage(outputDirectory: string): UsageTotalsV1 {
  const file = join(outputDirectory, PUBLIC_RUN_FILE);
  if (!existsSync(file)) return emptyUsage();
  const run = JSON.parse(readFileSync(file, "utf8")) as CollectiveDynamicsTrajectoryPublicRunV1;
  return run.terminals.reduce<UsageTotalsV1>((totals, terminal) => {
    if (terminal.status !== "valid" || !terminal.usage
      || terminal.usage.promptTokens === undefined || terminal.usage.completionTokens === undefined) {
      throw new Error("l4_development_public_usage_incomplete");
    }
    totals.promptTokens += terminal.usage.promptTokens;
    totals.completionTokens += terminal.usage.completionTokens;
    totals.totalTokens += terminal.usage.totalTokens
      ?? terminal.usage.promptTokens + terminal.usage.completionTokens;
    totals.providerAttempts += 1;
    return totals;
  }, emptyUsage());
}

function guardedInvoker(input: {
  base: SingleAttemptTextInvoker;
  totals: UsageTotalsV1;
}): SingleAttemptTextInvoker {
  return {
    async invoke(request, signal) {
      if (input.totals.providerAttempts >= L4_DEVELOPMENT_COST_GUARD_V1.maximumProviderAttempts) {
        throw new Error("l4_development_attempt_cap_reached");
      }
      if (estimatedObservedCostCnyV1(input.totals)
        >= L4_DEVELOPMENT_COST_GUARD_V1.maximumObservedCostCny) {
        throw new Error("l4_development_cost_cap_reached");
      }
      const result = await input.base.invoke(request, signal);
      addUsage(input.totals, result);
      if (estimatedObservedCostCnyV1(input.totals)
        > L4_DEVELOPMENT_COST_GUARD_V1.maximumObservedCostCny) {
        throw new Error("l4_development_cost_cap_exceeded_after_observed_call");
      }
      return result;
    },
  };
}

function executionGate(): void {
  if (process.env.RUN_AUTHORIZED !== "yes"
    || process.env.L4_DEVELOPMENT_EXECUTION_REVIEWED !== "yes"
    || process.env.L4_MAX_COST_CNY !== String(L4_DEVELOPMENT_COST_GUARD_V1.maximumObservedCostCny)) {
    throw new Error(
      "l4_development_execute_blocked: require RUN_AUTHORIZED=yes, "
      + "L4_DEVELOPMENT_EXECUTION_REVIEWED=yes, and L4_MAX_COST_CNY=2",
    );
  }
}

function writeCostLedger(outputDirectory: string, totals: UsageTotalsV1, phase: string): void {
  const body = {
    schema: "discussion-thermometer-l4-cost-ledger-v1",
    phase,
    model: L4_DEVELOPMENT_COST_GUARD_V1.model,
    pricingCheckedAt: L4_DEVELOPMENT_COST_GUARD_V1.pricingCheckedAt,
    inputCnyPerMillionTokens: L4_DEVELOPMENT_COST_GUARD_V1.inputCnyPerMillionTokens,
    outputCnyPerMillionTokens: L4_DEVELOPMENT_COST_GUARD_V1.outputCnyPerMillionTokens,
    maximumObservedCostCny: L4_DEVELOPMENT_COST_GUARD_V1.maximumObservedCostCny,
    ...totals,
    estimatedObservedCostCny: estimatedObservedCostCnyV1(totals),
  };
  writeFileSync(join(outputDirectory, COST_LEDGER_FILE), `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

function plan(outputDirectory: string): void {
  const written = writeCollectiveDynamicsTrajectoryPublicPlanV1(
    outputDirectory,
    "l4-development-stage1",
  );
  const expected = buildDiscussionThermometerL4DevelopmentStage1PlanV1();
  if (written.plan.contentHash !== expected.contentHash) throw new Error("l4_development_plan_write_drift");
}

async function executePublic(outputDirectory: string): Promise<void> {
  executionGate();
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) throw new Error("l4_development_zhipu_api_key_unavailable");
  const totals = emptyUsage();
  const run = await executeFrozenCollectiveDynamicsTrajectoryPublicV1({
    outputDirectory,
    invoker: guardedInvoker({ base: createZhipuSingleAttemptInvoker("glm-4.6v"), totals }),
  });
  if (run.providerCallCount !== 84 || totals.providerAttempts !== 84) {
    throw new Error("l4_development_public_call_count_invalid");
  }
  writeCostLedger(outputDirectory, totals, "public_complete");
}

async function executeSensor(outputDirectory: string): Promise<void> {
  executionGate();
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) throw new Error("l4_development_zhipu_api_key_unavailable");
  const totals = publicUsage(outputDirectory);
  const run = await executeFrozenCollectiveDynamicsTrajectorySensorV1({
    outputDirectory,
    invoker: guardedInvoker({ base: createZhipuRawSingleAttemptInvoker("glm-4.6v"), totals }),
  });
  if (run.terminals.length !== 119 || totals.providerAttempts !== 203) {
    throw new Error("l4_development_total_call_count_invalid");
  }
  writeCostLedger(outputDirectory, totals, "sensor_complete");
}

async function main(): Promise<void> {
  const outputDirectory = resolve(process.env.L4_DEVELOPMENT_OUTPUT_DIR
    ?? L4_DEVELOPMENT_OUTPUT_DIRECTORY_V1);
  const mode = process.argv.find(argument => [
    "--plan", "--preflight-public", "--execute-public", "--freeze-sensor",
    "--preflight-sensor", "--execute-sensor", "--run",
  ].includes(argument));
  if (!mode) throw new Error("l4_development_mode_required");
  if (mode === "--plan") plan(outputDirectory);
  if (mode === "--preflight-public") console.log(JSON.stringify(
    preflightCollectiveDynamicsTrajectoryPublicV1(outputDirectory), null, 2));
  if (mode === "--execute-public") await executePublic(outputDirectory);
  if (mode === "--freeze-sensor") freezeCollectiveDynamicsTrajectorySensorV1({ outputDirectory });
  if (mode === "--preflight-sensor") console.log(JSON.stringify(
    preflightCollectiveDynamicsTrajectorySensorV1(outputDirectory), null, 2));
  if (mode === "--execute-sensor") await executeSensor(outputDirectory);
  if (mode === "--run") {
    plan(outputDirectory);
    await executePublic(outputDirectory);
    freezeCollectiveDynamicsTrajectorySensorV1({ outputDirectory });
    await executeSensor(outputDirectory);
  }
  console.log(JSON.stringify({
    mode,
    outputDirectory,
    publicComplete: existsSync(join(outputDirectory, PUBLIC_RUN_FILE)),
    sensorComplete: existsSync(join(outputDirectory, SENSOR_RUN_FILE)),
    costLedger: existsSync(join(outputDirectory, COST_LEDGER_FILE))
      ? JSON.parse(readFileSync(join(outputDirectory, COST_LEDGER_FILE), "utf8")) : null,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
