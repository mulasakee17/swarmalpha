/**
 * Task-14 isolated engineering canary for the GLM-4.6V V3 gate.
 *
 * Uses the CURRENT V3 real execution path (executeGlm46vTwoArmGate) with the
 * frozen request configuration (glm-4.6v, CONTROL+ATTACKS, seed 0, thinking
 * disabled, 768/256 caps, single-attempt invoker) but restricted to the
 * previously-observed task 14 ONLY, in a separate canary output directory.
 *
 * The canary output never enters the V3 formal sample (the frozen analysis
 * rejects task 14). The canary directory is independent of the formal V3
 * output directory; the formal plan and artifacts are not modified.
 */

import * as path from "node:path";
import dotenv from "dotenv";
import { pathToFileURL } from "node:url";
import {
  executeGlm46vTwoArmGate,
  buildGlm46vTwoArmPlanV3,
  recomputeGlm46vPlanHash,
  detectGlm46vRepoState,
  readGlm46vLedgerScan,
  GLM46V_PER_CALL_TOKEN_ESTIMATE,
  GLM46V_TOKEN_STOP_THRESHOLD,
  GLM46V_TOTAL_TOKEN_QUOTA,
  type Glm46vTwoArmPlanV3,
} from "./run_v6_fork_glm46v_two_arm";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import { forkPlannedCallsForRunV1 } from "./run_v6_fork";
import { GLM46V_ARMS } from "./run_v6_fork_glm46v_two_arm";

const CANARY_OUTPUT_DIR = path.resolve(
  process.cwd(),
  "experiments/campaign/pilot_output/v6-fork-glm46v-canary-task14-20260820",
);

function canaryPlan(): Glm46vTwoArmPlanV3 {
  const base = buildGlm46vTwoArmPlanV3();
  const { contentHash: _c, ...body } = base;
  const plannedProviderCalls = forkPlannedCallsForRunV1(14, GLM46V_ARMS);
  const next = {
    ...body,
    taskIds: [14],
    totalRuns: 1,
    plannedProviderCalls,
    plannedEstimateTokens: plannedProviderCalls * GLM46V_PER_CALL_TOKEN_ESTIMATE,
    estimateWithinStopThreshold: true,
  };
  return { ...next, contentHash: recomputeGlm46vPlanHash({ ...next, contentHash: "" }) };
}

async function main(): Promise<number> {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("zhipu_api_key_unavailable");
    return 3;
  }
  const plan = canaryPlan();
  const result = await executeGlm46vTwoArmGate({
    outputDir: CANARY_OUTPUT_DIR,
    invoker: createZhipuSingleAttemptInvoker("glm-4.6v"),
    repoState: detectGlm46vRepoState(),
    plan,
  });
  const ledger = readGlm46vLedgerScan(CANARY_OUTPUT_DIR);

  // Extrapolation from canary observed usage (informational; the formal run is
  // governed by its own ledger budget).
  const perCall = ledger.physicalAttempts > 0 ? ledger.observedTokens / ledger.physicalAttempts : 0;
  const projected = perCall * 865;
  const projected11 = projected * 1.1;
  const projection = {
    canaryAttempts: ledger.physicalAttempts,
    canaryObservedTokens: ledger.observedTokens,
    perCallMean: perCall,
    projected865Point: projected,
    projected865Conservative11x: projected11,
    stopThreshold: GLM46V_TOKEN_STOP_THRESHOLD,
    quota: GLM46V_TOTAL_TOKEN_QUOTA,
    pointAboveStopThreshold: projected > GLM46V_TOKEN_STOP_THRESHOLD,
    conservativeAboveQuota: projected11 > GLM46V_TOTAL_TOKEN_QUOTA,
  };

  console.log(JSON.stringify({ mode: "glm46v-canary-task14", result, ledger: {
    physicalAttempts: ledger.physicalAttempts,
    observedTokens: ledger.observedTokens,
    unknownUsageCalls: ledger.unknownUsageCalls,
    unfinishedAttemptIds: ledger.unfinishedAttemptIds,
  }, projection, outputDir: CANARY_OUTPUT_DIR }, null, 2));
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 4;
  });
}
