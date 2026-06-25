/**
 * 📡 事件验证脚本 — 用 Yahoo Finance 真实数据验证近期事件
 *
 * 仅验证 2018-2025 年的事件（Yahoo Finance 有完整历史数据）
 * 每个事件输出 VIX/RSI/跌幅/实际回报，直接可查证
 *
 * 运行: npx tsx test/verify-events.ts
 */

import { fetchHistoricalData, clearCache } from "../src/lib/market-data/yahoo";
import { calculateRSI } from "../src/lib/indicators/technical";

interface CandidateEvent {
  name: string;
  date: string;
  expectedDirection: "up" | "down" | "neutral";
}

// 2018-2025 候选事件（Yahoo Finance 有数据）
const CANDIDATES: CandidateEvent[] = [
  // === V 型反弹 ===
  { name: "2018年2月VIX崩溃", date: "2018-02-05", expectedDirection: "up" },
  { name: "2018年平安夜暴跌", date: "2018-12-24", expectedDirection: "up" },
  { name: "2019年中美贸易战升级", date: "2019-08-05", expectedDirection: "up" },
  { name: "2020年3月COVID底部", date: "2020-03-23", expectedDirection: "up" },
  { name: "2021年Archegos爆仓", date: "2021-03-29", expectedDirection: "up" },
  { name: "2022年英国养老金危机", date: "2022-09-28", expectedDirection: "up" },
  { name: "2023年硅谷银行倒闭", date: "2023-03-13", expectedDirection: "up" },
  { name: "2023年债务上限恐慌", date: "2023-05-24", expectedDirection: "up" },
  { name: "2024年日元套利崩盘", date: "2024-08-05", expectedDirection: "up" },

  // === L 型下跌 ===
  { name: "2018年10月科技修正", date: "2018-10-29", expectedDirection: "down" },
  { name: "2020年2月COVID爆发", date: "2020-02-24", expectedDirection: "down" },
  { name: "2022年1月美联储鹰派", date: "2022-01-05", expectedDirection: "down" },
  { name: "2022年6月CPI通胀", date: "2022-06-13", expectedDirection: "down" },
  { name: "2022年9月英国减税", date: "2022-09-26", expectedDirection: "down" },

  // === 中性/震荡 ===
  { name: "2019年12月贸易停战", date: "2019-12-13", expectedDirection: "neutral" },
  { name: "2023年9月政府停摆", date: "2023-09-29", expectedDirection: "neutral" },
  { name: "2025年DeepSeek冲击", date: "2025-01-27", expectedDirection: "neutral" },
];

function findIndexAtOrBefore(timestamps: number[], targetTs: number): number {
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (timestamps[i] <= targetTs) return i;
  }
  return -1;
}

