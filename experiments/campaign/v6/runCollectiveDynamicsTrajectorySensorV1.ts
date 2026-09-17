/**
 * Provider-neutral executor for the frozen M2 sensor cells.
 *
 * The invoker is injected, attempts are strictly single-shot, execution is
 * sequential in freeze order, and every cell receives exactly one terminal.
 * This module does not load credentials or choose a provider.
 */
import {
  parseCollectiveDynamicsSensorReportV1_1,
  type ParsedSensorReportV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  verifyCollectiveDynamicsTrajectorySensorFreezeV1,
  type CollectiveDynamicsTrajectorySensorFreezeV1,
} from "./collectiveDynamicsTrajectorySensorFreezeV1";
import type {
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";
import { providerFailureCode, type V6ProviderFailureCode } from "./providerDiagnostics";
import type { CollectiveDynamicsTrajectoryPublicArtifactV1 } from
  "./collectiveDynamicsTrajectoryCheckpointV1";
import type { CollectiveDynamicsTrajectoryPilotPlanV1 } from
  "./collectiveDynamicsTrajectoryPilotV1";

export const COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_RUN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-trajectory-sensor-run",
  version: "1.0.0",
});

export type CollectiveDynamicsTrajectorySensorTerminalStatusV1 =
  | "valid"
  | "invalid_response"
  | "interrupted_unobserved"
  | V6ProviderFailureCode
  | "provider_error";

interface TerminalBaseV1 {
  cellId: string;
  requestId: string;
  requestHash: string;
  promptHash: string;
  startedAt: string;
  terminalAt: string;
}

export type CollectiveDynamicsTrajectorySensorTerminalV1 =
  | (TerminalBaseV1 & {
      status: "valid";
      rawResponse: string;
      responseHash: string;
      parsed: ParsedSensorReportV1;
      providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"];
      usage?: SingleAttemptTextInvokeResult["usage"];
    })
  | (TerminalBaseV1 & {
      status: "invalid_response";
      rawResponse: string;
      responseHash: string;
      parseFailureCode: string;
      providerMetadata?: SingleAttemptTextInvokeResult["providerMetadata"];
      usage?: SingleAttemptTextInvokeResult["usage"];
    })
  | (TerminalBaseV1 & {
      status: V6ProviderFailureCode | "provider_error";
    })
  | (TerminalBaseV1 & {
      /** The request started, but the local runner stopped before observing a response. */
      status: "interrupted_unobserved";
    });

export interface CollectiveDynamicsTrajectorySensorRunV1 {
  runRef: typeof COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_RUN_V1;
  planHash: string;
  freezeHash: string;
  sourceTrajectoryHashes: string[];
  terminals: CollectiveDynamicsTrajectorySensorTerminalV1[];
  registeredCellCount: number;
  terminalCellCount: number;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

export interface CollectiveDynamicsTrajectorySensorAttemptStartV1 {
  type: "started";
  cellId: string;
  requestId: string;
  requestHash: string;
  sequence: number;
  timestamp: string;
}

export interface CollectiveDynamicsTrajectorySensorAttemptTerminalV1 {
  type: "terminal";
  cellId: string;
  requestId: string;
  requestHash: string;
  sequence: number;
  status: CollectiveDynamicsTrajectorySensorTerminalStatusV1;
  timestamp: string;
  terminal: CollectiveDynamicsTrajectorySensorTerminalV1;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function monotonicClock(clock?: () => string): () => string {
  if (clock) return clock;
  let previous = Number.NEGATIVE_INFINITY;
  return () => {
    const next = Math.max(Date.now(), previous + 1);
    previous = next;
    return new Date(next).toISOString();
  };
}

function canonicalTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error("trajectory_sensor_timestamp_invalid");
  }
  return parsed;
}

function parseFailureCode(error: unknown): string {
  return error instanceof Error && /^sensor_canary_[a-z0-9_]+$/.test(error.message)
    ? error.message
    : "sensor_canary_parse_unknown";
}

function optionsForCell(
  cell: CollectiveDynamicsTrajectorySensorFreezeV1["cells"][number],
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1,
): string[] {
  const view = freeze.views.find(candidate => candidate.contentHash === cell.snapshotHash);
  if (!view) throw new Error("trajectory_sensor_cell_snapshot_missing");
  // The frozen prompt deliberately exposes opaque option IDs while retaining
  // the canonical labels only as presentation text. Validate exactly the IDs
  // requested by that prompt; labels are not response keys.
  return view.claim.options.map((_, index) => `opt_${index + 1}`);
}

