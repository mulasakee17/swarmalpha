"""Read-only belief-trajectory analyzer for the first paper (V3.1 correction).

Corrected by docs/experiments/FIRST_PAPER_BELIEF_TRAJECTORY_ANALYSIS_FREEZE_V2.md.

- Reads only official artifacts; never imports/modifies the experiment runner;
  never calls a provider.
- Statistical unit is the task; agents are pooled within task x seed x arm.
- Brier is recomputed independently: sum_k (p_k - 1[k = resolvedOption])^2.
- 10,000 percentile task bootstrap, mulberry32(0x5EED0F), deterministic.
- Outputs to paper_rewriting_output/analysis/belief_trajectory/.
"""
from __future__ import annotations

import csv
import glob
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # repo root
PILOT = ROOT / "experiments" / "campaign" / "pilot_output"
OUT = ROOT / "paper_rewriting_output" / "analysis" / "belief_trajectory"
HIDDENBENCH_DATASET = ROOT / "experiments" / "campaign" / "tasks" / "hiddenbench" / "benchmark.json"

BATCHES = {
    "deepseek_v3": {
        "dir": PILOT / "v6-fork-confirmatory-v3-20260816",
        "arms": ("CONTROL", "SUPPORTS", "ATTACKS"),
        "label": "DeepSeek v3 (45 tasks x seeds 0,1)",
    },
    "glm_threearm_seed2": {
        "dir": PILOT / "v6-fork-glm46v-threearm-seed2-20260821",
        "arms": ("CONTROL", "SUPPORTS", "ATTACKS"),
        "label": "GLM-4.6V three-arm seed 2",
    },
    "glm_twoarm_seed0": {
        "dir": PILOT / "v6-fork-glm46v-twoarm-v4-20260820",
        "arms": ("CONTROL", "ATTACKS"),
        "label": "GLM-4.6V two-arm seed 0",
    },
    "glm_twoarm_seed1": {
        "dir": PILOT / "v6-fork-glm46v-twoarm-seed1-v3-20260821",
        "arms": ("CONTROL", "ATTACKS"),
        "label": "GLM-4.6V two-arm seed 1",
    },
}

MASTER_SEED = 0x5EED0F
N_BOOT = 10_000


# ---------- deterministic PRNG (mulberry32, as used by the frozen analyzers) ----------
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


# ---------- metrics ----------
def pool(agent_beliefs, options):
    if not agent_beliefs:
        return None
    out = {k: 0.0 for k in options}
    for ab in agent_beliefs:
        for k in options:
            out[k] += ab.get(k, 0.0)
    m = len(agent_beliefs)
    return {k: v / m for k, v in out.items()}


def brier(pooled, resolved):
    return sum((pooled[k] - (1.0 if k == resolved else 0.0)) ** 2 for k in pooled)


def entropy(pooled):
    return -sum(p * math.log(p) if p > 0 else 0.0 for p in pooled.values())


def tv(p1, p2):
    return 0.5 * sum(abs(p1[k] - p2[k]) for k in p1)


def argmax_key(pooled, options):
    best, bestk = -1.0, None
    for k in options:  # ties retain the first option in the frozen canonical order
        if pooled[k] > best:
            best, bestk = pooled[k], k
    return bestk


def load_hiddenbench_canonical_index(dataset_path=HIDDENBENCH_DATASET):
    """Load canonical option order and resolution from the pinned task source."""
    tasks = json.loads(Path(dataset_path).read_text(encoding="utf-8"))
    index = {}
    for task in tasks:
        tid = task.get("id")
        options = task.get("possible_answers")
        resolved = task.get("correct_answer")
        if not isinstance(tid, int) or tid in index:
            raise ValueError("HiddenBench task IDs must be unique integers")
        if not isinstance(options, list) or not options or len(options) != len(set(options)):
            raise ValueError(f"HiddenBench task {tid} has invalid canonical options")
        if not all(isinstance(option, str) and option for option in options):
            raise ValueError(f"HiddenBench task {tid} has invalid canonical option text")
        if resolved not in options:
            raise ValueError(f"HiddenBench task {tid} resolution is outside canonical options")
        index[tid] = {"options": list(options), "resolved": resolved}
    return index


