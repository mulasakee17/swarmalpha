# Social Thermodynamics Quantity Candidate Registry V1

日期：2026-08-24  
状态：**M0 research registry；定义权威，不授予控制权**  
适用范围：categorical/binary claim-relative LLM 多智能体报告；开放文本任务不自动适用  

> 本表是 [`SOCIAL_THERMODYNAMICS_APPLICATION_DEFINITION_AND_RESEARCH_PLAN_V1_2026-08-24.md`](../../legacy/docs/plans/SOCIAL_THERMODYNAMICS_APPLICATION_DEFINITION_AND_RESEARCH_PLAN_V1_2026-08-24.md) Phase M0 的第一个执行产物。它冻结候选量的语义、输入、缺失、反证和权限阶梯；不声明任何量已经具有构念效度、预测效度或治理价值。

---

## 1. 统一规则

1. 所有量必须相对一个注册 claim、canonical option set、as-of round 和命名仪器计算。
2. `groundTruth`、resolution、correct option、future report 和 post-action artifact 不得进入 pre-action quantity。
3. prompt-conditioned report、derived quantity、behavioral telemetry、governance estimate 和 outcome evaluation 不得混层。
4. missing / invalid / partial provenance 保持缺失或部分状态，不编码为 0。
5. deterministic replay 只证明计算一致，不证明量测到了目标构念。
6. source/lineage identity diversity 不等于统计独立性。
7. 每个候选量只有达到表中资格级别后，才能获得相应命名或用途。

资格级别：

| 等级 | 含义 | 允许用途 |
|---|---|---|
| `C0` | 有操作定义/实现或可计算，但未做测量资格 | synthetic/null audit、历史描述 |
| `C1` | replay、对称性、missingness、prompt/repeat 稳定门通过 | 冻结域内描述性监测 |
| `C2` | task-family-heldout 超过简单基线预测下一状态/风险 | detector development 的候选输入 |
| `C3` | 在独立随机外场数据上预测 response heterogeneity | state-conditioned action research |
| `C4` | 冻结策略在独立任务上改善 cost-adjusted loss | 有限在线控制权限 |
| `C5` | 跨 N/K/topology/model 复现函数/尺度关系 | thermodynamic-style 命名候选 |

---

## 2. 核心概率几何量

### Q01 — `withinAgentUncertainty`

| 字段 | 定义 |
|---|---|
| Semantic layer | `derived_epistemic` |
| 数学定义 | `N_active^{-1} Σ_i H_K(P_i)`；categorical entropy 以 `log K` 归一化 |
| 实现状态 | **IMPLEMENTED**：[`collectiveState.ts`](../../src/lib/epistemic/collectiveState.ts) |
| Online inputs | 同一 claim、同一 as-of round 的 latest valid probability reports |
| 样本空间 | 每个 agent 的 canonical option distribution |
| Missingness | 无 active report 时投影拒绝；declared roster 缺员另行报告，不能补成 uniform |
| 改变的判断 | 区分“每个人都不确定”与“每个人确定但彼此不同” |
| 简单替代 | mean top probability / mean confidence |
| Null/pathology | 全员 uniform 时为 1；全员 point mass 时为 0；可能被模板化概率影响 |
| 反证 | 等价 prompt 下变化大于任务/状态差异；或不优于 mean max probability |
| 当前资格 | `C0`；synthetic separation PASS，prompt stability UNKNOWN |
| 禁止解释 | 群体分歧、正确性、calibration、模型内部熵 |

### Q02 — `pooledUncertainty`

| 字段 | 定义 |
|---|---|
| Semantic layer | `derived_epistemic` |
| 数学定义 | `H_K(N_active^{-1} Σ_i P_i)`，当前 equal-weight linear pool |
| 实现状态 | **IMPLEMENTED** |
| Online inputs | 与 Q01 相同 |
| 样本空间 | equal-weight pooled categorical distribution |
| Missingness | 缺员必须伴随 population basis；不得声称代表完整 roster |
| 改变的判断 | 描述汇总预测分布的集中/不确定程度 |
| 简单替代 | pooled max probability |
| Null/pathology | 极化群体和全员 uniform 都可得到满熵，因此不能单独代表健康状态 |
| 反证 | 对未来/结果信息完全被 pooled max probability 吸收 |
| 当前资格 | `C0`；synthetic pathology 已确认 |
| 禁止解释 | 个体不确定性、证据多样性、群体正确性 |

