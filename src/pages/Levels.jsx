import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db.js';
import { evaluate, hasStandards, LEVELS } from '../lib/strengthLevels.js';
import { loadProfile, isProfileComplete } from '../lib/profile.js';

const SORTS = [
  { id: 'progress', label: 'By level' },
  { id: 'name', label: 'A-Z' }
];

export default function Levels() {
  const [sortBy, setSortBy] = useState('progress');

  const data = useLiveQuery(
    async () => {
      const profile = loadProfile();
      if (!isProfileComplete(profile)) return { state: 'no-profile' };

      const exercises = await db.exercises.toArray();
      const allSets = await db.sets.toArray();
      const setsByExercise = new Map();
      for (const s of allSets) {
        if (!setsByExercise.has(s.exerciseId)) setsByExercise.set(s.exerciseId, []);
        setsByExercise.get(s.exerciseId).push(s);
      }

      const rows = [];
      for (const ex of exercises) {
        if (!hasStandards(ex.name)) continue;
        const sets = setsByExercise.get(ex.id);
        if (!sets || sets.length === 0) continue;
        const result = evaluate(ex.name, sets, profile);
        if (!result) continue;
        rows.push({ exerciseId: ex.id, name: ex.name, ...result });
      }
      return { state: 'ok', rows };
    },
    [],
    { state: 'loading' }
  );

  if (data.state === 'loading') {
    return <div className="px-5 pt-12 pb-24 text-muted">Loading…</div>;
  }

  if (data.state === 'no-profile') {
    return (
      <div className="px-5 pt-12 pb-24 flex-1 animate-slide-up">
        <header className="mb-5">
          <h1 className="text-[28px] font-bold tracking-tight">Strength Levels</h1>
        </header>
        <section className="rounded-2xl bg-white dark:bg-[#101115] border border-line dark:border-[#1f2227] p-5 text-sm">
          <p className="mb-2 font-semibold">Almost ready.</p>
          <p className="text-muted mb-3">
            Enter your sex, bodyweight, and date of birth in Settings so we can compare
            your lifts to standards for someone like you.
          </p>
          <Link to="/settings" className="text-primary font-semibold">Go to Settings →</Link>
        </section>
      </div>
    );
  }

  const rows = data.rows;
  const sorted =
    sortBy === 'name'
      ? rows.slice().sort((a, b) => a.name.localeCompare(b.name))
      : rows.slice().sort((a, b) => b.overallProgress - a.overallProgress);

  return (
    <div className="px-5 pt-12 pb-24 flex-1 animate-slide-up">
      <header className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight">Strength Levels</h1>
        <p className="text-sm text-muted">{rows.length} exercises with logged data</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-center text-muted py-16">
          Log a few sets for one of the standard lifts and your level will show up here.
        </p>
      ) : (
        <>
          <div className="-mx-5 px-5 mb-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 w-max">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id)}
                  className={`text-xs font-semibold rounded-full px-3 py-1.5 whitespace-nowrap border ${
                    sortBy === s.id
                      ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                      : 'bg-surface text-muted border-line dark:bg-[#16181c] dark:border-[#1f2227]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-3">
            {sorted.map((row) => (
              <li key={row.exerciseId}>
                <LevelRow row={row} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LevelRow({ row }) {
  const segCount = LEVELS.length - 1;
  const fillPct = row.overallProgress * 100;
  const oneRmStr = row.oneRm >= 100 ? Math.round(row.oneRm) : row.oneRm.toFixed(1);

  return (
    <Link
      to={`/exercise/${row.exerciseId}`}
      className="block rounded-2xl bg-white dark:bg-[#101115] border border-line dark:border-[#1f2227] p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-semibold truncate flex-1">{row.name}</p>
        <span className="text-[10px] uppercase tracking-wider font-bold text-primary shrink-0">
          {row.level}
        </span>
      </div>
      <div className="flex items-baseline justify-between text-xs text-muted mb-2 tabular-nums">
        <span>
          1RM <span className="font-semibold text-ink dark:text-white">{oneRmStr}</span> kg
          {row.mode === 'bw' && row.bestRecorded && (
            <span className="text-muted-light ml-1">
              ({row.bestRecorded.weight === 0
                ? 'BW'
                : row.bestRecorded.weight > 0
                  ? `BW +${row.bestRecorded.weight}`
                  : `BW ${row.bestRecorded.weight}`})
            </span>
          )}
        </span>
        <span>{row.percentile}%</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface dark:bg-[#16181c] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          style={{ width: `${fillPct}%` }}
        />
        {Array.from({ length: segCount - 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white dark:bg-[#0b0c0e]"
            style={{ left: `${((i + 1) / segCount) * 100}%` }}
          />
        ))}
      </div>
    </Link>
  );
}
