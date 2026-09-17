# FINAL_SCIENTIFIC_CHANGELOG — scientific-freeze 优化（统计身份 + 因果措辞 + 负结果边界 + References）

> **V2 取代注记（2026-08-21）**：本文件记录 2026-08-20 V1 冻结前的优化历史。V2 已按 `FIRST_PAPER_CROSS_MODEL_FREEZE_V2_2026-08-21.md` 重开封：标题改为 "Identical-State Forks Across Two Model Families"，主贡献升级为跨模型复现表述，"pre-registered" 简写已由 "project-internal prospective specification" 取代，GLM-4.6V 三执行作为核心复现证据纳入正文。本文件作为历史记录保留。

Scope: 只修正统计身份、因果措辞、负结果边界与 References。无新实验/模型/benchmark/detector/
SCDG 实现/RL policy/新干预臂。所有数字不变，只改其统计身份与措辞强度。

## 1. 标题收敛

- "Targeted Rescue" → **"State-Dependent Rescue"**（全文 `targeted` 措辞相应收敛）。
- 理由：本文未实现 truth-blind targeting policy，真正发现是"干预收益随 pre-treatment severity 变化"，
  `state-dependent` 不暗示已实现的路由/targeting 策略。

## 2. Seed 身份彻底分开

- Abstract 明确三句：seed0 = pre-registered confirmatory；seed1 = post-hoc replication；
  pooled = robustness summary，**not a re-labeled pre-registered primary**。
- §2 增加 "identical-state property holds across treatment arms *within each seed*; seed0 与
  seed1 是不同 round-1 实现，彼此不相同"。
- §3.2 明确 severity 跨 seed 聚合方式（先 per-(task,seed) 算 round-1 Brier，再 task 内平均 seed）。

## 3. 因果措辞限定因果对象

- 不再写 "disclosure direction alone causally changes outcomes"。
- 改为："changing the direction-conditioned evidence-disclosure policy causally changes collective
  decision quality **under our experimental protocol**"。
- Introduction 把 "attribute differences to disclosure direction alone" → "attribute differences to
  the post-round-1 disclosure policy rather than differences in prior deliberation"。
- 单模型/单 benchmark/两 seed 限制的是 **external validity**，不否定实验内部因果识别。

## 4. Detector 负结果不写过头

- 不再用 "does not transfer" 或任何 "disproved" 措辞。
- 统一为："the development association does not replicate in our two-seed confirmatory check"。
- 保留数字：development within-task +0.388；confirmatory within-task −0.08；confirmatory 2 runs/task
  vs development 10 runs/task。
- 明确 "failure to replicate is not proof of absence"。
- 最终只得出："this detector is not a validated general-purpose router"。

## 5. good group n=2 禁止外推

- 只写 "little change was observed in the two low-severity tasks"。
- Limitations 明确 "n=2 is too small to establish a non-harm claim, and we do not make one"。

## 6. 收敛 routing / governance 措辞

- "disconfirming disclosure works once failure is identified" →
  "disconfirming disclosure can strongly benefit high-severity states; identifying those states
  truth-blind remains open"。
- "this paper solves one governance policy" →
  "this paper evaluates — and establishes the efficacy of — one direction-conditioned disclosure
  intervention"。

## 7. Evidence coupling 保持 exploratory

- 保持 "more consistent with evidence coupling than with belief alignment, but does not establish
  the distinction"。

## 8. References 联网核验 + 补 SCDG

- MAD venue 核实为 **ICML 2024**（Proceedings of the 41st ICML）。
- HiddenBench 最新版标题核实为 **"Systematic Failures in Collective Reasoning under Distributed
  Information in Multi-Agent LLMs"**（arXiv:2505.11556，ICML 2026），作者 Y. Li, T. Naito, H. Shirado。
- 修正作者表：CHAL=2 作者（Giovannelli & Kent，删除错误 "et al."）；Emergent Consensus=单作者 Yang；
  Easier to Mislead=Qu & Fu；From Spark to Fire=Xie & Zhu；CAGE-CAL=S. Kwon, C. Zhang, S. Li。
- 补 **SCDG**（arXiv:2608.03859，"Beyond Representational Similarity: Source-Conditioned
  Description-Length Gain for Generative Plagiarism Detection and Candidate Source Reranking"），
  因 Future Work 已提及。
- 无法确认的 venue 一律只写 arXiv，不猜。

## 数字一致性声明

- 本轮未改动任何数字。H1/H2/CI/Spearman/severity/detector/accuracy 全部沿用 v3 冻结数据。
- 唯一变化是数字的统计身份标签与措辞强度（向下收敛），无任何向上夸大。
