/** File-backed wrapper for the 57-call M2/D1 public trajectory plan. */
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
import { buildCollectiveDynamicsPostM2BridgePlanV1 } from
  "./collectiveDynamicsPostM2BridgePlanV1";
import { buildDiscussionThermometerL4DevelopmentStage1PlanV1 } from
  "./discussionThermometerL4DevelopmentPlanV1";
import {
  executeCollectiveDynamicsTrajectoryPublicV1,
  verifyCollectiveDynamicsTrajectoryPublicRunV1,
  type CollectiveDynamicsTrajectoryPublicAttemptStartV1,
  type CollectiveDynamicsTrajectoryPublicAttemptTerminalV1,
  type CollectiveDynamicsTrajectoryPublicRunV1,
} from "./runCollectiveDynamicsTrajectoryPublicV1";
import {
  COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1,
  writeCollectiveDynamicsTrajectoryPublicArtifactsV1,
} from "./run_v6_collective_dynamics_trajectory_sensor_v1";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

const PLAN_FILE = "plan.json";
const PUBLIC_ATTEMPTS_FILE = "public-attempts.jsonl";
const PUBLIC_RUN_FILE = "public-run.json";

type PublicAttemptEventV1 =
  | CollectiveDynamicsTrajectoryPublicAttemptStartV1
  | CollectiveDynamicsTrajectoryPublicAttemptTerminalV1;

function exactJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeExactOrVerify(file: string, value: unknown): void {
  const text = exactJson(value);
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) {
      throw new Error(`trajectory_public_no_overwrite_conflict:${file}`);
    }
    return;
  }
  writeFileSync(file, text, { flag: "wx" });
}

function readPlan(outputDirectory: string): CollectiveDynamicsTrajectoryPilotPlanV1 {
  const file = join(outputDirectory, PLAN_FILE);
  if (!existsSync(file)) throw new Error("trajectory_public_plan_missing");
  const plan = JSON.parse(readFileSync(file, "utf8")) as CollectiveDynamicsTrajectoryPilotPlanV1;
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan);
  return plan;
}

