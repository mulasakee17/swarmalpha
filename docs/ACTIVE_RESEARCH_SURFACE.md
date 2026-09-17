# SwarmAlpha：接手只读这一页

Status: normative navigation / RESEARCH STOPPED — HANDOFF ENGINEERING ONLY
Updated: 2026-09-17

## 1. 当前到底是什么

已有实证问题：非对称信息的有限选项任务中，从共同讨论起点改变材料曝光包或标签呈现，如何改变概率报告与离线 Brier 损失。
第一篇有 DeepSeek／GLM 的记录条件下比较；固定臂顺序、缺失及一般重呈现对照不足限制机制解释。
它没有证明模型内部认知、纯社会影响、通用救援规则或在线治理策略。

V0 多通道描述器已实现，Q2-S 的 15 对合成状态只支持观察 canary 资格。X0 调用／隔离／持久记录边界已实现，无本轮真实结果。
本次授权仅为薄离线 probe、交接检查、文档压缩与 GitHub 推送；不自动恢复 X0、引擎扩建、provider 调用或投稿。

## 2. 安装与无网络检查

建议 Node 22 LTS（22.13+）或 Node 24；在仓库根目录执行：

```sh
npm ci
npm run check:handoff
npm run probe:semantic -- --help
```

检查覆盖 V0、X0、共享调用边界、机制任务 mock 和 semantic probe，并执行类型检查。测试阶段不需要密钥、不调用模型。

## 3. Jev 薄接口：只做离线配对

先用仓库自带合成样例检查路径；它不是研究数据或模型效果证据：

```sh
npm run probe:semantic -- --artifact test/fixtures/semantic-probe-task.json --out results/semantic_probe/prepare-synthetic
```

换成完整真实机制 artifact 路径即可复用旧记录；合成／真实来源在输出中明确区分。
默认零网络；输入／输出目录由操作者指定，输出目录必须全新。真实调用需另行明确批准，配置 `TYPESAFE_API_KEY`，并显式追加 `--execute --max-calls 12`（本例），另用全新输出目录。
只支持单任务完整记录，最多 24 次调用，无 retry/resume；中断的 started 保持未知，调用失败即停止。
probe 使用该 agent 原始第二轮提示词；不把整份快照、其他人的私有包、原始答案响应或答案键发送给 Jev。比较同轮 CONTROL／NEUTRAL／LABELED 报告，保留缺失与原始 probe 响应。
`ΔAgent − ΔProbe` 仅为外部模型响应差异，不是社会影响。当前不做 outcome scoring、控制建议或通用 observer。

复用官方 MIT `@typesafe-ai/sdk@0.6.0`（无运行时依赖、支持 Node／Windows），固定 host、关闭日志与重试；Python adapter 不适合此 TypeScript 路径。
SDK 刚发布、维护历史短，尚未建立本项目效度或安全保证；接口依据[官方 API](https://docs.typesafe.ai/api)，模型使用移动别名 `jev-latest`，记录返回模型但不能排除别名内部更新。
接手人先证伪关键证据敏感性、干扰稳健性及相对普通结构化判读／简单基线的增量价值，失败即放弃该工具。

## 4. 按任务找代码／合同

| 要做什么 | 唯一入口 |
|---|---|
| 看／改 probe | `src/lib/experimentation/semanticProbe.ts`；`experiments/campaign/probe_semantic.ts`；`test/semantic-probe.test.ts` |
| 核对 V0 语义 | `src/lib/epistemic/collectiveDecisionProcessState.ts`；[V0 合同](architecture/COLLECTIVE_DECISION_PROCESS_STATE_V0.md) |
| 核对 X0 隔离条件 | `collectiveDecisionProcessObservationX0{,Execution}.ts`（V6）；[冻结合同](plans/COLLECTIVE_DECISION_PROCESS_DESCRIPTOR_ENGINEERING_FIRST_PLAN_V1_2026-09-02.md) |
| 核对合成资格 | [Q0/Q2 合同 §8](plans/COLLECTIVE_DECISION_PROCESS_STATE_Q0_QUALIFICATION_CONTRACT_V1_2026-09-07.md) |
| 看所有者想法 | [研究身份 §13／14](research/SWARMALPHA_RESEARCH_IDENTITY_AND_DESIGN_PHILOSOPHY.md#14-2026-09-17-交接前方向审查与jev候选边界)，不要求通读历史 |
| 查特定实验／其他想法 | [按需目录](README.md)；修改科学解释前读[推理协议](REASONING_PROTOCOL.md) |

## 5. 刻意设计与仓库边界

缺失不是零；注册覆盖不是真相覆盖；来源身份不是独立证据；讨论回应不是因果影响；可观测不是有控制价值。
X0 的观测与公开讨论隔离、gold 离线、无 retry/resume、sensor 后置、P1 行为反应属于处理，都是刻意设计；隔离合同不是 OS 沙箱。
当前核心为 `src/lib/{epistemic,governance,experimentation}` 与 V6／measurement 支持。新 probe 是独立离线读者，仅复用冻结机制 artifact 读取／验证模块，不恢复其运行器，不回流 V0 或 agent。
`legacy/` 只作历史保留和既有兼容依赖；不新增旧引擎依赖或用旧结果背书。仍保留单仓；拆仓须满足提交可追溯、接口与依赖清点、论文材料、秘密／许可、兼容与 CI 责任门槛。

## 6. 交接材料与负责人边界

当前候选稿本地位置：`paper_rewriting_output/submission_package/aamas_2027_candidate/paper.en.md`／`paper.pdf`；PDF 为工作预览，模板、版面、匿名补充包及独立人工审阅未完成。
DeepSeek v3 有 90 个文件／270 条臂记录，早期完整消息不足；后续机制 seed 3 的 40 个任务有逐调用提示词／响应，可供 probe 使用。原始失败、限流恢复与主运行不能混写。
当前 `paper_rewriting_output/` 投稿包仍按 `.gitignore` 的双盲边界不进入公开 Git；历史稿件与部分实验记录已受 Git 跟踪，不能声称整个仓库不含论文。旧本地完整包在 `tmp/handoff_2026-09-17/`，早于此次工程调整，不代表最新源码。2026-09-17 所有者明确决定：当前投稿包与完整交接包不公开，保持本地保留；此决定不追溯删除已经公开的历史材料。

### 6.1 最新决定

负责人完成窄工程调整与交接，保留模型内部、agent 架构、信息传播／放大／衰减／失真的想法；这些愿望仍未立项。Jev 是外部工具，不是模型内部研究的替代成果。
接手人可决定停止、保留、改投或明确恢复。若恢复 X0，先重核模型／区域／费用／预算／runId／phase，首批是 66-call canary，不直接扩跑或当作效应样本。
交接不以新实验成功、Jev 测量合格或投稿完成为前提；旧 NEXT／ACTIVE／AUTHORIZED 与旧会议时间表不构成执行指令。
