# Contribution and Novelty Review

## Overall assessment

This is a focused empirical paper with a credible core contribution: it isolates a post-state evidence-selection policy through a three-arm fork from the same recorded Round-1 state and evaluates the resulting probabilistic decisions with proper loss. The manuscript is unusually disciplined about internal pre-specification, the post-hoc status of seed 1, prior task use, missing reports, self-labeled relations, and the difference between intervention efficacy and truth-blind routing. The main revision need is positioning, not a new experiment. The title and a few concluding phrases still sound like a semantic claim about evidence direction or a practically usable intervention, whereas the identified estimand is the bundled effect of two model-label-conditioned selectors under one protocol. The related-work section is accurate but too compressed to fully defend the novelty claim.

## Rubric scores

| Dimension | Score | Justification |
|---|---:|---|
| Contribution clarity | 4/5 | The identical-state estimand and its boundaries are explicit. Clarity is reduced by presenting design, empirical result, and robustness as three nominal contributions when they are better understood as one empirical contribution with an identification device and validation evidence. |
| Novelty | 3/5 | The same-realized-state ATTACKS/SUPPORTS/CONTROL contrast appears meaningfully differentiated from end-to-end debate, topology, aggregation, and debate-initiation interventions. The novelty is primarily experimental identification and a new empirical finding, not a general algorithm or validated theory of disconfirming evidence. |
| Evidence-to-claim strength | 4/5 | Paired same-state comparisons, a frozen seed-0 analysis, task-level inference, leave-one-task-out stability, prior-use exclusion, and complete-block sensitivity strongly support the within-protocol policy contrast. One model, one task bank, two seeds, unvalidated target-free labels, unmatched exposure/source composition, and unresolved missingness prevent stronger general claims. |
| Venue appropriateness | 4/5 | The paper offers a compact, falsifiable multi-agent intervention result suitable for an AAMAS short-paper context. It will fit better if the narrative treats the fork as the identification design for one central result and uses the saved space to sharpen adjacent-work differentiation. |

## Specific findings

### 1. Introduction: consolidate the contribution around one scientific claim

The three-item contribution list over-fragments the novelty. “Robustness with explicit boundaries” is good research practice and evidence for the result, but it is not a separate scientific contribution. Likewise, the identical-state fork is chiefly the design that identifies the policy contrast. State one primary contribution—an identified within-protocol effect of model-label-conditioned disclosure—then name the fork and robustness analyses as the method and evidence that make that contribution credible. This would make the paper feel less padded and more decisive.

### 2. Title, Abstract, and Conclusion: avoid upgrading operational labels into semantic direction

“Evidence Direction Matters” is broader than the implemented construct. `supports` and `attacks` are target-free model self-labels, and disclosure amount and source composition were not experimentally matched. The manuscript correctly states these limitations in Sections 2.1 and 4, but the title and “direction-conditioned evidence selection matters here” can still be read as establishing a semantic property of confirming versus disconfirming evidence. Prefer wording such as “model-labeled evidence selection” or “ATTACKS-conditioned disclosure” in the title and headline claim, while retaining the selector-bundle estimand explicitly.

### 3. Introduction and Experimental Design: describe the intervention as resurfacing or salience control

The Introduction asks which evidence “should enter the shared public context,” but Section 2.1 explains that structured items can already be semantically present in the common transcript. The intervention therefore changes structured resurfacing and attention, not necessarily information availability. The latter description is both more accurate and more interesting: it isolates public salience after a shared state. Use this terminology consistently from the opening motivation onward.

### 4. Discussion and Related Work: the comparisons are accurate but not yet sufficient for a strong novelty defense

The distinctions from debate initiation, confidence/diversity interventions, conformity, and error-cascade diagnosis are directionally accurate. However, the section is only two compact paragraphs and does not engage the closest adjacent categories identified in the gap map: communication-induced dependence/calibration and topology selection, counterfactual interaction or coupling measurement, and broader structured-communication or evidence-weighted aggregation. Add one concise comparison paragraph that states, for each nearest category, what variable it changes, what outcome it evaluates, and why it does not estimate this same-state selector contrast. Do not claim precedence; claim a specific unfilled contrast within the reviewed literature.

### 5. Results and Discussion: retain targeted-rescue heterogeneity as exploratory Paper 1 evidence

Section 3.3 is appropriately labeled post-hoc, answer-key-dependent, and vulnerable to room-to-improve and regression-to-the-mean explanations. It may remain because it helps interpret the average treatment effect as potentially concentrated on would-have-failed tasks rather than as a universal booster. It must not be reframed as an online detector, non-harm result, or validated routing signal. If space is tight, keep the qualitative pattern and its caveats rather than expanding this into a routing analysis.

### 6. Discussion: remove the exact-reuse detector statistics from Paper 1

The paragraph reporting development and treatment-set correlations for exact-hash reuse is not needed to establish the intervention result. It redirects attention toward a failed detector, invites questions about a second estimand, and spends scarce short-paper space on the separate routing problem. Replace it with one boundary sentence: the current study does not identify a truth-blind pre-action trigger, and answer-key-based Round-1 severity is offline only. Preserve detector development, adaptive routing, and policy-value evaluation for Paper 2.

### 7. Conclusion: soften practical usability, not the empirical result

“This establishes a usable intervention result” overstates current practical readiness given the single model/benchmark, target-free labels, selector-bundle confounding, and absence of a routing rule. “This establishes a robust within-protocol intervention effect” is supported. Conversely, the paper should not understate the result merely because it is concentrated on severe failures: selective rescue is scientifically meaningful, provided the manuscript keeps the detector problem separate and does not imply universal benefit.

## Paper 1 / Paper 2 boundary

Paper 1 should contain the identical-state intervention design, the ATTACKS-versus-SUPPORTS/CONTROL proper-loss result, qualification of seed status and task reuse, robustness to complete blocks and influential tasks, and carefully caveated offline heterogeneity. Paper 2 should own truth-blind failure detection, treatment-benefit prediction, adaptive routing, cost-aware policy comparison, semantic/source-dependence measures, and any social-thermodynamic state representation. The current manuscript mostly respects this separation; the exact-reuse paragraph is the principal spillover and should be cut.

## Recommendation

**Minor Revision.** The central contribution is credible, appropriately bounded, and supported by strong within-protocol evidence. Acceptance would be strengthened by consolidating the contribution narrative, narrowing semantic and usability language, expanding the nearest-neighbor related-work comparison, and removing the detector digression. These changes do not require new empirical claims.
