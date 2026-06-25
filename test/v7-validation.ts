/**
 * 🧪 SwarmAlpha V7 — 涌现验证 (Emergence Validation)
 *
 * 不测准确率。只测三件事:
 *   1. Reflexivity — 价格变化是否影响下一轮信念？
 *   2. Heterogeneity — 不同决策函数是否产生本质不同的响应？
 *   3. Decentralization — 不同Agent观察不同维度是否产生信息不对称？
 *
 * 运行: npx tsx test/v7-validation.ts
 */

import { runSwarmV7, V7_AGENTS } from "../src/lib/agents/v7";
import { agentObserve, buildWorldModel } from "../src/lib/agents/v7/worldModel";
import { getDecisionFunction } from "../src/lib/agents/v7/decisionFunctions";
import { calculateStdDev } from "../src/lib/utils/emotion";

function main() {
  console.log("🧪 SwarmAlpha V7 — 涌现验证");
  console.log("=".repeat(60));

  // ==================== TEST 1: Reflexivity ====================
  console.log("\n📋 测试1: 反身性 (Reflexivity)");
  console.log("   价格变化 → 叙事冲击 → 下一轮信念变化 ?");

  const result = runSwarmV7(
    {
      price: 3000, vix: 45, rsi: 15, dropMagnitude: 25,
      volatility: 0.04, volumeSpike: 2.5,
      hasPolicyResponse: false, hasLeverageDamage: true, hasSolvencyDamage: true,
    },
    5, // 5 rounds to observe reflexivity loop
    3000,
  );

  // 检查: 每一轮是否有信念变化（说明叙事在影响Agent）
  let roundsWithNarrativeImpact = 0;
  for (let i = 1; i < result.rounds.length; i++) {
    const prevRound = result.rounds[i - 1];
    const currRound = result.rounds[i];
    const narrative = currRound.narrative;
    if (narrative && narrative.shockStrength > 10) {
      // Check if any agent's belief changed significantly
      for (const agent of V7_AGENTS) {
        const prevAgent = prevRound.agents[agent.id];
        const currAgent = currRound.agents[agent.id];
        if (prevAgent && currAgent && Math.abs(currAgent.belief - prevAgent.belief) > 5) {
          roundsWithNarrativeImpact++;
          break;
        }
      }
    }
  }

  console.log(`   反身性轮次: ${roundsWithNarrativeImpact}/${result.rounds.length - 1}`);
  console.log(`   反身性评分: ${result.reflexivityScore}/100`);
  console.log(`   涌现评分: ${result.emergenceScore}/100`);

  // Print the reflexive loop
  console.log("\n   反身性闭环轨迹:");
  for (let i = 0; i < result.rounds.length; i++) {
    const r = result.rounds[i];
    const cascades = r.cascadeEvents.map((c) => c.type).join(",") || "无";
    console.log(`   R${r.round}: 共识=${r.consensus.toFixed(1)} ` +
      `价格=${r.worldModel.price.toFixed(0)}(Δ${r.worldModel.priceChange}%) ` +
      `叙事="${r.narrative?.headline?.slice(0, 50) ?? "无"}" ` +
      `级联=${cascades}`);
  }

  const reflexivityPass = result.reflexivityScore > 30;
  console.log(`\n   ${reflexivityPass ? "✅" : "⚠️"} 反身性: ${result.reflexivityScore}/100 ${reflexivityPass ? "— 价格变化确实影响信念" : "— 反馈强度不足，需增强叙事冲击系数"}`);

  // ==================== TEST 2: Heterogeneity ====================
  console.log("\n📋 测试2: 异质决策 (Heterogeneity)");
  console.log("   同一世界状态 → 不同决策函数 → 本质不同的响应？");

  // 构建一个中等恐慌的世界状态
  const world = buildWorldModel({
    price: 2700, previousPrice: 3000,
    vix: 38, rsi: 22, dropMagnitude: 12,
    volatility: 0.03, volumeSpike: 2.0,
    hasPolicyResponse: true, hasLeverageDamage: false, hasSolvencyDamage: false,
    consensus: -30, consensusDirection: "down",
    regime: "LIQUIDITY_CRISIS", round: 1,
  });

  // 测试每个Agent在同一世界下的决策
  console.log("\n   Agent决策差异:");
  const agentResults: Array<{ agent: string; fn: string; belief: number; conf: number; action: string }> = [];

  for (const agent of V7_AGENTS) {
    const observed = agentObserve(agent, world);
    const fn = getDecisionFunction(agent.decisionFunctionType);
    const output = fn.execute({
      agent,
      currentBelief: agent.initialBias,
      currentConfidence: agent.confidence,
      observedInfo: observed,
      worldState: world,
      consensus: -30,
      round: 1,
    });

    agentResults.push({
      agent: `${agent.emoji} ${agent.name}`,
      fn: agent.decisionFunctionType,
      belief: output.newBelief,
      conf: output.newConfidence,
      action: output.tradeAction,
    });
  }

  // 按belief排序展示差异
  agentResults.sort((a, b) => b.belief - a.belief);
  for (const r of agentResults) {
    console.log(`   ${r.agent.padEnd(14)} [${r.fn.padEnd(11)}] → belief=${String(r.belief).padStart(4)} conf=${r.conf} ${r.action}`);
  }

  // 计算belief的标准差 — 越大说明异质性越强
  const beliefs = agentResults.map((r) => r.belief);
  const stdDev = calculateStdDev(beliefs);
  const heterogeneityPass = stdDev > 30;

  console.log(`\n   Belief标准差: ${stdDev.toFixed(1)} (V6同构系统≈15-20)`);
  console.log(`   ${heterogeneityPass ? "✅" : "⚠️"} 异质性: std=${stdDev.toFixed(1)} ${heterogeneityPass ? "> 30 — 决策函数产生本质不同响应" : "— 不同决策函数的差异不够大"}`);

  // ==================== TEST 3: Decentralization ====================
  console.log("\n📋 测试3: 去中心化观察 (Decentralization)");
  console.log("   不同Agent从同一世界模型观察不同维度？");

  const observeResults: Array<{ agent: string; dims: number; keys: string }> = [];
  for (const agent of V7_AGENTS) {
    const observed = agentObserve(agent, world);
    observeResults.push({
      agent: `${agent.emoji} ${agent.name}`,
      dims: Object.keys(observed).length,
      keys: agent.observeDimensions.slice(0, 4).join(","),
    });
  }

  for (const r of observeResults) {
    console.log(`   ${r.agent.padEnd(14)} 观察${r.dims}维: ${r.keys}`);
  }

  // 检查是否有信息不对称: 不同Agent看到不同的信息集合
  const dimensionSets = V7_AGENTS.map((a) => new Set(a.observeDimensions));
  let asymmetricCount = 0;
  for (let i = 0; i < dimensionSets.length; i++) {
    for (let j = i + 1; j < dimensionSets.length; j++) {
      const intersection = new Set([...dimensionSets[i]].filter((x) => dimensionSets[j].has(x)));
      if (intersection.size < Math.min(dimensionSets[i].size, dimensionSets[j].size) * 0.8) {
        asymmetricCount++;
      }
    }
  }

  const totalPairs = dimensionSets.length * (dimensionSets.length - 1) / 2;
  const asymmetricRatio = asymmetricCount / totalPairs;
  const decentralizationPass = asymmetricRatio > 0.5;

  console.log(`\n   信息不对称Agent对: ${asymmetricCount}/${totalPairs} (${(asymmetricRatio*100).toFixed(0)}%)`);
  console.log(`   ${decentralizationPass ? "✅" : "⚠️"} 去中心化: ${(asymmetricRatio*100).toFixed(0)}% Agent对观察不同维度 ${decentralizationPass ? "— 信息获取已去中心化" : "— 观察维度重叠过多"}`);

  // ==================== TEST 4: Anti-Voting V7 ====================
  console.log("\n📋 测试4: V7反投票 (V7 Anti-Voting)");
  console.log("   V7的影响力加权 vs 纯投票的差异？");

  // Run a quick single-round comparison
  const finalRound = result.rounds[result.rounds.length - 1];
  const v7Consensus = finalRound.consensus;
  const v7Beliefs = Object.values(finalRound.agents).map((s) => s.belief);
  const bareMean = v7Beliefs.reduce((a, b) => a + b, 0) / v7Beliefs.length;
  const v7Diff = Math.abs(v7Consensus - bareMean);

  console.log(`   V7共识(影响力加权): ${v7Consensus.toFixed(1)}`);
  console.log(`   纯投票(mean):       ${bareMean.toFixed(1)}`);
  console.log(`   差异: ${v7Diff.toFixed(1)}pt (V6=6.7pt)`);

  const antiVotingPass = v7Diff > 10;
  console.log(`   ${antiVotingPass ? "✅" : "⚠️"} 反投票: V7差异=${v7Diff.toFixed(1)}pt ${antiVotingPass ? "> 10pt — 异质决策+反身性创造了真正的差异" : "— 仍接近投票器"}`);

  // ==================== SUMMARY ====================
  console.log("\n" + "=".repeat(60));
  console.log("📊 V7 涌现验证总结");
  console.log("-".repeat(40));

  const tests = [
    { name: "反身性 (Reflexivity)", pass: reflexivityPass, metric: `${result.reflexivityScore}/100` },
    { name: "异质决策 (Heterogeneity)", pass: heterogeneityPass, metric: `std=${stdDev.toFixed(1)}` },
    { name: "去中心化 (Decentralization)", pass: decentralizationPass, metric: `${(asymmetricRatio*100).toFixed(0)}%` },
    { name: "反投票 (Anti-Voting)", pass: antiVotingPass, metric: `${v7Diff.toFixed(1)}pt` },
  ];

  let passed = 0;
  for (const t of tests) {
    const mark = t.pass ? "✅" : "⚠️";
    console.log(`   ${mark} ${t.name}: ${t.metric}`);
    if (t.pass) passed++;
  }

  console.log(`\n   通过: ${passed}/${tests.length}`);
  console.log(`   反身性评分: ${result.reflexivityScore}/100`);
  console.log(`   涌现评分: ${result.emergenceScore}/100`);

  // 级联事件统计
  if (result.cascadeHistory.length > 0) {
    console.log(`\n   级联事件 (${result.cascadeHistory.length}):`);
    const cascadeTypes = new Map<string, number>();
    for (const c of result.cascadeHistory) {
      cascadeTypes.set(c.type, (cascadeTypes.get(c.type) ?? 0) + 1);
    }
    for (const [type, count] of cascadeTypes) {
      console.log(`     ${type}: ${count}次`);
    }
  }

  // 相变统计
  if (result.phaseTransitionHistory.length > 0) {
    console.log(`\n   相变 (${result.phaseTransitionHistory.length}):`);
    for (const pt of result.phaseTransitionHistory) {
      console.log(`     ${pt.fromRegime} → ${pt.toRegime} (急剧度:${pt.abruptness})`);
    }
  }

  if (passed >= 3) {
    console.log("\n🏆 V7 核心突破已验证: 异质决策 + 去中心化观察 + 反身性闭环");
    console.log("✅ Emergent Market Society 基础架构就绪");
  } else {
    console.log("\n⚠️ 部分突破待验证 — 检查薄弱项");
  }
}

main();
