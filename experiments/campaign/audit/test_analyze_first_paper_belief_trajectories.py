"""Minimal synthetic tests for the belief-trajectory analyzer (V3 increment).

Validates, on synthetic data only (no official artifacts, no provider calls):
1. independent Brier formula against golden cases;
2. task-level aggregation (agents pooled within task x seed x arm);
3. within-task seed aggregation for the R1-wrong diagnostic;
4. canonical-order tie breaking;
5. top-choice reversal semantics (not full-rank reversal);
6. null-arm missingness handling;
7. bootstrap reproducibility (same master seed -> identical outputs).
Run: python experiments/campaign/audit/test_analyze_first_paper_belief_trajectories.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "traj", Path(__file__).resolve().parent / "analyze_first_paper_belief_trajectories.py"
)
traj = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(traj)

FAILURES = []


def check(name, cond, detail=""):
    if cond:
        print(f"PASS {name}")
    else:
        FAILURES.append(name)
        print(f"FAIL {name} {detail}")


def golden_brier():
    resolved = "B"
    # fully correct: p = one-hot on B -> 0
    assert abs(traj.brier({"A": 0, "B": 1, "C": 0}, resolved) - 0.0) < 1e-12
    # fully wrong: p = one-hot on A -> 2
    assert abs(traj.brier({"A": 1, "B": 0, "C": 0}, resolved) - 2.0) < 1e-12
    # uniform binary -> 0.5
    assert abs(traj.brier({"A": 0.5, "B": 0.5}, resolved) - 0.5) < 1e-12
    # hand-computed ternary: p=(0.2,0.3,0.5), resolved B -> 0.2^2+0.7^2+0.5^2 = 0.04+0.49+0.25 = 0.78
    assert abs(traj.brier({"A": 0.2, "B": 0.3, "C": 0.5}, resolved) - 0.78) < 1e-12
    check("golden brier", True)


def pooling():
    opts = ["A", "B", "C"]
    p = traj.pool([{"A": 0.1, "B": 0.8, "C": 0.1}, {"A": 0.3, "B": 0.3, "C": 0.4}], opts)
    assert abs(p["A"] - 0.2) < 1e-12 and abs(p["B"] - 0.55) < 1e-12 and abs(p["C"] - 0.25) < 1e-12
    assert traj.pool([], opts) is None
    check("pooling + empty pool", True)


def metric(correct_prob, wrong_prob, final_correct, wrong_to_correct=0, n_agents=1):
    return {
        "argmaxCorrect_R1": False,
        "argmaxKey_R1": "A",
        "correctProb_final": correct_prob,
        "pooledBelief_final": {"A": wrong_prob, "B": correct_prob},
        "argmaxCorrect_final": final_correct,
        "wrong_to_correct": wrong_to_correct,
        "nAgents": n_agents,
    }


def seed_aggregation():
    # Task 1 contributes two eligible seeds with A-C delta +1 each. Task 2
    # contributes one seed with delta -1. Task-equal mean is 0; block-equal
    # mean would be +1/3 and therefore detects the original implementation bug.
    blocks = {
        (1, 0): {"metrics": {"CONTROL": metric(0.0, 1.0, False), "ATTACKS": metric(1.0, 0.0, True)}},
        (1, 1): {"metrics": {"CONTROL": metric(0.0, 1.0, False), "ATTACKS": metric(1.0, 0.0, True)}},
        (2, 0): {"metrics": {"CONTROL": metric(1.0, 0.0, True), "ATTACKS": metric(0.0, 1.0, False)}},
    }
    result = traj.summarize_wrong_r1_correction(blocks)
    assert result["wrongBlocks"] == 3 and result["wrongTasks"] == 2
    assert abs(result["dCorrectProbFinal_AC_taskMean"] - 0.0) < 1e-12
    assert result["taskRescueCounts"] == {
        "attacksBetter": 1, "controlBetter": 1, "tied": 0, "net": 0,
    }
    check("R1-wrong diagnostic averages eligible seeds within task", True)


def canonical_tie_break():
    canonical = ["Red House", "Blue House", "Green House"]
    tied = {"Red House": 0.5, "Blue House": 0.0, "Green House": 0.5}
    assert traj.argmax_key(tied, canonical) == "Red House"
    assert traj.argmax_key(tied, sorted(canonical)) == "Green House"
    check("canonical-order tie break", True)


def top_choice_reversal_semantics():
    row = {
        "taskId": 1, "seed": 0, "arm": "CONTROL", "model": "x", "resolvedOption": "A",
        "round1AgentBeliefs": [{"A": 0.6, "B": 0.3, "C": 0.1}],
        "round2AgentBeliefs": [{"A": 0.6, "B": 0.2, "C": 0.2}],
        # B and C swap ranks, but the top choice remains A.
        "finalAgentBeliefs": [{"A": 0.6, "B": 0.1, "C": 0.3}],
        "finalBrier": 0.26,
        "finalAccuracy": 1,
    }
    m = traj.block_metrics(row, ["A", "B", "C"])
    assert m["topChoiceReversal"] == 0
    assert "rankReversal" not in m
    check("top-choice reversal is not full-rank reversal", True)


def null_arm():
    # missing final pool -> brier_final None; block skipped for contrasts
    row = {
        "taskId": 1, "seed": 0, "arm": "CONTROL", "model": "x", "resolvedOption": "B",
        "round1AgentBeliefs": [{"A": 0.2, "B": 0.8, "C": 0.0}],
        "round2AgentBeliefs": [{"A": 0.2, "B": 0.8, "C": 0.0}],
        "finalAgentBeliefs": [],
    }
    m = traj.block_metrics(row, ["A", "B", "C"])
    assert m["brier_final"] is None
    assert m["argmaxCorrect_final"] is None
    check("null arm -> final metrics None", True)


def bootstrap_reproducible():
    vals = [0.1 * i for i in range(1, 46)]
    m1, lo1, hi1 = traj.bootstrap_mean_ci(vals, seed=0x5EED0F, n=1000)
    m2, lo2, hi2 = traj.bootstrap_mean_ci(vals, seed=0x5EED0F, n=1000)
    assert m1 == m2 and lo1 == lo2 and hi1 == hi2
    m3, _, _ = traj.bootstrap_mean_ci(vals, seed=0x5EED0F + 1, n=1000)
    assert m3 == m1  # mean independent of seed
    check("bootstrap reproducible with fixed seed", True)


def main():
    golden_brier()
    pooling()
    seed_aggregation()
    canonical_tie_break()
    top_choice_reversal_semantics()
    null_arm()
    bootstrap_reproducible()
    if FAILURES:
        print("FAILED:", FAILURES)
        sys.exit(1)
    print("ALL SYNTHETIC TESTS PASSED")


if __name__ == "__main__":
    main()
