import { describe, expect, it } from "vitest";
import { buildDiscussionThermometerStateSpaceAuditV1 } from
  "../experiments/campaign/v6/analyze_v6_discussion_thermometer_state_space_audit_v1";

describe("discussion thermometer state-space monitoring audit", () => {
  it("distinguishes current group states without truth or prediction", () => {
    const audit = buildDiscussionThermometerStateSpaceAuditV1();
    expect(audit.auditRef).toMatchObject({ version: "1.0.0", providerCalls: 0 });
    expect(audit.truthAccess).toBe("none");
    expect(audit.allChecksPass).toBe(true);
    expect(audit.checks).toHaveLength(9);
    expect(audit.checks.every(check => check.pass)).toBe(true);
    expect(JSON.stringify(audit)).not.toMatch(
      /groundTruth|correctAnswer|brier|predictionTarget|actionRecommendation/i,
    );
  });

  it("keeps agent activity, pooled drift, noise and roster semantics separate", () => {
    const audit = buildDiscussionThermometerStateSpaceAuditV1();
    expect(audit.transitions.cancelingUpdate.meanAgentTv).toBeCloseTo(0.1, 12);
    expect(audit.transitions.cancelingUpdate.pooledTv).toBeCloseTo(0, 12);
    expect(audit.transitions.coherentUpdate.meanAgentTv).toBeCloseTo(0.2, 12);
    expect(audit.transitions.coherentUpdate.pooledTv).toBeCloseTo(0.2, 12);
    expect(audit.transitions.belowRepeatability.comparison).toBe("not_above_reference");
    expect(audit.transitions.incompleteRoster.completeMatchedRoster).toBe(false);
    expect(audit.transitions.incompleteRoster.pooledTv).toBeNull();
    expect(audit.prefixCausality.prefixReadingHashesStable).toBe(true);
  });

  it("retains microstate geometry when minimal macro coordinates collide", () => {
    const audit = buildDiscussionThermometerStateSpaceAuditV1();
    const left = audit.states.find(state => state.label === "macro_collision_a")!;
    const right = audit.states.find(state => state.label === "macro_collision_b")!;
    expect(left.pooled).toEqual(right.pooled);
    expect(left.meanReportEntropy).toBeCloseTo(right.meanReportEntropy!, 12);
    expect(left.generalizedJsd).toBeCloseTo(right.generalizedJsd!, 12);
    expect(left.maxPairwiseTv).not.toBeCloseTo(right.maxPairwiseTv!, 3);
    expect(buildDiscussionThermometerStateSpaceAuditV1().contentHash).toBe(audit.contentHash);
  });
});
