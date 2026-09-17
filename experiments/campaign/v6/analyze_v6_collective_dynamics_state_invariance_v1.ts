/**
 * Zero-provider audit of computational invariances in the reported-belief
 * macrostate. This does not test whether an LLM is prompt- or option-order
 * stable; it tests only the deterministic projection and offline scoring path.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { projectCollectiveEpistemicStateV1 } from "../../../src/lib/epistemic/collectiveState";
import type {
  BeliefReport,
  CategoricalEpistemicClaim,
  EpistemicEvidence,
} from "../../../src/lib/epistemic/types";
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  hashCollectiveDynamicsValueV1,
  meanAgentTotalVariationV1,
  verifyCollectiveDynamicsManifestV1,
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
  type CollectiveDynamicsManifestV1,
  type CollectiveDynamicsPlanV1,
} from "./collectiveDynamicsV1";

const AUDIT_REF = Object.freeze({
  id: "swarmalpha.analysis.v6.collective-dynamics-state-invariance",
  version: "1.0.0",
});
const TOLERANCE = 1e-12;

type AuditCheckV1 =
  | "agent_and_record_input_order_exact"
  | "probability_key_order_exact"
  | "claim_option_order_metric_invariance"
  | "option_relabel_metric_equivariance"
  | "adjacent_tv_option_invariance"
  | "offline_brier_option_invariance";

export interface CollectiveDynamicsStateInvarianceFailureV1 {
  taskId: string;
  seed: number;
  round: number;
  check: AuditCheckV1;
  maxAbsDifference: number;
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function reverseProbabilityKeys(report: BeliefReport): BeliefReport {
  if (report.value.kind !== "categorical") throw new Error("state_invariance_non_categorical_report");
  return {
    ...structuredClone(report),
    value: {
      kind: "categorical",
      probabilities: Object.fromEntries(Object.entries(report.value.probabilities).reverse()),
    },
  };
}

function relabelReports(
  reports: readonly BeliefReport[],
  labelMap: ReadonlyMap<string, string>,
): BeliefReport[] {
  return reports.map(report => {
    if (report.value.kind !== "categorical") throw new Error("state_invariance_non_categorical_report");
    return {
      ...structuredClone(report),
      value: {
        kind: "categorical" as const,
        probabilities: Object.fromEntries(Object.entries(report.value.probabilities).map(([option, probability]) => {
          const relabeled = labelMap.get(option);
          if (!relabeled) throw new Error("state_invariance_option_mapping_missing");
          return [relabeled, probability];
        })),
      },
    };
  });
}

function pooledProbabilities(state: ReturnType<typeof projectCollectiveEpistemicStateV1>): Record<string, number> {
  if (state.pooledBelief.kind !== "categorical") throw new Error("state_invariance_non_categorical_state");
  return state.pooledBelief.probabilities;
}

function maxDifference(values: readonly number[]): number {
  return values.length ? Math.max(...values.map(Math.abs)) : 0;
}

function metricDifference(
  left: ReturnType<typeof projectCollectiveEpistemicStateV1>,
  right: ReturnType<typeof projectCollectiveEpistemicStateV1>,
): number {
  return maxDifference([
    left.withinAgentUncertainty - right.withinAgentUncertainty,
    left.pooledUncertainty - right.pooledUncertainty,
    left.betweenAgentDisagreement - right.betweenAgentDisagreement,
    left.pooledCertainty - right.pooledCertainty,
  ]);
}

function poolDifference(
  options: readonly string[],
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
): number {
  return maxDifference(options.map(option => left[option] - right[option]));
}

function relabeledPoolDifference(
  options: readonly string[],
  labelMap: ReadonlyMap<string, string>,
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
): number {
  return maxDifference(options.map(option => left[option] - right[labelMap.get(option)!]));
}

function brier(
  options: readonly string[],
  probabilities: Readonly<Record<string, number>>,
  outcome: string,
): number {
  return options.reduce((sum, option) => sum
    + (probabilities[option] - Number(option === outcome)) ** 2, 0);
}

function project(input: {
  claim: CategoricalEpistemicClaim;
  reports: readonly BeliefReport[];
  evidence: readonly EpistemicEvidence[];
  round: number;
  expectedAgentIds: readonly string[];
}) {
  return projectCollectiveEpistemicStateV1({
    claim: input.claim,
    reports: input.reports,
    evidence: input.evidence,
    exposures: [],
    asOfRound: input.round,
    expectedAgentIds: input.expectedAgentIds,
  });
}

/** Audit one already-verified formation artifact without making provider calls. */
export function auditCollectiveDynamicsFormationStateInvarianceV1(input: {
  formation: CollectiveDynamicsFormationArtifactV1;
  outcome: string;
}): {
  taskId: string;
  seed: number;
  roundCount: number;
  failures: CollectiveDynamicsStateInvarianceFailureV1[];
  maxAbsDifferenceByCheck: Record<AuditCheckV1, number>;
} {
  verifyFormationArtifactV1(input.formation);
  const claim = input.formation.onlineTask.claim;
  if (!claim.options.includes(input.outcome)) throw new Error("state_invariance_outcome_not_in_claim");
  const expectedAgentIds = input.formation.onlineTask.agents.map(agent => agent.agentId);
  const reversedClaim: CategoricalEpistemicClaim = { ...structuredClone(claim), options: [...claim.options].reverse() };
  const labelMap = new Map(claim.options.map((option, index) => [
    option,
    `permuted-option-${claim.options.length - index}`,
  ]));
  const relabeledClaim: CategoricalEpistemicClaim = {
    ...structuredClone(claim),
    options: claim.options.map(option => labelMap.get(option)!),
  };
  const relabeledOutcome = labelMap.get(input.outcome)!;
  const failures: CollectiveDynamicsStateInvarianceFailureV1[] = [];
  const maxima: Record<AuditCheckV1, number> = {
    agent_and_record_input_order_exact: 0,
    probability_key_order_exact: 0,
    claim_option_order_metric_invariance: 0,
    option_relabel_metric_equivariance: 0,
    adjacent_tv_option_invariance: 0,
    offline_brier_option_invariance: 0,
  };
  const cumulativeReports: BeliefReport[] = [];
  const cumulativeEvidence: EpistemicEvidence[] = [];
  let previousReports: BeliefReport[] | undefined;

  const record = (round: number, check: AuditCheckV1, difference: number) => {
    maxima[check] = Math.max(maxima[check], difference);
    if (difference > TOLERANCE) failures.push({
      taskId: input.formation.onlineTask.taskId,
      seed: input.formation.seed,
      round,
      check,
      maxAbsDifference: difference,
    });
  };

  for (const round of input.formation.rounds) {
    cumulativeReports.push(...round.reports);
    cumulativeEvidence.push(...round.evidence);
    const baseline = project({
      claim,
      reports: cumulativeReports,
      evidence: cumulativeEvidence,
      round: round.round,
      expectedAgentIds,
    });
    if (baseline.contentHash !== round.state.contentHash) {
      throw new Error(`state_invariance_stored_projection_mismatch:${input.formation.onlineTask.taskId}:r${round.round}`);
    }

    const reordered = project({
      claim,
      reports: [...cumulativeReports].reverse(),
      evidence: [...cumulativeEvidence].reverse(),
      round: round.round,
      expectedAgentIds: [...expectedAgentIds].reverse(),
    });
    record(round.round, "agent_and_record_input_order_exact",
      reordered.contentHash === baseline.contentHash ? 0 : 1);

    const reversedKeys = project({
      claim,
      reports: cumulativeReports.map(reverseProbabilityKeys),
      evidence: cumulativeEvidence,
      round: round.round,
      expectedAgentIds,
    });
    record(round.round, "probability_key_order_exact",
      reversedKeys.contentHash === baseline.contentHash ? 0 : 1);

    const optionReordered = project({
      claim: reversedClaim,
      reports: cumulativeReports,
      evidence: cumulativeEvidence,
      round: round.round,
      expectedAgentIds,
    });
    record(round.round, "claim_option_order_metric_invariance", Math.max(
      metricDifference(baseline, optionReordered),
      poolDifference(claim.options, pooledProbabilities(baseline), pooledProbabilities(optionReordered)),
    ));

    const relabeled = project({
      claim: relabeledClaim,
      reports: relabelReports(cumulativeReports, labelMap),
      evidence: cumulativeEvidence,
      round: round.round,
      expectedAgentIds,
    });
    record(round.round, "option_relabel_metric_equivariance", Math.max(
      metricDifference(baseline, relabeled),
      relabeledPoolDifference(claim.options, labelMap, pooledProbabilities(baseline), pooledProbabilities(relabeled)),
    ));

    const baselineBrier = brier(claim.options, pooledProbabilities(baseline), input.outcome);
    const reorderedBrier = brier(reversedClaim.options, pooledProbabilities(optionReordered), input.outcome);
    const relabeledBrier = brier(relabeledClaim.options, pooledProbabilities(relabeled), relabeledOutcome);
    record(round.round, "offline_brier_option_invariance",
      maxDifference([baselineBrier - reorderedBrier, baselineBrier - relabeledBrier]));

    if (previousReports) {
      const baselineTv = meanAgentTotalVariationV1({ claim, previous: previousReports, next: round.reports });
      const reorderedTv = meanAgentTotalVariationV1({ claim: reversedClaim, previous: previousReports, next: round.reports });
      const relabeledTv = meanAgentTotalVariationV1({
        claim: relabeledClaim,
        previous: relabelReports(previousReports, labelMap),
        next: relabelReports(round.reports, labelMap),
      });
      record(round.round, "adjacent_tv_option_invariance",
        maxDifference([baselineTv - reorderedTv, baselineTv - relabeledTv]));
    }
    previousReports = round.reports;
  }

  return {
    taskId: input.formation.onlineTask.taskId,
    seed: input.formation.seed,
    roundCount: input.formation.rounds.length,
    failures,
    maxAbsDifferenceByCheck: maxima,
  };
}

