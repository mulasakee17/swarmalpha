/**
 * One-off append-only recovery for the 2026-08-28 M2 trajectory sensor run.
 *
 * The first execution validated canonical labels even though the frozen prompt
 * requested opaque option IDs. The original ledger is immutable. This tool
 * reparses the 52 captured responses, marks the in-flight 53rd cell as
 * unobserved, and invokes only cells 54..152.
 */
import dotenv from "dotenv";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { parseCollectiveDynamicsSensorReportV1_1 } from
  "./collectiveDynamicsPromptSensitivityCanaryV1";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";
import {
  executeCollectiveDynamicsTrajectorySensorV1,
  verifyCollectiveDynamicsTrajectorySensorRunV1,
  type CollectiveDynamicsTrajectorySensorAttemptStartV1,
  type CollectiveDynamicsTrajectorySensorAttemptTerminalV1,
  type CollectiveDynamicsTrajectorySensorTerminalV1,
} from "./runCollectiveDynamicsTrajectorySensorV1";
import {
  COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1,
  loadFrozenCollectiveDynamicsTrajectorySensorV1,
} from "./run_v6_collective_dynamics_trajectory_sensor_v1";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

const ORIGINAL_ATTEMPTS_FILE = "attempts.jsonl";
const RECOVERY_ATTEMPTS_FILE = "recovery-attempts.jsonl";
const RECOVERY_RECORD_FILE = "recovery.json";
const RUN_FILE = "run.json";
const EXPECTED_COMPLETED_PREFIX = 52;
const EXPECTED_INTERRUPTED_SEQUENCE = 53;

type AttemptEventV1 =
  | CollectiveDynamicsTrajectorySensorAttemptStartV1
  | CollectiveDynamicsTrajectorySensorAttemptTerminalV1;

function readEvents(file: string): AttemptEventV1[] {
  return readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)
    .map(line => JSON.parse(line) as AttemptEventV1);
}

function exactJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeFresh(file: string, value: unknown): void {
  writeFileSync(file, exactJson(value), { flag: "wx" });
}

