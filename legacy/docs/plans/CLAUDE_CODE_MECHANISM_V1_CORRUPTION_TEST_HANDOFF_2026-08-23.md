# Claude Code handoff — mechanism V1 corruption-test package

Status: bounded low-risk test work; zero provider; Codex review required  
Date: 2026-08-23

## Purpose

Add adversarial tests around already implemented mechanism V1 integrity
modules. Do not change architecture, scientific definitions, runtime code, or
experiment artifacts.

Read only:

1. `experiments/campaign/v6/mechanismAttemptLedgerV1.ts`
2. `experiments/campaign/v6/mechanismProviderTraceV1.ts`
3. `experiments/campaign/v6/mechanismManifestV1.ts`
4. `experiments/campaign/v6/mechanismExecutionIdentityV1.ts`
5. `experiments/campaign/v6/mechanismExperimentPlanV1.ts`
6. the existing `test/v6-mechanism-*.test.ts` files

## Allowed files

Create only:

* `test/v6-mechanism-corruption-matrix.test.ts`
* `docs/experiments/FIRST_PAPER_MECHANISM_CORRUPTION_TEST_REPORT_2026-08-23.md`

Do not modify existing files. If a test exposes a core defect, stop and report
the failing fixture and expected invariant; Codex will fix production code.

## Required corruption cases

The new zero-network test must cover at least:

1. ledger invalid JSON line;
2. finish without start;
3. duplicate attempt ID;
4. duplicate finish;
5. finish/start request identity mismatch;
6. unfinished attempt remains observable;
7. non-empty ledger refuses resume;
8. provider trace records a terminal error without losing request identity;
9. manifest body hash tampering;
10. registered task-file content tampering;
11. unregistered `.json` or `.jsonl` file;
12. registered file missing;
13. manifest bound to the wrong plan hash;
14. execution identity source-file hash changes when an isolated temporary
    source fixture changes;
15. execution identity no-overwrite conflict;
16. canary and formal plans have distinct refs, task sets, budgets, hashes and
    output directories;
17. task 14 never appears in the formal roster;
18. no code path reads `.env`, calls a provider, or writes to an existing
    experiment output directory.

Use only temporary directories created under the OS temp directory. Remove
them in `finally`. Do not copy, edit, or enumerate credentials.

## Acceptance commands

```text
npx tsc --noEmit
npx vitest run test/v6-mechanism-corruption-matrix.test.ts --no-file-parallelism
git diff --check
```

The report must list each corruption case and whether it was rejected. Include
commands, exit codes, files created, and blockers. Explicitly state that no
provider/canary/formal run occurred.

## Prohibited work

Do not modify or implement:

* any provider adapter or invoker;
* any mechanism production module;
* old V6/DeepSeek/GLM runners or artifacts;
* plan/manifest/output files under `pilot_output`;
* prompts, parsers, task data, paper sources, README or dependencies;
* retries, resume logic, CLI execution or background processes.

