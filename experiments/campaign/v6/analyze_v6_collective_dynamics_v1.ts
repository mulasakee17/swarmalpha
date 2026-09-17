/** Offline-only outcome analyzer for Collective Epistemic Dynamics V1. */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  analyzeCollectiveDynamicsTaskV1,
  hashCollectiveDynamicsValueV1,
  replayCollectiveDynamicsResponseV1,
  summarizeCollectiveDynamicsAnalysesV1,
  verifyCollectiveDynamicsManifestV1,
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
  type CollectiveDynamicsManifestV1,
  type CollectiveDynamicsPlanV1,
  type CollectiveDynamicsResponseArtifactV1,
} from "./collectiveDynamicsV1";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function verifyPlan(plan: CollectiveDynamicsPlanV1): void {
  const { contentHash, ...body } = plan;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("collective_dynamics_plan_hash_mismatch");
  }
}

export function analyzeCollectiveDynamicsDirectoryV1(outputDir: string) {
  const plan = readJson<CollectiveDynamicsPlanV1>(join(outputDir, "plan.json"));
  verifyPlan(plan);
  const formationFiles = readdirSync(outputDir).filter(name => /^formation-task-\d+-seed--?\d+\.json$/.test(name)).sort();
  const responseFiles = readdirSync(outputDir).filter(name => /^response-task-\d+-seed--?\d+\.json$/.test(name)).sort();
  const formations = new Map<string, CollectiveDynamicsFormationArtifactV1>();
  for (const file of formationFiles) {
    const artifact = readJson<CollectiveDynamicsFormationArtifactV1>(join(outputDir, file));
    verifyFormationArtifactV1(artifact);
    if (artifact.planHash !== plan.contentHash) throw new Error("collective_dynamics_formation_plan_mismatch");
    formations.set(`${artifact.onlineTask.sourceTaskId}:${artifact.seed}`, artifact);
  }
  const taskAnalyses = responseFiles.map(file => {
    const response = readJson<CollectiveDynamicsResponseArtifactV1>(join(outputDir, file));
    const sourceTaskId = Number(response.taskId.split(":").at(-1));
    const formation = formations.get(`${sourceTaskId}:${response.seed}`);
    if (!formation) throw new Error(`collective_dynamics_missing_formation:${sourceTaskId}:${response.seed}`);
    replayCollectiveDynamicsResponseV1({ formation, response });
    // This is the first and only ground-truth access in the pipeline.
    const outcome = createHiddenBenchTaskProjectionV1({ sourceTaskId }).adapter.task.outcome;
    return analyzeCollectiveDynamicsTaskV1({ formation, response, outcome });
  });
  const responses = responseFiles.map(file =>
    readJson<CollectiveDynamicsResponseArtifactV1>(join(outputDir, file)));
  const manifest = readJson<CollectiveDynamicsManifestV1>(join(outputDir, "manifest.json"));
  verifyCollectiveDynamicsManifestV1({
    plan,
    manifest,
    formations: [...formations.values()],
    responses,
  });
  const body = {
    analysisRef: { id: "swarmalpha.analysis.v6.collective-epistemic-dynamics", version: "1.0.0" },
    status: "offline_outcome_analysis" as const,
    planHash: plan.contentHash,
    taskAnalyses,
    summary: summarizeCollectiveDynamicsAnalysesV1(taskAnalyses),
    interpretationCeiling: "randomized_same_state_arm_contrasts_within_observed_r3_strata" as const,
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): number {
  const directory = process.argv.find(argument => argument.startsWith("--dir="))?.slice("--dir=".length);
  if (!directory) {
    console.error("usage: --dir=<collective-dynamics-artifact-directory>");
    return 2;
  }
  const outputDir = resolve(process.cwd(), directory);
  const analysis = analyzeCollectiveDynamicsDirectoryV1(outputDir);
  const file = join(outputDir, "analysis.json");
  const text = `${JSON.stringify(analysis, null, 2)}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") !== text) {
    throw new Error("collective_dynamics_analysis_no_overwrite_conflict");
  }
  if (!existsSync(file)) writeFileSync(file, text, "utf8");
  console.log(JSON.stringify({ status: "analyzed", taskCount: analysis.summary.taskCount, contentHash: analysis.contentHash }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
