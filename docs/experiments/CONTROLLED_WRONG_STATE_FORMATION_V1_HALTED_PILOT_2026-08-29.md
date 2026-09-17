# Controlled Wrong-State Formation V1 Halted Pilot

日期：2026-08-29  
状态：**HALTED_FAIL_CLOSED — CURRENT V1 NO-GO**

## 1. 执行事实

本批使用冻结的 4-cluster/8-variant、`ISOLATED vs PEER` formation plan，原计划
160 次 GLM-4.6V 调用。执行在 sequence 56 自动停止：

- provider attempts：56/160；
- provider responses：56；
- sequence 1--55 通过冻结的 two-field strict parser；
- sequence 56 返回合法 JSON，但额外包含 `opt_1/opt_2/opt_3` 三个顶层字段，
  触发 `controlled_choice_fields_invalid`；
- retry：0；剩余 104 个 cells 未调用；
- 已使用 44,652 prompt tokens、5,292 completion tokens、49,944 total tokens；
- `run.json` 与 `analysis.json` 未生成，预声明 primary estimand 不可计算。

原始证据保存在输出目录的 `attempts.jsonl`；停止摘要保存在
`execution-failure.json`。failure response hash 为
`sha256:ed855bcd5e145bfab53f2805b8a2a22f3f651b9a05225455ba10bd7df19759a5`。

## 2. Instrument failure 不是单一多字段问题

sequence 43 与 56 的 completion usage 都恰好达到冻结的 512-token ceiling。
sequence 43 虽然通过 exact two-field parser，但 rationale 中反复自我修正，最终
文本推理支持 `opt_2`，顶层 `choiceId` 却仍为 `opt_1`。因此：

- **FACT**：strict JSON 合法不保证 choice 与 rationale 语义一致；
- **FACT**：至少两个 response 受到 completion ceiling 影响；
- **INFERENCE**：仅把 parser 改为忽略额外字段，会保留 capped/self-contradictory
  observations，不能修复测量有效性；
- **DECISION**：不得把 sequence 56 手工裁成 two-field response，也不得从 57
  继续并把混合 parser 的结果当成同一冻结协议。

## 3. 已完整 task cluster 的局部观察

industrial-cooling base 与 option-identity mirror 共 40 个 cells 完整有效。选择
直方图如下：

| Variant | X0 | ISOLATED R1 | ISOLATED R2 | PEER R1 | PEER R2 |
|---|---|---|---|---|---|
| base | 2/1/1 (`opt_1/2/3`) | 2/1/1 | 2/1/1 | 2/1/1 | 2/1/1 |
| mirror | 1/2/1 | 1/2/1 | 1/2/1 | 1/2/1 | 1/2/1 |

这是 **development-only partial observation**，不是 task-cluster replication 或
总体效应。它显示该 cluster 中每个 agent 的公开选择跨两臂、两轮完全持久；没有
wrong supermajority formation，也没有可见 peer-conditioned choice movement。

network-incident base 只完成到 PEER R1，且 X0 agent 3 是 capped、choice/rationale
不一致的 response，sequence 56 又 parser-invalid。因此该 variant 不进入任何
formation outcome 计算。其局部轨迹只能用于 instrument diagnosis。

## 4. 科学诊断

当前 V1 把 model-facing evidence 直接表示为 additive numeric scores，并明确要求
“只累加供应给你的 evidence cards”。这带来两个问题：

1. 任务更像确定性算术执行，而不是群体讨论；第一完整 cluster 的逐 agent choice
   因此机械持久。
2. PEER arm 提供的是其他 agent 的 choice/rationale，而不是正式 evidence card。
   在当前指令下，peer content 很可能不具有与 private card 可比较的证据地位。

所以当前 V1 即使完整跑完，也难以区分“peer interaction 没有效应”和“prompt 从
定义上要求 agent 忽略 peer 作为可累计证据”。这属于 treatment validity 问题，
不能靠扩大样本解决。

## 5. 裁决

**NO-GO for current V1.** 不调用剩余 104 cells，不放宽 parser，不补单个失败
cell，不将 55 个 valid rows 伪装成完整实验。

若设计 V1.1，最小修改应是：

- numeric diagnostic scores 只留在离线 task constructor，不进入 model prompt；
- online agents 只看到自然语言 observation 与 source/lineage identity；
- prompt 明确 peer message 是可评估的二手报告，而不是 ground truth；
- rationale 限两句或 80 words；提高 completion ceiling，并把“命中 ceiling”
  直接判 invalid；
- 先跑一个 20-call 单 variant instrument/interaction canary。只有 zero invalid、
  X0 非错误 supermajority 且 PEER/ISOLATED 都按预期生成可解释轨迹，才重新冻结
  8-variant formation batch。

V1.1 属于新协议和新预算，不继承 V1 的 confirmatory 权限；V1 的 56 attempts
必须永久保留为 development evidence。