def block_metrics(row, options):
    resolved = row["resolvedOption"]
    r1 = pool(row.get("round1AgentBeliefs") or [], options)
    r2 = pool(row.get("round2AgentBeliefs") or [], options)
    fin = pool(row.get("finalAgentBeliefs") or [], options)
    m = {
        "taskId": row["taskId"],
        "seed": row["seed"],
        "arm": row["arm"],
        "model": row.get("model", ""),
        "resolvedOption": resolved,
    }
    for stage, pooled in (("R1", r1), ("R2", r2), ("final", fin)):
        if pooled is None:
            for key in ("brier", "correctProb", "maxProb", "entropy", "argmaxCorrect", "argmaxKey"):
                m[f"{key}_{stage}"] = None
            m[f"pooledBelief_{stage}"] = None
            continue
        m[f"pooledBelief_{stage}"] = pooled
        m[f"brier_{stage}"] = brier(pooled, resolved)
        m[f"correctProb_{stage}"] = pooled[resolved]
        m[f"maxProb_{stage}"] = max(pooled.values())
        m[f"entropy_{stage}"] = entropy(pooled)
        m[f"argmaxKey_{stage}"] = argmax_key(pooled, options)
        m[f"argmaxCorrect_{stage}"] = m[f"argmaxKey_{stage}"] == resolved
    if r1 and r2:
        m["tv_R1R2"] = tv(r1, r2)
        m["dbrier_R1R2"] = (m["brier_R2"] - m["brier_R1"]) if m["brier_R2"] is not None else None
        m["dCorrect_R1R2"] = (m["correctProb_R2"] - m["correctProb_R1"]) if m["correctProb_R2"] is not None else None
    if r2 and fin:
        m["tv_R2final"] = tv(r2, fin)
        m["dbrier_R2final"] = (m["brier_final"] - m["brier_R2"]) if m["brier_final"] is not None else None
        m["dCorrect_R2final"] = (m["correctProb_final"] - m["correctProb_R2"]) if m["correctProb_final"] is not None else None
    if r1 and fin and m["argmaxKey_R1"] is not None and m["argmaxKey_final"] is not None:
        m["topChoiceReversal"] = 1 if m["argmaxKey_R1"] != m["argmaxKey_final"] else 0
    else:
        m["topChoiceReversal"] = None
    for key in ("beliefShiftR1ToR2", "round2AlignmentR", "round2MaxPairwiseTV",
                "evidenceReuseR2", "evidenceDiversityR2"):
        m[key] = row.get(key)
    switches = {"wrong_to_correct": 0, "correct_to_wrong": 0, "wrong_to_diff_wrong": 0,
                "unchanged_correct": 0, "unchanged_wrong": 0}
    a1 = row.get("round1AgentBeliefs") or []
    af = row.get("finalAgentBeliefs") or []
    for p1, pf in zip(a1, af):
        k1 = argmax_key(p1, options)
        kf = argmax_key(pf, options)
        c1 = k1 == resolved
        cf = kf == resolved
        if c1 and cf:
            switches["unchanged_correct"] += 1
        elif not c1 and not cf:
            if k1 == kf:
                switches["unchanged_wrong"] += 1
            else:
                switches["wrong_to_diff_wrong"] += 1
        elif not c1 and cf:
            switches["wrong_to_correct"] += 1
        else:
            switches["correct_to_wrong"] += 1
    for k, v in switches.items():
        m[k] = v
    m["nAgents"] = len(a1)
    stored_brier = row.get("finalBrier")
    recomputed_brier = m.get("brier_final")
    if (stored_brier is None) != (recomputed_brier is None):
        raise ValueError(f"task {row['taskId']} seed {row['seed']} {row['arm']}: final Brier null mismatch")
    if stored_brier is not None:
        m["finalBrierAbsError"] = abs(float(stored_brier) - recomputed_brier)
        if m["finalBrierAbsError"] > 1e-12:
            raise ValueError(
                f"task {row['taskId']} seed {row['seed']} {row['arm']}: stored final Brier mismatch"
            )
    else:
        m["finalBrierAbsError"] = None
    stored_accuracy = row.get("finalAccuracy")
    recomputed_accuracy = None if m.get("argmaxCorrect_final") is None else int(m["argmaxCorrect_final"])
    if stored_accuracy != recomputed_accuracy:
        raise ValueError(
            f"task {row['taskId']} seed {row['seed']} {row['arm']}: stored final accuracy mismatch"
        )
    return m


