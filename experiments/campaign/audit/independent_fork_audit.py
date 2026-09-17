#!/usr/bin/env python3
"""Independent, fail-closed audit of V6 fork result artifacts.

This file deliberately imports no SwarmAlpha modules.  It reads the pinned
HiddenBench JSON and result JSONL directly, validates categorical reports,
recomputes pooled beliefs/Brier losses/effects/LOTO/bootstrap intervals, and
compares those values with stored rows and published analysis files.
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
import struct
from collections import defaultdict
from typing import Any, Callable


ROOT = pathlib.Path(__file__).resolve().parents[3]
DATASET = ROOT / "experiments/campaign/tasks/hiddenbench/benchmark.json"
BOOTSTRAP_SEED = 0x5EED0F
BOOTSTRAP_REPS = 10_000
TOL = 1e-12


def mean(values: list[float]) -> float:
    if not values:
        raise ValueError("mean of empty list")
    return sum(values) / len(values)


def u32(value: int) -> int:
    return value & 0xFFFFFFFF


def imul(a: int, b: int) -> int:
    """JavaScript Math.imul, returned as an unsigned 32-bit bit pattern."""
    return u32(struct.unpack("<i", struct.pack("<I", u32(a)))[0] *
               struct.unpack("<i", struct.pack("<I", u32(b)))[0])


def mulberry32(seed: int) -> Callable[[], float]:
    state = u32(seed)

    def draw() -> float:
        nonlocal state
        state = u32(state + 0x6D2B79F5)
        t = state
        t = imul(t ^ (t >> 15), t | 1)
        t = u32(t ^ u32(t + imul(t ^ (t >> 7), t | 61)))
        return u32(t ^ (t >> 14)) / 4294967296.0

    return draw


def bootstrap_ci(values: list[float]) -> list[float] | None:
    if not values:
        return None
    rng = mulberry32(BOOTSTRAP_SEED)
    n = len(values)
    draws = []
    for _ in range(BOOTSTRAP_REPS):
        draws.append(sum(values[int(rng() * n)] for _ in range(n)) / n)
    draws.sort()
    return [draws[min(n_draws - 1, math.floor(p * n_draws))]
            for p in (0.025, 0.975)
            for n_draws in [len(draws)]]


def validate_probabilities(value: Any, options: list[str], where: str) -> dict[str, float]:
    if not isinstance(value, dict):
        raise ValueError(f"{where}: probabilities not object")
    if set(value) != set(options):
        raise ValueError(f"{where}: option set mismatch: {sorted(value)} != {sorted(options)}")
    out: dict[str, float] = {}
    for option in options:
        p = value[option]
        if isinstance(p, bool) or not isinstance(p, (int, float)) or not math.isfinite(p):
            raise ValueError(f"{where}: non-finite/non-numeric probability for {option!r}")
        if p < 0 or p > 1:
            raise ValueError(f"{where}: probability outside [0,1] for {option!r}")
        out[option] = float(p)
    if abs(sum(out.values()) - 1.0) > 1e-6:
        raise ValueError(f"{where}: probability mass does not sum to 1")
    return out


def brier(probabilities: dict[str, float], options: list[str], answer: str) -> float:
    if answer not in options:
        raise ValueError("answer not in canonical options")
    return sum((probabilities[o] - (1.0 if o == answer else 0.0)) ** 2 for o in options)


def pool(reports: list[dict[str, float]], options: list[str]) -> dict[str, float]:
    if not reports:
        raise ValueError("cannot pool zero reports")
    return {o: sum(r[o] for r in reports) / len(reports) for o in options}


def assert_close(actual: float, expected: float, where: str, tol: float = TOL) -> None:
    if not math.isclose(actual, expected, rel_tol=tol, abs_tol=tol):
        raise ValueError(f"{where}: {actual!r} != {expected!r}")


def parse_final_raw(raw: str, claim_id: str, options: list[str], where: str) -> dict[str, float]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{where}: raw final is not JSON: {exc}") from exc
    if not isinstance(parsed, dict) or set(parsed) != {"status", "reports"}:
        raise ValueError(f"{where}: final top-level shape mismatch")
    if parsed["status"] != "answered" or not isinstance(parsed["reports"], list) or len(parsed["reports"]) != 1:
        raise ValueError(f"{where}: final is not exactly one answered report")
    report = parsed["reports"][0]
    if not isinstance(report, dict) or set(report) != {"claimId", "value"} or report["claimId"] != claim_id:
        raise ValueError(f"{where}: final report/claim mismatch")
    value = report["value"]
    if not isinstance(value, dict) or set(value) != {"kind", "probabilities"} or value["kind"] != "categorical":
        raise ValueError(f"{where}: categorical value shape mismatch")
    return validate_probabilities(value["probabilities"], options, where)


def golden_tests() -> list[dict[str, Any]]:
    cases = [
        ({"A": 1.0, "B": 0.0}, ["A", "B"], "A", 0.0),
        ({"A": 0.0, "B": 1.0}, ["A", "B"], "A", 2.0),
        ({"A": 0.5, "B": 0.5}, ["A", "B"], "A", 0.5),
        ({"A": 0.2, "B": 0.3, "C": 0.5}, ["A", "B", "C"], "C", 0.38),
        ({"A": 0.1, "B": 0.2, "C": 0.3, "D": 0.4}, ["A", "B", "C", "D"], "B", 0.90),
    ]
    results = []
    for index, (probs, options, answer, expected) in enumerate(cases, 1):
        actual = brier(probs, options, answer)
        assert_close(actual, expected, f"golden-{index}")
        results.append({"case": index, "actual": actual, "expected": expected, "pass": True})
    return results


def load_dataset() -> dict[int, dict[str, Any]]:
    data = json.loads(DATASET.read_text(encoding="utf-8"))
    return {int(task["id"]): task for task in data}


def load_rows(directory: pathlib.Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for file in sorted(directory.glob("run_*.jsonl")):
        for line_number, line in enumerate(file.read_text(encoding="utf-8").splitlines(), 1):
            if line.strip():
                row = json.loads(line)
                row["__file"] = file.name
                row["__line"] = line_number
                rows.append(row)
    return rows


def loto(task_effects: dict[int, float]) -> dict[str, Any]:
    values = list(task_effects.values())
    full = mean(values)
    leaveouts = {task: mean([v for other, v in task_effects.items() if other != task])
                 for task in task_effects} if len(values) > 1 else {}
    if not leaveouts:
        return {"full": full, "min": None, "max": None, "mostInfluentialTask": None, "signChanges": False}
    influential = max(leaveouts, key=lambda task: abs(leaveouts[task] - full))
    return {
        "full": full,
        "min": min(leaveouts.values()),
        "max": max(leaveouts.values()),
        "mostInfluentialTask": influential,
        "signChanges": any((value < 0) != (full < 0) for value in leaveouts.values()),
    }


def analyze_directory(directory: pathlib.Path, dataset: dict[int, dict[str, Any]]) -> dict[str, Any]:
    rows = load_rows(directory)
    if not rows:
        raise ValueError(f"{directory}: no result rows")
    manifest_path = directory / "manifest.json"
    plan_path = directory / "plan.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else None
    plan = json.loads(plan_path.read_text(encoding="utf-8")) if plan_path.exists() else None
    planned_tasks = list((plan or manifest or {}).get("taskIds", sorted({int(r["taskId"]) for r in rows})))
    planned_seeds = list((plan or manifest or {}).get("seeds", sorted({int(r["seed"]) for r in rows})))
    expected_arms = list((plan or manifest or {}).get("arms", sorted({str(r["arm"]) for r in rows})))
    errors: list[str] = []
    raw_reparsed = 0
    raw_unavailable = 0
    by_block: dict[tuple[int, int], dict[str, float]] = defaultdict(dict)
    roster_complete: dict[tuple[int, int], dict[str, bool]] = defaultdict(dict)
    for row in rows:
        task_id, seed, arm = int(row["taskId"]), int(row["seed"]), str(row["arm"])
        source = dataset[task_id]
        options = list(source["possible_answers"])
        answer = str(source["correct_answer"])
        where = f"{row['__file']}:{row['__line']}:{arm}"
        roster_complete[(task_id, seed)][arm] = row.get("finalReportedCount") == len(source["hidden_information"])
        try:
            reports: list[dict[str, float]] = []
            raw_responses = row.get("finalRawResponses")
            if raw_responses is not None:
                claim_id = f"claim:hiddenbench:{task_id}:answer"
                for raw_index, item in enumerate(raw_responses):
                    if item.get("arm") != arm:
                        raise ValueError(f"{where}: raw response arm mismatch")
                    reports.append(parse_final_raw(item["rawResponse"], claim_id, options, f"{where}:raw:{raw_index}"))
                    raw_reparsed += 1
            else:
                raw_unavailable += 1
                for report_index, item in enumerate(row.get("finalAgentBeliefs", [])):
                    # Historical DeepSeek rows stored the probability object
                    # directly; newer GLM rows wrap it with agent metadata.
                    probability_object = item.get("probabilities") if isinstance(item, dict) and "probabilities" in item else item
                    reports.append(validate_probabilities(probability_object, options, f"{where}:stored-report:{report_index}"))
            if not reports:
                raise ValueError(f"{where}: cannot pool zero final reports")
            pooled = pool(reports, options)
            stored_pool = validate_probabilities(row["finalBelief"], options, f"{where}:stored-pool")
            for option in options:
                assert_close(pooled[option], stored_pool[option], f"{where}:pooled:{option}")
            loss = brier(pooled, options, answer)
            assert_close(loss, float(row["finalBrier"]), f"{where}:Brier")
            if row.get("resolvedOption") != answer:
                raise ValueError(f"{where}: resolvedOption disagrees with pinned answer")
            block = by_block[(task_id, seed)]
            if arm in block:
                raise ValueError(f"{where}: duplicate arm")
            block[arm] = loss
        except (KeyError, TypeError, ValueError) as exc:
            errors.append(str(exc))

    contrasts = {"ATTACKS-SUPPORTS": ("ATTACKS", "SUPPORTS"),
                 "ATTACKS-CONTROL": ("ATTACKS", "CONTROL")}
    estimates: dict[str, Any] = {}
    for label, (treated, comparator) in contrasts.items():
        block_effects: dict[tuple[int, int], float] = {}
        for key, arms in by_block.items():
            if treated in arms and comparator in arms:
                block_effects[key] = arms[treated] - arms[comparator]
        task_effects: dict[int, float] = {}
        for task_id in planned_tasks:
            vals = [effect for (task, _), effect in block_effects.items() if task == task_id]
            if vals:
                task_effects[task_id] = mean(vals)
        vals = list(task_effects.values())
        missing = len(planned_tasks) - len(vals)
        estimates[label] = {
            "completeBlocks": len(block_effects),
            "completeTasks": len(vals),
            "missingTasks": missing,
            "meanDelta": mean(vals) if vals else None,
            "ci95": bootstrap_ci(vals),
            "bounds": [
                (sum(vals) - 2 * missing) / len(planned_tasks),
                (sum(vals) + 2 * missing) / len(planned_tasks),
            ] if planned_tasks else None,
            "loto": loto(task_effects) if vals else None,
            "taskEffects": {str(k): v for k, v in sorted(task_effects.items())},
        }
        complete_roster_blocks = {
            key: effect for key, effect in block_effects.items()
            if all(roster_complete[key].get(required_arm, False) for required_arm in expected_arms)
        }
        complete_roster_tasks: dict[int, float] = {}
        for task_id in planned_tasks:
            vals_roster = [effect for (task, _), effect in complete_roster_blocks.items() if task == task_id]
            if vals_roster:
                complete_roster_tasks[task_id] = mean(vals_roster)
        roster_values = list(complete_roster_tasks.values())
        estimates[label]["completeRosterSensitivity"] = {
            "completeBlocks": len(complete_roster_blocks),
            "completeTasks": len(roster_values),
            "meanDelta": mean(roster_values) if roster_values else None,
            "ci95": bootstrap_ci(roster_values),
            "loto": loto(complete_roster_tasks) if roster_values else None,
        }

    comparisons: list[dict[str, Any]] = []
    analysis_path = directory / "analysis-v1.json"
    if analysis_path.exists() and "ATTACKS-CONTROL" in estimates:
        published = json.loads(analysis_path.read_text(encoding="utf-8"))
        primary = published.get("primary", {})
        independent = estimates["ATTACKS-CONTROL"]
        for field, actual in (("meanDelta", independent["meanDelta"]),
                              ("ci95.lo", independent["ci95"][0] if independent["ci95"] else None),
                              ("ci95.hi", independent["ci95"][1] if independent["ci95"] else None)):
            expected: Any = primary
            for part in field.split("."):
                expected = expected.get(part) if isinstance(expected, dict) else None
            ok = actual is not None and expected is not None and math.isclose(actual, expected, rel_tol=TOL, abs_tol=TOL)
            comparisons.append({"field": field, "independent": actual, "published": expected, "match": ok})

    arm_diagnostics: dict[str, Any] = {}
    for arm_name in sorted({str(row["arm"]) for row in rows}):
        arm_rows = [row for row in rows if row["arm"] == arm_name]
        def numeric_mean(field: str) -> float | None:
            values = [float(row[field]) for row in arm_rows if isinstance(row.get(field), (int, float))]
            return mean(values) if values else None
        arm_diagnostics[arm_name] = {
            "rows": len(arm_rows),
            "meanDisclosedEvidenceCount": numeric_mean("disclosedEvidenceCount"),
            "meanDisclosedTokenCount": numeric_mean("disclosedTokenCount"),
            "meanDisclosedCoveredOptionCount": numeric_mean("disclosedCoveredOptionCount"),
            "meanDisclosedSourceAgentCount": numeric_mean("disclosedSourceAgentCount"),
            "meanFinalReportedCount": numeric_mean("finalReportedCount"),
            "zeroFinalReportedRows": sum(1 for row in arm_rows if row.get("finalReportedCount") == 0),
            "nullFinalBrierRows": sum(1 for row in arm_rows if row.get("finalBrier") is None),
        }

    provider_diagnostics: dict[str, Any] | None = None
    ledger_path = directory / "attempts.jsonl"
    if ledger_path.exists():
        events = [json.loads(line) for line in ledger_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        finished = [event for event in events if event.get("type") == "attempt_finished"]
        models = [event.get("providerModel") for event in finished if event.get("providerModel") is not None]
        provider_ids = [event.get("providerRequestId") for event in finished if event.get("providerRequestId") is not None]
        provider_diagnostics = {
            "finishedAttempts": len(finished),
            "attemptsWithProviderModel": len(models),
            "providerModels": sorted(set(models)),
            "attemptsWithProviderRequestId": len(provider_ids),
            "uniqueProviderRequestIds": len(set(provider_ids)),
            "unknownUsageAttempts": sum(1 for event in finished if event.get("usage") is None),
        }

    return {
        "directory": str(directory.relative_to(ROOT)),
        "plannedTasks": len(planned_tasks),
        "plannedSeeds": planned_seeds,
        "expectedArms": expected_arms,
        "rowCount": len(rows),
        "rawFinalReportsReparsed": raw_reparsed,
        "rowsWithoutRawFinal": raw_unavailable,
        "validationErrors": errors,
        "armDiagnostics": arm_diagnostics,
        "providerDiagnostics": provider_diagnostics,
        "estimates": estimates,
        "publishedComparisons": comparisons,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("directories", nargs="*", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path)
    args = parser.parse_args()
    directories = args.directories or [
        pathlib.Path("experiments/campaign/pilot_output/v6-fork-confirmatory-v2-20260815"),
        pathlib.Path("experiments/campaign/pilot_output/v6-fork-confirmatory-v3-20260816"),
        pathlib.Path("experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-v4-20260820"),
        pathlib.Path("experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-seed1-v3-20260821"),
    ]
    resolved = [d if d.is_absolute() else ROOT / d for d in directories]
    result = {
        "analyzer": "independent_fork_audit.py",
        "importsProjectCode": False,
        "dataset": str(DATASET.relative_to(ROOT)),
        "bootstrap": {"algorithm": "independent mulberry32 port", "seed": BOOTSTRAP_SEED, "repetitions": BOOTSTRAP_REPS},
        "goldenBrierTests": golden_tests(),
        "runs": [analyze_directory(d, load_dataset()) for d in resolved],
    }
    rendered = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if args.output:
        target = args.output if args.output.is_absolute() else ROOT / args.output
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rendered, encoding="utf-8")
    print(rendered)
    return 1 if any(run["validationErrors"] or any(not c["match"] for c in run["publishedComparisons"])
                    for run in result["runs"]) else 0


if __name__ == "__main__":
    raise SystemExit(main())
