import dotenv from "dotenv";
import {
  appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import {
  buildDiscussionThermometerNaturalDynamicsTransportManifestV1,
  verifyDiscussionThermometerNaturalDynamicsTransportManifestV1,
  type DiscussionThermometerNaturalDynamicsTransportManifestV1,
} from "./discussionThermometerNaturalDynamicsTransportManifestV1";
import {
  buildDiscussionThermometerNaturalDynamicsTransportPlanV1,
  verifyDiscussionThermometerNaturalDynamicsTransportPlanV1,
  type DiscussionThermometerNaturalDynamicsTransportPlanV1,
} from "./discussionThermometerNaturalDynamicsTransportPlanV1";
import { DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1 } from
  "./discussionThermometerNaturalDynamicsTransportTaskBankV1";
import {
  evaluateDiscussionThermometerNaturalDynamicsTransportV1,
} from "./evaluateDiscussionThermometerNaturalDynamicsTransportV1";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import {
  buildNaturalDynamicsSensorFreezeV1,
  executeNaturalDynamicsPublicV1,
  executeNaturalDynamicsSensorV1,
  projectNaturalDynamicsObservationV1,
  verifyNaturalDynamicsPublicRunV1,
  verifyNaturalDynamicsSensorFreezeV1,
  type NaturalDynamicsPublicRunV1,
  type NaturalDynamicsSensorFreezeV1,
  type NaturalDynamicsSensorRunV1,
} from "./runDiscussionThermometerNaturalDynamicsV1";
import { buildDiscussionThermometerNaturalDynamicsTransportPreflightV1 } from
  "./run_v6_discussion_thermometer_natural_dynamics_transport_preflight_v1";
import { createZhipuRawSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

const DEFAULT_OUTPUT =
  "results/v6_discussion_thermometer_natural_dynamics_transport_glm46v_seed1";
const FILES = Object.freeze({
  taskBank: "task-bank.json",
  plan: "plan.json",
  manifest: "execution-manifest.json",
  preflight: "preflight.json",
  publicAttempts: "public-attempts.jsonl",
  publicRun: "public-run.json",
  sensorFreeze: "sensor-freeze.json",
  sensorAttempts: "sensor-attempts.jsonl",
  sensorRun: "sensor-run.json",
  observation: "observation.json",
  evaluation: "transport-evaluation.json",
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`natural_dynamics_transport_no_overwrite_conflict:${path}`);
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

function appendEvent(path: string, event: unknown): void {
  appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`,
    "utf8");
}

function frozen(output: string): {
  plan: DiscussionThermometerNaturalDynamicsTransportPlanV1;
  manifest: DiscussionThermometerNaturalDynamicsTransportManifestV1;
} {
  const plan = readJson<DiscussionThermometerNaturalDynamicsTransportPlanV1>(
    join(output, FILES.plan));
  const manifest = readJson<DiscussionThermometerNaturalDynamicsTransportManifestV1>(
    join(output, FILES.manifest));
  verifyDiscussionThermometerNaturalDynamicsTransportPlanV1(plan);
  verifyDiscussionThermometerNaturalDynamicsTransportManifestV1(manifest, plan);
  if (manifest.planHash !== plan.contentHash) {
    throw new Error("natural_dynamics_transport_manifest_plan_mismatch");
  }
  return { plan, manifest };
}

function capped(base: SingleAttemptTextInvoker, maximum: number):
SingleAttemptTextInvoker {
  let count = 0;
  return {
    invoke(request, signal) {
      count += 1;
      if (count > maximum) {
        throw new Error("natural_dynamics_transport_provider_attempt_cap_reached");
      }
      return base.invoke(request, signal);
    },
  };
}

function gate(phase: "public" | "sensor"): void {
  throw new Error(`natural_dynamics_transport_synthetic_task_bank_retired:${phase}: provider execution is forbidden; replace with an external literature task authority`);
}

function mockInvoker(): SingleAttemptTextInvoker {
  return {
    async invoke(request) {
      if (request.requestId.includes("-sensor:")) {
        const checkpoint = Number(request.requestId.match(/:x([0-4]):/)?.[1] ?? 0);
        const vector = checkpoint < 2
          ? [0.7, 0.2, 0.1]
          : checkpoint === 2
            ? [0.5, 0.4, 0.1]
            : [0.4, 0.5, 0.1];
        return { rawContent: JSON.stringify({ probabilities: {
          opt_1: vector[0], opt_2: vector[1], opt_3: vector[2],
        } }) };
      }
      return { rawContent: JSON.stringify({
        choiceId: "opt_1", message: "Synthetic fixture response.",
      }) };
    },
  };
}

function planArtifacts(output: string): void {
  mkdirSync(output, { recursive: true });
  const plan = buildDiscussionThermometerNaturalDynamicsTransportPlanV1();
  const manifest = buildDiscussionThermometerNaturalDynamicsTransportManifestV1(plan);
  writeExactOrVerify(join(output, FILES.taskBank),
    DISCUSSION_THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_TASKS_V1);
  writeExactOrVerify(join(output, FILES.plan), plan);
  writeExactOrVerify(join(output, FILES.manifest), manifest);
}

function preflight(output: string): void {
  mkdirSync(output, { recursive: true });
  writeExactOrVerify(join(output, FILES.preflight),
    buildDiscussionThermometerNaturalDynamicsTransportPreflightV1());
}

function projectAndEvaluate(input: {
  output: string;
  plan: DiscussionThermometerNaturalDynamicsTransportPlanV1;
  publicRun: NaturalDynamicsPublicRunV1;
  freeze: NaturalDynamicsSensorFreezeV1;
  sensorRun: NaturalDynamicsSensorRunV1;
  evidenceClass: "synthetic_mock" | "provider_observation";
}): void {
  const observation = projectNaturalDynamicsObservationV1({
    plan: input.plan,
    publicRun: input.publicRun,
    sensorFreeze: input.freeze,
    sensorRun: input.sensorRun,
  });
  writeExactOrVerify(join(input.output, FILES.observation), observation);
  writeExactOrVerify(join(input.output, FILES.evaluation),
    evaluateDiscussionThermometerNaturalDynamicsTransportV1({
      plan: input.plan,
      publicRun: input.publicRun,
      sensorFreeze: input.freeze,
      sensorRun: input.sensorRun,
      observation,
      evidenceClass: input.evidenceClass,
    }));
}

async function runMock(output: string): Promise<void> {
  const { plan } = frozen(output);
  const invoker = mockInvoker();
  const publicRun = await executeNaturalDynamicsPublicV1({ plan, invoker });
  writeExactOrVerify(join(output, FILES.publicRun), publicRun);
  const freeze = buildNaturalDynamicsSensorFreezeV1({ plan, publicRun });
  writeExactOrVerify(join(output, FILES.sensorFreeze), freeze);
  const sensorRun = await executeNaturalDynamicsSensorV1({
    plan, publicRun, freeze, invoker,
  });
  writeExactOrVerify(join(output, FILES.sensorRun), sensorRun);
  projectAndEvaluate({
    output, plan, publicRun, freeze, sensorRun, evidenceClass: "synthetic_mock",
  });
}

async function executePublic(output: string): Promise<void> {
  gate("public");
  const { plan } = frozen(output);
  if (existsSync(join(output, FILES.publicRun))
    || existsSync(join(output, FILES.publicAttempts))) {
    throw new Error("natural_dynamics_transport_public_phase_not_fresh");
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    throw new Error("natural_dynamics_transport_zhipu_key_unavailable");
  }
  const publicRun = await executeNaturalDynamicsPublicV1({
    plan,
    invoker: capped(createZhipuRawSingleAttemptInvoker("glm-4.6v"),
      plan.callBudget.publicCalls),
    onAttemptStart: event => appendEvent(join(output, FILES.publicAttempts), {
      phase: "public", status: "started", ...event,
    }),
    onTerminal: terminal => appendEvent(join(output, FILES.publicAttempts), {
      phase: "public", status: "terminal", sequence: terminal.sequence,
      cellId: terminal.cellId, requestHash: terminal.requestHash,
    }),
  });
  writeExactOrVerify(join(output, FILES.publicRun), publicRun);
}

function freezeSensor(output: string): void {
  const { plan } = frozen(output);
  const publicRun = readJson<NaturalDynamicsPublicRunV1>(join(output, FILES.publicRun));
  verifyNaturalDynamicsPublicRunV1({ plan, run: publicRun });
  if (existsSync(join(output, FILES.sensorFreeze))) {
    throw new Error("natural_dynamics_transport_sensor_freeze_already_exists");
  }
  writeExactOrVerify(join(output, FILES.sensorFreeze),
    buildNaturalDynamicsSensorFreezeV1({ plan, publicRun }));
}

async function executeSensor(output: string): Promise<void> {
  gate("sensor");
  const { plan } = frozen(output);
  const publicRun = readJson<NaturalDynamicsPublicRunV1>(join(output, FILES.publicRun));
  const freeze = readJson<NaturalDynamicsSensorFreezeV1>(
    join(output, FILES.sensorFreeze));
  verifyNaturalDynamicsPublicRunV1({ plan, run: publicRun });
  verifyNaturalDynamicsSensorFreezeV1({ plan, publicRun, freeze });
  if (existsSync(join(output, FILES.sensorRun))
    || existsSync(join(output, FILES.sensorAttempts))) {
    throw new Error("natural_dynamics_transport_sensor_phase_not_fresh");
  }
  dotenv.config({ path: resolve(".env.local") });
  if (!process.env.ZHIPU_API_KEY) {
    throw new Error("natural_dynamics_transport_zhipu_key_unavailable");
  }
  const sensorRun = await executeNaturalDynamicsSensorV1({
    plan,
    publicRun,
    freeze,
    invoker: capped(createZhipuRawSingleAttemptInvoker("glm-4.6v"),
      plan.callBudget.sensorCalls),
    onTerminal: terminal => appendEvent(join(output, FILES.sensorAttempts), {
      phase: "sensor", status: "terminal", sequence: terminal.sequence,
      cellId: terminal.cellId, requestHash: terminal.requestHash,
    }),
  });
  writeExactOrVerify(join(output, FILES.sensorRun), sensorRun);
}

function analyze(output: string): void {
  const { plan } = frozen(output);
  const publicRun = readJson<NaturalDynamicsPublicRunV1>(join(output, FILES.publicRun));
  const freeze = readJson<NaturalDynamicsSensorFreezeV1>(
    join(output, FILES.sensorFreeze));
  const sensorRun = readJson<NaturalDynamicsSensorRunV1>(join(output, FILES.sensorRun));
  projectAndEvaluate({
    output, plan, publicRun, freeze, sensorRun, evidenceClass: "provider_observation",
  });
}

async function main(): Promise<void> {
  const output = resolve(
    process.env.THERMOMETER_NATURAL_DYNAMICS_TRANSPORT_OUTPUT_DIR ?? DEFAULT_OUTPUT);
  const mode = process.argv.find(argument => [
    "--plan", "--preflight", "--mock", "--execute-public",
    "--freeze-sensor", "--execute-sensor", "--analyze",
  ].includes(argument));
  if (!mode) throw new Error("natural_dynamics_transport_mode_required");
  if (mode === "--plan") planArtifacts(output);
  else if (mode === "--preflight") preflight(output);
  else if (mode === "--mock") {
    planArtifacts(output);
    await runMock(output);
  } else if (mode === "--execute-public") await executePublic(output);
  else if (mode === "--freeze-sensor") freezeSensor(output);
  else if (mode === "--execute-sensor") await executeSensor(output);
  else analyze(output);
  process.stdout.write(`${JSON.stringify({
    mode,
    output,
    providerCalls: mode === "--execute-public" ? 64
      : mode === "--execute-sensor" ? 160 : 0,
    planHash: existsSync(join(output, FILES.plan))
      ? readJson<{ contentHash: string }>(join(output, FILES.plan)).contentHash : null,
    manifest: existsSync(join(output, FILES.manifest)),
    observation: existsSync(join(output, FILES.observation)),
    evaluation: existsSync(join(output, FILES.evaluation)),
  }, null, 2)}\n`);
}

if (process.argv[1]?.endsWith(
  "run_v6_discussion_thermometer_natural_dynamics_transport_v1.ts")) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
