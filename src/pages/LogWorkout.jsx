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
import RestTimer, { getDefaultRest } from '../components/RestTimer.jsx';
import PRBadge from '../components/PRBadge.jsx';

const newSet = () => ({ reps: '', weight: '', previousReps: null, previousWeight: null, done: false });

const SUPERSET_COLORS = [
  { ring: 'border-l-amber-500', tag: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { ring: 'border-l-sky-500', tag: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { ring: 'border-l-violet-500', tag: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { ring: 'border-l-emerald-500', tag: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' }
];

let nextUid = 1;

export default function LogWorkout() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [restSeconds, setRestSeconds] = useState(getDefaultRest());
  const [saving, setSaving] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [replaceFor, setReplaceFor] = useState(null);
  const [supersetFor, setSupersetFor] = useState(null);
  const [plateFor, setPlateFor] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [prs, setPrs] = useState([]);
  const [focused, setFocused] = useState(null);
  const [allExercises, setAllExercises] = useState([]);
  const restRef = useRef(null);
  const startedAtRef = useRef(Date.now());
  const [tick, setTick] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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
          uid: `e${nextUid++}`,
          exerciseId: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          bodyweight: !!ex.bodyweight,
          supersetId: null,
          sets: await prefillSets(ex.id, !!ex.bodyweight)
        }))
      );
      if (cancelled) return;
      setTemplate(tpl);
      setItems(built);
      setRestSeconds(tpl.restSeconds || getDefaultRest());
      setAllExercises(await db.exercises.orderBy('name').toArray());
    })();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const elapsedSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
  const doneSets = useMemo(
    () => items.reduce((s, it) => s + it.sets.filter((x) => x.done).length, 0),
    [items, tick]
  );
  const filledSets = useMemo(
    () => items.reduce((s, it) => s + it.sets.filter((x) => Number(x.reps) > 0).length, 0),
    [items]
  );
  const totalVolume = useMemo(
    () => items.reduce((sum, it) => sum + volume(it.sets.filter((s) => s.done || Number(s.reps) > 0)), 0),
    [items]
  );

  const supersetColorByGroup = useMemo(() => {
    const ids = [...new Set(items.map((i) => i.supersetId).filter(Boolean))];
    const map = new Map();
    ids.forEach((id, i) => map.set(id, SUPERSET_COLORS[i % SUPERSET_COLORS.length]));
    return map;
  }, [items]);

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
    if (nextDone) restRef.current?.start(restSeconds);
  }

  function addSet(idx) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const last = it.sets[it.sets.length - 1];
        const base = last
          ? { reps: last.reps, weight: last.weight, previousReps: null, previousWeight: null, done: false }
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

  async function replaceExercise(idx, newExerciseId) {
    const ex = await db.exercises.get(newExerciseId);
    if (!ex) return;
    const sets = await prefillSets(ex.id, !!ex.bodyweight);
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              uid: `e${nextUid++}`,
              exerciseId: ex.id,
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              bodyweight: !!ex.bodyweight,
              sets
            }
          : it
      )
    );
    setReplaceFor(null);
  }

  async function addExercise(newExerciseId) {
    const ex = await db.exercises.get(newExerciseId);
    if (!ex) return;
    const sets = await prefillSets(ex.id, !!ex.bodyweight);
    setItems((prev) => [
      ...prev,
      {
        uid: `e${nextUid++}`,
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        bodyweight: !!ex.bodyweight,
        supersetId: null,
        sets
      }
    ]);
    setShowAdd(false);
  }

  function removeExercise(idx) {
    if (!confirm(`Remove ${items[idx]?.name} from this workout?`)) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setMenuFor(null);
  }

  function pairSuperset(srcIdx, dstIdx) {
    if (srcIdx === dstIdx) return;
    setItems((prev) => {
      const src = prev[srcIdx];
      const dst = prev[dstIdx];
      const id = src.supersetId || dst.supersetId || `ss-${Date.now()}`;
      return prev.map((it, i) =>
        i === srcIdx || i === dstIdx ? { ...it, supersetId: id } : it
      );
    });
    setSupersetFor(null);
  }

  function leaveSuperset(idx) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, supersetId: null } : it)));
    setMenuFor(null);
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
      const durationSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      let workoutId;
      await db.transaction('rw', db.workouts, db.sets, async () => {
        workoutId = await db.workouts.add({
          date,
          templateId: template.id,
          name: template.name,
          notes: notes.trim(),
          durationSeconds
        });
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          for (const s of it.sets) {
            const reps = Number(s.reps);
            const weight = it.bodyweight ? 0 : Number(s.weight);
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

  function discard() {
    if (!confirm('Discard this workout? Logged data will be lost.')) return;
    navigate('/', { replace: true });
  }

  if (!template) {
    return <div className="p-5 text-muted">Loading…</div>;
  }

  if (reorderMode) {
    return (
      <ReorderView
        items={items}
        sensors={sensors}
        onDragEnd={onDragEnd}
        onDone={() => setReorderMode(false)}
        supersetColorByGroup={supersetColorByGroup}
      />
    );
  }

  return (
    <div className="pb-44 animate-slide-up">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0b0c0e]/95 backdrop-blur border-b border-line dark:border-[#1a1c20]">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Link to="/" className="text-muted p-2 -ml-2" aria-label="Back">
            <ChevronDown />
          </Link>
          <h1 className="flex-1 text-base font-semibold leading-tight truncate">{template.name}</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-muted"
            aria-label="Workout settings"
          >
            <ClockIcon />
          </button>
          <button
            onClick={save}
            disabled={saving || filledSets === 0}
            className="bg-primary text-white text-sm font-semibold rounded-xl px-4 py-1.5 disabled:opacity-40"
          >
            {saving ? '…' : 'Finish'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 px-4 pb-3">
          <Stat label="Duration" value={fmtDuration(elapsedSec)} accent />
          <Stat label="Volume" value={`${Math.round(totalVolume)} kg`} />
          <Stat label="Sets" value={`${doneSets}`} />
        </div>
      </header>

      <div className="px-4 pt-3 space-y-3">
        {items.map((it, idx) => (
          <ExerciseCard
            key={it.uid}
            item={it}
            index={idx}
            supersetColor={it.supersetId ? supersetColorByGroup.get(it.supersetId) : null}
            focused={focused}
            onFocusRow={(sIdx) => setFocused(`${idx}:${sIdx}`)}
            onBlurRow={() => setFocused(null)}
            onPatchSet={(sIdx, p) => patchSet(idx, sIdx, p)}
            onToggleDone={(sIdx) => toggleDone(idx, sIdx)}
            onAddSet={() => addSet(idx)}
            onRemoveSet={(sIdx) => removeSet(idx, sIdx)}
            onAdjustWeight={(sIdx, d) => adjustWeight(idx, sIdx, d)}
            onShowPlates={(w) => setPlateFor(w)}
            onOpenMenu={() => setMenuFor(idx)}
          />
        ))}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Workout notes"
          rows={2}
          className="w-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] rounded-2xl px-4 py-3 outline-none focus:border-primary text-sm"
        />

        <button
          onClick={() => setShowAdd(true)}
          className="w-full rounded-2xl bg-primary text-white font-semibold py-3.5 text-base shadow-lg shadow-primary/30 active:opacity-90"
        >
          + Add Exercise
        </button>

        <button
          onClick={discard}
          className="w-full rounded-2xl border border-line dark:border-[#1f2227] text-red-600 dark:text-red-400 font-medium py-3 text-sm"
        >
          Discard Workout
        </button>
      </div>

      <RestTimer ref={restRef} />

      <div className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0b0c0e] dark:via-[#0b0c0e]/95 pt-4 pb-5 px-4">
        <div className="max-w-sm mx-auto">
          <button
            onClick={save}
            disabled={saving || filledSets === 0}
            className="w-full rounded-2xl bg-ink dark:bg-white text-white dark:text-ink font-semibold py-3.5 text-base disabled:opacity-40"
          >
            {saving ? 'Saving…' : `Finish workout · ${filledSets} set${filledSets === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <ExerciseMenuSheet
        open={menuFor !== null}
        onClose={() => setMenuFor(null)}
        item={menuFor !== null ? items[menuFor] : null}
        inSuperset={menuFor !== null ? !!items[menuFor]?.supersetId : false}
        onReorder={() => {
          setMenuFor(null);
          setReorderMode(true);
        }}
        onReplace={() => {
          const idx = menuFor;
          setMenuFor(null);
          setReplaceFor(idx);
        }}
        onSuperset={() => {
          const idx = menuFor;
          setMenuFor(null);
          if (items[idx]?.supersetId) {
            leaveSuperset(idx);
          } else {
            setSupersetFor(idx);
          }
        }}
        onRemove={() => removeExercise(menuFor)}
      />

      <BottomSheet
        open={replaceFor !== null}
        onClose={() => setReplaceFor(null)}
        title="Replace exercise"
      >
        <ExercisePicker
          exercises={allExercises}
          onPick={(id) => replaceExercise(replaceFor, id)}
        />
      </BottomSheet>

      <BottomSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add exercise"
      >
        <ExercisePicker exercises={allExercises} onPick={(id) => addExercise(id)} />
      </BottomSheet>

      <BottomSheet
        open={supersetFor !== null}
        onClose={() => setSupersetFor(null)}
        title={supersetFor !== null ? `Pair with ${items[supersetFor]?.name}` : 'Pair'}
      >
        <ul className="divide-y divide-line dark:divide-[#1f2227]">
          {items.map((it, i) =>
            i === supersetFor ? null : (
              <li key={it.uid}>
                <button onClick={() => pairSuperset(supersetFor, i)} className="w-full text-left py-3 flex items-center justify-between gap-2">
                  <span className="truncate">{it.name}</span>
                  {it.supersetId && (
                    <span className="text-[10px] uppercase font-bold text-muted">In superset</span>
                  )}
                </button>
              </li>
            )
          )}
          {items.filter((_, i) => i !== supersetFor).length === 0 && (
            <li className="py-6 text-center text-muted">Add another exercise first.</li>
          )}
        </ul>
      </BottomSheet>

      <BottomSheet open={showSettings} onClose={() => setShowSettings(false)} title="Workout settings">
        <div className="space-y-4 py-2">
          <SettingRow label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] rounded-lg px-3 py-1.5 text-sm"
            />
          </SettingRow>
          <SettingRow label="Rest timer">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestSeconds((s) => Math.max(15, s - 15))}
                className="w-8 h-8 rounded-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] font-bold"
              >
                −
              </button>
              <span className="tabular-nums font-semibold w-14 text-center">{restSeconds}s</span>
              <button
                onClick={() => setRestSeconds((s) => s + 15)}
                className="w-8 h-8 rounded-full bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] font-bold"
              >
                +
              </button>
            </div>
          </SettingRow>
        </div>
      </BottomSheet>

      <PlateSheet open={plateFor !== null} onClose={() => setPlateFor(null)} weight={plateFor} />

      <BottomSheet open={showSummary} onClose={() => navigate('/history', { replace: true })} title="Workout saved">
        <div className="space-y-4 py-2">
          <div className="rounded-2xl bg-success-light p-4">
            <p className="text-success font-semibold">
              {fmtDuration(elapsedSec)} · {filledSets} sets · {Math.round(totalVolume)} kg·rep
            </p>
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

function ExerciseMenuSheet({ open, onClose, item, inSuperset, onReorder, onReplace, onSuperset, onRemove }) {
  if (!item && open) onClose();
  return (
    <BottomSheet open={open} onClose={onClose} title={item?.name ?? ''}>
      <ul className="divide-y divide-line dark:divide-[#1f2227]">
        <MenuAction icon={<ReorderIcon />} label="Reorder exercises" onClick={onReorder} />
        <MenuAction icon={<SwapIcon />} label="Replace exercise" onClick={onReplace} />
        <MenuAction
          icon={<LinkIcon />}
          label={inSuperset ? 'Remove from superset' : 'Add to superset'}
          onClick={onSuperset}
        />
        <MenuAction
          icon={<TrashIcon />}
          label="Remove exercise"
          onClick={onRemove}
          danger
        />
      </ul>
    </BottomSheet>
  );
}

function MenuAction({ icon, label, onClick, danger }) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 py-3 ${danger ? 'text-red-600 dark:text-red-400' : ''}`}
      >
        <span className={`w-9 h-9 rounded-xl bg-surface dark:bg-[#16181c] flex items-center justify-center ${danger ? 'text-red-500' : 'text-muted'}`}>
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}

function ReorderView({ items, sensors, onDragEnd, onDone, supersetColorByGroup }) {
  return (
    <div className="pb-32 animate-slide-up">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0b0c0e]/95 backdrop-blur border-b border-line dark:border-[#1a1c20]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold">Reorder exercises</h1>
          <button onClick={onDone} className="text-primary font-semibold text-sm">
            Done
          </button>
        </div>
      </header>
      <div className="px-4 pt-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((it) => it.uid)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((it) => (
                <ReorderRow key={it.uid} id={it.uid} item={it} color={it.supersetId ? supersetColorByGroup.get(it.supersetId) : null} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function ReorderRow({ id, item, color }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] px-4 py-4 touch-none ${
        isDragging ? 'shadow-2xl ring-2 ring-primary/40' : ''
      } ${color ? `border-l-4 ${color.ring}` : ''}`}
    >
      <GripIcon />
      <span className="flex-1 font-semibold truncate">{item.name}</span>
      <span className="text-[11px] text-muted tabular-nums">{item.sets.length} sets</span>
    </li>
  );
}

function ExerciseCard({ item, index, supersetColor, focused, onFocusRow, onBlurRow, onPatchSet, onToggleDone, onAddSet, onRemoveSet, onAdjustWeight, onShowPlates, onOpenMenu }) {
  return (
    <section
      className={`bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] ${
        supersetColor ? `border-l-4 ${supersetColor.ring}` : ''
      }`}
    >
      <header className="flex items-center gap-2 px-4 py-3">
        <Link to={`/exercise/${item.exerciseId}`} className="flex-1 min-w-0">
          <p className="font-semibold truncate">{item.name}</p>
          {supersetColor && (
            <span className={`inline-block mt-1 text-[10px] uppercase tracking-wide font-bold rounded-full px-2 py-0.5 ${supersetColor.tag}`}>
              Superset
            </span>
          )}
        </Link>
        {item.bodyweight && (
          <span className="text-[10px] uppercase tracking-wide font-bold text-muted bg-surface dark:bg-[#16181c] rounded-full px-2 py-0.5">
            BW
          </span>
        )}
        <button
          onClick={onOpenMenu}
          type="button"
          aria-label="Exercise options"
          className="p-2 text-muted -mr-1"
        >
          <DotsIcon />
        </button>
      </header>

      <div className={`grid items-center px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted ${
        item.bodyweight
          ? 'grid-cols-[24px_56px_1fr_36px] gap-2'
          : 'grid-cols-[24px_56px_1fr_1fr_36px] gap-2'
      }`}>
        <span>Set</span>
        <span>Previous</span>
        {!item.bodyweight && <span className="text-center">Kg</span>}
        <span className="text-center">Reps</span>
        <span></span>
      </div>

      <ul>
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
        className="w-full py-3 text-sm font-semibold text-primary border-t border-dashed border-line dark:border-[#1f2227]"
      >
        + Add set
      </button>
    </section>
  );
}

function SetRow({ setIndex, data, bodyweight, focused, onFocus, onBlur, onPatch, onToggleDone, onRemove, onAdjustWeight, onShowPlates }) {
  const prevStr =
    data.previousReps != null
      ? bodyweight
        ? `${data.previousReps}`
        : `${data.previousReps} × ${data.previousWeight}`
      : '−';

  return (
    <li
      className={`transition-colors ${data.done ? 'bg-success-light/60 dark:bg-success/10' : ''}`}
      onPointerDown={onFocus}
    >
      <div
        className={`grid items-center px-4 py-2 gap-2 ${
          bodyweight
            ? 'grid-cols-[24px_56px_1fr_36px]'
            : 'grid-cols-[24px_56px_1fr_1fr_36px]'
        }`}
      >
        <span
          className={`text-center text-sm font-bold tabular-nums ${
            data.done ? 'text-success' : 'text-muted'
          }`}
        >
          {setIndex + 1}
        </span>
        <span className="text-[11px] text-muted tabular-nums truncate">{prevStr}</span>
        {!bodyweight && (
          <NumberInput
            value={data.weight}
            onChange={(v) => onPatch({ weight: v })}
            onFocus={onFocus}
            onBlur={onBlur}
            inputMode="decimal"
            placeholder="kg"
            done={data.done}
          />
        )}
        <NumberInput
          value={data.reps}
          onChange={(v) => onPatch({ reps: v })}
          onFocus={onFocus}
          onBlur={onBlur}
          inputMode="numeric"
          placeholder="reps"
          done={data.done}
        />
        <CheckButton checked={data.done} onClick={onToggleDone} />
      </div>
      {focused && (
        <div className="flex items-center gap-1.5 px-4 pb-2 -mt-0.5 animate-fade-in">
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
      className={`text-center text-base font-semibold tabular-nums rounded-lg py-2 px-1 border outline-none transition w-full ${
        done
          ? 'bg-transparent border-transparent text-success'
          : 'bg-surface dark:bg-[#16181c] border-transparent focus:border-primary'
      }`}
    />
  );
}

function CheckButton({ checked, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
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
      type="button"
      className="text-[11px] font-semibold text-muted bg-surface dark:bg-[#16181c] border border-line dark:border-[#1f2227] rounded-full px-2 py-1"
    >
      {children}
    </button>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="text-center">
      <p className={`text-base font-bold tabular-nums leading-tight ${accent ? 'text-primary' : ''}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</p>
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
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
            <button onClick={() => onPick(e.id)} type="button" className="w-full text-left py-3">
              {e.name}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="py-6 text-center text-muted">No matches</li>}
      </ul>
    </div>
  );
}

function fmtDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${String(s).padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${String(mm).padStart(2, '0')}m`;
}

function ChevronDown() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2" />
      <path d="M9 2h6" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg className="w-5 h-5 text-muted-light" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function ReorderIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h13" />
      <path d="M3 12h7" />
      <path d="M3 18h13" />
      <path d="m17 9 3-3-3-3" />
      <path d="m17 15 3 3-3 3" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13a5 5 0 0 1 5 5" />
      <path d="m17 20 4-4-4-4" />
      <path d="M21 16H8a5 5 0 0 1-5-5" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
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
    .map((s) => ({
      reps: String(s.reps),
      weight: bodyweight ? '' : String(s.weight),
      previousReps: s.reps,
      previousWeight: s.weight,
      done: false
    }));
}
