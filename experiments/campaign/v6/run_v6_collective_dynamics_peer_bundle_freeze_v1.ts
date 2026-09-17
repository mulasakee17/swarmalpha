/**
 * M1 pre-peer/peer bundle runner.
 * `--plan` is zero-provider; `--execute` is separately owner-gated.
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
  buildCollectiveDynamicsPeerBundleFreezeV1,
  buildCollectiveDynamicsPeerBundlePlanV1,
  verifyCollectiveDynamicsPeerBundleFreezeV1,
  verifyCollectiveDynamicsPeerBundlePlanV1,
  type CollectiveDynamicsPeerBundleFreezeV1,
  type CollectiveDynamicsPeerBundlePlanV1,
} from "./collectiveDynamicsPeerBundleFreezeV1";
import {
  executeCollectiveDynamicsPeerBundleV1,
  verifyCollectiveDynamicsPeerBundleRunV1,
  type CollectiveDynamicsPeerBundleRunV1,
  type PeerBundleAttemptStartV1,
  type PeerBundleAttemptTerminalV1,
} from "./collectiveDynamicsPeerBundleExecutionV1";
import {
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
} from "./collectiveDynamicsV1";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

export const COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_OUTPUT_V1 =
  "results/v6_collective_dynamics_peer_bundle_freeze_v1_glm46v_seed1";

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
      throw new Error(`peer_bundle_freeze_v1_no_overwrite_conflict:${file}`);
    }
    return;
  }
  writeFileSync(file, text, { flag: "wx" });
}

type PeerBundleLedgerEventV1 = PeerBundleAttemptStartV1 | PeerBundleAttemptTerminalV1;

function appendLedgerEvent(file: string, event: PeerBundleLedgerEventV1): void {
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

export function loadCollectiveDynamicsPeerBundleFormationsV1(
  plan: CollectiveDynamicsPeerBundlePlanV1,
): CollectiveDynamicsFormationArtifactV1[] {
  verifyCollectiveDynamicsPeerBundlePlanV1(plan);
  const sourceDirectory = resolve(plan.sourceFormationDirectory);
  return plan.sourceTaskIds.map(sourceTaskId => {
    const file = join(sourceDirectory, `formation-task-${sourceTaskId}-seed-${plan.sourceSeed}.json`);
    if (!existsSync(file)) {
      throw new Error(`peer_bundle_freeze_v1_source_formation_missing:${sourceTaskId}`);
    }
    const formation = readJson<CollectiveDynamicsFormationArtifactV1>(file);
    verifyFormationArtifactV1(formation);
    if (formation.onlineTask.sourceTaskId !== sourceTaskId || formation.seed !== plan.sourceSeed) {
      throw new Error(`peer_bundle_freeze_v1_source_formation_identity_invalid:${sourceTaskId}`);
    }
    return formation;
  });
}

export function freezeCollectiveDynamicsPeerBundleV1(input?: {
  outputDirectory?: string;
  sourceFormationDirectory?: string;
}): {
  outputDirectory: string;
  plan: CollectiveDynamicsPeerBundlePlanV1;
  formations: CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsPeerBundleFreezeV1;
} {
  const outputDirectory = resolve(
    input?.outputDirectory ?? COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_OUTPUT_V1,
  );
  const plan = buildCollectiveDynamicsPeerBundlePlanV1({
    sourceFormationDirectory: input?.sourceFormationDirectory,
  });
  const formations = loadCollectiveDynamicsPeerBundleFormationsV1(plan);
  const freeze = buildCollectiveDynamicsPeerBundleFreezeV1({ plan, formations });
  writeExactOrVerify(join(outputDirectory, "plan.json"), plan);
  writeExactOrVerify(join(outputDirectory, "freeze.json"), freeze);
  return { outputDirectory, plan, formations, freeze };
}

export function loadFrozenCollectiveDynamicsPeerBundleV1(outputDirectoryInput?: string): {
  outputDirectory: string;
  plan: CollectiveDynamicsPeerBundlePlanV1;
  formations: CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsPeerBundleFreezeV1;
} {
  const outputDirectory = resolve(
    outputDirectoryInput ?? COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_OUTPUT_V1,
  );
  const plan = readJson<CollectiveDynamicsPeerBundlePlanV1>(join(outputDirectory, "plan.json"));
  const freeze = readJson<CollectiveDynamicsPeerBundleFreezeV1>(join(outputDirectory, "freeze.json"));
  const formations = loadCollectiveDynamicsPeerBundleFormationsV1(plan);
  verifyCollectiveDynamicsPeerBundleFreezeV1({ plan, formations, freeze });
  return { outputDirectory, plan, formations, freeze };
}

export function auditCollectiveDynamicsPeerBundleLedgerV1(input: {
  freeze: CollectiveDynamicsPeerBundleFreezeV1;
  file: string;
}): void {
  if (!existsSync(input.file)) {
    throw new Error("peer_bundle_attempt_ledger_missing");
  }
  const lines = readFileSync(input.file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length !== input.freeze.registeredCellCount * 2) {
    throw new Error("peer_bundle_attempt_ledger_event_count_invalid");
  }
  const events = lines.map(line => JSON.parse(line) as PeerBundleLedgerEventV1);
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
      throw new Error("peer_bundle_attempt_ledger_binding_invalid");
    }
  });
}

function executeGate(env: {
  RUN_AUTHORIZED?: string;
  PEER_BUNDLE_CANARY_APPROVED?: string;
}): { ok: true } | { ok: false; code: 5; reason: string } {
  if (env.RUN_AUTHORIZED !== "yes") {
    return { ok: false, code: 5, reason: "peer_bundle_execute_blocked: RUN_AUTHORIZED=yes not present" };
  }
  if (env.PEER_BUNDLE_CANARY_APPROVED !== "yes") {
    return {
      ok: false,
      code: 5,
      reason: "peer_bundle_execute_blocked: PEER_BUNDLE_CANARY_APPROVED=yes not present",
    };
  }
  return { ok: true };
}

export async function executeFrozenCollectiveDynamicsPeerBundleV1(input: {
  outputDirectory?: string;
  invoker: Parameters<typeof executeCollectiveDynamicsPeerBundleV1>[0]["invoker"];
  clock?: () => string;
}): Promise<CollectiveDynamicsPeerBundleRunV1> {
  const frozen = loadFrozenCollectiveDynamicsPeerBundleV1(input.outputDirectory);
  const attemptsPath = join(frozen.outputDirectory, "attempts.jsonl");
  const runPath = join(frozen.outputDirectory, "run.json");
  if (existsSync(attemptsPath) || existsSync(runPath)) {
    throw new Error("peer_bundle_execution_not_fresh");
  }
  const artifact = await executeCollectiveDynamicsPeerBundleV1({
    plan: frozen.plan,
    formations: frozen.formations,
    freeze: frozen.freeze,
    invoker: input.invoker,
    clock: input.clock,
    onStart: event => appendLedgerEvent(attemptsPath, event),
    onTerminal: event => appendLedgerEvent(attemptsPath, event),
  });
  auditCollectiveDynamicsPeerBundleLedgerV1({ freeze: frozen.freeze, file: attemptsPath });
  verifyCollectiveDynamicsPeerBundleRunV1({ freeze: frozen.freeze, artifact });
  writeExactOrVerify(runPath, artifact);
  return artifact;
}

async function main(): Promise<number> {
  if (process.argv.includes("--plan")) {
    const frozen = freezeCollectiveDynamicsPeerBundleV1({
      outputDirectory: process.env.PEER_BUNDLE_FREEZE_OUTPUT_DIR,
    });
    console.log(JSON.stringify({
      mode: "plan",
      providerCalls: 0,
      outputDirectory: frozen.outputDirectory,
      planHash: frozen.plan.contentHash,
      freezeHash: frozen.freeze.contentHash,
      units: frozen.freeze.registeredUnitCount,
      cells: frozen.freeze.registeredCellCount,
    }));
    return 0;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --plan (zero provider calls) or --execute (152 provider calls)");
    return 2;
  }
  const gate = executeGate({
    RUN_AUTHORIZED: process.env.RUN_AUTHORIZED,
    PEER_BUNDLE_CANARY_APPROVED: process.env.PEER_BUNDLE_CANARY_APPROVED,
  });
  if (!gate.ok) {
    console.error(gate.reason);
    return gate.code;
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("peer_bundle_execute_blocked: ZHIPU_API_KEY unavailable");
    return 3;
  }
  const artifact = await executeFrozenCollectiveDynamicsPeerBundleV1({
    outputDirectory: process.env.PEER_BUNDLE_FREEZE_OUTPUT_DIR,
    invoker: createZhipuRawSingleAttemptInvoker("glm-4.6v"),
  });
  console.log(JSON.stringify({
    mode: "execute",
    providerCalls: artifact.terminalCellCount,
    runHash: artifact.contentHash,
    outputDirectory: resolve(process.env.PEER_BUNDLE_FREEZE_OUTPUT_DIR
      ?? COLLECTIVE_DYNAMICS_PEER_BUNDLE_FREEZE_OUTPUT_V1),
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
