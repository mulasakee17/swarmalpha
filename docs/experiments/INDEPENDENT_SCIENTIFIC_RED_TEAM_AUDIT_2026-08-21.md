# V6 Fork 独立科研软件红队审计（2026-08-21）

## 总判断

```text
SCIENTIFIC IMPLEMENTATION STATUS:

C. 存在可能改变 effect size / interpretation 的严重漏洞
```

这不是因为统计数字复算失败。相反，独立 Python 实现重现了 DeepSeek seed 0、DeepSeek 两 seed pooled、GLM seed 0 和 GLM seed 1 的核心均值与区间，GLM raw-final 端到计分端也逐报告通过。评级为 C 的原因是：

1. 作为论文主证据的历史 DeepSeek 三臂产物不保存 outbound prompt、raw final response、call record、execution identity 或 `forkInputHashV1`，因此无法从原始字节独立排除 treatment 标签错配、历史 parser/代码漂移和 raw-to-belief 错配；
2. 当前 GLM verifier 是公开哈希约束下的内部一致性检查，不是语义或来源证明。18 项隔离篡改中有 8 项在同步重算公开哈希后仍显示 `verified`，包括交换 CONTROL/ATTACKS 行标签、任意替换 state/fork hash、伪造披露字段、伪造 provider model/request ID，以及让 non-JSON raw final 与计分概率脱钩；
3. fork 返回行共享 round-1 深层可变对象。当前实际 arm loop 没有发现写入者，所以尚未证明它污染了已有结果，但实现不满足“immutable fork”的强条件；
4. online runner 的 task 对象结构上包含正确答案。当前静态数据流和 10-task、200+ outbound-request 运行时样本没有发现答案字段进入请求，但历史正式请求字节未保存，无法把“未观察到泄漏”升级为结构性不可能。

所以当前证据支持的是：**给定存储的结构化概率行，报告的 proper-loss 差异和 bootstrap 是正确的；当前代码路径的 same-round prompt 隔离成立。** 它尚不足以证明：**历史主实验的原始 provider exchanges、treatment identity 和完整 causal state 均被不可伪造地绑定。**

本审计没有修改任何正式 run/manifest/ledger/raw artifact，没有自动修复 production code，也没有为审计发起付费重跑。

## 审计产物

- 独立分析器：`experiments/campaign/audit/independent_fork_audit.py`
- 独立分析输出：`experiments/campaign/audit/output/independent_fork_audit.json`
- same-round / task-order / mutation tests：`test/audit-v6-fork-invariants.test.ts`
- 18 项 corruption matrix：`test/audit-glm46v-corruption-matrix.test.ts`
- corruption 输出：`experiments/campaign/audit/output/corruption_matrix.json`
- 跨模型 machine-readable diff：`experiments/campaign/audit/output/cross_model_protocol_diff.json`

---

## 一、真实执行图

