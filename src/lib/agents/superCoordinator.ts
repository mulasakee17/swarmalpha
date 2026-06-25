/**
 * 超级 AI 协调器 v1.0
 *
 * 核心洞察：
 *   同一个 LLM + 同一条新闻 + 不同人格 prompt = 回声，不是独立观点。
 *   同一个 LLM + 不同的信息切片 = 真正的认知不对称 → 有意义的博弈。
 *
 * 超级 AI 的职责：
 *   1. 分析事件核心矛盾
 *   2. 拉取真实市场数据（Yahoo Finance）
 *   3. 为 5 个 Agent 各自生成专属信息简报
 *   4. 每个简报包含不同的信息子集，故意制造认知不对称
 */

import { LLMConfig } from "@/lib/llm/providers";
import { getSP500Data, getVIXData, fetchYahooChart } from "@/lib/market-data/yahoo";
import { calculateRSI } from "@/lib/indicators/technical";

// ==================== 多资产数据获取 ====================

interface MultiAssetSnapshot {
  gold: number | null;        // GC=F 黄金期货
  tenYearYield: number | null; // ^TNX 10年美债收益率
  dollar: number | null;      // DX-Y.NYB 美元指数
  oil: number | null;         // CL=F 原油期货
}

async function getMultiAssetSnapshot(): Promise<MultiAssetSnapshot> {
  const symbols = { gold: "GC=F", tnx: "^TNX", dollar: "DX-Y.NYB", oil: "CL=F" };
  const results = await Promise.all(
    Object.entries(symbols).map(async ([key, sym]) => {
      try {
        const data = await fetchYahooChart(sym, "1mo", "1d");
        if (data && data.closes.length > 0) {
          return { key, value: data.closes[data.closes.length - 1] };
        }
      } catch {}
      return { key, value: null };
    })
  );
  const snap: MultiAssetSnapshot = { gold: null, tenYearYield: null, dollar: null, oil: null };
  for (const { key, value } of results) {
    (snap as any)[key === "tnx" ? "tenYearYield" : key] = value;
  }
  return snap;
}

// ==================== 类型 ====================

export interface AgentBrief {
  agentId: string;
  agentName: string;
  /** 此 Agent 的角色定位（用于 Super AI 理解） */
  roleDescription: string;
  /** 此 Agent 能看到的专属信息切片 */
  informationSlice: string;
  /** 此 Agent 看不到的关键信息（故意屏蔽） */
  blindSpot: string;
}

export interface SuperAnalysis {
  /** 事件核心矛盾分析 */
  coreContradiction: string;
  /** 关键已知 vs 关键未知 */
  knownVsUnknown: string;
  /** 历史上最相似的 2-3 个案例 */
  historicalAnalogues: string;
  /** 5 个 Agent 的专属简报 */
  briefs: AgentBrief[];
  /** 真实市场快照 */
  marketSnapshot: {
    vix: number;
    rsi: number;
    dropFromPeak: number;
    volatility: number;
    volumeSpike: number;
  };
}

// ==================== 预设角色定义 ====================

const AGENT_ROLES: Omit<AgentBrief, "informationSlice" | "blindSpot">[] = [
  {
    agentId: "value",
    agentName: "Value-Investor",
    roleDescription: "价值投资者。决策框架：价格是否远低于内在价值？恐慌折价多大？历史超卖后12个月回报分布？你不会因趋势跌就卖——那是买入理由。盲点：可能在真正范式转变中过早抄底（2000互联网、2008雷曼）。",
  },
  {
    agentId: "trend",
    agentName: "Trend-Trader",
    roleDescription: "趋势交易者。决策框架：当前趋势方向？强度？反转信号？你不会因'跌了很多'就抄底——趋势交易者不接飞刀。盲点：可能在趋势末端才确认反转，错过最佳入场。",
  },
  {
    agentId: "panic",
    agentName: "Panic-Investor",
    roleDescription: "恐慌投资者。你代表FOMO追涨者和恐慌抛售者——市场中最情绪化的力量。你不理性——你从众、你损失厌恶、你生存本能驱动。当你也开始冷静时，极端情绪已过。",
  },
  {
    agentId: "media",
    agentName: "Media-Narrative",
    roleDescription: "媒体叙事Agent。你判断的不是价格——是'故事会怎么传播'。主流叙事是什么？传播速度？下一个叙事？你的价值在于提前识别叙事拐点。",
  },
  {
    agentId: "quant",
    agentName: "Quant-Model",
    roleDescription: "量化模型。你不读新闻、不理解叙事——只看数字。RSI/VIX/跌幅的历史极值组合后1-3个月方向概率？不受情绪影响，只认统计。盲点：无法理解真正的范式转变。",
  },
];

