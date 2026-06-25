/**
 * 🧪 信息不对称 Agent 群 — 14 事件严格回测
 *
 * 仅用事发当天已知信息。无信息泄漏。
 * 与之前的微型社会回测对比：Agent 现在各自看到不同的信息切片。
 *
 * 运行: npx tsx test/asymmetric-backtest.ts
 * 预计: ~154 次 DeepSeek 调用，约 ¥2
 */

import dotenv from "dotenv"; dotenv.config({ path: ".env.local" });
import { runAsymmetricSwarm } from "../src/lib/agents/integratedEngine";

const config = { provider: "deepseek" as const, model: "deepseek-chat" };

// 14 个原始验证事件 — 所有数据均为事发当天已知
const EVENTS = [
  { name:"Brexit",       date:"2016-06-24", news:"2016年6月24日，英国公投51.9%支持脱欧，远超市场预期。英镑兑美元暴跌8.1%至31年新低。全球股市重挫，标普500期货盘前跌超5%触发熔断。英国首相卡梅伦宣布辞职。英格兰银行声明准备提供2500亿英镑流动性。",          vix:25.8, rsi:30, drop:5.3,  actual:"up" },
  { name:"XmasEve",      date:"2018-12-24", news:"2018年12月24日，美股圣诞前夜交易，标普500收跌2.7%，自9月高点累计下跌19.8%。纳斯达克已入熊市。美联储12月19日刚加息25bp，暗示2019年继续收紧。姆努钦召集银行高管反而加剧恐慌。",                  vix:36.1, rsi:20, drop:19.8, actual:"up" },
  { name:"LTCM",         date:"1998-09-23", news:"1998年9月23日，纽约联储紧急召集华尔街银行协调对LTCM的36亿美元救助。LTCM在高杠杆套利策略上损失超40亿美元。俄罗斯8月债务违约引发全球金融动荡。",                                                      vix:43.0, rsi:25, drop:15,   actual:"up" },
  { name:"Taper",        date:"2013-06-19", news:"2013年6月19日，伯南克在FOMC会后表示可能在今年晚些时候缩减每月850亿美元的QE。标普500当日下跌1.4%。他强调缩减≠紧缩，联邦基金利率仍维持0-0.25%。",                                                       vix:19.5, rsi:35, drop:4.6,  actual:"up" },
  { name:"Ebola",        date:"2014-10-15", news:"2014年10月15日，美国确诊第二例埃博拉病例，全球股市连续第5日下跌。标普自9月高点跌7.4%。航空公司领跌。CDC加强机场筛查，尚无旅行禁令。",                                                                  vix:26.3, rsi:22, drop:7.4,  actual:"up" },
  { name:"Evergrande",   date:"2021-09-20", news:"2021年9月20日，恒大集团面临3000亿美元债务违约风险。恒大股价年初至今暴跌85%。中国央行通过逆回购注入1200亿流动性。政府暗示危机将由市场方式解决，不会兜底。",                                            vix:25.7, rsi:35, drop:4.2,  actual:"up" },
  { name:"UKPension",    date:"2022-09-28", news:"2022年9月28日，英格兰银行紧急宣布无限量购买长期英国国债，遏制养老金LDI抵押品危机。此前减税计划引发英国国债和英镑暴跌。养老金面临大规模保证金追缴。美联储仍在加息。",                                         vix:32.0, rsi:25, drop:23.5, actual:"up" },
  { name:"DeepSeek",     date:"2025-01-27", news:"2025年1月27日，DeepSeek发布开源大模型以极低成本实现接近GPT-4性能。英伟达单日暴跌17%，市值蒸发5890亿。费城半导体指数暴跌9.2%。尚无政策响应。",                                                         vix:19.3, rsi:42, drop:3.5,  actual:"neutral" },
  { name:"Lehman",       date:"2008-09-15", news:"2008年9月15日，雷曼兄弟申请破产保护。美国政府拒绝救助雷曼。美林被迫500亿出售给美银。AIG寻求400亿紧急贷款。道指暴跌504点(-4.4%)。全球股市重挫，信贷市场冻结。",                                               vix:31.7, rsi:32, drop:22.0, actual:"down" },
  { name:"ChinaCrash",   date:"2015-08-24", news:"2015年8月24日，上证综指暴跌8.5%。自6月高点累计跌40%。中国政府连续出台救市（禁止减持、国家队入场、降息降准），但多次救市均未遏制跌势。大量杠杆资金已被强制平仓。",                                      vix:40.7, rsi:15, drop:40.0, actual:"down" },
  { name:"COVID",        date:"2020-02-24", news:"2020年2月24日，意大利和韩国新冠确诊病例急剧增加，疫情在中国以外加速蔓延。道指暴跌1032点(-3.6%)。市场担忧全球供应链中断和全球经济衰退。WHO警告可能成为大流行。尚无货币政策响应。",                          vix:24.5, rsi:38, drop:3.0,  actual:"down" },
  { name:"Fed2022",      date:"2022-01-05", news:"2022年1月5日，美联储公布12月FOMC纪要，显示官员认为可能需要比预期更早更快加息，并讨论缩减8.8万亿资产负债表。纳斯达克暴跌3.3%。10年美债收益率飙升至1.70%。通胀达7%创40年新高。",                             vix:18.5, rsi:45, drop:5.0,  actual:"down" },
  { name:"USDowngrade",  date:"2011-08-08", news:"2011年8月5日盘后，标普将美国主权信用评级从AAA下调至AA+。8月8日周一，道指暴跌634点(-5.5%)，标普500暴跌6.7%。欧洲债务危机同步恶化，意大利和西班牙债券收益率飙升。美联储声明维持0-0.25%利率至少到2013年中。", vix:39.0, rsi:22, drop:16.8, actual:"down" },
  { name:"SNB",          date:"2015-01-15", news:"2015年1月15日，瑞士央行毫无预警取消1.20瑞郎兑欧元汇率上限，同时降息至-0.75%。瑞郎瞬间飙升30%，创外汇史上最大单日波动。多家零售外汇经纪商破产。全球股市剧烈震荡。",                                        vix:21.5, rsi:47, drop:2.3,  actual:"neutral" },
];

