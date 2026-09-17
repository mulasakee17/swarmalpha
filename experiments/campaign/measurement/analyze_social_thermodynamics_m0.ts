/**
 * Social Thermodynamics Phase M0 — deterministic null-model audit.
 *
 * This module performs no provider call and reads no outcome. It constructs
 * adversarial/synthetic collective states through the current epistemic
 * kernel, then checks whether candidate macro coordinates distinguish cases
 * that simple consensus or top-choice counts collapse together.
 *
 * Scientific boundary: synthetic separation establishes mathematical
 * non-equivalence only. It does not establish empirical construct validity,
 * predictive value, intervention response, or governance authority.
 */

import { pathToFileURL } from "node:url";
import {
  fingerprintEstimatorValue,
  projectCollectiveEpistemicStateV1,
  type BeliefReport,
  type CategoricalEpistemicClaim,
  type CollectiveEpistemicStateV1,
  type EpistemicEvidence,
} from "../../../src/lib/epistemic";

export const SOCIAL_THERMODYNAMICS_M0_NULL_AUDIT_V1 = Object.freeze({
  id: "swarmalpha.social-thermodynamics.m0-null-audit",
  version: "1.0.0",
});

const CREATED_AT = "2026-08-24T00:00:00.000Z";
const OPTIONS = ["A", "B", "C"] as const;

type Probabilities = Record<(typeof OPTIONS)[number], number>;

interface ScenarioSpecV1 {
  id: string;
  probabilities: Probabilities[];
  lineages: Array<string | null>;
  expectedAgentIds?: string[];
}

export interface M0ScenarioProjectionV1 {
  id: string;
  activeAgentCount: number;
  expectedAgentCount: number;
  missingExpectedAgentCount: number;
  topChoiceMajorityFraction: number;
  meanTopProbability: number;
  withinAgentUncertainty: number;
  pooledUncertainty: number;
  betweenAgentDisagreement: number;
  pooledCertainty: number;
  lineageCompleteness: "complete" | "partial" | "missing";
  effectiveLineageCount: number | null;
  normalizedLineageEntropy: number | null;
}

export interface M0NullAuditCheckV1 {
  id: string;
  passed: boolean;
  establishes: string;
  doesNotEstablish: string;
  values: Record<string, number | string | boolean | null>;
}

export interface SocialThermodynamicsM0NullAuditV1 {
  artifactSchemaRef: typeof SOCIAL_THERMODYNAMICS_M0_NULL_AUDIT_V1;
  inferenceStatus: "synthetic_formula_audit_only";
  truthAccess: "none";
  providerCalls: 0;
  scenarios: M0ScenarioProjectionV1[];
  checks: M0NullAuditCheckV1[];
  completeScenarioCoordinateRank: number;
  completeScenarioCoordinateCount: number;
  gate: {
    ontology: "PASS";
    deterministicProjection: "PASS";
    syntheticNonEquivalence: "PASS" | "FAIL";
    historicalNondegeneracy: "NOT_ESTABLISHED_BY_THIS_AUDIT";
    promptStability: "NOT_TESTED";
    predictiveValidity: "NOT_TESTED";
    governanceAuthority: "NONE";
  };
  contentHash: string;
}

function claim(id: string, options: string[] = [...OPTIONS]): CategoricalEpistemicClaim {
  return {
    id,
    proposition: "Choose one registered option.",
    domain: "test",
    createdAt: CREATED_AT,
    options,
    resolutionPolicy: { kind: "categorical", resolverId: "resolver:m0-never-opened" },
  };
}

function evidence(id: string, lineageId: string): EpistemicEvidence {
  return {
    id,
    content: `synthetic evidence ${id}`,
    createdAt: CREATED_AT,
    provenance: {
      sourceKind: "dataset",
      sourceId: `source:${lineageId}`,
      contentHash: `sha256:m0:${id}`,
      lineageId,
    },
  };
}

function report(input: {
  claimId: string;
  index: number;
  probabilities: Probabilities;
  evidenceId?: string;
}): BeliefReport {
  return {
    id: `report:${input.claimId}:${input.index + 1}`,
    claimId: input.claimId,
    agentId: `agent:${input.index + 1}`,
    round: 1,
    value: { kind: "categorical", probabilities: { ...input.probabilities } },
    evidence: input.evidenceId ? [{ evidenceId: input.evidenceId, relation: "supports" }] : [],
    stake: 0,
    createdAt: CREATED_AT,
  };
}

function topChoice(probabilities: Probabilities): string[] {
  const maximum = Math.max(...Object.values(probabilities));
  return Object.keys(probabilities).filter(option => probabilities[option as keyof Probabilities] === maximum).sort();
}

