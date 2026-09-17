/** Zero-provider adapter from frozen trajectory sensor rows to the core thermometer. */
import {
  projectDiscussionThermometerStateV1,
  type DiscussionThermometerReplicateV1,
  type DiscussionThermometerStateV1,
} from "../../../src/lib/epistemic";
import { COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1 } from
  "./collectiveDynamicsPromptSensitivityCanaryV1";

export interface TrajectoryThermometerVectorV1 {
  optionIds: string[];
  values: number[];
}

export interface TrajectoryThermometerUnitV1 {
  agentId: string;
  checkpointRound: number;
  repeatStatuses: { A: string; B: string };
  repeatA: TrajectoryThermometerVectorV1 | null;
  repeatB: TrajectoryThermometerVectorV1 | null;
}

function replicate(
  value: TrajectoryThermometerVectorV1 | null,
  status: string,
  optionIds: readonly string[],
): DiscussionThermometerReplicateV1 {
  if (!value) return { status: "unavailable", reason: status || "missing_or_invalid" };
  if (JSON.stringify(value.optionIds) !== JSON.stringify(optionIds)) {
    throw new Error("trajectory_thermometer_option_order_mismatch");
  }
  return {
    status: "valid",
    probabilitiesByOptionId: Object.fromEntries(
      optionIds.map((optionId, index) => [optionId, value.values[index]]),
    ),
  };
}

/**
 * Repeat A is the operational belief state. Repeat B remains an optional
 * instrument-quality cross-check; it is not averaged into or substituted for A.
 */
export function projectTrajectoryThermometerStateV1(input: {
  sourceTaskId: number;
  checkpointRound: number;
  optionIds: readonly string[];
  expectedAgentIds: readonly string[];
  units: readonly TrajectoryThermometerUnitV1[];
  snapshotHash: string;
  publicChoiceByAgentId?: Readonly<Record<string, string>>;
}): Readonly<DiscussionThermometerStateV1> {
  const units = input.units.filter(unit => unit.checkpointRound === input.checkpointRound);
  const byAgent = new Map(units.map(unit => [unit.agentId, unit]));
  if (byAgent.size !== units.length) throw new Error("trajectory_thermometer_duplicate_agent");
  return projectDiscussionThermometerStateV1({
    claimId: `claim:trajectory:${input.sourceTaskId}`,
    checkpointId: `task:${input.sourceTaskId}:X${input.checkpointRound}`,
    checkpointIndex: input.checkpointRound,
    optionIds: input.optionIds,
    expectedAgentIds: input.expectedAgentIds,
    reportPairs: input.expectedAgentIds.flatMap(agentId => {
      const unit = byAgent.get(agentId);
      if (!unit) return [];
      return [{
        agentId,
        A: replicate(unit.repeatA, unit.repeatStatuses.A, input.optionIds),
        B: replicate(unit.repeatB, unit.repeatStatuses.B, input.optionIds),
      }];
    }),
    publicChoiceByAgentId: input.publicChoiceByAgentId,
    sensorRef: COLLECTIVE_DYNAMICS_SHADOW_SENSOR_PROMPT_V1,
    snapshotHash: input.snapshotHash,
  });
}
