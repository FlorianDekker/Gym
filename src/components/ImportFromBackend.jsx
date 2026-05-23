import { useState } from 'react';
import { db } from '../db/db.js';

const DEFAULT_BASE = 'https://gym-backend-m64q.onrender.com';

export default function ImportFromBackend() {
  const [base, setBase] = useState(DEFAULT_BASE);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    setStatus('Fetching…');
    try {
      const already = await db.meta.get('imported-from-backend');
      if (already?.value && !confirm('Already imported once. Run again and add duplicates?')) {
        setBusy(false);
        setStatus('Cancelled.');
        return;
      }

      const res = await fetch(base.replace(/\/$/, '') + '/export_all.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      const exMap = new Map();
      for (const ex of data.exercises ?? []) {
        const existing = await db.exercises.where('name').equals(ex.name).first();
        const localId = existing?.id ?? (await db.exercises.add({ name: ex.name, muscleGroup: ex.muscle_group || 'Other' }));
        exMap.set(ex.id, localId);
      }
      setStatus(`Imported ${exMap.size} exercises…`);

      let workoutCount = 0;
      for (const w of data.workouts ?? []) {
        const localWorkoutId = await db.workouts.add({
          date: normalizeDate(w.date),
          templateId: null,
          name: w.notes || 'Imported'
        });
        for (const s of w.sets ?? []) {
          const exerciseId = exMap.get(s.exercise_id);
          if (!exerciseId) continue;
          await db.sets.add({
            workoutId: localWorkoutId,
            exerciseId,
            orderInWorkout: s.order_in_workout ?? 1,
            reps: Number(s.reps),
            weight: Number(s.weight)
          });
        }
        workoutCount++;
        if (workoutCount % 10 === 0) setStatus(`Imported ${workoutCount}/${data.workouts.length} workouts…`);
      }

      await db.meta.put({ key: 'imported-from-backend', value: true });
      setStatus(`Done. Imported ${workoutCount} workouts.`);
    } catch (e) {
      setStatus('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">One-time import from the old Render backend.</p>
      <input
        value={base}
        onChange={(e) => setBase(e.target.value)}
        placeholder="https://…onrender.com"
        className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
      />
      <button
        onClick={run}
        disabled={busy}
        className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 font-medium active:opacity-80 disabled:opacity-50"
      >
        {busy ? 'Importing…' : 'Import from old backend'}
      </button>
      {status && <p className="text-xs text-slate-500">{status}</p>}
    </div>
  );
}

function normalizeDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const parsed = new Date(d);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return d;
}
