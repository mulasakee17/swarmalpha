/**
 * Single-attempt execution contract for the frozen M1 peer bundle.
 * The executor records every cell, including provider and parse failures; it
 * does not retry, repair, renormalize, or consult ground truth.
 */
import {
  COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1,
  parseMappedCollectiveDynamicsSensorReportV1_1,
  type CollectiveDynamicsSensorCanaryTerminalV1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  verifyCollectiveDynamicsPeerBundleFreezeV1,
  type CollectiveDynamicsPeerBundleFreezeV1,
  type CollectiveDynamicsPeerBundlePlanV1,
} from "./collectiveDynamicsPeerBundleFreezeV1";
import type {
  SingleAttemptTextInvokeResult,
  SingleAttemptTextInvoker,
} from "./providerAdapters";
import type { CollectiveDynamicsFormationArtifactV1 } from "./collectiveDynamicsV1";
import { providerFailureCode } from "./providerDiagnostics";

export const COLLECTIVE_DYNAMICS_PEER_BUNDLE_RUN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-peer-bundle-canary.run",
  version: "1.0.0",
});

export interface CollectiveDynamicsPeerBundleRunV1 {
  runRef: typeof COLLECTIVE_DYNAMICS_PEER_BUNDLE_RUN_V1;
  planHash: string;
  freezeHash: string;
  parserRef: typeof COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1;
  terminals: CollectiveDynamicsSensorCanaryTerminalV1[];
  registeredCellCount: 152;
  terminalCellCount: 152;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

export interface PeerBundleAttemptStartV1 {
  type: "started";
  cellId: string;
  requestId: string;
  requestHash: string;
  sequence: number;
  timestamp: string;
}

export interface PeerBundleAttemptTerminalV1 {
  type: "terminal";
  cellId: string;
  requestId: string;
  requestHash: string;
  sequence: number;
  status: CollectiveDynamicsSensorCanaryTerminalV1["status"];
  timestamp: string;
  terminal: CollectiveDynamicsSensorCanaryTerminalV1;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createMonotonicClock(clock?: () => string): () => string {
  if (clock) return clock;
  let previous = Number.NEGATIVE_INFINITY;
  return () => {
    const next = Math.max(Date.now(), previous + 1);
    previous = next;
    return new Date(next).toISOString();
  };
}

function requireCanonicalTimestamp(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`peer_bundle_${field}_timestamp_invalid`);
  }
  return parsed;
}

function parseFailureCode(error: unknown): string {
  return error instanceof Error && /^sensor_canary_[a-z0-9_]+$/.test(error.message)
    ? error.message
    : "sensor_canary_parse_unknown";
}

