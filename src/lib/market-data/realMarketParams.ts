/**
 * 从真实市场数据计算校准参数
 *
 * 替代 regex 推断，使用 Yahoo Finance 真实价格序列计算：
 * - VIX: 直接读取
 * - RSI(14): 从 S&P 500 收盘价计算
 * - dropFromPeak: 从近期高点计算
 * - volatility: 最近 5 日标准差
 * - volumeSpike: 成交量 / 20日均量
 */

import { calculateRSI } from "@/lib/indicators/technical";
import { getSP500Data, getVIXData, YahooChartResult } from "./yahoo";

export interface RealMarketParams {
  vix: number;
  rsi: number;
  dropMagnitude: number;
  volatility: number;
  hasPolicyResponse: boolean;
  hasCentralBankAction: boolean;
  knownVulnerabilities: string[];
  /** 数据来源标记 */
  dataSource: "YAHOO_FINANCE" | "INFERRED";
}

/**
 * 从价格序列计算从近期高点的跌幅 (%)
 */
function calcDropFromPeak(closes: number[]): number {
  if (closes.length < 5) return 0;
  const recent = closes.slice(-60); // 最近 60 个交易日 ≈ 3 个月
  const peak = Math.max(...recent);
  const current = closes[closes.length - 1];
  if (peak <= 0) return 0;
  return ((peak - current) / peak) * 100;
}

/**
 * 计算最近 N 日年化波动率
 */
function calcRecentVolatility(closes: number[], days: number = 5): number {
  if (closes.length < days + 1) return 0.015;
  const recent = closes.slice(-days - 1);
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push((recent[i] - recent[i - 1]) / recent[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance); // daily volatility
}

/**
 * 计算成交量相对 20 日均量的倍数
 */
function calcVolumeSpike(volumes: number[]): number {
  if (volumes.length < 21) return 1.0;
  const recent = volumes.slice(-21);
  const latest = recent[recent.length - 1];
  const avg20 = recent.slice(0, 20).reduce((a, b) => a + (b || 0), 0) / 20;
  if (avg20 <= 0) return 1.0;
  return latest / avg20;
}

/**
 * 从新闻文本推断政策和脆弱性（这部分仍需 NLP）
 * 价格数据无法告诉我们政策响应
 */
function inferPolicyAndVulnerability(news: string): {
  hasPolicyResponse: boolean;
  hasCentralBankAction: boolean;
  knownVulnerabilities: string[];
} {
  const text = news.toLowerCase();

  const hasPolicyResponse = !!text.match(
    /注入|购债|QE|量化宽松|救助|bailout|纾困|降息|宽松|刺激|stimulus|紧急|立即|emergency|rate cut/
  );
  const hasCentralBankAction = !!text.match(
    /央行|美联储|fed\b|ECB|BOJ|英格兰银行|降息|利率|购债|QE|central bank/i
  );

  const knownVulnerabilities: string[] = [];
  if (text.match(/杠杆|leverage|爆仓|强平/)) knownVulnerabilities.push("高杠杆");
  if (text.match(/违约|破产|倒闭/)) knownVulnerabilities.push("违约风险");
  if (text.match(/流动性|liquidity|保证金/)) knownVulnerabilities.push("流动性紧张");
  if (text.match(/系统性|systemic|传染|连锁/)) knownVulnerabilities.push("系统性风险");

  return { hasPolicyResponse, hasCentralBankAction, knownVulnerabilities };
}

/**
 * 从真实市场数据计算校准参数
 *
 * 并行获取 S&P 500 和 VIX 数据，计算技术指标。
 * API 失败时返回 null，由上层降级为 inferMarketParams()。
 *
 * @param news 新闻文本（仅用于政策/脆弱性推断）
 * @returns 市场参数 + 数据来源标记；API 失败返回 null
 */
export async function fetchRealMarketParams(
  news: string
): Promise<RealMarketParams | null> {
  // 并行获取，不互相阻塞
  const [sp500, vixData] = await Promise.all([
    getSP500Data(),
    getVIXData(),
  ]);

  if (!sp500 || sp500.closes.length < 15) {
    console.warn("[MarketData] Failed to get S&P 500 data, falling back to inference");
    return null;
  }

  // ── 计算技术指标 ──

  const rsi = calculateRSI(sp500.closes, 14).value;
  const dropMagnitude = calcDropFromPeak(sp500.closes);
  const volatility = calcRecentVolatility(sp500.closes, 5);

  // 成交量激增
  const volumeSpike = calcVolumeSpike(sp500.volumes);

  // VIX：取最新值；若无数据，用 S&P 波动率估算
  let vix = 20;
  if (vixData && vixData.closes.length > 0) {
    const lastVix = vixData.closes[vixData.closes.length - 1];
    if (lastVix > 5 && lastVix < 100) {
      vix = Math.round(lastVix * 10) / 10;
    }
  } else {
    // 粗略估算：VIX ≈ 年化波动率 * 100 / sqrt(252)
    vix = Math.round(volatility * Math.sqrt(252) * 100);
  }

  // ── 政策和脆弱性仍从新闻推断 ──
  const { hasPolicyResponse, hasCentralBankAction, knownVulnerabilities } =
    inferPolicyAndVulnerability(news);

  console.log(
    `[MarketData] REAL: VIX=${vix} RSI=${rsi} drop=${dropMagnitude.toFixed(1)}% ` +
    `vol=${(volatility * 100).toFixed(2)}% volSpike=${volumeSpike.toFixed(2)}x`
  );

  return {
    vix,
    rsi,
    dropMagnitude: Math.round(dropMagnitude * 10) / 10,
    volatility,
    hasPolicyResponse,
    hasCentralBankAction,
    knownVulnerabilities,
    dataSource: "YAHOO_FINANCE",
  };
}
