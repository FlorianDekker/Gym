import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { volume, relativeDate, startOfWeekISO } from '../lib/volume.js';

const ACCENT = {
  push: 'from-rose-500/15 to-rose-500/5 text-rose-700 dark:text-rose-300',
  pull: 'from-sky-500/15 to-sky-500/5 text-sky-700 dark:text-sky-300',
  legs: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  default: 'from-zinc-500/10 to-zinc-500/5 text-ink dark:text-white'
};

const DOT = {
  push: 'bg-rose-500',
  pull: 'bg-sky-500',
  legs: 'bg-emerald-500',
  default: 'bg-zinc-500'
};

function detectGroup(name) {
  const n = name.toLowerCase();
  if (n.startsWith('push')) return 'push';
  if (n.startsWith('pull')) return 'pull';
  if (n.startsWith('legs')) return 'legs';
  return 'default';
}

export default function Home() {
  const data = useLiveQuery(
    async () => {
      const templates = await db.workoutTemplates.orderBy('order').toArray();
      const allWorkouts = await db.workouts.toArray();
      const lastByTemplate = new Map();
      for (const w of allWorkouts) {
        const prev = lastByTemplate.get(w.templateId);
        if (!prev || w.date > prev.date) lastByTemplate.set(w.templateId, w);
      }

      const weekStart = startOfWeekISO();
      const thisWeek = allWorkouts.filter((w) => w.date >= weekStart);
      const weekIds = thisWeek.map((w) => w.id);
      const weekSets = weekIds.length
        ? await db.sets.where('workoutId').anyOf(weekIds).toArray()
        : [];

      return {
        templates: templates.map((t) => ({ ...t, last: lastByTemplate.get(t.id) })),
        week: {
          workouts: thisWeek.length,
          sets: weekSets.length,
          volume: volume(weekSets)
        },
        totalWorkouts: allWorkouts.length
      };
    },
    [],
    { templates: [], week: { workouts: 0, sets: 0, volume: 0 }, totalWorkouts: 0 }
  );

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-5 pt-12 pb-24 flex-1">
      <header className="mb-6">
        <p className="text-sm text-muted">{today}</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Pick a workout</h1>
      </header>

      <WeekCard week={data.week} totalWorkouts={data.totalWorkouts} />

      <ul className="space-y-3 mt-5">
        {data.templates.map((tpl, i) => {
          const group = detectGroup(tpl.name);
          return (
            <li key={tpl.id} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <Link
                to={`/log/${tpl.id}`}
                className={`block rounded-2xl border border-line dark:border-[#1f2227] bg-gradient-to-br ${ACCENT[group]} px-5 py-4`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${DOT[group]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold leading-tight">{tpl.name}</p>
                    <p className="text-xs text-muted">
                      {tpl.last ? `Last: ${relativeDate(tpl.last.date)}` : 'Never done — get started'}
                    </p>
                  </div>
                  <ChevronRight />
                </div>
              </Link>
            </li>
          );
        })}
        {data.templates.length === 0 && (
          <li className="text-center text-muted py-12">
            No workouts yet. Add one in Settings.
          </li>
        )}
      </ul>
    </div>
  );
}

function WeekCard({ week, totalWorkouts }) {
  return (
    <section className="rounded-2xl bg-ink dark:bg-[#16181c] text-white p-5 border border-ink dark:border-[#1f2227]">
      <p className="text-xs uppercase tracking-wider text-white/60 mb-3">This week</p>
      <div className="grid grid-cols-3 gap-3">
        <Stat value={week.workouts} label="workouts" />
        <Stat value={week.sets} label="sets" />
        <Stat value={Math.round(week.volume / 1000) + 'k'} label="kg·rep" />
      </div>
      {totalWorkouts > 0 && (
        <p className="text-[11px] text-white/50 mt-3">{totalWorkouts} total workouts logged</p>
      )}
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] text-white/60 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg className="w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
