/**
 * SwarmAlpha 校准参数字典 v1.0
 *
 * 所有可调参数集中管理，支持：
 *   1. 网格搜索自动调参
 *   2. 回测驱动优化
 *   3. 运行时覆盖
 *
 * 当前参数基于 v4.1 14事件回测调优（64.3%准确率）
 */

// ==================== 混合预测权重 ====================

export const HYBRID_WEIGHTS = {
  /** 校准系统基础权重 */
  calibrationBase: 0.45,
  /** LLM 基础权重 */
  llmBase: 0.35,
  /** 流动性危机时的校准权重 */
  liquidityCalWeight: 0.35,
  /** 流动性危机时的 LLM 权重 */
  liquidityLlmWeight: 0.20,
  /** 偿付危机时的校准权重 */
  solvencyCalWeight: 0.30,
  /** 偿付危机时的 LLM 权重 */
  solvencyLlmWeight: 0.40,
  /** LLM与校准矛盾时的权重折扣 */
  llmContradictionDiscount: 0.4,
  /** LLM与校准方向相反时的权重折扣 */
  llmOppositeDiscount: 0.5,
};

// ==================== 危机类型偏差 ====================

export const CRISIS_BIASES = {
  /** V型反弹倾向（流动性/技术性危机） */
  vRecoveryBias: 25,
  /** 流动性危机+高VIX+大跌幅时的减弱偏差 */
  vRecoveryWeakenedBias: 10,
  /** L型下跌倾向（偿付危机） */
  lDeclineBias: -15,
  /** 偿付危机+大跌幅+无政策时的加强看空偏差 */
  lDeclineStrongBias: -25,
  /** 外部冲击+无政策+大跌幅时的下跌偏差 */
  externalShockDeclineBias: -10,
  /** 外部冲击+有限跌幅时的V型偏差 */
  externalShockRecoveryBias: 15,
};

// ==================== 超卖逆向信号 ====================

export const OVERSOLD_BONUSES = {
  /** RSI < 15: 极端超卖 → 极强逆向信号 */
  extremeOversoldBonus: 30,
  /** RSI < 20: 深度超卖 → 强逆向信号 */
  deepOversoldBonus: 24,
  /** RSI < 25: 超卖 → 逆向信号 */
  oversoldBonus: 18,
  /** RSI < 30: 轻度超卖 → 弱逆向信号 */
  mildOversoldBonus: 10,
  /** RSI < 35: 偏低 → 微逆向信号 */
  lowRsiBonus: 5,
  /** 阴跌超卖(RSI<20+VIX<30): 仅微弱逆向 */
  fundamentalDeteriorationBonus: 5,
};

// ==================== 超卖阈值 ====================

export const OVERSOLD_THRESHOLDS = {
  /** 极端超卖 RSI 阈值 */
  extremeOversold: 15,
  /** 深度超卖 RSI 阈值 */
  deepOversold: 20,
  /** 超卖 RSI 阈值 */
  oversold: 25,
  /** 轻度超卖 RSI 阈值 */
  mildOversold: 30,
  /** RSI 偏低阈值 */
  lowRsi: 35,
};

// ==================== 恐慌极值检测 ====================

export const PANIC_THRESHOLDS = {
  /** 恐慌极值 VIX 阈值 */
  extremeVix: 40,
  /** 恐慌信号 VIX 阈值 */
  highVix: 35,
  /** 恐慌极值 RSI 阈值 */
  panicRsi: 25,
  /** 恐慌超卖 RSI 阈值 */
  panicOversoldRsi: 20,
  /** 阴跌 VIX 上限（VIX低于此值不算恐慌） */
  deteriorationVixMax: 30,
};

// ==================== 恐慌极值奖励 ====================

export const PANIC_BONUSES = {
  /** VIX>40+RSI<20: 恐慌极值 → 历史V型反弹信号 */
  extremePanicBonus: 20,
  /** VIX>35+RSI<25: 恐慌信号 → 可能接近底部 */
  panicSignalBonus: 12,
};

// ==================== LLM 极端值平滑 ====================

export const LLM_SMOOTHING = {
  /** LLM极端悲观阈值 */
  extremelyPessimisticThreshold: -80,
  /** 市场超卖 RSI 阈值 */
  marketOversoldThreshold: 30,
  /** 市场极端超卖 RSI 阈值 */
  marketExtremeOversoldThreshold: 20,
  /** 极端超卖时的平滑因子 */
  extremeOversoldSmoothing: 0.3,
  /** 超卖时的平滑因子 */
  oversoldSmoothing: 0.5,
  /** 大幅下跌时的平滑因子 */
  largeDropSmoothing: 0.4,
  /** 大幅下跌阈值(%) */
  largeDropThreshold: 15,
};

