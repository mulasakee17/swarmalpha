# 历史实现与研究档案

这里保存已退出默认开发路线的实现、实验及文档。主项目从
[当前研究入口](../docs/ACTIVE_RESEARCH_SURFACE.md) 开始阅读。

| 原位置 | 物理归档位置 |
|---|---|
| `src/runtime/` | `legacy/src/runtime/` |
| `src/lib/discussion/` | `legacy/src/lib/discussion/` |
| `src/lib/thermodynamics/` | `legacy/src/lib/thermodynamics/` |
| `experiments/v2/` | `legacy/experiments/v2/` |
| `experiments/lunar_survival/` | `legacy/experiments/lunar_survival/` |
| `docs/archive/` | `legacy/docs/archive/` |
| 旧架构、已结束的 handoff/Stage-2 计划与旧方法入口 | `legacy/docs/{architecture,plans,research}/`，保留原文件名 |

这是同一 Git 仓库中的目录迁移，迁移前基线为 `c1b5c89`。已有 consumer 的 import 和文件
定位随目录调整，旧实现仍参与兼容性测试；原始实验数据和结果内容保留。文档只修复导航
链接，不借归档改写历史科学结论。旧路径可按本表定位，完整旧布局可从基线 commit 恢复。

仍有一些旧依赖保留在主目录：V6/Measurement 共用执行代码、重放验证、类型和契约，以及
被历史 manifest 引用的 `docs/experiments/` 文件。它们有具体兼容用途，不能仅按年代整体迁走。
`legacy/` 的目录位置不表示已经完成独立打包，也不表示其中代码不会被已有测试或 demo 导入。

归档文件中的历史授权、阈值和研究路线不授予新的执行权限。默认不阅读、不改动、不新增
对旧引擎的依赖；研究新机制时先在当前合同里定义可检验的问题。

2026-09-14 收尾追加归档位于 `docs/archive/closeout_2026-09-14/`；包含旧审计、
旧投稿审查及展示文件，并保留旧清理报告与边界清单的原文。
[逐项迁移映射与保留说明](../docs/cleanup_report.md)列出原路径；归档内的历史路径按原位置解释。
