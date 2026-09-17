import dotenv from "dotenv";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { analyzeDiscussionThermometerStateSpaceCalibrationV1 } from
  "./analyzeDiscussionThermometerStateSpaceCalibrationV1";
import {
  buildDiscussionThermometerStateSpaceCalibrationPlanV1,
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1,
  type DiscussionThermometerStateSpaceCalibrationPlanV1,
} from "./discussionThermometerStateSpaceCalibrationPlanV1";
import {
  buildDiscussionThermometerStateSpaceExecutionManifestV1,
  verifyDiscussionThermometerStateSpaceExecutionManifestV1,
  type DiscussionThermometerStateSpaceExecutionManifestV1,
} from "./discussionThermometerStateSpaceCalibrationManifestV1";
import { buildDiscussionThermometerStateSpaceCalibrationReviewV1 } from
  "./discussionThermometerStateSpaceCalibrationReviewV1";
import { DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1 } from
  "./discussionThermometerStateSpaceTaskBankV1";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import {
  buildDiscussionThermometerCalibrationSensorFreezeV1,
  executeDiscussionThermometerCalibrationPublicV1,
  executeDiscussionThermometerCalibrationSensorV1,
  projectDiscussionThermometerCalibrationObservationV1,
  verifyDiscussionThermometerCalibrationPublicRunV1,
  verifyDiscussionThermometerCalibrationSensorFreezeV1,
  verifyDiscussionThermometerCalibrationSensorRunV1,
  type DiscussionThermometerCalibrationObservationV1,
  type DiscussionThermometerCalibrationPublicRunV1,
  type DiscussionThermometerCalibrationSensorFreezeV1,
  type DiscussionThermometerCalibrationSensorRunV1,
} from "./runDiscussionThermometerStateSpaceCalibrationV1";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

const DEFAULT_OUTPUT_DIRECTORY =
  "results/v6_discussion_thermometer_state_space_calibration_glm46v_seed1";
const FILES = Object.freeze({
  taskBank: "task-bank.json",
  plan: "plan.json",
  review: "review.json",
  manifest: "execution-manifest.json",
  publicAttempts: "public-attempts.jsonl",
  publicRun: "public-run.json",
  sensorFreeze: "sensor-freeze.json",
  sensorAttempts: "sensor-attempts.jsonl",
  sensorRun: "sensor-run.json",
  observation: "observation.json",
  analysis: "analysis.json",
  publicCostLedger: "cost-ledger-public.json",
  completeCostLedger: "cost-ledger-complete.json",
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`thermometer_calibration_no_overwrite_conflict:${path}`);
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

function appendEvent(path: string, event: unknown): void {
  appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, "utf8");
}

function assertAbsent(outputDirectory: string, names: readonly string[]): void {
  const existing = names.filter(name => existsSync(join(outputDirectory, name)));
  if (existing.length) {
    throw new Error(`thermometer_calibration_fresh_phase_required:${existing.join(",")}`);
  }
}

function executionGate(expectedPhase: "public" | "sensor"): void {
  if (process.env.RUN_AUTHORIZED !== "yes"
    || process.env.THERMOMETER_CALIBRATION_SEMANTIC_REVIEWED !== "yes"
    || process.env.THERMOMETER_CALIBRATION_BUDGET_APPROVED !== "256"
    || process.env.THERMOMETER_CALIBRATION_PHASE !== expectedPhase) {
    throw new Error(
      `thermometer_calibration_execute_blocked:${expectedPhase}: require RUN_AUTHORIZED=yes, `
      + "THERMOMETER_CALIBRATION_SEMANTIC_REVIEWED=yes, "
      + "THERMOMETER_CALIBRATION_BUDGET_APPROVED=256, and exact phase",
    );
  }
}

function frozenInputs(outputDirectory: string): {
  plan: DiscussionThermometerStateSpaceCalibrationPlanV1;
  manifest: DiscussionThermometerStateSpaceExecutionManifestV1;
} {
  const plan = readJson<DiscussionThermometerStateSpaceCalibrationPlanV1>(
    join(outputDirectory, FILES.plan),
  );
  const manifest = readJson<DiscussionThermometerStateSpaceExecutionManifestV1>(
    join(outputDirectory, FILES.manifest),
  );
  verifyDiscussionThermometerStateSpaceCalibrationPlanV1(plan);
  verifyDiscussionThermometerStateSpaceExecutionManifestV1(manifest);
  if (manifest.planHash !== plan.contentHash) {
    throw new Error("thermometer_calibration_manifest_plan_mismatch");
  }
  return { plan, manifest };
}

function cappedInvoker(input: {
  base: SingleAttemptTextInvoker;
  maximumAttempts: number;
}): SingleAttemptTextInvoker {
  let attempts = 0;
  return {
    async invoke(request, signal) {
      if (attempts >= input.maximumAttempts) {
        throw new Error("thermometer_calibration_provider_attempt_cap_reached");
      }
      attempts += 1;
      return input.base.invoke(request, signal);
    },
  };
}

