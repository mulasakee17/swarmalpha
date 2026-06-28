/**
 * Context Snapshot — 情境快照
 *
 * 从客观市场数据 (VIX/RSI/drop) 计算市场状态锚点。
 * 与因子向量 (LLM 从新闻提取的软信号) 形成互补:
 *   - 因子向量回答 "新闻在说什么"
 *   - 情景快照回答 "市场实际处于什么状态"
 *
 * Agent 可以同时看到两者, 并决定信因子还是信数据 —
 * 这本身就是一种真实的认知分歧来源。
 */

/** 市场恐惧贪婪指数 0-100 (0=极度恐惧, 100=极度贪婪) */
function computeFearGreedIndex(vix: number, rsi: number, drop: number): number {
  // VIX: 0-100 mapped to fear component (0-50 weight)
  const vixScore = Math.min(50, Math.max(0, (60 - Math.min(vix, 60)) / 60 * 50));

  // RSI: 0-100 mapped (0-30 = fear, 70-100 = greed)
  const rsiScore = Math.min(50, Math.max(0, (rsi / 100) * 50));

  // Drop: 0-25%+ mapped to fear component (0-30)
  const dropScore = Math.min(30, Math.max(0, (25 - Math.min(drop, 25)) / 25 * 30));

  return Math.round(Math.max(0, Math.min(100, vixScore + rsiScore + dropScore)));
}

function classifyVIX(vix: number): "low" | "moderate" | "elevated" | "extreme" {
  if (vix > 40) return "extreme";
  if (vix > 28) return "elevated";
  if (vix > 18) return "moderate";
  return "low";
}

function classifyRSI(rsi: number): "oversold" | "neutral" | "overbought" {
  if (rsi < 30) return "oversold";
  if (rsi > 70) return "overbought";
  return "neutral";
}

function classifyDropSeverity(drop: number): "none" | "mild" | "moderate" | "severe" | "extreme" {
  if (drop > 20) return "extreme";
  if (drop > 10) return "severe";
  if (drop > 5) return "moderate";
  if (drop > 2) return "mild";
  return "none";
}

export interface ContextSnapshot {
  /** 市场状态标签 */
  regime: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";

  /** 恐惧贪婪指数 0-100 (0=极度恐惧) */
  fearGreedIndex: number;

  /** === 预计算信号标志 === */

  /** RSI<30 AND VIX>35 — 极端恐慌底部信号 (历史准确率 68.8%) */
  isExtremeFear: boolean;
  /** RSI>70 AND VIX<15 — 极端贪婪顶部信号 */
  isExtremeGreed: boolean;
  /** RSI < 30 — 超卖 */
  isOversold: boolean;
  /** RSI > 70 — 超买 */
  isOverbought: boolean;

  /** === 定量锚点 === */
  vixLevel: "low" | "moderate" | "elevated" | "extreme";
  rsiLevel: "oversold" | "neutral" | "overbought";
  dropSeverity: "none" | "mild" | "moderate" | "severe" | "extreme";

  /** 原始数值 (方便 Agent 直接引用) */
  vix: number;
  rsi: number;
  dropMagnitude: number;

  /** 数据来源 */
  dataSource: "live" | "inferred";

  /** 人类可读摘要 */
  description: string;
}

/**
 * 从市场数据计算情境快照
 * 纯数学计算, 零 LLM 成本
 */
export function computeContextSnapshot(marketData: {
  vix: number;
  rsi: number;
  dropMagnitude: number;
  volatility?: number;
  volumeSpike?: number;
}): ContextSnapshot {
  const { vix, rsi, dropMagnitude: drop } = marketData;
  const fgi = computeFearGreedIndex(vix, rsi, drop);

  let regime: ContextSnapshot["regime"];
  if (rsi < 30 && vix > 35) regime = "extreme_fear";
  else if (rsi > 70 && vix < 15) regime = "extreme_greed";
  else if (fgi < 30) regime = "fear";
  else if (fgi > 70) regime = "greed";
  else regime = "neutral";

  const isExtremeFear = rsi < 30 && vix > 35;
  const isExtremeGreed = rsi > 70 && vix < 15;
  const isOversold = rsi < 30;
  const isOverbought = rsi > 70;

  const vixLevel = classifyVIX(vix);
  const rsiLevel = classifyRSI(rsi);
  const dropSeverity = classifyDropSeverity(drop);

  const regimeEmoji: Record<string, string> = {
    extreme_fear: "🔴", fear: "🟠", neutral: "⚪", greed: "🟢", extreme_greed: "🟣",
  };

  const description = `${regimeEmoji[regime]} ${regime.replace("_", " ")} | VIX=${vix} (${vixLevel}) RSI=${rsi} (${rsiLevel}) 跌幅=${drop}% (${dropSeverity})`;

  return {
    regime, fearGreedIndex: fgi,
    isExtremeFear, isExtremeGreed, isOversold, isOverbought,
    vixLevel, rsiLevel, dropSeverity,
    vix, rsi, dropMagnitude: drop,
    dataSource: "inferred",
    description,
  };
}

/**
 * 根据 Agent 类型计算其对情境快照的信任权重
 *
 * dataTrust ∈ [0, 1]: Agent 对硬数据的信任程度
 *   1.0 = 完全信任数据 ("VIX=45, 这绝对是底部")
 *   0.0 = 完全忽略数据 ("我只信我的故事")
 *
 * 这种权重差异本身就是信息盲区的新维度:
 *   - 数据派 (Quant, Value, Institution) vs 叙事派 (Trend, Media, Retail)
 */
export function getAgentDataTrust(agentId: string): number {
  const TRUST: Record<string, number> = {
    quant: 0.9,        // 量化: 90% 信数据
    value: 0.8,        // 价值: 80% 信数据 (extreme_fear 时抄底)
    institution: 0.7,  // 机构: 70% 信数据
    policy: 0.6,       // 政策: 60% 信数据 (政策因子也重要)
    panic: 0.2,        // 恐慌: 只 20% 信数据 (情绪主导)
    media: 0.2,        // 媒体: 叙事 > 数据
    retail: 0.2,       // 散户: 叙事 > 数据
    trend: 0.3,        // 趋势: 动量 > 数据
    contrarian: 0.7,   // 逆向: 70% 信数据 (但反向用 — extreme_fear=买入)
  };
  return TRUST[agentId] ?? 0.5;
}
