/**
 * Isolated R1-R3 formation -> R3 same-state fork -> R4/R5 measurement runner.
 * Formation provider execution is blocked unless both --execute and
 * RUN_AUTHORIZED=yes are supplied. The V1 response phase is retired because
 * its global supports/attacks carrier has no option target. Existing response
 * artifacts remain replayable; --plan performs zero provider calls.
 */
import dotenv from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { BeliefReport, EpistemicEvidence } from "../../../src/lib/epistemic/types";
import { createV6DiscussionAdapter, type SingleAttemptTextInvoker } from "./providerAdapters";
import {
  createEvidenceAndReferences,
  parseBeliefResponse,
  type V6DiscussionRequestV1,
  type V6PublicTranscriptEntry,
} from "./productionVerticalSlice";
import { createV6HiddenBenchSmokeFixtureV1 } from "./v6HiddenBenchSmokeFixture";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import {
  buildCollectiveDynamicsDisclosuresV1,
  buildCollectiveDynamicsManifestV1,
  buildCollectiveDynamicsPlanV1,
  buildFormationArtifactV1,
  buildResponseArtifactV1,
  deterministicCollectiveDynamicsArmOrderV1,
  hashCollectiveDynamicsValueV1,
  projectCollectiveDynamicsRoundV1,
  verifyFormationArtifactV1,
  verifyResponseArtifactV1,
  type CollectiveDynamicsArmArtifactV1,
  type CollectiveDynamicsArmV1,
  type CollectiveDynamicsFormationArtifactV1,
  type CollectiveDynamicsOnlineTaskV1,
  type CollectiveDynamicsPlanV1,
  type CollectiveDynamicsProviderCallV1,
  type CollectiveDynamicsResponseArtifactV1,
  type CollectiveDynamicsRoundV1,
} from "./collectiveDynamicsV1";

const REQUEST_SCHEMA_REF = Object.freeze({
  id: "swarmalpha.v6.discussion-request" as const,
  version: "1.0.0" as const,
});
const PROTOCOL = "explicit_belief_v1" as const;

export const COLLECTIVE_DYNAMICS_V1_EXECUTION_STATUS = Object.freeze({
  formationCli: "development_only" as const,
  responseCli: "retired" as const,
  reason: "global_polarity_has_no_option_target" as const,
  existingArtifactPolicy: "replay_and_offline_analysis_only" as const,
});

/** Fail closed before credential loading or provider construction. */
export function assertCollectiveDynamicsV1CliPhaseAllowedV1(argv: readonly string[]): void {
  if (argv.includes("--response")) {
    throw new Error(
      "collective_dynamics_v1_response_retired:global_polarity_has_no_option_target;"
      + " replay existing artifacts with dynamics:analyze instead",
    );
  }
}

function deterministicTimestamp(round: number, sequence: number): string {
  return new Date(Date.UTC(2026, 7, 24, 0, round, sequence)).toISOString();
}

function captureInvoker(base: SingleAttemptTextInvoker): {
  invoker: SingleAttemptTextInvoker;
  calls: CollectiveDynamicsProviderCallV1[];
} {
  const calls: CollectiveDynamicsProviderCallV1[] = [];
  return {
    calls,
    invoker: {
      async invoke(request, signal) {
        const result = await base.invoke(request, signal);
        calls.push({
          requestId: request.requestId,
          systemPrompt: request.systemPrompt,
          userPrompt: request.userPrompt,
          modelRef: structuredClone(request.modelRef),
          invocationConfig: structuredClone(request.invocationConfig),
          requestHash: hashCollectiveDynamicsValueV1(request),
          responseHash: hashCollectiveDynamicsValueV1(result.rawContent),
          rawResponse: result.rawContent,
          ...(result.usage ? { usage: {
            ...(result.usage.promptTokens !== undefined ? { promptTokens: result.usage.promptTokens } : {}),
            ...(result.usage.completionTokens !== undefined ? { completionTokens: result.usage.completionTokens } : {}),
            ...(result.usage.totalTokens !== undefined ? { totalTokens: result.usage.totalTokens } : {}),
            ...(result.usage.latencyMs !== undefined ? { latencyMs: result.usage.latencyMs } : {}),
          } } : {}),
        });
        return result;
      },
    },
  };
}

