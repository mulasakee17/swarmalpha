/**
 * 🧪 信息不对称 Agent 群测试
 *
 * 验证：
 *   1. Super AI 能成功生成不对称简报
 *   2. 5 个 Agent 基于不同信息得出不同结论
 *   3. 涌现共识与直接 LLM 预测对比
 *
 * 运行: npx tsx test/asymmetric-test.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { runAsymmetricSwarm } from "../src/lib/agents/integratedEngine";

const TEST_NEWS = `2020年3月16日，美联储紧急降息100个基点至0-0.25%，并宣布至少7000亿美元的量化宽松计划。这是美联储在两周内第二次紧急降息。此前3月3日已降息50bp。标普500期货跌超4%触发熔断。新冠疫情正在全美加速蔓延，多个州宣布紧急状态。特朗普总统宣布国家紧急状态。国会正在谈判1万亿美元财政刺激方案。`;

async function main() {
  console.log("=".repeat(80));
  console.log("  🧪 信息不对称 Agent 群测试");
  console.log("=".repeat(80));
  console.log();
  console.log("📰 新闻:", TEST_NEWS.slice(0, 150) + "...");
  console.log();

  // 1. 运行不对称群
  console.log("⏳ 运行 Super AI 协调器 + 信息不对称 Agent 群...\n");
  const result = await runAsymmetricSwarm(TEST_NEWS, { provider: "deepseek", model: "deepseek-chat" }, 2);

  // 2. Super AI 分析摘要
  if (result.analysis) {
    console.log("─".repeat(80));
    console.log("🧠 Super AI 分析:");
    console.log(`  核心矛盾: ${result.analysis.coreContradiction}`);
    console.log(`  已知vs未知: ${result.analysis.knownVsUnknown}`);
    console.log(`  历史类比: ${result.analysis.historicalAnalogues}`);
    console.log(`  市场快照: VIX=${result.analysis.marketSnapshot.vix} RSI=${result.analysis.marketSnapshot.rsi} Drop=${result.analysis.marketSnapshot.dropFromPeak}%`);
    console.log();
  }

  // 3. Agent 简报摘要
  if (result.analysis?.briefs) {
    console.log("─".repeat(80));
    console.log("📋 Agent 信息不对称简报:");
    for (const b of result.analysis.briefs) {
      console.log(`\n  【${b.agentName}】`);
      console.log(`  信息切片: ${b.informationSlice.slice(0, 150)}...`);
      console.log(`  盲点: ${b.blindSpot}`);
    }
    console.log();
  }

  // 4. 博弈过程
  console.log("─".repeat(80));
  console.log("🎲 博弈过程:");
  for (const r of result.rounds) {
    console.log(`\n  Round ${r.round}:`);
    for (const [id, state] of Object.entries(r.agents)) {
      const emoji = id === "bull" ? "🐂" : id === "bear" ? "🐻" : id === "neutral" ? "⚖️" : id === "tech" ? "📊" : "🌍";
      console.log(`    ${emoji} ${id}: 情绪=${state.emotion} — ${state.reasoning?.slice(0, 80)}`);
    }
    console.log(`    → 共识: ${r.consensus.toFixed(1)}`);
  }

  // 5. 最终判断
  const consensus = result.finalConsensus;
  const direction = consensus > 10 ? "看多 ↑" : consensus < -10 ? "看空 ↓" : "中性 →";
  console.log(`\n─`.repeat(80));
  console.log(`🎯 涌现共识: ${consensus.toFixed(1)} → ${direction}`);
  console.log();

  // 备注：此事件实际结果
  console.log("📌 此事件实际结果: 2020年3月23日见底后，标普3个月反弹+38%（V型反弹）");
  console.log("   (3月16日当天无人能预见反弹——这正是最考验预测能力的时刻)");
}

main().catch(console.error);
