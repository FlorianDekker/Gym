import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

const ACCENT = {
  push: 'bg-rose-500/10 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-900/60',
  pull: 'bg-sky-500/10 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-900/60',
  legs: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-900/60',
  default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
};

function detectGroup(name) {
  const n = name.toLowerCase();
  if (n.startsWith('push')) return 'push';
  if (n.startsWith('pull')) return 'pull';
  if (n.startsWith('legs')) return 'legs';
  return 'default';
}

export default function Home() {
  const templates = useLiveQuery(() => db.workoutTemplates.orderBy('order').toArray(), [], []);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-4 space-y-6">
      <header className="pt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{today}</p>
        <h1 className="text-3xl font-bold tracking-tight">Pick a workout</h1>
      </header>

      <ul className="space-y-3">
        {templates.map((tpl) => {
          const group = detectGroup(tpl.name);
          return (
            <li key={tpl.id}>
              <Link
                to={`/log/${tpl.id}`}
                className={`block rounded-2xl border px-5 py-4 shadow-sm active:scale-[0.99] transition ${ACCENT[group]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{tpl.name}</span>
                  <span aria-hidden className="text-xl">→</span>
                </div>
              </Link>
            </li>
          );
        })}
        {templates.length === 0 && (
          <li className="text-center text-slate-500 dark:text-slate-400 py-12">
            No workouts yet. Add one in Settings.
          </li>
        )}
      </ul>
    </div>
  );
}
