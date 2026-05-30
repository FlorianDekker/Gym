import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import BottomSheet from './BottomSheet.jsx';

export default function WorkoutTemplateEditor({ templateId, onDone }) {
  const [name, setName] = useState('');
  const [restSeconds, setRestSeconds] = useState(90);
  const rows = useLiveQuery(
    async () => {
      const tes = await db.templateExercises.where('templateId').equals(templateId).sortBy('order');
      const exs = await Promise.all(tes.map((te) => db.exercises.get(te.exerciseId)));
      return tes.map((te, i) => ({ ...te, exercise: exs[i] })).filter((r) => r.exercise);
    },
    [templateId],
    []
  );
  const allExercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], []);

  useEffect(() => {
    db.workoutTemplates.get(templateId).then((t) => {
      if (!t) return;
      setName(t.name);
      setRestSeconds(t.restSeconds ?? 90);
    });
  }, [templateId]);

  async function saveName() {
    if (!name.trim()) return;
    await db.workoutTemplates.update(templateId, { name: name.trim() });
  }

  async function changeRest(delta) {
    const next = Math.max(15, restSeconds + delta);
    setRestSeconds(next);
    await db.workoutTemplates.update(templateId, { restSeconds: next });
  }

  async function addExercise(exerciseId) {
    const order = rows.length;
    await db.templateExercises.add({ templateId, exerciseId, order });
  }

  async function removeRow(row) {
    await db.templateExercises.delete(row.id);
    const remaining = await db.templateExercises
      .where('templateId')
      .equals(templateId)
      .sortBy('order');
    await db.transaction('rw', db.templateExercises, async () => {
      for (let i = 0; i < remaining.length; i++) {
        await db.templateExercises.update(remaining[i].id, { order: i });
      }
    });
  }

  async function move(row, dir) {
    const list = rows.slice().sort((a, b) => a.order - b.order);
    const i = list.findIndex((r) => r.id === row.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    await db.transaction('rw', db.templateExercises, async () => {
      await db.templateExercises.update(list[i].id, { order: j });
      await db.templateExercises.update(list[j].id, { order: i });
    });
  }

  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState('');
  const filtered = (allExercises || []).filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-5 pt-12 pb-24 flex-1 space-y-4 animate-slide-up">
      <header className="flex items-center gap-2">
        <button onClick={onDone} className="text-muted p-2 -ml-2" aria-label="Back">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold tracking-tight flex-1">Edit workout</h1>
      </header>

      <div className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] p-4 space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted font-bold">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="w-full bg-surface dark:bg-[#16181c] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Rest timer</p>
          <p className="text-xs text-muted mt-0.5">Default between sets in this workout</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeRest(-15)}
            className="w-8 h-8 rounded-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] font-bold"
          >
            −
          </button>
          <span className="tabular-nums font-semibold w-14 text-center">{restSeconds}s</span>
          <button
            onClick={() => changeRest(15)}
            className="w-8 h-8 rounded-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] font-bold"
          >
            +
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227]">
        <header className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-[10px] uppercase tracking-wider text-muted font-bold">Exercises</h2>
          <button
            onClick={() => setPicker(true)}
            className="text-sm font-semibold text-primary"
          >
            + Add
          </button>
        </header>
        <ul className="divide-y divide-line dark:divide-[#1f2227]">
          {rows
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-4 py-3">
                <span className="flex-1 truncate">{r.exercise.name}</span>
                {r.exercise.bodyweight && (
                  <span className="text-[10px] uppercase tracking-wide font-bold text-muted bg-surface dark:bg-[#16181c] rounded-full px-2 py-0.5">
                    BW
                  </span>
                )}
                <button onClick={() => move(r, -1)} className="p-2 text-muted">↑</button>
                <button onClick={() => move(r, +1)} className="p-2 text-muted">↓</button>
                <button onClick={() => removeRow(r)} className="p-2 text-muted-light">✕</button>
              </li>
            ))}
          {rows.length === 0 && <li className="px-4 py-6 text-center text-muted">No exercises yet.</li>}
        </ul>
      </div>

      <BottomSheet open={picker} onClose={() => { setPicker(false); setQ(''); }} title="Add exercise" position="top">
        <PickerContents
          q={q}
          setQ={setQ}
          filtered={filtered}
          onPick={async (e) => {
            await addExercise(e.id);
            setPicker(false);
            setQ('');
          }}
          onCreate={async (name) => {
            const clean = name.trim();
            const existing = await db.exercises.where('name').equals(clean).first();
            const id = existing?.id ?? (await db.exercises.add({ name: clean, muscleGroup: 'Other' }));
            await addExercise(id);
            setPicker(false);
            setQ('');
          }}
        />
      </BottomSheet>
    </div>
  );
}

function PickerContents({ q, setQ, filtered, onPick, onCreate }) {
  const trimmed = q.trim();
  const exactMatch = filtered.some((e) => e.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !exactMatch;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search or new exercise name"
          className="flex-1 bg-surface dark:bg-[#16181c] rounded-xl px-3 py-2.5 outline-none"
        />
        {canCreate && (
          <button
            onClick={() => onCreate(trimmed)}
            type="button"
            className="shrink-0 bg-primary text-white rounded-xl px-3 font-semibold text-sm"
          >
            + Create
          </button>
        )}
      </div>
      <ul className="overflow-y-auto divide-y divide-line dark:divide-[#1f2227]">
        {filtered.map((e) => (
          <li key={e.id}>
            <button onClick={() => onPick(e)} type="button" className="w-full text-left py-3">
              {e.name}
            </button>
          </li>
        ))}
        {filtered.length === 0 && !canCreate && (
          <li className="py-6 text-center text-muted">No matches</li>
        )}
      </ul>
    </div>
  );
}