### Q03 — `betweenAgentDisagreement`

| 字段 | 定义 |
|---|---|
| Semantic layer | `derived_epistemic` |
| 数学定义 | `pooledUncertainty - withinAgentUncertainty`；generalized JSD decomposition |
| 实现状态 | **IMPLEMENTED** |
| Online inputs | 与 Q01 相同 |
| 样本空间 | agent identity × canonical option distribution |
| Missingness | 同 Q01；active-only 与 declared-roster 结果不可混用 |
| 改变的判断 | 把 agent 间分歧从个体自身不确定性中分离 |
| 简单替代 | max/mean pairwise TV/JSD；top-choice split |
| Null/pathology | 全员同一分布时为 0，无论大家正确、错误或都不确定 |
| 反证 | heldout 中被一个简单 pairwise metric 近确定；或 prompt variance 过大 |
| 当前资格 | `C0`；历史 heldout 中旧 max-TV disagreement 与 R `r=-0.927`，有冗余风险 |
| 禁止解释 | 极化的价值判断、决策质量、社会冲突 |

### Q04 — `pooledCertainty`

| 字段 | 定义 |
|---|---|
| Semantic layer | `derived_epistemic` |
| 数学定义 | `max_y p_bar(y)`；二元情形为 `max(p_bar, 1-p_bar)` |
| 实现状态 | **IMPLEMENTED** |
| 改变的判断 | 记录 equal-weight pooled distribution 的最大概率质量；精确并列由 `pooledPredictedOutcomes` 保留 |
| Null/pathology | 它是 pooled top-choice concentration，不是校准后的正确概率；跨不同 option count 不能直接比较 |
| 当前资格 | `C0-compatible` |
| 与 Q02 的关系 | 二元时与 entropy 单调对应；三类及以上不由 entropy 唯一决定，因此不得写成 `1 - pooledUncertainty` |
| 禁止解释 | calibrated correctness probability、ground-truth accuracy、独立证据强度 |

### Q05 — `topChoiceMajorityFraction`（baseline）

| 字段 | 定义 |
|---|---|
| Semantic layer | `derived_epistemic baseline` |
| 数学定义 | tie-aware top-choice mass 中最大 option 的 agent share |
| 实现状态 | **ANALYSIS BASELINE；不进入当前 state carrier** |
| 改变的判断 | 作为最简单“大家选什么”比较基线 |
| Null/pathology | 全员 `0.9/0.05/0.05` 与全员 `0.5/0.3/0.2` 均为 1 |
| 当前资格 | baseline only |
| 禁止解释 | 完整 belief geometry、confidence、正确性 |

---

## 3. 证据与信息流量

### Q06 — `effectiveDeclaredLineageCount`

| 字段 | 定义 |
|---|---|
| Semantic layer | `derived_epistemic` over declared provenance |
| 数学定义 | `exp(H(lineage fractional report mass))` |
| 实现状态 | **IMPLEMENTED**；仅 `completeness=complete` 时返回值 |
| Online inputs | report-to-evidence refs + registered `provenance.lineageId` |
| 样本空间 | 声明 lineage identity 上的 report mass |
| Missingness | 任一 active report 无 declared lineage 时保持 `partial/missing`，值为 null |
| 改变的判断 | 区分相同报告几何背后的单 lineage 与多声明 lineage |
| 简单替代 | distinct source count / raw evidence count |
| Null/pathology | 伪造/粗糙 lineage ID 可人为抬高；多 identity 仍可高度相关 |
| 反证 | lineage completeness 低；退化为 evidence count；不比 exact reuse 提供增量信息 |
| 当前资格 | `C0`；synthetic orthogonality PASS，真实身份质量 UNKNOWN |
| 禁止解释 | 独立证据数量、source reliability、error independence |

### Q07 — `normalizedDeclaredLineageEntropy`

