# FINAL_SUBMISSION_CHECKLIST — AAMAS 投稿准备

状态：SCIENTIFIC CONTENT FREEZE（V2, 2026-08-21）生效。本清单只跟踪"格式/篇幅/图表/BibTeX/匿名化/语言"。V2 变更（跨模型标题/贡献、Results 3.2 森林图、supplement S15–S21）已反映在 `final_paper/paper.en.md`、`main.tex`、`supplementary.md` 与 submission package 中；哈希见 `FIRST_PAPER_CROSS_MODEL_FREEZE_V2_2026-08-21.md`。

---

## 1. References / BibTeX ✅

- 9 条，全部经 **arXiv 官方 API**（export.arxiv.org）核对完整作者表与标题。
- 产出：[`references.bib`](references.bib)（可直接进 LaTeX）。
- 作者表修正：CAGE-CAL 首作者是 Jiatan Huang（非 Kwon）；Emergent Consensus 单作者 Dongxu Yang；
  Easier-to-Mislead 是 3 作者（Qu/Fu/Hu）；Spark-to-Fire 是 8 作者。
- ⚠️ 待 camera-ready：MAD 与 HiddenBench 的 ICML 页码/DOI（venue 已核实 ICML 2024 / ICML 2026）。

## 2. 主 Figure ✅

- 产出：[`figure1.svg`](./figure1.svg)，双 panel：Panel A = identical-state fork；Panel B = state-dependent
  rescue 散点（45 task-level 点，Spearman ρ = −0.60）。
- 图注要求（已写入正文）：heterogeneity 是 post-hoc exploratory；negative Δ 表示 ATTACKS 更好；
  two-seed 数据先在 task 内聚合。
- ⚠️ 待排版：SVG 需转成 AAMAS 模板可嵌入格式（PDF/矢量）。

## 3. Supplementary ✅（结构见 [`supplementary.md`](supplementary.md)）

- 含 task split、seed0/seed1、prompts、config、round protocol、frozen manifest、content/state hashes、
  evidence registry、per-task/per-seed results、bootstrap、LOTO、exposure-volume、missingness、
  seed-probe、HiddenBench hash、replay 指令。

## 4. AAMAS 模板 + 压页 ⏳

- 内容压缩版：见 `paper.en.md`（已收敛）；AAMAS 短论文若再压，优先删 §3.3 细节 / 部分 related work /
  future work 细节（移入 supplementary），**保留** identical-state fork、seed0/seed1/pooled、Brier 定义、
  state-dependent rescue、detector non-replication、limitations、related-work 定位。
- ⚠️ 待排版：`main.tex` 需从 `article` 换到 AAMAS 模板（acmart/sigconf + anonymous），并切到
  `\bibliography{references.bib}`；环境无 pdflatex，需在 Overleaf 或本地装 TeX 后编译。

## 5. 匿名化 ⏳（双盲）

- 必须移除：作者名、"SwarmAlpha Research"（正文 author 字段）、GitHub/仓库链接、repository metadata、
  supplementary 里的绝对路径与仓库名、acknowledgement。
- 待执行：grep 全文件替换 `SwarmAlpha` → `[anonymized]`；确认无 commit hash / 本地绝对路径暴露身份。

## 6. Claim consistency ✅

- 见 [`CLAIM_CONSISTENCY_AUDIT.md`](./CLAIM_CONSISTENCY_AUDIT.md)。7 类身份全部一致。
- 本轮修正一处统计口径：severity Spearman −0.56（arm-wise，错）→ **−0.60**（paired，对），
  并同步 CI [−0.80,−0.34]、Pearson −0.50、moderate ΔAC −0.11。

## 7. 语言审校 ⏳（仅 grammar/concision/typo/术语统一）

- 待做：通读一遍改 typo 与术语（如 "state-dependent rescue" 全文统一、"round-1" vs "round 1" 统一）。

---

## 交付文件清单

| 文件 | 状态 |
|---|---|
| `paper.en.md`（冻结源）| ✅ 冻结 |
| `references.bib` | ✅ |
| `figure1.svg` | ✅ |
| `supplementary.md` | ✅ |
| `FINAL_SUBMISSION_CHECKLIST.md` | 本文件 |
| `CLAIM_CONSISTENCY_AUDIT.md` | ✅ |
| `main.tex`（需 acmart 换装 + 数字同步）| ⏳ |
| `paper.zh.md`（数字同步）| ⏳ |

> 冻结规则：除 §8 统计口径修正外，未改动任何研究问题/设计/指标/假设/结果/结论/未来工作。
