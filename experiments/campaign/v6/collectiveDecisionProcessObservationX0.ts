/** X0 only: paired annotation experiment. No credentials, file reader, main, or retries. */
import { fingerprintEstimatorValue } from "../../../src/lib/epistemic/estimators";
import {
  projectCollectiveDecisionProcessStateV0,
  type CollectiveDecisionProcessStateInputV0,
  type DiscussionActV0,
  type EvidenceExposureV0,
} from "../../../src/lib/epistemic/collectiveDecisionProcessState";
import { projectDiscussionThermometerStateV1 } from "../../../src/lib/epistemic/discussionThermometer";
import {
  buildCollectiveDynamicsSensorPromptPayloadV1,
  parseCollectiveDynamicsSensorReportV1_1,
  COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1,
} from "./collectiveDynamicsPromptSensitivityCanaryV1";
import type { HiddenBenchSourceTaskV1 } from "./hiddenBenchTaskAdapter";
import type { SingleAttemptTextInvoker, SingleAttemptTextInvokeRequest, SingleAttemptTextInvokeResult } from "./providerAdapters";

const AGENTS = ["a1", "a2", "a3"] as const;
type Agent = typeof AGENTS[number];
type Condition = "P0" | "P1";
type Phase = "canary" | "remainder";
type Ref = { id: string; version: string };
type Packet = { id: string; text: string; privateIndex: number | null };
export interface X0Task { alias: string; context: string; options: { optionId: string; canonicalLabel: string }[]; packets: Packet[] }
export interface X0Block { index: number; taskAlias: string; permutation: number[]; displayOrder: "forward" | "reverse"; conditions: Condition[]; canary: boolean }
export interface X0Settings {
  modelRef: Ref;
  temperature: number;
  thinking: "disabled";
  seedSupport: "supported" | "unsupported";
}
type PublicMessage = { id: string; agentId: Agent; round: number; message: string; valid: boolean };
type Annotation = Pick<DiscussionActV0, "actKind" | "evidenceUnitIds" | "respondsToActIds">;
export interface X0View {
  claimId: string; context: string; options: X0Task["options"]; agentId: Agent; checkpoint: number;
  documents: { id: string; text: string }[]; ownPrivateId: string;
  messages: PublicMessage[]; choices: { agentId: Agent; choiceId: string | null }[];
}
export interface X0Cell {
  id: string; seed: number; block: number; slot: number | null; agentId: Agent;
  phase: 1 | 2 | 3 | 4 | 5 | 0; maxTokens: number;
  status: "not_started" | "started" | "returned" | "unknown";
  /** Attached by a concrete public run; durable journals bind it to their manifest. */
  executionInputHash?: string;
  request?: SingleAttemptTextInvokeRequest; result?: SingleAttemptTextInvokeResult;
}
export type X0Journal = (cell: Readonly<X0Cell>) => Promise<void>;
type ParsedDiscussion = { publicPart: { message: string; shareUnitIds: string[] } | null; annotation: Annotation | null; protocolValid: boolean };
interface Checkpoint {
  index: number; views: X0View[]; exposures: EvidenceExposureV0[]; acts: DiscussionActV0[];
  annotationReason: "invalid" | "provider_failure" | null; cells: X0Cell[]; asOfSequence: number;
}
export interface X0Session {
  id: string; block: X0Block; slot: number; condition: Condition; task: X0Task;
  settings: X0Settings; checkpoints: Checkpoint[];
  discussions: { message: PublicMessage; parsed: ParsedDiscussion; cellId: string }[];
}
export interface X0PublicRun { phase: Phase; settings: X0Settings; sessions: X0Session[]; cells: X0Cell[]; closed: boolean }

function requireX0(ok: unknown, reason: string): asserts ok { if (!ok) throw new Error(`x0_${reason}`); }
function frozen<T>(value: T): T {
  const copy = structuredClone(value);
  const freeze = (x: unknown): void => { if (x && typeof x === "object") { Object.values(x).forEach(freeze); Object.freeze(x); } };
  freeze(copy);
  return copy;
}
const text = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;
const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x);
const exact = (x: Record<string, unknown>, keys: string[]) => Object.keys(x).sort().join("|") === [...keys].sort().join("|");
const ids = (x: unknown, allowed: string[]): x is string[] => Array.isArray(x) && new Set(x).size === x.length && x.every(y => typeof y === "string" && allowed.includes(y));
function parseX0Object(raw: string): { value: Record<string, unknown>; duplicates: Set<string> } {
  const value: unknown = JSON.parse(raw); // Parse first; the scan below only rejects ambiguous keys.
  requireX0(object(value), "json_object");
  const seen = new Set<string>(), duplicates = new Set<string>();
  let depth = 0;
  for (const token of raw.matchAll(/"(?:[^"\\]|\\.)*"|[{}\[\]]/gu)) {
    if (token[0] === "{" || token[0] === "[") depth++;
    else if (token[0] === "}" || token[0] === "]") depth--;
    else if (depth === 1 && /^\s*:/u.test(raw.slice(token.index! + token[0].length))) {
      const key: string = JSON.parse(token[0]);
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
    }
  }
  return { value, duplicates };
}

