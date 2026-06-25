/**
 * Agent 因子解释层 — v9.1 五因子正交体系
 *
 * 每个 Agent 只能看到其权限内的方向因子 (强制信息盲区)。
 * uncertainty 因子始终可见 — 作为元因子调节置信度而非信念方向。
 * Agent 不直接输出"涨跌" — 只输出因子对其框架的影响。
 *
 * 核心公式:
 *   rawBelief = Σ(directionalFactor.value × weight × confidence/100) / Σ(|weight| × confidence/100)
 *   belief = applyInterpretationStyle(rawBelief)
 *   confidence = baseConfidence × (1 - uncertainty × sensitivity)
 */

import {
  V9AgentDefinition,
  V9AgentState,
  ExtractedFactor,
  FactorCategory,
} from "./types";
import { META_FACTORS } from "./agentDefinitions";

// ==================== 因子过滤 ====================

/** 根据 Agent 权限过滤可见因子
 *  - 方向因子: 按权限过滤
 *  - 元因子 (uncertainty): 始终可见
 */
export function filterVisibleFactors(
  allFactors: ExtractedFactor[],
  agent: V9AgentDefinition,
  disableBlindness: boolean = false
): ExtractedFactor[] {
  if (disableBlindness) return allFactors;
  return allFactors.filter(f =>
    agent.permissions.visibleFactors.includes(f.category) ||
    META_FACTORS.includes(f.category)
  );
}

// ==================== 信念计算 ====================

/**
 * 从可见因子计算 Agent 信念
 *
 * 核心公式:
 *   rawBelief = Σ(directionalFactor.value × weight × confidence/100) / Σ(|weight| × confidence/100)
 *   然后根据 interpretationStyle 做非线性变换
 *
 * uncertainty 因子不参与方向信念计算 — 只调节最终的 confidence。
 */
export function computeAgentBelief(
  visibleFactors: ExtractedFactor[],
  agent: V9AgentDefinition
): { belief: number; confidence: number; interpretation: string } {
  // 分离方向因子和元因子
  const directionalFactors = visibleFactors.filter(f => !META_FACTORS.includes(f.category));
  const uncertaintyFactor = visibleFactors.find(f => f.category === "uncertainty");

  if (directionalFactors.length === 0) {
    const conf = applyUncertaintyDiscount(30, uncertaintyFactor, agent);
    return { belief: agent.initialBias, confidence: conf, interpretation: "无可见方向因子" };
  }

  // ── 方向信念: 加权求和 ──
  let weightedSum = 0;
  let totalWeight = 0;

  for (const factor of directionalFactors) {
    const weight = agent.permissions.factorWeights[factor.category] ?? 1.0;
    weightedSum += factor.value * weight * (factor.confidence / 100);
    totalWeight += Math.abs(weight) * (factor.confidence / 100);
  }

  const rawBelief = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // ── 解释风格的非线性变换 ──
  const belief = applyInterpretationStyle(rawBelief, agent.permissions.interpretationStyle);

  // ── 置信度 ──
  // 基础: 方向因子平均置信度
  const avgFactorConfidence = directionalFactors.reduce((s, f) => s + f.confidence, 0) / directionalFactors.length;
  let confidence = Math.round(avgFactorConfidence * 0.8 + 10);

  // 不确定性折扣
  confidence = applyUncertaintyDiscount(confidence, uncertaintyFactor, agent);

  // 生成解释
  const interpretation = buildInterpretation(directionalFactors, uncertaintyFactor, agent);

  return {
    belief: Math.round(belief * 100) / 100,
    confidence: Math.min(95, Math.max(10, confidence)),
    interpretation,
  };
}

// ==================== 不确定性折扣 ====================

/**
 * 不确定性因子调节置信度
 *
 * 不确定性高 → 大多数 Agent 信心降低
 * 但不同 Agent 反应不同:
 *   Panic (1.2):    不确定性 → 极度恐慌, 信心骤降
 *   Value (-0.2):   不确定性 → 意味着错误定价, 信心上升
 *   Contrarian (-0.5): 不确定性 → 逆向机会, 信心上升
 *   Quant (0.1):    不确定性 → 几乎不影响量化模型
 */
function applyUncertaintyDiscount(
  baseConfidence: number,
  uncertaintyFactor: ExtractedFactor | undefined,
  agent: V9AgentDefinition
): number {
  if (!uncertaintyFactor || uncertaintyFactor.value === 0) return baseConfidence;

  const uncertainty = uncertaintyFactor.value; // 0-100
  const sensitivity = agent.permissions.uncertaintySensitivity;

  // discount = uncertainty/100 × sensitivity
  // sensitivity > 0 → 信心降低
  // sensitivity < 0 → 信心上升
  const discount = (uncertainty / 100) * sensitivity * 30; // max ±30pp

  return Math.round(baseConfidence - discount);
}

