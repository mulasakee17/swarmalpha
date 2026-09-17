"""Read-only L0 polarity-bundle response audit for SwarmAlpha.

Governed by docs/experiments/V6_POLARITY_BUNDLE_RESPONSE_ANALYSIS_FREEZE_V1.md.
This script never imports a runner, reads credentials, or calls a provider.
"""
from __future__ import annotations

import csv
import glob
import hashlib
import json
import math
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
PILOT = ROOT / "experiments" / "campaign" / "pilot_output"
OUT = ROOT / "experiments" / "campaign" / "audit" / "output"
DATASET = ROOT / "experiments" / "campaign" / "tasks" / "hiddenbench" / "benchmark.json"
FREEZE = ROOT / "docs" / "experiments" / "V6_POLARITY_BUNDLE_RESPONSE_ANALYSIS_FREEZE_V1.md"

BATCHES = {
    "deepseek_v3": {
        "label": "DeepSeek v3",
        "dir": PILOT / "v6-fork-confirmatory-v3-20260816",
    },
    "glm_threearm_seed2": {
        "label": "GLM-4.6V three-arm seed 2",
        "dir": PILOT / "v6-fork-glm46v-threearm-seed2-20260821",
    },
}

ARMS = ("CONTROL", "SUPPORTS", "ATTACKS")
MASTER_SEED = 0x5EED0F
N_BOOT = 10_000
TOL = 1e-12


class Mulberry32:
    def __init__(self, seed: int):
        self.state = seed & 0xFFFFFFFF

    def next(self) -> float:
        self.state = (self.state + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.state
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    def int(self, n: int) -> int:
        return int(self.next() * n)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def mean(values: list[float]) -> float:
    if not values:
        raise ValueError("mean requires at least one value")
    return sum(values) / len(values)


def median(values: list[float]) -> float:
    if not values:
        raise ValueError("median requires at least one value")
    ordered = sorted(values)
    mid = len(ordered) // 2
    return ordered[mid] if len(ordered) % 2 else (ordered[mid - 1] + ordered[mid]) / 2


def percentile(ordered: list[float], q: float) -> float:
    if not ordered:
        raise ValueError("percentile requires values")
    idx = int(math.floor(q * len(ordered)))
    idx = max(0, min(len(ordered) - 1, idx))
    return ordered[idx]


def pool(agent_beliefs: list[dict[str, float]], options: list[str]) -> dict[str, float] | None:
    if not agent_beliefs:
        return None
    result = {option: 0.0 for option in options}
    for belief in agent_beliefs:
        for option in options:
            result[option] += float(belief[option])
    return {option: value / len(agent_beliefs) for option, value in result.items()}


def brier(pooled: dict[str, float], resolved: str, options: list[str]) -> float:
    return sum((pooled[o] - (1.0 if o == resolved else 0.0)) ** 2 for o in options)


def argmax_key(pooled: dict[str, float], options: list[str]) -> str:
    best = options[0]
    for option in options[1:]:
        if pooled[option] > pooled[best]:
            best = option
    return best


def validate_probability_vector(value: Any, options: list[str], field: str) -> None:
    if not isinstance(value, dict) or set(value) != set(options):
        raise ValueError(f"{field}: probability keys differ from canonical options")
    probabilities = [value[option] for option in options]
    if any(not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) for v in probabilities):
        raise ValueError(f"{field}: probabilities must be finite numbers")
    if any(v < 0 or v > 1 for v in probabilities):
        raise ValueError(f"{field}: probabilities must be in [0,1]")
    if abs(sum(probabilities) - 1.0) > 1e-6:
        raise ValueError(f"{field}: probabilities must sum to one")


def load_canonical_index(dataset_path: Path = DATASET) -> dict[int, dict[str, Any]]:
    raw = json.loads(dataset_path.read_text(encoding="utf-8"))
    index: dict[int, dict[str, Any]] = {}
    for task in raw:
        task_id = task.get("id")
        options = task.get("possible_answers")
        resolved = task.get("correct_answer")
        if not isinstance(task_id, int) or task_id in index:
            raise ValueError("HiddenBench IDs must be unique integers")
        if not isinstance(options, list) or len(options) < 2 or len(options) != len(set(options)):
            raise ValueError(f"task {task_id}: invalid canonical options")
        if not all(isinstance(option, str) and option for option in options):
            raise ValueError(f"task {task_id}: invalid option text")
        if resolved not in options:
            raise ValueError(f"task {task_id}: resolution outside options")
        index[task_id] = {"options": options, "resolved": resolved}
    return index


