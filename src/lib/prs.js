import { db } from '../db/db.js';
import { volume } from './volume.js';

export async function exerciseStats(exerciseId, opts = {}) {
  const sets = await db.sets.where('exerciseId').equals(Number(exerciseId)).toArray();
  if (sets.length === 0) {
    return { maxWeight: 0, maxReps: 0, bestSet: null, totalVolume: 0, sessionCount: 0 };
  }
  let maxWeight = 0;
  let maxReps = 0;
  let bestSet = sets[0];
  let bestScore = -1;
  for (const s of sets) {
    if (s.weight > maxWeight) maxWeight = s.weight;
    if (s.reps > maxReps) maxReps = s.reps;
    const score = s.reps * Math.max(s.weight, 1);
    if (score > bestScore) {
      bestScore = score;
      bestSet = s;
    }
  }
  const sessions = new Set(sets.map((s) => s.workoutId)).size;
  return {
    maxWeight,
    maxReps,
    bestSet,
    totalVolume: volume(sets),
    sessionCount: sessions
  };
}

export async function detectPRs(workoutId) {
  const sets = await db.sets.where('workoutId').equals(Number(workoutId)).toArray();
  const byExercise = new Map();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
    byExercise.get(s.exerciseId).push(s);
  }
  const prs = [];
  for (const [exerciseId, exSets] of byExercise) {
    const priorSets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const prior = priorSets.filter((s) => s.workoutId !== Number(workoutId));
    const priorMaxWeight = prior.reduce((m, s) => Math.max(m, s.weight), 0);
    const priorMaxReps = prior.reduce((m, s) => Math.max(m, s.reps), 0);
    const newMaxWeight = exSets.reduce((m, s) => Math.max(m, s.weight), 0);
    const newMaxReps = exSets.reduce((m, s) => Math.max(m, s.reps), 0);
    const ex = await db.exercises.get(exerciseId);
    if (newMaxWeight > priorMaxWeight && priorMaxWeight > 0) {
      prs.push({ exerciseId, name: ex?.name, type: 'weight', value: newMaxWeight, prev: priorMaxWeight });
    }
    if (newMaxReps > priorMaxReps && priorMaxReps > 0 && newMaxWeight >= priorMaxWeight) {
      prs.push({ exerciseId, name: ex?.name, type: 'reps', value: newMaxReps, prev: priorMaxReps });
    }
  }
  return prs;
}
