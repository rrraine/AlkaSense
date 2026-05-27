export interface Answers {
  spreadingPattern: string;
  grainTranslucency: string;
  scoreUniformity: string;
  kohAppearance: string;
  anomalyFlags: string[];
}

/**
 * Detects conflicts between AI-predicted ASV score
 * and evaluator observation answers.
 */
export function detectConflicts(
  predictedScore: number,
  answers: Answers
): string[] {

  const conflicts: string[] = [];

  const isLowScore = predictedScore >= 1 && predictedScore <= 2;
  const isMidScore = predictedScore >= 3 && predictedScore <= 5;
  const isHighScore = predictedScore >= 6 && predictedScore <= 7;

  // ───────────────────────────────────────────────────────────
  // Spreading Pattern Texture
  // ───────────────────────────────────────────────────────────

  if (isLowScore) {
    if (answers.spreadingPattern !== 'No Spreading') {
      conflicts.push('Spreading Pattern Texture');
    }
  }

  else if (isMidScore) {
    const valid =
      answers.spreadingPattern === 'Partial Spreading Only' ||
      answers.spreadingPattern === 'Ragged and Fragmented';

    if (!valid) {
      conflicts.push('Spreading Pattern Texture');
    }
  }

  else if (isHighScore) {
    if (answers.spreadingPattern !== 'Smooth and Continuous') {
      conflicts.push('Spreading Pattern Texture');
    }
  }

  // ───────────────────────────────────────────────────────────
  // Grain Translucency
  // ───────────────────────────────────────────────────────────

  if (isLowScore) {
    if (answers.grainTranslucency !== 'Opaque') {
      conflicts.push('Grain Translucency');
    }
  }

  else if (isMidScore) {
    if (
      answers.grainTranslucency === 'Fully Translucent' ||
      answers.grainTranslucency === 'Opaque'
    ) {
      conflicts.push('Grain Translucency');
    }
  }

  else if (isHighScore) {
    if (answers.grainTranslucency !== 'Fully Translucent') {
      conflicts.push('Grain Translucency');
    }
  }

  // ───────────────────────────────────────────────────────────
  // Within-dish Score Uniformity
  // ───────────────────────────────────────────────────────────

  if (isLowScore) {
    if (answers.scoreUniformity === 'Uniform') {
      conflicts.push('Within-dish Score Uniformity');
    }
  }

  else if (isHighScore) {
    if (answers.scoreUniformity !== 'Uniform') {
      conflicts.push('Within-dish Score Uniformity');
    }
  }

  // Mid scores (3–5) intentionally have no conflict rule

  // ───────────────────────────────────────────────────────────
  // KOH Solution Appearance
  // ───────────────────────────────────────────────────────────

  if (isLowScore) {
    if (answers.kohAppearance !== 'Heavily Clouded') {
      conflicts.push('KOH Solution Appearance');
    }
  }

  else if (isMidScore) {
    if (
      answers.kohAppearance === 'Clear' ||
      answers.kohAppearance === 'Heavily Clouded'
    ) {
      conflicts.push('KOH Solution Appearance');
    }
  }

  else if (isHighScore) {
    if (answers.kohAppearance !== 'Clear') {
      conflicts.push('KOH Solution Appearance');
    }
  }

  // ───────────────────────────────────────────────────────────
  // Anomaly Flags
  // ───────────────────────────────────────────────────────────

  const filteredFlags = answers.anomalyFlags.filter(
    (flag) => flag !== 'Floating Grains'
  );

  if (isLowScore) {
    const onlyNoAnomaly =
      filteredFlags.length === 1 &&
      filteredFlags[0] === 'No Anomaly';

    if (onlyNoAnomaly) {
      conflicts.push('Anomaly Flags');
    }
  }

  else if (isHighScore) {
    const hasConflictFlag =
      filteredFlags.includes('Longitudinal Cracking') ||
      filteredFlags.includes('Unilateral Spreading');

    if (hasConflictFlag) {
      conflicts.push('Anomaly Flags');
    }
  }

  // Mid scores (3–5) intentionally have no conflict rule

  return conflicts;
}