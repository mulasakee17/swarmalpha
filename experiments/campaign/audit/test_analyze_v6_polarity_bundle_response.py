"""Synthetic, zero-provider tests for the L0 polarity-bundle analyzer."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


SPEC = importlib.util.spec_from_file_location(
    "bundle",
    Path(__file__).resolve().parent / "analyze_v6_polarity_bundle_response.py",
)
bundle = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(bundle)

FAILURES = []


def check(name, condition, detail=""):
    if condition:
        print(f"PASS {name}")
    else:
        FAILURES.append(name)
        print(f"FAIL {name} {detail}")


def belief(a, b):
    return {"A": a, "B": b}


def row(arm, final, *, seed=0, r1=None, state="sha256:x"):
    r1 = r1 or [belief(0.8, 0.2), belief(0.6, 0.4)]
    pooled = bundle.pool(final, ["A", "B"])
    stored = None if pooled is None else bundle.brier(pooled, "B", ["A", "B"])
    return {
        "taskId": 1,
        "seed": seed,
        "model": "test:model",
        "arm": arm,
        "resolvedOption": "B",
        "round1StateHash": state,
        "round1AgentBeliefs": r1,
        "finalAgentBeliefs": final,
        "finalBrier": stored,
    }


def qualification_and_estimands():
    rows = [
        row("CONTROL", [belief(1.0, 0.0)]),
        row("SUPPORTS", [belief(0.5, 0.5)]),
        row("ATTACKS", [belief(0.0, 1.0)]),
    ]
    result = bundle.qualify_rows(rows, {1: {"options": ["A", "B"], "resolved": "B"}}, "synthetic")
    assert result["r1Stratum"] == "wrong"
    assert abs(result["valueAttacks"] - 2.0) < 1e-12
    assert abs(result["valueSupports"] - 1.5) < 1e-12
    assert abs(result["gapAS"] - 0.5) < 1e-12
    check("qualification + frozen estimands", True)


def canonical_tie():
    assert bundle.argmax_key({"B": 0.5, "A": 0.5}, ["B", "A"]) == "B"
    assert bundle.argmax_key({"B": 0.5, "A": 0.5}, ["A", "B"]) == "A"
    check("canonical-order tie break", True)


def shared_r1_fail_closed():
    rows = [
        row("CONTROL", [belief(1.0, 0.0)]),
        row("SUPPORTS", [belief(0.5, 0.5)], r1=[belief(0.1, 0.9)]),
        row("ATTACKS", [belief(0.0, 1.0)]),
    ]
    try:
        bundle.qualify_rows(rows, {1: {"options": ["A", "B"], "resolved": "B"}}, "synthetic")
    except ValueError as error:
        assert "Round-1 beliefs differ" in str(error)
        check("actual Round-1 mismatch fails closed", True)
        return
    check("actual Round-1 mismatch fails closed", False)


def stored_brier_fail_closed():
    rows = [
        row("CONTROL", [belief(1.0, 0.0)]),
        row("SUPPORTS", [belief(0.5, 0.5)]),
        row("ATTACKS", [belief(0.0, 1.0)]),
    ]
    rows[2]["finalBrier"] = 0.25
    try:
        bundle.qualify_rows(rows, {1: {"options": ["A", "B"], "resolved": "B"}}, "synthetic")
    except ValueError as error:
        assert "stored final Brier mismatch" in str(error)
        check("stored Brier mismatch fails closed", True)
        return
    check("stored Brier mismatch fails closed", False)


def complete_block_missingness():
    rows = [
        row("CONTROL", [belief(1.0, 0.0)]),
        row("SUPPORTS", []),
        row("ATTACKS", [belief(0.0, 1.0)]),
    ]
    result = bundle.qualify_rows(rows, {1: {"options": ["A", "B"], "resolved": "B"}}, "synthetic")
    assert result["complete"] is False
    assert result["gapAS"] is None
    check("incomplete three-arm block retained as missing", True)


def task_equal_seed_aggregation():
    blocks = [
        {"taskId": 1, "seed": 0, "complete": True, "r1Stratum": "wrong", "valueAttacks": 1.0, "valueSupports": 0.0, "gapAS": 1.0},
        {"taskId": 1, "seed": 1, "complete": True, "r1Stratum": "wrong", "valueAttacks": 3.0, "valueSupports": 1.0, "gapAS": 2.0},
        {"taskId": 2, "seed": 0, "complete": True, "r1Stratum": "wrong", "valueAttacks": 0.0, "valueSupports": 2.0, "gapAS": -2.0},
    ]
    rows = bundle.task_rows_for(blocks, "wrong", None)
    assert len(rows) == 2
    assert rows[0]["taskId"] == 1 and abs(rows[0]["gapAS"] - 1.5) < 1e-12
    summary = bundle.summarize_metric(rows, "gapAS", repetitions=100)
    assert abs(summary["mean"] - (-0.25)) < 1e-12
    check("seeds average within task before task-equal mean", True)


def bootstrap_reproducibility():
    values = [0.1, 0.2, 0.3, 0.4]
    ci1 = bundle.bootstrap_mean_ci(values, repetitions=500, seed=0x5EED0F)
    ci2 = bundle.bootstrap_mean_ci(values, repetitions=500, seed=0x5EED0F)
    assert ci1 == ci2
    check("bootstrap reproducibility", True)


def gap_summary(n, mean, lo, sign_changes=False):
    return {
        "taskCount": n,
        "mean": mean,
        "ci95": [lo, mean + 0.1],
        "loto": {"signChanges": sign_changes},
    }


def view_with_gap(summary):
    return {"strata": {"wrong": {"gapAS": summary}}}


def frozen_gate():
    go = bundle.l1_verdict({
        "deepseek_pooled": view_with_gap(gap_summary(20, 0.4, 0.2)),
        "glm_seed2": view_with_gap(gap_summary(18, 0.3, -0.1)),
    })
    defer = bundle.l1_verdict({
        "deepseek_pooled": view_with_gap(gap_summary(20, 0.4, -0.2)),
        "glm_seed2": view_with_gap(gap_summary(18, 0.3, -0.1)),
    })
    no_go = bundle.l1_verdict({
        "deepseek_pooled": view_with_gap(gap_summary(20, 0.4, 0.2)),
        "glm_seed2": view_with_gap(gap_summary(18, -0.1, -0.3)),
    })
    assert go["verdict"] == "GO_L1"
    assert defer["verdict"] == "DEFER_L1"
    assert no_go["verdict"] == "NO_GO_L1_CURRENT"
    check("frozen GO/DEFER/NO-GO gate", True)


def main():
    qualification_and_estimands()
    canonical_tie()
    shared_r1_fail_closed()
    stored_brier_fail_closed()
    complete_block_missingness()
    task_equal_seed_aggregation()
    bootstrap_reproducibility()
    frozen_gate()
    if FAILURES:
        print("FAILED:", FAILURES)
        return 1
    print("ALL SYNTHETIC TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