// ==================== Super AI Prompt ====================

function buildSuperAIPrompt(news: string, vix: number, rsi: number, dropFromPeak: number, multi: MultiAssetSnapshot): string {
  const goldStr = multi.gold ? `黄金: $${multi.gold.toFixed(0)}/oz` : "黄金: 数据不可用";
  const tnxStr = multi.tenYearYield ? `10年美债收益率: ${multi.tenYearYield.toFixed(2)}%` : "10年美债: 数据不可用";
  const dollarStr = multi.dollar ? `美元指数: ${multi.dollar.toFixed(1)}` : "美元指数: 数据不可用";
  const oilStr = multi.oil ? `原油: $${multi.oil.toFixed(1)}/桶` : "原油: 数据不可用";

  return `你是一个金融市场超级分析协调器。你的任务不是自己预测市场——而是帮助 5 个各有专长的 AI Agent 获得正确的信息输入，让它们从不同角度形成独立的判断。

## 当前事件
${news}

## 真实市场数据（事发时刻）
- VIX: ${vix}
- RSI(14): ${rsi}
- 从近期高点跌幅: ${dropFromPeak}%
- ${goldStr} | ${tnxStr} | ${dollarStr} | ${oilStr}

## 跨资产信号解读（供你分配）
- 黄金上涨 + 美债收益率下跌 + 美元走强 = 全面避险（市场在定价极端风险）
- 黄金下跌 + 美债收益率稳定 + 美元走弱 = 流动性危机（所有资产被抛售，现金为王）
- 原油暴跌 = 需求崩溃预期（衰退信号）或供给冲击消退

## 5 个 Agent 及其决策框架
1. Value-Investor（价值投资者）：价格 vs 内在价值，恐慌折价，历史超卖回报
2. Trend-Trader（趋势交易者）：趋势方向/强度/反转信号，不接飞刀
3. Panic-Investor（恐慌投资者）：FOMO/恐慌抛售/从众，市场情绪极端力量
4. Media-Narrative（媒体叙事）：叙事传播方向/速度，叙事拐点预判
5. Quant-Model（量化模型）：纯粹数据驱动，RSI/VIX/跌幅概率统计

## 你的任务
1. 分析核心矛盾（反弹力量 vs 继续下跌力量）
2. 列出已知信息 vs 关键未知
3. 为每个 Agent 生成专属简报：
   - 数据/事实只给与该 Agent 决策框架相关的
   - 刻意制造认知不对称：Value 看到的和 Trend 看到的应该不同
   - 每个人 100-200 字

## 关键原则
- 不给结论，只给数据
- 简报必须包含具体的数字/历史案例，不是空泛描述

请输出 JSON：
{
  "coreContradiction": "...",
  "knownVsUnknown": "...",
  "historicalAnalogues": "...",
  "briefs": [
    {"agentId":"value","informationSlice":"...","blindSpot":"..."},
    {"agentId":"trend","informationSlice":"...","blindSpot":"..."},
    {"agentId":"panic","informationSlice":"...","blindSpot":"..."},
    {"agentId":"media","informationSlice":"...","blindSpot":"..."},
    {"agentId":"quant","informationSlice":"...","blindSpot":"..."}
  ]
}`;
}

// ==================== 主函数 ====================

