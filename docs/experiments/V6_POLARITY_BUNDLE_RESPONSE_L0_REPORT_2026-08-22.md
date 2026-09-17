# V6 Polarity-Bundle Response L0 执行报告

日期：2026-08-22

状态：**COMPLETE；POST-HOC；ZERO-PROVIDER；READ-ONLY**

分析合同：`V6_POLARITY_BUNDLE_RESPONSE_ANALYSIS_FREEZE_V1.md`
合同 SHA-256：`5ADD4E3131290FF30F7D2D83B1E56E3416360365849F2E80E4C739E3BE8BB102`

## 1. 结论先行

**FACT：冻结的 L1 优先级闸门结果为 `GO_L1`。**

在 Round-1 pooled top choice 错误的离线分层中，已实现 ATTACKS bundle
相对于 SUPPORTS bundle 的 Brier 优势在两个模型批次中均为正：

| 批次 | 任务数/块数 | `GAP_AS` | 任务 bootstrap 95% CI | LOTO 变号 |
|---|---:|---:|---:|---|
| DeepSeek pooled，任务等权 | 32/59 | +0.5799 | [+0.3805, +0.7754] | 否 |
| GLM-4.6V seed 2 | 29/29 | +0.4072 | [+0.1627, +0.6537] | 否 |

DeepSeek 的 32 个 wrong-state 任务中 `GAP_AS` 为正/负/零的任务数是
25/4/3，中位数 `+0.4259`；GLM 的 29 个任务为 20/5/4，中位数
`+0.3150`。因此正均值不是由单个任务独占，但任务间异质性仍然存在。

其中：

```text
V_ATTACKS  = Brier_CONTROL - Brier_ATTACKS
V_SUPPORTS = Brier_CONTROL - Brier_SUPPORTS
GAP_AS     = V_ATTACKS - V_SUPPORTS
           = Brier_SUPPORTS - Brier_ATTACKS
```

**INFERENCE：**现有 bundle-level 信号足够稳定，值得在 AAMAS 投稿后优先做
noise-calibrated 单 item LOO 小样；不值得现在直接扩成全 item LOO。

**不是本结果：**它不证明单条 ATTACKS message 具有固有 trajectory value，
不识别 salience 与 reasoning reorganization，也不产生真值盲 detector。

## 2. 冻结主结果

### 2.1 Wrong-state 分层

| View | `V_ATTACKS` [95% CI] | `V_SUPPORTS` [95% CI] | `GAP_AS` [95% CI] |
|---|---:|---:|---:|
| DeepSeek seed 0 | +0.4410 [+0.2141, +0.6913] | -0.0298 [-0.2464, +0.2059] | +0.4708 [+0.2633, +0.6855] |
| DeepSeek seed 1 | +0.5521 [+0.3055, +0.8240] | -0.1769 [-0.3404, -0.0200] | +0.7290 [+0.4703, +1.0009] |
| DeepSeek pooled，任务等权 | +0.4593 [+0.2736, +0.6571] | -0.1206 [-0.2596, +0.0220] | +0.5799 [+0.3805, +0.7754] |
| GLM-4.6V seed 2 | +0.7180 [+0.5374, +0.9051] | +0.3108 [+0.1406, +0.4664] | +0.4072 [+0.1627, +0.6537] |

**FACT：**DeepSeek 中 ATTACKS 的改善与 SUPPORTS 的近零或负响应共同形成
`GAP_AS`；GLM 中两个 bundle 都优于 CONTROL，但 ATTACKS 改善更大。因此不能把
跨模型共同结果简化为“SUPPORTS 有害”。

### 2.2 Correct-state 分层

| View | 任务数/块数 | `GAP_AS` [95% CI] |
|---|---:|---:|
| DeepSeek pooled，任务等权 | 17/30 | +0.0829 [-0.0032, +0.1940] |
| GLM-4.6V seed 2 | 12/12 | +0.3349 [+0.0883, +0.6868] |

**FACT：**GLM 的 correct-state `GAP_AS` 仍为正且区间不跨零。当前分析没有冻结
wrong-versus-correct 的正式交互估计，而且 DeepSeek 的同一任务可能在不同 seed
落入不同分层。

**INFERENCE：**本结果不能支持“ATTACKS 只在错误状态有效”或“已证明 targeted
rescue specificity”。它更稳妥地支持：不同 relation-conditioned disclosure bundle
会产生不同的后续响应，而该差异值得进一步分解。

## 3. 资格、缺失与独立复核

### 3.1 冻结资格结果

