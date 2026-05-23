import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import BottomNav from './components/BottomNav.jsx';
import Home from './pages/Home.jsx';
import LogWorkout from './pages/LogWorkout.jsx';
import History from './pages/History.jsx';
import Exercise from './pages/Exercise.jsx';
import Settings from './pages/Settings.jsx';
import { ensureSeeded } from './db/seed.js';

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    ensureSeeded();
    const stored = localStorage.getItem('gym-theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div key={pathname} className="max-w-sm mx-auto flex flex-col min-h-screen animate-fade-in">
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
