/**
 * 🧪 SwarmAlpha v6.0 — 14 事件严格回测
 *
 * 验证要点:
 *   1. 空头联盟是否被制衡 (Institution+Value+Contrarian vs Trend+Panic+Media)
 *   2. Up 事件准确率是否从 v5 的 14% 提升
 *   3. 共识是否不再系统性偏空
 *   4. MarketRegime 检测是否合理
 *
 * 运行: npx tsx test/v6-backtest.ts
 *
 * 无 LLM 模式 (默认): 使用模板简报，纯数学验证
 * 有 LLM 模式: 设置 RUN_WITH_LLM=true
 *   npx tsx test/v6-backtest.ts
 */

import dotenv from "dotenv"; dotenv.config({ path: ".env.local" });
import { runSwarmV6, V6SwarmResult, V6_PERSONAS, detectMarketRegime } from "../src/lib/agents/v6";
import { computeTrimmedConsensus } from "../src/lib/agents/v6/influenceSystem";

// ==================== 配置 ====================

const RUN_WITH_LLM = process.env.RUN_WITH_LLM === "true";

// ==================== 14 验证事件 ====================

interface TestEvent {
  name: string;
  date: string;
  news: string;
  vix: number;
  rsi: number;
  drop: number;
  actual: "up" | "down" | "neutral";
}

const EVENTS: TestEvent[] = [
  {
    name: "Brexit", date: "2016-06-24",
    news: "2016年6月24日，英国公投51.9%支持脱欧，远超市场预期。英镑兑美元暴跌8.1%至31年新低。全球股市重挫，标普500期货盘前跌超5%触发熔断。英国首相卡梅伦宣布辞职。英格兰银行声明准备提供2500亿英镑流动性。",
    vix: 25.8, rsi: 30, drop: 5.3, actual: "up",
  },
  {
    name: "XmasEve", date: "2018-12-24",
    news: "2018年12月24日，美股圣诞前夜交易，标普500收跌2.7%，自9月高点累计下跌19.8%。纳斯达克已入熊市。美联储12月19日刚加息25bp，暗示2019年继续收紧。姆努钦召集银行高管反而加剧恐慌。",
    vix: 36.1, rsi: 20, drop: 19.8, actual: "up",
  },
  {
    name: "LTCM", date: "1998-09-23",
    news: "1998年9月23日，纽约联储紧急召集华尔街银行协调对LTCM的36亿美元救助。LTCM在高杠杆套利策略上损失超40亿美元。俄罗斯8月债务违约引发全球金融动荡。",
    vix: 43.0, rsi: 25, drop: 15, actual: "up",
  },
  {
    name: "Taper", date: "2013-06-19",
    news: "2013年6月19日，伯南克在FOMC会后表示可能在今年晚些时候缩减每月850亿美元的QE。标普500当日下跌1.4%。他强调缩减≠紧缩，联邦基金利率仍维持0-0.25%。",
    vix: 19.5, rsi: 35, drop: 4.6, actual: "up",
  },
  {
    name: "Ebola", date: "2014-10-15",
    news: "2014年10月15日，美国确诊第二例埃博拉病例，全球股市连续第5日下跌。标普自9月高点跌7.4%。航空公司领跌。CDC加强机场筛查，尚无旅行禁令。",
    vix: 26.3, rsi: 22, drop: 7.4, actual: "up",
  },
  {
    name: "Evergrande", date: "2021-09-20",
    news: "2021年9月20日，恒大集团面临3000亿美元债务违约风险。恒大股价年初至今暴跌85%。中国央行通过逆回购注入1200亿流动性。政府暗示危机将由市场方式解决，不会兜底。",
    vix: 25.7, rsi: 35, drop: 4.2, actual: "up",
  },
  {
    name: "UKPension", date: "2022-09-28",
    news: "2022年9月28日，英格兰银行紧急宣布无限量购买长期英国国债，遏制养老金LDI抵押品危机。此前减税计划引发英国国债和英镑暴跌。养老金面临大规模保证金追缴。美联储仍在加息。",
    vix: 32.0, rsi: 25, drop: 23.5, actual: "up",
  },
  {
    name: "DeepSeek", date: "2025-01-27",
    news: "2025年1月27日，DeepSeek发布开源大模型以极低成本实现接近GPT-4性能。英伟达单日暴跌17%，市值蒸发5890亿。费城半导体指数暴跌9.2%。尚无政策响应。",
    vix: 19.3, rsi: 42, drop: 3.5, actual: "neutral",
  },
  {
    name: "Lehman", date: "2008-09-15",
    news: "2008年9月15日，雷曼兄弟申请破产保护。美国政府拒绝救助雷曼。美林被迫500亿出售给美银。AIG寻求400亿紧急贷款。道指暴跌504点(-4.4%)。全球股市重挫，信贷市场冻结。",
    vix: 31.7, rsi: 32, drop: 22.0, actual: "down",
  },
  {
    name: "ChinaCrash", date: "2015-08-24",
    news: "2015年8月24日，上证综指暴跌8.5%。自6月高点累计跌40%。中国政府连续出台救市（禁止减持、国家队入场、降息降准），但多次救市均未遏制跌势。大量杠杆资金已被强制平仓。",
    vix: 40.7, rsi: 15, drop: 40.0, actual: "down",
  },
  {
    name: "COVID", date: "2020-02-24",
    news: "2020年2月24日，意大利和韩国新冠确诊病例急剧增加，疫情在中国以外加速蔓延。道指暴跌1032点(-3.6%)。市场担忧全球供应链中断和全球经济衰退。WHO警告可能成为大流行。尚无货币政策响应。",
    vix: 24.5, rsi: 38, drop: 3.0, actual: "down",
  },
  {
    name: "Fed2022", date: "2022-01-05",
    news: "2022年1月5日，美联储公布12月FOMC纪要，显示官员认为可能需要比预期更早更快加息，并讨论缩减8.8万亿资产负债表。纳斯达克暴跌3.3%。10年美债收益率飙升至1.70%。通胀达7%创40年新高。",
    vix: 18.5, rsi: 45, drop: 5.0, actual: "down",
  },
  {
    name: "USDowngrade", date: "2011-08-08",
    news: "2011年8月5日盘后，标普将美国主权信用评级从AAA下调至AA+。8月8日周一，道指暴跌634点(-5.5%)，标普500暴跌6.7%。欧洲债务危机同步恶化，意大利和西班牙债券收益率飙升。美联储声明维持0-0.25%利率至少到2013年中。",
    vix: 39.0, rsi: 22, drop: 16.8, actual: "down",
  },
  {
    name: "SNB", date: "2015-01-15",
    news: "2015年1月15日，瑞士央行毫无预警取消1.20瑞郎兑欧元汇率上限，同时降息至-0.75%。瑞郎瞬间飙升30%，创外汇史上最大单日波动。多家零售外汇经纪商破产。全球股市剧烈震荡。",
    vix: 21.5, rsi: 47, drop: 2.3, actual: "neutral",
  },
];

