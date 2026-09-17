/** GLM-4.6V complete three-arm extension (seed=2). */

async function main(): Promise<void> {
  process.env.GLM46V_EXPERIMENT_VARIANT = "three-arm-seed2";
  const { runGlm46vTwoArmCli } = await import("./run_v6_fork_glm46v_two_arm_v4");
  process.exitCode = await runGlm46vTwoArmCli();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 4;
});
