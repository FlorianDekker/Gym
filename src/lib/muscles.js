export const MUSCLES = [
  { id: 'chest', label: 'Chest' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'upperBack', label: 'Upper Back' },
  { id: 'lats', label: 'Lats' },
  { id: 'lowerBack', label: 'Lower Back' },
  { id: 'abs', label: 'Abs' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'calves', label: 'Calves' },
  { id: 'adductors', label: 'Adductors' },
  { id: 'hipAbductors', label: 'Hip Abductors' }
];

export const MUSCLE_LABEL = Object.fromEntries(MUSCLES.map((m) => [m.id, m.label]));

// Each exercise → primary muscle(s) at 1.0 set credit, secondary at 0.5.
export const EXERCISE_MUSCLES = {
  // Push
  'Bench Press':              { primary: ['chest'],      secondary: ['shoulders', 'triceps'] },
  'Close-Grip Bench Press':   { primary: ['triceps'],    secondary: ['chest', 'shoulders'] },
  'Chest Press':              { primary: ['chest'],      secondary: ['shoulders', 'triceps'] },
  'Overhead Press':           { primary: ['shoulders'],  secondary: ['triceps', 'abs'] },
  'Machine Shoulder Press':   { primary: ['shoulders'],  secondary: ['triceps'] },
  'Dips':                     { primary: ['triceps'],    secondary: ['chest', 'shoulders'] },
  'Cable Crossover':          { primary: ['chest'],      secondary: ['shoulders'] },
  'Cable Crossover Decline':  { primary: ['chest'],      secondary: ['triceps'] },
  'Egyptian Lateral Raise':   { primary: ['shoulders'],  secondary: [] },
  "Lateral Raise 21's":       { primary: ['shoulders'],  secondary: [] },
  'Eccentric Skull Crushers': { primary: ['triceps'],    secondary: [] },
  'Tricep Pushdown':          { primary: ['triceps'],    secondary: [] },
  'Overhead Tricep Ext':      { primary: ['triceps'],    secondary: [] },

  // Pull
  'Weighted Pull-Up':         { primary: ['lats'],       secondary: ['biceps', 'upperBack', 'forearms'] },
  'Omni-Grip Lat Pulldown':   { primary: ['lats'],       secondary: ['biceps', 'upperBack'] },
  'Body Row':                 { primary: ['upperBack'],  secondary: ['lats', 'biceps'] },
  'Bent-Over Row':            { primary: ['upperBack'],  secondary: ['lats', 'biceps', 'lowerBack'] },
  'Chest-Supported Row':      { primary: ['upperBack'],  secondary: ['lats', 'biceps'] },
  'Seated Cable Row':         { primary: ['upperBack'],  secondary: ['lats', 'biceps'] },
  'Upper Back Row':           { primary: ['upperBack'],  secondary: ['lats', 'biceps'] },
  'Rope Facepull':            { primary: ['shoulders'],  secondary: ['upperBack'] },
  'Reverse Pec Deck':         { primary: ['shoulders'],  secondary: ['upperBack'] },
  'Incline Dumbbell Shrug':   { primary: ['upperBack'],  secondary: [] },
  'Cable Pullover':           { primary: ['lats'],       secondary: ['chest'] },
  'Bicep Curl':               { primary: ['biceps'],     secondary: ['forearms'] },
  'Hammer Curl':              { primary: ['biceps'],     secondary: ['forearms'] },
  'Pronated Curl':            { primary: ['forearms'],   secondary: ['biceps'] },
  'Supinated Curl':           { primary: ['biceps'],     secondary: ['forearms'] },
  'Incline Dumbbell Curl':    { primary: ['biceps'],     secondary: ['forearms'] },

  // Legs
  'Squat':                    { primary: ['quads'],      secondary: ['glutes', 'hamstrings', 'abs'] },
  'Hack Squat':               { primary: ['quads'],      secondary: ['glutes'] },
  'Single Leg Press':         { primary: ['quads'],      secondary: ['glutes', 'hamstrings'] },
  'Leg Extension':            { primary: ['quads'],      secondary: [] },
  'Deadlift':                 { primary: ['hamstrings'], secondary: ['glutes', 'lowerBack', 'upperBack', 'forearms'] },
  'Romanian Deadlift':        { primary: ['hamstrings'], secondary: ['glutes', 'lowerBack'] },
  'Seated Leg Curls':         { primary: ['hamstrings'], secondary: [] },
  'Single-Leg Hip Thrust':    { primary: ['glutes'],     secondary: ['hamstrings'] },
  'Hip Abductor':             { primary: ['hipAbductors'], secondary: ['glutes'] },
  'Hip Adductor':             { primary: ['adductors'],  secondary: [] },
  'Single-Leg Calf Raise':    { primary: ['calves'],     secondary: [] },

  // Core
  'Abdominal Crunch':         { primary: ['abs'],        secondary: [] },
  'Situps':                   { primary: ['abs'],        secondary: [] },
  'Weighted L-Sit Hold':      { primary: ['abs'],        secondary: ['shoulders'] }
};

// Returns the muscle mapping for an exercise. Prefers per-record overrides
// (primaryMuscles / secondaryMuscles stored on the exercise row) so custom
// exercises configured in Settings can contribute to the muscle distribution;
// falls back to the built-in EXERCISE_MUSCLES table by name.
export function getMusclesFor(input) {
  if (!input) return { primary: [], secondary: [] };
  if (typeof input === 'string') {
    return EXERCISE_MUSCLES[input] || { primary: [], secondary: [] };
  }
  const overridePrimary = Array.isArray(input.primaryMuscles) ? input.primaryMuscles : null;
  const overrideSecondary = Array.isArray(input.secondaryMuscles) ? input.secondaryMuscles : null;
  if ((overridePrimary && overridePrimary.length) || (overrideSecondary && overrideSecondary.length)) {
    return { primary: overridePrimary || [], secondary: overrideSecondary || [] };
  }
  return EXERCISE_MUSCLES[input.name] || { primary: [], secondary: [] };
}

/**
 * Given either a Record<name, count> (legacy) or an Array<{ name|exercise, count }>
 * where the exercise object can carry primary/secondaryMuscles overrides,
 * return a map of muscleId → total credit (primary=1.0, secondary=0.5 per set).
 */
export function muscleCredits(input) {
  const entries = [];
  if (Array.isArray(input)) {
    for (const item of input) {
      entries.push([item, item.count]);
    }
  } else if (input && typeof input === 'object') {
    for (const [name, count] of Object.entries(input)) {
      entries.push([{ name }, count]);
    }
  }
  const out = {};
  for (const [ex, count] of entries) {
    if (!count) continue;
    const m = getMusclesFor(ex);
    for (const id of m.primary || []) out[id] = (out[id] || 0) + count;
    for (const id of m.secondary || []) out[id] = (out[id] || 0) + count * 0.5;
  }
  return out;
}

export function formatCredit(c) {
  if (!c) return '0';
  return c % 1 === 0 ? String(c) : c.toFixed(1).replace(/\.0$/, '');
}