function usageSummary(input: {
  publicRun?: DiscussionThermometerCalibrationPublicRunV1;
  sensorRun?: DiscussionThermometerCalibrationSensorRunV1;
}) {
  const terminals = [
    ...(input.publicRun?.terminals ?? []),
    ...(input.sensorRun?.terminals ?? []),
  ];
  const withUsage = terminals.filter(terminal => terminal.usage?.promptTokens !== undefined
    && terminal.usage?.completionTokens !== undefined);
  const promptTokens = withUsage.reduce((sum, terminal) =>
    sum + terminal.usage!.promptTokens!, 0);
  const completionTokens = withUsage.reduce((sum, terminal) =>
    sum + terminal.usage!.completionTokens!, 0);
  return {
    providerTerminals: terminals.length,
    terminalsWithUsage: withUsage.length,
    promptTokens,
    completionTokens,
    officialPriceSource: "https://bigmodel.cn/pricing",
    officialPriceCheckedAt: "2026-08-30",
    estimatedObservedCostCny: withUsage.length === terminals.length
      ? promptTokens / 1_000_000 + completionTokens / 1_000_000 * 3 : null,
  };
}

function plan(outputDirectory: string): void {
  mkdirSync(outputDirectory, { recursive: true });
  const calibrationPlan = buildDiscussionThermometerStateSpaceCalibrationPlanV1();
  const review = buildDiscussionThermometerStateSpaceCalibrationReviewV1(calibrationPlan);
  const manifest = buildDiscussionThermometerStateSpaceExecutionManifestV1();
  writeExactOrVerify(join(outputDirectory, FILES.taskBank),
    DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1);
  writeExactOrVerify(join(outputDirectory, FILES.plan), calibrationPlan);
  writeExactOrVerify(join(outputDirectory, FILES.review), review);
  writeExactOrVerify(join(outputDirectory, FILES.manifest), manifest);
}

function preflight(outputDirectory: string) {
  const { plan: calibrationPlan, manifest } = frozenInputs(outputDirectory);
  const review = buildDiscussionThermometerStateSpaceCalibrationReviewV1(calibrationPlan);
  const taskBankOnDisk = readJson<unknown>(join(outputDirectory, FILES.taskBank));
  if (JSON.stringify(taskBankOnDisk)
    !== JSON.stringify(DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1)
    || review.contentHash !== manifest.reviewHash) {
    throw new Error("thermometer_calibration_preflight_frozen_input_drift");
  }
  return {
    providerCalls: 0,
    model: manifest.providerBudget.model,
    taskCount: calibrationPlan.variantTaskIds.length,
    publicCalls: calibrationPlan.callBudget.publicCalls,
    sensorCalls: calibrationPlan.callBudget.sensorCalls,
    maximumTotalCalls: manifest.providerBudget.maximumTotalCalls,
    attemptsPerCell: manifest.executionPolicy.attemptsPerCell,
    retry: manifest.providerBudget.retry,
    onlineTruthAccess: manifest.scientificBoundary.onlineTruthAccess,
    sensorWriteback: manifest.scientificBoundary.sensorWriteback,
    planHash: calibrationPlan.contentHash,
    manifestHash: manifest.contentHash,
    executionOrder: manifest.executionPolicy.phaseOrder,
  };
}

async function executePublic(outputDirectory: string): Promise<void> {
  executionGate("public");
  const { plan: calibrationPlan } = frozenInputs(outputDirectory);
  assertAbsent(outputDirectory, [FILES.publicAttempts, FILES.publicRun, FILES.sensorFreeze,
    FILES.sensorAttempts, FILES.sensorRun, FILES.observation, FILES.analysis]);
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) throw new Error("thermometer_calibration_zhipu_key_unavailable");
  const attemptPath = join(outputDirectory, FILES.publicAttempts);
  const run = await executeDiscussionThermometerCalibrationPublicV1({
    plan: calibrationPlan,
    invoker: cappedInvoker({
      base: createZhipuRawSingleAttemptInvoker("glm-4.6v"),
      maximumAttempts: calibrationPlan.callBudget.publicCalls,
    }),
    onAttemptStart: value => appendEvent(attemptPath, { phase: "public", status: "started", ...value }),
    onTerminal: terminal => appendEvent(attemptPath, {
      phase: "public", status: "terminal", sequence: terminal.sequence,
      cellId: terminal.cellId, requestHash: terminal.requestHash,
      responseHash: terminal.responseHash, usage: terminal.usage ?? null,
    }),
  });
  writeExactOrVerify(join(outputDirectory, FILES.publicRun), run);
  writeExactOrVerify(join(outputDirectory, FILES.publicCostLedger), usageSummary({ publicRun: run }));
}

function freezeSensor(outputDirectory: string): void {
  const { plan: calibrationPlan } = frozenInputs(outputDirectory);
  const publicRun = readJson<DiscussionThermometerCalibrationPublicRunV1>(
    join(outputDirectory, FILES.publicRun),
  );
  verifyDiscussionThermometerCalibrationPublicRunV1({ plan: calibrationPlan, run: publicRun });
  assertAbsent(outputDirectory, [FILES.sensorAttempts, FILES.sensorRun,
    FILES.observation, FILES.analysis]);
  const freeze = buildDiscussionThermometerCalibrationSensorFreezeV1({
    plan: calibrationPlan, publicRun,
  });
  writeExactOrVerify(join(outputDirectory, FILES.sensorFreeze), freeze);
}

