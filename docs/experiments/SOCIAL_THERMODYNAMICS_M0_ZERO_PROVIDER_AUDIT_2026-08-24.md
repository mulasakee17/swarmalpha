# Social Thermodynamics M0 Zero-Provider Audit

日期：2026-08-24  
状态：**FACT REPORT / M0 PARTIAL PASS；ST-1 NOT REACHED；policy NO-GO**  
provider 调用：0  
truth access：null-model audit 无；历史投影状态在 pre-action cutoff 计算，outcome 仅沿用既有 response audit 的离线分层  

## 0. 总裁决

Phase M0 完成了候选量本体、旧资产处置、synthetic/null separation、历史退化复核、prompt 仪器可行性和 missingness census。

结论分层如下：

| Gate | 结果 | 含义 |
|---|---|---|
| ST-0 ontology | **PASS** | 自报、概率几何、证据/lineage、exposure、revision、outcome 权限已分开 |
| deterministic projection | **PASS** | 当前 kernel 可重放、option 数值几何可对称置换 |
| synthetic non-equivalence | **PASS** | 候选坐标能区分若干简单 consensus/top-choice 指标会合并的反例 |
| historical nondegeneracy | **PARTIAL / REVISE** | 部分量有变化，但旧 H_E/κ 退化；新轴在 heldout 有强相关且状态缺失严重 |
| prompt/repeat stability | **DEFER — NOT RUN** | 有分析内核和候选 bank，无 accepted semantic review、无真实 pair artifact |
| predictive validity | **NOT TESTED IN M0** | 未证明宏观态预测 next state 或 independent outcome |
| response validity | **NOT QUALIFIED** | 当前 κ response 审计 DEFER，且 κ 本身 STOP |
| governance authority | **NONE** | 不实现 detector/router，不定义 F/T/phase |

因此：**M0 只通过本体与公式反例门，没有达到 ST-1。下一步必须先修复真实仪器与缺失，不是继续增加状态维度。**

---

## 1. 输入与复现入口

| 输入 | 用途 | 权限 |
|---|---|---|
| [`CollectiveEpistemicStateV1`](../../src/lib/epistemic/collectiveState.ts) | within/pooled/between uncertainty、lineage、revision、response concentration | current implemented, descriptive-only |
| [`MEASUREMENT_VALIDITY_PROTOCOL_V1.md`](../architecture/MEASUREMENT_VALIDITY_PROTOCOL_V1.md) | repeat/paraphrase/permutation/evidence response/missingness Gate | normative measurement protocol |
| [`analyze_v6_social_thermodynamic_response.ts`](../../experiments/campaign/v6/analyze_v6_social_thermodynamic_response.ts) | 历史 pre-action state、H_E/κ、evidence observability、axis correlation | current zero-provider historical audit |
| [`analyze_social_thermodynamics_m0.ts`](../../experiments/campaign/measurement/analyze_social_thermodynamics_m0.ts) | 本次 deterministic synthetic/null audit | new M0 analysis |
| [`SOCIAL_THERMODYNAMICS_QUANTITY_CANDIDATE_REGISTRY_V1.md`](../research/SOCIAL_THERMODYNAMICS_QUANTITY_CANDIDATE_REGISTRY_V1.md) | 候选量定义、反证和权限 | new M0 registry |

复现命令（Windows 环境若 `tsx` 的 `os.userInfo()` 触发系统错误，先设置一个仅本进程可见的 `process.geteuid` shim；该 shim 不改变分析输入或算法）：

```powershell
node --import 'data:text/javascript,process.geteuid=()=>1000' --import tsx experiments/campaign/measurement/analyze_social_thermodynamics_m0.ts
node --import 'data:text/javascript,process.geteuid=()=>1000' --import tsx experiments/campaign/v6/analyze_v6_social_thermodynamic_response.ts
```

M0 null audit content hash：`sha256:3db6adeaa8a939c1b8f431e902a7d20546c18435c9acc21edd7165469f83be33`。

---

## 2. Synthetic/null audit

### 2.1 范围

构造 7 个无 outcome、无 provider 的 categorical collective states：

1. 全员 uniform + distinct lineage；
2. 高确信共识 + shared lineage；
3. 相同高确信共识 + distinct lineage；
4. 高确信三向极化 + distinct lineage；
5. 低确信同选项共识 + distinct lineage；
6. partial lineage；
7. declared roster 缺 1 个 agent。