function project(spec: ScenarioSpecV1): { projection: M0ScenarioProjectionV1; state: CollectiveEpistemicStateV1 } {
  const c = claim(`claim:m0:${spec.id}`);
  const items: EpistemicEvidence[] = [];
  const reports = spec.probabilities.map((probabilities, index) => {
    const lineage = spec.lineages[index];
    const evidenceId = lineage === null ? undefined : `evidence:${spec.id}:${index + 1}`;
    if (evidenceId && lineage !== null) items.push(evidence(evidenceId, lineage));
    return report({ claimId: c.id, index, probabilities, ...(evidenceId ? { evidenceId } : {}) });
  });
  const state = projectCollectiveEpistemicStateV1({
    claim: c,
    reports,
    evidence: items,
    exposures: [],
    asOfRound: 1,
    ...(spec.expectedAgentIds ? { expectedAgentIds: spec.expectedAgentIds } : {}),
  });
  const choiceCounts = new Map<string, number>();
  for (const probabilities of spec.probabilities) {
    for (const option of topChoice(probabilities)) {
      choiceCounts.set(option, (choiceCounts.get(option) ?? 0) + 1 / topChoice(probabilities).length);
    }
  }
  const majority = Math.max(...choiceCounts.values());
  return {
    state,
    projection: {
      id: spec.id,
      activeAgentCount: state.activeAgentIds.length,
      expectedAgentCount: state.expectedAgentIds.length,
      missingExpectedAgentCount: state.missingExpectedAgentIds.length,
      topChoiceMajorityFraction: majority / spec.probabilities.length,
      meanTopProbability: spec.probabilities.reduce((sum, probabilities) => sum + Math.max(...Object.values(probabilities)), 0)
        / spec.probabilities.length,
      withinAgentUncertainty: state.withinAgentUncertainty,
      pooledUncertainty: state.pooledUncertainty,
      betweenAgentDisagreement: state.betweenAgentDisagreement,
      pooledCertainty: state.pooledCertainty,
      lineageCompleteness: state.declaredLineageDiversity.completeness,
      effectiveLineageCount: state.declaredLineageDiversity.effectiveLineageCount,
      normalizedLineageEntropy: state.declaredLineageDiversity.normalizedLineageEntropy,
    },
  };
}

function matrixRank(matrix: number[][], tolerance = 1e-10): number {
  if (matrix.length === 0 || matrix[0].length === 0) return 0;
  const work = matrix.map(row => [...row]);
  let rank = 0;
  let column = 0;
  while (rank < work.length && column < work[0].length) {
    let pivot = rank;
    for (let row = rank + 1; row < work.length; row += 1) {
      if (Math.abs(work[row][column]) > Math.abs(work[pivot][column])) pivot = row;
    }
    if (Math.abs(work[pivot][column]) <= tolerance) {
      column += 1;
      continue;
    }
    [work[rank], work[pivot]] = [work[pivot], work[rank]];
    const divisor = work[rank][column];
    for (let col = column; col < work[rank].length; col += 1) work[rank][col] /= divisor;
    for (let row = 0; row < work.length; row += 1) {
      if (row === rank) continue;
      const factor = work[row][column];
      for (let col = column; col < work[row].length; col += 1) work[row][col] -= factor * work[rank][col];
    }
    rank += 1;
    column += 1;
  }
  return rank;
}

function equalWithin(a: M0ScenarioProjectionV1, b: M0ScenarioProjectionV1, tolerance = 1e-12): boolean {
  return Math.abs(a.withinAgentUncertainty - b.withinAgentUncertainty) <= tolerance
    && Math.abs(a.pooledUncertainty - b.pooledUncertainty) <= tolerance
    && Math.abs(a.betweenAgentDisagreement - b.betweenAgentDisagreement) <= tolerance;
}

