/** Thin, truth-blind adapter from M2 averaged sensor reports to the active epistemic kernel. */
import {
  projectCollectiveEpistemicStateV1,
  type BeliefReport,
  type CategoricalEpistemicClaim,
  type CollectiveEpistemicStateV1,
} from "../../../src/lib/epistemic";

const ADAPTER_TIMESTAMP = "2026-08-28T00:00:00.000Z";

export interface TrajectoryAveragedReportV1 {
  reportId: string;
  agentId: string;
  probabilitiesByOptionId: Record<string, number>;
}

/**
 * Reuses the current contract-owned pool/entropy/JSD projection. It supplies no
 * evidence, exposure, outcome, or governance field and therefore cannot infer
 * lineage diversity, causal influence, correctness, or an action.
 */
export function projectTrajectoryAveragedReportsV1(input: {
  sourceTaskId: number;
  checkpointRound: 0 | 1 | 2 | 3;
  optionIds: readonly string[];
  expectedAgentIds: readonly string[];
  reports: readonly TrajectoryAveragedReportV1[];
}): Readonly<CollectiveEpistemicStateV1> {
  if (!input.reports.length) throw new Error("trajectory_epistemic_adapter_reports_empty");
  const claim: CategoricalEpistemicClaim = {
    id: `claim:trajectory:${input.sourceTaskId}:X${input.checkpointRound}`,
    proposition: "Frozen categorical outcome space for trajectory monitoring.",
    domain: "collective_dynamics_development",
    createdAt: ADAPTER_TIMESTAMP,
    options: [...input.optionIds],
    resolutionPolicy: {
      kind: "categorical",
      resolverId: "resolver:offline-hiddenbench-not-accessed-by-state-adapter",
    },
  };
  const reports: BeliefReport[] = input.reports.map(report => ({
    id: report.reportId,
    claimId: claim.id,
    agentId: report.agentId,
    round: input.checkpointRound,
    value: {
      kind: "categorical",
      probabilities: { ...report.probabilitiesByOptionId },
    },
    evidence: [],
    stake: 0,
    createdAt: ADAPTER_TIMESTAMP,
  }));
  return projectCollectiveEpistemicStateV1({
    claim,
    reports,
    evidence: [],
    exposures: [],
    asOfRound: input.checkpointRound,
    expectedAgentIds: input.expectedAgentIds,
  });
}

