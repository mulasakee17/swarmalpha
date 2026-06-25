/**
 * 数据驱动事件分类器 v2.0
 *
 * 替代关键词匹配 — 纯基于市场数据特征判断反弹模式。
 *
 * 特征维度：
 *   1. VIX 水平（恐慌程度）
 *   2. RSI 位置（超卖程度）
 *   3. 跌幅（冲击大小）
 *   4. 波动率（市场不稳定度）
 *   5. 政策响应（是否有央行/政府背书）
 *   6. 脆弱性（杠杆/违约/系统性）
 *
 * 训练数据：14+ 手动验证事件（策展自 strict-backtest）
 *
 * 决策树逻辑：
 *   - V_REBOUND: 恐慌超卖 + 政策响应 → 历史V型反弹
 *   - L_DECLINE: 结构损伤 + 无政策 + 杠杆出清 → 持续下跌
 *   - W_RECOVERY: 中等VIX + 中等跌幅 → 震荡筑底
 *   - U_SLOW: 低VIX + 小幅回调 → 慢速恢复
 */

export type EventPattern = "V_REBOUND" | "L_DECLINE" | "W_RECOVERY" | "U_SLOW" | "UNKNOWN";

export interface ClassifierInput {
  vix: number;
  rsi: number;
  dropMagnitude: number;    // % from recent peak
  volatility: number;        // daily volatility (decimal, e.g. 0.02 = 2%)
  volumeSpike: number;       // multiple of 20-day average
  hasPolicyResponse: boolean;
  hasCentralBankAction: boolean;
  hasLeverageDamage: boolean;    // 杠杆/强制平仓
  hasSolvencyDamage: boolean;    // 违约/破产/系统性
}

export interface ClassifierResult {
  pattern: EventPattern;
  confidence: number;       // 0-100
  vScore: number;           // V型概率
  lScore: number;           // L型概率
  wScore: number;           // W型概率
  uScore: number;           // U型概率
  reasoning: string[];
}

/**
 * 数据驱动事件分类
 *
 * 决策规则基于 14 个手动验证事件的回测经验：
 *
 * V_REBOUND 判别条件（满足 ≥2 个即倾向 V）:
 *   1. VIX > 35 + RSI < 30 — 恐慌抛售高潮
 *   2. RSI < 25 — 深度超卖，均值回归力强
 *   3. 政策响应 active + 跌幅 < 25% — 央行背书
 *   4. VIX > 30 + hasCentralBankAction — 央行介入+恐慌=底部
 *
 * L_DECLINE 判别条件（满足 ≥2 个即倾向 L）:
 *   1. 杠杆/违约/系统性脆弱性 + 跌幅 > 15%
 *   2. VIX < 25 + 跌幅 > 10% + 无政策 — 阴跌
 *   3. 跌幅 > 25% + 杠杆/强制平仓 — 被迫出清
 *   4. 无政策响应 + 无央行行动 + 跌幅 > 10%
 */
