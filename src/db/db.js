import Dexie from 'dexie';

export const db = new Dexie('GymDB');

db.version(1).stores({
  exercises: '++id, &name, muscleGroup',
  workouts: '++id, date, templateId, name',
  sets: '++id, workoutId, exerciseId, orderInWorkout',
  workoutTemplates: '++id, &name, order',
  templateExercises: '++id, templateId, exerciseId, order, [templateId+order]',
  meta: '&key'
});
