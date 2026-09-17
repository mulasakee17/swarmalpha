/**
 * File-backed M2 sensor wrapper.
 *
 * `--plan`, `--freeze`, and `--preflight` perform zero provider calls.
 * `--execute` remains explicitly operator-gated and is never reached by the
 * planning path. Public message trajectories must be supplied as frozen
 * artifacts before the sensor freeze can be created.
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
  buildCollectiveDynamicsTrajectoryPilotPlanV1,
  verifyCollectiveDynamicsTrajectoryPilotPlanV1,
  type CollectiveDynamicsTrajectoryPilotPlanV1,
} from "./collectiveDynamicsTrajectoryPilotV1";
import {
  buildCollectiveDynamicsTrajectorySensorFreezeV1,
  verifyCollectiveDynamicsTrajectorySensorFreezeV1,
  type CollectiveDynamicsTrajectorySensorFreezeV1,
} from "./collectiveDynamicsTrajectorySensorFreezeV1";
import {
  verifyCollectiveDynamicsTrajectoryPublicArtifactV1,
  type CollectiveDynamicsTrajectoryPublicArtifactV1,
} from "./collectiveDynamicsTrajectoryCheckpointV1";
import {
  executeCollectiveDynamicsTrajectorySensorV1,
  verifyCollectiveDynamicsTrajectorySensorRunV1,
  type CollectiveDynamicsTrajectorySensorAttemptStartV1,
  type CollectiveDynamicsTrajectorySensorAttemptTerminalV1,
  type CollectiveDynamicsTrajectorySensorRunV1,
} from "./runCollectiveDynamicsTrajectorySensorV1";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

export const COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1 =
  "results/v6_collective_dynamics_trajectory_sensor_v1_glm46v_seed1";

const PLAN_FILE = "plan.json";
const PUBLIC_MANIFEST_FILE = "public-manifest.json";
const SENSOR_FREEZE_FILE = "sensor-freeze.json";
const ATTEMPTS_FILE = "attempts.jsonl";
const RUN_FILE = "run.json";

type AttemptEventV1 =
  | CollectiveDynamicsTrajectorySensorAttemptStartV1
  | CollectiveDynamicsTrajectorySensorAttemptTerminalV1;

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
      throw new Error(`trajectory_sensor_no_overwrite_conflict:${file}`);
    }
    return;
  }
  writeFileSync(file, text, { flag: "wx" });
}

function appendAttemptEvent(file: string, event: AttemptEventV1): void {
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

function artifactFile(outputDirectory: string, sourceTaskId: number): string {
  return join(outputDirectory, `public-task-${sourceTaskId}-seed-1.json`);
}

export function writeCollectiveDynamicsTrajectoryPublicArtifactsV1(input: {
  outputDirectory: string;
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  artifacts: readonly CollectiveDynamicsTrajectoryPublicArtifactV1[];
}): void {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(input.plan);
  const byTask = new Map(input.artifacts.map(artifact => [artifact.onlineTask.sourceTaskId, artifact]));
  if (byTask.size !== input.artifacts.length
    || input.artifacts.length !== input.plan.sourceTaskIds.length
    || input.plan.sourceTaskIds.some(taskId => !byTask.has(taskId))) {
    throw new Error("trajectory_sensor_public_artifact_set_invalid");
  }
  input.plan.sourceTaskIds.forEach(sourceTaskId => {
    const artifact = byTask.get(sourceTaskId)!;
    verifyCollectiveDynamicsTrajectoryPublicArtifactV1(artifact, input.plan);
    writeExactOrVerify(artifactFile(resolve(input.outputDirectory), sourceTaskId), artifact);
  });
  writeExactOrVerify(join(resolve(input.outputDirectory), PLAN_FILE), input.plan);
  writeExactOrVerify(join(resolve(input.outputDirectory), PUBLIC_MANIFEST_FILE), {
    planHash: input.plan.contentHash,
    sourceTaskIds: [...input.plan.sourceTaskIds],
    artifactHashes: input.plan.sourceTaskIds.map(sourceTaskId => byTask.get(sourceTaskId)!.contentHash),
  });
}

export function loadCollectiveDynamicsTrajectoryPublicArtifactsV1(input: {
  outputDirectory: string;
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
}): CollectiveDynamicsTrajectoryPublicArtifactV1[] {
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(input.plan);
  const outputDirectory = resolve(input.outputDirectory);
  const artifacts = input.plan.sourceTaskIds.map(sourceTaskId => {
    const file = artifactFile(outputDirectory, sourceTaskId);
    if (!existsSync(file)) throw new Error(`trajectory_sensor_public_artifact_missing:${sourceTaskId}`);
    const artifact = readJson<CollectiveDynamicsTrajectoryPublicArtifactV1>(file);
    verifyCollectiveDynamicsTrajectoryPublicArtifactV1(artifact, input.plan);
    if (artifact.onlineTask.sourceTaskId !== sourceTaskId) {
      throw new Error(`trajectory_sensor_public_artifact_identity_invalid:${sourceTaskId}`);
    }
    return artifact;
  });
  const manifestFile = join(outputDirectory, PUBLIC_MANIFEST_FILE);
  if (!existsSync(manifestFile)) throw new Error("trajectory_sensor_public_manifest_missing");
  const manifest = readJson<{ planHash: string; sourceTaskIds: number[]; artifactHashes: string[] }>(manifestFile);
  if (manifest.planHash !== input.plan.contentHash
    || JSON.stringify(manifest.sourceTaskIds) !== JSON.stringify(input.plan.sourceTaskIds)
    || JSON.stringify(manifest.artifactHashes) !== JSON.stringify(artifacts.map(artifact => artifact.contentHash))) {
    throw new Error("trajectory_sensor_public_manifest_binding_invalid");
  }
  return artifacts;
}

export function freezeCollectiveDynamicsTrajectorySensorV1(input?: {
  outputDirectory?: string;
  artifacts?: readonly CollectiveDynamicsTrajectoryPublicArtifactV1[];
}): {
  outputDirectory: string;
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  artifacts: CollectiveDynamicsTrajectoryPublicArtifactV1[];
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
} {
  const outputDirectory = resolve(input?.outputDirectory ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1);
  const planFile = join(outputDirectory, PLAN_FILE);
  const plan = existsSync(planFile)
    ? readJson<CollectiveDynamicsTrajectoryPilotPlanV1>(planFile)
    : buildCollectiveDynamicsTrajectoryPilotPlanV1();
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan);
  if (input?.artifacts) {
    writeCollectiveDynamicsTrajectoryPublicArtifactsV1({
      outputDirectory,
      plan,
      artifacts: input.artifacts,
    });
  }
  const artifacts = loadCollectiveDynamicsTrajectoryPublicArtifactsV1({ outputDirectory, plan });
  const freeze = buildCollectiveDynamicsTrajectorySensorFreezeV1({ plan, artifacts });
  writeExactOrVerify(planFile, plan);
  writeExactOrVerify(join(outputDirectory, SENSOR_FREEZE_FILE), freeze);
  return { outputDirectory, plan, artifacts, freeze };
}

export function loadFrozenCollectiveDynamicsTrajectorySensorV1(outputDirectoryInput?: string): {
  outputDirectory: string;
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  artifacts: CollectiveDynamicsTrajectoryPublicArtifactV1[];
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
} {
  const outputDirectory = resolve(outputDirectoryInput ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1);
  const planFile = join(outputDirectory, PLAN_FILE);
  const freezeFile = join(outputDirectory, SENSOR_FREEZE_FILE);
  if (!existsSync(planFile) || !existsSync(freezeFile)) {
    throw new Error("trajectory_sensor_freeze_files_missing");
  }
  const plan = readJson<CollectiveDynamicsTrajectoryPilotPlanV1>(planFile);
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan);
  const artifacts = loadCollectiveDynamicsTrajectoryPublicArtifactsV1({ outputDirectory, plan });
  const freeze = readJson<CollectiveDynamicsTrajectorySensorFreezeV1>(freezeFile);
  verifyCollectiveDynamicsTrajectorySensorFreezeV1({ plan, artifacts, freeze });
  return { outputDirectory, plan, artifacts, freeze };
}

export function preflightCollectiveDynamicsTrajectorySensorV1(outputDirectoryInput?: string): {
  outputDirectory: string;
  planHash: string;
  freezeHash: string;
  sourceTrajectoryCount: number;
  registeredViewCount: number;
  registeredCellCount: number;
  plannedProviderCalls: number;
} {
  const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(outputDirectoryInput);
  return {
    outputDirectory: frozen.outputDirectory,
    planHash: frozen.plan.contentHash,
    freezeHash: frozen.freeze.contentHash,
    sourceTrajectoryCount: frozen.artifacts.length,
    registeredViewCount: frozen.freeze.registeredViewCount,
    registeredCellCount: frozen.freeze.registeredCellCount,
    plannedProviderCalls: frozen.freeze.registeredCellCount,
  };
}

export function auditCollectiveDynamicsTrajectorySensorAttemptLedgerV1(input: {
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
  file: string;
}): void {
  if (!existsSync(input.file)) throw new Error("trajectory_sensor_attempt_ledger_missing");
  const lines = readFileSync(input.file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length !== input.freeze.registeredCellCount * 2) {
    throw new Error("trajectory_sensor_attempt_ledger_event_count_invalid");
  }
  const events = lines.map(line => JSON.parse(line) as AttemptEventV1);
  input.freeze.cells.forEach((cell, index) => {
    const started = events[index * 2];
    const terminal = events[index * 2 + 1];
    if (started.type !== "started" || terminal.type !== "terminal"
      || started.sequence !== cell.globalSequence || terminal.sequence !== cell.globalSequence
      || started.cellId !== cell.cellId || terminal.cellId !== cell.cellId
      || started.requestId !== cell.request.requestId || terminal.requestId !== cell.request.requestId
      || started.requestHash !== cell.requestHash || terminal.requestHash !== cell.requestHash
      || terminal.terminal.cellId !== cell.cellId
      || terminal.timestamp !== terminal.terminal.terminalAt) {
      throw new Error("trajectory_sensor_attempt_ledger_binding_invalid");
    }
  });
}

export function trajectorySensorExecuteGateV1(env: {
  RUN_AUTHORIZED?: string;
  M2_SENSOR_EXECUTION_REVIEWED?: string;
}): { ok: true } | { ok: false; code: 5; reason: string } {
  if (env.RUN_AUTHORIZED !== "yes") {
    return { ok: false, code: 5, reason: "trajectory_sensor_execute_blocked: RUN_AUTHORIZED=yes not present" };
  }
  if (env.M2_SENSOR_EXECUTION_REVIEWED !== "yes") {
    return { ok: false, code: 5, reason: "trajectory_sensor_execute_blocked: M2_SENSOR_EXECUTION_REVIEWED=yes not present" };
  }
  return { ok: true };
}

export async function executeFrozenCollectiveDynamicsTrajectorySensorV1(input: {
  outputDirectory?: string;
  invoker: SingleAttemptTextInvoker;
  clock?: () => string;
}): Promise<CollectiveDynamicsTrajectorySensorRunV1> {
  const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(input.outputDirectory);
  const attemptsFile = join(frozen.outputDirectory, ATTEMPTS_FILE);
  const runFile = join(frozen.outputDirectory, RUN_FILE);
  if (existsSync(attemptsFile) || existsSync(runFile)) {
    throw new Error("trajectory_sensor_execution_not_fresh");
  }
  const artifact = await executeCollectiveDynamicsTrajectorySensorV1({
    plan: frozen.plan,
    artifacts: frozen.artifacts,
    freeze: frozen.freeze,
    invoker: input.invoker,
    clock: input.clock,
    onStart: event => appendAttemptEvent(attemptsFile, event),
    onTerminal: event => appendAttemptEvent(attemptsFile, event),
  });
  auditCollectiveDynamicsTrajectorySensorAttemptLedgerV1({ freeze: frozen.freeze, file: attemptsFile });
  verifyCollectiveDynamicsTrajectorySensorRunV1({
    plan: frozen.plan,
    freeze: frozen.freeze,
    artifact,
  });
  writeExactOrVerify(runFile, artifact);
  return artifact;
}

async function main(): Promise<number> {
  const outputDirectory = process.env.M2_TRAJECTORY_SENSOR_OUTPUT_DIR
    ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1;
  if (process.argv.includes("--plan")) {
    const plan = buildCollectiveDynamicsTrajectoryPilotPlanV1();
    writeExactOrVerify(join(resolve(outputDirectory), PLAN_FILE), plan);
    console.log(JSON.stringify({ mode: "plan", providerCalls: 0, outputDirectory: resolve(outputDirectory), planHash: plan.contentHash }));
    return 0;
  }
  if (process.argv.includes("--freeze")) {
    const frozen = freezeCollectiveDynamicsTrajectorySensorV1({ outputDirectory });
    console.log(JSON.stringify({ mode: "freeze", providerCalls: 0, outputDirectory: frozen.outputDirectory, freezeHash: frozen.freeze.contentHash, cells: frozen.freeze.registeredCellCount }));
    return 0;
  }
  if (process.argv.includes("--preflight")) {
    const preflight = preflightCollectiveDynamicsTrajectorySensorV1(outputDirectory);
    console.log(JSON.stringify({ mode: "preflight", providerCalls: 0, ...preflight }));
    return 0;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --plan | --freeze | --preflight (zero provider calls) | --execute (152 sensor calls)");
    return 2;
  }
  const gate = trajectorySensorExecuteGateV1({
    RUN_AUTHORIZED: process.env.RUN_AUTHORIZED,
    M2_SENSOR_EXECUTION_REVIEWED: process.env.M2_SENSOR_EXECUTION_REVIEWED,
  });
  if (!gate.ok) {
    console.error(gate.reason);
    return gate.code;
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("trajectory_sensor_execute_blocked: ZHIPU_API_KEY unavailable");
    return 3;
  }
  const artifact = await executeFrozenCollectiveDynamicsTrajectorySensorV1({
    outputDirectory,
    invoker: createZhipuRawSingleAttemptInvoker("glm-4.6v"),
  });
  console.log(JSON.stringify({ mode: "execute", providerCalls: artifact.terminals.length, runHash: artifact.contentHash }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
