const KEY = 'gym-active-workout';
// Drop a stale in-progress workout if it hasn't been touched for this long.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function loadActiveWorkout(templateId = null) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return null;
    if (saved.savedAt && Date.now() - saved.savedAt > STALE_AFTER_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    if (templateId != null && saved.templateId !== Number(templateId)) return null;
    return saved;
  } catch {
    return null;
  }
}

export function saveActiveWorkout(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {}
}

export function clearActiveWorkout() {
  localStorage.removeItem(KEY);
}
