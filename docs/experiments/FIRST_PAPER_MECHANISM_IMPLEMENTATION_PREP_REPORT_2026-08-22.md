# First-paper mechanism V1 — implementation preparation report (2026-08-22)

Status: low-risk preparation and Codex integration review complete; zero provider
Handoff: `legacy/docs/plans/CLAUDE_CODE_MECHANISM_V1_LOW_RISK_HANDOFF_2026-08-22.md`
Freeze authority: `docs/experiments/FIRST_PAPER_MECHANISM_NEUTRAL_LABELED_FREEZE_V1.md`

## 1. Files created

| File | Purpose |
|---|---|
| `experiments/campaign/v6/mechanismExperimentPlanV1.ts` | Credential-free pure plan builder; canonical SHA-256 hashing; no-overwrite freeze/load |
| `experiments/campaign/v6/mechanismAnalysisMathV1.ts` | Pure in-memory M1/M2/M3 statistics, deterministic bootstrap, M1 classification, missing bounds |
| `test/v6-mechanism-plan-analysis.test.ts` | Synthetic tests (12 cases) covering the handoff test list |
| `docs/experiments/FIRST_PAPER_MECHANISM_IMPLEMENTATION_PREP_REPORT_2026-08-22.md` | This report |

No existing file was modified. Both production modules import existing exports
only (`MECHANISM_ARMS`, `MechanismArmV1`, `MECHANISM_DISCLOSURE_CONTRACT_REF` from
`mechanismDisclosureContractV1.ts`; `MECHANISM_FORK_CORE_REF` from
`mechanismForkCoreV1.ts`; frozen bootstrap constants from the new plan module).
No existing export was changed; no dependency was added; the PRNG is a local
`mulberry32` implementation.

## 2. Verification commands and exit codes

| Command | Exit code | Result |
|---|---|---|
| `npx tsc --noEmit` | 0 | no type errors (test import graph pulls the new `experiments/campaign/v6` modules into checking) |
| `npx vitest run test/v6-mechanism-plan-analysis.test.ts --no-file-parallelism` | 0 | **12 passed / 12** (vitest v4.1.10); first invocation in the sandboxed shell failed with vite `spawn EPERM` (realpath helper), rerun with a wider sandbox passed unchanged |
| `git diff --check` | 0 | clean; only pre-existing LF/CRLF line-ending warnings |

Coverage of the handoff test list: (1) 44 tasks / 1211 calls / three rotated
orders; (2) deterministic hash, changes on any scientific constant; (3) freeze
refuses a conflicting existing plan, idempotent on identical; (4) load rejects a
tampered body/hash; (5) exact M1/M2/M3 on binary-exact synthetic triplets;
(6) duplicate rows, invalid Brier, unknown arm, invalid task id rejected,
incomplete triplets reported as missing; (7) bootstrap byte-for-byte
reproducible; (8) all four M1 classifications; (9) missing bounds use the
planned denominator 44 with `[-2,+2]`; (10) neither production module contains
`process.env`, `.env`, `fetch(`, HTTP, or an invoker reference.

## 3. Frozen constants (verbatim from freeze/handoff)

| Constant | Value |
|---|---|
| model | `zhipu:glm-4.6v` |
| seeds | `[3]` |
| canary task | `14` (excluded from formal task IDs) |
| formal task IDs (44) | `15,16,17,18,19,20,21,22,23,25,26,27,29,30,31,34,35,36,37,38,40,41,42,43,44,46,47,48,49,50,51,52,53,55,56,57,58,59,60,61,62,63,64,65` |
| arms | `CONTROL`, `ATTACKS_NEUTRAL`, `ATTACKS_LABELED` |
| agent positions | 173 |
| planned logical calls | 1211 (= 173 × 7: round-1 once + 3 arms × (round-2 + final)) |
| per-call token estimate | 1800 |
| total planned estimate | 2,179,800 |
| hard stop (observed provider tokens) | 3,000,000 |
| discussion max tokens | 768 |
| final max tokens | 256 |
| thinking | disabled |
| concurrency | 1 |
| arm-order rotation | roster position mod 3: `0 → CONTROL, ATTACKS_NEUTRAL, ATTACKS_LABELED`; `1 → ATTACKS_NEUTRAL, ATTACKS_LABELED, CONTROL`; `2 → ATTACKS_LABELED, CONTROL, ATTACKS_NEUTRAL` |
| bootstrap draws | 10,000 |
| bootstrap seed | `0x5EED0F` |
| practical band | 0.10 (5% of multiclass Brier range [0,2]) |
| M1 / M2 / M3 | `B_LABELED − B_NEUTRAL` (primary) / `B_NEUTRAL − B_CONTROL` (secondary) / `B_LABELED − B_CONTROL` (secondary) |
| M1 classification | `LABEL_BENEFIT` if 95% interval entirely below 0; `LABEL_HARM` if entirely above 0; `PRACTICALLY_SMALL` if entirely inside `[-0.10,+0.10]`; `INCONCLUSIVE` otherwise |
| missing-task bounds | every missing task assigned delta `[-2,+2]`; means over planned denominator 44 |
| disclosure contract ref | `swarmalpha.experiment.v6.mechanism-disclosure-contract@1.0.0` |
| fork-core ref | `swarmalpha.experiment.v6.mechanism-fork-core@1.0.0` |
| output dir (repository-relative; engineering default for Codex confirmation) | `experiments/campaign/pilot_output/v6-fork-mechanism-neutral-labeled-seed3-20260822` |