function appendEvent(file: string, event: PublicAttemptEventV1): void {
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

export function writeCollectiveDynamicsTrajectoryPublicPlanV1(
  outputDirectoryInput?: string,
  planKind: "m2" | "post-m2-bridge" | "l4-development-stage1" = "m2",
): {
  outputDirectory: string;
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
} {
  const outputDirectory = resolve(outputDirectoryInput ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1);
  const plan = (planKind === "post-m2-bridge"
    ? buildCollectiveDynamicsPostM2BridgePlanV1()
    : planKind === "l4-development-stage1"
      ? buildDiscussionThermometerL4DevelopmentStage1PlanV1()
      : buildCollectiveDynamicsTrajectoryPilotPlanV1()) as CollectiveDynamicsTrajectoryPilotPlanV1;
  writeExactOrVerify(join(outputDirectory, PLAN_FILE), plan);
  return { outputDirectory, plan };
}

export function preflightCollectiveDynamicsTrajectoryPublicV1(outputDirectoryInput?: string): {
  outputDirectory: string;
  planHash: string;
  sourceTaskCount: number;
  registeredAgentCount: number;
  publicRounds: number;
  plannedProviderCalls: number;
  outputFresh: boolean;
} {
  const outputDirectory = resolve(outputDirectoryInput ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1);
  const plan = readPlan(outputDirectory);
  return {
    outputDirectory,
    planHash: plan.contentHash,
    sourceTaskCount: plan.sourceTaskIds.length,
    registeredAgentCount: plan.registeredAgentCount,
    publicRounds: plan.publicRounds.length,
    plannedProviderCalls: plan.publicCallCount,
    outputFresh: !existsSync(join(outputDirectory, PUBLIC_ATTEMPTS_FILE))
      && !existsSync(join(outputDirectory, PUBLIC_RUN_FILE)),
  };
}

export function trajectoryPublicExecuteGateV1(env: {
  RUN_AUTHORIZED?: string;
  M2_PUBLIC_EXECUTION_REVIEWED?: string;
}): { ok: true } | { ok: false; code: 5; reason: string } {
  if (env.RUN_AUTHORIZED !== "yes") {
    return { ok: false, code: 5, reason: "trajectory_public_execute_blocked: RUN_AUTHORIZED=yes not present" };
  }
  if (env.M2_PUBLIC_EXECUTION_REVIEWED !== "yes") {
    return { ok: false, code: 5, reason: "trajectory_public_execute_blocked: M2_PUBLIC_EXECUTION_REVIEWED=yes not present" };
  }
  return { ok: true };
}

export function auditCollectiveDynamicsTrajectoryPublicAttemptLedgerV1(input: {
  artifact: CollectiveDynamicsTrajectoryPublicRunV1;
  file: string;
}): void {
  if (!existsSync(input.file)) throw new Error("trajectory_public_attempt_ledger_missing");
  const lines = readFileSync(input.file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length !== input.artifact.registeredCellCount * 2) {
    throw new Error("trajectory_public_attempt_ledger_event_count_invalid");
  }
  const events = lines.map(line => JSON.parse(line) as PublicAttemptEventV1);
  input.artifact.terminals.forEach((terminalValue, index) => {
    const started = events[index * 2];
    const terminal = events[index * 2 + 1];
    if (started.type !== "started" || terminal.type !== "terminal"
      || started.sequence !== index + 1 || terminal.sequence !== index + 1
      || started.cellId !== terminalValue.cellId || terminal.cellId !== terminalValue.cellId
      || started.requestHash !== terminalValue.requestHash
      || terminal.requestHash !== terminalValue.requestHash
      || terminal.terminal.cellId !== terminalValue.cellId
      || terminal.timestamp !== terminalValue.terminalAt) {
      throw new Error("trajectory_public_attempt_ledger_binding_invalid");
    }
  });
}

export async function executeFrozenCollectiveDynamicsTrajectoryPublicV1(input: {
  outputDirectory?: string;
  invoker: SingleAttemptTextInvoker;
  clock?: () => string;
}): Promise<CollectiveDynamicsTrajectoryPublicRunV1> {
  const outputDirectory = resolve(input.outputDirectory ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1);
  const plan = readPlan(outputDirectory);
  const attemptsFile = join(outputDirectory, PUBLIC_ATTEMPTS_FILE);
  const runFile = join(outputDirectory, PUBLIC_RUN_FILE);
  if (existsSync(attemptsFile) || existsSync(runFile)) {
    throw new Error("trajectory_public_execution_not_fresh");
  }
  const artifact = await executeCollectiveDynamicsTrajectoryPublicV1({
    plan,
    invoker: input.invoker,
    clock: input.clock,
    onStart: event => appendEvent(attemptsFile, event),
    onTerminal: event => appendEvent(attemptsFile, event),
  });
  auditCollectiveDynamicsTrajectoryPublicAttemptLedgerV1({ artifact, file: attemptsFile });
  verifyCollectiveDynamicsTrajectoryPublicRunV1({ plan, artifact });
  writeExactOrVerify(runFile, artifact);
  writeCollectiveDynamicsTrajectoryPublicArtifactsV1({
    outputDirectory,
    plan,
    artifacts: artifact.taskArtifacts,
  });
  return artifact;
}

async function main(): Promise<number> {
  const outputDirectory = process.env.M2_TRAJECTORY_SENSOR_OUTPUT_DIR
    ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1;
  if (process.argv.includes("--plan")) {
    const result = writeCollectiveDynamicsTrajectoryPublicPlanV1(
      outputDirectory,
      process.argv.includes("--post-m2-bridge") ? "post-m2-bridge"
        : process.argv.includes("--l4-development-stage1") ? "l4-development-stage1" : "m2",
    );
    console.log(JSON.stringify({ mode: "plan", providerCalls: 0, outputDirectory: result.outputDirectory, planHash: result.plan.contentHash }));
    return 0;
  }
  if (process.argv.includes("--preflight")) {
    console.log(JSON.stringify({ mode: "preflight", providerCalls: 0, ...preflightCollectiveDynamicsTrajectoryPublicV1(outputDirectory) }));
    return 0;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --plan [--post-m2-bridge] | --preflight (zero provider calls) | --execute (57 public calls)");
    return 2;
  }
  const gate = trajectoryPublicExecuteGateV1({
    RUN_AUTHORIZED: process.env.RUN_AUTHORIZED,
    M2_PUBLIC_EXECUTION_REVIEWED: process.env.M2_PUBLIC_EXECUTION_REVIEWED,
  });
  if (!gate.ok) {
    console.error(gate.reason);
    return gate.code;
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("trajectory_public_execute_blocked: ZHIPU_API_KEY unavailable");
    return 3;
  }
  const artifact = await executeFrozenCollectiveDynamicsTrajectoryPublicV1({
    outputDirectory,
    invoker: createZhipuRawSingleAttemptInvoker("glm-4.6v"),
  });
  console.log(JSON.stringify({ mode: "execute", providerCalls: artifact.providerCallCount, runHash: artifact.contentHash }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
