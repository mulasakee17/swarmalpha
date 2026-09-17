# SwarmAlpha 文档清理报告

日期：2026-08-23（累计记录；新增第一篇论文 V4 清理）

执行依据：`docs/CLEANUP_WHITELIST.md`、`docs/REASONING_PROTOCOL.md`、
`docs/ACTIVE_RESEARCH_SURFACE.md` 和 owner 本轮“提取价值后清理严重过时文档”的授权。

方式：**历史文本优先移动归档；只硬删除可再生缓存、字体备份和本轮临时依赖**。
冻结协议、当前论文证据、原始实验产物和运行代码不因文档时效问题被移动或改写。

## 1. 结果摘要

- 活动 `docs/plans/` 从 13 份降为 2 份；
- 活动 `docs/experiments/` 从 33 份降为 27 份；
- 11 份已完成 handoff 或明确被取代的计划移至 `legacy/docs/archive/plans/`；
- 114 KB、仍以 7 月 v2/Crisis/Supplier 为主的旧 limitations 账本移至 archive；
- 两份根 README 的完整历史版本保留后，重建为当前 V6/第一篇路线入口；
- 8 月 16 日旧清理报告归档，本文件成为当前清理记录；
- 经 owner 本轮“稍微删一些”授权，删除 17 张历史 PDF QA PNG 与 2 个 `.bak` 备份，共 19 个文件、5,013,067 bytes（约 4.78 MiB）；
- `docs/README.md`、`CURRENT_ROUTE_AND_METHODOLOGY.md` 与
  `ACTIVE_RESEARCH_SURFACE.md` 的当前状态冲突得到修正；
- 2026-08-23 追加清理将 18 个已被 V4 取代的论文中间文件移入 archive，并删除
  3 个字体备份、1 个 Python 缓存目录和本轮临时 PDF 依赖目录；无 provider 调用，
  无实验结果改写，英文 V4 权威稿哈希未改变。

## 2. Moved

### 2.1 已完成或被取代的 plans（11）

| 原路径 | 归档路径 | 当前取代者/保留价值 |
|---|---|---|
| `docs/plans/CLAUDE_CODE_SOCIAL_THERMODYNAMIC_RESPONSE_AUDIT_HANDOFF_2026-08-14.md` | `legacy/docs/archive/plans/` | 执行已完成；事实保留在 `V6_SOCIAL_THERMODYNAMIC_RESPONSE_AUDIT_2026-08-14.md` |
| `docs/plans/CLAUDE_CODE_SOURCE_DISCLOSURE_PHASE1_HANDOFF_2026-08-14.md` | `legacy/docs/archive/plans/` | 接线已完成；代码与结果报告保留 |
| `docs/plans/CLAUDE_CODE_SOURCE_DISCLOSURE_PHASE2_EXECUTION_HANDOFF_2026-08-14.md` | `legacy/docs/archive/plans/` | 付费执行与 replication 已完成；结果报告保留 |
| `docs/plans/INTERVENTION_STATE_RESPONSE_MATRIX_V1_2026-08-15.md` | `legacy/docs/archive/plans/` | 状态×动作响应思想已吸收到当前项目发展方案 §5–§6 |
| `docs/plans/MEASUREMENT_GOVERNANCE_CLOSED_LOOP_PROTOCOL_V1.md` | `legacy/docs/archive/plans/` | truth firewall、held-out、简单基线与策略门已吸收到当前方法/发展方案 |
| `docs/plans/SECOND_PAPER_TRUTH_BLIND_ROUTING_PLAN_2026-08-20.md` | `legacy/docs/archive/plans/` | 文件自述 superseded；当前路线先做 State–Response Atlas，再考虑 allocator |
| `docs/plans/SOURCE_DISCLOSURE_SCREEN_PHASE1_IMPLEMENTATION_REPORT_2026-08-14.md` | `legacy/docs/archive/plans/` | 已完成实现记录；运行代码和实验结果仍在活动证据层 |
| `docs/plans/SOURCE_DISCLOSURE_SCREEN_TASK_AUDIT_2026-08-14.md` | `legacy/docs/archive/plans/` | 任务历史的当前边界由 `TASK_CONTAMINATION_REGISTRY_V1.md` 承担 |
| `docs/plans/SOURCE_DISCLOSURE_SCREEN_WIRING_GAP_AUDIT_2026-08-14.md` | `legacy/docs/archive/plans/` | gap 已关闭，代码在位 |
| `docs/plans/SWARMALPHA_INTEGRATED_RESEARCH_EXECUTION_GUIDE_2026-08-14.md` | `legacy/docs/archive/plans/` | 被 2026-08-22 项目发展方案明确取代 |
| `docs/plans/SWARMALPHA_STRATEGIC_EXECUTION_PLAN_V1.md` | `legacy/docs/archive/plans/` | 旧状态仍称“未来工作权威”，与当前 owner-confirmed 方案冲突 |

