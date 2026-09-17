/** One-task orchestration for mechanism V1; provider-specific prompts stay injected. */
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import {
  executeMechanismForkCoreV1,
  type MechanismArmExecutionInputV1,
} from "./mechanismForkCoreV1";
import type {
  MechanismArmV1,
  MechanismAttackItemV1,
  MechanismDisclosureArtifactV1,
} from "./mechanismDisclosureContractV1";

export interface MechanismRound1CaptureV1<Snapshot> {
  snapshot: Snapshot;
  selectedAttackItems: MechanismAttackItemV1[];
  expectedAgentCount: number;
}

export interface MechanismArmScientificResultV1 {
  finalBelief: Record<string, number>;
  finalReportedCount: number;
  round2ReportedCount: number;
}

export interface MechanismTaskRunV1 {
  taskId: number;
  seed: number;
  sharedSnapshotHash: string;
  expectedAgentCount: number;
  armOrder: MechanismArmV1[];
  arms: Array<{
    arm: MechanismArmV1;
    treatmentHash: string;
    selectionIdentityHash: string;
    disclosure: MechanismDisclosureArtifactV1;
    result: MechanismArmScientificResultV1;
  }>;
}

function assertCompleteResult(result: MechanismArmScientificResultV1, expected: number): void {
  if (result.round2ReportedCount !== expected) throw new Error("mechanism_incomplete_round2");
  if (result.finalReportedCount !== expected) throw new Error("mechanism_incomplete_final");
  const values = Object.values(result.finalBelief);
  if (!values.length || values.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error("mechanism_invalid_final_belief");
  }
  const sum = values.reduce((total, value) => total + value, 0);
  if (Math.abs(sum - 1) > 1e-6) throw new Error("mechanism_invalid_final_belief_sum");
}

export async function runMechanismTaskV1<Snapshot>(input: {
  taskId: number;
  seed: number;
  armOrder: readonly MechanismArmV1[];
  invoker: SingleAttemptTextInvoker;
  captureRound1: (input: {
    taskId: number;
    seed: number;
    invoker: SingleAttemptTextInvoker;
  }) => Promise<MechanismRound1CaptureV1<Snapshot>>;
  executeArm: (input: MechanismArmExecutionInputV1<Snapshot> & {
    taskId: number;
    seed: number;
    invoker: SingleAttemptTextInvoker;
  }) => Promise<MechanismArmScientificResultV1>;
}): Promise<MechanismTaskRunV1> {
  const round1 = await input.captureRound1({ taskId: input.taskId, seed: input.seed, invoker: input.invoker });
  if (!Number.isInteger(round1.expectedAgentCount) || round1.expectedAgentCount <= 0) {
    throw new Error("mechanism_invalid_expected_agent_count");
  }
  const fork = await executeMechanismForkCoreV1({
    round1Snapshot: round1.snapshot,
    selectedAttackItems: round1.selectedAttackItems,
    armOrder: input.armOrder,
    executeArm: async armInput => {
      const result = await input.executeArm({
        ...armInput,
        taskId: input.taskId,
        seed: input.seed,
        invoker: input.invoker,
      });
      assertCompleteResult(result, round1.expectedAgentCount);
      return result;
    },
  });
  return {
    taskId: input.taskId,
    seed: input.seed,
    sharedSnapshotHash: fork.sharedSnapshotHash,
    expectedAgentCount: round1.expectedAgentCount,
    armOrder: [...fork.armOrder],
    arms: fork.arms,
  };
}