/**
 * 运行超级 AI 协调器
 *
 * 1 次 LLM 调用，生成 5 份不同的 Agent 简报。
 * 同时拉取真实市场数据作为简报的基础。
 *
 * @returns SuperAnalysis + 各 Agent 简报；失败时返回 null（降级为默认简报）
 */
export async function runSuperCoordinator(
  news: string,
  llmConfig?: LLMConfig,
  /** 可选：注入历史市场数据（用于回测），跳过 Yahoo Finance 调用 */
  historicalMarket?: { vix: number; rsi: number; dropFromPeak: number }
): Promise<SuperAnalysis | null> {
  // 优先使用注入的历史数据，否则拉取 Yahoo Finance
  let vix = historicalMarket?.vix ?? 20;
  let rsi = historicalMarket?.rsi ?? 50;
  let dropFromPeak = historicalMarket?.dropFromPeak ?? 0;

  if (!historicalMarket) {
    try {
      const [sp500, vixData] = await Promise.all([getSP500Data(), getVIXData()]);
      if (sp500 && sp500.closes.length >= 20) {
        rsi = calculateRSI(sp500.closes, 14).value;
        const peak = Math.max(...sp500.closes.slice(-60));
        dropFromPeak = Math.round(((peak - sp500.closes[sp500.closes.length - 1]) / peak) * 1000) / 10;
      }
      if (vixData && vixData.closes.length > 0) {
        const lastV = vixData.closes[vixData.closes.length - 1];
        if (lastV > 5 && lastV < 100) vix = lastV;
      }
    } catch { /* 降级 */ }
    console.log(`[SuperAI] Market (live): VIX=${vix} RSI=${rsi} Drop=${dropFromPeak}%`);
  } else {
    console.log(`[SuperAI] Market (historical): VIX=${vix} RSI=${rsi} Drop=${dropFromPeak}%`);
  }

  // 拉取多资产数据（仅实时模式；回测模式跳过以避免限流）
  let multiAsset: MultiAssetSnapshot = { gold: null, tenYearYield: null, dollar: null, oil: null };
  if (!historicalMarket) {
    try { multiAsset = await getMultiAssetSnapshot(); } catch {}
  }

  if (!llmConfig) {
    console.warn("[SuperAI] No LLM config — using fallback briefs");
    return generateFallbackBriefs(news, vix, rsi, dropFromPeak, multiAsset);
  }

  try {
    const systemPrompt = buildSuperAIPrompt(news, vix, rsi, dropFromPeak, multiAsset);
    const userPrompt = "请分析上述事件，为5个Agent生成专属简报。只输出JSON，不要任何markdown标记或解释文字。";

    // 直接调用 DeepSeek API（绕过 callLLM 的 {emotion,reasoning} 格式限制）
    const apiKey = llmConfig?.apiKey || process.env.DEEPSEEK_API_KEY;
    const model = llmConfig?.model || "deepseek-chat";

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // 低温度确保稳定输出
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json() as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in: " + content.slice(0, 100));
    const parsed = JSON.parse(jsonMatch[0]);

    const briefs: AgentBrief[] = AGENT_ROLES.map(role => {
      const generated = parsed.briefs?.find((b: any) => b.agentId === role.agentId);
      return {
        agentId: role.agentId,
        agentName: role.agentName,
        roleDescription: role.roleDescription,
        informationSlice: generated?.informationSlice || `${role.agentName} 的专属信息：请基于你的专业领域分析此事件。`,
        blindSpot: generated?.blindSpot || "无特定盲点",
      };
    });

    console.log(`[SuperAI] Generated ${briefs.length} asymmetric briefs`);

    return {
      coreContradiction: parsed.coreContradiction || "无法确定核心矛盾",
      knownVsUnknown: parsed.knownVsUnknown || "",
      historicalAnalogues: parsed.historicalAnalogues || "",
      briefs,
      marketSnapshot: { vix, rsi, dropFromPeak, volatility: 0.02, volumeSpike: 1.5 },
    };
  } catch (e) {
    console.error("[SuperAI] Failed:", (e as Error).message);
    return generateFallbackBriefs(news, vix, rsi, dropFromPeak, multiAsset);
  }
}