# ---------- loading ----------
def load_batch(cfg):
    """Returns {(taskId, seed): {"metrics": {arm: metrics}, "options": options}}."""
    blocks = {}
    canonical = load_hiddenbench_canonical_index()
    files = sorted(glob.glob(str(cfg["dir"] / "run_fork-v1_task-*.jsonl")))
    for p in files:
        rows = [json.loads(l) for l in open(p, encoding="utf-8")]
        by_arm = {r["arm"]: r for r in rows}
        if set(by_arm) != set(cfg["arms"]):
            raise ValueError(f"{Path(p).name}: arm mismatch {sorted(by_arm)} vs {cfg['arms']}")
        h = {r.get("round1StateHash") for r in rows}
        if len(h) != 1:
            raise ValueError(f"{Path(p).name}: round-1 state hashes differ across arms")
        r0 = rows[0]
        tid = r0["taskId"]
        if tid not in canonical:
            raise ValueError(f"{Path(p).name}: task {tid} is absent from the pinned HiddenBench source")
        options = canonical[tid]["options"]
        if any(row.get("resolvedOption") != canonical[tid]["resolved"] for row in rows):
            raise ValueError(f"{Path(p).name}: resolution differs from the pinned HiddenBench source")
        expected_keys = set(options)
        for row in rows:
            for stage in ("round1AgentBeliefs", "round2AgentBeliefs", "finalAgentBeliefs"):
                for agent_index, belief in enumerate(row.get(stage) or []):
                    if set(belief) != expected_keys:
                        raise ValueError(
                            f"{Path(p).name}: {row['arm']} {stage}[{agent_index}] keys differ from canonical options"
                        )
        metrics = {arm: block_metrics(row, options) for arm, row in by_arm.items()}
        blocks[(tid, r0["seed"])] = {"metrics": metrics, "options": options}
    return blocks


# ---------- bootstrap ----------
def percentile(xs, q):
    if not xs:
        return None
    idx = int(math.floor(q * len(xs)))
    idx = max(0, min(len(xs) - 1, idx))
    return xs[idx]


def bootstrap_mean_ci(task_values, seed=MASTER_SEED, n=N_BOOT):
    vals = [v for v in task_values if v is not None]
    if not vals:
        return None, None, None
    mean = sum(vals) / len(vals)
    rng = Mulberry32(seed)
    means = []
    n_tasks = len(vals)
    for _ in range(n):
        s = 0.0
        for _ in range(n_tasks):
            s += vals[rng.int(n_tasks)]
        means.append(s / n_tasks)
    means.sort()
    return mean, percentile(means, 0.025), percentile(means, 0.975)


def task_values_for(blocks, arm, metric):
    """Per-task mean of a metric for one arm (task = unit; seeds averaged within task)."""
    per_task = {}
    for (tid, seed), blk in blocks.items():
        m = blk["metrics"].get(arm)
        if m is None:
            continue
        v = m.get(metric)
        if v is None:
            continue
        per_task.setdefault(tid, []).append(v)
    return [sum(vs) / len(vs) for vs in per_task.values()]


