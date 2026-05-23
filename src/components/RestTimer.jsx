import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const STORAGE_KEY = 'gym-rest-default';

export function getDefaultRest() {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : 90;
}

const RestTimer = forwardRef(function RestTimer(_, ref) {
  const [duration, setDuration] = useState(getDefaultRest());
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const tickRef = useRef(null);
  const endRef = useRef(0);

  useImperativeHandle(ref, () => ({
    start: (seconds) => start(seconds ?? duration),
    stop: () => reset()
  }));

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        try {
          navigator.vibrate?.([180, 80, 180]);
        } catch {}
      }
    }, 200);
    return () => clearInterval(tickRef.current);
  }, [running]);

  function start(seconds) {
    endRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
    try { navigator.vibrate?.(20); } catch {}
  }

  function adjust(delta) {
    if (running) {
      endRef.current += delta * 1000;
      setRemaining(Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000)));
    } else {
      const next = Math.max(15, duration + delta);
      setDuration(next);
      localStorage.setItem(STORAGE_KEY, String(next));
    }
  }

  function reset() {
    setRunning(false);
    setRemaining(0);
  }

  const mm = String(Math.floor(remaining / 60));
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = duration > 0 ? remaining / duration : 0;

  if (running) {
    return (
      <div className="fixed bottom-24 left-0 right-0 z-40 px-5 pointer-events-none animate-slide-up">
        <div className="max-w-sm mx-auto bg-ink dark:bg-white text-white dark:text-ink rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 pointer-events-auto animate-pulse-glow">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress * 100.53} 100.53`}
                className="transition-all duration-200"
              />
            </svg>
            <span className="text-xs font-bold tabular-nums">{mm}:{ss}</span>
          </div>
          <div className="flex-1 text-sm font-medium">Rest</div>
          <button onClick={() => adjust(-15)} className="px-2 py-1 text-sm font-semibold opacity-80">-15</button>
          <button onClick={() => adjust(15)} className="px-2 py-1 text-sm font-semibold opacity-80">+15</button>
          <button onClick={reset} className="px-2 py-1 text-sm font-semibold opacity-80" aria-label="Stop">✕</button>
        </div>
      </div>
    );
  }

  return null;
});

export default RestTimer;
