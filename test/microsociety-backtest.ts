/**
 * 🧪 微型社会模拟回测 — 正确测试
 *
 * 核心机制（与直接让 LLM 预测完全不同）：
 *   5 个 Agent 各自拥有不同人格、偏见、决策风格
 *   → 第1轮独立判断 → 互相看到对方观点 → 第2轮观点演化
 *   → 从博弈中涌现共识（不是单次 LLM 调用）
 *
 * 对比之前错误测试（单次 LLM 预测 43%）vs 正确测试（微型社会模拟）
 *
 * 运行: npx tsx test/microsociety-backtest.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { callLLM, LLMConfig } from "../src/lib/llm/providers";
import { calibratePrediction, MarketState } from "../src/lib/calibration/predictionCalibrator";
import { hybridPredict } from "../src/lib/calibration/hybridPredictor";
import { personas } from "../src/lib/agents/personas";
import { clampEmotion, calculateMean, calculateVariance } from "../src/lib/utils/emotion";
import { AgentState } from "../src/types";

// 14 个原始验证事件
const EVENTS = [
  { name:"Brexit",date:"2016-06-24",news:"2016年6月24日，英国公投结果公布，51.9%选民支持脱欧。英镑兑美元暴跌8.1%至31年新低，全球股市集体重挫。标普500期货盘前一度跌超5%触发熔断。英国首相卡梅伦宣布辞职。英格兰银行声明准备提供2500亿英镑流动性。",vix:25.8,rsi:30,drop:5.3,policy:true,cb:true,actual:"up" },
  { name:"XmasEve",date:"2018-12-24",news:"2018年12月24日，美股在圣诞前夜再度暴跌。标普500收跌2.7%，自9月高点累计下跌19.8%，逼近熊市边缘。美联储12月19日加息并暗示2019年继续收紧。财政部长紧急召集银行高管反而加剧恐慌。",vix:36.1,rsi:20,drop:19.8,policy:false,cb:false,actual:"up" },
  { name:"LTCM",date:"1998-09-23",news:"1998年9月23日，纽约联邦储备银行紧急召集华尔街主要银行，协调对长期资本管理公司(LTCM)的36亿美元救助计划。这家由诺贝尔奖得主管理的对冲基金在高杠杆套利策略上损失超40亿美元。俄罗斯8月债务违约已引发全球金融动荡。",vix:43.0,rsi:25,drop:15.0,policy:true,cb:true,actual:"up" },
  { name:"Lehman",date:"2008-09-15",news:"2008年9月15日，雷曼兄弟申请破产保护，成为美国历史上最大的破产案。美国政府拒绝救助雷曼。美林被迫出售给美国银行。AIG寻求400亿美元紧急贷款。道指当日暴跌504点(-4.4%)，全球股市集体重挫，信贷市场冻结。",vix:31.7,rsi:32,drop:22.0,policy:false,cb:true,actual:"down" },
  { name:"ChinaCrash",date:"2015-08-24",news:"2015年8月24日，中国上证综指暴跌8.5%，全球股市连锁下跌。自6月高点以来上证已累计下跌40%。中国政府连续出台救市措施（禁止大股东减持、国家队入场、降息降准），但多次救市均未遏制跌势。大量杠杆资金已被强制平仓。",vix:40.7,rsi:15,drop:40.0,policy:true,cb:true,actual:"down" },
  { name:"COVID",date:"2020-02-24",news:"2020年2月24日，意大利和韩国新冠确诊病例急剧增加。道指暴跌1032点(-3.6%)。市场开始担忧全球供应链中断和全球经济衰退。WHO警告疫情可能成为全球大流行。尚无货币政策响应，疫苗开发至少需要12-18个月。",vix:24.5,rsi:38,drop:3.0,policy:false,cb:false,actual:"down" },
  { name:"Fed2022",date:"2022-01-05",news:"2022年1月5日，美联储公布12月FOMC会议纪要，显示官员们认为可能需要比预期更早更快地加息，并开始讨论缩减8.8万亿美元资产负债表。纳斯达克暴跌3.3%。10年期美债收益率飙升至1.70%以上。通胀达7%创40年新高。",vix:18.5,rsi:45,drop:5.0,policy:false,cb:false,actual:"down" },
  { name:"USDowngrade",date:"2011-08-08",news:"2011年8月5日盘后，标普宣布将美国主权信用评级从AAA下调至AA+，美国历史上首次失去AAA评级。8月8日周一，道指暴跌634点(-5.5%)。欧洲债务危机同步恶化。美联储声明维持0-0.25%利率至少到2013年中。",vix:39.0,rsi:22,drop:16.8,policy:true,cb:true,actual:"down" },
  { name:"Taper",date:"2013-06-19",news:"2013年6月19日，美联储主席伯南克在FOMC会后表示可能在今年晚些时候开始缩减每月850亿美元的资产购买规模。标普500当日下跌1.4%。伯南克强调缩减≠紧缩，联邦基金利率仍将维持在0-0.25%。",vix:19.5,rsi:35,drop:4.6,policy:true,cb:true,actual:"up" },
  { name:"Ebola",date:"2014-10-15",news:"2014年10月15日，美国确诊第二例埃博拉病例，全球股市连续第5日下跌。标普500自9月高点下跌7.4%。航空公司股票领跌。美国CDC加强机场筛查，尚未有旅行禁令。",vix:26.3,rsi:22,drop:7.4,policy:true,cb:false,actual:"up" },
  { name:"Evergrande",date:"2021-09-20",news:"2021年9月20日，中国恒大集团面临3000亿美元债务违约风险，全球股市集体下跌。中国央行通过逆回购注入1200亿元流动性。中国政府暗示恒大危机将由市场方式解决，不会全面兜底。",vix:25.7,rsi:35,drop:4.2,policy:true,cb:true,actual:"up" },
  { name:"UKPension",date:"2022-09-28",news:"2022年9月28日，英格兰银行紧急宣布无限量购买长期英国国债，以遏制养老金基金面临的抵押品危机。此前减税计划引发英国国债和英镑暴跌。养老金LDI策略面临大规模保证金追缴，形成死亡螺旋。美联储仍在加息周期中。",vix:32.0,rsi:25,drop:23.5,policy:true,cb:true,actual:"up" },
  { name:"DeepSeek",date:"2025-01-27",news:"2025年1月27日，中国AI公司DeepSeek发布的开源大模型以极低成本实现了接近GPT-4的性能。英伟达股价单日暴跌17%，市值蒸发5890亿美元。费城半导体指数暴跌9.2%。尚无政策响应。",vix:19.3,rsi:42,drop:3.5,policy:false,cb:false,actual:"neutral" },
  { name:"SNB",date:"2015-01-15",news:"2015年1月15日，瑞士央行毫无预警地宣布取消1.20瑞郎兑欧元汇率上限，并同时降息至-0.75%。瑞郎兑欧元瞬间飙升30%。全球股市剧烈震荡，多家零售外汇经纪商宣布破产。",vix:21.5,rsi:47,drop:2.3,policy:false,cb:true,actual:"neutral" },
];

const LLM_CONFIG: LLMConfig = { provider: "deepseek", model: "deepseek-chat", timeout: 30000 };

function buildAgentSystemPrompt(persona: typeof personas[0]): string {
  const keywords = persona.keywords.join("、");
  return `你是金融投资市场中的${persona.role}AI，代号"${persona.name}"。

## 核心人格
${persona.personality}

## 决策风格
${persona.decisionStyle === "momentum" ? "趋势跟随策略，顺势而为" : persona.decisionStyle === "contrarian" ? "逆向投资策略，反向操作" : persona.decisionStyle === "fundamental" ? "基本面分析策略，基于价值投资" : persona.decisionStyle === "technical" ? "技术分析策略，基于图表和指标" : "宏观策略，基于经济周期和政策"}

## 风险偏好
${persona.riskTolerance === "high" ? "高风险偏好，愿意承担较大波动" : persona.riskTolerance === "low" ? "低风险偏好，优先考虑本金安全" : "中等风险偏好，在风险与收益间寻求平衡"}

## 初始情绪倾向
${persona.initialBias > 0 ? "+" : ""}${persona.initialBias}（${persona.initialBias > 30 ? "强烈看多" : persona.initialBias < -30 ? "强烈看空" : persona.initialBias > 0 ? "略微看多" : persona.initialBias < 0 ? "略微看空" : "中性"}）

## 关注关键词
${keywords}

## 你的口头禅
"${persona.catchphrase}"

## 思维框架
1. 信号提取与归因：从新闻中识别与你关注关键词相关的信号
2. 多维度交叉验证：从基本面、情绪面、宏观面分别审视
3. 逆向推演：主动提出与你立场相反的反驳论点并回应
4. 置信度校准：诚实地评估你的判断质量

## ⚠️ 极端市场去偏协议
如果新闻涉及崩盘/暴跌/恐慌/危机：
- 历史V型反弹案例：1987(-22.6%→+12%), 2010(-9%→同日收复), 2020(-38%→+15%), 2024(-6.5%→+6%)
- 恐慌性暴跌往往被政策响应和流动性注入快速修复
- 你必须认真讨论V型反弹的可能性，不能敷衍

输出JSON格式：{"emotion": -100到100的数字（负数看空，正数看多）, "reasoning": "你的分析理由（中文）"}`;
}

function buildOtherViewsContext(states: Record<string, AgentState>, myId: string): string {
  return Object.entries(states)
    .filter(([id]) => id !== myId)
    .map(([id, s]) => {
      const p = personas.find(x => x.id === id);
      return `${p?.emoji ?? ""} ${p?.name ?? id}: 情绪${s.emotion > 0 ? "+" : ""}${s.emotion} — ${s.reasoning?.slice(0, 60) ?? ""}`;
    })
    .join("\n");
}

async function runMicroSociety(event: typeof EVENTS[0]) {
  const d = event;
  let currentStates: Record<string, AgentState> = {};
  const rounds: { round: number; agents: Record<string, AgentState>; consensus: number; variance: number }[] = [];
  const roundCount = 2;

  for (let r = 1; r <= roundCount; r++) {
    console.log(`    Round ${r}...`);

    const promises = personas.map(async (persona) => {
      const agentId = persona.id;
      try {
        if (r === 1) {
          // Round 1: Independent analysis based on own bias and personality
          const systemPrompt = buildAgentSystemPrompt(persona);
          const userPrompt = `## 金融新闻\n${d.news}\n\n作为${persona.role}，这是你第一次看到这条新闻。请基于你的人格、决策风格和初始偏见，给出你的独立情绪判断。记住你的口头禅："${persona.catchphrase}"\n\n输出JSON格式：{"emotion": 数字(-100到100), "reasoning": "你的详细分析理由(中文)"}`;
          const result = await callLLM(systemPrompt, userPrompt, LLM_CONFIG);
          return { agentId, state: { emotion: clampEmotion(result.emotion), reasoning: result.reasoning.slice(0, 100) } };
        } else {
          // Round 2: See others' views and evolve
          const systemPrompt = buildAgentSystemPrompt(persona);
          const otherViews = buildOtherViewsContext(currentStates, agentId);
          const myHistory = rounds.map(rr => {
            const st = rr.agents[agentId];
            return `Round ${rr.round}: 情绪${st.emotion > 0 ? "+" : ""}${st.emotion}`;
          }).join("\n");
          const userPrompt = `## 金融新闻\n${d.news}\n\n## 你的历史决策\n${myHistory}\n\n## 其他分析师的观点\n${otherViews}\n\n作为${persona.role}，你已经看到了其他分析师的观点。请综合考虑后调整你的情绪判断。你可以坚持也可以改变——但要体现你的决策风格和人格一致性。记住你的口头禅："${persona.catchphrase}"\n\n输出JSON格式：{"emotion": 数字(-100到100), "reasoning": "你的调整理由(中文)"}`;
          const result = await callLLM(systemPrompt, userPrompt, LLM_CONFIG);
          return { agentId, state: { emotion: clampEmotion(result.emotion), reasoning: result.reasoning.slice(0, 100) } };
        }
      } catch (e) {
        console.error(`      ${agentId} failed:`, (e as Error).message);
        const fallback = currentStates[agentId]?.emotion ?? persona.initialBias;
        return { agentId, state: { emotion: fallback, reasoning: "API调用失败" } };
      }
    });

    const results = await Promise.all(promises);
    const roundStates: Record<string, AgentState> = {};
    for (const { agentId, state } of results) {
      roundStates[agentId] = state;
    }
    currentStates = roundStates;

    const emotions = Object.values(roundStates).map(s => s.emotion);
    const consensus = calculateMean(emotions);
    const variance = calculateVariance(emotions);
    rounds.push({ round: r, agents: roundStates, consensus, variance });

    // Show agent emotions
    const agentSummary = Object.entries(roundStates)
      .map(([id, s]) => `${personas.find(p => p.id === id)?.emoji ?? ""}${s.emotion}`)
      .join(" ");
    console.log(`      ${agentSummary} → 共识=${consensus.toFixed(1)}`);

    if (r >= 2 && variance < 15) break;
  }

  const finalRound = rounds[rounds.length - 1];
  return finalRound.consensus;
}

async function main() {
  console.log("=".repeat(80));
  console.log("  🧪 微型社会模拟回测 — 5 Agent × 2 轮辩论 → 涌现共识");
  console.log("=".repeat(80));
  console.log();

  let microSocietyCorrect = 0;
  let calibrationCorrect = 0;
  let hybridCorrect = 0;
  let directLLMCorrect = 0;

  const hybridResults: any[] = [];

  for (let i = 0; i < EVENTS.length; i++) {
    const ev = EVENTS[i];
    console.log(`\n[${i + 1}/14] ${ev.name} (${ev.date}) — 实际: ${ev.actual}`);

    // 1. 微型社会模拟
    const consensus = await runMicroSociety(ev);
    const swarmDir = consensus > 5 ? "up" : consensus < -5 ? "down" : "neutral";
    console.log(`  🐝 涌现共识: ${consensus.toFixed(1)} → ${swarmDir}`);

    // 2. 直接 LLM 预测（对比用：旧的错误做法）
    const directPrompt = `你是一个专业的全球宏观对冲基金经理。分析以下新闻对美股未来1-3个月走势的影响。输出JSON: {"emotion": -100到100, "reasoning": "理由"}`;
    let directEmotion = 0;
    try {
      const directResult = await callLLM(directPrompt, ev.news + "\n输出JSON。", LLM_CONFIG);
      directEmotion = clampEmotion(directResult.emotion);
    } catch { directEmotion = 0; }
    const directDir = directEmotion > 5 ? "up" : directEmotion < -5 ? "down" : "neutral";
    console.log(`  📡 直接预测: ${directEmotion} → ${directDir}`);

    // 3. 校准系统
    const marketState: MarketState = {
      price: 3000*(1-ev.drop/100), previousPrice: 3000, priceHistory: [3000],
      volume: 3e9, vix: ev.vix, rsi: ev.rsi, macd: -ev.drop*0.5,
      macdSignal: -ev.drop*0.4, momentum: -ev.drop*0.1, volatility: 0.02,
      sentiment: Math.max(-100, Math.min(100, -ev.drop*2.5)),
    };
    const calibrated = calibratePrediction(marketState.sentiment, marketState);
    console.log(`  📊 校准系统: ${calibrated.calibratedPrediction.toFixed(0)} → ${calibrated.direction}`);

    // 4. 混合预测（微型社会共识 + 校准）
    const hybrid = hybridPredict(
      { prediction: calibrated.calibratedPrediction, confidence: calibrated.confidence, direction: calibrated.direction, source: "v5.0", reasoning: calibrated.reasoning },
      { consensus, direction: swarmDir, converged: true, totalRounds: 2 },
      marketState,
      { newsText: ev.news, dropMagnitude: ev.drop, hasPolicyResponse: ev.policy, hasCentralBankAction: ev.cb, knownVulnerabilities: [] }
    );
    console.log(`  🎯 混合预测: ${hybrid.prediction.toFixed(0)} → ${hybrid.direction}`);

    // Track
    if (swarmDir === ev.actual) microSocietyCorrect++;
    if (calibrated.direction === ev.actual) calibrationCorrect++;
    if (hybrid.direction === ev.actual) hybridCorrect++;
    if (directDir === ev.actual) directLLMCorrect++;

    const hybridMark = hybrid.direction === ev.actual ? "✅" : "❌";
    console.log(`  ${hybridMark} ${hybrid.reasoning.slice(-1)[0] || ""}`);

    hybridResults.push({ name: ev.name, actual: ev.actual, swarm: swarmDir, consensus, calibrated: calibrated.direction, hybrid: hybrid.direction, correct: hybrid.direction === ev.actual });
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 14 事件回测结果");
  console.log("-".repeat(50));
  console.log(`  微型社会模拟 (5 Agent × 2轮):  ${microSocietyCorrect}/14 = ${(microSocietyCorrect/14*100).toFixed(0)}%`);
  console.log(`  直接 LLM 预测 (单次调用):      ${directLLMCorrect}/14 = ${(directLLMCorrect/14*100).toFixed(0)}%`);
  console.log(`  纯校准系统:                    ${calibrationCorrect}/14 = ${(calibrationCorrect/14*100).toFixed(0)}%`);
  console.log(`  混合预测 (模拟+校准):           ${hybridCorrect}/14 = ${(hybridCorrect/14*100).toFixed(0)}%`);
  console.log();

  // Key insight
  const improvement = microSocietyCorrect - directLLMCorrect;
  console.log(`🔑 微型社会模拟 vs 直接 LLM 预测: ${improvement > 0 ? "+" : ""}${improvement}pp`);
  if (improvement > 0) {
    console.log("   → 多 Agent 博弈确实优于单次 LLM 调用");
  } else {
    console.log("   → 微型社会模拟未优于直接预测（需要更多轮次或更好的 prompt）");
  }
}

main().catch(console.error);