function verifyInitialTerminalPrefixV1(input: {
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
  terminals: readonly CollectiveDynamicsTrajectorySensorTerminalV1[];
}): void {
  if (input.terminals.length > input.freeze.cells.length) {
    throw new Error("trajectory_sensor_initial_terminal_prefix_too_long");
  }
  let lastTerminalAt = Number.NEGATIVE_INFINITY;
  input.terminals.forEach((terminal, index) => {
    const cell = input.freeze.cells[index];
    if (terminal.cellId !== cell.cellId
      || terminal.requestId !== cell.request.requestId
      || terminal.requestHash !== cell.requestHash
      || terminal.promptHash !== cell.promptHash
      || canonicalTimestamp(terminal.terminalAt) <= canonicalTimestamp(terminal.startedAt)
      || canonicalTimestamp(terminal.terminalAt) <= lastTerminalAt) {
      throw new Error("trajectory_sensor_initial_terminal_prefix_invalid");
    }
    lastTerminalAt = canonicalTimestamp(terminal.terminalAt);
    if (terminal.status === "valid" || terminal.status === "invalid_response") {
      if (terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)) {
        throw new Error("trajectory_sensor_initial_terminal_response_hash_mismatch");
      }
    }
    if (terminal.status === "valid") {
      const expected = parseCollectiveDynamicsSensorReportV1_1(
        terminal.rawResponse,
        optionsForCell(cell, input.freeze),
      );
      if (JSON.stringify(expected) !== JSON.stringify(terminal.parsed)) {
        throw new Error("trajectory_sensor_initial_terminal_parse_mismatch");
      }
    }
  });
}