/** Offline export only. Online execution receives online, never the source objects or keys. */
export function prepareX0Tasks(source: readonly HiddenBenchSourceTaskV1[]) {
  const keys: Record<string, string> = {};
  const online = [4, 6].map((id, i): X0Task => {
    const matches = source.filter(t => t.id === id);
    requireX0(matches.length === 1, "source_task_missing_or_duplicate");
    const t = matches[0];
    requireX0(t.hidden_information.length === 3 && t.shared_information.length === (i === 0 ? 3 : 4) && t.possible_answers.length === 4, "source_shape");
    const alias = i === 0 ? "x0-a" : "x0-b";
    const options = t.possible_answers.map((canonicalLabel, k) => ({ optionId: `opt_${k + 1}`, canonicalLabel }));
    const answer = options.find(o => o.canonicalLabel === t.correct_answer);
    requireX0(answer, "offline_key");
    keys[alias] = answer.optionId;
    return { alias, context: t.description, options, packets: [...t.shared_information, ...t.hidden_information].map((body, k) => ({
      id: `u${String(k + 1).padStart(2, "0")}`, text: body, privateIndex: k < t.shared_information.length ? null : k - t.shared_information.length,
    })) };
  });
  return frozen({ online, keys });
}

export function buildX0Design(): X0Block[] {
  const permutations = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const blocks: X0Block[] = [];
  for (const taskAlias of ["x0-a", "x0-b"]) for (const permutation of permutations) for (const displayOrder of ["forward", "reverse"] as const) {
    const signatures = [0, 1].map(slot => fingerprintEstimatorValue({ seed: 20260908, taskAlias, permutation, displayOrder, slot }));
    requireX0(signatures[0] !== signatures[1], "allocation_collision");
    blocks.push({ index: blocks.length, taskAlias, permutation: [...permutation], displayOrder,
      conditions: signatures[0] < signatures[1] ? ["P0", "P1"] : ["P1", "P0"],
      canary: permutation.join() === "0,1,2" && displayOrder === "forward" });
  }
  return frozen(blocks);
}

export function planX0Cells(phase: Phase | "full"): X0Cell[] {
  requireX0(phase === "canary" || phase === "remainder" || phase === "full", "phase");
  const cells: X0Cell[] = [];
  const add = (b: X0Block, slot: number | null, p: X0Cell["phase"], agentId: Agent, ai: number) => {
    const seed = slot === null ? 2000000 + 10 * b.index + ai : 1000000 + 1000 * b.index + 100 * slot + 10 * p + ai;
    cells.push({ id: `b${b.index}-s${slot ?? "pair"}-p${p}-${agentId}`, seed, block: b.index, slot, phase: p, agentId,
      maxTokens: p === 1 || p === 2 ? 1024 : p === 3 ? 64 : 256, status: "not_started" });
  };
  const blocks = buildX0Design().filter(b => phase === "full" || b.canary === (phase === "canary"));
  // Complete the whole public phase before scheduling any sensor.
  for (const b of blocks) for (const p of [1, 2, 3] as const) AGENTS.forEach((a, ai) => [0, 1].forEach(slot => add(b, slot, p, a, ai)));
  for (const b of blocks) {
    AGENTS.forEach((a, ai) => add(b, null, 0, a, ai));
    for (const p of [4, 5] as const) AGENTS.forEach((a, ai) => [0, 1].forEach(slot => add(b, slot, p, a, ai)));
  }
  return frozen(cells);
}

const SYSTEM = "You are one of three equal participants in an evidence-sharing discussion. Use only your supplied documents and visible discussion. Make one concise substantive contribution in at most 160 word-or-character units; each CJK, Thai, Lao, Khmer, or Myanmar character counts as one unit. You may share at most one document currently available to you. Sharing is optional. Return the requested JSON only.";
const FOOTER = "This study has exactly two discussion rounds, no extra tools, and no actual payments corresponding to rewards described in the task material.";
const FORMATS: Record<Condition, string> = {
  P0: 'Return exactly {"message": "<your contribution>", "shareUnitIds": []}. shareUnitIds may contain zero or one available document ID. No other fields.',
  P1: 'Return exactly {"message": "<your contribution>", "shareUnitIds": [], "actKind": "introduce", "evidenceUnitIds": [], "respondsToActIds": []}. actKind must be introduce, cite, challenge, integrate, or conflict_addressed, describing the primary function of this contribution. evidenceUnitIds lists only available documents actually used in your message. respondsToActIds lists only visible earlier message IDs actually addressed. Empty reference arrays are allowed. Do not add content merely to fill these fields. shareUnitIds may contain zero or one available document ID. Do not output any other fields.',
};
const FINAL = 'Based on your available documents and the complete visible discussion, choose the single option you would submit. Return exactly {"choiceId": "<one canonical option ID>"}. No explanation.';
const CONTRIBUTION_UNIT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]|[\p{L}\p{N}]+/gu;
function contributionWithinLimit(message: string): boolean { return (message.match(CONTRIBUTION_UNIT) ?? []).length <= 160; }

