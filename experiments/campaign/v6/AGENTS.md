# V6 活动面边界

本目录同时保存当前实验、共享执行依赖和历史回放代码。目录名
`v6` 不等于所有文件都是当前开发权限。

开始任何修改前，必须阅读：

- 根目录 `AGENTS.md`；
- `docs/ACTIVE_RESEARCH_SURFACE.md`；
- `docs/REASONING_PROTOCOL.md`（涉及文档或科学解释时）。

## 分类与权限

### ACTIVE_EXPERIMENT

2026-09-14 收尾覆盖：以下是停止前的代码分类，不是当前执行队列。
主动研究已停止；不启动 X0 或 natural-dynamics 调用。恢复须有新的明确用户请求。

当前 descriptor X0（以现行工程计划的精确任务包为限）、discussion-thermometer / natural-dynamics observation 文件、直接
plan/manifest/task-bank/runner/analyzer/evaluator/preflight 及其直接测试。
停止前的即时权限是 monitoring-only；当前只做收尾与材料保留。

### SHARED_STABLE

任何仍被 ACTIVE_EXPERIMENT 导入的 provider adapter、vertical slice、task
adapter、state-space/L4/collective-dynamics helper、diagnostic 或
single-attempt invoker。它们是 live dependencies，不是历史只读代码。

### FROZEN_REPLAY

已完成、失败、否决或退役且没有 active importer 的 V6 runner、analyzer、
manifest、fixture 和结果绑定代码。默认只读，只允许回放或验证既有
artifact。

### UNKNOWN / KEEP_IN_PLACE

只要 importer、动态路径、命令、文档引用、artifact 绑定或未提交状态不
明确，就留在原处并报告，不移动、不重命名、不删除。

## 强制规则

- 任何 provider 执行都需要用户本轮明确授权；plan/preflight/mock/analyze
  不能被误写成 provider 结果。
- 不得从 FROZEN_REPLAY 或 LEGACY_READ_ONLY 向当前路径新增 import。
- 如果当前路径已经依赖候选 frozen 文件，该文件先归入 SHARED_STABLE，不能
  移动。
- 不得重写、拼接、补造或删除结果 artifact 和不完整运行记录。
- 不得修改测试期望来掩盖实现回归。
- natural-dynamics 的工程分类不改变其科学 claim ceiling：它仍是
  same-task、post-development observation-resource evidence，不自动支持
  transport、latent stability、correctness、intervention 或 governance。
- 物理移动前必须完成文件级零引用审计，并由强模型或项目所有者批准。
