import { describe, expect, it } from "vitest";
import {
  CONTROLLED_WRONG_STATE_REVIEW_PACKET_V1,
  CONTROLLED_WRONG_STATE_TASK_BANK_V1,
  projectControlledWrongStateOnlineTaskV1,
  validateControlledWrongStateTaskV1,
} from "../experiments/campaign/v6/controlledWrongStateTaskBankV1";
import {
  buildControlledWrongStateChoicePromptV1,
  buildControlledWrongStateChoiceRequestV1,
  buildControlledWrongStateFormationPlanV1,
  executeControlledWrongStateFormationV1,
  parseControlledChoiceResponseV1,
  verifyControlledWrongStateFormationRunV1,
  verifyControlledWrongStateFormationPlanV1,
} from "../experiments/campaign/v6/controlledWrongStateFormationV1";
import {
  buildControlledWrongStateFormationManifestV1,
  verifyControlledWrongStateFormationManifestV1,
} from "../experiments/campaign/v6/controlledWrongStateFormationManifestV1";
import {
  analyzeControlledWrongStateFormationV1,
  verifyControlledWrongStateFormationAnalysisV1,
} from "../experiments/campaign/v6/analyzeControlledWrongStateFormationV1";
import { controlledWrongStateFormationExecuteGateV1 } from
  "../experiments/campaign/v6/run_v6_controlled_wrong_state_formation_v1";
import {
  analyzeControlledInteractionCanaryV1_1,
  buildControlledInteractionPlanV1_1,
  buildInteractionPromptV1_1,
  executeControlledInteractionCanaryV1_1,
  parseInteractionChoiceV1_1,
} from "../experiments/campaign/v6/controlledWrongStateInteractionCanaryV1_1";
import { controlledInteractionCanaryExecuteGateV1_1 } from
  "../experiments/campaign/v6/run_v6_controlled_interaction_canary_v1_1";
import {
  analyzeControlledRecoveryCanaryV1,
  buildControlledRecoveryPlanV1,
  executeControlledRecoveryCanaryV1,
} from "../experiments/campaign/v6/controlledWrongStateRecoveryCanaryV1";