export function buildSocialThermodynamicsM0NullAuditV1(): SocialThermodynamicsM0NullAuditV1 {
  const uniform = { A: 1 / 3, B: 1 / 3, C: 1 / 3 };
  const confidentA = { A: 0.9, B: 0.05, C: 0.05 };
  const confidentB = { A: 0.05, B: 0.9, C: 0.05 };
  const confidentC = { A: 0.05, B: 0.05, C: 0.9 };
  const softA = { A: 0.5, B: 0.3, C: 0.2 };
  const specs: ScenarioSpecV1[] = [
    { id: "uniform-uncertain-distinct-lineage", probabilities: [uniform, uniform, uniform], lineages: ["l1", "l2", "l3"] },
    { id: "confident-consensus-shared-lineage", probabilities: [confidentA, confidentA, confidentA], lineages: ["shared", "shared", "shared"] },
    { id: "confident-consensus-distinct-lineage", probabilities: [confidentA, confidentA, confidentA], lineages: ["l1", "l2", "l3"] },
    { id: "confident-polarization-distinct-lineage", probabilities: [confidentA, confidentB, confidentC], lineages: ["l1", "l2", "l3"] },
    { id: "soft-consensus-distinct-lineage", probabilities: [softA, softA, softA], lineages: ["l1", "l2", "l3"] },
    { id: "partial-lineage", probabilities: [confidentA, confidentA, confidentA], lineages: ["l1", null, "l3"] },
    {
      id: "declared-roster-missing-agent",
      probabilities: [confidentA, confidentA],
      lineages: ["l1", "l2"],
      expectedAgentIds: ["agent:1", "agent:2", "agent:3"],
    },
  ];
  const projected = specs.map(project);
  const byId = new Map(projected.map(item => [item.projection.id, item]));
  const get = (id: string): M0ScenarioProjectionV1 => {
    const item = byId.get(id);
    if (!item) throw new Error(`missing M0 scenario ${id}`);
    return item.projection;
  };

  const shared = get("confident-consensus-shared-lineage");
  const distinct = get("confident-consensus-distinct-lineage");
  const polarized = get("confident-polarization-distinct-lineage");
  const uncertain = get("uniform-uncertain-distinct-lineage");
  const soft = get("soft-consensus-distinct-lineage");
  const partial = get("partial-lineage");
  const missingRoster = get("declared-roster-missing-agent");

  // Rename and reorder every option while preserving probability mass. Numeric
  // geometry must remain equal even though claim/source fingerprints differ.
  const renamedClaim = claim("claim:m0:renamed", ["Y", "Z", "X"]);
  const renamedReports: BeliefReport[] = [0, 1, 2].map(index => ({
    id: `report:renamed:${index + 1}`,
    claimId: renamedClaim.id,
    agentId: `agent:${index + 1}`,
    round: 1,
    value: { kind: "categorical", probabilities: { X: 0.9, Y: 0.05, Z: 0.05 } },
    evidence: [{ evidenceId: `evidence:renamed:${index + 1}`, relation: "supports" }],
    stake: 0,
    createdAt: CREATED_AT,
  }));
  const renamedEvidence = [0, 1, 2].map(index => evidence(`evidence:renamed:${index + 1}`, `l${index + 1}`));
  const renamed = projectCollectiveEpistemicStateV1({
    claim: renamedClaim,
    reports: renamedReports,
    evidence: renamedEvidence,
    exposures: [],
    asOfRound: 1,
  });
  const permutationInvariant = Math.abs(renamed.withinAgentUncertainty - distinct.withinAgentUncertainty) <= 1e-12
    && Math.abs(renamed.pooledUncertainty - distinct.pooledUncertainty) <= 1e-12
    && Math.abs(renamed.betweenAgentDisagreement - distinct.betweenAgentDisagreement) <= 1e-12
    && Math.abs((renamed.declaredLineageDiversity.effectiveLineageCount ?? -1) - (distinct.effectiveLineageCount ?? -2)) <= 1e-12;

  const checks: M0NullAuditCheckV1[] = [
    {
      id: "within-between-separation",
      passed: Math.abs(polarized.pooledUncertainty - uncertain.pooledUncertainty) <= 1e-12
        && polarized.betweenAgentDisagreement > uncertain.betweenAgentDisagreement
        && polarized.withinAgentUncertainty < uncertain.withinAgentUncertainty,
      establishes: "Equal pooled uncertainty can coexist with different within-agent uncertainty and between-agent disagreement.",
      doesNotEstablish: "Either coordinate predicts decision quality.",
      values: {
        pooledUncertaintyPolarized: polarized.pooledUncertainty,
        pooledUncertaintyUniform: uncertain.pooledUncertainty,
        betweenPolarized: polarized.betweenAgentDisagreement,
        betweenUniform: uncertain.betweenAgentDisagreement,
      },
    },
    {
      id: "lineage-orthogonal-to-report-geometry",
      passed: equalWithin(shared, distinct)
        && shared.effectiveLineageCount === 1
        && (distinct.effectiveLineageCount ?? 0) > 1,
      establishes: "Declared lineage diversity is not determined by report probability geometry.",
      doesNotEstablish: "Declared lineages are statistically independent or reliable.",
      values: {
        sharedEffectiveLineageCount: shared.effectiveLineageCount,
        distinctEffectiveLineageCount: distinct.effectiveLineageCount,
        sharedBetweenDisagreement: shared.betweenAgentDisagreement,
        distinctBetweenDisagreement: distinct.betweenAgentDisagreement,
      },
    },
    {
      id: "top-choice-count-is-insufficient",
      passed: distinct.topChoiceMajorityFraction === soft.topChoiceMajorityFraction
        && Math.abs(distinct.meanTopProbability - soft.meanTopProbability) > 0.1
        && Math.abs(distinct.withinAgentUncertainty - soft.withinAgentUncertainty) > 0.1,
      establishes: "Identical unanimous top choices can mask materially different probability geometry.",
      doesNotEstablish: "The richer geometry is empirically stable under prompt variation.",
      values: {
        majorityFraction: distinct.topChoiceMajorityFraction,
        confidentMeanTopProbability: distinct.meanTopProbability,
        softMeanTopProbability: soft.meanTopProbability,
        confidentWithinUncertainty: distinct.withinAgentUncertainty,
        softWithinUncertainty: soft.withinAgentUncertainty,
      },
    },
    {
      id: "missing-lineage-remains-missing",
      passed: partial.lineageCompleteness === "partial"
        && partial.effectiveLineageCount === null
        && partial.normalizedLineageEntropy === null,
      establishes: "Incomplete lineage is represented as unavailable rather than zero diversity.",
      doesNotEstablish: "The missingness mechanism is ignorable.",
      values: {
        completeness: partial.lineageCompleteness,
        effectiveLineageCount: partial.effectiveLineageCount,
        normalizedLineageEntropy: partial.normalizedLineageEntropy,
      },
    },
    {
      id: "declared-roster-missingness-visible",
      passed: missingRoster.activeAgentCount === 2
        && missingRoster.expectedAgentCount === 3
        && missingRoster.missingExpectedAgentCount === 1,
      establishes: "Declared-roster missing agents remain visible in the macrostate carrier.",
      doesNotEstablish: "Active-report averages are unbiased for the missing agent.",
      values: {
        activeAgentCount: missingRoster.activeAgentCount,
        expectedAgentCount: missingRoster.expectedAgentCount,
        missingExpectedAgentCount: missingRoster.missingExpectedAgentCount,
      },
    },
    {
      id: "option-relabel-and-order-invariance",
      passed: permutationInvariant,
      establishes: "Numeric macro coordinates are invariant to a symmetric option relabel/reorder.",
      doesNotEstablish: "Natural-language option descriptions are semantically equivalent.",
      values: {
        passed: permutationInvariant,
        baseWithinUncertainty: distinct.withinAgentUncertainty,
        renamedWithinUncertainty: renamed.withinAgentUncertainty,
        baseBetweenDisagreement: distinct.betweenAgentDisagreement,
        renamedBetweenDisagreement: renamed.betweenAgentDisagreement,
      },
    },
  ];

  const complete = projected
    .map(item => item.projection)
    .filter(item => item.lineageCompleteness === "complete" && item.normalizedLineageEntropy !== null);
  const coordinateMatrix = complete.map(item => [
    1,
    item.withinAgentUncertainty,
    item.pooledUncertainty,
    item.betweenAgentDisagreement,
    item.meanTopProbability,
    item.normalizedLineageEntropy as number,
  ]);
  const rank = matrixRank(coordinateMatrix);
  const syntheticNonEquivalence = checks.every(check => check.passed) && rank >= 4;
  const body = {
    artifactSchemaRef: SOCIAL_THERMODYNAMICS_M0_NULL_AUDIT_V1,
    inferenceStatus: "synthetic_formula_audit_only" as const,
    truthAccess: "none" as const,
    providerCalls: 0 as const,
    scenarios: projected.map(item => item.projection),
    checks,
    completeScenarioCoordinateRank: rank,
    completeScenarioCoordinateCount: complete.length,
    gate: {
      ontology: "PASS" as const,
      deterministicProjection: "PASS" as const,
      syntheticNonEquivalence: syntheticNonEquivalence ? "PASS" as const : "FAIL" as const,
      historicalNondegeneracy: "NOT_ESTABLISHED_BY_THIS_AUDIT" as const,
      promptStability: "NOT_TESTED" as const,
      predictiveValidity: "NOT_TESTED" as const,
      governanceAuthority: "NONE" as const,
    },
  };
  return { ...body, contentHash: fingerprintEstimatorValue(body) };
}

function main(): void {
  console.log(JSON.stringify(buildSocialThermodynamicsM0NullAuditV1(), null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