## 4. Design notes

- **Plan hash**: canonicalized (sorted-key, recursively) JSON of the body with
  the recorded `contentHash` field excluded; no absolute path, no environment
  value, and no timestamp enters the hash. `freezeMechanismExperimentPlanV1`
  fails closed on any existing conflicting plan and is idempotent for an
  identical plan; `loadMechanismExperimentPlanV1` rejects tampered
  body/hash (`mechanism_plan_hash_mismatch`) and stale constants
  (`mechanism_plan_stale`) by comparing against the frozen build.
- **Analysis math**: purely functional over in-memory rows; task is the unit;
  duplicate `taskId:arm` rows, non-finite or out-of-range Brier, unknown arms,
  and invalid task ids fail closed; a complete task requires exactly the three
  frozen arms. Bootstrap is a 10,000-draw percentile resample with a local
  `mulberry32(0x5EED0F)` and linear-interpolation percentiles matching the
  existing GLM three-arm analyzer style. No model pooling, no wrong/correct
  stratification, no significance tests, no I/O, no prose.
- **M1 classification order**: benefit/harm (interval fully off zero) first,
  then practical-small (interval fully inside the band), then inconclusive;
  null interval (no complete tasks) is inconclusive.

## 5. Blocker

**No blocker.** All allowed-file constraints were satisfiable with existing
exports; no frozen constant was inconsistent; no existing core export needed
changing; no command invoked a provider or required secrets; no allowed-file
expansion was needed. The output directory string is an engineering default
(the handoff required a repository-relative output path without specifying the
string); Codex should confirm or replace it before execution, which would
change the plan hash by design.

## 6. Declarations

- No provider API was called; no `.env` or credential was read or printed; no
  canary or formal experiment was run.
- No existing file was modified: no runner, provider adapter, parser, prompt,
  final elicitation, plan, manifest, analysis, raw output, paper source,
  README, package script, or dependency file was touched. No manifest schema
  was invented; provider wiring and final artifact semantics remain
  Codex-owned high-risk work.

## 7. Codex integration review

Status: reviewed and corrected before provider wiring.

The delegated implementation was structurally sound but had two scientific
integration defects that its original tests did not expose:

1. `missingTaskIds` enumerated only task IDs that appeared with an incomplete
   arm set. Planned tasks with no row at all were omitted even though the
   numerical bound used a 44-task denominator.
2. The plan did not bind the analysis freeze document by content hash, and its
   thinking configuration used a boolean rather than the provider-facing
   frozen value `"disabled"`.

Codex corrected these points. Analysis now rejects task IDs outside the frozen
44-task roster and explicitly lists every absent or incomplete planned task.
The plan now records `thinking: "disabled"` and a SHA-256 commitment to
`FIRST_PAPER_MECHANISM_NEUTRAL_LABELED_FREEZE_V1.md`. Array-cycle rejection was
also made fail-closed in plan canonicalization. Updated zero-network checks:

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run test/v6-mechanism-plan-analysis.test.ts test/v6-mechanism-disclosure-contract.test.ts --no-file-parallelism` | 19/19 passed |

No provider, canary, or formal experiment was invoked during this review.