describe("controlled wrong-state candidate bank v1", () => {
  it("contains four clusters and one option-identity mirror per cluster", () => {
    expect(CONTROLLED_WRONG_STATE_TASK_BANK_V1).toHaveLength(8);
    const clusters = new Map<string, typeof CONTROLLED_WRONG_STATE_TASK_BANK_V1[number][]>();
    for (const task of CONTROLLED_WRONG_STATE_TASK_BANK_V1) {
      validateControlledWrongStateTaskV1(task);
      clusters.set(task.clusterId, [...(clusters.get(task.clusterId) ?? []), task]);
    }
    expect(clusters.size).toBe(4);
    for (const tasks of clusters.values()) {
      expect(tasks).toHaveLength(2);
      expect(tasks.filter(task => task.mirrorOfTaskId === null)).toHaveLength(1);
      expect(tasks.filter(task => task.mirrorOfTaskId !== null)).toHaveLength(1);
    }
  });

  it("keeps resolver and withheld observations outside every online projection", () => {
    for (const task of CONTROLLED_WRONG_STATE_TASK_BANK_V1) {
      const projected = projectControlledWrongStateOnlineTaskV1(task);
      const text = JSON.stringify(projected);
      const withheld = task.evidence.find(item => item.availability === "withheld")!;
      expect(text).not.toContain("resolver");
      expect(text).not.toContain("outcomeOptionId");
      expect(text).not.toContain(withheld.evidenceId);
      expect(text).not.toContain(withheld.statement);
    }
  });

  it("passes automatic evidence-structure checks but remains human-review pending", () => {
    expect(CONTROLLED_WRONG_STATE_REVIEW_PACKET_V1).toHaveLength(8);
    for (const review of CONTROLLED_WRONG_STATE_REVIEW_PACKET_V1) {
      expect(Object.values(review.checks).every(Boolean)).toBe(true);
      expect(review.constructedInitialTopHistogram).toEqual(expect.objectContaining({}));
      expect(Math.max(...Object.values(review.constructedInitialTopHistogram))).toBe(2);
      expect(review.postRevealOutcomeMargin).toBeGreaterThan(review.formationOutcomeMargin);
      expect(review.humanReview.status).toBe("PENDING");
    }
  });

  it("balances both frozen outcomes and misleading-cue positions across opaque option ids", () => {
    const count = (ids: readonly string[]) => ["opt_1", "opt_2", "opt_3"]
      .map(optionId => ids.filter(id => id === optionId).length);
    const outcomeCounts = count(CONTROLLED_WRONG_STATE_TASK_BANK_V1
      .map(task => task.resolver.outcomeOptionId));
    const misleadingCueCounts = count(CONTROLLED_WRONG_STATE_REVIEW_PACKET_V1
      .map(review => review.sharedCueTopOptionId));
    expect(Math.max(...outcomeCounts) - Math.min(...outcomeCounts)).toBeLessThanOrEqual(1);
    expect(Math.max(...misleadingCueCounts) - Math.min(...misleadingCueCounts)).toBeLessThanOrEqual(1);
  });

  it("preserves labels and diagnostic scores under each option-identity mirror", () => {
    for (const base of CONTROLLED_WRONG_STATE_TASK_BANK_V1.filter(task => task.mirrorOfTaskId === null)) {
      const mirror = CONTROLLED_WRONG_STATE_TASK_BANK_V1
        .find(task => task.mirrorOfTaskId === base.taskId)!;
      for (const baseOption of base.options) {
        const mirrorOption = mirror.options.find(option => option.label === baseOption.label)!;
        for (let evidenceIndex = 0; evidenceIndex < base.evidence.length; evidenceIndex += 1) {
          expect(mirror.evidence[evidenceIndex].scoreByOptionId[mirrorOption.optionId])
            .toBe(base.evidence[evidenceIndex].scoreByOptionId[baseOption.optionId]);
        }
      }
    }
  });

  it("fails closed when withheld evidence is exposed as private evidence", () => {
    const tampered = structuredClone(CONTROLLED_WRONG_STATE_TASK_BANK_V1[0]);
    const withheld = tampered.evidence.find(item => item.availability === "withheld")!;
    withheld.availability = "private";
    withheld.ownerAgentId = tampered.agentIds[0];
    expect(() => validateControlledWrongStateTaskV1(tampered)).toThrow();
  });

  it("keeps both branches byte-identical at X0", () => {
    const task = CONTROLLED_WRONG_STATE_TASK_BANK_V1[0];
    const isolated = buildControlledWrongStateChoicePromptV1({
      task, agentId: "agent_1", arm: "ISOLATED", round: 0,
    });
    const peer = buildControlledWrongStateChoicePromptV1({
      task, agentId: "agent_1", arm: "PEER", round: 0,
    });
    expect(peer.systemPrompt).toBe(isolated.systemPrompt);
    expect(peer.userPrompt).toBe(isolated.userPrompt);
    expect(peer.promptHash).toBe(isolated.promptHash);
  });

  it("allows peer-only previous messages and rejects isolated peer leakage", () => {
    const task = CONTROLLED_WRONG_STATE_TASK_BANK_V1[0];
    const own = { choiceId: "opt_1", rationale: "own" };
    const peers = {
      agent_2: { choiceId: "opt_2", rationale: "p2" },
      agent_3: { choiceId: "opt_1", rationale: "p3" },
      agent_4: { choiceId: "opt_3", rationale: "p4" },
    } as const;
    expect(() => buildControlledWrongStateChoicePromptV1({
      task, agentId: "agent_1", arm: "ISOLATED", round: 1,
      previousOwnResponse: own, peerResponses: peers,
    })).toThrow("controlled_formation_isolated_peer_leak");
    const prompt = buildControlledWrongStateChoicePromptV1({
      task, agentId: "agent_1", arm: "PEER", round: 1,
      previousOwnResponse: own, peerResponses: peers,
    });
    expect(prompt.userPrompt).toContain("agent_id=agent_2");
    expect(prompt.userPrompt).not.toContain("outcomeOptionId");
    expect(prompt.userPrompt).not.toContain("resolver");
  });

  it("uses a strict two-field choice parser and binds the 160-call plan", () => {
    const parsed = parseControlledChoiceResponseV1(
      '{"choiceId":"opt_2","rationale":"The supplied observations favor this option."}',
      ["opt_1", "opt_2", "opt_3"],
    );
    expect(parsed.choiceId).toBe("opt_2");
    expect(() => parseControlledChoiceResponseV1(
      '{"choiceId":"opt_2","rationale":"ok","confidence":0.9}',
      ["opt_1", "opt_2", "opt_3"],
    )).toThrow("controlled_choice_fields_invalid");
    const plan = buildControlledWrongStateFormationPlanV1();
    verifyControlledWrongStateFormationPlanV1(plan);
    expect(plan.plannedProviderCalls).toBe(160);
    const request = buildControlledWrongStateChoiceRequestV1({
      plan, runId: "mock-run", taskId: plan.variantTaskIds[0], agentId: "agent_1",
      arm: "PEER", round: 0,
    });
    expect(request.responseFormat).toBe("json");
    expect(request.promptHash).toBeTruthy();
  });

  it("runs the full 160-cell protocol with one frozen X0 per variant", async () => {
    const plan = buildControlledWrongStateFormationPlanV1({
      modelRef: { id: "mock:controlled-choice", version: "1.0.0" },
    });
    const requests: string[] = [];
    const run = await executeControlledWrongStateFormationV1({
      plan,
      runId: "mock-formation-run",
      invoker: {
        invoke: async (request) => {
          requests.push(request.requestId);
          return {
            rawContent: JSON.stringify({ choiceId: "opt_1", rationale: "mock response" }),
          };
        },
      },
    });
    verifyControlledWrongStateFormationRunV1({ plan, artifact: run });
    expect(requests).toHaveLength(160);
    expect(run.terminals).toHaveLength(160);
    for (const task of CONTROLLED_WRONG_STATE_TASK_BANK_V1) {
      const x0 = run.terminals.filter(terminal => terminal.taskId === task.taskId
        && terminal.phase === "X0");
      expect(x0).toHaveLength(4);
      expect(new Set(x0.map(terminal => terminal.agentId)).size).toBe(4);
    }
    expect(JSON.stringify(run)).not.toContain("outcomeOptionId");
    expect(JSON.stringify(run)).not.toContain("withheld");
    const manifest = buildControlledWrongStateFormationManifestV1(plan);
    verifyControlledWrongStateFormationManifestV1({ plan, manifest });
    expect(manifest.humanSemanticReview).toBe("not_completed");
    expect(manifest.scientificRole).toBe("engineering_development_canary_only");
    const analysis = analyzeControlledWrongStateFormationV1({ plan, run });
    verifyControlledWrongStateFormationAnalysisV1({ plan, run, analysis });
    expect(analysis.advancement.decision).toBe("NO_GO_REVISE");
  });

  it("keeps real execution behind two explicit owner gates", () => {
    expect(controlledWrongStateFormationExecuteGateV1({})).toEqual(expect.objectContaining({ ok: false }));
    expect(controlledWrongStateFormationExecuteGateV1({ RUN_AUTHORIZED: "yes" }))
      .toEqual(expect.objectContaining({ ok: false }));
    expect(controlledWrongStateFormationExecuteGateV1({
      RUN_AUTHORIZED: "yes", CONTROLLED_FORMATION_CANARY_APPROVED: "yes",
    })).toEqual({ ok: true });
  });

  it("freezes a 20-call truth-blind V1.1 prompt and tolerates harmless extra fields", () => {
    const plan = buildControlledInteractionPlanV1_1();
    expect(plan.plannedProviderCalls).toBe(20);
    const isolated = buildInteractionPromptV1_1({
      plan, agentId: "agent_1", arm: "ISOLATED", round: 0,
    });
    const peer = buildInteractionPromptV1_1({
      plan, agentId: "agent_1", arm: "PEER", round: 0,
    });
    expect(peer).toEqual(isolated);
    for (const forbidden of ["scoreByOptionId", "outcomeOptionId", "withheld", "resolver"]) {
      expect(isolated.userPrompt).not.toContain(forbidden);
    }
    const parsed = parseInteractionChoiceV1_1(
      '{"choiceId":"opt_2","rationale":"Evidence favors it.","confidence":0.7}',
      ["opt_1", "opt_2", "opt_3"],
    );
    expect(parsed).toEqual({
      choiceId: "opt_2", rationale: "Evidence favors it.", extraFieldNames: ["confidence"],
    });
  });

  it("detects finite-system interaction response without promoting it to a phase claim", async () => {
    const plan = buildControlledInteractionPlanV1_1({
      modelRef: { id: "mock:interaction", version: "1.0.0" },
    });
    const x0Choices: Record<string, string> = {
      agent_1: "opt_1", agent_2: "opt_1", agent_3: "opt_2", agent_4: "opt_3",
    };
    const run = await executeControlledInteractionCanaryV1_1({
      plan,
      runId: "mock-interaction-run",
      invoker: {
        invoke: async request => {
          const agentId = request.requestId.split(":").at(-1)!;
          const isPeer = request.requestId.includes(":peer:");
          return {
            rawContent: JSON.stringify({
              choiceId: isPeer ? "opt_1" : x0Choices[agentId],
              rationale: "Mock natural-language diagnosis.",
            }),
            usage: { completionTokens: 20 },
          };
        },
      },
    });
    const analysis = analyzeControlledInteractionCanaryV1_1({ plan, run });
    expect(run.terminals).toHaveLength(20);
    expect(analysis.qualification.decision).toBe("INTERACTION_SIGNAL");
    expect(analysis.switching.peerTotal).toBeGreaterThan(analysis.switching.isolatedTotal);
    expect(analysis.states.PEER_R2.pottsOrder).toBe(1);
    expect(analysis.inferenceScope).toBe("single_finite_system_instrument_diagnostic");
  });

  it("fails closed on a completion-ceiling hit and gates paid V1.1 execution", async () => {
    const plan = buildControlledInteractionPlanV1_1({
      modelRef: { id: "mock:ceiling", version: "1.0.0" },
    });
    await expect(executeControlledInteractionCanaryV1_1({
      plan, runId: "mock-ceiling-run",
      invoker: { invoke: async () => ({
        rawContent: '{"choiceId":"opt_1","rationale":"Truncated."}',
        usage: { completionTokens: 1024 },
      }) },
    })).rejects.toThrow("interaction_canary_completion_ceiling_hit");
    expect(controlledInteractionCanaryExecuteGateV1_1({})).toEqual(expect.objectContaining({ ok: false }));
    expect(controlledInteractionCanaryExecuteGateV1_1({
      RUN_AUTHORIZED: "yes", CONTROLLED_INTERACTION_CANARY_V11_APPROVED: "yes",
    })).toEqual({ ok: true });
  });

  it("binds the four-call escape probe to X0 and keeps the new observation truth-blind", async () => {
    const plan = buildControlledInteractionPlanV1_1({ modelRef: { id: "mock:interaction", version: "1.0.0" } });
    const source = await executeControlledInteractionCanaryV1_1({
      plan, runId: "mock-source-run",
      invoker: { invoke: async request => {
        const agentId = request.requestId.split(":").at(-1)!;
        const choices: Record<string, string> = { agent_1: "opt_1", agent_2: "opt_1", agent_3: "opt_1", agent_4: "opt_2" };
        return { rawContent: JSON.stringify({ choiceId: choices[agentId], rationale: "Source checkpoint." }), usage: { completionTokens: 10 } };
      } },
    });
    const recoveryPlan = buildControlledRecoveryPlanV1({ sourceRun: source, modelRef: { id: "mock:recovery", version: "1.0.0" } });
    const seenPrompts: string[] = [];
    const recovery = await executeControlledRecoveryCanaryV1({
      plan: recoveryPlan, sourceRun: source, runId: "mock-recovery-run",
      invoker: { invoke: async request => {
        seenPrompts.push(request.userPrompt);
        return { rawContent: JSON.stringify({ choiceId: "opt_2", rationale: "The independent flow-meter observation changes my assessment." }), usage: { completionTokens: 10 } };
      } },
    });
    expect(recovery.terminals).toHaveLength(4);
    expect(seenPrompts.every(prompt => prompt.includes("independent-flow-meter-release"))).toBe(true);
    for (const prompt of seenPrompts) {
      expect(prompt).not.toContain("scoreByOptionId");
      expect(prompt).not.toContain("outcomeOptionId");
      expect(prompt).not.toContain("withheld");
      expect(prompt).not.toContain("resolver");
    }
    const analysis = analyzeControlledRecoveryCanaryV1({ plan: recoveryPlan, sourceRun: source, run: recovery });
    expect(analysis.escapeCount).toBe(3);
    expect(analysis.harmCount).toBe(0);
    expect(analysis.decision).toBe("ESCAPE_OBSERVED");
  });
});
