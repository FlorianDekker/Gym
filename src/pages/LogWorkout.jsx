import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  const [focused, setFocused] = useState(null); // `${idx}:${sIdx}`
  const [allExercises, setAllExercises] = useState([]);
  const restRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tId = Number(templateId);
      const tpl = await db.workoutTemplates.get(tId);
      if (!tpl || cancelled) return;
      const teRows = await db.templateExercises.where('templateId').equals(tId).sortBy('order');
      const exs = await Promise.all(teRows.map((te) => db.exercises.get(te.exerciseId)));
      const built = await Promise.all(
        exs.filter(Boolean).map(async (ex, i) => ({
          uid: `e-${ex.id}-${i}`,
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

  const doneSetCount = useMemo(
    () => items.reduce((s, it) => s + it.sets.filter((x) => x.done).length, 0),
    [items]
  );
  const filledSetCount = useMemo(
    () => items.reduce((s, it) => s + it.sets.filter((x) => Number(x.reps) > 0).length, 0),
    [items]
  );
  const totalVolume = useMemo(
    () => items.reduce((sum, it) => sum + volume(it.sets.filter((s) => s.done || Number(s.reps) > 0)), 0),
    [items]
  );

  function patchSet(idx, sIdx, patch) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, sets: it.sets.map((s, j) => (j === sIdx ? { ...s, ...patch } : s)) }
          : it
      )
    );
  }

  function toggleDone(idx, sIdx) {
    const current = items[idx].sets[sIdx];
    const nextDone = !current.done;
    patchSet(idx, sIdx, { done: nextDone });
    if (nextDone) {
      restRef.current?.start();
    }
  }

  function addSet(idx) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const last = it.sets[it.sets.length - 1];
        const base = last
          ? { reps: last.reps, weight: last.weight, done: false }
          : newSet();
        return { ...it, sets: [...it.sets, base] };
      })
    );
  }

  function removeSet(idx, sIdx) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, sets: it.sets.filter((_, j) => j !== sIdx) } : it))
    );
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
          ? {
              ...it,
              uid: `e-${ex.id}-${i}-${Date.now()}`,
              exerciseId: ex.id,
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              bodyweight: !!ex.bodyweight,
              sets
            }
          : it
      )
    );
    setShowSwap(null);
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((it) => it.uid === active.id);
      const newIndex = prev.findIndex((it) => it.uid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
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
              {doneSetCount}/{filledSetCount || items.reduce((a, b) => a + b.sets.length, 0)} sets · {Math.round(totalVolume)} kg·rep
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((it) => it.uid)} strategy={verticalListSortingStrategy}>
            {items.map((it, idx) => (
              <SortableExercise
                key={it.uid}
                id={it.uid}
                item={it}
                index={idx}
                focused={focused}
                onFocusRow={(sIdx) => setFocused(`${idx}:${sIdx}`)}
                onBlurRow={() => setFocused(null)}
                onPatchSet={(sIdx, patch) => patchSet(idx, sIdx, patch)}
                onToggleDone={(sIdx) => toggleDone(idx, sIdx)}
                onAddSet={() => addSet(idx)}
                onRemoveSet={(sIdx) => removeSet(idx, sIdx)}
                onSwap={() => setShowSwap(idx)}
                onAdjustWeight={(sIdx, delta) => adjustWeight(idx, sIdx, delta)}
                onShowPlates={(weight) => setPlateFor(weight)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (how it felt, anything to remember)"
          rows={2}
          className="w-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] rounded-2xl px-4 py-3 outline-none focus:border-primary text-sm"
        />
      </div>

      <RestTimer ref={restRef} />

      <div className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0b0c0e] dark:via-[#0b0c0e]/95 pt-4 pb-5 px-5">
        <div className="max-w-sm mx-auto">
          <button
            onClick={save}
            disabled={saving || filledSetCount === 0}
            className="w-full rounded-2xl bg-primary text-white font-semibold py-4 text-base shadow-lg shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          >
            {saving ? 'Saving…' : `Save ${filledSetCount} set${filledSetCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <BottomSheet open={showSwap !== null} onClose={() => setShowSwap(null)} title="Swap exercise">
        <ExercisePicker exercises={allExercises} onPick={(id) => swapExercise(showSwap, id)} />
      </BottomSheet>

      <PlateSheet open={plateFor !== null} onClose={() => setPlateFor(null)} weight={plateFor} />

      <BottomSheet open={showSummary} onClose={() => navigate('/history', { replace: true })} title="Workout saved">
        <div className="space-y-4 py-2">
          <div className="rounded-2xl bg-success-light p-4">
            <div className="flex items-center gap-2 mb-1 text-success">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="font-semibold">{filledSetCount} sets · {Math.round(totalVolume)} kg·rep</span>
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

function SortableExercise({ id, item, index, focused, onFocusRow, onBlurRow, onPatchSet, onToggleDone, onAddSet, onRemoveSet, onSwap, onAdjustWeight, onShowPlates }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined
  };
  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] ${
        isDragging ? 'shadow-2xl ring-2 ring-primary/40' : ''
      }`}
    >
      <header className="flex items-center gap-2 px-3 py-3 border-b border-line dark:border-[#1f2227]">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="p-2 -ml-1 text-muted-light touch-none cursor-grab active:cursor-grabbing"
        >
          <GripIcon />
        </button>
        <Link to={`/exercise/${item.exerciseId}`} className="flex-1 font-semibold truncate">
          {item.name}
        </Link>
        {item.bodyweight && (
          <span className="text-[10px] uppercase tracking-wide font-bold text-muted bg-surface dark:bg-[#16181c] rounded-full px-2 py-0.5">
            BW
          </span>
        )}
        <button
          onClick={onSwap}
          type="button"
          aria-label="Replace exercise"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-muted bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227]"
        >
          <SwapIcon />
          Replace
        </button>
      </header>
      <ul className="divide-y divide-line dark:divide-[#1f2227]">
        {item.sets.map((s, sIdx) => {
          const isFocused = focused === `${index}:${sIdx}`;
          return (
            <SetRow
              key={sIdx}
              setIndex={sIdx}
              data={s}
              bodyweight={item.bodyweight}
              focused={isFocused}
              onFocus={() => onFocusRow(sIdx)}
              onBlur={onBlurRow}
              onPatch={(p) => onPatchSet(sIdx, p)}
              onToggleDone={() => onToggleDone(sIdx)}
              onRemove={() => onRemoveSet(sIdx)}
              onAdjustWeight={(d) => onAdjustWeight(sIdx, d)}
              onShowPlates={() => s.weight && onShowPlates(Number(s.weight))}
            />
          );
        })}
      </ul>
      <button
        onClick={onAddSet}
        className="w-full py-3.5 text-sm font-semibold text-primary border-t border-dashed border-line dark:border-[#1f2227]"
      >
        + Add set
      </button>
    </section>
  );
}

function SetRow({ setIndex, data, bodyweight, focused, onFocus, onBlur, onPatch, onToggleDone, onRemove, onAdjustWeight, onShowPlates }) {
  return (
    <li
      className={`transition-colors ${data.done ? 'bg-success-light/60 dark:bg-success/10' : ''}`}
      onPointerDown={onFocus}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className={`w-6 text-center text-sm font-bold tabular-nums ${
            data.done ? 'text-success' : 'text-muted'
          }`}
        >
          {setIndex + 1}
        </span>
        <NumberInput
          value={data.reps}
          onChange={(v) => onPatch({ reps: v })}
          onFocus={onFocus}
          onBlur={onBlur}
          inputMode="numeric"
          placeholder="reps"
          done={data.done}
        />
        {!bodyweight && (
          <>
            <span className="text-muted-light text-sm">×</span>
            <NumberInput
              value={data.weight}
              onChange={(v) => onPatch({ weight: v })}
              onFocus={onFocus}
              onBlur={onBlur}
              inputMode="decimal"
              placeholder="kg"
              done={data.done}
            />
          </>
        )}
        <CheckButton checked={data.done} onClick={onToggleDone} />
      </div>
      {focused && (
        <div className="flex items-center gap-1.5 px-3 pb-2.5 -mt-0.5 animate-fade-in">
          {!bodyweight && (
            <>
              <QuickPill onClick={() => onAdjustWeight(-2.5)}>−2.5</QuickPill>
              <QuickPill onClick={() => onAdjustWeight(-1.25)}>−1.25</QuickPill>
              <QuickPill onClick={() => onAdjustWeight(1.25)}>+1.25</QuickPill>
              <QuickPill onClick={() => onAdjustWeight(2.5)}>+2.5</QuickPill>
              {data.weight && (
                <button
                  onClick={onShowPlates}
                  className="ml-auto text-[11px] font-semibold text-primary px-1.5"
                >
                  Plates
                </button>
              )}
            </>
          )}
          <button
            onClick={onRemove}
            className={`text-[11px] font-semibold text-muted-light ${bodyweight ? 'ml-auto' : ''}`}
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

function NumberInput({ value, onChange, onFocus, onBlur, inputMode, placeholder, done }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      inputMode={inputMode}
      placeholder={placeholder}
      className={`flex-1 min-w-0 text-center text-lg font-semibold tabular-nums rounded-xl py-2 px-2 border outline-none transition ${
        done
          ? 'bg-success-light/0 border-transparent text-success'
          : 'bg-surface dark:bg-[#16181c] border-transparent focus:border-primary'
      }`}
    />
  );
}

function CheckButton({ checked, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={checked ? 'Mark not done' : 'Mark set done'}
      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition ${
        checked
          ? 'bg-success text-white shadow-md shadow-success/30'
          : 'bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] text-muted-light'
      }`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  );
}

function QuickPill({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] font-semibold text-muted bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] rounded-full px-2 py-1"
    >
      {children}
    </button>
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

function GripIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13a5 5 0 0 1 5 5" />
      <path d="m17 20 4-4-4-4" />
      <path d="M21 16H8a5 5 0 0 1-5-5" />
    </svg>
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