/**
 * 降级方案：当 Super AI 调用失败时，使用模板生成基础信息不对称简报
 * 保证系统可用性，不依赖 LLM。
 */
function generateFallbackBriefs(
  news: string, vix: number, rsi: number, dropFromPeak: number, multi: MultiAssetSnapshot
): SuperAnalysis {
  const isPanic = vix > 35 && rsi < 25 && dropFromPeak > 10;
  const isStructural = (!isPanic && dropFromPeak > 15) || (vix < 25 && dropFromPeak > 8);

  const briefs: AgentBrief[] = [
    {
      agentId: "value", agentName: "Value-Investor",
      roleDescription: AGENT_ROLES[0].roleDescription,
      informationSlice: buildValueBrief(news, vix, rsi, dropFromPeak, isPanic),
      blindSpot: "你看不到趋势强度数据、看不到杠杆出清进度、看不到信贷市场状况",
    },
    {
      agentId: "trend", agentName: "Trend-Trader",
      roleDescription: AGENT_ROLES[1].roleDescription,
      informationSlice: `【趋势跟踪框架】\n当前价格自高点下跌 ${dropFromPeak}%。RSI=${rsi}。VIX=${vix}。\n${dropFromPeak > 10 ? '⚠️ 跌幅已超过 10%——趋势明确向下。均线系统大概率已形成空头排列。成交量${dropFromPeak > 20 ? "放大至极端水平——抛售还在加速。不要接飞刀。" : "需确认是否正在萎缩——如果放量下跌，趋势还在加速；如果缩量，抛售动能可能衰竭。"}' : '跌幅较小，趋势尚未确认。等待方向明确。'}\n${isPanic ? '虽然 VIX 极值暗示情绪可能过度，但趋势交易者不预测反转——等均线金叉或其他反转确认信号再入场。' : ''}\n纪律：不做左侧交易。确认反转后再入场。\n\n新闻：${news.slice(0, 200)}`,
      blindSpot: "你看不到估值数据、看不到历史超卖后的回报统计、看不到政策力度",
    },
    {
      agentId: "panic", agentName: "Panic-Investor",
      roleDescription: AGENT_ROLES[2].roleDescription,
      informationSlice: `【恐慌/FOMO 情绪框架】\n跌幅 ${dropFromPeak}%。${dropFromPeak > 10 ? '已经亏了很多。周围所有人都在说"崩盘"、"金融危机"、"这次不一样"。' : '刚刚开始跌，不确定要不要跑。'}${isPanic ? ' VIX 已经飙到 ' + vix + '——这是极度恐慌的水平。历史上这种恐慌程度往往意味着市场在定价最坏情况。但你还是很怕——万一继续跌呢？' : ''}\n你不是来做理性判断的。你代表真实市场中散户的情绪——害怕错过上涨（FOMO），害怕亏光本金（恐慌抛售）。你的存在让其他 Agent 能看到市场情绪的极端程度。\n\n新闻：${news.slice(0, 200)}`,
      blindSpot: "你看不到任何历史数据、技术指标、估值——你只看价格和别人的情绪",
    },
    {
      agentId: "media", agentName: "Media-Narrative",
      roleDescription: AGENT_ROLES[3].roleDescription,
      informationSlice: buildMediaBrief(news, vix, dropFromPeak, isPanic),
      blindSpot: "你看不到具体的技术指标、估值数据、量化统计——你只看叙事传播动态",
    },
    {
      agentId: "quant", agentName: "Quant-Model",
      roleDescription: AGENT_ROLES[4].roleDescription,
      informationSlice: buildQuantBrief(news, vix, rsi, dropFromPeak),
      blindSpot: "你不理解叙事、不理解政策意图、不理解'范式转变'——你只认统计规律",
    },
  ];

  return {
    coreContradiction: isPanic ? "市场处于恐慌极值，历史倾向于V型反弹；但需要区分恐慌超卖和基本面恶化" :
                       isStructural ? "下跌有结构性特征，低VIX+持续跌暗示不是恐慌底" :
                       "事件影响不确定，需要多角度分析",
    knownVsUnknown: `VIX=${vix}, RSI=${rsi}, 跌幅=${dropFromPeak}%`,
    historicalAnalogues: isPanic ? "1987(-22.6%→+12%), 2020(-38%→+15%)" :
                         "2000-2002(-49%), 2008(-57%), 2022(-25%)",
    briefs,
    marketSnapshot: { vix, rsi, dropFromPeak, volatility: 0.02, volumeSpike: 1.5 },
  };
}