function onlineTask(sourceTaskId: number): {
  task: CollectiveDynamicsOnlineTaskV1;
  discussionContract: ReturnType<typeof createV6HiddenBenchSmokeFixtureV1>["discussionContract"];
} {
  const fixture = createV6HiddenBenchSmokeFixtureV1({
    sourceTaskId,
    profile: "expanded-json-v2",
  });
  const source = fixture.task;
  return {
    discussionContract: structuredClone(fixture.discussionContract),
    task: {
      sourceTaskId,
      taskId: source.id,
      publicContext: source.publicContext,
      claim: structuredClone(source.claim),
      agents: structuredClone(source.agents),
    },
  };
}

function adapterFor(input: {
  discussionContract: ReturnType<typeof createV6HiddenBenchSmokeFixtureV1>["discussionContract"];
  agents: CollectiveDynamicsOnlineTaskV1["agents"];
  plan: CollectiveDynamicsPlanV1;
  seed: number;
  invoker: SingleAttemptTextInvoker;
}) {
  return createV6DiscussionAdapter({
    contract: {
      ...structuredClone(input.discussionContract),
      agentBindings: input.agents.map(agent => ({
        agentId: agent.agentId,
        modelRef: structuredClone(input.plan.modelRef),
        invocationConfig: {
          temperature: 0,
          seed: input.seed,
          maxTokens: input.plan.maxTokens,
          thinking: "disabled",
        },
      })),
    },
    invoker: input.invoker,
  });
}

interface CollectedStepV1 {
  messages: V6PublicTranscriptEntry[];
  reports: BeliefReport[];
  evidence: EpistemicEvidence[];
}

async function collectStep(input: {
  runId: string;
  arm?: CollectiveDynamicsArmV1;
  round: number;
  plan: CollectiveDynamicsPlanV1;
  seed: number;
  task: CollectiveDynamicsOnlineTaskV1;
  visibleTranscript: readonly V6PublicTranscriptEntry[];
  previousReports?: readonly BeliefReport[];
  adapter: ReturnType<typeof createV6DiscussionAdapter>;
  signal: AbortSignal;
}): Promise<CollectedStepV1> {
  const messages: V6PublicTranscriptEntry[] = [];
  const reports: BeliefReport[] = [];
  const evidence: EpistemicEvidence[] = [];
  for (let index = 0; index < input.task.agents.length; index += 1) {
    const agent = input.task.agents[index];
    const armPart = input.arm ? `:${input.arm}` : "";
    const request: V6DiscussionRequestV1 = {
      requestSchemaRef: { ...REQUEST_SCHEMA_REF },
      requestId: `discussion:${input.runId}${armPart}:r${input.round}:${agent.agentId}`,
      runId: input.runId,
      taskId: input.task.taskId,
      agentId: agent.agentId,
      round: input.round,
      protocol: PROTOCOL,
      publicContext: input.task.publicContext,
      ownPrivateInformation: agent.privateInformation,
      claim: structuredClone(input.task.claim),
      visibleTranscript: structuredClone([...input.visibleTranscript]),
      responseContract: "belief_json_v1",
      modelRef: structuredClone(input.plan.modelRef),
      invocationConfig: {
        temperature: 0,
        seed: input.seed,
        maxTokens: input.plan.maxTokens,
        thinking: "disabled",
      },
    };
    const response = await input.adapter.respond(request, input.signal);
    if (response.status !== "response") throw new Error(`collective_dynamics_provider_unavailable:r${input.round}`);
    const parsed = parseBeliefResponse(response.rawResponse, input.task.claim);
    if (!parsed.ok) throw new Error(`collective_dynamics_parse_failure:r${input.round}:${parsed.code}`);
    const createdAt = deterministicTimestamp(input.round, index + 1);
    const bundle = createEvidenceAndReferences({
      runId: `${input.runId}${armPart}`,
      round: input.round,
      agentId: agent.agentId,
      parsed: parsed.parsed,
      createdAt,
    });
    const previous = input.previousReports?.find(report => report.agentId === agent.agentId);
    reports.push({
      id: `belief:${input.runId}${armPart}:r${input.round}:${agent.agentId}`,
      claimId: input.task.claim.id,
      agentId: agent.agentId,
      round: input.round,
      value: structuredClone(parsed.parsed.value),
      evidence: bundle.references,
      stake: 0,
      createdAt,
      ...(previous ? { supersedesReportId: previous.id } : {}),
      // Peer messages are visible, but peer probability reports are not. We
      // therefore do not fabricate observedReportIds/BeliefExposure edges.
    });
    evidence.push(...bundle.evidence);
    messages.push({ round: input.round, agentId: agent.agentId, content: parsed.parsed.message, source: "agent" });
  }
  return { messages, reports, evidence };
}

