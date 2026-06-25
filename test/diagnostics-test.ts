/** Smoke tests for v9 diagnostics engine — mixed signal scenarios */
import { runSwarmV9 } from "../src/lib/agents/v9";

async function test(name: string, config: Parameters<typeof runSwarmV9>[0]) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"═".repeat(60)}`);
  const r = await runSwarmV9(config);
  const d = r.diagnostics;

  console.log(`共识: ${r.finalDecision.consensus.toFixed(1)} | 方向: ${r.finalDecision.direction} | std: ${r.finalDecision.beliefStd.toFixed(1)} | 置信: ${r.finalDecision.confidence}`);
  console.log(`\n🔍 ${d.summary.coreFinding}`);
  console.log(`⚙️  ${d.summary.consensusMechanism}`);
  console.log(`\n📊 归因:`);
  for (const a of d.attribution) {
    console.log(`  ${a.emoji} ${a.agentName.padEnd(13)} 信念:${String(a.belief.toFixed(0)).padStart(4)}  贡献:${String(a.contributionPct).padStart(3)}%  ${a.direction.padEnd(9)} 盲区:[${a.visibleFactors.join(",")}]`);
  }
  console.log(`\n⚔️  联盟: 多头[${d.coalition.bullishCoalition.agentIds.join(",")}] 影响力:${d.coalition.bullishCoalition.totalInfluence} | 空头[${d.coalition.bearishCoalition.agentIds.join(",")}] 影响力:${d.coalition.bearishCoalition.totalInfluence}`);
  console.log(`  力量比: ${d.coalition.powerRatio}:1 | 主导: ${d.coalition.dominantCoalition} | 对抗: ${d.coalition.tension} | 摇摆: [${d.coalition.swingAgents.join(",")}]`);
  console.log(`\n🔄 关键反事实:`);
  for (const v of d.counterfactuals.variants.filter(x => x.impact === "CRITICAL" || x.impact === "SIGNIFICANT")) {
    console.log(`  ${v.label}: 共识→${v.consensus.toFixed(1)} Δ=${v.deltaConsensus.toFixed(1)} ${v.directionFlipped ? "⚠️翻转" : ""} [${v.impact}]`);
  }
  const blind = d.counterfactuals.variants.find(v => v.disableBlindness);
  if (blind) console.log(`  关闭盲区: 共识→${blind.consensus.toFixed(1)} Δ=${blind.deltaConsensus.toFixed(1)} ${blind.directionFlipped ? "⚠️翻转" : ""}`);
  console.log(`  韧性: 需移除${d.counterfactuals.agentsToFlip}个Agent翻转方向 | 最关键: ${d.counterfactuals.mostInfluentialAgent}`);
}

async function main() {
  // Scenario 1: COVID crash — liquidity crisis + policy + narrative panic
  await test("🦠 新冠熔断: 流动性枯竭 + 政策兜底 + 恐慌叙事", {
    news: "新冠疫情全球爆发，美股四次熔断，VIX飙升至82",
    marketData: { vix: 82, rsi: 12, dropMagnitude: 35, hasPolicyResponse: true, hasLeverageDamage: true, hasSolvencyDamage: false },
    rounds: 1,
  });

  // Scenario 2: Fed rate cut — uniformly positive
  await test("📉 美联储紧急降息: 统一利好", {
    news: "美联储宣布紧急降息50个基点，超出市场预期",
    marketData: { vix: 35, rsi: 25, dropMagnitude: 15, hasPolicyResponse: true, hasLeverageDamage: false, hasSolvencyDamage: false },
    rounds: 1,
  });

  // Scenario 3: Lehman bankruptcy — solvency crisis, no policy, structural damage
  await test("💀 雷曼破产: 偿付危机 + 无政策 + 结构性损伤", {
    news: "雷曼兄弟申请破产保护，全球金融体系面临系统性风险",
    marketData: { vix: 60, rsi: 18, dropMagnitude: 40, hasPolicyResponse: false, hasLeverageDamage: true, hasSolvencyDamage: true },
    rounds: 1,
  });

  console.log(`\n${"═".repeat(60)}`);
  console.log("✅ 全部诊断场景测试通过");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
