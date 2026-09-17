// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadCanonicalHiddenBenchTasksV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import { fingerprintEstimatorValue } from "../src/lib/epistemic/estimators";
import type { SingleAttemptTextInvokeRequest, SingleAttemptTextInvokeResult } from "../experiments/campaign/v6/providerAdapters";
import {
  prepareX0Tasks, buildX0Design, planX0Cells, runX0PublicPhase, runX0Sensors, observeX0Checkpoint,
  x0CanaryGate, buildX0ReviewPacket, summarizeX0Audit, analyzeX0Task, evaluateX0Outcome,
  type X0PublicRun, type X0Cell, type X0Rating, type X0Session,
} from "../experiments/campaign/v6/collectiveDecisionProcessObservationX0";
import {
  assertX0DashScopeRawRequest,
  assertX0ZhipuRawRequest,
  createX0DashScopeCanaryExecution,
  createX0DashScopeRawSingleAttemptInvoker,
  createX0ZhipuCanaryExecution,
  createX0ZhipuRawSingleAttemptInvoker,
  readX0PersistentJournal,
  X0_QWEN_DASHSCOPE_MODEL_REF_V1,
  X0_ZHIPU_RAW_MODEL_REF_V1,
} from "../experiments/campaign/v6/collectiveDecisionProcessObservationX0Execution";

const source = loadCanonicalHiddenBenchTasksV1();
const prepared = prepareX0Tasks(source);
const settings = { modelRef: { id: "mock-only", version: "1" }, temperature: 0.7, thinking: "disabled" as const, seedSupport: "supported" as const };
const liveSettings = { modelRef: X0_ZHIPU_RAW_MODEL_REF_V1, temperature: 0.7, thinking: "disabled" as const, seedSupport: "supported" as const };
const qwenSettings = { modelRef: X0_QWEN_DASHSCOPE_MODEL_REF_V1, temperature: 0.7, thinking: "disabled" as const, seedSupport: "unsupported" as const };
const qwenConnection = { region: "cn-beijing" as const, workspaceId: "workspace_x0", apiKey: "test-dashscope-key" };
const usage = { promptTokens: 10, completionTokens: 10, totalTokens: 20, latencyMs: 0 };
const section = (r: SingleAttemptTextInvokeRequest, name: string) => JSON.parse(r.userPrompt.split(`${name}\n`)[1].split("\n\n")[0]);
function response(r: SingleAttemptTextInvokeRequest): SingleAttemptTextInvokeResult {
  if (r.systemPrompt.includes("private categorical")) return { rawContent: JSON.stringify({ probabilities: { opt_1: 0.1, opt_2: 0.2, opt_3: 0.3, opt_4: 0.4 } }), usage };
  if (r.userPrompt.includes("choose the single option")) return { rawContent: '{"choiceId":"opt_1"}', usage };
  const documents = section(r, "YOUR_AVAILABLE_DOCUMENTS") as { id: string; text: string }[];
  const history = section(r, "VISIBLE_MESSAGES") as { id: string }[];
  const annotated = r.userPrompt.includes('"actKind"');
  return { rawContent: JSON.stringify({ message: "I defer to the other participants.", shareUnitIds: [],
    ...(annotated ? { actKind: "cite", evidenceUnitIds: documents.map(d => d.id), respondsToActIds: history.length ? [history[0].id] : [] } : {}) }), usage };
}
async function publicRun(change?: (r: SingleAttemptTextInvokeRequest, result: SingleAttemptTextInvokeResult) => SingleAttemptTextInvokeResult, online = prepared.online, phase: "canary" | "remainder" = "canary") {
  const requests: SingleAttemptTextInvokeRequest[] = [];
  const journal: X0Cell[] = [];
  const run = await runX0PublicPhase({ online, phase, settings, signal: new AbortController().signal, journal: async c => { journal.push(structuredClone(c)); }, invoker: { invoke: async r => {
    requests.push(structuredClone(r));
    return change ? change(r, response(r)) : response(r);
  } } });
  return { run, requests, journal };
}
async function sensors(run: X0PublicRun, order: "forward" | "reverse" = "forward", bad = false) {
  const requests: SingleAttemptTextInvokeRequest[] = [];
  const cells = await runX0Sensors({ publicRun: run, order, signal: new AbortController().signal, journal: async () => {}, invoker: { invoke: async r => {
    requests.push(structuredClone(r));
    return bad ? { rawContent: "bad sensor" } : response(r);
  } } });
  return { cells, requests };
}
function ratings(s: X0Session, classify: (agent: string, privateIndex: number) => X0Rating["code"]): X0Rating[] {
  return s.discussions.flatMap(d => s.task.packets.filter(p => p.privateIndex !== null).map(p => ({ messageId: d.message.id, packetId: p.id,
    code: classify(d.message.agentId, p.privateIndex!), excerpt: "I defer to the other participants." })));
}
function liveRequest(cell = planX0Cells("canary")[0]): SingleAttemptTextInvokeRequest {
  return {
    requestId: cell.id,
    systemPrompt: "system",
    userPrompt: "user",
    responseFormat: "json",
    modelRef: liveSettings.modelRef,
    invocationConfig: { temperature: liveSettings.temperature, maxTokens: cell.maxTokens, thinking: "disabled", seed: cell.seed },
  };
}
function qwenRequest(cell = planX0Cells("canary")[0]): SingleAttemptTextInvokeRequest {
  return {
    requestId: cell.id,
    systemPrompt: "Return strict JSON only.",
    userPrompt: "Return JSON.",
    responseFormat: "json",
    modelRef: qwenSettings.modelRef,
    invocationConfig: { temperature: qwenSettings.temperature, maxTokens: cell.maxTokens, thinking: "disabled" },
  };
}

