import { describe, expect, it } from "vitest";
import {
  projectCollectiveDecisionProcessStateV0,
  type CollectiveDecisionProcessStateInputV0,
  type DiscussionActV0,
  type RegisteredEvidenceUnitV0,
} from "@/lib/epistemic";

const optionIds = ["approve", "reject"];
const agentIds = ["a1", "a2"];

function unit(id: string, lineageId = `lineage:${id}`): RegisteredEvidenceUnitV0 {
  return {
    evidenceUnitId: id,
    claimId: "claim:test",
    sourceRef: { id: `source:${id}`, kind: "dataset" },
    lineage: { id: lineageId, basis: "declared" },
    duplicateMembership: null,
  };
}

function baseInput(overrides: Partial<CollectiveDecisionProcessStateInputV0> = {}): CollectiveDecisionProcessStateInputV0 {
  return {
    claimId: "claim:test",
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
      records: [
        { exposureId: "x1", evidenceUnitId: "e1", targetAgentId: "a1", checkpointIndex: 1, eventSequence: 1, channel: "private" },
      ],
    },
    discussionActLog: { observationStatus: "complete", unavailableReason: null, acts: [] },
    beliefChoice: {
      thermometerStateRef: null,
      publicChoiceObservationStatus: "complete",
      publicChoiceUnavailableReason: null,
      publicChoices: [],
    },
    agentContexts: agentIds.map(agentId => ({
      agentId,
      modelRef: { id: `model:${agentId}`, version: "1" },
      declaredCapabilityClass: null,
      roleRef: null,
      informationAccessRef: null,
      speakerOrder: null,
      authorityRef: null,
    })),
    resources: {
      observedUse: {
        observationStatus: "complete",
        unavailableReason: null,
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        totalLatencyMs: 20,
        invalidOrFailed: 0,
      },
      budgetBefore: {
        observationStatus: "complete",
        unavailableReason: null,
        computeUnits: 100,
        latencyUnits: 100,
      },
      candidateActionSurface: { observationStatus: "complete", unavailableReason: null, candidates: [] },
    },
    ...overrides,
  };
}

function acts(items: Array<Pick<DiscussionActV0, "actId" | "agentId" | "eventSequence" | "evidenceUnitIds" | "respondsToActIds">>): DiscussionActV0[] {
  return items.map(item => ({
    actId: item.actId,
    agentId: item.agentId,
    checkpointIndex: 1,
    eventSequence: item.eventSequence,
    actKind: "cite",
    evidenceUnitIds: [...item.evidenceUnitIds],
    respondsToActIds: [...item.respondsToActIds],
    observationBasis: "architecture_recorded",
  }));
}