function roundArtifact(input: {
  task: CollectiveDynamicsOnlineTaskV1;
  step: CollectedStepV1;
  round: number;
  priorReports?: readonly BeliefReport[];
  cumulativeReports: readonly BeliefReport[];
  cumulativeEvidence: readonly EpistemicEvidence[];
}): CollectiveDynamicsRoundV1 {
  return projectCollectiveDynamicsRoundV1({
    claim: input.task.claim,
    expectedAgentIds: input.task.agents.map(agent => agent.agentId),
    allReportsThroughRound: input.cumulativeReports,
    allEvidenceThroughRound: input.cumulativeEvidence,
    roundReports: input.step.reports,
    messages: input.step.messages,
    round: input.round,
    ...(input.priorReports ? { previousRoundReports: input.priorReports } : {}),
  });
}

export async function executeCollectiveDynamicsFormationV1(input: {
  plan: CollectiveDynamicsPlanV1;
  sourceTaskId: number;
  seed: number;
  baseInvoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
}): Promise<CollectiveDynamicsFormationArtifactV1> {
  if (!input.plan.taskIds.includes(input.sourceTaskId) || !input.plan.seeds.includes(input.seed)) {
    throw new Error("collective_dynamics_execution_outside_plan");
  }
  const { task, discussionContract } = onlineTask(input.sourceTaskId);
  const runId = `collective-dynamics:${input.sourceTaskId}:seed-${input.seed}`;
  const captured = captureInvoker(input.baseInvoker);
  const adapter = adapterFor({
    discussionContract, agents: task.agents, plan: input.plan, seed: input.seed, invoker: captured.invoker,
  });
  const signal = input.signal ?? new AbortController().signal;
  const rounds: CollectiveDynamicsRoundV1[] = [];
  const allReports: BeliefReport[] = [];
  const allEvidence: EpistemicEvidence[] = [];
  let visible: V6PublicTranscriptEntry[] = [];
  let previous: BeliefReport[] | undefined;
  for (const round of [1, 2, 3]) {
    const step = await collectStep({
      runId, round, plan: input.plan, seed: input.seed, task, visibleTranscript: visible,
      ...(previous ? { previousReports: previous } : {}), adapter, signal,
    });
    allReports.push(...step.reports);
    allEvidence.push(...step.evidence);
    rounds.push(roundArtifact({
      task, step, round,
      ...(previous ? { priorReports: previous } : {}),
      cumulativeReports: allReports,
      cumulativeEvidence: allEvidence,
    }));
    // Synchronous protocol: the next round sees exactly this round's messages,
    // never messages produced earlier or within its own collection loop.
    visible = structuredClone(step.messages);
    previous = step.reports;
  }
  return buildFormationArtifactV1({
    planHash: input.plan.contentHash,
    runId,
    seed: input.seed,
    modelRef: structuredClone(input.plan.modelRef),
    onlineTask: task,
    rounds: rounds as CollectiveDynamicsFormationArtifactV1["rounds"],
    providerCalls: captured.calls,
  });
}