def recompute_final_brier(row: dict[str, Any], options: list[str], resolved: str, context: str) -> float | None:
    beliefs = row.get("finalAgentBeliefs") or []
    if not isinstance(beliefs, list):
        raise ValueError(f"{context}: finalAgentBeliefs must be an array")
    for i, belief in enumerate(beliefs):
        validate_probability_vector(belief, options, f"{context}.finalAgentBeliefs[{i}]")
    pooled = pool(beliefs, options)
    recomputed = None if pooled is None else brier(pooled, resolved, options)
    stored = row.get("finalBrier")
    if (stored is None) != (recomputed is None):
        raise ValueError(f"{context}: stored/recomputed final Brier null mismatch")
    if stored is not None:
        if not isinstance(stored, (int, float)) or not math.isfinite(stored):
            raise ValueError(f"{context}: stored final Brier is invalid")
        if abs(float(stored) - float(recomputed)) > TOL:
            raise ValueError(f"{context}: stored final Brier mismatch")
    return recomputed


def qualify_rows(
    rows: list[dict[str, Any]],
    canonical: dict[int, dict[str, Any]],
    source_file: str,
) -> dict[str, Any]:
    if len(rows) != 3:
        raise ValueError(f"{source_file}: expected exactly three rows")
    by_arm = {row.get("arm"): row for row in rows}
    if set(by_arm) != set(ARMS) or len(by_arm) != 3:
        raise ValueError(f"{source_file}: expected exactly one row per frozen arm")
    task_ids = {row.get("taskId") for row in rows}
    seeds = {row.get("seed") for row in rows}
    models = {row.get("model") for row in rows}
    resolutions = {row.get("resolvedOption") for row in rows}
    state_hashes = {row.get("round1StateHash") for row in rows}
    if any(len(values) != 1 for values in (task_ids, seeds, models, resolutions, state_hashes)):
        raise ValueError(f"{source_file}: arm identity/state fields differ")
    task_id = next(iter(task_ids))
    seed = next(iter(seeds))
    model = next(iter(models))
    if not isinstance(task_id, int) or task_id not in canonical:
        raise ValueError(f"{source_file}: unknown task")
    if not isinstance(seed, int):
        raise ValueError(f"{source_file}: seed must be an integer")
    if not isinstance(model, str) or not model:
        raise ValueError(f"{source_file}: model must be non-empty")
    options = list(canonical[task_id]["options"])
    resolved = canonical[task_id]["resolved"]
    if next(iter(resolutions)) != resolved:
        raise ValueError(f"{source_file}: resolution differs from pinned source")

    r1_serialized = {canonical_json(row.get("round1AgentBeliefs")) for row in rows}
    if len(r1_serialized) != 1:
        raise ValueError(f"{source_file}: actual Round-1 beliefs differ across arms")
    r1_beliefs = rows[0].get("round1AgentBeliefs") or []
    if not isinstance(r1_beliefs, list) or not r1_beliefs:
        raise ValueError(f"{source_file}: Round-1 beliefs are unavailable")
    for i, belief in enumerate(r1_beliefs):
        validate_probability_vector(belief, options, f"{source_file}.round1AgentBeliefs[{i}]")
    pooled_r1 = pool(r1_beliefs, options)
    assert pooled_r1 is not None
    r1_top = argmax_key(pooled_r1, options)

    final_briers = {
        arm: recompute_final_brier(by_arm[arm], options, resolved, f"{source_file}:{arm}")
        for arm in ARMS
    }
    complete = all(final_briers[arm] is not None for arm in ARMS)
    record: dict[str, Any] = {
        "taskId": task_id,
        "seed": seed,
        "model": model,
        "sourceFile": source_file,
        "round1StateHash": next(iter(state_hashes)),
        "r1TopChoice": r1_top,
        "r1Stratum": "correct" if r1_top == resolved else "wrong",
        "resolvedOption": resolved,
        "complete": complete,
        "finalBriers": final_briers,
    }
    if complete:
        c = float(final_briers["CONTROL"])
        s = float(final_briers["SUPPORTS"])
        a = float(final_briers["ATTACKS"])
        record.update({
            "valueAttacks": c - a,
            "valueSupports": c - s,
            "gapAS": s - a,
        })
    else:
        record.update({"valueAttacks": None, "valueSupports": None, "gapAS": None})
    return record


