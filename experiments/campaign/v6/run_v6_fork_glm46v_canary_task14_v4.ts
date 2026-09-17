/**
 * Task-14 isolated engineering canary for the GLM-4.6V V4 gate.
 *
 * Uses the CURRENT V4 real execution path (executeGlm46vTwoArmGate in
 * run_v6_fork_glm46v_two_arm_v4.ts) with the frozen V4 request configuration
 * (glm-4.6v, CONTROL+ATTACKS, seed 0, thinking disabled, 768/256 caps,
 * single-attempt invoker, v4-strict completion policy) restricted to the
 * previously-observed task 14 ONLY, in a separate V4 canary directory.
 *
 * The canary output never enters the V4 formal sample; the formal V4 plan and
 * output directory are not modified.
 */

import * as path from "node:path";
import dotenv from "dotenv";
import { pathToFileURL } from "node:url";
import {
  executeGlm46vTwoArmGate,
  buildGlm46vTwoArmPlanV4,
  recomputeGlm46vPlanHash,
  detectGlm46vRepoState,
  readGlm46vLedgerScan,
  GLM46V_PER_CALL_TOKEN_ESTIMATE,
  GLM46V_TOKEN_STOP_THRESHOLD,
  GLM46V_TOTAL_TOKEN_QUOTA,
  GLM46V_ARMS,
  type Glm46vTwoArmPlanV4,
} from "./run_v6_fork_glm46v_two_arm_v4";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import { forkPlannedCallsForRunV1 } from "./run_v6_fork";

const CANARY_OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.GLM46V_EXPERIMENT_VARIANT === "seed1-replication"
    ? "experiments/campaign/pilot_output/v6-fork-glm46v-canary-task14-seed1-v3-20260821"
    : "experiments/campaign/pilot_output/v6-fork-glm46v-canary-task14-v4-jsonmode-20260821",
);

const CANARY_FORMAL_CALLS = 865;

function canaryPlan(): Glm46vTwoArmPlanV4 {
  const base = buildGlm46vTwoArmPlanV4();
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

export async function runGlm46vCanaryCli(): Promise<number> {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("zhipu_api_key_unavailable");
    return 3;
  }
  const plan = canaryPlan();
  const startedAt = Date.now();
  const result = await executeGlm46vTwoArmGate({
    outputDir: CANARY_OUTPUT_DIR,
    invoker: createZhipuSingleAttemptInvoker("glm-4.6v"),
    repoState: detectGlm46vRepoState(),
    plan,
  });
  const wallMs = Date.now() - startedAt;
  const ledger = readGlm46vLedgerScan(CANARY_OUTPUT_DIR);

  // Success-path extrapolation for the formal 865 logical calls, computed from
  // THIS canary's observed known usage (V3's 0.51M extrapolation is not reused).
  const perCall = ledger.physicalAttempts > 0 ? ledger.observedTokens / ledger.physicalAttempts : 0;
  const projected = perCall * CANARY_FORMAL_CALLS;
  const projected11 = projected * 1.1;
  const perCallWallMs = wallMs / Math.max(1, ledger.physicalAttempts);
  const projection = {
    formalLogicalCalls: CANARY_FORMAL_CALLS,
    canaryAttempts: ledger.physicalAttempts,
    canaryObservedTokens: ledger.observedTokens,
    canaryWallMs: wallMs,
    perCallMeanTokens: perCall,
    perCallMeanWallMs: perCallWallMs,
    projected865TokensPoint: projected,
    projected865TokensConservative11x: projected11,
    projected865WallMsPoint: perCallWallMs * CANARY_FORMAL_CALLS,
    stopThreshold: GLM46V_TOKEN_STOP_THRESHOLD,
    quota: GLM46V_TOTAL_TOKEN_QUOTA,
    pointAboveStopThreshold: projected > GLM46V_TOKEN_STOP_THRESHOLD,
    conservativeAboveQuota: projected11 > GLM46V_TOTAL_TOKEN_QUOTA,
  };

  console.log(JSON.stringify({ mode: "glm46v-canary-task14-v4", result, ledger: {
    physicalAttempts: ledger.physicalAttempts,
    observedTokens: ledger.observedTokens,
    unknownUsageCalls: ledger.unknownUsageCalls,
    unfinishedAttemptIds: ledger.unfinishedAttemptIds,
  }, projection, outputDir: CANARY_OUTPUT_DIR }, null, 2));
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runGlm46vCanaryCli().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 4;
  });
}
