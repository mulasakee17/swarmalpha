import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  analyzeDiscussionThermometerNaturalDynamicsV1,
  type DiscussionThermometerNaturalDynamicsAnalysisV1,
} from "./analyzeDiscussionThermometerNaturalDynamicsV1";
import {
  verifyDiscussionThermometerNaturalDynamicsPlanV1,
  type DiscussionThermometerNaturalDynamicsPlanV1,
} from "./discussionThermometerNaturalDynamicsPlanV1";
import {
  evaluateDiscussionThermometerNaturalDynamicsReplicationV1,
} from "./evaluateDiscussionThermometerNaturalDynamicsReplicationV1";
import type {
  NaturalDynamicsObservationV1,
  NaturalDynamicsPublicRunV1,
  NaturalDynamicsSensorFreezeV1,
  NaturalDynamicsSensorRunV1,
} from "./runDiscussionThermometerNaturalDynamicsV1";

const DEFAULT_OUTPUT =
  "results/v6_discussion_thermometer_natural_dynamics_glm46v_seed1_batch2";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`natural_dynamics_replication_no_overwrite_conflict:${path}`);
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

function main(): void {
  const output = resolve(process.env.THERMOMETER_NATURAL_DYNAMICS_OUTPUT_DIR
    ?? DEFAULT_OUTPUT);
  const plan = readJson<DiscussionThermometerNaturalDynamicsPlanV1>(
    join(output, "plan.json"));
  const publicRun = readJson<NaturalDynamicsPublicRunV1>(
    join(output, "public-run.json"));
  const sensorFreeze = readJson<NaturalDynamicsSensorFreezeV1>(
    join(output, "sensor-freeze.json"));
  const sensorRun = readJson<NaturalDynamicsSensorRunV1>(
    join(output, "sensor-run.json"));
  const observation = readJson<NaturalDynamicsObservationV1>(
    join(output, "observation.json"));
  const analysisOnDisk = readJson<DiscussionThermometerNaturalDynamicsAnalysisV1>(
    join(output, "analysis.json"));
  verifyDiscussionThermometerNaturalDynamicsPlanV1(plan);
  const replayed = analyzeDiscussionThermometerNaturalDynamicsV1({
    plan,
    publicRun,
    sensorFreeze,
    sensorRun,
    observation,
    evidenceClass: "provider_observation",
  });
  if (JSON.stringify(replayed) !== JSON.stringify(analysisOnDisk)) {
    throw new Error("natural_dynamics_replication_source_analysis_replay_mismatch");
  }
  const evaluation = evaluateDiscussionThermometerNaturalDynamicsReplicationV1({
    plan,
    analysis: replayed,
  });
  writeExactOrVerify(join(output, "replication-evaluation.json"), evaluation);
  process.stdout.write(`${JSON.stringify(evaluation, null, 2)}\n`);
}

if (process.argv[1]?.endsWith(
  "evaluate_v6_discussion_thermometer_natural_dynamics_replication_v1.ts")) {
  main();
}