function settingsCheck(s: X0Settings) {
  requireX0(exact(s as unknown as Record<string, unknown>, ["modelRef", "temperature", "thinking", "seedSupport"]), "settings_fields");
  requireX0(object(s.modelRef) && exact(s.modelRef, ["id", "version"]) && text(s.modelRef.id) && text(s.modelRef.version), "model_unset");
  requireX0(Number.isFinite(s.temperature) && s.temperature >= 0 && s.temperature <= 2 && s.thinking === "disabled" && ["supported", "unsupported"].includes(s.seedSupport), "settings");
}
function request(cell: X0Cell, settings: X0Settings, systemPrompt: string, userPrompt: string): SingleAttemptTextInvokeRequest {
  return frozen({ requestId: cell.id, systemPrompt, userPrompt, responseFormat: "json", modelRef: settings.modelRef,
    invocationConfig: { temperature: settings.temperature, maxTokens: cell.maxTokens,
      thinking: settings.thinking, ...(settings.seedSupport === "supported" ? { seed: cell.seed } : {}) } });
}
function publicRequest(view: X0View, condition: Condition, cell: X0Cell, settings: X0Settings) {
  requireX0(view.choices.length === 0 && view.messages.every(m => m.round < cell.phase), "future_public_input");
  return request(cell, settings, cell.phase === 3 ? "You are one of three equal participants. Return the requested JSON only." : SYSTEM,
    [`TASK_CONTEXT\n${JSON.stringify(view.context + "\n" + FOOTER)}`, `OPTIONS\n${JSON.stringify(view.options)}`,
      `YOUR_AVAILABLE_DOCUMENTS\n${JSON.stringify(view.documents)}`, `VISIBLE_MESSAGES\n${JSON.stringify(view.messages.map(({ id, agentId, round, message }) => ({ id, agentId, round, message })))}`,
      `RESPONSE_FORMAT\n${cell.phase === 3 ? FINAL : FORMATS[condition]}`].join("\n\n"));
}

function parseDiscussion(raw: string | undefined, condition: Condition, view: X0View, validPastActs: string[]): ParsedDiscussion {
  let parsed: ReturnType<typeof parseX0Object>;
  try { parsed = parseX0Object(raw ?? ""); } catch { return { publicPart: null, annotation: null, protocolValid: false }; }
  const { value, duplicates } = parsed;
  const available = view.documents.map(d => d.id);
  const publicPart = !duplicates.has("message") && !duplicates.has("shareUnitIds") && text(value.message) && contributionWithinLimit(value.message) && ids(value.shareUnitIds, available) && value.shareUnitIds.length <= 1
    ? { message: value.message, shareUnitIds: [...value.shareUnitIds] } : null;
  const annotation = condition === "P1" && publicPart && typeof value.actKind === "string" && ["introduce", "cite", "challenge", "integrate", "conflict_addressed"].includes(value.actKind)
    && ids(value.evidenceUnitIds, available) && ids(value.respondsToActIds, validPastActs)
    ? { actKind: value.actKind as Annotation["actKind"], evidenceUnitIds: [...value.evidenceUnitIds], respondsToActIds: [...value.respondsToActIds] } : null;
  const expected = condition === "P0" ? ["message", "shareUnitIds"] : ["message", "shareUnitIds", "actKind", "evidenceUnitIds", "respondsToActIds"];
  const protocolValid = !!publicPart && duplicates.size === 0 && exact(value, expected) && (condition === "P0" || !!annotation);
  return { publicPart, annotation: protocolValid ? annotation : null, protocolValid };
}

/** Journal the start before invoking. An exception has an unknown provider outcome, never a retry. */
async function invokeCell(cell: X0Cell, req: SingleAttemptTextInvokeRequest, invoker: SingleAttemptTextInvoker, journal: X0Journal, signal: AbortSignal) {
  requireX0(cell.status === "not_started", "cell_already_attempted");
  cell.request = req;
  cell.status = "started";
  await journal(frozen(cell)); // A journal failure stops execution before a possibly unrecorded call.
  try { cell.result = structuredClone(await invoker.invoke(req, signal)); cell.status = "returned"; }
  catch { cell.status = "unknown"; }
  await journal(frozen(cell));
  requireX0(cell.result?.usage?.completionTokens === undefined || cell.result.usage.completionTokens <= cell.maxTokens, "reported_completion_cap_exceeded");
}

