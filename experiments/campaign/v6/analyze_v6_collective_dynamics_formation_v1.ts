/** Offline-only formation incidence and sensor-degeneracy analysis. */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import {
  classifyStrictConsensusV1,
  hashCollectiveDynamicsValueV1,
  uniqueTopOptionV1,
  verifyCollectiveDynamicsManifestV1,
  verifyFormationArtifactV1,
  type CollectiveDynamicsFormationArtifactV1,
  type CollectiveDynamicsManifestV1,
  type CollectiveDynamicsPlanV1,
} from "./collectiveDynamicsV1";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function brier(options: readonly string[], probabilities: Readonly<Record<string, number>>, outcome: string): number {
  return options.reduce((sum, option) => sum
    + (probabilities[option] - (option === outcome ? 1 : 0)) ** 2, 0);
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function analyzeCollectiveDynamicsFormationDirectoryV1(outputDir: string) {
  const plan = readJson<CollectiveDynamicsPlanV1>(join(outputDir, "plan.json"));
  const { contentHash: planHash, ...planBody } = plan;
  if (hashCollectiveDynamicsValueV1(planBody) !== planHash) throw new Error("collective_dynamics_plan_hash_mismatch");
  const formationFiles = readdirSync(outputDir)
    .filter(name => /^formation-task-\d+-seed--?\d+\.json$/.test(name)).sort();
  const formations = formationFiles.map(file => {
    const artifact = readJson<CollectiveDynamicsFormationArtifactV1>(join(outputDir, file));
    verifyFormationArtifactV1(artifact);
    if (artifact.planHash !== plan.contentHash) throw new Error("collective_dynamics_formation_plan_mismatch");
    return artifact;
  });
  const manifest = readJson<CollectiveDynamicsManifestV1>(join(outputDir, "formation-manifest.json"));
  verifyCollectiveDynamicsManifestV1({ plan, manifest, formations, responses: [] });

  const tasks = formations.map(formation => {
    const { onlineTask } = formation;
    // Canonical outcome is loaded only here, after provider execution is closed.
    const outcome = createHiddenBenchTaskProjectionV1({ sourceTaskId: onlineTask.sourceTaskId }).adapter.task.outcome;
    const expectedAgentIds = onlineTask.agents.map(agent => agent.agentId);
    const rounds = formation.rounds.map(round => {
      if (round.state.pooledBelief.kind !== "categorical") throw new Error("formation_analysis_non_categorical");
      const probabilities = round.state.pooledBelief.probabilities;
      const consensus = classifyStrictConsensusV1({ claim: onlineTask.claim, expectedAgentIds, reports: round.reports });
      const individualMaxima = round.reports.map(report => {
        if (report.value.kind !== "categorical") throw new Error("formation_analysis_non_categorical_report");
        return Math.max(...onlineTask.claim.options.map(option => report.value.kind === "categorical"
          ? report.value.probabilities[option] : 0));
      });
      return {
        round: round.round,
        pooledTop: uniqueTopOptionV1(onlineTask.claim, probabilities),
        pooledCertainty: round.state.pooledCertainty,
        withinAgentUncertainty: round.state.withinAgentUncertainty,
        betweenAgentDisagreement: round.state.betweenAgentDisagreement,
        pooledBrier: brier(onlineTask.claim.options, probabilities, outcome),
        strictConsensusOption: consensus.option,
        strictConsensusCorrect: consensus.status === "strict_consensus" ? consensus.option === outcome : null,
        oneHotReportFraction: individualMaxima.filter(value => value === 1).length / individualMaxima.length,
        updateActivityFromPrior: round.updateActivityFromPrior,
      };
    });
    const first = rounds[0];
    const final = rounds[2];
    const epsilon = 1e-12;
    const r3Stratum = final.strictConsensusOption === null
      ? "no_strict_consensus"
      : final.strictConsensusOption === outcome ? "correct_consensus" : "wrong_consensus";
    return {
      taskId: onlineTask.taskId,
      sourceTaskId: onlineTask.sourceTaskId,
      seed: formation.seed,
      outcome,
      rounds,
      r3Stratum,
      wrongConsensusFormed: r3Stratum === "wrong_consensus"
        && first.strictConsensusCorrect !== false,
      errorAmplifyingConcentrationSignature:
        final.betweenAgentDisagreement < first.betweenAgentDisagreement - epsilon
        && final.pooledCertainty > first.pooledCertainty + epsilon
        && final.pooledBrier > first.pooledBrier + epsilon,
      r1ToR3: {
        disagreementDelta: final.betweenAgentDisagreement - first.betweenAgentDisagreement,
        pooledCertaintyDelta: final.pooledCertainty - first.pooledCertainty,
        pooledBrierDelta: final.pooledBrier - first.pooledBrier,
      },
      totalTokens: formation.providerCalls.reduce((sum, call) => sum + (call.usage?.totalTokens ?? 0), 0),
      allTokenUsageObserved: formation.providerCalls.every(call => call.usage?.totalTokens !== undefined),
      contentHash: formation.contentHash,
      r3SnapshotHash: formation.r3SnapshotHash,
    };
  });
  const allRounds = tasks.flatMap(task => task.rounds);
  const revisionSteps = allRounds.filter(round => round.round > 1);
  const body = {
    analysisRef: { id: "swarmalpha.analysis.v6.collective-dynamics-formation", version: "1.0.0" },
    status: "offline_formation_analysis" as const,
    planHash: plan.contentHash,
    manifestHash: manifest.contentHash,
    tasks,
    summary: {
      taskCount: tasks.length,
      r3WrongConsensusCount: tasks.filter(task => task.r3Stratum === "wrong_consensus").length,
      r3CorrectConsensusCount: tasks.filter(task => task.r3Stratum === "correct_consensus").length,
      r3NoStrictConsensusCount: tasks.filter(task => task.r3Stratum === "no_strict_consensus").length,
      wrongConsensusFormationCount: tasks.filter(task => task.wrongConsensusFormed).length,
      errorAmplifyingConcentrationSignatureCount: tasks.filter(task => task.errorAmplifyingConcentrationSignature).length,
      meanOneHotReportFraction: mean(allRounds.map(round => round.oneHotReportFraction)),
      zeroUpdateStepFraction: revisionSteps.filter(round => round.updateActivityFromPrior === 0).length / revisionSteps.length,
      meanR1ToR3DisagreementDelta: mean(tasks.map(task => task.r1ToR3.disagreementDelta)),
      meanR1ToR3PooledCertaintyDelta: mean(tasks.map(task => task.r1ToR3.pooledCertaintyDelta)),
      meanR1ToR3PooledBrierDelta: mean(tasks.map(task => task.r1ToR3.pooledBrierDelta)),
      totalObservedTokens: tasks.reduce((sum, task) => sum + task.totalTokens, 0),
      allTokenUsageObserved: tasks.every(task => task.allTokenUsageObserved),
    },
    claimCeiling: "instrument_screen_only_not_collective_dynamics_effect_evidence" as const,
  };
  return { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
}

function main(): number {
  const directory = process.argv.find(argument => argument.startsWith("--dir="))?.slice("--dir=".length);
  if (!directory) {
    console.error("usage: --dir=<formation-artifact-directory>");
    return 2;
  }
  const outputDir = resolve(process.cwd(), directory);
  const analysis = analyzeCollectiveDynamicsFormationDirectoryV1(outputDir);
  const file = join(outputDir, "formation-analysis.json");
  const text = `${JSON.stringify(analysis, null, 2)}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") !== text) {
    throw new Error("collective_dynamics_formation_analysis_no_overwrite_conflict");
  }
  if (!existsSync(file)) writeFileSync(file, text, "utf8");
  console.log(JSON.stringify({ status: "analyzed", summary: analysis.summary, contentHash: analysis.contentHash }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