| 字段 | 定义 |
|---|---|
| Semantic layer | `derived_epistemic` |
| 数学定义 | Shannon entropy / `log(distinct lineage count)`；单 lineage 约定 0 |
| 实现状态 | **IMPLEMENTED** |
| Online inputs / missing | 与 Q06 相同 |
| 改变的判断 | 描述 report mass 在声明 lineage 间是否均衡 |
| Null/pathology | 当所有 lineage 唯一且单次引用时接近 1；可能像旧 `H_E` 一样退化 |
| 反证 | 在真实协议中长期挤在窄区间；或由 distinct count/coverage 决定 |
| 当前资格 | `C0`；历史 exact-content `H_E` 已退化，Q07 必须重新资格化 |
| 禁止解释 | evidence sufficiency、truth diversity、independence |

### Q08 — `exactReuseFraction`

| 字段 | 定义 |
|---|---|
| Semantic layer | `behavioral_telemetry` 的确定性投影 |
| 数学定义 | `1 - U_hash/N_ref`，只计算被 report 引用的 exact content hash |
| 实现状态 | **IMPLEMENTED IN HISTORICAL AUDIT**：[`analyze_v6_social_thermodynamic_response.ts`](../../experiments/campaign/v6/analyze_v6_social_thermodynamic_response.ts) |
| Online inputs | pre-action report refs + registered content hashes |
| Missingness | `N_ref=0` 时 null，不编码为 0 |
| 改变的判断 | 描述逐字相同证据是否反复被引用 |
| 简单替代 | raw evidence count / unique hash count |
| Null/pathology | paraphrase、共同上游来源、同义摘要全部无法识别 |
| 反证 | 与 coverage 高度耦合且无增量；自然 paraphrase 下失真 |
| 当前资格 | `C0`；development range `[0,0.579]`，heldout `[0,0.533]`；heldout 与 coverage `r=0.913` |
| 禁止解释 | 语义重复、来源独立、回声室、错误相关 |

### Q09 — `verbatimPrivateCommitmentCoverage`

| 字段 | 定义 |
|---|---|
| Semantic layer | `behavioral_telemetry` 的确定性投影 |
| 数学定义 | private-information commitment hash 与 referenced content hash 精确匹配的 agent 比例 |
| 实现状态 | **IMPLEMENTED IN HISTORICAL AUDIT** |
| Online inputs | ordered agent commitments + report refs/content hashes |
| Missingness | manifest absent、roster mismatch、duplicate commitment hash 时 fail closed |
| 改变的判断 | 描述承诺的私有信息是否以逐字形式进入证据引用 |
| Null/pathology | 改写、摘要、推理使用但不引用均会被计为未覆盖 |
| 反证 | 与 exact reuse 定义/经验近完全耦合；对人为措辞极敏感 |
| 当前资格 | `C0`；development/heldout 均 `[0,1]`，heldout 与 Q08 `r=0.913` |
| 禁止解释 | agent 是否理解/使用信息、信息整合质量 |

### Q10 — `exposureCoverageVector`（候选族）

| 字段 | 定义 |
|---|---|
| Semantic layer | `behavioral_telemetry` projection |
| 数学定义 | 对 registered evidence/report × target-agent 的实际 delivery matrix 计算 coverage、inequality、novelty；暂不冻结唯一标量 |
| 实现状态 | **PROPOSED**；底层 `BeliefExposure` 已实现，完整矩阵投影未冻结 |
| Online inputs | architecture-recorded exposure only |
| Missingness | 无 exposure record 不等于未注意；只表示系统未记录投递 |
| 改变的判断 | 区分证据存在与证据实际到达哪些 agent |
| 简单替代 | message count / mention count |
| Null/pathology | 投递不等于注意、理解或接受 |
| 反证 | topology/protocol 决定后无剩余变化；或无法绑定 canonical source report |
| 当前资格 | `C0-proposed` |
| 禁止解释 | attention、uptake、causal influence |

---

## 4. 动态与响应量

### Q11 — `updateActivity`

