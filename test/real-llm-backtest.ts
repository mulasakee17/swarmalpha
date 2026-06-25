/**
 * 🧪 真实 DeepSeek LLM 回测 — 14 个已验证事件
 *
 * 目的：替代模拟 LLM，用真实 DeepSeek 跑混合预测，验证系统真实表现。
 *
 * 运行: npx tsx test/real-llm-backtest.ts
 * 前提: .env.local 中 DEEPSEEK_API_KEY 已配置
 *
 * 输出：
 *   - 每个事件的 LLM 原始共识 vs 校准 vs 混合 vs 实际
 *   - 纯 LLM / 纯校准 / 混合预测准确率对比
 *   - 与模拟 LLM 基线对比
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { callLLM, LLMConfig } from "../src/lib/llm/providers";
import { calibratePrediction } from "../src/lib/calibration/predictionCalibrator";
import { hybridPredict } from "../src/lib/calibration/hybridPredictor";
import type { MarketState, CalibratedPrediction } from "../src/lib/calibration/predictionCalibrator";

// ========== 14 个已验证事件 ==========

interface BacktestEvent {
  name: string;
  date: string;
  newsOnTheDay: string;
  knownData: {
    vix: number;
    rsi: number;
    dropFromPeak: number;
    recentVolatility: number;
    volumeSpike: number;
    eventCategory: string;
    knownPolicyAction: string;
    knownVulnerability: string;
  };
  actualOutcome: {
    direction: "up" | "down" | "neutral";
    oneMonthReturn: number;
    threeMonthReturn: number;
    description: string;
  };
}

// From strict-backtest.ts — the 14 original verified events
const EVENTS: BacktestEvent[] = [
  {
    name: "2016年英国脱欧公投", date: "2016-06-24",
    newsOnTheDay: "2016年6月24日，英国公投结果公布，51.9%选民支持脱欧，远超市场预期的'留欧'。英镑兑美元暴跌8.1%至31年新低，日经225指数暴跌7.9%，全球股市集体重挫。标普500期货盘前一度跌超5%触发熔断。英国首相卡梅伦宣布辞职。",
    knownData: { vix: 25.8, rsi: 30, dropFromPeak: 5.3, recentVolatility: 0.018, volumeSpike: 2.8, eventCategory: "geopolitical", knownPolicyAction: "英格兰银行声明准备提供2500亿英镑流动性。尚未有具体降息或QE公告。", knownVulnerability: "欧洲银行股此前已走弱。英镑空头头寸处于历史高位。" },
    actualOutcome: { direction: "up", oneMonthReturn: 3.6, threeMonthReturn: 5.5, description: "V型反弹。标普500在2周内完全收复失地。" },
  },
  {
    name: "2018年平安夜暴跌", date: "2018-12-24",
    newsOnTheDay: "2018年12月24日，美股在圣诞前夜的半日交易中再度暴跌。标普500收跌2.7%，自9月高点累计下跌19.8%，逼近熊市边缘。纳斯达克已确认进入熊市。美联储12月19日加息并暗示2019年继续收紧、中美贸易战升级。财政部长姆努钦在周日召集银行高管紧急会议，反而加剧了市场恐慌。",
    knownData: { vix: 36.1, rsi: 20, dropFromPeak: 19.8, recentVolatility: 0.035, volumeSpike: 2.2, eventCategory: "financial", knownPolicyAction: "美联储12月19日刚加息25bp至2.25-2.50%，暗示2019年还将加息两次。尚未有任何转向信号。", knownVulnerability: "企业债杠杆率高。程序化交易和ETF被动抛售加剧下跌。" },
    actualOutcome: { direction: "up", oneMonthReturn: 13.6, threeMonthReturn: 20.1, description: "V型大反弹。鲍威尔1月4日发表鸽派讲话触发反转。" },
  },
  {
    name: "1998年LTCM崩溃", date: "1998-09-23",
    newsOnTheDay: "1998年9月23日，纽约联邦储备银行紧急召集华尔街主要银行，协调对长期资本管理公司(LTCM)的36亿美元救助计划。这家由诺贝尔奖得主管理的对冲基金在高杠杆套利策略上损失了超过40亿美元。俄罗斯8月债务违约已引发全球金融动荡。",
    knownData: { vix: 43.0, rsi: 25, dropFromPeak: 15.0, recentVolatility: 0.03, volumeSpike: 3.0, eventCategory: "financial", knownPolicyAction: "纽联储协调救助会议正在进行中。尚不清楚救助能否成功。美联储尚未宣布利率调整。", knownVulnerability: "LTCM杠杆率超25倍。全球金融机构对其敞口巨大。俄罗斯已违约。" },
    actualOutcome: { direction: "up", oneMonthReturn: 7.5, threeMonthReturn: 22.3, description: "V型反弹。救助成功+美联储10月意外降息25bp。" },
  },
  {
    name: "2008年雷曼兄弟破产", date: "2008-09-15",
    newsOnTheDay: "2008年9月15日，雷曼兄弟控股公司申请破产保护，成为美国历史上最大的破产案。此前周末美国政府拒绝救助雷曼。美林证券被迫以500亿美元出售给美国银行。AIG寻求400亿美元紧急贷款。道指当日暴跌504点（-4.4%），全球股市集体重挫，信贷市场冻结。",
    knownData: { vix: 31.7, rsi: 32, dropFromPeak: 22.0, recentVolatility: 0.035, volumeSpike: 3.5, eventCategory: "financial", knownPolicyAction: "财政部明确拒绝救助雷曼。美联储扩大一级交易商信贷便利(PDCF)的抵押品范围。尚未有全面救助计划。", knownVulnerability: "次贷危机已持续14个月。贝尔斯登3月已被救助。房利美房地美9月7日被接管。全球金融机构交叉持有有毒资产。" },
    actualOutcome: { direction: "down", oneMonthReturn: -16.8, threeMonthReturn: -25.4, description: "L型下跌。雷曼破产引发全球金融海啸。标普500在2009年3月才见底。" },
  },
  {
    name: "2015年中国A股股灾", date: "2015-08-24",
    newsOnTheDay: "2015年8月24日，中国上证综指暴跌8.5%，创2007年以来最大单日跌幅，全球股市连锁下跌。道指开盘暴跌1000点（史上首次）。自6月高点以来上证已累计下跌40%，超过20万亿元人民币市值蒸发。中国政府连续出台救市措施（禁止大股东减持、国家队入场、降息降准），但市场持续下跌。",
    knownData: { vix: 40.7, rsi: 15, dropFromPeak: 40.0, recentVolatility: 0.055, volumeSpike: 3.8, eventCategory: "financial", knownPolicyAction: "中国央行8月25日宣布降息25bp+降准50bp。证监会已禁止大股东减持。国家队已入场买入蓝筹股和ETF。但此前多次救市均未遏制跌势。", knownVulnerability: "融资余额从2.2万亿降至1.3万亿。大量杠杆资金已被强制平仓。人民币贬值预期形成。" },
    actualOutcome: { direction: "down", oneMonthReturn: -2.5, threeMonthReturn: -5.8, description: "延续下跌。市场在短暂反弹后继续下探。" },
  },
  {
    name: "2020年新冠疫情首次爆发", date: "2020-02-24",
    newsOnTheDay: "2020年2月24日，意大利和韩国新冠确诊病例急剧增加，疫情在中国以外地区加速蔓延。道指暴跌1032点（-3.6%），标普500下跌3.4%。黄金飙升至七年新高，10年期美债收益率跌至1.37%历史新低。市场开始担忧全球供应链中断和全球经济衰退。WHO警告疫情可能成为全球大流行。",
    knownData: { vix: 24.5, rsi: 38, dropFromPeak: 3.0, recentVolatility: 0.012, volumeSpike: 2.0, eventCategory: "pandemic", knownPolicyAction: "尚无货币政策响应。各国正在加强旅行限制和边境管控。疫苗开发至少需要12-18个月。", knownVulnerability: "全球供应链高度依赖中国。企业盈利预警开始出现。日本和德国经济已接近衰退。" },
    actualOutcome: { direction: "down", oneMonthReturn: -26.5, threeMonthReturn: -8.9, description: "继续暴跌。3月美股四次熔断，标普在3月23日见底(-34%)。" },
  },
  {
    name: "2022年美联储激进加息", date: "2022-01-05",
    newsOnTheDay: "2022年1月5日，美联储公布12月FOMC会议纪要，显示官员们认为可能需要比预期更早、更快地加息，并开始讨论缩减8.8万亿美元资产负债表。纳斯达克暴跌3.3%。10年期美债收益率飙升至1.70%以上。科技股和成长股领跌。",
    knownData: { vix: 18.5, rsi: 45, dropFromPeak: 5.0, recentVolatility: 0.013, volumeSpike: 2.1, eventCategory: "regulatory", knownPolicyAction: "美联储明确转向鹰派。市场定价3月加息概率从53%飙升至80%。尚未有任何鸽派信号。", knownVulnerability: "纳斯达克2020-2021年涨幅超100%。通胀达7%创40年新高。科技股估值处于互联网泡沫水平。" },
    actualOutcome: { direction: "down", oneMonthReturn: -7.0, threeMonthReturn: -5.3, description: "持续下跌。2022年熊市的确认信号。纳斯达克全年跌33%。" },
  },
  {
    name: "2011年美国主权降级", date: "2011-08-08",
    newsOnTheDay: "2011年8月5日盘后，标普宣布将美国主权信用评级从AAA下调至AA+，评级展望为负面，这是美国历史上首次失去AAA评级。8月8日周一，道指暴跌634点（-5.5%），标普500暴跌6.7%。欧洲债务危机同步恶化，意大利和西班牙债券收益率飙升。",
    knownData: { vix: 39.0, rsi: 22, dropFromPeak: 16.8, recentVolatility: 0.032, volumeSpike: 3.2, eventCategory: "regulatory", knownPolicyAction: "美联储8月9日声明维持0-0.25%利率至少到2013年中。尚未有QE3信号。欧央行已开始购买意大利和西班牙债券。", knownVulnerability: "欧债危机持续恶化。美国国会债务上限争议刚结束。银行股已被大幅抛售。" },
    actualOutcome: { direction: "down", oneMonthReturn: -7.8, threeMonthReturn: -3.2, description: "短期继续下跌+剧烈震荡。真正的反弹在10月QE2.5暗示后才启动。" },
  },
  {
    name: "2013年削减恐慌", date: "2013-06-19",
    newsOnTheDay: "2013年6月19日，美联储主席伯南克在FOMC会后发布会上表示，如果经济持续改善，美联储可能在今年晚些时候开始缩减每月850亿美元的资产购买规模。市场将此解读为量化宽松退出的信号。标普500当日下跌1.4%，10年期美债收益率飙升。",
    knownData: { vix: 19.5, rsi: 35, dropFromPeak: 4.6, recentVolatility: 0.015, volumeSpike: 2.5, eventCategory: "regulatory", knownPolicyAction: "伯南克明确表示缩减QE的门槛是经济持续改善。他强调缩减≠紧缩，联邦基金利率仍将维持在0-0.25%。", knownVulnerability: "新兴市场大量借入美元债务。美股估值处于历史高位。" },
    actualOutcome: { direction: "up", oneMonthReturn: 5.4, threeMonthReturn: 8.2, description: "短暂恐慌后恢复上涨。伯南克7月安抚市场。标普全年涨32%。" },
  },
  {
    name: "2014年埃博拉恐慌", date: "2014-10-15",
    newsOnTheDay: "2014年10月15日，美国确诊第二例埃博拉病例，全球股市连续第5日下跌。标普500自9月高点下跌7.4%，VIX升至26。航空公司股票领跌，投资者担忧疫情将冲击全球旅行和贸易。西非疫情持续恶化，WHO警告感染人数可能呈指数增长。",
    knownData: { vix: 26.3, rsi: 22, dropFromPeak: 7.4, recentVolatility: 0.023, volumeSpike: 2.2, eventCategory: "pandemic", knownPolicyAction: "美国CDC加强机场筛查。尚未有旅行禁令。无疫苗获批。", knownVulnerability: "航空和旅游板块此前已高位运行。全球经济增长预期已在下调。" },
    actualOutcome: { direction: "up", oneMonthReturn: 5.7, threeMonthReturn: 10.1, description: "V型反弹。埃博拉在美国得到控制。标普在11-12月连续创出新高。" },
  },
  {
    name: "2021年恒大危机", date: "2021-09-20",
    newsOnTheDay: "2021年9月20日，中国恒大集团面临3000亿美元债务违约风险，全球股市集体下跌。恒大股价年初至今暴跌85%，多笔债券利息支付已逾期。投资者担忧恒大违约可能引发中国房地产行业系统性危机。摩根士丹利和瑞银下调全球经济增长预期。",
    knownData: { vix: 25.7, rsi: 35, dropFromPeak: 4.2, recentVolatility: 0.016, volumeSpike: 2.3, eventCategory: "financial", knownPolicyAction: "中国央行通过逆回购注入1200亿元流动性。尚未有全面救助计划。中国政府暗示恒大危机将由市场方式解决。", knownVulnerability: "中国房地产行业占GDP约29%。部分中资美元债已被抛售。" },
    actualOutcome: { direction: "up", oneMonthReturn: 5.8, threeMonthReturn: 7.2, description: "影响有限。美股迅速恢复。恒大事后正式违约但市场已充分定价。" },
  },
  {
    name: "2022年英国养老金危机", date: "2022-09-28",
    newsOnTheDay: "2022年9月28日，英格兰银行紧急宣布无限量购买长期英国国债，以遏制英国养老金基金面临的抵押品危机。此前英国财政大臣夸西·克沃滕宣布的减税计划引发英国国债和英镑暴跌。养老金基金持有的LDI策略面临大规模保证金追缴，形成死亡螺旋。",
    knownData: { vix: 32.0, rsi: 25, dropFromPeak: 23.5, recentVolatility: 0.028, volumeSpike: 2.8, eventCategory: "financial", knownPolicyAction: "英格兰银行刚刚宣布紧急购债。减税计划未见撤回迹象。美联储仍在加息周期中。", knownVulnerability: "英国养老金LDI策略杠杆率高。全球债券市场同步下跌。美元持续走强。" },
    actualOutcome: { direction: "up", oneMonthReturn: 8.9, threeMonthReturn: 4.8, description: "英格兰银行介入后市场企稳。特拉斯首相下台。美股受益于利率见顶预期。" },
  },
  {
    name: "2025年DeepSeek冲击", date: "2025-01-27",
    newsOnTheDay: "2025年1月27日，中国AI公司DeepSeek发布的开源大模型以极低成本实现了接近GPT-4的性能，引发全球AI行业震动。英伟达股价单日暴跌17%，市值蒸发5890亿美元。费城半导体指数暴跌9.2%。市场恐慌重新评估AI芯片需求前景。",
    knownData: { vix: 19.3, rsi: 42, dropFromPeak: 3.5, recentVolatility: 0.014, volumeSpike: 4.0, eventCategory: "tech", knownPolicyAction: "尚无政策响应。分析师对AI芯片长期需求前景出现重大分歧。", knownVulnerability: "英伟达此前一年涨幅超过200%。AI产业链估值处于极高水平。" },
    actualOutcome: { direction: "neutral", oneMonthReturn: 0.5, threeMonthReturn: 2.1, description: "分化走势。科技股内部轮动。标普500整体持平。" },
  },
  {
    name: "2015年瑞士央行黑天鹅", date: "2015-01-15",
    newsOnTheDay: "2015年1月15日，瑞士央行(SNB)毫无预警地宣布取消实施三年半的1.20瑞郎兑欧元汇率上限，并同时降息至-0.75%。瑞郎兑欧元瞬间飙升30%至0.85，创外汇市场历史上最大单日波动。全球股市剧烈震荡，外汇经纪商集体爆仓。多家零售外汇经纪商宣布破产。",
    knownData: { vix: 21.5, rsi: 47, dropFromPeak: 2.3, recentVolatility: 0.022, volumeSpike: 2.5, eventCategory: "regulatory", knownPolicyAction: "瑞士央行已降息至-0.75%（当日执行）。无其他央行响应。此事件完全是瑞士央行单方面决定。", knownVulnerability: "大量投机资金押注瑞郎贬值。外汇经纪商和银行持有巨大瑞郎空头头寸。" },
    actualOutcome: { direction: "neutral", oneMonthReturn: 0.3, threeMonthReturn: 2.8, description: "冲击主要集中在瑞士股市和外汇市场。美股在短暂下跌后迅速恢复。" },
  },
];

// ========== LLM 调用 ==========

async function getLLMSentiment(
  event: BacktestEvent
): Promise<{ consensus: number; reasoning: string } | null> {
  const systemPrompt = `你是一个专业的全球宏观对冲基金经理。请分析以下新闻事件对美股（标普500指数）未来1-3个月走势的影响。

## 分析框架：
1. 信号提取：识别新闻中的关键信息点，标注每条信息的影响权重
2. 多维度验证：从基本面、情绪面、宏观面分别审视
3. 逆向推演：主动提出与你立场相反的有力反驳论点
4. 置信度校准：诚实地评估你的判断质量

## 关键提醒：
- 市场往往在坏消息达到顶峰时见底（买在血流成河时）
- 注意区分"恐慌性超卖"（通常机会）和"结构性恶化"（需要回避）
- 考虑央行政策响应的力度和时效性
- 如果RSI极度超卖且VIX飙升，历史上这往往是底部而非进一步下跌的信号

请输出JSON格式：
{
  "emotion": -100到100（负数看空/正数看多），
  "reasoning": "你的分析理由（中文，300字以内）"
}`;

  const userPrompt = `【新闻日期】${event.date}
【新闻内容】${event.newsOnTheDay}
【事发当天已知政策】${event.knownData.knownPolicyAction}
【已知市场脆弱性】${event.knownData.knownVulnerability}

请分析此事件对美股未来1-3个月走势的影响，输出JSON。`;

  const llmConfig: LLMConfig = {
    provider: "deepseek",
    model: "deepseek-chat",
    timeout: 30000,
  };

  try {
    const result = await callLLM(systemPrompt, userPrompt, llmConfig);
    return { consensus: result.emotion, reasoning: result.reasoning };
  } catch (err: any) {
    console.error(`  ❌ LLM call failed: ${err.message}`);
    return null;
  }
}

// ========== 主测试 ==========

async function runRealLLMBacktest() {
  console.log("=".repeat(80));
  console.log("  🧪 真实 DeepSeek LLM 回测 — 14 个已验证事件");
  console.log("=".repeat(80));
  console.log();

  const results: any[] = [];
  let llmCorrect = 0, calCorrect = 0, hybridCorrect = 0;
  let llmErrors = 0;

  for (let i = 0; i < EVENTS.length; i++) {
    const event = EVENTS[i];
    console.log(`[${i + 1}/14] ${event.name} (${event.date})`);
    console.log(`  实际: ${event.actualOutcome.direction}`);

    // 1. Real LLM
    const llmResult = await getLLMSentiment(event);
    if (!llmResult) {
      llmErrors++;
      console.log(`  ⚠️ LLM 调用失败，跳过`);
      continue;
    }
    const llmDir = llmResult.consensus > 10 ? "up" : llmResult.consensus < -10 ? "down" : "neutral";
    console.log(`  LLM: ${llmResult.consensus} (${llmDir})`);

    // 2. Calibration
    const d = event.knownData;
    const marketState: MarketState = {
      price: 3000 * (1 - d.dropFromPeak / 100),
      previousPrice: 3000,
      priceHistory: [3000],
      volume: d.volumeSpike * 1e9,
      vix: d.vix,
      rsi: d.rsi,
      macd: -d.dropFromPeak * 0.5,
      macdSignal: -d.dropFromPeak * 0.4,
      momentum: -d.dropFromPeak * 0.1,
      volatility: d.recentVolatility,
      sentiment: Math.max(-100, Math.min(100, -d.dropFromPeak * 2.5)),
    };

    const calibrated = calibratePrediction(marketState.sentiment, marketState);
    console.log(`  Cal: ${calibrated.calibratedPrediction.toFixed(0)} (${calibrated.direction})`);

    // 3. Hybrid prediction
    const hybrid = hybridPredict(
      {
        prediction: calibrated.calibratedPrediction,
        confidence: calibrated.confidence,
        direction: calibrated.direction,
        source: "v4.2",
        reasoning: calibrated.reasoning,
      },
      {
        consensus: llmResult.consensus,
        direction: llmDir,
        converged: true,
        totalRounds: 1,
      },
      marketState,
      {
        newsText: event.newsOnTheDay,
        dropMagnitude: d.dropFromPeak,
        hasPolicyResponse: /注入|购债|QE|救助|降息|宽松|紧急|emergency/i.test(d.knownPolicyAction),
        hasCentralBankAction: /央行|美联储|fed|ECB|BOJ|降息|利率|购债/i.test(d.knownPolicyAction),
        knownVulnerabilities: d.knownVulnerability ? [d.knownVulnerability] : [],
      }
    );

    console.log(`  Hybrid: ${hybrid.prediction.toFixed(0)} (${hybrid.direction}) | 分类: ${hybrid.crisisAssessment?.type || "N/A"}`);

    // Track accuracy
    const actual = event.actualOutcome.direction;
    if (llmDir === actual) llmCorrect++;
    if (calibrated.direction === actual) calCorrect++;
    if (hybrid.direction === actual) hybridCorrect++;

    const hybMark = hybrid.direction === actual ? "✅" : "❌";
    console.log(`  ${hybMark} ${hybrid.reasoning.slice(-2).join(" | ")}`);
    console.log();

    results.push({ event, llmResult, calibrated, hybrid, correct: hybrid.direction === actual });
  }

  // Summary
  const total = EVENTS.length - llmErrors;
  console.log("=".repeat(80));
  console.log("📊 真实 LLM 回测结果");
  console.log("-".repeat(50));
  console.log(`  纯 LLM (DeepSeek):     ${llmCorrect}/${total} = ${(llmCorrect/total*100).toFixed(1)}%`);
  console.log(`  纯校准系统:            ${calCorrect}/${total} = ${(calCorrect/total*100).toFixed(1)}%`);
  console.log(`  混合预测 (v4.2):       ${hybridCorrect}/${total} = ${(hybridCorrect/total*100).toFixed(1)}%`);
  if (llmErrors > 0) console.log(`  ⚠️ ${llmErrors} 个 LLM 调用失败`);
  console.log();

  // Compare with simulated LLM baseline
  console.log("📊 与模拟 LLM 对比");
  console.log("-".repeat(50));
  console.log(`  模拟 LLM (strict-backtest):  35.7% (5/14)`);
  console.log(`  真实 LLM (DeepSeek):         ${(llmCorrect/total*100).toFixed(1)}% (${llmCorrect}/${total})`);
  console.log();

  console.log("✅ 真实 LLM 回测完成");
}

runRealLLMBacktest().catch(console.error);
