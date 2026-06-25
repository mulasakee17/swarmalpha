/**
 * 集成引擎 v1.0 — 三层信号融合
 *
 * 层1: 5 Agent 核心群（复用现有 technicalEngine）
 * 层2: 30 散户情绪层（批量 LLM + 社交网络扩散）
 * 层3: 真实 S&P 500 技术数据（Yahoo Finance）
 *
 * 所有信号喂入 hybridPredict。
 */

import { callLLM, LLMConfig } from "@/lib/llm/providers";
import { buildRetailSystemPrompt, buildRetailBatchUserPrompt } from "./prompts";
import { getSP500Data, getVIXData } from "@/lib/market-data/yahoo";
import { calculateRSI } from "@/lib/indicators/technical";
import { buildSocialGraph, simulateInformationDiffusion, SocialGraph } from "./network";

// ==================== 类型 ====================

export interface RetailState {
  id: string;
  type: string;
  sentiment_score: number;
  action: "BUY" | "SELL" | "HOLD";
  monologue: string;
}

export interface RetailLayerOutput {
  states: RetailState[];
  averageSentiment: number;        // 0-100 raw average
  networkDiffusedSentiment: number; // 0-100 after diffusion
  greedFearIndex: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
  retailEmotionSignal: number;      // -100 to +100 for hybridPredict
}

export interface RealMarketSnapshot {
  rsi: number;
  vix: number;
  dropFromPeak: number;
  volatility: number;
  volumeSpike: number;
  dataSource: "YAHOO_FINANCE" | "MOCK";
}

// ==================== Layer 2: 散户情绪 ====================

function retailScoreToEmotion(score: number): number {
  return (score - 50) * 2; // 0-100 → -100 to +100
}

function classifyGreedFear(score: number): RetailLayerOutput["greedFearIndex"] {
  if (score <= 25) return "extreme_fear";
  if (score <= 40) return "fear";
  if (score <= 60) return "neutral";
  if (score <= 75) return "greed";
  return "extreme_greed";
}

function generateFallbackRetailStates(): RetailState[] {
  const types = ["FOMO狂热型", "极度胆小型", "死扛不卖型", "高杠杆投机者", "技术分析派",
    "消息面跟随者", "价值投资者", "波段交易者", "套利交易者", "恐慌抛售型"];
  return Array.from({ length: 30 }, (_, i) => ({
    id: `Retail_${String(i + 1).padStart(2, "0")}`,
    type: types[i % types.length],
    sentiment_score: Math.round(30 + Math.random() * 40),
    action: (["BUY", "SELL", "HOLD"] as const)[Math.floor(Math.random() * 3)],
    monologue: "观望中...",
  }));
}

/**
 * 运行 30 散户情绪层
 *
 * @param news 新闻
 * @param coreConsensus 5 Agent 核心共识 (-100 to +100)
 * @param priceChangeRate 价格变动率
 * @param currentPrice 当前价格
 * @param llmConfig LLM 配置（可选，无则用默认随机值）
 */