async function verifyEvent(ev: CandidateEvent) {
  const data = await fetchHistoricalData(ev.date);
  if (!data) return null;

  const { sp500, vix } = data;
  const targetTs = new Date(ev.date + "T00:00:00Z").getTime() / 1000;
  const idx = findIndexAtOrBefore(sp500.timestamps, targetTs);
  const vixIdx = findIndexAtOrBefore(vix.timestamps, targetTs);

  if (idx < 20 || vixIdx < 0) return null;

  // Market data on the day
  const prices = sp500.closes.slice(0, idx + 1);
  const rsi = calculateRSI(prices, 14).value;
  const vixVal = vix.closes[vixIdx];
  const peak = Math.max(...prices.slice(-60));
  const dropFromPeak = ((peak - prices[prices.length - 1]) / peak) * 100;

  // Volatility (5-day)
  const rets: number[] = [];
  for (let i = idx - 4; i <= idx; i++) {
    if (i > 0) rets.push((sp500.closes[i] - sp500.closes[i - 1]) / sp500.closes[i - 1]);
  }
  const meanRet = rets.reduce((a, b) => a + b, 0) / rets.length;
  const volatility = Math.sqrt(rets.reduce((s, r) => s + (r - meanRet) ** 2, 0) / rets.length);

  // Volume spike
  const volumes = sp500.volumes.slice(0, idx + 1);
  let volumeSpike = 1.0;
  if (volumes.length >= 21) {
    const latest = volumes[volumes.length - 1] || 1;
    const avg20 = volumes.slice(-21, -1).reduce((a: number, b: number) => a + (b || 0), 0) / 20;
    volumeSpike = avg20 > 0 ? Math.round((latest / avg20) * 10) / 10 : 1;
  }

  // Forward returns
  const idx1m = findIndexAtOrBefore(sp500.timestamps, targetTs + 30 * 86400);
  const idx3m = findIndexAtOrBefore(sp500.timestamps, targetTs + 90 * 86400);
  const ret1m = idx1m > idx ? ((sp500.closes[idx1m] - prices[prices.length - 1]) / prices[prices.length - 1]) * 100 : 0;
  const ret3m = idx3m > idx ? ((sp500.closes[idx3m] - prices[prices.length - 1]) / prices[prices.length - 1]) * 100 : 0;

  const avgRet = (ret1m + ret3m) / 2;
  const actualDirection = avgRet > 3 ? "up" : avgRet < -3 ? "down" : "neutral";
  const match = actualDirection === ev.expectedDirection;

  return {
    name: ev.name, date: ev.date,
    vix: Math.round(vixVal * 10) / 10,
    rsi: Math.round(rsi),
    dropFromPeak: Math.round(dropFromPeak * 10) / 10,
    volatility: Math.round(volatility * 1000) / 1000,
    volumeSpike: Math.round(volumeSpike * 10) / 10,
    ret1m: Math.round(ret1m * 10) / 10,
    ret3m: Math.round(ret3m * 10) / 10,
    actualDirection,
    expectedDirection: ev.expectedDirection,
    match,
  };
}

async function main() {
  console.log("=" .repeat(90));
  console.log("  📡 Yahoo Finance 真实数据验证 — 2018-2025 事件");
  console.log("=" .repeat(90));
  console.log();

  const results: any[] = [];
  let verified = 0, failed = 0;

  for (let i = 0; i < CANDIDATES.length; i++) {
    const ev = CANDIDATES[i];
    process.stdout.write(`[${i + 1}/${CANDIDATES.length}] ${ev.name}... `);

    const result = await verifyEvent(ev);
    if (!result) {
      console.log("❌ 无数据");
      failed++;
      continue;
    }

    const mark = result.match ? "✅" : "⚠️";
    console.log(`${mark} VIX=${result.vix} RSI=${result.rsi} Drop=${result.dropFromPeak}% → 1M=${result.ret1m}% 3M=${result.ret3m}% (${result.actualDirection})`);

    results.push(result);
    verified++;
    clearCache();

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log();
  console.log("=" .repeat(90));
  console.log(`  验证完成: ${verified} 成功, ${failed} 失败`);
  const matches = results.filter((r: any) => r.match).length;
  console.log(`  方向匹配: ${matches}/${results.length} (${(matches/results.length*100).toFixed(0)}%)`);
  console.log();

  // Output in strict-backtest format
  console.log("📋 可直接添加到 strict-backtest.ts 的事件数据:");
  console.log("-".repeat(90));
  for (const r of results) {
    console.log(`  { name: "${r.name}", date: "${r.date}", vix: ${r.vix}, rsi: ${r.rsi}, drop: ${r.dropFromPeak}, vol: ${r.volatility}, vspike: ${r.volumeSpike}, ret1m: ${r.ret1m}, ret3m: ${r.ret3m}, dir: "${r.actualDirection}" },`);
  }

  // Direction breakdown
  console.log();
  const upCount = results.filter((r: any) => r.actualDirection === "up").length;
  const downCount = results.filter((r: any) => r.actualDirection === "down").length;
  const neutralCount = results.filter((r: any) => r.actualDirection === "neutral").length;
  console.log(`📊 分布: ${upCount} up / ${downCount} down / ${neutralCount} neutral`);
}

main().catch(console.error);
