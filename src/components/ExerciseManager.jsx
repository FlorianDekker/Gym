import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { MUSCLES, MUSCLE_LABEL, getMusclesFor } from '../lib/muscles.js';

export default function ExerciseManager({ onDone }) {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], []);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');

  if (editing) {
    return (
      <ExerciseEditor
        exerciseId={editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <div className="px-5 pt-12 pb-24 flex-1 space-y-4 animate-slide-up">
      <header className="flex items-center gap-2">
        <button onClick={onDone} className="text-muted p-2 -ml-2" aria-label="Back">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold tracking-tight flex-1">All exercises</h1>
      </header>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exercises"
        className="w-full bg-surface dark:bg-[#16181c] rounded-xl px-3 py-2.5 outline-none"
      />

      <ul className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] divide-y divide-line dark:divide-[#1f2227]">
        {filtered.map((ex) => {
          const m = getMusclesFor(ex);
          const muscleNames = [...new Set([...(m.primary || []), ...(m.secondary || [])])]
            .map((id) => MUSCLE_LABEL[id])
            .filter(Boolean)
            .join(', ');
          return (
            <li key={ex.id}>
              <button
                onClick={() => setEditing(ex.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ex.name}</p>
                  {muscleNames ? (
                    <p className="text-[11px] text-muted truncate">{muscleNames}</p>
                  ) : (
                    <p className="text-[11px] text-muted-light">No muscles assigned</p>
                  )}
                </div>
                {ex.bodyweight && (
                  <span className="text-[10px] uppercase tracking-wide font-bold text-muted bg-surface dark:bg-[#16181c] rounded-full px-2 py-0.5">
                    BW
                  </span>
                )}
                <span className="text-muted">›</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-muted text-sm">No exercises match.</li>
        )}
      </ul>
    </div>
  );
}

function ExerciseEditor({ exerciseId, onDone }) {
  const [ex, setEx] = useState(null);
  const [name, setName] = useState('');
  const [bodyweight, setBodyweight] = useState(false);
  const [primary, setPrimary] = useState(new Set());
  const [secondary, setSecondary] = useState(new Set());

  useEffect(() => {
    db.exercises.get(exerciseId).then((row) => {
      if (!row) return;
      setEx(row);
      setName(row.name);
      setBodyweight(!!row.bodyweight);
      const m = getMusclesFor(row);
      setPrimary(new Set(m.primary || []));
      setSecondary(new Set(m.secondary || []));
    });
  }, [exerciseId]);

  function toggleIn(setRef, setterRef, otherSet, otherSetter, id) {
    const next = new Set(setRef);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      // Ensure the same muscle isn't both primary and secondary.
      if (otherSet.has(id)) {
        const otherNext = new Set(otherSet);
        otherNext.delete(id);
        otherSetter(otherNext);
      }
    }
    setterRef(next);
  }

  async function save() {
    const clean = name.trim();
    if (!clean) return;
    await db.exercises.update(exerciseId, {
      name: clean,
      bodyweight,
      primaryMuscles: [...primary],
      secondaryMuscles: [...secondary]
    });
    onDone();
  }

  async function remove() {
    if (!ex) return;
    const inUse = await db.sets.where('exerciseId').equals(exerciseId).count();
    const linked = await db.templateExercises.where('exerciseId').equals(exerciseId).count();
    let msg = `Delete "${ex.name}"?`;
    if (inUse > 0 || linked > 0) {
      msg += `\n\nThis exercise has ${inUse} logged set${inUse === 1 ? '' : 's'} `;
      msg += `and is in ${linked} template${linked === 1 ? '' : 's'}. All of that will be removed too.`;
    }
    if (!confirm(msg)) return;
    await db.transaction(
      'rw',
      db.exercises,
      db.sets,
      db.templateExercises,
      async () => {
        await db.sets.where('exerciseId').equals(exerciseId).delete();
        await db.templateExercises.where('exerciseId').equals(exerciseId).delete();
        await db.exercises.delete(exerciseId);
      }
    );
    onDone();
  }

  if (!ex) {
    return <div className="px-5 pt-12 pb-24 text-muted">Loading…</div>;
  }

  return (
    <div className="px-5 pt-12 pb-32 flex-1 space-y-4 animate-slide-up">
      <header className="flex items-center gap-2">
        <button onClick={onDone} className="text-muted p-2 -ml-2" aria-label="Back">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold tracking-tight flex-1">Edit exercise</h1>
      </header>

      <div className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] p-4 space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted font-bold">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-surface dark:bg-[#16181c] rounded-xl px-3 py-2.5 outline-none"
        />
      </div>

      <div className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Bodyweight</p>
          <p className="text-xs text-muted">Hide the weight input — just reps.</p>
        </div>
        <button
          onClick={() => setBodyweight((v) => !v)}
          role="switch"
          aria-checked={bodyweight}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
            bodyweight ? 'bg-primary' : 'bg-muted-light dark:bg-[#2a2d33]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
              bodyweight ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <MuscleChips
        label="Primary muscles"
        selected={primary}
        otherSelected={secondary}
        onToggle={(id) => toggleIn(primary, setPrimary, secondary, setSecondary, id)}
      />

      <MuscleChips
        label="Secondary muscles"
        selected={secondary}
        otherSelected={primary}
        onToggle={(id) => toggleIn(secondary, setSecondary, primary, setPrimary, id)}
      />

      <button
        onClick={save}
        className="w-full rounded-2xl bg-primary text-white font-semibold py-3 shadow-lg shadow-primary/30"
      >
        Save changes
      </button>

      <button
        onClick={remove}
        className="w-full rounded-2xl border border-line dark:border-[#1f2227] text-red-600 dark:text-red-400 font-medium py-3 text-sm"
      >
        Delete exercise
      </button>
    </div>
  );
}

function MuscleChips({ label, selected, onToggle }) {
  return (
    <div className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {MUSCLES.map((m) => {
          const isSel = selected.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => onToggle(m.id)}
              type="button"
              className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
                isSel
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface dark:bg-[#16181c] text-muted border-line dark:border-[#1f2227]'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
