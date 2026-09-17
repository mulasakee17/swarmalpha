import { describe, expect, it } from "vitest";
import { runMechanismTaskV1 } from "../experiments/campaign/v6/mechanismTaskRunnerV1";

const invoker = { async invoke() { throw new Error("unused"); } };
const items = [{ sourceAgentIds: ["a"], content: "observation", contentHash: "sha256:a" }];

describe("mechanism task runner V1", () => {
  it("captures round 1 once and executes three complete arms in frozen order", async () => {
    let captures = 0;
    const seen: string[] = [];
    const result = await runMechanismTaskV1({
      taskId: 15, seed: 3,
      armOrder: ["ATTACKS_NEUTRAL", "ATTACKS_LABELED", "CONTROL"],
      invoker,
      async captureRound1() {
        captures += 1;
        return { snapshot: { transcript: ["r1"] }, selectedAttackItems: items, expectedAgentCount: 2 };
      },
      async executeArm(input) {
        seen.push(input.arm);
        return { finalBelief: { A: 0.6, B: 0.4 }, finalReportedCount: 2, round2ReportedCount: 2 };
      },
    });
    expect(captures).toBe(1);
    expect(seen).toEqual(["ATTACKS_NEUTRAL", "ATTACKS_LABELED", "CONTROL"]);
    expect(result.arms).toHaveLength(3);
    expect(new Set(result.arms.map(arm => arm.selectionIdentityHash)).size).toBe(1);
  });

  it("fails the whole task on an incomplete arm", async () => {
    await expect(runMechanismTaskV1({
      taskId: 15, seed: 3,
      armOrder: ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"],
      invoker,
      async captureRound1() {
        return { snapshot: { transcript: ["r1"] }, selectedAttackItems: items, expectedAgentCount: 2 };
      },
      async executeArm() {
        return { finalBelief: { A: 1, B: 0 }, finalReportedCount: 2, round2ReportedCount: 1 };
      },
    })).rejects.toThrow("mechanism_incomplete_round2");
  });
});

