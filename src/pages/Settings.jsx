import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import WorkoutTemplateEditor from '../components/WorkoutTemplateEditor.jsx';
import { getDefaultRest } from '../components/RestTimer.jsx';
import { loadProfile, saveProfile } from '../lib/profile.js';

export default function Settings() {
  const templates = useLiveQuery(() => db.workoutTemplates.orderBy('order').toArray(), [], []);
  const totals = useLiveQuery(
    async () => ({
      workouts: await db.workouts.count(),
      sets: await db.sets.count(),
      exercises: await db.exercises.count()
    }),
    [],
    { workouts: 0, sets: 0, exercises: 0 }
  );
  const [editing, setEditing] = useState(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [rest, setRest] = useState(getDefaultRest());
  const [profile, setProfile] = useState(() => loadProfile() || { sex: '', bodyweight: '', age: '' });

  function updateProfile(patch) {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile({
      sex: next.sex || null,
      bodyweight: next.bodyweight === '' ? null : Number(next.bodyweight),
      age: next.age === '' ? null : Number(next.age)
    });
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('gym-theme', next ? 'dark' : 'light');
  }

  function setRestDuration(s) {
    setRest(s);
    localStorage.setItem('gym-rest-default', String(s));
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
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      exercises,
      workouts,
      sets,
      workoutTemplates,
      templateExercises
    };
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

  async function wipeData() {
    if (!confirm('Erase ALL local data? This cannot be undone.')) return;
    if (!confirm('Really erase everything?')) return;
    await db.delete();
    location.reload();
  }

  if (editing !== null) {
    return <WorkoutTemplateEditor templateId={editing} onDone={() => setEditing(null)} />;
  }

  return (
    <div className="px-5 pt-12 pb-24 flex-1 space-y-5">
      <header>
        <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
      </header>

      <Card title="Appearance">
        <Row label="Dark mode">
          <Toggle checked={dark} onChange={toggleDark} />
        </Row>
      </Card>

      <Card title="Profile">
        <p className="text-xs text-muted mb-3">
          Used to compare your 1RM to strength standards.
        </p>
        <Row label="Sex">
          <div className="flex rounded-xl bg-surface dark:bg-[#16181c] p-1 text-sm font-semibold">
            {['male', 'female'].map((s) => (
              <button
                key={s}
                onClick={() => updateProfile({ sex: s })}
                className={`px-3 py-1.5 rounded-lg transition ${
                  profile.sex === s
                    ? 'bg-white dark:bg-[#101115] text-ink dark:text-white shadow-sm'
                    : 'text-muted'
                }`}
              >
                {s === 'male' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Bodyweight">
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              value={profile.bodyweight}
              onChange={(e) => updateProfile({ bodyweight: e.target.value })}
              placeholder="kg"
              className="w-20 text-right text-base font-semibold tabular-nums bg-surface dark:bg-[#16181c] rounded-lg px-2 py-1.5 outline-none placeholder:text-muted-light"
            />
            <span className="text-[11px] text-muted">kg</span>
          </div>
        </Row>
        <Row label="Age">
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={profile.age}
              onChange={(e) => updateProfile({ age: e.target.value })}
              placeholder="years"
              className="w-20 text-right text-base font-semibold tabular-nums bg-surface dark:bg-[#16181c] rounded-lg px-2 py-1.5 outline-none placeholder:text-muted-light"
            />
            <span className="text-[11px] text-muted">yr</span>
          </div>
        </Row>
      </Card>

      <Card title="Rest timer">
        <Row label="Default duration">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRestDuration(Math.max(15, rest - 15))}
              className="w-8 h-8 rounded-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] font-bold"
            >
              −
            </button>
            <span className="tabular-nums font-semibold w-12 text-center">{rest}s</span>
            <button
              onClick={() => setRestDuration(rest + 15)}
              className="w-8 h-8 rounded-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] font-bold"
            >
              +
            </button>
          </div>
        </Row>
      </Card>

      <Card
        title="Workouts"
        action={
          <button onClick={addTemplate} className="text-sm font-semibold text-primary">
            + New
          </button>
        }
      >
        <ul className="divide-y divide-line dark:divide-[#1f2227]">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <button onClick={() => setEditing(t.id)} className="flex-1 text-left">
                {t.name}
              </button>
              <button onClick={() => deleteTemplate(t.id)} className="p-2 text-muted-light">
                ✕
              </button>
            </li>
          ))}
          {templates.length === 0 && <li className="py-3 text-muted">No workouts.</li>}
        </ul>
      </Card>

      <Card title="Data">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat value={totals.workouts} label="workouts" />
          <Stat value={totals.sets} label="sets" />
          <Stat value={totals.exercises} label="exercises" />
        </div>
        <div className="space-y-2">
          <button
            onClick={exportAll}
            className="w-full rounded-xl border border-line dark:border-[#1f2227] py-3 font-medium text-sm"
          >
            Export JSON
          </button>
          <label className="block w-full rounded-xl border border-line dark:border-[#1f2227] py-3 font-medium text-center text-sm cursor-pointer">
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
            />
          </label>
          <button
            onClick={wipeData}
            className="w-full rounded-xl border border-line dark:border-[#1f2227] py-3 font-medium text-sm text-red-600"
          >
            Erase all data
          </button>
        </div>
      </Card>

      <p className="text-center text-[11px] text-muted pt-2 pb-4">Gym · local-first · v0.2</p>
    </div>
  );
}

function Card({ title, action, children }) {
  return (
    <section className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227]">
      <header className="flex items-center justify-between px-4 pt-3 pb-1">
        <h2 className="text-[10px] uppercase tracking-wider text-muted font-bold">{title}</h2>
        {action}
      </header>
      <div className="px-4 pb-3">{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
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
        checked ? 'bg-primary' : 'bg-muted-light dark:bg-[#2a2d33]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-xl bg-surface dark:bg-[#16181c] p-3 text-center">
      <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted font-bold mt-0.5">{label}</p>
    </div>
  );
}
