/** GLM-4.6V adapter wiring for one isolated mechanism V1 task. */
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import { createV6HiddenBenchSmokeFixtureV1 } from "./v6HiddenBenchSmokeFixture";
import { createV6DiscussionAdapter, createV6FinalElicitationAdapter, type SingleAttemptTextInvoker } from "./providerAdapters";
import { parseBeliefResponse, createEvidenceAndReferences, type V6DiscussionRequestV1, type V6PublicTranscriptEntry } from "./productionVerticalSlice";
import { selectAllEvidenceV1, type RegisteredEvidenceV1, type RoundOneReportV1 } from "./crossEvidenceExchangeSelectorsV1";
import { runMechanismTaskV1, type MechanismArmScientificResultV1 } from "./mechanismTaskRunnerV1";
import type { MechanismArmV1 } from "./mechanismDisclosureContractV1";
import { FINAL_ELICITATION_ADAPTER_REQUEST_V1 } from "../../../src/lib/experimentation/finalElicitationAdapter";
import {
  FINAL_ELICITATION_RESPONSE_SCHEMA_V1,
  buildFinalElicitationPrompt,
  createFinalElicitationContract,
  parseFinalElicitationResponse,
  type FinalElicitationViewV1,
} from "../../../src/lib/experimentation/finalOutcome";
import { defaultBeliefContractRegistry } from "../../../src/lib/epistemic";

const REQUEST_REF = { id: "swarmalpha.v6.discussion-request", version: "1.0.0" } as const;
const MODEL_REF = { id: "zhipu:glm-4.6v", version: "1.0.0" };
const PROTOCOL = "epistemic_governance_v1" as const;
const providerSeedFor = (taskId: number, seed: number) => (taskId * 7919 + seed * 104729) >>> 0;

interface SnapshotReportV1 {
  agentId: string; probabilities: Record<string, number>; message: string;
  evidenceRefs: Array<{ evidenceId: string; relation: "supports" | "attacks" }>;
}
interface SnapshotEvidenceV1 {
  evidenceId: string; agentId: string; content: string; contentHash: string; relation: "supports" | "attacks";
}
export interface MechanismGlmRound1SnapshotV1 {
  taskId: number; seed: number; taskRef: string; publicContext: string;
  claim: unknown; agents: Array<{ agentId: string; privateInformation: string }>;
  transcript: V6PublicTranscriptEntry[]; reports: SnapshotReportV1[]; evidence: SnapshotEvidenceV1[];
}
export interface MechanismParsedRecordV1 {
  phase: "round1" | "round2" | "final"; arm?: MechanismArmV1; agentId: string; parsed: unknown;
}