describe("X0 clean experimental conditions", () => {
  it("freezes the full crossed design, balanced private assignments, call ceilings and fixed canary", () => {
    const blocks = buildX0Design();
    expect(blocks).toHaveLength(24);
    expect(blocks.filter(b => b.canary).map(b => b.index)).toEqual([0, 12]);
    for (const alias of ["x0-a", "x0-b"]) for (let ai = 0; ai < 3; ai++) for (let packet = 0; packet < 3; packet++) {
      expect(blocks.filter(b => b.taskAlias === alias && b.permutation[ai] === packet)).toHaveLength(4);
    }
    expect(blocks.every(b => [...b.conditions].sort().join() === "P0,P1")).toBe(true);
    for (const [phase, count, total, publicCount] of [["canary", 66, 33024, 36], ["remainder", 726, 363264, 396], ["full", 792, 396288, 432]] as const) {
      const cells = planX0Cells(phase);
      expect(cells).toHaveLength(count);
      expect(new Set(cells.map(c => c.id)).size).toBe(count);
      expect(new Set(cells.map(c => c.seed)).size).toBe(count);
      expect(cells.reduce((n, c) => n + c.maxTokens, 0)).toBe(total);
      expect(cells.slice(0, publicCount).every(c => c.phase >= 1 && c.phase <= 3)).toBe(true);
      expect(cells.slice(publicCount).every(c => c.phase === 0 || c.phase >= 4)).toBe(true);
    }
    const canaryIds = new Set(planX0Cells("canary").map(c => c.id));
    expect(planX0Cells("remainder").some(c => canaryIds.has(c.id))).toBe(false);
  });

  it("excludes gold, rationale, source IDs and unshared peer packets from the actor's inputs", async () => {
    const changed = structuredClone(source);
    const task = changed.find(t => t.id === 4)!;
    task.correct_answer = task.possible_answers.find(o => o !== task.correct_answer)!;
    task.rationale = "GOLD_METADATA_POISON";
    task.name = "SOURCE_NAME_POISON";
    task.hidden_information[1] = "OTHER_PRIVATE_POISON";
    const original = await publicRun();
    const altered = await publicRun(undefined, prepareX0Tasks(changed).online);
    const forAgent = (rs: SingleAttemptTextInvokeRequest[]) => rs.filter(r => r.requestId.startsWith("b0-") && r.requestId.endsWith("a1"));
    expect(forAgent(original.requests)).toEqual(forAgent(altered.requests));
    expect(JSON.stringify(forAgent(altered.requests))).not.toMatch(/GOLD_METADATA_POISON|SOURCE_NAME_POISON|OTHER_PRIVATE_POISON/);
    expect(altered.requests.find(r => r.requestId === "b0-s0-p1-a2")!.userPrompt).toContain("OTHER_PRIVATE_POISON");
  });

  it("changes only the response-format treatment in first-round prompts and isolates session histories", async () => {
    const baseline = await publicRun();
    const [a, b] = baseline.requests.slice(0, 2);
    expect(a.systemPrompt).toBe(b.systemPrompt);
    expect(a.userPrompt.split("RESPONSE_FORMAT")[0]).toBe(b.userPrompt.split("RESPONSE_FORMAT")[0]);
    expect(a.invocationConfig.maxTokens).toBe(b.invocationConfig.maxTokens);
    const changed = await publicRun((r, result) => r.requestId === "b0-s0-p1-a1" ? { ...result, rawContent: JSON.stringify({ ...JSON.parse(result.rawContent), message: "SLOT_ZERO_POISON" }) } : result);
    expect(changed.requests.filter(r => r.requestId.includes("-s1-"))).toEqual(baseline.requests.filter(r => r.requestId.includes("-s1-")));
    expect(changed.requests.find(r => r.requestId === "b0-s0-p2-a2")!.userPrompt).toContain("SLOT_ZERO_POISON");
    expect(() => { changed.run.sessions[0].checkpoints[0].views[0].documents[0].text = "mutation"; }).toThrow();
  });

  it("keeps metadata mutations and deferred sensor failures/reordering out of every public request", async () => {
    const baseline = await publicRun();
    const modified = await publicRun((r, result) => r.userPrompt.includes('"actKind"') ? { ...result, rawContent: JSON.stringify({ ...JSON.parse(result.rawContent), actKind: "integrate", evidenceUnitIds: [], respondsToActIds: [] }) } : result);
    expect(modified.requests).toEqual(baseline.requests);
    const before = JSON.stringify(baseline.run);
    const good = await sensors(baseline.run);
    const reverseBad = await sensors(baseline.run, "reverse", true);
    expect(JSON.stringify(baseline.run)).toBe(before);
    expect(good.requests.map(r => r.requestId)).toEqual(reverseBad.requests.map(r => r.requestId).reverse());
    expect(x0CanaryGate(baseline.run, good.cells).passed).toBe(true);
    expect(x0CanaryGate(baseline.run, reverseBad.cells).passed).toBe(false);
    for (const r of good.requests) expect(r.userPrompt).not.toContain('"actKind"');
    const observation = observeX0Checkpoint(baseline.run.sessions[0], 2, good.cells);
    expect(observation.thermometer.measurement.meanReplicateTotalVariation).toBeNull();
    expect(observation.thermometer.measurement.validRepeatPairCount).toBe(0);
    expect(observation.thermometer.measurement.validPrimaryReportCount).toBe(3);
    expect(observeX0Checkpoint(baseline.run.sessions[0], 2, []).primaryComplete).toBe(false);
    const swapped = structuredClone(good.cells);
    swapped.find(c => c.phase === 5 && c.block === 0 && c.slot === 0)!.request!.userPrompt += "foreign snapshot";
    expect(() => observeX0Checkpoint(baseline.run.sessions[0], 2, swapped)).toThrow("sensor_not_bound_to_checkpoint");
  });

  it("delivers full shared packets at barriers, never from citation alone, without cancelling legal speech on annotation failure", async () => {
    const baseline = await publicRun();
    const slot = buildX0Design()[0].conditions.indexOf("P1");
    const changed = await publicRun((r, result) => r.requestId === `b0-s${slot}-p1-a1` ? { ...result, rawContent: JSON.stringify({
      message: "LEGAL_PUBLIC_SPEECH", shareUnitIds: ["u04"], actKind: "cite", evidenceUnitIds: ["u05"], respondsToActIds: ["r2-a3"],
    }) } : result);
    const r1peer = changed.requests.find(r => r.requestId === `b0-s${slot}-p1-a2`)!;
    const r2peer = changed.requests.find(r => r.requestId === `b0-s${slot}-p2-a2`)!;
    expect(r1peer.userPrompt).not.toContain("LEGAL_PUBLIC_SPEECH");
    expect(section(r1peer, "YOUR_AVAILABLE_DOCUMENTS").map((p: { id: string }) => p.id)).not.toContain("u04");
    expect(r2peer.userPrompt).toContain("LEGAL_PUBLIC_SPEECH");
    expect(section(r2peer, "YOUR_AVAILABLE_DOCUMENTS")).toContainEqual({ id: "u04", text: prepared.online[0].packets[3].text });
    expect(section(r2peer, "VISIBLE_MESSAGES").some((m: { message: string }) => m.message.includes(prepared.online[0].packets[3].text))).toBe(false);
    expect(section(baseline.requests.find(r => r.requestId === `b0-s${slot}-p2-a2`)!, "YOUR_AVAILABLE_DOCUMENTS").map((p: { id: string }) => p.id)).not.toContain("u04");
    const s = changed.run.sessions.find(s => s.block.index === 0 && s.slot === slot)!;
    const state = observeX0Checkpoint(s, 2, []);
    expect(state.input.discussionActLog).toEqual({ observationStatus: "missing", unavailableReason: "invalid", acts: [] });
    expect(s.discussions[0].parsed.publicPart).not.toBeNull();
    expect(state.descriptor.discussionUtilization.utilizationRate).toBeNull();
    expect(state.input.exposureLog.records.some(e => e.evidenceUnitId === "u04" && e.targetAgentId === "a2" && e.checkpointIndex === 1)).toBe(true);
  });

  it("rejects current-round response edges and keeps final choices simultaneous", async () => {
    const slot = buildX0Design()[0].conditions.indexOf("P1");
    const changed = await publicRun((r, result) => {
      if (r.requestId === `b0-s${slot}-p1-a3`) return { ...result, rawContent: JSON.stringify({ ...JSON.parse(result.rawContent), respondsToActIds: ["r1-a1"] }) };
      if (r.requestId === "b0-s0-p3-a1") return { ...result, rawContent: '{"choiceId":"opt_4"}' };
      return result;
    });
    expect(changed.run.sessions.find(s => s.block.index === 0 && s.slot === slot)!.discussions[2].parsed.annotation).toBeNull();
    const last = changed.requests.filter(r => r.requestId.startsWith("b0-s0-p3"));
    expect(last[0].userPrompt).toBe(last[1].userPrompt.replace(/YOUR_AVAILABLE_DOCUMENTS\n[\s\S]*?\n\nVISIBLE_MESSAGES/, last[0].userPrompt.match(/YOUR_AVAILABLE_DOCUMENTS\n[\s\S]*?\n\nVISIBLE_MESSAGES/)![0]));
    const ss = await sensors(changed.run);
    const finalSensor = ss.requests.find(r => r.requestId === "b0-s0-p5-a2")!;
    expect(finalSensor.userPrompt).toContain('\\"choiceId\\":\\"opt_4\\"');
    expect(last.every(r => !r.userPrompt.includes('"finalChoices"'))).toBe(true);
  });

  it("rejects duplicate public keys while preserving legal speech with ambiguous or hostile metadata", async () => {
    const slot = buildX0Design()[0].conditions.indexOf("P1");
    const { run } = await publicRun((r, result) => {
      if (r.requestId === `b0-s${slot}-p1-a1`) return { ...result, rawContent: '{"message":"kept", "shareUnitIds":[], "actKind":"cite", "evidenceUnitIds":["u99"], "evidenceUnitIds":[], "respondsToActIds":[]}' };
      if (r.requestId === `b0-s${slot}-p1-a2`) return { ...result, rawContent: '{"message":"kept too", "shareUnitIds":[], "actKind":{"toString":"hostile"}, "evidenceUnitIds":[], "respondsToActIds":[]}' };
      if (r.requestId === `b0-s${slot}-p1-a3`) return { ...result, rawContent: '{"message":"first", "message":"last", "shareUnitIds":[]}' };
      if (r.requestId === `b0-s${slot}-p3-a3`) return { ...result, rawContent: '{"choiceId":"opt_2","choiceId":"opt_1"}' };
      return result;
    });
    const s = run.sessions.find(s => s.block.index === 0 && s.slot === slot)!;
    expect(s.discussions[0].message.message).toBe("kept");
    expect(s.discussions[1].message.message).toBe("kept too");
    expect(s.discussions.slice(0, 3).every(d => d.parsed.annotation === null)).toBe(true);
    expect(s.discussions[2].parsed.publicPart).toBeNull();
    expect(evaluateX0Outcome(s, "opt_1").invalid).toBe(1);
  });

  it("enforces the frozen contribution limit for scripts without word spaces", async () => {
    const { run } = await publicRun((r, result) => r.requestId === "b0-s0-p1-a1"
      ? { ...result, rawContent: JSON.stringify({ ...JSON.parse(result.rawContent), message: "中".repeat(161) }) }
      : result);
    const session = run.sessions.find(s => s.id === "b0-s0")!;
    expect(session.discussions[0].message.valid).toBe(false);
    expect(session.discussions[0].message.message).toBe("(No valid message.)");
  });

  it("records unknown terminal outcomes without retries and distinguishes missing usage from actual zero", async () => {
    const broken = await publicRun((r, result) => {
      if (r.requestId.endsWith("p1-a1")) throw new Error("provider timeout after possible completion");
      if (r.requestId.endsWith("p1-a2")) return { rawContent: "```json malformed```" };
      if (r.requestId.endsWith("p1-a3")) return { ...result, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: 0 } };
      return result;
    });
    expect(broken.requests).toHaveLength(36);
    expect(new Set(broken.requests.map(r => r.requestId)).size).toBe(36);
    expect(broken.journal).toHaveLength(72);
    expect(broken.journal.filter(c => c.status === "unknown")).toHaveLength(4);
    const observation = observeX0Checkpoint(broken.run.sessions[0], 1, []);
    expect(observation.input.resources.observedUse.promptTokens).toBeNull();
    expect(observation.input.resources.observedUse.invalidOrFailed).toBe(2);
    const zero = await publicRun((_, result) => ({ ...result, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: 0 } }));
    expect(observeX0Checkpoint(zero.run.sessions[0], 1, []).input.resources.observedUse.promptTokens).toBe(0);
    expect(x0CanaryGate(broken.run, (await sensors(broken.run)).cells).passed).toBe(false);
  });

  it("stops before unjournaled calls, on reported budget overrun, and on external cancellation", async () => {
    let calls = 0;
    const controller = new AbortController();
    const common = { online: prepared.online, phase: "canary" as const, settings, signal: controller.signal, invoker: { invoke: async (r: SingleAttemptTextInvokeRequest) => { calls++; return response(r); } } };
    await expect(runX0PublicPhase({ ...common, journal: async () => { throw new Error("disk unavailable"); } })).rejects.toThrow("disk unavailable");
    expect(calls).toBe(0);
    await expect(publicRun((_, r) => ({ ...r, usage: { ...usage, completionTokens: 1025 } }))).rejects.toThrow("completion_cap_exceeded");
    await expect(runX0PublicPhase({ ...common, settings: { ...settings, modelRef: { id: "", version: "" } }, journal: async () => {} })).rejects.toThrow("model_unset");
    const stopped = await runX0PublicPhase({ ...common, journal: async c => { if (c.status === "returned") controller.abort(); } });
    expect(stopped.closed).toBe(false);
    expect(stopped.cells.filter(c => c.status === "returned")).toHaveLength(1);
    expect(stopped.cells.filter(c => c.status === "not_started")).toHaveLength(65);
    await expect(sensors(stopped)).rejects.toThrow("public_phase_not_closed");
    const neverStarted = await runX0PublicPhase({ ...common, journal: async () => {} });
    expect(neverStarted.closed).toBe(false);
    expect(neverStarted.sessions).toHaveLength(0);
  });

  it("preserves all-ID citation and empty-deference counterexamples against an external audit", async () => {
    const { run } = await publicRun();
    const s = run.sessions.find(s => s.condition === "P1")!;
    const state = observeX0Checkpoint(s, 2, []);
    expect(state.descriptor.registeredInformation.registeredPoolCoverage).toBe(1);
    expect(state.descriptor.discussionUtilization.utilizationRate).toBe(1);
    expect(state.descriptor.participationResponse.responseEdges!.every(e => e.informationLinked)).toBe(true);
    const absent = ratings(s, () => "absent");
    const audit = summarizeX0Audit(s, absent, absent);
    expect(audit.U).toEqual({ lower: 0, upper: 0 });
    expect(audit.tags!.unsupported).toBe(6);
    // Numerical coding fixture: holding-agent use must not become peer absorption.
    const holder = ratings(s, (a, p) => s.block.permutation[Number(a.slice(1)) - 1] === p ? "substantive" : "absent");
    const holderAudit = summarizeX0Audit(s, holder, holder);
    expect(holderAudit.U.lower).toBe(1);
    expect(holderAudit.otherUse.upper).toBe(0);
    const conflict = summarizeX0Audit(s, holder, absent);
    expect(conflict.U).toEqual({ lower: 0, upper: 1 });
    expect(() => summarizeX0Audit(s, holder.slice(1), absent)).toThrow("audit_roster");
    const p0 = run.sessions.find(s => s.condition === "P0")!;
    expect(summarizeX0Audit(p0, ratings(p0, () => "absent"), ratings(p0, () => "absent")).tags).toBeNull();
    const packet = buildX0ReviewPacket(run);
    expect(packet.reviewItems).toHaveLength(72);
    expect(JSON.stringify(packet.reviewItems)).not.toMatch(/"condition"|"choiceId"|"evidenceUnitIds"|"actKind"|"sessionId"|"correct_answer"/);
    expect(packet.analystLinkage).toHaveLength(72);
  });

  it("retains full paired denominators, unresolved bounds, sharp-null scope and non-equivalence", () => {
    const pairs = Array.from({ length: 11 }, (_, i) => ({ block: i + 1, p0: { lower: 0, upper: 0 }, p1: { lower: 0, upper: 0 } }));
    expect(analyzeX0Task(pairs, true)).toMatchObject({ sharpNullP: 1, equivalence: "not_qualified", conservative90: [expect.closeTo(-Math.sqrt(2 * Math.log(20) / 11)), expect.closeTo(Math.sqrt(2 * Math.log(20) / 11))] });
    const positive = pairs.map(p => ({ ...p, p1: { lower: 1 / 3, upper: 1 / 3 } }));
    expect(analyzeX0Task(positive, true).sharpNullP).toBe(2 / 2048);
    positive[0].p1.upper = 1;
    const unresolved = analyzeX0Task(positive, true);
    expect(unresolved.sharpNullP).toBeNull();
    expect(unresolved.pointEstimate).toBeNull();
    expect(unresolved.effectBounds[1]).toBeCloseTo(13 / 33);
    expect(analyzeX0Task(pairs, false).conservative90).toBeNull();
    expect(() => analyzeX0Task(pairs.slice(1), true)).toThrow("eleven_noncanary_blocks");
    expect(() => analyzeX0Task(pairs.map((p, i) => ({ ...p, block: i === 0 ? 0 : p.block })), true)).toThrow("eleven_noncanary_blocks");
  });

  it("keeps invalid and abstaining outcomes in the keyed-success denominator", async () => {
    const { run } = await publicRun((r, result) => r.requestId.includes("-p3-a3") ? { ...result, rawContent: "invalid" } : result);
    const result = evaluateX0Outcome(run.sessions[0], "opt_1");
    expect(result).toMatchObject({ groupChoice: "opt_1", invalid: 1, keyedSuccess: false });
    const split = await publicRun((r, result) => r.requestId.includes("-p3-") ? { ...result, rawContent: JSON.stringify({ choiceId: `opt_${r.requestId.slice(-1)}` }) } : result);
    expect(evaluateX0Outcome(split.run.sessions[0], "opt_1")).toMatchObject({ groupChoice: null, abstain: true, invalid: 0, keyedSuccess: false });
  });

  it("runs the entire fixed schedule with injected responses and validates every V0 observation prefix", async () => {
    for (const phase of ["canary", "remainder"] as const) {
      const { run, requests } = await publicRun(undefined, prepared.online, phase);
      expect(requests).toHaveLength(phase === "canary" ? 36 : 396);
      const ss = await sensors(run);
      expect(ss.cells).toHaveLength(phase === "canary" ? 30 : 330);
      for (const s of run.sessions) for (const index of [0, 1, 2]) {
        const observation = observeX0Checkpoint(s, index, ss.cells);
        expect(observation.primaryComplete).toBe(true);
        expect(observation.input.resources.budgetBefore.computeUnits).toBe(index === 0 ? 9 : index === 1 ? 6 : 0);
        expect(observation.input.beliefChoice.publicChoices).toHaveLength(index === 2 ? 3 : 0);
        if (s.condition === "P0") expect(observation.descriptor.discussionUtilization.utilizationRate).toBeNull();
      }
    }
  });

  it("binds a real raw single-attempt boundary without code-fence repair or hidden retry fields", async () => {
    const valid = liveRequest();
    expect(() => assertX0ZhipuRawRequest(valid, liveSettings)).not.toThrow();
    expect(() => assertX0ZhipuRawRequest({ ...valid, invocationConfig: { ...valid.invocationConfig, retry: "none" } }, liveSettings)).toThrow("invocation_config_fields");
    expect(() => assertX0ZhipuRawRequest({ ...valid, responseFormat: "text" }, liveSettings)).toThrow("request_model_or_format");
    expect(() => assertX0ZhipuRawRequest({ ...valid, modelRef: { id: "zhipu:other", version: "1" } }, liveSettings)).toThrow("request_model_or_format");
    const invoker = createX0ZhipuRawSingleAttemptInvoker(liveSettings, "test-zhipu-key");
    await expect(invoker.invoke({ ...valid, invocationConfig: { ...valid.invocationConfig, maxTokens: 0 } }, new AbortController().signal)).rejects.toThrow("invocation_config_invalid");
  });

  it("fails closed when the raw GLM response does not prove the frozen model identity", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        request_id: "zhipu-provider-1",
        model: "glm-4.5-air-substitute",
        choices: [{ message: { content: "{}" } }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }),
    } as unknown as Response));
    try {
      const invoker = createX0ZhipuRawSingleAttemptInvoker(liveSettings, "test-zhipu-key");
      await expect(invoker.invoke(liveRequest(), new AbortController().signal)).rejects.toThrow("zhipu_response_provenance");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("shapes one direct Qwen request, preserves raw output, and leaves missing usage missing", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: "dashscope-request-1", model: "qwen3.7-flash-2026-07-15", choices: [{ message: { content: ["```json", "{bad}", "```"].join("\n"), reasoning_content: null } }] }),
      } as unknown as Response;
    });
    try {
      const invoker = createX0DashScopeRawSingleAttemptInvoker(qwenSettings, qwenConnection);
      const result = await invoker.invoke(qwenRequest(), new AbortController().signal);
      expect(result.rawContent).toBe("```json\n{bad}\n```");
      expect(result.providerMetadata).toEqual({ model: "qwen3.7-flash-2026-07-15", requestId: "dashscope-request-1" });
      expect(result.usage?.promptTokens).toBeUndefined();
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("https://workspace_x0.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions");
      expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
      expect(calls[0].init.headers).toEqual({ Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer test-dashscope-key" });
      expect(JSON.parse(String(calls[0].init.body))).toEqual({
        model: "qwen3.7-flash-2026-07-15",
        messages: [{ role: "system", content: "Return strict JSON only." }, { role: "user", content: "Return JSON." }],
        temperature: 0.7,
        max_tokens: qwenRequest().invocationConfig.maxTokens,
        n: 1,
        stream: false,
        enable_thinking: false,
        response_format: { type: "json_object" },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects malformed Qwen requests and provider drift before a retry can occur", async () => {
    const valid = qwenRequest();
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({ id: "provider-1", model: "qwen3.7-flash", choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }) } as unknown as Response;
    });
    try {
      expect(() => assertX0DashScopeRawRequest({ ...valid, invocationConfig: { ...valid.invocationConfig, seed: 1 } }, qwenSettings)).toThrow("invocation_config_fields");
      expect(() => assertX0DashScopeRawRequest({ ...valid, responseFormat: "text" }, qwenSettings)).toThrow("request_model_or_format");
      expect(() => assertX0DashScopeRawRequest({ ...valid, systemPrompt: "no structured output", userPrompt: "no structured output" }, qwenSettings)).toThrow("dashscope_json_prompt_missing");
      expect(calls).toBe(0);
      await expect(createX0DashScopeRawSingleAttemptInvoker(qwenSettings, qwenConnection).invoke(valid, new AbortController().signal)).rejects.toThrow("dashscope_response_provenance_or_choices");
      expect(calls).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps provider-reported Qwen zero usage distinct from omitted usage", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: "dashscope-zero", model: "qwen3.7-flash-2026-07-15", choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }),
    } as unknown as Response));
    try {
      const result = await createX0DashScopeRawSingleAttemptInvoker(qwenSettings, qwenConnection).invoke(qwenRequest(), new AbortController().signal);
      expect(result.usage).toEqual(expect.objectContaining({ promptTokens: 0, completionTokens: 0, totalTokens: 0 }));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("binds a Qwen canary to one frozen task/settings input and journals its mocked provider schedule", async () => {
    const root = await mkdtemp(join(tmpdir(), "swarmalpha-x0-qwen-"));
    const calls: RequestInit[] = [];
    const online = structuredClone(prepared.online);
    const boundSettings = { ...qwenSettings, modelRef: { ...qwenSettings.modelRef } };
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      calls.push(init);
      const body = JSON.parse(String(init.body)) as { messages: { content: string }[] };
      const request = { requestId: "provider-only", systemPrompt: body.messages[0].content, userPrompt: body.messages[1].content, responseFormat: "json" as const, modelRef: qwenSettings.modelRef, invocationConfig: { temperature: 0.7, maxTokens: 1024, thinking: "disabled" } };
      const raw = response(request).rawContent;
      return { ok: true, status: 200, json: async () => ({ id: `dashscope-${calls.length}`, model: "qwen3.7-flash-2026-07-15", choices: [{ message: { content: raw } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }) } as unknown as Response;
    });
    try {
      const execution = await createX0DashScopeCanaryExecution({ directory: join(root, "canary-qwen"), runId: "canary-qwen", settings: boundSettings, onlineTasks: online, connection: qwenConnection });
      expect(calls).toHaveLength(0);
      expect(JSON.stringify(execution.manifest)).not.toContain(qwenConnection.apiKey);
      expect(() => { execution.manifest.settings.temperature = 0; }).toThrow();
      expect(() => { execution.manifest.cellPlan[0].maxTokens = 1; }).toThrow();
      online[0].context = "POST_CONSTRUCTION_TASK_MUTATION";
      boundSettings.temperature = 0;
      await expect(execution.runSensors(new AbortController().signal)).rejects.toThrow("bound_sensors_before_public");
      const run = await execution.runPublic(new AbortController().signal);
      expect(run.closed).toBe(true);
      const sensorCells = await execution.runSensors(new AbortController().signal);
      expect(sensorCells).toHaveLength(30);
      expect(calls).toHaveLength(66);
      expect(JSON.stringify(calls)).not.toContain("POST_CONSTRUCTION_TASK_MUTATION");
      expect(JSON.parse(String(calls[0].body)).temperature).toBe(0.7);
      const recovered = await execution.read();
      expect(recovered.events).toHaveLength(132);
      expect(recovered.manifest.onlineTaskHash).toBeTruthy();
      await expect(execution.runPublic(new AbortController().signal)).rejects.toThrow("bound_public_already_attempted");
    } finally {
      vi.unstubAllGlobals();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("persists a new phase journal before every call, validates its hash-chain sequence, and never reopens a run directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "swarmalpha-x0-journal-"));
    const calls: RequestInit[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      calls.push(init);
      const body = JSON.parse(String(init.body)) as { messages: { content: string }[]; temperature: number; max_tokens: number; seed: number };
      const raw = response({
        requestId: "provider-only",
        systemPrompt: body.messages[0].content,
        userPrompt: body.messages[1].content,
        responseFormat: "json",
        modelRef: liveSettings.modelRef,
        invocationConfig: { temperature: body.temperature, maxTokens: body.max_tokens, thinking: "disabled", seed: body.seed },
      }).rawContent;
      return { ok: true, status: 200, json: async () => ({ request_id: `zhipu-${calls.length}`, model: "glm-4.5-air", choices: [{ message: { content: raw } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }) } as unknown as Response;
    });
    try {
      const directory = join(root, "canary-001");
      const execution = await createX0ZhipuCanaryExecution({ directory, runId: "canary-001", settings: liveSettings, onlineTasks: prepared.online, apiKey: "test-zhipu-key" });
      expect(calls).toHaveLength(0);
      expect("journal" in execution).toBe(false);
      const run = await execution.runPublic(new AbortController().signal);
      const sensorCells = await execution.runSensors(new AbortController().signal);
      const recovered = await execution.read();
      expect(recovered.manifest.phase).toBe("canary");
      expect(recovered.events).toHaveLength(132);
      expect(recovered.events.filter(e => e.status === "started")).toHaveLength(66);
      expect(recovered.terminalCells).toHaveLength(66);
      expect(recovered.unknownAfterInterruption).toEqual([]);
      expect(sensorCells).toHaveLength(30);
      const first = recovered.events[0];
      expect(first.status).toBe("started");
      expect(first.cell.request).toEqual(expect.objectContaining({ requestId: first.cell.id }));
      expect(first.cell.executionInputHash).toBe(recovered.manifest.onlineTaskHash);
      await expect(createX0ZhipuCanaryExecution({ directory, runId: "canary-001", settings: liveSettings, onlineTasks: prepared.online, apiKey: "test-zhipu-key" })).rejects.toThrow();
      const raw = await readFile(join(directory, "journal.jsonl"), "utf8");
      await writeFile(join(directory, "journal.jsonl"), `${raw}{"tampered":true}\n`);
      await expect(readX0PersistentJournal(directory)).rejects.toThrow("event_fields");
    } finally {
      vi.unstubAllGlobals();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("turns an interrupted started cell into an unknown observation and rejects duplicate journal cells", async () => {
    const root = await mkdtemp(join(tmpdir(), "swarmalpha-x0-interrupted-"));
    try {
      const directory = join(root, "canary-002");
      const execution = await createX0ZhipuCanaryExecution({ directory, runId: "canary-002", settings: liveSettings, onlineTasks: prepared.online, apiKey: "test-zhipu-key" });
      const cell = { ...planX0Cells("canary")[0], executionInputHash: execution.manifest.onlineTaskHash, status: "started" as const, request: liveRequest() };
      const event = (eventIndex: number, priorEventHash: string, currentCell: typeof cell) => {
        const body = { journalRef: execution.manifest.journalRef, eventIndex, priorEventHash, status: "started" as const, cell: currentCell };
        return { ...body, contentHash: fingerprintEstimatorValue(body) };
      };
      const invalid = event(0, execution.manifest.genesisHash, { ...cell, request: { ...liveRequest(), invocationConfig: { ...liveRequest().invocationConfig, temperature: 0 } } });
      await writeFile(join(directory, "journal.jsonl"), `${JSON.stringify(invalid)}\n`);
      await expect(execution.read()).rejects.toThrow("invocation_config_invalid");
      const started = event(0, execution.manifest.genesisHash, cell);
      await writeFile(join(directory, "journal.jsonl"), `${JSON.stringify(started)}\n`);
      const recovered = await execution.read();
      expect(recovered.terminalCells).toEqual([]);
      expect(recovered.unknownAfterInterruption).toEqual([expect.objectContaining({ id: cell.id, status: "unknown" })]);
      expect(recovered.unknownAfterInterruption[0].request).toEqual(cell.request);
      const duplicate = event(1, started.contentHash, cell);
      await writeFile(join(directory, "journal.jsonl"), `${JSON.stringify(started)}\n${JSON.stringify(duplicate)}\n`);
      await expect(execution.read()).rejects.toThrow("started_transition_invalid");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
