// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { semanticProbeMain } from "../experiments/campaign/probe_semantic";
import { prepareSemanticProbeCells, parseSemanticProbeResponse, compareSemanticProbeResponses,
  createJevSemanticProbe, type ProbeCell } from "../src/lib/experimentation/semanticProbe";
import { runMechanismGlmTaskV1 } from "../experiments/campaign/v6/mechanismGlmTaskExecutionV1";
import { createMechanismTracedInvokerV1 } from "../experiments/campaign/v6/mechanismProviderTraceV1";
import { buildMechanismTaskArtifactV1, type MechanismTaskArtifactV1 } from "../experiments/campaign/v6/mechanismTaskArtifactV1";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";

let artifact: MechanismTaskArtifactV1; let cells: ProbeCell[];
const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: 15 }).adapter.task;
const p = (first: number) => Object.fromEntries(task.claim.options.map((o, i) => [o, i ? (1 - first) / (task.claim.options.length - 1) : first]));
const response = (probabilities = p(.6), extra: object = {}) => JSON.stringify({ model: "jev-latest",
  answers: { answer: { type: "choice", choice: task.claim.options[0], probabilities, confidence: .4 } }, ...extra });

beforeAll(async () => {
  const traced = createMechanismTracedInvokerV1({ maxObservedTokens: 1000, baseInvoker: {
    async invoke(request) {
      const probabilities = p(request.requestId.includes("ATTACKS_NEUTRAL") ? .3 : .8);
      const rawContent = request.requestId.startsWith("final:")
        ? JSON.stringify({ status: "answered", reports: [{ claimId: task.claim.id, value: { kind: "categorical", probabilities } }] })
        : JSON.stringify({ message: "Synthetic public message, no private facts.", belief: { kind: "categorical", probabilities },
          evidence: [{ content: "Synthetic disclosed observation.", relation: "attacks" }] });
      return { rawContent, usage: { totalTokens: 1 }, providerMetadata: { model: "glm-4.6v" } };
    },
  } });
  const run = await runMechanismGlmTaskV1({ taskId: 15, seed: 3,
    armOrder: ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"], invoker: traced.invoker });
  artifact = buildMechanismTaskArtifactV1({ model: "zhipu:glm-4.6v", planHash: `sha256:${"a".repeat(64)}`,
    executionHash: `sha256:${"b".repeat(64)}`, taskRun: run.task, round1Snapshot: run.round1Snapshot,
    parsedRecords: run.parsedRecords, providerAttempts: traced.attempts, observedTokens: traced.observedTokens() });
  cells = prepareSemanticProbeCells(artifact);
});

describe("paired external semantic probe", () => {
  it("uses exact R2 inputs, exposes only each actor's private packet and never sends recorded answers", () => {
    expect(cells).toHaveLength(task.agents.length * 3);
    for (const cell of cells) {
      const attempt = artifact.providerAttempts.find(a => a.requestId === cell.id)!;
      expect(cell.body.state).toEqual({ systemPrompt: attempt.systemPrompt, userPrompt: attempt.userPrompt });
      const actor = task.agents.find(a => a.agentId === cell.agentId)!;
      expect(cell.body.state.userPrompt).toContain(actor.privateInformation);
      for (const peer of task.agents.filter(a => a.agentId !== cell.agentId)) {
        expect(cell.body.state.userPrompt).not.toContain(peer.privateInformation);
      }
      expect(JSON.stringify(cell.body)).not.toMatch(/agentProbabilities|parsedRecords|rawResponse|groundTruth|correct_answer|resolvedOption/);
    }
    const changed = structuredClone(artifact);
    changed.providerAttempts.forEach(a => { a.rawResponse = "OFFLINE ONLY"; });
    changed.round1Snapshot.agents.forEach(a => { a.privateInformation = "NOT THE VISIBLE INPUT"; });
    expect(prepareSemanticProbeCells(changed).map(c => c.body)).toEqual(cells.map(c => c.body));
  });
  it("rejects incomplete, duplicate or truth-bearing input instead of repairing a pair", () => {
    const missing = structuredClone(artifact); missing.providerAttempts = [];
    expect(() => prepareSemanticProbeCells(missing)).toThrow("probe_incomplete_pair");
    const duplicate = structuredClone(artifact); duplicate.parsedRecords.push(duplicate.parsedRecords.find(r => r.phase === "round2")!);
    expect(() => prepareSemanticProbeCells(duplicate)).toThrow("probe_incomplete_pair");
    const leaked = structuredClone(artifact); leaked.providerAttempts.forEach(a => { a.userPrompt += " groundTruth=secret"; });
    expect(() => prepareSemanticProbeCells(leaked)).toThrow("probe_truth_leak");
  });
  it("validates probabilities without normalization, and keeps absent usage distinct from zero", () => {
    expect(parseSemanticProbeResponse(response(), task.claim.options).usage.inputTokens).toBeNull();
    expect(parseSemanticProbeResponse(response(p(.6), { usage: { input_tokens: 0, output_tokens: 0 } }), task.claim.options).usage.inputTokens).toBe(0);
    expect(() => parseSemanticProbeResponse(response({ wrong: 1 }), task.claim.options)).toThrow("probe_option_mismatch");
    expect(() => parseSemanticProbeResponse(response(Object.fromEntries(task.claim.options.map(o => [o, .9]))), task.claim.options)).toThrow("probe_invalid_distribution");
    expect(() => parseSemanticProbeResponse(response(p(.6), { usage: { input_tokens: -1 } }), task.claim.options)).toThrow("probe_invalid_usage");
  });
  it("compares same-round paired response vectors and leaves missing probe responses unavailable", () => {
    const results = new Map(cells.map(c => [c.id, parseSemanticProbeResponse(response(p(c.arm === "CONTROL" ? .8 : .6)), c.options)]));
    const comparison = compareSemanticProbeResponses(cells, results).find(c => c.arm === "ATTACKS_NEUTRAL")!;
    expect(comparison.status).toBe("available");
    if (comparison.status === "available") {
      expect(comparison.dAgent[task.claim.options[0]]).toBeCloseTo(-.5);
      expect(comparison.dProbe[task.claim.options[0]]).toBeCloseTo(-.2);
      expect(comparison.responseDifference[task.claim.options[0]]).toBeCloseTo(-.3);
    }
    expect(compareSemanticProbeResponses(cells, new Map()).every(c => c.status === "unavailable")).toBe(true);
    expect(JSON.stringify(comparison)).not.toMatch(/socialInfluence|quality|correctness/);
    const mixed = structuredClone(cells); mixed[0].seed += 1;
    expect(() => compareSemanticProbeResponses(mixed, results)).toThrow("probe_incomparable_cells");
    const drift = new Map(results); drift.set(cells[1].id, { ...drift.get(cells[1].id)!, model: "other-version" });
    expect(() => compareSemanticProbeResponses(cells, drift)).toThrow("probe_model_drift");
  });
  it("reuses SDK with a fixed endpoint and sends no key in the decision body", async () => {
    const fetchMock = vi.fn(async (url: unknown, request: RequestInit | undefined) => {
      expect(url).toBe("https://api.typesafe.ai/v1/systemone");
      expect(JSON.parse(String(request!.body))).toEqual(cells[0].body);
      expect(String(request!.body)).not.toContain("unit-test-key");
      return new Response(response(), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const raw = await createJevSemanticProbe("unit-test-key", fetchMock as typeof fetch)(cells[0], new AbortController().signal);
    expect(parseSemanticProbeResponse(raw, cells[0].options).model).toBe("jev-latest");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("never retries rate limits or transport failure", async () => {
    for (const transportError of [false, true]) {
      const fetchMock = vi.fn(async () => {
        if (transportError) throw new Error("network unavailable");
        return new Response("{}", { status: 429, headers: { "Content-Type": "application/json" } });
      });
      await expect(createJevSemanticProbe("unit-test-key", fetchMock as typeof fetch)(cells[0], new AbortController().signal)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });
  it("prepares the shipped synthetic fixture without credentials or network, and refuses run reuse", async () => {
    const base = resolve("tmp"); mkdirSync(base, { recursive: true });
    const dir = mkdtempSync(join(base, "probe-cli-test-"));
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const args = ["--artifact", "test/fixtures/semantic-probe-task.json", "--out", join(dir, "prepared")];
    try {
      await semanticProbeMain(args);
      const prepared = JSON.parse(readFileSync(join(dir, "prepared", "requests.json"), "utf8"));
      expect(prepared.sourceKind).toBe("synthetic"); expect(prepared.cells).toHaveLength(12);
      expect(network).not.toHaveBeenCalled(); expect(existsSync(join(dir, "prepared", "attempts.jsonl"))).toBe(false);
      await expect(semanticProbeMain(args)).rejects.toThrow();
      await expect(semanticProbeMain([...args, "--execute"])).rejects.toThrow("probe_explicit_call_cap_required");
    } finally {
      network.mockRestore(); log.mockRestore();
      if (!dir.startsWith(base + "/") && !dir.startsWith(base + "\\")) throw new Error("invalid temporary cleanup path");
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
