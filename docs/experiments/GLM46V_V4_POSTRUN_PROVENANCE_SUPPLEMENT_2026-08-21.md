# GLM-4.6V V4 Post-run Provenance Supplement

Status: **POST-RUN SUPPLEMENT — descriptive provenance and allocation decision, not a pre-registration amendment**  
Date: 2026-08-21

## 1. Purpose and evidence status

This supplement records the exact source and artifact sets used by the completed GLM-4.6V V4 cross-model replication after two provenance-label defects were discovered. It does not modify the frozen plan, analysis specification, result files, estimand, missingness rules, bootstrap, or PASS classification.

The authoritative statistical output remains `experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-v4-20260820/analysis-v1.json`. The directory-level replay returned `ok=true` before and after analysis generation, and the frozen analysis recomputation returned `ok=true`.

## 2. Frozen identities and observed result

FACT:

- plan content hash: `sha256:e4722afccaa69e45bfb2bfbcd57cd17bdae0c8b98f3b62fed42b285f160872c6`;
- analysis-spec content hash: `sha256:54a8d53199ecc861d4328fac37c867b5a41978b0e06bd77693920ff9d88d4e88`;
- execution content hash: `sha256:65fc6a8b038e87e4c038108dd0e5935f668252dd96dd95806cc5ae3fcd28fb02`;
- analysis content hash: `sha256:5f2c86b1cbf7b945be227373b9d0c1f98912aaa361c042c063aee85babacdc8e`;
- 39 complete task pairs, 5 failed tasks, and 0 skipped tasks;
- equal-task mean `ATTACKS - CONTROL` final Brier difference: `-0.4937412482`;
- frozen 10,000-replicate task-bootstrap 95% interval: `[-0.6392148326, -0.3470966257]`;
- frozen classification: `PASS`;
- all-44 missingness bound after assigning every incomplete task the maximally adverse delta `+2`: upper mean `-0.2103615609`;
- 808 physical attempts, 808 finished attempts, 808 unique request hashes, 0 unknown-usage attempts, and 1,098,384 observed tokens.

These facts establish a favorable randomized comparative effect under this model, task population, seed, prompt/parser implementation, and strict completion policy. They do not establish universal governance efficacy or transport beyond the tested setup.

## 3. Qualification failures

FACT — the append-only ledger records five failed tasks:

- task 17: `final:agent:hiddenbench:17:1:invalid_belief_value`;
- task 25: `final:agent:hiddenbench:25:1:invalid_belief_value`;
- task 26: `discussion_r2:agent:hiddenbench:26:3:top_level_shape`;
- task 38: `final:agent:hiddenbench:38:1:invalid_belief_value`;
- task 53: `final:agent:hiddenbench:53:1:invalid_belief_value`.

The frozen analysis treats all five as missing tasks and includes them in the `[-2,+2]` all-population bound. They were not retried or replaced.

The summary fields `discussionParserFailures=0` and `finalInvalid=0` are row-derived counts over completed result files only. They must not be interpreted as zero qualification failures over all attempts; the ledger reasons above are the stronger authority for failed tasks.

## 4. Original execution-metadata defects

FACT:

1. `execution.json.sourceBundleHash` was computed from a hard-coded list that included the older `run_v6_fork_glm46v_two_arm.ts` but omitted the actual V4 runner `run_v6_fork_glm46v_two_arm_v4.ts`.
2. `execution.json.promptSchemaRefs.beliefParser` records version `1.0.0`, while the actual fork path used `FORK_BELIEF_PARSER_REF` version `2.0.0`. Discussion/final prompt labels also remained at their older version identifiers despite prompt-text changes.

These are provenance-label defects. They do not create treatment imbalance: CONTROL and ATTACKS used the same recorded execution source and the same fork input within each task. They do mean that `execution.json` alone is insufficient to reconstruct the exact V4 source, so this supplement and the accompanying repository commit are required provenance authorities.

## 5. Corrected content-addressed sets

