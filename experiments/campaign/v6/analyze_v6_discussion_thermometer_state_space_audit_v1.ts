/** Zero-provider state-space and real-time monitoring resolution audit. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  appendDiscussionThermometerStateV1,
  projectDiscussionThermometerStateV1,
  projectDiscussionThermometerTrajectoryV1,
  projectDiscussionThermometerTransitionV1 as projectTransition,
  type DiscussionThermometerInputV1,
  type DiscussionThermometerStateV1,
} from "../../../src/lib/epistemic";
import { hashCollectiveDynamicsValueV1 } from "./collectiveDynamicsV1";

export const DISCUSSION_THERMOMETER_STATE_SPACE_AUDIT_V1 = Object.freeze({
  id: "swarmalpha.audit.v6.discussion-thermometer-state-space",
  version: "1.0.0",
  providerCalls: 0,
  tolerance: 1e-12,
});

type Vector3 = readonly [number, number, number];

interface StateReadoutV1 {
  label: string;
  coverage: number;
  pooled: Record<string, number> | null;
  meanReportEntropy: number | null;
  pooledEntropy: number | null;
  generalizedJsd: number | null;
  concentration: number | null;
  pottsStyleOrder: number | null;
  meanPairwiseTv: number | null;
  maxPairwiseTv: number | null;
  meanReplicateTv: number | null;
}

export interface DiscussionThermometerStateSpaceAuditV1 {
  auditRef: typeof DISCUSSION_THERMOMETER_STATE_SPACE_AUDIT_V1;
  truthAccess: "none";
  states: StateReadoutV1[];
  transitions: {
    cancelingUpdate: {
      meanAgentTv: number | null;
      pooledTv: number | null;
    };
    coherentUpdate: {
      meanAgentTv: number | null;
      pooledTv: number | null;
    };
    belowRepeatability: {
      meanAgentTv: number | null;
      endpointRepeatability: number | null;
      comparison: string;
    };
    incompleteRoster: {
      completeMatchedRoster: boolean;
      meanAgentTv: number | null;
      pooledTv: number | null;
    };
  };
  prefixCausality: {
    prefixReadingHashesStable: boolean;
    firstPrefixLength: number;
    finalLength: number;
  };
  checks: Array<{ id: string; pass: boolean; detail: string }>;
  allChecksPass: boolean;
  interpretation: string[];
  contentHash: string;
}

function snapshot(label: string): string {
  return hashCollectiveDynamicsValueV1({ stateSpaceAuditSnapshot: label });
}

function state(input: {
  claimId: string;
  checkpointIndex: number;
  label: string;
  primary: Record<string, Vector3>;
  duplicate?: Record<string, Vector3>;
  missingPrimary?: ReadonlySet<string>;
}): DiscussionThermometerStateV1 {
  const optionIds = ["opt_1", "opt_2", "opt_3"];
  const vector = (values: Vector3) => ({
    opt_1: values[0], opt_2: values[1], opt_3: values[2],
  });
  const source: DiscussionThermometerInputV1 = {
    claimId: input.claimId,
    checkpointId: `${input.claimId}:${input.label}`,
    checkpointIndex: input.checkpointIndex,
    optionIds,
    expectedAgentIds: Object.keys(input.primary),
    reportPairs: Object.entries(input.primary).map(([agentId, values]) => ({
      agentId,
      A: input.missingPrimary?.has(agentId)
        ? { status: "unavailable" as const, reason: "audit_primary_missing" }
        : { status: "valid" as const, probabilitiesByOptionId: vector(values) },
      B: input.duplicate?.[agentId]
        ? { status: "valid" as const, probabilitiesByOptionId: vector(input.duplicate[agentId]) }
        : { status: "unavailable" as const, reason: "audit_duplicate_not_sampled" },
    })),
    sensorRef: { id: "sensor:state-space-audit", version: "1.0.0" },
    snapshotHash: snapshot(`${input.claimId}:${input.label}`),
  };
  return projectDiscussionThermometerStateV1(source);
}

function readout(label: string, value: DiscussionThermometerStateV1): StateReadoutV1 {
  return {
    label,
    coverage: value.roster.coverage,
    pooled: value.macrostate.pooledProbabilitiesByOptionId,
    meanReportEntropy: value.macrostate.meanNormalizedReportEntropy,
    pooledEntropy: value.macrostate.pooledNormalizedEntropy,
    generalizedJsd: value.macrostate.normalizedGeneralizedJsd,
    concentration: value.macrostate.pooledConcentration,
    pottsStyleOrder: value.macrostate.pottsStyleOrder,
    meanPairwiseTv: value.macrostate.meanPairwiseTotalVariation,
    maxPairwiseTv: value.macrostate.maxPairwiseTotalVariation,
    meanReplicateTv: value.measurement.meanReplicateTotalVariation,
  };
}

function close(left: number | null, right: number | null, tolerance: number): boolean {
  return left !== null && right !== null && Math.abs(left - right) <= tolerance;
}

function binaryEntropy(probability: number): number {
  return -(probability * Math.log2(probability)
    + (1 - probability) * Math.log2(1 - probability));
}

function halfEntropyProbability(): number {
  let lower = 0.5;
  let upper = 1;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (binaryEntropy(middle) > 0.5) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

export function buildDiscussionThermometerStateSpaceAuditV1():
DiscussionThermometerStateSpaceAuditV1 {
  const roster = ["a1", "a2", "a3", "a4"];
  const repeated = (value: Vector3): Record<string, Vector3> =>
    Object.fromEntries(roster.map(agentId => [agentId, value]));
  const concentrated = state({
    claimId: "claim:audit:concentrated", checkpointIndex: 0, label: "X0",
    primary: repeated([0.9, 0.05, 0.05]),
  });
  const diffuse = state({
    claimId: "claim:audit:diffuse", checkpointIndex: 0, label: "X0",
    primary: repeated([0.45, 0.3, 0.25]),
  });
  const polarized = state({
    claimId: "claim:audit:polarized", checkpointIndex: 0, label: "X0",
    primary: {
      a1: [0.9, 0.05, 0.05], a2: [0.9, 0.05, 0.05],
      a3: [0.05, 0.9, 0.05], a4: [0.05, 0.9, 0.05],
    },
  });
  const p = halfEntropyProbability();
  const collisionA = state({
    claimId: "claim:audit:collision-a", checkpointIndex: 0, label: "X0",
    primary: {
      a1: [p, 1 - p, 0], a2: [p, 1 - p, 0],
      a3: [1 - p, p, 0], a4: [1 - p, p, 0],
    },
  });
  const collisionB = state({
    claimId: "claim:audit:collision-b", checkpointIndex: 0, label: "X0",
    primary: {
      a1: [1, 0, 0], a2: [0, 1, 0], a3: [0.5, 0.5, 0], a4: [0.5, 0.5, 0],
    },
  });
  const partial = state({
    claimId: "claim:audit:partial", checkpointIndex: 0, label: "X0",
    primary: repeated([0.6, 0.3, 0.1]),
    missingPrimary: new Set(["a4"]),
  });

  const cancelX0 = state({
    claimId: "claim:audit:cancel", checkpointIndex: 0, label: "X0",
    primary: {
      a1: [0.8, 0.1, 0.1], a2: [0.1, 0.8, 0.1],
      a3: [0.45, 0.45, 0.1], a4: [0.45, 0.45, 0.1],
    },
  });
  const cancelX1 = state({
    claimId: "claim:audit:cancel", checkpointIndex: 1, label: "X1",
    primary: {
      a1: [0.6, 0.3, 0.1], a2: [0.3, 0.6, 0.1],
      a3: [0.45, 0.45, 0.1], a4: [0.45, 0.45, 0.1],
    },
  });
  const canceling = projectTransition({
    from: cancelX0, to: cancelX1,
  });

  const coherentX0 = state({
    claimId: "claim:audit:coherent", checkpointIndex: 0, label: "X0",
    primary: repeated([0.7, 0.2, 0.1]),
  });
  const coherentX1 = state({
    claimId: "claim:audit:coherent", checkpointIndex: 1, label: "X1",
    primary: repeated([0.5, 0.4, 0.1]),
  });
  const coherentX2 = state({
    claimId: "claim:audit:coherent", checkpointIndex: 2, label: "X2",
    primary: repeated([0.3, 0.6, 0.1]),
  });
  const coherent = projectTransition({
    from: coherentX0, to: coherentX1,
  });

  const noisyDuplicatesX0 = repeated([0.68, 0.22, 0.1]);
  const noisyDuplicatesX1 = repeated([0.67, 0.23, 0.1]);
  const belowNoiseX0 = state({
    claimId: "claim:audit:below-noise", checkpointIndex: 0, label: "X0",
    primary: repeated([0.7, 0.2, 0.1]), duplicate: noisyDuplicatesX0,
  });
  const belowNoiseX1 = state({
    claimId: "claim:audit:below-noise", checkpointIndex: 1, label: "X1",
    primary: repeated([0.69, 0.21, 0.1]), duplicate: noisyDuplicatesX1,
  });
  const belowNoise = projectTransition({
    from: belowNoiseX0, to: belowNoiseX1,
  });

  const partialX1 = state({
    claimId: "claim:audit:partial-transition", checkpointIndex: 1, label: "X1",
    primary: repeated([0.6, 0.3, 0.1]), missingPrimary: new Set(["a4"]),
  });
  const partialX2 = state({
    claimId: "claim:audit:partial-transition", checkpointIndex: 2, label: "X2",
    primary: repeated([0.5, 0.4, 0.1]),
  });
  const incomplete = projectTransition({
    from: partialX1, to: partialX2,
  });

  const firstPrefix = projectDiscussionThermometerTrajectoryV1([coherentX0]);
  const secondPrefix = appendDiscussionThermometerStateV1({
    trajectory: firstPrefix, state: coherentX1,
  });
  const finalPrefix = appendDiscussionThermometerStateV1({
    trajectory: secondPrefix, state: coherentX2,
  });
  const prefixStable = firstPrefix.readings.every((reading, index) =>
    finalPrefix.readings[index].contentHash === reading.contentHash)
    && secondPrefix.readings.every((reading, index) =>
      finalPrefix.readings[index].contentHash === reading.contentHash);

  const tolerance = DISCUSSION_THERMOMETER_STATE_SPACE_AUDIT_V1.tolerance;
  const checks = [
    {
      id: "unanimous_states_separate_concentration_from_uncertainty",
      pass: concentrated.macrostate.normalizedGeneralizedJsd === 0
        && diffuse.macrostate.normalizedGeneralizedJsd === 0
        && (concentrated.macrostate.meanNormalizedReportEntropy ?? 1)
          < (diffuse.macrostate.meanNormalizedReportEntropy ?? 0),
      detail: "Both groups agree internally, while U and concentration distinguish firm from diffuse agreement.",
    },
    {
      id: "polarization_visible_beyond_pooled_concentration",
      pass: (polarized.macrostate.normalizedGeneralizedJsd ?? 0) > 0
        && (polarized.macrostate.maxPairwiseTotalVariation ?? 0) > 0.8,
      detail: "A split group has positive generalized JSD and a high pairwise-TV tail.",
    },
    {
      id: "macro_projection_non_injective_but_micro_geometry_retained",
      pass: Object.keys(collisionA.macrostate.pooledProbabilitiesByOptionId ?? {}).every(optionId =>
        Math.abs((collisionA.macrostate.pooledProbabilitiesByOptionId?.[optionId] ?? 0)
          - (collisionB.macrostate.pooledProbabilitiesByOptionId?.[optionId] ?? 0)) <= tolerance)
        && close(collisionA.macrostate.meanNormalizedReportEntropy,
          collisionB.macrostate.meanNormalizedReportEntropy, tolerance)
        && close(collisionA.macrostate.normalizedGeneralizedJsd,
          collisionB.macrostate.normalizedGeneralizedJsd, tolerance)
        && Math.abs((collisionA.macrostate.maxPairwiseTotalVariation ?? 0)
          - (collisionB.macrostate.maxPairwiseTotalVariation ?? 0)) > 0.1,
      detail: "Equal q/U/J can conceal different pairwise geometry, so P_t remains part of the archived observed state.",
    },
    {
      id: "canceling_updates_visible_at_agent_level",
      pass: (canceling.meanAgentTotalVariation ?? 0) > 0.09
        && Math.abs(canceling.pooledTotalVariation ?? 1) <= tolerance,
      detail: "Opposing individual updates cancel in q_t but remain visible in mean-agent TV.",
    },
    {
      id: "coherent_updates_visible_in_micro_and_pool",
      pass: close(coherent.meanAgentTotalVariation, coherent.pooledTotalVariation, tolerance)
        && (coherent.pooledTotalVariation ?? 0) > 0.19,
      detail: "Aligned updates move both individual reports and the pooled vector.",
    },
    {
      id: "movement_below_repeatability_not_promoted",
      pass: belowNoise.repeatabilityReference.comparison === "not_above_reference"
        && (belowNoise.repeatabilityReference.endpointMeanReplicateTotalVariation ?? 0)
          > (belowNoise.meanAgentTotalVariation ?? 1)
        && belowNoise.repeatabilityReference
          .primaryActivityAboveBothEndpointRepeatabilitiesFraction === 0,
      detail: "A cross-time movement smaller than endpoint duplicate variation is retained numerically but not labeled above-reference.",
    },
    {
      id: "incomplete_roster_blocks_pooled_drift",
      pass: incomplete.completeMatchedRoster === false && incomplete.pooledTotalVariation === null
        && incomplete.meanAgentTotalVariation !== null,
      detail: "Matched-agent movement remains available while composition-sensitive pooled drift fails closed.",
    },
    {
      id: "partial_primary_coverage_is_explicit",
      pass: partial.roster.coverage === 0.75 && partial.roster.missingAgentIds.length === 1,
      detail: "Missing primary reports reduce coverage and are not imputed.",
    },
    {
      id: "prefix_causality",
      pass: prefixStable,
      detail: "Appending later observations preserves every earlier reading hash.",
    },
  ];
  const body: Omit<DiscussionThermometerStateSpaceAuditV1, "contentHash"> = {
    auditRef: DISCUSSION_THERMOMETER_STATE_SPACE_AUDIT_V1,
    truthAccess: "none",
    states: [
      readout("unanimous_concentrated", concentrated),
      readout("unanimous_diffuse", diffuse),
      readout("polarized", polarized),
      readout("macro_collision_a", collisionA),
      readout("macro_collision_b", collisionB),
      readout("partial_roster", partial),
    ],
    transitions: {
      cancelingUpdate: {
        meanAgentTv: canceling.meanAgentTotalVariation,
        pooledTv: canceling.pooledTotalVariation,
      },
      coherentUpdate: {
        meanAgentTv: coherent.meanAgentTotalVariation,
        pooledTv: coherent.pooledTotalVariation,
      },
      belowRepeatability: {
        meanAgentTv: belowNoise.meanAgentTotalVariation,
        endpointRepeatability: belowNoise.repeatabilityReference.endpointMeanReplicateTotalVariation,
        comparison: belowNoise.repeatabilityReference.comparison,
      },
      incompleteRoster: {
        completeMatchedRoster: incomplete.completeMatchedRoster,
        meanAgentTv: incomplete.meanAgentTotalVariation,
        pooledTv: incomplete.pooledTotalVariation,
      },
    },
    prefixCausality: {
      prefixReadingHashesStable: prefixStable,
      firstPrefixLength: firstPrefix.readings.length,
      finalLength: finalPrefix.readings.length,
    },
    checks,
    allChecksPass: checks.every(check => check.pass),
    interpretation: [
      "The thermometer is a multi-readout monitor; no single scalar orders all group states.",
      "q and U summarize the macrostate, while J, concentration, order, and pairwise TV are derived diagnostics.",
      "Agent-level activity is required because pooled drift can hide canceling internal updates.",
      "The audit establishes mathematical resolution on constructed states, not empirical construct validity on LLM discussions.",
    ],
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): void {
  const outputDirectory = resolve(
    "results/v6_discussion_thermometer_state_space_audit_v1",
  );
  const output = buildDiscussionThermometerStateSpaceAuditV1();
  const file = join(outputDirectory, "analysis.json");
  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true });
  if (existsSync(file) && readFileSync(file, "utf8") !== serialized) {
    throw new Error("discussion_thermometer_state_space_no_overwrite_conflict");
  }
  if (!existsSync(file)) writeFileSync(file, serialized, "utf8");
  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) main();
