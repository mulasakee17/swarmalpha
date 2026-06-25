/**
 * 🧪 非线性共识聚合 — 准确率对比
 *
 * 对比 4 种共识方法在 14 事件上的方向准确率:
 *   1. weighted (v6默认) — 影响力加权平均
 *   2. trimmed — 修剪最极端的2个Agent
 *   3. median — 中位数
 *   4. cascade — 级联状态下降权
 *
 * 运行: npx tsx test/consensus-benchmark.ts
 */

import { V6_PERSONAS } from "../src/lib/agents/v6/personas";
import {
  computeWeightedConsensus,
  computeTrimmedConsensus,
  computeMedianConsensus,
  computeCascadeAdjustedConsensus,
} from "../src/lib/agents/v6/influenceSystem";
import { detectMarketRegime } from "../src/lib/agents/v6/marketRegime";
import { runConsensusRound, initializeStates } from "../src/lib/agents/v6/consensusEngine";
import { extractInformationSignals } from "../src/lib/agents/v6/beliefEngine";
import type { V6AgentBrief } from "../src/lib/agents/v6/types";

// 14 事件
const EVENTS = [
  { name:"Brexit",       vix:25.8, rsi:30, drop:5.3,  actual:"up", hasPol:true,  hasLev:false, hasSol:false },
  { name:"XmasEve",      vix:36.1, rsi:20, drop:19.8, actual:"up", hasPol:true,  hasLev:false, hasSol:false },
  { name:"LTCM",         vix:43.0, rsi:25, drop:15,   actual:"up", hasPol:true,  hasLev:true,  hasSol:false },
  { name:"Taper",        vix:19.5, rsi:35, drop:4.6,  actual:"up", hasPol:true,  hasLev:false, hasSol:false },
  { name:"Ebola",        vix:26.3, rsi:22, drop:7.4,  actual:"up", hasPol:true,  hasLev:false, hasSol:false },
  { name:"Evergrande",   vix:25.7, rsi:35, drop:4.2,  actual:"up", hasPol:true,  hasLev:true,  hasSol:true  },
  { name:"UKPension",    vix:32.0, rsi:25, drop:23.5, actual:"up", hasPol:true,  hasLev:true,  hasSol:false },
  { name:"DeepSeek",     vix:19.3, rsi:42, drop:3.5,  actual:"neutral", hasPol:false, hasLev:false, hasSol:false },
  { name:"Lehman",       vix:31.7, rsi:32, drop:22.0, actual:"down", hasPol:false, hasLev:true,  hasSol:true  },
  { name:"ChinaCrash",   vix:40.7, rsi:15, drop:40.0, actual:"down", hasPol:true,  hasLev:true,  hasSol:false },
  { name:"COVID",        vix:24.5, rsi:38, drop:3.0,  actual:"down", hasPol:false, hasLev:false, hasSol:false },
  { name:"Fed2022",      vix:18.5, rsi:45, drop:5.0,  actual:"down", hasPol:false, hasLev:false, hasSol:false },
  { name:"USDowngrade",  vix:39.0, rsi:22, drop:16.8, actual:"down", hasPol:true,  hasLev:false, hasSol:false },
  { name:"SNB",          vix:21.5, rsi:47, drop:2.3,  actual:"neutral", hasPol:false, hasLev:false, hasSol:false },
];

type ConsensusMethod = "weighted" | "trimmed" | "median" | "cascade";

// 为每个事件生成合理的非对称简报
function makeBriefsForEvent(ev: typeof EVENTS[0]): V6AgentBrief[] {
  const isCrisis = ev.drop > 5 || ev.vix > 30;
  const isRecovery = ev.hasPol && ev.rsi < 35;
  return V6_PERSONAS.map((p): V6AgentBrief => {
    let dir: "bullish" | "bearish" | "neutral";
    let strength: number;
    if (p.id === "value") {
      dir = (isRecovery || ev.rsi < 30) ? "bullish" : (ev.hasSol && !ev.hasPol ? "bearish" : "neutral");
      strength = ev.rsi < 25 ? 65 : ev.rsi < 35 ? 50 : 30;
    } else if (p.id === "trend") {
      dir = ev.drop > 5 ? "bearish" : "neutral";
      strength = ev.drop > 15 ? 80 : ev.drop > 5 ? 55 : 30;
    } else if (p.id === "panic") {
      dir = isCrisis ? "bearish" : "neutral";
      strength = ev.vix > 40 ? 90 : ev.vix > 30 ? 70 : 50;
    } else if (p.id === "quant") {
      dir = ev.rsi < 30 ? "bullish" : "neutral";
      strength = ev.rsi < 20 ? 60 : ev.rsi < 30 ? 45 : 25;
    } else if (p.id === "media") {
      dir = isCrisis ? "bearish" : "neutral";
      strength = ev.vix > 35 ? 80 : 55;
    } else if (p.id === "contrarian") {
      dir = (isCrisis && ev.rsi < 35) ? "bullish" : "neutral";
      strength = (isCrisis && ev.rsi < 30) ? 60 : 40;
    } else if (p.id === "institution") {
      dir = (isRecovery && !ev.hasSol) ? "bullish" : (ev.hasSol && !ev.hasPol ? "bearish" : "neutral");
      strength = isRecovery ? 55 : 30;
    } else {
      dir = (isCrisis && !ev.hasPol) ? "bearish" : "neutral";
      strength = (isCrisis && ev.vix > 35) ? 55 : 35;
    }
    return {
      agentId: p.id, agentName: p.name, roleDescription: p.role,
      informationSlice: `${ev.name} 简报`, blindSpot: "盲点",
      initialDirection: dir, directionStrength: strength,
    };
  });
}

