/**
 * 🎯 分类器基准测试 — 14 个已验证事件，使用真实源代码管道
 *
 * 运行: npx tsx test/benchmark-classifier.ts
 *
 * 对比：
 *   1. 旧版关键词分类器 (assessCrisisType)
 *   2. 新版数据驱动分类器 (classifyEvent from eventClassifierV2)
 */

import { classifyEvent, ClassifierInput } from "../src/lib/calibration/eventClassifierV2";
import { assessCrisisType } from "../src/lib/calibration/predictionCalibrator";

// 14 original verified events from strict-backtest.ts
const EVENTS = [
  { name: "Brexit", vix:25.8,rsi:30,drop:5.3,vol:0.018,vspike:2.8,policy:true,cb:true,leverage:false,solvency:false, actual:"up" },
  { name: "XmasEve", vix:36.1,rsi:20,drop:19.8,vol:0.035,vspike:2.2,policy:false,cb:false,leverage:true,solvency:false, actual:"up" },
  { name: "LTCM", vix:43.0,rsi:25,drop:15.0,vol:0.03,vspike:3.0,policy:true,cb:true,leverage:true,solvency:true, actual:"up" },
  { name: "Taper", vix:19.5,rsi:35,drop:4.6,vol:0.015,vspike:2.5,policy:true,cb:true,leverage:false,solvency:false, actual:"up" },
  { name: "Ebola", vix:26.3,rsi:22,drop:7.4,vol:0.023,vspike:2.2,policy:true,cb:false,leverage:false,solvency:false, actual:"up" },
  { name: "Evergrande", vix:25.7,rsi:35,drop:4.2,vol:0.016,vspike:2.3,policy:true,cb:true,leverage:false,solvency:true, actual:"up" },
  { name: "UKPension", vix:32.0,rsi:25,drop:23.5,vol:0.028,vspike:2.8,policy:true,cb:true,leverage:true,solvency:false, actual:"up" },
  { name: "DeepSeek", vix:19.3,rsi:42,drop:3.5,vol:0.014,vspike:4.0,policy:false,cb:false,leverage:false,solvency:false, actual:"neutral" },
  { name: "Lehman", vix:31.7,rsi:32,drop:22.0,vol:0.035,vspike:3.5,policy:false,cb:true,leverage:true,solvency:true, actual:"down" },
  { name: "ChinaCrash", vix:40.7,rsi:15,drop:40.0,vol:0.055,vspike:3.8,policy:true,cb:true,leverage:true,solvency:false, actual:"down" },
  { name: "COVID", vix:24.5,rsi:38,drop:3.0,vol:0.012,vspike:2.0,policy:false,cb:false,leverage:false,solvency:false, actual:"down" },
  { name: "Fed2022", vix:18.5,rsi:45,drop:5.0,vol:0.013,vspike:2.1,policy:false,cb:false,leverage:false,solvency:false, actual:"down" },
  { name: "USDowngrade", vix:39.0,rsi:22,drop:16.8,vol:0.032,vspike:3.2,policy:true,cb:true,leverage:false,solvency:false, actual:"down" },
  { name: "SNB", vix:21.5,rsi:47,drop:2.3,vol:0.022,vspike:2.5,policy:false,cb:true,leverage:false,solvency:false, actual:"neutral" },
];

console.log("=" .repeat(90));
console.log("  🎯 分类器基准测试 — 数据驱动 vs 关键词");
console.log("=" .repeat(90));
console.log();

// Test both classifiers
let v2Correct = 0, v1Correct = 0;

