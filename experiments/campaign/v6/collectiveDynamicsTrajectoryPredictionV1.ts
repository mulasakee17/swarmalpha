/**
 * Truth-blind predictor schema for the post-M2 trajectory work.
 *
 * This module only derives covariates from a reported macrostate. It does not
 * fit a model, read outcomes, or claim predictive validity. The eventual GLM
 * must be fit with grouped-by-task validation and held-out future checkpoints.
 */

import type { DiscussionThermometerStateV1 } from "../../../src/lib/epistemic/discussionThermometer";

export type TrajectoryPredictionFeatureFamilyV1 = "B0" | "B1" | "M" | "R";

export interface TrajectoryPredictionMacrostateV1 {
  pooledProbabilities: { optionIds: readonly string[]; values: readonly number[] } | null;
  meanNormalizedReportEntropy: number | null;
  pooledNormalizedEntropy: number | null;
  normalizedGeneralizedJsd: number | null;
  pooledConcentration: number | null;
  maxPairwiseTotalVariation: number | null;
  comparableAgentIds: readonly string[];
  rosterComplete: boolean;
}

export interface TrajectoryPredictionFeaturesV1 {
  featureSchema: "collective-dynamics-trajectory-predictor-v1";
  family: TrajectoryPredictionFeatureFamilyV1;
  checkpointRound: 0 | 1 | 2 | 3;
  expectedAgentCount: number;
  observedAgentFraction: number;
  optionCount: number | null;
  pooledSortedProbabilities: number[];
  meanNormalizedReportEntropy: number | null;
  pooledNormalizedEntropy: number | null;
  normalizedGeneralizedJsd: number | null;
  pooledConcentration: number | null;
  maxPairwiseTotalVariation: number | null;
}

/** A task/semantic-group keyed row used only to construct honest CV folds. */
export interface TrajectoryPredictionGroupedRowV1 {
  taskId: string;
  semanticGroupId: string;
}

export interface TrajectoryPredictionFoldV1 {
  holdoutGroupId: string;
  trainIndices: number[];
  testIndices: number[];
}

/**
 * Deterministic leave-one-group-out folds.
 *
 * This is deliberately a split primitive rather than a model fitter.  The
 * caller must choose `taskId` for development or `semanticGroupId` for the
 * held-out qualification split.  Repeated agents/rounds stay in one group
 * whenever the caller supplies the same key.
 */
export function leaveOneGroupOutFoldsV1(
  rows: readonly TrajectoryPredictionGroupedRowV1[],
  groupKey: "taskId" | "semanticGroupId",
): TrajectoryPredictionFoldV1[] {
  if (rows.length === 0) return [];
  const groups = Array.from(new Set(rows.map(row => {
    const group = row[groupKey];
    if (typeof group !== "string" || group.trim().length === 0) {
      throw new Error(`trajectory_prediction_${groupKey}_invalid`);
    }
    return group;
  }))).sort();
  return groups.map(holdoutGroupId => ({
    holdoutGroupId,
    trainIndices: rows.flatMap((row, index) => row[groupKey] === holdoutGroupId ? [] : [index]),
    testIndices: rows.flatMap((row, index) => row[groupKey] === holdoutGroupId ? [index] : []),
  }));
}

export interface PairedSignFlipNullSummaryV1 {
  observedMean: number;
  repetitions: number;
  method: "exact" | "monte_carlo";
  nullMean: number;
  absoluteQuantile95: number;
  twoSidedExceedance: number;
}

/**
 * Pair-preserving, seedable sign-flip null for a task-level loss contrast.
 *
 * Under the null of exchangeability of the two arms, each paired difference
 * may have its sign flipped.  This estimates finite-sample resolution only;
 * it is not a confidence interval and does not repair a biased task bank.
 */
