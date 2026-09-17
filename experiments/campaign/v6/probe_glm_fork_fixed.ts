// Diagnostic: run ONE fork task on GLM with the fixed final-elicitation
// maxTokens (2048), measure (a) final elicitation success rate per arm and
// (b) exact token cost, so we can decide how many tasks fit the remaining
// zhipu quota. Writes the task file into the GLM output dir (resume-safe).
import dotenv from "dotenv";
import * as path from "node:path";
import * as fs from "node:fs";
import { buildForkPlanV1, runForkExecute } from "./run_v6_fork";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const GLM_OUTPUT_DIR = path.resolve(
  process.cwd(),
  "experiments/campaign/pilot_output/v6-fork-glm45air-xval-20260816",
);

async function main(): Promise<void> {
  const taskArgIdx = process.argv.indexOf("--task");
  const taskId = Number(taskArgIdx >= 0 ? process.argv[taskArgIdx + 1] : 17);
  if (!Number.isInteger(taskId) || taskId <= 0) { console.error("bad --task"); process.exit(2); }
  const modelArgIdx = process.argv.indexOf("--model");
  const glmModelId = modelArgIdx >= 0 ? process.argv[modelArgIdx + 1] : "glm-4.5-air";
  const outArgIdx = process.argv.indexOf("--out");
  const outputDir = outArgIdx >= 0 ? path.resolve(process.cwd(), process.argv[outArgIdx + 1]) : GLM_OUTPUT_DIR;
  const plan = buildForkPlanV1([taskId], [0], `zhipu:${glmModelId}`);
  const t0 = Date.now();
  const result = await runForkExecute({
    plan,
    invoker: createZhipuSingleAttemptInvoker(glmModelId),
    outputDir,
    tokensPerCallEstimate: 20_000,
    finalMaxTokens: 2048,
    taskIds: [taskId],
    seeds: [0],
  });
  console.log(JSON.stringify({
    mode: "glm-fixed-probe",
    taskId,
    ...result,
    wallSec: Math.round((Date.now() - t0) / 1000),
    tokensPerCallActual: result.calls > 0 ? Math.round(result.tokens / result.calls) : null,
  }, null, 2));

  // Summarize final-elicitation success per arm from the written file.
  const file = fs.readdirSync(outputDir).filter(f => f.includes(`task-${taskId}`))[0];
  if (file) {
    const rows = fs.readFileSync(path.join(outputDir, file), "utf8")
      .split("\n").filter(l => l.trim().length > 0).map(l => JSON.parse(l));
    for (const r of rows) {
      console.log(`arm ${r.arm}: finalReportedCount=${r.finalReportedCount}/5 finalBrier=${r.finalBrier}`);
    }
  }
  process.exit(0);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
