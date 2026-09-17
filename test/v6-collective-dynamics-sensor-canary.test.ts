import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvoker,
} from "../experiments/campaign/v6/providerAdapters";
import { V6ProviderInvocationError } from "../experiments/campaign/v6/providerDiagnostics";
import {
  buildCollectiveDynamicsPlanV1,
  hashCollectiveDynamicsValueV1,
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
} from "../experiments/campaign/v6/collectiveDynamicsV1";
import { executeCollectiveDynamicsFormationV1 } from
  "../experiments/campaign/v6/run_v6_collective_dynamics_v1";
import {
  COLLECTIVE_DYNAMICS_SENSOR_ELICITATION_WORDINGS_V1,
  COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1,
  COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1,
  buildCollectiveDynamicsSensorCanaryFreezeV1,
  buildCollectiveDynamicsSensorCanaryPlanV1,
  buildCollectiveDynamicsSensorPromptV1,
  buildCollectiveDynamicsSensorSnapshotV1,
  compareCollectiveDynamicsSensorReportsV1,
  executeCollectiveDynamicsSensorCanaryV1,
  parseCollectiveDynamicsSensorReportV1,
  parseCollectiveDynamicsSensorReportV1_1,
  verifyCollectiveDynamicsSensorCanaryFreezeV1,
  verifyCollectiveDynamicsSensorCanaryRunV1,
} from "../experiments/campaign/v6/collectiveDynamicsPromptSensitivityCanaryV1";
import {
  collectiveDynamicsSensorCanaryExecuteGateV1,
  executeFrozenCollectiveDynamicsSensorCanaryV1,
  freezeCollectiveDynamicsSensorCanaryV1,
  loadCollectiveDynamicsSensorCanaryFormationsV1,
} from "../experiments/campaign/v6/run_v6_collective_dynamics_sensor_canary_v1";
import { analyzeCollectiveDynamicsSensorCanaryV1 } from
  "../experiments/campaign/v6/analyze_v6_collective_dynamics_sensor_canary_v1";
import {
  buildCollectiveDynamicsReplicateAverageFreezeV2,
  buildCollectiveDynamicsReplicateAverageCanaryPlanV2,
  executeCollectiveDynamicsReplicateAverageCanaryV2,
  estimateReplicateAverageSplitHalfV2,
  verifyCollectiveDynamicsReplicateAverageFreezeV2,
  verifyCollectiveDynamicsReplicateAverageRunV2,
  verifyCollectiveDynamicsReplicateAverageCanaryPlanV2,
} from "../experiments/campaign/v6/collectiveDynamicsReplicateAverageCanaryV2";
import {
  collectiveDynamicsReplicateAverageExecuteGateV2,
  executeFrozenCollectiveDynamicsReplicateAverageCanaryV2,
  freezeCollectiveDynamicsReplicateAverageCanaryV2,
  loadCollectiveDynamicsReplicateAverageFormationsV2,
} from "../experiments/campaign/v6/run_v6_collective_dynamics_replicate_average_canary_v2";
import { analyzeCollectiveDynamicsReplicateAverageCanaryV2 } from
  "../experiments/campaign/v6/analyze_v6_collective_dynamics_replicate_average_canary_v2";
import {
  buildCollectiveDynamicsPeerBundleFreezeV1,
  buildCollectiveDynamicsPeerBundlePlanV1,
  buildCollectiveDynamicsPeerBundlePromptV1,
  buildCollectiveDynamicsPeerBundleSnapshotV1,
  verifyCollectiveDynamicsPeerBundleFreezeV1,
} from "../experiments/campaign/v6/collectiveDynamicsPeerBundleFreezeV1";
import {
  buildCollectiveDynamicsMatchedShamFreezeV1,
  buildCollectiveDynamicsMatchedShamPlanV1,
  buildCollectiveDynamicsMatchedShamPromptV1,
  buildCollectiveDynamicsMatchedShamSnapshotV1,
  verifyCollectiveDynamicsMatchedShamFreezeV1,
} from "../experiments/campaign/v6/collectiveDynamicsMatchedShamFreezeV1";

function canonicalOptionsFromFormationPrompt(prompt: string): string[] {
  const line = prompt.split("\n").find(value => value.includes("canonical options in this order"));
  const captured = line?.match(/sum to 1: (.*?)\. Example:/)?.[1];
  if (!captured) throw new Error("mock_options_unparseable");
  return captured.split("|").map(value => value.trim());
}

