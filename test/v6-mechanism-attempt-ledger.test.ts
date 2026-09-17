import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMechanismAttemptLedgerV1 } from "../experiments/campaign/v6/mechanismAttemptLedgerV1";
import { createMechanismTracedInvokerV1 } from "../experiments/campaign/v6/mechanismProviderTraceV1";

describe("mechanism durable attempt ledger", () => {
  it("persists start before call and paired finish after response", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-ledger-"));
    try {
      const file = join(dir, "attempts.jsonl");
      const ledger = createMechanismAttemptLedgerV1({ file });
      const traced = createMechanismTracedInvokerV1({ maxObservedTokens: 10, ledger,
        baseInvoker: { async invoke() { expect(ledger.audit().unfinishedAttemptIds).toHaveLength(1); return { rawContent: "{}", usage: { totalTokens: 1 } }; } },
      });
      await traced.invoker.invoke({ requestId: "r1", systemPrompt: "s", userPrompt: "u", responseFormat: "json", modelRef: { id: "m", version: "1" }, invocationConfig: {} }, new AbortController().signal);
      expect(ledger.audit()).toMatchObject({ started: 1, finished: 1, unfinishedAttemptIds: [], duplicateRequestHashes: [] });
      expect(() => createMechanismAttemptLedgerV1({ file })).toThrow("mechanism_ledger_existing_refuse_resume");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("leaves an unfinished record if the process never calls finish", () => {
    const dir = mkdtempSync(join(tmpdir(), "mechanism-ledger-"));
    try {
      const ledger = createMechanismAttemptLedgerV1({ file: join(dir, "attempts.jsonl") });
      ledger.start({ requestHash: "sha256:x", requestId: "r" });
      expect(ledger.audit().unfinishedAttemptIds).toEqual(["mechanism-attempt-1"]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