/** Agent boards and public renderer have no annotation/sensor fields. */
export async function runX0PublicPhase(input: {
  online: readonly X0Task[]; phase: Phase; settings: X0Settings; invoker: SingleAttemptTextInvoker; journal: X0Journal; signal: AbortSignal;
}): Promise<X0PublicRun> {
  settingsCheck(input.settings);
  requireX0(input.phase === "canary" || input.phase === "remainder", "execution_phase");
  const settings = frozen(input.settings);
  const tasks = frozen(input.online);
  requireX0(tasks.length === 2 && ["x0-a", "x0-b"].every(a => tasks.filter(t => t.alias === a).length === 1), "online_tasks");
  for (const t of tasks) {
    requireX0(exact(t as unknown as Record<string, unknown>, ["alias", "context", "options", "packets"]) && text(t.context), "online_fields");
    requireX0(t.options.length === 4 && t.options.every((o, i) => exact(o, ["optionId", "canonicalLabel"]) && o.optionId === `opt_${i + 1}` && text(o.canonicalLabel)), "online_options");
    const shared = t.alias === "x0-a" ? 3 : 4;
    requireX0(t.packets.length === shared + 3 && t.packets.every((p, i) => exact(p, ["id", "text", "privateIndex"]) && p.id === `u${String(i + 1).padStart(2, "0")}` && text(p.text) && p.privateIndex === (i < shared ? null : i - shared)), "online_packets");
  }
  const executionInputHash = fingerprintEstimatorValue(tasks);
  const cells = structuredClone(planX0Cells(input.phase)).map(cell => ({ ...cell, executionInputHash }));
  const sessions: X0Session[] = [];
  for (const block of buildX0Design().filter(b => b.canary === (input.phase === "canary"))) {
    if (input.signal.aborted) break;
    const task = tasks.find(t => t.alias === block.taskAlias)!;
    const states = [0, 1].map(slot => {
      const session: X0Session = { id: `b${block.index}-s${slot}`, block, slot, condition: block.conditions[slot], task, settings, checkpoints: [], discussions: [] };
      sessions.push(session);
      const boards = AGENTS.map((_, ai) => task.packets.filter(p => p.privateIndex === null || p.privateIndex === block.permutation[ai]).map(p => ({ id: p.id, text: p.text })));
      let sequence = 0;
      // Provisioning a packet to an addressed input board is delivery, not a claim of comprehension.
      const exposures: EvidenceExposureV0[] = boards.flatMap((board, ai) => board.map(p => ({ exposureId: `e${++sequence}`, evidenceUnitId: p.id, targetAgentId: AGENTS[ai], checkpointIndex: 0, eventSequence: sequence, channel: task.packets.find(u => u.id === p.id)!.privateIndex === null ? "public" : "private" })));
      return { session, boards, messages: [] as PublicMessage[], choices: [] as X0View["choices"], exposures, acts: [] as DiscussionActV0[], reason: null as Checkpoint["annotationReason"], sequence };
    });
    const view = (s: typeof states[number], ai: number, checkpoint: number): X0View => frozen({
      claimId: task.alias === "x0-a" ? "question-a" : "question-b", context: task.context, options: task.options, agentId: AGENTS[ai], checkpoint, documents: s.boards[ai],
      ownPrivateId: task.packets.find(p => p.privateIndex === block.permutation[ai])!.id,
      messages: [...s.messages].sort((a, b) => a.round - b.round || (block.displayOrder === "forward" ? 1 : -1) * (a.agentId < b.agentId ? -1 : a.agentId > b.agentId ? 1 : 0)), choices: s.choices,
    });
    const checkpoint = (s: typeof states[number], index: number) => s.session.checkpoints.push(frozen({ index, views: AGENTS.map((_, ai) => view(s, ai, index)), exposures: s.exposures, acts: s.acts, annotationReason: s.reason,
      cells: cells.filter(c => c.block === block.index && c.slot === s.session.slot && c.phase >= 1 && c.phase <= 3 && c.status !== "not_started"), asOfSequence: s.sequence }));
    states.forEach(s => checkpoint(s, 0));
    for (const round of [1, 2, 3] as const) {
      const views = states.map(s => AGENTS.map((_, ai) => view(s, ai, round - 1)));
      for (let ai = 0; ai < 3; ai++) for (const slot of [0, 1]) {
        if (input.signal.aborted) return frozen({ phase: input.phase, settings, sessions, cells, closed: false });
        const cell = cells.find(c => c.block === block.index && c.slot === slot && c.phase === round && c.agentId === AGENTS[ai])!;
        await invokeCell(cell, publicRequest(views[slot][ai], states[slot].session.condition, cell, settings), input.invoker, input.journal, input.signal);
      }
      // Commit only after both slots' round has ended. Never expose an early completion.
      for (const s of states) {
        const stagedShares: string[] = [];
        const validPast = s.acts.map(a => a.actId);
        for (let ai = 0; ai < 3; ai++) {
          const cell = cells.find(c => c.block === block.index && c.slot === s.session.slot && c.phase === round && c.agentId === AGENTS[ai])!;
          if (round === 3) {
            let choiceId: string | null = null;
            try { const { value, duplicates } = parseX0Object(cell.result?.rawContent ?? ""); if (duplicates.size === 0 && exact(value, ["choiceId"]) && typeof value.choiceId === "string" && task.options.some(o => o.optionId === value.choiceId)) choiceId = value.choiceId; } catch { /* unavailable */ }
            s.choices.push({ agentId: AGENTS[ai], choiceId });
            continue;
          }
          const parsed = parseDiscussion(cell.result?.rawContent, s.session.condition, views[s.session.slot][ai], validPast);
          const message: PublicMessage = { id: `r${round}-${AGENTS[ai]}`, agentId: AGENTS[ai], round, message: parsed.publicPart?.message ?? "(No valid message.)", valid: parsed.publicPart !== null };
          s.messages.push(message);
          s.session.discussions.push({ message, parsed, cellId: cell.id });
          stagedShares.push(...(parsed.publicPart?.shareUnitIds ?? []));
          if (s.session.condition === "P1") {
            if (parsed.annotation) s.acts.push({ actId: message.id, agentId: message.agentId, checkpointIndex: round, eventSequence: ++s.sequence, ...parsed.annotation, observationBasis: "architecture_recorded" });
            else s.reason = cell.status === "unknown" ? "provider_failure" : (s.reason ?? "invalid");
          }
        }
        for (const id of new Set(stagedShares)) for (let ai = 0; ai < 3; ai++) if (!s.boards[ai].some(p => p.id === id)) {
          const p = task.packets.find(p => p.id === id)!;
          s.boards[ai].push({ id, text: p.text });
          s.boards[ai].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
          s.exposures.push({ exposureId: `e${++s.sequence}`, evidenceUnitId: id, targetAgentId: AGENTS[ai], checkpointIndex: round, eventSequence: s.sequence, channel: "public" });
        }
        if (round === 1 || round === 3) checkpoint(s, round === 3 ? 2 : 1);
      }
    }
  }
  return frozen({ phase: input.phase, settings, sessions, cells, closed: cells.filter(c => c.phase >= 1 && c.phase <= 3).every(c => c.status === "returned" || c.status === "unknown") });
}

