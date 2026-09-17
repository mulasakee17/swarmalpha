/**
 * Cross-model fork validation on Zhipu GLM-4-Flash (free tier).
 *
 * Reuses the frozen fork machinery (identical round-1 state -> 3 arms ->
 * offline Brier) but swaps the provider and model. Output lands in a SEPARATE
 * directory so the frozen DeepSeek confirmatory artifacts are never touched.
 * This is a post-hoc cross-model replication, not a re-frozen confirmatory.
 *
 * Usage:
 *   npx tsx experiments/campaign/v6/run_v6_fork_glm.ts --execute
 *   npx tsx experiments/campaign/v6/run_v6_fork_glm.ts --replay
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import {
  FORK_CONFIRMATORY_TASK_IDS,
  buildForkPlanV1,
  runForkExecute,
  verifyForkOutput,
} from "./run_v6_fork";

const GLM_MODEL = "zhipu:glm-4.5-air";
const GLM_OUTPUT_DIR = path.resolve(
  process.cwd(),
  "experiments/campaign/pilot_output/v6-fork-glm45air-xval-20260816",
);
const GLM_SEEDS: readonly number[] = [0];

async function runExecute(): Promise<number> {
  if (process.env.RUN_AUTHORIZED !== "yes") { console.error("glm_execute_blocked: RUN_AUTHORIZED=yes not present"); return 5; }
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) { console.error("zhipu_api_key_unavailable"); return 3; }
  const plan = buildForkPlanV1(FORK_CONFIRMATORY_TASK_IDS, GLM_SEEDS, GLM_MODEL);
  const result = await runForkExecute({
    plan,
    invoker: createZhipuSingleAttemptInvoker(),
    outputDir: GLM_OUTPUT_DIR,
    // GLM reasoning-tier calls on the long round-2/final transcripts exceed the
    // frozen 6000-token-per-call DeepSeek estimate; 20000 clears them without
    // relaxing the frozen path (default stays 6000 there).
    tokensPerCallEstimate: 20_000,
    // Concurrency stays at the frozen default of 1: zhipu enforces an
    // account-level rate limit that 429s any second in-flight request
    // (verified empirically: 2 and 4 concurrent runs both tripped sustained
    // RATE_LIMIT and killed the process; sequential runs never 429).
    concurrency: 1,
  });
  console.log(JSON.stringify({ mode: "glm-xval", ...result, outputDir: GLM_OUTPUT_DIR }, null, 2));
  return 0;
}

function runReplay(): number {
  if (!fs.existsSync(path.join(GLM_OUTPUT_DIR, "manifest.json"))) {
    console.error("glm_replay_no_manifest");
    return 1;
  }
  const result = verifyForkOutput(GLM_OUTPUT_DIR);
  console.log(JSON.stringify({ mode: "glm-replay", ok: result.ok, detail: result.detail }, null, 2));
  return result.ok ? 0 : 1;
}

async function main(): Promise<number> {
  if (process.argv.includes("--execute")) return runExecute();
  if (process.argv.includes("--replay")) return runReplay();
  console.error("usage: --execute | --replay");
  return 2;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 4;
  });
}
