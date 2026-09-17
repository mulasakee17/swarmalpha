import {
  canonicalizeEstimatorValue,
  fingerprintEstimatorValue,
} from "./estimators";

export const COLLECTIVE_DECISION_PROCESS_STATE_V0 = Object.freeze({
  id: "swarmalpha.collective-decision-process-state",
  version: "0.1.0",
});

export type ObservationStatusV0 = "complete" | "partial" | "missing";
export type ObservationUnavailableReasonV0 =
  | null
  | "not_collected"
  | "invalid"
  | "provider_failure"
  | "partial_record";

export interface ContractRefV0 {
  id: string;
  version: string;
}

export interface DiscussionThermometerStateRefV0 {
  schemaRef: ContractRefV0;
  claimId: string;
  checkpointIndex: number;
  optionIds: string[];
  contentHash: string;
}

export interface RegisteredEvidenceUnitV0 {
  evidenceUnitId: string;
  claimId: string;
  sourceRef: {
    id: string;
    kind: "agent" | "tool" | "dataset" | "external";
  };
  lineage: null | {
    id: string;
    basis: "declared" | "ingestion" | "estimated";
  };
  duplicateMembership: null | {
    groupId: string;
    basis: "declared" | "deterministic" | "estimated";
  };
}

export interface RegisteredEvidencePoolV0 {
  denominatorStatus: "registered_complete" | "registered_partial" | "open_world_unknown";
  lineageObservationStatus: ObservationStatusV0;
  duplicateObservationStatus: ObservationStatusV0;
  units: RegisteredEvidenceUnitV0[];
}

export interface EvidenceExposureV0 {
  exposureId: string;
  evidenceUnitId: string;
  targetAgentId: string;
  checkpointIndex: number;
  eventSequence: number;
  channel: "private" | "public" | "tool";
}

export interface ExposureLogV0 {
  observationStatus: ObservationStatusV0;
  unavailableReason: ObservationUnavailableReasonV0;
  records: EvidenceExposureV0[];
}

export type DiscussionActKindV0 =
  | "introduce"
  | "cite"
  | "challenge"
  | "integrate"
  | "conflict_addressed";

export interface DiscussionActV0 {
  actId: string;
  agentId: string;
  checkpointIndex: number;
  eventSequence: number;
  actKind: DiscussionActKindV0;
  evidenceUnitIds: string[];
  respondsToActIds: string[];
  observationBasis: "architecture_recorded";
}

export interface DiscussionActLogV0 {
  observationStatus: ObservationStatusV0;
  unavailableReason: ObservationUnavailableReasonV0;
  acts: DiscussionActV0[];
}

export interface ExplicitPublicChoiceV0 {
  agentId: string;
  choiceId: string;
  checkpointIndex: number;
  eventSequence: number;
}

export interface BeliefChoiceInputV0 {
  thermometerStateRef: DiscussionThermometerStateRefV0 | null;
  publicChoiceObservationStatus: ObservationStatusV0;
  publicChoiceUnavailableReason: ObservationUnavailableReasonV0;
  publicChoices: ExplicitPublicChoiceV0[];
}

export interface AgentProcessContextV0 {
  agentId: string;
  modelRef: ContractRefV0;
  declaredCapabilityClass: string | null;
  roleRef: ContractRefV0 | null;
  informationAccessRef: ContractRefV0 | null;
  speakerOrder: number | null;
  authorityRef: ContractRefV0 | null;
}

export interface ObservedResourceUseV0 {
  observationStatus: ObservationStatusV0;
  unavailableReason: ObservationUnavailableReasonV0;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  totalLatencyMs: number | null;
  invalidOrFailed: number | null;
}

export interface ObservedResourceBudgetV0 {
  observationStatus: ObservationStatusV0;
  unavailableReason: ObservationUnavailableReasonV0;
  computeUnits: number | null;
  latencyUnits: number | null;
}

export interface CandidateActionAvailabilityV0 {
  candidateId: string;
  actionRef: ContractRefV0;
  available: boolean;
}

export interface CandidateActionSurfaceInputV0 {
  observationStatus: ObservationStatusV0;
  unavailableReason: ObservationUnavailableReasonV0;
  candidates: CandidateActionAvailabilityV0[];
}

export interface ResourceStateInputV0 {
  observedUse: ObservedResourceUseV0;
  budgetBefore: ObservedResourceBudgetV0;
  candidateActionSurface: CandidateActionSurfaceInputV0;
}

export interface CollectiveDecisionProcessStateInputV0 {
  claimId: string;
  checkpointIndex: number;
  asOfSequence: number;
  optionIds: string[];
  expectedAgentIds: string[];
  registeredEvidencePool: RegisteredEvidencePoolV0;
  exposureLog: ExposureLogV0;
  discussionActLog: DiscussionActLogV0;
  beliefChoice: BeliefChoiceInputV0;
  agentContexts: AgentProcessContextV0[];
  resources: ResourceStateInputV0;
}

export interface BeliefChoiceStateV0 {
  thermometerStateRef: DiscussionThermometerStateRefV0 | null;
  publicChoiceObservationStatus: ObservationStatusV0;
  publicChoiceUnavailableReason: ObservationUnavailableReasonV0;
  explicitChoiceByAgentId: Record<string, string>;
  observedChoiceCount: number;
  choiceCoverage: number | null;
  missingAgentIds: string[];
  choiceCoverageUnavailableReason: null | "public_choice_observation_incomplete";
}

export interface RegisteredInformationStateV0 {
  denominatorStatus: RegisteredEvidencePoolV0["denominatorStatus"];
  exposureObservationStatus: ObservationStatusV0;
  registeredUnitIds: string[];
  observedExposedUnitIds: string[];
  unexposedRegisteredUnitIds: string[] | null;
  registeredDistinctUnitCount: number;
  observedExposedDistinctUnitCount: number;
  observedExposedUnitIdsByAgentId: Record<string, string[]>;
  registeredPoolCoverage: number | null;
  unavailableReason:
    | null
    | "denominator_not_complete"
    | "exposure_observation_incomplete"
    | "registered_pool_empty";
  interpretation: "registered_unit_exposure_only";
}

export interface SourceDependenceStateV0 {
  lineageObservationStatus: ObservationStatusV0;
  evidenceUnitCountWithLineage: number;
  evidenceUnitCountWithoutLineage: number;
  recordedLineageCount: number | null;
  lineageBasisUnitCount: {
    declared: number;
    ingestion: number;
    estimated: number;
  };
  duplicateObservationStatus: ObservationStatusV0;
  evidenceUnitCountWithDuplicateGroup: number;
  evidenceUnitCountWithoutDuplicateGroup: number;
  observedDuplicateGroupCount: number | null;
  duplicateBasisUnitCount: {
    declared: number;
    deterministic: number;
    estimated: number;
  };
  evidenceUnitDependence: Array<{
    evidenceUnitId: string;
    sourceRef: RegisteredEvidenceUnitV0["sourceRef"];
    lineage: RegisteredEvidenceUnitV0["lineage"];
    duplicateMembership: RegisteredEvidenceUnitV0["duplicateMembership"];
  }>;
  interpretation: "recorded_dependence_description_only";
}

export interface UtilizationCountByKindV0 {
  introduce: number;
  cite: number;
  challenge: number;
  integrate: number;
  conflict_addressed: number;
}

export interface UtilizationRateByKindV0 {
  introduce: number | null;
  cite: number | null;
  challenge: number | null;
  integrate: number | null;
  conflict_addressed: number | null;
}

export interface DiscussionUtilizationStateV0 {
  status: "available" | "unavailable" | "not_applicable";
  exposureObservationStatus: ObservationStatusV0;
  actObservationStatus: ObservationStatusV0;
  denominatorKind: "distinct_exposed_evidence_units";
  eligibleExposedDistinctUnitCount: number | null;
  utilizedDistinctUnitCount: number | null;
  utilizedUnitIds: string[] | null;
  utilizedDistinctUnitCountByKind: UtilizationCountByKindV0;
  utilizationRate: number | null;
  utilizationRateByKind: UtilizationRateByKindV0;
  unusedEligibleUnitCount: number | null;
  unusedEligibleUnitIds: string[] | null;
  unavailableReason:
    | null
    | "exposure_observation_incomplete"
    | "structured_use_observation_incomplete"
    | "no_eligible_exposed_units";
  interpretation: "architecture_observed_use_association_only";
}

export interface ParticipationResponseStateV0 {
  speakingActCountByAgentId: Record<string, number>;
  outgoingResponseEdgeCountByAgentId: Record<string, number>;
  receivedResponseEdgeCountByAgentId: Record<string, number>;
  responseAssociationStatus: "available" | "unavailable";
  responseEdgeCountBySourceAgentId: Record<string, number> | null;
  informationLinkedResponseEdgeCountBySourceAgentId: Record<string, number> | null;
  responseEdges: Array<{
    sourceActId: string;
    targetActId: string;
    sourceAgentId: string;
    targetAgentId: string;
    informationLinked: boolean;
  }> | null;
  unavailableReason: null | "structured_response_observation_incomplete";
  attributionBasis: "explicit_response_edge";
  interpretation: "observed_association_not_causal_influence";
}

export interface MetadataCompletenessByDimensionV0 {
  model: "complete";
  declaredCapabilityClass: ObservationStatusV0;
  role: ObservationStatusV0;
  informationAccess: ObservationStatusV0;
  speakerOrder: ObservationStatusV0;
  authority: ObservationStatusV0;
}

export interface HeterogeneityStateV0 {
  agentContexts: AgentProcessContextV0[];
  metadataCompletenessByDimension: MetadataCompletenessByDimensionV0;
  interpretation: "descriptive_factors_only_not_separable_effects";
}

export type MissingnessChannelV0 =
  | "belief_choice"
  | "registered_information"
  | "source_dependence_lineage"
  | "source_dependence_duplicate"
  | "discussion_utilization"
  | "participation_response"
  | "heterogeneity_capability"
  | "heterogeneity_role"
  | "heterogeneity_information_access"
  | "heterogeneity_speaker_order"
  | "heterogeneity_authority"
  | "resource_use"
  | "resource_budget"
  | "action_surface";

export type MissingnessReasonV0 =
  | "not_collected"
  | "invalid"
  | "provider_failure"
  | "not_applicable"
  | "partial_record";

export interface MissingnessRecordV0 {
  channel: MissingnessChannelV0;
  reason: MissingnessReasonV0;
}

export interface ResourcesStateV0 {
  observedUse: ObservedResourceUseV0;
  budgetBefore: ObservedResourceBudgetV0;
  candidateActionSurface: CandidateActionSurfaceInputV0;
  missingness: MissingnessRecordV0[];
  actionAuthority: "none";
}

export interface CollectiveDecisionProcessStateV0 {
  artifactSchemaRef: typeof COLLECTIVE_DECISION_PROCESS_STATE_V0;
  inferenceStatus: "online_descriptive_process_state_only";
  truthAccess: "none";
  writeback: "none";
  actionAuthority: "none";
  claimId: string;
  checkpointIndex: number;
  asOfSequence: number;
  optionIds: string[];
  expectedAgentIds: string[];
  beliefChoice: BeliefChoiceStateV0;
  registeredInformation: RegisteredInformationStateV0;
  sourceDependence: SourceDependenceStateV0;
  discussionUtilization: DiscussionUtilizationStateV0;
  participationResponse: ParticipationResponseStateV0;
  heterogeneity: HeterogeneityStateV0;
  resources: ResourcesStateV0;
  sourceFingerprints: {
    registeredEvidencePool: string;
    exposureLog: string;
    discussionActLog: string;
    beliefChoice: string;
    agentContexts: string;
    resources: string;
  };
  contentHash: string;
}

type AnyRecord = Record<string, unknown>;
type TerminalReason = Exclude<ObservationUnavailableReasonV0, null>;

