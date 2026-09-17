import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  analyzeDiscussionThermometerNaturalDynamicsV1,
} from "./analyzeDiscussionThermometerNaturalDynamicsV1";
import type { DiscussionThermometerStateSpaceCalibrationPlanV1 } from
  "./discussionThermometerStateSpaceCalibrationPlanV1";
import type {
  DiscussionThermometerCalibrationObservationV1,
  DiscussionThermometerCalibrationPublicRunV1,
  DiscussionThermometerCalibrationSensorFreezeV1,
  DiscussionThermometerCalibrationSensorRunV1,
} from "./runDiscussionThermometerStateSpaceCalibrationV1";

const DEFAULT_OUTPUT_DIRECTORY =
  "results/v6_discussion_thermometer_state_space_calibration_glm46v_seed1";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`natural_dynamics_no_overwrite_conflict:${path}`);
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

export function analyzeFrozenDiscussionThermometerNaturalDynamicsV1(
  outputDirectory: string,
) {
  const plan = readJson<DiscussionThermometerStateSpaceCalibrationPlanV1>(
    join(outputDirectory, "plan.json"));
  const publicRun = readJson<DiscussionThermometerCalibrationPublicRunV1>(
    join(outputDirectory, "public-run.json"));
  const sensorFreeze = readJson<DiscussionThermometerCalibrationSensorFreezeV1>(
    join(outputDirectory, "sensor-freeze.json"));
  const sensorRun = readJson<DiscussionThermometerCalibrationSensorRunV1>(
    join(outputDirectory, "sensor-run.json"));
  const observation = readJson<DiscussionThermometerCalibrationObservationV1>(
    join(outputDirectory, "observation.json"));
  return analyzeDiscussionThermometerNaturalDynamicsV1({
    plan, publicRun, sensorFreeze, sensorRun, observation,
    evidenceClass: "provider_observation",
  });
}

function main(): void {
  const outputDirectory = resolve(process.cwd(),
    process.env.THERMOMETER_NATURAL_DYNAMICS_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIRECTORY);
  const analysis = analyzeFrozenDiscussionThermometerNaturalDynamicsV1(outputDirectory);
  writeExactOrVerify(join(outputDirectory, "analysis-natural-dynamics-v1.json"), analysis);
  process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
}

if (process.argv[1]?.endsWith("analyze_v6_discussion_thermometer_natural_dynamics_v1.ts")) {
  main();
}
