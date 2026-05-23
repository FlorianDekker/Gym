import { db } from './db.js';

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
