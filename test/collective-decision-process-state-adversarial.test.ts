import { describe, expect, it } from "vitest";
import {
  fingerprintEstimatorValue,
  projectCollectiveDecisionProcessStateV0,
  validateCollectiveDecisionProcessStateInputV0,
  validateCollectiveDecisionProcessStateV0,
  verifyCollectiveDecisionProcessStateV0,
} from "@/lib/epistemic";
import type { CollectiveDecisionProcessStateInputV0 } from "@/lib/epistemic";

function rehashState(state: ReturnType<typeof projectCollectiveDecisionProcessStateV0>): Record<string, any> {
  const mutable = JSON.parse(JSON.stringify(state)) as Record<string, any>;
  const body = { ...mutable };
  delete body.contentHash;
  mutable.contentHash = fingerprintEstimatorValue(body);
  return mutable;
}

function fixture(): CollectiveDecisionProcessStateInputV0 {
  return {
    claimId: "claim:adversarial",
    checkpointIndex: 1,
    asOfSequence: 50,
    optionIds: ["approve", "reject"],
    expectedAgentIds: ["a1", "a2", "a3"],
    registeredEvidencePool: {
      denominatorStatus: "registered_complete",
      lineageObservationStatus: "complete",
      duplicateObservationStatus: "complete",
      units: [
        { evidenceUnitId: "e1", claimId: "claim:adversarial", sourceRef: { id: "s1", kind: "dataset" }, lineage: { id: "l1", basis: "declared" }, duplicateMembership: { groupId: "d1", basis: "deterministic" } },
        { evidenceUnitId: "e2", claimId: "claim:adversarial", sourceRef: { id: "s2", kind: "tool" }, lineage: { id: "l2", basis: "ingestion" }, duplicateMembership: null },
      ],
    },
    exposureLog: {
      observationStatus: "complete",
      unavailableReason: null,
      records: [
        { exposureId: "x1", evidenceUnitId: "e1", targetAgentId: "a1", checkpointIndex: 1, eventSequence: 1, channel: "public" },
        { exposureId: "x2", evidenceUnitId: "e2", targetAgentId: "a2", checkpointIndex: 1, eventSequence: 2, channel: "private" },
      ],
    },
    discussionActLog: {
      observationStatus: "complete",
      unavailableReason: null,
      acts: [
        { actId: "d1", agentId: "a1", checkpointIndex: 1, eventSequence: 3, actKind: "cite", evidenceUnitIds: ["e1"], respondsToActIds: [], observationBasis: "architecture_recorded" },
        { actId: "d2", agentId: "a2", checkpointIndex: 1, eventSequence: 4, actKind: "challenge", evidenceUnitIds: ["e2"], respondsToActIds: ["d1"], observationBasis: "architecture_recorded" },
        { actId: "d3", agentId: "a3", checkpointIndex: 1, eventSequence: 5, actKind: "integrate", evidenceUnitIds: [], respondsToActIds: ["d1"], observationBasis: "architecture_recorded" },
      ],
    },
    beliefChoice: { thermometerStateRef: null, publicChoiceObservationStatus: "complete", publicChoiceUnavailableReason: null, publicChoices: [
      { agentId: "a1", choiceId: "approve", checkpointIndex: 1, eventSequence: 6 },
    ] },
    agentContexts: [
      { agentId: "a1", modelRef: { id: "model:strong", version: "1" }, declaredCapabilityClass: "strong", roleRef: { id: "role:reviewer", version: "1" }, informationAccessRef: { id: "access:full", version: "1" }, speakerOrder: 1, authorityRef: { id: "authority:high", version: "1" } },
      { agentId: "a2", modelRef: { id: "model:weak", version: "1" }, declaredCapabilityClass: "weak", roleRef: { id: "role:critic", version: "1" }, informationAccessRef: { id: "access:partial", version: "1" }, speakerOrder: 2, authorityRef: { id: "authority:low", version: "1" } },
      { agentId: "a3", modelRef: { id: "model:weak", version: "1" }, declaredCapabilityClass: "weak", roleRef: null, informationAccessRef: null, speakerOrder: 3, authorityRef: null },
    ],
    resources: {
      observedUse: { observationStatus: "partial", unavailableReason: "partial_record", promptTokens: 10, completionTokens: null, totalTokens: null, totalLatencyMs: 20, invalidOrFailed: 0 },
      budgetBefore: { observationStatus: "missing", unavailableReason: "provider_failure", computeUnits: null, latencyUnits: null },
      candidateActionSurface: { observationStatus: "complete", unavailableReason: null, candidates: [{ candidateId: "c1", actionRef: { id: "action:private-report", version: "1" }, available: true }] },
    },
  };
}