export async function executeCollectiveDynamicsTrajectorySensorV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  artifacts: readonly CollectiveDynamicsTrajectoryPublicArtifactV1[];
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
  invoker: SingleAttemptTextInvoker;
  /** Verified prefix used only for append-only recovery after an interrupted run. */
  initialTerminals?: readonly CollectiveDynamicsTrajectorySensorTerminalV1[];
  signal?: AbortSignal;
  clock?: () => string;
  onStart?: (event: CollectiveDynamicsTrajectorySensorAttemptStartV1) => void;
  onTerminal?: (event: CollectiveDynamicsTrajectorySensorAttemptTerminalV1) => void;
}): Promise<CollectiveDynamicsTrajectorySensorRunV1> {
  verifyCollectiveDynamicsTrajectorySensorFreezeV1({
    plan: input.plan,
    artifacts: input.artifacts,
    freeze: input.freeze,
  });
  const clock = monotonicClock(input.clock);
  const signal = input.signal ?? new AbortController().signal;
  const initialTerminals = input.initialTerminals ?? [];
  verifyInitialTerminalPrefixV1({ freeze: input.freeze, terminals: initialTerminals });
  const terminals: CollectiveDynamicsTrajectorySensorTerminalV1[] = initialTerminals.map(clone);
  let lastTimestamp = terminals.length
    ? canonicalTimestamp(terminals[terminals.length - 1].terminalAt)
    : Number.NEGATIVE_INFINITY;
  for (const cell of input.freeze.cells.slice(terminals.length)) {
    const startedAt = clock();
    const startedMillis = canonicalTimestamp(startedAt);
    if (startedMillis <= lastTimestamp) throw new Error("trajectory_sensor_clock_not_monotonic");
    lastTimestamp = startedMillis;
    input.onStart?.({
      type: "started",
      cellId: cell.cellId,
      requestId: cell.request.requestId,
      requestHash: cell.requestHash,
      sequence: cell.globalSequence,
      timestamp: startedAt,
    });
    let result: SingleAttemptTextInvokeResult | undefined;
    let invocationError: unknown;
    try {
      result = await input.invoker.invoke(clone(cell.request), signal);
    } catch (error) {
      invocationError = error;
    }
    const terminalAt = clock();
    const terminalMillis = canonicalTimestamp(terminalAt);
    if (terminalMillis <= lastTimestamp) throw new Error("trajectory_sensor_clock_not_monotonic");
    lastTimestamp = terminalMillis;
    const base = {
      cellId: cell.cellId,
      requestId: cell.request.requestId,
      requestHash: cell.requestHash,
      promptHash: cell.promptHash,
      startedAt,
      terminalAt,
    };
    let terminal: CollectiveDynamicsTrajectorySensorTerminalV1;
    if (!result) {
      terminal = { ...base, status: providerFailureCode(invocationError) };
    } else {
      const rawResponse = typeof result.rawContent === "string"
        ? result.rawContent
        : String(result.rawContent);
      try {
        const parsed = parseCollectiveDynamicsSensorReportV1_1(
          rawResponse,
          optionsForCell(cell, input.freeze),
        );
        terminal = {
          ...base,
          status: "valid",
          rawResponse,
          responseHash: hashCollectiveDynamicsValueV1(rawResponse),
          parsed,
          ...(result.providerMetadata ? { providerMetadata: clone(result.providerMetadata) } : {}),
          ...(result.usage ? { usage: clone(result.usage) } : {}),
        };
      } catch (error) {
        terminal = {
          ...base,
          status: "invalid_response",
          rawResponse,
          responseHash: hashCollectiveDynamicsValueV1(rawResponse),
          parseFailureCode: parseFailureCode(error),
          ...(result.providerMetadata ? { providerMetadata: clone(result.providerMetadata) } : {}),
          ...(result.usage ? { usage: clone(result.usage) } : {}),
        };
      }
    }
    terminals.push(terminal);
    input.onTerminal?.({
      type: "terminal",
      cellId: cell.cellId,
      requestId: cell.request.requestId,
      requestHash: cell.requestHash,
      sequence: cell.globalSequence,
      status: terminal.status,
      timestamp: terminal.terminalAt,
      terminal: clone(terminal),
    });
  }
  const body: Omit<CollectiveDynamicsTrajectorySensorRunV1, "contentHash"> = {
    runRef: COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_RUN_V1,
    planHash: input.plan.contentHash,
    freezeHash: input.freeze.contentHash,
    sourceTrajectoryHashes: [...input.freeze.sourceTrajectoryHashes],
    terminals,
    registeredCellCount: input.freeze.registeredCellCount,
    terminalCellCount: terminals.length,
    attemptsPerCell: 1,
    retry: "none",
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsTrajectorySensorRunV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  freeze: CollectiveDynamicsTrajectorySensorFreezeV1;
  artifact: CollectiveDynamicsTrajectorySensorRunV1;
}): void {
  const { plan, freeze, artifact } = input;
  if (artifact.runRef.id !== COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_RUN_V1.id
    || artifact.runRef.version !== COLLECTIVE_DYNAMICS_TRAJECTORY_SENSOR_RUN_V1.version
    || artifact.planHash !== plan.contentHash
    || artifact.freezeHash !== freeze.contentHash
    || artifact.registeredCellCount !== freeze.registeredCellCount
    || artifact.terminalCellCount !== freeze.registeredCellCount
    || artifact.attemptsPerCell !== 1
    || artifact.retry !== "none"
    || artifact.terminals.length !== freeze.registeredCellCount
    || JSON.stringify(artifact.sourceTrajectoryHashes) !== JSON.stringify(freeze.sourceTrajectoryHashes)) {
    throw new Error("trajectory_sensor_run_scope_invalid");
  }
  const cellById = new Map(freeze.cells.map(cell => [cell.cellId, cell]));
  const viewByHash = new Map(freeze.views.map(view => [view.contentHash, view]));
  const seen = new Set<string>();
  artifact.terminals.forEach(terminal => {
    if (seen.has(terminal.cellId)) throw new Error("trajectory_sensor_run_duplicate_terminal");
    seen.add(terminal.cellId);
    const cell = cellById.get(terminal.cellId);
    if (!cell || terminal.requestId !== cell.request.requestId
      || terminal.requestHash !== cell.requestHash
      || terminal.promptHash !== cell.promptHash
      || canonicalTimestamp(terminal.terminalAt) <= canonicalTimestamp(terminal.startedAt)) {
      throw new Error("trajectory_sensor_run_terminal_binding_invalid");
    }
    if (terminal.status === "valid" || terminal.status === "invalid_response") {
      if (terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)) {
        throw new Error("trajectory_sensor_run_response_hash_mismatch");
      }
    }
    if (terminal.status === "valid") {
      const view = viewByHash.get(cell.snapshotHash);
      if (!view || JSON.stringify(parseCollectiveDynamicsSensorReportV1_1(
        terminal.rawResponse,
        view.claim.options.map((_, index) => `opt_${index + 1}`),
      )) !== JSON.stringify(terminal.parsed)) {
        throw new Error("trajectory_sensor_run_parse_replay_mismatch");
      }
    }
  });
  if (seen.size !== freeze.registeredCellCount) throw new Error("trajectory_sensor_run_terminal_set_invalid");
  if (hashCollectiveDynamicsValueV1({
    runRef: artifact.runRef,
    planHash: artifact.planHash,
    freezeHash: artifact.freezeHash,
    sourceTrajectoryHashes: artifact.sourceTrajectoryHashes,
    terminals: artifact.terminals,
    registeredCellCount: artifact.registeredCellCount,
    terminalCellCount: artifact.terminalCellCount,
    attemptsPerCell: artifact.attemptsPerCell,
    retry: artifact.retry,
  }) !== artifact.contentHash) {
    throw new Error("trajectory_sensor_run_hash_mismatch");
  }
}
