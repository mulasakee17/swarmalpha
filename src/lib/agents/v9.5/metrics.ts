/**
 * SwarmAlpha v9.5 — 共识度量引擎
 *
 * 三个核心指标:
 *   1. Consensus Score   — 共识强度 (Agent 们在多大程度上达成一致)
 *   2. Polarization Score — 极化程度 (Agent 们分裂成对立阵营的程度)
 *   3. Fragility Score   — 共识脆弱性 (当前共识有多容易被打破)
 *
 * 全部纯数学，从已有 Agent 状态 + 诊断数据计算。
 * 零 LLM 调用。
 */

import { V9AgentDefinition, V9AgentState, V9Direction } from "../v9/types";
import { ConsensusMetrics } from "./types";

// ==================== 统计工具 ====================

function std(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ==================== 指标 1: Consensus Score ====================

/**
 * Consensus Score — 共识强度
 *
 * 组合三个维度:
 *   - sync_component (40%): Kuramoto 序参量 — 相位同步度
 *   - direction_component (30%): 共识绝对值 — 方向信号有多强
 *   - agreement_component (30%): (1 - belief_std/100) — Agent 间的一致性
 *
 * @param kuramotoR — Kuramoto 序参量 r ∈ [0, 1]
 * @param consensus — 加权共识值 [-100, 100]
 * @param beliefStd — 信念标准差 [0, 100]
 */
export function computeConsensusScore(
  kuramotoR: number,
  consensus: number,
  beliefStd: number
): number {
  const sync = clamp(kuramotoR, 0, 1) * 100;
  const direction = clamp(Math.abs(consensus), 0, 50) * 2; // 规范化到 [0, 100]
  const agreement = Math.max(0, 100 - beliefStd);

  const score = 0.4 * sync + 0.3 * direction + 0.3 * agreement;
  return Math.round(clamp(score, 0, 100));
}

// ==================== 指标 2: Polarization Score ====================

/**
 * Polarization Score — 极化程度
 *
 * 衡量 Agent 是否分裂成两个极端对立的阵营。
 * 不同于 disagreement (belief_std) — 极化强调的是"形成了两个对立的集团"。
 *
 * 两个因素:
 *   - extremity_product (50%): 多头强度 × 空头强度 — 两端都要强
 *   - bimodality (50%): (1 - neutral_ratio) × (belief_std / 100) — 中间少 + 分歧大
 *
 * @param agents — Agent 定义
 * @param states — Agent 状态
 */
export function computePolarizationScore(
  agents: V9AgentDefinition[],
  states: Record<string, V9AgentState>
): number {
  // 分离多头和空头
  let bullWeightedSum = 0;
  let bullTotalWeight = 0;
  let bearWeightedSum = 0;
  let bearTotalWeight = 0;
  let neutralCount = 0;

  for (const agent of agents) {
    const state = states[agent.id];
    if (!state) continue;

    const weight = agent.influenceWeight * (state.confidence / 100);

    if (state.belief > 15) {
      bullWeightedSum += state.belief * weight;
      bullTotalWeight += weight;
    } else if (state.belief < -15) {
      bearWeightedSum += Math.abs(state.belief) * weight;
      bearTotalWeight += weight;
    } else {
      neutralCount++;
    }
  }

  const bullishStrength =
    bullTotalWeight > 0 ? bullWeightedSum / bullTotalWeight : 0;
  const bearishStrength =
    bearTotalWeight > 0 ? bearWeightedSum / bearTotalWeight : 0;

  // 极化的本质: 两端都强 + 中间少
  const extremityProduct = clamp(
    (bullishStrength * bearishStrength) / 2500,
    0,
    1
  );

  const neutralRatio = agents.length > 0 ? neutralCount / agents.length : 0;
  const beliefValues = Object.values(states).map((s) => s.belief);
  const beliefStd = std(beliefValues);

  const bimodality = (1 - neutralRatio) * clamp(beliefStd / 100, 0, 1);

  const score = (0.5 * extremityProduct + 0.5 * bimodality) * 100;
  return Math.round(clamp(score, 0, 100));
}

// ==================== 指标 3: Fragility Score ====================

/**
 * Fragility Score — 共识脆弱性
 *
 * 衡量当前共识有多容易被打破。
 *
 * 三个因素:
 *   - concentration_risk (40%): 最大单一 Agent 贡献占比
 *   - flip_risk (30%): 需要移除多少 Agent 才能翻转共识方向
 *   - blindness_risk (30%): 关闭信息盲区后共识偏移多少
 *
 * @param maxContributionPct — 单一 Agent 的最大贡献百分比 (来自 diagnostics.attribution)
 * @param agentsToFlip — 需要移除多少 Agent 才能翻转方向 (来自 diagnostics.counterfactuals)
 * @param blindnessDelta — 关闭盲区后共识偏移的绝对值 (来自 diagnostics.counterfactuals)
 * @param agentCount — 总 Agent 数量
 */
export function computeFragilityScore(
  maxContributionPct: number,
  agentsToFlip: number,
  blindnessDelta: number,
  agentCount: number
): number {
  // 集中度风险: 最大贡献超过 25% 时开始计入
  const concentrationRisk = clamp((maxContributionPct - 25) / 75, 0, 1);

  // 翻转风险: 需要移除的 Agent 越少，越脆弱
  const flipRisk = clamp(1 - agentsToFlip / agentCount, 0, 1);

  // 盲区风险: 关闭盲区后共识偏移越大，越脆弱 (30点为满)
  const blindnessRisk = clamp(Math.abs(blindnessDelta) / 30, 0, 1);

  const score =
    (0.4 * concentrationRisk + 0.3 * flipRisk + 0.3 * blindnessRisk) * 100;
  return Math.round(clamp(score, 0, 100));
}

// ==================== 联合指标计算 ====================

/**
 * 从 v9 模拟结果计算所有三个共识度量指标
 *
 * @param agents — Agent 定义
 * @param states — Agent 最终状态
 * @param consensus — 最终共识值
 * @param beliefStd — 信念标准差
 * @param kuramotoR — Kuramoto 序参量 (可选，如不可用则从 states 计算)
 * @param diagnostics — v9 诊断数据 (用于 Fragility Score)
 */
export function computeAllMetrics(
  agents: V9AgentDefinition[],
  states: Record<string, V9AgentState>,
  consensus: number,
  beliefStd: number,
  kuramotoR?: number,
  diagnostics?: {
    attribution?: Array<{ contributionPct?: number }>;
    counterfactuals?: {
      agentsToFlip?: number;
      variants?: Array<{ disableBlindness?: boolean; deltaConsensus?: number }>;
    };
  }
): ConsensusMetrics {
  // ── 1. Consensus Score ──
  // 如果没有提供 kuramotoR, 从 belief 分布估算
  let kr = kuramotoR ?? 0.5;
  if (kuramotoR === undefined) {
    // 从 belief 估算: 更一致的 belief → 更高的 r
    const normalizedStd = clamp(beliefStd / 100, 0, 1);
    kr = 1 - normalizedStd * 0.8; // 简化的序参量估算
  }

  const consensusScore = computeConsensusScore(kr, consensus, beliefStd);

  // ── 2. Polarization Score ──
  const polarizationScore = computePolarizationScore(agents, states);

  // ── 3. Fragility Score ──
  const maxContributionPct =
    diagnostics?.attribution?.[0]?.contributionPct ?? 30;
  const agentsToFlip = diagnostics?.counterfactuals?.agentsToFlip ?? 3;
  const blindnessVariant = diagnostics?.counterfactuals?.variants?.find(
    (v) => v.disableBlindness
  );
  const blindnessDelta = blindnessVariant?.deltaConsensus ?? 10;
  const agentCount = agents.length;

  const fragilityScore = computeFragilityScore(
    maxContributionPct,
    agentsToFlip,
    blindnessDelta,
    agentCount
  );

  // ── 4. 状态标签 ──
  const { stateLabel, stateInterpretation } = classifyState(
    consensusScore,
    polarizationScore,
    fragilityScore
  );

  return {
    consensusScore,
    polarizationScore,
    fragilityScore,
    stateLabel,
    stateInterpretation,
  };
}

// ==================== 状态分类 ====================

/**
 * 根据三个指标的综合值, 给出市场共识状态的分类标签
 */
function classifyState(
  consensus: number,
  polarization: number,
  fragility: number
): { stateLabel: string; stateInterpretation: string } {
  // 三高组合互斥检查
  if (consensus > 60 && polarization > 60) {
    // 理论上不可能: 高共识 + 高极化
    return {
      stateLabel: "⚡ 异常状态",
      stateInterpretation:
        "高共识与高极化同时存在——通常意味着系统计算异常，或Agent群体正在经历快速的结构性重排。",
    };
  }

  if (consensus > 60 && polarization < 30 && fragility < 30) {
    return {
      stateLabel: "🟢 稳健共识",
      stateInterpretation:
        "Agent群体在相似的信息基础上得出了相似结论。共识有多重支撑，不易被少数Agent的偏离打破。这是最'健康'的共识状态。",
    };
  }

  if (consensus > 60 && polarization < 30 && fragility > 60) {
    return {
      stateLabel: "🟡 脆弱共识 (表面一致)",
      stateInterpretation:
        "Agent们在表面上达成了一致，但这个共识依赖少数关键Agent或信息结构。一旦关键Agent改变观点或信息盲区被打破，共识可能迅速翻转。类似于2008年前'房价永远涨'的共识。",
    };
  }

  if (consensus < 30 && polarization > 60 && fragility > 60) {
    return {
      stateLabel: "🔴 两极对抗",
      stateInterpretation:
        "Agent群体分裂为两个势均力敌的对立阵营。共识极度脆弱——任何微小的信息扰动都可能导致方向翻转。市场处于临界状态，'选方向'的压力正在累积。",
    };
  }

  if (consensus < 30 && polarization < 30 && fragility < 30) {
    return {
      stateLabel: "🔵 认知迷雾",
      stateInterpretation:
        "Agent们既没有形成共识，也没有形成对立的阵营。每个Agent基于自己有限的信息做出温和的判断，整体呈现'各说各话'的分散状态。系统稳健，但缺乏方向性。",
    };
  }

  if (consensus < 30 && polarization > 60 && fragility < 50) {
    return {
      stateLabel: "🟠 健康分歧",
      stateInterpretation:
        "Agent群体形成了清晰但对立的两派，分歧是结构性的（来自信息差异而非随机噪声），但系统整体稳健——共识方向的翻转需要同时改变多个Agent的观点。这代表了多元视角的健康市场。",
    };
  }

  // 默认: 中等状态
  if (consensus >= 30 && consensus <= 60) {
    return {
      stateLabel: "🟡 模糊共识",
      stateInterpretation:
        "Agent群体存在一定的方向倾向，但共识强度不足。分歧和共识并存——部分Agent形成联盟，但仍有足够的异质性使共识不够稳固。",
    };
  }

  return {
    stateLabel: "⚪ 过渡状态",
    stateInterpretation:
      "系统处于多个状态的过渡区。三个指标都不极端——共识、极化、脆弱性都在中等水平。这可能是系统从一种状态演化到另一种状态的中间阶段。",
  };
}

// ==================== 指标趋势分析 ====================

/**
 * 对比互动前后的指标变化
 */
export function computeInteractionEffect(
  beforeStd: number,
  afterStd: number,
  beforeMean: number,
  afterMean: number
): {
  consensusShift: number;
  stdChange: number;
  effect: "convergence" | "polarization" | "minimal";
  description: string;
} {
  const consensusShift = Math.abs(afterMean) - Math.abs(beforeMean);
  const stdChange = afterStd - beforeStd;

  let effect: "convergence" | "polarization" | "minimal";
  let description: string;

  if (stdChange < -5) {
    effect = "convergence";
    description = `互动促使Agent信念收敛 (std ${beforeStd.toFixed(0)} → ${afterStd.toFixed(0)})。社交影响正在减少观点多样性。`;
  } else if (stdChange > 5) {
    effect = "polarization";
    description = `互动反而加大了分歧 (std ${beforeStd.toFixed(0)} → ${afterStd.toFixed(0)})。Agent在观察彼此后更加坚定自己的立场——回音室效应。`;
  } else {
    effect = "minimal";
    description = `互动对信念分布影响不大 (std ${beforeStd.toFixed(0)} → ${afterStd.toFixed(0)})。当前的信息结构下，Agent的初始信念较为稳定。`;
  }

  return {
    consensusShift: Math.round(consensusShift * 100) / 100,
    stdChange: Math.round(stdChange * 100) / 100,
    effect,
    description,
  };
}