// ==================== W型复苏检测 ====================

export const W_PATTERN_THRESHOLDS = {
  /** VIX 下限 */
  vixMin: 25,
  /** VIX 上限 */
  vixMax: 38,
  /** RSI 下限 */
  rsiMin: 25,
  /** RSI 上限 */
  rsiMax: 45,
  /** 跌幅下限(%) */
  dropMin: 8,
  /** 跌幅上限(%) */
  dropMax: 15,
  /** W型时偏差打折系数 */
  biasDampening: 0.5,
};

// ==================== L型下跌检测 ====================

export const L_TYPE_DECLINE = {
  /** 偿付危机跌幅阈值(%) */
  solvencyDropThreshold: 15,
  /** 加强看空跌幅阈值(%) */
  strongBearDropThreshold: 15,
};

// ==================== 跌幅惩罚 ====================

export const DROP_PENALTIES = {
  /** 深度回调阈值(%) */
  deepDrop: 20,
  /** 中度回调阈值(%) */
  moderateDrop: 10,
  /** 轻度回调阈值(%) */
  mildDrop: 5,
};

// ==================== 方向判定 ====================

export const DIRECTION_THRESHOLDS = {
  /** 预测值 > 此值 = up */
  upThreshold: 10,
  /** 预测值 < -此值 = down */
  downThreshold: -10,
  /** LLM 方向相反的显著性阈值 */
  llmSignificantThreshold: 10,
  /** LLM 方向相反的幅度阈值 */
  llmOppositeMagnitude: 20,
};

// ==================== 置信度 ====================

export const CONFIDENCE_PARAMS = {
  /** 基础置信度 */
  base: 50,
  /** 收敛奖励 */
  convergenceBonus: 5,
  /** 偿付危机惩罚 */
  solvencyPenalty: -10,
  /** 无 LLM 惩罚 */
  noLlmPenalty: -5,
  /** 最小置信度 */
  min: 15,
  /** 最大置信度 */
  max: 90,
};

// ==================== 结构损伤评分 (v4.3) ====================

export const STRUCTURAL_DAMAGE = {
  /** 巨大跌幅阈值 */
  massiveDrop: 25,
  /** 大幅下跌阈值 */
  largeDrop: 15,
  /** 中度下跌阈值 */
  moderateDrop: 8,
  /** 巨大跌幅分数 */
  massiveDropScore: 0.35,
  /** 大幅下跌分数 */
  largeDropScore: 0.20,
  /** 中度下跌分数 */
  moderateDropScore: 0.08,
  /** 杠杆/强制平仓分数 */
  leverageScore: 0.25,
  /** 违约/破产/系统性分数 */
  solvencyScore: 0.20,
  /** 低VIX+持续下跌分数 */
  lowVixGrindScore: 0.15,
  /** 高VIX恐慌折扣 */
  highVixPanicDiscount: -0.10,
  /** 无政策响应分数 */
  noPolicyScore: 0.10,
  /** 结构损伤高阈值（高于此值 → 信任LLM看空） */
  highThreshold: 0.40,
  /** 结构损伤低阈值（低于此值 → 标准处理） */
  lowThreshold: 0.20,
} as const;

// ==================== LLM 方向感知权重 (v4.3) ====================

export const LLM_DIRECTION_WEIGHTS = {
  /** LLM强烈看空阈值 */
  strongBearThreshold: -40,
  /** 结构性下跌时 LLM 权重提升倍数 */
  structuralLLMBoost: 1.5,
  /** 结构性下跌时校准权重折扣 */
  structuralCalDiscount: 0.5,
  /** 恐慌超卖时 LLM 平滑因子（强平滑） */
  panicSmoothingFactor: 0.3,
  /** 中性市场 LLM 平滑因子 */
  neutralSmoothingFactor: 0.5,
} as const;

// ==================== 质量评分 ====================

export const QUALITY_SCORE_PARAMS = {
  /** 基础分 */
  base: 50,
  /** 预测强度因子 */
  predictionStrengthFactor: 0.2,
  /** 充足推理奖励 */
  sufficientReasoningBonus: 10,
  /** 弱信号惩罚 */
  weakSignalPenalty: -10,
  /** 未知危机类型惩罚 */
  unknownCrisisPenalty: -5,
  /** 最小分 */
  min: 10,
  /** 最大分 */
  max: 100,
};