function runBacktest(method: ConsensusMethod): { correct: number; upCorrect: number; downCorrect: number; details: string[] } {
  let correct = 0;
  let upCorrect = 0; let upTotal = 0;
  let downCorrect = 0; let downTotal = 0;
  const details: string[] = [];

  for (const ev of EVENTS) {
    const briefs = makeBriefsForEvent(ev);
    let states = initializeStates(briefs, V6_PERSONAS);
    const sigs = extractInformationSignals(briefs);

    const marketData = {
      vix: ev.vix, rsi: ev.rsi, dropMagnitude: ev.drop,
      volatility: ev.vix > 40 ? 0.04 : 0.02, volumeSpike: ev.vix > 30 ? 2.0 : 1.0,
      hasPolicyResponse: ev.hasPol, hasLeverageDamage: ev.hasLev, hasSolvencyDamage: ev.hasSol,
    };

    let prevConsensus = 0;
    let finalConsensus = 0;

    for (let r = 1; r <= 3; r++) {
      const output = runConsensusRound({
        round: r, states, personas: V6_PERSONAS, informationSignals: sigs,
        marketData, previousConsensus: r > 1 ? prevConsensus : undefined,
      });
      states = output.states;
      prevConsensus = output.consensus;
      finalConsensus = output.consensus;
    }

    // 按指定方法重新计算共识
    const regime = detectMarketRegime(marketData);
    let consensus: number;

    switch (method) {
      case "weighted":
        consensus = computeWeightedConsensus(states, V6_PERSONAS, regime.agentMultipliers);
        break;
      case "trimmed":
        consensus = computeTrimmedConsensus(states, V6_PERSONAS, regime.agentMultipliers, 1);
        break;
      case "median":
        consensus = computeMedianConsensus(states);
        break;
      case "cascade": {
        // 检测级联类型
        const cascadeTypes: string[] = [];
        const panic = states["panic"]?.belief ?? 0;
        const retail = states["retail"]?.belief ?? 0;
        const trend = states["trend"]?.belief ?? 0;
        if (panic < -60 && retail < -30) cascadeTypes.push("PANIC_CASCADE");
        if (retail > 60 && trend > 40) cascadeTypes.push("FOMO_CASCADE");
        consensus = computeCascadeAdjustedConsensus(states, V6_PERSONAS, regime.agentMultipliers, cascadeTypes);
        break;
      }
    }

    const dir = consensus > 10 ? "up" : consensus < -10 ? "down" : "neutral";
    const isCorrect = dir === ev.actual;
    if (isCorrect) correct++;
    if (ev.actual === "up") { upTotal++; if (isCorrect) upCorrect++; }
    if (ev.actual === "down") { downTotal++; if (isCorrect) downCorrect++; }

    details.push(`${ev.name.padEnd(13)} ${ev.actual.padEnd(7)} consensus=${consensus.toFixed(0).padStart(4)} → ${dir.padEnd(7)} ${isCorrect ? "✅" : "❌"}`);
  }

  return { correct, upCorrect, downCorrect, details };
}

function main() {
  console.log("🧪 非线性共识聚合 — 准确率对比\n");
  console.log("=".repeat(60));

  const methods: ConsensusMethod[] = ["weighted", "trimmed", "median", "cascade"];
  const results: Record<string, { correct: number; upCorrect: number; downCorrect: number; details: string[] }> = {};

  for (const method of methods) {
    results[method] = runBacktest(method);
  }

  // Summary
  console.log("\n📊 14 事件准确率对比\n");
  console.log("方法".padEnd(15) + "总".padStart(6) + "Up".padStart(8) + "Down".padStart(8));
  console.log("-".repeat(40));

  for (const method of methods) {
    const r = results[method];
    const upTotal = EVENTS.filter(e => e.actual === "up").length;
    const downTotal = EVENTS.filter(e => e.actual === "down").length;
    console.log(
      method.padEnd(15) +
      `${r.correct}/14`.padStart(6) +
      `${r.upCorrect}/${upTotal}`.padStart(8) +
      `${r.downCorrect}/${downTotal}`.padStart(8)
    );
  }

  // Best method details
  const best = methods.reduce((a, b) => results[a].correct > results[b].correct ? a : b);
  console.log(`\n🏆 最佳方法: ${best}`);
  console.log("-".repeat(40));
  for (const d of results[best].details) console.log(`  ${d}`);

  // Improvement over baseline
  const baseline = results["weighted"].correct;
  const bestScore = results[best].correct;
  console.log(`\n📈 提升: ${baseline}/14 → ${bestScore}/14 (+${bestScore - baseline}事件, +${((bestScore-baseline)/14*100).toFixed(0)}pp)`);
}

main();