export async function runRetailLayer(
  news: string,
  coreConsensus: number,
  priceChangeRate: number,
  currentPrice: number,
  llmConfig?: LLMConfig
): Promise<RetailLayerOutput> {
  let states: RetailState[];

  if (llmConfig) {
    try {
      const systemPrompt = buildRetailSystemPrompt();
      // First round: no previous emotions
      const previousEmotions: Record<string, number> = {};
      for (let i = 1; i <= 30; i++) {
        previousEmotions[`Retail_${String(i).padStart(2, "0")}`] = Math.round(Math.random() * 100 - 50);
      }
      const userPrompt = buildRetailBatchUserPrompt(news, coreConsensus, priceChangeRate, currentPrice, previousEmotions);
      const result = await callLLM(systemPrompt, userPrompt, llmConfig);

      // Parse JSON array from response
      try {
        const jsonMatch = result.reasoning.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          states = JSON.parse(jsonMatch[0]);
        } else {
          states = generateFallbackRetailStates();
        }
      } catch {
        states = generateFallbackRetailStates();
      }
    } catch (e) {
      console.warn("[Retail] LLM call failed:", (e as Error).message);
      states = generateFallbackRetailStates();
    }
  } else {
    states = generateFallbackRetailStates();
  }

  // Aggregate
  const rawAvg = Math.round(states.reduce((s, r) => s + r.sentiment_score, 0) / states.length);

  // Social network diffusion
  const allIds = ["value", "trend", "panic", "media", "quant",
    ...states.map(r => r.id)];
  const graph: SocialGraph = buildSocialGraph({
    type: "small_world",
    agentIds: allIds,
    params: { clusteringCoeff: 0.6, shortcutProb: 0.15 },
  });

  // Map states to emotions
  const initialEmotions: Record<string, number> = {
    value: coreConsensus > 0 ? coreConsensus + 20 : coreConsensus - 10,
    trend: coreConsensus * 0.9,
    panic: coreConsensus < 0 ? coreConsensus - 20 : coreConsensus + 10,
    media: coreConsensus * 0.8,
    quant: coreConsensus * 0.7,
  };
  for (const r of states) {
    initialEmotions[r.id] = retailScoreToEmotion(r.sentiment_score);
  }

  const diffused = simulateInformationDiffusion(graph, initialEmotions, 3);
  const finalDiffused = diffused[diffused.length - 1];

  // Extract retail average after diffusion
  let retailDiffusedSum = 0;
  for (const r of states) {
    retailDiffusedSum += (finalDiffused[r.id] ?? 0);
  }
  const diffusedEmotion = retailDiffusedSum / states.length;
  const diffusedScore = Math.round((diffusedEmotion + 100) / 2);

  // Convert back to sentiment score (0-100) for retail states
  for (const r of states) {
    if (finalDiffused[r.id] !== undefined) {
      r.sentiment_score = Math.max(0, Math.min(100, Math.round((finalDiffused[r.id] + 100) / 2)));
    }
  }

  return {
    states,
    averageSentiment: rawAvg,
    networkDiffusedSentiment: diffusedScore,
    greedFearIndex: classifyGreedFear(diffusedScore),
    retailEmotionSignal: Math.round(diffusedEmotion),
  };
}

// ==================== Layer 3: 真实市场数据 ====================

/**
 * 获取真实 S&P 500 市场快照
 *
 * 失败时返回 mock 数据。
 */
