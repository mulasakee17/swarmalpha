# GLM-4.6V 三臂扩展分析冻结 V1

状态：在正式 provider 调用前冻结。该文件只 governs `three-arm-seed2` 新实验；不修改 seed-0/seed-1 两臂分析。

## 1. 研究问题

在 GLM-4.6V 上，攻击性证据披露（ATTACKS）是否相对支持性披露（SUPPORTS）改善最终概率决策；以及 ATTACKS 是否相对不披露（CONTROL）改善最终概率决策。

## 2. 设计

- 模型：`zhipu:glm-4.6v`，服务端身份和 provider request id 必须记录；
- 任务：原 V6 prospective roster，排除此前观察过的 task 14；
- seed：2；
- arms：`CONTROL`, `SUPPORTS`, `ATTACKS`；
- 每个 `task × seed` 内 round-1 只运行一次，三臂共享该状态；
- SUPPORTS/ATTACKS 使用全量、去重、按 relation 筛选的证据池；CONTROL 不注入治理证据；
- discussion `max_tokens=768`，final `max_tokens=256`，`thinking=disabled`，并发 1；
- v4-strict：round-1、每臂 round-2 和 final 任一预期 agent 无有效报告，则该 task 记 failed，不产生科学 run 文件；
- 单次 provider attempt，不自动重试；未知 usage 不编码为 0。

## 3. 估计量

统计单位为 task；每个 task 只有一个 seed=2 区块。

- **H1（主）**：`Δ_dir = Brier_ATTACKS − Brier_SUPPORTS`；负值表示 ATTACKS 较优；
- **H2（关键次级）**：`Δ_disc = Brier_ATTACKS − Brier_CONTROL`；负值表示 ATTACKS 较优；
- CONTROL 与 SUPPORTS 的差异仅作为描述性补充，不升级为确认性主结论；
- Brier 为冻结 canonical options 上的多分类 Brier sum，使用每臂 final private belief 的均值。

## 4. 判据与缺失

- task-cluster bootstrap，10,000 次，master seed `0x5EED0F`；
- 完整 task 的 95% CI 全部低于 0：该比较记 `PASS`；CI 跨 0：`DIRECTIONAL` 或 `FAIL` 依预先定义的点估计方向记录；
- failed/skipped task 不删除，进入保守缺失界；每个缺失 task 的 delta 赋值下界 `-2`、上界 `+2`；
- 所有缺失原因、parser failure、provider unavailable、unknown usage、重复 request hash 均原样报告。

## 5. 与已有两臂结果的关系

seed-0/seed-1 两臂结果是已冻结的跨模型基线。本实验是因旧 run 未保存可重建的 relation registry/transcript 而新建的完整三臂扩展。不得把本实验事后改写成原两臂确认性设计；完成后可在第二篇论文中进行标记 batch 的 pooled `ATTACKS−CONTROL` 汇总，并单独报告本实验的 H1。

## 6. 反事实解释

- H1<0 且 H2<0：与方向特异的攻击性披露机制一致；
- H1≈0 且 H2<0：支持“披露有效”，但不能主张方向特异；
- H1/H2 均未检出：GLM 上的机制证据不足；
- H1>0：方向性假设在该模型/seed 下未获支持。

本文件冻结的是估计与审计规则，不预设结果方向。
