// Probe which Zhipu model IDs are valid. Tries a candidate list and reports
// the first that returns a successful completion.
import dotenv from "dotenv";
import { callZhipu } from "../../../src/lib/llm/providers";

dotenv.config({ path: ".env.local" });

const CANDIDATES = ["glm-4.6", "glm-4.6v", "glm-4.6-flash", "glm-4.6-air", "glm-4.6-plus"];

async function main(): Promise<void> {
  for (const model of CANDIDATES) {
    try {
      const resp = await callZhipu("You are a helpful assistant.", "Reply with exactly: OK", {
        provider: "zhipu", model, temperature: 0,
      });
      console.log(`MODEL "${model}" => OK. rawContent (first 120):`, JSON.stringify(resp.rawContent.slice(0, 120)));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`MODEL "${model}" => FAIL: ${msg.slice(0, 160)}`);
    }
  }
}

main().then(() => process.exit(0)).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
