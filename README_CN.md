# SwarmAlpha

[English](README.md)

SwarmAlpha 研究 LLM 多智能体的信息曝光与集体决策：信息不对称的智能体如何在讨论及选定证据曝光后更新概率报告。

长期目标是理解：在无法立即获得真值时，群体何时应获取证据、请求复核或弃权。这仍是研究方向，尚未成为经过验证的在线治理能力。

## 研究与实现

仓库包含受控曝光实验、分析代码、多通道决策过程状态描述器，以及离线语义探针。描述器分别保留概率报告、信息覆盖、讨论利用和来源依赖；这些观测不能据此确立模型内部认知或决策质量。

项目所有者负责研究定义、设计优先级与研究判断，相关决定记录于[研究身份文档](docs/research/SWARMALPHA_RESEARCH_IDENTITY_AND_DESIGN_PHILOSOPHY.md)。项目实现使用 AI 辅助。

## 代表性结果

[V3 报告](docs/experiments/FORK_CONFIRMATORY_RESULTS_V3_2026-08-16.md)记录了使用 DeepSeek Chat 的**后验双 seed 复现**：45 个任务 × 2 个 seed × 3 个实验臂，共 270 条臂记录。seed 0 复用此前运行，seed 1 为新增运行。先在每个任务内跨 seed 取均值，再以 45 个任务为统计单位，得到 **ATTACKS − SUPPORTS 平均 Brier 损失差 = −0.412**，**95% 任务簇 bootstrap 置信区间为 [−0.571, −0.267]**。损失越低越好。

固定实验臂顺序、报告缺失及重新呈现对照不足，限制了机制解释。开发集中的任务内证据复用–Brier 关联未能复现，通用路由仍未验证。完整 V3 原始输出未进入公开 Git。

## 研究演化

SwarmAlpha 从“异质智能体的局部视角如何形成集体决策”出发，尝试在讨论之外建立可检查的数学观测层。共同起点的信息曝光实验把宽泛问题收敛为可检验的处理比较：ATTACKS 的平均 Brier 损失低于 SUPPORTS，反例却说明统一披露规则不足以应对不同任务。独立的[失败预测](docs/experiments/V6_PROCESS_STATE_FAILURE_PREDICTION_AUDIT_2026-08-13.md)与[跨通道审计](docs/experiments/COLLECTIVE_DYNAMICS_D1_CROSS_CHANNEL_CONSTRUCT_AUDIT_2026-08-29.md)，也未支持状态摘要能定位失败、或概率报告比既有公开选择提供更多预测信息的较强主张。这些检验帮助厘清过程描述、结果预测与干预选择的区别。后续工作将信念、信息曝光、显式讨论使用、来源记录和资源分别保留在多通道描述器中，并留下代码、测量合同和负面结果。描述器仍需经验效度验证，通用治理目标尚未实现。

## 证据与链接

- [核心描述器](src/lib/epistemic/collectiveDecisionProcessState.ts) · [V3 分析代码](experiments/campaign/v6/analyze_v6_fork.ts)
- [公开实验轨迹](results/v6_collective_dynamics_trajectory_sensor_v1_glm46v_seed1/public-task-1-seed-1.json)：另一项独立实验的记录，**不是 V3 原始输出**。
- [状态与工程交接](docs/ACTIVE_RESEARCH_SURFACE.md)：**主动研究已停止**；包含安装、离线检查、保留方向及未公开材料的边界。
- [按需文档目录](docs/README.md) · [MIT 许可证](LICENSE)
