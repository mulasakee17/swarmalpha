/**
 * Fail-closed runner for the 48-call shadow-sensor prompt-sensitivity canary.
 * `--plan` performs zero provider calls. `--execute` requires two explicit
 * gates and uses the raw, single-attempt provider boundary.
 */
import dotenv from "dotenv";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  buildCollectiveDynamicsSensorCanaryFreezeV1,
  buildCollectiveDynamicsSensorCanaryPlanV1,
  executeCollectiveDynamicsSensorCanaryV1,
  verifyCollectiveDynamicsSensorCanaryFreezeV1,
  verifyCollectiveDynamicsSensorCanaryPlanV1,
  verifyCollectiveDynamicsSensorCanaryRunV1,
  type CollectiveDynamicsSensorCanaryFreezeV1,
  type CollectiveDynamicsSensorCanaryPlanV1,
  type CollectiveDynamicsSensorCanaryRunArtifactV1,
  type SensorCanaryAttemptStartV1,
  type SensorCanaryAttemptTerminalV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
} from "./collectiveDynamicsV1";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

export const COLLECTIVE_DYNAMICS_SENSOR_CANARY_OUTPUT_V1 =
  "results/v6_collective_dynamics_sensor_canary_v1_glm46v_seed1";

const PLAN_FILE = "plan.json";
const FREEZE_FILE = "freeze.json";
const ATTEMPTS_FILE = "attempts.jsonl";
const RUN_FILE = "run.json";

type AttemptLedgerEventV1 = SensorCanaryAttemptStartV1 | SensorCanaryAttemptTerminalV1;

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function exactJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeExactOrVerify(file: string, value: unknown): void {
  const text = exactJson(value);
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) {
      throw new Error(`sensor_canary_no_overwrite_conflict:${file}`);
    }
    return;
  }
  writeFileSync(file, text, { flag: "wx" });
}

export function loadCollectiveDynamicsSensorCanaryFormationsV1(
  plan: CollectiveDynamicsSensorCanaryPlanV1,
): CollectiveDynamicsFormationArtifactV1[] {
  verifyCollectiveDynamicsSensorCanaryPlanV1(plan);
  const sourceDirectory = resolve(plan.sourceFormationDirectory);
  return plan.sourceTaskIds.map(sourceTaskId => {
    const file = join(sourceDirectory, `formation-task-${sourceTaskId}-seed-${plan.sourceSeed}.json`);
    if (!existsSync(file)) throw new Error(`sensor_canary_source_formation_missing:${sourceTaskId}`);
    const formation = readJson<CollectiveDynamicsFormationArtifactV1>(file);
    verifyFormationArtifactV1(formation);
    if (formation.onlineTask.sourceTaskId !== sourceTaskId || formation.seed !== plan.sourceSeed) {
      throw new Error(`sensor_canary_source_formation_identity_invalid:${sourceTaskId}`);
    }
    return formation;
  });
}

export function freezeCollectiveDynamicsSensorCanaryV1(input?: {
  outputDirectory?: string;
  sourceFormationDirectory?: string;
}): {
  outputDirectory: string;
  plan: CollectiveDynamicsSensorCanaryPlanV1;
  formations: CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsSensorCanaryFreezeV1;
} {
  const outputDirectory = resolve(input?.outputDirectory ?? COLLECTIVE_DYNAMICS_SENSOR_CANARY_OUTPUT_V1);
  const plan = buildCollectiveDynamicsSensorCanaryPlanV1({
    sourceFormationDirectory: input?.sourceFormationDirectory,
  });
  const formations = loadCollectiveDynamicsSensorCanaryFormationsV1(plan);
  const freeze = buildCollectiveDynamicsSensorCanaryFreezeV1({ plan, formations });
  writeExactOrVerify(join(outputDirectory, PLAN_FILE), plan);
  writeExactOrVerify(join(outputDirectory, FREEZE_FILE), freeze);
  return { outputDirectory, plan, formations, freeze };
}

export function loadFrozenCollectiveDynamicsSensorCanaryV1(outputDirectoryInput?: string): {
  outputDirectory: string;
  plan: CollectiveDynamicsSensorCanaryPlanV1;
  formations: CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsSensorCanaryFreezeV1;
} {
  const outputDirectory = resolve(outputDirectoryInput ?? COLLECTIVE_DYNAMICS_SENSOR_CANARY_OUTPUT_V1);
  const planPath = join(outputDirectory, PLAN_FILE);
  const freezePath = join(outputDirectory, FREEZE_FILE);
  if (!existsSync(planPath) || !existsSync(freezePath)) {
    throw new Error("sensor_canary_freeze_files_missing");
  }
  const plan = readJson<CollectiveDynamicsSensorCanaryPlanV1>(planPath);
  const formations = loadCollectiveDynamicsSensorCanaryFormationsV1(plan);
  const freeze = readJson<CollectiveDynamicsSensorCanaryFreezeV1>(freezePath);
  verifyCollectiveDynamicsSensorCanaryFreezeV1({ plan, formations, freeze });
  return { outputDirectory, plan, formations, freeze };
}

