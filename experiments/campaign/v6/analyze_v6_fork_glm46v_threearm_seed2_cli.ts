/** CLI wrapper that selects the frozen three-arm seed-2 variant before import. */

async function main(): Promise<void> {
  process.env.GLM46V_EXPERIMENT_VARIANT = "three-arm-seed2";
  const { runThreeArmAnalysisCli } = await import("./analyze_v6_fork_glm46v_threearm_seed2");
  process.exitCode = await runThreeArmAnalysisCli();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 4;
});
