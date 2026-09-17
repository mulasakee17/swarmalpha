# 文档收尾记录

日期：2026-09-14。依据：所有者请求“开始做收尾、清理文档、保留我的想法”。
当前状态与交接见 [ACTIVE_RESEARCH_SURFACE.md](ACTIVE_RESEARCH_SURFACE.md)。
本文件替换旧累计报告；[旧报告原文](../legacy/docs/archive/closeout_2026-09-14/docs/cleanup_report.md)保留。

## 清理结论

清理前 `docs/` 有 97 份 Markdown，其中 59 份为实验记录、16 份为架构合同；
本地论文包有 73 份 Markdown。主要问题是入口状态冲突与过程材料混读，不能按数量删证据。
旧引擎已在 `legacy/`；29 个 src/test 文件含相关 legacy 导入路径，仍有兼容用途。
本次不迁移运行代码或再次拆仓。

README 中英文、项目入口与文档目录现在以停止点、保留想法和论文为接手入口。
X0 与发展方案退出活动队列；agent 指令同步停止状态。旧计划保留全文及日期。
研究身份新增 §13，保存模型内部/agent 架构探索意向、隔离要求与收尾决定；
旧教授指导标为当时转述，避免与最新转述混为当前共识。
白皮书保留正文，修正其指向已归档方法文档的“当前入口”。

## Moved

下表文件完整归档；内容与清理前逐字节一致。历史记录中的原路径按本表定位。

| 原路径 | 现位置 | 退出当前入口的依据 |
|---|---|---|
| `PROJECT_AUDIT_REPORT.md` | [归档](../legacy/docs/archive/closeout_2026-09-14/PROJECT_AUDIT_REPORT.md) | 自述为 7 月历史审计；当前状态由项目入口承担 |
| `docs/paper/AAMAS_SUBMISSION_CHECKLIST.md` | [归档](../legacy/docs/archive/closeout_2026-09-14/docs/paper/AAMAS_SUBMISSION_CHECKLIST.md) | 对象是 7 月旧稿及 E1–E12 补实验路线；当前候选稿与其作者清单已取代该对象 |
| `docs/PITCH.html` | [归档](../legacy/docs/archive/closeout_2026-09-14/docs/PITCH.html) | 旧展示含 219 tests / 89 experiments 等历史状态，不是当前成果介绍 |
| `docs/PITCH.pdf` | [归档](../legacy/docs/archive/closeout_2026-09-14/docs/PITCH.pdf) | 与旧展示成组保留，无新展示任务 |
| `docs/PITCH_preview.png` | [归档](../legacy/docs/archive/closeout_2026-09-14/docs/PITCH_preview.png) | 同上 |

另将旧 `docs/cleanup_report.md` 与 `docs/CLEANUP_WHITELIST.md` 原文复制到归档同名相对位置，
再更新现有入口；不是删除清理史或追加一套新报告。归档文件保留原文字与历史路径，
不把当时声明重新认证为当前事实。

## Deleted

无硬删除。5 项为迁移，2 项为原文快照保留；思想、论文和实验结果均未删除。

## Kept / 本次实际修改边界

- 59 份实验文档、16 份架构文档、5 份 theory 文档保持原位且内容不变。
- 论文包除 `progress.md` 导航外，正文、PDF、图表、来源、分析、冻结和构建材料不变。
- src/test 与 V6 运行代码相对本次清理前不变；先前未提交的接口工作完整保留。
- 顶层 AGENTS/CLAUDE、V6 AGENTS、README、两个计划的状态和研究身份新增记录属于本次
  收尾授权的必要同步；未删原研究纪律，不声称“所有旧白名单文件未动”。
- 更新清理边界中已过时的正文权威位置和禁止更新导航规则；不放宽秘密、代码、数据保护。
- 历史 manifest 哈希原样保留；它们记录冻结时点，不等于活动导航今天仍有相同哈希。

## UNCERTAIN / 按来源用途保留

- `docs/PLATFORM_CAPABILITY_BRIEF.md`、根目录 `PAPER_PROFESSOR_VERSION.pdf`：仍被来源材料引用，
  保留原位，在文档目录明确旧用途，不冒充当前论文或新描述器证据。
- 论文包的历次 freeze、dossier、matrix、review 与构建脚本：保留研究过程和来源关系，
  不按文件名判重复，不将待核实内容包装为已完成评审。
- 长期 theory、候选量、白皮书和发展方案：保留全部想法；存在不等于执行授权。

## 验证与交接边界

清理前对选定文档、论文材料、src/test 与 V6 工作面共 839 个文件记录内容指纹。
5 个迁移文件与 2 个旧文档快照一致；未发现意外文件丢失。
实验文档、架构合同、理论全文、论文内容和运行代码未发生本次内容变更。
检查修改后入口的本地链接与差异空白；本次不运行模型、实验或代码测试。
这次检查验证保留与导航，不重新认证既有科学结果。

工作区尚未提交。论文包及旧审计受既有 Git 忽略规则影响；归档文件和 X0 新文件也尚未提交。
因此仅传远端仓库不能假定包含完整交接材料。本次没有对外发送或删除本地材料。

## 2026-09-17 GitHub 交接补充

本轮按所有者追加要求收紧接手入口：README／README_CN 各 21 行，文档目录 18 行，
权威交接页 73 行。思想全文、冻结合同与原始记录继续保留，未再移动或删除。
新增独立离线 Jev probe 与窄工程检查；真实 provider 实验仍未执行。GitHub 的论文／
完整运行材料分发范围仍需单独明确，当前不能把本地包存在写成公开仓库已含这些材料。
