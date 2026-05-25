import { useEffect, useRef } from 'react';
import { BodyChart, ViewSide } from 'body-muscles';

// Map our 15 internal muscle IDs to the body-muscles library's fine-grained
// muscle paths. The library splits most muscles into left/right and some
// into upper/lower or lateral/medial heads — we light them all up together
// so the user just sees "chest" or "biceps" highlighted.
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

function buildBodyState(activeIds) {
  const state = {};
  for (const id of activeIds) {
    const libIds = ID_TO_LIB[id];
    if (!libIds) continue;
    for (const lid of libIds) {
      state[lid] = { intensity: 6, selected: true };
    }
  }
  return state;
}

function BodyView({ view, activeIds }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = new BodyChart(ref.current, {
      view,
      bodyState: buildBodyState(activeIds),
      enableTransitions: true
    });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.update({
      view,
      bodyState: buildBodyState(activeIds)
    });
  }, [view, activeIds]);

  return <div ref={ref} className="w-full h-full" />;
}

export default function MuscleDiagram({ activeIds }) {
  const active = activeIds instanceof Set ? activeIds : new Set(activeIds || []);
  return (
    <div className="flex justify-center items-stretch gap-3">
      <div className="flex-1 max-w-[160px] aspect-[1/2]">
        <BodyView view={ViewSide.FRONT} activeIds={active} />
      </div>
      <div className="flex-1 max-w-[160px] aspect-[1/2]">
        <BodyView view={ViewSide.BACK} activeIds={active} />
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
