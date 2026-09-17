import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { analyzeDiscussionThermometerStateSpaceCalibrationV1 } from
  "./analyzeDiscussionThermometerStateSpaceCalibrationV1";
import { buildDiscussionThermometerStateSpaceCalibrationPlanV1 } from
  "./discussionThermometerStateSpaceCalibrationPlanV1";
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
} from "./runDiscussionThermometerStateSpaceCalibrationV1";

const OUTPUT_DIRECTORY =
  "results/v6_discussion_thermometer_state_space_calibration_mock_v1";

type Vector = [number, number, number];

function vectorFor(requestId: string): Vector {
  const match = requestId.match(/:v([1-4]):x([012]):(agent_[1-4]):[ab]$/);
  if (!match) throw new Error(`calibration_mock_sensor_request_unrecognized:${requestId}`);
  const [, regime, checkpointText, agentId] = match;
  const checkpoint = Number(checkpointText);
  if (regime === "1") {
    return ({
      agent_1: [0.70, 0.20, 0.10], agent_2: [0.55, 0.30, 0.15],
      agent_3: [0.40, 0.45, 0.15], agent_4: [0.50, 0.20, 0.30],
    } as Record<string, Vector>)[agentId];
  }
  if (regime === "2") {
    return checkpoint < 2 ? [0.65, 0.25, 0.10] : [0.40, 0.50, 0.10];
  }
  if (regime === "3") {
    if (checkpoint === 2) return [0.60, 0.25, 0.15];
    return ["agent_1", "agent_2"].includes(agentId)
      ? [0.80, 0.10, 0.10] : [0.10, 0.10, 0.80];
  }
  return ["agent_1", "agent_2", "agent_3"].includes(agentId)
    ? [0.20, 0.70, 0.10] : [0.80, 0.10, 0.10];
}

function mockInvoker(): {
  invoker: SingleAttemptTextInvoker;
  calls: string[];
  promptUtf8Bytes: number[];
} {
  const calls: string[] = [];
  const promptUtf8Bytes: number[] = [];
  return {
    calls,
    promptUtf8Bytes,
    invoker: {
      async invoke(request) {
        calls.push(request.requestId);
        promptUtf8Bytes.push(Buffer.byteLength(request.systemPrompt, "utf8")
          + Buffer.byteLength(request.userPrompt, "utf8"));
        if (request.requestId.startsWith("thermometer-calibration-sensor:")) {
          const [opt_1, opt_2, opt_3] = vectorFor(request.requestId);
          return { rawContent: JSON.stringify({ probabilities: { opt_1, opt_2, opt_3 } }) };
        }
        return { rawContent: JSON.stringify({
          choiceId: "opt_1",
          message: "Synthetic fixture response used only to exercise the observation pipeline.",
        }) };
      },
    },
  };
}

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`calibration_mock_no_overwrite_conflict:${path}`);
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

async function main(): Promise<void> {
  const outputDirectory = resolve(process.cwd(), OUTPUT_DIRECTORY);
  const plan = buildDiscussionThermometerStateSpaceCalibrationPlanV1();
  const mock = mockInvoker();
  const publicRun = await executeDiscussionThermometerCalibrationPublicV1({
    plan, invoker: mock.invoker,
  });
  const sensorFreeze = buildDiscussionThermometerCalibrationSensorFreezeV1({
    plan, publicRun,
  });
  const sensorRun = await executeDiscussionThermometerCalibrationSensorV1({
    plan, publicRun, freeze: sensorFreeze, invoker: mock.invoker,
  });
  const observation = projectDiscussionThermometerCalibrationObservationV1({
    plan, publicRun, sensorFreeze, sensorRun,
  });
  const analysis = analyzeDiscussionThermometerStateSpaceCalibrationV1({
    plan, publicRun, sensorFreeze, sensorRun, observation,
    evidenceClass: "synthetic_mock",
  });
  const review = buildDiscussionThermometerStateSpaceCalibrationReviewV1(plan);
  const totalPromptUtf8Bytes = mock.promptUtf8Bytes.reduce((sum, value) => sum + value, 0);
  const costEnvelope = {
    evidenceClass: "planning_surrogate_not_provider_usage",
    officialPriceSource: "https://bigmodel.cn/pricing",
    officialPriceCheckedAt: "2026-08-30",
    priceTierAssumption: "each_request_below_32k_input_tokens",
    inputCnyPerMillionTokens: 1,
    outputCnyPerMillionTokens: 3,
    requestCount: mock.calls.length,
    maximumObservedPromptUtf8BytesPerRequest: Math.max(...mock.promptUtf8Bytes),
    totalPromptUtf8Bytes,
    inputTokenPlanningSurrogate: "one_token_per_utf8_byte_conservative_surrogate_not_billing_measurement",
    maximumCompletionTokens: plan.callBudget.maximumCompletionTokens,
    byteSurrogateMaximumCostCny:
      totalPromptUtf8Bytes / 1_000_000 + plan.callBudget.maximumCompletionTokens / 1_000_000 * 3,
    hardCurrencyGuarantee: "none_provider_billing_tokens_must_be_observed_after_execution",
  };
  mkdirSync(outputDirectory, { recursive: true });
  writeExactOrVerify(join(outputDirectory, "task-bank.json"),
    DISCUSSION_THERMOMETER_STATE_SPACE_TASKS_V1);
  writeExactOrVerify(join(outputDirectory, "plan.json"), plan);
  writeExactOrVerify(join(outputDirectory, "public-run.json"), publicRun);
  writeExactOrVerify(join(outputDirectory, "sensor-freeze.json"), sensorFreeze);
  writeExactOrVerify(join(outputDirectory, "sensor-run.json"), sensorRun);
  writeExactOrVerify(join(outputDirectory, "observation.json"), observation);
  writeExactOrVerify(join(outputDirectory, "analysis.json"), analysis);
  writeExactOrVerify(join(outputDirectory, "review.json"), review);
  writeExactOrVerify(join(outputDirectory, "cost-envelope.json"), costEnvelope);
  console.log(JSON.stringify({
    mode: "synthetic_mock",
    providerCalls: 0,
    simulatedCalls: mock.calls.length,
    outputDirectory,
    planHash: plan.contentHash,
    observationHash: observation.contentHash,
    analysisHash: analysis.contentHash,
    reviewHash: review.contentHash,
    byteSurrogateMaximumCostCny: costEnvelope.byteSurrogateMaximumCostCny,
    routing: analysis.routing,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