def load_batch(name: str, cfg: dict[str, Any], canonical: dict[int, dict[str, Any]]) -> dict[str, Any]:
    files = sorted(Path(p) for p in glob.glob(str(cfg["dir"] / "run_fork-v1_task-*.jsonl")))
    if not files:
        raise ValueError(f"{name}: no run files")
    blocks: list[dict[str, Any]] = []
    identities: set[tuple[int, int]] = set()
    input_files = []
    for path in files:
        rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        block = qualify_rows(rows, canonical, path.name)
        identity = (block["taskId"], block["seed"])
        if identity in identities:
            raise ValueError(f"{name}: duplicate task/seed {identity}")
        identities.add(identity)
        blocks.append(block)
        input_files.append({"path": str(path.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256_file(path)})
    return {
        "name": name,
        "label": cfg["label"],
        "directory": str(cfg["dir"].relative_to(ROOT)).replace("\\", "/"),
        "blocks": sorted(blocks, key=lambda b: (b["taskId"], b["seed"])),
        "inputFiles": input_files,
    }


def bootstrap_mean_ci(values: list[float], repetitions: int = N_BOOT, seed: int = MASTER_SEED) -> list[float] | None:
    if not values:
        return None
    rng = Mulberry32(seed)
    draws = []
    for _ in range(repetitions):
        draws.append(mean([values[rng.int(len(values))] for _ in range(len(values))]))
    draws.sort()
    return [percentile(draws, 0.025), percentile(draws, 0.975)]


def sign(value: float) -> int:
    if value > 0:
        return 1
    if value < 0:
        return -1
    return 0


def summarize_metric(task_rows: list[dict[str, Any]], key: str, repetitions: int = N_BOOT) -> dict[str, Any]:
    values = [float(row[key]) for row in task_rows]
    if not values:
        return {
            "taskCount": 0, "blockCount": 0, "mean": None, "median": None,
            "ci95": None, "positiveTasks": 0, "negativeTasks": 0, "zeroTasks": 0,
            "loto": None,
        }
    full = mean(values)
    loto_values = []
    influential_task = None
    influential_delta = -1.0
    sign_changes = False
    for row in task_rows:
        rest = [float(other[key]) for other in task_rows if other["taskId"] != row["taskId"]]
        if not rest:
            continue
        current = mean(rest)
        loto_values.append(current)
        delta = abs(current - full)
        if delta > influential_delta:
            influential_delta = delta
            influential_task = row["taskId"]
        if sign(current) != sign(full):
            sign_changes = True
    return {
        "taskCount": len(task_rows),
        "blockCount": sum(row["blockCount"] for row in task_rows),
        "mean": full,
        "median": median(values),
        "ci95": bootstrap_mean_ci(values, repetitions=repetitions),
        "positiveTasks": sum(1 for value in values if value > 0),
        "negativeTasks": sum(1 for value in values if value < 0),
        "zeroTasks": sum(1 for value in values if value == 0),
        "loto": {
            "min": min(loto_values) if loto_values else full,
            "max": max(loto_values) if loto_values else full,
            "mostInfluentialTask": influential_task,
            "signChanges": sign_changes,
        },
    }


def task_rows_for(blocks: list[dict[str, Any]], stratum: str, seeds: set[int] | None) -> list[dict[str, Any]]:
    grouped: dict[int, list[dict[str, Any]]] = {}
    for block in blocks:
        if not block["complete"] or block["r1Stratum"] != stratum:
            continue
        if seeds is not None and block["seed"] not in seeds:
            continue
        grouped.setdefault(block["taskId"], []).append(block)
    rows = []
    for task_id, task_blocks in sorted(grouped.items()):
        rows.append({
            "taskId": task_id,
            "stratum": stratum,
            "seeds": sorted(block["seed"] for block in task_blocks),
            "blockCount": len(task_blocks),
            "valueAttacks": mean([block["valueAttacks"] for block in task_blocks]),
            "valueSupports": mean([block["valueSupports"] for block in task_blocks]),
            "gapAS": mean([block["gapAS"] for block in task_blocks]),
        })
    return rows


def analyze_view(
    name: str,
    label: str,
    blocks: list[dict[str, Any]],
    seeds: set[int] | None,
    repetitions: int = N_BOOT,
) -> dict[str, Any]:
    selected = [block for block in blocks if seeds is None or block["seed"] in seeds]
    strata = {}
    per_task = []
    for stratum in ("wrong", "correct"):
        task_rows = task_rows_for(selected, stratum, seeds=None)
        per_task.extend(task_rows)
        strata[stratum] = {
            "eligibleTaskIds": [row["taskId"] for row in task_rows],
            "valueAttacks": summarize_metric(task_rows, "valueAttacks", repetitions),
            "valueSupports": summarize_metric(task_rows, "valueSupports", repetitions),
            "gapAS": summarize_metric(task_rows, "gapAS", repetitions),
        }
    return {
        "name": name,
        "label": label,
        "selectedSeeds": None if seeds is None else sorted(seeds),
        "totalBlocks": len(selected),
        "completeBlocks": sum(1 for block in selected if block["complete"]),
        "missingBlocks": sum(1 for block in selected if not block["complete"]),
        "strata": strata,
        "perTask": sorted(per_task, key=lambda row: (row["stratum"], row["taskId"])),
    }


def l1_verdict(views: dict[str, dict[str, Any]]) -> dict[str, Any]:
    reasons = []
    summaries = []
    for key in ("deepseek_pooled", "glm_seed2"):
        gap = views[key]["strata"]["wrong"]["gapAS"]
        summaries.append(gap)
        if gap["taskCount"] < 5:
            reasons.append(f"{key}: fewer than five wrong-stratum tasks")
        elif gap["taskCount"] < 10:
            reasons.append(f"{key}: fewer than ten wrong-stratum tasks")
        if gap["mean"] is None or gap["mean"] <= 0:
            reasons.append(f"{key}: wrong-stratum GAP_AS is non-positive")
        if gap["loto"] is None or gap["loto"]["signChanges"]:
            reasons.append(f"{key}: leave-one-task-out sign is unstable")
    if any(summary["taskCount"] < 5 or summary["mean"] is None or summary["mean"] <= 0 for summary in summaries):
        return {"verdict": "NO_GO_L1_CURRENT", "reasons": reasons}
    any_ci_positive = any(summary["ci95"] is not None and summary["ci95"][0] > 0 for summary in summaries)
    all_n10 = all(summary["taskCount"] >= 10 for summary in summaries)
    all_loto = all(summary["loto"] is not None and not summary["loto"]["signChanges"] for summary in summaries)
    if all_n10 and any_ci_positive and all_loto:
        return {"verdict": "GO_L1", "reasons": ["all frozen L1 conditions satisfied"]}
    if not any_ci_positive:
        reasons.append("neither wrong-stratum GAP_AS interval is wholly above zero")
    return {"verdict": "DEFER_L1", "reasons": reasons}


def analyze(repetitions: int = N_BOOT) -> dict[str, Any]:
    canonical = load_canonical_index()
    batches = {name: load_batch(name, cfg, canonical) for name, cfg in BATCHES.items()}
    deepseek = batches["deepseek_v3"]["blocks"]
    glm = batches["glm_threearm_seed2"]["blocks"]
    views = {
        "deepseek_seed0": analyze_view("deepseek_seed0", "DeepSeek seed 0", deepseek, {0}, repetitions),
        "deepseek_seed1": analyze_view("deepseek_seed1", "DeepSeek seed 1", deepseek, {1}, repetitions),
        "deepseek_pooled": analyze_view("deepseek_pooled", "DeepSeek pooled task-equal", deepseek, None, repetitions),
        "glm_seed2": analyze_view("glm_seed2", "GLM-4.6V seed 2", glm, {2}, repetitions),
    }
    verdict = l1_verdict(views)
    return {
            "analysisRef": {"id": "swarmalpha.analysis.polarity-bundle-response", "version": "1.0.0"},
            "inferenceStatus": "post_hoc_bundle_response_only",
            "freezeFile": str(FREEZE.relative_to(ROOT)).replace("\\", "/"),
            "freezeSha256": sha256_file(FREEZE),
            "dataset": str(DATASET.relative_to(ROOT)).replace("\\", "/"),
            "datasetSha256": sha256_file(DATASET),
            "bootstrap": {"method": "percentile_task_bootstrap", "repetitions": repetitions, "seed": MASTER_SEED},
            "batches": {
                name: {
                    "label": batch["label"],
                    "directory": batch["directory"],
                    "inputFiles": batch["inputFiles"],
                    "totalBlocks": len(batch["blocks"]),
                    "completeBlocks": sum(1 for block in batch["blocks"] if block["complete"]),
                    "missingBlocks": sum(1 for block in batch["blocks"] if not block["complete"]),
                }
                for name, batch in batches.items()
            },
            "views": views,
            "l1Decision": verdict,
            "limitations": [
                "This is a post-hoc complete-block bundle analysis, not message-level trajectory value.",
                "supports/attacks are model-self-labeled relations without a target option.",
                "Round-1 correctness is an offline evaluator stratum and has no online detector authority.",
                "No cross-model grand pool is computed.",
                "A task may appear in both descriptive DeepSeek strata when seeds realize different Round-1 top choices; no formal between-stratum contrast is made.",
            ],
    }


def fmt(value: float | None) -> str:
    return "NA" if value is None else f"{value:+.4f}"


def render_markdown(result: dict[str, Any]) -> str:
    lines = [
        "# V6 Polarity-Bundle Response L0 Results",
        "",
        "Status: post-hoc, zero-provider, read-only bundle analysis.",
        "",
        "## L1 decision",
        "",
        f"**{result['l1Decision']['verdict']}**",
        "",
    ]
    for reason in result["l1Decision"]["reasons"]:
        lines.append(f"- {reason}")
    lines.extend([
        "",
        "## Frozen summaries",
        "",
        "Positive values mean lower Brier for ATTACKS/SUPPORTS than CONTROL; positive GAP_AS means ATTACKS has greater bundle value than SUPPORTS.",
        "",
        "| View | R1 stratum | n tasks/blocks | V_ATTACKS mean [95% CI] | V_SUPPORTS mean [95% CI] | GAP_AS mean [95% CI] | GAP LOTO sign change |",
        "|---|---|---:|---:|---:|---:|---|",
    ])
    for view in result["views"].values():
        for stratum in ("wrong", "correct"):
            summary = view["strata"][stratum]
            a = summary["valueAttacks"]
            s = summary["valueSupports"]
            g = summary["gapAS"]
            def estimate(metric: dict[str, Any]) -> str:
                if metric["mean"] is None:
                    return "NA"
                return f"{fmt(metric['mean'])} [{fmt(metric['ci95'][0])}, {fmt(metric['ci95'][1])}]"
            lines.append(
                f"| {view['label']} | {stratum} | {g['taskCount']}/{g['blockCount']} | "
                f"{estimate(a)} | {estimate(s)} | {estimate(g)} | "
                f"{g['loto']['signChanges'] if g['loto'] else 'NA'} |"
            )
    lines.extend([
        "",
        "## Missingness",
        "",
        "| View | total blocks | complete | missing |",
        "|---|---:|---:|---:|",
    ])
    for view in result["views"].values():
        lines.append(f"| {view['label']} | {view['totalBlocks']} | {view['completeBlocks']} | {view['missingBlocks']} |")
    lines.extend([
        "",
        "## Interpretation boundary",
        "",
    ])
    for limitation in result["limitations"]:
        lines.append(f"- {limitation}")
    lines.append("")
    return "\n".join(lines)


def write_outputs(result: dict[str, Any], out_dir: Path = OUT) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "polarity_bundle_response_v1.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "polarity_bundle_response_v1.md").write_text(render_markdown(result), encoding="utf-8")
    with (out_dir / "polarity_bundle_response_per_task_v1.tsv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="\t", lineterminator="\n")
        writer.writerow(["view", "stratum", "task_id", "seeds", "block_count", "value_attacks", "value_supports", "gap_as"])
        for view_name, view in result["views"].items():
            for row in view["perTask"]:
                writer.writerow([
                    view_name, row["stratum"], row["taskId"], ",".join(map(str, row["seeds"])), row["blockCount"],
                    f"{row['valueAttacks']:.17g}", f"{row['valueSupports']:.17g}", f"{row['gapAS']:.17g}",
                ])


def main() -> int:
    result = analyze()
    write_outputs(result)
    print(json.dumps({
        "ok": True,
        "l1Decision": result["l1Decision"],
        "outputDir": str(OUT),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
