import { useState } from 'react';
import { Link } from 'react-router-dom';
import BottomSheet from './BottomSheet.jsx';
import { evaluate, hasStandards, LEVELS } from '../lib/strengthLevels.js';
import { isProfileComplete } from '../lib/profile.js';

export default function StrengthLevelCard({ exerciseName, sets, profile }) {
  const [showInfo, setShowInfo] = useState(false);

  if (!hasStandards(exerciseName)) return null;
  if (!Array.isArray(sets) || sets.length === 0) return null;

  if (!isProfileComplete(profile)) {
    return (
      <section className="rounded-2xl bg-white dark:bg-[#101115] border border-line dark:border-[#1f2227] p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <TrophyIcon />
          <h2 className="font-semibold">Strength Level</h2>
        </div>
        <p className="text-sm text-muted">
          <Link to="/settings" className="text-primary font-semibold">Set up your profile</Link>{' '}
          to see how your 1RM compares to other lifters.
        </p>
      </section>
    );
  }

  const result = evaluate(exerciseName, sets, profile);
  if (!result) return null;

  const segCount = LEVELS.length - 1;
  const fillPct = result.overallProgress * 100;
  const sexLabel = profile.sex === 'female' ? 'female' : 'male';
  const oneRmStr = result.oneRm >= 100 ? Math.round(result.oneRm) : result.oneRm.toFixed(1);

  return (
    <section className="rounded-2xl bg-white dark:bg-[#101115] border border-line dark:border-[#1f2227] p-4 mb-4">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrophyIcon />
          <h2 className="font-semibold">Strength Level</h2>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          type="button"
          aria-label="How is this calculated?"
          className="w-6 h-6 rounded-full bg-surface dark:bg-[#16181c] text-muted flex items-center justify-center text-xs font-bold"
        >
          ?
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">
            {result.mode === 'bw' ? 'Best 1RM (effective)' : 'Best 1RM'}
          </p>
          <p className="text-2xl font-bold tabular-nums leading-tight">
            {oneRmStr}
            <span className="text-[11px] text-muted font-medium ml-1">kg</span>
          </p>
          {result.mode === 'bw' && result.bestRecorded && (
            <p className="text-[10px] text-muted mt-0.5">
              {result.bestRecorded.weight === 0
                ? 'bodyweight'
                : result.bestRecorded.weight > 0
                  ? `bodyweight + ${result.bestRecorded.weight} kg`
                  : `bodyweight − ${Math.abs(result.bestRecorded.weight)} kg`}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Level</p>
          <p className="text-2xl font-bold leading-tight">{result.level}</p>
        </div>
      </div>

      <div className="mb-2">
        <div className="relative h-2 rounded-full bg-surface dark:bg-[#16181c] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300"
            style={{ width: `${fillPct}%` }}
          />
          {Array.from({ length: segCount - 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-white dark:bg-[#0b0c0e]"
              style={{ left: `${((i + 1) / segCount) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] uppercase tracking-wider text-muted font-bold">
          {LEVELS.map((lvl, i) => (
            <span key={lvl} className={i === result.levelIndex ? 'text-primary' : ''}>
              {lvl}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted mt-3">
        Stronger than{' '}
        <span className="font-semibold text-ink dark:text-white">{result.percentile}%</span>{' '}
        of {sexLabel} lifters your age and bodyweight.
      </p>

      <BottomSheet open={showInfo} onClose={() => setShowInfo(false)} title="How this is calculated">
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Your <b>estimated 1RM</b> uses the Epley formula{' '}
            <code className="text-xs">weight × (1 + reps/30)</code>, taken as the highest
            value across every set you've logged.
          </p>
          <p>
            {result.mode === 'bw'
              ? <>For <b>{exerciseName}</b>, the effective load is <b>your bodyweight + the kg you record</b> — so a negative number means assistance and zero is pure bodyweight.</>
              : <>The recorded kg is the absolute load on the bar / cable / dumbbell.</>}
            {' '}That number is compared to bodyweight-ratio standards for {exerciseName} compiled from widely cited public references (Greg Nuckols' Strength Standards, ExRx, Symmetric Strength), then scaled by an age modifier so older and very young lifters aren't unfairly penalised.
          </p>
          <p>
            Levels: <b>Beginner</b> → <b>Novice</b> → <b>Intermediate</b> →{' '}
            <b>Advanced</b> → <b>Elite</b>. The percentile is an approximation based
            on the cumulative share of lifters at each level — not a precise figure.
          </p>
          <p className="text-muted text-xs">
            Numbers for isolation moves and machines are calibrated estimates rather
            than rigorously published ratios; treat them as a useful directional
            comparison.
          </p>
        </div>
      </BottomSheet>
    </section>
  );
}

function TrophyIcon() {
  return (
    <svg className="w-5 h-5 text-pr" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 3h12v2h3a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4v.2A6 6 0 0 1 13 18v2h3v2H8v-2h3v-2a6 6 0 0 1-5-4.8V13a4 4 0 0 1-4-4V6a1 1 0 0 1 1-1h3V3zm12 4v3a2 2 0 0 0 2-2V7h-2zM4 7v1a2 2 0 0 0 2 2V7H4z" />
    </svg>
  );
}