function sensorRequest(view: X0View, cell: X0Cell, settings: X0Settings) {
  const publicDocuments = view.documents.filter(d => d.id !== view.ownPrivateId);
  const own = view.messages.filter(m => m.agentId === view.agentId);
  const prompt = buildCollectiveDynamicsSensorPromptPayloadV1({ variant: "BASELINE_A", payload: {
    publicContext: JSON.stringify({ context: view.context + "\n" + FOOTER, documents: publicDocuments, finalChoices: view.choices }),
    ownPrivateInformation: JSON.stringify(view.documents.find(d => d.id === view.ownPrivateId)), roleConstraints: "Three equal participants; no tools.",
    ownPublicMessage: own.length ? { agentId: view.agentId, round: view.checkpoint, content: JSON.stringify(own.map(m => ({ id: m.id, round: m.round, message: m.message }))) } : null,
    peerPublicMessages: view.messages.filter(m => m.agentId !== view.agentId).map(m => ({ agentId: m.agentId, round: m.round, content: JSON.stringify({ id: m.id, message: m.message }) })),
    claim: { claimId: view.claimId, proposition: view.context, outcomeSpace: "finite_mutually_exclusive_exhaustive", reportSemantics: "probability_of_single_outcome", options: view.options },
    contentHash: fingerprintEstimatorValue(view),
  } });
  return request(cell, settings, prompt.systemPrompt, prompt.userPrompt);
}

/** Deliberately accepts a closed public run. No callbacks into public execution exist. */
export async function runX0Sensors(input: { publicRun: X0PublicRun; invoker: SingleAttemptTextInvoker; journal: X0Journal; signal: AbortSignal; order?: "forward" | "reverse" }) {
  requireX0(input.publicRun.closed, "public_phase_not_closed");
  const run = frozen(input.publicRun);
  const cells = structuredClone(run.cells.filter(c => c.phase === 0 || c.phase >= 4));
  if (input.order === "reverse") cells.reverse();
  for (const cell of cells) {
    if (input.signal.aborted) break;
    const session = run.sessions.find(s => s.block.index === cell.block && s.slot === (cell.slot ?? 0))!;
    const index = cell.phase === 0 ? 0 : cell.phase === 4 ? 1 : 2;
    const v = session.checkpoints.find(c => c.index === index)!.views.find(v => v.agentId === cell.agentId)!;
    await invokeCell(cell, sensorRequest(v, cell, run.settings), input.invoker, input.journal, input.signal);
  }
  return frozen(cells);
}

