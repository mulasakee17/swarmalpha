/**
 * Minimal, truth-separated primitives for the Collective Epistemic Dynamics
 * component experiment. This module defines observables and offline outcomes;
 * it does not claim that the projection is a literal thermodynamic state.
 */
import { createHash } from "node:crypto";
import {
  projectCollectiveEpistemicStateV1,
  type CollectiveEpistemicStateV1,
} from "../../../src/lib/epistemic/collectiveState";
import type {
  BeliefReport,
  CategoricalEpistemicClaim,
  EpistemicEvidence,
} from "../../../src/lib/epistemic/types";
import {
  selectAllEvidenceV1,
  type DisclosedEvidenceItemV1,
  type RegisteredEvidenceV1,
  type RoundOneReportV1,
} from "./crossEvidenceExchangeSelectorsV1";
import type { V6PublicTranscriptEntry } from "./productionVerticalSlice";

export const COLLECTIVE_DYNAMICS_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-epistemic-dynamics",
  version: "1.0.0",
});

export const COLLECTIVE_DYNAMICS_ARMS_V1 = [
  "CONTROL",
  "RANDOM_MATCHED",
  "ATTACKS_NEUTRAL",
] as const;

export type CollectiveDynamicsArmV1 = typeof COLLECTIVE_DYNAMICS_ARMS_V1[number];

export interface CollectiveDynamicsRoundV1 {
  round: number;
  messages: V6PublicTranscriptEntry[];
  reports: BeliefReport[];
  evidence: EpistemicEvidence[];
  state: CollectiveEpistemicStateV1;
  /** Mean agent-level TV from the preceding step; null at R1. */
  updateActivityFromPrior: number | null;
}

export interface CollectiveDynamicsDisclosureV1 {
  arm: CollectiveDynamicsArmV1;
  message: string | null;
  itemCount: number;
  characterCount: number;
  itemContentHashes: string[];
  attackOverlapCount: number;
  contentHash: string;
}

export interface CollectiveDynamicsOnlineTaskV1 {
  sourceTaskId: number;
  taskId: string;
  publicContext: string;
  claim: CategoricalEpistemicClaim;
  agents: Array<{ agentId: string; privateInformation: string }>;
}

export interface CollectiveDynamicsFormationArtifactV1 {
  artifactRef: { id: string; version: string };
  planHash: string;
  runId: string;
  seed: number;
  modelRef: { id: string; version: string };
  onlineTask: CollectiveDynamicsOnlineTaskV1;
  rounds: [CollectiveDynamicsRoundV1, CollectiveDynamicsRoundV1, CollectiveDynamicsRoundV1];
  r3SnapshotHash: string;
  providerCalls: CollectiveDynamicsProviderCallV1[];
  contentHash: string;
}

export interface CollectiveDynamicsArmArtifactV1 {
  arm: CollectiveDynamicsArmV1;
  sharedR3SnapshotHash: string;
  disclosure: CollectiveDynamicsDisclosureV1;
  round4: CollectiveDynamicsRoundV1;
  finalRound5: CollectiveDynamicsRoundV1;
}

export interface CollectiveDynamicsResponseArtifactV1 {
  artifactRef: { id: string; version: string };
  planHash: string;
  formationHash: string;
  taskId: string;
  seed: number;
  armOrder: CollectiveDynamicsArmV1[];
  arms: CollectiveDynamicsArmArtifactV1[];
  providerCalls: CollectiveDynamicsProviderCallV1[];
  contentHash: string;
}

export interface CollectiveDynamicsProviderCallV1 {
  requestId: string;
  systemPrompt: string;
  userPrompt: string;
  modelRef: { id: string; version: string };
  invocationConfig: Record<string, unknown>;
  requestHash: string;
  responseHash: string;
  rawResponse: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
  };
}

export interface CollectiveDynamicsPlanV1 {
  planRef: { id: string; version: string };
  taskIds: number[];
  seeds: number[];
  modelRef: { id: string; version: string };
  formationRounds: 3;
  responseRound: 4;
  privateFinalRound: 5;
  interaction: "synchronous_previous_round_only";
  arms: CollectiveDynamicsArmV1[];
  temperature: 0;
  maxTokens: number;
  truthAccess: "offline_analyzer_only";
  contentHash: string;
}

