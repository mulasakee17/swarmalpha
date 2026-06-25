/**
 * V9 Agent 定义 — 强制信息盲区 (五因子正交体系)
 *
 * 因子盲区设计原则:
 *   - 每个 Agent 只能看到 1-3 个方向因子 (liquidity/policy/fundamental/narrative)
 *   - uncertainty 因子始终对所有 Agent 可见 (元因子, 调节置信度)
 *   - 盲区越极端 → 信念差异越大 → 异质性越真实
 *
 * 旧体系问题: 6因子中 3-4 个高度重叠 → 盲区形同虚设
 * 新体系解决: 5因子严格正交 → 盲区产生真正视角差异
 */

import { V9AgentDefinition, FactorCategory } from "./types";

/** 始终对所有 Agent 可见的元因子 */
export const META_FACTORS: FactorCategory[] = ["uncertainty"];

export const V9_AGENTS: V9AgentDefinition[] = [
  // ── 🏦 Institution: 全面基本面 ──
  // 看 liquidity + policy + fundamental, 盲 narrative
  {
    id: "institution", name: "Institution", emoji: "🏦", role: "机构投资者",
    permissions: {
      visibleFactors: ["liquidity", "policy", "fundamental"],
      factorWeights: { liquidity: 1.2, policy: 1.5, fundamental: 1.0 },
      uncertaintySensitivity: 0.6,
      interpretationStyle: "macro",
    },
    initialBias: 0, influenceWeight: 90, capitalWeight: 95,
  },
  // ── 💎 Value: 纯基本面 ──
  // 只看 fundamental, 盲 liquidity/policy/narrative
  {
    id: "value", name: "Value", emoji: "💎", role: "价值投资者",
    permissions: {
      visibleFactors: ["fundamental"],
      factorWeights: { fundamental: 1.5 },
      uncertaintySensitivity: -0.2,  // 不确定性 = 买入机会
      interpretationStyle: "value",
    },
    initialBias: 0, influenceWeight: 60, capitalWeight: 80,
  },
  // ── 🏄 Trend: 纯叙事 ──
  // 只看 narrative, 盲 liquidity/policy/fundamental
  {
    id: "trend", name: "Trend", emoji: "🏄", role: "趋势交易者",
    permissions: {
      visibleFactors: ["narrative"],
      factorWeights: { narrative: 1.5 },
      uncertaintySensitivity: 0.5,
      interpretationStyle: "momentum",
    },
    initialBias: 0, influenceWeight: 45, capitalWeight: 50,
  },
  // ── 😱 Panic: 纯流动性 ──
  // 只看 liquidity, 盲 policy/fundamental/narrative
  {
    id: "panic", name: "Panic", emoji: "😱", role: "恐慌投资者",
    permissions: {
      visibleFactors: ["liquidity"],
      factorWeights: { liquidity: 2.0 },
      uncertaintySensitivity: 1.2,  // 不确定性 = 极度恐慌
      interpretationStyle: "sentiment",
    },
    initialBias: -20, influenceWeight: 25, capitalWeight: 40,
  },
  // ── 🤖 Quant: 量化因子 ──
  // 看 liquidity + fundamental, 盲 policy/narrative
  {
    id: "quant", name: "Quant", emoji: "🤖", role: "量化基金",
    permissions: {
      visibleFactors: ["liquidity", "fundamental"],
      factorWeights: { liquidity: 0.7, fundamental: 0.8 },
      uncertaintySensitivity: 0.1,  // 不确定性几乎不影响量化模型
      interpretationStyle: "statistical",
    },
    initialBias: 0, influenceWeight: 55, capitalWeight: 75,
  },
  // ── 📡 Media: 叙事+政策 ──
  // 看 narrative + policy, 盲 liquidity/fundamental
  {
    id: "media", name: "Media", emoji: "📡", role: "媒体传播者",
    permissions: {
      visibleFactors: ["narrative", "policy"],
      factorWeights: { narrative: 1.5, policy: 0.9 },
      uncertaintySensitivity: 0.4,  // 不确定性驱动关注度
      interpretationStyle: "narrative",
    },
    initialBias: 0, influenceWeight: 70, capitalWeight: 10,
  },
  // ── 🦉 Contrarian: 逆叙事 ──
  // 看 narrative (负权重), 盲 liquidity/policy/fundamental
  {
    id: "contrarian", name: "Contrarian", emoji: "🦉", role: "逆向投资者",
    permissions: {
      visibleFactors: ["narrative"],
      factorWeights: { narrative: -1.2 },  // 叙事越强, 越反向
      uncertaintySensitivity: -0.5,  // 不确定性 = 逆向机会
      interpretationStyle: "contrarian",
    },
    initialBias: 5, influenceWeight: 40, capitalWeight: 60,
  },
  // ── 🐜 Retail: 跟叙事 ──
  // 只看 narrative, 盲 liquidity/policy/fundamental
  {
    id: "retail", name: "Retail", emoji: "🐜", role: "散户投资者",
    permissions: {
      visibleFactors: ["narrative"],
      factorWeights: { narrative: 1.0 },
      uncertaintySensitivity: 0.8,  // 不确定性 → 观望
      interpretationStyle: "narrative",
    },
    initialBias: 0, influenceWeight: 10, capitalWeight: 20,
  },
];

