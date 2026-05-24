import { db } from './db.js';
import historicalSeed from './historicalSeed.json';

const MUSCLE_GROUP_FOR_NEW = {
  'Bench Press': 'push',
  'Close-Grip Bench Press': 'push',
  'Machine Shoulder Press': 'push',
  'Overhead Press': 'push',
  'Dips': 'push',
  'Eccentric Skull Crushers': 'push',
  'Tricep Pushdown': 'push',
  'Overhead Tricep Ext': 'push',
  'Egyptian Lateral Raise': 'push',
  "Lateral Raise 21's": 'push',
  'Cable Crossover': 'push',
  'Cable Crossover Decline': 'push',
  'Chest Press': 'push',
  'Reverse Pec Deck': 'pull',
  'Weighted Pull-Up': 'pull',
  'Assisted Pull-Up Machine': 'pull',
  'Body Row': 'pull',
  'Bent-Over Row': 'pull',
  'Upper Back Row': 'pull',
  'Seated Cable Row': 'pull',
  'Chest-Supported Row': 'pull',
  'Omni-Grip Lat Pulldown': 'pull',
  'Rope Facepull': 'pull',
  'Incline Dumbbell Shrug': 'pull',
  'Hammer Curl': 'pull',
  'Bicep Curl': 'pull',
  'Pronated Curl': 'pull',
  'Supinated Curl': 'pull',
  'Squat': 'legs',
  'Romanian Deadlift': 'legs',
  'Deadlift': 'legs',
  'Single Leg Press': 'legs',
  'Leg Extension': 'legs',
  'Seated Leg Curls': 'legs',
  'Single-Leg Calf Raise': 'legs',
  'Hip Abductor': 'legs',
  'Hip Adductor': 'legs',
  'Single-Leg Hip Thrust': 'legs',
  'Abdominal Crunch': 'core',
  'Situps': 'core'
};

const DEFAULT_TEMPLATES = [
  {
    name: 'Push 1',
    muscleGroup: 'push',
    exercises: [
      'Bench Press',
      'Machine Shoulder Press',
      'Dips',
      'Eccentric Skull Crushers',
      'Egyptian Lateral Raise',
      'Cable Tricep Kickback'
    ]
  },
  {
    name: 'Pull 1',
    muscleGroup: 'pull',
    exercises: [
      'Weighted Pull-Up',
      'Seated Cable Row',
      'Cable Pullover',
      'Hammer Curl',
      'Incline Dumbbell Curl'
    ]
  },
  {
    name: 'Legs 1',
    muscleGroup: 'legs',
    exercises: [
      'Squat',
      'Romanian Deadlift',
      'Single Leg Press',
      'Leg Extension',
      'Seated Leg Curls',
      'Single-Leg Calf Raise',
      'Hip Abductor',
      'Hip Adductor'
    ]
  },
  {
    name: 'Push 2',
    muscleGroup: 'push',
    exercises: [
      'Overhead Press',
      'Close-Grip Bench Press',
      'Cable Crossover',
      'Cable Crossover Decline',
      'Overhead Tricep Ext',
      "Lateral Raise 21's",
      'Incline Dumbbell Shrug (Optional)'
    ]
  },
  {
    name: 'Pull 2',
    muscleGroup: 'pull',
    exercises: [
      'Omni-Grip Lat Pulldown',
      'Chest-Supported Row',
      'Rope Facepull',
      'Incline Dumbbell Shrug (Optional)',
      'Reverse Pec Deck',
      'Pronated Curl',
      'Supinated Curl'
    ]
  },
  {
    name: 'Legs 2',
    muscleGroup: 'legs',
    exercises: [
      'Deadlift',
      'Hack Squat',
      'Single-Leg Hip Thrust',
      'Single-Leg Calf Raise',
      'Weighted L-Sit Hold',
      'Hip Abductor',
      'Hip Adductor'
    ]
  }
];

export async function ensureSeeded() {
  const seeded = await db.meta.get('seeded');
  if (seeded?.value) return;

  await db.transaction('rw', db.exercises, db.workoutTemplates, db.templateExercises, db.meta, async () => {
    for (let t = 0; t < DEFAULT_TEMPLATES.length; t++) {
      const tpl = DEFAULT_TEMPLATES[t];
      const templateId = await db.workoutTemplates.add({ name: tpl.name, order: t });
      for (let i = 0; i < tpl.exercises.length; i++) {
        const exName = tpl.exercises[i];
        const existing = await db.exercises.where('name').equals(exName).first();
        const exerciseId = existing ? existing.id : await db.exercises.add({ name: exName, muscleGroup: tpl.muscleGroup });
        await db.templateExercises.add({ templateId, exerciseId, order: i });
      }
    }
    await db.meta.put({ key: 'seeded', value: true });
  });
}

export async function ensureHistorySeeded() {
  const flag = await db.meta.get('history-seed-v1');
  if (flag?.value) return;

  const exerciseIdByName = new Map();
  for (const ex of await db.exercises.toArray()) {
    exerciseIdByName.set(ex.name, ex.id);
  }

  await db.transaction(
    'rw',
    db.exercises,
    db.workouts,
    db.sets,
    db.meta,
    async () => {
      for (const w of historicalSeed.workouts) {
        const workoutId = await db.workouts.add({
          date: w.date,
          templateId: null,
          name: w.name,
          notes: w.notes || '',
          bodyWeight: w.bodyWeight ?? null,
          bodyFat: w.bodyFat ?? null
        });
        for (let i = 0; i < w.exercises.length; i++) {
          const ex = w.exercises[i];
          let exerciseId = exerciseIdByName.get(ex.name);
          if (!exerciseId) {
            exerciseId = await db.exercises.add({
              name: ex.name,
              muscleGroup: MUSCLE_GROUP_FOR_NEW[ex.name] || 'other'
            });
            exerciseIdByName.set(ex.name, exerciseId);
          }
          for (const s of ex.sets) {
            await db.sets.add({
              workoutId,
              exerciseId,
              orderInWorkout: i + 1,
              reps: s.reps,
              weight: s.weight
            });
          }
        }
      }
      await db.meta.put({ key: 'history-seed-v1', value: true });
    }
  );
}