/**
 * @deprecated V1 response execution is retained for injected-provider tests
 * and historical reproduction only. It is not an admissible new experiment.
 */
export async function executeCollectiveDynamicsResponseV1(input: {
  plan: CollectiveDynamicsPlanV1;
  formation: CollectiveDynamicsFormationArtifactV1;
  baseInvoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
}): Promise<CollectiveDynamicsResponseArtifactV1> {
  verifyFormationArtifactV1(input.formation);
  if (input.formation.planHash !== input.plan.contentHash) throw new Error("collective_dynamics_plan_binding_mismatch");
  const fixture = createV6HiddenBenchSmokeFixtureV1({
    sourceTaskId: input.formation.onlineTask.sourceTaskId,
    profile: "expanded-json-v2",
  });
  const captured = captureInvoker(input.baseInvoker);
  const adapter = adapterFor({
    discussionContract: structuredClone(fixture.discussionContract),
    agents: input.formation.onlineTask.agents,
    plan: input.plan,
    seed: input.formation.seed,
    invoker: captured.invoker,
  });
  const signal = input.signal ?? new AbortController().signal;
  const task = input.formation.onlineTask;
  const r3 = input.formation.rounds[2];
  const disclosures = buildCollectiveDynamicsDisclosuresV1({ round3: r3, taskId: task.taskId, seed: input.formation.seed });
  const armOrder = deterministicCollectiveDynamicsArmOrderV1(task.taskId, input.formation.seed);
  const formationReports = input.formation.rounds.flatMap(round => round.reports);
  const formationEvidence = input.formation.rounds.flatMap(round => round.evidence);
  const arms: CollectiveDynamicsArmArtifactV1[] = [];
  for (const arm of armOrder) {
    const disclosure = disclosures[arm];
    const governance: V6PublicTranscriptEntry[] = disclosure.message
      ? [{ round: 4, agentId: "governance", content: disclosure.message, source: "governance" }]
      : [];
    const r4Step = await collectStep({
      runId: input.formation.runId,
      arm,
      round: 4,
      plan: input.plan,
      seed: input.formation.seed,
      task,
      visibleTranscript: [...r3.messages, ...governance],
      previousReports: r3.reports,
      adapter,
      signal,
    });
    const throughR4Reports = [...formationReports, ...r4Step.reports];
    const throughR4Evidence = [...formationEvidence, ...r4Step.evidence];
    const round4 = roundArtifact({
      task, step: r4Step, round: 4, priorReports: r3.reports,
      cumulativeReports: throughR4Reports, cumulativeEvidence: throughR4Evidence,
    });
    const r5Step = await collectStep({
      runId: input.formation.runId,
      arm,
      round: 5,
      plan: input.plan,
      seed: input.formation.seed,
      task,
      // Private measurement: each call receives R4 public messages and the
      // same disclosure, but R5 outputs are never returned to the discussion.
      visibleTranscript: [...governance, ...r4Step.messages],
      previousReports: r4Step.reports,
      adapter,
      signal,
    });
    const finalRound5 = roundArtifact({
      task, step: r5Step, round: 5, priorReports: r4Step.reports,
      cumulativeReports: [...throughR4Reports, ...r5Step.reports],
      cumulativeEvidence: [...throughR4Evidence, ...r5Step.evidence],
    });
    arms.push({
      arm,
      sharedR3SnapshotHash: input.formation.r3SnapshotHash,
      disclosure,
      round4,
      finalRound5,
    });
  }
  return buildResponseArtifactV1({
    planHash: input.plan.contentHash,
    formationHash: input.formation.contentHash,
    taskId: task.taskId,
    seed: input.formation.seed,
    armOrder,
    arms,
    providerCalls: captured.calls,
  });
}

function writeJsonNoOverwrite(file: string, value: unknown): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) throw new Error(`collective_dynamics_no_overwrite_conflict:${basename(file)}`);
    return;
  }
  writeFileSync(file, text, "utf8");
}

