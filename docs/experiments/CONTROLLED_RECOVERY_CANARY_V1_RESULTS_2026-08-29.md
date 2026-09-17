# Controlled Recovery Canary V1 Results

日期：2026-08-29  
状态：**COMPLETED — NO ESCAPE OBSERVED; NOT A CAUSAL RECOVERABILITY ESTIMATE**

## 1. Protocol

本 probe 从已冻结的 V1.1 `X0` 微观态出发，只向四个 agent 提供一条新的
flow-meter observation：

> An independent flow-meter test reports severe coolant restriction.

该 observation 在 online prompt 中只以自然语言和新 source/lineage identity 出现；
resolver、additive scores 和 `withheld` 标记不进入 prompt。它的“independent”是
当前任务合同中的身份声明，尚未由现实来源或独立采集过程验证，因此不能自动称为
统计独立证据。

这不是 randomized sham 对照，不识别新证据的因果效应；它只回答一个低成本问题：
在这个冻结错误态上，单次新观察是否出现任何 choice-level escape。

## 2. Execution fact

- model：GLM-4.6V；temperature `0`；seed `1`；thinking disabled；
- calls：4/4；unique requests：4；responses：4；retries：0；failures：0；
- completion ceiling hits：0；parser-invalid：0；
- run hash：`sha256:d438c00ddeb47006ee5f4048efb65bafab8026b92b278c982734a3788b457b1b`；
- analysis hash：`sha256:697afdd6b46b2c8d87590357bdc74b707aaffbff32eef2fa9fcf5671454e9270`。

## 3. Finite statistical-physics response

源 checkpoint 与 intervention response 的 choice vector 都是：

`(opt_1,opt_1,opt_1,opt_2)`。

因此：

| Quantity | X0 | After new observation | Change |
|---|---:|---:|---:|
| concentration `C` | 0.75 | 0.75 | 0 |
| raw Potts-style order `m` | 0.625 | 0.625 | 0 |
| pairwise disagreement `D` | 0.5 | 0.5 | 0 |
| switching count/rate | — | 0 / 0 | 0 |
| wrong-agent escape | — | 0/3 | — |
| correct-agent harm | — | 0/1 | — |

这里的 `m` 仍有 `N=4,K=3` 的 finite-size floor 0.25；本表只比较同一 roster，
所以差值为零不受该 floor 影响。

## 4. Agent-level observation

- agent 1、2 仍选择 `opt_1`，并把 severe coolant restriction 重新解释为机械磨损；
- agent 3 仍选择 `opt_1`，坚持 vibration/temperature pattern；
- agent 4 保持原本的 `opt_2`。

这显示新文本被读到并进入 rationale，但没有越过任何错误 agent 的 categorical
choice boundary。它是 output-level robustness observation，不是 latent belief 的
直接测量。

## 5. Scientific decision

**FACT** — 在一个四 agent、一个 task、一个 dose、一个 seed 的有限 probe 中，未
观察到 choice-level escape，且没有 harm。

**INFERENCE** — 该错误超多数在当前 prompt/task/model 组合下对这条新观察表现出
短程 response null；最简单解释是私有 observation 形成的先验/解释框架压过了新信息，
而不是 peer interaction 造成了可逆状态。

**不能得出**：

- 不能称 recoverability 为 0；没有 sham、dose sweep、任务 replication 或真实
  独立来源验证；
- 不能称 susceptibility 为 0。单次 `Delta m=0` 不是 response slope；field 单位
  和多剂量 response surface 尚不存在；
- 不能称这个状态为 attractor/metastable phase；只观察到两轮无活动加一次单次
  信息响应；
- 不能把 observation 的“independent”身份当成已证明的统计独立性。

## 6. Route decision

当前 controlled formation/recovery 路线不具备继续扩大调用的充分证据。保留这组
artifacts 作为：

1. 一个可重放的 wrong-supermajority persistence + single-perturbation null；
2. 一个提示“信息披露不等于状态可恢复”的反例候选；
3. 后续若继续，必须先完成 task semantic review，并采用 carrier/process-matched
   sham 与真正新来源的随机化对照。

因此本 probe 不支持恢复 `ATTACKS/SUPPORTS`、增加相同讨论轮数、拟合
susceptibility，或进入治理策略比较。

