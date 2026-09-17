// Diagnostic: is zhipu rate-limiting due to concurrency, or due to a cooling
// window after the killed pwsh-10/11 runs? Phase 1 fires 2 concurrent calls;
// phase 2 fires 2 sequential calls. Prints OK/FAIL with latency for each.
import dotenv from "dotenv";
import * as path from "node:path";
import { callZhipu } from "../../../src/lib/llm/providers";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sys = "You are a test assistant. Reply with exactly one word: ok.";
const usr = "Reply ok.";

async function one(label: string): Promise<void> {
  const t0 = Date.now();
  try {
    const r = await callZhipu(sys, usr, { provider: "zhipu", model: "glm-4.5-air", temperature: 0, timeout: 600_000 });
    console.log(`${label}: OK ${((Date.now() - t0) / 1000).toFixed(1)}s tok=${r.usage?.totalTokens ?? "?"}`);
  } catch (e) {
    console.log(`${label}: FAIL ${((Date.now() - t0) / 1000).toFixed(1)}s ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main(): Promise<void> {
  console.log("phase1: 2 concurrent");
  await Promise.all([one("c1"), one("c2")]);
  console.log("phase2: 2 sequential");
  await one("s1");
  await one("s2");
  process.exit(0);
}

main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