| 批次 | 总块数 | 完整三臂块 | 缺失块 |
|---|---:|---:|---:|
| DeepSeek V3 | 90 | 89 | 1 |
| GLM-4.6V seed 2 | 41 | 41 | 0 |

每个纳入块均通过：三臂唯一性、task/seed/model/resolution/stateHash 一致、实际
Round-1 belief 数组一致、canonical option 键一致，以及 final Brier 从 agent beliefs
以 `1e-12` 容差独立复算。

### 3.2 独立 PowerShell 检查

- DeepSeek 90 个文件、GLM 41 个文件均无空或非法 `round1StateHash`；
- 两批次均无三臂 `round1StateHash` 不一致文件；
- GLM 的三臂 final roster 数量在块内同步；
- DeepSeek 历史 lenient 批次存在跨臂 final 报告数不齐，这是冻结 complete-block
  估计仍需披露的旧设施限制；
- 将 GLM 两个分层按块数还原后的总体 `GAP_AS=0.386015684281843`，与既有
  trajectory summary 中 `Brier_SUPPORTS - Brier_ATTACKS` 的差仅
  `5.55e-17`。

### 3.3 Post-freeze full-roster 敏感性

该检查在发现 DeepSeek roster 不齐后执行，**不属于预冻结 L1 闸门，也不替换主估计**。
它只保留 CONTROL、SUPPORTS、ATTACKS 三臂均有四个 final 报告的块：

| View | full-roster 块 | wrong 任务/块 | wrong `GAP_AS` [95% CI] | LOTO 变号 |
|---|---:|---:|---:|---|
| DeepSeek seed 0 | 35 | 23/23 | +0.5767 [+0.3430, +0.8214] | 否 |
| DeepSeek seed 1 | 35 | 23/23 | +0.7594 [+0.4646, +1.0613] | 否 |
| DeepSeek pooled，任务等权 | 70 | 27/46 | +0.6546 [+0.4315, +0.8823] | 否 |

**INFERENCE：**在这个更严格但事后定义的子集中，wrong-state 方向、区间和
LOTO 稳定性均保持；因此 DeepSeek 主信号不太可能完全由 final roster 不齐造成。
该敏感性不能消除选择完整 roster 子集带来的选择问题。

## 4. 对第一篇与下一步的权限含义

### 第一篇

当前不自动改写第一篇主结论。若使用本结果，最合适的位置是 supplement 或
机制边界段的一项紧凑分层诊断，并必须使用 `bundle response`，不能写成
message-level trajectory value。八页主文只有在它能替换现有 post-hoc 轨迹叙事、
而不是继续追加内容时才考虑纳入。

### AAMAS 前的下一项核心工作

仍按项目发展方案执行：冻结并审计
`CONTROL / ATTACKS_NEUTRAL / ATTACKS_LABELED` 最小实验合同。L0 的 `GO_L1`
不授权现在启动 message-level LOO，也不改变“第一篇唯一允许的新增付费机制实验”
这一边界。

### AAMAS 后

允许把 noise-calibrated 单-item LOO 作为高优先级 L1 pilot 设计对象。正式开跑前
仍需单独冻结：完整 Round-1 snapshot、item mask、相同输入 replay-noise 基线、
任务级统计单位、缺失规则和预算/停止线。

## 5. 产物与验收

- 冻结合同：`docs/experiments/V6_POLARITY_BUNDLE_RESPONSE_ANALYSIS_FREEZE_V1.md`
- 主分析器：`experiments/campaign/audit/analyze_v6_polarity_bundle_response.py`
- 合成测试：`experiments/campaign/audit/test_analyze_v6_polarity_bundle_response.py`
- post-freeze 敏感性：`experiments/campaign/audit/audit_v6_polarity_bundle_full_roster_sensitivity.py`
- 机器结果：`experiments/campaign/audit/output/polarity_bundle_response_v1.json`
- 可读摘要：`experiments/campaign/audit/output/polarity_bundle_response_v1.md`
- 任务级结果：`experiments/campaign/audit/output/polarity_bundle_response_per_task_v1.tsv`

验收事实：

- Python 语法编译通过；
- 8/8 合成测试通过；
- 10,000-draw bootstrap 固定为 `mulberry32(0x5EED0F)`；
- 未读取 provider credential，未调用 provider；
- 未修改 production runner、冻结实验产物、第一篇源文件或 manifest；
- 主 JSON SHA-256：
  `40C76515B9D3CDC3332FA8F357CBDB4A7BB8B169ACA78CE49D219E019526B2FA`。