活动 `docs/plans/` 现在只保留：

1. `SWARMALPHA_PROJECT_DEVELOPMENT_PLAN_2026-08-22.md`；
2. `TASK_CONTAMINATION_REGISTRY_V1.md`。

### 2.2 其他严重过时入口（4）

| 原路径 | 归档路径 | 原因 |
|---|---|---|
| `docs/cleanup_report.md`（2026-08-16） | `legacy/docs/archive/cleanup_report_2026-08-16.md` | 保留上次 63-file 清理溯源；由本报告取代当前状态 |
| `docs/paper/LIMITATIONS.md` | `legacy/docs/archive/paper/LIMITATIONS.md` | 114 KB 历史账本，主叙事仍是 7 月 v2/Crisis/Supplier/GLM-4-flash；当前局限以 V3.2 论文、supplement、V6 审计和当前方法为准 |
| `README.md`（旧长版） | `legacy/docs/archive/README_LEGACY_PRE_V6_2026-08-22.md` | 顶部虽警告正文历史化，但主体仍把 169 个 v2 实验、630 tests 和旧 thermodynamics runtime 当当前项目 |
| `README_CN.md`（旧长版） | `legacy/docs/archive/README_CN_LEGACY_PRE_V6_2026-08-22.md` | 同上 |

### 2.3 被新 freeze 或当前证据取代的实验材料（6）

| 原路径 | 归档路径 | 取代者/原因 |
|---|---|---|
| `docs/experiments/FIRST_PAPER_BELIEF_TRAJECTORY_ANALYSIS_FREEZE_V1.md` | `legacy/docs/archive/experiments/` | V2 correction freeze；V1 仅保留原始审计溯源 |
| `docs/experiments/V6_SOURCE_DISCLOSURE_SCREEN_RESULTS_2026-08-14.md` | `legacy/docs/archive/experiments/` | non-confirmatory screen 已完成，当前第一篇路线不再以它作主线 |
| `docs/experiments/V6_SOURCE_DISCLOSURE_REPLICATION_RESULTS_2026-08-14.md` | `legacy/docs/archive/experiments/` | non-confirmatory replication 结果保留为历史证据 |
| `docs/experiments/V6_VERDICT_EXPLORATORY_ARTIFACT_MANIFEST_2026-08-13.md` | `legacy/docs/archive/experiments/` | exploratory artifact 的历史完整性清单；当前主证据使用 V3.2/fork manifests |
| `docs/experiments/V6_VERDICT_EXPLORATORY_RESULTS_2026-08-12.md` | `legacy/docs/archive/experiments/` | 已被 confirmatory V2/V3 结果与 task-heldout 结果取代 |
| `docs/experiments/V6_VERDICT_RANDOMIZED_CONTINUATION_RESULTS_2026-08-13.md` | `legacy/docs/archive/experiments/` | exploratory continuation；不再是当前实验路线 |

## 3. 提取并保留的有效信息

旧文档不是整份丢弃。以下仍成立的原则已进入当前入口：

- action × state → independently scored response，而不是“再试一个干预”；
- online truth firewall 与 offline resolution/scoring 分离；
- task/leakage-family 作为推断与 held-out 边界，多 seed 不等价于新任务族；
- 状态表示必须胜过 confidence、disagreement、task-feature 和常数基线；
- consensus、entropy、stability 和 exact reuse 不是 outcome quality；
- `H_E/kappa V1` 已 STOP，不能作为当前 detector 或控制信号；
- 第一步只允许一个最小 neutral/labeled 机制分解，LOO 延后到 AAMAS 后；
- 第一篇 V3.2 是可恢复安全基线，后续失败不得反向修改旧结果。

这些内容现由以下活动文档承载：

- `README.md` / `README_CN.md`；
- `docs/README.md`；
- `legacy/docs/research/CURRENT_ROUTE_AND_METHODOLOGY.md`；
- `docs/plans/SWARMALPHA_PROJECT_DEVELOPMENT_PLAN_2026-08-22.md`；
- `docs/plans/TASK_CONTAMINATION_REGISTRY_V1.md`。

## 4. 活动引用修复

- 历史 social-thermodynamic 与 source-disclosure 结果报告现在明确链接
  `legacy/docs/archive/plans/` 中的原冻结 handoff；
- 两个历史 runner/analyzer 只修改了文档注释路径，没有运行语义变化；
- whitepaper 与 heterogeneous contract 对旧战略计划的链接改到 archive，并标为历史；
- architecture/CODE_MAP/AUDIT 对旧 limitations 的链接改到 archive；
- archive README 的“当前执行权威”改为 2026-08-22 项目发展方案，并声明归档文件中的
  `CURRENT/FINAL/AUTHORIZED` 不授予当前权限。

