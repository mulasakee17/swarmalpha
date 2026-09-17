# Claude Code handoff — mechanism V1 low-risk preparation

Status: implementation handoff; zero provider; Codex review required  
Date: 2026-08-22

## 1. Purpose

Implement only the mechanical, independently testable preparation around the
already frozen neutral/labeled mechanism design. Do not make scientific,
architectural, or execution-policy decisions.

Read only these source authorities before editing:

1. `docs/experiments/FIRST_PAPER_MECHANISM_NEUTRAL_LABELED_FREEZE_V1.md`
2. `experiments/campaign/v6/mechanismDisclosureContractV1.ts`
3. `experiments/campaign/v6/mechanismForkCoreV1.ts`
4. `experiments/campaign/v6/run_v6_fork_glm46v_two_arm_v4.ts` — plan/hash style only
5. `experiments/campaign/v6/analyze_v6_fork_glm46v_threearm_seed2.ts` — bootstrap/report style only

Do not inspect legacy experiment directories.

## 2. Allowed changes

Create only:

* `experiments/campaign/v6/mechanismExperimentPlanV1.ts`
* `experiments/campaign/v6/mechanismAnalysisMathV1.ts`
* `test/v6-mechanism-plan-analysis.test.ts`
* `docs/experiments/FIRST_PAPER_MECHANISM_IMPLEMENTATION_PREP_REPORT_2026-08-22.md`

Do not modify any existing file. If an existing export appears insufficient,
stop and report the exact missing symbol rather than editing around it.

## 3. Task A — frozen pure plan

Implement a credential-free, provider-free plan builder with canonical SHA-256
content hashing and no-overwrite plan-file semantics. Freeze exactly:

* model `zhipu:glm-4.6v`;
* seed `[3]`;
* canary task `14`, not in formal task IDs;
* formal task IDs:
  `15,16,17,18,19,20,21,22,23,25,26,27,29,30,31,34,35,36,37,38,40,41,42,43,44,46,47,48,49,50,51,52,53,55,56,57,58,59,60,61,62,63,64,65`;
* arms `CONTROL, ATTACKS_NEUTRAL, ATTACKS_LABELED`;
* 173 agent positions and 1,211 planned logical calls;
* per-call estimate 1,800 tokens; total estimate 2,179,800;
* hard stop 3,000,000 observed provider tokens;
* discussion max 768; final max 256; thinking disabled; concurrency 1;
* arm-order rotation by frozen roster index modulo 3, exactly as the freeze doc;
* references to the disclosure contract and fork-core version IDs;
* analysis bootstrap draws 10,000, seed `0x5EED0F`, practical band 0.10;
* repository-relative output path only; no absolute path in the hash.

Required exports:

* plan interface;
* constants;
* `buildMechanismExperimentPlanV1()`;
* `recomputeMechanismExperimentPlanHashV1(plan)`;
* `freezeMechanismExperimentPlanV1(outputDir)` with fail-closed no-overwrite;
* `loadMechanismExperimentPlanV1(outputDir)` that rejects stale/tampered plans.

No CLI, environment access, API call, provider adapter, retry, resume, manifest,
or result writing in this task.

## 4. Task B — pure analysis math

Implement only pure functions over in-memory rows. Minimum row input:

```ts
{
  taskId: number;
  arm: "CONTROL" | "ATTACKS_NEUTRAL" | "ATTACKS_LABELED";
  finalBrier: number;
}
```

Requirements:

* reject duplicate task/arm rows;
* reject non-finite or out-of-range Brier (`0..2`);
* a complete task requires exactly three arms;
* compute per-task:
  `M1=L-N`, `M2=N-C`, `M3=L-C`;
* compute task-equal means and 10,000-draw task bootstrap intervals using the
  frozen seed;
* primary M1 classification exactly:
  `LABEL_BENEFIT`, `LABEL_HARM`, `PRACTICALLY_SMALL`, or `INCONCLUSIVE` as in
  the freeze document;
* compute planned-denominator worst-case bounds for each contrast using
  `[-2,+2]` for every missing task;
* return the complete task IDs and missing task IDs explicitly;
* no model pooling, wrong/correct stratification, file I/O, plotting, prose
  claims, or significance tests.

Use a small deterministic PRNG local to this file; do not add a dependency.

## 5. Required tests

At minimum test:

1. plan has exactly 44 tasks, 1,211 calls and the three rotated orders;
2. plan hash is deterministic and changes on any scientific constant;
3. freeze refuses a conflicting existing plan;
4. load rejects a tampered body/hash;
5. known synthetic triplets produce exact M1/M2/M3 values;
6. duplicate rows, invalid Brier and incomplete triplets are classified/rejected
   as specified;
7. bootstrap is byte-for-byte reproducible;
8. all four M1 classifications;
9. missing bounds use the planned denominator 44 and `[-2,+2]`;
10. no test or production path reads `.env` or calls a provider.

Run:

```text
npx tsc --noEmit
npx vitest run test/v6-mechanism-plan-analysis.test.ts --no-file-parallelism
git diff --check
```

## 6. Prohibited changes

Do not modify:

* `run_v6_fork.ts` or any prior DeepSeek/GLM runner;
* existing plan, manifest, analysis or raw-output files;
* provider adapters, parsers, prompts or final elicitation;
* `mechanismDisclosureContractV1.ts` or `mechanismForkCoreV1.ts`;
* paper sources, README, package scripts or dependency files.

Do not run a canary or formal experiment. Do not read or print credentials.
Do not invent an execution manifest schema; provider wiring and final artifact
semantics remain Codex-owned high-risk work.

## 7. Stop conditions

Stop without workaround if:

* an allowed file list must expand;
* a frozen constant appears inconsistent;
* the requested math cannot be implemented without changing an existing core
  export;
* tests reveal a defect in the Codex-owned contract/core;
* any command would invoke a provider or require secrets.

The final report must list files created, tests and exit codes, frozen constants,
and any blocker. “No blocker” must be explicit. Codex will review every diff
before provider authorization.

