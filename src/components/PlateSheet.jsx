import BottomSheet from './BottomSheet.jsx';
import { platesPerSide } from '../lib/plates.js';

export default function PlateSheet({ open, onClose, weight, barKg = 20 }) {
  const result = platesPerSide(Number(weight) || 0, barKg);

  return (
    <BottomSheet open={open} onClose={onClose} title="Plates per side">
      {!result.valid ? (
        <p className="text-muted py-6 text-center">Target is below the {barKg} kg bar.</p>
      ) : result.plates.length === 0 ? (
        <p className="text-muted py-6 text-center">Just the {barKg} kg bar.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{weight}</span>
            <span className="text-muted">kg total · {result.perSide} kg per side</span>
          </div>
          <ul className="space-y-2">
            {result.plates.map((p) => (
              <li
                key={p.kg}
                className="flex items-center justify-between rounded-2xl border border-line dark:border-[#1f2227] bg-surface dark:bg-[#16181c] px-4 py-3"
              >
                <span className="font-semibold tabular-nums">{p.count}×</span>
                <PlatePill kg={p.kg} />
                <span className="tabular-nums text-muted">{p.kg} kg</span>
              </li>
            ))}
          </ul>
          {result.leftover > 0.001 && (
            <p className="text-sm text-muted">
              {result.leftover.toFixed(2)} kg off — closest with available plates.
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function PlatePill({ kg }) {
  const colors = {
    25: 'bg-red-500 text-white',
    20: 'bg-blue-500 text-white',
    15: 'bg-yellow-500 text-ink',
    10: 'bg-green-600 text-white',
    5: 'bg-white text-ink border border-line',
    2.5: 'bg-red-300 text-ink',
    1.25: 'bg-zinc-400 text-white'
  };
  return (
    <span className={`min-w-12 text-center text-xs font-bold rounded-full px-3 py-1.5 ${colors[kg] ?? 'bg-zinc-300'}`}>
      {kg}
    </span>
  );
}