export function pairedSignFlipNullSummaryV1(input: {
  deltas: readonly number[];
  repetitions?: number;
  seed?: number;
  exactWhenPossible?: boolean;
}): PairedSignFlipNullSummaryV1 {
  if (input.deltas.length === 0 || input.deltas.some(value => !Number.isFinite(value))) {
    throw new Error("trajectory_prediction_deltas_invalid");
  }
  const requestedRepetitions = input.repetitions ?? 10_000;
  if (!Number.isInteger(requestedRepetitions) || requestedRepetitions < 100) {
    throw new Error("trajectory_prediction_repetitions_invalid");
  }
  const seed = input.seed ?? 0x51A7;
  if (!Number.isInteger(seed)) throw new Error("trajectory_prediction_seed_invalid");
  // Local deterministic generator keeps this utility provider-free.
  let state = seed >>> 0;
  const nextUnit = (): number => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const observedMean = input.deltas.reduce((sum, value) => sum + value, 0) / input.deltas.length;
  const nullMeans: number[] = [];
  const useExact = (input.exactWhenPossible ?? true) && input.deltas.length <= 20;
  if (useExact) {
    const combinations = 2 ** input.deltas.length;
    for (let mask = 0; mask < combinations; mask++) {
      let total = 0;
      for (let index = 0; index < input.deltas.length; index++) {
        total += ((mask >>> index) & 1) === 1 ? input.deltas[index] : -input.deltas[index];
      }
      nullMeans.push(total / input.deltas.length);
    }
  } else {
    for (let repetition = 0; repetition < requestedRepetitions; repetition++) {
      let total = 0;
      for (const delta of input.deltas) total += nextUnit() < 0.5 ? delta : -delta;
      nullMeans.push(total / input.deltas.length);
    }
  }
  nullMeans.sort((a, b) => a - b);
  const absoluteNullMeans = nullMeans.map(Math.abs).sort((a, b) => a - b);
  const absoluteQuantile95 = absoluteNullMeans[
    Math.min(absoluteNullMeans.length - 1, Math.ceil(0.95 * absoluteNullMeans.length) - 1)
  ];
  const exceedances = nullMeans.filter(value =>
    Math.abs(value) >= Math.abs(observedMean) - Number.EPSILON).length;
  const twoSidedExceedance = useExact
    ? exceedances / nullMeans.length
    : (exceedances + 1) / (nullMeans.length + 1);
  return {
    observedMean,
    repetitions: nullMeans.length,
    method: useExact ? "exact" : "monte_carlo",
    nullMean: nullMeans.reduce((sum, value) => sum + value, 0) / nullMeans.length,
    absoluteQuantile95,
    twoSidedExceedance,
  };
}

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name}_invalid`);
  return value;
}

/**
 * Derive a permutation-invariant reported-state feature vector.
 *
 * B0 contains only exposure-independent bookkeeping and roster coverage;
 * B1 adds concentration and disagreement; M adds the sorted pooled vector;
 * R is the full available reported macrostate. No field here depends on a
 * ground-truth answer.
 */
export function buildTrajectoryPredictionFeaturesV1(input: {
  family: TrajectoryPredictionFeatureFamilyV1;
  checkpointRound: 0 | 1 | 2 | 3;
  expectedAgentCount: number;
  state: TrajectoryPredictionMacrostateV1;
}): TrajectoryPredictionFeaturesV1 {
  const expectedAgentCount = finiteNonNegative(input.expectedAgentCount, "expected_agent_count");
  if (!Number.isInteger(expectedAgentCount) || expectedAgentCount <= 0) {
    throw new Error("expected_agent_count_invalid");
  }
  const observedAgentFraction = input.state.comparableAgentIds.length / expectedAgentCount;
  if (observedAgentFraction < 0 || observedAgentFraction > 1) {
    throw new Error("observed_agent_fraction_invalid");
  }
  const pooled = input.state.pooledProbabilities;
  if (pooled && pooled.optionIds.length !== pooled.values.length) {
    throw new Error("pooled_probability_shape_invalid");
  }
  const pooledSortedProbabilities = pooled
    ? [...pooled.values].sort((left, right) => right - left)
    : [];
  const optionCount = pooled ? pooled.optionIds.length : null;
  const includeConcentration = input.family !== "B0";
  const includePooledVector = input.family === "M" || input.family === "R";
  return {
    featureSchema: "collective-dynamics-trajectory-predictor-v1",
    family: input.family,
    checkpointRound: input.checkpointRound,
    expectedAgentCount,
    observedAgentFraction,
    optionCount,
    pooledSortedProbabilities: includePooledVector ? pooledSortedProbabilities : [],
    meanNormalizedReportEntropy: includeConcentration
      ? input.state.meanNormalizedReportEntropy : null,
    pooledNormalizedEntropy: includeConcentration
      ? input.state.pooledNormalizedEntropy : null,
    normalizedGeneralizedJsd: includeConcentration
      ? input.state.normalizedGeneralizedJsd : null,
    pooledConcentration: includeConcentration ? input.state.pooledConcentration : null,
    maxPairwiseTotalVariation: input.family === "R"
      ? input.state.maxPairwiseTotalVariation : null,
  };
}

/** L4 families are nested and use only information available at checkpoint t. */
export type ThermometerQualificationFeatureFamilyV1 =
  | "STRUCTURAL"
  | "BEHAVIOR"
  | "MACRO"
  | "MICROSTATE";

export interface ThermometerQualificationFeaturesV1 {
  featureSchema: "discussion-thermometer-qualification-features-v1";
  family: ThermometerQualificationFeatureFamilyV1;
  eligible: boolean;
  missingReasons: string[];
  /** Models may compare rows only inside one fixed shape stratum. */
  shapeKey: string;
  names: string[];
  values: number[];
}

function sortedValues(record: Readonly<Record<string, number>>, optionIds: readonly string[]): number[] {
  return optionIds.map(optionId => record[optionId]).sort((left, right) => right - left);
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function choiceLagTotalVariation(
  current: Readonly<Record<string, number>>,
  previous: Readonly<Record<string, number>>,
  optionIds: readonly string[],
): number {
  return 0.5 * optionIds.reduce((sum, optionId) =>
    sum + Math.abs(current[optionId] - previous[optionId]), 0);
}

function permutations(values: readonly number[]): number[][] {
  if (values.length <= 1) return [[...values]];
  const output: number[][] = [];
  for (let index = 0; index < values.length; index++) {
    const head = values[index];
    const tail = [...values.slice(0, index), ...values.slice(index + 1)];
    for (const rest of permutations(tail)) output.push([head, ...rest]);
  }
  return output;
}

function lexicographicDescending(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    if (left[index] !== right[index]) return right[index] - left[index];
  }
  return right.length - left.length;
}

/**
 * Exact agent- and option-permutation invariant representation for the small
 * fixed-shape categorical strata used by L4. It is deliberately capped at six
 * options; larger spaces need a registered representation rather than a hidden
 * factorial cost.
 */
export function canonicalizeThermometerMicrostateV1(
  state: DiscussionThermometerStateV1,
): number[] {
  const optionIds = [...state.optionIds];
  if (optionIds.length < 2 || optionIds.length > 6) {
    throw new Error("thermometer_qualification_option_count_unsupported");
  }
  const rows = Object.values(state.microstate.beliefProbabilitiesByAgentId);
  if (rows.length !== state.roster.expectedAgentIds.length || state.roster.missingAgentIds.length > 0) {
    throw new Error("thermometer_qualification_microstate_incomplete");
  }
  const matrix = rows.map(row => optionIds.map(optionId => {
    const value = row[optionId];
    if (!Number.isFinite(value)) throw new Error("thermometer_qualification_probability_invalid");
    return value;
  }));
  let canonical: number[] | null = null;
  for (const order of permutations(optionIds.map((_, index) => index))) {
    const permutedRows = matrix
      .map(row => order.map(index => row[index]))
      .sort(lexicographicDescending);
    const candidate = permutedRows.flat();
    if (canonical === null || lexicographicDescending(candidate, canonical) < 0) {
      canonical = candidate;
    }
  }
  if (canonical === null) throw new Error("thermometer_qualification_microstate_empty");
  return canonical;
}

/**
 * Build the registered L4 comparison ladder without duplicating thermometer
 * formulas. STRUCTURAL uses only design/coverage; BEHAVIOR adds recorded public
 * choice history; MACRO adds only independent q and U coordinates; MICROSTATE
 * adds the complete canonical primary-report matrix.
 */
export function buildThermometerQualificationFeaturesV1(input: {
  family: ThermometerQualificationFeatureFamilyV1;
  current: DiscussionThermometerStateV1;
  previous?: DiscussionThermometerStateV1 | null;
}): ThermometerQualificationFeaturesV1 {
  const current = input.current;
  const expectedAgentCount = current.roster.expectedAgentIds.length;
  const optionCount = current.optionIds.length;
  const names = ["checkpoint_index", "expected_agent_count", "coverage", "option_count"];
  const values = [current.checkpointIndex, expectedAgentCount, current.roster.coverage, optionCount];
  const missingReasons: string[] = [];

  if (input.family !== "STRUCTURAL") {
    const choiceShares = current.behavioralCrossCheck.choiceShareByOptionId;
    if (current.behavioralCrossCheck.status !== "available" || choiceShares === null) {
      missingReasons.push("current_structured_public_choice_unavailable");
    } else {
      sortedValues(choiceShares, current.optionIds).forEach((value, index) => {
        names.push(`current_choice_share_rank_${index + 1}`);
        values.push(value);
      });
      const previousShares = input.previous?.behavioralCrossCheck.choiceShareByOptionId ?? null;
      const previousAvailable = input.previous?.behavioralCrossCheck.status === "available"
        && previousShares !== null
        && input.previous.claimId === current.claimId
        && input.previous.checkpointIndex === current.checkpointIndex - 1
        && sameStringSet(input.previous.optionIds, current.optionIds);
      names.push("previous_choice_available", "choice_lag_total_variation");
      values.push(previousAvailable ? 1 : 0);
      values.push(previousAvailable
        ? choiceLagTotalVariation(choiceShares, previousShares as Record<string, number>, current.optionIds)
        : 0);
    }
  }

  if (input.family === "MACRO" || input.family === "MICROSTATE") {
    const pooled = current.macrostate.pooledProbabilitiesByOptionId;
    const withinEntropy = current.macrostate.meanNormalizedReportEntropy;
    if (pooled === null || withinEntropy === null) {
      missingReasons.push("primary_belief_macrostate_unavailable");
    } else {
      sortedValues(pooled, current.optionIds).forEach((value, index) => {
        names.push(`pooled_belief_rank_${index + 1}`);
        values.push(value);
      });
      names.push("mean_normalized_report_entropy");
      values.push(withinEntropy);
    }
  }

  if (input.family === "MICROSTATE") {
    if (current.roster.missingAgentIds.length > 0) {
      missingReasons.push("complete_primary_microstate_required");
    } else {
      const canonical = canonicalizeThermometerMicrostateV1(current);
      canonical.forEach((value, index) => {
        names.push(`canonical_primary_probability_${index + 1}`);
        values.push(value);
      });
    }
  }

  return {
    featureSchema: "discussion-thermometer-qualification-features-v1",
    family: input.family,
    eligible: missingReasons.length === 0,
    missingReasons,
    shapeKey: `N${expectedAgentCount}:K${optionCount}`,
    names,
    values,
  };
}

export interface ThermometerQualificationModelRowV1 {
  taskId: string;
  semanticGroupId: string;
  target: number;
  featuresByFamily: Partial<Record<
    ThermometerQualificationFeatureFamilyV1,
    ThermometerQualificationFeaturesV1
  >>;
}

export interface ThermometerQualificationComparisonV1 {
  baselineFamily: ThermometerQualificationFeatureFamilyV1;
  candidateFamily: ThermometerQualificationFeatureFamilyV1;
  estimator: "standardized_ridge_identity_v1" | "standardized_fractional_logit_ridge_v1";
  lambda: number;
  holdoutKey: "taskId" | "semanticGroupId";
  rowCount: number;
  groupCount: number;
  shapeKey: string;
  baselineMeanSquaredError: number;
  candidateMeanSquaredError: number;
  candidateMinusBaselineMeanSquaredError: number;
  groupLossDeltas: Array<{ groupId: string; candidateMinusBaseline: number }>;
  signFlip: PairedSignFlipNullSummaryV1;
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const diagonal = augmented[column][column];
    if (Math.abs(diagonal) < 1e-12) throw new Error("thermometer_qualification_ridge_singular");
    for (let index = column; index <= size; index++) augmented[column][index] /= diagonal;
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= size; index++) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }
  return augmented.map(row => row[size]);
}

function fitStandardizedRidge(input: {
  trainX: readonly number[][];
  trainY: readonly number[];
  testX: readonly number[][];
  lambda: number;
}): number[] {
  if (input.trainX.length === 0 || input.trainX.length !== input.trainY.length) {
    throw new Error("thermometer_qualification_training_shape_invalid");
  }
  if (!Number.isFinite(input.lambda) || input.lambda <= 0) {
    throw new Error("thermometer_qualification_lambda_invalid");
  }
  const width = input.trainX[0].length;
  if (input.trainX.some(row => row.length !== width)
    || input.testX.some(row => row.length !== width)) {
    throw new Error("thermometer_qualification_feature_width_mismatch");
  }
  const means = Array.from({ length: width }, (_, column) =>
    input.trainX.reduce((sum, row) => sum + row[column], 0) / input.trainX.length);
  const scales = means.map((mean, column) => {
    const variance = input.trainX.reduce((sum, row) => sum + (row[column] - mean) ** 2, 0)
      / input.trainX.length;
    return Math.sqrt(variance) || 1;
  });
  const standardize = (row: readonly number[]): number[] =>
    [1, ...row.map((value, column) => (value - means[column]) / scales[column])];
  const design = input.trainX.map(standardize);
  const parameterCount = width + 1;
  const gram = Array.from({ length: parameterCount }, () =>
    new Array<number>(parameterCount).fill(0));
  const cross = new Array<number>(parameterCount).fill(0);
  design.forEach((row, rowIndex) => {
    row.forEach((left, leftIndex) => {
      cross[leftIndex] += left * input.trainY[rowIndex];
      row.forEach((right, rightIndex) => {
        gram[leftIndex][rightIndex] += left * right;
      });
    });
  });
  for (let index = 1; index < parameterCount; index++) gram[index][index] += input.lambda;
  const coefficients = solveLinearSystem(gram, cross);
  return input.testX.map(row => standardize(row)
    .reduce((sum, value, index) => sum + value * coefficients[index], 0));
}

function sigmoid(value: number): number {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

/**
 * Penalized fractional-logit GLM for bounded transition targets.
 *
 * The Bernoulli quasi-likelihood is valid for fractional responses in [0, 1].
 * Standardization is learned inside each training fold, the intercept is not
 * penalized, and the ridge penalty makes the high-dimensional MICROSTATE fit
 * finite even when a fold has fewer rows than features. A deterministic
 * backtracking step prevents Newton overshoot without tuning on held-out rows.
 */
function fitStandardizedFractionalLogitRidge(input: {
  trainX: readonly number[][];
  trainY: readonly number[];
  testX: readonly number[][];
  lambda: number;
}): number[] {
  if (input.trainX.length === 0 || input.trainX.length !== input.trainY.length) {
    throw new Error("thermometer_qualification_training_shape_invalid");
  }
  if (input.trainY.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error("thermometer_qualification_fractional_target_invalid");
  }
  if (!Number.isFinite(input.lambda) || input.lambda <= 0) {
    throw new Error("thermometer_qualification_lambda_invalid");
  }
  const width = input.trainX[0].length;
  if (input.trainX.some(row => row.length !== width)
    || input.testX.some(row => row.length !== width)) {
    throw new Error("thermometer_qualification_feature_width_mismatch");
  }
  const means = Array.from({ length: width }, (_, column) =>
    input.trainX.reduce((sum, row) => sum + row[column], 0) / input.trainX.length);
  const scales = means.map((mean, column) => {
    const variance = input.trainX.reduce((sum, row) => sum + (row[column] - mean) ** 2, 0)
      / input.trainX.length;
    return Math.sqrt(variance) || 1;
  });
  const standardize = (row: readonly number[]): number[] =>
    [1, ...row.map((value, column) => (value - means[column]) / scales[column])];
  const design = input.trainX.map(standardize);
  const parameterCount = width + 1;
  const responseMean = input.trainY.reduce((sum, value) => sum + value, 0)
    / input.trainY.length;
  const clippedMean = Math.min(1 - 1e-6, Math.max(1e-6, responseMean));
  let coefficients = new Array<number>(parameterCount).fill(0);
  coefficients[0] = Math.log(clippedMean / (1 - clippedMean));
  const objective = (candidate: readonly number[]): number => {
    const epsilon = 1e-12;
    const loss = design.reduce((sum, row, rowIndex) => {
      const probability = Math.min(1 - epsilon, Math.max(epsilon,
        sigmoid(row.reduce((value, feature, index) => value + feature * candidate[index], 0))));
      const target = input.trainY[rowIndex];
      return sum - target * Math.log(probability) - (1 - target) * Math.log(1 - probability);
    }, 0);
    return loss + 0.5 * input.lambda
      * candidate.slice(1).reduce((sum, value) => sum + value * value, 0);
  };
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const gradient = new Array<number>(parameterCount).fill(0);
    const hessian = Array.from({ length: parameterCount }, () =>
      new Array<number>(parameterCount).fill(0));
    design.forEach((row, rowIndex) => {
      const probability = sigmoid(row.reduce((sum, feature, index) =>
        sum + feature * coefficients[index], 0));
      const weight = Math.max(1e-9, probability * (1 - probability));
      row.forEach((left, leftIndex) => {
        gradient[leftIndex] += left * (probability - input.trainY[rowIndex]);
        row.forEach((right, rightIndex) => {
          hessian[leftIndex][rightIndex] += weight * left * right;
        });
      });
    });
    for (let index = 1; index < parameterCount; index += 1) {
      gradient[index] += input.lambda * coefficients[index];
      hessian[index][index] += input.lambda;
    }
    const direction = solveLinearSystem(hessian, gradient);
    const currentObjective = objective(coefficients);
    let stepScale = 1;
    let candidate = coefficients.map((value, index) => value - direction[index]);
    while (stepScale > 2 ** -20 && objective(candidate) > currentObjective) {
      stepScale /= 2;
      candidate = coefficients.map((value, index) =>
        value - stepScale * direction[index]);
    }
    if (objective(candidate) > currentObjective) break;
    coefficients = candidate;
    if (Math.max(...direction.map(value => Math.abs(stepScale * value))) < 1e-9) break;
  }
  return input.testX.map(row => sigmoid(standardize(row)
    .reduce((sum, value, index) => sum + value * coefficients[index], 0)));
}

/**
 * Same-row, same-fold comparison. Missingness cannot give the richer family a
 * different denominator, and standardization is learned from training folds only.
 */
export function compareThermometerQualificationFamiliesV1(input: {
  rows: readonly ThermometerQualificationModelRowV1[];
  baselineFamily: ThermometerQualificationFeatureFamilyV1;
  candidateFamily: ThermometerQualificationFeatureFamilyV1;
  holdoutKey: "taskId" | "semanticGroupId";
  lambda: number;
  estimator?: "standardized_ridge_identity_v1" | "standardized_fractional_logit_ridge_v1";
}): ThermometerQualificationComparisonV1 {
  const rows = input.rows.filter(row => {
    const baseline = row.featuresByFamily[input.baselineFamily];
    const candidate = row.featuresByFamily[input.candidateFamily];
    return Number.isFinite(row.target) && baseline?.eligible === true && candidate?.eligible === true;
  });
  if (rows.length === 0) throw new Error("thermometer_qualification_no_paired_rows");
  const shapeKeys = new Set(rows.flatMap(row => [
    row.featuresByFamily[input.baselineFamily]?.shapeKey ?? "",
    row.featuresByFamily[input.candidateFamily]?.shapeKey ?? "",
  ]));
  if (shapeKeys.size !== 1) throw new Error("thermometer_qualification_mixed_shape_strata");
  const baselineNames = rows[0].featuresByFamily[input.baselineFamily]!.names;
  const candidateNames = rows[0].featuresByFamily[input.candidateFamily]!.names;
  for (const row of rows) {
    const baseline = row.featuresByFamily[input.baselineFamily]!;
    const candidate = row.featuresByFamily[input.candidateFamily]!;
    if (JSON.stringify(baseline.names) !== JSON.stringify(baselineNames)
      || JSON.stringify(candidate.names) !== JSON.stringify(candidateNames)) {
      throw new Error("thermometer_qualification_feature_schema_drift");
    }
  }
  const groupIds = [...new Set(rows.map(row => row[input.holdoutKey]))].sort();
  if (groupIds.length < 3) throw new Error("thermometer_qualification_groups_insufficient");
  const estimator = input.estimator ?? "standardized_ridge_identity_v1";
  if (estimator === "standardized_fractional_logit_ridge_v1"
    && rows.some(row => row.target < 0 || row.target > 1)) {
    throw new Error("thermometer_qualification_fractional_target_invalid");
  }
  const squaredErrors = new Map<string, { baseline: number[]; candidate: number[] }>();
  for (const heldout of groupIds) {
    const train = rows.filter(row => row[input.holdoutKey] !== heldout);
    const test = rows.filter(row => row[input.holdoutKey] === heldout);
    const fit = (family: ThermometerQualificationFeatureFamilyV1): number[] => {
      const fitInput = {
        trainX: train.map(row => row.featuresByFamily[family]!.values),
        trainY: train.map(row => row.target),
        testX: test.map(row => row.featuresByFamily[family]!.values),
        lambda: input.lambda,
      };
      return estimator === "standardized_fractional_logit_ridge_v1"
        ? fitStandardizedFractionalLogitRidge(fitInput)
        : fitStandardizedRidge(fitInput);
    };
    const baselinePredictions = fit(input.baselineFamily);
    const candidatePredictions = fit(input.candidateFamily);
    squaredErrors.set(heldout, {
      baseline: test.map((row, index) => (row.target - baselinePredictions[index]) ** 2),
      candidate: test.map((row, index) => (row.target - candidatePredictions[index]) ** 2),
    });
  }
  const mean = (values: readonly number[]): number =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const groupLossDeltas = groupIds.map(groupId => {
    const errors = squaredErrors.get(groupId)!;
    return { groupId, candidateMinusBaseline: mean(errors.candidate) - mean(errors.baseline) };
  });
  // Equal-weight held-out groups preserve the declared task/semantic-group
  // inference unit even when missingness leaves different row counts per group.
  const baselineGroupLosses = groupIds.map(groupId =>
    mean(squaredErrors.get(groupId)!.baseline));
  const candidateGroupLosses = groupIds.map(groupId =>
    mean(squaredErrors.get(groupId)!.candidate));
  return {
    baselineFamily: input.baselineFamily,
    candidateFamily: input.candidateFamily,
    estimator,
    lambda: input.lambda,
    holdoutKey: input.holdoutKey,
    rowCount: rows.length,
    groupCount: groupIds.length,
    shapeKey: [...shapeKeys][0],
    baselineMeanSquaredError: mean(baselineGroupLosses),
    candidateMeanSquaredError: mean(candidateGroupLosses),
    candidateMinusBaselineMeanSquaredError:
      mean(candidateGroupLosses) - mean(baselineGroupLosses),
    groupLossDeltas,
    signFlip: pairedSignFlipNullSummaryV1({
      deltas: groupLossDeltas.map(item => item.candidateMinusBaseline),
      repetitions: 10_000,
      seed: 0x4C34,
    }),
  };
}

export interface PairedSignFlipPowerPointV1 {
  taskCount: number;
  standardizedMeanDelta: number;
  trialCount: number;
  rejectionRate: number;
}

/**
 * Provider-free resolution calculation under an explicit Gaussian task-delta
 * model. It is a planning sensitivity analysis, not empirical power evidence.
 */
export function simulatePairedSignFlipPowerV1(input: {
  taskCounts: readonly number[];
  standardizedMeanDeltas: readonly number[];
  trialCount?: number;
  alpha?: number;
  seed?: number;
}): PairedSignFlipPowerPointV1[] {
  const trialCount = input.trialCount ?? 500;
  const alpha = input.alpha ?? 0.05;
  if (!Number.isInteger(trialCount) || trialCount < 100) {
    throw new Error("thermometer_qualification_power_trials_invalid");
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error("thermometer_qualification_power_alpha_invalid");
  }
  if (input.taskCounts.some(count => !Number.isInteger(count) || count < 3 || count > 100)
    || input.standardizedMeanDeltas.some(effect => !Number.isFinite(effect))) {
    throw new Error("thermometer_qualification_power_grid_invalid");
  }
  let state = (input.seed ?? 0x4C34A7) >>> 0;
  const nextUnit = (): number => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (((value ^ (value >>> 14)) >>> 0) + 0.5) / 4294967296;
  };
  const nextNormal = (): number => {
    const first = nextUnit();
    const second = nextUnit();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  };
  const output: PairedSignFlipPowerPointV1[] = [];
  for (const taskCount of input.taskCounts) {
    for (const standardizedMeanDelta of input.standardizedMeanDeltas) {
      let rejections = 0;
      for (let trial = 0; trial < trialCount; trial++) {
        const deltas = Array.from({ length: taskCount }, () =>
          standardizedMeanDelta + nextNormal());
        const test = pairedSignFlipNullSummaryV1({
          deltas,
          repetitions: 1000,
          seed: trial,
          // Exact enumeration inside every simulation trial is unnecessary and
          // becomes factorially expensive at planning-scale task counts.
          exactWhenPossible: false,
        });
        if (test.twoSidedExceedance <= alpha) rejections++;
      }
      output.push({
        taskCount,
        standardizedMeanDelta,
        trialCount,
        rejectionRate: rejections / trialCount,
      });
    }
  }
  return output;
}
