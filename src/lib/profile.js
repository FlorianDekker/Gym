const KEY = 'gym-profile';

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function isProfileComplete(p) {
  return !!(p && (p.sex === 'male' || p.sex === 'female') && Number(p.bodyweight) > 0);
}
