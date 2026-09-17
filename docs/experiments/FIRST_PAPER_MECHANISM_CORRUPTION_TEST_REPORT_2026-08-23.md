# First-paper mechanism V1 — corruption-test report (2026-08-23)

Status: zero-network corruption matrix complete; Codex review passed with one claim clarification
Handoff: `legacy/docs/plans/CLAUDE_CODE_MECHANISM_V1_CORRUPTION_TEST_HANDOFF_2026-08-23.md`

## 1. Files created

| File | Purpose |
|---|---|
| `test/v6-mechanism-corruption-matrix.test.ts` | Zero-network corruption matrix (14 test cases covering the 18 required corruption/identity items) |
| `docs/experiments/FIRST_PAPER_MECHANISM_CORRUPTION_TEST_REPORT_2026-08-23.md` | This report |

No existing file was modified. All fixtures were created under the OS temp
directory (`os.tmpdir()` via `mkdtempSync`) and removed in `finally` blocks.

## 2. Corruption cases and results (18/18 rejected or asserted as required)

| # | Case | Expected invariant | Result |
|---|---|---|---|
| 1 | Ledger invalid JSON line | `mechanism_ledger_invalid_json_line:2` | PASS (rejected) |
| 2 | Finish without start | `mechanism_ledger_finish_without_start` | PASS (rejected) |
| 3 | Duplicate attempt ID | `mechanism_ledger_duplicate_attempt_id` | PASS (rejected) |
| 4 | Duplicate finish | `mechanism_ledger_duplicate_finish` | PASS (rejected) |
| 5 | Finish/start request identity mismatch (requestHash, requestId, sequence) | `mechanism_ledger_finish_identity_mismatch` | PASS (rejected, all three axes) |
| 6 | Unfinished attempt remains observable | audit reports `unfinishedAttemptIds=["a1"]`, started=2, finished=1 | PASS (observable) |
| 7 | Non-empty ledger refuses resume | `mechanism_ledger_existing_refuse_resume`; empty ledger usable | PASS (rejected/usable) |
| 8 | Provider trace records terminal error without losing request identity | attempt has `status:"error"`, `errorCode`, `sequence`, `requestId`, `requestHash`, `startedAt`, `finishedAt`; durable ledger closed as error with matching identity | PASS |
| 9 | Manifest body hash tampering | `mechanism_manifest_hash_mismatch` | PASS (rejected) |
| 10 | Registered task-file content tampering | `mechanism_manifest_file_hash_mismatch` | PASS (rejected) |
| 11 | Unregistered `.json` file | `mechanism_manifest_unregistered_file:extra.json` | PASS (rejected) |
| 12 | Registered file missing | `mechanism_manifest_missing_file` | PASS (rejected) |
| 13 | Manifest bound to wrong plan hash | `mechanism_manifest_plan_mismatch` | PASS (rejected) |
| 14 | Execution identity source-file hash changes when an isolated temp fixture changes | identity content hash and the mutated file's `contentHash` change; other entries unchanged | PASS |
| 15 | Execution identity no-overwrite conflict | identical write idempotent; hash-valid different identity → `mechanism_execution_no_overwrite_conflict` | PASS |
| 16 | Canary vs formal plans distinct (refs, task sets, budgets, hashes, output dirs) | `mechanism-canary-plan` vs `mechanism-plan`; `[14]` vs 44 tasks; 28/50400/150000 vs 1211/2179800/3000000; different content hashes; different output dirs | PASS |
| 17 | Task 14 never in formal roster | `canaryTaskId===14`; `formalTaskIds` (44 unique) exclude 14; canary `taskIds===[14]` | PASS |
| 18 | No code path reads `.env`, calls a provider, or writes an experiment output dir | static scan of 7 production modules: no `process.env`, `.env`, `fetch(`, `http(s)://`; plan output dirs not created by the run (all fixtures under tmpdir) | PASS |

## 3. Acceptance commands and exit codes

| Command | Exit code | Result |
|---|---|---|
| `npx tsc --noEmit` | 0 | no type errors |
| `npx vitest run test/v6-mechanism-corruption-matrix.test.ts --no-file-parallelism` | 0 | **14 passed / 14** (vitest v4.1.10). Note: in the sandboxed shell the first invocation hit vite's Windows realpath helper `spawn EPERM`; the same command rerun with a wider sandbox passed unchanged. |
| `git diff --check` | 0 | clean; only pre-existing LF/CRLF line-ending warnings |

The 18 required items are covered by 14 `it()` blocks (case 5 covers three
identity-mismatch axes; cases 9–13 share one manifest fixture; case 16 and 17
share plan-identity assertions). All temp directories were removed in
`finally`; no fixture touched `pilot_output` or any repository path.

## 4. Blocker

**No blocker.** Every corruption case was rejected by the existing production
modules with the expected fail-closed error; no core defect in the
Codex-owned modules was exposed, so no production code change was needed and
no stop-and-report fixture was raised. The one test-side fix (restoring a
tampered manifest with direct file writes instead of the no-overwrite writer)
was a test-fixture correction, not a production change.

## 5. Declarations

- No provider API was called; no `.env` or credential was read or printed; no
  canary or formal experiment was run; no retry/resume logic, CLI execution, or
  background process was started.
- No existing file, production module, provider adapter, runner, prompt,
  parser, paper source, README, dependency, or `pilot_output` artifact was
  modified. Only the two allowed files were created.

## 6. Codex review

Codex independently reran TypeScript checking and the named test: exit 0 and
14/14 passed. Cases 1–17 exercise the reported fail-closed behavior directly.
Case 18 has a narrower interpretation: its static scan and temporary-directory
checks establish that this corruption-test package itself is zero-network and
does not directly read credentials or write planned output directories. It
does not prove that the future GLM execution runner cannot call a provider;
that runner is intentionally the paid boundary and requires separate preflight
and authorization. No production defect was found by this review.