/** Offline observation projection; public inputs/costs were captured before sensors. */
export function observeX0Checkpoint(session: X0Session, index: number, sensorCells: readonly X0Cell[]) {
  const cp = session.checkpoints.find(c => c.index === index);
  requireX0(cp, "checkpoint_missing");
  const optionIds = session.task.options.map(o => o.optionId);
  const reportPairs = AGENTS.map(agentId => {
    const matches = sensorCells.filter(c => c.block === session.block.index && c.slot === (index === 0 ? null : session.slot) && c.phase === (index === 0 ? 0 : index === 1 ? 4 : 5) && c.agentId === agentId);
    requireX0(matches.length <= 1, "duplicate_primary");
    const c = matches[0];
    if (c && c.status !== "not_started") {
      const planned = planX0Cells("full").find(p => p.block === session.block.index && p.slot === (index === 0 ? null : session.slot) && p.phase === (index === 0 ? 0 : index === 1 ? 4 : 5) && p.agentId === agentId)!;
      const expected = sensorRequest(cp.views.find(v => v.agentId === agentId)!, planned, session.settings);
      requireX0(c.id === planned.id && c.seed === planned.seed && c.maxTokens === planned.maxTokens && c.request && fingerprintEstimatorValue(c.request) === fingerprintEstimatorValue(expected), "sensor_not_bound_to_checkpoint");
    }
    let A: { status: "valid"; probabilitiesByOptionId: Record<string, number> } | { status: "unavailable"; reason: string } = { status: "unavailable", reason: !c || c.status === "not_started" ? "not_collected" : c.status === "unknown" || c.status === "started" ? "provider_failure" : "invalid" };
    if (c?.status === "returned") try { A = { status: "valid", probabilitiesByOptionId: parseCollectiveDynamicsSensorReportV1_1(c.result!.rawContent, optionIds).probabilities }; } catch { /* preserve unavailable */ }
    return { agentId, A, B: { status: "unavailable" as const, reason: "not_collected" } };
  });
  const choices = cp.views[0].choices.filter((c): c is { agentId: Agent; choiceId: string } => c.choiceId !== null);
  const claimId = cp.views[0].claimId;
  const thermometer = projectDiscussionThermometerStateV1({ claimId, checkpointId: `${session.id}-${index}`, checkpointIndex: index,
    optionIds, expectedAgentIds: AGENTS, reportPairs, publicChoiceByAgentId: Object.fromEntries(choices.map(c => [c.agentId, c.choiceId])),
    sensorRef: COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1, snapshotHash: fingerprintEstimatorValue(cp.views) });
  const sum = (key: "promptTokens" | "completionTokens" | "totalTokens" | "latencyMs") => cp.cells.every(c => c.status === "returned" && Number.isFinite(c.result?.usage?.[key]) && c.result!.usage![key]! >= 0) ? cp.cells.reduce((n, c) => n + c.result!.usage![key]!, 0) : null;
  const use = { promptTokens: sum("promptTokens"), completionTokens: sum("completionTokens"), totalTokens: sum("totalTokens"), totalLatencyMs: sum("latencyMs") };
  const missingCost = Object.values(use).some(v => v === null);
  const input: CollectiveDecisionProcessStateInputV0 = {
    claimId, checkpointIndex: index, asOfSequence: cp.asOfSequence + choices.length,
    expectedAgentIds: [...AGENTS], optionIds,
    registeredEvidencePool: { denominatorStatus: "registered_complete", lineageObservationStatus: "complete", duplicateObservationStatus: "complete",
      units: session.task.packets.map(p => ({ evidenceUnitId: p.id, claimId, sourceRef: { id: "hiddenbench:3be6ca16", kind: "dataset" }, lineage: { id: "hiddenbench:3be6ca16:ingestion", basis: "ingestion" },
        duplicateMembership: session.task.packets.filter(q => q.text === p.text).length > 1 ? { groupId: `duplicate:${session.task.packets.find(q => q.text === p.text)!.id}`, basis: "deterministic" } : null })) },
    exposureLog: { observationStatus: "complete", unavailableReason: null, records: structuredClone(cp.exposures) },
    discussionActLog: session.condition === "P0" ? { observationStatus: "missing", unavailableReason: "not_collected", acts: [] }
      : cp.annotationReason ? { observationStatus: "missing", unavailableReason: cp.annotationReason, acts: [] } : { observationStatus: "complete", unavailableReason: null, acts: structuredClone(cp.acts) },
    beliefChoice: { thermometerStateRef: { schemaRef: thermometer.schemaRef, claimId: thermometer.claimId, checkpointIndex: index, optionIds, contentHash: thermometer.contentHash },
      publicChoiceObservationStatus: index < 2 || choices.length === 3 ? "complete" : "partial", publicChoiceUnavailableReason: index < 2 || choices.length === 3 ? null : "partial_record",
      publicChoices: choices.map((c, i) => ({ ...c, checkpointIndex: index, eventSequence: cp.asOfSequence + i + 1 })) },
    agentContexts: AGENTS.map((agentId, ai) => ({ agentId, modelRef: session.settings.modelRef, declaredCapabilityClass: null, roleRef: { id: "equal-participant", version: "1" }, authorityRef: { id: "equal-vote", version: "1" }, speakerOrder: null,
      informationAccessRef: { id: `private-packet-${session.block.permutation[ai]}`, version: "1" } })),
    resources: { observedUse: { observationStatus: missingCost ? "partial" : "complete", unavailableReason: missingCost ? "partial_record" : null, ...use,
      invalidOrFailed: cp.cells.filter(c => c.status !== "returned" || (c.phase < 3 ? !session.discussions.find(d => d.cellId === c.id)?.parsed.protocolValid : !choices.some(v => v.agentId === c.agentId))).length },
      budgetBefore: { observationStatus: "partial", unavailableReason: "partial_record", computeUnits: 9 - cp.cells.length, latencyUnits: null },
      candidateActionSurface: { observationStatus: "complete", unavailableReason: null, candidates: [] } },
  };
  return frozen({ input, descriptor: projectCollectiveDecisionProcessStateV0(input), thermometer, primaryComplete: thermometer.roster.missingAgentIds.length === 0 });
}

