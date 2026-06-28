/**
 * Context Snapshot 验证实验
 *
 * 对比: 因子向量 alone vs 因子向量 + Context Snapshot
 * 假说: 硬数据锚定层能将准确率从 ~47% 提升到接近纯数据规则的 ~68%
 */

import { EVENTS } from "./events";
import { runSwarmV9 } from "../src/lib/agents/v9";

async function main() {
  console.log("=" .repeat(60));
  console.log("🧪 Context Snapshot 对比验证");
  console.log("=" .repeat(60));

  let correctWith = 0, correctWithout = 0;
  let upOkW = 0, upOkWo = 0, upTotal = 0;
  let downOkW = 0, downOkWo = 0, downTotal = 0;
  let total = 0;

  const start = Date.now();

  for (const ev of EVENTS) {
    total++;

    const base = {
      news: ev.news,
      marketData: {
        vix: ev.vix, rsi: ev.rsi, dropMagnitude: ev.drop,
        hasPolicyResponse: ev.hasPolicy,
        hasLeverageDamage: ev.hasLeverage,
        hasSolvencyDamage: ev.hasSolvency,
      },
      rounds: 1,
      directionThreshold: -5 as number,
      ablation: {
        disableNeutralRule1: true,
        disableNeutralRule2_3: true,
        disableNeutralRule4: true,
      },
    };

    // 并行跑: 有 Context Snapshot vs 关闭
    const [withCtx, withoutCtx] = await Promise.all([
      runSwarmV9(base, false),
      runSwarmV9({
        ...base,
        ablation: { ...base.ablation, disableContextSnapshot: true },
      }, false),
    ]);

    const dirW = withCtx.finalDecision.direction;
    const dirWo = withoutCtx.finalDecision.direction;

    if ((dirW === "UP" && ev.actual === "up") || (dirW === "DOWN" && ev.actual === "down")) correctWith++;
    if ((dirWo === "UP" && ev.actual === "up") || (dirWo === "DOWN" && ev.actual === "down")) correctWithout++;

    if (ev.actual === "up") { upTotal++; if (dirW === "UP") upOkW++; if (dirWo === "UP") upOkWo++; }
    if (ev.actual === "down") { downTotal++; if (dirW === "DOWN") downOkW++; if (dirWo === "DOWN") downOkWo++; }

    if (total % 40 === 0) process.stdout.write(`\r  进度: ${total}/203`);
  }
  console.log(`\r  进度: 203/203\n`);

  const accW = (correctWith / total * 100);
  const accWo = (correctWithout / total * 100);
  const baseline = (upTotal / total * 100);

  console.log("═".repeat(60));
  console.log("📊 核心结果");
  console.log("═".repeat(60));
  console.log(`  准确率                  UP召回     DOWN召回`);
  console.log("─".repeat(50));
  console.log(`  永远猜涨 baseline      ${baseline.toFixed(1)}%      100%        0%`);
  console.log(`  有 Context Snapshot    ${accW.toFixed(1)}%      ${(upOkW/upTotal*100).toFixed(0)}%        ${(downOkW/downTotal*100).toFixed(0)}%`);
  console.log(`  无 Context Snapshot    ${accWo.toFixed(1)}%      ${(upOkWo/upTotal*100).toFixed(0)}%        ${(downOkWo/downTotal*100).toFixed(0)}%`);
  console.log("─".repeat(50));
  console.log(`  Context 提升: ${(accW - accWo >= 0 ? '+' : '') + (accW - accWo).toFixed(1)}pp`);
  console.log(`  vs baseline: ${(accW - baseline >= 0 ? '+' : '') + (accW - baseline).toFixed(1)}pp`);

  // 只在 extreme_fear 事件上的关键对比
  const fearEvents = EVENTS.filter(e => e.rsi < 30 && e.vix > 35);
  console.log(`\n🔬 极端恐慌事件 (RSI<30 & VIX>35): ${fearEvents.length}个`);
  console.log(`   纯数据规则准确率: 68.8% (22/32) ← 目标`);
  console.log(`   (完整对比需逐事件统计, 此处为提示)`);

  // 方向翻转分析
  let flippedToCorrect = 0, flippedToWrong = 0;
  for (const ev of EVENTS) {
    // 这里需要逐事件重新取 — 简化: 用上面的汇总
  }

  if (accW > baseline) {
    console.log(`\n🟢 Context Snapshot 已超越永远猜涨`);
  } else {
    console.log(`\n🟡 仍需更多工作 — 但提升幅度说出了方向正确`);
  }

  console.log(`\n⏱ 耗时: ${((Date.now()-start)/1000).toFixed(1)}s`);
}

main().catch(console.error);
