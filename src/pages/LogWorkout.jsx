import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../db/db.js';
import { todayISO, volume } from '../lib/volume.js';
import { detectPRs } from '../lib/prs.js';
import BottomSheet from '../components/BottomSheet.jsx';
import PlateSheet from '../components/PlateSheet.jsx';
import RestTimer from '../components/RestTimer.jsx';
import PRBadge from '../components/PRBadge.jsx';

const newSet = () => ({ reps: '', weight: '', done: false });

export default function LogWorkout() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSwap, setShowSwap] = useState(null);
  const [plateFor, setPlateFor] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [prs, setPrs] = useState([]);
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
          bodyweight: !!ex.bodyweight,
          sets: await prefillSets(ex.id, !!ex.bodyweight)
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

  const totalSets = useMemo(() => items.reduce((s, it) => s + it.sets.filter((x) => x.reps).length, 0), [items]);
  const totalVolume = useMemo(
    () => items.reduce((sum, it) => sum + volume(it.sets), 0),
    [items]
  );

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
        const base = last ? { reps: last.reps, weight: last.weight, done: false } : newSet();
        return { ...it, sets: [...it.sets, base] };
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

  function adjustWeight(idx, sIdx, delta) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        return {
          ...it,
          sets: it.sets.map((s, j) => {
            if (j !== sIdx) return s;
            const current = Number(s.weight) || 0;
            const next = Math.max(0, Math.round((current + delta) * 4) / 4);
            return { ...s, weight: String(next) };
          })
        };
      })
    );
  }

  async function swapExercise(idx, newExerciseId) {
    const ex = await db.exercises.get(newExerciseId);
    if (!ex) return;
    const sets = await prefillSets(ex.id, !!ex.bodyweight);
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, bodyweight: !!ex.bodyweight, sets }
          : it
      )
    );
    setShowSwap(null);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      let workoutId;
      await db.transaction('rw', db.workouts, db.sets, async () => {
        workoutId = await db.workouts.add({
          date,
          templateId: template.id,
          name: template.name,
          notes: notes.trim()
        });
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          for (const s of it.sets) {
            const reps = Number(s.reps);
            const weight = it.bodyweight ? 0 : Number(s.weight);
            if (!reps && !it.bodyweight) continue;
            if (!reps) continue;
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
      const newPrs = await detectPRs(workoutId);
      if (newPrs.length > 0) {
        setPrs(newPrs);
        setShowSummary(true);
      } else {
        navigate('/history', { replace: true });
      }
    } finally {
      setSaving(false);
    }
  }

  if (!template) {
    return <div className="p-5 text-muted">Loading…</div>;
  }

  return (
    <div className="pb-40 animate-slide-up">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0b0c0e]/95 backdrop-blur border-b border-line dark:border-[#1a1c20]">
        <div className="flex items-center gap-3 px-5 py-3">
          <Link to="/" className="text-muted -ml-2 p-2" aria-label="Back">
            <ChevronLeft />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{template.name}</h1>
            <p className="text-xs text-muted tabular-nums">
              {totalSets} sets · {Math.round(totalVolume)} kg·rep
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] rounded-lg px-2 py-1"
          />
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {items.map((it, idx) => (
          <ExerciseSection
            key={`${it.exerciseId}-${idx}`}
            item={it}
            index={idx}
            onUpdateSet={updateSet}
            onAddSet={() => addSet(idx)}
            onRemoveSet={(sIdx) => removeSet(idx, sIdx)}
            onMove={(dir) => move(idx, dir)}
            onSwap={() => setShowSwap(idx)}
            onAdjustWeight={(sIdx, delta) => adjustWeight(idx, sIdx, delta)}
            onShowPlates={(weight) => setPlateFor(weight)}
          />
        ))}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (how it felt, anything to remember)"
          rows={2}
          className="w-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] rounded-2xl px-4 py-3 outline-none focus:border-primary text-sm"
        />
      </div>

      <RestTimer />

      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0b0c0e] dark:via-[#0b0c0e]/95 pt-4 pb-5 px-5"
      >
        <div className="max-w-sm mx-auto">
          <button
            onClick={save}
            disabled={saving || totalSets === 0}
            className="w-full rounded-2xl bg-primary text-white font-semibold py-4 text-base shadow-lg shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          >
            {saving ? 'Saving…' : `Save ${totalSets} set${totalSets === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <BottomSheet open={showSwap !== null} onClose={() => setShowSwap(null)} title="Swap exercise">
        <ExercisePicker
          exercises={allExercises}
          onPick={(id) => swapExercise(showSwap, id)}
        />
      </BottomSheet>

      <PlateSheet open={plateFor !== null} onClose={() => setPlateFor(null)} weight={plateFor} />

      <BottomSheet open={showSummary} onClose={() => navigate('/history', { replace: true })} title="Workout saved">
        <div className="space-y-4 py-2">
          <div className="rounded-2xl bg-success-light p-4">
            <div className="flex items-center gap-2 mb-1 text-success">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="font-semibold">{totalSets} sets · {Math.round(totalVolume)} kg·rep</span>
            </div>
          </div>
          {prs.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <PRBadge label="New PRs" /> {prs.length} personal record{prs.length === 1 ? '' : 's'}
              </p>
              <ul className="space-y-2">
                {prs.map((pr, i) => (
                  <li key={i} className="rounded-xl border border-pr/30 bg-pr-subtle px-4 py-3">
                    <p className="font-medium">{pr.name}</p>
                    <p className="text-xs text-muted">
                      {pr.type === 'weight' ? `Max weight ${pr.prev} → ${pr.value} kg` : `Max reps ${pr.prev} → ${pr.value}`}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => navigate('/history', { replace: true })}
            className="w-full rounded-2xl bg-ink dark:bg-white text-white dark:text-ink font-semibold py-3"
          >
            Done
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

function ExerciseSection({ item, index, onUpdateSet, onAddSet, onRemoveSet, onMove, onSwap, onAdjustWeight, onShowPlates }) {
  return (
    <section className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227]">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-line dark:border-[#1f2227]">
        <Link to={`/exercise/${item.exerciseId}`} className="flex-1 font-semibold truncate">
          {item.name}
        </Link>
        {item.bodyweight && (
          <span className="text-[10px] uppercase tracking-wide font-bold text-muted bg-surface dark:bg-[#16181c] rounded-full px-2 py-0.5">
            BW
          </span>
        )}
        <button onClick={() => onMove(-1)} aria-label="Move up" className="p-2 text-muted">↑</button>
        <button onClick={() => onMove(+1)} aria-label="Move down" className="p-2 text-muted">↓</button>
        <button onClick={onSwap} aria-label="Swap exercise" className="p-2 text-muted">⇄</button>
      </header>
      <ul className="divide-y divide-line dark:divide-[#1f2227]">
        {item.sets.map((s, sIdx) => (
          <li key={sIdx} className="px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-6 text-sm font-semibold text-muted tabular-nums">{sIdx + 1}</span>
              <NumberInput
                value={s.reps}
                onChange={(v) => onUpdateSet(index, sIdx, { reps: v })}
                inputMode="numeric"
                placeholder="reps"
              />
              {!item.bodyweight && (
                <>
                  <span className="text-muted">×</span>
                  <NumberInput
                    value={s.weight}
                    onChange={(v) => onUpdateSet(index, sIdx, { weight: v })}
                    inputMode="decimal"
                    placeholder="kg"
                    onLongPress={() => s.weight && onShowPlates(Number(s.weight))}
                  />
                </>
              )}
              <button
                onClick={() => onRemoveSet(sIdx)}
                aria-label="Remove set"
                className="p-2 text-muted-light"
              >
                ✕
              </button>
            </div>
            {!item.bodyweight && (
              <div className="flex gap-2 mt-1.5 pl-8">
                <QuickButton onClick={() => onAdjustWeight(sIdx, -2.5)}>−2.5</QuickButton>
                <QuickButton onClick={() => onAdjustWeight(sIdx, -1.25)}>−1.25</QuickButton>
                <QuickButton onClick={() => onAdjustWeight(sIdx, 1.25)}>+1.25</QuickButton>
                <QuickButton onClick={() => onAdjustWeight(sIdx, 2.5)}>+2.5</QuickButton>
                {s.weight && (
                  <button
                    onClick={() => onShowPlates(Number(s.weight))}
                    className="ml-auto text-[11px] font-semibold text-primary px-2"
                  >
                    Plates
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <button
        onClick={onAddSet}
        className="w-full py-3 text-sm font-semibold text-primary"
      >
        + Add set
      </button>
    </section>
  );
}

function QuickButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] font-semibold text-muted bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] rounded-full px-2 py-1"
    >
      {children}
    </button>
  );
}

function NumberInput({ value, onChange, inputMode, placeholder, onLongPress }) {
  let timer;
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onTouchStart={() => {
        if (onLongPress) timer = setTimeout(onLongPress, 500);
      }}
      onTouchEnd={() => clearTimeout(timer)}
      onTouchMove={() => clearTimeout(timer)}
      inputMode={inputMode}
      placeholder={placeholder}
      className="flex-1 min-w-0 text-center text-lg font-semibold tabular-nums bg-surface dark:bg-[#16181c] rounded-xl py-2 px-2 border border-transparent focus:border-primary outline-none"
    />
  );
}

function ExercisePicker({ exercises, onPick }) {
  const [q, setQ] = useState('');
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex flex-col h-full">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exercises"
        className="w-full bg-surface dark:bg-[#16181c] rounded-xl px-3 py-2.5 mb-3 outline-none"
      />
      <ul className="overflow-y-auto divide-y divide-line dark:divide-[#1f2227]">
        {filtered.map((e) => (
          <li key={e.id}>
            <button onClick={() => onPick(e.id)} className="w-full text-left py-3">
              {e.name}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="py-6 text-center text-muted">No matches</li>}
      </ul>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

async function prefillSets(exerciseId, bodyweight) {
  const recent = await db.sets.where('exerciseId').equals(exerciseId).reverse().sortBy('id');
  const lastWorkoutId = recent[0]?.workoutId;
  const last = recent.filter((s) => s.workoutId === lastWorkoutId).slice(0, 4);
  if (last.length === 0) {
    return [newSet(), newSet(), newSet()];
  }
  return last
    .sort((a, b) => a.id - b.id)
    .map((s) => ({ reps: String(s.reps), weight: bodyweight ? '' : String(s.weight), done: false }));
}
