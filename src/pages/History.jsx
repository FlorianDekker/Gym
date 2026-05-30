import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/db.js';
import { formatDate, formatMonth } from '../lib/volume.js';
import { effectiveWeight } from '../lib/strengthLevels.js';
import { loadProfile } from '../lib/profile.js';
import BottomSheet from '../components/BottomSheet.jsx';

function workoutVolume(sets, exMap, bodyweight) {
  let total = 0;
  for (const s of sets) {
    const name = exMap.get(s.exerciseId)?.name;
    const eff = effectiveWeight(name, s.weight, bodyweight);
    if (eff == null) continue;
    total += (s.reps || 0) * eff;
  }
  return total;
}

export default function History() {
  const data = useLiveQuery(
    async () => {
      const profile = loadProfile();
      const profileBw = Number(profile?.bodyweight) || null;
      const exercises = await db.exercises.toArray();
      const exMap = new Map(exercises.map((e) => [e.id, e]));
      const rows = await db.workouts.orderBy('date').reverse().toArray();
      const enriched = await Promise.all(
        rows.map(async (w) => {
          const sets = await db.sets.where('workoutId').equals(w.id).toArray();
          const bw = Number(w.bodyWeight) || profileBw;
          return { ...w, setCount: sets.length, volume: workoutVolume(sets, exMap, bw), sets };
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingFor, setAddingFor] = useState(null); // { id, name, bodyweight }

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

  const allExercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], []);

  async function removeExercise(exerciseId, name) {
    if (!confirm(`Remove all sets of ${name} from this workout?`)) return;
    await db.sets.where('workoutId').equals(workoutId).and((s) => s.exerciseId === exerciseId).delete();
  }

  return (
    <div
      className="px-4 pb-4 border-t border-line dark:border-[#1f2227] animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="divide-y divide-line dark:divide-[#1f2227]">
        {groups.map((g) => (
          <div key={g.exerciseId} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <Link to={`/exercise/${g.exerciseId}`} className="font-medium text-sm flex-1 min-w-0 truncate">
                {g.name} →
              </Link>
              <button
                onClick={() => removeExercise(g.exerciseId, g.name)}
                type="button"
                aria-label={`Remove ${g.name}`}
                className="text-[11px] font-semibold text-red-500 px-2 py-0.5 active:opacity-60"
              >
                Remove
              </button>
            </div>
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

      <button
        onClick={() => setPickerOpen(true)}
        type="button"
        className="mt-3 w-full rounded-xl border border-dashed border-line dark:border-[#1f2227] py-2.5 text-sm font-semibold text-primary"
      >
        + Add Exercise
      </button>

      <BottomSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add exercise to workout"
      >
        <ExercisePicker
          exercises={allExercises}
          onPick={(ex) => {
            setPickerOpen(false);
            setAddingFor(ex);
          }}
          onCreate={async (name) => {
            const id = await db.exercises.add({ name, muscleGroup: 'other' });
            return { id, name, bodyweight: false };
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={addingFor !== null}
        onClose={() => setAddingFor(null)}
        title={addingFor ? `Log ${addingFor.name}` : ''}
      >
        {addingFor && (
          <AddSetsForm
            exercise={addingFor}
            workoutId={workoutId}
            existingOrderMax={groups.length}
            onSaved={() => setAddingFor(null)}
            onCancel={() => setAddingFor(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function ExercisePicker({ exercises, onPick, onCreate }) {
  const [q, setQ] = useState('');
  const trimmed = q.trim();
  const filtered = (exercises || []).filter((e) => e.name.toLowerCase().includes(trimmed.toLowerCase()));
  const exactMatch = filtered.some((e) => e.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !exactMatch && typeof onCreate === 'function';

  async function handleCreate() {
    const ex = await onCreate(trimmed);
    if (ex) onPick({ id: ex.id, name: ex.name, bodyweight: !!ex.bodyweight });
  }

  return (
    <div className="flex flex-col h-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exercises"
        className="w-full bg-surface dark:bg-[#16181c] rounded-xl px-3 py-2.5 mb-3 outline-none"
      />
      {canCreate && (
        <button
          onClick={handleCreate}
          type="button"
          className="w-full text-left py-3 border-b border-line dark:border-[#1f2227] font-semibold text-primary"
        >
          + Create "{trimmed}"
        </button>
      )}
      <ul className="overflow-y-auto divide-y divide-line dark:divide-[#1f2227]">
        {filtered.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onPick({ id: e.id, name: e.name, bodyweight: !!e.bodyweight })}
              type="button"
              className="w-full text-left py-3"
            >
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

function AddSetsForm({ exercise, workoutId, existingOrderMax, onSaved, onCancel }) {
  const [rows, setRows] = useState([{ reps: '', weight: '' }]);
  const [saving, setSaving] = useState(false);

  function update(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { reps: '', weight: '' }]);
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (saving) return;
    const order = (existingOrderMax || 0) + 1;
    const valid = rows
      .map((r) => ({ reps: Number(r.reps), weight: exercise.bodyweight ? 0 : Number(r.weight) }))
      .filter((r) => Number.isFinite(r.reps) && r.reps > 0);
    if (valid.length === 0) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await db.transaction('rw', db.sets, async () => {
        for (const v of valid) {
          await db.sets.add({
            workoutId,
            exerciseId: exercise.id,
            orderInWorkout: order,
            reps: v.reps,
            weight: Number.isFinite(v.weight) ? v.weight : 0
          });
        }
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="grid grid-cols-[24px_1fr_1fr_32px] gap-2 text-[10px] uppercase tracking-wider text-muted font-bold">
        <span>Set</span>
        {!exercise.bodyweight && <span className="text-center">Kg</span>}
        <span className={`text-center ${exercise.bodyweight ? 'col-span-2' : ''}`}>Reps</span>
        <span></span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[24px_1fr_1fr_32px] gap-2 items-center">
          <span className="text-center text-sm font-bold tabular-nums text-muted">{i + 1}</span>
          {!exercise.bodyweight && (
            <input
              value={r.weight}
              onChange={(e) => update(i, { weight: e.target.value })}
              inputMode="decimal"
              placeholder="kg"
              className="text-center text-base font-semibold tabular-nums bg-surface dark:bg-[#16181c] rounded-lg py-2 px-1 border border-transparent focus:border-primary outline-none w-full placeholder:text-muted-light"
            />
          )}
          <input
            value={r.reps}
            onChange={(e) => update(i, { reps: e.target.value })}
            inputMode="numeric"
            placeholder="reps"
            className={`text-center text-base font-semibold tabular-nums bg-surface dark:bg-[#16181c] rounded-lg py-2 px-1 border border-transparent focus:border-primary outline-none w-full placeholder:text-muted-light ${exercise.bodyweight ? 'col-span-2' : ''}`}
          />
          <button
            onClick={() => removeRow(i)}
            type="button"
            aria-label="Remove row"
            className="text-muted-light text-lg"
            disabled={rows.length === 1}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        type="button"
        className="w-full py-2 text-sm font-semibold text-primary"
      >
        + Add set
      </button>
      <button
        onClick={save}
        disabled={saving}
        type="button"
        className="w-full rounded-2xl bg-primary text-white font-semibold py-3 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save sets'}
      </button>
    </div>
  );
}
