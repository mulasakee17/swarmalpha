import { describe, expect, it } from "vitest";
import {
  DISCUSSION_THERMOMETER_STATE_V1,
  fingerprintEstimatorValue,
  projectDiscussionThermometerStateV1,
  projectCollectiveDecisionProcessStateV0,
  type CollectiveDecisionProcessStateInputV0,
  type CollectiveDecisionProcessStateV0,
  type DiscussionActV0,
  type RegisteredEvidenceUnitV0,
} from "@/lib/epistemic";

type JsonRecord = Record<string, unknown>;
type State = Readonly<CollectiveDecisionProcessStateV0>;

type CaseSpec = {
  caseFamily: "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  caseId: string;
  targetChannel: string;
  declaredInputMutationPaths: string[];
  derivedOutputClosurePaths: string[];
  ablationTopLevelPaths: string[];
  ablationSourceFingerprintKeys: string[];
  ablationMissingnessChannels: string[];
  actionRef: { id: string; version: string };
  witnessPath: string[];
  rationale: string;
  expectedUnavailableReasons?: { stateA: string[]; stateB: string[] };
  makePair: () => [CollectiveDecisionProcessStateInputV0, CollectiveDecisionProcessStateInputV0];
};

type CaseResult = {
  caseFamily: CaseSpec["caseFamily"];
  caseId: string;
  targetChannel: string;
  inputValidation: "pass" | "invalid";
  declaredInputMutationPaths: string[];
  derivedOutputClosurePaths: string[];
  baselineTies: {
    probabilityOnly: boolean;
    structuredActCount: boolean;
    registeredSourceCount: boolean;
  };
  fullStateDistinct: boolean;
  differencesOutsideDeclaredClosure: string[];
  actionInputWitness: {
    actionRef: { id: string; version: string };
    fieldPath: string;
    valuesDiffer: boolean;
    rationale: string;
  } | null;
  ablationCollapsesDifference: boolean;
  unavailableReasons: { stateA: string[]; stateB: string[] };
  stateAContentHash: string | null;
  stateBContentHash: string | null;
  ablationAComparisonHash: string | null;
  ablationBComparisonHash: string | null;
  failureReason: string | null;
};

const claimId = "claim:q0";
const optionIds = ["approve", "reject"];
const agentIds = ["a1", "a2", "a3"];

const fixedThermometerState = projectDiscussionThermometerStateV1({
  claimId,
  checkpointId: "checkpoint:q0",
  checkpointIndex: 1,
  optionIds,
  expectedAgentIds: agentIds,
  reportPairs: [
    { agentId: "a1", A: { status: "valid", probabilitiesByOptionId: { approve: 0.7, reject: 0.3 } }, B: { status: "valid", probabilitiesByOptionId: { approve: 0.7, reject: 0.3 } } },
    { agentId: "a2", A: { status: "valid", probabilitiesByOptionId: { approve: 0.4, reject: 0.6 } }, B: { status: "valid", probabilitiesByOptionId: { approve: 0.4, reject: 0.6 } } },
    { agentId: "a3", A: { status: "valid", probabilitiesByOptionId: { approve: 0.5, reject: 0.5 } }, B: { status: "valid", probabilitiesByOptionId: { approve: 0.5, reject: 0.5 } } },
  ],
  sensorRef: { id: "sensor:q0", version: "1" },
  snapshotHash: "synthetic:q0",
});

