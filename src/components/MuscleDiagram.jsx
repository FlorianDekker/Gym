// Stylised front + back body diagrams. Each muscle group is a separate <ellipse>
// or <path> so it can be highlighted independently. The base silhouette
// underneath is a flat gray; active muscles get the primary accent colour.

const BASE = '#2a2d33';
const MUTED = '#3a3d44';
const ACTIVE = '#ff6a13';

function fillFor(active, id) {
  return active.has(id) ? ACTIVE : MUTED;
}

function FrontBody({ active }) {
  return (
    <svg viewBox="0 0 100 220" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* head */}
      <circle cx="50" cy="14" r="9" fill={BASE} />
      {/* neck */}
      <rect x="46" y="20" width="8" height="6" fill={BASE} />
      {/* torso silhouette */}
      <path d="M30 27 Q50 24 70 27 L73 75 Q70 100 60 105 L40 105 Q30 100 27 75 Z" fill={BASE} />
      {/* arms */}
      <path d="M22 30 Q19 65 24 100 Q26 108 28 108 L34 108 Q33 75 30 30 Z" fill={BASE} />
      <path d="M78 30 Q81 65 76 100 Q74 108 72 108 L66 108 Q67 75 70 30 Z" fill={BASE} />
      {/* hands */}
      <circle cx="27" cy="113" r="5" fill={BASE} />
      <circle cx="73" cy="113" r="5" fill={BASE} />
      {/* legs */}
      <path d="M38 105 L48 105 L48 205 L40 205 Q36 175 35 145 Z" fill={BASE} />
      <path d="M62 105 L52 105 L52 205 L60 205 Q64 175 65 145 Z" fill={BASE} />
      {/* feet */}
      <ellipse cx="42" cy="210" rx="6" ry="3" fill={BASE} />
      <ellipse cx="58" cy="210" rx="6" ry="3" fill={BASE} />

      {/* === HIGHLIGHTS === */}
      {/* chest (split pectorals) */}
      <ellipse cx="42" cy="42" rx="11" ry="9" fill={fillFor(active, 'chest')} />
      <ellipse cx="58" cy="42" rx="11" ry="9" fill={fillFor(active, 'chest')} />
      {/* shoulders (front delts) */}
      <ellipse cx="30" cy="33" rx="6" ry="6" fill={fillFor(active, 'shoulders')} />
      <ellipse cx="70" cy="33" rx="6" ry="6" fill={fillFor(active, 'shoulders')} />
      {/* biceps */}
      <ellipse cx="25" cy="55" rx="5" ry="11" fill={fillFor(active, 'biceps')} />
      <ellipse cx="75" cy="55" rx="5" ry="11" fill={fillFor(active, 'biceps')} />
      {/* forearms (front view) */}
      <ellipse cx="27" cy="85" rx="5" ry="13" fill={fillFor(active, 'forearms')} />
      <ellipse cx="73" cy="85" rx="5" ry="13" fill={fillFor(active, 'forearms')} />
      {/* abs */}
      <rect x="44" y="55" width="12" height="35" rx="3" fill={fillFor(active, 'abs')} />
      {/* quads */}
      <ellipse cx="42" cy="135" rx="6" ry="22" fill={fillFor(active, 'quads')} />
      <ellipse cx="58" cy="135" rx="6" ry="22" fill={fillFor(active, 'quads')} />
      {/* adductors (inner thighs) */}
      <path d="M48 110 L52 110 L51 150 L49 150 Z" fill={fillFor(active, 'adductors')} />
      {/* hip abductors (outer hips) */}
      <ellipse cx="36" cy="112" rx="3" ry="6" fill={fillFor(active, 'hipAbductors')} />
      <ellipse cx="64" cy="112" rx="3" ry="6" fill={fillFor(active, 'hipAbductors')} />
    </svg>
  );
}

function BackBody({ active }) {
  return (
    <svg viewBox="0 0 100 220" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* head */}
      <circle cx="50" cy="14" r="9" fill={BASE} />
      {/* neck */}
      <rect x="46" y="20" width="8" height="6" fill={BASE} />
      {/* torso */}
      <path d="M30 27 Q50 24 70 27 L73 75 Q70 100 60 105 L40 105 Q30 100 27 75 Z" fill={BASE} />
      {/* arms */}
      <path d="M22 30 Q19 65 24 100 Q26 108 28 108 L34 108 Q33 75 30 30 Z" fill={BASE} />
      <path d="M78 30 Q81 65 76 100 Q74 108 72 108 L66 108 Q67 75 70 30 Z" fill={BASE} />
      {/* hands */}
      <circle cx="27" cy="113" r="5" fill={BASE} />
      <circle cx="73" cy="113" r="5" fill={BASE} />
      {/* legs */}
      <path d="M38 105 L48 105 L48 205 L40 205 Q36 175 35 145 Z" fill={BASE} />
      <path d="M62 105 L52 105 L52 205 L60 205 Q64 175 65 145 Z" fill={BASE} />
      {/* feet */}
      <ellipse cx="42" cy="210" rx="6" ry="3" fill={BASE} />
      <ellipse cx="58" cy="210" rx="6" ry="3" fill={BASE} />

      {/* === HIGHLIGHTS === */}
      {/* upper back / traps area (between shoulders) */}
      <path d="M40 30 L60 30 L62 50 L38 50 Z" fill={fillFor(active, 'upperBack')} />
      {/* shoulders (rear delts) */}
      <ellipse cx="30" cy="33" rx="6" ry="6" fill={fillFor(active, 'shoulders')} />
      <ellipse cx="70" cy="33" rx="6" ry="6" fill={fillFor(active, 'shoulders')} />
      {/* triceps */}
      <ellipse cx="25" cy="55" rx="5" ry="11" fill={fillFor(active, 'triceps')} />
      <ellipse cx="75" cy="55" rx="5" ry="11" fill={fillFor(active, 'triceps')} />
      {/* forearms */}
      <ellipse cx="27" cy="85" rx="5" ry="13" fill={fillFor(active, 'forearms')} />
      <ellipse cx="73" cy="85" rx="5" ry="13" fill={fillFor(active, 'forearms')} />
      {/* lats (flaring out from spine) */}
      <path d="M38 50 L62 50 L65 80 L60 85 L40 85 L35 80 Z" fill={fillFor(active, 'lats')} />
      {/* lower back */}
      <rect x="44" y="85" width="12" height="18" rx="3" fill={fillFor(active, 'lowerBack')} />
      {/* glutes */}
      <ellipse cx="42" cy="115" rx="8" ry="10" fill={fillFor(active, 'glutes')} />
      <ellipse cx="58" cy="115" rx="8" ry="10" fill={fillFor(active, 'glutes')} />
      {/* hamstrings */}
      <ellipse cx="42" cy="150" rx="6" ry="18" fill={fillFor(active, 'hamstrings')} />
      <ellipse cx="58" cy="150" rx="6" ry="18" fill={fillFor(active, 'hamstrings')} />
      {/* calves */}
      <ellipse cx="42" cy="185" rx="5" ry="14" fill={fillFor(active, 'calves')} />
      <ellipse cx="58" cy="185" rx="5" ry="14" fill={fillFor(active, 'calves')} />
    </svg>
  );
}

export default function MuscleDiagram({ activeIds }) {
  const active = activeIds instanceof Set ? activeIds : new Set(activeIds || []);
  return (
    <div className="flex justify-center items-end gap-4">
      <div className="w-[110px] h-[220px]"><FrontBody active={active} /></div>
      <div className="w-[110px] h-[220px]"><BackBody active={active} /></div>
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