export async function executeCollectiveDynamicsPeerBundleV1(input: {
  plan: CollectiveDynamicsPeerBundlePlanV1;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsPeerBundleFreezeV1;
  invoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
  clock?: () => string;
  onStart?: (event: PeerBundleAttemptStartV1) => void;
  onTerminal?: (event: PeerBundleAttemptTerminalV1) => void;
}): Promise<CollectiveDynamicsPeerBundleRunV1> {
  verifyCollectiveDynamicsPeerBundleFreezeV1({
    plan: input.plan,
    formations: input.formations,
    freeze: input.freeze,
  });
  const clock = createMonotonicClock(input.clock);
  const signal = input.signal ?? new AbortController().signal;
  const snapshotByHash = new Map(input.freeze.snapshots.map(snapshot => [snapshot.contentHash, snapshot]));
  const terminals: CollectiveDynamicsSensorCanaryTerminalV1[] = [];
  let lastTimestamp = Number.NEGATIVE_INFINITY;

  for (const cell of input.freeze.cells) {
    const startedAt = clock();
    const startedMillis = requireCanonicalTimestamp(startedAt, "started_at");
    if (startedMillis <= lastTimestamp) {
      throw new Error("peer_bundle_clock_not_monotonic");
    }
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
      result = await input.invoker.invoke(cloneJson(cell.request), signal);
    } catch (error) {
      invocationError = error;
    }

    const terminalAt = clock();
    const terminalMillis = requireCanonicalTimestamp(terminalAt, "terminal_at");
    if (terminalMillis <= lastTimestamp) {
      throw new Error("peer_bundle_clock_not_monotonic");
    }
    lastTimestamp = terminalMillis;
    const base = {
      cellId: cell.cellId,
      requestId: cell.request.requestId,
      requestHash: cell.requestHash,
      promptHash: cell.promptHash,
      startedAt,
      terminalAt,
    };
    let terminal: CollectiveDynamicsSensorCanaryTerminalV1;
    if (!result) {
      terminal = { ...base, status: providerFailureCode(invocationError) };
    } else {
      const snapshot = snapshotByHash.get(cell.snapshotHash);
      if (!snapshot) throw new Error("peer_bundle_snapshot_missing_for_cell");
      try {
        const parsed = parseMappedCollectiveDynamicsSensorReportV1_1(result.rawContent, snapshot);
        terminal = {
          ...base,
          status: "valid",
          rawResponse: result.rawContent,
          responseHash: hashCollectiveDynamicsValueV1(result.rawContent),
          parsed,
          ...(result.providerMetadata ? { providerMetadata: cloneJson(result.providerMetadata) } : {}),
          ...(result.usage ? { usage: cloneJson(result.usage) } : {}),
        };
      } catch (error) {
        terminal = {
          ...base,
          status: "invalid_response",
          rawResponse: result.rawContent,
          responseHash: hashCollectiveDynamicsValueV1(result.rawContent),
          parseFailureCode: parseFailureCode(error),
          ...(result.providerMetadata ? { providerMetadata: cloneJson(result.providerMetadata) } : {}),
          ...(result.usage ? { usage: cloneJson(result.usage) } : {}),
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
      terminal: cloneJson(terminal),
    });
  }

  const body: Omit<CollectiveDynamicsPeerBundleRunV1, "contentHash"> = {
    runRef: COLLECTIVE_DYNAMICS_PEER_BUNDLE_RUN_V1,
    planHash: input.plan.contentHash,
    freezeHash: input.freeze.contentHash,
    parserRef: COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1,
    terminals,
    registeredCellCount: 152,
    terminalCellCount: 152,
    attemptsPerCell: 1,
    retry: "none",
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  const artifact = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyCollectiveDynamicsPeerBundleRunV1({ freeze: input.freeze, artifact });
  return cloneJson(artifact);
}

export function verifyCollectiveDynamicsPeerBundleRunV1(input: {
  freeze: CollectiveDynamicsPeerBundleFreezeV1;
  artifact: CollectiveDynamicsPeerBundleRunV1;
}): void {
  const { freeze, artifact } = input;
  assertCollectiveDynamicsTruthBlindV1(artifact);
  if (artifact.runRef.id !== COLLECTIVE_DYNAMICS_PEER_BUNDLE_RUN_V1.id
    || artifact.runRef.version !== COLLECTIVE_DYNAMICS_PEER_BUNDLE_RUN_V1.version
    || artifact.planHash !== freeze.planHash
    || artifact.freezeHash !== freeze.contentHash
    || artifact.parserRef.id !== COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1.id
    || artifact.parserRef.version !== COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1.version
    || artifact.registeredCellCount !== freeze.registeredCellCount
    || artifact.terminalCellCount !== freeze.registeredCellCount
    || artifact.attemptsPerCell !== 1 || artifact.retry !== "none"
    || artifact.terminals.length !== freeze.registeredCellCount
    || new Set(artifact.terminals.map(terminal => terminal.cellId)).size
      !== freeze.registeredCellCount) {
    throw new Error("peer_bundle_run_scope_invalid");
  }
  const cellById = new Map(freeze.cells.map(cell => [cell.cellId, cell]));
  const snapshotByHash = new Map(freeze.snapshots.map(snapshot => [snapshot.contentHash, snapshot]));
  for (const terminal of artifact.terminals) {
    const cell = cellById.get(terminal.cellId);
    if (!cell || terminal.requestId !== cell.request.requestId
      || terminal.requestHash !== cell.requestHash || terminal.promptHash !== cell.promptHash
      || requireCanonicalTimestamp(terminal.terminalAt, "terminal_at")
        <= requireCanonicalTimestamp(terminal.startedAt, "started_at")) {
      throw new Error("peer_bundle_terminal_binding_invalid");
    }
    const snapshot = snapshotByHash.get(cell.snapshotHash);
    if (!snapshot) throw new Error("peer_bundle_terminal_snapshot_missing");
    if (terminal.status === "valid") {
      if (terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)) {
        throw new Error("peer_bundle_response_hash_mismatch");
      }
      const replayed = parseMappedCollectiveDynamicsSensorReportV1_1(
        terminal.rawResponse,
        snapshot,
      );
      if (JSON.stringify(replayed) !== JSON.stringify(terminal.parsed)) {
        throw new Error("peer_bundle_parse_replay_mismatch");
      }
    } else if (terminal.status === "invalid_response") {
      if (terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)) {
        throw new Error("peer_bundle_response_hash_mismatch");
      }
      let code = "";
      try {
        parseMappedCollectiveDynamicsSensorReportV1_1(terminal.rawResponse, snapshot);
      } catch (error) {
        code = parseFailureCode(error);
      }
      if (!code || code !== terminal.parseFailureCode) {
        throw new Error("peer_bundle_invalid_response_replay_mismatch");
      }
    } else if (!["provider_timeout", "provider_network", "provider_rate_limit", "provider_auth", "provider_error"]
      .includes(terminal.status)) {
      throw new Error("peer_bundle_terminal_status_invalid");
    }
  }
  if (hashCollectiveDynamicsValueV1(withoutContentHash(artifact)) !== artifact.contentHash) {
    throw new Error("peer_bundle_run_hash_mismatch");
  }
}

function withoutContentHash<T extends { contentHash: string }>(value: T): Omit<T, "contentHash"> {
  const { contentHash: _contentHash, ...body } = value;
  return body;
}