function appendEvent(file: string, event: AttemptEventV1): void {
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

function bindStarted(
  event: AttemptEventV1,
  cell: ReturnType<typeof loadFrozenCollectiveDynamicsTrajectorySensorV1>["freeze"]["cells"][number],
): asserts event is CollectiveDynamicsTrajectorySensorAttemptStartV1 {
  if (event.type !== "started"
    || event.cellId !== cell.cellId
    || event.requestId !== cell.request.requestId
    || event.requestHash !== cell.requestHash
    || event.sequence !== cell.globalSequence) {
    throw new Error("trajectory_sensor_recovery_started_binding_invalid");
  }
}

function recoveredValidTerminal(input: {
  event: AttemptEventV1;
  cell: ReturnType<typeof loadFrozenCollectiveDynamicsTrajectorySensorV1>["freeze"]["cells"][number];
  optionCount: number;
}): CollectiveDynamicsTrajectorySensorTerminalV1 {
  const { event, cell } = input;
  if (event.type !== "terminal"
    || event.cellId !== cell.cellId
    || event.requestId !== cell.request.requestId
    || event.requestHash !== cell.requestHash
    || event.sequence !== cell.globalSequence
    || event.terminal.status !== "invalid_response"
    || event.terminal.parseFailureCode !== "sensor_canary_option_set_mismatch") {
    throw new Error("trajectory_sensor_recovery_terminal_binding_invalid");
  }
  const original = event.terminal;
  const parsed = parseCollectiveDynamicsSensorReportV1_1(
    original.rawResponse,
    Array.from({ length: input.optionCount }, (_, index) => `opt_${index + 1}`),
  );
  return {
    cellId: original.cellId,
    requestId: original.requestId,
    requestHash: original.requestHash,
    promptHash: original.promptHash,
    startedAt: original.startedAt,
    terminalAt: original.terminalAt,
    status: "valid",
    rawResponse: original.rawResponse,
    responseHash: original.responseHash,
    parsed,
    ...(original.providerMetadata ? { providerMetadata: original.providerMetadata } : {}),
    ...(original.usage ? { usage: original.usage } : {}),
  };
}

function inspectInterruptedRun(outputDirectoryInput?: string): {
  frozen: ReturnType<typeof loadFrozenCollectiveDynamicsTrajectorySensorV1>;
  originalAttemptsFile: string;
  completed: CollectiveDynamicsTrajectorySensorTerminalV1[];
  interruptedStart: CollectiveDynamicsTrajectorySensorAttemptStartV1;
  remainingProviderCalls: number;
  originalLedgerHash: string;
} {
  const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(outputDirectoryInput);
  const originalAttemptsFile = join(frozen.outputDirectory, ORIGINAL_ATTEMPTS_FILE);
  if (!existsSync(originalAttemptsFile)) throw new Error("trajectory_sensor_recovery_original_ledger_missing");
  const rawLedger = readFileSync(originalAttemptsFile, "utf8");
  const events = readEvents(originalAttemptsFile);
  if (events.length !== EXPECTED_COMPLETED_PREFIX * 2 + 1) {
    throw new Error("trajectory_sensor_recovery_original_event_count_invalid");
  }
  const completed: CollectiveDynamicsTrajectorySensorTerminalV1[] = [];
  for (let index = 0; index < EXPECTED_COMPLETED_PREFIX; index += 1) {
    const cell = frozen.freeze.cells[index];
    const start = events[index * 2];
    const terminal = events[index * 2 + 1];
    bindStarted(start, cell);
    const view = frozen.freeze.views.find(candidate => candidate.contentHash === cell.snapshotHash);
    if (!view) throw new Error("trajectory_sensor_recovery_view_missing");
    completed.push(recoveredValidTerminal({
      event: terminal,
      cell,
      optionCount: view.claim.options.length,
    }));
  }
  const interruptedCell = frozen.freeze.cells[EXPECTED_INTERRUPTED_SEQUENCE - 1];
  const interruptedEvent = events[events.length - 1];
  bindStarted(interruptedEvent, interruptedCell);
  return {
    frozen,
    originalAttemptsFile,
    completed,
    interruptedStart: interruptedEvent,
    remainingProviderCalls: frozen.freeze.registeredCellCount - EXPECTED_INTERRUPTED_SEQUENCE,
    originalLedgerHash: hashCollectiveDynamicsValueV1(rawLedger),
  };
}

function recoveryPreflight(outputDirectoryInput?: string) {
  const inspected = inspectInterruptedRun(outputDirectoryInput);
  const recoveryAttemptsFile = join(inspected.frozen.outputDirectory, RECOVERY_ATTEMPTS_FILE);
  const recoveryRecordFile = join(inspected.frozen.outputDirectory, RECOVERY_RECORD_FILE);
  const runFile = join(inspected.frozen.outputDirectory, RUN_FILE);
  return {
    inspected,
    outputFresh: !existsSync(recoveryAttemptsFile)
      && !existsSync(recoveryRecordFile)
      && !existsSync(runFile),
    recoveryAttemptsFile,
    recoveryRecordFile,
    runFile,
  };
}

async function executeRecovery(outputDirectoryInput?: string): Promise<{
  runHash: string;
  recoveryProviderCalls: number;
  validTerminals: number;
  interruptedTerminals: number;
}> {
  const preflight = recoveryPreflight(outputDirectoryInput);
  if (!preflight.outputFresh) throw new Error("trajectory_sensor_recovery_output_not_fresh");
  const { inspected } = preflight;
  const interruptedMillis = Math.max(
    Date.now(),
    Date.parse(inspected.interruptedStart.timestamp) + 1,
  );
  const interruptedCell = inspected.frozen.freeze.cells[EXPECTED_INTERRUPTED_SEQUENCE - 1];
  const interrupted: CollectiveDynamicsTrajectorySensorTerminalV1 = {
    cellId: interruptedCell.cellId,
    requestId: interruptedCell.request.requestId,
    requestHash: interruptedCell.requestHash,
    promptHash: interruptedCell.promptHash,
    startedAt: inspected.interruptedStart.timestamp,
    terminalAt: new Date(interruptedMillis).toISOString(),
    status: "interrupted_unobserved",
  };
  const initialTerminals = [...inspected.completed, interrupted];
  const run = await executeCollectiveDynamicsTrajectorySensorV1({
    plan: inspected.frozen.plan,
    artifacts: inspected.frozen.artifacts,
    freeze: inspected.frozen.freeze,
    initialTerminals,
    invoker: createZhipuRawSingleAttemptInvoker("glm-4.6v"),
    onStart: event => appendEvent(preflight.recoveryAttemptsFile, event),
    onTerminal: event => {
      appendEvent(preflight.recoveryAttemptsFile, event);
      if (event.status !== "valid") {
        throw new Error(`trajectory_sensor_recovery_nonvalid_terminal:${event.sequence}:${event.status}`);
      }
    },
  });
  verifyCollectiveDynamicsTrajectorySensorRunV1({
    plan: inspected.frozen.plan,
    freeze: inspected.frozen.freeze,
    artifact: run,
  });
  const validTerminals = run.terminals.filter(terminal => terminal.status === "valid").length;
  const interruptedTerminals = run.terminals
    .filter(terminal => terminal.status === "interrupted_unobserved").length;
  if (validTerminals !== 151 || interruptedTerminals !== 1) {
    throw new Error("trajectory_sensor_recovery_terminal_counts_invalid");
  }
  writeFresh(preflight.runFile, run);
  writeFresh(preflight.recoveryRecordFile, {
    recoveryRef: {
      id: "swarmalpha.experiment.v6.collective-dynamics-trajectory-sensor-option-id-recovery",
      version: "1.0.0",
    },
    planHash: inspected.frozen.plan.contentHash,
    freezeHash: inspected.frozen.freeze.contentHash,
    originalLedgerHash: inspected.originalLedgerHash,
    defect: "trajectory_sensor_parser_used_canonical_labels_instead_of_frozen_option_ids",
    reparsedCapturedResponses: inspected.completed.length,
    interruptedUnobservedCellId: interrupted.cellId,
    resumedFirstSequence: EXPECTED_INTERRUPTED_SEQUENCE + 1,
    recoveryProviderCalls: inspected.remainingProviderCalls,
    validTerminals,
    interruptedTerminals,
    runHash: run.contentHash,
  });
  return {
    runHash: run.contentHash,
    recoveryProviderCalls: inspected.remainingProviderCalls,
    validTerminals,
    interruptedTerminals,
  };
}

async function main(): Promise<number> {
  const outputDirectory = process.env.M2_TRAJECTORY_SENSOR_OUTPUT_DIR
    ?? COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_OUTPUT_V1;
  const preflight = recoveryPreflight(outputDirectory);
  if (process.argv.includes("--preflight")) {
    console.log(JSON.stringify({
      mode: "recovery-preflight",
      providerCalls: 0,
      outputDirectory: preflight.inspected.frozen.outputDirectory,
      originalLedgerHash: preflight.inspected.originalLedgerHash,
      reparsableResponses: preflight.inspected.completed.length,
      interruptedSequence: preflight.inspected.interruptedStart.sequence,
      plannedRecoveryProviderCalls: preflight.inspected.remainingProviderCalls,
      outputFresh: preflight.outputFresh,
    }));
    return preflight.outputFresh ? 0 : 4;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --preflight (zero provider calls) | --execute (99 recovery calls)");
    return 2;
  }
  if (process.env.RUN_AUTHORIZED !== "yes"
    || process.env.M2_SENSOR_RECOVERY_REVIEWED !== "yes") {
    console.error("trajectory_sensor_recovery_execute_blocked: explicit gates unavailable");
    return 5;
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("trajectory_sensor_recovery_execute_blocked: ZHIPU_API_KEY unavailable");
    return 3;
  }
  const result = await executeRecovery(outputDirectory);
  console.log(JSON.stringify({ mode: "recovery-execute", ...result }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