export async function runMechanismGlmTaskV1(input: {
  taskId: number; seed: number; armOrder: readonly MechanismArmV1[];
  invoker: SingleAttemptTextInvoker; clock?: () => string;
}): Promise<{ task: Awaited<ReturnType<typeof runMechanismTaskV1<MechanismGlmRound1SnapshotV1>>>; round1Snapshot: MechanismGlmRound1SnapshotV1; parsedRecords: MechanismParsedRecordV1[] }> {
  const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId: input.taskId });
  const task = projection.adapter.task;
  const fixture = createV6HiddenBenchSmokeFixtureV1({ sourceTaskId: input.taskId, profile: "mechanism-verdict-v2-v1" });
  for (const binding of fixture.discussionContract.agentBindings) binding.modelRef = { ...MODEL_REF };
  for (const binding of fixture.finalContract.agentBindings) binding.modelRef = { ...MODEL_REF };
  const discussion = createV6DiscussionAdapter({ contract: fixture.discussionContract, invoker: input.invoker });
  const finalAdapter = createV6FinalElicitationAdapter({ contract: fixture.finalContract, invoker: input.invoker });
  const signal = new AbortController().signal;
  const runId = `mechanism:task-${input.taskId}:seed-${input.seed}`;
  const providerSeed = providerSeedFor(input.taskId, input.seed);
  const now = input.clock ?? (() => new Date().toISOString());
  const parsedRecords: MechanismParsedRecordV1[] = [];
  let retainedSnapshot: MechanismGlmRound1SnapshotV1 | undefined;

  const taskRun = await runMechanismTaskV1<MechanismGlmRound1SnapshotV1>({
    taskId: input.taskId, seed: input.seed, armOrder: input.armOrder, invoker: input.invoker,
    async captureRound1() {
      const transcript: V6PublicTranscriptEntry[] = [];
      const reports: SnapshotReportV1[] = [];
      const evidence: SnapshotEvidenceV1[] = [];
      for (let i = 0; i < task.agents.length; i++) {
        const agent = task.agents[i];
        const request: V6DiscussionRequestV1 = {
          requestSchemaRef: { ...REQUEST_REF }, requestId: `discussion:${runId}:r1:${agent.agentId}`,
          runId, taskId: task.id, agentId: agent.agentId, round: 1, protocol: PROTOCOL,
          publicContext: task.publicContext, ownPrivateInformation: agent.privateInformation,
          claim: structuredClone(task.claim), visibleTranscript: [], responseContract: "belief_json_v1",
          modelRef: { ...MODEL_REF }, invocationConfig: { ...fixture.discussionContract.agentBindings[i].invocationConfig, seed: providerSeed, maxTokens: 768, thinking: "disabled" },
        };
        const response = await discussion.respond(request, signal);
        if (response.status !== "response") throw new Error("mechanism_round1_unavailable");
        const parsed = parseBeliefResponse(response.rawResponse, task.claim);
        if (!parsed.ok) throw new Error(`mechanism_round1_parse:${parsed.code}`);
        parsedRecords.push({ phase: "round1", agentId: agent.agentId, parsed: structuredClone(parsed.parsed) });
        const bundle = createEvidenceAndReferences({ runId, round: 1, agentId: agent.agentId, parsed: parsed.parsed, createdAt: now() });
        const probabilities = parsed.parsed.value.kind === "categorical" ? parsed.parsed.value.probabilities : {};
        const refs = bundle.references.map(ref => ({ evidenceId: ref.evidenceId, relation: ref.relation }));
        reports.push({ agentId: agent.agentId, probabilities, message: parsed.parsed.message, evidenceRefs: refs });
        bundle.evidence.forEach((item, index) => evidence.push({ evidenceId: item.id, agentId: agent.agentId, content: item.content, contentHash: item.provenance.contentHash, relation: refs[index].relation }));
        transcript.push({ round: 1, agentId: agent.agentId, content: parsed.parsed.message, source: "agent" });
      }
      const registry = new Map<string, RegisteredEvidenceV1>(evidence.map(e => [e.evidenceId, { evidenceId: e.evidenceId, content: e.content, contentHash: e.contentHash }]));
      const selectorReports: RoundOneReportV1[] = reports.map(r => ({ agentId: r.agentId, probabilities: r.probabilities, evidenceRefs: r.evidenceRefs }));
      const selected = selectAllEvidenceV1({ reports: selectorReports, evidenceRegistry: registry, relations: ["attacks"] })
        .map(({ relation: _relation, ...item }) => item);
      retainedSnapshot = { taskId: input.taskId, seed: input.seed, taskRef: task.id, publicContext: task.publicContext, claim: structuredClone(task.claim), agents: structuredClone(task.agents), transcript, reports, evidence };
      return { snapshot: retainedSnapshot, selectedAttackItems: selected, expectedAgentCount: task.agents.length };
    },
    async executeArm(armInput): Promise<MechanismArmScientificResultV1> {
      const snapshot = armInput.round1Snapshot;
      const visible = structuredClone(snapshot.transcript);
      if (armInput.disclosure.message) visible.push({ round: 2, agentId: "governance", content: armInput.disclosure.message, source: "governance" });
      const round2Messages: V6PublicTranscriptEntry[] = [];
      for (let i = 0; i < snapshot.agents.length; i++) {
        const agent = snapshot.agents[i];
        const request: V6DiscussionRequestV1 = {
          requestSchemaRef: { ...REQUEST_REF }, requestId: `discussion:${runId}:${armInput.arm}:r2:${agent.agentId}`,
          runId, taskId: task.id, agentId: agent.agentId, round: 2, protocol: PROTOCOL,
          publicContext: snapshot.publicContext, ownPrivateInformation: agent.privateInformation,
          claim: structuredClone(task.claim), visibleTranscript: structuredClone(visible), responseContract: "belief_json_v1",
          modelRef: { ...MODEL_REF }, invocationConfig: { ...fixture.discussionContract.agentBindings[i].invocationConfig, seed: providerSeed, maxTokens: 768, thinking: "disabled" },
        };
        const response = await discussion.respond(request, signal);
        if (response.status !== "response") throw new Error("mechanism_round2_unavailable");
        const parsed = parseBeliefResponse(response.rawResponse, task.claim);
        if (!parsed.ok) throw new Error(`mechanism_round2_parse:${parsed.code}`);
        parsedRecords.push({ phase: "round2", arm: armInput.arm, agentId: agent.agentId, parsed: structuredClone(parsed.parsed) });
        round2Messages.push({ round: 2, agentId: agent.agentId, content: parsed.parsed.message, source: "agent" });
      }
      const finalContract = createFinalElicitationContract({ id: "swarmalpha.final-elicitation.mechanism-v1", version: "1.0.0", claimIds: [task.claim.id] });
      const finalBeliefs: Record<string, number>[] = [];
      for (let i = 0; i < snapshot.agents.length; i++) {
        const agent = snapshot.agents[i];
        const view: FinalElicitationViewV1 = { publicContext: snapshot.publicContext, ownPrivateInformation: agent.privateInformation, discussionTranscript: [...visible, ...round2Messages].map(x => ({ round: x.round, agentId: x.agentId, content: x.content })) };
        const prompt = buildFinalElicitationPrompt({ view, contract: finalContract, claims: [task.claim] });
        const response = await finalAdapter.elicit({ requestSchemaRef: FINAL_ELICITATION_ADAPTER_REQUEST_V1, runId: `${runId}:${armInput.arm}`, agentId: agent.agentId, sequence: i + 1, prompt, responseSchemaRef: FINAL_ELICITATION_RESPONSE_SCHEMA_V1, modelRef: { ...MODEL_REF }, invocationConfig: { seed: providerSeed, maxTokens: 256, thinking: "disabled" } }, signal);
        if (response.status !== "response") throw new Error("mechanism_final_unavailable");
        const parsed = parseFinalElicitationResponse({ rawResponse: response.rawResponse, contract: finalContract, claims: [task.claim], contractRegistry: defaultBeliefContractRegistry });
        if (parsed.status !== "answered" || parsed.reports[0]?.value.kind !== "categorical") throw new Error(`mechanism_final_parse:${parsed.diagnosticCode}`);
        parsedRecords.push({ phase: "final", arm: armInput.arm, agentId: agent.agentId, parsed: structuredClone(parsed) });
        finalBeliefs.push(parsed.reports[0].value.probabilities);
      }
      const pooled: Record<string, number> = {};
      for (const option of task.claim.options) pooled[option] = finalBeliefs.reduce((sum, belief) => sum + (belief[option] ?? 0), 0) / finalBeliefs.length;
      return { finalBelief: pooled, finalReportedCount: finalBeliefs.length, round2ReportedCount: round2Messages.length };
    },
  });
  if (!retainedSnapshot) throw new Error("mechanism_round1_snapshot_missing");
  return { task: taskRun, round1Snapshot: retainedSnapshot, parsedRecords };
}

