import { describe, expect, it } from "vitest";
import {
  assertMechanismDisclosureTripleV1,
  assertMechanismOnlinePayloadTruthBlindV1,
  buildMechanismDisclosureArtifactsV1,
  computeMechanismSelectionIdentityHashV1,
} from "../experiments/campaign/v6/mechanismDisclosureContractV1";
import {
  executeMechanismForkCoreV1,
} from "../experiments/campaign/v6/mechanismForkCoreV1";

const items = [
  {
    sourceAgentIds: ["agent:hiddenbench:14:1", "agent:hiddenbench:14:3"],
    content: "The report attacks a tempting option, but this is only source text.",
    contentHash: "sha256:aaa",
  },
  {
    sourceAgentIds: ["agent:hiddenbench:14:2"],
    content: "A second observation with stable identity.",
    contentHash: "sha256:bbb",
  },
];

describe("mechanism disclosure contract", () => {
  it("builds three arms with shared item identity and distinct frame commitments", () => {
    const artifacts = buildMechanismDisclosureArtifactsV1(items);
    expect(() => assertMechanismDisclosureTripleV1(artifacts)).not.toThrow();
    expect(artifacts.CONTROL.message).toBeNull();
    expect(artifacts.ATTACKS_NEUTRAL.itemCount).toBe(2);
    expect(artifacts.ATTACKS_NEUTRAL.selectionIdentityHash)
      .toBe(artifacts.ATTACKS_LABELED.selectionIdentityHash);
    expect(artifacts.ATTACKS_NEUTRAL.treatmentHash)
      .not.toBe(artifacts.ATTACKS_LABELED.treatmentHash);
    expect(artifacts.ATTACKS_NEUTRAL.message)
      .toContain("relation: recorded evidence");
    expect(artifacts.ATTACKS_NEUTRAL.message)
      .not.toContain("relation: attacks");
    expect(artifacts.ATTACKS_LABELED.message)
      .toContain("relation: attacks (disconfirms an option; agent-reported relation)");
    // Natural observation text is preserved even when it contains the word
    // "attacks"; only the frame field is constrained.
    expect(artifacts.ATTACKS_NEUTRAL.message)
      .toContain("The report attacks a tempting option");
  });

  it("commits source order, hashes, and exact observation text", () => {
    const original = computeMechanismSelectionIdentityHashV1(items);
    const reversed = computeMechanismSelectionIdentityHashV1([...items].reverse());
    const changedSourceOrder = computeMechanismSelectionIdentityHashV1([
      { ...items[0], sourceAgentIds: [...items[0].sourceAgentIds].reverse() },
      items[1],
    ]);
    const changedContent = computeMechanismSelectionIdentityHashV1([
      { ...items[0], content: "changed" },
      items[1],
    ]);
    expect(reversed).not.toBe(original);
    expect(changedSourceOrder).not.toBe(original);
    expect(changedContent).not.toBe(original);
  });

  it("fails closed when the neutral and labeled item bundles differ", () => {
    const artifacts = buildMechanismDisclosureArtifactsV1(items);
    artifacts.ATTACKS_LABELED.items[0].contentHash = "sha256:tampered";
    expect(() => assertMechanismDisclosureTripleV1(artifacts))
      .toThrow("mechanism_neutral_labeled_items_mismatch");
  });

  it("rejects non-canonical rendering, stale length, and stale treatment hashes", () => {
    const changedMessage = buildMechanismDisclosureArtifactsV1(items);
    changedMessage.ATTACKS_NEUTRAL.message += "\nextra framing";
    expect(() => assertMechanismDisclosureTripleV1(changedMessage))
      .toThrow("mechanism_neutral_message_not_canonical");

    const changedLength = buildMechanismDisclosureArtifactsV1(items);
    changedLength.ATTACKS_LABELED.messageCharCount += 1;
    expect(() => assertMechanismDisclosureTripleV1(changedLength))
      .toThrow("mechanism_message_length_mismatch");

    const changedHash = buildMechanismDisclosureArtifactsV1(items);
    changedHash.ATTACKS_LABELED.treatmentHash = "sha256:stale";
    expect(() => assertMechanismDisclosureTripleV1(changedHash))
      .toThrow("mechanism_treatment_hash_invalid");
  });

  it("rejects offline correctness fields at the online boundary", () => {
    expect(() => assertMechanismOnlinePayloadTruthBlindV1({
      publicContext: "ok",
      proposalCorrectness: true,
    })).toThrow("mechanism_online_truth_leak");
    expect(() => assertMechanismOnlinePayloadTruthBlindV1({
      publicContext: "ok",
      evidence: [{ content: "groundTruth is a natural-language phrase" }],
    })).toThrow("mechanism_online_truth_leak");
    expect(() => assertMechanismOnlinePayloadTruthBlindV1({
      publicContext: "ok",
      evidence: [{ content: "a normal observation" }],
    })).not.toThrow();
  });
});

describe("minimal mechanism fork core", () => {
  it("gives each arm an independent frozen copy of one truth-blind snapshot", async () => {
    const snapshots: unknown[] = [];
    const result = await executeMechanismForkCoreV1({
      round1Snapshot: {
        taskId: 15,
        transcript: [{ round: 1, agentId: "a", content: "report" }],
        reports: [{ agentId: "a", probabilities: { A: 0.7, B: 0.3 } }],
      },
      selectedAttackItems: items,
      armOrder: ["ATTACKS_NEUTRAL", "ATTACKS_LABELED", "CONTROL"],
      async executeArm(input) {
        snapshots.push(input.round1Snapshot);
        expect(Object.isFrozen(input.round1Snapshot)).toBe(true);
        expect(Object.isFrozen((input.round1Snapshot as { transcript: unknown[] }).transcript)).toBe(true);
        return input.disclosure.message;
      },
    });
    expect(result.arms.map(entry => entry.arm)).toEqual([
      "ATTACKS_NEUTRAL", "ATTACKS_LABELED", "CONTROL",
    ]);
    expect(new Set(result.arms.map(entry => entry.selectionIdentityHash)).size).toBe(1);
    expect(snapshots[0]).not.toBe(snapshots[1]);
    expect(snapshots[1]).not.toBe(snapshots[2]);
  });

  it("rejects invalid arm schedules and truth-bearing snapshots before execution", async () => {
    const executeArm = async () => "unused";
    await expect(executeMechanismForkCoreV1({
      round1Snapshot: { taskId: 15 },
      selectedAttackItems: items,
      armOrder: ["CONTROL", "CONTROL", "ATTACKS_LABELED"],
      executeArm,
    })).rejects.toThrow("mechanism_arm_order_not_permutation");
    await expect(executeMechanismForkCoreV1({
      round1Snapshot: { taskId: 15, resolvedOption: "A" },
      selectedAttackItems: items,
      armOrder: ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"],
      executeArm,
    })).rejects.toThrow("mechanism_online_truth_leak");
  });
});