describe("CollectiveDecisionProcessStateV0 adversarial invariants", () => {
  it("describes lineage and response association without causal labels", () => {
    const state = projectCollectiveDecisionProcessStateV0(fixture());
    expect(state.sourceDependence.recordedLineageCount).toBe(2);
    expect(state.sourceDependence.lineageBasisUnitCount).toEqual({ declared: 1, ingestion: 1, estimated: 0 });
    expect(state.sourceDependence.observedDuplicateGroupCount).toBe(1);
    expect(state.participationResponse.responseAssociationStatus).toBe("available");
    expect(state.participationResponse.responseEdgeCountBySourceAgentId).toEqual({ a1: 2, a2: 0, a3: 0 });
    expect(state.participationResponse.informationLinkedResponseEdgeCountBySourceAgentId).toEqual({ a1: 2, a2: 0, a3: 0 });
    expect(state.participationResponse.responseEdges).toHaveLength(2);
    expect(state.participationResponse.interpretation).toBe("observed_association_not_causal_influence");
    expect(state.heterogeneity.agentContexts[0].modelRef.id).toBe("model:strong");
    expect(state.heterogeneity.metadataCompletenessByDimension).toEqual({
      model: "complete",
      declaredCapabilityClass: "complete",
      role: "partial",
      informationAccess: "partial",
      speakerOrder: "complete",
      authority: "partial",
    });
  });

  it("separates recorded lineage diversity from unknown lineage completeness", () => {
    const shared = fixture();
    shared.registeredEvidencePool.units[1].lineage = { id: "l1", basis: "declared" };
    const sharedState = projectCollectiveDecisionProcessStateV0(shared);
    const distinctState = projectCollectiveDecisionProcessStateV0(fixture());
    expect(sharedState.sourceDependence.recordedLineageCount).toBe(1);
    expect(distinctState.sourceDependence.recordedLineageCount).toBe(2);
    expect(sharedState.sourceDependence.interpretation).toBe("recorded_dependence_description_only");

    const partial = fixture();
    partial.registeredEvidencePool.lineageObservationStatus = "partial";
    partial.registeredEvidencePool.units[1].lineage = null;
    const partialState = projectCollectiveDecisionProcessStateV0(partial);
    expect(partialState.sourceDependence.recordedLineageCount).toBeNull();
    expect(partialState.resources.missingness).toContainEqual({ channel: "source_dependence_lineage", reason: "partial_record" });
  });

  it("distinguishes response concentration with equal speaking and edge counts", () => {
    const concentrated = projectCollectiveDecisionProcessStateV0(fixture());
    const distributedInput = fixture();
    distributedInput.discussionActLog.acts[2].respondsToActIds = ["d2"];
    const distributed = projectCollectiveDecisionProcessStateV0(distributedInput);
    expect(concentrated.participationResponse.speakingActCountByAgentId).toEqual(distributed.participationResponse.speakingActCountByAgentId);
    expect(concentrated.participationResponse.responseEdges).toHaveLength(distributed.participationResponse.responseEdges?.length ?? -1);
    expect(concentrated.participationResponse.responseEdgeCountBySourceAgentId).toEqual({ a1: 2, a2: 0, a3: 0 });
    expect(distributed.participationResponse.responseEdgeCountBySourceAgentId).toEqual({ a1: 1, a2: 1, a3: 0 });
  });

  it("preserves capability, role, access, order, and authority as separate conditions", () => {
    const partialState = projectCollectiveDecisionProcessStateV0(fixture());
    const authorityOnly = fixture();
    authorityOnly.agentContexts[2].authorityRef = { id: "authority:low", version: "1" };
    const authorityState = projectCollectiveDecisionProcessStateV0(authorityOnly);
    expect(authorityState.heterogeneity.metadataCompletenessByDimension).toEqual({
      ...partialState.heterogeneity.metadataCompletenessByDimension,
      authority: "complete",
    });
    expect(authorityState.heterogeneity.agentContexts[2]).toEqual({
      ...partialState.heterogeneity.agentContexts[2],
      authorityRef: { id: "authority:low", version: "1" },
    });
  });

  it("keeps partial and provider-failed resource facts distinct", () => {
    const state = projectCollectiveDecisionProcessStateV0(fixture());
    expect(state.resources.missingness).toEqual([
      { channel: "heterogeneity_authority", reason: "partial_record" },
      { channel: "heterogeneity_information_access", reason: "partial_record" },
      { channel: "heterogeneity_role", reason: "partial_record" },
      { channel: "resource_budget", reason: "provider_failure" },
      { channel: "resource_use", reason: "partial_record" },
    ]);
    expect(state.resources.candidateActionSurface.candidates).toEqual([
      { candidateId: "c1", actionRef: { id: "action:private-report", version: "1" }, available: true },
    ]);
  });

  it("separates complete zero resource use from missing resource observation", () => {
    const zeroInput = fixture();
    zeroInput.resources.observedUse = {
      observationStatus: "complete",
      unavailableReason: null,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalLatencyMs: 0,
      invalidOrFailed: 0,
    };
    const missingInput = fixture();
    missingInput.resources.observedUse = {
      observationStatus: "missing",
      unavailableReason: "not_collected",
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      totalLatencyMs: null,
      invalidOrFailed: null,
    };
    const zero = projectCollectiveDecisionProcessStateV0(zeroInput);
    const missing = projectCollectiveDecisionProcessStateV0(missingInput);
    expect(zero.resources.observedUse.totalTokens).toBe(0);
    expect(zero.resources.missingness).not.toContainEqual({ channel: "resource_use", reason: "not_collected" });
    expect(missing.resources.observedUse.totalTokens).toBeNull();
    expect(missing.resources.missingness).toContainEqual({ channel: "resource_use", reason: "not_collected" });
  });

  it.each([
    ["forbidden truth field", () => ({ ...fixture(), groundTruth: true })],
    ["future event", () => ({ ...fixture(), asOfSequence: 4 })],
    ["invalid public choice", () => ({ ...fixture(), beliefChoice: { ...fixture().beliefChoice, publicChoices: [{ agentId: "a1", choiceId: "not-an-option", checkpointIndex: 1, eventSequence: 6 }] } })],
    ["response to future act", () => ({ ...fixture(), discussionActLog: { ...fixture().discussionActLog, acts: fixture().discussionActLog.acts.map((act, index) => index === 0 ? { ...act, respondsToActIds: ["d2"] } : act) } })],
    ["act without prior exposure", () => ({ ...fixture(), discussionActLog: { ...fixture().discussionActLog, acts: fixture().discussionActLog.acts.map((act, index) => index === 0 ? { ...act, evidenceUnitIds: ["e2"] } : act) } })],
  ])("fails closed for %s", (_name, makeInput) => {
    expect(() => validateCollectiveDecisionProcessStateInputV0(makeInput())).toThrowError(/decision_process_state_/);
  });

  it("keeps online state independent of offline outcomes", () => {
    const stateA = projectCollectiveDecisionProcessStateV0(fixture());
    const stateB = projectCollectiveDecisionProcessStateV0(JSON.parse(JSON.stringify(fixture())) as CollectiveDecisionProcessStateInputV0);
    expect(stateA.contentHash).toBe(stateB.contentHash);
    expect(() => validateCollectiveDecisionProcessStateInputV0({ ...fixture(), finalOutcome: { quality: 1 } })).toThrowError(/forbidden_truth_field/);
  });

  it("verifies replay and detects a tampered state", () => {
    const input = fixture();
    const state = projectCollectiveDecisionProcessStateV0(input);
    expect(() => verifyCollectiveDecisionProcessStateV0(input, state)).not.toThrow();
    const tampered = { ...state, claimId: "claim:tampered" };
    expect(() => validateCollectiveDecisionProcessStateV0(tampered)).toThrowError(/hash_mismatch/);
    expect(() => verifyCollectiveDecisionProcessStateV0(input, tampered)).toThrowError(/replay_mismatch|hash_mismatch/);
  });

  it.each([
    ["choice outside the option contract", (state: Record<string, any>) => { state.beliefChoice.explicitChoiceByAgentId.a1 = "unknown"; }],
    ["impossible utilization rate", (state: Record<string, any>) => { state.discussionUtilization.utilizationRate = 2; }],
    ["inconsistent lineage count", (state: Record<string, any>) => { state.sourceDependence.evidenceUnitCountWithLineage = 99; }],
    ["negative resource count", (state: Record<string, any>) => { state.resources.observedUse.promptTokens = -1; }],
    ["missingness channel omission", (state: Record<string, any>) => { state.resources.missingness = state.resources.missingness.filter((item: { channel: string }) => item.channel !== "resource_budget"); }],
  ])("rejects a rehashed output with %s", (_name, mutate) => {
    const state = rehashState(projectCollectiveDecisionProcessStateV0(fixture()));
    mutate(state);
    const body = { ...state };
    delete body.contentHash;
    state.contentHash = fingerprintEstimatorValue(body);
    expect(() => validateCollectiveDecisionProcessStateV0(state)).toThrowError(/decision_process_state_/);
  });

  it("rejects missing observations mislabeled as partial records", () => {
    const input = fixture();
    input.exposureLog = { observationStatus: "missing", unavailableReason: "partial_record", records: [] };
    expect(() => validateCollectiveDecisionProcessStateInputV0(input)).toThrowError(/observation_status_invalid/);
  });
});
