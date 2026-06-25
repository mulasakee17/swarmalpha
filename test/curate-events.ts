/**
 * 🏷️ 事件策展脚本 — 用 Yahoo Finance 真实数据验证历史事件
 *
 * 功能：
 *   1. 对候选事件列表，自动获取 S&P 500 + VIX 历史数据
 *   2. 计算事发当天的 VIX/RSI/跌幅/波动率/成交量
 *   3. 计算后续 1/3 个月实际回报
 *   4. 自动标注反弹模式 (V_REBOUND / L_DECLINE / W_RECOVERY / U_SLOW)
 *   5. 输出 strict-backtest.ts 兼容格式
 *
 * 运行: npx tsx test/curate-events.ts
 */

import { fetchHistoricalData, clearCache } from "../src/lib/market-data/yahoo";
import { calculateRSI } from "../src/lib/indicators/technical";

// ========== 候选事件 ==========

interface CandidateEvent {
  name: string;
  date: string;        // YYYY-MM-DD
  description: string;  // 简短描述
  expectedPattern: string; // 预期模式 (用于验证)
}

const CANDIDATES: CandidateEvent[] = [
  // === V型反弹 ===
  { name: "1987年黑色星期一", date: "1987-10-19", description: "道指单日暴跌22.6%", expectedPattern: "V_REBOUND" },
  { name: "1990年伊拉克入侵科威特", date: "1990-08-02", description: "油价翻倍，全球股市暴跌", expectedPattern: "V_REBOUND" },
  { name: "1997年亚洲金融危机", date: "1997-10-27", description: "道指暴跌554点，首次触发熔断", expectedPattern: "V_REBOUND" },
  { name: "2001年911恐怖袭击", date: "2001-09-17", description: "股市重开首日暴跌7.1%", expectedPattern: "V_REBOUND" },
  { name: "2002年世通丑闻", date: "2002-07-22", description: "世通破产，市场恐慌蔓延", expectedPattern: "U_SLOW" },
  { name: "2003年伊拉克战争", date: "2003-03-20", description: "战争爆发，不确定性消除", expectedPattern: "V_REBOUND" },
  { name: "2008年贝尔斯登救助", date: "2008-03-17", description: "摩根大通收购贝尔斯登", expectedPattern: "L_DECLINE" },
  { name: "2009年银行国有化恐慌", date: "2009-03-09", description: "花旗股价跌破1美元", expectedPattern: "V_REBOUND" },
  { name: "2010年闪电崩盘", date: "2010-05-06", description: "道指盘中暴跌1000点", expectedPattern: "V_REBOUND" },
  { name: "2011年欧债危机高潮", date: "2011-09-22", description: "美联储Operation Twist，全球暴跌", expectedPattern: "W_RECOVERY" },
  { name: "2012年希腊选举恐慌", date: "2012-06-17", description: "希腊退欧担忧", expectedPattern: "V_REBOUND" },
  { name: "2013年政府停摆", date: "2013-10-01", description: "美国政府关门16天", expectedPattern: "V_REBOUND" },
  { name: "2014年原油暴跌", date: "2014-12-16", description: "油价跌破60美元", expectedPattern: "V_REBOUND" },
  { name: "2015年8月中国冲击", date: "2015-08-24", description: "上证暴跌8.5%，全球连锁", expectedPattern: "L_DECLINE" },
  { name: "2016年初全球暴跌", date: "2016-02-11", description: "全球股市创历史最差开局", expectedPattern: "V_REBOUND" },
  { name: "2018年2月VIX崩溃", date: "2018-02-05", description: "VIX产品集体爆仓", expectedPattern: "V_REBOUND" },
  { name: "2019年8月中美贸易战升级", date: "2019-08-05", description: "人民币破7，美将中国列为汇率操纵国", expectedPattern: "V_REBOUND" },
  { name: "2020年3月COVID底部", date: "2020-03-23", description: "标普见底2191点，Fed无限QE", expectedPattern: "V_REBOUND" },
  { name: "2021年Archegos爆仓", date: "2021-03-29", description: "家族办公室爆仓引发抛售", expectedPattern: "V_REBOUND" },
  { name: "2022年9月英国养老金危机", date: "2022-09-28", description: "英国央行紧急购债", expectedPattern: "V_REBOUND" },
  { name: "2023年3月硅谷银行", date: "2023-03-13", description: "SVB倒闭，区域性银行危机", expectedPattern: "V_REBOUND" },
  { name: "2024年8月日元套利崩盘", date: "2024-08-05", description: "日经暴跌12.4%，全球连锁", expectedPattern: "V_REBOUND" },
  // === L型下跌 ===
  { name: "2000年互联网泡沫破灭", date: "2000-04-14", description: "纳斯达克单周暴跌25%", expectedPattern: "L_DECLINE" },
  { name: "2001年安然丑闻", date: "2001-12-03", description: "安然破产，信心危机", expectedPattern: "L_DECLINE" },
  { name: "2007年次贷危机开端", date: "2007-08-09", description: "BNP冻结三只基金，信贷紧缩", expectedPattern: "L_DECLINE" },
  { name: "2008年雷曼破产", date: "2008-09-15", description: "雷曼申请破产保护", expectedPattern: "L_DECLINE" },
  { name: "2011年美债降级", date: "2011-08-08", description: "标普下调美国AAA评级", expectedPattern: "L_DECLINE" },
  { name: "2022年美联储鹰派转向", date: "2022-01-05", description: "FOMC纪要显示更快加息", expectedPattern: "L_DECLINE" },
  { name: "2022年6月通胀高峰", date: "2022-06-13", description: "CPI 8.6%超预期，标普入熊", expectedPattern: "L_DECLINE" },
];