| 字段 | 定义 |
|---|---|
| Semantic layer | `derived_epistemic` |
| 数学定义 | `N_comparable^{-1} Σ_i TV(P_i,t, P_i,t+1)` |
| 实现状态 | **PARTIAL**：kernel 已有 exposure-conditioned revision distance；完整 roster-wide activity 尚未冻结为 carrier |
| Online inputs | same claim/instrument 下显式 supersession reports |
| Missingness | 不可比较 agent/时点保持缺失，并报告 comparable denominator |
| 改变的判断 | 描述群体在一个时间步移动多少 |
| 简单替代 | top-choice flip rate / text change |
| Null/pathology | prompt 改写、sampling noise 或新的 option rendering 可制造 activity |
| 反证 | exact-repeat noise 与自然 update 同量级；跨仪器不可比 |
| 当前资格 | `C0-partial` |
| 命名权限 | C0–C4 只叫 update activity；C5 且通过 fluctuation–response/尺度检验后才可讨论 effective temperature |
| 禁止解释 | provider sampling temperature、物理温度、正确修订 |

### Q12 — `observedResponseConcentration`

| 字段 | 定义 |
|---|---|
| Semantic layer | `behavioral_telemetry` projection |
| 数学定义 | architecture-observed exposure-conditioned response mass 按 source agent 的 HHI/normalized HHI |
| 实现状态 | **IMPLEMENTED** |
| Online inputs | exposures + supersession + `observedReportIds` + belief distance |
| Missingness | 无匹配响应时 status=`unavailable`，不是 0 |
| 改变的判断 | 描述观察到的 revision mass 集中在哪些 source agent 上 |
| 简单替代 | mention count / source centrality |
| Null/pathology | 同时暴露多个 source 时 attribution 是描述性分摊；未识别 counterfactual |
| 反证 | 对 exposure order/共同暴露极敏感且无稳定解释 |
| 当前资格 | `C0` |
| 禁止解释 | causal influence、权威偏差、source quality |

### Q13 — `stateSusceptibility[action, coordinate]`

| 字段 | 定义 |
|---|---|
| Semantic layer | randomized causal estimand |
| 数学定义 | `[E(m_post-m_pre | do(a,h),S0=s)-E(m_post-m_pre | do(control),S0=s)]/h` |
| 实现状态 | **PROPOSED；不存在个体 scalar field** |
| Online inputs | 预行动状态只用于预冻结分层；估计本身需要 randomized action data |
| Missingness | arm/task/cluster support 不足则 DEFER，不回退相关分析 |
| 改变的判断 | 哪些群体状态对哪种外场、哪个剂量更易变化 |
| 简单替代 | single exposed-agent revision / `(1-I)(1-C)` |
| Null/pathology | carrier、长度、direction、novelty 不匹配会混淆 response |
| 反证 | interaction 在 task-family-heldout 反向或无支持；dose 不可重复 |
| 当前资格 | `C0-proposed`；必须达到 `C3` 才能叫 identified susceptibility |
| 禁止解释 | 个体人格易感性、治理收益 |

### Q14 — `outcomeResponse[action]`

| 字段 | 定义 |
|---|---|
| Semantic layer | `outcome_evaluation` / randomized causal estimand |
| 数学定义 | `E(Y|do(a),S0=s)-E(Y|do(control),S0=s)`；Y 为 final-private proper loss/utility |
| 实现状态 | **EXPERIMENT-SPECIFIC IMPLEMENTED**；当前第一篇有 exposure action contrasts，尚无合格 state interaction |
| Online inputs | 不能在线读取 Y；只用于 offline calibration/evaluation |
| 改变的判断 | 群体动得是否更接近独立 outcome，而不只是动得更多 |
| Null/pathology | choice-set opportunity、selected-content advantage、survivor stratum、missingness 可制造表面收益 |
| 反证 | heldout interval/方向不保留；correct→wrong harm 抵消 rescue |
| 当前资格 | action effect 有限支持；state-conditioned response 未达 `C3` |
| 禁止解释 | 状态本身有效、普适治理效果 |

---

## 5. 仪器与缺失状态量

### Q15 — `promptSensitivity`