## 5. Deleted

本轮唯一硬删除范围是明确可再生的渲染/备份产物：

- `legacy/docs/archive/paper_rewriting/pdf_qa/page-01.png` … `page-11.png`（11 个）；
- `legacy/docs/archive/paper_rewriting/aamas_cut_pdf_qa/page-1.png` … `page-6.png`（6 个）；
- `legacy/docs/archive/paper_rewriting/final_paper/aamas_cut.zh.docx.bak_fonts`；
- `legacy/docs/archive/paper_rewriting/final_paper/main.tex.bak_measurement_governance`。

合计 19 个文件、5,013,067 bytes。删除理由：这些是 PDF/源码可重新生成的视觉 QA
渲染物或历史备份，不是实验数据、freeze、论文源文件或唯一分析输出。两个空 QA
目录也一并移除。除此之外没有硬删除；历史文本与实验报告仍在 `legacy/docs/archive/`，可恢复。

## 6. Protected surfaces

未移动或删除：

- `paper_rewriting_output/final_paper/**` 与第一篇 freeze/claim/evidence 文件；
- 活动 `docs/experiments/` 中仍在使用的实验事实、freeze 和 replay 报告；本轮移动的 6 份历史分析见 §2.3；
- `experiments/campaign/pilot_output/**`；
- `src/lib/{epistemic,governance,experimentation}/**`；
- `experiments/campaign/{v6,measurement}/**` 的运行实现；
- `test/**`、`legacy/experiments/v2/**`、`legacy/experiments/lunar_survival/**`；
- 顶层配置、密钥、`.git/**`。

Tier-3 导航/架构文档没有被移动或删除。为修复已证实的时效冲突，
`ACTIVE_RESEARCH_SURFACE.md` 和两个 architecture 索引只做了当前状态/链接维护；
这是一项显式披露的导航修正，不是历史证据改写。两个 V6 TypeScript 文件只改注释路径。

## 7. UNCERTAIN — 本轮保守未动

| 路径 | 原因 |
|---|---|
| `docs/PITCH.html`、`docs/PITCH.pdf`、`docs/PITCH_preview.png` | 明显较旧，但可能仍是展示资产；没有当前替代 deck 决策 |
| `docs/paper/AAMAS_SUBMISSION_CHECKLIST.md` | 日期旧，但仍可能提供官方投稿检查项；当前 final-paper checklist 是否完全取代需逐项对照 |
| `docs/AUDIT_CLAIM_VERIFICATION.md` | 已明确标注历史快照，且是缺陷修复溯源；不应仅因旧而归档 |
| `legacy/docs/architecture/AGENT_SOCIETY_VISION.md` | 长期愿景而非当前证据，受 architecture 保护；需单独战略审查，不在清理任务中改写 |
| `docs/experiments/EXPERIMENT_LOG.md` | 没覆盖最新全部 fork/GLM 批次，但作为追加式历史日志仍有价值；应另做日志续写而非归档 |

## 8. 当前文档入口

```text
README.md / README_CN.md
  -> docs/README.md
  -> docs/ACTIVE_RESEARCH_SURFACE.md
  -> docs/research/CURRENT_ROUTE_AND_METHODOLOGY.md
  -> docs/plans/SWARMALPHA_PROJECT_DEVELOPMENT_PLAN_2026-08-22.md
```

实验事实仍必须下钻到对应 freeze、结果、manifest、分析输出与原始 artifact；导航清爽
不等于证据被合并成一份叙述。

## 9. 2026-08-23 第一篇论文 V4 追加清理

### 9.1 Moved（18 个）

归档根目录：`legacy/docs/archive/paper_rewriting/v4_cleanup_2026-08-23/`。

