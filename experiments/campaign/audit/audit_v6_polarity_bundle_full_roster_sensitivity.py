"""Post-freeze diagnostic: restrict DeepSeek blocks to four final reports per arm.

This diagnostic is not part of the frozen L0 decision rule and must not replace
or silently alter its estimand. It checks whether differential final-response
missingness in the older lenient DeepSeek batch drives the bundle result.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "polarity_bundle",
    HERE / "analyze_v6_polarity_bundle_response.py",
)
bundle = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(bundle)


def load_full_roster_blocks() -> list[dict]:
    canonical = bundle.load_canonical_index()
    directory = bundle.BATCHES["deepseek_v3"]["dir"]
    blocks = []
    for path in sorted(directory.glob("run_fork-v1_task-*.jsonl")):
        rows = [
            json.loads(line)
            for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        if all(len(row.get("finalAgentBeliefs") or []) == 4 for row in rows):
            blocks.append(bundle.qualify_rows(rows, canonical, path.name))
    return blocks


def compact(view: dict) -> dict:
    result = {
        "status": "POST_FREEZE_SENSITIVITY_NOT_PART_OF_L1_GATE",
        "totalFullRosterBlocks": view["totalBlocks"],
        "strata": {},
    }
    for stratum in ("wrong", "correct"):
        metric = view["strata"][stratum]["gapAS"]
        result["strata"][stratum] = {
            "taskCount": metric["taskCount"],
            "blockCount": metric["blockCount"],
            "gapASMean": metric["mean"],
            "ci95": metric["ci95"],
            "lotoSignChanges": None if metric["loto"] is None else metric["loto"]["signChanges"],
        }
    return result


def main() -> int:
    blocks = load_full_roster_blocks()
    views = {
        "deepseek_seed0_full_roster": bundle.analyze_view(
            "deepseek_seed0_full_roster", "DeepSeek seed 0 full roster", blocks, {0}
        ),
        "deepseek_seed1_full_roster": bundle.analyze_view(
            "deepseek_seed1_full_roster", "DeepSeek seed 1 full roster", blocks, {1}
        ),
        "deepseek_pooled_full_roster": bundle.analyze_view(
            "deepseek_pooled_full_roster", "DeepSeek pooled full roster", blocks, None
        ),
    }
    print(json.dumps({name: compact(view) for name, view in views.items()}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