function formationInvoker(): SingleAttemptTextInvoker {
  return {
    async invoke(request) {
      const options = canonicalOptionsFromFormationPrompt(request.userPrompt);
      const round = Number(request.requestId.match(/:r(\d+):/)?.[1]);
      const agentId = request.requestId.split(":").at(-1)!;
      return {
        rawContent: JSON.stringify({
          message: `public-r${round}-${agentId}`,
          belief: {
            kind: "categorical",
            probabilities: Object.fromEntries(options.map((option, index) => [
              option,
              index === 0 ? 0.7 : 0.3 / (options.length - 1),
            ])),
          },
          evidence: [
            { content: `support-r${round}-${agentId}`, relation: "supports" },
            { content: `attack-r${round}-${agentId}`, relation: "attacks" },
          ],
        }),
      };
    },
  };
}

async function syntheticFormations(): Promise<CollectiveDynamicsFormationArtifactV1[]> {
  const taskIds = [1, 36, 64];
  const plan = buildCollectiveDynamicsPlanV1({ taskIds, seeds: [1] });
  return Promise.all(taskIds.map(sourceTaskId => executeCollectiveDynamicsFormationV1({
    plan,
    sourceTaskId,
    seed: 1,
    baseInvoker: formationInvoker(),
  })));
}

function deterministicClock(): () => string {
  let millis = Date.parse("2026-08-28T00:00:00.000Z");
  return () => new Date(millis++).toISOString();
}

