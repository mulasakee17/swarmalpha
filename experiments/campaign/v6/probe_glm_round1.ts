// Diagnostic: dump GLM-4-Flash's raw round-1 discussion response to find why
// parseBeliefResponse fails. Read-only probe (one provider call).
import dotenv from "dotenv";
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import { callZhipu } from "../../../src/lib/llm/providers";

dotenv.config({ path: ".env.local" });

async function main(): Promise<void> {
  const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId: 14 });
  const task = projection.adapter.task;
  const agent = task.agents[0];
  const options = task.claim.options;
  const systemPrompt = "You are an analyst in a multi-agent group discussion. Report your final belief as strict JSON.";
  const userPrompt = [
    `Task public context:\n${task.publicContext}`,
    `Your private information:\n${agent.privateInformation}`,
    `Visible discussion transcript:\n(none)`,
    `Claim ${task.claim.id}: ${task.claim.proposition}`,
    `Return exactly one strict JSON object with fields: message (string), belief ({kind:'categorical', probabilities:{...}}), evidence (array of {content, relation:'supports'|'attacks', lineageId?}). The probabilities object must contain exactly these canonical options in this order and sum to 1: ${options.join(" | ")}. No other fields.`,
  ].join("\n\n");

  const t0 = Date.now();
  const resp = await callZhipu(systemPrompt, userPrompt, { provider: "zhipu", model: "glm-4.5-air", temperature: 0, responseFormat: "json" });
  console.log("=== latency:", Date.now() - t0, "ms ===");
  console.log("=== usage:", JSON.stringify(resp.usage), "===");
  console.log("=== RAW CONTENT (full) ===");
  console.log(resp.rawContent);
  console.log("=== length:", resp.rawContent.length, "===");
}

main().then(() => process.exit(0)).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
