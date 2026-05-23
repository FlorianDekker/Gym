import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import BottomNav from './components/BottomNav.jsx';
import Home from './pages/Home.jsx';
import LogWorkout from './pages/LogWorkout.jsx';
import History from './pages/History.jsx';
import Exercise from './pages/Exercise.jsx';
import Settings from './pages/Settings.jsx';
import { ensureSeeded } from './db/seed.js';

export default function App() {
  useEffect(() => {
    ensureSeeded();
    const stored = localStorage.getItem('gym-theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-full max-w-screen-sm mx-auto pb-24 text-slate-900 dark:text-slate-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/log/:templateId" element={<LogWorkout />} />
        <Route path="/history" element={<History />} />
        <Route path="/exercise/:exerciseId" element={<Exercise />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
