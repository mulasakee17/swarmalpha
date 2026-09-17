// Minimal connectivity probe: 3 sequential single calls to zhipu, print
// latency/error for each. No concurrency (zhipu 429s concurrent calls).
import dotenv from "dotenv";
import * as path from "node:path";
import { callZhipu } from "../../../src/lib/llm/providers";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function one(label: string): Promise<void> {
  const t0 = Date.now();
  try {
    const r = await callZhipu(
      "You are a test assistant. Return exactly one strict JSON object: {\"ok\":true}",
      "Reply with the JSON object only.",
      { provider: "zhipu", model: "glm-4.5-air", temperature: 0, timeout: 600_000 },
    );
    console.log(`${label}: OK ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.log(`${label}: FAIL ${((Date.now() - t0) / 1000).toFixed(1)}s ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main(): Promise<void> {
  await one("t1");
  await one("t2");
  await one("t3");
  process.exit(0);
}

main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
