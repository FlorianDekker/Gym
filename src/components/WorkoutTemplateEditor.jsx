import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

export default function WorkoutTemplateEditor({ templateId, onDone }) {
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
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
    db.workoutTemplates.get(templateId).then((t) => t && setName(t.name));
  }, [templateId]);

  async function saveName() {
    if (savingName) return;
    setSavingName(true);
    await db.workoutTemplates.update(templateId, { name: name.trim() });
    setSavingName(false);
  }

  async function addExercise(exerciseId) {
    const order = rows.length;
    await db.templateExercises.add({ templateId, exerciseId, order });
  }

  async function newExercise() {
    const exName = prompt('New exercise name?');
    if (!exName?.trim()) return;
    const existing = await db.exercises.where('name').equals(exName.trim()).first();
    const id = existing?.id ?? (await db.exercises.add({ name: exName.trim(), muscleGroup: 'Other' }));
    await addExercise(id);
  }

  async function removeRow(row) {
    await db.templateExercises.delete(row.id);
    const remaining = await db.templateExercises.where('templateId').equals(templateId).sortBy('order');
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
    <div className="p-4 space-y-4 pb-32">
      <header className="pt-2 flex items-center gap-2">
        <button onClick={onDone} className="text-slate-500 p-2 -ml-2">←</button>
        <h1 className="text-xl font-bold tracking-tight flex-1">Edit workout</h1>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <label className="text-xs uppercase tracking-wider text-slate-500">Name</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <header className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-xs uppercase tracking-wider text-slate-500">Exercises</h2>
          <button onClick={() => setPicker(true)} className="text-sm font-medium text-sky-600 dark:text-sky-400">+ Add</button>
        </header>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-4 py-3">
                <span className="flex-1 truncate">{r.exercise.name}</span>
                <button onClick={() => move(r, -1)} className="p-2 text-slate-500">↑</button>
                <button onClick={() => move(r, +1)} className="p-2 text-slate-500">↓</button>
                <button onClick={() => removeRow(r)} className="p-2 text-slate-400 active:text-rose-500">✕</button>
              </li>
            ))}
          {rows.length === 0 && <li className="px-4 py-6 text-center text-slate-500">No exercises yet.</li>}
        </ul>
      </div>

      {picker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setPicker(false)}>
          <div
            className="w-full max-w-screen-sm mx-auto bg-white dark:bg-slate-900 rounded-t-3xl p-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Add exercise</h2>
              <button onClick={newExercise} className="text-sm font-medium text-sky-600 dark:text-sky-400">+ New</button>
            </div>
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
                  <button
                    onClick={() => {
                      addExercise(e.id);
                      setPicker(false);
                      setQ('');
                    }}
                    className="w-full text-left py-3 active:opacity-60"
                  >
                    {e.name}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="py-6 text-center text-slate-500">No matches</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