async function main() {
  console.log("=".repeat(70));
  console.log("  🧪 信息不对称 Agent 群 — 14 事件严格回测");
  console.log("  每 Agent 接收不同的信息切片 | 无信息泄漏");
  console.log("=".repeat(70));

  let asymmetricCorrect = 0;
  const results: { name: string; actual: string; consensus: number; dir: string; correct: boolean; note: string }[] = [];

  for (let i = 0; i < EVENTS.length; i++) {
    const ev = EVENTS[i];
    console.log(`\n[${i + 1}/14] ${ev.name} (${ev.date}) — 实际: ${ev.actual}`);

    const r = await runAsymmetricSwarm(ev.news, config, 2, {
      vix: ev.vix, rsi: ev.rsi, dropFromPeak: ev.drop,
    });

    const dir = r.finalConsensus > 10 ? "up" : r.finalConsensus < -10 ? "down" : "neutral";
    const correct = dir === ev.actual;
    if (correct) asymmetricCorrect++;

    const mark = correct ? "✅" : "❌";
    console.log(`  🎯 共识=${r.finalConsensus.toFixed(0)} → ${dir} ${mark}`);

    results.push({ name: ev.name, actual: ev.actual, consensus: r.finalConsensus, dir, correct, note: r.analysis?.coreContradiction?.slice(0, 80) || "" });
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 14 事件回测结果");
  console.log("-".repeat(50));
  const pct = (asymmetricCorrect / 14 * 100).toFixed(0);
  console.log(`  信息不对称 Agent 群: ${asymmetricCorrect}/14 = ${pct}%`);

  const upEv = EVENTS.filter(e => e.actual === "up");
  const downEv = EVENTS.filter(e => e.actual === "down");
  const upCorrect = results.filter(r => r.actual === "up" && r.correct).length;
  const downCorrect = results.filter(r => r.actual === "down" && r.correct).length;
  console.log(`    Up 事件: ${upCorrect}/${upEv.length} | Down 事件: ${downCorrect}/${downEv.length}`);

  // Comparison with previous runs
  console.log("\n📊 与之前测试对比");
  console.log("-".repeat(50));
  console.log(`  旧版同质 Agent (模拟LLM):    36% (5/14)`);
  console.log(`  旧版同质 Agent (真实DeepSeek): ~43% (6/14)`);
  console.log(`  信息不对称 Agent (本次):      ${pct}% (${asymmetricCorrect}/14)`);
  console.log(`  纯校准系统:                   43% (6/14)`);
  console.log(`  永远猜涨基线:                 ${Math.round(upEv.length/14*100)}% (${upEv.length}/14)`);

  // Detail
  console.log("\n📋 逐事件详情:");
  for (const r of results) {
    console.log(`  ${r.correct ? "✅" : "❌"} ${r.name.padEnd(15)} ${r.actual.padEnd(7)} → 共识=${String(r.consensus.toFixed(0)).padStart(4)} ${r.dir.padEnd(7)} ${r.note}`);
  }
}

main().catch(e => console.error("FATAL:", e.message));
