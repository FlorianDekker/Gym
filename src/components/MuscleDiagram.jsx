import Model from 'react-body-highlighter';

// Map our internal muscle IDs to react-body-highlighter's muscle names.
// The library doesn't ship a separate "lats" or "traps" split, so both fall
// under upper-back / trapezius; shoulders span front + back deltoids so they
// light up on both anterior and posterior views.
const ID_TO_LIB = {
  chest:        ['chest'],
  shoulders:    ['front-deltoids', 'back-deltoids'],
  biceps:       ['biceps'],
  triceps:      ['triceps'],
  forearms:     ['forearm'],
  upperBack:    ['upper-back', 'trapezius'],
  lats:         ['upper-back'],
  lowerBack:    ['lower-back'],
  abs:          ['abs', 'obliques'],
  quads:        ['quadriceps'],
  hamstrings:   ['hamstring'],
  glutes:       ['gluteal'],
  calves:       ['calves'],
  adductors:    ['adductor'],
  hipAbductors: ['abductors']
};

const BODY_COLOR_LIGHT = '#d6d8dd';
const BODY_COLOR_DARK = '#2a2d33';
const ACCENT = '#ff6a13';

function toLibraryData(activeIds) {
  const muscles = [];
  for (const id of activeIds) {
    const libMuscles = ID_TO_LIB[id];
    if (libMuscles) muscles.push(...libMuscles);
  }
  if (muscles.length === 0) return [];
  return [{ name: 'session', muscles, frequency: 1 }];
}

export default function MuscleDiagram({ activeIds }) {
  const active = activeIds instanceof Set ? activeIds : new Set(activeIds || []);
  const data = toLibraryData(active);
  const bodyColor =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? BODY_COLOR_DARK
      : BODY_COLOR_LIGHT;
  const svgStyle = { width: '100%', height: '100%' };

  return (
    <div className="flex justify-center items-center gap-4">
      <div className="w-[42%] max-w-[140px]">
        <Model
          type="anterior"
          data={data}
          bodyColor={bodyColor}
          highlightedColors={[ACCENT]}
          svgStyle={svgStyle}
        />
      </div>
      <div className="w-[42%] max-w-[140px]">
        <Model
          type="posterior"
          data={data}
          bodyColor={bodyColor}
          highlightedColors={[ACCENT]}
          svgStyle={svgStyle}
        />
      </div>
    </div>
  );
}

export function MiniBodyIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="3.5" r="1.8" />
      <path d="M8 6h8l-.5 4.5h-7L8 6z" />
      <rect x="9" y="11" width="6" height="6" rx="1" />
      <rect x="6" y="6.5" width="2" height="6" rx="1" />
      <rect x="16" y="6.5" width="2" height="6" rx="1" />
      <rect x="9" y="17" width="2.2" height="5" rx="1" />
      <rect x="12.8" y="17" width="2.2" height="5" rx="1" />
    </svg>
  );
}