async function executeSensor(outputDirectory: string): Promise<void> {
  executionGate("sensor");
  const { plan: calibrationPlan } = frozenInputs(outputDirectory);
  const publicRun = readJson<DiscussionThermometerCalibrationPublicRunV1>(
    join(outputDirectory, FILES.publicRun),
  );
  const freeze = readJson<DiscussionThermometerCalibrationSensorFreezeV1>(
    join(outputDirectory, FILES.sensorFreeze),
  );
  verifyDiscussionThermometerCalibrationSensorFreezeV1({
    plan: calibrationPlan, publicRun, freeze,
  });
  assertAbsent(outputDirectory, [FILES.sensorAttempts, FILES.sensorRun,
    FILES.observation, FILES.analysis]);
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) throw new Error("thermometer_calibration_zhipu_key_unavailable");
  const attemptPath = join(outputDirectory, FILES.sensorAttempts);
  const run = await executeDiscussionThermometerCalibrationSensorV1({
    plan: calibrationPlan,
    publicRun,
    freeze,
    invoker: cappedInvoker({
      base: createZhipuRawSingleAttemptInvoker("glm-4.6v"),
      maximumAttempts: calibrationPlan.callBudget.sensorCalls,
    }),
    onAttemptStart: value => appendEvent(attemptPath, { phase: "sensor", status: "started", ...value }),
    onTerminal: terminal => appendEvent(attemptPath, {
      phase: "sensor", status: "terminal", sequence: terminal.sequence,
      cellId: terminal.cellId, requestHash: terminal.requestHash,
      responseHash: terminal.responseHash, usage: terminal.usage ?? null,
    }),
  });
  writeExactOrVerify(join(outputDirectory, FILES.sensorRun), run);
  writeExactOrVerify(join(outputDirectory, FILES.completeCostLedger),
    usageSummary({ publicRun, sensorRun: run }));
}

function analyze(outputDirectory: string): void {
  const { plan: calibrationPlan } = frozenInputs(outputDirectory);
  const publicRun = readJson<DiscussionThermometerCalibrationPublicRunV1>(
    join(outputDirectory, FILES.publicRun),
  );
  const sensorFreeze = readJson<DiscussionThermometerCalibrationSensorFreezeV1>(
    join(outputDirectory, FILES.sensorFreeze),
  );
  const sensorRun = readJson<DiscussionThermometerCalibrationSensorRunV1>(
    join(outputDirectory, FILES.sensorRun),
  );
  verifyDiscussionThermometerCalibrationSensorRunV1({ freeze: sensorFreeze, run: sensorRun });
  const observation: DiscussionThermometerCalibrationObservationV1 =
    projectDiscussionThermometerCalibrationObservationV1({
      plan: calibrationPlan, publicRun, sensorFreeze, sensorRun,
    });
  const analysis = analyzeDiscussionThermometerStateSpaceCalibrationV1({
    plan: calibrationPlan, publicRun, sensorFreeze, sensorRun, observation,
    evidenceClass: "provider_observation",
  });
  writeExactOrVerify(join(outputDirectory, FILES.publicCostLedger),
    usageSummary({ publicRun }));
  writeExactOrVerify(join(outputDirectory, FILES.completeCostLedger),
    usageSummary({ publicRun, sensorRun }));
  writeExactOrVerify(join(outputDirectory, FILES.observation), observation);
  writeExactOrVerify(join(outputDirectory, FILES.analysis), analysis);
}

async function main(): Promise<void> {
  const outputDirectory = resolve(process.env.THERMOMETER_CALIBRATION_OUTPUT_DIR
    ?? DEFAULT_OUTPUT_DIRECTORY);
  const mode = process.argv.find(argument => [
    "--plan", "--preflight", "--execute-public", "--freeze-sensor",
    "--execute-sensor", "--analyze",
  ].includes(argument));
  if (!mode) throw new Error("thermometer_calibration_mode_required");
  if (mode === "--plan") plan(outputDirectory);
  if (mode === "--preflight") console.log(JSON.stringify(preflight(outputDirectory), null, 2));
  if (mode === "--execute-public") await executePublic(outputDirectory);
  if (mode === "--freeze-sensor") freezeSensor(outputDirectory);
  if (mode === "--execute-sensor") await executeSensor(outputDirectory);
  if (mode === "--analyze") analyze(outputDirectory);
  console.log(JSON.stringify({
    mode,
    outputDirectory,
    publicComplete: existsSync(join(outputDirectory, FILES.publicRun)),
    sensorFrozen: existsSync(join(outputDirectory, FILES.sensorFreeze)),
    sensorComplete: existsSync(join(outputDirectory, FILES.sensorRun)),
    analysisComplete: existsSync(join(outputDirectory, FILES.analysis)),
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