// ========== 核心计算 ==========

function findIndexAtOrBefore(timestamps: number[], targetTs: number): number {
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (timestamps[i] <= targetTs) return i;
  }
  return -1;
}

function computeDropFromPeak(closes: number[], targetIdx: number): number {
  if (targetIdx < 20) return 0;
  const prior = closes.slice(0, targetIdx + 1);
  const peak = Math.max(...prior);
  const current = closes[targetIdx];
  if (peak <= 0) return 0;
  return ((peak - current) / peak) * 100;
}

function computeVolatility(closes: number[], targetIdx: number, days: number = 5): number {
  if (targetIdx < days) return 0.015;
  const segment = closes.slice(targetIdx - days, targetIdx + 1);
  const returns: number[] = [];
  for (let i = 1; i < segment.length; i++) {
    returns.push((segment[i] - segment[i - 1]) / segment[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

function computeVolumeSpike(volumes: number[], targetIdx: number): number {
  if (targetIdx < 20) return 1.0;
  const recent = volumes.slice(targetIdx - 20, targetIdx + 1);
  const latest = recent[recent.length - 1];
  const avg20 = recent.slice(0, 20).reduce((a, b) => a + (b || 0), 0) / 20;
  if (avg20 <= 0) return 1.0;
  return latest / avg20;
}

function autoClassify(
  drop: number, vix: number, rsi: number, ret1m: number, ret3m: number
): string {
  // 基于实际回报标注
  const avgRet = (ret1m + ret3m) / 2;

  if (avgRet > 5) return "V_REBOUND";       // 强劲反弹
  if (avgRet < -5 && drop > 10) return "L_DECLINE"; // 持续下跌
  if (Math.abs(avgRet) < 3 && vix < 25 && rsi > 40) return "U_SLOW"; // 低位横盘
  if (Math.abs(avgRet) < 5 && vix > 25) return "W_RECOVERY"; // 震荡筑底

  // 默认
  if (avgRet > 0) return "V_REBOUND";
  return "L_DECLINE";
}

// ========== 主流程 ==========

async function curate() {
  console.log("=" .repeat(80));
  console.log("  🏷️ 事件策展 — Yahoo Finance 真实数据验证");
  console.log("=" .repeat(80));
  console.log();

  const results: any[] = [];
  let success = 0, failed = 0;

  for (let i = 0; i < CANDIDATES.length; i++) {
    const ev = CANDIDATES[i];
    console.log(`[${i + 1}/${CANDIDATES.length}] ${ev.name} (${ev.date})`);

    const data = await fetchHistoricalData(ev.date);
    if (!data) {
      console.log(`  ❌ 数据获取失败`);
      failed++;
      continue;
    }

    const { sp500, vix } = data;
    const targetTs = new Date(ev.date + "T00:00:00Z").getTime() / 1000;
    const targetIdx = findIndexAtOrBefore(sp500.timestamps, targetTs);
    const vixIdx = findIndexAtOrBefore(vix.timestamps, targetTs);

    if (targetIdx < 20 || vixIdx < 0) {
      console.log(`  ❌ 数据点不足 (sp500 idx: ${targetIdx})`);
      failed++;
      continue;
    }

    // 事发当天指标
    const drop = computeDropFromPeak(sp500.closes, targetIdx);
    const rsi = calculateRSI(sp500.closes.slice(0, targetIdx + 1), 14).value;
    const vol = computeVolatility(sp500.closes, targetIdx, 5);
    const volSpike = computeVolumeSpike(sp500.volumes, targetIdx);
    const vixVal = vix.closes[vixIdx];

    // 后续回报
    const idx1m = findIndexAtOrBefore(sp500.timestamps, targetTs + 30 * 86400);
    const idx3m = findIndexAtOrBefore(sp500.timestamps, targetTs + 90 * 86400);
    const ret1m = idx1m > targetIdx ? ((sp500.closes[idx1m] - sp500.closes[targetIdx]) / sp500.closes[targetIdx]) * 100 : 0;
    const ret3m = idx3m > targetIdx ? ((sp500.closes[idx3m] - sp500.closes[targetIdx]) / sp500.closes[targetIdx]) * 100 : 0;

    const pattern = autoClassify(drop, vixVal, rsi, ret1m, ret3m);
    const match = pattern === ev.expectedPattern ? "✅" : "⚠️";

    console.log(`  VIX=${vixVal.toFixed(1)} RSI=${rsi.toFixed(0)} Drop=${drop.toFixed(1)}% ` +
                `Vol=${(vol*100).toFixed(1)}% VSpike=${volSpike.toFixed(1)}x`);
    console.log(`  1M=${ret1m.toFixed(1)}% 3M=${ret3m.toFixed(1)}% → ${pattern} ${match} (预期: ${ev.expectedPattern})`);

    results.push({
      name: ev.name, date: ev.date, vix: vixVal, rsi, dropFromPeak: drop,
      recentVolatility: vol, volumeSpike: volSpike,
      oneMonthReturn: ret1m, threeMonthReturn: ret3m,
      pattern, expected: ev.expectedPattern, match: pattern === ev.expectedPattern,
    });

    success++;
    clearCache();

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log();
  console.log("=" .repeat(80));
  console.log(`  策展完成: ${success} 成功, ${failed} 失败`);
  const matches = results.filter(r => r.match).length;
  console.log(`  模式匹配: ${matches}/${results.length} (${(matches/results.length*100).toFixed(0)}%)`);
  console.log();
  console.log("📋 策展事件列表 (可直接粘贴到 strict-backtest.ts):");
  console.log("-".repeat(80));

  for (const r of results) {
    console.log(`  { name: "${r.name}", date: "${r.date}", vix: ${r.vix.toFixed(1)}, rsi: ${Math.round(r.rsi)}, dropFromPeak: ${r.dropFromPeak.toFixed(1)}, vol: ${r.recentVolatility.toFixed(3)}, vspike: ${r.volumeSpike.toFixed(1)}, ret1m: ${r.oneMonthReturn.toFixed(1)}, ret3m: ${r.threeMonthReturn.toFixed(1)}, pattern: "${r.pattern}" },`);
  }

  // Feature analysis for classifier
  console.log();
  console.log("📊 分类器特征分析:");
  console.log("-".repeat(80));
  const groups: Record<string, typeof results> = {};
  for (const r of results) {
    if (!groups[r.pattern]) groups[r.pattern] = [];
    groups[r.pattern].push(r);
  }
  for (const [pattern, events] of Object.entries(groups)) {
    const avgVix = events.reduce((s, e) => s + e.vix, 0) / events.length;
    const avgRsi = events.reduce((s, e) => s + e.rsi, 0) / events.length;
    const avgDrop = events.reduce((s, e) => s + e.dropFromPeak, 0) / events.length;
    const avgVol = events.reduce((s, e) => s + e.recentVolatility, 0) / events.length;
    console.log(`  ${pattern} (n=${events.length}): VIX=${avgVix.toFixed(0)} RSI=${avgRsi.toFixed(0)} Drop=${avgDrop.toFixed(1)}% Vol=${(avgVol*100).toFixed(1)}%`);
  }
}

curate().catch(console.error);
