import { useEffect, useRef } from 'react';
import { BodyChart, ViewSide } from 'body-muscles';

const ID_TO_LIB = {
  chest: ['chest-upper-left', 'chest-upper-right', 'chest-lower-left', 'chest-lower-right'],
  shoulders: [
    'shoulder-front-left', 'shoulder-front-right',
    'shoulder-side-left', 'shoulder-side-right',
    'deltoid-rear-left', 'deltoid-rear-right'
  ],
  biceps: ['biceps-left', 'biceps-right'],
  triceps: ['triceps-long-left', 'triceps-lateral-left', 'triceps-long-right', 'triceps-lateral-right'],
  forearms: [
    'forearm-left', 'forearm-right',
    'forearm-flexors-left', 'forearm-extensors-left',
    'forearm-flexors-right', 'forearm-extensors-right'
  ],
  upperBack: [
    'traps-upper-left', 'traps-mid-left', 'traps-lower-left',
    'traps-upper-right', 'traps-mid-right', 'traps-lower-right'
  ],
  lats: [
    'lats-upper-left', 'lats-mid-left', 'lats-lower-left',
    'lats-upper-right', 'lats-mid-right', 'lats-lower-right'
  ],
  lowerBack: [
    'lower-back-erectors-left', 'lower-back-ql-left',
    'lower-back-erectors-right', 'lower-back-ql-right'
  ],
  abs: ['abs-upper-left', 'abs-upper-right', 'abs-lower-left', 'abs-lower-right', 'obliques-left', 'obliques-right'],
  quads: ['quads-left', 'quads-right'],
  hamstrings: ['hamstrings-medial-left', 'hamstrings-lateral-left', 'hamstrings-medial-right', 'hamstrings-lateral-right'],
  glutes: ['gluteus-maximus-left', 'gluteus-maximus-right'],
  calves: [
    'calves-gastroc-medial-left', 'calves-gastroc-lateral-left', 'calves-soleus-left',
    'calves-gastroc-medial-right', 'calves-gastroc-lateral-right', 'calves-soleus-right'
  ],
  adductors: ['adductors-left', 'adductors-right'],
  hipAbductors: ['gluteus-medius-left', 'gluteus-medius-right']
};

function expandToLibraryIds(activeIds) {
  const set = new Set();
  for (const id of activeIds) {
    for (const libId of ID_TO_LIB[id] || []) set.add(libId);
  }
  return set;
}

const LIB_TO_OUR = (() => {
  const map = {};
  for (const [ourId, libIds] of Object.entries(ID_TO_LIB)) {
    for (const libId of libIds) map[libId] = ourId;
  }
  return map;
})();

// Replace the library's noisy default styling (slate-grey muscle paths at 60%
// opacity over a barely-visible body silhouette + a heavy 20px drop shadow)
// with a clean look: inactive muscles blend into a solid body, active ones
// light up in the orange primary, with a soft shadow under the figure.
// Returns the per-muscle fill colour. If `colorByOurId` is provided, looks up
// each library muscle's parent group in our taxonomy and uses its color;
// otherwise falls back to "active or not" highlighting via `activeLibIds`.
function colourFor(libMuscleId, activeLibIds, colorByOurId, accent) {
  if (colorByOurId) {
    const ourId = LIB_TO_OUR[libMuscleId];
    return ourId ? colorByOurId[ourId] || null : null;
  }
  return activeLibIds && activeLibIds.has(libMuscleId) ? accent : null;
}

function paintChart(chart, container, opts) {
  if (!chart) return;
  const { activeLibIds, colorByOurId, isDark } = opts;
  const bodyColor = isDark ? '#22252a' : '#dde0e5';
  const bodyHighlight = isDark ? '#2b2f35' : '#eef0f3';
  const subtleStroke = isDark ? '#15171b' : '#c4c8cf';
  const accent = '#ff6a13';

  const wrapper = container.querySelector('.body-chart-container');
  if (wrapper) {
    wrapper.style.padding = '0';
  }
  const svg = container.querySelector('.body-chart-svg');
  if (svg) {
    svg.style.filter = `drop-shadow(0 6px 14px rgba(0, 0, 0, ${isDark ? 0.55 : 0.18}))`;
    svg.style.maxHeight = 'none';
    svg.style.maxWidth = 'none';
  }

  const bg = container.querySelector('.body-chart-background');
  if (bg) {
    bg.style.opacity = '1';
    bg.querySelectorAll('path').forEach((p) => {
      p.setAttribute('fill', bodyColor);
      p.setAttribute('stroke', subtleStroke);
      p.setAttribute('stroke-width', '0.06');
    });
  }

  for (const [muscleId, path] of chart.musclePaths.entries()) {
    const fill = colourFor(muscleId, activeLibIds, colorByOurId, accent);
    const isColoured = !!fill;
    path.setAttribute('fill', isColoured ? fill : bodyHighlight);
    path.setAttribute('stroke', isColoured ? darken(fill) : subtleStroke);
    path.setAttribute('stroke-width', isColoured ? '0.18' : '0.08');
    path.style.fillOpacity = isColoured ? '1' : '0';
    path.style.filter = 'none';
    path.style.cursor = 'default';
  }
}

// Cheap darken for stroke colour — drops each channel by ~30%.
function darken(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => Math.floor(parseInt(c, 16) * 0.7));
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function BodyView({ view, activeLibIds, colorByOurId, isDark }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = new BodyChart(ref.current, {
      view,
      bodyState: {},
      enableTransitions: true
    });
    paintChart(chartRef.current, ref.current, { activeLibIds, colorByOurId, isDark });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (!chartRef.current || !ref.current) return;
    paintChart(chartRef.current, ref.current, { activeLibIds, colorByOurId, isDark });
  }, [activeLibIds, colorByOurId, isDark]);

  return <div ref={ref} className="w-full h-full" />;
}

export default function MuscleDiagram({ activeIds, colorByMuscle }) {
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  let libIds, colorByOurId;
  if (colorByMuscle) {
    colorByOurId = colorByMuscle;
  } else {
    const active = activeIds instanceof Set ? activeIds : new Set(activeIds || []);
    libIds = expandToLibraryIds(active);
  }

  return (
    <div className="flex justify-center items-stretch gap-2">
      <div className="flex-1 max-w-[150px]">
        <BodyView view={ViewSide.FRONT} activeLibIds={libIds} colorByOurId={colorByOurId} isDark={isDark} />
      </div>
      <div className="flex-1 max-w-[150px]">
        <BodyView view={ViewSide.BACK} activeLibIds={libIds} colorByOurId={colorByOurId} isDark={isDark} />
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