// ==================== 解释风格 ====================

/** 解释风格的非线性变换 */
function applyInterpretationStyle(raw: number, style: string): number {
  switch (style) {
    case "sentiment":
      // Panic 专用: 极端信号剧烈跳变 (S型)
      return raw * 1.3;

    case "contrarian":
      // 逆向: 因子越极端, 越反向
      if (Math.abs(raw) > 50) return -raw * 0.8;
      if (Math.abs(raw) > 30) return -raw * 0.4;
      return raw * 0.3;

    case "statistical":
      // 统计: 线性但压缩极端值
      return raw * 0.85;

    case "momentum":
      // 趋势: 放大中等信号 (追涨杀跌), 平方根压缩极值
      return raw > 0 ? Math.sqrt(raw / 100) * 100 : -Math.sqrt(-raw / 100) * 100;

    case "narrative":
      // 叙事: 线性跟随, 轻度放大
      return raw * 1.1;

    case "value":
      // 价值: 逆势买入倾向 — 负值放大 (跌多了敢买), 正值减弱
      if (raw < 0) return raw * 1.2;  // 超跌时信念更强
      return raw * 0.9;                // 上涨时反而保守

    case "macro":
    default:
      // 宏观/机构: 线性, 最客观
      return raw;
  }
}

// ==================== 解释生成 ====================

function buildInterpretation(
  directionalFactors: ExtractedFactor[],
  uncertaintyFactor: ExtractedFactor | undefined,
  agent: V9AgentDefinition
): string {
  const sorted = [...directionalFactors].sort((a, b) => {
    const wa = Math.abs(a.value * (agent.permissions.factorWeights[a.category] ?? 1));
    const wb = Math.abs(b.value * (agent.permissions.factorWeights[b.category] ?? 1));
    return wb - wa;
  });

  const parts = sorted.slice(0, 3).map(f => {
    const tag = f.value > 20 ? "↑" : f.value < -20 ? "↓" : "→";
    return `${f.category}${tag}${Math.abs(f.value)}`;
  });

  if (uncertaintyFactor && uncertaintyFactor.value > 50) {
    parts.push(`U:${uncertaintyFactor.value}`);
  }

  return parts.join(" ");
}

// ==================== 批量 Agent 计算 ====================

/**
 * 从因子向量计算所有 Agent 的状态
 *
 * @returns Agent 状态映射 + 异质性指标 (beliefStd)
 */
export function computeAllAgentStates(
  factorVector: { factors: ExtractedFactor[] },
  agents: V9AgentDefinition[],
  config: {
    disableBlindness?: boolean;
    previousStates?: Record<string, V9AgentState>;
    hysteresisFactor?: number;
  } = {}
): {
  states: Record<string, V9AgentState>;
  beliefStd: number;
} {
  const states: Record<string, V9AgentState> = {};

  for (const agent of agents) {
    const visible = filterVisibleFactors(factorVector.factors, agent, config.disableBlindness);
    const { belief, confidence, interpretation } = computeAgentBelief(visible, agent);

    // 可选的磁滞 (弱证据守卫)
    let finalBelief = belief;
    if (config.previousStates?.[agent.id] && config.hysteresisFactor && config.hysteresisFactor > 0) {
      const prev = config.previousStates[agent.id];
      const wouldFlip = Math.sign(belief) !== Math.sign(prev.belief) && prev.belief !== 0 && belief !== 0;
      if (wouldFlip && Math.abs(belief - prev.belief) < 30) {
        finalBelief = prev.belief * config.hysteresisFactor + belief * (1 - config.hysteresisFactor);
      }
    }

    states[agent.id] = {
      agentId: agent.id,
      belief: finalBelief,
      confidence,
      visibleFactors: visible,
      interpretation,
      previousBelief: config.previousStates?.[agent.id]?.belief ?? 0,
    };
  }

  // 异质性指标: 信念标准差
  const beliefs = Object.values(states).map(s => s.belief);
  const mean = beliefs.reduce((a, b) => a + b, 0) / beliefs.length;
  const variance = beliefs.reduce((s, v) => s + (v - mean) ** 2, 0) / beliefs.length;
  const beliefStd = Math.sqrt(variance);

  return { states, beliefStd };
}
