// Verify the fence-strip fix: run ONE task's fork on GLM and confirm round-1
// beliefs + disclosure are now populated (previously empty).
import dotenv from "dotenv";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import { runFork } from "./run_v6_fork";

dotenv.config({ path: ".env.local" });

async function main(): Promise<void> {
  const rows = await runFork({ taskId: 14, seed: 0, model: "zhipu:glm-4.6v", invoker: createZhipuSingleAttemptInvoker() });
  for (const r of rows) {
    console.log(`arm ${r.arm}: r1Beliefs=${r.round1AgentBeliefs.length} disclosed=${r.disclosedEvidenceCount} pool=${r.disclosedPoolSize} finalBrier=${r.finalBrier?.toFixed(3)} finalReported=${r.finalReportedCount}`);
  }
}

main().then(() => process.exit(0)).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