const fixedActionCandidates = [
  { candidateId: "c1", actionRef: { id: "action:acquire-unit", version: "1" }, available: true },
  { candidateId: "c2", actionRef: { id: "action:follow-up", version: "1" }, available: true },
  { candidateId: "c3", actionRef: { id: "action:new-source", version: "1" }, available: true },
  { candidateId: "c4", actionRef: { id: "action:response-routing", version: "1" }, available: true },
  { candidateId: "c5", actionRef: { id: "action:assignment", version: "1" }, available: true },
  { candidateId: "c6", actionRef: { id: "action:resource-sensitive", version: "1" }, available: true },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function unit(id: string, lineageId = `lineage:${id}`, duplicateGroupId = "duplicate:shared"): RegisteredEvidenceUnitV0 {
  return {
    evidenceUnitId: id,
    claimId,
    sourceRef: { id: `source:${id}`, kind: "dataset" },
    lineage: { id: lineageId, basis: "declared" },
    duplicateMembership: { groupId: duplicateGroupId, basis: "deterministic" },
  };
}

function act(
  actId: string,
  agentId: string,
  eventSequence: number,
  evidenceUnitIds: string[],
  respondsToActIds: string[] = [],
): DiscussionActV0 {
  return {
    actId,
    agentId,
    checkpointIndex: 1,
    eventSequence,
    actKind: "cite",
    evidenceUnitIds,
    respondsToActIds,
    observationBasis: "architecture_recorded",
  };
}

function baseInput(): CollectiveDecisionProcessStateInputV0 {
  return {
    claimId,
    checkpointIndex: 1,
    asOfSequence: 100,
    optionIds: [...optionIds],
    expectedAgentIds: [...agentIds],
    registeredEvidencePool: {
      denominatorStatus: "registered_complete",
      lineageObservationStatus: "complete",
      duplicateObservationStatus: "complete",
      units: [unit("e1"), unit("e2"), unit("e3"), unit("e4")],
    },
    exposureLog: {
      observationStatus: "complete",
      unavailableReason: null,
      records: [{ exposureId: "x1", evidenceUnitId: "e1", targetAgentId: "a1", checkpointIndex: 1, eventSequence: 1, channel: "private" }],
    },
    discussionActLog: { observationStatus: "complete", unavailableReason: null, acts: [] },
    beliefChoice: {
      thermometerStateRef: {
        schemaRef: DISCUSSION_THERMOMETER_STATE_V1,
        claimId,
        checkpointIndex: 1,
        optionIds: [...optionIds],
        contentHash: fixedThermometerState.contentHash,
      },
      publicChoiceObservationStatus: "complete",
      publicChoiceUnavailableReason: null,
      publicChoices: [],
    },
    agentContexts: [
      { agentId: "a1", modelRef: { id: "model:a1", version: "1" }, declaredCapabilityClass: "cap:a1", roleRef: { id: "role:a1", version: "1" }, informationAccessRef: { id: "access:a1", version: "1" }, speakerOrder: 1, authorityRef: { id: "authority:a1", version: "1" } },
      { agentId: "a2", modelRef: { id: "model:a2", version: "1" }, declaredCapabilityClass: "cap:a2", roleRef: { id: "role:a2", version: "1" }, informationAccessRef: { id: "access:a2", version: "1" }, speakerOrder: 2, authorityRef: { id: "authority:a2", version: "1" } },
      { agentId: "a3", modelRef: { id: "model:a3", version: "1" }, declaredCapabilityClass: "cap:a3", roleRef: { id: "role:a3", version: "1" }, informationAccessRef: { id: "access:a3", version: "1" }, speakerOrder: 3, authorityRef: { id: "authority:a3", version: "1" } },
    ],
    resources: {
      observedUse: { observationStatus: "complete", unavailableReason: null, promptTokens: 10, completionTokens: 5, totalTokens: 15, totalLatencyMs: 20, invalidOrFailed: 0 },
      budgetBefore: { observationStatus: "complete", unavailableReason: null, computeUnits: 100, latencyUnits: 100 },
      candidateActionSurface: { observationStatus: "complete", unavailableReason: null, candidates: clone(fixedActionCandidates) },
    },
  };
}

function withPair(changeA: (input: CollectiveDecisionProcessStateInputV0) => void, changeB: (input: CollectiveDecisionProcessStateInputV0) => void): [CollectiveDecisionProcessStateInputV0, CollectiveDecisionProcessStateInputV0] {
  const stateA = baseInput();
  const stateB = clone(stateA);
  changeA(stateA);
  changeB(stateB);
  return [stateA, stateB];
}

function inputDiffPaths(left: unknown, right: unknown, path = ""): string[] {
  if (Object.is(left, right)) return [];
  if (Array.isArray(left) && Array.isArray(right)) {
    const paths: string[] = [];
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      paths.push(...inputDiffPaths(left[index], right[index], `${path}[${index}]`));
    }
    return paths;
  }
  if (left !== null && right !== null && typeof left === "object" && typeof right === "object") {
    const keys = new Set([...Object.keys(left as JsonRecord), ...Object.keys(right as JsonRecord)]);
    const paths: string[] = [];
    for (const key of [...keys].sort()) {
      paths.push(...inputDiffPaths((left as JsonRecord)[key], (right as JsonRecord)[key], path ? `${path}.${key}` : key));
    }
    return paths;
  }
  return [path];
}

