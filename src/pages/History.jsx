import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db.js';
import { volume, formatDate } from '../lib/volume.js';

export default function History() {
  const workouts = useLiveQuery(
    async () => {
      const rows = await db.workouts.orderBy('date').reverse().toArray();
      return Promise.all(
        rows.map(async (w) => {
          const sets = await db.sets.where('workoutId').equals(w.id).toArray();
          return { ...w, setCount: sets.length, volume: volume(sets), sets };
        })
      );
    },
    [],
    []
  );

  const [open, setOpen] = useState(null);

  return (
    <div className="p-4 space-y-4">
      <header className="pt-4">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{workouts.length} workouts</p>
      </header>

      <ul className="space-y-3">
        {workouts.map((w) => (
          <li key={w.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              className="w-full text-left px-4 py-3 active:opacity-60"
              onClick={() => setOpen(open === w.id ? null : w.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(w.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm tabular-nums">{w.setCount} sets</p>
                  <p className="text-xs text-slate-500 tabular-nums">{Math.round(w.volume)} kg·rep</p>
                </div>
              </div>
            </button>
            {open === w.id && <WorkoutDetail sets={w.sets} />}
          </li>
        ))}
        {workouts.length === 0 && (
          <li className="text-center text-slate-500 dark:text-slate-400 py-12">
            No workouts logged yet. Hit Home to start one.
          </li>
        )}
      </ul>
    </div>
  );
}

function WorkoutDetail({ sets }) {
  const byExercise = useLiveQuery(
    async () => {
      const groups = new Map();
      for (const s of sets) {
        if (!groups.has(s.exerciseId)) groups.set(s.exerciseId, []);
        groups.get(s.exerciseId).push(s);
      }
      const out = [];
      for (const [exerciseId, list] of groups) {
        const ex = await db.exercises.get(exerciseId);
        list.sort((a, b) => a.id - b.id);
        out.push({ exerciseId, name: ex?.name ?? 'Unknown', sets: list });
      }
      return out;
    },
    [sets],
    []
  );

  return (
    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
      {byExercise.map((g) => (
        <div key={g.exerciseId} className="py-3">
          <p className="font-medium mb-1">{g.name}</p>
          <ul className="text-sm text-slate-600 dark:text-slate-300 tabular-nums space-y-0.5">
            {g.sets.map((s, i) => (
              <li key={s.id}>
                <span className="text-slate-400">{i + 1}.</span> {s.reps} × {s.weight} kg
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
