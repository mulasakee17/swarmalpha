# SwarmAlpha v9.5 运行时逻辑详解

> 一次完整请求的逐层拆解：从浏览器输入新闻到页面渲染结果

---

## 目录

1. [第一层：用户触发](#第一层用户触发)
2. [第二层：API 路由 — 门禁](#第二层api-路由--门禁)
3. [第三层：获取市场背景数据](#第三层获取市场背景数据)
4. [第四层：v9.3 核心引擎启动](#第四层v93-核心引擎启动)
   - [4.1 因子提取](#41-因子提取--1-次-llm-调用)
   - [4.2 Agent 因子解读](#42-agent-因子解读--纯数学)
   - [4.3 共识涌现](#43-共识涌现--3-轮演化)
   - [4.4 群体行为诊断](#44-群体行为诊断--纯数学-毫秒级)
5. [第五层：v9.5 Agent 社交互动](#第五层v95--agent-社交互动)
6. [第六层：v9.5 共识度量计算](#第六层v95--共识度量计算)
7. [第七层：返回响应](#第七层返回响应)
8. [第八层：前端渲染](#第八层前端渲染)
9. [附录：完整流程图](#附录完整流程图)
10. [附录：关键数字](#附录关键数字)

---

## 第一层：用户触发

用户在浏览器输入一条新闻，比如：

> *"美联储紧急降息50个基点，超出市场预期"*

点击提交。

`src/app/page.tsx:100` 的 `handleSubmit` 函数被调用：

```typescript
// 发送 POST 请求
fetch("/api/swarm", {
  method: "POST",
  body: JSON.stringify({
    version: "v9",      // 走 v9 引擎
    news: "美联储紧急降息50个基点...",
    rounds: 3,          // 3 轮共识演化
    llmConfig: {
      provider: "deepseek",
      model: "deepseek-chat"
    }
  })
})
```

**请求体字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | `"v5" \| "v6" \| "v9"` | 引擎版本，默认 `"v5"`。传 `"v9"` 走 v9.3 + v9.5 |
| `news` | `string` | 新闻文本，1-5000 字符 |
| `rounds` | `number` | 共识演化轮数，1-10，默认 3 |
| `llmConfig` | `object` | LLM 供应商配置：`provider`（deepseek/openai/anthropic/local）和 `model` |
| `disableInteraction` | `boolean` | （可选）设为 `true` 跳过 v9.5 互动层，回退到 v9.3 行为 |
| `ablation` | `object` | （可选）消融实验配置：禁用特定组件用于对照实验 |

---

## 第二层：API 路由 — 门禁

`src/app/api/swarm/route.ts:135` 的 `POST` 函数收到请求，按顺序做三件事。

### 2.1 频率限制

```typescript
const clientId = getClientIdentifier(req);
// 用 IP + User-Agent 生成客户端标识

const rateLimitResult = checkRateLimit(clientId, RATE_LIMIT_PRESETS.standard);
// 滑动窗口算法, 默认配置: 每 60 秒最多 10 次请求

if (!rateLimitResult.allowed) {
  return NextResponse.json(
    { success: false, code: "RATE_LIMITED", retryAfter: 60 },
    { status: 429 }
  );
}
```

**频率限制实现**（`src/lib/security/rateLimit.ts`）：
- 三层配置：全局 / 用户 / IP
- 滑动窗口算法，自动清理过期记录
- 响应头返回 `X-RateLimit-Remaining` 和 `X-RateLimit-Reset`

### 2.2 输入校验

```typescript
const validation = validateSwarmRequest(body);
if (!validation.valid) {
  return NextResponse.json(
    { success: false, code: "VALIDATION_ERROR", details: validation.errors },
    { status: 400 }
  );
}
```

**校验规则**（`src/lib/security/validation.ts`）：

| 检查项 | 规则 |
|--------|------|
| `news` 长度 | 1-5000 字符 |
| `rounds` 范围 | 1-10 |
| XSS 注入 | 拦截 `<script>`、`javascript:`、事件处理器、`<iframe>` 等 |
| SQL 注入 | 拦截 `SELECT`、`INSERT`、`DROP`、`UNION` 等关键词 |
| 命令注入 | 拦截管道符+命令、`$()`、模板注入、反引号命令 |

### 2.3 版本路由

```typescript
const version = (body as any).version ?? "v5";

if (version === "v6") {
  // v6.0 涌现式共识引擎 (1次LLM种子 + 纯数学多轮演化)
}
if (version === "v9") {
  // v9.3 正交五因子 + v9.5 互动与度量 ← 当前主干
}
// 默认: v5.0 信息不对称引擎 (2轮LLM辩论)
```

**我们传了 `version: "v9"`，进入 v9 分支（第 288 行）。**

---

## 第三层：获取市场背景数据

```typescript
const marketSnapshot = await getRealMarketSnapshot();
```

**实现**（`src/lib/market-data/realMarketParams.ts`）：

1. 调用 **Yahoo Finance v8 chart API**（免费，无需 API Key）
2. 获取 S&P 500（`^GSPC`）最近 60 个交易日的 OHLCV 数据
3. 获取 VIX 指数（`^VIX`）当前值
4. 从价格序列计算：

| 参数 | 计算方式 |
|------|---------|
| `vix` | VIX 指数当前值，默认 20 |
| `rsi(14)` | 14 日相对强弱指标：`100 - 100/(1 + RS)`，RS = 14日平均涨幅 / 14日平均跌幅 |
| `dropMagnitude` | `(近期最高价 - 当前价) / 近期最高价 × 100` |
| `volatility` | 20 日对数收益率的标准差 × √252（年化） |
| `hasPolicyResponse` | 新闻文本中检测政策关键词（降息/救助/QE/注入/宽松 等） |

**降级策略：** 如果 Yahoo Finance 不可用（网络问题/API 变更），自动降级到 `inferMarketParams()`，从新闻文本用关键词正则推断以上参数。

**数据缓存：** Yahoo Finance 数据在内存中缓存 5 分钟，避免重复请求。

---

## 第四层：v9.3 核心引擎启动

`src/lib/agents/v9/simulation.ts:164` — `runSwarmV9(config, useLLM)`：

```typescript
const apiKey = useLLM ? process.env.DEEPSEEK_API_KEY : undefined;
```

`useLLM` 由 `!!config` 决定——如果前端传了 `llmConfig`，启用 LLM 模式；否则使用模板模式（零 API 调用）。

---

### 4.1 因子提取 → 1 次 LLM 调用

```typescript
const factorVector = apiKey
  ? await extractFactors(config.news, config.marketData, apiKey)
  : templateFactorExtraction(config.news, config.marketData);
```

**实现**（`src/lib/agents/v9/factorExtraction.ts`）：

#### 缓存检查（仅 LLM 模式）

```typescript
const key = `${news.slice(0, 100)}|VIX=${vix}|RSI=${rsi}|DRP=${dropMagnitude}`;
if (factorCache.has(key)) return factorCache.get(key);
```

缓存 key 由新闻前 100 字符 + 市场参数组成，避免对同一事件的重复 API 调用。

#### LLM 模式：发送 prompt 给 DeepSeek

系统发送一段约 1500 字的 prompt，核心要求：

> **"你是金融市场因子提取器。你的唯一任务是从新闻中提取五个正交因子的客观评分。"**
>
> **禁止输出**: Bullish, Bearish, Up, Down, Sentiment, 涨, 跌, 看涨, 看跌
> **禁止预测市场方向。**

**五个正交因子定义：**

| 因子 | 范围 | 负值含义 | 正值含义 |
|------|------|---------|---------|
| **Liquidity**（流动性） | -100 ~ +100 | 资金收缩、融资困难、信用紧张 | 资金宽松、融资改善、信用扩张 |
| **Policy**（政策支持） | -100 ~ +100 | 政策收紧、监管打压 | 降息、救助、财政刺激、流动性注入 |
| **Fundamental**（基本面） | -100 ~ +100 | 企业盈利恶化、经济衰退 | 增长强劲、盈利改善 |
| **Narrative**（叙事动量） | -100 ~ +100 | 恐慌叙事、负面循环 | 乐观叙事、正向传播 |
| **Uncertainty**（不确定性） | 0 ~ 100 | —（单边，无负值） | 信息模糊、不可预测 |

LLM 返回结构化 JSON：

```json
{
  "liquidity":    { "value": -40, "confidence": 75, "evidence": "紧急降息暗示市场流动性紧张" },
  "policy":       { "value": +90, "confidence": 90, "evidence": "降息50bp大幅超出市场预期" },
  "fundamental":  { "value": -20, "confidence": 55, "evidence": "经济放缓压力仍然存在" },
  "narrative":    { "value": +60, "confidence": 70, "evidence": "政策转向叙事开始形成" },
  "uncertainty":  { "value": 65,  "confidence": 80, "evidence": "降息幅度超预期带来不确定性" }
}
```

**关键设计：LLM 只输出因子值，不输出涨跌方向。** 因子是"原始材料"——不同的 Agent 用不同的框架去解读同一组因子。这是避免 LLM 黑箱判断的核心策略。

#### 模板模式：关键词正则提取（零 API 调用）

`templateFactorExtraction()` 用关键词字典 + 市场参数推算因子值：

| 因子 | 提取方式 |
|------|---------|
| Liquidity | 匹配"流动性危机/信用收缩/融资困难"→负值；"流动性注入/宽松"→正值 |
| Policy | 匹配"降息/QE/救助/刺激/注入流动性/平准基金"→高正值；"加息/收紧"→负值 |
| Fundamental | 结合 RSI 和 dropMagnitude：RSI<30→超卖修复预期；dropMagnitude>15→结构性损伤 |
| Narrative | 匹配"恐慌/崩盘/熔断"→负值；"反弹/复苏/V型"→正值 |
| Uncertainty | 由 VIX 和 dropMagnitude 组合推算 |

**模板模式的 v9.2 升级（关键词增强）：**
- 丰富中文政策关键词（注入流动性/平准基金/兜底/协调救助）
- 恢复/解决信号检测（反弹/V型复苏/收复跌幅）
- 系统性威胁独立分级（大萧条/多米诺/连锁倒闭）
- **反偏空护栏**：强政策托底时 fundamental 强制非负，RSI 极端超卖强制非负
- **自动全负因子修复**：危机+政策博弈时自动翻正 narrative

#### 因子异常检测

```typescript
if (factorVector.metadata.detectedAnomalies.length > 0) {
  for (const anomaly of factorVector.metadata.detectedAnomalies) {
    console.log(`[V9] ⚠️ ${anomaly}`);
  }
}
```

检测项：全正因子（异常乐观）、全负因子（异常悲观）、单一因子极端值。

---

### 4.2 Agent 因子解读 → 纯数学

```typescript
const { states, beliefStd } = computeAllAgentStates(factorVector, agents, {
  disableBlindness: config.ablation?.disableBlindness,
  previousStates,
  hysteresisFactor: 0.2,
});
```

**实现**（`src/lib/agents/v9/agentInterpretation.ts:198`）：

对 9 个 Agent 逐个计算。每个 Agent 经过 **4 个步骤**：

#### Step 1 — 因子过滤（强制信息盲区）

```typescript
// agentInterpretation.ts:28 → filterVisibleFactors()
// 只保留 Agent 权限内的因子 + uncertainty（元因子始终可见）

// 以 💎 Value 为例, 其权限定义:
// visibleFactors: ["fundamental"]  ← 只能看到 fundamental
// 5 个因子中过滤后只剩:
visible = [{ category: "fundamental", value: -20, confidence: 55 }]
// 另外 4 个因子 (liquidity/policy/narrative) Value 完全看不到
```

**9 个 Agent 的因子权限一览：**

| Agent | 可见的方向因子 | 盲区因子 |
|-------|---------------|---------|
| 🏦 Institution | liquidity, policy, fundamental | narrative |
| 💎 Value | fundamental | liquidity, policy, narrative |
| 🏄 Trend | narrative | liquidity, policy, fundamental |
| 😱 Panic | liquidity | policy, fundamental, narrative |
| 🤖 Quant | liquidity, fundamental | policy, narrative |
| 📡 Media | narrative, policy | liquidity, fundamental |
| 🦉 Contrarian | narrative（负权重 -1.2） | liquidity, policy, fundamental |
| 🐜 Retail | narrative | liquidity, policy, fundamental |
| 🏛️ PolicyAgent | policy, liquidity | fundamental, narrative |

**56% 的 Agent 对之间没有任何共享的方向因子。** 比如 Institution 和 Trend——一个看 liquidity+policy+fundamental，一个只看 narrative——他们对市场的"认知原料"完全不同。

#### Step 2 — 信念计算（加权求和）

```typescript
// agentInterpretation.ts:51 → computeAgentBelief()
// 核心公式:
rawBelief = Σ(factor.value × weight × confidence/100) / Σ(|weight| × confidence/100)
```

**以 💎 Value 为例（只有一个可见因子 fundamental=-20，权重 1.5，置信度 55）：**

```
rawBelief = (-20 × 1.5 × 0.55) / (1.5 × 0.55) = -20
```

**以 🏦 Institution 为例（三个可见因子）：**

```
liquidity:   -40 × 1.2 × 0.75 = -36
policy:      +90 × 1.5 × 0.90 = +121.5
fundamental: -20 × 1.0 × 0.55 = -11

weightedSum  = -36 + 121.5 + (-11) = +74.5
totalWeight  = 1.2×0.75 + 1.5×0.90 + 1.0×0.55 = 0.9 + 1.35 + 0.55 = 2.8
rawBelief    = +74.5 / 2.8 = +26.6
```

#### Step 3 — 解释风格的非线性变换

```typescript
// agentInterpretation.ts:130 → applyInterpretationStyle()
```

**7 种解释风格——即使是相同的 rawBelief，不同 Agent 会得出不同的最终信念：**

| 风格 | Agent | 变换函数 | 效果 |
|------|-------|---------|------|
| `macro` | Institution, PolicyAgent | `return raw` | 线性，最客观 |
| `value` | Value | `raw<0 → raw×1.2; raw>0 → raw×0.9` | 越跌越买，涨了反而保守 |
| `momentum` | Trend | `raw>0 → √(raw/100)×100` | 追涨杀跌，平方根压缩极值 |
| `sentiment` | Panic | `return raw × 1.3` | S型放大，极端信号剧烈跳变 |
| `statistical` | Quant | `return raw × 0.85` | 线性压缩极端值 |
| `narrative` | Media, Retail | `return raw × 1.1` | 轻度放大，线性跟随 |
| `contrarian` | Contrarian | `|raw|>50 → -raw×0.8; |raw|>30 → -raw×0.4` | 极端时反向，温和时弱正向 |

**以本次事件为例，同样看到 narrative=+60 的三个 Agent：**

```
🏄 Trend (momentum):  rawBelief=+60, 变换后 = √(60/100)×100 = +77.5
📡 Media (narrative): rawBelief=+55, 变换后 = +55×1.1 = +60.5
🦉 Contrarian (contrarian): rawBelief=-72(负权重), |−72|>50 → -(-72)×0.8 = +57.6
   但注意: Contrarian 的实际 rawBelief = +60×(-1.2) = -72 (负权重!)
```

#### Step 4 — 不确定性折扣

```typescript
// agentInterpretation.ts:109 → applyUncertaintyDiscount()
discount = (uncertainty / 100) × sensitivity × 30  // max ±30pp
confidence = baseConfidence - discount
```

**不同 Agent 对不确定性的反应截然不同：**

| Agent | sensitivity | 不确定性=65 时的效果 |
|-------|------------|---------------------|
| 😱 Panic | +1.2 | 信心骤降 **23.4 点**（不确定性 = 更恐慌） |
| 🐜 Retail | +0.8 | 信心降低 15.6 点（不确定性 = 观望） |
| 🏦 Institution | +0.6 | 信心降低 11.7 点 |
| 🏄 Trend | +0.5 | 信心降低 9.8 点 |
| 📡 Media | +0.4 | 信心降低 7.8 点 |
| 🤖 Quant | +0.1 | 信心降低 **仅 2.0 点**（模型不受情绪影响） |
| 💎 Value | **-0.2** | 信心**上升** 3.9 点（不确定性 = 错误定价机会） |
| 🦉 Contrarian | **-0.5** | 信心**上升** 9.8 点（不确定性 = 逆向机会） |

**Value 的逻辑：不确定性越高 → 错误定价越多 → 越有信心。这是巴菲特式的思维。**

**Panic 的逻辑：不确定性越高 → 越恐慌 → 越没有信心。**

#### 9 个 Agent 的最终信念（示例输出）

```
Agent           belief  置信度   可见因子                   解释
🏦 Institution   +15     55%     liquidity+policy+fundamental  "policy↑90 liq↓40"
💎 Value          -24     65%     fundamental                   "fundamental↓20"
🏄 Trend          +60     70%     narrative                     "narrative↑60"
😱 Panic         -100     72%     liquidity                     "liquidity↓40"
🤖 Quant          +30     60%     liquidity+fundamental         "liq↓40 fund↓20"
📡 Media          +55     65%     narrative+policy              "narrative↑60 policy↑90"
🦉 Contrarian     -72     75%     narrative                     "narrative↑60(逆向)"
🐜 Retail         +60     45%     narrative                     "narrative↑60"
🏛️ PolicyAgent    +50     60%     policy+liquidity              "policy↑90 liq↓40"

belief_std = 58.5  ← 异质性指标（前一轮为 undefined）
```

**同一个事件，同一个因子向量，9 个 Agent 得出了从 -100 到 +60 的信念跨度。** 差异来源：
- **信息差异**：看到的因子不同（Institution 看 3 个 vs Value 看 1 个）
- **权重差异**：对同一因子的重视程度不同（Panic 的 liquidity 权重 2.0 vs Quant 的 0.7）
- **解释差异**：非线性变换函数不同（sentiment 放大 vs statistical 压缩）
- **不确定性反应差异**：有人恐慌（Panic +1.2），有人贪婪（Value -0.2）

---

### 4.3 共识涌现 → 3 轮演化

```typescript
// simulation.ts:213
for (let r = 1; r <= config.rounds; r++) {
```

每轮执行 **6 个子步骤**：

#### ① 构建 Belief 条目

```typescript
const entries: BeliefEntry[] = agents.map(agent => ({
  agentId: agent.id,
  belief: states[agent.id]?.belief ?? 0,
  weight: agent.influenceWeight × ((states[agent.id]?.confidence ?? 50) / 100),
}));
```

每个 Agent 的有效权重 = 影响力权重 × 置信度%。Panic 虽然影响力只有 25，但置信度 72% → 有效权重 18；Institution 影响力 90，但置信度仅 55% → 有效权重 49.5。

#### ② Kuramoto 序参量（相位同步度）

```typescript
// simulation.ts:38 → beliefToPhase()
phase_i = (belief_i / 100) × (π/2)   // -100→-π/2, +100→+π/2

// simulation.ts:45 → computeOrderParameter()
r = |Σ e^(i·θ_j)| / N
```

**物理直觉：** 把 9 个 Agent 想象成时钟上的 9 根指针。箭头指向 12 点 = 极度看多，指向 6 点 = 极度看空，指向 3 点或 9 点 = 中性。

- 所有指针指向同一方向 → r ≈ 1（完全同步——强共识）
- 指针均匀散开 → r ≈ 0（完全失序——各说各话）

**当前状态：** 多头和空头几乎对半，指针分散 → r ≈ 0.35（低同步）。

**EMA 平滑（减小抖动）：**

```typescript
rSmooth = 0.7 × rSmooth_prev + 0.3 × rRaw
```

#### ③ 动态 K 选择

```typescript
if (rSmooth > 0.7)       clusterK = 2;  // 高同步 → 二分
else if (rSmooth < 0.3)  clusterK = 3;  // 低同步 → 三分
else                      clusterK = 2;  // 默认二分
```

#### ④ 计算两种共识

**A. KMeans 聚类共识**（`simulation.ts:65`）：

1. 9 个 Agent 按信念值排序：Panic(-100) < Contrarian(-72) < Value(-24) < Institution(+15) < Quant(+30) < PolicyAgent(+50) < Media(+55) < Trend(+60) < Retail(+60)
2. 切成 K=3 个簇（因为 rSmooth=0.35 < 0.3 → K=3）
   - 簇1: Panic(-100), Contrarian(-72), Value(-24) → 空头簇
   - 簇2: Institution(+15), Quant(+30) → 中性簇
   - 簇3: PolicyAgent(+50), Media(+55), Trend(+60), Retail(+60) → 多头簇
3. 按影响力加权，簇3（多头）权重最大 → 簇共识 ≈ +56

**B. 线性加权共识**（`simulation.ts:111`）：

```
共识 = Σ(belief × influenceWeight × confidence/100) / Σ(influenceWeight × confidence/100)

分子 = (+15×90×0.55) + (-24×60×0.65) + (+60×45×0.70) + (-100×25×0.72)
     + (+30×55×0.60) + (+55×70×0.65) + (-72×40×0.75) + (+60×10×0.45)
     + (+50×50×0.60)

分母 = (90×0.55) + (60×0.65) + (45×0.70) + (25×0.72) + (55×0.60)
     + (70×0.65) + (40×0.75) + (10×0.45) + (50×0.60)

≈ -8
```

#### ⑤ 非对称门控（选择信任哪个共识）

```typescript
// simulation.ts:140 → applyAsymmetricGate()
const ASYMMETRIC_GATE_THRESHOLD = -15;

if (clusterConsensus < -15) {
  // 聚类显示强空头 → 信任聚类（空头共识更"团结"、更有信息量）
  consensus = clusterConsensus;
  method = "cluster";
} else {
  // 聚类不极端 → 回退到线性（更保守，避免聚类误判）
  consensus = linearConsensus;
  method = "linear";
}
```

**当前：** clusterConsensus = +56 > -15 → **不触发门控，采信线性共识 = -8。**

门控的设计哲学：聚类只有在"强空头"时才有额外信号价值。多头/模糊时线性更可靠。这是基于 60 事件回测的经验参数。

#### ⑥ Neutral Detection Engine（四规则）

```typescript
// uncertaintyEngine.ts:111 → evaluateNeutral()
```

**v9.3 的核心创新：不是简单用"共识绝对值 < 阈值"判断 Neutral——而是用四条独立规则 + OR 逻辑 + 一条复合条件。**

| 规则 | 条件 | 逻辑 |
|------|------|------|
| **Rule 1** | `\|linearConsensus\| < 15` **且** `\|clusterConsensus\| < 15` | 两种共识方法都显示弱信号 → 真正的方向模糊 |
| **Rule 2** | `belief_std > 45` | Agent 信念高度分散 → Neutral 候选 |
| **Rule 3** | `kuramoto_r < 0.4` | 相位失同步 → Neutral 候选 |
| **Rule 4** | `uncertaintyFactor > 70` **且** `\|consensus\| < 25` | 因子层不确定性高 + 共识层弱 → 迷雾中看不清 |
| **Compound** | **Rule2 AND Rule3** | 高分歧 + 低同步 → 各说各话 |

**判定逻辑：**

```
isNeutral = Rule1 OR Rule4 OR (Rule2 AND Rule3)
```

**当前状态：**
- Rule1: |−8| < 15 ✓ 但 |+56| > 15 ✗ → 不触发
- Rule2: 58.5 > 45 ✓ → 触发
- Rule3: 0.35 < 0.4 ✓ → 触发
- Rule4: 65 < 70 ✗ → 不触发
- **Compound: Rule2 AND Rule3 → 触发！→ Neutral**

但方向判定时：consensus = -8，不满足 ≥ +15 → DOWN，不满足 ≤ -15 → 不触发方向阈值。

实际上在这个配置下：
- Neutral 检测到"分歧+失同步"，建议 NEUTRAL
- 方向判定：\|consensus\| = 8 < 15 → 也落在 NEUTRAL 区
- → 最终输出 **NEUTRAL**

---

**第 2、3 轮的磁滞效应（弱证据守卫）：**

```typescript
// agentInterpretation.ts:218
const wouldFlip = Math.sign(belief) !== Math.sign(prev.belief);
if (wouldFlip && Math.abs(belief - prev.belief) < 30) {
  // 信念要翻转，但翻转幅度不够大 → 弱证据，保守处理
  finalBelief = prev.belief × 0.2 + belief × 0.8;  // 保留 20% 旧信念
}
```

防止 Agent 在相邻轮之间剧烈摇摆——模拟真实投资者的"观点惯性"。第 2、3 轮如果有新的市场数据输入或共识方向改变，Agent 不会立即跳转，而是平滑过渡。

**每轮的日志输出示例：**

```
[V9] R1 Kuramoto r=0.35 rSmooth=0.35 → K=3 | KMeans=+56.0 Linear=-8.0
[V9] 🔀 Gate=linear | KMeans=+56.0 >= -15 → 多头/模糊, Fallback线性
[V9] R1 共识=-8.0 方向=NEUTRAL std=58.5 置信=45 Gate=linear 簇=44%
     | Neutral=⚠️ R1=· R2=✓ R3=✓ R4=·
```

---

### 4.4 群体行为诊断 → 纯数学, 毫秒级

```typescript
// simulation.ts:308 → diagnostics.ts:412 → generateDiagnostics()
```

**三层分析，全部纯数学计算，零 LLM 调用。**

#### 第一层：归因分解

```typescript
// diagnostics.ts:35 → computeAttribution()
contribution_i = belief_i × influenceWeight_i × (confidence_i / 100)
contributionPct_i = |contribution_i| / Σ|contribution_j|
```

**输出示例：**

```
Agent          贡献值    贡献%   方向
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😱 Panic       -1800     28%    BEARISH  ← 最大空头驱动力
🦉 Contrarian  -1620     25%    BEARISH
📡 Media        +1750     27%    BULLISH  ← 最大多头驱动力
🏛️ PolicyAgent  +1250     19%    BULLISH
🤖 Quant         +600      9%    BULLISH
🐜 Retail        +270      4%    BULLISH
🏄 Trend         +550      8%    BULLISH
💎 Value         -468      7%    BEARISH
🏦 Institution   +668     10%    BULLISH
```

#### 第二层：联盟检测

```typescript
// diagnostics.ts:88 → detectCoalitions()

多头联盟: Media + PolicyAgent + Trend + Retail + Quant + Institution
         影响力=320, 资本=310, 加权信念=+42
空头联盟: Panic + Contrarian + Value
         影响力=125, 资本=180, 加权信念=-81
中立阵营: 无
力量对比: 320/125 = 2.56:1 → 多头占优
对抗强度: |42 - (-81)| = 123 → clamp to 100
摇摆Agent: Institution(belief=+15), Value(belief=-24)
```

#### 第三层：反事实分析

```typescript
// diagnostics.ts:214 → runCounterfactuals()
```

逐个"移除"Agent 重新计算共识，检测边际影响：

```
场景                        共识       Δ共识   影响
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
基线                        -8.0       —
移除 😱 Panic               +12.5      +20.5   🔴 CRITICAL (方向翻转!)
移除 🦉 Contrarian           +2.3      +10.3   🟡 SIGNIFICANT
移除 💎 Value                -2.1       +5.9   🟢 MODERATE
移除 🏦 Institution         -15.0       -7.0   🟡 SIGNIFICANT
关闭信息盲区                 +5.0      +13.0   🟡 SIGNIFICANT

系统韧性: 仅需移除 1 个 Agent (Panic) 即可翻转共识方向
最依赖的 Agent: Panic
盲区效应: 关闭盲区后共识偏移 13 点，方向不变但强度显著改变
```

**诊断摘要（自然语言生成）：**

> 😱 Panic 是 NEUTRAL 共识的最大驱动力（贡献 28%），信念=-100。
> 尽管 BULLISH 联盟影响力更大（2.56:1），但共识方向相反——少数派信念更强。
> ⚠️ 多空对抗激烈（强度=100）——共识可能在压力下快速瓦解。
> 🔴 系统韧性低：仅需移除 1 个 Agent 即可翻转共识方向。
> 🔴 关键依赖："移除Panic"会翻转共识方向（Δ=+20.5）。
> 🟡 信息盲区有显著效应：关闭盲区后共识偏移 13.0（方向不变）。

---

## 第五层：v9.5 — Agent 社交互动

```typescript
// route.ts:309
const interaction = enableInteraction
  ? runInteraction(v9Agents, agentStatesMap)
  : runInteraction(v9Agents, agentStatesMap, { disabled: true });
```

**实现**（`src/lib/agents/v9.5/interaction.ts`）：

### 5.1 构建社交可见性矩阵

```typescript
// interaction.ts:62 → buildSocialProfiles()
```

**规则：Agent A 能看到 Agent B ⇔ 他们共享至少一个方向因子。**

基于 v9 的因子权限自动计算：

```
🏦 Institution (liquidity+policy+fundamental):
  → 可见: Value(fundamental), Panic(liquidity), Quant(liquidity+fundamental),
          Media(policy), PolicyAgent(policy+liquidity)
  → 不可见: Trend(narrative), Contrarian(narrative), Retail(narrative)
  → 5 人可见

🏄 Trend (narrative):
  → 可见: Media(narrative+policy), Contrarian(narrative), Retail(narrative)
  → 不可见: Institution, Value, Panic, Quant, PolicyAgent
  → 3 人可见

💎 Value (fundamental):
  → 可见: Institution(fundamental), Quant(fundamental)
  → 不可见: 其余 6 人
  → 2 人可见
```

**Institution 和 Trend 活在两个完全不同的"社交世界"——他们看到的"别人的观点"完全不同。这是信息茧房的第二层：不仅看到的信息不同，看到的"别人怎么想"也不同。**

### 5.2 社交开放度 α

```typescript
// types.ts → SOCIAL_ALPHAS
```

| Agent | α | 含义 |
|-------|---|------|
| 😱 Panic | +0.70 | 极易被他人影响——"所有人都在卖，我也得卖" |
| 🐜 Retail | +0.60 | 高度从众——"别人怎么做我就怎么做" |
| 🏄 Trend | +0.50 | 关注他人行为——趋势的本质是"别人也在做" |
| 📡 Media | +0.45 | 放大和跟随——媒体天然传播多数观点 |
| 🏛️ PolicyAgent | +0.20 | 相对独立——政策有自己的逻辑 |
| 🏦 Institution | +0.15 | 有独立研究——不容易被带偏 |
| 🤖 Quant | +0.10 | 依赖模型——几乎不受情绪影响 |
| 💎 Value | +0.05 | 最独立——"别人恐惧时我贪婪" |
| 🦉 Contrarian | **-0.30** | **逆向**——看到别人看空，反而看多 |

### 5.3 多轮信念更新

**每轮执行的数学：**

```typescript
// interaction.ts:94 → updateBeliefs()
for each agent_i:
  // 1. 计算可见同伴的加权平均信念
  peer_avg = Σ_{j ∈ visible_i} (b_j × w_j × conf_j) / Σ_{j ∈ visible_i} (w_j × conf_j)

  // 2. 核心公式 — 社交信念更新
  b_i_new = (1 - α_i) × b_i_old + α_i × peer_avg

  // 3. 钳制到 [-100, +100]
  b_i_new = clamp(b_i_new, -100, +100)
```

**以 😱 Panic 为例（α=0.70，可见 Institution+15 和 Quant+30）：**

```
Round 1:
  peer_avg = (+15×90×0.55 + 30×55×0.60) / (90×0.55 + 55×0.60)
           = (742.5 + 990) / (49.5 + 33.0)
           = 1732.5 / 82.5
           ≈ +21.0
  b_new = (1 - 0.70) × (-100) + 0.70 × (+21.0)
        = -30.0 + 14.7
        = -15.3
  → Panic 从 -100 跳到 -15.3！（看到有人在买，恐慌大幅缓解）

Round 2:
  peer_avg ≈ +25 (Institution 和 Quant 的信念也有微调)
  b_new = 0.30 × (-15.3) + 0.70 × (+25) = -4.6 + 17.5 = +12.9
  → Panic 变成轻微看多！

Round 3:
  peer_avg ≈ +28
  b_new = 0.30 × (+12.9) + 0.70 × (+28) = 3.9 + 19.6 = +23.5
  → 收敛
```

**以 🦉 Contrarian 为例（α=-0.30，可见 Trend+60、Media+55、Retail+60——全多头）：**

```
Round 1:
  peer_avg ≈ +58 (全是多头!)
  b_new = (1 - (-0.30)) × (-72) + (-0.30) × (+58)
        = 1.30 × (-72) + (-17.4)
        = -93.6 - 17.4
        = -111 → clamp to -100
  → 看到别人乐观，逆向者反而更悲观！这是"别人贪婪时我恐惧"的数学模型。

Round 2:
  peer_avg 随互动变化
  Contrarian 继续反向调整（如果同伴继续多头 → Contrarian 继续加深空头）
```

### 5.4 收敛判定

**三种终止条件（满足任一即停止）：**

```typescript
// interaction.ts:125 → checkConvergence()
```

| 条件 | 判定 | 含义 |
|------|------|------|
| **收敛** | 所有 Agent 的 `\|Δbelief\| < 2` | 信念已稳定，共识形成 |
| **发散** | `belief_std` 连续 3 轮上升 | 互动反而加剧了分歧——回音室效应 |
| **超时** | 达到 10 轮上限 | 互动仍在进行中，但强制终止 |

**本轮示例输出：**

```
[V9.5] 🧬 Agent 互动: 3 轮, converged

互动过程:
  R0 (初始): mean=-5.0  std=58.5
  R1:        mean=-3.2  std=52.1  ↓ (分歧收窄)
  R2:        mean=+2.1  std=48.3  ↓
  R3:        mean=+4.5  std=47.1  ↓  ✓ 收敛

结果: ✅ 收敛
共识形成: ✅ 是  |  分歧加大: ✅ 否

最大信念变化:
  panic: +84.7 (从 -100 到 -15.3 — 看到机构在买，恐慌大幅缓解)
  contrarian: -28.0 (逆向加深)
  retail: +12.3 (跟随大势)
```

---

## 第六层：v9.5 — 共识度量计算

```typescript
// route.ts:342
const metrics = computeAllMetrics(
  v9Agents,
  finalStatesAfterInteraction,
  v9Result.finalDecision.consensus,
  v9Result.finalDecision.beliefStd,
  undefined,
  v9Result.diagnostics
);
```

**实现**（`src/lib/agents/v9.5/metrics.ts`）：

### Consensus Score（共识强度）

```
sync_component      = kuramoto_r × 100
direction_component = min(|consensus|, 50) × 2
agreement_component = max(0, 100 - belief_std)

Consensus Score = 0.4 × sync + 0.3 × direction + 0.3 × agreement
```

**含义分解：**
- **40% 同步度**：Agent 的"相位"有多对齐？从物理学借来的度量。
- **30% 方向强度**：共识值有多远离 0？绝对值越大说明方向信号越清晰。
- **30% 一致性**：Agent 之间的信念差异有多小？

### Polarization Score（极化程度）

```
bullishStrength = mean(多头Agent的信念)     // 只看 belief > +15
bearishStrength = mean(|空头Agent的信念|)   // 只看 belief < -15
neutralRatio    = count(|belief| ≤ 15) / N

extremityProduct = (bullishStrength × bearishStrength) / 2500
bimodality       = (1 - neutralRatio) × (belief_std / 100)

Polarization Score = (0.5 × extremityProduct + 0.5 × bimodality) × 100
```

**与 belief_std 的区别：**
- `belief_std = 58.5` → "分歧大"
- `Polarization = 73` → "不仅分歧大，而且形成两个对立的集团"

Polarization 强调**双峰分布**——多头和空头都足够强，且中间地带很少。这意味着市场处于"选方向"的临界状态。

### Fragility Score（共识脆弱性）

```
concentrationRisk = max(0, (maxContributionPct - 25) / 75)
flipRisk          = 1 - agentsToFlip / agentCount
blindnessRisk     = min(|blindnessDelta| / 30, 1)

Fragility Score = (0.4 × concentration + 0.3 × flip + 0.3 × blindness) × 100
```

**三个因素：**
- **40% 集中度风险**：单一 Agent 的贡献是否超过 40%？→ 系统过度依赖一个人
- **30% 翻转风险**：需要移除几个 Agent 才能翻转方向？→ 越少越脆弱
- **30% 盲区风险**：关闭信息盲区后共识偏移多大？→ 偏移越大越依赖盲区

### 状态分类矩阵

```typescript
// metrics.ts:classifyState()
```

| Consensus | Polarization | Fragility | 标签 | 解读 |
|-----------|-------------|-----------|------|------|
| >60 | <30 | <30 | 🟢 稳健共识 | 所有人基于相似信息得出相似结论 |
| >60 | <30 | >60 | 🟡 脆弱共识 | 表面一致但依赖关键Agent |
| <30 | >60 | >60 | 🔴 两极对抗 | 两个阵营激烈博弈，共识随时翻转 |
| <30 | <30 | <30 | 🔵 认知迷雾 | 各说各话，也没形成阵营 |
| <30 | >60 | <50 | 🟠 健康分歧 | 有对立但系统稳健 |

### 互动前后对比

```typescript
// metrics.ts:computeInteractionEffect()
```

对比互动前后的 `belief_std` 和 `meanBelief` 变化：

| std 变化 | 效应 | 含义 |
|----------|------|------|
| < -5 | **convergence** | 互动促进了共识——社交影响减少了观点多样性 |
| > +5 | **polarization** | 互动加剧了分歧——回音室效应 |
| -5 ~ +5 | **minimal** | 互动影响不大——初始信念较为稳定 |

---

## 第七层：返回响应

API 将所有计算结果组装成 JSON 返回：

```json
{
  "success": true,
  "version": "v9.5",
  "data": {
    "news": "美联储紧急降息50个基点...",

    "factorVector": {
      "factors": [
        { "category": "liquidity",   "value": -40, "confidence": 75, "evidence": "..." },
        { "category": "policy",      "value": +90, "confidence": 90, "evidence": "..." },
        { "category": "fundamental", "value": -20, "confidence": 55, "evidence": "..." },
        { "category": "narrative",   "value": +60, "confidence": 70, "evidence": "..." },
        { "category": "uncertainty", "value": 65,  "confidence": 80, "evidence": "..." }
      ],
      "metadata": {
        "newsSummary": "...",
        "detectedAnomalies": [],
        "timestamp": "2026-06-25T..."
      }
    },

    "rounds": [
      {
        "round": 1,
        "consensus": -8.0,
        "direction": "NEUTRAL",
        "confidence": 45,
        "beliefStd": 58.5,
        "neutralTrace": {
          "rule1_fired": false,
          "rule2_fired": true,
          "rule3_fired": true,
          "rule4_fired": false,
          "finalNeutral": true,
          "gatingReason": "R2∧R3:分歧+失同步"
        },
        "agents": {
          "institution": { "belief": 15,  "confidence": 55, "visibleFactors": ["liquidity","policy","fundamental"] },
          "value":       { "belief": -24, "confidence": 65, "visibleFactors": ["fundamental"] },
          "trend":       { "belief": 60,  "confidence": 70, "visibleFactors": ["narrative"] },
          "panic":       { "belief": -100,"confidence": 72, "visibleFactors": ["liquidity"] },
          "quant":       { "belief": 30,  "confidence": 60, "visibleFactors": ["liquidity","fundamental"] },
          "media":       { "belief": 55,  "confidence": 65, "visibleFactors": ["narrative","policy"] },
          "contrarian":  { "belief": -72, "confidence": 75, "visibleFactors": ["narrative"] },
          "retail":      { "belief": 60,  "confidence": 45, "visibleFactors": ["narrative"] },
          "policy":      { "belief": 50,  "confidence": 60, "visibleFactors": ["policy","liquidity"] }
        }
      }
    ],

    "final": {
      "consensus": -8.0,
      "direction": "NEUTRAL",
      "confidence": 45,
      "beliefStd": 58.5,
      "neutralTrace": { "finalNeutral": true, "gatingReason": "R2∧R3:分歧+失同步" }
    },

    "diagnostics": {
      "attribution": [
        { "agentName": "Panic",       "contributionPct": 28, "direction": "BEARISH" },
        { "agentName": "Contrarian",  "contributionPct": 25, "direction": "BEARISH" },
        { "agentName": "Media",       "contributionPct": 27, "direction": "BULLISH" },
        ...
      ],
      "coalition": {
        "bullishCoalition": { "agentIds": [...], "totalInfluence": 320 },
        "bearishCoalition": { "agentIds": [...], "totalInfluence": 125 },
        "powerRatio": 2.56,
        "dominantCoalition": "BULLISH",
        "tension": 100,
        "swingAgents": ["institution", "value"]
      },
      "counterfactuals": {
        "baselineConsensus": -8.0,
        "mostInfluentialAgent": "panic",
        "agentsToFlip": 1,
        "variants": [
          { "label": "移除Panic", "deltaConsensus": 20.5, "directionFlipped": true, "impact": "CRITICAL" },
          { "label": "关闭信息盲区", "deltaConsensus": 13.0, "directionFlipped": false, "impact": "SIGNIFICANT" },
          ...
        ]
      },
      "summary": {
        "coreFinding": "😱 Panic 是 NEUTRAL 共识的最大驱动力...",
        "consensusMechanism": "分歧僵局: Agent信念标准差=58.5...",
        "riskFactors": ["⚠️ 多空对抗激烈", "🔴 系统韧性低: 仅需移除 1 个Agent即可翻转...", "🔴 关键依赖: 移除Panic会翻转共识"],
        "blindnessEffect": "🟡 信息盲区有显著效应: 关闭盲区后共识偏移 13.0"
      }
    },

    "v9_5": {
      "interaction": {
        "totalRounds": 3,
        "convergenceType": "converged",
        "rounds": [
          {
            "round": 0, "beliefs": { "panic": -100, "contrarian": -72, ... },
            "meanBelief": -5.0, "beliefStd": 58.5, "converged": false
          },
          {
            "round": 1, "beliefs": { "panic": -15.3, "contrarian": -100, ... },
            "beliefChanges": { "panic": 84.7, "contrarian": -28.0, ... },
            "meanBelief": -3.2, "beliefStd": 52.1, "converged": false
          },
          ...
        ],
        "socialProfiles": [
          { "agentId": "institution", "alpha": 0.15, "visibleAgentIds": ["value","panic","quant","media","policy"] },
          { "agentId": "trend",       "alpha": 0.50, "visibleAgentIds": ["media","contrarian","retail"] },
          ...
        ]
      },
      "metrics": {
        "consensusScore": 42,
        "polarizationScore": 73,
        "fragilityScore": 47,
        "stateLabel": "🟡 模糊共识",
        "stateInterpretation": "Agent群体存在一定的方向倾向，但共识强度不足..."
      },
      "comparison": {
        "consensusShift": 5.2,
        "stdChange": -11.4,
        "effect": "convergence",
        "description": "互动促使Agent信念收敛 (std 59 → 47)。社交影响正在减少观点多样性。"
      }
    },

    "v9_5Agents": [
      { "id": "institution", "name": "Institution", "emoji": "🏦", "role": "机构投资者" },
      { "id": "value",       "name": "Value",       "emoji": "💎", "role": "价值投资者" },
      ...
    ]
  },

  "rateLimit": {
    "remaining": 9,
    "resetTime": "2026-06-25T13:30:00.000Z"
  }
}
```

---

## 第八层：前端渲染

`src/app/page.tsx:120` 收到响应后，按以下顺序渲染：

### 组件渲染层级

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  1. ConsensusDashboard  ← 最上方，v9.5 核心展示          │
│     ┌────────────────────────────────────────────┐       │
│     │  三个环形仪表盘 (SVG 动画)                   │       │
│     │  Consensus 42  Polarization 73  Fragility 47│       │
│     │                                            │       │
│     │  状态解读卡片                                │       │
│     │  🟡 模糊共识 — Agent群体存在方向倾向...      │       │
│     │                                            │       │
│     │  互动演化柱状图 (belief_std 变化过程)        │       │
│     │  R0 ▆▆▆▆ R1 ▆▆▆ R2 ▆▆ R3 ▆ ✓ 收敛        │       │
│     │                                            │       │
│     │  Agent 信念对比条 (互动前 → 互动后)          │       │
│     │  😱 Panic  ████████░░ -100 →  ██░░░░░░ -15 │       │
│     │  🦉 Contr  ██████░░ -72  →  ████████ -100  │       │
│     │                                            │       │
│     │  社交可见性面板 (因子重叠关系)               │       │
│     │  [🏦 α=0.15 可见5人] [😱 α=0.70 可见3人]... │       │
│     └────────────────────────────────────────────┘       │
│                                                          │
│  2. AgentPanel + ConsensusBadge                          │
│     ┌──────────────┐  ┌─────────────────┐               │
│     │ 9 张 Agent 卡 │  │ 共识结果 Badge   │               │
│     │ 信念/置信度   │  │ NEUTRAL / 45%   │               │
│     └──────────────┘  └─────────────────┘               │
│                                                          │
│  3. EmotionChart (Chart.js 折线图)                       │
│     每个 Agent 在 3 轮中的信念变化曲线                     │
│                                                          │
│  4. RadarChart (Chart.js 雷达图)                         │
│     可选轮次的 Agent 多维对比                              │
│                                                          │
│  5. GameLog (滚动日志)                                    │
│     每轮每个 Agent 的因子解释文本                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 数据转换（v9.5 → 兼容旧组件）

```typescript
// page.tsx:123 — 将 v9.5 响应转换为旧版 SwarmResult 格式
const compatResult: SwarmResult = {
  news: v9Data.news,
  rounds: v9Data.rounds.map(r => ({
    round: r.round,
    agents: Object.fromEntries(
      Object.entries(r.agents).map(([id, state]) => [id, {
        emotion: state.belief,         // belief → emotion (旧字段名)
        reasoning: state.interpretation,
        conviction: state.confidence,
        id,
      }])
    ),
    consensus: r.consensus,
    variance: 0,
  })),
  final: {
    consensus: v9Data.final.consensus,
    direction: v9Data.final.direction === "UP" ? "slightly_bullish"
      : v9Data.final.direction === "DOWN" ? "slightly_bearish"
      : "neutral",
    converged: true,
    total_rounds: v9Data.rounds.length,
  },
};
```

**旧组件（AgentPanel、EmotionChart、RadarChart、GameLog、ConsensusBadge）不需要任何修改——它们通过兼容层获得与原来相同格式的数据。**

---

## 附录：完整流程图

```
浏览器输入新闻
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                  POST /api/swarm                         │
│         { version:"v9", news, rounds:3, llmConfig }      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ ① 频率限制 ──→ 输入校验 ──→ 版本路由 (v9)           │
│  │                                                       │
│  ┌─ ② 获取市场背景数据                                   │
│  │   Yahoo Finance API (VIX/RSI/跌幅)                    │
│  │   ↓ 失败则降级为关键词推断                             │
│  │                                                       │
│  ┌─ ③ LLM 提取 5 个正交因子  ──── [1次API, ~¥0.005]    │
│  │   Liquidity / Policy / Fundamental /                  │
│  │   Narrative / Uncertainty                             │
│  │   缓存命中则跳过 API 调用                              │
│  │   无 API Key 则走模板模式 (零成本)                     │
│  │                                                       │
│  ┌─ ④ 9 Agent × 4步解读  ──── [0次API, 纯数学]         │
│  │   Step 1: 因子过滤 (强制信息盲区)                      │
│  │   Step 2: 加权求和 → rawBelief                        │
│  │   Step 3: 解释风格非线性变换 (7种函数)                 │
│  │   Step 4: 不确定性折扣 (每个Agent反应不同)             │
│  │   → 9个信念值, belief_std                             │
│  │                                                       │
│  ┌─ ⑤ 共识涌现 (3轮)  ──── [0次API, 纯数学]            │
│  │   每轮:                                               │
│  │     Kuramoto 序参量 → 动态 K →                        │
│  │     并行计算 KMeans聚类共识 + 线性加权共识             │
│  │     → 非对称门控 (KMeans<-15? 聚类:线性)              │
│  │     → Neutral Detection (4规则 OR + Compound)         │
│  │     → 磁滞效应 (第2-3轮弱证据守卫)                    │
│  │                                                       │
│  ┌─ ⑥ 群体行为诊断  ──── [0次API, 纯数学]              │
│  │   Layer 1: 归因分解 (每个Agent的边际贡献)              │
│  │   Layer 2: 联盟检测 (多头vs空头力量对比)              │
│  │   Layer 3: 反事实分析 (如果移除X/关闭盲区会怎样)      │
│  │   → 诊断摘要 (自然语言)                               │
│  │                                                       │
│  ┌─ ⑦ Agent 社交互动  ──── [0次API, 纯数学, 新增]     │
│  │   因子重叠 → 可见性矩阵 → 多轮信念更新                │
│  │   b_new = (1-α)×b_old + α×peer_avg                    │
│  │   → 收敛/发散/超时                                    │
│  │                                                       │
│  ┌─ ⑧ 共识度量计算  ──── [0次API, 纯数学, 新增]       │
│  │   Consensus Score / Polarization Score /              │
│  │   Fragility Score                                     │
│  │   → 状态分类 → 互动效果分析                           │
│  │                                                       │
│  └─ ⑨ 组装 JSON ──→ 返回前端                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                     前端渲染                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ConsensusDashboard (v9.5新增)                           │
│    ├ 3个环形仪表盘 (SVG + CSS动画)                       │
│    ├ 状态解读卡片                                        │
│    ├ 互动演化柱状图                                      │
│    ├ Agent信念对比条 (互动前 → 互动后)                   │
│    └ 社交可见性面板                                      │
│                                                          │
│  数据兼容转换 (v9.5 → 旧组件)                             │
│    ↓                                                     │
│  AgentPanel → EmotionChart → RadarChart → GameLog        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 附录：关键数字

| 项目 | 数值 |
|------|------|
| **LLM API 调用次数** | **1 次**（因子提取） |
| **Agent 计算** | 纯数学，毫秒级 |
| **共识演化** | 纯数学，毫秒级 |
| **群体诊断** | 纯数学，毫秒级 |
| **Agent 互动** | 纯数学，毫秒级 |
| **共识度量** | 纯数学，毫秒级 |
| **总响应时间** | ~1-3 秒（取决于 LLM API 延迟） |
| **LLM 模式单次成本** | ~¥0.005（DeepSeek） |
| **模板模式单次成本** | ¥0（零 API 调用） |
| **Agent 数量** | 9（8 交易 Agent + 1 政策 Agent） |
| **正交因子数量** | 5（liquidity/policy/fundamental/narrative/uncertainty） |
| **Neutral 检测规则** | 4 + 1 复合条件 |
| **解释风格种类** | 7 |
| **新增共识指标** | 3（Consensus/Polarization/Fragility） |
| **诊断分析层数** | 3（归因/联盟/反事实） |
| **总代码行数** | ~15,000 行 TypeScript |

---

## 核心设计原则

1. **LLM 只做信息提取，不做判断** — LLM 将非结构化文本转为 5 个因子值，不输出涨跌方向
2. **Agent 的异质性来自信息盲区，不是 personality prompt** — 经实验验证，信息差异产生的信念分歧（175pts）远大于 personality prompt（60pts）
3. **所有共识计算都是确定性的纯数学** — 可复现、可审计、零额外成本
4. **v9.5 是纯增量，不修改 v9.3 核心引擎** — 新模块可独立开关，回退零风险
5. **展示驱动设计** — 每个计算结果都在 UI 上有可视化对应

---

*"The market is a consensus-forming machine. We just built a microscope to watch it work."*