function pathCovered(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`));
}

function readPath(value: unknown, path: string[]): unknown {
  let current = value as unknown;
  for (const segment of path) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as JsonRecord)[segment];
  }
  return current;
}

function outputDifferences(left: State, right: State): string[] {
  return inputDiffPaths(left, right);
}

function unavailableReasons(state: State): string[] {
  return state.resources.missingness.map(item => `${item.channel}:${item.reason}`);
}

function probabilityBaselineSignature(): string {
  return fingerprintEstimatorValue({
    microstate: fixedThermometerState.microstate,
    macrostate: fixedThermometerState.macrostate,
  });
}

function usesFixedThermometerReference(input: CollectiveDecisionProcessStateInputV0): boolean {
  return fingerprintEstimatorValue(input.beliefChoice.thermometerStateRef) === fingerprintEstimatorValue({
    schemaRef: DISCUSSION_THERMOMETER_STATE_V1,
    claimId,
    checkpointIndex: 1,
    optionIds,
    contentHash: fixedThermometerState.contentHash,
  });
}

function structuredActCountBaselineSignature(input: CollectiveDecisionProcessStateInputV0): string {
  return fingerprintEstimatorValue(input.discussionActLog.acts.length);
}

function registeredSourceCountBaselineSignature(input: CollectiveDecisionProcessStateInputV0): string {
  return fingerprintEstimatorValue(new Set(input.registeredEvidencePool.units.map(unitValue => unitValue.sourceRef.id)).size);
}

function hasForbiddenTruthField(value: unknown): boolean {
  return /groundTruth|correctAnswer|resolution|finalOutcome|quality|utility|evaluator/.test(JSON.stringify(value));
}

function comparisonView(state: State, spec: CaseSpec): JsonRecord {
  const view = clone(state) as unknown as JsonRecord;
  for (const path of spec.ablationTopLevelPaths) delete view[path];
  const fingerprints = view.sourceFingerprints as JsonRecord;
  for (const key of spec.ablationSourceFingerprintKeys) delete fingerprints[key];
  if (spec.ablationMissingnessChannels.length > 0) {
    const resources = view.resources as JsonRecord | undefined;
    if (resources !== undefined) {
      resources.missingness = (resources.missingness as Array<{ channel: string }>).filter(item => !spec.ablationMissingnessChannels.includes(item.channel));
    }
  }
  delete view.contentHash;
  return view;
}

function caseResult(spec: CaseSpec): CaseResult {
  const [inputA, inputB] = spec.makePair();
  const inputDifferences = inputDiffPaths(inputA, inputB);
  const inputMutationIsScoped = inputDifferences.length > 0 && inputDifferences.every(path => pathCovered(path, spec.declaredInputMutationPaths));
  let stateA: State | null = null;
  let stateB: State | null = null;
  try {
    stateA = projectCollectiveDecisionProcessStateV0(inputA);
    stateB = projectCollectiveDecisionProcessStateV0(inputB);
  } catch (error) {
    return {
      caseFamily: spec.caseFamily,
      caseId: spec.caseId,
      targetChannel: spec.targetChannel,
      inputValidation: "invalid",
      declaredInputMutationPaths: spec.declaredInputMutationPaths,
      derivedOutputClosurePaths: spec.derivedOutputClosurePaths,
      baselineTies: { probabilityOnly: false, structuredActCount: false, registeredSourceCount: false },
      fullStateDistinct: false,
      differencesOutsideDeclaredClosure: [],
      actionInputWitness: null,
      ablationCollapsesDifference: false,
      unavailableReasons: { stateA: [], stateB: [] },
      stateAContentHash: null,
      stateBContentHash: null,
      ablationAComparisonHash: null,
      ablationBComparisonHash: null,
      failureReason: `projector threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const stateDifferences = outputDifferences(stateA, stateB);
  const differencesOutsideDeclaredClosure = stateDifferences.filter(path => !pathCovered(path, spec.derivedOutputClosurePaths));
  const baselineTies = {
    probabilityOnly: usesFixedThermometerReference(inputA)
      && usesFixedThermometerReference(inputB)
      && probabilityBaselineSignature() === probabilityBaselineSignature(),
    structuredActCount: structuredActCountBaselineSignature(inputA) === structuredActCountBaselineSignature(inputB),
    registeredSourceCount: registeredSourceCountBaselineSignature(inputA) === registeredSourceCountBaselineSignature(inputB),
  };
  const witnessA = readPath(stateA, spec.witnessPath);
  const witnessB = readPath(stateB, spec.witnessPath);
  const actionInputWitness = {
    actionRef: spec.actionRef,
    fieldPath: spec.witnessPath.map((segment, index) => index === 0 ? segment : /^\d+$/.test(segment) ? `[${segment}]` : `.${segment}`).join(""),
    valuesDiffer: fingerprintEstimatorValue(witnessA) !== fingerprintEstimatorValue(witnessB),
    rationale: spec.rationale,
  };
  const ablationAComparisonHash = fingerprintEstimatorValue(comparisonView(stateA, spec));
  const ablationBComparisonHash = fingerprintEstimatorValue(comparisonView(stateB, spec));
  const failureReasons: string[] = [];
  if (!inputMutationIsScoped) failureReasons.push(`input mutation escaped declaration: ${inputDifferences.join(", ")}`);
  if (!baselineTies.probabilityOnly || !baselineTies.structuredActCount || !baselineTies.registeredSourceCount) failureReasons.push("baseline tie failed");
  if (stateA.contentHash === stateB.contentHash) failureReasons.push("full content hash did not differ");
  if (differencesOutsideDeclaredClosure.length > 0) failureReasons.push(`output differences escaped closure: ${differencesOutsideDeclaredClosure.join(", ")}`);
  if (!actionInputWitness.valuesDiffer) failureReasons.push("action input witness did not differ");
  if (ablationAComparisonHash !== ablationBComparisonHash) failureReasons.push("ablation did not collapse difference");
  const candidateActionRefs = stateA.resources.candidateActionSurface.candidates.map(candidate => candidate.actionRef);
  if (!candidateActionRefs.some(candidate => fingerprintEstimatorValue(candidate) === fingerprintEstimatorValue(spec.actionRef))) failureReasons.push("action input witness references an unregistered candidate");
  const candidateActionRefsB = stateB.resources.candidateActionSurface.candidates.map(candidate => candidate.actionRef);
  if (!candidateActionRefsB.some(candidate => fingerprintEstimatorValue(candidate) === fingerprintEstimatorValue(spec.actionRef))) failureReasons.push("action input witness is not shared by both states");
  const expectedUnavailableReasons = spec.expectedUnavailableReasons ?? { stateA: [], stateB: [] };
  const actualUnavailableReasons = { stateA: unavailableReasons(stateA), stateB: unavailableReasons(stateB) };
  if (fingerprintEstimatorValue(actualUnavailableReasons) !== fingerprintEstimatorValue(expectedUnavailableReasons)) failureReasons.push("unavailable reasons differ from the frozen fixture expectation");
  if (hasForbiddenTruthField({ inputA, inputB, stateA, stateB })) failureReasons.push("truth or offline outcome field reached the online qualification path");
  return {
    caseFamily: spec.caseFamily,
    caseId: spec.caseId,
    targetChannel: spec.targetChannel,
    inputValidation: "pass",
    declaredInputMutationPaths: spec.declaredInputMutationPaths,
    derivedOutputClosurePaths: spec.derivedOutputClosurePaths,
    baselineTies,
    fullStateDistinct: stateA.contentHash !== stateB.contentHash,
    differencesOutsideDeclaredClosure,
    actionInputWitness,
    ablationCollapsesDifference: ablationAComparisonHash === ablationBComparisonHash,
    unavailableReasons: { stateA: unavailableReasons(stateA), stateB: unavailableReasons(stateB) },
    stateAContentHash: stateA.contentHash,
    stateBContentHash: stateB.contentHash,
    ablationAComparisonHash,
    ablationBComparisonHash,
    failureReason: failureReasons.length > 0 ? failureReasons.join("; ") : null,
  };
}

