/** Zero-provider mathematical audit of the Discussion Thermometer state map. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  projectDiscussionThermometerStateV1,
  type DiscussionThermometerInputV1,
} from "../../../src/lib/epistemic";
import {
  assertCollectiveDynamicsTruthBlindV1,
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import type { ThermometerReprojectionV1 } from
  "./analyze_v6_discussion_thermometer_reprojection_v1";

export const DISCUSSION_THERMOMETER_MATHEMATICAL_AUDIT_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.discussion-thermometer-mathematical-audit",
  version: "1.0.0",
});

export interface DiscussionThermometerMathematicalAuditV1 {
  auditRef: typeof DISCUSSION_THERMOMETER_MATHEMATICAL_AUDIT_V1;
  inferenceStatus: "mathematical_and_descriptive_audit_only";
  truthAccess: "none";
  sourceReprojectionHash: string;
  empiricalIdentities: {
    stateCount: number;
    transitionCount: number;
    completeMatchedTransitionCount: number;
    maxEntropyDecompositionResidual: number;
    maxPottsOrderResidual: number;
    maxPoolingContractionExcess: number;
    poolingContractionViolationCount: number;
  };
  optionPermutationAudit: {
    optionCount: number;
    scalarInvariantMaxResidual: number;
    pooledVectorEquivariantMaxResidual: number;
    passed: boolean;
  };
  coarseGrainingCollision: {
    optionCount: 2;
    agentCount: 4;
    targetWithinEntropy: 0.5;
    solvedPolarizedProbability: number;
    pooledVectorMaxDifference: number;
    withinEntropyDifference: number;
    jsdDifference: number;
    maxPairwiseTvStateA: number;
    maxPairwiseTvStateB: number;
    meanPairwiseTvStateA: number;
    meanPairwiseTvStateB: number;
    collisionEstablished: boolean;
    implication: "same_q_U_J_can_hide_different_microstate_geometry";
  };
  stateRepresentationDecision: {
    fullObservedState: "P_t_plus_declared_roster";
    minimalIndependentMacroCoordinates: ["q_t", "U_t", "coverage_t"];
    derivedReadouts: ["H_t_from_q_t", "J_t_equals_H_t_minus_U_t", "C_t_from_q_t", "m_t_from_C_t"];
    retainedDiagnostics: ["mean_pairwise_TV", "max_pairwise_TV", "repeat_TV"];
    warning: "macro_projection_is_not_injective";
  };
  contentHash: string;
}

function entropyBinary(probability: number): number {
  if (probability === 0 || probability === 1) return 0;
  return -(probability * Math.log2(probability)
    + (1 - probability) * Math.log2(1 - probability));
}

function solveProbabilityForEntropy(target: number): number {
  let lower = 0.5;
  let upper = 1;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (entropyBinary(middle) > target) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

function inputForVectors(claimId: string, vectors: Record<string, [number, number]>): DiscussionThermometerInputV1 {
  return {
    claimId,
    checkpointId: `${claimId}:X0`,
    checkpointIndex: 0,
    optionIds: ["opt_1", "opt_2"],
    expectedAgentIds: Object.keys(vectors),
    reportPairs: Object.entries(vectors).map(([agentId, values]) => ({
      agentId,
      A: { status: "valid", probabilitiesByOptionId: { opt_1: values[0], opt_2: values[1] } },
      B: { status: "unavailable", reason: "not_required_for_mathematical_counterexample" },
    })),
    sensorRef: { id: "sensor:mathematical-counterexample", version: "1.0.0" },
    snapshotHash: `sha256:${(claimId === "claim:collision:a" ? "a" : "b").repeat(64)}`,
  };
}

function verifySourceHash(source: ThermometerReprojectionV1): void {
  const { contentHash, ...body } = source;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("thermometer_mathematical_audit_source_hash_mismatch");
  }
  if (source.truthAccess !== "none") throw new Error("thermometer_mathematical_audit_source_not_truth_blind");
}

function max(values: readonly number[]): number {
  return values.length ? Math.max(...values) : 0;
}

export function buildDiscussionThermometerMathematicalAuditV1(
  source: ThermometerReprojectionV1,
): DiscussionThermometerMathematicalAuditV1 {
  verifySourceHash(source);
  const states = source.datasets.flatMap(dataset => dataset.states);
  const transitions = source.datasets.flatMap(dataset => dataset.transitions);
  const entropyResiduals = states.map(state => {
    const macro = state.macrostate;
    if (macro.pooledNormalizedEntropy === null || macro.meanNormalizedReportEntropy === null
      || macro.normalizedGeneralizedJsd === null) return 0;
    return Math.abs(macro.pooledNormalizedEntropy
      - macro.meanNormalizedReportEntropy - macro.normalizedGeneralizedJsd);
  });
  const orderResiduals = states.map(state => {
    const concentration = state.macrostate.pooledConcentration;
    const order = state.macrostate.pottsStyleOrder;
    if (concentration === null || order === null) return 0;
    const expected = (state.optionIds.length * concentration - 1) / (state.optionIds.length - 1);
    return Math.abs(order - expected);
  });
  const contractionExcesses = transitions.flatMap(transition =>
    transition.completeMatchedRoster && transition.meanAgentTotalVariation !== null
      && transition.pooledTotalVariation !== null
      ? [transition.pooledTotalVariation - transition.meanAgentTotalVariation] : []);

  const sample = states.find(state => state.roster.coverage === 1
    && state.macrostate.pooledProbabilitiesByOptionId !== null)!;
  if (!sample) throw new Error("thermometer_mathematical_audit_permutation_sample_missing");
  const reversed = [...sample.optionIds].reverse();
  const permutationInput: DiscussionThermometerInputV1 = {
    claimId: "claim:permutation-audit",
    checkpointId: "permutation:X0",
    checkpointIndex: 0,
    optionIds: sample.optionIds,
    expectedAgentIds: sample.roster.activeAgentIds,
    reportPairs: sample.roster.activeAgentIds.map(agentId => ({
      agentId,
      A: { status: "valid" as const, probabilitiesByOptionId: Object.fromEntries(
        sample.optionIds.map((optionId, index) => [reversed[index],
          sample.microstate.beliefProbabilitiesByAgentId[agentId][optionId]]),
      ) },
      B: { status: "unavailable" as const, reason: "not_required_for_permutation_audit" },
    })),
    sensorRef: { id: "sensor:permutation-audit", version: "1.0.0" },
    snapshotHash: `sha256:${"c".repeat(64)}`,
  };
  const permuted = projectDiscussionThermometerStateV1(permutationInput);
  const scalarKeys = ["meanNormalizedReportEntropy", "pooledNormalizedEntropy",
    "normalizedGeneralizedJsd", "pooledConcentration", "pottsStyleOrder",
    "meanPairwiseTotalVariation", "maxPairwiseTotalVariation"] as const;
  const scalarResiduals = scalarKeys.map(key => Math.abs(
    (sample.macrostate[key] ?? 0) - (permuted.macrostate[key] ?? 0),
  ));
  const vectorResiduals = sample.optionIds.map((optionId, index) => Math.abs(
    sample.macrostate.pooledProbabilitiesByOptionId![optionId]
      - permuted.macrostate.pooledProbabilitiesByOptionId![reversed[index]],
  ));

  const p = solveProbabilityForEntropy(0.5);
  const collisionA = projectDiscussionThermometerStateV1(inputForVectors("claim:collision:a", {
    a1: [p, 1 - p], a2: [p, 1 - p], a3: [1 - p, p], a4: [1 - p, p],
  }));
  const collisionB = projectDiscussionThermometerStateV1(inputForVectors("claim:collision:b", {
    b1: [1, 0], b2: [0, 1], b3: [0.5, 0.5], b4: [0.5, 0.5],
  }));
  const collisionPoolDifference = max(collisionA.optionIds.map(optionId => Math.abs(
    collisionA.macrostate.pooledProbabilitiesByOptionId![optionId]
      - collisionB.macrostate.pooledProbabilitiesByOptionId![optionId],
  )));
  const withinDifference = Math.abs(collisionA.macrostate.meanNormalizedReportEntropy!
    - collisionB.macrostate.meanNormalizedReportEntropy!);
  const jsdDifference = Math.abs(collisionA.macrostate.normalizedGeneralizedJsd!
    - collisionB.macrostate.normalizedGeneralizedJsd!);
  const pairwiseMaxDifference = Math.abs(collisionA.macrostate.maxPairwiseTotalVariation!
    - collisionB.macrostate.maxPairwiseTotalVariation!);
  const body: Omit<DiscussionThermometerMathematicalAuditV1, "contentHash"> = {
    auditRef: DISCUSSION_THERMOMETER_MATHEMATICAL_AUDIT_V1,
    inferenceStatus: "mathematical_and_descriptive_audit_only",
    truthAccess: "none",
    sourceReprojectionHash: source.contentHash,
    empiricalIdentities: {
      stateCount: states.length,
      transitionCount: transitions.length,
      completeMatchedTransitionCount: contractionExcesses.length,
      maxEntropyDecompositionResidual: max(entropyResiduals),
      maxPottsOrderResidual: max(orderResiduals),
      maxPoolingContractionExcess: max(contractionExcesses),
      poolingContractionViolationCount: contractionExcesses.filter(value => value > 1e-12).length,
    },
    optionPermutationAudit: {
      optionCount: sample.optionIds.length,
      scalarInvariantMaxResidual: max(scalarResiduals),
      pooledVectorEquivariantMaxResidual: max(vectorResiduals),
      passed: max(scalarResiduals) <= 1e-12 && max(vectorResiduals) <= 1e-12,
    },
    coarseGrainingCollision: {
      optionCount: 2,
      agentCount: 4,
      targetWithinEntropy: 0.5,
      solvedPolarizedProbability: p,
      pooledVectorMaxDifference: collisionPoolDifference,
      withinEntropyDifference: withinDifference,
      jsdDifference,
      maxPairwiseTvStateA: collisionA.macrostate.maxPairwiseTotalVariation!,
      maxPairwiseTvStateB: collisionB.macrostate.maxPairwiseTotalVariation!,
      meanPairwiseTvStateA: collisionA.macrostate.meanPairwiseTotalVariation!,
      meanPairwiseTvStateB: collisionB.macrostate.meanPairwiseTotalVariation!,
      collisionEstablished: collisionPoolDifference <= 1e-12 && withinDifference <= 1e-12
        && jsdDifference <= 1e-12 && pairwiseMaxDifference > 1e-3,
      implication: "same_q_U_J_can_hide_different_microstate_geometry",
    },
    stateRepresentationDecision: {
      fullObservedState: "P_t_plus_declared_roster",
      minimalIndependentMacroCoordinates: ["q_t", "U_t", "coverage_t"],
      derivedReadouts: ["H_t_from_q_t", "J_t_equals_H_t_minus_U_t", "C_t_from_q_t", "m_t_from_C_t"],
      retainedDiagnostics: ["mean_pairwise_TV", "max_pairwise_TV", "repeat_TV"],
      warning: "macro_projection_is_not_injective",
    },
  };
  assertCollectiveDynamicsTruthBlindV1(body);
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function writeExactOrVerify(path: string, value: unknown): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== text) throw new Error("thermometer_mathematical_audit_no_overwrite_conflict");
    return;
  }
  writeFileSync(path, text, { flag: "wx" });
}

function main(): number {
  const directory = resolve(process.cwd(), "results/v6_discussion_thermometer_m2_d1_reprojection_v1");
  const source = JSON.parse(readFileSync(join(directory, "analysis.json"), "utf8")) as ThermometerReprojectionV1;
  const result = buildDiscussionThermometerMathematicalAuditV1(source);
  const target = join(directory, "mathematical-audit.json");
  writeExactOrVerify(target, result);
  console.log(JSON.stringify({ status: "mathematical_audit_complete", providerCalls: 0,
    output: target, empirical: result.empiricalIdentities,
    collision: result.coarseGrainingCollision, contentHash: result.contentHash }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