export interface CollectiveDynamicsManifestV1 {
  manifestRef: { id: string; version: string };
  planHash: string;
  formations: Array<{ taskId: string; seed: number; contentHash: string }>;
  responses: Array<{ taskId: string; seed: number; formationHash: string; contentHash: string }>;
  contentHash: string;
}

function canonical(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("collective_dynamics_non_finite_json");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== "object") throw new Error("collective_dynamics_non_json_value");
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonical((value as Record<string, unknown>)[key])]));
}

export function hashCollectiveDynamicsValueV1(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value)), "utf8").digest("hex")}`;
}

export function buildCollectiveDynamicsPlanV1(input: {
  taskIds: readonly number[];
  seeds: readonly number[];
  modelRef?: { id: string; version: string };
  maxTokens?: number;
}): CollectiveDynamicsPlanV1 {
  const taskIds = [...input.taskIds];
  const seeds = [...input.seeds];
  if (!taskIds.length || taskIds.some(id => !Number.isSafeInteger(id) || id < 1 || id > 65)
    || new Set(taskIds).size !== taskIds.length) throw new Error("collective_dynamics_task_ids_invalid");
  if (!seeds.length || seeds.some(seed => !Number.isSafeInteger(seed))
    || new Set(seeds).size !== seeds.length) throw new Error("collective_dynamics_seeds_invalid");
  const body = {
    planRef: { id: `${COLLECTIVE_DYNAMICS_V1.id}.plan`, version: "1.0.0" },
    taskIds,
    seeds,
    modelRef: input.modelRef ?? { id: "zhipu:glm-4.6v", version: "1.0.0" },
    formationRounds: 3 as const,
    responseRound: 4 as const,
    privateFinalRound: 5 as const,
    interaction: "synchronous_previous_round_only" as const,
    arms: [...COLLECTIVE_DYNAMICS_ARMS_V1],
    temperature: 0 as const,
    maxTokens: input.maxTokens ?? 768,
    truthAccess: "offline_analyzer_only" as const,
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function buildCollectiveDynamicsManifestV1(input: {
  plan: CollectiveDynamicsPlanV1;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
  responses: readonly CollectiveDynamicsResponseArtifactV1[];
}): CollectiveDynamicsManifestV1 {
  const body = {
    manifestRef: { id: `${COLLECTIVE_DYNAMICS_V1.id}.manifest`, version: "1.0.0" },
    planHash: input.plan.contentHash,
    formations: input.formations.map(artifact => ({
      taskId: artifact.onlineTask.taskId, seed: artifact.seed, contentHash: artifact.contentHash,
    })).sort((a, b) => a.taskId.localeCompare(b.taskId) || a.seed - b.seed),
    responses: input.responses.map(artifact => ({
      taskId: artifact.taskId, seed: artifact.seed, formationHash: artifact.formationHash, contentHash: artifact.contentHash,
    })).sort((a, b) => a.taskId.localeCompare(b.taskId) || a.seed - b.seed),
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function verifyCollectiveDynamicsManifestV1(input: {
  plan: CollectiveDynamicsPlanV1;
  manifest: CollectiveDynamicsManifestV1;
  formations: readonly CollectiveDynamicsFormationArtifactV1[];
  responses: readonly CollectiveDynamicsResponseArtifactV1[];
}): void {
  const expected = buildCollectiveDynamicsManifestV1(input);
  if (hashCollectiveDynamicsValueV1(input.manifest) !== hashCollectiveDynamicsValueV1(expected)) {
    throw new Error("collective_dynamics_manifest_replay_mismatch");
  }
}

const FORBIDDEN_ONLINE_KEYS = new Set([
  "correctAnswer", "correct_answer", "groundTruth", "ground_truth", "outcome",
  "resolvedOutcome", "resolved_outcome",
]);

/** Fail closed if an online artifact or prompt carrier contains outcome authority. */
export function assertCollectiveDynamicsTruthBlindV1(value: unknown, path = "online"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertCollectiveDynamicsTruthBlindV1(entry, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_ONLINE_KEYS.has(key)) throw new Error(`collective_dynamics_truth_leak:${path}.${key}`);
    assertCollectiveDynamicsTruthBlindV1(child, `${path}.${key}`);
  }
}

function categoricalProbabilities(report: BeliefReport, claim: CategoricalEpistemicClaim): number[] {
  if (report.value.kind !== "categorical") throw new Error("collective_dynamics_requires_categorical_reports");
  return claim.options.map(option => report.value.kind === "categorical"
    ? report.value.probabilities[option] : 0);
}

export function meanAgentTotalVariationV1(input: {
  claim: CategoricalEpistemicClaim;
  previous: readonly BeliefReport[];
  next: readonly BeliefReport[];
}): number {
  const prior = new Map(input.previous.map(report => [report.agentId, report]));
  const next = new Map(input.next.map(report => [report.agentId, report]));
  const agents = [...prior.keys()].sort();
  if (!agents.length || agents.length !== next.size || agents.some(agent => !next.has(agent))) {
    throw new Error("collective_dynamics_update_roster_mismatch");
  }
  return agents.reduce((sum, agentId) => {
    const left = categoricalProbabilities(prior.get(agentId)!, input.claim);
    const right = categoricalProbabilities(next.get(agentId)!, input.claim);
    return sum + 0.5 * left.reduce((distance, probability, index) =>
      distance + Math.abs(probability - right[index]), 0);
  }, 0) / agents.length;
}

export function projectCollectiveDynamicsRoundV1(input: {
  claim: CategoricalEpistemicClaim;
  expectedAgentIds: readonly string[];
  allReportsThroughRound: readonly BeliefReport[];
  allEvidenceThroughRound: readonly EpistemicEvidence[];
  roundReports: readonly BeliefReport[];
  messages: readonly V6PublicTranscriptEntry[];
  round: number;
  previousRoundReports?: readonly BeliefReport[];
}): CollectiveDynamicsRoundV1 {
  const state = projectCollectiveEpistemicStateV1({
    claim: input.claim,
    reports: input.allReportsThroughRound,
    evidence: input.allEvidenceThroughRound,
    exposures: [],
    asOfRound: input.round,
    expectedAgentIds: input.expectedAgentIds,
  });
  return {
    round: input.round,
    messages: structuredClone([...input.messages]),
    reports: structuredClone([...input.roundReports]),
    evidence: structuredClone(input.allEvidenceThroughRound.filter(item =>
      input.roundReports.some(report => report.evidence.some(ref => ref.evidenceId === item.id)))),
    state: structuredClone(state),
    updateActivityFromPrior: input.previousRoundReports
      ? meanAgentTotalVariationV1({ claim: input.claim, previous: input.previousRoundReports, next: input.roundReports })
      : null,
  };
}

function latestRoundReports(rounds: readonly CollectiveDynamicsRoundV1[]): BeliefReport[] {
  if (!rounds.length) throw new Error("collective_dynamics_rounds_empty");
  return rounds[rounds.length - 1].reports;
}

export function uniqueTopOptionV1(
  claim: CategoricalEpistemicClaim,
  probabilities: Readonly<Record<string, number>>,
): string | null {
  const maximum = Math.max(...claim.options.map(option => probabilities[option]));
  const tops = claim.options.filter(option => probabilities[option] === maximum);
  return tops.length === 1 ? tops[0] : null;
}

export interface StrictConsensusV1 {
  status: "strict_consensus" | "no_strict_consensus";
  option: string | null;
  rosterComplete: boolean;
}

/** Full roster + unique individual argmax + the same option for every agent. */
export function classifyStrictConsensusV1(input: {
  claim: CategoricalEpistemicClaim;
  expectedAgentIds: readonly string[];
  reports: readonly BeliefReport[];
}): StrictConsensusV1 {
  const byAgent = new Map(input.reports.map(report => [report.agentId, report]));
  const rosterComplete = byAgent.size === input.expectedAgentIds.length
    && input.expectedAgentIds.every(agentId => byAgent.has(agentId));
  if (!rosterComplete) return { status: "no_strict_consensus", option: null, rosterComplete: false };
  const tops = input.expectedAgentIds.map(agentId => {
    const report = byAgent.get(agentId)!;
    if (report.value.kind !== "categorical") return null;
    return uniqueTopOptionV1(input.claim, report.value.probabilities);
  });
  const option = tops[0];
  return option !== null && tops.every(top => top === option)
    ? { status: "strict_consensus", option, rosterComplete: true }
    : { status: "no_strict_consensus", option: null, rosterComplete: true };
}

function selectionInputs(round: CollectiveDynamicsRoundV1): {
  reports: RoundOneReportV1[];
  evidenceRegistry: Map<string, RegisteredEvidenceV1>;
} {
  return {
    reports: round.reports.map(report => ({
      agentId: report.agentId,
      probabilities: report.value.kind === "categorical" ? report.value.probabilities : {},
      evidenceRefs: report.evidence,
    })),
    evidenceRegistry: new Map(round.evidence.map(item => [item.id, {
      evidenceId: item.id,
      content: item.content,
      contentHash: item.provenance.contentHash,
    }])),
  };
}

function deterministicMatchedSample(
  items: readonly DisclosedEvidenceItemV1[], count: number, salt: string,
): DisclosedEvidenceItemV1[] {
  return [...items].sort((left, right) => {
    const a = hashCollectiveDynamicsValueV1([salt, left.contentHash]);
    const b = hashCollectiveDynamicsValueV1([salt, right.contentHash]);
    return a.localeCompare(b) || left.contentHash.localeCompare(right.contentHash);
  }).slice(0, count);
}

/** Common renderer deliberately omits the agent-supplied supports/attacks label. */
export function renderNeutralEvidenceDisclosureV1(items: readonly DisclosedEvidenceItemV1[]): string | null {
  if (!items.length) return null;
  return [
    "[Experiment-authorized evidence disclosure]",
    "status: recorded agent-provided observations; not a correctness certificate",
    ...items.flatMap(item => [
      `- sourceAgentId: ${item.sourceAgentIds.join(", ")}; contentHash: ${item.contentHash}`,
      `  observation: ${item.content}`,
    ]),
  ].join("\n");
}

function disclosure(
  arm: CollectiveDynamicsArmV1,
  items: readonly DisclosedEvidenceItemV1[],
  attackHashes: ReadonlySet<string>,
): CollectiveDynamicsDisclosureV1 {
  const message = arm === "CONTROL" ? null : renderNeutralEvidenceDisclosureV1(items);
  const body = {
    arm,
    message,
    itemCount: items.length,
    characterCount: message?.length ?? 0,
    itemContentHashes: items.map(item => item.contentHash),
    attackOverlapCount: items.filter(item => attackHashes.has(item.contentHash)).length,
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

export function buildCollectiveDynamicsDisclosuresV1(input: {
  round3: CollectiveDynamicsRoundV1;
  taskId: string;
  seed: number;
}): Record<CollectiveDynamicsArmV1, CollectiveDynamicsDisclosureV1> {
  const source = selectionInputs(input.round3);
  const attacks = selectAllEvidenceV1({ ...source, relations: ["attacks"] });
  const all = selectAllEvidenceV1({ ...source, relations: ["supports", "attacks"] });
  const attackHashes = new Set(attacks.map(item => item.contentHash));
  const random = deterministicMatchedSample(all, attacks.length, `${input.taskId}:${input.seed}:random-matched`);
  return {
    CONTROL: disclosure("CONTROL", [], attackHashes),
    RANDOM_MATCHED: disclosure("RANDOM_MATCHED", random, attackHashes),
    ATTACKS_NEUTRAL: disclosure("ATTACKS_NEUTRAL", attacks, attackHashes),
  };
}

export function deterministicCollectiveDynamicsArmOrderV1(
  taskId: string, seed: number,
): CollectiveDynamicsArmV1[] {
  return [...COLLECTIVE_DYNAMICS_ARMS_V1].sort((left, right) =>
    hashCollectiveDynamicsValueV1([taskId, seed, left]).localeCompare(
      hashCollectiveDynamicsValueV1([taskId, seed, right]),
    ));
}

export function computeFormationSnapshotHashV1(
  artifact: Pick<CollectiveDynamicsFormationArtifactV1, "onlineTask" | "rounds" | "runId" | "seed">,
): string {
  return hashCollectiveDynamicsValueV1({
    runId: artifact.runId,
    seed: artifact.seed,
    onlineTask: artifact.onlineTask,
    rounds: artifact.rounds,
  });
}

export function buildFormationArtifactV1(
  body: Omit<CollectiveDynamicsFormationArtifactV1, "artifactRef" | "r3SnapshotHash" | "contentHash">,
): CollectiveDynamicsFormationArtifactV1 {
  assertCollectiveDynamicsTruthBlindV1(body);
  const withoutContentHash = {
    artifactRef: { id: `${COLLECTIVE_DYNAMICS_V1.id}.formation`, version: "1.0.0" },
    ...structuredClone(body),
    r3SnapshotHash: computeFormationSnapshotHashV1(body),
  };
  return { ...withoutContentHash, contentHash: hashCollectiveDynamicsValueV1(withoutContentHash) };
}

export function verifyFormationArtifactV1(artifact: CollectiveDynamicsFormationArtifactV1): void {
  assertCollectiveDynamicsTruthBlindV1(artifact);
  if (artifact.rounds.map(round => round.round).join(",") !== "1,2,3") {
    throw new Error("collective_dynamics_formation_rounds_invalid");
  }
  if (computeFormationSnapshotHashV1(artifact) !== artifact.r3SnapshotHash) {
    throw new Error("collective_dynamics_snapshot_hash_mismatch");
  }
  const expectedAgents = artifact.onlineTask.agents.map(agent => agent.agentId);
  const cumulativeReports: BeliefReport[] = [];
  const cumulativeEvidence: EpistemicEvidence[] = [];
  let previous: BeliefReport[] | undefined;
  for (const round of artifact.rounds) {
    if (round.reports.length !== expectedAgents.length || round.messages.length !== expectedAgents.length) {
      throw new Error("collective_dynamics_formation_roster_incomplete");
    }
    cumulativeReports.push(...round.reports);
    cumulativeEvidence.push(...round.evidence);
    const replayed = projectCollectiveEpistemicStateV1({
      claim: artifact.onlineTask.claim,
      reports: cumulativeReports,
      evidence: cumulativeEvidence,
      exposures: [],
      asOfRound: round.round,
      expectedAgentIds: expectedAgents,
    });
    if (replayed.contentHash !== round.state.contentHash) throw new Error("collective_dynamics_state_replay_mismatch");
    const expectedActivity = previous
      ? meanAgentTotalVariationV1({ claim: artifact.onlineTask.claim, previous, next: round.reports })
      : null;
    if (expectedActivity !== round.updateActivityFromPrior) throw new Error("collective_dynamics_update_activity_mismatch");
    previous = round.reports;
  }
  if (artifact.providerCalls.length !== expectedAgents.length * 3
    || new Set(artifact.providerCalls.map(call => call.requestId)).size !== artifact.providerCalls.length) {
    throw new Error("collective_dynamics_formation_call_ledger_invalid");
  }
  for (const call of artifact.providerCalls) {
    const request = {
      requestId: call.requestId,
      systemPrompt: call.systemPrompt,
      userPrompt: call.userPrompt,
      responseFormat: "json",
      modelRef: call.modelRef,
      invocationConfig: call.invocationConfig,
    };
    if (hashCollectiveDynamicsValueV1(request) !== call.requestHash
      || hashCollectiveDynamicsValueV1(call.rawResponse) !== call.responseHash) {
      throw new Error("collective_dynamics_provider_call_replay_mismatch");
    }
  }
  const { contentHash, ...body } = artifact;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) throw new Error("collective_dynamics_formation_hash_mismatch");
}

export function buildResponseArtifactV1(
  body: Omit<CollectiveDynamicsResponseArtifactV1, "artifactRef" | "contentHash">,
): CollectiveDynamicsResponseArtifactV1 {
  assertCollectiveDynamicsTruthBlindV1(body);
  const withoutContentHash = {
    artifactRef: { id: `${COLLECTIVE_DYNAMICS_V1.id}.response`, version: "1.0.0" },
    ...structuredClone(body),
  };
  const artifact = { ...withoutContentHash, contentHash: hashCollectiveDynamicsValueV1(withoutContentHash) };
  verifyResponseArtifactV1(artifact);
  return artifact;
}

export function verifyResponseArtifactV1(artifact: CollectiveDynamicsResponseArtifactV1): void {
  assertCollectiveDynamicsTruthBlindV1(artifact);
  if (artifact.armOrder.length !== 3 || new Set(artifact.armOrder).size !== 3
    || COLLECTIVE_DYNAMICS_ARMS_V1.some(arm => !artifact.armOrder.includes(arm))) {
    throw new Error("collective_dynamics_arm_order_invalid");
  }
  if (artifact.arms.length !== 3 || new Set(artifact.arms.map(entry => entry.arm)).size !== 3
    || COLLECTIVE_DYNAMICS_ARMS_V1.some(arm => !artifact.arms.some(entry => entry.arm === arm))) {
    throw new Error("collective_dynamics_arm_set_invalid");
  }
  if (artifact.arms.some(entry => entry.sharedR3SnapshotHash !== artifact.arms[0].sharedR3SnapshotHash)) {
    throw new Error("collective_dynamics_same_state_fork_broken");
  }
  const byArm = Object.fromEntries(artifact.arms.map(entry => [entry.arm, entry])) as Record<CollectiveDynamicsArmV1, CollectiveDynamicsArmArtifactV1>;
  if (byArm.CONTROL.disclosure.itemCount !== 0 || byArm.CONTROL.disclosure.message !== null
    || byArm.RANDOM_MATCHED.disclosure.itemCount !== byArm.ATTACKS_NEUTRAL.disclosure.itemCount) {
    throw new Error("collective_dynamics_disclosure_matching_invalid");
  }
  if (artifact.arms.some(entry => entry.round4.round !== 4 || entry.finalRound5.round !== 5)) {
    throw new Error("collective_dynamics_response_rounds_invalid");
  }
  const agentCount = artifact.arms[0].round4.reports.length;
  if (!agentCount || artifact.arms.some(entry => entry.round4.reports.length !== agentCount
    || entry.finalRound5.reports.length !== agentCount)
    || artifact.providerCalls.length !== agentCount * 6
    || new Set(artifact.providerCalls.map(call => call.requestId)).size !== artifact.providerCalls.length) {
    throw new Error("collective_dynamics_response_call_or_roster_invalid");
  }
  for (const call of artifact.providerCalls) {
    const request = {
      requestId: call.requestId,
      systemPrompt: call.systemPrompt,
      userPrompt: call.userPrompt,
      responseFormat: "json",
      modelRef: call.modelRef,
      invocationConfig: call.invocationConfig,
    };
    if (hashCollectiveDynamicsValueV1(request) !== call.requestHash
      || hashCollectiveDynamicsValueV1(call.rawResponse) !== call.responseHash) {
      throw new Error("collective_dynamics_provider_call_replay_mismatch");
    }
  }
  const { contentHash, ...body } = artifact;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) throw new Error("collective_dynamics_response_hash_mismatch");
}

/** Recomputes every branch state from the formation micro-records. */
export function replayCollectiveDynamicsResponseV1(input: {
  formation: CollectiveDynamicsFormationArtifactV1;
  response: CollectiveDynamicsResponseArtifactV1;
}): void {
  verifyFormationArtifactV1(input.formation);
  verifyResponseArtifactV1(input.response);
  if (input.response.formationHash !== input.formation.contentHash
    || input.response.arms.some(arm => arm.sharedR3SnapshotHash !== input.formation.r3SnapshotHash)) {
    throw new Error("collective_dynamics_response_formation_binding_mismatch");
  }
  const claim = input.formation.onlineTask.claim;
  const expectedAgentIds = input.formation.onlineTask.agents.map(agent => agent.agentId);
  const formationReports = input.formation.rounds.flatMap(round => round.reports);
  const formationEvidence = input.formation.rounds.flatMap(round => round.evidence);
  const r3Reports = input.formation.rounds[2].reports;
  for (const arm of input.response.arms) {
    const r4State = projectCollectiveEpistemicStateV1({
      claim,
      reports: [...formationReports, ...arm.round4.reports],
      evidence: [...formationEvidence, ...arm.round4.evidence],
      exposures: [], asOfRound: 4, expectedAgentIds,
    });
    const r5State = projectCollectiveEpistemicStateV1({
      claim,
      reports: [...formationReports, ...arm.round4.reports, ...arm.finalRound5.reports],
      evidence: [...formationEvidence, ...arm.round4.evidence, ...arm.finalRound5.evidence],
      exposures: [], asOfRound: 5, expectedAgentIds,
    });
    if (r4State.contentHash !== arm.round4.state.contentHash
      || r5State.contentHash !== arm.finalRound5.state.contentHash) {
      throw new Error("collective_dynamics_branch_state_replay_mismatch");
    }
    const r4Activity = meanAgentTotalVariationV1({ claim, previous: r3Reports, next: arm.round4.reports });
    const r5Activity = meanAgentTotalVariationV1({ claim, previous: arm.round4.reports, next: arm.finalRound5.reports });
    if (r4Activity !== arm.round4.updateActivityFromPrior
      || r5Activity !== arm.finalRound5.updateActivityFromPrior) {
      throw new Error("collective_dynamics_branch_activity_replay_mismatch");
    }
  }
}

function pooledProbabilities(round: CollectiveDynamicsRoundV1): Record<string, number> {
  if (round.state.pooledBelief.kind !== "categorical") throw new Error("collective_dynamics_requires_categorical_state");
  return round.state.pooledBelief.probabilities;
}

function categoricalBrier(
  claim: CategoricalEpistemicClaim,
  probabilities: Readonly<Record<string, number>>,
  outcome: string,
): number {
  if (!claim.options.includes(outcome)) throw new Error("collective_dynamics_outcome_not_in_claim");
  return claim.options.reduce((sum, option) =>
    sum + (probabilities[option] - (option === outcome ? 1 : 0)) ** 2, 0);
}

export interface CollectiveDynamicsTaskAnalysisV1 {
  taskId: string;
  preForkStratum: "wrong_consensus" | "correct_consensus" | "no_strict_consensus";
  r3ConsensusOption: string | null;
  arms: Record<CollectiveDynamicsArmV1, {
    finalBrier: number;
    finalPooledTop: string | null;
    finalStrictConsensusOption: string | null;
    escapedSameWrongConsensus: boolean | null;
    recoveredAtFinal: boolean | null;
    stableRecovery: boolean | null;
    relapsed: boolean | null;
  }>;
  attacksMinusRandomFinalBrier: number | null;
  attacksMinusRandomStableRecovery: number | null;
  controlWrongStateStable: boolean | null;
  correctConsensusHarmedByAttacks: boolean | null;
}

/** Outcome-aware analysis boundary. No result from this function is admissible online. */
export function analyzeCollectiveDynamicsTaskV1(input: {
  formation: CollectiveDynamicsFormationArtifactV1;
  response: CollectiveDynamicsResponseArtifactV1;
  outcome: string;
}): CollectiveDynamicsTaskAnalysisV1 {
  verifyFormationArtifactV1(input.formation);
  replayCollectiveDynamicsResponseV1({ formation: input.formation, response: input.response });
  if (input.response.formationHash !== input.formation.contentHash
    || input.response.taskId !== input.formation.onlineTask.taskId
    || input.response.arms.some(arm => arm.sharedR3SnapshotHash !== input.formation.r3SnapshotHash)) {
    throw new Error("collective_dynamics_analysis_binding_mismatch");
  }
  const claim = input.formation.onlineTask.claim;
  const expectedAgentIds = input.formation.onlineTask.agents.map(agent => agent.agentId);
  const r3 = classifyStrictConsensusV1({ claim, expectedAgentIds, reports: latestRoundReports(input.formation.rounds) });
  const preForkStratum = r3.status !== "strict_consensus"
    ? "no_strict_consensus" : r3.option === input.outcome ? "correct_consensus" : "wrong_consensus";
  const arms = {} as CollectiveDynamicsTaskAnalysisV1["arms"];
  for (const arm of input.response.arms) {
    const r4Top = uniqueTopOptionV1(claim, pooledProbabilities(arm.round4));
    const finalTop = uniqueTopOptionV1(claim, pooledProbabilities(arm.finalRound5));
    const finalConsensus = classifyStrictConsensusV1({ claim, expectedAgentIds, reports: arm.finalRound5.reports });
    const wrong = preForkStratum === "wrong_consensus";
    const recoveredR4 = r4Top === input.outcome;
    const recoveredFinal = finalTop === input.outcome;
    arms[arm.arm] = {
      finalBrier: categoricalBrier(claim, pooledProbabilities(arm.finalRound5), input.outcome),
      finalPooledTop: finalTop,
      finalStrictConsensusOption: finalConsensus.option,
      escapedSameWrongConsensus: wrong
        ? !(finalConsensus.status === "strict_consensus" && finalConsensus.option === r3.option) : null,
      recoveredAtFinal: wrong ? recoveredFinal : null,
      stableRecovery: wrong ? recoveredR4 && recoveredFinal : null,
      relapsed: wrong ? recoveredR4 && !recoveredFinal : null,
    };
  }
  const wrong = preForkStratum === "wrong_consensus";
  const correct = preForkStratum === "correct_consensus";
  const control = input.response.arms.find(arm => arm.arm === "CONTROL")!;
  const controlR4 = classifyStrictConsensusV1({ claim, expectedAgentIds, reports: control.round4.reports });
  const controlR5 = classifyStrictConsensusV1({ claim, expectedAgentIds, reports: control.finalRound5.reports });
  return {
    taskId: input.formation.onlineTask.taskId,
    preForkStratum,
    r3ConsensusOption: r3.option,
    arms,
    attacksMinusRandomFinalBrier: wrong
      ? arms.ATTACKS_NEUTRAL.finalBrier - arms.RANDOM_MATCHED.finalBrier : null,
    attacksMinusRandomStableRecovery: wrong
      ? Number(arms.ATTACKS_NEUTRAL.stableRecovery) - Number(arms.RANDOM_MATCHED.stableRecovery) : null,
    controlWrongStateStable: wrong
      ? controlR4.option === r3.option && controlR5.option === r3.option : null,
    correctConsensusHarmedByAttacks: correct
      ? arms.ATTACKS_NEUTRAL.finalBrier > arms.RANDOM_MATCHED.finalBrier : null,
  };
}

export function summarizeCollectiveDynamicsAnalysesV1(
  tasks: readonly CollectiveDynamicsTaskAnalysisV1[],
): {
  taskCount: number;
  wrongConsensusTaskCount: number;
  correctConsensusTaskCount: number;
  meanAttacksMinusRandomFinalBrierWithinWrongConsensus: number | null;
  attacksMinusRandomStableRecoveryRateWithinWrongConsensus: number | null;
  correctConsensusHarmCount: number;
} {
  const wrong = tasks.filter(task => task.preForkStratum === "wrong_consensus");
  const correct = tasks.filter(task => task.preForkStratum === "correct_consensus");
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return {
    taskCount: tasks.length,
    wrongConsensusTaskCount: wrong.length,
    correctConsensusTaskCount: correct.length,
    meanAttacksMinusRandomFinalBrierWithinWrongConsensus: mean(wrong.map(task => task.attacksMinusRandomFinalBrier!)),
    attacksMinusRandomStableRecoveryRateWithinWrongConsensus: mean(wrong.map(task => task.attacksMinusRandomStableRecovery!)),
    correctConsensusHarmCount: correct.filter(task => task.correctConsensusHarmedByAttacks).length,
  };
}
