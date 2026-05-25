import BottomSheet from './BottomSheet.jsx';
import MuscleDiagram from './MuscleDiagram.jsx';
import { MUSCLES, MUSCLE_LABEL, muscleCredits, formatCredit } from '../lib/muscles.js';

export default function MuscleDistributionSheet({ open, onClose, exerciseSetCounts }) {
  const credits = muscleCredits(exerciseSetCounts || {});
  const active = new Set(Object.keys(credits).filter((id) => credits[id] > 0));
  const total = Object.values(credits).reduce((sum, v) => sum + v, 0);
  const rows = MUSCLES.map((m) => ({ id: m.id, label: m.label, value: credits[m.id] || 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const max = rows.length ? Math.max(...rows.map((r) => r.value)) : 1;

  return (
    <BottomSheet open={open} onClose={onClose} title="Muscle Distribution">
      <div className="py-2">
        <div className="mb-5">
          <MuscleDiagram activeIds={active} />
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-muted text-sm py-6">
            No completed sets yet. Tick a set ✓ to see your muscle distribution.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Muscle</p>
              <p className="text-[10px] uppercase tracking-wider text-muted font-bold">
                Completed sets
              </p>
            </div>
            <ul className="divide-y divide-line dark:divide-[#1f2227]">
              {rows.map((r) => (
                <li key={r.id} className="py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{MUSCLE_LABEL[r.id] || r.label}</span>
                    <span className="tabular-nums font-semibold">{formatCredit(r.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface dark:bg-[#16181c] overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(r.value / max) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted mt-4 text-center">
              {formatCredit(total)} muscle-set credits across {rows.length} group
              {rows.length === 1 ? '' : 's'} · primary = 1.0, secondary = 0.5 per set.
            </p>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
