import * as fs from "node:fs";
import * as path from "node:path";
import {
  buildDiscussionThermometerL4PreflightV1,
  type L4HumanSemanticReviewDecisionV1,
} from "./discussionThermometerL4PreflightV1";

const outputDir = path.resolve(process.cwd(), "results", "v6_discussion_thermometer_l4_preflight_v1");
const outputPath = path.join(outputDir, "preflight.json");
const templatePath = path.join(outputDir, "review-decisions.template.json");
const decisionFlagIndex = process.argv.indexOf("--decisions");
if (decisionFlagIndex >= 0 && (decisionFlagIndex + 1 >= process.argv.length
  || process.argv[decisionFlagIndex + 1].startsWith("--"))) {
  throw new Error("--decisions requires a JSON path");
}
const decisionsPath = decisionFlagIndex >= 0
  ? path.resolve(process.cwd(), process.argv[decisionFlagIndex + 1])
  : null;
const decisions = decisionsPath === null
  ? []
  : JSON.parse(fs.readFileSync(decisionsPath, "utf8")) as L4HumanSemanticReviewDecisionV1[];
if (!Array.isArray(decisions)) throw new Error("L4 review decisions must be a JSON array");
const preflight = buildDiscussionThermometerL4PreflightV1(decisions);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(preflight, null, 2)}\n`, "utf8");
if (!fs.existsSync(templatePath)) {
  fs.writeFileSync(templatePath, `${JSON.stringify(
    preflight.reviewPacket.map(entry => entry.decision), null, 2,
  )}\n`, "utf8");
}

console.log(JSON.stringify({
  outputPath,
  reviewDecisionsTemplatePath: templatePath,
  loadedDecisionsPath: decisionsPath,
  readiness: preflight.readiness,
  shapeEligibleTaskCount: preflight.shapeEligibleTaskIds.length,
  acceptedIndependentSemanticGroupCount: preflight.acceptedIndependentSemanticGroupCount,
  targetIndependentSemanticGroups: preflight.authority.targetIndependentSemanticGroups,
  plannedProviderCallsAtTarget: preflight.budget.totalProviderCalls,
  developmentGroupCount: preflight.developmentGrouping.groupCount,
  developmentStage1TaskIds: preflight.developmentScreen.stage1TaskIds,
  developmentStage1ProviderCalls: preflight.developmentScreen.stage1Budget.totalProviderCalls,
  developmentStage2TaskIds: preflight.developmentScreen.stage2TaskIds,
  developmentStage2IncrementalProviderCalls: preflight.developmentScreen.stage2IncrementalBudget.totalProviderCalls,
  blockers: preflight.blockers,
}, null, 2));
