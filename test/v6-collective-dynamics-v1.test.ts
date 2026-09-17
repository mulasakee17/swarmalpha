import { describe, expect, it } from "vitest";
import type { SingleAttemptTextInvoker, SingleAttemptTextInvokeRequest } from "../experiments/campaign/v6/providerAdapters";
import {
  analyzeCollectiveDynamicsTaskV1,
  assertCollectiveDynamicsTruthBlindV1,
  buildCollectiveDynamicsManifestV1,
  buildCollectiveDynamicsPlanV1,
  classifyStrictConsensusV1,
  replayCollectiveDynamicsResponseV1,
  verifyCollectiveDynamicsManifestV1,
  verifyFormationArtifactV1,
} from "../experiments/campaign/v6/collectiveDynamicsV1";
import {
  COLLECTIVE_DYNAMICS_V1_EXECUTION_STATUS,
  assertCollectiveDynamicsV1CliPhaseAllowedV1,
  executeCollectiveDynamicsFormationV1,
  executeCollectiveDynamicsResponseV1,
} from "../experiments/campaign/v6/run_v6_collective_dynamics_v1";
import { auditCollectiveDynamicsFormationStateInvarianceV1 } from
  "../experiments/campaign/v6/analyze_v6_collective_dynamics_state_invariance_v1";
import {
  buildCollectiveDynamicsSensorCanaryPlanV1,
  compareCollectiveDynamicsSensorReportsV1,
  parseCollectiveDynamicsSensorReportV1,
  verifyCollectiveDynamicsSensorCanaryPlanV1,
} from "../experiments/campaign/v6/collectiveDynamicsPromptSensitivityCanaryV1";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";

function optionsFromPrompt(prompt: string): string[] {
  const line = prompt.split("\n").find(value => value.includes("canonical options in this order"));
  if (!line) throw new Error("mock_options_missing");
  const captured = line.match(/sum to 1: (.*?)\. Example:/)?.[1];
  if (!captured) throw new Error("mock_options_unparseable");
  return captured.split("|").map(value => value.trim());
}

