import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';
import { db } from '../db/db.js';
import { volume, formatDate } from '../lib/volume.js';
import { exerciseStats } from '../lib/prs.js';
import PRBadge from '../components/PRBadge.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function Exercise() {
  const { exerciseId } = useParams();
  const id = Number(exerciseId);

  const data = useLiveQuery(
    async () => {
      const ex = await db.exercises.get(id);
      const sets = await db.sets.where('exerciseId').equals(id).toArray();
      const workoutIds = [...new Set(sets.map((s) => s.workoutId))];
      const workouts = await db.workouts.bulkGet(workoutIds);
      const byWorkout = new Map();
      for (const s of sets) {
        if (!byWorkout.has(s.workoutId)) byWorkout.set(s.workoutId, []);
        byWorkout.get(s.workoutId).push(s);
      }
      const sessions = workouts
        .filter(Boolean)
        .map((w) => ({
          workoutId: w.id,
          date: w.date,
          name: w.name,
          sets: byWorkout.get(w.id) || []
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const stats = await exerciseStats(id);
      return { ex, sessions, stats };
    },
    [id],
    { ex: null, sessions: [], stats: { maxWeight: 0, maxReps: 0, bestSet: null, totalVolume: 0, sessionCount: 0 } }
  );

  async function toggleBodyweight() {
    if (!data.ex) return;
    await db.exercises.update(id, { bodyweight: !data.ex.bodyweight });
  }

  const { ex, sessions, stats } = data;
  const bodyweight = !!ex?.bodyweight;

  const chartData = {
    labels: sessions.map((s) => formatDate(s.date)),
    datasets: [
      {
        label: bodyweight ? 'Total reps' : 'Volume',
        data: sessions.map((s) =>
          bodyweight ? s.sets.reduce((a, b) => a + (b.reps || 0), 0) : Math.round(volume(s.sets))
        ),
        borderColor: 'rgb(255 106 19)',
        backgroundColor: 'rgba(255, 106, 19, 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  };
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
    scales: {
      x: { ticks: { display: false }, grid: { display: false } },
      y: { ticks: { color: 'rgb(138 141 148)' }, grid: { color: 'rgba(138,141,148,0.12)' } }
    }
  };

  return (
    <div className="px-5 pt-12 pb-24 flex-1 animate-slide-up">
      <header className="flex items-center gap-2 mb-4">
        <Link to="/history" className="text-muted p-2 -ml-2" aria-label="Back">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold tracking-tight truncate flex-1">{ex?.name ?? '…'}</h1>
        <button
          onClick={toggleBodyweight}
          className={`text-[10px] uppercase tracking-wide font-bold rounded-full px-2.5 py-1 ${
            bodyweight ? 'bg-primary text-white' : 'bg-surface dark:bg-[#16181c] text-muted'
          }`}
        >
          BW
        </button>
      </header>

      {stats.sessionCount > 0 && (
        <section className="rounded-2xl bg-white dark:bg-[#101115] border border-line dark:border-[#1f2227] p-4 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat
              value={bodyweight ? stats.maxReps : stats.maxWeight}
              unit={bodyweight ? 'reps' : 'kg'}
              label="Best"
              badge
            />
            <Stat value={stats.sessionCount} unit="" label="sessions" />
            <Stat
              value={Math.round(stats.totalVolume).toLocaleString()}
              unit={bodyweight ? 'reps' : 'kg·rep'}
              label="total"
            />
          </div>
          {stats.bestSet && !bodyweight && (
            <p className="text-xs text-muted mt-3">
              Best set: {stats.bestSet.reps} × {stats.bestSet.weight} kg
            </p>
          )}
        </section>
      )}

      <section className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] p-4 mb-4">
        <p className="text-xs uppercase tracking-wide text-muted font-bold mb-2">
          {bodyweight ? 'Reps' : 'Volume'} over time
        </p>
        <div className="h-56">
          {sessions.length > 0 ? (
            <Line data={chartData} options={chartOpts} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted text-sm">
              No data yet.
            </div>
          )}
        </div>
      </section>

      <ul className="space-y-3">
        {sessions
          .slice()
          .reverse()
          .map((s) => {
            const sessionMaxW = s.sets.reduce((m, x) => Math.max(m, x.weight), 0);
            const sessionMaxR = s.sets.reduce((m, x) => Math.max(m, x.reps), 0);
            const isPRSession =
              (bodyweight && sessionMaxR === stats.maxReps && stats.maxReps > 0) ||
              (!bodyweight && sessionMaxW === stats.maxWeight && stats.maxWeight > 0);
            return (
              <li
                key={s.workoutId}
                className="bg-white dark:bg-[#101115] rounded-2xl border border-line dark:border-[#1f2227] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{formatDate(s.date)}</p>
                    <p className="text-[11px] text-muted">{s.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPRSession && <PRBadge label="Best" />}
                    <p className="text-xs text-muted tabular-nums">
                      {bodyweight
                        ? `${s.sets.reduce((a, b) => a + b.reps, 0)} reps`
                        : `${Math.round(volume(s.sets))} kg·rep`}
                    </p>
                  </div>
                </div>
                <ul className="text-sm text-muted tabular-nums space-y-0.5">
                  {s.sets
                    .slice()
                    .sort((a, b) => a.id - b.id)
                    .map((set, i) => (
                      <li key={set.id}>
                        <span className="text-muted-light">{i + 1}.</span>{' '}
                        {bodyweight ? `${set.reps} reps` : `${set.reps} × ${set.weight} kg`}
                      </li>
                    ))}
                </ul>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

function Stat({ value, unit, label, badge }) {
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
        {unit && <p className="text-[11px] text-muted">{unit}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</p>
        {badge && (
          <svg className="w-3 h-3 text-pr" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.39 4.84 5.34.78-3.86 3.76.91 5.31L12 14.27l-4.78 2.51.91-5.31L4.27 7.62l5.34-.78L12 2z" />
          </svg>
        )}
      </div>
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