const OBSERVATION_STATUSES = ["complete", "partial", "missing"] as const;
const TERMINAL_REASONS = ["not_collected", "invalid", "provider_failure", "partial_record"] as const;
const EVENT_CHANNELS = ["private", "public", "tool"] as const;
const SOURCE_KINDS = ["agent", "tool", "dataset", "external"] as const;
const LINEAGE_BASES = ["declared", "ingestion", "estimated"] as const;
const DUPLICATE_BASES = ["declared", "deterministic", "estimated"] as const;
const ACT_KINDS = ["introduce", "cite", "challenge", "integrate", "conflict_addressed"] as const;

const TRUTH_KEYS = new Set([
  "groundTruth",
  "correctAnswer",
  "resolution",
  "finalOutcome",
  "outcome",
  "quality",
  "utility",
  "evaluator",
]);

function fail(code: string, path: string): never {
  throw new Error(`${code}: ${path}`);
}

function isPlainRecord(value: unknown): value is AnyRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function scanForbiddenKeys(value: unknown, path = "input"): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanForbiddenKeys(child, `${path}[${index}]`));
    return;
  }
  if (!isPlainRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (TRUTH_KEYS.has(key)) fail("decision_process_state_forbidden_truth_field", `${path}.${key}`);
    scanForbiddenKeys(value[key], `${path}.${key}`);
  }
}

function record(value: unknown, path: string): AnyRecord {
  if (!isPlainRecord(value)) fail("decision_process_state_input_keys_invalid", path);
  if (Object.getOwnPropertySymbols(value).length > 0) fail("decision_process_state_input_keys_invalid", path);
  return value;
}

function exact(value: unknown, keys: readonly string[], path: string): AnyRecord {
  const result = record(value, path);
  const allowed = new Set(keys);
  const actual = Object.keys(result);
  if (actual.length !== keys.length || actual.some(key => !allowed.has(key))) {
    fail("decision_process_state_input_keys_invalid", path);
  }
  if (actual.some(key => result[key] === undefined)) fail("decision_process_state_input_keys_invalid", `${path}.${actual.find(key => result[key] === undefined)}`);
  return result;
}

function exactOutput(value: unknown, keys: readonly string[], path: string): AnyRecord {
  if (!isPlainRecord(value)) fail("decision_process_state_output_keys_invalid", path);
  const result = value as AnyRecord;
  if (Object.getOwnPropertySymbols(result).length > 0) fail("decision_process_state_output_keys_invalid", path);
  const allowed = new Set(keys);
  const actual = Object.keys(result);
  if (actual.length !== keys.length || actual.some(key => !allowed.has(key)) || actual.some(key => result[key] === undefined)) {
    fail("decision_process_state_output_keys_invalid", path);
  }
  return result;
}

function outputMap(value: unknown, expectedKeys: readonly string[], path: string): AnyRecord {
  const map = exactOutput(value, expectedKeys, path);
  return map;
}

function outputRecordKeys(value: unknown, path: string): string[] {
  if (!isPlainRecord(value)) fail("decision_process_state_output_keys_invalid", path);
  const keys = Object.keys(value);
  if (keys.some(key => value[key] === undefined)) fail("decision_process_state_output_keys_invalid", path);
  return keys;
}

function outputArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail("decision_process_state_output_keys_invalid", path);
  return value;
}

function requireSortedStrings(values: readonly string[], path: string): void {
  if (values.some((value, index) => index > 0 && compareStrings(values[index - 1], value) > 0)) {
    fail("decision_process_state_output_keys_invalid", path);
  }
}

function requireCanonicalEqual(left: unknown, right: unknown, path: string): void {
  if (canonicalizeEstimatorValue(left) !== canonicalizeEstimatorValue(right)) {
    fail("decision_process_state_output_keys_invalid", path);
  }
}

function outputContractRef(value: unknown, path: string): ContractRefV0 {
  const ref = exactOutput(value, ["id", "version"], path);
  return {
    id: nonEmptyString(ref.id, `${path}.id`),
    version: nonEmptyString(ref.version, `${path}.version`),
  };
}

function outputIntegerMap(value: unknown, expectedKeys: readonly string[], path: string): AnyRecord {
  const map = outputMap(value, expectedKeys, path);
  for (const key of expectedKeys) safeInteger(map[key], `${path}.${key}`);
  return map;
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) fail("decision_process_state_id_invalid", path);
  return value;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], path: string, errorCode = "decision_process_state_input_keys_invalid"): T {
  if (typeof value !== "string" || !values.includes(value as T)) fail(errorCode, path);
  return value as T;
}

function observationStatus(value: unknown, path: string): ObservationStatusV0 {
  return enumValue(value, OBSERVATION_STATUSES, path, "decision_process_state_observation_status_invalid");
}

function safeInteger(value: unknown, path: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    fail("decision_process_state_numeric_invalid", path);
  }
  return value;
}

function finiteNonNegative(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail("decision_process_state_numeric_invalid", path);
  }
  return value;
}

function uniqueStrings(values: unknown, path: string, minimum = 0): string[] {
  if (!Array.isArray(values) || values.length < minimum) fail("decision_process_state_id_invalid", path);
  const result = values.map((value, index) => nonEmptyString(value, `${path}[${index}]`));
  if (new Set(result).size !== result.length) fail("decision_process_state_duplicate_id", path);
  return result;
}

function nullableRef(value: unknown, path: string): ContractRefV0 | null {
  if (value === null) return null;
  const ref = exact(value, ["id", "version"], path);
  return { id: nonEmptyString(ref.id, `${path}.id`), version: nonEmptyString(ref.version, `${path}.version`) };
}

function statusAndReason(status: unknown, reason: unknown, path: string): [ObservationStatusV0, ObservationUnavailableReasonV0] {
  const statusValue = observationStatus(status, `${path}.observationStatus`);
  if (reason !== null && (typeof reason !== "string" || !TERMINAL_REASONS.includes(reason as TerminalReason))) {
    fail("decision_process_state_observation_status_invalid", `${path}.unavailableReason`);
  }
  const reasonValue = reason as ObservationUnavailableReasonV0;
  if (statusValue === "complete" && reasonValue !== null) fail("decision_process_state_observation_status_invalid", path);
  if (statusValue === "partial" && reasonValue !== "partial_record") fail("decision_process_state_observation_status_invalid", path);
  if (statusValue === "missing" && (reasonValue === null || reasonValue === "partial_record")) fail("decision_process_state_observation_status_invalid", path);
  return [statusValue, reasonValue];
}

function validateContractRef(value: unknown, path: string): ContractRefV0 {
  const ref = exact(value, ["id", "version"], path);
  return { id: nonEmptyString(ref.id, `${path}.id`), version: nonEmptyString(ref.version, `${path}.version`) };
}

function validateThermometerRef(value: unknown, input: CollectiveDecisionProcessStateInputV0): DiscussionThermometerStateRefV0 | null {
  if (value === null) return null;
  const ref = exact(value, ["schemaRef", "claimId", "checkpointIndex", "optionIds", "contentHash"], "input.beliefChoice.thermometerStateRef");
  const schemaRef = validateContractRef(ref.schemaRef, "input.beliefChoice.thermometerStateRef.schemaRef");
  const claimId = nonEmptyString(ref.claimId, "input.beliefChoice.thermometerStateRef.claimId");
  const checkpointIndex = safeInteger(ref.checkpointIndex, "input.beliefChoice.thermometerStateRef.checkpointIndex");
  const optionIds = uniqueStrings(ref.optionIds, "input.beliefChoice.thermometerStateRef.optionIds", 2);
  const contentHash = nonEmptyString(ref.contentHash, "input.beliefChoice.thermometerStateRef.contentHash");
  if (claimId !== input.claimId || checkpointIndex !== input.checkpointIndex || canonicalizeEstimatorValue(sortStrings(optionIds)) !== canonicalizeEstimatorValue(sortStrings(input.optionIds))) {
    fail("decision_process_state_thermometer_ref_mismatch", "input.beliefChoice.thermometerStateRef");
  }
  return { schemaRef, claimId, checkpointIndex, optionIds, contentHash };
}

function validateObservationEnvelope(value: unknown, path: string, collectionKey: string): [ObservationStatusV0, ObservationUnavailableReasonV0, unknown[]] {
  const envelope = exact(value, ["observationStatus", "unavailableReason", collectionKey], path);
  const [status, reason] = statusAndReason(envelope.observationStatus, envelope.unavailableReason, path);
  if (!Array.isArray(envelope[collectionKey])) fail("decision_process_state_input_keys_invalid", `${path}.${collectionKey}`);
  const records = envelope[collectionKey] as unknown[];
  if (status === "missing" && records.length !== 0) fail("decision_process_state_observation_status_invalid", path);
  return [status, reason, records];
}

function validateResourceUse(value: unknown, path: string): ObservedResourceUseV0 {
  const input = exact(value, ["observationStatus", "unavailableReason", "promptTokens", "completionTokens", "totalTokens", "totalLatencyMs", "invalidOrFailed"], path);
  const [status, reason] = statusAndReason(input.observationStatus, input.unavailableReason, path);
  const fields = ["promptTokens", "completionTokens", "totalTokens", "totalLatencyMs", "invalidOrFailed"] as const;
  for (const field of fields) {
    if (input[field] === null) continue;
    if (field === "totalLatencyMs") finiteNonNegative(input[field], `${path}.${field}`);
    else safeInteger(input[field], `${path}.${field}`);
  }
  const nullCount = fields.filter(field => input[field] === null).length;
  if ((status === "complete" && nullCount !== 0) || (status === "missing" && nullCount !== fields.length) || (status === "partial" && (nullCount === 0 || nullCount === fields.length))) {
    fail("decision_process_state_resource_status_invalid", path);
  }
  const promptTokens = input.promptTokens;
  const completionTokens = input.completionTokens;
  const totalTokens = input.totalTokens;
  if (typeof promptTokens === "number" && typeof completionTokens === "number" && typeof totalTokens === "number" && totalTokens !== promptTokens + completionTokens) {
    fail("decision_process_state_numeric_invalid", `${path}.totalTokens`);
  }
  return input as unknown as ObservedResourceUseV0;
}

function validateResourceBudget(value: unknown, path: string): ObservedResourceBudgetV0 {
  const input = exact(value, ["observationStatus", "unavailableReason", "computeUnits", "latencyUnits"], path);
  const [status, reason] = statusAndReason(input.observationStatus, input.unavailableReason, path);
  for (const field of ["computeUnits", "latencyUnits"] as const) {
    if (input[field] !== null) finiteNonNegative(input[field], `${path}.${field}`);
  }
  const nullCount = [input.computeUnits, input.latencyUnits].filter(value => value === null).length;
  if ((status === "complete" && nullCount !== 0) || (status === "missing" && nullCount !== 2) || (status === "partial" && nullCount !== 1)) {
    fail("decision_process_state_resource_status_invalid", path);
  }
  return input as unknown as ObservedResourceBudgetV0;
}