export function writeCollectiveDynamicsPlanV1(outputDir: string, plan: CollectiveDynamicsPlanV1): void {
  mkdirSync(outputDir, { recursive: true });
  writeJsonNoOverwrite(join(outputDir, "plan.json"), plan);
}

export function writeCollectiveDynamicsFormationV1(outputDir: string, artifact: CollectiveDynamicsFormationArtifactV1): string {
  verifyFormationArtifactV1(artifact);
  mkdirSync(outputDir, { recursive: true });
  const name = `formation-task-${artifact.onlineTask.sourceTaskId}-seed-${artifact.seed}.json`;
  writeJsonNoOverwrite(join(outputDir, name), artifact);
  return name;
}

export function writeCollectiveDynamicsResponseV1(outputDir: string, artifact: CollectiveDynamicsResponseArtifactV1): string {
  verifyResponseArtifactV1(artifact);
  mkdirSync(outputDir, { recursive: true });
  const sourceTaskId = artifact.taskId.split(":").at(-1);
  const name = `response-task-${sourceTaskId}-seed-${artifact.seed}.json`;
  writeJsonNoOverwrite(join(outputDir, name), artifact);
  return name;
}

function parseList(flag: string): number[] {
  const raw = process.argv.find(argument => argument.startsWith(`${flag}=`))?.slice(flag.length + 1);
  if (!raw) throw new Error(`missing_required_flag:${flag}`);
  return raw.split(",").map(value => Number(value));
}

async function main(): Promise<number> {
  const taskIds = parseList("--tasks");
  const seeds = parseList("--seeds");
  const plan = buildCollectiveDynamicsPlanV1({ taskIds, seeds });
  const outputArg = process.argv.find(argument => argument.startsWith("--output="))?.slice("--output=".length);
  const outputDir = resolve(process.cwd(), outputArg ?? "results/v6_collective_dynamics_v1");
  if (process.argv.includes("--plan")) {
    writeCollectiveDynamicsPlanV1(outputDir, plan);
    const plannedFormationProviderCalls = taskIds.reduce((sum, taskId) => sum
      + createV6HiddenBenchSmokeFixtureV1({ sourceTaskId: taskId }).task.agents.length * 3 * seeds.length, 0);
    const retiredResponseProviderCalls = plannedFormationProviderCalls * 2;
    console.log(JSON.stringify({
      mode: "plan",
      outputDir,
      planHash: plan.contentHash,
      plannedProviderCalls: plannedFormationProviderCalls,
      plannedFormationProviderCalls,
      retiredResponseProviderCalls,
      executionStatus: COLLECTIVE_DYNAMICS_V1_EXECUTION_STATUS,
    }));
    return 0;
  }
  assertCollectiveDynamicsV1CliPhaseAllowedV1(process.argv);
  if (!process.argv.includes("--execute") || process.env.RUN_AUTHORIZED !== "yes") {
    console.error("execution blocked: use --formation with --execute and RUN_AUTHORIZED=yes");
    return 5;
  }
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) throw new Error("collective_dynamics_zhipu_api_key_unavailable");
  writeCollectiveDynamicsPlanV1(outputDir, plan);
  const baseInvoker = createZhipuSingleAttemptInvoker("glm-4.6v");
  if (process.argv.includes("--formation")) {
    const formations: CollectiveDynamicsFormationArtifactV1[] = [];
    for (const taskId of taskIds) for (const seed of seeds) {
      const artifact = await executeCollectiveDynamicsFormationV1({ plan, sourceTaskId: taskId, seed, baseInvoker });
      writeCollectiveDynamicsFormationV1(outputDir, artifact);
      formations.push(artifact);
    }
    writeJsonNoOverwrite(join(outputDir, "formation-manifest.json"),
      buildCollectiveDynamicsManifestV1({ plan, formations, responses: [] }));
    return 0;
  }
  throw new Error("select_phase:--formation;v1_response_retired");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
