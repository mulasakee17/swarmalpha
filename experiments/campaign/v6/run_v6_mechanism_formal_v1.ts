/** Frozen 44-task formal executor for mechanism V1. No retry and no resume. */
import dotenv from "dotenv";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import {
  buildMechanismExperimentPlanV1,
  freezeMechanismExperimentPlanV1,
} from "./mechanismExperimentPlanV1";
import { createMechanismAttemptLedgerV1 } from "./mechanismAttemptLedgerV1";
import { createMechanismTracedInvokerV1 } from "./mechanismProviderTraceV1";
import { runMechanismGlmTaskV1 } from "./mechanismGlmTaskExecutionV1";
import {
  buildMechanismExecutionIdentityV1,
  writeMechanismExecutionIdentityV1,
} from "./mechanismExecutionIdentityV1";
import { buildMechanismTaskArtifactV1, writeMechanismTaskArtifactV1 } from "./mechanismTaskArtifactV1";
import {
  buildMechanismManifestV1,
  verifyMechanismArtifactDirectoryV1,
  writeMechanismManifestV1,
} from "./mechanismManifestV1";

interface MechanismFormalFailureV1 {
  taskId: number;
  seed: number;
  code: string;
  physicalAttempts: number;
}

interface MechanismFormalSummaryV1 {
  summaryRef: { id: "swarmalpha.experiment.v6.mechanism-formal-summary"; version: "1.0.0" };
  planHash: string;
  executionHash: string;
  status: "completed" | "completed_with_failed_tasks" | "stopped_global_gate";
  completedTaskIds: number[];
  failures: MechanismFormalFailureV1[];
  skippedTaskIds: number[];
  physicalAttempts: number;
  observedTokens: number;
}

function assertFreshFormalDirectory(outputDir: string): void {
  if (!existsSync(outputDir)) return;
  const allowedBeforeCalls = new Set(["plan.json", "execution.json", "attempts.jsonl"]);
  const unexpected = readdirSync(outputDir).filter(name => !allowedBeforeCalls.has(name));
  if (unexpected.length) throw new Error(`mechanism_formal_output_not_fresh:${unexpected.sort().join(",")}`);
}

function failureCode(error: unknown): string {
  if (error instanceof Error && /^[a-z0-9_:-]+$/.test(error.message)) return error.message;
  return "unknown_error";
}

function isGlobalStop(code: string): boolean {
  return code.startsWith("mechanism_token_stop")
    || code === "mechanism_usage_unknown"
    || code.startsWith("mechanism_ledger_")
    || code === "mechanism_duplicate_physical_request"
    || code === "mechanism_online_truth_leak"
    || code.startsWith("mechanism_task_artifact_");
}

function writeSummary(outputDir: string, summary: MechanismFormalSummaryV1): void {
  const file = join(outputDir, "summary.json");
  const text = `${JSON.stringify(summary, null, 2)}\n`;
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) throw new Error("mechanism_formal_summary_no_overwrite_conflict");
    return;
  }
  writeFileSync(file, text, "utf8");
}

export async function executeMechanismFormalV1(input: {
  outputDir: string;
  baseInvoker: SingleAttemptTextInvoker;
  repoRoot?: string;
  clock?: () => string;
}): Promise<{ outputDir: string; summary: MechanismFormalSummaryV1; manifestHash: string }> {
  const outputDir = resolve(input.outputDir);
  assertFreshFormalDirectory(outputDir);
  const plan = freezeMechanismExperimentPlanV1(outputDir);
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
  const completedTaskIds: number[] = [];
  const failures: MechanismFormalFailureV1[] = [];
  const skippedTaskIds: number[] = [];
  const taskFiles: Array<{ role: "task"; fileName: string; taskId: number }> = [];
  let stopped = false;

  for (let blockIndex = 0; blockIndex < plan.blocks.length; blockIndex++) {
    const block = plan.blocks[blockIndex];
    const attemptStart = traced.attempts.length;
    const tokenStart = traced.observedTokens();
    try {
      const result = await runMechanismGlmTaskV1({
        taskId: block.taskId, seed: block.seed, armOrder: block.armOrder,
        invoker: traced.invoker, clock: input.clock,
      });
      const attempts = traced.attempts.slice(attemptStart);
      const artifact = buildMechanismTaskArtifactV1({
        planHash: plan.contentHash,
        executionHash: execution.contentHash,
        model: plan.model,
        taskRun: result.task,
        round1Snapshot: result.round1Snapshot,
        parsedRecords: result.parsedRecords,
        providerAttempts: attempts,
        observedTokens: traced.observedTokens() - tokenStart,
      });
      const fileName = writeMechanismTaskArtifactV1(outputDir, artifact);
      taskFiles.push({ role: "task", fileName, taskId: block.taskId });
      completedTaskIds.push(block.taskId);
    } catch (error) {
      const code = failureCode(error);
      failures.push({
        taskId: block.taskId,
        seed: block.seed,
        code,
        physicalAttempts: traced.attempts.length - attemptStart,
      });
      if (isGlobalStop(code)) {
        skippedTaskIds.push(...plan.blocks.slice(blockIndex + 1).map(next => next.taskId));
        stopped = true;
        break;
      }
    }
  }
  const audit = ledger.audit();
  if (audit.started !== audit.finished || audit.unfinishedAttemptIds.length || audit.duplicateRequestHashes.length) {
    throw new Error("mechanism_formal_ledger_gate_failed");
  }
  const summary: MechanismFormalSummaryV1 = {
    summaryRef: { id: "swarmalpha.experiment.v6.mechanism-formal-summary", version: "1.0.0" },
    planHash: plan.contentHash,
    executionHash: execution.contentHash,
    status: stopped ? "stopped_global_gate" : failures.length ? "completed_with_failed_tasks" : "completed",
    completedTaskIds,
    failures,
    skippedTaskIds,
    physicalAttempts: traced.attempts.length,
    observedTokens: traced.observedTokens(),
  };
  writeSummary(outputDir, summary);
  const manifest = buildMechanismManifestV1({ outputDir, plan, files: [
    { role: "attempts", fileName: "attempts.jsonl" },
    { role: "execution", fileName: "execution.json" },
    { role: "summary", fileName: "summary.json" },
    ...taskFiles,
  ] });
  writeMechanismManifestV1(outputDir, manifest);
  verifyMechanismArtifactDirectoryV1(outputDir);
  return { outputDir, summary, manifestHash: manifest.contentHash };
}

async function main(): Promise<number> {
  const plan = buildMechanismExperimentPlanV1();
  const outputDir = resolve(process.cwd(), plan.outputDir);
  if (process.argv.includes("--plan")) {
    const frozen = freezeMechanismExperimentPlanV1(outputDir);
    console.log(JSON.stringify({ mode: "plan", outputDir, planHash: frozen.contentHash }));
    return 0;
  }
  if (!process.argv.includes("--execute")) {
    console.error("usage: --plan | --execute");
    return 2;
  }
  if (process.env.RUN_AUTHORIZED !== "yes") {
    console.error("mechanism_formal_execute_blocked: RUN_AUTHORIZED=yes not present");
    return 5;
  }
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    console.error("mechanism_formal_zhipu_api_key_unavailable");
    return 3;
  }
  const result = await executeMechanismFormalV1({
    outputDir,
    baseInvoker: createZhipuSingleAttemptInvoker("glm-4.6v"),
  });
  console.log(JSON.stringify({ mode: "execute", ...result }));
  return result.summary.status === "stopped_global_gate" ? 6 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
