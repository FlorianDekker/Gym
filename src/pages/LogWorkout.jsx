import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../db/db.js';
import { todayISO } from '../lib/volume.js';

const newSet = () => ({ reps: '', weight: '' });

export default function LogWorkout() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [showSwap, setShowSwap] = useState(null);
  const [allExercises, setAllExercises] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tId = Number(templateId);
      const tpl = await db.workoutTemplates.get(tId);
      if (!tpl || cancelled) return;
      const teRows = await db.templateExercises.where('templateId').equals(tId).sortBy('order');
      const exs = await Promise.all(teRows.map((te) => db.exercises.get(te.exerciseId)));
      const built = await Promise.all(
        exs.filter(Boolean).map(async (ex) => ({
          exerciseId: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: await prefillSets(ex.id)
        }))
      );
      if (cancelled) return;
      setTemplate(tpl);
      setItems(built);
      setAllExercises(await db.exercises.orderBy('name').toArray());
    })();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const totalSets = useMemo(() => items.reduce((s, it) => s + it.sets.length, 0), [items]);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function updateSet(idx, sIdx, patch) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, sets: it.sets.map((s, j) => (j === sIdx ? { ...s, ...patch } : s)) }
          : it
      )
    );
  }

  function addSet(idx) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const last = it.sets[it.sets.length - 1];
        return { ...it, sets: [...it.sets, last ? { ...last } : newSet()] };
      })
    );
  }

  function removeSet(idx, sIdx) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, sets: it.sets.filter((_, j) => j !== sIdx) } : it))
    );
  }

  function move(idx, dir) {
    setItems((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function swapExercise(idx, newExerciseId) {
    const ex = await db.exercises.get(newExerciseId);
    if (!ex) return;
    const sets = await prefillSets(ex.id);
    updateItem(idx, { exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, sets });
    setShowSwap(null);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await db.transaction('rw', db.workouts, db.sets, async () => {
        const workoutId = await db.workouts.add({
          date,
          templateId: template.id,
          name: template.name
        });
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          for (const s of it.sets) {
            const reps = Number(s.reps);
            const weight = Number(s.weight);
            if (!reps && !weight) continue;
            await db.sets.add({
              workoutId,
              exerciseId: it.exerciseId,
              orderInWorkout: i + 1,
              reps,
              weight
            });
          }
        }
      });
      navigate('/history', { replace: true });
    } finally {
      setSaving(false);
    }
  }

  if (!template) {
    return <div className="p-4 text-slate-500">Loading…</div>;
  }

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/" className="text-slate-500 active:opacity-60" aria-label="Back">←</Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold leading-tight">{template.name}</h1>
            <p className="text-xs text-slate-500">{totalSets} sets · {items.length} exercises</p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1"
          />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {items.map((it, idx) => (
          <section key={`${it.exerciseId}-${idx}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <Link to={`/exercise/${it.exerciseId}`} className="flex-1 font-medium truncate">{it.name}</Link>
              <button onClick={() => move(idx, -1)} aria-label="Move up" className="p-2 text-slate-500 active:opacity-60">↑</button>
              <button onClick={() => move(idx, +1)} aria-label="Move down" className="p-2 text-slate-500 active:opacity-60">↓</button>
              <button onClick={() => setShowSwap(idx)} aria-label="Swap exercise" className="p-2 text-slate-500 active:opacity-60">⇄</button>
            </header>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {it.sets.map((s, sIdx) => (
                <li key={sIdx} className="flex items-center gap-3 px-4 py-2">
                  <span className="w-6 text-sm text-slate-500 tabular-nums">{sIdx + 1}</span>
                  <NumberInput
                    placeholder="reps"
                    value={s.reps}
                    onChange={(v) => updateSet(idx, sIdx, { reps: v })}
                    inputMode="numeric"
                  />
                  <span className="text-slate-400">×</span>
                  <NumberInput
                    placeholder="kg"
                    value={s.weight}
                    onChange={(v) => updateSet(idx, sIdx, { weight: v })}
                    inputMode="decimal"
                  />
                  <button onClick={() => removeSet(idx, sIdx)} aria-label="Remove set" className="p-2 text-slate-400 active:text-rose-500">✕</button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => addSet(idx)}
              className="w-full py-3 text-sm font-medium text-slate-600 dark:text-slate-300 active:opacity-60"
            >
              + Add set
            </button>
          </section>
        ))}
      </div>

      <div
        className="fixed bottom-0 inset-x-0 mx-auto max-w-screen-sm p-4 bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-4 active:opacity-80 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save workout'}
        </button>
      </div>

      {showSwap !== null && (
        <SwapModal
          exercises={allExercises}
          onClose={() => setShowSwap(null)}
          onPick={(id) => swapExercise(showSwap, id)}
        />
      )}
    </div>
  );
}

function NumberInput({ value, onChange, inputMode, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode={inputMode}
      placeholder={placeholder}
      className="flex-1 min-w-0 text-center text-lg tabular-nums bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-2 border border-transparent focus:border-slate-400 dark:focus:border-slate-500 outline-none"
    />
  );
}

function SwapModal({ exercises, onClose, onPick }) {
  const [q, setQ] = useState('');
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-screen-sm mx-auto bg-white dark:bg-slate-900 rounded-t-3xl p-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
        <h2 className="font-semibold mb-3">Swap exercise</h2>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises"
          className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 mb-3 outline-none"
        />
        <ul className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((e) => (
            <li key={e.id}>
              <button onClick={() => onPick(e.id)} className="w-full text-left py-3 active:opacity-60">
                {e.name}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="py-6 text-center text-slate-500">No matches</li>}
        </ul>
      </div>
    </div>
  );
}

async function prefillSets(exerciseId) {
  const recent = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .reverse()
    .sortBy('id');
  const lastWorkoutId = recent[0]?.workoutId;
  const last = recent.filter((s) => s.workoutId === lastWorkoutId).slice(0, 4);
  if (last.length === 0) {
    return [newSet(), newSet(), newSet()];
  }
  return last
    .sort((a, b) => a.id - b.id)
    .map((s) => ({ reps: String(s.reps), weight: String(s.weight) }));
}
