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
          sets: byWorkout.get(w.id) || []
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return { ex, sessions };
    },
    [id],
    { ex: null, sessions: [] }
  );

  const { ex, sessions } = data;
  const chartData = {
    labels: sessions.map((s) => formatDate(s.date)),
    datasets: [
      {
        label: 'Volume (kg·rep)',
        data: sessions.map((s) => Math.round(volume(s.sets))),
        borderColor: 'rgb(15 23 42)',
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  };
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
    scales: {
      x: { ticks: { display: false }, grid: { display: false } },
      y: { ticks: { color: 'rgb(100 116 139)' }, grid: { color: 'rgba(148,163,184,0.15)' } }
    }
  };

  return (
    <div className="p-4 space-y-4 pb-32">
      <header className="pt-2 flex items-center gap-2">
        <Link to="/history" className="text-slate-500 p-2 -ml-2">←</Link>
        <h1 className="text-2xl font-bold tracking-tight truncate flex-1">{ex?.name ?? '…'}</h1>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-xs text-slate-500 mb-2">Volume over time</p>
        <div className="h-56">
          {sessions.length > 0 ? (
            <Line data={chartData} options={chartOpts} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No data yet.
            </div>
          )}
        </div>
      </div>

      <ul className="space-y-3">
        {sessions
          .slice()
          .reverse()
          .map((s) => (
            <li key={s.workoutId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{formatDate(s.date)}</p>
                <p className="text-xs text-slate-500 tabular-nums">{Math.round(volume(s.sets))} kg·rep</p>
              </div>
              <ul className="text-sm text-slate-600 dark:text-slate-300 tabular-nums space-y-0.5">
                {s.sets
                  .slice()
                  .sort((a, b) => a.id - b.id)
                  .map((set, i) => (
                    <li key={set.id}>
                      <span className="text-slate-400">{i + 1}.</span> {set.reps} × {set.weight} kg
                    </li>
                  ))}
              </ul>
            </li>
          ))}
      </ul>
    </div>
  );
}