const specs: CaseSpec[] = [
  {
    caseFamily: "C1", caseId: "C1-exposure-coverage", targetChannel: "registered_information",
    declaredInputMutationPaths: ["exposureLog.records"],
    derivedOutputClosurePaths: ["registeredInformation", "discussionUtilization", "sourceFingerprints.exposureLog", "contentHash"],
    ablationTopLevelPaths: ["registeredInformation", "discussionUtilization"], ablationSourceFingerprintKeys: ["exposureLog"], ablationMissingnessChannels: ["registered_information", "discussion_utilization"],
    actionRef: { id: "action:acquire-unit", version: "1" }, witnessPath: ["registeredInformation", "unexposedRegisteredUnitIds"], rationale: "后续信息获取策略需要读取尚未暴露的 registered unit 集合。",
    makePair: () => withPair(
      input => undefined,
      input => { input.exposureLog.records.push({ exposureId: "x2", evidenceUnitId: "e2", targetAgentId: "a1", checkpointIndex: 1, eventSequence: 2, channel: "private" }); },
    ),
  },
  {
    caseFamily: "C1", caseId: "C1-exposure-missing", targetChannel: "registered_information",
    declaredInputMutationPaths: ["exposureLog.observationStatus", "exposureLog.unavailableReason", "exposureLog.records"],
    derivedOutputClosurePaths: ["registeredInformation", "discussionUtilization", "resources.missingness", "sourceFingerprints.exposureLog", "contentHash"],
    ablationTopLevelPaths: ["registeredInformation", "discussionUtilization"], ablationSourceFingerprintKeys: ["exposureLog"], ablationMissingnessChannels: ["registered_information", "discussion_utilization"],
    actionRef: { id: "action:acquire-unit", version: "1" }, witnessPath: ["registeredInformation", "registeredPoolCoverage"], rationale: "后续信息获取策略需要知道 coverage 是可观测数值还是 exposure observation 缺失。",
    expectedUnavailableReasons: { stateA: [], stateB: ["discussion_utilization:not_collected", "registered_information:not_collected"] },
    makePair: () => withPair(
      input => undefined,
      input => { input.exposureLog = { observationStatus: "missing", unavailableReason: "not_collected", records: [] }; },
    ),
  },
  {
    caseFamily: "C2", caseId: "C2-utilization", targetChannel: "discussion_utilization",
    declaredInputMutationPaths: ["discussionActLog.acts"],
    derivedOutputClosurePaths: ["discussionUtilization", "sourceFingerprints.discussionActLog", "contentHash"],
    ablationTopLevelPaths: ["discussionUtilization"], ablationSourceFingerprintKeys: ["discussionActLog"], ablationMissingnessChannels: ["discussion_utilization"],
    actionRef: { id: "action:follow-up", version: "1" }, witnessPath: ["discussionUtilization", "utilizedUnitIds"], rationale: "后续结构化 follow-up 策略需要读取哪些已暴露 unit 被显式利用。",
    makePair: () => withPair(
      input => { input.discussionActLog.acts = [act("d1", "a1", 2, [])]; },
      input => { input.discussionActLog.acts = [act("d1", "a1", 2, ["e1"])]; },
    ),
  },
  {
    caseFamily: "C3", caseId: "C3-lineage", targetChannel: "source_dependence",
    declaredInputMutationPaths: ["registeredEvidencePool.units[1].lineage.id"],
    derivedOutputClosurePaths: ["sourceDependence", "sourceFingerprints.registeredEvidencePool", "contentHash"],
    ablationTopLevelPaths: ["sourceDependence"], ablationSourceFingerprintKeys: ["registeredEvidencePool"], ablationMissingnessChannels: ["source_dependence_lineage"],
    actionRef: { id: "action:new-source", version: "1" }, witnessPath: ["sourceDependence", "recordedLineageCount"], rationale: "后续新来源获取策略需要读取已记录的 lineage 关系结构。",
    makePair: () => withPair(
      input => { input.registeredEvidencePool.units[1].lineage = { id: "lineage:e1", basis: "declared" }; },
      input => undefined,
    ),
  },
  {
    caseFamily: "C3", caseId: "C3-duplicate", targetChannel: "source_dependence",
    declaredInputMutationPaths: ["registeredEvidencePool.units[1].duplicateMembership.groupId"],
    derivedOutputClosurePaths: ["sourceDependence", "sourceFingerprints.registeredEvidencePool", "contentHash"],
    ablationTopLevelPaths: ["sourceDependence"], ablationSourceFingerprintKeys: ["registeredEvidencePool"], ablationMissingnessChannels: ["source_dependence_duplicate"],
    actionRef: { id: "action:new-source", version: "1" }, witnessPath: ["sourceDependence", "observedDuplicateGroupCount"], rationale: "后续新来源获取策略需要读取 duplicate group 关系是否改变。",
    makePair: () => withPair(
      input => undefined,
      input => { input.registeredEvidencePool.units[1].duplicateMembership = { groupId: "duplicate:distinct", basis: "deterministic" }; },
    ),
  },
  {
    caseFamily: "C4", caseId: "C4-response", targetChannel: "participation_response",
    declaredInputMutationPaths: ["discussionActLog.acts"],
    derivedOutputClosurePaths: ["participationResponse", "sourceFingerprints.discussionActLog", "contentHash"],
    ablationTopLevelPaths: ["participationResponse"], ablationSourceFingerprintKeys: ["discussionActLog"], ablationMissingnessChannels: ["participation_response"],
    actionRef: { id: "action:response-routing", version: "1" }, witnessPath: ["participationResponse", "responseEdges"], rationale: "后续 response-routing 策略需要读取显式 response edge。",
    makePair: () => withPair(
      input => {
        input.exposureLog.records.push({ exposureId: "x2", evidenceUnitId: "e2", targetAgentId: "a2", checkpointIndex: 1, eventSequence: 2, channel: "private" });
        input.discussionActLog.acts = [act("d1", "a1", 3, ["e1"]), act("d2", "a2", 4, ["e2"])];
      },
      input => {
        input.exposureLog.records.push({ exposureId: "x2", evidenceUnitId: "e2", targetAgentId: "a2", checkpointIndex: 1, eventSequence: 2, channel: "private" });
        input.discussionActLog.acts = [act("d1", "a1", 3, ["e1"]), act("d2", "a2", 4, ["e2"], ["d1"])];
      },
    ),
  },
];