| 顺序 | 实际入口/函数 | 主要读取 | 主要写入 | 真值/随机性/共享状态边界 |
|---:|---|---|---|---|
| 1 | `hiddenBenchTaskAdapter.ts:createHiddenBenchTaskProjectionV1`（251–286） | pinned `benchmark.json` 的 description/shared/hidden/options/**correct_answer** | deep-frozen task；`task.outcome=correct_answer` | 此处开始 task 对象携带真值 |
| 2 | `run_v6_fork.ts:runFork`（383–405） | task、claim、agent/private info、fixture/model override | run-local arrays、provider seed | `providerSeed=(taskId*7919+seed*104729)>>>0`；不含 arm |
| 3 | R1 request construction（408–427） | public context、该 agent private info、claim | 每 agent request，`visibleTranscript: []` | 同轮前序 response 不进入后序 prompt |
| 4 | `providerAdapters.ts:buildDiscussionPrompts/respond`（120–178） | request 字段 | system/user prompt、single attempt | DeepSeek/GLM adapter 在此后分流 |
| 5 | R1 parse（428–468） | adapter raw response | parsed belief/message/evidence、transcript、call record | response 完成后才写 transcript；下一 R1 仍显式使用 `[]` |
| 6 | snapshots（471–533） | task definition、R1 transcript/reports/evidence/config | `forkInputHashV1`、registry、R1 metrics、`round1StateHash` | `round1StateHash` 只含 agent probabilities + sorted evidence content hashes；532–533 读取真值用于后续离线计分变量 |
| 7 | arm fork（540–550） | arms 固定顺序、R1 registry/transcript | disclosure、`transcript2=[...transcript]` | CONTROL→SUPPORTS→ATTACKS；outer transcript 浅复制 |
| 8 | selector（`buildDisclosure` 285–304；`selectAllEvidenceV1` 166–192） | relation refs、registry | exact-content-hash 去重、排序的 disclosure | SUPPORTS/ATTACKS 数量/字符/来源不强匹配；message 明示 relation 标签 |
| 9 | R2 requests（551–601） | 同一个 arm 的 frozen `transcript2`、private info | round2 reports | 所有 R2 request 都在 `round2` message 被加入 final transcript 前调用；同轮不互见 |
| 10 | final prompt（603–710；`finalOutcome.ts:buildFinalElicitationPrompt` 390–431） | public/private、R1+全部该 arm R2 transcript、claim/options | private final raw、parsed final vectors | final response 不写回 `finalTranscript`；同轮 final 不互见 |
| 11 | pooling/Brier（712–755） | valid final vectors、`task.outcome` | mean probability、argmax accuracy、multiclass Brier | 真值在这里影响结果；lenient/strict policy 决定缺失处理 |
| 12 | GLM persistence（`run_v6_fork_glm46v_two_arm_v4.ts:executeGlm46vTwoArmGate` 1154–1415） | plan/execution/ledger、rows | run JSONL、manifest、summary | append-only attempts；严格任务资格；固定 arm order |
| 13 | analysis（`analyze_v6_fork.ts`；GLM V4 analyzer） | rows、manifest/status | paired task effects、task bootstrap、bounds | DeepSeek 先 seed 内 paired，再 task 内均 seed；GLM complete pair + ±2 bound |
| 14 | replay/verifier（GLM runner 1447–1660） | plan/execution/ledger/manifest/rows、pinned task | problems/`verified` | 复用项目 task loader/Brier逻辑；不重建 disclosure、request、state hash 或 raw→belief parse |

随机数只有两类：provider seed（runner；同 task×experimental seed 的所有 arms 相同）和 analyzer 的 `mulberry32(0x5EED0F)` task bootstrap。Selector 本身按 content hash 排序，无运行时随机 shuffle。

---

## 二、simultaneous 是否真实

**当前代码：R1 YES，R2 YES，final YES；历史 provider 字节证据：不完整。**

- R1 虽为 sequential `await` loop，但每个 request 固定 `visibleTranscript: []`（`run_v6_fork.ts:408–427`）。
- R2 也是 sequential `await`，但每个 agent 收到同一 arm 的 `structuredClone(transcript2)`；R2 outputs 只在 loop 完成后一次性并入 `finalTranscript`（551–611）。
- final responses 从不追加到其他 final prompt（617–710）。
- 没有 `Promise.all` 或并发 callback 修改 transcript；因此 concurrency=1 不改变可见性。

`audit-v6-fork-invariants.test.ts` 实际执行了：

1. 将 R2 输出按 agent 正序/逆序置换，R1 与 R2 outbound prompt bytes 对同一 request 完全相同；
2. R1 prompt 中不含任何同轮 R1 marker；R2 prompt 中不含任何同轮 R2 marker；
3. 每个 final prompt 含该 arm 全部 R2 marker，但不含前序 final 的唯一数值 marker。

测试通过。限制是历史正式 artifact 未保存 outbound bytes，故这是当前实现不变量验证，不是对 2026-08-15 provider request 的字节级验尸。

## 三、fork immutability

**强不变量失败。** `round1AgentBeliefs` 在 arm loop 外构造一次（528），同一 array/object references 被放进每个 row（748）；`round1EvidenceContents` 每次创建新 outer array，但 inner `r.contents` arrays 共享（749）。

mutation test 已证明：修改 CONTROL row 的 `round1AgentBeliefs[0][option]` 会同步改变 SUPPORTS；修改 CONTROL 的深层 evidence string 会改变 ATTACKS。正式 arm loop 当前没有发现对这些对象的写入，且持久化前不会调用外部 consumer，因此这是一条**潜在 P0**，不是已观察到的污染。

最小修复：R1 结束后 canonical serialize 一次；每个 arm 从独立 deserialize/deep-freeze snapshot 建立 continuation；row 输出也 deep clone。修复后应跑零网络 invariant tests；为提升历史因果证明，需新 provenance run，但仅修引用本身不必推翻旧数值。

## 四、stateHash 覆盖范围

`computeRound1StateHash`（114–121）仅覆盖：

- ordered `{agentId, probabilities}`；
- 所有 evidence content hashes 的排序列表。

它不覆盖 task text、option order、public/private information、agent roster assignment、transcript message/order、evidence relation/source mapping、system/user prompt、model/provider、provider seed、generation config、schema/parser、tool config或adapter。它只能证明“记录的 belief vectors 与 evidence-content multiset 相同”，不能证明完整 continuation state 相同。

`forkInputHashV1`（204–243）覆盖明显更广：task definition commitment、R1 transcript/reports、evidence id/source/hash/relation、model、provider seed、configs、schema/parser refs。但仍不覆盖 literal outbound prompt bytes、provider endpoint/API version、server-returned model/request ID、adapter source bytes、raw HTTP response、provider hidden state，而且 current verifier 不重新计算它。

历史 DeepSeek rows 没有 `forkInputHashV1`，所以主结果只能用弱 `round1StateHash` 加当前源码叙事支持 same-state。建议 full-state manifest 直接承诺 canonical request bytes、source bundle archive、adapter/parser content hash、task-without-truth online view、server metadata和每 arm deserialize snapshot hash。

## 五、ground-truth leakage

**未发现实际 request 泄漏，但结构性 firewall 不成立。**

- `hiddenBenchTaskAdapter.ts:277` 将 `correct_answer` 放入 `task.outcome`；`runFork` 从函数开始持有整个 task。
- `runFork.ts:532–533` 在 fork 前读取 `task.outcome`，虽然后续 prompt builder 没有引用 `resolvedOption`。
- discussion request 只显式选取 publicContext、ownPrivateInformation、claim、visibleTranscript（416–426、555–565）；final prompt 也只使用 public/private/transcript/claim（619–640）。
- selector 不读取 outcome；analyzer 输出不返回 runner。

运行时 test 对 10 个任务的 200+ request 搜索 `groundTruth|correctAnswer|correct_answer|resolvedOption|"rationale"`，均未命中；单任务 request object 也通过同样检查。正确 option 字符串本身不能作为泄漏检测词，因为所有 canonical options 必须合法出现在 elicitation prompt。

未完成的关键检查：历史正式 outbound bytes 没有保存，无法在 10 个**历史正式任务**上重做搜索。最小修复是把 online task view 类型改为物理上不含 `outcome/resolution`，scoring truth 由 run 完成后的独立 offline join 注入；同时存储或加密承诺实际 request bytes。需要新 run 才能把“结构上不可能泄漏”用于实证声明。

## 六、option / truth / probability / Brier 对齐

通过。

- task options 保留 pinned `possible_answers` 顺序；`correct_answer` 必须是其中一个（adapter 187–193、258–277）。
- categorical contract 要求 exactly canonical key set、finite `[0,1]`、sum tolerance `1e-6`；不按字母排序映射 ground truth，不使用 A/B/C 索引。
- pooling 按 option string 取均值；Brier 是 `sum_o (p_o - 1[o=y])^2`（runner 727–735）。
- 独立 Python 的 5 个手工 golden cases（完全正确=0、完全错误=2、二元均匀=0.5、三元手算=0.38、四元手算=0.90）全部通过；expected 常数未调用项目 scorer。
- 独立 analyzer 对全部可用 GLM raw final 重解析、pool、Brier，与 rows 精确一致。

## 七、provider seed / 随机性

`providerSeed=(taskId*7919 + experimentalSeed*104729)>>>0`（106–108）。arm、agent、round、时间、retry、request counter均不参与；同 task×seed 的 R1/R2/final 及全部 arms 使用同 seed。runtime capture 对 task15 的所有 requests 只观察到 `118785`。

task 1–65 × seed 0–2 共 195 个映射全部唯一，无 collision。示例：task15 的 seed0/1/2 为 118785/223514/328243；task65 为 514735/619464/724193。

限制：同 numeric seed 不保证不同 provider 采用相同随机语义；temperature 0 也可能使 seed 无效。因此回答是 arms 内“可比”，不是跨 provider “相同随机样本”。无 retry 的 single-attempt纪律通过代码与 ledger 支持。

## 八、task / seed 状态泄漏

runner 的 transcript/reports/evidence/registry/signal 都在每次 `runFork` 内新建；adapter 由每次调用重新创建；没有 conversation/session ID。task-order invariant test 比较：task15 单独运行、14→15、15→14，task15 的 requestId/systemPrompt/userPrompt/invocationConfig 完全相同。

没有发现 cross-task/cross-seed runner state leakage。ledger sequence counter是 execution accounting，不进入 provider request。provider 外部服务隐藏状态无法由仓库证明不存在。

## 九、cache 审计

当前 fork execution path 没有 model-response、parsed-belief、evidence、task 或 replay cache。run-local `Map` 仅作为当前 task evidence registry；DeepSeek/Zhipu single-attempt invoker直接发 HTTP。`cachedPromptTokens` 是 provider usage observation，不是客户端复用响应。

仓库其他 governance classes 有内部 caches/history，但不在 `runFork` 调用图。没有可关闭的 fork client cache，因此未做“关 cache 付费重跑”。外部 provider 的 prompt cache/服务状态不透明；seed1/seed2 ledger记录 cached token usage，但这不是 response reuse 证明。

## 十、prompt 对称性

SUPPORTS 与 ATTACKS 使用同一 message builder/header/disclaimer/insertion position；差异包括：

- relation 选择策略；
- relation label 文本：`supports (confirms an option)` vs `attacks (disconfirms an option)`（selector 226–230）；
- 被选内容、条数、长度、来源数、option coverage。

CONTROL 无 governance message。因此实验识别的是**已实现的 relation-conditioned selection + explicit label wording + realized exposure/salience bundle**，不是纯 evidence semantic direction。`buildDisclosure` 的注释“direction must be the only variable”（292）与实现不符，应作为文档错误删除。

## 十一、exposure confound

DeepSeek v3 结构化 rows 的均值：

| arm | evidence items | `disclosedTokenCount` | covered options | source agents |
|---|---:|---:|---:|---:|
| SUPPORTS | 5.344 | 1691.4 | 2.333 | 3.678 |
| ATTACKS | 5.489 | 1740.9 | 2.389 | 3.456 |

注意：`disclosedTokenCount` 实际由 `message.length` 产生（304），是 JS 字符/code-unit count，不是 tokenizer token count。命名和任何“token-matched”表述均不准确。

exact content-hash dedup、relation filtering 和按 hash 排序对两 arm 使用同一算法，但输入分布不同，不能保证 matched exposure。未来最小 ablation：在 task 内按 tokenizer tokens、item count、source-agent count、option coverage 和插入位置进行 pair matching；同一 content 用盲化 A/B 标签或去掉 relation label，形成 `content direction`、`label wording`、`amount` 三个最小可分离因素。无需先造复杂 engine。

## 十二、context / output truncation

历史 request bytes、provider max-context 和 truncation flags没有写入 artifacts，故“从未截断”不能证明。GLM ledger的 prompt token maxima为：R1 681；CONTROL R2 1028/1092；ATTACKS R2 1845/1740；CONTROL final 1524/1573；ATTACKS final 2224/2117（seed0/seed1）。它们显示 treatment 明显增加输入长度，但没有记录 SDK/provider 是否截断。

发现了明确的**输出 cap 命中**：seed0 task26 CONTROL R2 completion=768（正好等于 cap）随后 `top_level_shape` 失败；seed1 task47 CONTROL R2 completion=768 后 `evidence_shape` 失败。另一次 seed0 task47 CONTROL R2 为 731。由于 arm 固定从 CONTROL 开始，严格 task-level policy 在这些失败后不再执行 ATTACKS。

这不会单独解释负效应，因为缺失 task 的 ±2 worst/best bounds仍全负；但它说明 missingness 是 task/prompt/cap dependent，而非纯随机。

## 十三、parser / validation

- categorical parser 不做 silent renormalization、clipping、string→number coercion、NaN fallback、missing-option completion、regex guess或 retry。
- GLM adapter会在 parser 前对**所有** responses执行 `stripCodeFence`（`zhipuSingleAttemptInvoker.ts:66–75,116–118`），包括 final；注释称“不改变 final path”与实际代码不符。
- belief parser v2 将 `lineageId:null` 确定性规范化为 absent；其他错误仍拒绝。规则在一个 GLM run 内对 arms 相同，但与 DeepSeek历史 parser/adapter不完全相同。
- failed GLM tasks不保存失败 raw body，只留 hash/reason，导致无法复审 `invalid_belief_value/belief_shape/evidence_shape` 的真实字节。

GLM 每 seed 均 5/44 failed。seed0：17/25/26/38/53；seed1：17/25/38/47/53，四个 task 重叠。除 seed1 task53 在 R1 失败外，其余最后请求都在 CONTROL（固定第一 arm）。这属于系统性 task/phase missingness，不是 treatment-specific pooling，因为整个 task 被删，但可能形成 population selection。

## 十四、pooling / missingness

DeepSeek lenient规则会对每 arm 的 valid final vectors求均值；因此不同 M 可能引入 selection。实际 v3：CONTROL mean final reported 3.678，SUPPORTS 3.856，ATTACKS 3.833；task60 seed1 CONTROL 为唯一 M=0/null Brier row。

独立 complete-all-arm-roster sensitivity（每个 block 三臂都满 roster）仍全负：

- H1：41 tasks，mean −0.446012，CI [−0.622046, −0.286150]；
- H2：41 tasks，mean −0.331867，CI [−0.503894, −0.183806]；
- LOTO 均不变号。

GLM strict output 的每个已完成 task 两臂均满 roster；5 个 failed task全部进入预定 ±2 bound：

- seed0 H2 bound [−0.664907, −0.210362]；
- seed1 H2 bound [−0.674880, −0.220335]。

因此 missingness 在数学最坏情况下不能单独把两个 GLM seed 的 H2 从 0 变成当前负值。DeepSeek null-arm 的 arm-level `[0,2]` sensitivity同样不改变已报告方向；但历史 raw缺失使 agent-level missing mechanism不可完全复原。

## 十五、arm execution order

正式顺序由 `FORK_ARMS=[CONTROL,SUPPORTS,ATTACKS]` 和 `for (const arm of arms)` 固定；GLM两臂固定 CONTROL→ATTACKS。没有 randomization/counterbalancing。provider drift、rate limit、cache warming和时间趋势与 treatment完全共线。

最小 rerun：从未进入论文主分析的 8–12 tasks，随机分配 6 个 arm permutations，1 seed；预先只检验 `effect × order` 是否大到改变方向。若三臂 seed2继续使用固定顺序，它不能解决 order confound。

## 十六、跨模型 replication

结论：**不是“只换模型”。** 公共数学 outcome 相同，但同时变化了 provider adapter、code-fence normalization、parser ref、completion policy、caps/thinking、population和arm set。完整 machine-readable diff 见 `cross_model_protocol_diff.json`。

特别是：

- DeepSeek：45 tasks、3 arms、lenient valid-report pooling；历史 execution/parser/raw/server metadata未保存。
- GLM seed0/1：44 tasks、2 arms、v4-strict whole-task eligibility、768/256、thinking disabled、stripCodeFence。
- GLM seed0 ledger 808/808 finished attempts均没有 server model/request ID；seed1 803/803 均为 server `glm-4.6v` 且 IDs 全唯一。

所以可以写“在不同 model/provider pipeline 上复现了 ATTACKS−CONTROL 的方向”，不能写“仅替换模型、其余完全相同”。

## 十七、独立重算

独立 Python analyzer不 import项目 parser/scorer/analyzer，不读取 existing summary/CI 作为输入；它直接读取 pinned benchmark、JSONL和GLM post-normalization raw final，独立实现exact option validation、pool、Brier、task pairing、seed nesting、mulberry32 bootstrap、LOTO和missing bounds。

| batch | contrast | n tasks | independent mean | independent 95% CI | published comparison |
|---|---|---:|---:|---:|---|
| DeepSeek seed0/v2 | A−S | 45 | −0.3432896914 | [−0.5068233025, −0.1927086728] | 与论文四舍五入一致 |
| DeepSeek seed0/v2 | A−C | 45 | −0.3076157407 | [−0.4960871914, −0.1464282407] | 与论文四舍五入一致 |
| DeepSeek v3 pooled | A−S | 45 | −0.4121145062 | [−0.5712064043, −0.2663344136] | 一致 |
| DeepSeek v3 pooled | A−C | 45 | −0.3303256173 | [−0.4965655864, −0.1881624228] | 一致 |
| GLM seed0 | A−C | 39/44 | −0.4937412482 | [−0.6392148326, −0.3470966257] | machine comparison全部 match |
| GLM seed1 | A−C | 39/44 | −0.5049933245 | [−0.6708253846, −0.3421857835] | machine comparison全部 match |

DeepSeek只能从 stored `finalAgentBeliefs`重算，因为270个v3 rows均无raw final；task60 seed1 CONTROL 的零报告被显式记录为validation anomaly。故“主要数字复现”YES，“从所有 raw provider response 重建所有主要数字”NO。

## 十八、bootstrap

项目与独立实现均：

1. 先在每个 task×seed 内做 paired arm contrast；
2. 两 seed 在 task 内等权平均；
3. 以 task effect 为唯一 bootstrap unit；
4. `mulberry32(0x5EED0F)`，10,000次；
5. percentile取 `floor(p*N)` 的排序值。

独立 port逐位重现GLM published CI，证明没有把90 blocks误当90 independent tasks。5个golden Brier和小样本 bootstrap input结构检查均未发现配对/权重错误。bootstrap seed与experimental seed分离。

## 十九、seed/model/path hard-code

系统搜索了 `seed===0`、`seed0`、`seeds[0]`、固定output paths/model/task counts/arm counts。GLM analyzer从 frozen plan读取唯一 seed，未再发现旧式“把seed1当seed0”计算bug；44/45/65主要是版本化协议/诊断字符串。runner的model override会重绑fixture model ref（389–396）。

风险仍有：GLM module通过环境变量选择variant并同时决定默认output/path/arms/refs，import-time配置容易被错误环境加载；machine-readable execution hash能检测部分冲突，但seed0/seed1均在dirty worktree运行。seed0 source bundle hash与当前源码不一致，且只存hash不存source bundle，不能从artifact单独恢复精确执行源码。

## 二十、18项 adversarial corruption

所有操作只在temp copy进行。科学期望全部为 FAIL；实际：10 FAIL，8 PASS。

| corruption | expected | actual |
|---|---|---|
| 删除manifest-listed run | FAIL | FAIL |
| 添加manifest外run | FAIL | FAIL |
| 只改Brier | FAIL | FAIL |
| task/file mismatch | FAIL | FAIL |
| duplicate arm | FAIL | FAIL |
| wrong ground-truth/resolved option | FAIL | FAIL |
| null/non-finite-equivalent probability | FAIL | FAIL |
| 少/错 final agent count | FAIL | FAIL |
| 改raw不改raw hash | FAIL | FAIL |
| manifest-plan hash错 | FAIL | FAIL |
| 对调CONTROL/ATTACKS row labels，call/raw arms不动 | FAIL | **PASS** |
| 两行stateHash换成任意字符串 | FAIL | **PASS** |
| 两行forkInputHash及manifest记录同步替换 | FAIL | **PASS** |
| 伪造disclosure counts/contents | FAIL | **PASS** |
| 伪造row requestHash | FAIL | **PASS** |
| ledger注入duplicate provider request ID并重算hash | FAIL | **PASS** |
| ledger注入错误provider model并重算hash | FAIL | **PASS** |
| raw final改成non-JSON并同步raw hash，belief不动 | FAIL | **PASS** |

第11和18项最可能直接制造假大效应：交换arm标签可直接反转contrast；raw与belief脱钩可任意重写计分向量。当前独立 analyzer会在GLM上抓住这两类（检查row/raw arm且重解析raw），因此现有GLM文件未表现出该腐败；DeepSeek历史文件没有raw/call metadata，无法做同等排除。

## 二十一、replay不能自证

GLM verifier复用：项目task loader、项目task outcome、项目Brier formula、项目manifest/hash helpers和项目row schema。它检查文件完整性与部分内部一致性，但不：

- 重算state/fork hash；
- 重建selector/disclosure；
- 将row arm绑定到call/raw arm；
- 从raw response重跑parser并绑定finalAgentBeliefs；
- 校验server model/request ID；
- 保存/验证literal outbound request；
- 证明source bundle hash对应可恢复源码。

因此必须区分：hash replay提供内部一致性；独立 Python提供部分独立正确性；两者都没有完整provider provenance。DeepSeek历史replay能力更弱。

## 二十二、“大效应可能由什么bug产生”逐项排除

| 假bug路径 | 结论 | 证据 |
|---|---|---|
| CONTROL option index错 / alphabetic mapping | 已排除 | 全程string-key canonical options；golden/全量独立Brier通过 |
| CONTROL parser更严格 | 同一batch未发现arm-specific parser代码；未完全排除selection | 同一函数；但固定order + strict使CONTROL先触发task drop |
| ATTACKS invalid wrong agents被剔除 | GLM排除；DeepSeek做complete-roster后仍负 | GLM strict whole task；DeepSeek sensitivity全负 |
| scoring polarity写反 | 已排除 | 独立计算明确A−C/A−S，与published一致 |
| arm labels swapped | current GLM files排除；DeepSeek历史无法字节级排除 | 独立GLM raw/row arm check；corruption显示原verifier会漏 |
| CONTROL读round1、ATTACKS读final | current code/GLM raw排除 | 两arm相同final path；raw重解析一致 |
| normalization不一致 | 已排除scorer；adapter normalization不同模型存在 | exact probabilities，无renorm；GLM code-fence strip |
| ground truth只泄漏ATTACKS | current code/test未发现；历史字节UNCERTAIN | selector/prompt无outcome dataflow；online task仍含truth |
| CONTROL缺private evidence | current prompt test排除 | final/R2每agent都显式含ownPrivateInformation |
| ATTACKS额外transcript/多执行一轮 | 后者排除，前者是设计 | rounds相同；ATTACKS额外governance disclosure正是treatment |
| final顺序污染 | 排除 | unique marker test通过 |
| cross-arm cache | 未发现 | no client cache；task/order invariance通过 |
| task matching错位 | current GLM排除 | pinned task reload + independent analyzer；DeepSeek仍只到structured rows |

最可能伪造当前巨大效应的单点路径排序：

1. **treatment label ↔ actual disclosure/raw row错配**；
2. **raw final ↔ stored finalAgentBeliefs错配**；
3. **answer leakage进入ATTACKS prompt/selector**；
4. **固定order下provider drift或CONTROL-first格式失败导致选择**；
5. **exposure/label framing而非semantic direction造成真实但被误解释的差异**。

1–2在GLM当前raw artifacts上由独立 analyzer排除，但原verifier排除不了；DeepSeek历史主实验因数据缺失无法彻底排除。3在当前代码与模拟outbound requests上未出现，但结构上仍可能。4的worst-case bounds不支持它单独解释GLM效应。5不是implementation bug，而是当前estimand的真实边界。

---

## 二十三、P0 / P1 / P2 findings

### P0 — Potentially result-invalidating

#### P0-1 历史DeepSeek主实验缺少端到端原始证据

- 文件：`v6-fork-confirmatory-v2/v3` rows/manifest；`ForkRow`历史字段。
- 行为：无outbound prompt、raw final、call records、execution/source identity、forkInputHash。
- 影响：不能独立证明历史arm identity、raw→belief、parser版本和完整same-state；可隐藏ATTACKS advantage。
- 复现：检查任一DeepSeek row keys；独立analyzer报告raw=0、stored-only rows。
- 修复：新run保存literal request、raw HTTP response、server metadata、execution/source bundle、semantic binding。
- 是否重跑：**若论文要主张强因果/可复现原始实验，必须重跑；若不重跑，必须把证据级别降为structured-artifact replication并明确限制。**

#### P0-2 verifier接受语义伪造

- 文件/函数：`run_v6_fork_glm46v_two_arm_v4.ts:verifyGlm46vTwoArmOutput`（1447–1660）。
- 行为：只比公开hash和部分行内一致性，不重建hash/disclosure/raw parse，也不绑定row arm到call/raw arm。
- 影响：arm swap或raw-belief decoupling能直接制造/反转ATTACKS advantage。
- 复现：corruption cases 11–18。
- 修复：semantic replay重建所有requests/selectors/state/fork hash；raw重新parse；绑定row/record/raw arm；校验provider metadata；hash外加签名/append-only外部commitment。
- 是否重跑：修verifier本身不必重跑GLM，因为现有raw足够被独立检查；DeepSeek因缺raw需重跑。

#### P0-3 fork深层对象共享

- 文件/函数：`run_v6_fork.ts:runFork`（528、738–755）。
- 行为：多arm rows共享nested round1 belief/evidence arrays。
- 影响：任何后续writer可跨arm污染same-state或输出；理论上可制造差异。
- 复现：mutation invariant test通过“CONTROL mutation在其他arm可见”的预期漏洞断言。
- 修复：canonical serialize/deep deserialize per arm + deep freeze。
- 是否重跑：当前路径无writer，零网络测试/代码审计后可不重跑旧GLM；要对历史DeepSeek作强证明仍需新run。

#### P0-4 ground-truth并非结构上不可访问

- 文件：`hiddenBenchTaskAdapter.ts:258–277`；`run_v6_fork.ts:383–533`。
- 行为：online function持有`task.outcome`并在fork前读取；只是当前prompt builder未使用。
- 影响：未来spread/debug/refactor可无声泄漏；历史requests未保存，无法事后排除。
- 复现：静态dataflow；当前10-task runtime negative test。
- 修复：online view物理删除outcome；offline scorer独立join。
- 是否重跑：强“truth inaccessible”claim需要新run；当前结果可保留为“未观察到泄漏”，不能写结构性保证。

#### P0-5 state identity proof不足且不可重算

- 文件：`run_v6_fork.ts:computeRound1StateHash/computeForkInputHashV1`；verifier。
- 行为：旧hash覆盖窄；新hash较广但verifier接受任意同步替换；DeepSeek无新hash。
- 影响：`hash equal`不能证明完整causal state equal。
- 复现：corruption cases 12–13实际PASS。
- 修复：canonical full-state manifest + verifier independent recomputation + exact source/request commitments。
- 是否重跑：GLM可从现有metadata部分补强但无法恢复outbound bytes；DeepSeek强claim需重跑。

### P1 — Interpretation / robustness threats

1. **固定arm order**（`runFork:540–544`）：时间/provider drift与arm共线；最小counterbalanced 8–12 task rerun。
2. **estimand是bundle**（`buildDisclosure`、message builder）：content、relation label、amount、source/coverage共同变化；论文必须保持“implemented policy contrast”。纯semantic claim需matched ablation。
3. **`disclosedTokenCount`误名**（304）：实际是`message.length`字符，不是tokens；改字段/论文，无需重跑数值，token-matched claim则需重分析或重跑。
4. **GLM输出cap与systematic missingness**：CONTROL-first两次命中768；四个failed tasks跨seed重合。bounds仍负，但缺失机制非随机。保存失败raw并做order test。
5. **跨模型不只换模型**：adapter/normalization/parser/completion/population/arms变化。必须降级措辞；纯swap需新matched run。
6. **GLM seed0 provider provenance缺失**：808 finished attempts无server model/request ID；无法仅靠客户端label确认。seed1/seed2已改进。强provider claim需重跑seed0或只把seed1作为有server provenance证据。
7. **GLM保存的是stripCodeFence后的raw**：不是literal HTTP body；应同时保存transport raw和normalized raw。
8. **dirty source provenance**：seed0/seed1记录sourceBundleHash但不保存bundle；exact source不可从artifact单独恢复。以后archive content-addressed bundle。
9. **context truncation不可证**：无request bytes/max-context/truncation flag。当前token量不大但只能说未观察到，而非证明不存在。

### P2 — Engineering / reproducibility

1. 把audit Python和corruption matrix纳入CI，但与production verifier保持独立依赖边界。
2. 每个attempt保存canonical request JSON、transport raw、normalized raw、parser result、server model/request ID和finish reason；敏感字段可加密后发布hash。
3. manifest使用外部时间戳/签名或append-only对象存储；公开可重算hash不是防篡改机制。
4. variant配置从import-time env拆为显式immutable config object，减少path/model/seed串线风险。
5. 将failure raw放入隔离审计文件，而不是task failed后完全丢弃。

---

## 二十四、12个 yes/no/uncertain

### 1. Round 1 是否真的 simultaneous？

**YES（当前实现）；UNCERTAIN（历史字节）。**

Evidence：每次R1 request固定`visibleTranscript:[]`。Files/lines：`run_v6_fork.ts:408–427`。Test：R1 output permutation后同一request prompt bytes不变；同轮marker不出现。

### 2. Round 2 是否真的 simultaneous？

**YES（当前实现）。**

Evidence：所有agent使用冻结`transcript2`，round2 messages在loop后才并入final。Files/lines：551–611。Test：正/逆R2 output permutation不改变任何R2 outbound prompt。

### 3. Final elicitation 是否真的 private？

**YES（当前实现）。**

Evidence：final response从不写回finalTranscript。Files/lines：617–710。Test：每个final看见全部R2 marker，不见前序final唯一marker。

### 4. 三臂是否真正从 immutable identical state 分叉？

**NO。**

Evidence：causal input按当前writer路径相同，但returned rows共享nested mutable round1 references。Files/lines：528、748–749。Test：deep mutation跨arm可见。

### 5. stateHash 是否覆盖全部 relevant causal state？

**NO。**

Evidence：只含agent probabilities与sorted evidence hashes。Files/lines：114–121。Test：任意替换两arm hash，verifier仍PASS。

### 6. Online pipeline 是否在结构上无法访问 ground truth？

**NO。**

Evidence：task含outcome，runFork持有并读取。Files/lines：adapter 258–277；runner 383–533。Test：当前10-task outbound negative，但不构成结构性firewall。

### 7. 三臂 provider randomness 是否可比？

**YES（客户端配置层）；UNCERTAIN（provider实现层）。**

Evidence：seed derivation不含arm/round/agent。Files/lines：100–108、423–425、562–565、625。Test：task15全部请求同seed；195映射无collision。

### 8. Parser/scorer 是否对所有 arms 完全对称？

**YES（同一batch arms之间）；NO（DeepSeek vs GLM pipeline之间）。**

Evidence：arm共用parser/scorer；GLM有code-fence normalization、parser v1/v2和strict policy差异。Test：golden + 全量GLM raw reparse。

### 9. Missingness 是否不会单独解释主结果？

**YES（就已做的数学bounds/sensitivity而言）。**

Evidence：GLM两seed ±2 bounds全负；DeepSeek complete-all-arm-roster H1/H2全负。Test：独立analyzer。限定：不能证明missing mechanism无偏，只证明其在这些bounds内不能翻号。

### 10. DeepSeek 与 GLM replication 是否保持核心 protocol 等价？

**UNCERTAIN / 部分等价。**

Evidence：相同runFork轮次、fork、pooling、Brier与共同A−C contrast；不同adapter/parser/normalization/completion/population/arms。Files：machine-readable diff。不能回答“只换模型”YES。

### 11. 一个完全独立实现的 analyzer 是否重现所有主要数字？

**YES（结构化结果数字）；NO（全部raw端到端）。**

Evidence：六个主要contrast均重现；GLM raw端重现。DeepSeek无raw final，只能从stored beliefs开始。Test/output：`independent_fork_audit.json`。

### 12. 是否未发现任何单一实现 bug 可以合理解释当前巨大 ATTACKS effect？

**NO。**

Evidence：arm label swap和raw→belief decoupling都能单点制造效应且原verifier接受。Test：corruption 11/18。限定：独立analyzer已在当前GLM raw上排除它们实际发生；DeepSeek历史artifacts不足以同等排除。

---

## 最小下一步（先报告，尚未实施）

1. **零付费修复**：semantic verifier绑定 row/call/raw arm，raw重解析，重算state/fork/disclosure/request hashes，校验provider IDs；online truth-free type；per-arm deserialize snapshot；保存source bundle。
2. **最小order ablation**：8–12个未进入主结果的新tasks，三臂6种order counterbalance，1 seed。只回答order interaction，不扩展工程。
3. **最小强provenance replication**：若在跑的GLM三臂seed2完成，先用独立analyzer审查，再把它作为新的、明确post-hoc的三臂证据；不要与旧两臂偷偷合并成原预注册估计。
4. **若第一篇坚持“原始可复现因果实验”强表述**：需要一个新三臂、truth-free、raw/request-complete run。若接受较窄表述，可保留DeepSeek数字，但必须披露历史raw/provenance限制，并避免“stateHash证明完整状态”“只换模型”“纯semantic direction”等语句。