export function collectiveDynamicsSensorCanaryExecuteGateV1(env: {
  RUN_AUTHORIZED?: string;
  SENSOR_CANARY_SEMANTIC_REVIEWED?: string;
}): { ok: true } | { ok: false; code: 5; reason: string } {
  if (env.RUN_AUTHORIZED !== "yes") {
    return { ok: false, code: 5, reason: "sensor_canary_execute_blocked: RUN_AUTHORIZED=yes not present" };
  }
  if (env.SENSOR_CANARY_SEMANTIC_REVIEWED !== "yes") {
    return {
      ok: false,
      code: 5,
      reason: "sensor_canary_execute_blocked: SENSOR_CANARY_SEMANTIC_REVIEWED=yes not present",
    };
  }
  return { ok: true };
}

function appendAttemptEvent(file: string, event: AttemptLedgerEventV1): void {
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

export function auditCollectiveDynamicsSensorCanaryAttemptLedgerV1(input: {
  freeze: CollectiveDynamicsSensorCanaryFreezeV1;
  file: string;
}): void {
  if (!existsSync(input.file)) throw new Error("sensor_canary_attempt_ledger_missing");
  const lines = readFileSync(input.file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length !== input.freeze.registeredCellCount * 2) {
    throw new Error("sensor_canary_attempt_ledger_event_count_invalid");
  }
  const events = lines.map(line => JSON.parse(line) as AttemptLedgerEventV1);
  input.freeze.cells.forEach((cell, index) => {
    const started = events[index * 2];
    const terminal = events[index * 2 + 1];
    if (started.type !== "started" || terminal.type !== "terminal"
      || started.sequence !== cell.globalSequence || terminal.sequence !== cell.globalSequence
      || started.cellId !== cell.cellId || terminal.cellId !== cell.cellId
      || started.requestId !== cell.request.requestId || terminal.requestId !== cell.request.requestId
      || started.requestHash !== cell.requestHash || terminal.requestHash !== cell.requestHash
      || terminal.terminal.cellId !== cell.cellId || terminal.status !== terminal.terminal.status
      || terminal.timestamp !== terminal.terminal.terminalAt) {
      throw new Error("sensor_canary_attempt_ledger_binding_invalid");
    }
  });
}

export async function executeFrozenCollectiveDynamicsSensorCanaryV1(input: {
  outputDirectory?: string;
  invoker: SingleAttemptTextInvoker;
  clock?: () => string;
}): Promise<CollectiveDynamicsSensorCanaryRunArtifactV1> {
  const frozen = loadFrozenCollectiveDynamicsSensorCanaryV1(input.outputDirectory);
  const attemptsPath = join(frozen.outputDirectory, ATTEMPTS_FILE);
  const runPath = join(frozen.outputDirectory, RUN_FILE);
  if (existsSync(attemptsPath) || existsSync(runPath)) {
    throw new Error("sensor_canary_execution_not_fresh");
  }
  const artifact = await executeCollectiveDynamicsSensorCanaryV1({
    plan: frozen.plan,
    formations: frozen.formations,
    freeze: frozen.freeze,
    invoker: input.invoker,
    clock: input.clock,
    onStart: event => appendAttemptEvent(attemptsPath, event),
    onTerminal: event => appendAttemptEvent(attemptsPath, event),
  });
  auditCollectiveDynamicsSensorCanaryAttemptLedgerV1({ freeze: frozen.freeze, file: attemptsPath });
  verifyCollectiveDynamicsSensorCanaryRunV1({ freeze: frozen.freeze, artifact });
  writeExactOrVerify(runPath, artifact);
  return artifact;
}

async function main(): Promise<number> {
  const outputDirectory = process.env.SENSOR_CANARY_OUTPUT_DIR
    ?? COLLECTIVE_DYNAMICS_SENSOR_CANARY_OUTPUT_V1;
  if (process.argv.includes("--plan")) {
    const frozen = freezeCollectiveDynamicsSensorCanaryV1({ outputDirectory });
    console.log(JSON.stringify({
      mode: "plan",
      providerCalls: 0,
      outputDirectory: frozen.outputDirectory,
      planHash: frozen.plan.contentHash,
      freezeHash: frozen.freeze.contentHash,
      cells: frozen.freeze.registeredCellCount,
    }));
    return 0;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --plan (zero provider calls) or --execute (48 provider calls)");
    return 2;
  }
  const gate = collectiveDynamicsSensorCanaryExecuteGateV1({
    RUN_AUTHORIZED: process.env.RUN_AUTHORIZED,
    SENSOR_CANARY_SEMANTIC_REVIEWED: process.env.SENSOR_CANARY_SEMANTIC_REVIEWED,
  });
  if (!gate.ok) {
    console.error(gate.reason);
    return gate.code;
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("sensor_canary_execute_blocked: ZHIPU_API_KEY unavailable");
    return 3;
  }
  const artifact = await executeFrozenCollectiveDynamicsSensorCanaryV1({
    outputDirectory,
    invoker: createZhipuRawSingleAttemptInvoker("glm-4.6v"),
  });
  console.log(JSON.stringify({
    mode: "execute",
    runHash: artifact.contentHash,
    terminals: artifact.terminalCellCount,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
