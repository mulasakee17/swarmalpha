import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadFrozenCollectiveDynamicsTrajectorySensorV1 } from
  "./run_v6_collective_dynamics_trajectory_sensor_v1";
import type { CollectiveDynamicsTrajectoryPublicRunV1 } from
  "./runCollectiveDynamicsTrajectoryPublicV1";
import {
  buildDiscussionThermometerPreActionFreezeV1,
  preflightDiscussionThermometerPreActionV1,
} from "./discussionThermometerPreActionQualificationV1";

const SOURCE_DIRECTORY =
  "results/v6_discussion_thermometer_l4_development_stage1_glm46v_seed1";
const OUTPUT_DIRECTORY =
  "results/v6_discussion_thermometer_preaction_preflight_v1_glm46v_seed1";

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error("preaction_preflight_no_overwrite_conflict");
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

function main(): void {
  const sourceDirectory = resolve(process.cwd(), SOURCE_DIRECTORY);
  const outputDirectory = resolve(process.cwd(), OUTPUT_DIRECTORY);
  const frozen = loadFrozenCollectiveDynamicsTrajectorySensorV1(sourceDirectory);
  const publicRun = JSON.parse(readFileSync(join(sourceDirectory, "public-run.json"), "utf8")) as
    CollectiveDynamicsTrajectoryPublicRunV1;
  const freeze = buildDiscussionThermometerPreActionFreezeV1({
    plan: frozen.plan,
    publicRun,
  });
  const preflight = preflightDiscussionThermometerPreActionV1({ freeze, publicRun });
  mkdirSync(outputDirectory, { recursive: true });
  writeExactOrVerify(join(outputDirectory, "freeze.json"), freeze);
  writeExactOrVerify(join(outputDirectory, "preflight.json"), preflight);
  console.log(JSON.stringify({
    outputDirectory,
    freezeHash: freeze.contentHash,
    preflight,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) main();