def task_deltas(blocks, arm_a, arm_b, metric):
    """Per-task arm difference of a metric (seeds averaged within task)."""
    per_task = {}
    n_used = 0
    for (tid, seed), blk in blocks.items():
        a = blk["metrics"].get(arm_a)
        b = blk["metrics"].get(arm_b)
        if a is None or b is None:
            continue
        va, vb = a.get(metric), b.get(metric)
        if va is None or vb is None:
            continue
        per_task.setdefault(tid, []).append(va - vb)
        n_used += 1
    vals = [sum(vs) / len(vs) for vs in per_task.values()]
    return vals, n_used


def summarize_wrong_r1_correction(blocks):
    """Summarize R1-wrong task x seed blocks with task-equal weighting.

    Eligibility remains block-level to preserve the original diagnostic: a
    task x seed block enters when the shared R1 pooled top choice is wrong.
    Quantities are then averaged across eligible seeds inside each task before
    taking the cross-task mean. Agent switches remain descriptive block totals.
    """
    per_task = {}
    switches = {
        "control": {"wrong_to_correct": 0, "total": 0},
        "attacks": {"wrong_to_correct": 0, "total": 0},
    }
    wrong_blocks = 0
    for (tid, seed), blk in blocks.items():
        control = blk["metrics"].get("CONTROL")
        attacks = blk["metrics"].get("ATTACKS")
        if control is None or attacks is None:
            continue
        if control.get("argmaxCorrect_R1") is not False or attacks.get("argmaxCorrect_R1") is not False:
            continue
        if control.get("argmaxKey_R1") != attacks.get("argmaxKey_R1"):
            raise ValueError(f"task {tid} seed {seed}: shared R1 top choice differs across arms")
        wrong_blocks += 1
        wrong_key = control["argmaxKey_R1"]
        control_final = control.get("pooledBelief_final") or {}
        attacks_final = attacks.get("pooledBelief_final") or {}
        record = {
            "dCorrect": None,
            "dWrongProb": None,
            "dAccuracy": None,
        }
        cf, af = control.get("correctProb_final"), attacks.get("correctProb_final")
        if cf is not None and af is not None:
            record["dCorrect"] = af - cf
        cw, aw = control_final.get(wrong_key), attacks_final.get(wrong_key)
        if cw is not None and aw is not None:
            record["dWrongProb"] = aw - cw
        ca, aa = control.get("argmaxCorrect_final"), attacks.get("argmaxCorrect_final")
        if ca is not None and aa is not None:
            record["dAccuracy"] = int(aa) - int(ca)
        per_task.setdefault(tid, []).append(record)
        switches["control"]["wrong_to_correct"] += control["wrong_to_correct"]
        switches["control"]["total"] += control["nAgents"]
        switches["attacks"]["wrong_to_correct"] += attacks["wrong_to_correct"]
        switches["attacks"]["total"] += attacks["nAgents"]

    def task_means(field):
        values = []
        for records in per_task.values():
            available = [record[field] for record in records if record[field] is not None]
            if available:
                values.append(sum(available) / len(available))
        return values

    d_correct = task_means("dCorrect")
    d_wrong_prob = task_means("dWrongProb")
    d_accuracy = task_means("dAccuracy")
    rescued = sum(value > 0 for value in d_accuracy)
    harmed = sum(value < 0 for value in d_accuracy)
    tied = sum(value == 0 for value in d_accuracy)
    return {
        "wrongBlocks": wrong_blocks,
        "wrongTasks": len(per_task),
        "dCorrectProbFinal_AC_taskMean": (sum(d_correct) / len(d_correct)) if d_correct else None,
        "dWrongProbFinal_AC_taskMean": (sum(d_wrong_prob) / len(d_wrong_prob)) if d_wrong_prob else None,
        "dFinalAccuracy_AC_taskMean": (sum(d_accuracy) / len(d_accuracy)) if d_accuracy else None,
        "switches": switches,
        "taskRescueCounts": {
            "attacksBetter": rescued,
            "controlBetter": harmed,
            "tied": tied,
            "net": rescued - harmed,
        },
    }


