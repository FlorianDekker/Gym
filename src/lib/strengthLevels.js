import { profileAge } from './profile.js';

export const LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

// Standards = bodyweight-ratio targets for an estimated 1RM, indexed by level.
// `mode` is 'weight' (default — recorded kg is the absolute load on the bar / cable
// / dumbbell) or 'bw' (the effective load is bodyweight + recorded kg, so a
// negative recorded kg means assisted, 0 means pure bodyweight, positive means
// added weight).
//
// Ratios are drawn from widely cited public references (Greg Nuckols' Strength
// Standards, ExRx, Symmetric Strength). Numbers for isolation / machine moves
// are best-effort estimates calibrated against typical published charts.
export const STANDARDS = {
  // === Core barbell lifts ===
  'Bench Press':              { mode: 'weight', male: [0.50, 0.75, 1.00, 1.50, 2.00], female: [0.25, 0.50, 0.75, 1.00, 1.50] },
  'Squat':                    { mode: 'weight', male: [0.75, 1.25, 1.75, 2.25, 2.75], female: [0.50, 0.75, 1.25, 1.75, 2.25] },
  'Deadlift':                 { mode: 'weight', male: [1.00, 1.50, 2.00, 2.50, 3.00], female: [0.50, 1.00, 1.50, 2.00, 2.50] },
  'Overhead Press':           { mode: 'weight', male: [0.35, 0.55, 0.80, 1.10, 1.40], female: [0.20, 0.35, 0.55, 0.75, 1.00] },
  'Romanian Deadlift':        { mode: 'weight', male: [0.75, 1.20, 1.60, 2.10, 2.50], female: [0.40, 0.75, 1.20, 1.60, 2.05] },
  'Close-Grip Bench Press':   { mode: 'weight', male: [0.40, 0.65, 0.90, 1.30, 1.75], female: [0.20, 0.40, 0.65, 0.90, 1.30] },
  'Bent-Over Row':            { mode: 'weight', male: [0.50, 0.75, 1.00, 1.40, 1.80], female: [0.25, 0.50, 0.75, 1.00, 1.40] },
  'Hack Squat':               { mode: 'weight', male: [0.85, 1.40, 1.95, 2.50, 3.05], female: [0.50, 0.85, 1.40, 1.95, 2.55] },

  // === Bodyweight-additive lifts ===
  'Weighted Pull-Up':         { mode: 'bw', male: [0.55, 0.80, 1.05, 1.35, 1.75], female: [0.50, 0.75, 1.00, 1.30, 1.70] },
  'Dips':                     { mode: 'bw', male: [0.70, 1.00, 1.25, 1.60, 2.00], female: [0.60, 0.85, 1.05, 1.35, 1.70] },
  'Assisted Pull-Up Machine': { mode: 'bw', male: [0.55, 0.80, 1.05, 1.35, 1.75], female: [0.50, 0.75, 1.00, 1.30, 1.70] },
  'Single-Leg Calf Raise':    { mode: 'bw', male: [0.85, 1.00, 1.20, 1.45, 1.80], female: [0.80, 0.95, 1.15, 1.40, 1.75] },

  // === Machine / cable upper body ===
  'Machine Shoulder Press':   { mode: 'weight', male: [0.30, 0.45, 0.65, 0.95, 1.30], female: [0.15, 0.25, 0.40, 0.60, 0.85] },
  'Chest Press':              { mode: 'weight', male: [0.45, 0.70, 1.00, 1.45, 1.95], female: [0.20, 0.40, 0.65, 0.95, 1.40] },
  'Chest-Supported Row':      { mode: 'weight', male: [0.50, 0.75, 1.00, 1.40, 1.80], female: [0.25, 0.50, 0.75, 1.00, 1.40] },
  'Seated Cable Row':         { mode: 'weight', male: [0.50, 0.75, 1.00, 1.30, 1.65], female: [0.25, 0.45, 0.65, 0.85, 1.10] },
  'Omni-Grip Lat Pulldown':   { mode: 'weight', male: [0.50, 0.75, 1.00, 1.30, 1.65], female: [0.25, 0.45, 0.65, 0.85, 1.10] },
  'Upper Back Row':           { mode: 'weight', male: [0.50, 0.75, 1.00, 1.40, 1.80], female: [0.25, 0.50, 0.75, 1.00, 1.40] },
  'Body Row':                 { mode: 'weight', male: [0.50, 0.75, 1.00, 1.30, 1.65], female: [0.25, 0.45, 0.65, 0.85, 1.10] },
  'Reverse Pec Deck':         { mode: 'weight', male: [0.15, 0.25, 0.40, 0.60, 0.85], female: [0.08, 0.15, 0.25, 0.40, 0.55] },
  'Cable Crossover':          { mode: 'weight', male: [0.10, 0.20, 0.35, 0.55, 0.75], female: [0.05, 0.10, 0.20, 0.32, 0.48] },
  'Cable Crossover Decline':  { mode: 'weight', male: [0.10, 0.20, 0.35, 0.55, 0.75], female: [0.05, 0.10, 0.20, 0.32, 0.48] },
  'Rope Facepull':            { mode: 'weight', male: [0.10, 0.20, 0.30, 0.45, 0.60], female: [0.05, 0.12, 0.20, 0.32, 0.45] },
  'Incline Dumbbell Shrug':   { mode: 'weight', male: [0.15, 0.25, 0.40, 0.60, 0.85], female: [0.08, 0.15, 0.25, 0.40, 0.60] },

  // === Curls ===
  'Bicep Curl':               { mode: 'weight', male: [0.20, 0.35, 0.55, 0.80, 1.10], female: [0.10, 0.20, 0.30, 0.45, 0.65] },
  'Hammer Curl':              { mode: 'weight', male: [0.10, 0.17, 0.27, 0.40, 0.55], female: [0.05, 0.09, 0.15, 0.22, 0.32] },
  'Pronated Curl':            { mode: 'weight', male: [0.15, 0.25, 0.40, 0.60, 0.85], female: [0.08, 0.15, 0.22, 0.32, 0.45] },
  'Supinated Curl':           { mode: 'weight', male: [0.20, 0.30, 0.45, 0.65, 0.90], female: [0.10, 0.18, 0.27, 0.40, 0.55] },

  // === Triceps ===
  'Eccentric Skull Crushers': { mode: 'weight', male: [0.20, 0.35, 0.55, 0.80, 1.05], female: [0.10, 0.20, 0.30, 0.45, 0.65] },
  'Tricep Pushdown':          { mode: 'weight', male: [0.20, 0.35, 0.55, 0.80, 1.10], female: [0.10, 0.20, 0.32, 0.50, 0.70] },
  'Overhead Tricep Ext':      { mode: 'weight', male: [0.15, 0.25, 0.40, 0.60, 0.80], female: [0.08, 0.15, 0.25, 0.38, 0.55] },

  // === Shoulders (isolation) ===
  'Egyptian Lateral Raise':   { mode: 'weight', male: [0.04, 0.07, 0.11, 0.17, 0.24], female: [0.02, 0.04, 0.07, 0.11, 0.16] },
  "Lateral Raise 21's":       { mode: 'weight', male: [0.04, 0.07, 0.10, 0.15, 0.22], female: [0.02, 0.04, 0.06, 0.10, 0.15] },

  // === Lower body machines ===
  'Single Leg Press':         { mode: 'weight', male: [0.75, 1.25, 1.75, 2.25, 2.75], female: [0.50, 0.85, 1.25, 1.75, 2.25] },
  'Leg Extension':            { mode: 'weight', male: [0.40, 0.65, 0.90, 1.20, 1.55], female: [0.25, 0.40, 0.60, 0.85, 1.15] },
  'Seated Leg Curls':         { mode: 'weight', male: [0.30, 0.50, 0.75, 1.05, 1.40], female: [0.20, 0.35, 0.55, 0.80, 1.10] },
  'Hip Abductor':             { mode: 'weight', male: [0.40, 0.65, 0.95, 1.30, 1.70], female: [0.30, 0.55, 0.85, 1.20, 1.60] },
  'Hip Adductor':             { mode: 'weight', male: [0.40, 0.65, 0.95, 1.30, 1.70], female: [0.30, 0.55, 0.85, 1.20, 1.60] },
  'Single-Leg Hip Thrust':    { mode: 'weight', male: [0.45, 0.80, 1.20, 1.65, 2.10], female: [0.30, 0.55, 0.85, 1.25, 1.65] },

  // === Core (machine) ===
  'Abdominal Crunch':         { mode: 'weight', male: [0.30, 0.50, 0.75, 1.05, 1.40], female: [0.20, 0.35, 0.55, 0.80, 1.10] }
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

function epley(weight, reps) {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

/**
 * Compare the user's best estimated 1RM (Epley, across all sets) against the
 * strength standards for the exercise. Returns null when not applicable.
 */
export function evaluate(exerciseName, sets, profile) {
  if (!profile) return null;
  const stdEntry = STANDARDS[exerciseName];
  if (!stdEntry) return null;
  const ratios = stdEntry[profile.sex];
  if (!ratios) return null;
  const bw = Number(profile.bodyweight);
  if (!Number.isFinite(bw) || bw <= 0) return null;
  if (!Array.isArray(sets) || sets.length === 0) return null;

  const mode = stdEntry.mode || 'weight';

  // Best 1RM = highest Epley estimate across all sets, using effective load.
  let oneRm = 0;
  let bestRecorded = null;
  for (const s of sets) {
    const reps = Number(s.reps);
    if (!Number.isFinite(reps) || reps <= 0) continue;
    const recorded = Number(s.weight);
    if (!Number.isFinite(recorded)) continue;
    const effective = mode === 'bw' ? bw + recorded : recorded;
    if (effective <= 0) continue;
    const rm = epley(effective, reps);
    if (rm > oneRm) {
      oneRm = rm;
      bestRecorded = { reps, weight: recorded, effective };
    }
  }
  if (oneRm <= 0) return null;

  const age = profileAge(profile);
  const ageScale = ageMultiplier(age);
  const targets = ratios.map((r) => r * bw * ageScale);

  let levelIndex = 0;
  for (let i = 0; i < targets.length; i++) {
    if (oneRm >= targets[i]) levelIndex = i;
  }
  let segmentProgress;
  if (oneRm < targets[0]) {
    levelIndex = 0;
    segmentProgress = Math.max(0, oneRm / targets[0]);
  } else if (levelIndex >= targets.length - 1) {
    levelIndex = targets.length - 1;
    segmentProgress = 1;
  } else {
    const lo = targets[levelIndex];
    const hi = targets[levelIndex + 1];
    segmentProgress = (oneRm - lo) / (hi - lo);
  }
  segmentProgress = Math.max(0, Math.min(1, segmentProgress));

  const segCount = LEVELS.length - 1;
  const overallProgress = Math.min(1, (levelIndex + segmentProgress) / segCount);

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
    targets,
    oneRm,
    bestRecorded,
    mode
  };
}
