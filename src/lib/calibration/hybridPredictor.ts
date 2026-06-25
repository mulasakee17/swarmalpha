/**
 * 混合预测引擎 v4.3 — 互补性权重（校准擅长up + LLM擅长down）
 *
 * 核心策略（v4.2 回测 + 真实DeepSeek LLM 验证）：
 *   1. 校准系统擅长 up 事件（85.7%）— V型反弹时信任校准
 *   2. 真实 LLM 擅长 down 事件（100%）— 结构性下跌时信任 LLM
 *   3. 利用互补性：按市场状态动态分配权重，而非统一校准优先
 *   4. 结构损伤评分决定 LLM 平滑力度（损伤越大，越不平滑）
 *   5. L型下跌确认时压制超卖逆向信号 + 提升 LLM 权重
 *   6. 区分恐慌超卖(VIX>40)和基本面恶化超卖(VIX<30)
 *
 * v4.2 → v4.3 关键变化：
 *   - 不再一律"校准优先"；结构性损伤时 LLM 权重 > 校准
 *   - LLM 悲观信号不再盲目平滑；先判断是恐慌底还是结构性问题
 *   - 矛盾处理方向感知：LLM看空+结构损伤 → 降校准权重（不是降 LLM）
 */

import { calibratePrediction, MarketState, CalibratedPrediction, assessCrisisType, CrisisAssessment, CrisisType } from "./predictionCalibrator";
import { classifyEvent, EventPattern, ClassifierInput } from "./eventClassifierV2";
import {
  HYBRID_WEIGHTS, CRISIS_BIASES, OVERSOLD_BONUSES, OVERSOLD_THRESHOLDS,
  PANIC_THRESHOLDS, PANIC_BONUSES, LLM_SMOOTHING, W_PATTERN_THRESHOLDS,
  L_TYPE_DECLINE, DIRECTION_THRESHOLDS, CONFIDENCE_PARAMS, QUALITY_SCORE_PARAMS,
  STRUCTURAL_DAMAGE, LLM_DIRECTION_WEIGHTS,
} from "./config";

// ==================== 类型 ====================

export interface CalibrationPrediction {
  prediction: number;
  confidence: number;
  direction: "up" | "down" | "neutral";
  source: string;
  reasoning?: string[];
}

export interface LLMPredictionInput {
  consensus: number;
  direction: string;
  converged: boolean;
  totalRounds: number;
  roundDetails?: Array<{ round: number; consensus: number; variance: number }>;
}

export interface HybridPredictionResult {
  prediction: number;
  direction: "up" | "down" | "neutral";
  confidence: number;

  // 贡献分解
  calibration: { value: number; weight: number };
  llm: { value: number; weight: number; consensus: number };

  // 危机评估
  crisisAssessment?: CrisisAssessment;

  // 元信息
  reasoning: string[];
  qualityScore: number;
  warnings: string[];
}

// ==================== 核心 ====================

/**
 * 混合预测 — 校准优先 + 危机类型驱动
 *
 * 默认信任校准系统（75% 准确率）。
 * 根据危机类型调整权重：
 *   - 流动性危机/V型反弹 → 加强看多倾向
 *   - 偿付危机/L型下跌 → 加强看空倾向
 * LLM 仅作为辅助，不覆盖强信号。
 */
