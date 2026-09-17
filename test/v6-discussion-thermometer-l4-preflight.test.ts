import { describe, expect, it } from "vitest";
import {
  buildDiscussionThermometerL4PreflightV1,
  buildL4ProviderCallBudgetV1,
  buildL4SemanticReviewPacketV1,
  L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1,
  parseL4StructuredPublicTurnV1,
  type L4HumanSemanticReviewDecisionV1,
} from "../experiments/campaign/v6/discussionThermometerL4PreflightV1";

const human = (sourceTaskId: number, group: string): L4HumanSemanticReviewDecisionV1 => ({
  sourceTaskId,
  reviewStatus: "accepted",
  semanticLeakageGroupId: group,
  crossSplitStatus: "clear",
  overlapSourceTaskIds: [],
  reviewer: {
    kind: "human",
    reviewerId: "reviewer:test",
    reviewedAt: "2026-08-30T00:00:00.000Z",
  },
});

describe("discussion thermometer L4 preflight", () => {
  it("exposes an outcome-blind human review packet and the honest N4K3 capacity", () => {
    const packet = buildL4SemanticReviewPacketV1();
    expect(packet).toHaveLength(37);
    expect(packet.filter(entry => entry.shapeEligible)).toHaveLength(35);
    expect(packet.find(entry => entry.sourceTaskId === 33)?.shapeEligible).toBe(false);
    expect(packet.find(entry => entry.sourceTaskId === 38)?.shapeEligible).toBe(false);
    for (const entry of packet) {
      expect(entry).not.toHaveProperty("correctAnswer");
      expect(entry).not.toHaveProperty("rationale");
      expect(JSON.stringify(entry)).not.toContain("correct_answer");
    }
  });

  it("fails closed before human review and cost freeze", () => {
    const preflight = buildDiscussionThermometerL4PreflightV1();
    expect(preflight.readiness).toBe("DEFER");
    expect(preflight.acceptedIndependentSemanticGroupCount).toBe(0);
    expect(preflight.blockers).toContain("HUMAN_SEMANTIC_REVIEW_INCOMPLETE");
    expect(preflight.blockers).toContain("INSUFFICIENT_INDEPENDENT_SEMANTIC_GROUPS");
    expect(preflight.developmentGrouping).toMatchObject({
      authority: "ai_adjudicated_development_only",
      scientificSplitAuthority: "none",
      groupCount: 7,
    });
    const groupedIds = preflight.developmentGrouping.groups.flatMap(group => group.sourceTaskIds);
    expect(groupedIds).toHaveLength(35);
    expect(new Set(groupedIds).size).toBe(35);
    expect(preflight.developmentScreen.stage1TaskIds).toEqual([5, 7, 13, 11, 16, 3, 14]);
    expect(preflight.developmentScreen.stage1Budget.totalProviderCalls).toBe(203);
    expect(preflight.developmentScreen.stage2TaskIds).toEqual([47, 12, 24, 21, 23]);
    expect(preflight.developmentScreen.stage2IncrementalBudget.totalProviderCalls).toBe(145);
  });

  it("does not count two tasks in one semantic group as two independent groups", () => {
    let eligibleIndex = 0;
    const decisions = L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1.map(id => {
      const groupIndex = id === 33 || id === 38 ? 99 + id : Math.floor(eligibleIndex++ / 2);
      return human(id, `semantic:g${groupIndex}`);
    });
    const preflight = buildDiscussionThermometerL4PreflightV1(decisions);
    expect(preflight.acceptedTaskIds).toHaveLength(35);
    expect(preflight.acceptedIndependentSemanticGroupCount).toBe(18);
    expect(preflight.readiness).toBe("DEFER");
  });

  it("freezes the minimal target budget and balances one duplicate cell per task", () => {
    const budget = buildL4ProviderCallBudgetV1(32);
    expect(budget).toMatchObject({
      publicDiscussionCalls: 384,
      primarySensorCalls: 512,
      duplicateSensorCalls: 32,
      totalProviderCalls: 928,
      maximumOutputTokens: 434_176,
      inputTokens: null,
      monetaryCost: null,
    });
    const shapeEligibleIds = buildL4SemanticReviewPacketV1()
      .filter(entry => entry.shapeEligible).map(entry => entry.sourceTaskId);
    const decisions = L4_UNREVIEWED_CANDIDATE_TASK_IDS_V1.map((id, index) =>
      human(id, `semantic:g${index}`));
    const preflight = buildDiscussionThermometerL4PreflightV1(decisions);
    expect(preflight.selectedTaskIds).toHaveLength(32);
    const schedule = preflight.duplicateSensorSchedule;
    expect(new Set(schedule.map(cell => `${cell.agentPosition}:${cell.checkpointRound}`)).size).toBe(16);
    expect(schedule.every(cell => shapeEligibleIds.includes(cell.sourceTaskId))).toBe(true);
  });

  it("requires an exact structured public choice plus a non-empty discussion message", () => {
    expect(parseL4StructuredPublicTurnV1(
      '{"choiceId":"O2","message":"Peer evidence changes my current choice."}',
      ["O1", "O2", "O3"],
    )).toEqual({ choiceId: "O2", message: "Peer evidence changes my current choice." });
    expect(() => parseL4StructuredPublicTurnV1('{"choiceId":"O4","message":"x"}', ["O1", "O2", "O3"]))
      .toThrow(/choice_invalid/);
    expect(() => parseL4StructuredPublicTurnV1('{"choiceId":"O2","message":"x","confidence":1}', ["O1", "O2", "O3"]))
      .toThrow(/fields_invalid/);
  });

  it("rejects machine or malformed scientific review provenance", () => {
    expect(() => buildL4SemanticReviewPacketV1([{
      ...human(3, "semantic:g3"),
      reviewer: { kind: "machine", reviewerId: "model", reviewedAt: "2026-08-30T00:00:00.000Z" },
    } as never])).toThrow(/human_provenance_invalid/);
    expect(() => buildL4SemanticReviewPacketV1([{
      ...human(3, "semantic:g3"),
      extra: true,
    } as never])).toThrow(/fields_invalid/);
  });
});
