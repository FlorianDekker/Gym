export const LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

// Ratios: target 1RM = coefficient × bodyweight (kg). Compiled from widely cited
// public strength-standards references (Greg Nuckols' Strength Standards,
// ExRx, Symmetric Strength). Index = level (Beginner..Elite).
export const STANDARDS = {
  // Big four
  'Bench Press':            { male: [0.50, 0.75, 1.00, 1.50, 2.00], female: [0.25, 0.50, 0.75, 1.00, 1.50] },
  'Squat':                  { male: [0.75, 1.25, 1.75, 2.25, 2.75], female: [0.50, 0.75, 1.25, 1.75, 2.25] },
  'Deadlift':               { male: [1.00, 1.50, 2.00, 2.50, 3.00], female: [0.50, 1.00, 1.50, 2.00, 2.50] },
  'Overhead Press':         { male: [0.35, 0.55, 0.80, 1.10, 1.40], female: [0.20, 0.35, 0.55, 0.75, 1.00] },
  // Posterior chain / squat variants
  'Romanian Deadlift':      { male: [0.75, 1.20, 1.60, 2.10, 2.50], female: [0.40, 0.75, 1.20, 1.60, 2.05] },
  'Hack Squat':             { male: [0.85, 1.40, 1.95, 2.50, 3.05], female: [0.50, 0.85, 1.40, 1.95, 2.55] },
  // Pressing variants
  'Close-Grip Bench Press': { male: [0.40, 0.65, 0.90, 1.30, 1.75], female: [0.20, 0.40, 0.65, 0.90, 1.30] },
  // Rows + lat pulldown
  'Bent-Over Row':          { male: [0.50, 0.75, 1.00, 1.40, 1.80], female: [0.25, 0.50, 0.75, 1.00, 1.40] },
  'Chest-Supported Row':    { male: [0.50, 0.75, 1.00, 1.40, 1.80], female: [0.25, 0.50, 0.75, 1.00, 1.40] },
  'Seated Cable Row':       { male: [0.50, 0.75, 1.00, 1.30, 1.65], female: [0.25, 0.45, 0.65, 0.85, 1.10] },
  'Omni-Grip Lat Pulldown': { male: [0.50, 0.75, 1.00, 1.30, 1.65], female: [0.25, 0.45, 0.65, 0.85, 1.10] },
  // Curls
  'Bicep Curl':             { male: [0.20, 0.35, 0.55, 0.80, 1.10], female: [0.10, 0.20, 0.30, 0.45, 0.65] }
};

// Approximate cumulative percentile of the general lifting population at each level.
export const LEVEL_PERCENTILE = [10, 30, 52, 78, 95];

export function ageMultiplier(age) {
  const a = Number(age);
  if (!Number.isFinite(a) || a <= 0) return 1;
  if (a < 18) return 0.90;
  if (a < 20) return 0.97;
  if (a <= 35) return 1.00;
  if (a <= 45) return 0.97;
  if (a <= 55) return 0.92;
  if (a <= 65) return 0.85;
  return 0.78;
}

export function hasStandards(exerciseName) {
  return !!STANDARDS[exerciseName];
}

/**
 * Compare a user's 1RM against the strength standards.
 * Returns null if not applicable. Otherwise:
 *   {
 *     level: 'Intermediate', levelIndex: 2,
 *     segmentProgress: 0.42, // 0..1 inside the current level
 *     overallProgress: 0.58, // 0..1 across the whole bar
 *     percentile: 56,        // approximate percentile 0..99
 *     targets: [37.5, 56.25, 75, 112.5, 150], // age-adjusted thresholds (kg)
 *   }
 */
export function evaluate(exerciseName, oneRm, profile) {
  if (!profile) return null;
  const ratios = STANDARDS[exerciseName]?.[profile.sex];
  if (!ratios) return null;
  const bw = Number(profile.bodyweight);
  if (!Number.isFinite(bw) || bw <= 0) return null;
  const rm = Number(oneRm);
  if (!Number.isFinite(rm) || rm <= 0) return null;

  // Age scales the thresholds: older lifters get lower thresholds, so the same
  // 1RM lands at a higher level.
  const ageScale = ageMultiplier(profile.age);
  const targets = ratios.map((r) => r * bw * ageScale);

  // Find which segment the lifter sits in.
  let levelIndex = 0;
  for (let i = 0; i < targets.length; i++) {
    if (rm >= targets[i]) levelIndex = i;
  }
  let segmentProgress;
  if (rm < targets[0]) {
    // Below Beginner threshold — show within Beginner segment, scaled to current/target.
    levelIndex = 0;
    segmentProgress = Math.max(0, rm / targets[0]);
  } else if (levelIndex >= targets.length - 1) {
    // At or past Elite — clamp.
    levelIndex = targets.length - 1;
    segmentProgress = 1;
  } else {
    const lo = targets[levelIndex];
    const hi = targets[levelIndex + 1];
    segmentProgress = (rm - lo) / (hi - lo);
  }
  segmentProgress = Math.max(0, Math.min(1, segmentProgress));

  // Overall bar fill: each level fills one of (LEVELS.length - 1) segments.
  const segCount = LEVELS.length - 1;
  const overallProgress = Math.min(1, (levelIndex + segmentProgress) / segCount);

  // Percentile: interpolate between anchored percentiles at level boundaries.
  let percentile;
  if (levelIndex >= LEVEL_PERCENTILE.length - 1) {
    percentile = 99;
  } else {
    const lo = LEVEL_PERCENTILE[levelIndex];
    const hi = LEVEL_PERCENTILE[levelIndex + 1];
    percentile = Math.round(lo + segmentProgress * (hi - lo));
  }
  percentile = Math.max(1, Math.min(99, percentile));

  return {
    level: LEVELS[levelIndex],
    levelIndex,
    segmentProgress,
    overallProgress,
    percentile,
    targets
  };
}
