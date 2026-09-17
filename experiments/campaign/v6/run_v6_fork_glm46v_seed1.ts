/**
 * Thin entry point for the prospectively frozen GLM-4.6V seed-1 replication.
 * The environment selector is set before the V4 facility is imported so all
 * content-addressed plan constants resolve to the seed-1 variant.
 */

async function main(): Promise<void> {
  process.env.GLM46V_EXPERIMENT_VARIANT = "seed1-replication";
  const { runGlm46vTwoArmCli } = await import("./run_v6_fork_glm46v_two_arm_v4");
  process.exitCode = await runGlm46vTwoArmCli();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 4;
});