export function x0CanaryGate(run: X0PublicRun, sensors: readonly X0Cell[]) {
  requireX0(run.phase === "canary", "gate_requires_canary");
  const expected = planX0Cells("canary");
  const actual = [...run.cells.filter(c => c.phase >= 1 && c.phase <= 3), ...sensors];
  const accounted = actual.length === 66 && new Set(actual.map(c => c.id)).size === 66 && expected.every(c => actual.some(a => a.id === c.id && (a.status === "returned" || a.status === "unknown")));
  const observations = run.closed ? run.sessions.flatMap(s => [0, 1, 2].map(i => observeX0Checkpoint(s, i, sensors))) : [];
  const publicValid = run.sessions.length === 4 && run.sessions.every(s => s.discussions.length === 6 && s.discussions.every(d => d.parsed.protocolValid)
    && s.checkpoints.find(c => c.index === 2)?.views[0].choices.every(c => c.choiceId !== null));
  return frozen({ passed: run.closed && accounted && publicValid && observations.length === 12 && observations.every(o => o.primaryComplete), accounted, publicValid,
    semanticValidity: "unknown", nonreactivity: "not_qualified" });
}

export type X0AuditCode = "substantive" | "absent" | "unresolved";
export interface X0Rating { messageId: string; packetId: string; code: X0AuditCode; excerpt: string }
/** Export only reviewItems to raters. Linkage is retained by the offline analyst. */
export function buildX0ReviewPacket(run: X0PublicRun) {
  requireX0(run.closed, "audit_before_public_close");
  const rows = run.sessions.flatMap(s => s.discussions.flatMap(d => s.task.packets.filter(p => p.privateIndex !== null).map(p => {
    const id = fingerprintEstimatorValue({ seed: 20260908, session: s.id, message: d.message.id, packet: p.id });
    const before = s.checkpoints.find(c => c.index === d.message.round - 1)!.views.find(v => v.agentId === d.message.agentId)!;
    return { item: { id, context: s.task.context, options: s.task.options, sourcePacket: { id: p.id, text: p.text }, authoredMessage: d.message.message,
      priorVisibleMessages: before.messages.map(m => ({ id: m.id, agentId: m.agentId, round: m.round, message: m.message })) },
      key: { id, sessionId: s.id, messageId: d.message.id, packetId: p.id } };
  })));
  rows.sort((a, b) => a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0);
  requireX0(new Set(rows.map(r => r.item.id)).size === rows.length, "audit_id_collision");
  return frozen({ reviewItems: rows.map(r => r.item), analystLinkage: rows.map(r => r.key) });
}
/** Ratings are independent external inputs. This function never judges prose or reads outcomes. */
export function summarizeX0Audit(session: X0Session, first: readonly X0Rating[], second: readonly X0Rating[]) {
  requireX0(session.discussions.length === 6, "audit_incomplete_public_phase");
  const packets = session.task.packets.filter(p => p.privateIndex !== null);
  const expected = session.discussions.flatMap(d => packets.map(p => `${d.message.id}/${p.id}`));
  for (const ratings of [first, second]) {
    requireX0(ratings.length === 18 && new Set(ratings.map(r => `${r.messageId}/${r.packetId}`)).size === 18, "audit_roster");
    for (const r of ratings) requireX0(expected.includes(`${r.messageId}/${r.packetId}`) && ["substantive", "absent", "unresolved"].includes(r.code)
      && (r.code !== "substantive" || text(r.excerpt) && session.discussions.find(d => d.message.id === r.messageId)!.message.message.includes(r.excerpt)), "audit_code_or_excerpt");
  }
  const rows = first.map(a => { const b = second.find(b => b.messageId === a.messageId && b.packetId === a.packetId)!;
    return { messageId: a.messageId, packetId: a.packetId, code: a.code === b.code ? a.code : "unresolved" };
  });
  const bounds = (who: "any" | "holder" | "other") => {
    const eligible = rows.filter(r => { const ai = AGENTS.indexOf(session.discussions.find(d => d.message.id === r.messageId)!.message.agentId);
      const held = session.block.permutation[ai] === packets.find(p => p.id === r.packetId)!.privateIndex;
      return who === "any" || (who === "holder" ? held : !held); });
    const lower = packets.filter(p => eligible.some(r => r.packetId === p.id && r.code === "substantive")).length / 3;
    const upper = packets.filter(p => eligible.some(r => r.packetId === p.id && r.code !== "absent")).length / 3;
    return { lower, upper };
  };
  const annotated = session.condition === "P1" && session.discussions.every(d => d.parsed.annotation !== null);
  const tags = annotated ? rows.filter(r => session.discussions.find(d => d.message.id === r.messageId)!.parsed.annotation!.evidenceUnitIds.includes(r.packetId)) : null;
  return frozen({ U: bounds("any"), holderUse: bounds("holder"), otherUse: bounds("other"),
    tags: tags === null ? null : { supported: tags.filter(r => r.code === "substantive").length, unsupported: tags.filter(r => r.code === "absent").length, unresolved: tags.filter(r => r.code === "unresolved").length, denominator: tags.length },
    confirmedUntagged: tags === null ? null : rows.filter(r => r.code === "substantive" && !tags.some(t => t.messageId === r.messageId && t.packetId === r.packetId)).length });
}