export async function getRealMarketSnapshot(): Promise<RealMarketSnapshot> {
  try {
    const [sp500, vixData] = await Promise.all([
      getSP500Data(),
      getVIXData(),
    ]);

    if (!sp500 || sp500.closes.length < 20) throw new Error("S&P 500 data insufficient");

    const prices = sp500.closes;
    const volumes = sp500.volumes;
    const rsi = calculateRSI(prices, 14).value;

    let vix = 20;
    if (vixData && vixData.closes.length > 0) {
      const lastVix = vixData.closes[vixData.closes.length - 1];
      if (lastVix > 5 && lastVix < 100) vix = lastVix;
    }

    const peak = Math.max(...prices.slice(-60));
    const dropFromPeak = Math.round(((peak - prices[prices.length - 1]) / peak) * 1000) / 10;

    const rets: number[] = [];
    for (let i = prices.length - 5; i < prices.length; i++) {
      rets.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const meanRet = rets.reduce((a, b) => a + b, 0) / rets.length;
    const volatility = Math.sqrt(rets.reduce((s, r) => s + (r - meanRet) ** 2, 0) / rets.length);

    let volumeSpike = 1.0;
    if (volumes.length >= 21) {
      const latest = volumes[volumes.length - 1] || 1;
      const avg20 = volumes.slice(-21, -1).reduce((a: number, b: number) => a + (b || 0), 0) / 20;
      volumeSpike = avg20 > 0 ? Math.round((latest / avg20) * 10) / 10 : 1.0;
    }

    console.log(`[MarketData] REAL: VIX=${vix.toFixed(1)} RSI=${rsi.toFixed(0)} Drop=${dropFromPeak.toFixed(1)}%`);
    return { rsi, vix, dropFromPeak, volatility, volumeSpike, dataSource: "YAHOO_FINANCE" };
  } catch (e) {
    console.warn("[MarketData] Yahoo unavailable:", (e as Error).message);
    return {
      rsi: Math.round(30 + Math.random() * 30),
      vix: Math.round(15 + Math.random() * 25),
      dropFromPeak: Math.round(Math.random() * 15),
      volatility: 0.015,
      volumeSpike: 1.0,
      dataSource: "MOCK",
    };
  }
}

// ==================== 信息不对称引擎 v2.0 ====================
//
// 核心架构变更：
//   之前：所有 Agent 看到同样的新闻 + 同样的技术数据 → 5 个回声
//   现在：Super AI 为每个 Agent 生成专属简报 → 5 个不同的认知视角
//
// 流程：
//   1. Super AI 分析事件 → 生成 5 份不对称简报
//   2. 每份简报包含 Agent 专属信息 + 盲点标注
//   3. 第 1 轮：Agent 基于专属简报独立判断
//   4. 第 2 轮：Agent 看到其他视角 + 调整 → 涌现共识

import { runSuperCoordinator, AgentBrief, SuperAnalysis } from "./superCoordinator";
import { personas } from "./personas";
import { clampEmotion, calculateMean } from "@/lib/utils/emotion";
import { AgentState } from "@/types";

export interface AsymmetricRoundState {
  round: number;
  agents: Record<string, { emotion: number; reasoning: string }>;
  consensus: number;
}

export interface AsymmetricSwarmResult {
  rounds: AsymmetricRoundState[];
  finalConsensus: number;
  analysis: SuperAnalysis | null;
}

/**
 * 运行信息不对称 Agent 群
 *
 * 每个 Agent 只能看到 Super AI 分配给它的信息切片。
 * 这个设计刻意制造认知不对称，迫使 Agent 从不同信息中形成不同结论。
 */
export async function runAsymmetricSwarm(
  news: string,
  llmConfig?: LLMConfig,
  rounds: number = 2,
  /** 可选：注入历史市场数据（用于回测） */
  historicalMarket?: { vix: number; rsi: number; dropFromPeak: number }
): Promise<AsymmetricSwarmResult> {
  // 1. Super AI 生成不对称简报
  console.log("[Asymmetric] Running Super Coordinator...");
  const analysis = await runSuperCoordinator(news, llmConfig, historicalMarket);

  if (!analysis) {
    console.warn("[Asymmetric] Super AI failed, falling back to uniform briefs");
  }

  const briefs = analysis?.briefs ?? [];
  const briefMap: Record<string, AgentBrief> = {};
  for (const b of briefs) briefMap[b.agentId] = b;

  const swarmRounds: AsymmetricRoundState[] = [];
  let currentStates: Record<string, { emotion: number; reasoning: string }> = {};

  // 2. 多轮博弈
  for (let r = 1; r <= rounds; r++) {
    console.log(`[Asymmetric] Round ${r}/${rounds}`);

    const promises = personas.map(async (persona) => {
      const brief = briefMap[persona.id];
      const agentId = persona.id;

      // 构建 Agent 专属 system prompt
      const systemPrompt = buildAsymmetricSystemPrompt(persona, brief);
      // 构建用户 prompt
      const userPrompt = r === 1
        ? buildAsymmetricRound1Prompt(persona, brief, news)
        : buildAsymmetricRound2Prompt(persona, brief, news, currentStates, agentId);

      try {
        if (!llmConfig) {
          // 无 LLM：基于偏见 + 简报的市场数据给出合理推断
          const emotion = persona.initialBias + (analysis?.marketSnapshot?.dropFromPeak ? -analysis.marketSnapshot.dropFromPeak * 0.5 : 0);
          return { agentId, state: { emotion: clampEmotion(emotion), reasoning: `基于专属简报的推断（无LLM模式）` } };
        }
        const result = await callLLM(systemPrompt, userPrompt, llmConfig);
        return { agentId, state: { emotion: clampEmotion(result.emotion), reasoning: result.reasoning.slice(0, 120) } };
      } catch (e) {
        console.error(`[Asymmetric] ${agentId} failed:`, (e as Error).message);
        const fallback = currentStates[agentId]?.emotion ?? persona.initialBias;
        return { agentId, state: { emotion: fallback, reasoning: "API调用失败，维持之前判断" } };
      }
    });

    const results = await Promise.all(promises);
    const roundStates: Record<string, { emotion: number; reasoning: string }> = {};
    for (const { agentId, state } of results) roundStates[agentId] = state;
    currentStates = roundStates;

    const emotions = Object.values(roundStates).map(s => s.emotion);
    const consensus = calculateMean(emotions);
    swarmRounds.push({ round: r, agents: roundStates, consensus });

    const summary = personas.map(p => `${p.emoji}${roundStates[p.id]?.emotion ?? "?"}`).join(" ");
    console.log(`[Asymmetric] ${summary} → 共识=${consensus.toFixed(1)}`);
  }

  const finalConsensus = swarmRounds[swarmRounds.length - 1].consensus;
  return { rounds: swarmRounds, finalConsensus, analysis };
}

// ==================== Prompt 构建 ====================

function buildAsymmetricSystemPrompt(persona: typeof personas[0], brief?: AgentBrief): string {
  const infoSlice = brief?.informationSlice || "基于你的专业领域分析此事件。";
  const blindSpot = brief?.blindSpot || "无特定盲点";
  const roleDesc = brief?.roleDescription || persona.personality;

  return `你是金融市场中的 ${persona.name}（${persona.role}），专业代号："${brief?.agentName || persona.id}"。

## 你的专业定位
${roleDesc}

## 你的信息简报
${infoSlice}

## 你的认知盲点
⚠️ 以下信息你无法获取：${blindSpot}

## 重要规则
1. 你只能基于你的信息简报做判断。不要猜测简报之外的信息。
2. 如果你意识到你的简报缺少关键信息，请在 reasoning 中诚实地标注"我的信息不完整"。
3. 你的盲点是刻意设置的——这不是 bug，这是让你专注于你的专业领域。
4. 保持你的人格偏见：${persona.initialBias > 0 ? "倾向于看到积极面" : persona.initialBias < 0 ? "倾向于看到风险面" : "保持中立客观"}。

## 输出格式
{"emotion": -100到100（负数看空，正数看多），"reasoning": "基于你的专属信息简报的分析（中文）"}`;
}

function buildAsymmetricRound1Prompt(
  persona: typeof personas[0], brief: AgentBrief | undefined, news: string
): string {
  return `## 原始新闻事件
${news.slice(0, 400)}

## 你的专属信息简报
${brief?.informationSlice || "请基于你的专业领域分析此事件。"}

## 你的角色
你是 ${brief?.agentName || persona.name}，${brief?.roleDescription?.slice(0, 80) || persona.personality.slice(0, 80)}

## 任务
这是你第一次看到这个事件。仅基于上面的"专属信息简报"做出独立判断。
记住：你看不到其他 Agent 的简报，你的盲点被刻意设置。在你的专业领域内深入分析。

输出JSON：{"emotion": 数字(-100到100), "reasoning": "分析理由"}`;
}

function buildAsymmetricRound2Prompt(
  persona: typeof personas[0], brief: AgentBrief | undefined, news: string,
  currentStates: Record<string, { emotion: number; reasoning: string }>, myId: string
): string {
  const otherViews = Object.entries(currentStates)
    .filter(([id]) => id !== myId)
    .map(([id, s]) => {
      const p = personas.find(x => x.id === id);
      return `${p?.emoji ?? ""} ${p?.name ?? id}: 情绪${s.emotion} — ${s.reasoning?.slice(0, 60) ?? ""}`;
    })
    .join("\n");

  return `## 原始新闻事件
${news.slice(0, 300)}

## 你的专属信息简报（不变）
${brief?.informationSlice?.slice(0, 300) || "请基于你的专业领域分析。"}

## 你的认知盲点（不变）
${brief?.blindSpot || "无特定盲点"}

## 其他分析师的观点（他们看到了不同的信息！）
${otherViews}

## 你的角色
你是 ${brief?.agentName || persona.name}。

## 任务
其他分析师可能基于你无法获取的信息做出了判断。
1. 你认为他们的判断中哪些可能有价值？哪些可能受限于他们的盲点？
2. 结合你的专属信息，你是否需要调整你的判断？
3. 保持独立思考——不要因为多数人看空就从众。

输出JSON：{"emotion": 数字(-100到100), "reasoning": "调整或不调整的理由"}`;
}