// ==================== 主逻辑 ====================

async function main() {
  const mode = RUN_WITH_LLM ? "真实 LLM (DeepSeek)" : "模板简报 (纯数学)";
  console.log("=".repeat(70));
  console.log(`  🧪 SwarmAlpha v6.0 — 14 事件回测 (${mode})`);
  console.log("=".repeat(70));

  const config = RUN_WITH_LLM
    ? { provider: "deepseek" as const, model: "deepseek-chat" }
    : undefined;

  let correct = 0;
  let trimmedCorrect = 0;
  const results: Array<{
    name: string;
    actual: string;
    consensus: number;
    dir: string;
    correct: boolean;
    trimmedConsensus: number;
    trimmedDir: string;
    trimmedCorrect: boolean;
    regime: string;
    priceChange: number;
    netFlow: number;
    behaviors: string;
  }> = [];

  for (let i = 0; i < EVENTS.length; i++) {
    const ev = EVENTS[i];
    const tag = `${i + 1}/${EVENTS.length}`;
    console.log(`\n[${tag}] ${ev.name} (${ev.date}) — 实际: ${ev.actual}`);

    let result: V6SwarmResult;
    try {
      result = await runSwarmV6(
        ev.news,
        config,
        3,
        {
          vix: ev.vix,
          rsi: ev.rsi,
          dropMagnitude: ev.drop,
          hasPolicyResponse: /注入|购债|QE|救助|bailout|纾困|降息|刺激|emergency|rate cut/i.test(ev.news),
          hasLeverageDamage: /杠杆|强制平仓|爆仓|margin/i.test(ev.news),
          hasSolvencyDamage: /违约|破产|系统性|传染|衰退|default|bankrupt/i.test(ev.news),
        },
      );
    } catch (e) {
      console.error(`  ❌ 引擎失败: ${(e as Error).message}`);
      results.push({
        name: ev.name, actual: ev.actual, consensus: 0, dir: "neutral",
        correct: false, regime: "ERROR", priceChange: 0, netFlow: 0, behaviors: "",
      });
      continue;
    }

    // Also compute trimmed consensus
    const lastRound = result.rounds[result.rounds.length - 1];
    const regimeResult = detectMarketRegime({
      vix: ev.vix, rsi: ev.rsi, dropMagnitude: ev.drop,
      volatility: 0.02, volumeSpike: 1.0,
      hasPolicyResponse: /注入|购债|QE|救助|bailout|纾困|降息|刺激|emergency|rate cut/i.test(ev.news),
      hasLeverageDamage: /杠杆|强制平仓|爆仓|margin/i.test(ev.news),
      hasSolvencyDamage: /违约|破产|系统性|传染|衰退|default|bankrupt/i.test(ev.news),
    });
    const trimmedConsensus = computeTrimmedConsensus(
      lastRound.agents, V6_PERSONAS, regimeResult.agentMultipliers, 1
    );
    const trimmedDir = trimmedConsensus > 10 ? "up" : trimmedConsensus < -10 ? "down" : "neutral";

    const dir = result.direction;
    const isCorrect = dir === ev.actual;
    const trimmedIsCorrect = trimmedDir === ev.actual;
    if (isCorrect) correct++;
    if (trimmedIsCorrect) trimmedCorrect++;

    const mark = isCorrect ? "✅" : "❌";
    const tmark = trimmedIsCorrect ? "✅" : "❌";
    const behaviors = result.emergentBehaviors.map(b => b.type).join(",") || "无";

    console.log(
      `  🎯 共识=${result.finalConsensus.toFixed(0)}→${dir} ${mark} | Trim=${trimmedConsensus.toFixed(0)}→${trimmedDir} ${tmark} ` +
      `Regime=${result.finalRegime} ` +
      `资金流=${result.finalCapitalFlows.netFlow.toFixed(1)} ` +
      `价格Δ=${result.finalPrice.priceChange}%`
    );
    console.log(`  ⚡ 涌现: ${behaviors}`);

    results.push({
      name: ev.name,
      actual: ev.actual,
      consensus: result.finalConsensus,
      dir,
      correct: isCorrect,
      trimmedConsensus,
      trimmedDir,
      trimmedCorrect: trimmedIsCorrect,
      regime: result.finalRegime,
      priceChange: result.finalPrice.priceChange,
      netFlow: result.finalCapitalFlows.netFlow,
      behaviors,
    });
  }

  // ── 结果汇总 ──
  console.log("\n" + "=".repeat(70));
  console.log("📊 v6.0 14 事件回测结果");
  console.log("-".repeat(50));

  const pct = (correct / EVENTS.length * 100).toFixed(0);
  const tPct = (trimmedCorrect / EVENTS.length * 100).toFixed(0);
  console.log(`  加权共识: ${correct}/${EVENTS.length} = ${pct}%`);
  console.log(`  修剪共识: ${trimmedCorrect}/${EVENTS.length} = ${tPct}%`);

  const upEvents = EVENTS.filter(e => e.actual === "up");
  const downEvents = EVENTS.filter(e => e.actual === "down");
  const neutralEvents = EVENTS.filter(e => e.actual === "neutral");

  const upCorrect = results.filter(r => r.actual === "up" && r.correct).length;
  const downCorrect = results.filter(r => r.actual === "down" && r.correct).length;
  const neutralCorrect = results.filter(r => r.actual === "neutral" && r.correct).length;

  const tUpCorrect = results.filter(r => r.actual === "up" && r.trimmedCorrect).length;
  const tDownCorrect = results.filter(r => r.actual === "down" && r.trimmedCorrect).length;

  console.log(`  加权 Up:${upCorrect}/${upEvents.length}=${(upCorrect/upEvents.length*100).toFixed(0)}% Down:${downCorrect}/${downEvents.length}=${(downCorrect/downEvents.length*100).toFixed(0)}%`);
  console.log(`  修剪 Up:${tUpCorrect}/${upEvents.length}=${(tUpCorrect/upEvents.length*100).toFixed(0)}% Down:${tDownCorrect}/${downEvents.length}=${(tDownCorrect/downEvents.length*100).toFixed(0)}%`);

  // ── 与 v5 对比 ──
  console.log("\n📊 v5 vs v6 对比");
  console.log("-".repeat(50));
  console.log(`  v5 信息不对称 Agent:     36% (5/14) [Up:14% Down:80%]`);
  console.log(`  v5 永远猜涨基线:         50% (7/14)`);
  console.log(`  v6 加权共识 (${mode}):   ${pct}% (${correct}/14) [Up:${(upCorrect/upEvents.length*100).toFixed(0)}% Down:${(downCorrect/downEvents.length*100).toFixed(0)}%]`);
  console.log(`  v6 修剪共识 (${mode}):   ${tPct}% (${trimmedCorrect}/14) [Up:${(tUpCorrect/upEvents.length*100).toFixed(0)}% Down:${(tDownCorrect/downEvents.length*100).toFixed(0)}%]`);

  // ── Regime 分布 ──
  console.log("\n📊 Regime 分布");
  console.log("-".repeat(50));
  const regimeCounts: Record<string, number> = {};
  for (const r of results) {
    regimeCounts[r.regime] = (regimeCounts[r.regime] || 0) + 1;
  }
  for (const [regime, count] of Object.entries(regimeCounts)) {
    console.log(`  ${regime}: ${count}次`);
  }

  // ── 逐事件详情 ──
  console.log("\n📋 逐事件详情:");
  console.log("事件".padEnd(14) + "实际".padEnd(8) + "共识".padStart(5) + "方向".padStart(8) + "Regime".padStart(18) + "资金流".padStart(8) + "价格Δ".padStart(8) + "涌现");
  console.log("-".repeat(90));
  for (const r of results) {
    const mark = r.correct ? "✅" : "❌";
    console.log(
      `${mark} ${r.name.padEnd(11)} ${r.actual.padEnd(8)} ${String(r.consensus.toFixed(0)).padStart(4)} ` +
      `${r.dir.padEnd(8)} ${r.regime.padEnd(18)} ${String(r.netFlow.toFixed(1)).padStart(6)} ` +
      `${String(r.priceChange + "%").padStart(7)} ${r.behaviors.slice(0, 30)}`
    );
  }
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