| 字段 | 定义 |
|---|---|
| Semantic layer | measurement-characterization statistic |
| 数学定义 | semantic-paraphrase pair JSD / option-permutation TV / exact-repeat noise，分别报告 |
| 实现状态 | **ANALYSIS KERNEL IMPLEMENTED；REAL STUDY NOT RUN**：[`measurementValidityAnalysis.ts`](../../experiments/campaign/measurement/measurementValidityAnalysis.ts) |
| Online inputs | 独立 request、冻结 instrument pair、canonical mapping |
| Missingness | 不完整 pair 从 paired estimand 排除但进入 pair coverage denominator |
| 改变的判断 | 判断自报能否作为稳定仪器，以及 observed change 是否超过 nuisance |
| Null/pathology | 自动 paraphrase 未经人工 semantic review 会把语义漂移误算 prompt sensitivity |
| 反证 | median/P90 超冻结 Gate，或 evidence signal 不超过 nuisance |
| 当前资格 | `C0`；20-cluster candidate bank 已构建，semantic review pending，0 provider runs |
| 禁止解释 | missing sensitivity=0、跨模型可比性 |

### Q16 — `rosterAndTerminalMissingness`

| 字段 | 定义 |
|---|---|
| Semantic layer | experiment/behavioral telemetry |
| 数学定义 | expected-active roster gap；registered request 的 valid/invalid/provider_error/timeout/unavailable terminal proportions；pair coverage |
| 实现状态 | **IMPLEMENTED across kernel/measurement authority** |
| Online inputs | frozen registered denominator + terminal records |
| 改变的判断 | 判断宏观态代表完整群体还是成功响应子群 |
| Null/pathology | complete-case-only 分析会隐藏系统性 task/prompt/model missingness |
| 反证 | 无法恢复 registered denominator 或 status 被 retry 覆盖 |
| 当前资格 | `C0/C1 infrastructure`；历史 eligible valid-state coverage 不足 |
| 禁止解释 | missing at random、0 风险、0 uncertainty |

---

## 6. 明确禁止进入 registry 的旧量

| 旧量 | 处置 | 原因 |
|---|---|---|
| scalar-belief Kuramoto `R` | `QUARANTINE` | 标量本体不稳定；与 dispersion 定义性耦合；已有相邻工作占据且要求更严格 |
| legacy `T=std/volatility` | `RETIRE AS TEMPERATURE` | 未做 fluctuation–response；与 sampling temperature 混淆 |
| support-label entropy `H` | `RETIRE` | 样本空间与 evidence sufficiency 不一致；H=1 不代表完整/真实 |
| `F=(1-R)+T·H` | `RETIRE` | 同源双重计数；历史已证伪正交叙事 |
| `F=U-T·H` | `QUARANTINE COMPATIBILITY ONLY` | 不同工程量任意组合；无势函数/稳态/路径证据 |
| `κ=R(1-H_E)` V1 | `STOP` | `H_E` 近满熵、κ 窄域并被 H_E 主导 |
| `(1-I)(1-C)` susceptibility | `RETIRE AS SUSCEPTIBILITY` | 模型系数，不是随机化 response |
| role/evidence/expression inertia | `QUARANTINE GOVERNANCE ESTIMATE` | 混合先验与行为，不能叫 observed persistence |
| δ fixed thresholds | `QUARANTINE FEATURES` | 部分信号未验证、部分输入依赖自报/启发式；无控制权限 |

---

## 7. M0 裁决

**FACT**

- Q01–Q04、Q06–Q07、Q12、Q16 的底层实现存在并有确定性测试；
- Q08–Q09 在现有 V6 历史 artifact 上可重建并有描述性变化；
- Q15 的分析与 authority 基础已实现，但真实 prompt stability study 未运行；
- Q10、完整 Q11、Q13 仍是 proposed/partial；
- 没有任何量达到 C2/C3/C4/C5。

**M0 DECISION**

1. 核心首选坐标冻结为 `Q01/Q02/Q03 + Q06/Q08/Q09 + Q11/Q16`，但不是最终状态向量；
2. `Q04` 仅作 pooled top-mass 的派生显示，不作为独立轴；它只在二元情形与 Q02 单调对应，多分类时不是 Q02 的反向量；
3. `Q05`、raw count、mean self-confidence 作为必须击败的简单基线；
4. `Q07`、Q08、Q09 必须先做真实退化/相关审计，不能同时无条件进入模型；
5. Q12 只作机制描述，不叫 influence；
6. Q13/Q14 进入第二阶段，不得从当前观察性 revision 反推；
7. `F/T/phase/criticality` 不进入 M1 instrument。

下一资格门不是新增公式，而是完成 Q15 的人工 semantic review 和零污染的 prompt/repeat/permutation measurement-development study。
