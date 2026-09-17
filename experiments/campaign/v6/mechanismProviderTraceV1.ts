/** Minimal audited single-attempt provider boundary for mechanism V1. */
import { createHash } from "node:crypto";
import type {
  SingleAttemptTextInvoker,
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvokeResult,
} from "./providerAdapters";
import { assertMechanismOnlinePayloadTruthBlindV1 } from "./mechanismDisclosureContractV1";

export interface MechanismProviderAttemptV1 {
  sequence: number;
  requestHash: string;
  requestId: string;
  status: "response" | "error";
  systemPrompt: string;
  userPrompt: string;
  responseFormat: "text" | "json";
  modelRef: { id: string; version: string };
  invocationConfig: Record<string, unknown>;
  /** Adapter-returned response text; provider transport bytes may have been normalized upstream. */
  rawResponse?: string;
  providerMetadata?: { model?: string; requestId?: string };
  usage?: SingleAttemptTextInvokeResult["usage"];
  errorCode?: string;
  startedAt: string;
  finishedAt: string;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("mechanism_request_non_finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object") throw new Error("mechanism_request_not_json");
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonicalize((value as Record<string, unknown>)[key])]));
}

export function computeMechanismRequestHashV1(request: SingleAttemptTextInvokeRequest): string {
  const text = JSON.stringify(canonicalize(request));
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function errorCode(error: unknown): string {
  if (error instanceof Error && /^mechanism_[a-z0-9_]+$/.test(error.message)) return error.message;
  if (error instanceof Error && error.name) return error.name;
  return "unknown_error";
}

export function createMechanismTracedInvokerV1(input: {
  baseInvoker: SingleAttemptTextInvoker;
  maxObservedTokens: number;
  clock?: () => string;
  ledger?: {
    start: (request: { requestHash: string; requestId: string }) => { attemptId: string; sequence: number };
    finish: (attempt: { attemptId: string; sequence: number; requestHash: string; requestId: string }, status: "response" | "error", errorCode?: string) => void;
  };
}): {
  invoker: SingleAttemptTextInvoker;
  attempts: MechanismProviderAttemptV1[];
  observedTokens: () => number;
} {
  if (!Number.isFinite(input.maxObservedTokens) || input.maxObservedTokens <= 0) {
    throw new Error("mechanism_invalid_token_cap");
  }
  const attempts: MechanismProviderAttemptV1[] = [];
  const seen = new Set<string>();
  const clock = input.clock ?? (() => new Date().toISOString());
  let observedTokens = 0;
  const invoker: SingleAttemptTextInvoker = {
    async invoke(request, signal) {
      assertMechanismOnlinePayloadTruthBlindV1(request);
      const requestHash = computeMechanismRequestHashV1(request);
      if (seen.has(requestHash)) throw new Error("mechanism_duplicate_physical_request");
      if (observedTokens >= input.maxObservedTokens) throw new Error("mechanism_token_stop_before_call");
      seen.add(requestHash);
      const durable = input.ledger?.start({ requestHash, requestId: request.requestId });
      const startedAt = clock();
      const base = {
        sequence: attempts.length + 1,
        requestHash,
        requestId: request.requestId,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        responseFormat: request.responseFormat,
        modelRef: structuredClone(request.modelRef),
        invocationConfig: structuredClone(request.invocationConfig),
        startedAt,
      };
      try {
        const result = await input.baseInvoker.invoke(request, signal);
        const finishedAt = clock();
        attempts.push({
          ...base,
          status: "response",
          rawResponse: result.rawContent,
          ...(result.providerMetadata ? { providerMetadata: structuredClone(result.providerMetadata) } : {}),
          ...(result.usage ? { usage: structuredClone(result.usage) } : {}),
          finishedAt,
        });
        const total = result.usage?.totalTokens;
        if (total === undefined || !Number.isFinite(total) || total < 0) {
          throw new Error("mechanism_usage_unknown");
        }
        observedTokens += total;
        if (observedTokens > input.maxObservedTokens) throw new Error("mechanism_token_stop_exceeded");
        if (durable) input.ledger?.finish({ ...durable, requestHash, requestId: request.requestId }, "response");
        return result;
      } catch (error) {
        const recorded = attempts.find(attempt => attempt.requestHash === requestHash);
        if (recorded) {
          recorded.errorCode = errorCode(error);
        } else {
          attempts.push({ ...base, status: "error", errorCode: errorCode(error), finishedAt: clock() });
        }
        if (durable) input.ledger?.finish(
          { ...durable, requestHash, requestId: request.requestId }, "error", errorCode(error),
        );
        throw error;
      }
    },
  };
  return { invoker, attempts, observedTokens: () => observedTokens };
}