function deterministicInvoker(input?: { rescueOption?: string }): {
  invoker: SingleAttemptTextInvoker;
  requests: SingleAttemptTextInvokeRequest[];
} {
  const requests: SingleAttemptTextInvokeRequest[] = [];
  return {
    requests,
    invoker: {
      async invoke(request) {
        requests.push(structuredClone(request));
        const options = optionsFromPrompt(request.userPrompt);
        const round = Number(request.requestId.match(/:r(\d+):/)?.[1]);
        const isAttack = request.requestId.includes(":ATTACKS_NEUTRAL:");
        const top = isAttack && round >= 4 && input?.rescueOption
          ? input.rescueOption : options[0];
        const probabilities = Object.fromEntries(options.map(option => [option, option === top ? 0.85 : 0.15 / (options.length - 1)]));
        const agent = request.requestId.split(":").at(-1)!;
        return {
          rawContent: JSON.stringify({
            message: `message-r${round}-${agent}`,
            belief: { kind: "categorical", probabilities },
            evidence: [
              { content: `support-r${round}-${agent}`, relation: "supports" },
              { content: `attack-r${round}-${agent}`, relation: "attacks" },
            ],
          }),
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      },
    },
  };
}

describe("Collective Epistemic Dynamics V1", () => {
  it("freezes a truth-blind 48-call sensor canary and rejects response repair", () => {
    const plan = buildCollectiveDynamicsSensorCanaryPlanV1();
    expect(() => verifyCollectiveDynamicsSensorCanaryPlanV1(plan)).not.toThrow();
    expect(plan).toMatchObject({
      sourceTaskIds: [1, 36, 64],
      plannedProviderCalls: 48,
      truthAccess: "none",
      invocation: { attempts: 1, retry: "none" },
    });
    const options = ["A", "B", "C"];
    const left = parseCollectiveDynamicsSensorReportV1(
      JSON.stringify({ probabilities: { A: 0.6, B: 0.3, C: 0.1 } }), options,
    );
    const right = parseCollectiveDynamicsSensorReportV1(
      JSON.stringify({ probabilities: { C: 0.1, B: 0.3, A: 0.6 } }), [...options].reverse(),
    );
    expect(compareCollectiveDynamicsSensorReportsV1({ canonicalOptions: options, left, right }))
      .toMatchObject({ totalVariation: 0, normalizedEntropyDifference: 0, uniqueTopAgreement: true });
    expect(() => parseCollectiveDynamicsSensorReportV1(
      JSON.stringify({ probabilities: { A: 0.6, B: 0.3 } }), options,
    )).toThrow("sensor_canary_option_set_mismatch");
    expect(() => parseCollectiveDynamicsSensorReportV1(
      JSON.stringify({ probabilities: { A: 0.6, B: 0.3, C: 0.3 } }), options,
    )).toThrow("sensor_canary_probability_sum_invalid");
  });

  it("retires new V1 response CLI execution while preserving artifact analysis", () => {
    expect(COLLECTIVE_DYNAMICS_V1_EXECUTION_STATUS).toMatchObject({
      responseCli: "retired",
      reason: "global_polarity_has_no_option_target",
      existingArtifactPolicy: "replay_and_offline_analysis_only",
    });
    expect(() => assertCollectiveDynamicsV1CliPhaseAllowedV1(["node", "runner", "--response", "--execute"]))
      .toThrow("collective_dynamics_v1_response_retired");
    expect(() => assertCollectiveDynamicsV1CliPhaseAllowedV1(["node", "runner", "--formation", "--execute"]))
      .not.toThrow();
  });

  it("enforces the truth firewall and strict-consensus definition", () => {
    expect(() => assertCollectiveDynamicsTruthBlindV1({ nested: { correct_answer: "x" } }))
      .toThrow("collective_dynamics_truth_leak");
    const projection = createHiddenBenchTaskProjectionV1({ sourceTaskId: 14 });
    const claim = projection.adapter.task.claim;
    const reports = projection.adapter.task.agents.map((agent, index) => ({
      id: `r${index}`, claimId: claim.id, agentId: agent.agentId, round: 3,
      value: { kind: "categorical" as const, probabilities: Object.fromEntries(claim.options.map((option, optionIndex) => [option, optionIndex === 0 ? 0.8 : 0.2 / (claim.options.length - 1)])) },
      evidence: [], stake: 0, createdAt: "2026-08-24T00:00:00.000Z",
    }));
    expect(classifyStrictConsensusV1({
      claim, expectedAgentIds: projection.adapter.task.agents.map(agent => agent.agentId), reports,
    })).toMatchObject({ status: "strict_consensus", option: claim.options[0], rosterComplete: true });
    const tied = structuredClone(reports);
    const tiedValue = tied[0].value;
    tiedValue.probabilities = Object.fromEntries(claim.options.map((option, index) => [option, index < 2 ? 0.5 : 0]));
    expect(classifyStrictConsensusV1({
      claim, expectedAgentIds: projection.adapter.task.agents.map(agent => agent.agentId), reports: tied,
    }).status).toBe("no_strict_consensus");
  });

  it("runs R1-R3 synchronously, forks the exact R3 state, and replays every state", async () => {
    const plan = buildCollectiveDynamicsPlanV1({ taskIds: [14], seeds: [7] });
    const mock = deterministicInvoker();
    const formation = await executeCollectiveDynamicsFormationV1({
      plan, sourceTaskId: 14, seed: 7, baseInvoker: mock.invoker,
    });
    verifyFormationArtifactV1(formation);
    const source = createHiddenBenchTaskProjectionV1({ sourceTaskId: 14 }).adapter.task;
    const invariance = auditCollectiveDynamicsFormationStateInvarianceV1({
      formation,
      outcome: source.outcome,
    });
    expect(invariance.failures).toEqual([]);
    expect(Object.values(invariance.maxAbsDifferenceByCheck).every(value => value <= 1e-12)).toBe(true);
    expect(formation.rounds.map(round => round.round)).toEqual([1, 2, 3]);
    expect(formation.rounds[0].updateActivityFromPrior).toBeNull();
    const r2Prompt = mock.requests.find(request => request.requestId.includes(":r2:"))!.userPrompt;
    const r3Prompt = mock.requests.find(request => request.requestId.includes(":r3:"))!.userPrompt;
    expect(r2Prompt).toContain("message-r1-");
    expect(r2Prompt).not.toContain("message-r2-");
    expect(r3Prompt).toContain("message-r2-");
    expect(r3Prompt).not.toContain("message-r1-");

    const response = await executeCollectiveDynamicsResponseV1({ plan, formation, baseInvoker: mock.invoker });
    replayCollectiveDynamicsResponseV1({ formation, response });
    const manifest = buildCollectiveDynamicsManifestV1({ plan, formations: [formation], responses: [response] });
    expect(() => verifyCollectiveDynamicsManifestV1({
      plan, manifest, formations: [formation], responses: [response],
    })).not.toThrow();
    const forgedManifest = structuredClone(manifest);
    forgedManifest.responses[0].contentHash = "sha256:forged";
    expect(() => verifyCollectiveDynamicsManifestV1({
      plan, manifest: forgedManifest, formations: [formation], responses: [response],
    })).toThrow("collective_dynamics_manifest_replay_mismatch");
    expect(new Set(response.arms.map(arm => arm.sharedR3SnapshotHash))).toEqual(new Set([formation.r3SnapshotHash]));
    const random = response.arms.find(arm => arm.arm === "RANDOM_MATCHED")!;
    const attacks = response.arms.find(arm => arm.arm === "ATTACKS_NEUTRAL")!;
    expect(random.disclosure.itemCount).toBe(attacks.disclosure.itemCount);
    expect(random.disclosure.message).not.toContain("relation:");
    expect(attacks.disclosure.message).not.toContain("attacks (disconfirms");
    expect(response.providerCalls).toHaveLength(formation.onlineTask.agents.length * 6);

    const hostile = structuredClone(formation);
    hostile.rounds[2].reports[0].value = { kind: "categorical", probabilities: Object.fromEntries(
      hostile.onlineTask.claim.options.map((option, index) => [option, index === 0 ? 0.7 : 0.3 / (hostile.onlineTask.claim.options.length - 1)]),
    ) };
    expect(() => verifyFormationArtifactV1(hostile)).toThrow();
  });

  it("keeps wrong-consensus rescue and correct-state harm as offline, task-level outcomes", async () => {
    const source = createHiddenBenchTaskProjectionV1({ sourceTaskId: 14 }).adapter.task;
    const wrongOption = source.claim.options.find(option => option !== source.outcome)!;
    // The test provider is synthetic wiring evidence only; no result is a model finding.
    const plan = buildCollectiveDynamicsPlanV1({ taskIds: [14], seeds: [9] });
    const mock = deterministicInvoker({ rescueOption: source.outcome });
    const formation = await executeCollectiveDynamicsFormationV1({ plan, sourceTaskId: 14, seed: 9, baseInvoker: mock.invoker });
    // Force the mock's default formation option to be wrong by selecting a task
    // whose first option is not the outcome; fail explicitly if the fixture changes.
    expect(source.claim.options[0]).toBe(wrongOption);
    const response = await executeCollectiveDynamicsResponseV1({ plan, formation, baseInvoker: mock.invoker });
    const analysis = analyzeCollectiveDynamicsTaskV1({ formation, response, outcome: source.outcome });
    expect(analysis.preForkStratum).toBe("wrong_consensus");
    expect(analysis.arms.ATTACKS_NEUTRAL.stableRecovery).toBe(true);
    expect(analysis.arms.RANDOM_MATCHED.stableRecovery).toBe(false);
    expect(analysis.attacksMinusRandomFinalBrier).toBeLessThan(0);
  });
});
