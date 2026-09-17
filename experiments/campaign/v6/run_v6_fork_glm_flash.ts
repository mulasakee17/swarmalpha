/**
 * Cross-model fork validation on Zhipu GLM-4-Flash (free tier, non-reasoning).
 *
 * Same frozen fork machinery as the DeepSeek confirmatory, swapped to
 * glm-4-flash. Flash is NOT a reasoning model: no thinking-token billing, so
 * this full 45-task run costs nothing (unlike glm-4.5-air/4.6v whose
 * reasoning tokens made the full run unaffordable) and the frozen 256
 * final-elicitation maxTokens suffices (no thinking to eat the budget).
 * Output lands in a SEPARATE directory from both DeepSeek and glm-4.5-air.
 * This is a post-hoc cross-model replication, not a re-frozen confirmatory.
 *
 * Usage:
 *   npx tsx experiments/campaign/v6/run_v6_fork_glm_flash.ts --execute
 *   npx tsx experiments/campaign/v6/run_v6_fork_glm_flash.ts --replay
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

const GLM_MODEL = "zhipu:glm-4-flash";
const GLM_MODEL_ID = "glm-4-flash";
const GLM_OUTPUT_DIR = path.resolve(
  process.cwd(),
  "experiments/campaign/pilot_output/v6-fork-glmflash-xval-20260817",
);
const GLM_SEEDS: readonly number[] = [0];

async function runExecute(): Promise<number> {
  if (process.env.RUN_AUTHORIZED !== "yes") { console.error("glm_execute_blocked: RUN_AUTHORIZED=yes not present"); return 5; }
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) { console.error("zhipu_api_key_unavailable"); return 3; }
  const plan = buildForkPlanV1(FORK_CONFIRMATORY_TASK_IDS, GLM_SEEDS, GLM_MODEL);
  const result = await runForkExecute({
    plan,
    invoker: createZhipuSingleAttemptInvoker(GLM_MODEL_ID),
    outputDir: GLM_OUTPUT_DIR,
    // Generous per-call token estimate (prompt-side is the same long
    // transcripts); harmless for flash.
    tokensPerCallEstimate: 20_000,
    // zhipu enforces an account-level rate limit that 429s any second
    // in-flight request; sequential is the only stable mode.
    concurrency: 1,
  });
  console.log(JSON.stringify({ mode: "glm-flash-xval", ...result, outputDir: GLM_OUTPUT_DIR }, null, 2));
  return 0;
}

function runReplay(): number {
  if (!fs.existsSync(path.join(GLM_OUTPUT_DIR, "manifest.json"))) {
    console.error("glm_replay_no_manifest");
    return 1;
  }
  const result = verifyForkOutput(GLM_OUTPUT_DIR);
  console.log(JSON.stringify({ mode: "glm-flash-replay", ok: result.ok, detail: result.detail }, null, 2));
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
