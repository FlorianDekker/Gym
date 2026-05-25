import { db } from '../db/db.js';
import { effectiveWeight } from './strengthLevels.js';
import { loadProfile } from './profile.js';

async function bodyweightLookup() {
  const profileBw = Number(loadProfile()?.bodyweight) || null;
  const workouts = await db.workouts.toArray();
  const bwByWorkoutId = new Map();
  for (const w of workouts) bwByWorkoutId.set(w.id, Number(w.bodyWeight) || profileBw);
  return { bwByWorkoutId, profileBw };
}

export async function exerciseStats(exerciseId) {
  const id = Number(exerciseId);
  const sets = await db.sets.where('exerciseId').equals(id).toArray();
  if (sets.length === 0) {
    return { maxWeight: 0, maxReps: 0, bestSet: null, totalVolume: 0, sessionCount: 0 };
  }
  const ex = await db.exercises.get(id);
  const name = ex?.name;
  const { bwByWorkoutId, profileBw } = await bodyweightLookup();

  let maxWeight = 0; // effective load
  let maxReps = 0;
  let bestSet = null;
  let bestScore = -Infinity;
  let totalVolume = 0;

  for (const s of sets) {
    const reps = Number(s.reps) || 0;
    if (reps > maxReps) maxReps = reps;
    const bw = bwByWorkoutId.get(s.workoutId) ?? profileBw;
    const eff = effectiveWeight(name, s.weight, bw);
    if (eff == null) continue;
    if (eff > maxWeight) maxWeight = eff;
    totalVolume += reps * eff;
    const score = reps * Math.max(eff, 1);
    if (score > bestScore) {
      bestScore = score;
      // Surface the effective weight on bestSet for direct display.
      bestSet = { ...s, reps, weight: eff };
    }
  }
  const sessions = new Set(sets.map((s) => s.workoutId)).size;
  return { maxWeight, maxReps, bestSet, totalVolume, sessionCount: sessions };
}

export async function detectPRs(workoutId) {
  const sets = await db.sets.where('workoutId').equals(Number(workoutId)).toArray();
  if (sets.length === 0) return [];
  const exercises = await db.exercises.toArray();
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const { bwByWorkoutId, profileBw } = await bodyweightLookup();

  const byExercise = new Map();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
    byExercise.get(s.exerciseId).push(s);
  }

  const prs = [];
  for (const [exerciseId, exSets] of byExercise) {
    const name = exMap.get(exerciseId)?.name;
    const priorSets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const prior = priorSets.filter((s) => s.workoutId !== Number(workoutId));

    const effMax = (rows) => {
      let m = 0;
      for (const s of rows) {
        const bw = bwByWorkoutId.get(s.workoutId) ?? profileBw;
        const eff = effectiveWeight(name, s.weight, bw);
        if (eff != null && eff > m) m = eff;
      }
      return m;
    };
    const priorMaxWeight = effMax(prior);
    const priorMaxReps = prior.reduce((m, s) => Math.max(m, s.reps || 0), 0);
    const newMaxWeight = effMax(exSets);
    const newMaxReps = exSets.reduce((m, s) => Math.max(m, s.reps || 0), 0);

    if (newMaxWeight > priorMaxWeight && priorMaxWeight > 0) {
      prs.push({ exerciseId, name, type: 'weight', value: Math.round(newMaxWeight * 10) / 10, prev: Math.round(priorMaxWeight * 10) / 10 });
    }
    if (newMaxReps > priorMaxReps && priorMaxReps > 0 && newMaxWeight >= priorMaxWeight) {
      prs.push({ exerciseId, name, type: 'reps', value: newMaxReps, prev: priorMaxReps });
    }
  }
  return prs;
}
