# GLM-4.6V 三臂扩展可复用性审计（2026-08-21）

## 结论

**FACT** — seed-0 与 seed-1 的现有 GLM 两臂结果在每个 `task × seed` 内确实共享同一 round-1 状态：39/39 个区块的 `round1StateHash`、`forkInputHashV1`、round-1 request-hash 序列均在 CONTROL 与 ATTACKS 间一致。

**FACT** — 现有两臂 run 文件没有保存完整 round-1 transcript，也没有保存逐条 evidence relation / evidence-id registry。`ForkRow` 只保存了 round-1 概率和 evidence 内容文本；`forkInputHashV1` 是摘要，不能反推出原始 transcript 或 SUPPORTS evidence pool。

**DECISION** — 不能安全地“只补跑 SUPPORTS 后直接拼成同一次三臂执行”。这样会无法证明新增 SUPPORTS 使用的是与旧两臂完全相同的 disclosure registry 和 round-1 transcript。现有两臂结果保持冻结，不修改、不回写。

## 审计范围

| 批次 | 区块 | CONTROL/ATTACKS | round-1 状态一致 | fork 输入一致 |
|---|---:|---:|---:|---:|
| seed-0 V4 | 39 | 39/39 | 39/39 | 39/39 |
| seed-1 V3 | 39 | 39/39 | 39/39 | 39/39 |

task 14 是此前已观察任务，仍不纳入新的 prospective 三臂样本。

## 为什么不能从摘要恢复 SUPPORTS

`round1StateHash` 和 `forkInputHashV1` 只能用于一致性验证，不能逆向生成：

1. round-1 agent message / public transcript；
2. 每个 evidence item 的稳定 `evidenceId`；
3. 每个 evidence reference 的 `supports` / `attacks` relation；
4. 用于 `selectAllEvidenceV1` 的完整 registry。

因此，重新从 task 定义或保存文本猜测 SUPPORTS pool，会把“同一状态分叉”变成未验证的重建，不符合当前项目的 replay / fail-closed 纪律。

## 下一步

新建独立的 GLM-4.6V 三臂扩展计划，完整运行 `CONTROL + SUPPORTS + ATTACKS`，沿用现有模型、提示词、parser、768/256 token caps、thinking disabled 和严格完成策略。三臂分析冻结：

- H1（主）：`Brier_ATTACKS − Brier_SUPPORTS`；
- H2（关键次级）：`Brier_ATTACKS − Brier_CONTROL`；
- 已有两臂结果作为外部冻结基线，不改写其原始估计；
- 新三臂结果可在独立的第二篇论文分析中与旧 `ATTACKS − CONTROL` 做预先声明的 pooled / batch-aware 汇总。

本审计没有发起 provider 调用，也没有修改已有实验目录。