在 6 个 lineage-complete scenario 上，`[intercept, within uncertainty, pooled uncertainty, between disagreement, mean top probability, lineage entropy]` 的 deterministic coordinate matrix rank 为 **5**。这是设计反例集合上的代数非等价，不是经验 intrinsic dimension。

### 2.2 六项反例

| 检查 | 结果 | 建立了什么 | 没有建立什么 |
|---|---|---|---|
| within–between separation | PASS | pooled uncertainty 都为 1 时，全员 uniform 的 between=0；高确信三向极化的 between=0.641 | 任一量预测质量 |
| lineage orthogonality | PASS | 同一高确信共识几何下，effective lineage 可为 1 或约 3 | lineage 统计独立/可靠 |
| top-choice insufficiency | PASS | 全票 A 时，mean top probability 可为 0.9 或 0.5；within entropy 可为 0.359 或 0.937 | 概率自报在真实 prompt 下稳定 |
| missing lineage | PASS | partial lineage 的 effective count/entropy 保持 null | missingness 可忽略 |
| roster missingness | PASS | expected=3、active=2、missing=1 明确保留 | active-only 均值无偏 |
| option relabel/order | PASS | 对称重命名/重排后数值几何不变 | 自然语言描述语义等价 |

**INFERENCE**：`within/pooled/between + lineage` 作为坐标族具有继续资格化的数学必要性；单独 majority、pooled uncertainty 或 confidence 无法区分这些反例。

**LIMITATION**：这些场景是为了制造概念反例而构造，不是从真实 LLM 分布随机抽样。rank、范围和 PASS 不能用于论文经验主张。

---

## 3. 历史 pre-action 投影与退化复核

### 3.1 状态完整性

| 数据角色 | Eligible | Valid pre-action state | 比例 | 主要失败 |
|---|---:|---:|---:|---|
| development | 73 | 55 | 75.3% | agent report count mismatch |
| heldout | 53 | 21 | 39.6% | agent report count mismatch |

heldout 的 state complete-case 只覆盖不到一半 eligible events。任何宏观态统计都必须同时报告这一选择边界；不能把 21 个 valid states 当成 53 个 eligible states 的无偏代表。

### 3.2 旧 H_E/κ

| 指标 | Development | Heldout |
|---|---:|---:|
| valid κ states | 55 | 21 |
| H_E range | 0.8988–1.0000 | 0.8988–1.0000 |
| κ range | 0–0.0662 | 0–0.0730 |
| corr(H_E, κ) | −0.959 | −0.946 |

**FACT**：旧 exact-content `H_E` 近满熵；κ 被 `H_E` 主导并压在窄域。复核裁决仍为：

> `STOP — current H_E/kappa V1 macrostate degenerate; response DEFER; policy NO-GO.`

此次 cutoff 与旧报告的个别数值差异来自当前现场可读 artifacts/continuation roots；不改变退化裁决。当前实跑 development median κ 为 0.0326。

### 3.3 仍有描述性变化的量

| 数量 | Development (`n=55`) | Heldout (`n=21`) |
|---|---|---|
| R | 0.367–0.990，median 0.695 | 0.325–1.000，median 0.983 |
| exact reuse fraction | 0–0.579，median 0.333 | 0–0.533，median 0.154 |
| verbatim private commitment coverage | 0–1，median 0.75 | 0–1，median 0.50 |
| reference count | 9–19 | 10–24 |
| unique content hash count | 6–15 | 7–24 |

这些结果只说明“可重建且有变化”，不说明 detector validity 或治理价值。

### 3.4 新轴相关风险

Development 五轴没有 `|r|≥0.9` 的 pair，但 exact reuse–coverage 已为 0.836。Heldout 出现：

- disagreement–R：`r=-0.927`；
- exact reuse–coverage：`r=0.913`。

**INFERENCE**：下一版不得同时无条件保留每个相似轴。需要在 development 冻结 redundancy rule，并在 task-family-heldout 比较增量预测；否则会重演旧 R/T/H “多个同源投影冒充多维状态”的问题。

---

## 4. Prompt 仪器可行性

### 4.1 已实现资产

当前 Measurement Validity 层已实现：

- exact repeat；
- semantic paraphrase pair JSD；
- option permutation TV 和 canonical bijection；
- evidence direction/strength；
- signal-to-nuisance；
- registered denominator、terminal status、pair coverage；
- non-compensatory Q0–Q3 Gate。

