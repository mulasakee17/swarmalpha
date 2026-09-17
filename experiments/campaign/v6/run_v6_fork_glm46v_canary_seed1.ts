/** Isolated task-14 engineering canary for the seed-1 replication. */

async function main(): Promise<void> {
  process.env.GLM46V_EXPERIMENT_VARIANT = "seed1-replication";
  const { runGlm46vCanaryCli } = await import("./run_v6_fork_glm46v_canary_task14_v4");
  process.exitCode = await runGlm46vCanaryCli();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 4;
});
