/** Frozen V4-method analysis entry point for the seed-1 replication. */

async function main(): Promise<void> {
  process.env.GLM46V_EXPERIMENT_VARIANT = "seed1-replication";
  const { runV4AnalysisCli } = await import("./analyze_v6_fork_glm46v_v4");
  process.exitCode = await runV4AnalysisCli();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 4;
});
