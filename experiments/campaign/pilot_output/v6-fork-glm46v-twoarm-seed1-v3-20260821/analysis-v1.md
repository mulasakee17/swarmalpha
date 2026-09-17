# GLM-4.6V V4 Cross-Model Replication Gate — Analysis V1

- analysis contentHash: `sha256:c21cb34f44d8a8497991447964eeefc31adecaa6b28b6393fcf89160e6fa563f`
- plan hash: `sha256:35b1fe76bcd1aedd1474208cbc82599125bb41fa2f78c0523eb01b21a99fa333`
- analysis spec: `docs/experiments/GLM46V_SEED1_REPLICATION_ANALYSIS_FREEZE_V1.md` @ `sha256:a4ea0552e2b58527b334093cb81edd0d7930673e630b1055a9a4ff7f27b30e20`
- population: 44 tasks (task 14 excluded, canary only)

## Accounting (ledger/run health, not outcome)

- completed tasks: 39; failed: 5; skipped: 0
- physical attempts: 803; observed known tokens: 1088883; unknown-usage attempts: 0
- duplicate request hashes: 0
- parser-invalid by phase:arm: {}
- provider-unavailable by phase:arm: {}

## Primary estimand (equal-weight task mean of ATTACKS-CONTROL final Brier)

- complete pairs: 39; missing pairs: 5 ({"failed_task":5,"skipped_task":0,"null_brier":0,"unexplained_missing":0})
- mean delta: -0.504993
- 95% CI (10000 task bootstrap, seed 0x5eed0f): [-0.670825, -0.342186]
- classification: **PASS**
- all-44 worst/best bound (incomplete delta := -2/2, n=5): [-0.674880, -0.220335]

## Secondary (does not overturn the primary classification)

- accuracy paired mean delta: 0.461538 CI [0.282051, 0.641026]
- Spearman(round-1 pooled Brier, delta): -0.338127 CI [-0.642705, 0.011068]
- severity bin <0.3: 5 tasks, mean delta -0.120722
- severity bin 0.3-1.0: 22 tasks, mean delta -0.475543
- severity bin >1.0: 12 tasks, mean delta -0.719099

## Task-level table

| taskId | status | CONTROL brier | ATTACKS brier | delta | CONTROL acc | ATTACKS acc | round-1 pooled brier |
|---|---|---|---|---|---|---|---|
| 15 | pair | 0.875000 | 0.000000 | -0.875000 | 0 | 1 | 0.686250 |
| 16 | pair | 0.003750 | 0.000000 | -0.003750 | 1 | 1 | 0.191563 |
| 17 | missing(failed_task) | - | - | - | - | - | - |
| 18 | pair | 0.875000 | 0.743437 | -0.131563 | 0 | 0 | 0.506563 |
| 19 | pair | 0.875000 | 0.000000 | -0.875000 | 0 | 1 | 0.916250 |
| 20 | pair | 0.375000 | 0.304062 | -0.070938 | 1 | 1 | 0.551250 |
| 21 | pair | 0.825380 | 0.000000 | -0.825380 | 0 | 1 | 0.953750 |
| 22 | pair | 1.623750 | 0.003750 | -1.620000 | 0 | 1 | 1.308750 |
| 23 | pair | 0.788750 | 0.000000 | -0.788750 | 0 | 1 | 1.283750 |
| 25 | missing(failed_task) | - | - | - | - | - | - |
| 26 | pair | 1.163750 | 0.210313 | -0.953437 | 0 | 1 | 1.173750 |
| 27 | pair | 0.003750 | 0.000000 | -0.003750 | 1 | 1 | 0.290938 |
| 29 | pair | 1.554688 | 0.000000 | -1.554688 | 0 | 1 | 0.593750 |
| 30 | pair | 0.495556 | 0.026667 | -0.468889 | 1 | 1 | 0.260556 |
| 31 | pair | 0.803750 | 0.000000 | -0.803750 | 0 | 1 | 0.691250 |
| 34 | pair | 0.127222 | 0.000000 | -0.127222 | 1 | 1 | 0.228889 |
| 35 | pair | 1.226250 | 0.375000 | -0.851250 | 0 | 1 | 1.148750 |
| 36 | pair | 0.580313 | 0.000000 | -0.580313 | 0 | 1 | 1.318437 |
| 37 | pair | 0.455000 | 0.000000 | -0.455000 | 1 | 1 | 0.498750 |
| 38 | missing(failed_task) | - | - | - | - | - | - |
| 40 | pair | 2.000000 | 0.500000 | -1.500000 | 0 | 0 | 1.128750 |
| 41 | pair | 0.686250 | 0.420000 | -0.266250 | 0 | 1 | 0.929062 |
| 42 | pair | 0.008750 | 0.000000 | -0.008750 | 1 | 1 | 0.348750 |
| 43 | pair | 0.031250 | 0.000000 | -0.031250 | 1 | 1 | 0.641563 |
| 44 | pair | 0.926250 | 0.000000 | -0.926250 | 0 | 1 | 1.023750 |
| 46 | pair | 0.826374 | 0.375000 | -0.451374 | 0 | 1 | 1.103750 |
| 47 | missing(failed_task) | - | - | - | - | - | - |
| 48 | pair | 0.875000 | 0.929062 | 0.054062 | 0 | 0 | 0.796250 |
| 49 | pair | 0.875000 | 0.000000 | -0.875000 | 0 | 1 | 0.990868 |
| 50 | pair | 0.581667 | 0.506667 | -0.075000 | 1 | 0 | 0.666667 |
| 51 | pair | 0.930312 | 1.046250 | 0.115937 | 0 | 0 | 1.286250 |
| 52 | pair | 0.580313 | 0.930312 | 0.350000 | 0 | 0 | 0.533750 |
| 53 | missing(failed_task) | - | - | - | - | - | - |
| 55 | pair | 0.875000 | 0.000000 | -0.875000 | 0 | 1 | 0.875000 |
| 56 | pair | 0.375000 | 0.375000 | 0.000000 | 1 | 1 | 1.295000 |
| 57 | pair | 1.853750 | 2.000000 | 0.146250 | 0 | 0 | 1.411250 |
| 58 | pair | 0.903750 | 0.060000 | -0.843750 | 0 | 1 | 0.875000 |
| 59 | pair | 1.125000 | 0.000000 | -1.125000 | 0 | 1 | 0.983750 |
| 60 | pair | 1.411250 | 1.496250 | 0.085000 | 0 | 0 | 0.777187 |
| 61 | pair | 0.875000 | 0.991250 | 0.116250 | 0 | 0 | 0.858750 |
| 62 | pair | 0.260000 | 0.004063 | -0.255937 | 1 | 1 | 0.420000 |
| 63 | pair | 1.460000 | 0.240000 | -1.220000 | 0 | 1 | 1.312812 |
| 64 | pair | 1.140000 | 0.020000 | -1.120000 | 0 | 1 | 0.821250 |
| 65 | pair | 0.000000 | 0.000000 | 0.000000 | 1 | 1 | 0.203750 |
