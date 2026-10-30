# SwarmAlpha

[中文](README_CN.md)

SwarmAlpha studies information exposure and collective decisions in LLM multi-agent systems: how agents with asymmetric information revise probability reports after discussion and selected evidence.

The long-term goal is to understand when a group should acquire evidence, request review, or abstain without immediate ground truth. This remains a research direction, not a validated online governance capability.

## Research and implementation

The repository contains controlled exposure experiments, analysis code, a multi-channel decision-process state descriptor, and an offline semantic probe. The descriptor separates reported beliefs, information coverage, discussion utilization, and source dependence; these observations do not establish model-internal cognition or decision quality.

The project owner sets research definitions, design priorities, and research judgments, as recorded in the [research identity document](docs/research/SWARMALPHA_RESEARCH_IDENTITY_AND_DESIGN_PHILOSOPHY.md). Implementation uses AI assistance.

## Selected result

The [V3 report](docs/experiments/FORK_CONFIRMATORY_RESULTS_V3_2026-08-16.md) records a **post-hoc two-seed replication** using DeepSeek Chat: 45 tasks × 2 seeds × 3 arms (270 arm records). Seed 0 reused the earlier run; seed 1 was new. **mean Brier-loss difference (ATTACKS − SUPPORTS) = −0.412**, with **95% task-cluster bootstrap CI [−0.571, −0.267]**, averaging seeds within each of 45 tasks. Lower loss is better.

Fixed arm order, missing reports, and insufficient re-presentation controls limit mechanism claims. The development within-task reuse–Brier association did not replicate; general routing remains unvalidated. Complete V3 raw outputs are absent from public Git.

## Research Evolution

SwarmAlpha began with a question: how do heterogeneous agents' local views produce collective decisions? An external observation layer sought to make discussion states mathematically inspectable. To test a narrower question, same-state fork experiments compared information-exposure conditions: ATTACKS had lower average Brier loss than SUPPORTS in the reported comparison, while counterexamples showed why a universal disclosure rule would be inadequate. Separate [failure-prediction](docs/experiments/V6_PROCESS_STATE_FAILURE_PREDICTION_AUDIT_2026-08-13.md) and [cross-channel audits](docs/experiments/COLLECTIVE_DYNAMICS_D1_CROSS_CHANNEL_CONSTRUCT_AUDIT_2026-08-29.md) did not establish the stronger claims that state summaries could locate failures or probability reports added predictive value over prior public choices. These findings helped sharpen the distinction between describing a process, predicting its outcome, and choosing an intervention. In subsequent work, a multi-channel descriptor was implemented to preserve beliefs, information exposure, explicit discussion use, source records, and resources alongside code, measurement contracts, and negative results. Its empirical validity and the broader governance goal remain unresolved.

## Evidence & links

- [Core descriptor](src/lib/epistemic/collectiveDecisionProcessState.ts) · [V3 analysis](experiments/campaign/v6/analyze_v6_fork.ts)
- [Public experiment trace](results/v6_collective_dynamics_trajectory_sensor_v1_glm46v_seed1/public-task-1-seed-1.json): a separate recorded experiment, **not V3 raw output**.
- [Status and engineering handoff](docs/ACTIVE_RESEARCH_SURFACE.md): **active research is stopped**; setup, offline checks, preserved directions, and nonpublic package boundaries.
- [Reference documents](docs/README.md) · [MIT license](LICENSE)
