# FORK Confirmatory Scope Resolution

Date: 2026-08-20  
Status: current claim-scope resolution; does not alter raw data, frozen H1/H2, treatment code, or statistical outputs.

## Question

Does `TASK_CONTAMINATION_REGISTRY_V1.md` make the 45-task ATTACKS/SUPPORTS fork experiment unusable as evidence?

## Short answer

**No.** The experiment remains usable evidence for the prospectively specified ATTACKS-versus-SUPPORTS and ATTACKS-versus-CONTROL contrasts under the implemented same-state fork protocol. The earlier registry creates a real documentation conflict, but its broad task-level exclusion rule is stronger than what is logically required to identify a new treatment contrast.

The conflict changes the paper's labels and scope, not the observed effect:

- the study may be described as an **internally pre-specified confirmatory test of a new treatment contrast**;
- it must not be described as externally preregistered;
- the tasks were held out from ATTACKS/SUPPORTS outcome inspection, not unseen in every sense;
- the result establishes an internal protocol contrast, not independent generalization to untouched task or semantic families.

## 1. Facts

1. `TASK_CONTAMINATION_REGISTRY_V1.md` was frozen on 2026-08-13 for the V6 measurement-validity and detector program. Its wording nevertheless extended broadly to any `confirmatory split` and required semantic/leakage-group review before a task received held-out authority.
2. The later fork manifest froze a different research question: whether ATTACKS disclosure changes proper loss relative to SUPPORTS and CONTROL. Its development criterion was prior inspection of ATTACKS/SUPPORTS fork outcomes.
3. H1, H2, the task list, the arm definitions, the task-cluster bootstrap, and the decision rule were recorded before the seed-0 results were analyzed in the project log and manifest. The repository does not contain an external or independently timestamped preregistration; the relevant Git commit was made after the run.
4. Eighteen of the 45 fork tasks had been used previously as engineering canaries or in experiments on other mechanisms. No ATTACKS/SUPPORTS fork outcome for those tasks was part of the development evidence used to form H1/H2, according to the fork freeze record.
5. Removing all 18 previously used tasks leaves 27 tasks. In the canonical 10,000-resample task bootstrap (`mulberry32`, master seed `0x5EED0F`), the pooled two-seed effect remains negative for both contrasts: ATTACKS−SUPPORTS mean `−0.403` with interval `[−0.613, −0.211]`; ATTACKS−CONTROL mean `−0.303` with interval `[−0.500, −0.127]`.

## 2. Logical distinction

Task reuse can threaten several different claims. They should not be collapsed.

### 2.1 Internal identification of the treatment contrast

The same realized Round-1 state is forked into CONTROL, SUPPORTS, and ATTACKS. Prior observation of a task under a different intervention does not by itself create the within-state ATTACKS−SUPPORTS difference. The internal contrast is threatened only if prior task knowledge influenced treatment construction, task inclusion, outcome handling, or analysis choices in a way correlated with the later contrast.

The frozen design and the 27-task exclusion sensitivity reduce, but do not eliminate, that concern. Therefore the current data support the treatment contrast under the tested protocol.

### 2.2 Confirmatory status for H1/H2

The fork study can be confirmatory **with respect to the new direction-policy outcome**, because H1/H2 and the corresponding task split were internally frozen before inspecting those outcomes. This is a mechanism-specific meaning of confirmatory.

It is not an externally verifiable preregistration. The paper should use `internally pre-specified confirmatory contrast`, not the unqualified term `pre-registered`.

### 2.3 Task-heldout and external-generalization status

The study is not a clean test on tasks that were untouched by every prior project decision. Semantic/leakage groups were not prospectively reviewed. The 45 tasks therefore do not carry strong authority for claims of benchmark-wide, task-family, or cross-domain generalization.

This limitation affects the breadth of the claim and the independence unit used for uncertainty. It does not turn the recorded observations into unusable data.

## 3. Resolution of the document conflict

The 2026-08-13 registry remains a valid conservative rule for:

- detector development-to-heldout evaluation;
- measurement-validity claims;
- claims that require independence across task or semantic families;
- reuse of outcomes or thresholds from the same mechanism being tested.

Its blanket prohibition is not treated as a logical theorem that any prior use under any unrelated mechanism invalidates every future randomized or same-state contrast. For a new intervention contrast, admissibility is contrast-specific and requires all of the following:

1. the new treatment and estimand were specified before their outcome inspection;
2. prior results from the reused tasks did not select or tune the new contrast;
3. the paper reports the exact prior-use boundary rather than calling the tasks broadly unseen;
4. an exclusion sensitivity removes all tasks whose previous use could plausibly influence design;
5. claims remain internal to the tested protocol unless a clean task-family replication is performed.

This resolution is a post-run clarification of claim scope. It is not retroactive evidence of external preregistration and does not upgrade the task set to independent semantic-family heldout status.

## 4. Paper wording authorized by this resolution

Allowed:

> We internally pre-specified H1/H2 and froze 45 tasks whose ATTACKS/SUPPORTS fork outcomes had not been inspected. Seed 0 is the confirmatory contrast under this project-internal specification; seed 1 and the pooled estimate are post-hoc robustness analyses.

Required accompanying boundary:

> Some tasks had appeared in earlier experiments on other mechanisms. Excluding all 18 such tasks preserved both pooled effects. This supports robustness of the treatment contrast but does not provide external preregistration or independent task-family generalization.

Not allowed:

- `45 unseen tasks` without qualification;
- `externally preregistered`;
- `independent benchmark replication`;
- `semantic-family heldout validation`.

## 5. Decision

**USE the experiment for the first paper.** Preserve seed 0 as the internally pre-specified primary analysis, present seed 1 as post-hoc robustness, add the prior-use exclusion sensitivity, and bound the conclusion to the implemented DeepSeek–HiddenBench fork protocol.

The next paper must use a prospectively reviewed task-family split if it claims detector generalization or adaptive routing validity.