本次只读构建现有 candidate bank 得到：

| 项 | 数量 |
|---|---:|
| independent candidate clusters | 20 |
| option count | K=3 only |
| agent count | 3 或 4 |
| paraphrase candidates | 20 |
| option-permutation candidates | 20 |
| evidence candidates | 80 |
| truth-like top-level fields in provider projection | 0 |
| bank content hash | `sha256:c1b1d533120be74dbc7e18e9535948d3351cecd749a8eb4f7c3e67b3ebc978f2` |

### 4.2 当前阻断

**FACT**：semantic review packet 仍为 `REVIEW PENDING`。机械生成的 evidence ladder 不能由生成它的系统自行签署语义等价、真实强度或反向性。[`MEASUREMENT_VALIDITY_PILOT_SEMANTIC_REVIEW_PACKET_2026-08-13.md`](../../legacy/docs/archive/plans/MEASUREMENT_VALIDITY_PILOT_SEMANTIC_REVIEW_PACKET_2026-08-13.md)

当前 `measurement:plan` 仅生成一个 wiring-only、2 个 exact-repeat cell 的计划：12 个 planned provider calls、10,000 token hard cap；claims 明确限制为 wiring/internal replay/exact retry。三个预期 output directory 均不存在，真实 measurement-validity source artifact 数为 **0**。

因此 prompt stability、option equivariance、evidence response、SNR 和 predictive increment 全部为 **NOT RUN**，不是 FAIL，也不是 PASS。

---

## 5. 旧资产处置裁决

| 资产 | 裁决 | 下一用途 |
|---|---|---|
| 五维状态思想 | ADAPT | 重构为 P/E/C_self/I_obs/Z，不称完整心理状态 |
| measurement-layer independence | KEEP | 新分析只读 current epistemic kernel |
| δ consistency philosophy | KEEP AS FEATURE IDEAS | 通过 C2 前无 detector/control 权限 |
| information-flow intervention | KEEP FOR PHASE 2 | 先作为 randomized field，不叫 governance |
| scalar-belief R/T/H/F | RETIRE/QUARANTINE | 只保留历史 provenance |
| v6 `U-T·H` composite | QUARANTINE | compatibility only；不进入新论文定义 |
| H_E/κ V1 | STOP | 不重命名复活 |
| `(1-I)(1-C)` susceptibility | RETIRE AS SUSCEPTIBILITY | 仅保留 social-update coefficient 的历史语义 |
| current CollectiveEpistemicStateV1 | KEEP | C0 descriptive foundation |
| Measurement Validity authority | KEEP | M1 直接复用，不新建仪器框架 |

---

## 6. M0 对论文价值的实际贡献

M0 没有产生“社会热力学有效”的正结果。它产生了更重要的论文前置资产：

1. 一个不会把 LLM 自报升级成 latent cognition 的 quantity registry；
2. 一套直接击穿 majority/consensus 总标量的反例；
3. 一个公开承认旧 H_E/κ 退化、并防止新轴重复犯错的 redundancy gate；
4. 一个可直接执行的 prompt/repeat/permutation measurement infrastructure；
5. 明确的 state coverage 问题：heldout 只有 39.6% eligible events 有完整状态；
6. 一个诚实的 M1 起点：先验证仪器，不先追求 intervention outcome。

这使未来 Paper A 的贡献可以落在“measurement qualification and boundary knowledge”，而不是另一个任意指标。

---

## 7. 下一步：M1 前置，不启动 provider

M0 之后仍不允许直接运行 20-cluster paid pilot。下一步是一次人工/规则可复核的语义审查：

1. paraphrase 是否保持 shared/private fact set、claim 与角色权限；
2. option map 是否真双射且不改变语义；
3. weak/medium/strong 是否来自可解释证据生成机制，而不是句子数量；
4. counter 是否真的针对同一 designated target；
5. 20 个 leakage groups 是否可视为独立 task clusters；
6. 将明显机械或伪反证 payload 标 `REVISE`，不为了凑 20 个而 accept。

只有 review 完成，才冻结 M1-A 的最小 development plan。M1-A 仍先做 exact-repeat + paraphrase + permutation；evidence-strength 若无法获得客观 ladder，应单独 STOP/REVISE，不能污染仪器稳定性研究。