export function classifyEvent(input: ClassifierInput): ClassifierResult {
  const { vix, rsi, dropMagnitude, volatility, volumeSpike,
          hasPolicyResponse, hasCentralBankAction,
          hasLeverageDamage, hasSolvencyDamage } = input;
  const reasoning: string[] = [];

  // ── 特征评分 ──

  // V型特征（历史V型反弹条件）
  let vEvidence = 0;
  if (vix > 35 && rsi < 30) { vEvidence += 3; reasoning.push("恐慌抛售高潮(VIX>35+RSI<30)"); }
  else if (vix > 30 && rsi < 25) { vEvidence += 2; reasoning.push("高恐慌+超卖(VIX>30+RSI<25)"); }

  if (rsi < 20) { vEvidence += 3; reasoning.push("极端超卖(RSI<20)→均值回归"); }
  else if (rsi < 25) { vEvidence += 2; reasoning.push("深度超卖(RSI<25)"); }
  else if (rsi < 30) { vEvidence += 1; reasoning.push("超卖(RSI<30)"); }

  // 政策响应是V型的最强信号（86%的上涨事件有政策）
  if (hasPolicyResponse && hasCentralBankAction) {
    vEvidence += 3;
    reasoning.push("政策+央行双响应（86%上涨事件特征）");
  } else if (hasCentralBankAction && dropMagnitude < 20) {
    vEvidence += 2;
    reasoning.push("央行行动+可控跌幅");
  } else if (hasPolicyResponse) {
    vEvidence += 1.5;
    reasoning.push("政策响应");
  }

  if (volumeSpike > 2.5 && rsi < 30) {
    vEvidence += 1.5;
    reasoning.push("巨量抛售+超卖→可能抛售高潮");
  }

  // L型特征（结构性下跌条件）
  let lEvidence = 0;

  // 最强信号：杠杆/强制平仓 + 大跌幅 → 必须出清
  if (hasLeverageDamage && dropMagnitude > 25) {
    lEvidence += 5; // 压倒性信号：RSI再低也没用
    reasoning.push("🔴 杠杆出清+巨大跌幅>25%→强制L型（无视超卖）");
  } else if (hasLeverageDamage && dropMagnitude > 15) {
    lEvidence += 3;
    reasoning.push("杠杆出清+大跌幅>15%");
  } else if (hasLeverageDamage && dropMagnitude > 8) {
    lEvidence += 1.5;
    reasoning.push("杠杆脆弱性+中度跌幅");
  }

  if (hasSolvencyDamage && dropMagnitude > 15) {
    lEvidence += 3;
    reasoning.push("偿付/系统性危机+大跌幅");
  } else if (hasSolvencyDamage && dropMagnitude > 8) {
    lEvidence += 1.5;
    reasoning.push("偿付风险+跌幅");
  }

  // 阴跌：低恐慌+显著跌幅+无政策+无央行（Fed2022加息确认）
  if (vix < 25 && !hasPolicyResponse && !hasCentralBankAction && dropMagnitude > 3) {
    lEvidence += 2;
    reasoning.push("低恐慌+无政策无央行→可能结构性下跌");
  }

  // 无政策+显著跌幅
  if (!hasPolicyResponse && !hasCentralBankAction && dropMagnitude > 10) {
    lEvidence += 1.5;
    reasoning.push("无政策无央行+显著跌幅");
  }

  // W型特征（震荡筑底）
  let wEvidence = 0;
  let uEvidence = 0; // U型特征
  if (vix >= 20 && vix <= 38 && rsi >= 25 && rsi <= 45 && dropMagnitude >= 8 && dropMagnitude <= 20) {
    wEvidence += 2;
    reasoning.push("中等VIX+RSI+跌幅→震荡区间");
  }
  if (hasPolicyResponse && !hasCentralBankAction && dropMagnitude > 8) {
    wEvidence += 1;
    reasoning.push("政策响应存在但不完整→可能反复");
  }

  // 低信号：当所有特征都很弱时，不强行分类
  const totalSignal = Math.max(vEvidence, lEvidence, wEvidence, uEvidence);

  if (totalSignal < 1.5) {
    return {
      pattern: "UNKNOWN",
      confidence: 25,
      vScore: 0.25, lScore: 0.25, wScore: 0.25, uScore: 0.25,
      reasoning: [...reasoning, "信号不足→无法判断"],
    };
  }

  // U型特征（慢速恢复）— 仅在其他信号也很弱时考虑
  if (vix < 20 && dropMagnitude < 8 && rsi > 35) {
    uEvidence += 1;
    reasoning.push("低VIX+小跌幅→可能慢速恢复");
  }

  // ── 强制规则（覆盖任何证据权重） ──

  // 规则1: 杠杆出清+巨大跌幅 → 强制L型（历史无一例外——2015中国股灾、2008雷曼）
  if (hasLeverageDamage && dropMagnitude > 25) {
    reasoning.push("🔴 强制L型：杠杆出清+巨大跌幅>25%，历史无一V型例外");
    return {
      pattern: "L_DECLINE",
      confidence: 75,
      vScore: 0.15, lScore: 0.75, wScore: 0.05, uScore: 0.05,
      reasoning,
    };
  }

  // 规则2: 无杠杆问题的恐慌超卖+政策 → 强制V型
  if (!hasLeverageDamage && !hasSolvencyDamage && vix > 30 && rsi < 30 && (hasPolicyResponse || hasCentralBankAction)) {
    reasoning.push("🟢 强制V型：无结构损伤+恐慌超卖+政策背书");
    return {
      pattern: "V_REBOUND",
      confidence: 70,
      vScore: 0.75, lScore: 0.10, wScore: 0.10, uScore: 0.05,
      reasoning,
    };
  }

  // ── 决策 ──

  // 计算概率
  const total = Math.max(1, vEvidence + lEvidence + wEvidence + uEvidence);
  const vProb = vEvidence / total;
  const lProb = lEvidence / total;
  const wProb = wEvidence / total;
  const uProb = uEvidence / total;

  // 选出最佳模式
  const scores = [
    { pattern: "V_REBOUND" as EventPattern, score: vEvidence, prob: vProb },
    { pattern: "L_DECLINE" as EventPattern, score: lEvidence, prob: lProb },
    { pattern: "W_RECOVERY" as EventPattern, score: wEvidence, prob: wProb },
    { pattern: "U_SLOW" as EventPattern, score: uEvidence, prob: uProb },
  ];
  scores.sort((a, b) => b.score - a.score);

  // 最高分与次高分差距
  const margin = scores[0].score - scores[1].score;

  // 如果最高分太低 → UNKNOWN
  let pattern: EventPattern;
  if (scores[0].score < 0.5) {
    pattern = "UNKNOWN";
  } else if (margin < 0.5) {
    // 太接近 → 选得分最高的
    pattern = scores[0].pattern;
  } else {
    pattern = scores[0].pattern;
  }

  // 置信度
  let confidence = scores[0].prob * 60 + Math.min(margin * 15, 25);
  if (pattern === "UNKNOWN") confidence = 20;
  confidence = Math.max(15, Math.min(85, Math.round(confidence)));

  return {
    pattern,
    confidence,
    vScore: vProb,
    lScore: lProb,
    wScore: wProb,
    uScore: uProb,
    reasoning,
  };
}