# ---------- main ----------
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    loaded = {name: load_batch(cfg) for name, cfg in BATCHES.items()}

    summary = {"masterSeed": MASTER_SEED, "bootstrapN": N_BOOT, "batches": {}}
    plot_rows = []
    report = ["# Belief-Trajectory Diagnostic Report (V3.1 correction)", ""]
    report.append(
        "Post-hoc mechanism diagnostic corrected by "
        "docs/experiments/FIRST_PAPER_BELIEF_TRAJECTORY_ANALYSIS_FREEZE_V2.md. "
        "Brier recomputed independently; task is the statistical unit; 10,000-draw "
        "mulberry32(0x5EED0F) task bootstrap."
    )
    report.append("")

    for bname, cfg in BATCHES.items():
        blocks = loaded[bname]
        report.append(f"## {bname} — {cfg['label']}")
        report.append(f"- Blocks loaded: {len(blocks)}")

        # Q1: stage-wise mean Brier per arm + A-C / A-S deltas
        stage_brier = {}
        for arm in cfg["arms"]:
            arm_means = {}
            for stage, key in (("R1", "brier_R1"), ("R2", "brier_R2"), ("final", "brier_final")):
                vals = task_values_for(blocks, arm, key)
                mean, lo, hi = bootstrap_mean_ci(vals)
                arm_means[stage] = {"mean": mean, "ci95": [lo, hi], "nTasks": len(vals)}
            stage_brier[arm] = arm_means
            report.append(
                f"- {arm} Brier: " + "; ".join(
                    f"{s}={v['mean']:.4f} [{v['ci95'][0]:.4f},{v['ci95'][1]:.4f}] (n={v['nTasks']})"
                    for s, v in arm_means.items()
                )
            )
        for label, (a, b) in (("ATTACKS-CONTROL", ("ATTACKS", "CONTROL")),
                              ("ATTACKS-SUPPORTS", ("ATTACKS", "SUPPORTS"))):
            if b not in cfg["arms"]:
                continue
            for stage, key in (("R1", "brier_R1"), ("R2", "brier_R2"), ("final", "brier_final")):
                vals, n_used = task_deltas(blocks, a, b, key)
                mean, lo, hi = bootstrap_mean_ci(vals)
                report.append(
                    f"- {label} {stage} Brier delta: {mean:.4f} [{lo:.4f},{hi:.4f}] "
                    f"(n_tasks={len(vals)}, blocks_used={n_used})"
                )
                plot_rows.append({
                    "batch": bname, "contrast": label, "stage": stage,
                    "mean": mean, "ci_lo": lo, "ci_hi": hi, "n_tasks": len(vals),
                })

        # Q2: R1-argmax-wrong subset, ATTACKS vs CONTROL correction
        q2 = summarize_wrong_r1_correction(blocks)
        if q2["wrongBlocks"]:
            sw = q2["switches"]
            rescue = q2["taskRescueCounts"]
            report.append(
                f"- R1-top-choice-wrong blocks: {q2['wrongBlocks']} across {q2['wrongTasks']} tasks; "
                f"final correctProb delta (A-C), eligible seeds averaged within task, task-equal mean="
                f"{q2['dCorrectProbFinal_AC_taskMean']:.4f}; original-wrong-option final prob delta "
                f"(A-C), task-equal mean={q2['dWrongProbFinal_AC_taskMean']:.4f}; "
                f"wrong->correct agent switches across eligible task-seed blocks CONTROL "
                f"{sw['control']['wrong_to_correct']}/{sw['control']['total']} vs ATTACKS "
                f"{sw['attacks']['wrong_to_correct']}/{sw['attacks']['total']}; task rescue balance "
                f"ATTACKS-better={rescue['attacksBetter']}, CONTROL-better={rescue['controlBetter']}, "
                f"tied={rescue['tied']}, net={rescue['net']}"
            )
            summary.setdefault("q2", {})[bname] = q2

        # Q3: dynamics per arm + A-C delta
        for metric in ("round2AlignmentR", "round2MaxPairwiseTV", "evidenceReuseR2", "evidenceDiversityR2", "topChoiceReversal"):
            arm_means = {}
            for arm in cfg["arms"]:
                vals = task_values_for(blocks, arm, metric)
                mean, _, _ = bootstrap_mean_ci(vals)
                arm_means[arm] = {"mean": mean, "n": len(vals)}
            if "CONTROL" in arm_means and "ATTACKS" in arm_means:
                ac, _ = task_deltas(blocks, "ATTACKS", "CONTROL", metric)
                m_ac, lo_ac, hi_ac = bootstrap_mean_ci(ac)
                report.append(
                    f"- {metric}: " + "; ".join(f"{arm}={v['mean']:.4f} (n={v['n']})" for arm, v in arm_means.items())
                    + f" | A-C delta {m_ac:.4f} [{lo_ac:.4f},{hi_ac:.4f}] (n_tasks={len(ac)})"
                )
        report.append("")

        summary["batches"][bname] = {
            "label": cfg["label"],
            "blocks": len(blocks),
            "stageBrier": stage_brier,
        }

    non_null_brier_checks = [
        metric["finalBrierAbsError"]
        for blocks in loaded.values()
        for block in blocks.values()
        for metric in block["metrics"].values()
        if metric["finalBrierAbsError"] is not None
    ]
    summary["verification"] = {
        "storedFinalBrierChecks": len(non_null_brier_checks),
        "maxFinalBrierAbsError": max(non_null_brier_checks, default=None),
        "storedFinalAccuracyMatchesCanonicalArgmax": True,
        "sharedR1StateHashCheckedWithinEveryBlock": True,
    }
    report.extend([
        "## Verification",
        f"- Stored final Brier checks: {len(non_null_brier_checks)} non-null values; "
        f"maximum absolute error={max(non_null_brier_checks, default=0.0):.3g}.",
        "- Stored final accuracy matches canonical-order argmax for every available final belief.",
        "- Shared round-1 state hashes match across arms in every loaded block.",
        "",
    ])

    # CSV: per task x seed x arm metrics
    csv_path = OUT / "trajectory_metrics.csv"
    all_rows = []
    for bname, cfg in BATCHES.items():
        for (tid, seed), blk in loaded[bname].items():
            for arm in cfg["arms"]:
                m = dict(blk["metrics"][arm])
                m["batch"] = bname
                for key in list(m):
                    if isinstance(m[key], dict):
                        m[key] = json.dumps(m[key], sort_keys=True)
                all_rows.append(m)
    fields = ["batch", "taskId", "seed", "arm", "model", "resolvedOption"]
    for m in all_rows:
        for k in m:
            if k not in fields:
                fields.append(k)
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        for m in all_rows:
            w.writerow({k: ("" if m.get(k) is None else m[k]) for k in fields})
    summary["csv"] = str(csv_path)

    plot_path = OUT / "trajectory_plot_input.csv"
    with open(plot_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["batch", "contrast", "stage", "mean", "ci_lo", "ci_hi", "n_tasks"])
        w.writeheader()
        for r in plot_rows:
            w.writerow({k: ("" if r[k] is None else r[k]) for k in r})
    summary["plotInput"] = str(plot_path)

    (OUT / "trajectory_summary.json").write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    (OUT / "trajectory_report.md").write_text("\n".join(report), encoding="utf-8")
    print(OUT / "trajectory_report.md")
    print(OUT / "trajectory_metrics.csv")


if __name__ == "__main__":
    main()
