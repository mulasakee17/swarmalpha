/** Isolated task-14 canary for the GLM-4.6V three-arm extension. */

import * as path from "node:path";
import dotenv from "dotenv";
import { pathToFileURL } from "node:url";

async function main(): Promise<void> {
  process.env.GLM46V_EXPERIMENT_VARIANT = "three-arm-seed2";
  const {
    executeGlm46vTwoArmGate,
    buildGlm46vTwoArmPlanV4,
    recomputeGlm46vPlanHash,
    detectGlm46vRepoState,
    readGlm46vLedgerScan,
    GLM46V_PER_CALL_TOKEN_ESTIMATE,
    GLM46V_TOKEN_STOP_THRESHOLD,
    GLM46V_TOTAL_TOKEN_QUOTA,
    GLM46V_ARMS,
  } = await import("./run_v6_fork_glm46v_two_arm_v4");
  const { createZhipuSingleAttemptInvoker } = await import("./zhipuSingleAttemptInvoker");
  const { forkPlannedCallsForRunV1 } = await import("./run_v6_fork");

  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("zhipu_api_key_unavailable");
    process.exitCode = 3;
    return;
  }
  const outputDir = process.env.GLM46V_CANARY_OUTPUT_DIR
    ? path.resolve(process.cwd(), process.env.GLM46V_CANARY_OUTPUT_DIR)
    : path.resolve(process.cwd(), "experiments/campaign/pilot_output/v6-fork-glm46v-canary-task14-threearm-seed2-20260821");
  const base = buildGlm46vTwoArmPlanV4();
  const { contentHash: _ignored, ...body } = base;
  const plannedProviderCalls = forkPlannedCallsForRunV1(14, GLM46V_ARMS);
  const plan = {
    ...body,
    taskIds: [14],
    totalRuns: 1,
    plannedProviderCalls,
    plannedEstimateTokens: plannedProviderCalls * GLM46V_PER_CALL_TOKEN_ESTIMATE,
    estimateWithinStopThreshold: true,
  };
  const frozenPlan = { ...plan, contentHash: recomputeGlm46vPlanHash({ ...plan, contentHash: "" }) };
  const result = await executeGlm46vTwoArmGate({
    outputDir,
    invoker: createZhipuSingleAttemptInvoker("glm-4.6v"),
    repoState: detectGlm46vRepoState(),
    plan: frozenPlan,
  });
  const ledger = readGlm46vLedgerScan(outputDir);
  const perCall = ledger.physicalAttempts > 0 ? ledger.observedTokens / ledger.physicalAttempts : 0;
  const formalCalls = base.plannedProviderCalls;
  const projected = perCall * formalCalls;
  console.log(JSON.stringify({
    mode: "glm46v-canary-threearm-seed2",
    result,
    ledger: {
      physicalAttempts: ledger.physicalAttempts,
      observedTokens: ledger.observedTokens,
      unknownUsageCalls: ledger.unknownUsageCalls,
      unfinishedAttemptIds: ledger.unfinishedAttemptIds,
    },
    projection: {
      formalLogicalCalls: formalCalls,
      canaryMeanTokens: perCall,
      projectedFormalTokens: projected,
      projectedAboveStopThreshold: projected > GLM46V_TOKEN_STOP_THRESHOLD,
      quota: GLM46V_TOTAL_TOKEN_QUOTA,
    },
    outputDir,
  }, null, 2));
  process.exitCode = result.status === "completed" && result.completedTasks === 1
    && ledger.unknownUsageCalls === 0 && ledger.unfinishedAttemptIds.length === 0
    ? 0 : 4;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 4;
  });
}