function validatePool(poolValue: unknown, claimId: string): RegisteredEvidencePoolV0 {
  const pool = exact(poolValue, ["denominatorStatus", "lineageObservationStatus", "duplicateObservationStatus", "units"], "input.registeredEvidencePool");
  const denominatorStatus = enumValue(pool.denominatorStatus, ["registered_complete", "registered_partial", "open_world_unknown"], "input.registeredEvidencePool.denominatorStatus");
  const lineageStatus = observationStatus(pool.lineageObservationStatus, "input.registeredEvidencePool.lineageObservationStatus");
  const duplicateStatus = observationStatus(pool.duplicateObservationStatus, "input.registeredEvidencePool.duplicateObservationStatus");
  if (!Array.isArray(pool.units)) fail("decision_process_state_input_keys_invalid", "input.registeredEvidencePool.units");
  const units: RegisteredEvidenceUnitV0[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < pool.units.length; index += 1) {
    const path = `input.registeredEvidencePool.units[${index}]`;
    const unit = exact(pool.units[index], ["evidenceUnitId", "claimId", "sourceRef", "lineage", "duplicateMembership"], path);
    const evidenceUnitId = nonEmptyString(unit.evidenceUnitId, `${path}.evidenceUnitId`);
    if (ids.has(evidenceUnitId)) fail("decision_process_state_duplicate_id", `${path}.evidenceUnitId`);
    ids.add(evidenceUnitId);
    if (nonEmptyString(unit.claimId, `${path}.claimId`) !== claimId) fail("decision_process_state_claim_mismatch", `${path}.claimId`);
    const source = exact(unit.sourceRef, ["id", "kind"], `${path}.sourceRef`);
    const sourceRef = { id: nonEmptyString(source.id, `${path}.sourceRef.id`), kind: enumValue(source.kind, SOURCE_KINDS, `${path}.sourceRef.kind`) } as RegisteredEvidenceUnitV0["sourceRef"];
    let lineage: RegisteredEvidenceUnitV0["lineage"] = null;
    if (unit.lineage !== null) {
      const value = exact(unit.lineage, ["id", "basis"], `${path}.lineage`);
      lineage = { id: nonEmptyString(value.id, `${path}.lineage.id`), basis: enumValue(value.basis, LINEAGE_BASES, `${path}.lineage.basis`) };
    }
    let duplicateMembership: RegisteredEvidenceUnitV0["duplicateMembership"] = null;
    if (unit.duplicateMembership !== null) {
      const value = exact(unit.duplicateMembership, ["groupId", "basis"], `${path}.duplicateMembership`);
      duplicateMembership = { groupId: nonEmptyString(value.groupId, `${path}.duplicateMembership.groupId`), basis: enumValue(value.basis, DUPLICATE_BASES, `${path}.duplicateMembership.basis`) };
    }
    units.push({ evidenceUnitId, claimId, sourceRef, lineage, duplicateMembership });
  }
  const lineages = units.map(unit => unit.lineage !== null);
  if (lineageStatus === "complete" && lineages.some(value => !value)) fail("decision_process_state_denominator_contract_invalid", "input.registeredEvidencePool.lineageObservationStatus");
  if (lineageStatus === "missing" && lineages.some(value => value)) fail("decision_process_state_denominator_contract_invalid", "input.registeredEvidencePool.lineageObservationStatus");
  if (lineageStatus === "partial" && (lineages.every(value => value) || lineages.every(value => !value))) fail("decision_process_state_denominator_contract_invalid", "input.registeredEvidencePool.lineageObservationStatus");
  const duplicates = units.map(unit => unit.duplicateMembership !== null);
  if (duplicateStatus === "missing" && duplicates.some(value => value)) fail("decision_process_state_denominator_contract_invalid", "input.registeredEvidencePool.duplicateObservationStatus");
  if (duplicateStatus === "partial" && (duplicates.every(value => value) || duplicates.every(value => !value))) fail("decision_process_state_denominator_contract_invalid", "input.registeredEvidencePool.duplicateObservationStatus");
  if (units.length === 0 && (lineageStatus !== "complete" || duplicateStatus !== "complete")) fail("decision_process_state_denominator_contract_invalid", "input.registeredEvidencePool");
  return { denominatorStatus, lineageObservationStatus: lineageStatus, duplicateObservationStatus: duplicateStatus, units };
}

export function validateCollectiveDecisionProcessStateInputV0(value: unknown): asserts value is CollectiveDecisionProcessStateInputV0 {
  scanForbiddenKeys(value);
  const input = exact(value, ["claimId", "checkpointIndex", "asOfSequence", "optionIds", "expectedAgentIds", "registeredEvidencePool", "exposureLog", "discussionActLog", "beliefChoice", "agentContexts", "resources"], "input");
  const claimId = nonEmptyString(input.claimId, "input.claimId");
  const checkpointIndex = safeInteger(input.checkpointIndex, "input.checkpointIndex");
  const asOfSequence = safeInteger(input.asOfSequence, "input.asOfSequence");
  const optionIds = uniqueStrings(input.optionIds, "input.optionIds", 2);
  const expectedAgentIds = uniqueStrings(input.expectedAgentIds, "input.expectedAgentIds", 1);
  const roster = new Set(expectedAgentIds);
  const pool = validatePool(input.registeredEvidencePool, claimId);
  const evidenceIds = new Set(pool.units.map(unit => unit.evidenceUnitId));
  const [exposureStatus, exposureReason, exposureRecords] = validateObservationEnvelope(input.exposureLog, "input.exposureLog", "records");
  const exposureIds = new Set<string>();
  const eventSequences = new Set<number>();
  const exposures: EvidenceExposureV0[] = [];
  exposureRecords.forEach((value, index) => {
    const path = `input.exposureLog.records[${index}]`;
    const recordValue = exact(value, ["exposureId", "evidenceUnitId", "targetAgentId", "checkpointIndex", "eventSequence", "channel"], path);
    const exposureId = nonEmptyString(recordValue.exposureId, `${path}.exposureId`);
    if (exposureIds.has(exposureId)) fail("decision_process_state_duplicate_id", `${path}.exposureId`);
    exposureIds.add(exposureId);
    const evidenceUnitId = nonEmptyString(recordValue.evidenceUnitId, `${path}.evidenceUnitId`);
    if (!evidenceIds.has(evidenceUnitId)) fail("decision_process_state_reference_unknown", `${path}.evidenceUnitId`);
    const targetAgentId = nonEmptyString(recordValue.targetAgentId, `${path}.targetAgentId`);
    if (!roster.has(targetAgentId)) fail("decision_process_state_reference_unknown", `${path}.targetAgentId`);
    const eventCheckpoint = safeInteger(recordValue.checkpointIndex, `${path}.checkpointIndex`);
    const eventSequence = safeInteger(recordValue.eventSequence, `${path}.eventSequence`);
    if (eventCheckpoint > checkpointIndex || eventSequence > asOfSequence) fail("decision_process_state_future_event", path);
    if (eventSequences.has(eventSequence)) fail("decision_process_state_duplicate_id", `${path}.eventSequence`);
    eventSequences.add(eventSequence);
    exposures.push({ exposureId, evidenceUnitId, targetAgentId, checkpointIndex: eventCheckpoint, eventSequence, channel: enumValue(recordValue.channel, EVENT_CHANNELS, `${path}.channel`) });
  });
  const [actStatus, actReason, actRecords] = validateObservationEnvelope(input.discussionActLog, "input.discussionActLog", "acts");
  const acts: DiscussionActV0[] = [];
  const actById = new Map<string, DiscussionActV0>();
  actRecords.forEach((value, index) => {
    const path = `input.discussionActLog.acts[${index}]`;
    const act = exact(value, ["actId", "agentId", "checkpointIndex", "eventSequence", "actKind", "evidenceUnitIds", "respondsToActIds", "observationBasis"], path);
    const actId = nonEmptyString(act.actId, `${path}.actId`);
    if (actById.has(actId)) fail("decision_process_state_duplicate_id", `${path}.actId`);
    const agentId = nonEmptyString(act.agentId, `${path}.agentId`);
    if (!roster.has(agentId)) fail("decision_process_state_reference_unknown", `${path}.agentId`);
    const eventCheckpoint = safeInteger(act.checkpointIndex, `${path}.checkpointIndex`);
    const eventSequence = safeInteger(act.eventSequence, `${path}.eventSequence`);
    if (eventCheckpoint > checkpointIndex || eventSequence > asOfSequence) fail("decision_process_state_future_event", path);
    if (eventSequences.has(eventSequence)) fail("decision_process_state_duplicate_id", `${path}.eventSequence`);
    eventSequences.add(eventSequence);
    const evidenceUnitIds = uniqueStrings(act.evidenceUnitIds, `${path}.evidenceUnitIds`);
    evidenceUnitIds.forEach(id => { if (!evidenceIds.has(id)) fail("decision_process_state_reference_unknown", `${path}.evidenceUnitIds`); });
    const respondsToActIds = uniqueStrings(act.respondsToActIds, `${path}.respondsToActIds`);
    const observationBasis = act.observationBasis;
    if (observationBasis !== "architecture_recorded") fail("decision_process_state_input_keys_invalid", `${path}.observationBasis`);
    const item: DiscussionActV0 = { actId, agentId, checkpointIndex: eventCheckpoint, eventSequence, actKind: enumValue(act.actKind, ACT_KINDS, `${path}.actKind`), evidenceUnitIds, respondsToActIds, observationBasis };
    acts.push(item);
    actById.set(actId, item);
  });
  for (const act of acts) {
    for (const responseId of act.respondsToActIds) {
      const source = actById.get(responseId);
      if (!source || source.eventSequence >= act.eventSequence) fail("decision_process_state_response_order_invalid", `input.discussionActLog.acts.${act.actId}`);
    }
  }
  if (exposureStatus === "complete") {
    for (const act of acts) {
      for (const evidenceUnitId of act.evidenceUnitIds) {
        const prior = exposures.some(exposure => exposure.targetAgentId === act.agentId && exposure.evidenceUnitId === evidenceUnitId && exposure.eventSequence < act.eventSequence && exposure.checkpointIndex <= act.checkpointIndex);
        if (!prior) fail("decision_process_state_act_without_prior_exposure", `input.discussionActLog.acts.${act.actId}`);
      }
    }
  }
  const beliefChoice = exact(input.beliefChoice, ["thermometerStateRef", "publicChoiceObservationStatus", "publicChoiceUnavailableReason", "publicChoices"], "input.beliefChoice");
  const [choiceStatus, choiceReason] = statusAndReason(beliefChoice.publicChoiceObservationStatus, beliefChoice.publicChoiceUnavailableReason, "input.beliefChoice");
  validateThermometerRef(beliefChoice.thermometerStateRef, input as unknown as CollectiveDecisionProcessStateInputV0);
  if (!Array.isArray(beliefChoice.publicChoices)) fail("decision_process_state_input_keys_invalid", "input.beliefChoice.publicChoices");
  const seenChoiceAgents = new Set<string>();
  for (let index = 0; index < beliefChoice.publicChoices.length; index += 1) {
    const path = `input.beliefChoice.publicChoices[${index}]`;
    const choice = exact(beliefChoice.publicChoices[index], ["agentId", "choiceId", "checkpointIndex", "eventSequence"], path);
    const agentId = nonEmptyString(choice.agentId, `${path}.agentId`);
    if (!roster.has(agentId) || seenChoiceAgents.has(agentId)) fail("decision_process_state_duplicate_id", `${path}.agentId`);
    seenChoiceAgents.add(agentId);
    const choiceId = nonEmptyString(choice.choiceId, `${path}.choiceId`);
    if (!optionIds.includes(choiceId)) fail("decision_process_state_choice_option_invalid", `${path}.choiceId`);
    const eventCheckpoint = safeInteger(choice.checkpointIndex, `${path}.checkpointIndex`);
    const eventSequence = safeInteger(choice.eventSequence, `${path}.eventSequence`);
    if (eventCheckpoint > checkpointIndex || eventSequence > asOfSequence) fail("decision_process_state_future_event", path);
    if (eventSequences.has(eventSequence)) fail("decision_process_state_duplicate_id", `${path}.eventSequence`);
    eventSequences.add(eventSequence);
  }
  if (choiceStatus === "missing" && beliefChoice.publicChoices.length !== 0) fail("decision_process_state_observation_status_invalid", "input.beliefChoice");
  if (choiceStatus === "complete" && choiceReason !== null) fail("decision_process_state_observation_status_invalid", "input.beliefChoice");
  const contexts = exact(input, ["claimId", "checkpointIndex", "asOfSequence", "optionIds", "expectedAgentIds", "registeredEvidencePool", "exposureLog", "discussionActLog", "beliefChoice", "agentContexts", "resources"], "input");
  if (!Array.isArray(contexts.agentContexts) || contexts.agentContexts.length !== expectedAgentIds.length) fail("decision_process_state_reference_unknown", "input.agentContexts");
  const contextAgents = new Set<string>();
  for (let index = 0; index < contexts.agentContexts.length; index += 1) {
    const path = `input.agentContexts[${index}]`;
    const context = exact(contexts.agentContexts[index], ["agentId", "modelRef", "declaredCapabilityClass", "roleRef", "informationAccessRef", "speakerOrder", "authorityRef"], path);
    const agentId = nonEmptyString(context.agentId, `${path}.agentId`);
    if (!roster.has(agentId) || contextAgents.has(agentId)) fail("decision_process_state_reference_unknown", `${path}.agentId`);
    contextAgents.add(agentId);
    validateContractRef(context.modelRef, `${path}.modelRef`);
    for (const field of ["roleRef", "informationAccessRef", "authorityRef"] as const) nullableRef(context[field], `${path}.${field}`);
    if (context.declaredCapabilityClass !== null) nonEmptyString(context.declaredCapabilityClass, `${path}.declaredCapabilityClass`);
    if (context.speakerOrder !== null) safeInteger(context.speakerOrder, `${path}.speakerOrder`);
  }
  if (contextAgents.size !== roster.size) fail("decision_process_state_reference_unknown", "input.agentContexts");
  const resources = exact(input.resources, ["observedUse", "budgetBefore", "candidateActionSurface"], "input.resources");
  validateResourceUse(resources.observedUse, "input.resources.observedUse");
  validateResourceBudget(resources.budgetBefore, "input.resources.budgetBefore");
  const surface = exact(resources.candidateActionSurface, ["observationStatus", "unavailableReason", "candidates"], "input.resources.candidateActionSurface");
  const [surfaceStatus] = statusAndReason(surface.observationStatus, surface.unavailableReason, "input.resources.candidateActionSurface");
  if (!Array.isArray(surface.candidates)) fail("decision_process_state_input_keys_invalid", "input.resources.candidateActionSurface.candidates");
  const candidateIds = new Set<string>();
  for (let index = 0; index < surface.candidates.length; index += 1) {
    const path = `input.resources.candidateActionSurface.candidates[${index}]`;
    const candidate = exact(surface.candidates[index], ["candidateId", "actionRef", "available"], path);
    const candidateId = nonEmptyString(candidate.candidateId, `${path}.candidateId`);
    if (candidateIds.has(candidateId)) fail("decision_process_state_duplicate_id", `${path}.candidateId`);
    candidateIds.add(candidateId);
    validateContractRef(candidate.actionRef, `${path}.actionRef`);
    if (typeof candidate.available !== "boolean") fail("decision_process_state_input_keys_invalid", `${path}.available`);
  }
  if (surfaceStatus === "missing" && surface.candidates.length !== 0) fail("decision_process_state_observation_status_invalid", "input.resources.candidateActionSurface");
}