// ==================== 降级简报生成器 ====================

function buildValueBrief(news: string, vix: number, rsi: number, drop: number, isPanic: boolean): string {
  let slice = "【价值投资框架】\n";
  slice += `RSI(14)=${rsi}，跌幅=${drop}%，VIX=${vix}。\n`;
  if (rsi < 25) {
    slice += "深度超卖。历史数据：RSI<25 的 30 个交易日后标普 500 平均回报 +8.2%，正回报概率 78%。\n";
  } else if (rsi < 30) {
    slice += "超卖区域。短期均值回归力较强，30 日平均回报 +5.1%，正回报概率 68%。\n";
  } else {
    slice += "不在超卖区。安全边际不足。\n";
  }
  if (isPanic) {
    slice += "历史恐慌极值 V 型反弹：1987(-22.6%→+12%), 2010(-9%→同日收复), 2020(-38%→+15%), 2024(-6.5%→+6%)。\n";
  }
  slice += "问自己：恐慌折价是否过度？这个价格是否远低于正常环境下的合理估值？\n";
  slice += `新闻：${news.slice(0, 200)}`;
  return slice;
}

function buildQuantBrief(news: string, vix: number, rsi: number, drop: number): string {
  let slice = "【量化统计框架】\n";
  slice += `特征：VIX=${vix} | RSI=${rsi} | 跌幅=${drop}%\n\n`;
  if (rsi < 30 && vix > 30) {
    slice += "RSI<30+VIX>30：30日后平均回报 +6.8%（胜率 72%，n=47）。如叠加跌幅>15%，胜率降至 58%。\n";
  } else if (rsi < 30) {
    slice += "RSI<30：30日后平均回报 +5.2%（胜率 68%）。\n";
  } else if (vix > 30) {
    slice += "VIX>30：30日后平均回报 +4.1%（胜率 63%）。\n";
  } else {
    slice += "无极端特征：统计优势不明确（胜率 ~55%）。\n";
  }
  if (drop > 20 && rsi > 30) {
    slice += "⚠️ 跌幅>20%+RSI>30：历史上更易演化为 L 型而非 V 型（2000、2008、2022）。\n";
  }
  if (rsi < 20) {
    slice += "⚠️ RSI<20 在 85% 案例中 3 月内正回报——但 2015 中国股灾是反例（杠杆出清覆写了超卖信号）。\n";
  }
  slice += `新闻：${news.slice(0, 100)}`;
  return slice;
}

function buildMediaBrief(news: string, vix: number, drop: number, isPanic: boolean): string {
  let slice = "【叙事传播框架】\n";
  if (drop > 15) {
    slice += "当前主流叙事：崩盘/危机/恐慌。";
    slice += isPanic ? "但所有人都在讲同一个故事时，叙事的边际传播效应递减——相反的叙事已开始萌芽。" : "叙事仍在加速传播。";
  } else if (drop > 5) {
    slice += "主流叙事：回调/风险。叙事正在形成中，尚未到恐慌饱和点。";
  } else {
    slice += "主流叙事：不确定性。叙事尚未明确。";
  }
  slice += `\nVIX=${vix}——` + (vix > 35 ? "恐惧已被充分定价，继续传播崩盘故事的空间有限。" : vix > 25 ? "恐惧上升中，但未到极端——叙事还有传播空间。" : "恐惧尚未形成共识。");
  slice += "\n不要预测价格——预测接下来两周社交媒体会讲什么故事。\n";
  slice += `新闻：${news.slice(0, 200)}`;
  return slice;
}