export function analyzeCollectiveDynamicsStateInvarianceDirectoryV1(outputDir: string) {
  const plan = readJson<CollectiveDynamicsPlanV1>(join(outputDir, "plan.json"));
  const { contentHash: planHash, ...planBody } = plan;
  if (hashCollectiveDynamicsValueV1(planBody) !== planHash) throw new Error("state_invariance_plan_hash_mismatch");
  const formationFiles = readdirSync(outputDir)
    .filter(name => /^formation-task-\d+-seed--?\d+\.json$/.test(name)).sort();
  const formations = formationFiles.map(file => readJson<CollectiveDynamicsFormationArtifactV1>(join(outputDir, file)));
  const manifest = readJson<CollectiveDynamicsManifestV1>(join(outputDir, "formation-manifest.json"));
  verifyCollectiveDynamicsManifestV1({ plan, manifest, formations, responses: [] });
  const tasks = formations.map(formation => {
    const outcome = createHiddenBenchTaskProjectionV1({ sourceTaskId: formation.onlineTask.sourceTaskId }).adapter.task.outcome;
    return auditCollectiveDynamicsFormationStateInvarianceV1({ formation, outcome });
  });
  const failures = tasks.flatMap(task => task.failures);
  const checks = Object.keys(tasks[0]?.maxAbsDifferenceByCheck ?? {}) as AuditCheckV1[];
  const body = {
    analysisRef: AUDIT_REF,
    status: failures.length === 0 ? "pass" as const : "fail" as const,
    source: {
      planHash: plan.contentHash,
      formationManifestHash: manifest.contentHash,
      formationHashes: formations.map(formation => formation.contentHash).sort(),
    },
    taskCount: tasks.length,
    roundCount: tasks.reduce((sum, task) => sum + task.roundCount, 0),
    checkCount: tasks.reduce((sum, task) => sum + task.roundCount * 5 + Math.max(0, task.roundCount - 1), 0),
    failures,
    maxAbsDifferenceByCheck: Object.fromEntries(checks.map(check => [
      check,
      Math.max(...tasks.map(task => task.maxAbsDifferenceByCheck[check])),
    ])) as Record<AuditCheckV1, number>,
    claimCeiling: "computational_projection_invariance_only_not_llm_prompt_stability" as const,
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): number {
  const directory = process.argv.find(argument => argument.startsWith("--dir="))?.slice("--dir=".length);
  if (!directory) {
    console.error("usage: --dir=<formation-artifact-directory>");
    return 2;
  }
  const outputDir = resolve(process.cwd(), directory);
  const analysis = analyzeCollectiveDynamicsStateInvarianceDirectoryV1(outputDir);
  const file = join(outputDir, "state-invariance-audit.json");
  const text = `${JSON.stringify(analysis, null, 2)}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") !== text) {
    throw new Error("state_invariance_analysis_no_overwrite_conflict");
  }
  if (!existsSync(file)) writeFileSync(file, text, "utf8");
  console.log(JSON.stringify({
    status: analysis.status,
    taskCount: analysis.taskCount,
    roundCount: analysis.roundCount,
    checkCount: analysis.checkCount,
    failureCount: analysis.failures.length,
    contentHash: analysis.contentHash,
  }));
  return analysis.status === "pass" ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
