/** Isolated task-14 canary entry for the mechanism V1 experiment. */
import dotenv from "dotenv";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import {
  buildMechanismCanaryPlanV1,
  freezeMechanismCanaryPlanV1,
} from "./mechanismExperimentPlanV1";
import { createMechanismAttemptLedgerV1 } from "./mechanismAttemptLedgerV1";
import { createMechanismTracedInvokerV1 } from "./mechanismProviderTraceV1";
import { runMechanismGlmTaskV1 } from "./mechanismGlmTaskExecutionV1";
import {
  buildMechanismExecutionIdentityV1,
  writeMechanismExecutionIdentityV1,
} from "./mechanismExecutionIdentityV1";
import {
  buildMechanismTaskArtifactV1,
  writeMechanismTaskArtifactV1,
} from "./mechanismTaskArtifactV1";
import {
  buildMechanismManifestV1,
  verifyMechanismArtifactDirectoryV1,
  writeMechanismManifestV1,
} from "./mechanismManifestV1";

function assertFreshCanaryDirectory(outputDir: string): void {
  if (!existsSync(outputDir)) return;
  const allowedBeforeCalls = new Set(["plan.json", "execution.json", "attempts.jsonl"]);
  const unexpected = readdirSync(outputDir).filter(name => !allowedBeforeCalls.has(name));
  if (unexpected.length) throw new Error(`mechanism_canary_output_not_fresh:${unexpected.sort().join(",")}`);
}

/**
 * Executes one complete canary with an injected single-attempt invoker.
 * Authorization and credential loading remain in the CLI boundary below.
 */
export async function executeMechanismCanaryV1(input: {
  outputDir: string;
  baseInvoker: SingleAttemptTextInvoker;
  repoRoot?: string;
  clock?: () => string;
}): Promise<{ outputDir: string; observedTokens: number; manifestHash: string; taskArtifactHash: string }> {
  const outputDir = resolve(input.outputDir);
  assertFreshCanaryDirectory(outputDir);
  const plan = freezeMechanismCanaryPlanV1(outputDir);
  const execution = buildMechanismExecutionIdentityV1({
    planHash: plan.contentHash, model: plan.model, repoRoot: input.repoRoot,
  });
  writeMechanismExecutionIdentityV1(outputDir, execution);
  const ledger = createMechanismAttemptLedgerV1({ file: join(outputDir, "attempts.jsonl"), clock: input.clock });
  const traced = createMechanismTracedInvokerV1({
    baseInvoker: input.baseInvoker,
    maxObservedTokens: plan.tokenStopThreshold,
    clock: input.clock,
    ledger,
  });
  const result = await runMechanismGlmTaskV1({
    taskId: plan.taskIds[0], seed: plan.seeds[0], armOrder: plan.armOrder,
    invoker: traced.invoker, clock: input.clock,
  });
  const audit = ledger.audit();
  if (audit.started !== plan.plannedLogicalCalls
    || audit.finished !== plan.plannedLogicalCalls
    || audit.unfinishedAttemptIds.length
    || audit.duplicateRequestHashes.length) {
    throw new Error("mechanism_canary_ledger_gate_failed");
  }
  const artifact = buildMechanismTaskArtifactV1({
    planHash: plan.contentHash,
    executionHash: execution.contentHash,
    model: plan.model,
    taskRun: result.task,
    round1Snapshot: result.round1Snapshot,
    parsedRecords: result.parsedRecords,
    providerAttempts: traced.attempts,
    observedTokens: traced.observedTokens(),
  });
  const taskFile = writeMechanismTaskArtifactV1(outputDir, artifact);
  const manifest = buildMechanismManifestV1({ outputDir, plan, files: [
    { role: "attempts", fileName: "attempts.jsonl" },
    { role: "execution", fileName: "execution.json" },
    { role: "task", fileName: taskFile, taskId: plan.taskIds[0] },
  ] });
  writeMechanismManifestV1(outputDir, manifest);
  verifyMechanismArtifactDirectoryV1(outputDir);
  return {
    outputDir,
    observedTokens: traced.observedTokens(),
    manifestHash: manifest.contentHash,
    taskArtifactHash: artifact.contentHash,
  };
}

async function main(): Promise<number> {
  const plan = buildMechanismCanaryPlanV1();
  const outputDir = resolve(process.cwd(), plan.outputDir);
  if (process.argv.includes("--plan")) {
    const frozen = freezeMechanismCanaryPlanV1(outputDir);
    console.log(JSON.stringify({ mode: "plan", outputDir, planHash: frozen.contentHash }));
    return 0;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --plan | --execute");
    return 2;
  }
  if (process.env.RUN_AUTHORIZED !== "yes") {
    console.error("mechanism_canary_execute_blocked: RUN_AUTHORIZED=yes not present");
    return 5;
  }
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("mechanism_canary_zhipu_api_key_unavailable");
    return 3;
  }
  const result = await executeMechanismCanaryV1({
    outputDir,
    baseInvoker: createZhipuSingleAttemptInvoker("glm-4.6v"),
  });
  console.log(JSON.stringify({ mode: "execute", status: "passed", ...result }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
