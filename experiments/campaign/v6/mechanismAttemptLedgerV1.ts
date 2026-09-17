/** Durable append-before/finish-after attempt ledger for mechanism V1. */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export type MechanismAttemptLedgerEventV1 =
  | { type: "started"; attemptId: string; sequence: number; requestHash: string; requestId: string; ts: string }
  | { type: "finished"; attemptId: string; sequence: number; requestHash: string; requestId: string; status: "response" | "error"; errorCode?: string; ts: string };

export interface MechanismAttemptLedgerAuditV1 {
  started: number;
  finished: number;
  unfinishedAttemptIds: string[];
  duplicateRequestHashes: string[];
}

function readEvents(file: string): MechanismAttemptLedgerEventV1[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)
    .map((line, index) => {
      try { return JSON.parse(line) as MechanismAttemptLedgerEventV1; }
      catch { throw new Error(`mechanism_ledger_invalid_json_line:${index + 1}`); }
    });
}

export function auditMechanismAttemptLedgerV1(file: string): MechanismAttemptLedgerAuditV1 {
  const events = readEvents(file);
  const starts = new Map<string, Extract<MechanismAttemptLedgerEventV1, { type: "started" }>>();
  const finishes = new Set<string>();
  const requestCounts = new Map<string, number>();
  for (const event of events) {
    if (event.type === "started") {
      if (starts.has(event.attemptId)) throw new Error("mechanism_ledger_duplicate_attempt_id");
      starts.set(event.attemptId, event);
      requestCounts.set(event.requestHash, (requestCounts.get(event.requestHash) ?? 0) + 1);
    } else {
      const start = starts.get(event.attemptId);
      if (!start) throw new Error("mechanism_ledger_finish_without_start");
      if (finishes.has(event.attemptId)) throw new Error("mechanism_ledger_duplicate_finish");
      if (start.requestHash !== event.requestHash || start.requestId !== event.requestId || start.sequence !== event.sequence) {
        throw new Error("mechanism_ledger_finish_identity_mismatch");
      }
      finishes.add(event.attemptId);
    }
  }
  return {
    started: starts.size,
    finished: finishes.size,
    unfinishedAttemptIds: [...starts.keys()].filter(id => !finishes.has(id)).sort(),
    duplicateRequestHashes: [...requestCounts].filter(([, count]) => count > 1).map(([hash]) => hash).sort(),
  };
}

export function createMechanismAttemptLedgerV1(input: { file: string; clock?: () => string }): {
  start: (request: { requestHash: string; requestId: string }) => { attemptId: string; sequence: number };
  finish: (attempt: { attemptId: string; sequence: number; requestHash: string; requestId: string }, status: "response" | "error", errorCode?: string) => void;
  audit: () => MechanismAttemptLedgerAuditV1;
} {
  if (existsSync(input.file) && readFileSync(input.file, "utf8").trim().length > 0) {
    throw new Error("mechanism_ledger_existing_refuse_resume");
  }
  mkdirSync(dirname(input.file), { recursive: true });
  const clock = input.clock ?? (() => new Date().toISOString());
  let sequence = 0;
  const open = new Set<string>();
  const append = (event: MechanismAttemptLedgerEventV1) => appendFileSync(input.file, `${JSON.stringify(event)}\n`, "utf8");
  return {
    start(request) {
      sequence += 1;
      const attemptId = `mechanism-attempt-${sequence}`;
      append({ type: "started", attemptId, sequence, ...request, ts: clock() });
      open.add(attemptId);
      return { attemptId, sequence };
    },
    finish(attempt, status, errorCode) {
      if (!open.has(attempt.attemptId)) throw new Error("mechanism_ledger_finish_not_open");
      append({ type: "finished", ...attempt, status, ...(errorCode ? { errorCode } : {}), ts: clock() });
      open.delete(attempt.attemptId);
    },
    audit: () => auditMechanismAttemptLedgerV1(input.file),
  };
}

