/** Exact source-bundle identity written before the first paid call. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const MECHANISM_SOURCE_FILES_V1 = Object.freeze([
  "experiments/campaign/v6/mechanismDisclosureContractV1.ts",
  "experiments/campaign/v6/mechanismForkCoreV1.ts",
  "experiments/campaign/v6/mechanismTaskRunnerV1.ts",
  "experiments/campaign/v6/mechanismGlmTaskExecutionV1.ts",
  "experiments/campaign/v6/mechanismTaskArtifactV1.ts",
  "experiments/campaign/v6/run_v6_mechanism_canary_v1.ts",
  "experiments/campaign/v6/run_v6_mechanism_formal_v1.ts",
  "experiments/campaign/v6/mechanismSeed4BatchAPlanV1.ts",
  "experiments/campaign/v6/run_v6_mechanism_seed4_batch_a_v1.ts",
  "experiments/campaign/v6/mechanismSeed4BatchBPlanV1.ts",
  "experiments/campaign/v6/run_v6_mechanism_seed4_batch_b_v1.ts",
  "experiments/campaign/v6/mechanismSeed4RecoveryPlanV1.ts",
  "experiments/campaign/v6/run_v6_mechanism_seed4_recovery_v1.ts",
  "experiments/campaign/v6/mechanismProviderTraceV1.ts",
  "experiments/campaign/v6/mechanismAttemptLedgerV1.ts",
  "experiments/campaign/v6/mechanismManifestV1.ts",
  "experiments/campaign/v6/mechanismExperimentPlanV1.ts",
  "experiments/campaign/v6/providerAdapters.ts",
  "experiments/campaign/v6/providerDiagnostics.ts",
  "experiments/campaign/v6/zhipuSingleAttemptInvoker.ts",
  "experiments/campaign/v6/productionVerticalSlice.ts",
  "experiments/campaign/v6/crossEvidenceExchangeSelectorsV1.ts",
  "experiments/campaign/v6/hiddenBenchTaskAdapter.ts",
  "experiments/campaign/v6/taskAdapters.ts",
  "experiments/campaign/v6/taskBank.ts",
  "experiments/campaign/v6/v6HiddenBenchSmokeFixture.ts",
  "experiments/campaign/v6/v6BinarySmokeFixture.ts",
  "experiments/campaign/v6/monitoringDesign.ts",
  "experiments/campaign/v6/v6TaskManifest.ts",
  "experiments/campaign/primaryAssignedRun.ts",
  "experiments/campaign/replayVerifier.ts",
  "experiments/campaign/types.ts",
  "src/lib/constants.ts",
  "src/lib/utils/jsonUtils.ts",
  "src/lib/llm/providers.ts",
  "src/lib/experiment-contracts/contracts.ts",
  "src/lib/epistemic/index.ts",
  "src/lib/epistemic/aggregation.ts",
  "src/lib/epistemic/contracts.ts",
  "src/lib/epistemic/quantityContracts.ts",
  "src/lib/epistemic/scoring.ts",
  "src/lib/epistemic/types.ts",
  "src/lib/governance/index.ts",
  "src/lib/experimentation/index.ts",
  "src/lib/experimentation/finalElicitationAdapter.ts",
  "src/lib/experimentation/finalOutcome.ts",
  "src/lib/experimentation/lifecycle.ts",
  "src/lib/experimentation/providerExecution.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "experiments/campaign/tasks/hiddenbench/benchmark.json",
]);

function sha(text: string): string { return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`; }
function canonical(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
}

export interface MechanismExecutionIdentityV1 {
  executionRef: { id: "swarmalpha.experiment.v6.mechanism-execution"; version: "1.0.0" };
  planHash: string;
  model: string;
  sourceFiles: Array<{ path: string; contentHash: string }>;
  runtime: { node: string; platform: string; arch: string };
  contentHash: string;
}

export function buildMechanismExecutionIdentityV1(input: { planHash: string; model: string; repoRoot?: string }): MechanismExecutionIdentityV1 {
  const root = resolve(input.repoRoot ?? process.cwd());
  const sourceFiles = MECHANISM_SOURCE_FILES_V1.map(path => {
    const file = resolve(root, path);
    if (!existsSync(file)) throw new Error(`mechanism_execution_source_missing:${path}`);
    return { path, contentHash: sha(readFileSync(file, "utf8")) };
  });
  const body = {
    executionRef: { id: "swarmalpha.experiment.v6.mechanism-execution" as const, version: "1.0.0" as const },
    planHash: input.planHash, model: input.model, sourceFiles,
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
  };
  return { ...body, contentHash: sha(JSON.stringify(canonical(body))) };
}

export function writeMechanismExecutionIdentityV1(outputDir: string, identity: MechanismExecutionIdentityV1): void {
  const { contentHash, ...body } = identity;
  if (sha(JSON.stringify(canonical(body))) !== contentHash) throw new Error("mechanism_execution_hash_mismatch");
  const file = join(outputDir, "execution.json");
  const text = `${JSON.stringify(identity, null, 2)}\n`;
  if (existsSync(file)) {
    if (readFileSync(file, "utf8") !== text) throw new Error("mechanism_execution_no_overwrite_conflict");
    return;
  }
  writeFileSync(file, text, "utf8");
}