| 原路径 | 归档位置 | 取代者/理由 |
|---|---|---|
| `paper_rewriting_output/final_paper/CLAIM_AUDIT.md` | `final_paper_legacy/` | V4 `claim_register.md`、`results_validation.md` 与 `reviewer_audit.md` 已承担当前主张审计 |
| `paper_rewriting_output/final_paper/CLAIM_CONSISTENCY_AUDIT.md` | `final_paper_legacy/` | V4 integrity audit 与结构化红队取代当前用途 |
| `paper_rewriting_output/final_paper/CLAIM_STATUS_TABLE.md` | `final_paper_legacy/` | 当前 claim register 与 V4 freeze 取代 |
| `paper_rewriting_output/final_paper/FINAL_SCIENTIFIC_CHANGELOG.md` | `final_paper_legacy/` | 历史 V2/V3 变更记录；V4 freeze 成为当前状态 |
| `paper_rewriting_output/final_paper/SCIENTIFIC_CHANGELOG.md` | `final_paper_legacy/` | 同上 |
| `paper_rewriting_output/final_paper/FINAL_SUBMISSION_CHECKLIST.md` | `final_paper_legacy/` | 当前候选包 `AUTHOR_ACTION_CHECKLIST.md`、`SUBMISSION_READINESS.md` 与 submission check 取代 |
| `paper_rewriting_output/final_paper/PROJECT_EXPLANATION.md` / `.pdf` | `final_paper_legacy/` | 旧项目解释版；由 V4 英文稿和新中文教授审核版取代 |
| `paper_rewriting_output/final_paper/figure1.svg` | `final_paper_legacy/` | 当前正文使用 `figure2_forest.png` 与 `figure3_trajectory.png`；SVG 可由旧脚本再生 |
| `paper_rewriting_output/reviews/{methods,contribution,clarity}_review.md` | `reviews_legacy/` | 旧一轮评审；当前三份独立输出位于 `review_prompts/*_review_output.md`，综合结论在 `structured_review.md` |
| `paper_rewriting_output/review_prompts/{dispatch,methods_reviewer,contribution_reviewer,clarity_reviewer}.md` | `review_prompt_inputs/` | 已完成的生成式提示输入；保留审稿输出与综合报告，提示原文归档以减少活动面噪声 |
| `paper_rewriting_output/aamas_cut_manifest.md` | `aamas_cut_legacy/` | 旧中文切片流程已被 `submission_package/aamas_2027_candidate/` 取代 |
| `paper_rewriting_output/build_aamas_cut.py` | `aamas_cut_legacy/` | 同上；历史构建脚本归档而非删除 |

### 9.2 Deleted（仅可再生文件）

- `paper_rewriting_output/final_paper/paper.docx.bak_fonts`；
- `paper_rewriting_output/final_paper/paper.zh.docx.bak_fonts`；
- `paper_rewriting_output/submission_package/aamas_2027_candidate/paper.docx.bak_fonts`；
- `paper_rewriting_output/__pycache__/`；
- `tmp/paper_spine_pydeps/`。

删除理由：前三者是 Word Guard 自动生成的字体备份，当前 DOCX 均在位且已通过检查；
`__pycache__` 可由 Python 自动再生；`paper_spine_pydeps` 是本轮临时安装、仅用于一次性
PDF 重建的依赖副本，正式 PDF 已生成并校验。

### 9.3 新中文教授审核版

旧 `paper.zh.md` 与 `paper.zh.pdf` 内容落后于 V4，并错误地把提示成分实验写成尚未运行。
本轮没有归档后继续保留旧二进制，而是直接以 V4 证据重建：

- `paper_rewriting_output/professor_review_zh/swarmalpha_professor_review.zh.md`；
- `paper_rewriting_output/professor_review_zh/swarmalpha_professor_review.zh.docx`；
- `paper_rewriting_output/professor_review_zh/swarmalpha_professor_review.zh.pdf`；
- `paper_rewriting_output/professor_review_zh/swarmalpha_professor_review.zh.tex`。

中文稿是面向教授审核的适配版，不是英文稿逐句翻译，也不取代 `paper.en.md` 的权威地位。
因此它独立放在 `professor_review_zh/`，不伪装成 PaperSpine 的正式双语翻译包；构建脚本也只写入该目录，
不再覆盖英文 `main.tex`。

### 9.4 Kept / Whitelist untouched

- Tier 0–6 保护面均未移动或删除；
- `paper.en.md`、英文 `main.tex`、`supplementary.md`、英文 PDF/DOCX 与 V4 freeze 全部保留；
- 历史 V1–V3.2 freeze 文件保留，未把历史证据改写成当前证据；
- 三份当前独立红队输出、`structured_review.md` 与 `reviewer_audit.md` 保留；
- `experiments/campaign/pilot_output/**`、V6 代码、测试和原始分析产物均未触碰；
- `CHANGELOG_PRE_SUBMISSION.md` 受 Tier 1 白名单保护，未移动。

### 9.5 UNCERTAIN

以下材料虽然较旧，但仍承担历史或过程溯源作用，本轮保守保留：

- `FIRST_PAPER_FREEZE_2026-08-20.md` 至 V3.2 的历史 freeze；
- `CROSS_MODEL_*REPORT*` 与 `FIRST_PAPER_STAGE2_SOURCE_REPORT_2026-08-22.md`；
- PaperSpine 的 dossier、matrix 和 gate 报告；
- `build_first_paper_*`、`build_aamas_candidate.py` 与当前图表生成脚本。

### 9.6 No-touch violations

无。英文 `main.tex` SHA-256 仍为
`0426256580e84bf8a0080feaceecba5f5e47d525bcb68387601e844d13a6bf82`，
与 V4 freeze 一致。
