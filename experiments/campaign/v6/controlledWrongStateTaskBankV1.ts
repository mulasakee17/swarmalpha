/**
 * Zero-provider candidate bank for controlled wrong-state formation.
 *
 * These tasks are engineering candidates until an independent human semantic
 * review is accepted.  The online projection cannot contain the resolver or
 * the withheld observation.
 */
import { createHash } from "node:crypto";

export const CONTROLLED_WRONG_STATE_TASK_SCHEMA_V1 = Object.freeze({
  id: "swarmalpha.v6.controlled-wrong-state-task",
  version: "1.0.0",
});

export type ControlledEvidenceAvailabilityV1 = "shared" | "private" | "withheld";

export interface ControlledWrongStateEvidenceV1 {
  evidenceId: string;
  sourceId: string;
  lineageId: string;
  availability: ControlledEvidenceAvailabilityV1;
  ownerAgentId: string | null;
  statement: string;
  scoreByOptionId: Record<string, number>;
}

export interface ControlledWrongStateTaskV1 {
  schemaRef: typeof CONTROLLED_WRONG_STATE_TASK_SCHEMA_V1;
  taskId: string;
  clusterId: string;
  semanticGroupId: string;
  leakageGroupId: string;
  syntacticFamilyId: "additive-diagnostic-evidence-v1";
  mirrorOfTaskId: string | null;
  publicContext: string;
  options: Array<{ optionId: string; label: string }>;
  agentIds: [string, string, string, string];
  evidence: ControlledWrongStateEvidenceV1[];
  resolver: {
    kind: "offline-frozen-outcome-v1";
    outcomeOptionId: string;
  };
  contentHash: string;
}

export interface ControlledWrongStateOnlineTaskV1 {
  taskId: string;
  publicContext: string;
  options: Array<{ optionId: string; label: string }>;
  sharedEvidence: Array<Omit<ControlledWrongStateEvidenceV1, "availability" | "ownerAgentId">>;
  agents: Array<{
    agentId: string;
    privateEvidence: Array<Omit<ControlledWrongStateEvidenceV1, "availability" | "ownerAgentId">>;
  }>;
}

export interface ControlledWrongStateAutomaticReviewV1 {
  taskId: string;
  clusterId: string;
  semanticGroupId: string;
  leakageGroupId: string;
  mirrorOfTaskId: string | null;
  constructedInitialTopHistogram: Record<string, number>;
  sharedCueTopOptionId: string;
  formationEvidenceTopOptionId: string;
  withheldEvidenceTopOptionId: string;
  formationOutcomeMargin: number;
  postRevealOutcomeMargin: number;
  checks: {
    threeOptions: true;
    fourAgents: true;
    constructedInitialTopsHeterogeneous: true;
    constructedWrongPluralityAtInitialView: true;
    aggregateFormationEvidenceSupportsOutcome: true;
    sharedCueIsPlausiblyMisleading: true;
    withheldObservationSupportsOutcome: true;
    withheldObservationIncreasesOutcomeMargin: true;
    onlineProjectionTruthBlind: true;
  };
  humanReview: {
    status: "PENDING";
    requiredQuestions: string[];
  };
}

type TaskBody = Omit<ControlledWrongStateTaskV1, "schemaRef" | "contentHash">;

const REVIEW_QUESTIONS = Object.freeze([
  "Are the three options mutually exclusive and exhaustive in the scenario?",
  "Is the frozen outcome uniquely justified rather than selected for a desired model response?",
  "Is the shared cue a plausible noisy observation rather than a fabricated lie?",
  "Do the private observations preserve the intended evidence strength and availability?",
  "Is the withheld observation genuinely new and independently obtainable?",
  "Does the mirror preserve semantics while changing only opaque option identity/order?",
  "Is this cluster distinct from all development tasks and other leakage groups?",
]);

function canonical(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("controlled_task_non_finite_number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== "object") throw new Error("controlled_task_non_json_value");
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonical((value as Record<string, unknown>)[key])]));
}