export function hybridPredict(
  calibrationPred: CalibrationPrediction,
  llmInput: LLMPredictionInput | null,
  marketState: MarketState,
  crisisParams?: {
    newsText: string;
    dropMagnitude: number;
    hasPolicyResponse: boolean;
    hasCentralBankAction: boolean;
    knownVulnerabilities: string[];
  }
): HybridPredictionResult {
  const reasoning: string[] = [];
  const warnings: string[] = [];

  // 提取市场状态
  const vix = marketState.vix ?? 20;
  const rsi = marketState.rsi;
  const dropMagnitude = crisisParams?.dropMagnitude ?? Math.abs(
    ((marketState.previousPrice - marketState.price) / marketState.previousPrice) * 100
  );

  // ── 1. 事件分类（v4.3: 数据驱动 + 关键词兜底） ──
  let crisisAssessment: CrisisAssessment | undefined;
  let crisisType: CrisisType = "unknown";
  let vRecoveryProb = 0.5;
  let eventPatternV2: EventPattern = "UNKNOWN";
  let classifierConfidence = 50;

  if (crisisParams) {
    // 1a. 数据驱动分类器（主要）
    const vulnText = crisisParams.knownVulnerabilities.join(" ").toLowerCase();
    const classifierInput: ClassifierInput = {
      vix,
      rsi,
      dropMagnitude,
      volatility: marketState.volatility,
      volumeSpike: marketState.volume / 1e9, // approximate
      hasPolicyResponse: crisisParams.hasPolicyResponse,
      hasCentralBankAction: crisisParams.hasCentralBankAction,
      hasLeverageDamage: /杠杆|强制平仓|爆仓|margin call/i.test(vulnText),
      hasSolvencyDamage: /违约|破产|系统性|传染|衰退/i.test(vulnText),
    };
    const v2Result = classifyEvent(classifierInput);
    eventPatternV2 = v2Result.pattern;
    classifierConfidence = v2Result.confidence;
    reasoning.push(`数据驱动分类: ${eventPatternV2} (V=${(v2Result.vScore*100).toFixed(0)}% L=${(v2Result.lScore*100).toFixed(0)}% W=${(v2Result.wScore*100).toFixed(0)}% 信度=${classifierConfidence}%)`);

    // 1b. 关键词分类器（兜底，仅在数据驱动为 UNKNOWN 时使用）
    crisisAssessment = assessCrisisType(crisisParams);
    crisisType = crisisAssessment.type;
    vRecoveryProb = crisisAssessment.vRecoveryProbability;

    // 如果数据驱动有明确判断，用它覆盖关键词分类
    if (eventPatternV2 === "V_REBOUND") {
      crisisType = "liquidity"; // 覆盖为流动性危机（V型倾向）
      vRecoveryProb = Math.max(vRecoveryProb, 0.7);
      reasoning.push("数据驱动覆盖: V_REBOUND → 流动性危机倾向");
    } else if (eventPatternV2 === "L_DECLINE") {
      crisisType = "solvency"; // 覆盖为偿付危机（L型倾向）
      vRecoveryProb = Math.min(vRecoveryProb, 0.25);
      reasoning.push("数据驱动覆盖: L_DECLINE → 偿付危机倾向");
    } else if (eventPatternV2 !== "UNKNOWN") {
      reasoning.push(`数据驱动分类: ${eventPatternV2}`);
    } else {
      reasoning.push(`关键词兜底: ${crisisType} (V概率: ${(vRecoveryProb * 100).toFixed(0)}%)`);
    }
  }

  // 是否为流动性危机
  const isLiquidityCrisis = crisisType === "liquidity" || crisisType === "technical";

  // ── 2. 根据危机类型计算权重 ──
  let calWeight = HYBRID_WEIGHTS.calibrationBase;
  let llmWeight = HYBRID_WEIGHTS.llmBase;
  let crisisBias = 0;      // 危机类型偏差

  // V型反弹倾向：流动性危机或高V概率
  if ((crisisType === "liquidity" || crisisType === "technical") && vRecoveryProb > 0.5) {
    if (vix > PANIC_THRESHOLDS.extremeVix && (crisisParams?.dropMagnitude || 0) > L_TYPE_DECLINE.solvencyDropThreshold) {
      crisisBias = CRISIS_BIASES.vRecoveryWeakenedBias;
      reasoning.push(`流动性危机+高VIX+大跌幅→V型反弹减弱(+${CRISIS_BIASES.vRecoveryWeakenedBias})`);
    } else {
      calWeight = HYBRID_WEIGHTS.liquidityCalWeight;
      llmWeight = HYBRID_WEIGHTS.liquidityLlmWeight;
      crisisBias = CRISIS_BIASES.vRecoveryBias;
      reasoning.push(`流动性/技术性危机→倾向V型反弹(+${CRISIS_BIASES.vRecoveryBias})`);
    }
  }
  // L型下跌倾向：偿付危机
  else if (crisisType === "solvency") {
    calWeight = HYBRID_WEIGHTS.solvencyCalWeight;
    llmWeight = HYBRID_WEIGHTS.solvencyLlmWeight;
    if (dropMagnitude > L_TYPE_DECLINE.solvencyDropThreshold && !crisisParams?.hasPolicyResponse) {
      crisisBias = CRISIS_BIASES.lDeclineStrongBias;
      reasoning.push(`偿付危机+大跌幅+无政策→加强看空(${CRISIS_BIASES.lDeclineStrongBias})`);
    } else {
      crisisBias = CRISIS_BIASES.lDeclineBias;
      reasoning.push(`偿付/结构性危机→倾向L型下跌(${CRISIS_BIASES.lDeclineBias})`);
    }
  }
  // 外部冲击：取决于跌幅
  else if (crisisType === "external_shock") {
    if ((crisisParams?.hasPolicyResponse === false || crisisParams?.hasCentralBankAction === false)
        && (crisisParams?.dropMagnitude || 0) > W_PATTERN_THRESHOLDS.dropMin) {
      crisisBias = CRISIS_BIASES.externalShockDeclineBias;
      reasoning.push(`外部冲击+无政策响应+大跌幅→下跌风险(${CRISIS_BIASES.externalShockDeclineBias})`);
    } else if (crisisParams && crisisParams.dropMagnitude < W_PATTERN_THRESHOLDS.dropMin) {
      crisisBias = CRISIS_BIASES.externalShockRecoveryBias;
      reasoning.push(`外部冲击+有限跌幅→倾向V型(+${CRISIS_BIASES.externalShockRecoveryBias})`);
    }
  }

  // ── 3. 校准系统（主力） ──
  const calValue = calibrationPred.prediction;
  reasoning.push(`校准系统预测: ${calValue}`);

  // ── 3.5 W型复苏检测（v4.0新增） ──
  // W型特征：中等VIX + 中等RSI + 有限跌幅 → 震荡筑底，非V非L
  const wPatternVix = vix >= W_PATTERN_THRESHOLDS.vixMin && vix <= W_PATTERN_THRESHOLDS.vixMax;
  const wPatternRsi = rsi >= W_PATTERN_THRESHOLDS.rsiMin && rsi <= W_PATTERN_THRESHOLDS.rsiMax;
  const wPatternDrop = dropMagnitude >= W_PATTERN_THRESHOLDS.dropMin && dropMagnitude <= W_PATTERN_THRESHOLDS.dropMax;
  const isWPattern = wPatternVix && wPatternRsi && wPatternDrop && !isLiquidityCrisis;

  if (isWPattern) {
    reasoning.push(`W型复苏特征：VIX(${vix})/RSI(${rsi})/跌幅(${dropMagnitude}%)→震荡筑底`);
    crisisBias *= W_PATTERN_THRESHOLDS.biasDampening;
    reasoning.push("W型模式→降低方向偏差，向中性收敛");
  }

  // ── 3.6 结构损伤评分（v4.3新增） ──
  // 核心洞察：真实DeepSeek在down事件上100%准确，但在恐慌超卖时错误看空。
  // 结构损伤评分决定：这是结构性下跌（信任LLM）还是恐慌超卖（信任校准）。
  let structuralDamageScore = 0;

  if (crisisParams) {
    // 跌幅贡献
    if (dropMagnitude > STRUCTURAL_DAMAGE.massiveDrop) {
      structuralDamageScore += STRUCTURAL_DAMAGE.massiveDropScore;
    } else if (dropMagnitude > STRUCTURAL_DAMAGE.largeDrop) {
      structuralDamageScore += STRUCTURAL_DAMAGE.largeDropScore;
    } else if (dropMagnitude > STRUCTURAL_DAMAGE.moderateDrop) {
      structuralDamageScore += STRUCTURAL_DAMAGE.moderateDropScore;
    }

    // 脆弱性贡献
    const vulnText = crisisParams.knownVulnerabilities.join(" ").toLowerCase();
    if (/杠杆|强制平仓|爆仓/i.test(vulnText)) {
      structuralDamageScore += STRUCTURAL_DAMAGE.leverageScore;
    }
    if (/违约|破产|系统性|传染/i.test(vulnText)) {
      structuralDamageScore += STRUCTURAL_DAMAGE.solvencyScore;
    }

    // VIX 上下文：低VIX+下跌=阴跌结构性问题；高VIX+下跌=可能是恐慌底
    if (vix < PANIC_THRESHOLDS.deteriorationVixMax && dropMagnitude > STRUCTURAL_DAMAGE.moderateDrop) {
      structuralDamageScore += STRUCTURAL_DAMAGE.lowVixGrindScore;
    } else if (vix > PANIC_THRESHOLDS.extremeVix && dropMagnitude > STRUCTURAL_DAMAGE.moderateDrop) {
      structuralDamageScore += STRUCTURAL_DAMAGE.highVixPanicDiscount;
    }

    // 政策响应：无政策=更可能是结构性问题
    if (!crisisParams.hasPolicyResponse && !crisisParams.hasCentralBankAction) {
      structuralDamageScore += STRUCTURAL_DAMAGE.noPolicyScore;
    }

    structuralDamageScore = Math.max(0, Math.min(1, structuralDamageScore));
    reasoning.push(`结构损伤评分: ${(structuralDamageScore * 100).toFixed(0)}%`);
  }

  // ── 4. LLM 辅助（v4.3 互补性权重） ──
  // 核心逻辑：
  //   结构损伤高 → LLM看空信号有价值，不平滑，提升LLM权重
  //   结构损伤低+超卖 → 恐慌底，LLM看空是噪音，强平滑，降LLM权重
  let llmValue = 0;
  let llmConsensus = 0;
  const isStructuralDecline = structuralDamageScore >= STRUCTURAL_DAMAGE.highThreshold;
  const isPanicBottom = structuralDamageScore < STRUCTURAL_DAMAGE.lowThreshold
    && marketState.rsi < LLM_SMOOTHING.marketOversoldThreshold
    && vix > PANIC_THRESHOLDS.highVix;

  if (llmInput) {
    llmConsensus = llmInput.consensus;
    const llmIsBearish = llmConsensus < LLM_DIRECTION_WEIGHTS.strongBearThreshold;

    if (isStructuralDecline && llmIsBearish) {
      // 🔴 结构性下跌 + LLM看空 → 这是LLM最擅长的场景（100%准确），不平滑
      llmValue = llmConsensus; // 不折扣
      llmWeight *= LLM_DIRECTION_WEIGHTS.structuralLLMBoost;
      calWeight *= LLM_DIRECTION_WEIGHTS.structuralCalDiscount;
      reasoning.push(`结构性下跌(损伤${(structuralDamageScore*100).toFixed(0)}%)+LLM看空(${llmConsensus})→信任LLM，提升权重至${(llmWeight*100).toFixed(0)}%`);
    } else if (isPanicBottom && llmIsBearish) {
      // 🟢 恐慌底 + LLM看空 → LLM在恐慌底时往往错误（会错过V型反弹），强平滑
      llmValue = llmConsensus * LLM_DIRECTION_WEIGHTS.panicSmoothingFactor;
      llmWeight *= 0.4; // 大幅降低LLM影响
      reasoning.push(`恐慌底(VIX${vix}+RSI${marketState.rsi})+LLM看空→强平滑(${LLM_DIRECTION_WEIGHTS.panicSmoothingFactor}x)，降低LLM权重`);
      warnings.push("LLM情绪被强平滑：恐慌极值往往是底部，LLM在此场景下历史准确率低");
    } else if (llmIsBearish && marketState.rsi < LLM_SMOOTHING.marketOversoldThreshold) {
      // 🟡 超卖+LLM看空，但非极端 → 温和平滑
      const smoothingFactor = marketState.rsi < LLM_SMOOTHING.marketExtremeOversoldThreshold
        ? LLM_SMOOTHING.extremeOversoldSmoothing
        : LLM_SMOOTHING.oversoldSmoothing;
      llmValue = llmConsensus * smoothingFactor;
      reasoning.push(`LLM看空(${llmConsensus})+市场超卖(${marketState.rsi})→温和平滑(${smoothingFactor}x)→${llmValue.toFixed(1)}`);
    } else if (llmIsBearish && crisisParams && crisisParams.dropMagnitude > LLM_SMOOTHING.largeDropThreshold) {
      // 大幅下跌但非结构性也非恐慌 → 中度平滑
      llmValue = llmConsensus * LLM_DIRECTION_WEIGHTS.neutralSmoothingFactor;
      reasoning.push(`LLM看空(${llmConsensus})+大幅下跌(${crisisParams.dropMagnitude}%)→中度平滑→${llmValue.toFixed(1)}`);
    } else {
      llmValue = llmInput.consensus;
    }

    // 方向确认
    if (Math.sign(llmValue) === Math.sign(calValue)) {
      reasoning.push(`LLM确认校准方向(${llmValue.toFixed(1)})`);
    }
  }

  // ── 5. 超卖增强 + 恐慌极值检测（v4.2 下跌修复） ──
  let oversoldBonus = 0;

  const isPanicOversold = vix > PANIC_THRESHOLDS.extremeVix && marketState.rsi < PANIC_THRESHOLDS.panicOversoldRsi;
  const isFundamentalDeterioration = marketState.rsi < PANIC_THRESHOLDS.panicOversoldRsi && vix < PANIC_THRESHOLDS.deteriorationVixMax;
  // v4.3: L型下跌 = 关键词匹配 OR 结构损伤评分高
  const isLTypeDecline = (crisisType === "solvency" && dropMagnitude > L_TYPE_DECLINE.solvencyDropThreshold && !crisisParams?.hasPolicyResponse)
    || structuralDamageScore >= STRUCTURAL_DAMAGE.highThreshold;

  if (isLTypeDecline) {
    oversoldBonus = 0;
    reasoning.push(`L型下跌确认(偿付+大跌幅${dropMagnitude}%+无政策)→压制超卖逆向信号`);
  } else if (isFundamentalDeterioration) {
    oversoldBonus = OVERSOLD_BONUSES.fundamentalDeteriorationBonus;
    reasoning.push(`阴跌超卖(RSI${marketState.rsi}+VIX${vix})→可能不是恐慌底，仅微弱逆向(+${OVERSOLD_BONUSES.fundamentalDeteriorationBonus})`);
  } else if (marketState.rsi < OVERSOLD_THRESHOLDS.extremeOversold) {
    oversoldBonus = OVERSOLD_BONUSES.extremeOversoldBonus;
    reasoning.push(`RSI极端超卖(${marketState.rsi})→极强逆向信号(+${OVERSOLD_BONUSES.extremeOversoldBonus})`);
  } else if (marketState.rsi < OVERSOLD_THRESHOLDS.deepOversold) {
    oversoldBonus = OVERSOLD_BONUSES.deepOversoldBonus;
    reasoning.push(`RSI深度超卖(${marketState.rsi})→强逆向信号(+${OVERSOLD_BONUSES.deepOversoldBonus})`);
  } else if (marketState.rsi < OVERSOLD_THRESHOLDS.oversold) {
    oversoldBonus = OVERSOLD_BONUSES.oversoldBonus;
    reasoning.push(`RSI超卖(${marketState.rsi})→逆向信号(+${OVERSOLD_BONUSES.oversoldBonus})`);
  } else if (marketState.rsi < OVERSOLD_THRESHOLDS.mildOversold) {
    oversoldBonus = OVERSOLD_BONUSES.mildOversoldBonus;
    reasoning.push(`RSI轻度超卖(${marketState.rsi})→弱逆向信号(+${OVERSOLD_BONUSES.mildOversoldBonus})`);
  } else if (marketState.rsi < OVERSOLD_THRESHOLDS.lowRsi) {
    oversoldBonus = OVERSOLD_BONUSES.lowRsiBonus;
    reasoning.push(`RSI偏低(${marketState.rsi})→微逆向(+${OVERSOLD_BONUSES.lowRsiBonus})`);
  }

  // 恐慌极值检测：高VIX + 深度超卖 = 恐慌抛售高潮，历史上往往是底部
  if (!isLTypeDecline) {
    const isPanicClimax = vix > PANIC_THRESHOLDS.highVix && marketState.rsi < PANIC_THRESHOLDS.panicRsi;
    if (isPanicOversold) {
      oversoldBonus += PANIC_BONUSES.extremePanicBonus;
      reasoning.push(`恐慌极值(VIX${vix}+RSI${marketState.rsi})→历史V型反弹信号(+${PANIC_BONUSES.extremePanicBonus})`);
    } else if (isPanicClimax) {
      oversoldBonus += PANIC_BONUSES.panicSignalBonus;
      reasoning.push(`恐慌信号(VIX${vix}+RSI${marketState.rsi})→可能接近底部(+${PANIC_BONUSES.panicSignalBonus})`);
    }
  }

  // ── 5.5 矛盾处理（v4.3 方向感知） ──
  // 旧逻辑：一律降LLM权重（v4.2 bug: LLM 100%准确于down也被压制）
  // 新逻辑：按结构损伤判断信任谁
  const calAndLlmDisagree = Math.abs(calValue) > DIRECTION_THRESHOLDS.llmSignificantThreshold
    && Math.abs(llmValue) > DIRECTION_THRESHOLDS.llmSignificantThreshold
    && Math.sign(calValue) !== Math.sign(llmValue);

  if (calAndLlmDisagree) {
    if (isStructuralDecline && llmValue < 0) {
      // 结构性下跌+LLM看空+校准看多 → 信任LLM，进一步降校准权重
      calWeight *= 0.6;
      reasoning.push(`结构性下跌+矛盾→降校准权重至${(calWeight*100).toFixed(0)}%（LLM在down事件100%准确）`);
    } else if (isPanicBottom && calValue > 0) {
      // 恐慌底+校准看多+LLM看空 → 信任校准（校准在up事件85.7%准确）
      llmWeight *= 0.3;
      reasoning.push(`恐慌底+矛盾→大幅降LLM权重至${(llmWeight*100).toFixed(0)}%（校准在V型反弹85.7%准确）`);
    } else {
      // 其他矛盾场景 → 温和处理
      llmWeight *= 0.6;
      reasoning.push(`校准(${calValue.toFixed(0)})与LLM(${llmValue.toFixed(0)})方向相反→温和降LLM权重`);
    }
  }

  // ── 6. 融合计算 ──
  const totalWeight = calWeight + llmWeight;
  let prediction = totalWeight > 0
    ? (calValue * calWeight + llmValue * llmWeight) / totalWeight
    : calValue;

  prediction += crisisBias + oversoldBonus;
  prediction = Math.max(-100, Math.min(100, prediction));

  // ── 7. 方向 & 置信度 ──
  const direction = prediction > DIRECTION_THRESHOLDS.upThreshold ? "up"
    : prediction < DIRECTION_THRESHOLDS.downThreshold ? "down" : "neutral";

  let confidence = calibrationPred.confidence;
  if (llmInput?.converged && Math.sign(llmInput.consensus) === Math.sign(prediction)) {
    confidence += CONFIDENCE_PARAMS.convergenceBonus;
  }
  if (crisisAssessment?.type === "solvency") {
    confidence += CONFIDENCE_PARAMS.solvencyPenalty;
  }
  if (!llmInput) {
    confidence += CONFIDENCE_PARAMS.noLlmPenalty;
    warnings.push("无LLM数据→仅校准系统");
  }
  confidence = Math.max(CONFIDENCE_PARAMS.min, Math.min(CONFIDENCE_PARAMS.max, Math.round(confidence)));

  // ── 8. 质量评分 ──
  let qualityScore = QUALITY_SCORE_PARAMS.base;
  qualityScore += Math.abs(calibrationPred.prediction) * QUALITY_SCORE_PARAMS.predictionStrengthFactor;
  if (calibrationPred.reasoning && calibrationPred.reasoning.length >= 2) qualityScore += QUALITY_SCORE_PARAMS.sufficientReasoningBonus;
  if (Math.abs(calibrationPred.prediction) < DIRECTION_THRESHOLDS.llmSignificantThreshold) qualityScore += QUALITY_SCORE_PARAMS.weakSignalPenalty;
  if (crisisAssessment?.type === "unknown") qualityScore += QUALITY_SCORE_PARAMS.unknownCrisisPenalty;
  qualityScore = Math.max(QUALITY_SCORE_PARAMS.min, Math.min(QUALITY_SCORE_PARAMS.max, Math.round(qualityScore)));

  if (crisisAssessment?.type === "solvency") {
    warnings.push("偿付/结构性危机→恢复周期可能更长");
  } else if (crisisAssessment?.type === "liquidity") {
    reasoning.push("流动性危机→历史倾向于快速恢复");
  }

  return {
    prediction,
    direction,
    confidence,
    calibration: { value: calValue, weight: calWeight },
    llm: { value: llmValue, weight: llmWeight, consensus: llmConsensus },
    crisisAssessment,
    reasoning,
    qualityScore,
    warnings,
  };
}

// ==================== 兼容旧版导出 ====================

// 旧版函数保留签名，内部委托给新版
export { calibratePrediction, assessCrisisType };
export type { MarketState, CalibratedPrediction, CrisisAssessment };