const heterogeneityFields: Array<{ caseId: string; field: "modelRef" | "declaredCapabilityClass" | "roleRef" | "informationAccessRef" | "speakerOrder" | "authorityRef"; targetChannel: string; actionRef: { id: string; version: string }; value: unknown; }> = [
  { caseId: "C5-model", field: "modelRef", targetChannel: "heterogeneity", actionRef: { id: "action:assignment", version: "1" }, value: { id: "model:alternate", version: "1" } },
  { caseId: "C5-capability", field: "declaredCapabilityClass", targetChannel: "heterogeneity", actionRef: { id: "action:assignment", version: "1" }, value: "cap:alternate" },
  { caseId: "C5-role", field: "roleRef", targetChannel: "heterogeneity", actionRef: { id: "action:assignment", version: "1" }, value: { id: "role:alternate", version: "1" } },
  { caseId: "C5-access", field: "informationAccessRef", targetChannel: "heterogeneity", actionRef: { id: "action:follow-up", version: "1" }, value: { id: "access:alternate", version: "1" } },
  { caseId: "C5-order", field: "speakerOrder", targetChannel: "heterogeneity", actionRef: { id: "action:response-routing", version: "1" }, value: 99 },
  { caseId: "C5-authority", field: "authorityRef", targetChannel: "heterogeneity", actionRef: { id: "action:assignment", version: "1" }, value: { id: "authority:alternate", version: "1" } },
];