/** 🆕 政策响应 Agent — 独立监控 policy + liquidity */
export const POLICY_AGENT: V9AgentDefinition = {
  id: "policy", name: "PolicyAgent", emoji: "🏛️", role: "政策响应分析师",
  permissions: {
    visibleFactors: ["policy", "liquidity"],
    factorWeights: { policy: 2.0, liquidity: 1.0 },
    uncertaintySensitivity: 0.3,  // 政策分析师: 不确定性适中
    interpretationStyle: "macro",
  },
  initialBias: 10,  // 政策天然偏多（倾向于稳定市场）
  influenceWeight: 50, capitalWeight: 0,  // 零资本 — 只影响共识，不交易
};

export function getAllAgents(includePolicy: boolean): V9AgentDefinition[] {
  return includePolicy ? [...V9_AGENTS, POLICY_AGENT] : V9_AGENTS;
}

/** 计算可见因子分布 — 用于验证异质性
 *
 *  盲区度量分两层:
 *    - 方向因子盲区: Agent 对在方向因子 (liquidity/policy/fundamental/narrative) 上
 *      有多少比例完全没有重叠? 这产生真实的视角差异。
 *    - 元因子 (uncertainty): 始终对所有 Agent 可见, 不产生视角差异。
 */
export function computeBlindnessStats(agents: V9AgentDefinition[]): {
  totalFactors: FactorCategory[];
  directionalFactors: FactorCategory[];
  agentCoverage: Record<string, FactorCategory[]>;       // 含元因子
  agentDirectionalCoverage: Record<string, FactorCategory[]>; // 仅方向因子
  overlapMatrix: Record<string, string[]>;                // 含元因子
  directionalOverlapMatrix: Record<string, string[]>;     // 仅方向因子
} {
  const totalFactors: FactorCategory[] = ["liquidity", "policy", "fundamental", "narrative", "uncertainty"];
  const directionalFactors: FactorCategory[] = ["liquidity", "policy", "fundamental", "narrative"];

  const agentCoverage: Record<string, FactorCategory[]> = {};
  const agentDirectionalCoverage: Record<string, FactorCategory[]> = {};
  for (const a of agents) {
    agentCoverage[a.id] = [...a.permissions.visibleFactors, ...META_FACTORS];
    agentDirectionalCoverage[a.id] = a.permissions.visibleFactors.filter(f => !META_FACTORS.includes(f));
  }

  const overlapMatrix: Record<string, string[]> = {};
  const directionalOverlapMatrix: Record<string, string[]> = {};
  for (const a1 of agents) {
    overlapMatrix[a1.id] = [];
    directionalOverlapMatrix[a1.id] = [];
    for (const a2 of agents) {
      if (a1.id === a2.id) continue;
      const v1 = agentCoverage[a1.id];
      const v2 = agentCoverage[a2.id];
      const overlap = v1.filter(f => v2.includes(f));
      if (overlap.length > 0) overlapMatrix[a1.id].push(a2.id);

      // 方向因子盲区: 只看方向因子
      const d1 = agentDirectionalCoverage[a1.id];
      const d2 = agentDirectionalCoverage[a2.id];
      const dirOverlap = d1.filter(f => d2.includes(f));
      if (dirOverlap.length > 0) directionalOverlapMatrix[a1.id].push(a2.id);
    }
  }
  return { totalFactors, directionalFactors, agentCoverage, agentDirectionalCoverage, overlapMatrix, directionalOverlapMatrix };
}
