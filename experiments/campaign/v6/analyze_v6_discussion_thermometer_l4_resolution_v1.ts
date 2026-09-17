import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { simulatePairedSignFlipPowerV1 } from "./collectiveDynamicsTrajectoryPredictionV1";

export const DISCUSSION_THERMOMETER_L4_RESOLUTION_V1 = Object.freeze({
  id: "swarmalpha.analysis.v6.discussion-thermometer-l4-resolution",
  version: "1.0.0",
  providerCalls: 0,
  taskCounts: [8, 12, 16, 24, 32] as const,
  standardizedMeanDeltas: [0, -0.25, -0.5, -0.75, -1] as const,
  trialCount: 400,
  alpha: 0.05,
  seed: 0x4C34A7,
});

export function analyzeDiscussionThermometerL4ResolutionV1() {
  const grid = simulatePairedSignFlipPowerV1({
    taskCounts: DISCUSSION_THERMOMETER_L4_RESOLUTION_V1.taskCounts,
    standardizedMeanDeltas: DISCUSSION_THERMOMETER_L4_RESOLUTION_V1.standardizedMeanDeltas,
    trialCount: DISCUSSION_THERMOMETER_L4_RESOLUTION_V1.trialCount,
    alpha: DISCUSSION_THERMOMETER_L4_RESOLUTION_V1.alpha,
    seed: DISCUSSION_THERMOMETER_L4_RESOLUTION_V1.seed,
  });
  const minimumTaskCountAt80PercentByEffect = Object.fromEntries(
    DISCUSSION_THERMOMETER_L4_RESOLUTION_V1.standardizedMeanDeltas
      .filter(effect => effect !== 0)
      .map(effect => {
        const qualifying = grid
          .filter(point => point.standardizedMeanDelta === effect && point.rejectionRate >= 0.8)
          .sort((left, right) => left.taskCount - right.taskCount)[0];
        return [String(effect), qualifying?.taskCount ?? null];
      }),
  );
  const body = {
    analysisRef: DISCUSSION_THERMOMETER_L4_RESOLUTION_V1,
    inferenceStatus: "synthetic_resolution_only",
    empiricalQualification: "not_run",
    assumptions: {
      unit: "task_level_paired_candidate_minus_baseline_loss_delta",
      deltaModel: "independent_gaussian_with_unit_task_standard_deviation",
      test: "two_sided_paired_sign_flip_monte_carlo",
      interpretation: "planning_sensitivity_not_empirical_power_or_effect_gate",
    },
    grid,
    minimumTaskCountAt80PercentByEffect,
  };
  return {
    ...body,
    contentHash: `sha256:${createHash("sha256").update(JSON.stringify(body)).digest("hex")}`,
  };
}

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error("discussion_thermometer_l4_resolution_replay_drift");
    }
    return;
  }
  writeFileSync(path, serialized, "utf8");
}

function main(): void {
  const result = analyzeDiscussionThermometerL4ResolutionV1();
  const output = resolve(
    process.cwd(),
    "results/v6_discussion_thermometer_l4_resolution_v1/analysis.json",
  );
  writeExactOrVerify(output, result);
  console.log(JSON.stringify({
    status: "l4_synthetic_resolution_complete",
    providerCalls: 0,
    output,
    minimumTaskCountAt80PercentByEffect: result.minimumTaskCountAt80PercentByEffect,
    contentHash: result.contentHash,
  }));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