for (const heterogeneityField of heterogeneityFields) {
  specs.push({
    caseFamily: "C5", caseId: heterogeneityField.caseId, targetChannel: heterogeneityField.targetChannel,
    declaredInputMutationPaths: [`agentContexts[0].${heterogeneityField.field}`],
    derivedOutputClosurePaths: ["heterogeneity", "sourceFingerprints.agentContexts", "contentHash"],
    ablationTopLevelPaths: ["heterogeneity"], ablationSourceFingerprintKeys: ["agentContexts"], ablationMissingnessChannels: [],
    actionRef: heterogeneityField.actionRef, witnessPath: ["heterogeneity", "agentContexts", "0", heterogeneityField.field], rationale: `后续候选动作需要读取 agentContexts 中的 ${heterogeneityField.field}。`,
    makePair: () => withPair(
      input => undefined,
      input => { (input.agentContexts[0] as unknown as JsonRecord)[heterogeneityField.field] = clone(heterogeneityField.value); },
    ),
  });
}

specs.push(
  {
    caseFamily: "C6", caseId: "C6-use", targetChannel: "resources",
    declaredInputMutationPaths: ["resources.observedUse"], derivedOutputClosurePaths: ["resources", "sourceFingerprints.resources", "contentHash"],
    ablationTopLevelPaths: ["resources"], ablationSourceFingerprintKeys: ["resources"], ablationMissingnessChannels: ["resource_use"],
    actionRef: { id: "action:resource-sensitive", version: "1" }, witnessPath: ["resources", "observedUse", "totalTokens"], rationale: "后续资源敏感候选动作需要读取已观察的资源使用量。",
    expectedUnavailableReasons: { stateA: [], stateB: ["resource_use:not_collected"] },
    makePair: () => withPair(
      input => { input.resources.observedUse = { observationStatus: "complete", unavailableReason: null, promptTokens: 0, completionTokens: 0, totalTokens: 0, totalLatencyMs: 0, invalidOrFailed: 0 }; },
      input => { input.resources.observedUse = { observationStatus: "missing", unavailableReason: "not_collected", promptTokens: null, completionTokens: null, totalTokens: null, totalLatencyMs: null, invalidOrFailed: null }; },
    ),
  },
  {
    caseFamily: "C6", caseId: "C6-budget", targetChannel: "resources",
    declaredInputMutationPaths: ["resources.budgetBefore"], derivedOutputClosurePaths: ["resources", "sourceFingerprints.resources", "contentHash"],
    ablationTopLevelPaths: ["resources"], ablationSourceFingerprintKeys: ["resources"], ablationMissingnessChannels: ["resource_budget"],
    actionRef: { id: "action:resource-sensitive", version: "1" }, witnessPath: ["resources", "budgetBefore", "computeUnits"], rationale: "后续资源敏感候选动作需要读取动作前预算。",
    makePair: () => withPair(
      input => undefined,
      input => { input.resources.budgetBefore = { observationStatus: "complete", unavailableReason: null, computeUnits: 50, latencyUnits: 100 }; },
    ),
  },
  {
    caseFamily: "C6", caseId: "C6-action-surface", targetChannel: "action_surface",
    declaredInputMutationPaths: ["resources.candidateActionSurface.candidates[0].available"], derivedOutputClosurePaths: ["resources", "sourceFingerprints.resources", "contentHash"],
    ablationTopLevelPaths: ["resources"], ablationSourceFingerprintKeys: ["resources"], ablationMissingnessChannels: ["action_surface"],
    actionRef: { id: "action:acquire-unit", version: "1" }, witnessPath: ["resources", "candidateActionSurface", "candidates", "0", "available"], rationale: "后续策略需要读取固定候选动作当前是否可用。",
    makePair: () => withPair(
      input => undefined,
      input => { input.resources.candidateActionSurface.candidates[0].available = false; },
    ),
  },
);

