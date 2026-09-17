# GLM-4.6V V4 Cross-Model Replication Gate — Analysis V1

- analysis contentHash: `sha256:5f2c86b1cbf7b945be227373b9d0c1f98912aaa361c042c063aee85babacdc8e`
- plan hash: `sha256:e4722afccaa69e45bfb2bfbcd57cd17bdae0c8b98f3b62fed42b285f160872c6`
- analysis spec: `docs/experiments/GLM46V_CROSS_MODEL_REPLICATION_ANALYSIS_FREEZE_V2.md` @ `sha256:54a8d53199ecc861d4328fac37c867b5a41978b0e06bd77693920ff9d88d4e88`
- population: 44 tasks (task 14 excluded, canary only)

## Accounting (ledger/run health, not outcome)

- completed tasks: 39; failed: 5; skipped: 0
- physical attempts: 808; observed known tokens: 1098384; unknown-usage attempts: 0
- duplicate request hashes: 0
- parser-invalid by phase:arm: {}
- provider-unavailable by phase:arm: {}

## Primary estimand (equal-weight task mean of ATTACKS-CONTROL final Brier)

- complete pairs: 39; missing pairs: 5 ({"failed_task":5,"skipped_task":0,"null_brier":0,"unexplained_missing":0})
- mean delta: -0.493741
- 95% CI (10000 task bootstrap, seed 0x5eed0f): [-0.639215, -0.347097]
- classification: **PASS**
- all-44 worst/best bound (incomplete delta := -2/2, n=5): [-0.664907, -0.210362]

## Secondary (does not overturn the primary classification)

- accuracy paired mean delta: 0.358974 CI [0.179487, 0.512821]
- Spearman(round-1 pooled Brier, delta): -0.358582 CI [-0.621424, -0.032402]
- severity bin <0.3: 6 tasks, mean delta -0.091986
- severity bin 0.3-1.0: 21 tasks, mean delta -0.559654
- severity bin >1.0: 12 tasks, mean delta -0.579271

## Task-level table

| taskId | status | CONTROL brier | ATTACKS brier | delta | CONTROL acc | ATTACKS acc | round-1 pooled brier |
|---|---|---|---|---|---|---|---|
| 15 | pair | 0.875000 | 0.060000 | -0.815000 | 0 | 1 | 0.838438 |
| 16 | pair | 0.000000 | 0.000000 | 0.000000 | 1 | 1 | 0.215938 |
| 17 | missing(failed_task) | - | - | - | - | - | - |
| 18 | pair | 0.875000 | 0.875000 | 0.000000 | 0 | 0 | 0.474687 |
| 19 | pair | 0.875000 | 0.000000 | -0.875000 | 0 | 1 | 0.803750 |
| 20 | pair | 1.426250 | 1.097813 | -0.328437 | 0 | 0 | 0.843750 |
| 21 | pair | 0.487813 | 0.000000 | -0.487813 | 1 | 1 | 1.086563 |
| 22 | pair | 1.097813 | 0.000000 | -1.097813 | 0 | 1 | 1.222813 |
| 23 | pair | 0.638750 | 0.000000 | -0.638750 | 0 | 1 | 1.182187 |
| 25 | missing(failed_task) | - | - | - | - | - | - |
| 26 | missing(failed_task) | - | - | - | - | - | - |
| 27 | pair | 0.015000 | 0.000000 | -0.015000 | 1 | 1 | 0.293438 |
| 29 | pair | 2.000000 | 0.281250 | -1.718750 | 0 | 1 | 0.473806 |
| 30 | pair | 0.388889 | 0.097222 | -0.291667 | 1 | 1 | 0.228889 |
| 31 | pair | 0.810312 | 0.000000 | -0.810312 | 0 | 1 | 0.635000 |
| 34 | pair | 0.127222 | 0.000000 | -0.127222 | 1 | 1 | 0.246667 |
| 35 | pair | 1.148750 | 0.375000 | -0.773750 | 0 | 1 | 1.216250 |
| 36 | pair | 0.789688 | 0.000000 | -0.789688 | 0 | 1 | 0.740000 |
| 37 | pair | 0.587187 | 0.000000 | -0.587187 | 1 | 1 | 0.845000 |
| 38 | missing(failed_task) | - | - | - | - | - | - |
| 40 | pair | 1.046250 | 0.000000 | -1.046250 | 0 | 1 | 1.316250 |
| 41 | pair | 0.033750 | 0.015000 | -0.018750 | 1 | 1 | 0.365000 |
| 42 | pair | 0.033750 | 0.000000 | -0.033750 | 1 | 1 | 0.465000 |
| 43 | pair | 1.235000 | 0.000000 | -1.235000 | 0 | 1 | 1.109063 |
| 44 | pair | 1.460000 | 1.016250 | -0.443750 | 0 | 0 | 1.340000 |
| 46 | pair | 0.906562 | 0.375000 | -0.531562 | 0 | 1 | 1.103750 |
| 47 | pair | 1.376250 | 1.376250 | 0.000000 | 0 | 0 | 0.995000 |
| 48 | pair | 0.875000 | 0.875000 | 0.000000 | 0 | 0 | 0.836250 |
| 49 | pair | 0.492188 | 0.000000 | -0.492188 | 1 | 1 | 0.889924 |
| 50 | pair | 0.308889 | 0.222222 | -0.086667 | 1 | 1 | 0.222222 |
| 51 | pair | 1.046250 | 0.620000 | -0.426250 | 0 | 0 | 1.298750 |
| 52 | pair | 0.492188 | 0.016250 | -0.475938 | 1 | 1 | 0.482187 |
| 53 | missing(failed_task) | - | - | - | - | - | - |
| 55 | pair | 0.509062 | 0.000000 | -0.509062 | 1 | 1 | 0.875000 |
| 56 | pair | 0.555312 | 0.375000 | -0.180312 | 1 | 1 | 1.295000 |
| 57 | pair | 1.853750 | 2.000000 | 0.146250 | 0 | 0 | 1.283750 |
| 58 | pair | 0.889687 | 0.060000 | -0.829687 | 0 | 1 | 0.926250 |
| 59 | pair | 0.878750 | 0.000000 | -0.878750 | 0 | 1 | 0.785000 |
| 60 | pair | 0.420000 | 0.724063 | 0.304063 | 1 | 0 | 0.586250 |
| 61 | pair | 1.111250 | 0.875000 | -0.236250 | 0 | 0 | 1.030312 |
| 62 | pair | 0.226250 | 0.062812 | -0.163438 | 1 | 1 | 0.620000 |
| 63 | pair | 1.460000 | 0.004134 | -1.455866 | 0 | 1 | 0.929062 |
| 64 | pair | 1.295000 | 0.020000 | -1.275000 | 0 | 1 | 0.847812 |
| 65 | pair | 0.031362 | 0.000000 | -0.031362 | 1 | 1 | 0.210313 |
