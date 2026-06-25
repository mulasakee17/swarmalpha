/**
 * Yahoo Finance 非官方 API 数据获取模块
 *
 * 使用 Yahoo Finance v8 chart API 获取真实市场数据：
 * - S&P 500 (^GSPC): 价格序列 → 计算 RSI/跌幅/波动率
 * - VIX (^VIX): 恐慌指数
 *
 * 特点：
 * - 免费、无需 API Key
 * - 内置内存缓存（TTL 5分钟），避免限流
 * - 优雅降级：API 失败返回 null，上层可降级为推断
 */

export interface YahooChartResult {
  symbol: string;
  timestamps: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
}

// ==================== 缓存 ====================

interface CacheEntry {
  data: YahooChartResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

function getCached(symbol: string): YahooChartResult | null {
  const entry = cache.get(symbol);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(symbol);
    return null;
  }
  return entry.data;
}

function setCache(symbol: string, data: YahooChartResult): void {
  cache.set(symbol, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ==================== 数据获取 ====================

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

/**
 * 获取单个 symbol 的 OHLCV 历史数据
 *
 * @param symbol Yahoo Finance symbol (e.g. "^GSPC", "^VIX")
 * @param range  时间范围: "1mo", "3mo", "6mo", "1y"
 * @param interval 数据间隔: "1d" (日线), "1wk" (周线)
 * @returns 标准化后的 chart 数据，失败返回 null
 */
export async function fetchYahooChart(
  symbol: string,
  range: string = "3mo",
  interval: string = "1d"
): Promise<YahooChartResult | null> {
  // 先查缓存
  const cached = getCached(symbol);
  if (cached) return cached;

  const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s 超时

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SwarmAlpha/1.0)",
        "Accept": "application/json",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Yahoo] ${symbol} returned ${response.status}`);
      return null;
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      console.warn(`[Yahoo] ${symbol} no chart data in response`);
      return null;
    }

    const { timestamp, indicators } = result;
    const quote = indicators?.quote?.[0];
    if (!timestamp || !quote) {
      console.warn(`[Yahoo] ${symbol} missing timestamp or quote data`);
      return null;
    }

    const data: YahooChartResult = {
      symbol,
      timestamps: timestamp as number[],
      opens: (quote.open || []) as number[],
      highs: (quote.high || []) as number[],
      lows: (quote.low || []) as number[],
      closes: (quote.close || []) as number[],
      volumes: (quote.volume || []) as number[],
    };

    // 过滤掉 null 值（Yahoo 有时返回 null 表示停牌日）
    const validIndices: number[] = [];
    for (let i = 0; i < data.closes.length; i++) {
      if (
        data.closes[i] != null &&
        data.opens[i] != null &&
        data.highs[i] != null &&
        data.lows[i] != null
      ) {
        validIndices.push(i);
      }
    }

    const filtered: YahooChartResult = {
      symbol,
      timestamps: validIndices.map((i) => data.timestamps[i]),
      opens: validIndices.map((i) => data.opens[i]),
      highs: validIndices.map((i) => data.highs[i]),
      lows: validIndices.map((i) => data.lows[i]),
      closes: validIndices.map((i) => data.closes[i]),
      volumes: validIndices.map((i) => data.volumes[i] ?? 0),
    };

    if (filtered.closes.length < 15) {
      console.warn(`[Yahoo] ${symbol} only ${filtered.closes.length} valid data points (need >=15 for RSI)`);
      return null;
    }

    setCache(symbol, filtered);
    console.log(`[Yahoo] ${symbol} fetched ${filtered.closes.length} data points (range=${range})`);
    return filtered;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`[Yahoo] ${symbol} request timed out`);
    } else {
      console.warn(`[Yahoo] ${symbol} fetch error: ${(err as Error).message}`);
    }
    return null;
  }
}

/**
 * 获取 S&P 500 最近 3 个月日线数据
 */
export async function getSP500Data(): Promise<YahooChartResult | null> {
  return fetchYahooChart("^GSPC", "3mo", "1d");
}

/**
 * 获取 VIX 最近 3 个月日线数据
 */
export async function getVIXData(): Promise<YahooChartResult | null> {
  return fetchYahooChart("^VIX", "3mo", "1d");
}

/**
 * 获取指定历史日期附近的市场数据
 *
 * 取目标日期前 6 个月到后 3 个月的数据，
 * 足够计算 RSI、前高跌幅、以及验证后续实际走势。
 *
 * @param targetDate 目标日期 (YYYY-MM-DD)
 * @returns { sp500, vix } 或 null
 */
export async function fetchHistoricalData(
  targetDate: string
): Promise<{ sp500: YahooChartResult; vix: YahooChartResult } | null> {
  const target = new Date(targetDate + "T00:00:00Z");
  const start = new Date(target);
  start.setMonth(start.getMonth() - 6);
  const end = new Date(target);
  end.setMonth(end.getMonth() + 3);

  const period1 = Math.floor(start.getTime() / 1000);
  const period2 = Math.floor(end.getTime() / 1000);

  const fetchOne = async (symbol: string): Promise<YahooChartResult | null> => {
    const cacheKey = `${symbol}:${targetDate}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SwarmAlpha/1.0)",
          "Accept": "application/json",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[Yahoo] ${symbol} @ ${targetDate} returned ${response.status}`);
        return null;
      }

      const json = await response.json();
      const result = json?.chart?.result?.[0];
      if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;

      const { timestamp, indicators } = result;
      const quote = indicators.quote[0];

      // Filter null values
      const valid: YahooChartResult = {
        symbol,
        timestamps: [],
        opens: [], highs: [], lows: [], closes: [], volumes: [],
      };

      for (let i = 0; i < timestamp.length; i++) {
        if (quote.close?.[i] != null && quote.open?.[i] != null) {
          valid.timestamps.push(timestamp[i]);
          valid.opens.push(quote.open[i] ?? quote.close[i]);
          valid.highs.push(quote.high[i] ?? quote.close[i]);
          valid.lows.push(quote.low[i] ?? quote.close[i]);
          valid.closes.push(quote.close[i]);
          valid.volumes.push(quote.volume[i] ?? 0);
        }
      }

      if (valid.closes.length < 30) {
        console.warn(`[Yahoo] ${symbol} @ ${targetDate} only ${valid.closes.length} points`);
        return null;
      }

      setCache(cacheKey, valid);
      console.log(`[Yahoo] ${symbol} @ ${targetDate}: ${valid.closest.length} points`);
      return valid;
    } catch (err) {
      console.warn(`[Yahoo] ${symbol} @ ${targetDate}: ${(err as Error).message}`);
      return null;
    }
  };

  const [sp500, vix] = await Promise.all([fetchOne("^GSPC"), fetchOne("^VIX")]);
  if (!sp500) return null;
  return { sp500, vix: vix ?? sp500 }; // VIX fallback to S&P (will be inaccurate but not null)
}

/**
 * 清除所有缓存（用于测试或强制刷新）
 */
export function clearCache(): void {
  cache.clear();
  console.log("[Yahoo] Cache cleared");
}
