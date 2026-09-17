// Diagnostic: run ONE full fork (task 14 by default) on GLM-4.5-Air with a
// per-call latency log, to measure where the 180s timeouts hit and whether a
// 600s single-attempt budget clears the full task. Read-only w.r.t. outputs:
// no files written, nothing touched in the frozen DeepSeek artifacts.
import dotenv from "dotenv";
import * as path from "node:path";
import { runFork } from "./run_v6_fork";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const inner = createZhipuSingleAttemptInvoker();
let callIdx = 0;
const timings: Array<{ idx: number; ms: number; tokens: number | null }> = [];

const invoker = {
  async invoke(request: any, signal?: any) {
    const idx = ++callIdx;
    const t0 = Date.now();
    try {
      const r = await inner.invoke(request, signal);
      const ms = Date.now() - t0;
      timings.push({ idx, ms, tokens: r.usage?.totalTokens ?? null });
      console.log(`call#${idx} ${(ms / 1000).toFixed(1)}s tok=${r.usage?.totalTokens ?? "?"}`);
      return r;
    } catch (e) {
      const ms = Date.now() - t0;
      console.error(`call#${idx} FAILED after ${(ms / 1000).toFixed(1)}s: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  },
};

async function main(): Promise<void> {
  const taskArgIdx = process.argv.indexOf("--task");
  const taskId = Number(taskArgIdx >= 0 ? process.argv[taskArgIdx + 1] : 14);
  if (!Number.isInteger(taskId) || taskId <= 0) { console.error("bad --task"); process.exit(2); }
  const t0 = Date.now();
  const rows = await runFork({ taskId, seed: 0, model: "zhipu:glm-4.5-air", invoker });
  const total = Date.now() - t0;
  const sorted = [...timings].sort((a, b) => b.ms - a.ms);
  console.log(`=== task ${taskId}: total ${(total / 1000).toFixed(1)}s, ${rows.length} rows, ${callIdx} calls ===`);
  console.log(`slowest 8: ${sorted.slice(0, 8).map(t => `#${t.idx} ${(t.ms / 1000).toFixed(1)}s(tok ${t.tokens ?? "?"})`).join(", ")}`);
  process.exit(0);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