/** Excludes the response-dependent engineering canary from the per-task effect test. */
export function analyzeX0Task(pairs: readonly { block: number; p0: { lower: number; upper: number }; p1: { lower: number; upper: number } }[], randomizationAssumptions: boolean) {
  requireX0(pairs.length === 11 && new Set(pairs.map(p => p.block)).size === 11 && ([1, 13].some(start => pairs.every(p => p.block >= start && p.block < start + 11 && Number.isInteger(p.block)))), "eleven_noncanary_blocks_one_task_required");
  requireX0(pairs.every(p => [p.p0, p.p1].every(u => Number.isFinite(u.lower) && Number.isFinite(u.upper) && 0 <= u.lower && u.lower <= u.upper && u.upper <= 1)), "audit_bounds");
  const lower = pairs.reduce((s, p) => s + p.p1.lower - p.p0.upper, 0) / 11;
  const upper = pairs.reduce((s, p) => s + p.p1.upper - p.p0.lower, 0) / 11;
  const resolved = pairs.every(p => p.p0.lower === p.p0.upper && p.p1.lower === p.p1.upper);
  let pValue: number | null = null;
  if (resolved && randomizationAssumptions) {
    const d = pairs.map(p => p.p1.lower - p.p0.lower);
    const observed = Math.abs(d.reduce((a, b) => a + b, 0));
    let extreme = 0;
    for (let mask = 0; mask < 2048; mask++) if (Math.abs(d.reduce((s, v, i) => s + ((mask & (1 << i)) ? v : -v), 0)) >= observed - 1e-12) extreme++;
    pValue = extreme / 2048;
  }
  const width = Math.sqrt(2 * Math.log(20) / 11);
  return frozen({ blocks: 11, excludedCanary: true, effectBounds: [lower, upper], pointEstimate: resolved ? lower : null, sharpNullP: pValue,
    rejectsSharpNull: pValue === null ? null : pValue <= 0.025,
    conservative90: randomizationAssumptions ? [Math.max(-1, lower - width), Math.min(1, upper + width)] : null,
    equivalence: "not_qualified" });
}

/** Gold enters only this offline endpoint, never a request builder or public runner. */
export function evaluateX0Outcome(session: X0Session, key: string) {
  requireX0(session.task.options.some(o => o.optionId === key), "outcome_key");
  const final = session.checkpoints.find(c => c.index === 2);
  requireX0(final && final.views[0].choices.length === 3, "outcome_before_close");
  const choices = final.views[0].choices;
  const groupChoice = session.task.options.find(o => choices.filter(c => c.choiceId === o.optionId).length >= 2)?.optionId ?? null;
  const invalid = choices.filter(c => c.choiceId === null).length;
  return frozen({ choices, groupChoice, abstain: groupChoice === null, invalid, keyedSuccess: invalid === 0 && groupChoice === key });
}
