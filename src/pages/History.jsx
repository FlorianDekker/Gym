import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/db.js';
import { volume, formatDate, formatMonth } from '../lib/volume.js';

export default function History() {
  const data = useLiveQuery(
    async () => {
      const rows = await db.workouts.orderBy('date').reverse().toArray();
      const enriched = await Promise.all(
        rows.map(async (w) => {
          const sets = await db.sets.where('workoutId').equals(w.id).toArray();
          return { ...w, setCount: sets.length, volume: volume(sets), sets };
        })
      );
      return enriched;
    },
    [],
    []
  );

  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('all');

  const filters = useMemo(() => {
    const names = new Set(data.map((w) => w.name));
    return ['all', ...Array.from(names).sort()];
  }, [data]);

  const visible = useMemo(
    () => (filter === 'all' ? data : data.filter((w) => w.name === filter)),
    [data, filter]
  );

  const grouped = useMemo(() => {
    const out = [];
    let last = null;
    for (const w of visible) {
      const month = formatMonth(w.date);
      if (month !== last) {
        out.push({ month });
        last = month;
      }
      out.push({ workout: w });
    }
    return out;
  }, [visible]);

  return (
    <div className="px-5 pt-12 pb-24 flex-1">
      <header className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted">{data.length} workouts logged</p>
      </header>

      {filters.length > 2 && (
        <div className="-mx-5 px-5 mb-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-semibold rounded-full px-3 py-1.5 whitespace-nowrap border ${
                  filter === f
                    ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                    : 'bg-surface text-muted border-line dark:bg-[#16181c] dark:border-[#1f2227]'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {grouped.map((row, i) => {
          if (row.month) {
            return (
              <li key={`m-${i}`} className="pt-2 pb-1 first:pt-0">
                <p className="text-[11px] uppercase tracking-wider text-muted font-bold">{row.month}</p>
              </li>
            );
          }
          const w = row.workout;
          return (
            <li
              key={w.id}
              className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] overflow-hidden"
            >
              <button
                className="w-full text-left px-4 py-3"
                onClick={() => setOpen(open === w.id ? null : w.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{w.name}</p>
                    <p className="text-xs text-muted">{formatDate(w.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{w.setCount} sets</p>
                    <p className="text-[11px] text-muted tabular-nums">
                      {Math.round(w.volume)} kg·rep
                    </p>
                  </div>
                </div>
                {w.notes && (
                  <p className="text-xs text-muted mt-1.5 line-clamp-2">{w.notes}</p>
                )}
              </button>
              {open === w.id && <WorkoutDetail workoutId={w.id} sets={w.sets} />}
            </li>
          );
        })}
        {data.length === 0 && (
          <li className="text-center text-muted py-16">
            <p>No workouts yet.</p>
            <p className="text-xs mt-1">Hit Home to start one.</p>
          </li>
        )}
      </ul>
    </div>
  );
}

function WorkoutDetail({ workoutId, sets }) {
  const groups = useLiveQuery(
    async () => {
      const map = new Map();
      for (const s of sets) {
        if (!map.has(s.exerciseId)) map.set(s.exerciseId, []);
        map.get(s.exerciseId).push(s);
      }
      const out = [];
      for (const [exerciseId, list] of map) {
        const ex = await db.exercises.get(exerciseId);
        list.sort((a, b) => a.id - b.id);
        out.push({ exerciseId, name: ex?.name ?? 'Unknown', bodyweight: !!ex?.bodyweight, sets: list });
      }
      return out;
    },
    [sets, workoutId],
    []
  );

  return (
    <div className="px-4 pb-4 border-t border-line dark:border-[#1f2227] divide-y divide-line dark:divide-[#1f2227] animate-fade-in">
      {groups.map((g) => (
        <div key={g.exerciseId} className="py-3">
          <Link to={`/exercise/${g.exerciseId}`} className="font-medium text-sm">{g.name} →</Link>
          <ul className="text-xs text-muted tabular-nums mt-1 space-y-0.5">
            {g.sets.map((s, i) => (
              <li key={s.id}>
                <span className="text-muted-light">{i + 1}.</span>{' '}
                {g.bodyweight ? `${s.reps} reps` : `${s.reps} × ${s.weight} kg`}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