Hash construction for every set below:

1. sort repository-relative file paths lexicographically;
2. for each file, compute SHA-256 over its exact bytes;
3. concatenate UTF-8 `path + LF + "sha256:" + byteHash + LF`;
4. compute SHA-256 over the concatenation.

### 5.1 Actual execution-source set

Set hash: `sha256:ab7ed239991abbf66460605f304cfb285b22a28f1172cfbec8e8fc7406ce8a3e`

Included files:

- `src/lib/llm/providers.ts`
- `src/lib/epistemic/contracts.ts`
- `src/lib/experimentation/finalOutcome.ts`
- `src/lib/experimentation/finalElicitationAdapter.ts`
- `experiments/campaign/v6/zhipuSingleAttemptInvoker.ts`
- `experiments/campaign/v6/providerAdapters.ts`
- `experiments/campaign/v6/providerDiagnostics.ts`
- `experiments/campaign/v6/productionVerticalSlice.ts`
- `experiments/campaign/v6/hiddenBenchTaskAdapter.ts`
- `experiments/campaign/v6/v6TaskManifest.ts`
- `experiments/campaign/v6/deepseekSingleAttemptInvoker.ts`
- `experiments/campaign/v6/run_v6_smoke.ts`
- `experiments/campaign/v6/run_v6_fork.ts`
- `experiments/campaign/v6/run_v6_fork_glm46v_two_arm_v4.ts`

### 5.2 Frozen analysis-source set

Set hash: `sha256:4be6831971a9808325219f2f5950a2a3895272e5202489381926ff561ffb0d51`

Included files:

- `docs/experiments/GLM46V_CROSS_MODEL_REPLICATION_ANALYSIS_FREEZE_V2.md`
- `experiments/campaign/v6/analyze_v6_fork_glm46v_v4.ts`

### 5.3 Focused test set

Set hash: `sha256:4ad079192502a1848d75b70568d8abf03462b90e2cf559b40a1d8d7ec511a2ed`

Included files:

- `test/v6-fork-glm46v-v4.test.ts`
- `test/zhipu-glm46v-provider.test.ts`

The final pre-run focused verification passed 101 tests across six related test files, and `tsc --noEmit` exited successfully.

### 5.4 Formal artifact set

Set hash: `sha256:4e18b28bb46c45895652f54fc48bffcb059635b5db0b2c5e8e79bd50018f57b1`  
File count: 46  
Directory: `experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-v4-20260820`

This set includes the frozen plan, execution record, append-only attempts ledger, manifest, summary, 39 run JSONL files, and the verified JSON/Markdown analysis outputs.

### 5.5 Successful excluded-task canary set

Set hash: `sha256:b1fc80a0839888c8793f5f7742ef3c41d46916af4a298012813fa03e363bba8f`  
File count: 5  
Directory: `experiments/campaign/pilot_output/v6-fork-glm46v-canary-task14-v4-jsonmode-20260821`

Task 14 remains excluded from the formal population. The canary established 20/20 finished unique attempts, complete discussion/final rosters, non-empty ATTACKS disclosure, no unknown usage, and no parser/final invalidity after the Zhipu JSON-mode wire contract was honored.

## 6. Paper allocation decision

DESIGN INTENT:

- Keep the first-paper empirical package frozen; do not retroactively redefine its original confirmatory claim around this result.
- Treat GLM-4.6V V4 as the prospective cross-model replication gate for the second-paper program.
- Use the result to justify testing a truth-blind detector or social-thermodynamic state-response model, not to claim that such a detector is already validated.
- If the first paper requires a robustness note before submission, cite this run only as a separately frozen supplemental replication with its own plan, missingness policy, and provenance limitations; do not pool it with the original model as if it were one pre-registered experiment.

The next scientific question is therefore not whether ATTACKS has a favorable pooled sign in this GLM run. It is whether admissible pre-action observations can identify the tasks on which the intervention rescues decision quality without reading ground truth.

