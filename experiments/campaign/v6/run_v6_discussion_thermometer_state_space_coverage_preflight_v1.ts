import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildDiscussionThermometerStateSpaceCoveragePreflightV1 } from
  "./discussionThermometerStateSpaceCoveragePlanV1";

const OUTPUT_DIRECTORY = "results/v6_discussion_thermometer_state_space_coverage_preflight_v1";

function writeExactOrVerify(path: string, value: unknown): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error("state_space_coverage_preflight_no_overwrite_conflict");
    }
    return;
  }
  writeFileSync(path, serialized, { flag: "wx" });
}

function main(): void {
  const outputDirectory = resolve(process.cwd(), OUTPUT_DIRECTORY);
  const preflight = buildDiscussionThermometerStateSpaceCoveragePreflightV1();
  mkdirSync(outputDirectory, { recursive: true });
  writeExactOrVerify(join(outputDirectory, "preflight.json"), preflight);
  console.log(JSON.stringify({ outputDirectory, preflight }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) main();
