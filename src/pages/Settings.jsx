import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import WorkoutTemplateEditor from '../components/WorkoutTemplateEditor.jsx';
import ImportFromBackend from '../components/ImportFromBackend.jsx';

export default function Settings() {
  const templates = useLiveQuery(() => db.workoutTemplates.orderBy('order').toArray(), [], []);
  const [editing, setEditing] = useState(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('gym-theme', next ? 'dark' : 'light');
  }

  async function addTemplate() {
    const name = prompt('Workout name?');
    if (!name?.trim()) return;
    const order = templates.length;
    const id = await db.workoutTemplates.add({ name: name.trim(), order });
    setEditing(id);
  }

  async function deleteTemplate(id) {
    if (!confirm('Delete this workout template? Logged history is kept.')) return;
    await db.transaction('rw', db.workoutTemplates, db.templateExercises, async () => {
      await db.templateExercises.where('templateId').equals(id).delete();
      await db.workoutTemplates.delete(id);
    });
  }

  async function exportAll() {
    const [exercises, workouts, sets, workoutTemplates, templateExercises] = await Promise.all([
      db.exercises.toArray(),
      db.workouts.toArray(),
      db.sets.toArray(),
      db.workoutTemplates.toArray(),
      db.templateExercises.toArray()
    ]);
    const payload = { version: 1, exportedAt: new Date().toISOString(), exercises, workouts, sets, workoutTemplates, templateExercises };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!confirm('Import will REPLACE all local data. Continue?')) return;
    await db.transaction(
      'rw',
      [db.exercises, db.workouts, db.sets, db.workoutTemplates, db.templateExercises],
      async () => {
        await Promise.all([
          db.exercises.clear(),
          db.workouts.clear(),
          db.sets.clear(),
          db.workoutTemplates.clear(),
          db.templateExercises.clear()
        ]);
        if (data.exercises) await db.exercises.bulkAdd(data.exercises);
        if (data.workouts) await db.workouts.bulkAdd(data.workouts);
        if (data.sets) await db.sets.bulkAdd(data.sets);
        if (data.workoutTemplates) await db.workoutTemplates.bulkAdd(data.workoutTemplates);
        if (data.templateExercises) await db.templateExercises.bulkAdd(data.templateExercises);
      }
    );
    alert('Import complete.');
  }

  if (editing !== null) {
    return <WorkoutTemplateEditor templateId={editing} onDone={() => setEditing(null)} />;
  }

  return (
    <div className="p-4 space-y-6">
      <header className="pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </header>

      <Card title="Appearance">
        <Row label="Dark mode">
          <Toggle checked={dark} onChange={toggleDark} />
        </Row>
      </Card>

      <Card title="Workouts" action={<button onClick={addTemplate} className="text-sm font-medium text-sky-600 dark:text-sky-400">+ New</button>}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <button onClick={() => setEditing(t.id)} className="flex-1 text-left active:opacity-60">
                {t.name}
              </button>
              <button onClick={() => deleteTemplate(t.id)} className="p-2 text-slate-400 active:text-rose-500">✕</button>
            </li>
          ))}
          {templates.length === 0 && <li className="py-3 text-slate-500">No workouts.</li>}
        </ul>
      </Card>

      <Card title="Data">
        <div className="space-y-3">
          <button onClick={exportAll} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 py-3 font-medium active:opacity-60">
            Export JSON
          </button>
          <label className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 py-3 font-medium text-center cursor-pointer active:opacity-60">
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
            />
          </label>
          <ImportFromBackend />
        </div>
      </Card>
    </div>
  );
}

function Card({ title, action, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      <header className="flex items-center justify-between px-4 pt-3 pb-1">
        <h2 className="text-xs uppercase tracking-wider text-slate-500">{title}</h2>
        {action}
      </header>
      <div className="px-4 pb-3">{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        checked ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
