/** Zero-provider freezer for the matched-sham extension of M1. */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  buildCollectiveDynamicsMatchedShamFreezeV1,
  buildCollectiveDynamicsMatchedShamPlanV1,
  verifyCollectiveDynamicsMatchedShamFreezeV1,
  verifyCollectiveDynamicsMatchedShamPlanV1,
  type CollectiveDynamicsMatchedShamFreezeV1,
  type CollectiveDynamicsMatchedShamPlanV1,
} from "./collectiveDynamicsMatchedShamFreezeV1";
import {
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
} from "./collectiveDynamicsV1";

export const COLLECTIVE_DYNAMICS_MATCHED_SHAM_FREEZE_OUTPUT_V1 =
  "results/v6_collective_dynamics_matched_sham_freeze_v1_glm46v_seed1";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function exactJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeExactOrVerify(file: string, value: unknown): void {
  const text = exactJson(value);
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) {
      throw new Error(`matched_sham_freeze_v1_no_overwrite_conflict:${file}`);
    }
    return;
  }
  writeFileSync(file, text, { flag: "wx" });
}

export function loadCollectiveDynamicsMatchedShamFormationsV1(
  plan: CollectiveDynamicsMatchedShamPlanV1,
): CollectiveDynamicsFormationArtifactV1[] {
  verifyCollectiveDynamicsMatchedShamPlanV1(plan);
  const sourceDirectory = resolve(plan.sourceFormationDirectory);
  return plan.sourceTaskIds.map(sourceTaskId => {
    const file = join(sourceDirectory, `formation-task-${sourceTaskId}-seed-${plan.sourceSeed}.json`);
    if (!existsSync(file)) {
      throw new Error(`matched_sham_freeze_v1_source_formation_missing:${sourceTaskId}`);
    }
    const formation = readJson<CollectiveDynamicsFormationArtifactV1>(file);
    verifyFormationArtifactV1(formation);
    if (formation.onlineTask.sourceTaskId !== sourceTaskId || formation.seed !== plan.sourceSeed) {
      throw new Error(`matched_sham_freeze_v1_source_formation_identity_invalid:${sourceTaskId}`);
    }
    return formation;
  });
}

export function freezeCollectiveDynamicsMatchedShamV1(input?: {
  outputDirectory?: string;
  sourceFormationDirectory?: string;
}): {
  outputDirectory: string;
  plan: CollectiveDynamicsMatchedShamPlanV1;
  formations: CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsMatchedShamFreezeV1;
} {
  const outputDirectory = resolve(
    input?.outputDirectory ?? COLLECTIVE_DYNAMICS_MATCHED_SHAM_FREEZE_OUTPUT_V1,
  );
  const plan = buildCollectiveDynamicsMatchedShamPlanV1({
    sourceFormationDirectory: input?.sourceFormationDirectory,
  });
  const formations = loadCollectiveDynamicsMatchedShamFormationsV1(plan);
  const freeze = buildCollectiveDynamicsMatchedShamFreezeV1({ plan, formations });
  writeExactOrVerify(join(outputDirectory, "plan.json"), plan);
  writeExactOrVerify(join(outputDirectory, "freeze.json"), freeze);
  return { outputDirectory, plan, formations, freeze };
}

export function loadFrozenCollectiveDynamicsMatchedShamV1(outputDirectoryInput?: string): {
  outputDirectory: string;
  plan: CollectiveDynamicsMatchedShamPlanV1;
  formations: CollectiveDynamicsFormationArtifactV1[];
  freeze: CollectiveDynamicsMatchedShamFreezeV1;
} {
  const outputDirectory = resolve(
    outputDirectoryInput ?? COLLECTIVE_DYNAMICS_MATCHED_SHAM_FREEZE_OUTPUT_V1,
  );
  const plan = readJson<CollectiveDynamicsMatchedShamPlanV1>(join(outputDirectory, "plan.json"));
  const freeze = readJson<CollectiveDynamicsMatchedShamFreezeV1>(join(outputDirectory, "freeze.json"));
  const formations = loadCollectiveDynamicsMatchedShamFormationsV1(plan);
  verifyCollectiveDynamicsMatchedShamFreezeV1({ plan, formations, freeze });
  return { outputDirectory, plan, formations, freeze };
}

function main(): number {
  if (!process.argv.includes("--plan")) {
    console.error("usage: --plan (zero provider calls)");
    return 2;
  }
  const frozen = freezeCollectiveDynamicsMatchedShamV1({
    outputDirectory: process.env.MATCHED_SHAM_FREEZE_OUTPUT_DIR,
  });
  console.log(JSON.stringify({
    mode: "plan",
    providerCalls: 0,
    outputDirectory: frozen.outputDirectory,
    planHash: frozen.plan.contentHash,
    freezeHash: frozen.freeze.contentHash,
    units: frozen.freeze.registeredUnitCount,
    cells: frozen.freeze.registeredCellCount,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
