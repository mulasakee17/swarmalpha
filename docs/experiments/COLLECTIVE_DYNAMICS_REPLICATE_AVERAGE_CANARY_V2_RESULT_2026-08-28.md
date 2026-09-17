# Collective Dynamics Replicate-Average Canary V2 Result

Date: 2026-08-28  
Status: **EXECUTED; PREDECLARED CANONICAL REPEATABILITY GATES PASS**

## FACT

The frozen GLM-4.6V V2 batch completed all 40 registered cells with one raw
provider attempt per cell and no retry.

```text
planHash:   sha256:656b9fc3526efa84798e54f63359d86dd22fffac30c0ce5df4b2a2dee25897d5
freezeHash: sha256:41043a9ca5e7fe231a588c68d2e4fdd0efe7167e1b5f1a74ca4b0f71a27d6bc9
runHash:    sha256:577261d3b79a7ba8fd50f1d257a76832978aafef9ac97f5131ec47ad75fd2845
analysisHash: sha256:760439c78e5b8376e4345c988c6171de4810aea1cfd99ec0c5e6c1b79fd7350e
```

All four repeat labels were valid:

```text
A1 10/10   B1 10/10   A2 10/10   B2 10/10
```

The split-half estimator produced:

```text
valid views:                         10/10
mean unit split-half TV:             0
nearest-rank P90 unit split-half TV: 0
unique-top agreement:               10/10
indeterminate ties:                  0
```

For each of tasks 8, 29, and 50, the block-A versus block-B differences were
zero for pooled-report TV, mean normalized entropy, and normalized generalized
JSD. The batch contained three distinct response distributions across views,
so the zero split-half result is not caused by every view sharing one constant
distribution. Provider metadata and the 80-event append-only ledger are present
in `run.json` and `attempts.jsonl`.

All predeclared V2 development gates passed, yielding `SENSOR_PASS`.

## INFERENCE

Under the exact canonical prompt, fixed GLM-4.6V model/configuration, and this
provider boundary, averaging two repeats is reproducible on the ten registered
frozen views. This supports using the replicate-average estimator as the noise
baseline for a separately frozen peer-message comparison.

This result does **not** qualify the sensor across option order, wording,
models, seeds, languages, or task families. It also does not erase the V1
prompt-sensitivity failure: V1 found one view whose reports changed across
elicitation variants. V2 deliberately tests exact-repeat stability only; its
zero variance is therefore a property of this canonical instrument and provider
configuration, not evidence of latent-belief access or a general measurement
law.

## DECISION

The V2 canonical repeatability gate is passed. The next scientifically allowed
step is to design and freeze the matched `NO_PEER_A/B` versus `PEER_A/B` bundle
screen using the same replicate-average estimator. That is eligibility to review
an M1 protocol, not authorization to execute M1. No multi-round dynamics,
external field, attractor, phase, or governance claim is licensed by this
result.

## ARTIFACTS

- freeze directory: `results/v6_collective_dynamics_replicate_average_canary_v2_glm46v_seed1`
- contract: `experiments/campaign/v6/collectiveDynamicsReplicateAverageCanaryV2.ts`
- runner: `experiments/campaign/v6/run_v6_collective_dynamics_replicate_average_canary_v2.ts`
- analyzer: `experiments/campaign/v6/analyze_v6_collective_dynamics_replicate_average_canary_v2.ts`