for (const ev of EVENTS) {
  const input: ClassifierInput = {
    vix: ev.vix, rsi: ev.rsi, dropMagnitude: ev.drop,
    volatility: ev.vol, volumeSpike: ev.vspike,
    hasPolicyResponse: ev.policy, hasCentralBankAction: ev.cb,
    hasLeverageDamage: ev.leverage, hasSolvencyDamage: ev.solvency,
  };

  // V2: Data-driven
  const v2 = classifyEvent(input);

  // V1: Keyword-based
  const vulnText = [
    ev.leverage ? "高杠杆" : "",
    ev.solvency ? "违约风险" : "",
  ].filter(Boolean).join(" ");
  const v1 = assessCrisisType({
    newsText: ev.name,
    dropMagnitude: ev.drop,
    hasPolicyResponse: ev.policy,
    hasCentralBankAction: ev.cb,
    knownVulnerabilities: vulnText ? [vulnText] : [],
  });

  // Direction implied by classifier
  const v2ImpliesUp = v2.pattern === "V_REBOUND" || v2.pattern === "W_RECOVERY";
  const v2ImpliesDown = v2.pattern === "L_DECLINE";
  const v1ImpliesUp = v1.type === "liquidity" || v1.type === "technical" || v1.type === "external_shock";
  const v1ImpliesDown = v1.type === "solvency";

  // Check: for up events, V_REBOUND is correct implication; for down events, L_DECLINE
  const v2Right = (ev.actual === "up" && v2ImpliesUp) || (ev.actual === "down" && v2ImpliesDown);
  const v1Right = (ev.actual === "up" && v1ImpliesUp) || (ev.actual === "down" && v1ImpliesDown);

  if (v2Right) v2Correct++;
  if (v1Right) v1Correct++;

  const v2Mark = v2Right ? "✅" : "❌";
  const v1Mark = v1Right ? "✅" : "❌";

  console.log(
    `${ev.name.padEnd(13)} ${ev.actual.padEnd(7)} | ` +
    `V2:${v2Mark} ${v2.pattern.padEnd(11)} (V${(v2.vScore*100).toFixed(0)} L${(v2.lScore*100).toFixed(0)} W${(v2.wScore*100).toFixed(0)}) | ` +
    `V1:${v1Mark} ${v1.type.padEnd(14)} (V${(v1.vRecoveryProbability*100).toFixed(0)}%)`
  );
}

console.log();
console.log("📊 分类准确率对比");
console.log("-".repeat(50));
console.log(`  数据驱动 V2: ${v2Correct}/14 = ${(v2Correct/14*100).toFixed(0)}%`);
console.log(`  关键词 V1:   ${v1Correct}/14 = ${(v1Correct/14*100).toFixed(0)}%`);
console.log();

// Feature analysis
console.log("📊 特征阈值分析（用于调优）");
console.log("-".repeat(50));
const upEvents = EVENTS.filter(e => e.actual === "up");
const downEvents = EVENTS.filter(e => e.actual === "down");
const avg = (arr: number[]) => arr.reduce((a,b)=>a+b,0)/arr.length;

console.log(`  Up events (n=${upEvents.length}):`);
console.log(`    Avg VIX=${avg(upEvents.map(e=>e.vix)).toFixed(0)} RSI=${avg(upEvents.map(e=>e.rsi)).toFixed(0)} Drop=${avg(upEvents.map(e=>e.drop)).toFixed(1)}%`);
console.log(`    Policy=${upEvents.filter(e=>e.policy).length}/${upEvents.length} CB=${upEvents.filter(e=>e.cb).length}/${upEvents.length}`);
console.log(`    Leverage=${upEvents.filter(e=>e.leverage).length}/${upEvents.length} Solvency=${upEvents.filter(e=>e.solvency).length}/${upEvents.length}`);
console.log(`  Down events (n=${downEvents.length}):`);
console.log(`    Avg VIX=${avg(downEvents.map(e=>e.vix)).toFixed(0)} RSI=${avg(downEvents.map(e=>e.rsi)).toFixed(0)} Drop=${avg(downEvents.map(e=>e.drop)).toFixed(1)}%`);
console.log(`    Policy=${downEvents.filter(e=>e.policy).length}/${downEvents.length} CB=${downEvents.filter(e=>e.cb).length}/${downEvents.length}`);
console.log(`    Leverage=${downEvents.filter(e=>e.leverage).length}/${downEvents.length} Solvency=${downEvents.filter(e=>e.solvency).length}/${downEvents.length}`);
