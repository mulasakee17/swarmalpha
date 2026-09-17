import { describe, expect, it } from "vitest";
import { buildSocialThermodynamicsM0NullAuditV1 } from "../experiments/campaign/measurement/analyze_social_thermodynamics_m0";

describe("social thermodynamics M0 null-model audit", () => {
  it("separates candidate coordinates without granting empirical authority", () => {
    const audit = buildSocialThermodynamicsM0NullAuditV1();
    expect(audit.providerCalls).toBe(0);
    expect(audit.truthAccess).toBe("none");
    expect(audit.gate.syntheticNonEquivalence).toBe("PASS");
    expect(audit.completeScenarioCoordinateRank).toBeGreaterThanOrEqual(4);
    expect(audit.checks.every(check => check.passed)).toBe(true);
    expect(audit.gate.historicalNondegeneracy).toBe("NOT_ESTABLISHED_BY_THIS_AUDIT");
    expect(audit.gate.promptStability).toBe("NOT_TESTED");
    expect(audit.gate.predictiveValidity).toBe("NOT_TESTED");
    expect(audit.gate.governanceAuthority).toBe("NONE");
  });

  it("keeps incomplete lineage and missing roster members explicit", () => {
    const audit = buildSocialThermodynamicsM0NullAuditV1();
    const partial = audit.scenarios.find(scenario => scenario.id === "partial-lineage");
    expect(partial).toMatchObject({
      lineageCompleteness: "partial",
      effectiveLineageCount: null,
      normalizedLineageEntropy: null,
    });
    const missing = audit.scenarios.find(scenario => scenario.id === "declared-roster-missing-agent");
    expect(missing).toMatchObject({
      activeAgentCount: 2,
      expectedAgentCount: 3,
      missingExpectedAgentCount: 1,
    });
  });

  it("is deterministic and content addressed", () => {
    expect(buildSocialThermodynamicsM0NullAuditV1()).toEqual(buildSocialThermodynamicsM0NullAuditV1());
    expect(buildSocialThermodynamicsM0NullAuditV1().contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
