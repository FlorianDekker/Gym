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

export function computeAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// Returns the user's current age, computing it from `dob` if present, otherwise
// falling back to the legacy `age` field for backward compatibility.
export function profileAge(profile) {
  if (!profile) return null;
  if (profile.dob) {
    const a = computeAge(profile.dob);
    if (a != null) return a;
  }
  if (Number.isFinite(Number(profile.age))) return Number(profile.age);
  return null;
}