describe("CollectiveDecisionProcessStateV0 Q0 qualification", () => {
  it("runs the frozen 15-pair, zero-provider qualification contract", () => {
    expect(specs).toHaveLength(15);
    const results = specs.map(caseResult);
    expect(results.filter(result => result.failureReason !== null).map(result => ({ caseId: result.caseId, failureReason: result.failureReason }))).toEqual([]);
    expect(results.every(result => result.baselineTies.probabilityOnly)).toBe(true);
    expect(results.every(result => result.baselineTies.structuredActCount)).toBe(true);
    expect(results.every(result => result.baselineTies.registeredSourceCount)).toBe(true);
    expect(results.every(result => result.fullStateDistinct)).toBe(true);
    expect(results.every(result => result.actionInputWitness?.valuesDiffer === true)).toBe(true);
    expect(results.every(result => result.ablationCollapsesDifference)).toBe(true);
    expect(results.every(result => result.differencesOutsideDeclaredClosure.length === 0)).toBe(true);
    expect(results.map(result => result.caseId)).toEqual([
      "C1-exposure-coverage", "C1-exposure-missing", "C2-utilization", "C3-lineage", "C3-duplicate", "C4-response",
      "C5-model", "C5-capability", "C5-role", "C5-access", "C5-order", "C5-authority", "C6-use", "C6-budget", "C6-action-surface",
    ]);
  });

  it("uses the fixed probability-only baseline without importing online outcome data", () => {
    const baselineA = probabilityBaselineSignature();
    const baselineB = probabilityBaselineSignature();
    expect(baselineA).toBe(baselineB);
    expect(JSON.stringify(fixedThermometerState)).not.toMatch(/groundTruth|correctAnswer|finalOutcome|quality|utility/);
  });

  it("rejects baseline drift, an incomplete closure, a flat witness, and wrong missingness", () => {
    const baselineDrift = {
      ...specs[0],
      makePair: () => withPair(
        input => undefined,
        input => {
          input.exposureLog.records.push({ exposureId: "x2", evidenceUnitId: "e2", targetAgentId: "a1", checkpointIndex: 1, eventSequence: 2, channel: "private" });
          input.discussionActLog.acts = [act("d1", "a1", 3, [])];
        },
      ),
    };
    const incompleteClosure = { ...specs[0], derivedOutputClosurePaths: ["registeredInformation", "contentHash"], ablationTopLevelPaths: ["registeredInformation"] };
    const flatWitness = { ...specs[0], witnessPath: ["registeredInformation", "registeredDistinctUnitCount"] };
    const wrongMissingness = { ...specs[1], expectedUnavailableReasons: { stateA: [], stateB: [] } };
    for (const invalidSpec of [baselineDrift, incompleteClosure, flatWitness, wrongMissingness]) {
      const result = caseResult(invalidSpec);
      expect(result.inputValidation).toBe("pass");
      expect(result.failureReason).not.toBeNull();
    }
  });
});