function cloneCanonical<T>(value: T): T {
  return JSON.parse(canonicalizeEstimatorValue(value)) as T;
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort();
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortByEventThenId<T extends { eventSequence: number }>(values: readonly T[], idKey: keyof T): T[] {
  return [...values].sort((left, right) => left.eventSequence - right.eventSequence || compareStrings(String(left[idKey]), String(right[idKey])));
}

function sortById<T extends Record<string, unknown>>(values: readonly T[], key: keyof T): T[] {
  return [...values].sort((left, right) => {
    const a = String(left[key]);
    const b = String(right[key]);
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

function mapWithRoster<T>(agentIds: readonly string[], factory: () => T): Record<string, T> {
  return Object.fromEntries(sortStrings(agentIds).map(agentId => [agentId, factory()]));
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as AnyRecord)) freezeDeep(child);
  }
  return value;
}

function missingReason(reason: ObservationUnavailableReasonV0): MissingnessReasonV0 {
  if (reason === null) fail("decision_process_state_observation_status_invalid", "missingness");
  return reason;
}

function metadataStatus(values: Array<string | number | null>): ObservationStatusV0 {
  const missing = values.filter(value => value === null).length;
  if (missing === 0) return "complete";
  if (missing === values.length) return "missing";
  return "partial";
}

function zeroUtilizationCounts(): UtilizationCountByKindV0 {
  return { introduce: 0, cite: 0, challenge: 0, integrate: 0, conflict_addressed: 0 };
}

function nullUtilizationRates(): UtilizationRateByKindV0 {
  return { introduce: null, cite: null, challenge: null, integrate: null, conflict_addressed: null };
}

function buildMissingness(pool: RegisteredEvidencePoolV0, exposureStatus: ObservationStatusV0, exposureReason: ObservationUnavailableReasonV0, actStatus: ObservationStatusV0, actReason: ObservationUnavailableReasonV0, choiceStatus: ObservationStatusV0, choiceReason: ObservationUnavailableReasonV0, eligibleExposedUnitCount: number, metadata: MetadataCompletenessByDimensionV0, resources: ResourceStateInputV0): MissingnessRecordV0[] {
  const result: MissingnessRecordV0[] = [];
  const add = (channel: MissingnessChannelV0, reason: MissingnessReasonV0) => result.push({ channel, reason });
  if (choiceStatus !== "complete") add("belief_choice", missingReason(choiceReason));
  if (pool.denominatorStatus === "registered_partial") add("registered_information", "partial_record");
  else if (pool.denominatorStatus === "open_world_unknown") add("registered_information", "not_applicable");
  else if (exposureStatus !== "complete") add("registered_information", missingReason(exposureReason));
  else if (pool.units.length === 0) add("registered_information", "not_applicable");
  if (pool.lineageObservationStatus === "partial") add("source_dependence_lineage", "partial_record");
  else if (pool.lineageObservationStatus === "missing") add("source_dependence_lineage", "not_collected");
  if (pool.duplicateObservationStatus === "partial") add("source_dependence_duplicate", "partial_record");
  else if (pool.duplicateObservationStatus === "missing") add("source_dependence_duplicate", "not_collected");
  if (exposureStatus !== "complete") add("discussion_utilization", missingReason(exposureReason));
  else if (actStatus !== "complete") add("discussion_utilization", missingReason(actReason));
  else if (eligibleExposedUnitCount === 0) add("discussion_utilization", "not_applicable");
  if (actStatus !== "complete") add("participation_response", missingReason(actReason));
  if (metadata.declaredCapabilityClass !== "complete") add("heterogeneity_capability", metadata.declaredCapabilityClass === "partial" ? "partial_record" : "not_collected");
  if (metadata.role !== "complete") add("heterogeneity_role", metadata.role === "partial" ? "partial_record" : "not_collected");
  if (metadata.informationAccess !== "complete") add("heterogeneity_information_access", metadata.informationAccess === "partial" ? "partial_record" : "not_collected");
  if (metadata.speakerOrder !== "complete") add("heterogeneity_speaker_order", metadata.speakerOrder === "partial" ? "partial_record" : "not_collected");
  if (metadata.authority !== "complete") add("heterogeneity_authority", metadata.authority === "partial" ? "partial_record" : "not_collected");
  if (resources.observedUse.observationStatus !== "complete") add("resource_use", missingReason(resources.observedUse.unavailableReason));
  if (resources.budgetBefore.observationStatus !== "complete") add("resource_budget", missingReason(resources.budgetBefore.unavailableReason));
  if (resources.candidateActionSurface.observationStatus !== "complete") add("action_surface", missingReason(resources.candidateActionSurface.unavailableReason));
  return result.sort((left, right) => compareStrings(left.channel, right.channel));
}

export function projectCollectiveDecisionProcessStateV0(input: CollectiveDecisionProcessStateInputV0): Readonly<CollectiveDecisionProcessStateV0> {
  validateCollectiveDecisionProcessStateInputV0(input);
  const source = cloneCanonical(input);
  const normalizedThermometerStateRef = source.beliefChoice.thermometerStateRef === null
    ? null
    : { ...source.beliefChoice.thermometerStateRef, optionIds: sortStrings(source.beliefChoice.thermometerStateRef.optionIds) };
  const pool = source.registeredEvidencePool;
  const expectedAgentIds = sortStrings(source.expectedAgentIds);
  const unitIds = sortStrings(pool.units.map(unit => unit.evidenceUnitId));
  const exposures = sortByEventThenId(source.exposureLog.records.map(record => ({ ...record })), "exposureId");
  const observedExposedUnitIds = sortStrings([...new Set(exposures.map(record => record.evidenceUnitId))]);
  const observedExposedUnitIdsByAgentId = mapWithRoster(expectedAgentIds, () => [] as string[]);
  for (const exposure of exposures) observedExposedUnitIdsByAgentId[exposure.targetAgentId].push(exposure.evidenceUnitId);
  for (const agentId of expectedAgentIds) observedExposedUnitIdsByAgentId[agentId] = sortStrings([...new Set(observedExposedUnitIdsByAgentId[agentId])]);
  const registeredInformationUnavailableReason = pool.denominatorStatus !== "registered_complete"
    ? "denominator_not_complete"
    : source.exposureLog.observationStatus !== "complete"
      ? "exposure_observation_incomplete"
      : unitIds.length === 0 ? "registered_pool_empty" : null;
  const registeredPoolCoverage = registeredInformationUnavailableReason === null ? observedExposedUnitIds.length / unitIds.length : null;
  const registeredInformation: RegisteredInformationStateV0 = {
    denominatorStatus: pool.denominatorStatus,
    exposureObservationStatus: source.exposureLog.observationStatus,
    registeredUnitIds: unitIds,
    observedExposedUnitIds,
    unexposedRegisteredUnitIds: registeredPoolCoverage === null ? null : unitIds.filter(id => !observedExposedUnitIds.includes(id)),
    registeredDistinctUnitCount: unitIds.length,
    observedExposedDistinctUnitCount: observedExposedUnitIds.length,
    observedExposedUnitIdsByAgentId,
    registeredPoolCoverage,
    unavailableReason: registeredInformationUnavailableReason,
    interpretation: "registered_unit_exposure_only",
  };
  const lineageBasisUnitCount = { declared: 0, ingestion: 0, estimated: 0 };
  const duplicateBasisUnitCount = { declared: 0, deterministic: 0, estimated: 0 };
  const lineageIds = new Set<string>();
  const duplicateGroupIds = new Set<string>();
  let evidenceUnitCountWithLineage = 0;
  let evidenceUnitCountWithDuplicateGroup = 0;
  for (const unit of pool.units) {
    if (unit.lineage !== null) {
      evidenceUnitCountWithLineage += 1;
      lineageIds.add(unit.lineage.id);
      lineageBasisUnitCount[unit.lineage.basis] += 1;
    }
    if (unit.duplicateMembership !== null) {
      evidenceUnitCountWithDuplicateGroup += 1;
      duplicateGroupIds.add(unit.duplicateMembership.groupId);
      duplicateBasisUnitCount[unit.duplicateMembership.basis] += 1;
    }
  }
  const sourceDependence: SourceDependenceStateV0 = {
    lineageObservationStatus: pool.lineageObservationStatus,
    evidenceUnitCountWithLineage,
    evidenceUnitCountWithoutLineage: pool.units.length - evidenceUnitCountWithLineage,
    recordedLineageCount: pool.lineageObservationStatus === "complete" ? lineageIds.size : null,
    lineageBasisUnitCount,
    duplicateObservationStatus: pool.duplicateObservationStatus,
    evidenceUnitCountWithDuplicateGroup,
    evidenceUnitCountWithoutDuplicateGroup: pool.units.length - evidenceUnitCountWithDuplicateGroup,
    observedDuplicateGroupCount: pool.duplicateObservationStatus === "complete" ? duplicateGroupIds.size : null,
    duplicateBasisUnitCount,
    evidenceUnitDependence: sortById(pool.units.map(unit => ({ evidenceUnitId: unit.evidenceUnitId, sourceRef: unit.sourceRef, lineage: unit.lineage, duplicateMembership: unit.duplicateMembership })), "evidenceUnitId"),
    interpretation: "recorded_dependence_description_only",
  };
  const acts = sortByEventThenId(source.discussionActLog.acts.map(act => ({
    ...act,
    evidenceUnitIds: sortStrings(act.evidenceUnitIds),
    respondsToActIds: sortStrings(act.respondsToActIds),
  })), "actId");
  const exposedSet = new Set(observedExposedUnitIds);
  const utilizedByKind: Record<DiscussionActKindV0, Set<string>> = {
    introduce: new Set(), cite: new Set(), challenge: new Set(), integrate: new Set(), conflict_addressed: new Set(),
  };
  for (const act of acts) for (const unitId of act.evidenceUnitIds) utilizedByKind[act.actKind].add(unitId);
  const utilizedUnitIds = sortStrings([...new Set(Object.values(utilizedByKind).flatMap(set => [...set]))]);
  const eligibleCount = exposedSet.size;
  const utilizationCounts = {
    introduce: utilizedByKind.introduce.size,
    cite: utilizedByKind.cite.size,
    challenge: utilizedByKind.challenge.size,
    integrate: utilizedByKind.integrate.size,
    conflict_addressed: utilizedByKind.conflict_addressed.size,
  };
  let discussionStatus: DiscussionUtilizationStateV0["status"];
  let discussionUnavailableReason: DiscussionUtilizationStateV0["unavailableReason"] = null;
  if (source.exposureLog.observationStatus !== "complete") {
    discussionStatus = "unavailable";
    discussionUnavailableReason = "exposure_observation_incomplete";
  } else if (source.discussionActLog.observationStatus !== "complete") {
    discussionStatus = "unavailable";
    discussionUnavailableReason = "structured_use_observation_incomplete";
  } else if (eligibleCount === 0) {
    discussionStatus = "not_applicable";
    discussionUnavailableReason = "no_eligible_exposed_units";
  } else {
    discussionStatus = "available";
  }
  const rates = (denominator: number): UtilizationRateByKindV0 => ({
    introduce: utilizationCounts.introduce / denominator,
    cite: utilizationCounts.cite / denominator,
    challenge: utilizationCounts.challenge / denominator,
    integrate: utilizationCounts.integrate / denominator,
    conflict_addressed: utilizationCounts.conflict_addressed / denominator,
  });
  const discussionUtilization: DiscussionUtilizationStateV0 = discussionStatus === "available"
    ? { status: discussionStatus, exposureObservationStatus: source.exposureLog.observationStatus, actObservationStatus: source.discussionActLog.observationStatus, denominatorKind: "distinct_exposed_evidence_units", eligibleExposedDistinctUnitCount: eligibleCount, utilizedDistinctUnitCount: utilizedUnitIds.length, utilizedUnitIds, utilizedDistinctUnitCountByKind: utilizationCounts, utilizationRate: utilizedUnitIds.length / eligibleCount, utilizationRateByKind: rates(eligibleCount), unusedEligibleUnitCount: [...exposedSet].filter(id => !utilizedUnitIds.includes(id)).length, unusedEligibleUnitIds: sortStrings([...exposedSet].filter(id => !utilizedUnitIds.includes(id))), unavailableReason: null, interpretation: "architecture_observed_use_association_only" }
    : discussionStatus === "not_applicable"
      ? { status: discussionStatus, exposureObservationStatus: source.exposureLog.observationStatus, actObservationStatus: source.discussionActLog.observationStatus, denominatorKind: "distinct_exposed_evidence_units", eligibleExposedDistinctUnitCount: 0, utilizedDistinctUnitCount: 0, utilizedUnitIds: [], utilizedDistinctUnitCountByKind: zeroUtilizationCounts(), utilizationRate: null, utilizationRateByKind: nullUtilizationRates(), unusedEligibleUnitCount: 0, unusedEligibleUnitIds: [], unavailableReason: discussionUnavailableReason, interpretation: "architecture_observed_use_association_only" }
      : { status: discussionStatus, exposureObservationStatus: source.exposureLog.observationStatus, actObservationStatus: source.discussionActLog.observationStatus, denominatorKind: "distinct_exposed_evidence_units", eligibleExposedDistinctUnitCount: null, utilizedDistinctUnitCount: null, utilizedUnitIds: null, utilizedDistinctUnitCountByKind: utilizationCounts, utilizationRate: null, utilizationRateByKind: nullUtilizationRates(), unusedEligibleUnitCount: null, unusedEligibleUnitIds: null, unavailableReason: discussionUnavailableReason, interpretation: "architecture_observed_use_association_only" };
  const speakingActCountByAgentId = mapWithRoster(expectedAgentIds, () => 0);
  for (const act of acts) speakingActCountByAgentId[act.agentId] += 1;
  const outgoingResponseEdgeCountByAgentId = mapWithRoster(expectedAgentIds, () => 0);
  const receivedResponseEdgeCountByAgentId = mapWithRoster(expectedAgentIds, () => 0);
  const responseEdgeCountBySourceAgentId = mapWithRoster(expectedAgentIds, () => 0);
  const informationLinkedResponseEdgeCountBySourceAgentId = mapWithRoster(expectedAgentIds, () => 0);
  const actById = new Map(acts.map(act => [act.actId, act]));
  const responseEdges: ParticipationResponseStateV0["responseEdges"] = [];
  for (const target of acts) {
    for (const sourceActId of target.respondsToActIds) {
      const sourceAct = actById.get(sourceActId);
      if (!sourceAct) continue;
      outgoingResponseEdgeCountByAgentId[target.agentId] += 1;
      receivedResponseEdgeCountByAgentId[sourceAct.agentId] += 1;
      responseEdgeCountBySourceAgentId[sourceAct.agentId] += 1;
      const informationLinked = sourceAct.evidenceUnitIds.length > 0;
      if (informationLinked) informationLinkedResponseEdgeCountBySourceAgentId[sourceAct.agentId] += 1;
      responseEdges.push({ sourceActId: sourceAct.actId, targetActId: target.actId, sourceAgentId: sourceAct.agentId, targetAgentId: target.agentId, informationLinked });
    }
  }
  responseEdges.sort((left, right) => (actById.get(left.targetActId)?.eventSequence ?? 0) - (actById.get(right.targetActId)?.eventSequence ?? 0) || compareStrings(left.sourceActId, right.sourceActId) || compareStrings(left.targetActId, right.targetActId));
  const responseAvailable = source.discussionActLog.observationStatus === "complete";
  const participationResponse: ParticipationResponseStateV0 = {
    speakingActCountByAgentId,
    outgoingResponseEdgeCountByAgentId,
    receivedResponseEdgeCountByAgentId,
    responseAssociationStatus: responseAvailable ? "available" : "unavailable",
    responseEdgeCountBySourceAgentId: responseAvailable ? responseEdgeCountBySourceAgentId : null,
    informationLinkedResponseEdgeCountBySourceAgentId: responseAvailable ? informationLinkedResponseEdgeCountBySourceAgentId : null,
    responseEdges: responseAvailable ? responseEdges : null,
    unavailableReason: responseAvailable ? null : "structured_response_observation_incomplete",
    attributionBasis: "explicit_response_edge",
    interpretation: "observed_association_not_causal_influence",
  };
  const contexts = sortById(source.agentContexts.map(context => ({ ...context })), "agentId");
  const metadata: MetadataCompletenessByDimensionV0 = {
    model: "complete",
    declaredCapabilityClass: metadataStatus(contexts.map(context => context.declaredCapabilityClass)),
    role: metadataStatus(contexts.map(context => context.roleRef?.id ?? null)),
    informationAccess: metadataStatus(contexts.map(context => context.informationAccessRef?.id ?? null)),
    speakerOrder: metadataStatus(contexts.map(context => context.speakerOrder)),
    authority: metadataStatus(contexts.map(context => context.authorityRef?.id ?? null)),
  };
  const heterogeneity: HeterogeneityStateV0 = { agentContexts: contexts, metadataCompletenessByDimension: metadata, interpretation: "descriptive_factors_only_not_separable_effects" };
  const normalizedResourceInput: ResourceStateInputV0 = {
    observedUse: { ...source.resources.observedUse },
    budgetBefore: { ...source.resources.budgetBefore },
    candidateActionSurface: { observationStatus: source.resources.candidateActionSurface.observationStatus, unavailableReason: source.resources.candidateActionSurface.unavailableReason, candidates: sortById(source.resources.candidateActionSurface.candidates.map(candidate => ({ ...candidate, actionRef: { ...candidate.actionRef } })), "candidateId") },
  };
  const resources: ResourcesStateV0 = {
    observedUse: normalizedResourceInput.observedUse,
    budgetBefore: normalizedResourceInput.budgetBefore,
    candidateActionSurface: normalizedResourceInput.candidateActionSurface,
    missingness: buildMissingness(pool, source.exposureLog.observationStatus, source.exposureLog.unavailableReason, source.discussionActLog.observationStatus, source.discussionActLog.unavailableReason, source.beliefChoice.publicChoiceObservationStatus, source.beliefChoice.publicChoiceUnavailableReason, eligibleCount, metadata, source.resources),
    actionAuthority: "none",
  };
  const body: Omit<CollectiveDecisionProcessStateV0, "contentHash"> = {
    artifactSchemaRef: COLLECTIVE_DECISION_PROCESS_STATE_V0,
    inferenceStatus: "online_descriptive_process_state_only",
    truthAccess: "none",
    writeback: "none",
    actionAuthority: "none",
    claimId: source.claimId,
    checkpointIndex: source.checkpointIndex,
    asOfSequence: source.asOfSequence,
    optionIds: sortStrings(source.optionIds),
    expectedAgentIds,
    beliefChoice: {
      thermometerStateRef: normalizedThermometerStateRef,
      publicChoiceObservationStatus: source.beliefChoice.publicChoiceObservationStatus,
      publicChoiceUnavailableReason: source.beliefChoice.publicChoiceUnavailableReason,
      explicitChoiceByAgentId: Object.fromEntries([...source.beliefChoice.publicChoices].sort((left, right) => compareStrings(left.agentId, right.agentId)).map(choice => [choice.agentId, choice.choiceId])),
      observedChoiceCount: source.beliefChoice.publicChoices.length,
      choiceCoverage: source.beliefChoice.publicChoiceObservationStatus === "complete" ? source.beliefChoice.publicChoices.length / expectedAgentIds.length : null,
      missingAgentIds: expectedAgentIds.filter(agentId => !source.beliefChoice.publicChoices.some(choice => choice.agentId === agentId)),
      choiceCoverageUnavailableReason: source.beliefChoice.publicChoiceObservationStatus === "complete" ? null : "public_choice_observation_incomplete",
    },
    registeredInformation,
    sourceDependence,
    discussionUtilization,
    participationResponse,
    heterogeneity,
    resources,
    sourceFingerprints: {
      registeredEvidencePool: fingerprintEstimatorValue({ ...pool, units: [...pool.units].sort((left, right) => compareStrings(left.evidenceUnitId, right.evidenceUnitId)) }),
      exposureLog: fingerprintEstimatorValue({ ...source.exposureLog, records: exposures }),
      discussionActLog: fingerprintEstimatorValue({ ...source.discussionActLog, acts }),
      beliefChoice: fingerprintEstimatorValue({ ...source.beliefChoice, thermometerStateRef: normalizedThermometerStateRef, publicChoices: [...source.beliefChoice.publicChoices].sort((left, right) => left.eventSequence - right.eventSequence || compareStrings(left.agentId, right.agentId)) }),
      agentContexts: fingerprintEstimatorValue(contexts),
      resources: fingerprintEstimatorValue(normalizedResourceInput),
    },
  };
  const contentHash = fingerprintEstimatorValue(body);
  return freezeDeep({ ...body, contentHash });
}

function validateStateKeys(value: unknown): AnyRecord {
  scanForbiddenKeys(value, "state");
  return exactOutput(value, ["artifactSchemaRef", "inferenceStatus", "truthAccess", "writeback", "actionAuthority", "claimId", "checkpointIndex", "asOfSequence", "optionIds", "expectedAgentIds", "beliefChoice", "registeredInformation", "sourceDependence", "discussionUtilization", "participationResponse", "heterogeneity", "resources", "sourceFingerprints", "contentHash"], "state");
}

export function validateCollectiveDecisionProcessStateV0(value: unknown): asserts value is CollectiveDecisionProcessStateV0 {
  const state = validateStateKeys(value);
  const schema = exactOutput(state.artifactSchemaRef, ["id", "version"], "state.artifactSchemaRef");
  if (schema.id !== COLLECTIVE_DECISION_PROCESS_STATE_V0.id || schema.version !== COLLECTIVE_DECISION_PROCESS_STATE_V0.version) fail("decision_process_state_output_keys_invalid", "state.artifactSchemaRef");
  if (state.inferenceStatus !== "online_descriptive_process_state_only" || state.truthAccess !== "none" || state.writeback !== "none" || state.actionAuthority !== "none") fail("decision_process_state_output_keys_invalid", "state");
  nonEmptyString(state.claimId, "state.claimId");
  safeInteger(state.checkpointIndex, "state.checkpointIndex");
  safeInteger(state.asOfSequence, "state.asOfSequence");
  const optionIds = uniqueStrings(state.optionIds, "state.optionIds", 2);
  requireSortedStrings(optionIds, "state.optionIds");
  const expectedAgentIds = uniqueStrings(state.expectedAgentIds, "state.expectedAgentIds", 1);
  requireSortedStrings(expectedAgentIds, "state.expectedAgentIds");
  const belief = exactOutput(state.beliefChoice, ["thermometerStateRef", "publicChoiceObservationStatus", "publicChoiceUnavailableReason", "explicitChoiceByAgentId", "observedChoiceCount", "choiceCoverage", "missingAgentIds", "choiceCoverageUnavailableReason"], "state.beliefChoice");
  const choiceStatus = observationStatus(belief.publicChoiceObservationStatus, "state.beliefChoice.publicChoiceObservationStatus");
  const choiceReason = belief.publicChoiceUnavailableReason;
  statusAndReason(choiceStatus, choiceReason, "state.beliefChoice");
  if (belief.thermometerStateRef !== null) {
    const ref = exactOutput(belief.thermometerStateRef, ["schemaRef", "claimId", "checkpointIndex", "optionIds", "contentHash"], "state.beliefChoice.thermometerStateRef");
    outputContractRef(ref.schemaRef, "state.beliefChoice.thermometerStateRef.schemaRef");
    if (ref.claimId !== state.claimId || ref.checkpointIndex !== state.checkpointIndex) fail("decision_process_state_thermometer_ref_mismatch", "state.beliefChoice.thermometerStateRef");
    const refOptionIds = uniqueStrings(ref.optionIds, "state.beliefChoice.thermometerStateRef.optionIds", 2);
    requireSortedStrings(refOptionIds, "state.beliefChoice.thermometerStateRef.optionIds");
    requireCanonicalEqual(refOptionIds, optionIds, "state.beliefChoice.thermometerStateRef.optionIds");
    nonEmptyString(ref.contentHash, "state.beliefChoice.thermometerStateRef.contentHash");
  }
  const choiceMapKeys = uniqueStrings(outputRecordKeys(belief.explicitChoiceByAgentId, "state.beliefChoice.explicitChoiceByAgentId"), "state.beliefChoice.explicitChoiceByAgentId");
  requireSortedStrings(choiceMapKeys, "state.beliefChoice.explicitChoiceByAgentId");
  const choiceMap = outputMap(belief.explicitChoiceByAgentId, choiceMapKeys, "state.beliefChoice.explicitChoiceByAgentId");
  for (const agentId of choiceMapKeys) {
    if (!expectedAgentIds.includes(agentId)) fail("decision_process_state_reference_unknown", `state.beliefChoice.explicitChoiceByAgentId.${agentId}`);
    if (typeof choiceMap[agentId] !== "string" || !optionIds.includes(choiceMap[agentId] as string)) fail("decision_process_state_choice_option_invalid", `state.beliefChoice.explicitChoiceByAgentId.${agentId}`);
  }
  if (safeInteger(belief.observedChoiceCount, "state.beliefChoice.observedChoiceCount") !== choiceMapKeys.length) fail("decision_process_state_numeric_invalid", "state.beliefChoice.observedChoiceCount");
  const missingAgentIds = uniqueStrings(belief.missingAgentIds, "state.beliefChoice.missingAgentIds");
  requireSortedStrings(missingAgentIds, "state.beliefChoice.missingAgentIds");
  requireCanonicalEqual(missingAgentIds, expectedAgentIds.filter(agentId => !choiceMapKeys.includes(agentId)), "state.beliefChoice.missingAgentIds");
  if (choiceStatus === "complete") {
    if (belief.choiceCoverage !== choiceMapKeys.length / expectedAgentIds.length || belief.choiceCoverageUnavailableReason !== null) fail("decision_process_state_output_keys_invalid", "state.beliefChoice.choiceCoverage");
  } else if (belief.choiceCoverage !== null || belief.choiceCoverageUnavailableReason !== "public_choice_observation_incomplete") {
    fail("decision_process_state_output_keys_invalid", "state.beliefChoice.choiceCoverage");
  }
  const registered = exactOutput(state.registeredInformation, ["denominatorStatus", "exposureObservationStatus", "registeredUnitIds", "observedExposedUnitIds", "unexposedRegisteredUnitIds", "registeredDistinctUnitCount", "observedExposedDistinctUnitCount", "observedExposedUnitIdsByAgentId", "registeredPoolCoverage", "unavailableReason", "interpretation"], "state.registeredInformation");
  const denominatorStatus = enumValue(registered.denominatorStatus, ["registered_complete", "registered_partial", "open_world_unknown"], "state.registeredInformation.denominatorStatus", "decision_process_state_output_keys_invalid");
  const exposureStatus = observationStatus(registered.exposureObservationStatus, "state.registeredInformation.exposureObservationStatus");
  const registeredUnitIds = uniqueStrings(registered.registeredUnitIds, "state.registeredInformation.registeredUnitIds");
  const exposedUnitIds = uniqueStrings(registered.observedExposedUnitIds, "state.registeredInformation.observedExposedUnitIds");
  requireSortedStrings(registeredUnitIds, "state.registeredInformation.registeredUnitIds");
  requireSortedStrings(exposedUnitIds, "state.registeredInformation.observedExposedUnitIds");
  if (exposedUnitIds.some(id => !registeredUnitIds.includes(id))) fail("decision_process_state_reference_unknown", "state.registeredInformation.observedExposedUnitIds");
  if (safeInteger(registered.registeredDistinctUnitCount, "state.registeredInformation.registeredDistinctUnitCount") !== registeredUnitIds.length) fail("decision_process_state_numeric_invalid", "state.registeredInformation.registeredDistinctUnitCount");
  if (safeInteger(registered.observedExposedDistinctUnitCount, "state.registeredInformation.observedExposedDistinctUnitCount") !== exposedUnitIds.length) fail("decision_process_state_numeric_invalid", "state.registeredInformation.observedExposedDistinctUnitCount");
  const exposedByAgent = outputMap(registered.observedExposedUnitIdsByAgentId, expectedAgentIds, "state.registeredInformation.observedExposedUnitIdsByAgentId");
  const exposedUnion = new Set<string>();
  for (const agentId of expectedAgentIds) {
    const ids = uniqueStrings(exposedByAgent[agentId], `state.registeredInformation.observedExposedUnitIdsByAgentId.${agentId}`);
    requireSortedStrings(ids, `state.registeredInformation.observedExposedUnitIdsByAgentId.${agentId}`);
    if (ids.some(id => !registeredUnitIds.includes(id))) fail("decision_process_state_reference_unknown", `state.registeredInformation.observedExposedUnitIdsByAgentId.${agentId}`);
    ids.forEach(id => exposedUnion.add(id));
  }
  requireCanonicalEqual(sortStrings([...exposedUnion]), exposedUnitIds, "state.registeredInformation.observedExposedUnitIdsByAgentId");
  const coverageAvailable = denominatorStatus === "registered_complete" && exposureStatus === "complete" && registeredUnitIds.length > 0;
  if (coverageAvailable) {
    if (registered.registeredPoolCoverage !== exposedUnitIds.length / registeredUnitIds.length) fail("decision_process_state_numeric_invalid", "state.registeredInformation.registeredPoolCoverage");
    const unexposedIds = uniqueStrings(registered.unexposedRegisteredUnitIds, "state.registeredInformation.unexposedRegisteredUnitIds");
    requireSortedStrings(unexposedIds, "state.registeredInformation.unexposedRegisteredUnitIds");
    requireCanonicalEqual(unexposedIds, registeredUnitIds.filter(id => !exposedUnitIds.includes(id)), "state.registeredInformation.unexposedRegisteredUnitIds");
    if (registered.unavailableReason !== null) fail("decision_process_state_output_keys_invalid", "state.registeredInformation.unavailableReason");
  } else {
    const expectedReason = denominatorStatus !== "registered_complete" ? "denominator_not_complete" : exposureStatus !== "complete" ? "exposure_observation_incomplete" : "registered_pool_empty";
    if (registered.registeredPoolCoverage !== null || registered.unexposedRegisteredUnitIds !== null || registered.unavailableReason !== expectedReason) fail("decision_process_state_output_keys_invalid", "state.registeredInformation");
  }
  if (registered.interpretation !== "registered_unit_exposure_only") fail("decision_process_state_output_keys_invalid", "state.registeredInformation.interpretation");
  const dependence = exactOutput(state.sourceDependence, ["lineageObservationStatus", "evidenceUnitCountWithLineage", "evidenceUnitCountWithoutLineage", "recordedLineageCount", "lineageBasisUnitCount", "duplicateObservationStatus", "evidenceUnitCountWithDuplicateGroup", "evidenceUnitCountWithoutDuplicateGroup", "observedDuplicateGroupCount", "duplicateBasisUnitCount", "evidenceUnitDependence", "interpretation"], "state.sourceDependence");
  const lineageStatus = observationStatus(dependence.lineageObservationStatus, "state.sourceDependence.lineageObservationStatus");
  const duplicateStatus = observationStatus(dependence.duplicateObservationStatus, "state.sourceDependence.duplicateObservationStatus");
  const lineageBasis = outputIntegerMap(dependence.lineageBasisUnitCount, ["declared", "ingestion", "estimated"], "state.sourceDependence.lineageBasisUnitCount");
  const duplicateBasis = outputIntegerMap(dependence.duplicateBasisUnitCount, ["declared", "deterministic", "estimated"], "state.sourceDependence.duplicateBasisUnitCount");
  const dependenceIds: string[] = [];
  const lineageIds = new Set<string>();
  const duplicateGroupIds = new Set<string>();
  const derivedLineageBasis = { declared: 0, ingestion: 0, estimated: 0 };
  const derivedDuplicateBasis = { declared: 0, deterministic: 0, estimated: 0 };
  let withLineage = 0;
  let withDuplicate = 0;
  for (const [index, item] of outputArray(dependence.evidenceUnitDependence, "state.sourceDependence.evidenceUnitDependence").entries()) {
    const itemRecord = exactOutput(item, ["evidenceUnitId", "sourceRef", "lineage", "duplicateMembership"], `state.sourceDependence.evidenceUnitDependence[${index}]`);
    const evidenceUnitId = nonEmptyString(itemRecord.evidenceUnitId, `state.sourceDependence.evidenceUnitDependence[${index}].evidenceUnitId`);
    dependenceIds.push(evidenceUnitId);
    const sourceRef = exactOutput(itemRecord.sourceRef, ["id", "kind"], `state.sourceDependence.evidenceUnitDependence[${index}].sourceRef`);
    nonEmptyString(sourceRef.id, `state.sourceDependence.evidenceUnitDependence[${index}].sourceRef.id`);
    enumValue(sourceRef.kind, SOURCE_KINDS, `state.sourceDependence.evidenceUnitDependence[${index}].sourceRef.kind`, "decision_process_state_output_keys_invalid");
    if (itemRecord.lineage !== null) {
      const lineage = exactOutput(itemRecord.lineage, ["id", "basis"], `state.sourceDependence.evidenceUnitDependence[${index}].lineage`);
      lineageIds.add(nonEmptyString(lineage.id, `state.sourceDependence.evidenceUnitDependence[${index}].lineage.id`));
      const basis = enumValue(lineage.basis, LINEAGE_BASES, `state.sourceDependence.evidenceUnitDependence[${index}].lineage.basis`, "decision_process_state_output_keys_invalid");
      derivedLineageBasis[basis] += 1;
      withLineage += 1;
    }
    if (itemRecord.duplicateMembership !== null) {
      const duplicate = exactOutput(itemRecord.duplicateMembership, ["groupId", "basis"], `state.sourceDependence.evidenceUnitDependence[${index}].duplicateMembership`);
      duplicateGroupIds.add(nonEmptyString(duplicate.groupId, `state.sourceDependence.evidenceUnitDependence[${index}].duplicateMembership.groupId`));
      const basis = enumValue(duplicate.basis, DUPLICATE_BASES, `state.sourceDependence.evidenceUnitDependence[${index}].duplicateMembership.basis`, "decision_process_state_output_keys_invalid");
      derivedDuplicateBasis[basis] += 1;
      withDuplicate += 1;
    }
  }
  uniqueStrings(dependenceIds, "state.sourceDependence.evidenceUnitDependence");
  requireSortedStrings(dependenceIds, "state.sourceDependence.evidenceUnitDependence");
  requireCanonicalEqual(dependenceIds, registeredUnitIds, "state.sourceDependence.evidenceUnitDependence");
  if (safeInteger(dependence.evidenceUnitCountWithLineage, "state.sourceDependence.evidenceUnitCountWithLineage") !== withLineage
    || safeInteger(dependence.evidenceUnitCountWithoutLineage, "state.sourceDependence.evidenceUnitCountWithoutLineage") !== registeredUnitIds.length - withLineage
    || safeInteger(dependence.evidenceUnitCountWithDuplicateGroup, "state.sourceDependence.evidenceUnitCountWithDuplicateGroup") !== withDuplicate
    || safeInteger(dependence.evidenceUnitCountWithoutDuplicateGroup, "state.sourceDependence.evidenceUnitCountWithoutDuplicateGroup") !== registeredUnitIds.length - withDuplicate) {
    fail("decision_process_state_numeric_invalid", "state.sourceDependence");
  }
  if ((registeredUnitIds.length === 0 && (lineageStatus !== "complete" || duplicateStatus !== "complete"))
    || (lineageStatus === "complete" && withLineage !== registeredUnitIds.length)
    || (lineageStatus === "missing" && withLineage !== 0)
    || (lineageStatus === "partial" && (withLineage === 0 || withLineage === registeredUnitIds.length))
    || (duplicateStatus === "missing" && withDuplicate !== 0)
    || (duplicateStatus === "partial" && (withDuplicate === 0 || withDuplicate === registeredUnitIds.length))) {
    fail("decision_process_state_denominator_contract_invalid", "state.sourceDependence");
  }
  requireCanonicalEqual(lineageBasis, derivedLineageBasis, "state.sourceDependence.lineageBasisUnitCount");
  requireCanonicalEqual(duplicateBasis, derivedDuplicateBasis, "state.sourceDependence.duplicateBasisUnitCount");
  if ((lineageStatus === "complete" && dependence.recordedLineageCount !== lineageIds.size) || (lineageStatus !== "complete" && dependence.recordedLineageCount !== null)) fail("decision_process_state_output_keys_invalid", "state.sourceDependence.recordedLineageCount");
  if ((duplicateStatus === "complete" && dependence.observedDuplicateGroupCount !== duplicateGroupIds.size) || (duplicateStatus !== "complete" && dependence.observedDuplicateGroupCount !== null)) fail("decision_process_state_output_keys_invalid", "state.sourceDependence.observedDuplicateGroupCount");
  if (dependence.interpretation !== "recorded_dependence_description_only") fail("decision_process_state_output_keys_invalid", "state.sourceDependence.interpretation");
  const discussion = exactOutput(state.discussionUtilization, ["status", "exposureObservationStatus", "actObservationStatus", "denominatorKind", "eligibleExposedDistinctUnitCount", "utilizedDistinctUnitCount", "utilizedUnitIds", "utilizedDistinctUnitCountByKind", "utilizationRate", "utilizationRateByKind", "unusedEligibleUnitCount", "unusedEligibleUnitIds", "unavailableReason", "interpretation"], "state.discussionUtilization");
  const discussionStatus = enumValue(discussion.status, ["available", "unavailable", "not_applicable"], "state.discussionUtilization.status", "decision_process_state_output_keys_invalid");
  const discussionExposureStatus = observationStatus(discussion.exposureObservationStatus, "state.discussionUtilization.exposureObservationStatus");
  const actStatus = observationStatus(discussion.actObservationStatus, "state.discussionUtilization.actObservationStatus");
  if (discussionExposureStatus !== exposureStatus || discussion.denominatorKind !== "distinct_exposed_evidence_units" || discussion.interpretation !== "architecture_observed_use_association_only") fail("decision_process_state_output_keys_invalid", "state.discussionUtilization");
  const utilizationCounts = outputIntegerMap(discussion.utilizedDistinctUnitCountByKind, ACT_KINDS, "state.discussionUtilization.utilizedDistinctUnitCountByKind");
  const utilizationRates = exactOutput(discussion.utilizationRateByKind, ACT_KINDS, "state.discussionUtilization.utilizationRateByKind");
  const expectedDiscussionStatus = discussionExposureStatus !== "complete" || actStatus !== "complete" ? "unavailable" : exposedUnitIds.length === 0 ? "not_applicable" : "available";
  if (discussionStatus !== expectedDiscussionStatus) fail("decision_process_state_output_keys_invalid", "state.discussionUtilization.status");
  if (discussionStatus === "available") {
    const utilizedIds = uniqueStrings(discussion.utilizedUnitIds, "state.discussionUtilization.utilizedUnitIds");
    const unusedIds = uniqueStrings(discussion.unusedEligibleUnitIds, "state.discussionUtilization.unusedEligibleUnitIds");
    requireSortedStrings(utilizedIds, "state.discussionUtilization.utilizedUnitIds");
    requireSortedStrings(unusedIds, "state.discussionUtilization.unusedEligibleUnitIds");
    if (utilizedIds.some(id => !exposedUnitIds.includes(id)) || unusedIds.some(id => !exposedUnitIds.includes(id))) fail("decision_process_state_reference_unknown", "state.discussionUtilization");
    requireCanonicalEqual(sortStrings([...utilizedIds, ...unusedIds]), exposedUnitIds, "state.discussionUtilization.unusedEligibleUnitIds");
    if (discussion.eligibleExposedDistinctUnitCount !== exposedUnitIds.length || discussion.utilizedDistinctUnitCount !== utilizedIds.length || discussion.unusedEligibleUnitCount !== unusedIds.length || discussion.utilizationRate !== utilizedIds.length / exposedUnitIds.length || discussion.unavailableReason !== null) fail("decision_process_state_numeric_invalid", "state.discussionUtilization");
    for (const kind of ACT_KINDS) {
      const count = utilizationCounts[kind] as number;
      if (count > utilizedIds.length || utilizationRates[kind] !== count / exposedUnitIds.length) fail("decision_process_state_numeric_invalid", `state.discussionUtilization.utilizationRateByKind.${kind}`);
    }
  } else if (discussionStatus === "not_applicable") {
    if (discussion.eligibleExposedDistinctUnitCount !== 0 || discussion.utilizedDistinctUnitCount !== 0 || !Array.isArray(discussion.utilizedUnitIds) || discussion.utilizedUnitIds.length !== 0 || discussion.utilizationRate !== null || discussion.unusedEligibleUnitCount !== 0 || !Array.isArray(discussion.unusedEligibleUnitIds) || discussion.unusedEligibleUnitIds.length !== 0 || discussion.unavailableReason !== "no_eligible_exposed_units") fail("decision_process_state_output_keys_invalid", "state.discussionUtilization");
    if (ACT_KINDS.some(kind => utilizationCounts[kind] !== 0 || utilizationRates[kind] !== null)) fail("decision_process_state_output_keys_invalid", "state.discussionUtilization");
  } else {
    const expectedReason = discussionExposureStatus !== "complete" ? "exposure_observation_incomplete" : "structured_use_observation_incomplete";
    if (discussion.eligibleExposedDistinctUnitCount !== null || discussion.utilizedDistinctUnitCount !== null || discussion.utilizedUnitIds !== null || discussion.utilizationRate !== null || discussion.unusedEligibleUnitCount !== null || discussion.unusedEligibleUnitIds !== null || discussion.unavailableReason !== expectedReason) fail("decision_process_state_output_keys_invalid", "state.discussionUtilization");
    if (ACT_KINDS.some(kind => utilizationRates[kind] !== null)) fail("decision_process_state_output_keys_invalid", "state.discussionUtilization.utilizationRateByKind");
  }
  const participation = exactOutput(state.participationResponse, ["speakingActCountByAgentId", "outgoingResponseEdgeCountByAgentId", "receivedResponseEdgeCountByAgentId", "responseAssociationStatus", "responseEdgeCountBySourceAgentId", "informationLinkedResponseEdgeCountBySourceAgentId", "responseEdges", "unavailableReason", "attributionBasis", "interpretation"], "state.participationResponse");
  outputIntegerMap(participation.speakingActCountByAgentId, expectedAgentIds, "state.participationResponse.speakingActCountByAgentId");
  const outgoingMap = outputIntegerMap(participation.outgoingResponseEdgeCountByAgentId, expectedAgentIds, "state.participationResponse.outgoingResponseEdgeCountByAgentId");
  const receivedMap = outputIntegerMap(participation.receivedResponseEdgeCountByAgentId, expectedAgentIds, "state.participationResponse.receivedResponseEdgeCountByAgentId");
  const responseStatus = enumValue(participation.responseAssociationStatus, ["available", "unavailable"], "state.participationResponse.responseAssociationStatus", "decision_process_state_output_keys_invalid");
  if (participation.attributionBasis !== "explicit_response_edge" || participation.interpretation !== "observed_association_not_causal_influence") fail("decision_process_state_output_keys_invalid", "state.participationResponse");
  if (responseStatus === "available") {
    if (actStatus !== "complete" || participation.unavailableReason !== null) fail("decision_process_state_output_keys_invalid", "state.participationResponse");
    const sourceMap = outputIntegerMap(participation.responseEdgeCountBySourceAgentId, expectedAgentIds, "state.participationResponse.responseEdgeCountBySourceAgentId");
    const linkedMap = outputIntegerMap(participation.informationLinkedResponseEdgeCountBySourceAgentId, expectedAgentIds, "state.participationResponse.informationLinkedResponseEdgeCountBySourceAgentId");
    const derivedOutgoing = mapWithRoster(expectedAgentIds, () => 0);
    const derivedReceived = mapWithRoster(expectedAgentIds, () => 0);
    const derivedLinked = mapWithRoster(expectedAgentIds, () => 0);
    const edgeKeys = new Set<string>();
    for (const [index, item] of outputArray(participation.responseEdges, "state.participationResponse.responseEdges").entries()) {
      const edge = exactOutput(item, ["sourceActId", "targetActId", "sourceAgentId", "targetAgentId", "informationLinked"], `state.participationResponse.responseEdges[${index}]`);
      const sourceActId = nonEmptyString(edge.sourceActId, `state.participationResponse.responseEdges[${index}].sourceActId`);
      const targetActId = nonEmptyString(edge.targetActId, `state.participationResponse.responseEdges[${index}].targetActId`);
      const sourceAgentId = nonEmptyString(edge.sourceAgentId, `state.participationResponse.responseEdges[${index}].sourceAgentId`);
      const targetAgentId = nonEmptyString(edge.targetAgentId, `state.participationResponse.responseEdges[${index}].targetAgentId`);
      if (!expectedAgentIds.includes(sourceAgentId) || !expectedAgentIds.includes(targetAgentId)) fail("decision_process_state_reference_unknown", `state.participationResponse.responseEdges[${index}]`);
      if (typeof edge.informationLinked !== "boolean") fail("decision_process_state_output_keys_invalid", `state.participationResponse.responseEdges[${index}].informationLinked`);
      const edgeKey = `${sourceActId}\u0000${targetActId}`;
      if (edgeKeys.has(edgeKey)) fail("decision_process_state_duplicate_id", `state.participationResponse.responseEdges[${index}]`);
      edgeKeys.add(edgeKey);
      derivedOutgoing[targetAgentId] += 1;
      derivedReceived[sourceAgentId] += 1;
      if (edge.informationLinked) derivedLinked[sourceAgentId] += 1;
    }
    requireCanonicalEqual(outgoingMap, derivedOutgoing, "state.participationResponse.outgoingResponseEdgeCountByAgentId");
    requireCanonicalEqual(receivedMap, derivedReceived, "state.participationResponse.receivedResponseEdgeCountByAgentId");
    requireCanonicalEqual(sourceMap, derivedReceived, "state.participationResponse.responseEdgeCountBySourceAgentId");
    requireCanonicalEqual(linkedMap, derivedLinked, "state.participationResponse.informationLinkedResponseEdgeCountBySourceAgentId");
  } else if (actStatus === "complete" || participation.responseEdgeCountBySourceAgentId !== null || participation.informationLinkedResponseEdgeCountBySourceAgentId !== null || participation.responseEdges !== null || participation.unavailableReason !== "structured_response_observation_incomplete") {
    fail("decision_process_state_output_keys_invalid", "state.participationResponse");
  }
  const heterogeneity = exactOutput(state.heterogeneity, ["agentContexts", "metadataCompletenessByDimension", "interpretation"], "state.heterogeneity");
  const contextAgents: string[] = [];
  const contextValues: Array<{ declaredCapabilityClass: string | null; roleRef: unknown; informationAccessRef: unknown; speakerOrder: number | null; authorityRef: unknown }> = [];
  for (const [index, context] of outputArray(heterogeneity.agentContexts, "state.heterogeneity.agentContexts").entries()) {
    const item = exactOutput(context, ["agentId", "modelRef", "declaredCapabilityClass", "roleRef", "informationAccessRef", "speakerOrder", "authorityRef"], `state.heterogeneity.agentContexts[${index}]`);
    contextAgents.push(nonEmptyString(item.agentId, `state.heterogeneity.agentContexts[${index}].agentId`));
    outputContractRef(item.modelRef, `state.heterogeneity.agentContexts[${index}].modelRef`);
    if (item.declaredCapabilityClass !== null) nonEmptyString(item.declaredCapabilityClass, `state.heterogeneity.agentContexts[${index}].declaredCapabilityClass`);
    for (const field of ["roleRef", "informationAccessRef", "authorityRef"] as const) if (item[field] !== null) outputContractRef(item[field], `state.heterogeneity.agentContexts[${index}].${field}`);
    if (item.speakerOrder !== null) safeInteger(item.speakerOrder, `state.heterogeneity.agentContexts[${index}].speakerOrder`);
    contextValues.push(item as unknown as typeof contextValues[number]);
  }
  uniqueStrings(contextAgents, "state.heterogeneity.agentContexts");
  requireSortedStrings(contextAgents, "state.heterogeneity.agentContexts");
  requireCanonicalEqual(contextAgents, expectedAgentIds, "state.heterogeneity.agentContexts");
  const metadata = exactOutput(heterogeneity.metadataCompletenessByDimension, ["model", "declaredCapabilityClass", "role", "informationAccess", "speakerOrder", "authority"], "state.heterogeneity.metadataCompletenessByDimension");
  const expectedMetadata = {
    model: "complete",
    declaredCapabilityClass: metadataStatus(contextValues.map(context => context.declaredCapabilityClass)),
    role: metadataStatus(contextValues.map(context => context.roleRef === null ? null : "present")),
    informationAccess: metadataStatus(contextValues.map(context => context.informationAccessRef === null ? null : "present")),
    speakerOrder: metadataStatus(contextValues.map(context => context.speakerOrder)),
    authority: metadataStatus(contextValues.map(context => context.authorityRef === null ? null : "present")),
  };
  requireCanonicalEqual(metadata, expectedMetadata, "state.heterogeneity.metadataCompletenessByDimension");
  if (heterogeneity.interpretation !== "descriptive_factors_only_not_separable_effects") fail("decision_process_state_output_keys_invalid", "state.heterogeneity.interpretation");
  const resources = exactOutput(state.resources, ["observedUse", "budgetBefore", "candidateActionSurface", "missingness", "actionAuthority"], "state.resources");
  exactOutput(resources.observedUse, ["observationStatus", "unavailableReason", "promptTokens", "completionTokens", "totalTokens", "totalLatencyMs", "invalidOrFailed"], "state.resources.observedUse");
  exactOutput(resources.budgetBefore, ["observationStatus", "unavailableReason", "computeUnits", "latencyUnits"], "state.resources.budgetBefore");
  validateResourceUse(resources.observedUse, "state.resources.observedUse");
  validateResourceBudget(resources.budgetBefore, "state.resources.budgetBefore");
  const surface = exactOutput(resources.candidateActionSurface, ["observationStatus", "unavailableReason", "candidates"], "state.resources.candidateActionSurface");
  const [surfaceStatus] = statusAndReason(surface.observationStatus, surface.unavailableReason, "state.resources.candidateActionSurface");
  const candidateIds: string[] = [];
  for (const [index, candidate] of outputArray(surface.candidates, "state.resources.candidateActionSurface.candidates").entries()) {
    const item = exactOutput(candidate, ["candidateId", "actionRef", "available"], `state.resources.candidateActionSurface.candidates[${index}]`);
    candidateIds.push(nonEmptyString(item.candidateId, `state.resources.candidateActionSurface.candidates[${index}].candidateId`));
    outputContractRef(item.actionRef, `state.resources.candidateActionSurface.candidates[${index}].actionRef`);
    if (typeof item.available !== "boolean") fail("decision_process_state_output_keys_invalid", `state.resources.candidateActionSurface.candidates[${index}].available`);
  }
  uniqueStrings(candidateIds, "state.resources.candidateActionSurface.candidates");
  requireSortedStrings(candidateIds, "state.resources.candidateActionSurface.candidates");
  if (surfaceStatus === "missing" && candidateIds.length > 0) fail("decision_process_state_observation_status_invalid", "state.resources.candidateActionSurface");
  const missingChannels: string[] = [];
  const missingReasonByChannel = new Map<string, string>();
  for (const [index, missing] of outputArray(resources.missingness, "state.resources.missingness").entries()) {
    const item = exactOutput(missing, ["channel", "reason"], `state.resources.missingness[${index}]`);
    const channel = enumValue(item.channel, ["belief_choice", "registered_information", "source_dependence_lineage", "source_dependence_duplicate", "discussion_utilization", "participation_response", "heterogeneity_capability", "heterogeneity_role", "heterogeneity_information_access", "heterogeneity_speaker_order", "heterogeneity_authority", "resource_use", "resource_budget", "action_surface"], `state.resources.missingness[${index}].channel`, "decision_process_state_output_keys_invalid");
    const reason = enumValue(item.reason, ["not_collected", "invalid", "provider_failure", "not_applicable", "partial_record"], `state.resources.missingness[${index}].reason`, "decision_process_state_output_keys_invalid");
    missingChannels.push(channel);
    missingReasonByChannel.set(channel, reason);
  }
  uniqueStrings(missingChannels, "state.resources.missingness");
  requireSortedStrings(missingChannels, "state.resources.missingness");
  const expectedMissingChannels: string[] = [];
  const expectMissing = (channel: MissingnessChannelV0, reason?: MissingnessReasonV0) => {
    expectedMissingChannels.push(channel);
    if (reason !== undefined && missingReasonByChannel.get(channel) !== reason) fail("decision_process_state_output_keys_invalid", `state.resources.missingness.${channel}`);
  };
  const expectStatusMissing = (channel: MissingnessChannelV0, status: ObservationStatusV0) => {
    if (status === "complete") return;
    expectMissing(channel);
    const reason = missingReasonByChannel.get(channel);
    if ((status === "partial" && reason !== "partial_record") || (status === "missing" && !["not_collected", "invalid", "provider_failure"].includes(reason ?? ""))) fail("decision_process_state_output_keys_invalid", `state.resources.missingness.${channel}`);
  };
  const expectDerivedMissing = (channel: MissingnessChannelV0, status: ObservationStatusV0) => {
    if (status === "partial") expectMissing(channel, "partial_record");
    else if (status === "missing") expectMissing(channel, "not_collected");
  };
  if (choiceStatus !== "complete") expectMissing("belief_choice", choiceReason as MissingnessReasonV0);
  if (denominatorStatus === "registered_partial") expectMissing("registered_information", "partial_record");
  else if (denominatorStatus === "open_world_unknown" || (exposureStatus === "complete" && registeredUnitIds.length === 0)) expectMissing("registered_information", "not_applicable");
  else expectStatusMissing("registered_information", exposureStatus);
  expectDerivedMissing("source_dependence_lineage", lineageStatus);
  expectDerivedMissing("source_dependence_duplicate", duplicateStatus);
  if (discussionStatus === "not_applicable") expectMissing("discussion_utilization", "not_applicable");
  else if (discussionStatus === "unavailable") expectStatusMissing("discussion_utilization", discussionExposureStatus !== "complete" ? discussionExposureStatus : actStatus);
  expectStatusMissing("participation_response", actStatus);
  expectDerivedMissing("heterogeneity_capability", expectedMetadata.declaredCapabilityClass);
  expectDerivedMissing("heterogeneity_role", expectedMetadata.role);
  expectDerivedMissing("heterogeneity_information_access", expectedMetadata.informationAccess);
  expectDerivedMissing("heterogeneity_speaker_order", expectedMetadata.speakerOrder);
  expectDerivedMissing("heterogeneity_authority", expectedMetadata.authority);
  const resourceUse = resources.observedUse as unknown as ObservedResourceUseV0;
  const resourceBudget = resources.budgetBefore as unknown as ObservedResourceBudgetV0;
  if (resourceUse.observationStatus !== "complete") expectMissing("resource_use", resourceUse.unavailableReason as MissingnessReasonV0);
  if (resourceBudget.observationStatus !== "complete") expectMissing("resource_budget", resourceBudget.unavailableReason as MissingnessReasonV0);
  if (surfaceStatus !== "complete") expectMissing("action_surface", surface.unavailableReason as MissingnessReasonV0);
  requireCanonicalEqual(sortStrings(expectedMissingChannels), missingChannels, "state.resources.missingness");
  if (resources.actionAuthority !== "none") fail("decision_process_state_output_keys_invalid", "state.resources.actionAuthority");
  const fingerprints = exactOutput(state.sourceFingerprints, ["registeredEvidencePool", "exposureLog", "discussionActLog", "beliefChoice", "agentContexts", "resources"], "state.sourceFingerprints");
  for (const key of ["registeredEvidencePool", "exposureLog", "discussionActLog", "beliefChoice", "agentContexts", "resources"] as const) nonEmptyString(fingerprints[key], `state.sourceFingerprints.${key}`);
  nonEmptyString(state.contentHash, "state.contentHash");
  const body = { ...state };
  delete body.contentHash;
  try {
    if (fingerprintEstimatorValue(body) !== state.contentHash) fail("decision_process_state_hash_mismatch", "state.contentHash");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("decision_process_state_")) throw error;
    fail("decision_process_state_hash_mismatch", "state.contentHash");
  }
}

export function verifyCollectiveDecisionProcessStateV0(input: CollectiveDecisionProcessStateInputV0, state: CollectiveDecisionProcessStateV0): void {
  try {
    validateCollectiveDecisionProcessStateV0(state);
    const expected = projectCollectiveDecisionProcessStateV0(input);
    const actualBody = { ...state } as AnyRecord;
    delete actualBody.contentHash;
    if (fingerprintEstimatorValue(actualBody) !== state.contentHash || canonicalizeEstimatorValue(expected) !== canonicalizeEstimatorValue(state)) {
      fail("decision_process_state_replay_mismatch", "state");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("decision_process_state_")) throw error;
    fail("decision_process_state_hash_mismatch", "state");
  }
}
