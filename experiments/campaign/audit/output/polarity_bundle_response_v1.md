# V6 Polarity-Bundle Response L0 Results

Status: post-hoc, zero-provider, read-only bundle analysis.

## L1 decision

**GO_L1**

- all frozen L1 conditions satisfied

## Frozen summaries

Positive values mean lower Brier for ATTACKS/SUPPORTS than CONTROL; positive GAP_AS means ATTACKS has greater bundle value than SUPPORTS.

| View | R1 stratum | n tasks/blocks | V_ATTACKS mean [95% CI] | V_SUPPORTS mean [95% CI] | GAP_AS mean [95% CI] | GAP LOTO sign change |
|---|---|---:|---:|---:|---:|---|
| DeepSeek seed 0 | wrong | 31/31 | +0.4410 [+0.2141, +0.6913] | -0.0298 [-0.2464, +0.2059] | +0.4708 [+0.2633, +0.6855] | False |
| DeepSeek seed 0 | correct | 14/14 | +0.0123 [-0.0104, +0.0460] | -0.0487 [-0.1246, +0.0029] | +0.0609 [-0.0117, +0.1615] | False |
| DeepSeek seed 1 | wrong | 28/28 | +0.5521 [+0.3055, +0.8240] | -0.1769 [-0.3404, -0.0200] | +0.7290 [+0.4703, +1.0009] | False |
| DeepSeek seed 1 | correct | 16/16 | +0.0227 [-0.0545, +0.1344] | -0.0542 [-0.2108, +0.1126] | +0.0769 [-0.0004, +0.1871] | False |
| DeepSeek pooled task-equal | wrong | 32/59 | +0.4593 [+0.2736, +0.6571] | -0.1206 [-0.2596, +0.0220] | +0.5799 [+0.3805, +0.7754] | False |
| DeepSeek pooled task-equal | correct | 17/30 | +0.0163 [-0.0167, +0.0676] | -0.0666 [-0.1921, +0.0386] | +0.0829 [-0.0032, +0.1940] | False |
| GLM-4.6V seed 2 | wrong | 29/29 | +0.7180 [+0.5374, +0.9051] | +0.3108 [+0.1406, +0.4664] | +0.4072 [+0.1627, +0.6537] | False |
| GLM-4.6V seed 2 | correct | 12/12 | +0.3205 [+0.0805, +0.6749] | -0.0144 [-0.1015, +0.0812] | +0.3349 [+0.0883, +0.6868] | False |

## Missingness

| View | total blocks | complete | missing |
|---|---:|---:|---:|
| DeepSeek seed 0 | 45 | 45 | 0 |
| DeepSeek seed 1 | 45 | 44 | 1 |
| DeepSeek pooled task-equal | 90 | 89 | 1 |
| GLM-4.6V seed 2 | 41 | 41 | 0 |

## Interpretation boundary

- This is a post-hoc complete-block bundle analysis, not message-level trajectory value.
- supports/attacks are model-self-labeled relations without a target option.
- Round-1 correctness is an offline evaluator stratum and has no online detector authority.
- No cross-model grand pool is computed.
- A task may appear in both descriptive DeepSeek strata when seeds realize different Round-1 top choices; no formal between-stratum contrast is made.