function hash(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value)), "utf8").digest("hex")}`;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function sumScores(
  evidence: readonly ControlledWrongStateEvidenceV1[],
  optionIds: readonly string[],
): Record<string, number> {
  return Object.fromEntries(optionIds.map(optionId => [optionId, evidence.reduce(
    (sum, item) => sum + item.scoreByOptionId[optionId], 0,
  )]));
}

function uniqueTop(scores: Record<string, number>): string {
  const ordered = Object.entries(scores).sort((left, right) => right[1] - left[1]);
  if (ordered.length < 2 || ordered[0][1] === ordered[1][1]) {
    throw new Error("controlled_task_top_option_not_unique");
  }
  return ordered[0][0];
}

function outcomeMargin(scores: Record<string, number>, outcomeOptionId: string): number {
  const alternatives = Object.entries(scores)
    .filter(([optionId]) => optionId !== outcomeOptionId)
    .map(([, score]) => score);
  return scores[outcomeOptionId] - Math.max(...alternatives);
}

function finalize(body: TaskBody): Readonly<ControlledWrongStateTaskV1> {
  const withoutHash = {
    schemaRef: CONTROLLED_WRONG_STATE_TASK_SCHEMA_V1,
    ...structuredClone(body),
  };
  const task = { ...withoutHash, contentHash: hash(withoutHash) };
  validateControlledWrongStateTaskV1(task);
  return deepFreeze(task);
}

function evidence(input: {
  prefix: string;
  suffix: string;
  availability: ControlledEvidenceAvailabilityV1;
  ownerAgentId?: string;
  statement: string;
  scores: [number, number, number];
}): ControlledWrongStateEvidenceV1 {
  return {
    evidenceId: `${input.prefix}:evidence:${input.suffix}`,
    sourceId: `${input.prefix}:source:${input.suffix}`,
    lineageId: `${input.prefix}:lineage:${input.suffix}`,
    availability: input.availability,
    ownerAgentId: input.ownerAgentId ?? null,
    statement: input.statement,
    scoreByOptionId: {
      opt_1: input.scores[0], opt_2: input.scores[1], opt_3: input.scores[2],
    },
  };
}

function baseTask(input: {
  slug: string;
  semanticGroupId: string;
  publicContext: string;
  labels: [string, string, string];
  outcomeIndex: 0 | 1 | 2;
  sharedScores: [number, number, number];
  privateScores: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
  withheldScores: [number, number, number];
  statements: [string, string, string, string, string, string];
}): Readonly<ControlledWrongStateTaskV1> {
  const taskId = `task:controlled:${input.slug}:v1`;
  const agentIds = ["agent_1", "agent_2", "agent_3", "agent_4"] as const;
  const cards = [
    evidence({ prefix: taskId, suffix: "shared", availability: "shared", statement: input.statements[0], scores: input.sharedScores }),
    ...agentIds.map((agentId, index) => evidence({
      prefix: taskId,
      suffix: `private_${index + 1}`,
      availability: "private",
      ownerAgentId: agentId,
      statement: input.statements[index + 1],
      scores: input.privateScores[index],
    })),
    evidence({ prefix: taskId, suffix: "withheld", availability: "withheld", statement: input.statements[5], scores: input.withheldScores }),
  ];
  return finalize({
    taskId,
    clusterId: `cluster:controlled:${input.slug}`,
    semanticGroupId: input.semanticGroupId,
    leakageGroupId: `leakage:controlled:${input.slug}`,
    syntacticFamilyId: "additive-diagnostic-evidence-v1",
    mirrorOfTaskId: null,
    publicContext: `${input.publicContext}\n\nThis controlled task has exactly one latent primary cause among the three listed options. Evidence cards contain additive diagnostic scores. Sum only cards actually supplied to you; the highest total is the best-supported option. A card is a noisy observation, not ground truth.`,
    options: input.labels.map((label, index) => ({ optionId: `opt_${index + 1}`, label })),
    agentIds: [...agentIds],
    evidence: cards,
    resolver: { kind: "offline-frozen-outcome-v1", outcomeOptionId: `opt_${input.outcomeIndex + 1}` },
  });
}

function mirrorTask(
  base: ControlledWrongStateTaskV1,
  remap: Readonly<Record<string, string>>,
): Readonly<ControlledWrongStateTaskV1> {
  const taskId = `${base.taskId}:mirror`;
  const optionIds = base.options.map(option => option.optionId);
  if (new Set(Object.keys(remap)).size !== optionIds.length
    || new Set(Object.values(remap)).size !== optionIds.length
    || optionIds.some(optionId => !remap[optionId] || !optionIds.includes(remap[optionId]))) {
    throw new Error("controlled_task_mirror_remap_invalid");
  }
  const replacePrefix = (value: string): string => value.replace(base.taskId, taskId);
  const options = base.options.map(option => ({
    optionId: remap[option.optionId],
    label: option.label,
  })).sort((left, right) => left.optionId.localeCompare(right.optionId));
  const evidenceCards = base.evidence.map(item => ({
    ...structuredClone(item),
    evidenceId: replacePrefix(item.evidenceId),
    sourceId: replacePrefix(item.sourceId),
    lineageId: replacePrefix(item.lineageId),
    scoreByOptionId: Object.fromEntries(Object.entries(item.scoreByOptionId)
      .map(([optionId, score]) => [remap[optionId], score])),
  }));
  return finalize({
    taskId,
    clusterId: base.clusterId,
    semanticGroupId: base.semanticGroupId,
    leakageGroupId: base.leakageGroupId,
    syntacticFamilyId: base.syntacticFamilyId,
    mirrorOfTaskId: base.taskId,
    publicContext: base.publicContext,
    options,
    agentIds: [...base.agentIds],
    evidence: evidenceCards,
    resolver: {
      kind: "offline-frozen-outcome-v1",
      outcomeOptionId: remap[base.resolver.outcomeOptionId],
    },
  });
}

export function validateControlledWrongStateTaskV1(task: ControlledWrongStateTaskV1): void {
  if (task.schemaRef.id !== CONTROLLED_WRONG_STATE_TASK_SCHEMA_V1.id
    || task.schemaRef.version !== CONTROLLED_WRONG_STATE_TASK_SCHEMA_V1.version) {
    throw new Error("controlled_task_schema_invalid");
  }
  if (task.options.length !== 3 || new Set(task.options.map(option => option.optionId)).size !== 3) {
    throw new Error("controlled_task_options_invalid");
  }
  if (task.agentIds.length !== 4 || new Set(task.agentIds).size !== 4) {
    throw new Error("controlled_task_roster_invalid");
  }
  const optionIds = task.options.map(option => option.optionId);
  const evidenceIds = task.evidence.map(item => item.evidenceId);
  if (new Set(evidenceIds).size !== evidenceIds.length) throw new Error("controlled_task_evidence_ids_invalid");
  for (const item of task.evidence) {
    if (!item.evidenceId || !item.sourceId || !item.lineageId || !item.statement) {
      throw new Error("controlled_task_evidence_identity_invalid");
    }
    if (Object.keys(item.scoreByOptionId).sort().join("|") !== [...optionIds].sort().join("|")
      || Object.values(item.scoreByOptionId).some(score => !Number.isFinite(score))) {
      throw new Error("controlled_task_evidence_scores_invalid");
    }
    if (item.availability === "private"
      && !(task.agentIds as readonly string[]).includes(item.ownerAgentId ?? "")) {
      throw new Error("controlled_task_private_owner_invalid");
    }
    if (item.availability !== "private" && item.ownerAgentId !== null) {
      throw new Error("controlled_task_non_private_owner_invalid");
    }
  }
  const shared = task.evidence.filter(item => item.availability === "shared");
  const privateCards = task.evidence.filter(item => item.availability === "private");
  const withheld = task.evidence.filter(item => item.availability === "withheld");
  if (shared.length !== 1 || withheld.length !== 1
    || task.agentIds.some(agentId => privateCards.filter(item => item.ownerAgentId === agentId).length !== 1)) {
    throw new Error("controlled_task_availability_contract_invalid");
  }
  const outcome = task.resolver.outcomeOptionId;
  if (!optionIds.includes(outcome)) throw new Error("controlled_task_outcome_invalid");
  const sharedTop = uniqueTop(sumScores(shared, optionIds));
  const withheldTop = uniqueTop(sumScores(withheld, optionIds));
  const formationScores = sumScores([...shared, ...privateCards], optionIds);
  if (sharedTop === outcome || withheldTop !== outcome || uniqueTop(formationScores) !== outcome) {
    throw new Error("controlled_task_evidence_direction_invalid");
  }
  const initialTops = task.agentIds.map(agentId => uniqueTop(sumScores([
    ...shared, ...privateCards.filter(item => item.ownerAgentId === agentId),
  ], optionIds)));
  const histogram = Object.fromEntries(optionIds.map(optionId => [
    optionId, initialTops.filter(top => top === optionId).length,
  ]));
  if (new Set(initialTops).size < 2 || histogram[outcome] < 1
    || histogram[sharedTop] < 2 || histogram[sharedTop] >= task.agentIds.length) {
    throw new Error("controlled_task_initial_state_invalid");
  }
  const revealedScores = sumScores([...shared, ...privateCards, ...withheld], optionIds);
  if (uniqueTop(revealedScores) !== outcome
    || outcomeMargin(revealedScores, outcome) <= outcomeMargin(formationScores, outcome)) {
    throw new Error("controlled_task_withheld_information_gain_invalid");
  }
  const { contentHash: _contentHash, ...body } = task;
  if (task.contentHash !== hash(body)) throw new Error("controlled_task_hash_invalid");
}

function publicEvidence(item: ControlledWrongStateEvidenceV1) {
  const { availability: _availability, ownerAgentId: _ownerAgentId, ...visible } = item;
  return structuredClone(visible);
}

export function projectControlledWrongStateOnlineTaskV1(
  task: ControlledWrongStateTaskV1,
): Readonly<ControlledWrongStateOnlineTaskV1> {
  validateControlledWrongStateTaskV1(task);
  const shared = task.evidence.filter(item => item.availability === "shared");
  const projected: ControlledWrongStateOnlineTaskV1 = {
    taskId: task.taskId,
    publicContext: task.publicContext,
    options: structuredClone(task.options),
    sharedEvidence: shared.map(publicEvidence),
    agents: task.agentIds.map(agentId => ({
      agentId,
      privateEvidence: task.evidence
        .filter(item => item.availability === "private" && item.ownerAgentId === agentId)
        .map(publicEvidence),
    })),
  };
  const serialized = JSON.stringify(projected);
  const withheld = task.evidence.find(item => item.availability === "withheld")!;
  if (serialized.includes(task.resolver.outcomeOptionId)
    && !task.options.some(option => option.optionId === task.resolver.outcomeOptionId)) {
    throw new Error("controlled_task_projection_outcome_leak");
  }
  if (serialized.includes(withheld.evidenceId) || serialized.includes(withheld.statement)
    || serialized.includes("outcomeOptionId") || serialized.includes("resolver")) {
    throw new Error("controlled_task_projection_withheld_leak");
  }
  return deepFreeze(projected);
}

export function buildControlledWrongStateAutomaticReviewV1(
  task: ControlledWrongStateTaskV1,
): Readonly<ControlledWrongStateAutomaticReviewV1> {
  validateControlledWrongStateTaskV1(task);
  const optionIds = task.options.map(option => option.optionId);
  const shared = task.evidence.filter(item => item.availability === "shared");
  const privateCards = task.evidence.filter(item => item.availability === "private");
  const withheld = task.evidence.filter(item => item.availability === "withheld");
  const outcome = task.resolver.outcomeOptionId;
  const sharedTop = uniqueTop(sumScores(shared, optionIds));
  const formationScores = sumScores([...shared, ...privateCards], optionIds);
  const revealedScores = sumScores([...shared, ...privateCards, ...withheld], optionIds);
  const initialTops = task.agentIds.map(agentId => uniqueTop(sumScores([
    ...shared, ...privateCards.filter(item => item.ownerAgentId === agentId),
  ], optionIds)));
  const constructedInitialTopHistogram = Object.fromEntries(optionIds.map(optionId => [
    optionId, initialTops.filter(top => top === optionId).length,
  ]));
  projectControlledWrongStateOnlineTaskV1(task);
  return deepFreeze({
    taskId: task.taskId,
    clusterId: task.clusterId,
    semanticGroupId: task.semanticGroupId,
    leakageGroupId: task.leakageGroupId,
    mirrorOfTaskId: task.mirrorOfTaskId,
    constructedInitialTopHistogram,
    sharedCueTopOptionId: sharedTop,
    formationEvidenceTopOptionId: uniqueTop(formationScores),
    withheldEvidenceTopOptionId: uniqueTop(sumScores(withheld, optionIds)),
    formationOutcomeMargin: outcomeMargin(formationScores, outcome),
    postRevealOutcomeMargin: outcomeMargin(revealedScores, outcome),
    checks: {
      threeOptions: true,
      fourAgents: true,
      constructedInitialTopsHeterogeneous: true,
      constructedWrongPluralityAtInitialView: true,
      aggregateFormationEvidenceSupportsOutcome: true,
      sharedCueIsPlausiblyMisleading: true,
      withheldObservationSupportsOutcome: true,
      withheldObservationIncreasesOutcomeMargin: true,
      onlineProjectionTruthBlind: true,
    },
    humanReview: { status: "PENDING", requiredQuestions: [...REVIEW_QUESTIONS] },
  });
}

const BASE_TASKS = [
  baseTask({
    slug: "industrial-cooling",
    semanticGroupId: "semantic:industrial-diagnostics",
    publicContext: "A production line stopped after a combined vibration and temperature alarm. Determine the most likely primary fault.",
    labels: ["Bearing wear", "Coolant-flow blockage", "Sensor calibration drift"],
    outcomeIndex: 1,
    sharedScores: [1.2, 0.2, 0],
    privateScores: [[0.5, 0, 0], [0.2, 0, 0], [0, 2, 0], [0, 0.8, 1.3]],
    withheldScores: [0, 1.8, 0],
    statements: [
      "The broad vibration alarm is elevated.",
      "A rotational harmonic is visible in the local acoustic trace.",
      "An operator heard intermittent scraping before shutdown.",
      "Temperature rose while rotational speed remained steady.",
      "The local calibration reference shifted slightly, and the coolant gauge also fell.",
      "An independent flow-meter test reports severe coolant restriction.",
    ],
  }),
  baseTask({
    slug: "network-incident",
    semanticGroupId: "semantic:cyber-incident-triage",
    publicContext: "A service became intermittently unavailable. Determine the most likely primary incident class.",
    labels: ["Distributed traffic flood", "Credential compromise", "DNS configuration fault"],
    outcomeIndex: 1,
    sharedScores: [1.4, 0.1, 0],
    privateScores: [[0.3, 0, 0], [0.2, 0, 0], [0, 1.8, 0], [0, 0.9, 1.5]],
    withheldScores: [0, 2, 0],
    statements: [
      "Ingress packet volume spiked shortly before the outage.",
      "One edge region shows a high rate of short-lived connections.",
      "The public status page received repeated refresh traffic.",
      "Administrative sessions originated from a previously unseen token lineage.",
      "Resolver logs show one stale record while an audit trail also flags unusual privilege use.",
      "A separately governed identity audit confirms reuse of a revoked administrator token.",
    ],
  }),
  baseTask({
    slug: "watershed-source",
    semanticGroupId: "semantic:environmental-source-attribution",
    publicContext: "A lake experienced a sudden oxygen decline. Determine the most likely primary driver.",
    labels: ["Seasonal algal turnover", "Industrial thermal discharge", "Fertilizer runoff"],
    outcomeIndex: 2,
    sharedScores: [1.1, 0, 0.2],
    privateScores: [[0.6, 0, 0], [0.3, 0, 0], [0, 0, 1.4], [0, 1.25, 0.7]],
    withheldScores: [0, 0, 1.7],
    statements: [
      "Surface chlorophyll rose during the week before oxygen declined.",
      "A nearby bay also shows a normal seasonal color change.",
      "Historical records place a turnover event in the same month.",
      "Upstream nitrate concentration rose sharply after rainfall.",
      "A thermal camera shows a mild warm plume, while a tributary sampler also detects phosphate.",
      "An independent isotope assay attributes the nutrient pulse to agricultural fertilizer.",
    ],
  }),
  baseTask({
    slug: "shipment-delay",
    semanticGroupId: "semantic:supply-chain-root-cause",
    publicContext: "A priority shipment missed its delivery window. Determine the most likely primary delay source.",
    labels: ["Customs documentation hold", "Warehouse picking backlog", "Carrier routing error"],
    outcomeIndex: 0,
    sharedScores: [0.1, 0, 1.3],
    privateScores: [[0, 0, 0.4], [0, 0, 0.25], [1.6, 0, 0], [0.8, 1.4, 0]],
    withheldScores: [1.9, 0, 0],
    statements: [
      "The carrier dashboard first marked the parcel as routed to the wrong hub.",
      "A local scan shows an unexpected transfer-code transition.",
      "The route history contains one additional unscheduled hub event.",
      "The export document checksum does not match the customs submission record.",
      "Warehouse queue time was elevated, and one document field was resubmitted.",
      "A customs portal receipt independently confirms an active documentation hold.",
    ],
  }),
] as const;

export const CONTROLLED_WRONG_STATE_TASK_BANK_V1 = deepFreeze(
  BASE_TASKS.flatMap((task, index) => {
    const mirrorRemaps = [
      { opt_1: "opt_2", opt_2: "opt_1", opt_3: "opt_3" },
      { opt_1: "opt_2", opt_2: "opt_3", opt_3: "opt_1" },
      { opt_1: "opt_3", opt_2: "opt_2", opt_3: "opt_1" },
      { opt_1: "opt_3", opt_2: "opt_1", opt_3: "opt_2" },
    ] as const;
    return [task, mirrorTask(task, mirrorRemaps[index])];
  }),
);

export const CONTROLLED_WRONG_STATE_REVIEW_PACKET_V1 = deepFreeze(
  CONTROLLED_WRONG_STATE_TASK_BANK_V1.map(buildControlledWrongStateAutomaticReviewV1),
);
