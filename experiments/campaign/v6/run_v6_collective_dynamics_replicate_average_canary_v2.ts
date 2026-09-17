/**
 * Thin fail-closed runner for the V2 replicate-average qualification canary.
 * `--plan` is zero-provider. `--execute` is separately owner-gated.
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
  buildCollectiveDynamicsReplicateAverageCanaryPlanV2,
  buildCollectiveDynamicsReplicateAverageFreezeV2,
  executeCollectiveDynamicsReplicateAverageCanaryV2,
  verifyCollectiveDynamicsReplicateAverageCanaryPlanV2,
  verifyCollectiveDynamicsReplicateAverageFreezeV2,
  verifyCollectiveDynamicsReplicateAverageRunV2,
  type CollectiveDynamicsReplicateAverageCanaryPlanV2,
  type CollectiveDynamicsReplicateAverageFreezeV2,
  type CollectiveDynamicsReplicateAverageRunV2,
  type ReplicateAverageAttemptStartV2,
  type ReplicateAverageAttemptTerminalV2,
} from "./collectiveDynamicsReplicateAverageCanaryV2";
import {
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
} from "./collectiveDynamicsV1";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

export const COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_OUTPUT_V2 =
  "results/v6_collective_dynamics_replicate_average_canary_v2_glm46v_seed1";

const PLAN_FILE = "plan.json";
const FREEZE_FILE = "freeze.json";
const ATTEMPTS_FILE = "attempts.jsonl";
const RUN_FILE = "run.json";

type AttemptLedgerEventV2 = ReplicateAverageAttemptStartV2 | ReplicateAverageAttemptTerminalV2;

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
      throw new Error(`replicate_average_canary_v2_no_overwrite_conflict:${file}`);
    }
    return;
  }
  writeFileSync(file, text, { flag: "wx" });
}

export function loadCollectiveDynamicsReplicateAverageFormationsV2(
  plan: CollectiveDynamicsReplicateAverageCanaryPlanV2,
): CollectiveDynamicsFormationArtifactV1[] {
  verifyCollectiveDynamicsReplicateAverageCanaryPlanV2(plan);
  const sourceDirectory = resolve(plan.sourceFormationDirectory);
  return plan.sourceTaskIds.map(sourceTaskId => {
    const file = join(sourceDirectory, `formation-task-${sourceTaskId}-seed-${plan.sourceSeed}.json`);
    if (!existsSync(file)) {
      throw new Error(`replicate_average_canary_v2_source_formation_missing:${sourceTaskId}`);
    }
    const formation = readJson<CollectiveDynamicsFormationArtifactV1>(file);
    verifyFormationArtifactV1(formation);
    if (formation.onlineTask.sourceTaskId !== sourceTaskId || formation.seed !== plan.sourceSeed) {
      throw new Error(`replicate_average_canary_v2_source_formation_identity_invalid:${sourceTaskId}`);
    }
    return formation;
  });
}

export function freezeCollectiveDynamicsReplicateAverageCanaryV2(input?: {
  outputDirectory?: string;
  sourceFormationDirectory?: string;
}): {
  outputDirectory: string;
  plan: CollectiveDynamicsReplicateAverageCanaryPlanV2;
  formations: CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
} {
  const outputDirectory = resolve(
    input?.outputDirectory ?? COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_OUTPUT_V2,
  );
  const plan = buildCollectiveDynamicsReplicateAverageCanaryPlanV2({
    sourceFormationDirectory: input?.sourceFormationDirectory,
  });
  const formations = loadCollectiveDynamicsReplicateAverageFormationsV2(plan);
  const freeze = buildCollectiveDynamicsReplicateAverageFreezeV2({ plan, formations });
  writeExactOrVerify(join(outputDirectory, PLAN_FILE), plan);
  writeExactOrVerify(join(outputDirectory, FREEZE_FILE), freeze);
  return { outputDirectory, plan, formations, freeze };
}

export function loadFrozenCollectiveDynamicsReplicateAverageCanaryV2(
  outputDirectoryInput?: string,
): {
  outputDirectory: string;
  plan: CollectiveDynamicsReplicateAverageCanaryPlanV2;
  formations: CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
} {
  const outputDirectory = resolve(
    outputDirectoryInput ?? COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_OUTPUT_V2,
  );
  const planPath = join(outputDirectory, PLAN_FILE);
  const freezePath = join(outputDirectory, FREEZE_FILE);
  if (!existsSync(planPath) || !existsSync(freezePath)) {
    throw new Error("replicate_average_canary_v2_freeze_files_missing");
  }
  const plan = readJson<CollectiveDynamicsReplicateAverageCanaryPlanV2>(planPath);
  const formations = loadCollectiveDynamicsReplicateAverageFormationsV2(plan);
  const freeze = readJson<CollectiveDynamicsReplicateAverageFreezeV2>(freezePath);
  verifyCollectiveDynamicsReplicateAverageFreezeV2({ plan, formations, freeze });
  return { outputDirectory, plan, formations, freeze };
}

export function collectiveDynamicsReplicateAverageExecuteGateV2(env: {
  RUN_AUTHORIZED?: string;
  REPLICATE_AVERAGE_CANARY_APPROVED?: string;
}): { ok: true } | { ok: false; code: 5; reason: string } {
  if (env.RUN_AUTHORIZED !== "yes") {
    return {
      ok: false,
      code: 5,
      reason: "replicate_average_canary_v2_execute_blocked: RUN_AUTHORIZED=yes not present",
    };
  }
  if (env.REPLICATE_AVERAGE_CANARY_APPROVED !== "yes") {
    return {
      ok: false,
      code: 5,
      reason: "replicate_average_canary_v2_execute_blocked: "
        + "REPLICATE_AVERAGE_CANARY_APPROVED=yes not present",
    };
  }
  return { ok: true };
}

function appendAttemptEvent(file: string, event: AttemptLedgerEventV2): void {
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

export function auditCollectiveDynamicsReplicateAverageLedgerV2(input: {
  freeze: CollectiveDynamicsReplicateAverageFreezeV2;
  file: string;
}): void {
  if (!existsSync(input.file)) {
    throw new Error("replicate_average_canary_v2_attempt_ledger_missing");
  }
  const lines = readFileSync(input.file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length !== input.freeze.registeredCellCount * 2) {
    throw new Error("replicate_average_canary_v2_attempt_ledger_event_count_invalid");
  }
  const events = lines.map(line => JSON.parse(line) as AttemptLedgerEventV2);
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
      throw new Error("replicate_average_canary_v2_attempt_ledger_binding_invalid");
    }
  });
}

export async function executeFrozenCollectiveDynamicsReplicateAverageCanaryV2(input: {
  outputDirectory?: string;
  invoker: SingleAttemptTextInvoker;
  clock?: () => string;
}): Promise<CollectiveDynamicsReplicateAverageRunV2> {
  const frozen = loadFrozenCollectiveDynamicsReplicateAverageCanaryV2(input.outputDirectory);
  const attemptsPath = join(frozen.outputDirectory, ATTEMPTS_FILE);
  const runPath = join(frozen.outputDirectory, RUN_FILE);
  if (existsSync(attemptsPath) || existsSync(runPath)) {
    throw new Error("replicate_average_canary_v2_execution_not_fresh");
  }
  const artifact = await executeCollectiveDynamicsReplicateAverageCanaryV2({
    plan: frozen.plan,
    formations: frozen.formations,
    freeze: frozen.freeze,
    invoker: input.invoker,
    clock: input.clock,
    onStart: event => appendAttemptEvent(attemptsPath, event),
    onTerminal: event => appendAttemptEvent(attemptsPath, event),
  });
  auditCollectiveDynamicsReplicateAverageLedgerV2({ freeze: frozen.freeze, file: attemptsPath });
  verifyCollectiveDynamicsReplicateAverageRunV2({ freeze: frozen.freeze, artifact });
  writeExactOrVerify(runPath, artifact);
  return artifact;
}

async function main(): Promise<number> {
  const outputDirectory = process.env.REPLICATE_AVERAGE_CANARY_OUTPUT_DIR
    ?? COLLECTIVE_DYNAMICS_REPLICATE_AVERAGE_OUTPUT_V2;
  if (process.argv.includes("--plan")) {
    const frozen = freezeCollectiveDynamicsReplicateAverageCanaryV2({ outputDirectory });
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
    console.error("usage: --plan (zero provider calls) or --execute (40 provider calls)");
    return 2;
  }
  const gate = collectiveDynamicsReplicateAverageExecuteGateV2({
    RUN_AUTHORIZED: process.env.RUN_AUTHORIZED,
    REPLICATE_AVERAGE_CANARY_APPROVED: process.env.REPLICATE_AVERAGE_CANARY_APPROVED,
  });
  if (!gate.ok) {
    console.error(gate.reason);
    return gate.code;
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("replicate_average_canary_v2_execute_blocked: ZHIPU_API_KEY unavailable");
    return 3;
  }
  const artifact = await executeFrozenCollectiveDynamicsReplicateAverageCanaryV2({
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