describe("CollectiveDecisionProcessStateV0", () => {
  it("projects registered coverage over distinct units", () => {
    const oneOfFour = projectCollectiveDecisionProcessStateV0(baseInput());
    const allFour = projectCollectiveDecisionProcessStateV0(baseInput({
      exposureLog: {
        observationStatus: "complete",
        unavailableReason: null,
        records: ["e1", "e2", "e3", "e4"].map((evidenceUnitId, index) => ({
          exposureId: `x${index + 1}`,
          evidenceUnitId,
          targetAgentId: "a1",
          checkpointIndex: 1,
          eventSequence: index + 1,
          channel: "private" as const,
        })),
      },
    }));
    expect(oneOfFour.registeredInformation.observedExposedDistinctUnitCount).toBe(1);
    expect(oneOfFour.registeredInformation.registeredPoolCoverage).toBe(0.25);
    expect(allFour.registeredInformation.observedExposedDistinctUnitCount).toBe(4);
    expect(allFour.registeredInformation.registeredPoolCoverage).toBe(1);
  });

  it("separates exposure from structured discussion utilization", () => {
    const unused = projectCollectiveDecisionProcessStateV0(baseInput());
    const used = projectCollectiveDecisionProcessStateV0(baseInput({
      discussionActLog: {
        observationStatus: "complete",
        unavailableReason: null,
        acts: acts([{ actId: "d1", agentId: "a1", eventSequence: 2, evidenceUnitIds: ["e1"], respondsToActIds: [] }]),
      },
    }));
    expect(unused.registeredInformation.observedExposedDistinctUnitCount).toBe(1);
    expect(unused.discussionUtilization.status).toBe("available");
    expect(unused.discussionUtilization.utilizedDistinctUnitCount).toBe(0);
    expect(used.discussionUtilization.utilizedDistinctUnitCount).toBe(1);
    expect(used.discussionUtilization.utilizationRate).toBe(1);
  });

  it("distinguishes utilization with equal act and resource counts", () => {
    const unlinked = projectCollectiveDecisionProcessStateV0(baseInput({
      discussionActLog: {
        observationStatus: "complete",
        unavailableReason: null,
        acts: acts([{ actId: "d1", agentId: "a1", eventSequence: 2, evidenceUnitIds: [], respondsToActIds: [] }]),
      },
    }));
    const linked = projectCollectiveDecisionProcessStateV0(baseInput({
      discussionActLog: {
        observationStatus: "complete",
        unavailableReason: null,
        acts: acts([{ actId: "d1", agentId: "a1", eventSequence: 2, evidenceUnitIds: ["e1"], respondsToActIds: [] }]),
      },
    }));
    expect(unlinked.participationResponse.speakingActCountByAgentId).toEqual(linked.participationResponse.speakingActCountByAgentId);
    expect(unlinked.resources.observedUse).toEqual(linked.resources.observedUse);
    expect(unlinked.discussionUtilization.utilizedDistinctUnitCount).toBe(0);
    expect(linked.discussionUtilization.utilizedDistinctUnitCount).toBe(1);
  });

  it("fails closed for an incomplete or open-world coverage denominator", () => {
    const partial = projectCollectiveDecisionProcessStateV0(baseInput({
      registeredEvidencePool: {
        denominatorStatus: "registered_partial",
        lineageObservationStatus: "complete",
        duplicateObservationStatus: "complete",
        units: [unit("e1")],
      },
    }));
    const open = projectCollectiveDecisionProcessStateV0(baseInput({
      registeredEvidencePool: {
        denominatorStatus: "open_world_unknown",
        lineageObservationStatus: "complete",
        duplicateObservationStatus: "complete",
        units: [unit("e1")],
      },
    }));
    expect(partial.registeredInformation.registeredPoolCoverage).toBeNull();
    expect(partial.registeredInformation.unavailableReason).toBe("denominator_not_complete");
    expect(open.registeredInformation.registeredPoolCoverage).toBeNull();
    expect(open.resources.missingness).toContainEqual({ channel: "registered_information", reason: "not_applicable" });
  });

  it("distinguishes complete zero-use from unavailable use observation", () => {
    const zero = projectCollectiveDecisionProcessStateV0(baseInput());
    const unavailable = projectCollectiveDecisionProcessStateV0(baseInput({
      discussionActLog: { observationStatus: "missing", unavailableReason: "not_collected", acts: [] },
    }));
    expect(zero.discussionUtilization.status).toBe("available");
    expect(zero.discussionUtilization.utilizedDistinctUnitCount).toBe(0);
    expect(unavailable.discussionUtilization.status).toBe("unavailable");
    expect(unavailable.discussionUtilization.utilizedDistinctUnitCount).toBeNull();
    expect(unavailable.resources.missingness).toContainEqual({ channel: "discussion_utilization", reason: "not_collected" });
  });

  it("marks empty registered and eligible denominators as not applicable", () => {
    const noExposure = projectCollectiveDecisionProcessStateV0(baseInput({
      exposureLog: { observationStatus: "complete", unavailableReason: null, records: [] },
    }));
    expect(noExposure.registeredInformation.registeredPoolCoverage).toBe(0);
    expect(noExposure.discussionUtilization.status).toBe("not_applicable");
    expect(noExposure.resources.missingness).toContainEqual({ channel: "discussion_utilization", reason: "not_applicable" });

    const emptyPool = projectCollectiveDecisionProcessStateV0(baseInput({
      registeredEvidencePool: {
        denominatorStatus: "registered_complete",
        lineageObservationStatus: "complete",
        duplicateObservationStatus: "complete",
        units: [],
      },
      exposureLog: { observationStatus: "complete", unavailableReason: null, records: [] },
    }));
    expect(emptyPool.registeredInformation.registeredPoolCoverage).toBeNull();
    expect(emptyPool.registeredInformation.unavailableReason).toBe("registered_pool_empty");
    expect(emptyPool.resources.missingness).toContainEqual({ channel: "registered_information", reason: "not_applicable" });
    expect(emptyPool.resources.missingness).toContainEqual({ channel: "discussion_utilization", reason: "not_applicable" });
  });

  it("is canonical, replayable, frozen, and does not mutate the input", () => {
    const input = baseInput({
      expectedAgentIds: ["a2", "a1"],
      optionIds: ["reject", "approve"],
      agentContexts: [...baseInput().agentContexts].reverse(),
    });
    const snapshot = JSON.stringify(input);
    const state = projectCollectiveDecisionProcessStateV0(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.resources)).toBe(true);
    expect(() => { state.expectedAgentIds.push("a3"); }).toThrow();
    const permuted = projectCollectiveDecisionProcessStateV0(baseInput());
    expect(state.contentHash).toBe(permuted.contentHash);
    expect(state.sourceFingerprints.agentContexts).toBe(permuted.sourceFingerprints.agentContexts);
  });

  it("canonicalizes component order and defensively copies nested input", () => {
    const input = baseInput({
      registeredEvidencePool: {
        denominatorStatus: "registered_complete",
        lineageObservationStatus: "complete",
        duplicateObservationStatus: "complete",
        units: [unit("e2"), unit("e1")],
      },
      exposureLog: {
        observationStatus: "complete",
        unavailableReason: null,
        records: [
          { exposureId: "x2", evidenceUnitId: "e2", targetAgentId: "a2", checkpointIndex: 1, eventSequence: 2, channel: "private" },
          { exposureId: "x1", evidenceUnitId: "e1", targetAgentId: "a1", checkpointIndex: 1, eventSequence: 1, channel: "private" },
        ],
      },
      discussionActLog: {
        observationStatus: "complete",
        unavailableReason: null,
        acts: acts([
          { actId: "d2", agentId: "a2", eventSequence: 4, evidenceUnitIds: ["e2"], respondsToActIds: ["d1"] },
          { actId: "d1", agentId: "a1", eventSequence: 3, evidenceUnitIds: ["e1"], respondsToActIds: [] },
        ]),
      },
      beliefChoice: {
        thermometerStateRef: null,
        publicChoiceObservationStatus: "complete",
        publicChoiceUnavailableReason: null,
        publicChoices: [
          { agentId: "a2", choiceId: "reject", checkpointIndex: 1, eventSequence: 6 },
          { agentId: "a1", choiceId: "approve", checkpointIndex: 1, eventSequence: 5 },
        ],
      },
      agentContexts: [...baseInput().agentContexts].reverse(),
      resources: {
        ...baseInput().resources,
        candidateActionSurface: {
          observationStatus: "complete",
          unavailableReason: null,
          candidates: [
            { candidateId: "c2", actionRef: { id: "action:two", version: "1" }, available: false },
            { candidateId: "c1", actionRef: { id: "action:one", version: "1" }, available: true },
          ],
        },
      },
    });
    const permuted = JSON.parse(JSON.stringify(input)) as CollectiveDecisionProcessStateInputV0;
    permuted.optionIds.reverse();
    permuted.expectedAgentIds.reverse();
    permuted.registeredEvidencePool.units.reverse();
    permuted.exposureLog.records.reverse();
    permuted.discussionActLog.acts.reverse();
    permuted.beliefChoice.publicChoices.reverse();
    permuted.agentContexts.reverse();
    permuted.resources.candidateActionSurface.candidates.reverse();

    const state = projectCollectiveDecisionProcessStateV0(input);
    const canonicalState = projectCollectiveDecisionProcessStateV0(permuted);
    expect(state.contentHash).toBe(canonicalState.contentHash);
    expect(state.sourceFingerprints).toEqual(canonicalState.sourceFingerprints);

    const serializedState = JSON.stringify(state);
    input.registeredEvidencePool.units[0].sourceRef.id = "mutated";
    input.discussionActLog.acts[0].evidenceUnitIds.length = 0;
    input.agentContexts[0].modelRef.id = "mutated";
    expect(JSON.stringify(state)).toBe(serializedState);
  });
});