describe("Collective Dynamics shadow-sensor contract", () => {
  it("freezes the held-out V2 replicate-average estimand without provider calls", () => {
    const plan = buildCollectiveDynamicsReplicateAverageCanaryPlanV2();
    expect(() => verifyCollectiveDynamicsReplicateAverageCanaryPlanV2(plan)).not.toThrow();
    expect(plan).toMatchObject({
      sourceTaskIds: [8, 29, 50],
      sourceAgentCounts: [3, 4, 3],
      registeredUnitCount: 10,
      plannedProviderCalls: 40,
      parserRef: { version: "1.1.0" },
      uniqueTopPolicy: "diagnostic_only_ties_are_indeterminate",
      inferenceUnit: "task",
    });
    for (const sourceTaskId of plan.sourceTaskIds) {
      const formation = JSON.parse(readFileSync(join(
        plan.sourceFormationDirectory,
        `formation-task-${sourceTaskId}-seed-${plan.sourceSeed}.json`,
      ), "utf8")) as CollectiveDynamicsFormationArtifactV1;
      expect(() => verifyFormationArtifactV1(formation)).not.toThrow();
      expect(formation.onlineTask.sourceTaskId).toBe(sourceTaskId);
    }
    const boundary = parseCollectiveDynamicsSensorReportV1_1(
      '{"probabilities":{"a":0.333333,"b":0.333333,"c":0.333333}}',
      ["a", "b", "c"],
    );
    const estimate = estimateReplicateAverageSplitHalfV2({
      canonicalOptions: ["a", "b", "c"],
      reports: { A1: boundary, A2: boundary, B1: boundary, B2: boundary },
    });
    expect(estimate.difference.totalVariation).toBe(0);
    expect(estimate.uniqueTopInterpretation).toBe("indeterminate_tie");
  });

  it("freezes, replays, and analyzes the exact-duplicate V2 path without a provider", async () => {
    expect(collectiveDynamicsReplicateAverageExecuteGateV2({}))
      .toMatchObject({ ok: false, code: 5 });
    expect(collectiveDynamicsReplicateAverageExecuteGateV2({ RUN_AUTHORIZED: "yes" }))
      .toMatchObject({ ok: false, code: 5 });
    expect(collectiveDynamicsReplicateAverageExecuteGateV2({
      RUN_AUTHORIZED: "yes",
      REPLICATE_AVERAGE_CANARY_APPROVED: "yes",
    })).toEqual({ ok: true });

    const temporary = mkdtempSync(join(tmpdir(), "swarmalpha-replicate-average-v2-"));
    try {
      const frozen = freezeCollectiveDynamicsReplicateAverageCanaryV2({
        outputDirectory: temporary,
      });
      expect(frozen.freeze.registeredCellCount).toBe(40);
      expect(frozen.freeze.snapshots.map(snapshot => snapshot.sourceTaskId))
        .toEqual([8, 8, 8, 29, 29, 29, 29, 50, 50, 50]);
      for (const snapshot of frozen.freeze.snapshots) {
        const cells = frozen.freeze.cells.filter(cell => cell.snapshotHash === snapshot.contentHash);
        expect(new Set(cells.map(cell => cell.promptHash)).size).toBe(1);
        expect(new Set(cells.map(cell => cell.requestHash)).size).toBe(4);
      }
      for (const label of ["A1", "B1", "A2", "B2"] as const) {
        const positionCounts: number[] = [];
        for (const position of [1, 2, 3, 4]) {
          positionCounts.push(frozen.freeze.cells.filter(cell => cell.replicateLabel === label
            && cell.withinUnitPosition === position).length);
        }
        expect(positionCounts.reduce((sum, count) => sum + count, 0)).toBe(10);
        expect(Math.max(...positionCounts) - Math.min(...positionCounts)).toBeLessThanOrEqual(1);
      }
      const invoker: SingleAttemptTextInvoker = {
        async invoke(request) {
          const cell = frozen.freeze.cells.find(candidate =>
            candidate.request.requestId === request.requestId)!;
          const snapshot = frozen.freeze.snapshots.find(candidate =>
            candidate.contentHash === cell.snapshotHash)!;
          return {
            rawContent: JSON.stringify({
              probabilities: Object.fromEntries(snapshot.claim.options.map((option, index) => [
                option.optionId,
                index === 0 ? 0.7 : 0.3 / (snapshot.claim.options.length - 1),
              ])),
            }),
          };
        },
      };
      const artifact = await executeFrozenCollectiveDynamicsReplicateAverageCanaryV2({
        outputDirectory: temporary,
        invoker,
        clock: deterministicClock(),
      });
      expect(() => verifyCollectiveDynamicsReplicateAverageRunV2({
        freeze: frozen.freeze,
        artifact,
      })).not.toThrow();
      const analysis = analyzeCollectiveDynamicsReplicateAverageCanaryV2({
        plan: frozen.plan,
        freeze: frozen.freeze,
        run: artifact,
      });
      expect(analysis.developmentGates).toMatchObject({
        providerExecutionValid: true,
        allReportsValid: true,
        meanUnitSplitHalfTvPass: true,
        p90UnitSplitHalfTvPass: true,
        eachTaskPooledTvPass: true,
        eachTaskMeanEntropyPass: true,
        eachTaskJsdPass: true,
        overall: "SENSOR_PASS",
      });
      expect(analysis.unitSummary).toMatchObject({
        registeredUnitCount: 10,
        validUnitCount: 10,
        meanSplitHalfTotalVariation: 0,
        p90SplitHalfTotalVariation: 0,
      });
      expect(analysis.taskMacroDifferences).toHaveLength(3);
      expect(readFileSync(join(temporary, "attempts.jsonl"), "utf8").trim().split(/\r?\n/))
        .toHaveLength(80);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("rejects V2 freeze drift while leaving V1 historical replay untouched", () => {
    const plan = buildCollectiveDynamicsReplicateAverageCanaryPlanV2();
    const formations = loadCollectiveDynamicsReplicateAverageFormationsV2(plan);
    const freeze = buildCollectiveDynamicsReplicateAverageFreezeV2({ plan, formations });
    expect(() => verifyCollectiveDynamicsReplicateAverageFreezeV2({
      plan, formations, freeze,
    })).not.toThrow();
    const forged = structuredClone(freeze);
    forged.cells[0].request.userPrompt += " ";
    const { contentHash: _hash, ...body } = forged;
    forged.contentHash = hashCollectiveDynamicsValueV1(body);
    expect(() => verifyCollectiveDynamicsReplicateAverageFreezeV2({
      plan, formations, freeze: forged,
    })).toThrow("replicate_average_canary_v2_cell_binding_invalid");
  });

  it("separates a completed V2 sensor failure from an invalid provider batch", async () => {
    const plan = buildCollectiveDynamicsReplicateAverageCanaryPlanV2();
    const formations = loadCollectiveDynamicsReplicateAverageFormationsV2(plan);
    const freeze = buildCollectiveDynamicsReplicateAverageFreezeV2({ plan, formations });
    const divergentInvoker: SingleAttemptTextInvoker = {
      async invoke(request) {
        const cell = freeze.cells.find(candidate => candidate.request.requestId === request.requestId)!;
        const snapshot = freeze.snapshots.find(candidate => candidate.contentHash === cell.snapshotHash)!;
        const targetIndex = cell.replicateLabel.startsWith("A") ? 0 : 1;
        return {
          rawContent: JSON.stringify({
            probabilities: Object.fromEntries(snapshot.claim.options.map((option, index) => [
              option.optionId, index === targetIndex ? 1 : 0,
            ])),
          }),
        };
      },
    };
    const divergent = await executeCollectiveDynamicsReplicateAverageCanaryV2({
      plan, formations, freeze, invoker: divergentInvoker, clock: deterministicClock(),
    });
    const failed = analyzeCollectiveDynamicsReplicateAverageCanaryV2({
      plan, freeze, run: divergent,
    });
    expect(failed.developmentGates).toMatchObject({
      providerExecutionValid: true,
      allReportsValid: true,
      meanUnitSplitHalfTvPass: false,
      overall: "SENSOR_FAIL",
    });
    expect(failed.unitSummary.meanSplitHalfTotalVariation).toBe(1);

    const unavailable = await executeCollectiveDynamicsReplicateAverageCanaryV2({
      plan,
      formations,
      freeze,
      invoker: {
        async invoke() {
          throw new V6ProviderInvocationError("provider_network");
        },
      },
      clock: deterministicClock(),
    });
    const invalid = analyzeCollectiveDynamicsReplicateAverageCanaryV2({
      plan, freeze, run: unavailable,
    });
    expect(invalid.developmentGates).toMatchObject({
      providerExecutionValid: false,
      allReportsValid: false,
      overall: "CANARY_INVALID_PROVIDER",
    });
  });

  it("freezes the roster-aware pre-peer M1 bundle without provider calls", () => {
    const plan = buildCollectiveDynamicsPeerBundlePlanV1();
    const formations = plan.sourceTaskIds.map(sourceTaskId => JSON.parse(readFileSync(join(
      plan.sourceFormationDirectory,
      `formation-task-${sourceTaskId}-seed-${plan.sourceSeed}.json`,
    ), "utf8")) as CollectiveDynamicsFormationArtifactV1);
    expect(plan.registeredUnitCount).toBe(38);
    expect(plan.plannedProviderCalls).toBe(152);
    const freeze = buildCollectiveDynamicsPeerBundleFreezeV1({ plan, formations });
    expect(() => verifyCollectiveDynamicsPeerBundleFreezeV1({
      plan, formations, freeze,
    })).not.toThrow();
    expect(freeze.snapshots).toHaveLength(38);
    expect(freeze.cells).toHaveLength(152);
    expect(freeze.snapshots.every(snapshot => snapshot.peerPublicMessages.length === 0)).toBe(true);
    const first = freeze.snapshots[0];
    const formation = formations.find(candidate => candidate.onlineTask.sourceTaskId === first.sourceTaskId)!;
    const full = buildCollectiveDynamicsSensorSnapshotV1({
      formation,
      agentId: first.agentId,
      checkpointRound: 1,
    });
    const noPeer = buildCollectiveDynamicsPeerBundlePromptV1({
      snapshot: first,
      peerMessages: full.peerPublicMessages,
      condition: "NO_PEER",
      repeatLabel: "A",
    });
    const peer = buildCollectiveDynamicsPeerBundlePromptV1({
      snapshot: first,
      peerMessages: full.peerPublicMessages,
      condition: "PEER",
      repeatLabel: "A",
    });
    expect(noPeer.userPrompt).not.toContain(
      "<OTHER_AGENTS_PUBLIC_MESSAGES_IN_CANONICAL_ROSTER_ORDER>",
    );
    expect(peer.userPrompt.startsWith(`${noPeer.userPrompt}\n\n`)).toBe(true);
    expect(peer.userPrompt.slice(noPeer.userPrompt.length + 2)).toContain(
      "<OTHER_AGENTS_PUBLIC_MESSAGES_IN_CANONICAL_ROSTER_ORDER>",
    );
    expect(new Set(freeze.cells.map(cell => cell.promptHash)).size).toBe(76);
    expect(new Set(freeze.cells.map(cell => cell.requestHash)).size).toBe(152);
    expect(() => buildCollectiveDynamicsPeerBundleSnapshotV1({
      formation,
      agentId: first.agentId,
    })).not.toThrow();
  }, 30_000);

  it("freezes the matched-sham extension without provider calls", () => {
    const plan = buildCollectiveDynamicsMatchedShamPlanV1();
    const formations = plan.sourceTaskIds.map(sourceTaskId => JSON.parse(readFileSync(join(
      plan.sourceFormationDirectory,
      `formation-task-${sourceTaskId}-seed-${plan.sourceSeed}.json`,
    ), "utf8")) as CollectiveDynamicsFormationArtifactV1);
    expect(plan.registeredUnitCount).toBe(38);
    expect(plan.plannedProviderCalls).toBe(228);
    const freeze = buildCollectiveDynamicsMatchedShamFreezeV1({ plan, formations });
    expect(() => verifyCollectiveDynamicsMatchedShamFreezeV1({
      plan, formations, freeze,
    })).not.toThrow();
    expect(freeze.snapshots).toHaveLength(38);
    expect(freeze.cells).toHaveLength(228);
    const first = freeze.snapshots[0];
    const formation = formations.find(candidate => candidate.onlineTask.sourceTaskId === first.sourceTaskId)!;
    const peerMessages = buildCollectiveDynamicsSensorSnapshotV1({
      formation,
      agentId: first.agentId,
      checkpointRound: 1,
    }).peerPublicMessages;
    const sham = buildCollectiveDynamicsMatchedShamPromptV1({
      snapshot: first,
      peerMessages,
      condition: "SHAM",
      repeatLabel: "A",
    });
    expect(sham.userPrompt).toContain("Participant 1 observation.");
    expect(peerMessages.every(message => !sham.userPrompt.includes(message.content))).toBe(true);
    expect(buildCollectiveDynamicsMatchedShamSnapshotV1({
      formation,
      agentId: first.agentId,
    }).contentHash).toBe(first.contentHash);
  }, 30_000);

  it("reconstructs all 12 post-R3 views from the current stored GLM formation artifacts", () => {
    const plan = buildCollectiveDynamicsSensorCanaryPlanV1();
    const formations = loadCollectiveDynamicsSensorCanaryFormationsV1(plan);
    const freeze = buildCollectiveDynamicsSensorCanaryFreezeV1({ plan, formations });
    expect(formations.map(formation => formation.onlineTask.sourceTaskId)).toEqual([1, 36, 64]);
    expect(freeze.snapshots).toHaveLength(12);
    expect(freeze.cells).toHaveLength(48);
    expect(new Set(freeze.snapshots.flatMap(snapshot => snapshot.sourceRequestHashes)).size).toBe(12);
  });

  it("rejects repair-prone or ambiguous probability encodings", () => {
    const options = ["A", "B"];
    expect(() => parseCollectiveDynamicsSensorReportV1(
      '{"probabilities":{"A":0.5,"A":0.4,"B":0.1}}', options,
    )).toThrow("sensor_canary_duplicate_probability_key");
    expect(() => parseCollectiveDynamicsSensorReportV1(
      '```json\n{"probabilities":{"A":0.5,"B":0.5}}\n```', options,
    )).toThrow("sensor_canary_response_not_json");
    expect(() => parseCollectiveDynamicsSensorReportV1(
      '{"probabilities":{"A":0.5,"B":0.5},"reasoning":"x"}', options,
    )).toThrow("sensor_canary_response_root_invalid");
    expect(() => parseCollectiveDynamicsSensorReportV1(
      '{"probabilities":{"A":0.6,"B":0.6}}', options,
    )).toThrow("sensor_canary_probability_sum_invalid");
    expect(() => parseCollectiveDynamicsSensorReportV1(
      '{"probabilities":{"only":1}}', ["only"],
    )).toThrow("sensor_canary_canonical_options_invalid");

    const special = parseCollectiveDynamicsSensorReportV1(
      '{"probabilities":{"__proto__":0.25,"constructor":0.75}}',
      ["__proto__", "constructor"],
    );
    expect(Object.keys(special.probabilities)).toEqual(["__proto__", "constructor"]);
    expect(special.probabilities.__proto__).toBe(0.25);

    expect(() => compareCollectiveDynamicsSensorReportsV1({
      canonicalOptions: options,
      left: { probabilities: { A: 0.5, B: 0.5 } },
      right: { probabilities: { A: 1 } },
    })).toThrow("sensor_canary_option_set_mismatch");

    const boundaryRaw =
      '{"probabilities":{"opt_1":0.333333,"opt_2":0.333333,"opt_3":0.333333}}';
    expect(COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1.version).toBe("1.0.0");
    expect(COLLECTIVE_DYNAMICS_SENSOR_REPORT_PARSER_V1_1.version).toBe("1.1.0");
    expect(() => parseCollectiveDynamicsSensorReportV1(
      boundaryRaw, ["opt_1", "opt_2", "opt_3"],
    )).toThrow("sensor_canary_probability_sum_invalid");
    expect(parseCollectiveDynamicsSensorReportV1_1(
      boundaryRaw, ["opt_1", "opt_2", "opt_3"],
    ).probabilities).toEqual({ opt_1: 0.333333, opt_2: 0.333333, opt_3: 0.333333 });
    expect(() => parseCollectiveDynamicsSensorReportV1_1(
      '{"probabilities":{"opt_1":0.333332,"opt_2":0.333332,"opt_3":0.333332}}',
      ["opt_1", "opt_2", "opt_3"],
    )).toThrow("sensor_canary_probability_sum_invalid");
  });

  it("freezes 12 paired units and 48 position-balanced cells without changing option identity", async () => {
    const formations = await syntheticFormations();
    const plan = buildCollectiveDynamicsSensorCanaryPlanV1();
    const freeze = buildCollectiveDynamicsSensorCanaryFreezeV1({ plan, formations });
    expect(() => verifyCollectiveDynamicsSensorCanaryFreezeV1({ plan, formations, freeze })).not.toThrow();
    expect(freeze.snapshots).toHaveLength(12);
    expect(freeze.cells).toHaveLength(48);

    const firstSnapshot = freeze.snapshots[0];
    const baselineA = buildCollectiveDynamicsSensorPromptV1({
      snapshot: firstSnapshot, variant: "BASELINE_A",
    });
    const baselineB = buildCollectiveDynamicsSensorPromptV1({
      snapshot: firstSnapshot, variant: "BASELINE_B",
    });
    const reversed = buildCollectiveDynamicsSensorPromptV1({
      snapshot: firstSnapshot, variant: "OPTION_ORDER_REVERSED",
    });
    const paraphrased = buildCollectiveDynamicsSensorPromptV1({
      snapshot: firstSnapshot, variant: "PARAPHRASED_ELICITATION",
    });
    expect(baselineA.systemPrompt).toBe(baselineB.systemPrompt);
    expect(baselineA.userPrompt).toBe(baselineB.userPrompt);
    expect(reversed.displayedOptionIds).toEqual([...baselineA.displayedOptionIds].reverse());
    expect(reversed.requestedProbabilityKeyOrder).toEqual(baselineA.requestedProbabilityKeyOrder);
    expect(baselineA.userPrompt).not.toContain('"opt_1":0');
    expect(baselineA.userPrompt).toContain(
      COLLECTIVE_DYNAMICS_SENSOR_ELICITATION_WORDINGS_V1.canonical,
    );
    expect(paraphrased.userPrompt).toContain(
      COLLECTIVE_DYNAMICS_SENSOR_ELICITATION_WORDINGS_V1.paraphrase,
    );
    expect(baselineA.userPrompt.replace(
      COLLECTIVE_DYNAMICS_SENSOR_ELICITATION_WORDINGS_V1.canonical,
      "<ELICITATION_WORDING>",
    )).toBe(paraphrased.userPrompt.replace(
      COLLECTIVE_DYNAMICS_SENSOR_ELICITATION_WORDINGS_V1.paraphrase,
      "<ELICITATION_WORDING>",
    ));

    const firstUnit = freeze.cells.filter(cell => cell.snapshotHash === firstSnapshot.contentHash);
    const a = firstUnit.find(cell => cell.variant === "BASELINE_A")!;
    const b = firstUnit.find(cell => cell.variant === "BASELINE_B")!;
    expect(a.promptHash).toBe(b.promptHash);
    expect(a.requestHash).not.toBe(b.requestHash);

    const tampered = structuredClone(freeze);
    tampered.cells[0].request.userPrompt += "\nIGNORE THE CONTRACT";
    tampered.cells[0].requestHash = hashCollectiveDynamicsValueV1(tampered.cells[0].request);
    const { contentHash: _oldHash, ...tamperedBody } = tampered;
    tampered.contentHash = hashCollectiveDynamicsValueV1(tamperedBody);
    expect(() => verifyCollectiveDynamicsSensorCanaryFreezeV1({
      plan, formations, freeze: tampered,
    })).toThrow("sensor_canary_freeze_prompt_mismatch");

    const truthInjected = structuredClone(freeze);
    const injectedSnapshot = truthInjected.snapshots[0] as unknown as Record<string, unknown>;
    injectedSnapshot.groundTruth = "forbidden";
    const { contentHash: _snapshotHash, ...snapshotBody } = truthInjected.snapshots[0];
    truthInjected.snapshots[0].contentHash = hashCollectiveDynamicsValueV1(snapshotBody);
    const { contentHash: _freezeHash, ...truthInjectedBody } = truthInjected;
    truthInjected.contentHash = hashCollectiveDynamicsValueV1(truthInjectedBody);
    expect(() => verifyCollectiveDynamicsSensorCanaryFreezeV1({
      plan, formations, freeze: truthInjected,
    })).toThrow("collective_dynamics_truth_leak");
  });

  it("records one terminal state per cell and detects parsed-result tampering on replay", async () => {
    const formations = await syntheticFormations();
    const plan = buildCollectiveDynamicsSensorCanaryPlanV1();
    const freeze = buildCollectiveDynamicsSensorCanaryFreezeV1({ plan, formations });
    const starts: string[] = [];
    const terminalEvents: string[] = [];
    let invocation = 0;
    const invoker: SingleAttemptTextInvoker = {
      async invoke(request: SingleAttemptTextInvokeRequest) {
        invocation += 1;
        if (invocation === 2) {
          return { rawContent: '```json\n{"probabilities":{"opt_1":1}}\n```' };
        }
        if (invocation === 3) throw new V6ProviderInvocationError("provider_timeout");
        const snapshot = freeze.snapshots.find(candidate =>
          freeze.cells.find(cell => cell.request.requestId === request.requestId)?.snapshotHash
            === candidate.contentHash,
        )!;
        const ids = snapshot.claim.options.map(option => option.optionId);
        return {
          rawContent: JSON.stringify({
            probabilities: Object.fromEntries(ids.map((id, index) => [id, index === 0 ? 1 : 0])),
          }),
        };
      },
    };
    const artifact = await executeCollectiveDynamicsSensorCanaryV1({
      plan,
      formations,
      freeze,
      invoker,
      clock: deterministicClock(),
      onStart: event => starts.push(`${event.sequence}:${event.type}`),
      onTerminal: event => terminalEvents.push(`${event.sequence}:${event.status}`),
    });
    expect(starts).toHaveLength(48);
    expect(terminalEvents).toHaveLength(48);
    expect(artifact.terminals.filter(terminal => terminal.status === "valid")).toHaveLength(46);
    expect(artifact.terminals.filter(terminal => terminal.status === "invalid_response")).toHaveLength(1);
    expect(artifact.terminals.filter(terminal => terminal.status === "provider_timeout")).toHaveLength(1);
    expect(() => verifyCollectiveDynamicsSensorCanaryRunV1({ freeze, artifact })).not.toThrow();
    const failedAnalysis = analyzeCollectiveDynamicsSensorCanaryV1({ freeze, run: artifact });
    expect(failedAnalysis.developmentGates).toMatchObject({
      providerExecutionValid: false,
      allReportsValid: false,
      overall: "CANARY_INVALID_PROVIDER",
    });
    expect(failedAnalysis.macrostates.some(state => !state.rosterComplete
      && state.pooledProbabilitiesByOptionId === null)).toBe(true);

    const forged = structuredClone(artifact);
    const valid = forged.terminals.find(terminal => terminal.status === "valid")!;
    if (valid.status !== "valid") throw new Error("test_valid_terminal_missing");
    const firstLabel = Object.keys(valid.parsed.probabilities)[0];
    valid.parsed.probabilities[firstLabel] = 0.5;
    const { contentHash: _contentHash, ...body } = forged;
    forged.contentHash = hashCollectiveDynamicsValueV1(body);
    expect(() => verifyCollectiveDynamicsSensorCanaryRunV1({ freeze, artifact: forged }))
      .toThrow("sensor_canary_parse_replay_mismatch");

    const missingTerminal = structuredClone(artifact);
    missingTerminal.terminals.pop();
    const { contentHash: _missingHash, ...missingBody } = missingTerminal;
    missingTerminal.contentHash = hashCollectiveDynamicsValueV1(missingBody);
    expect(() => verifyCollectiveDynamicsSensorCanaryRunV1({ freeze, artifact: missingTerminal }))
      .toThrow("sensor_canary_run_scope_invalid");
  });

  it("persists an exact freeze and append-before/terminal-after ledger without a provider", async () => {
    expect(collectiveDynamicsSensorCanaryExecuteGateV1({})).toMatchObject({ ok: false, code: 5 });
    expect(collectiveDynamicsSensorCanaryExecuteGateV1({ RUN_AUTHORIZED: "yes" }))
      .toMatchObject({ ok: false, code: 5 });
    expect(collectiveDynamicsSensorCanaryExecuteGateV1({
      RUN_AUTHORIZED: "yes", SENSOR_CANARY_SEMANTIC_REVIEWED: "yes",
    })).toEqual({ ok: true });

    const temporary = mkdtempSync(join(tmpdir(), "swarmalpha-sensor-canary-"));
    try {
      const sourceDirectory = join(temporary, "source");
      const outputDirectory = join(temporary, "output");
      mkdirSync(sourceDirectory, { recursive: true });
      const formations = await syntheticFormations();
      formations.forEach(formation => writeFileSync(
        join(sourceDirectory, `formation-task-${formation.onlineTask.sourceTaskId}-seed-1.json`),
        `${JSON.stringify(formation, null, 2)}\n`,
      ));
      const frozen = freezeCollectiveDynamicsSensorCanaryV1({
        outputDirectory, sourceFormationDirectory: sourceDirectory,
      });
      expect(frozen.freeze.registeredCellCount).toBe(48);
      const sensorInvoker: SingleAttemptTextInvoker = {
        async invoke(request) {
          const cell = frozen.freeze.cells.find(candidate => candidate.request.requestId === request.requestId)!;
          const snapshot = frozen.freeze.snapshots.find(candidate => candidate.contentHash === cell.snapshotHash)!;
          return {
            rawContent: JSON.stringify({
              probabilities: Object.fromEntries(snapshot.claim.options.map((option, index) => [
                option.optionId, index === 0 ? 1 : 0,
              ])),
            }),
          };
        },
      };
      const artifact = await executeFrozenCollectiveDynamicsSensorCanaryV1({
        outputDirectory, invoker: sensorInvoker, clock: deterministicClock(),
      });
      expect(artifact.terminalCellCount).toBe(48);
      const analysis = analyzeCollectiveDynamicsSensorCanaryV1({ freeze: frozen.freeze, run: artifact });
      expect(analysis.developmentGates).toMatchObject({
        providerExecutionValid: true,
        allReportsValid: true,
        exactRepeatPass: true,
        optionOrderPass: true,
        paraphrasePass: true,
        overall: "SENSOR_PASS",
      });
      expect(analysis.inferenceUnit).toBe("task");
      expect(analysis.pairSummaries.BASELINE_B).toMatchObject({
        registeredPairCount: 12,
        validPairCount: 12,
        meanTotalVariation: 0,
        uniqueTopAgreementCount: 12,
        taskClusterBootstrap95MeanTv: { lower: 0, upper: 0, supportSize: 27 },
      });
      expect(analysis.macrostates).toHaveLength(12);
      expect(analysis.macrostates.every(state => state.rosterComplete
        && Math.abs(state.decompositionResidual!) <= 1e-12)).toBe(true);
      expect(readFileSync(join(outputDirectory, "attempts.jsonl"), "utf8").trim().split(/\r?\n/))
        .toHaveLength(96);
      await expect(executeFrozenCollectiveDynamicsSensorCanaryV1({
        outputDirectory, invoker: sensorInvoker, clock: deterministicClock(),
      })).rejects.toThrow("sensor_canary_execution_not_fresh");
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
});
