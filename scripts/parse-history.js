#!/usr/bin/env node
// Parses scripts/history-raw.txt into src/db/historicalSeed.json.
// Usage: node scripts/parse-history.js

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(__dirname, 'history-raw.txt');
const OUT = resolve(__dirname, '../src/db/historicalSeed.json');

const ALIASES = [
  // Order matters: longer/more specific patterns first.
  ['close-grip bench', 'Close-Grip Bench Press'],
  ['close grip bench', 'Close-Grip Bench Press'],
  ['chest-supported row', 'Chest-Supported Row'],
  ['chest supported row', 'Chest-Supported Row'],
  ['chest press machine', 'Chest Press'],
  ['chest press', 'Chest Press'],
  ['chest geel', 'Chest Press'],
  ['romanian deadlift', 'Romanian Deadlift'],
  ['leger deadlift', 'Deadlift'],
  ['cable crossover decline', 'Cable Crossover Decline'],
  ['cable crossover', 'Cable Crossover'],
  ['omni-grip lat pulldown', 'Omni-Grip Lat Pulldown'],
  ['omnigrip lat pulldown', 'Omni-Grip Lat Pulldown'],
  ['reverse pec-deck', 'Reverse Pec Deck'],
  ['reverse pec deck', 'Reverse Pec Deck'],
  ['reverse pec-decl', 'Reverse Pec Deck'],
  ['pec deck', 'Reverse Pec Deck'],
  ['single leg press machine', 'Single Leg Press'],
  ['single leg press', 'Single Leg Press'],
  ['single leg extension', 'Leg Extension'],
  ['leg extension', 'Leg Extension'],
  ['single calf raise', 'Single-Leg Calf Raise'],
  ['calf raise', 'Single-Leg Calf Raise'],
  ['hip thrust machine', 'Single-Leg Hip Thrust'],
  ['hip thrust', 'Single-Leg Hip Thrust'],
  ['hip abductor', 'Hip Abductor'],
  ['hip abduction', 'Hip Abductor'],
  ['hip adductor', 'Hip Adductor'],
  ['leg curl', 'Seated Leg Curls'],
  ['low row geel', 'Seated Cable Row'],
  ['low row', 'Seated Cable Row'],
  ['seated row machine', 'Seated Cable Row'],
  ['seated row', 'Seated Cable Row'],
  ['bent-over row', 'Bent-Over Row'],
  ['upper back', 'Upper Back Row'],
  ['bodyrow', 'Body Row'],
  ['pull machine', 'Assisted Pull-Up Machine'],
  ['pull', 'Weighted Pull-Up'],
  ['shoulder press geel', 'Machine Shoulder Press'],
  ['shoulder press', 'Machine Shoulder Press'],
  ['skull crushers', 'Eccentric Skull Crushers'],
  ['skullcrushers', 'Eccentric Skull Crushers'],
  ['egyptian lateral raise', 'Egyptian Lateral Raise'],
  ["lateral raise 21's", "Lateral Raise 21's"],
  ['lateral raise 21’s', "Lateral Raise 21's"],
  ['overhead tricep extension', 'Overhead Tricep Ext'],
  ['overhead tricep', 'Overhead Tricep Ext'],
  ['tricep extension', 'Tricep Pushdown'],
  ['tricep semi straight bar', 'Tricep Pushdown'],
  ['tricep straight bar medium', 'Tricep Pushdown'],
  ['tricep straight medium', 'Tricep Pushdown'],
  ['tricep straight-bar', 'Tricep Pushdown'],
  ['tricep straight bar', 'Tricep Pushdown'],
  ['tricep cable', 'Tricep Pushdown'],
  ['tricep hoog', 'Tricep Pushdown'],
  ['tricep down', 'Tricep Pushdown'],
  ['tricep', 'Tricep Pushdown'],
  ['hammer curls', 'Hammer Curl'],
  ['hammercurl', 'Hammer Curl'],
  ['hammer curl', 'Hammer Curl'],
  ['bicep curls', 'Bicep Curl'],
  ['bicep curl', 'Bicep Curl'],
  ['bicep', 'Bicep Curl'],
  ['pronated curl', 'Pronated Curl'],
  ['supinated curl', 'Supinated Curl'],
  ['pronated', 'Pronated Curl'],
  ['supinated', 'Supinated Curl'],
  ['rope facepull', 'Rope Facepull'],
  ['facepull', 'Rope Facepull'],
  ['shrugs', 'Incline Dumbbell Shrug'],
  ['ohp', 'Overhead Press'],
  ['bench', 'Bench Press'],
  ['push', 'Bench Press'],
  ['dips', 'Dips'],
  ['dip', 'Dips'],
  ['squat', 'Squat'],
  ['deadlift', 'Deadlift'],
  ['flying ab crunch', 'Abdominal Crunch'],
  ['abdominal crunch', 'Abdominal Crunch'],
  ['situps normaal', 'Situps'],
  ['situps', 'Situps'],
  ['situp', 'Situps']
];

const SKIP_PATTERNS = [
  /^hardlopen\b/i,
  /^\d+\s*km\s*hardlopen/i,
  /^abs\s*$/i,
  /^lateral band walks/i,
  /^side lying leg lift/i,
  /^plank\b/i,
  /^[\d:]+\s*-\s*[\d:]+\s*(?:-\s*[\d:]+\s*)?plank/i,
  /^[\d:]+\s*plank/i
];

const MUSCLE_GROUP = {
  'Bench Press': 'push',
  'Close-Grip Bench Press': 'push',
  'Machine Shoulder Press': 'push',
  'Overhead Press': 'push',
  'Dips': 'push',
  'Eccentric Skull Crushers': 'push',
  'Tricep Pushdown': 'push',
  'Overhead Tricep Ext': 'push',
  'Egyptian Lateral Raise': 'push',
  "Lateral Raise 21's": 'push',
  'Cable Crossover': 'push',
  'Cable Crossover Decline': 'push',
  'Chest Press': 'push',
  'Reverse Pec Deck': 'pull',
  'Weighted Pull-Up': 'pull',
  'Assisted Pull-Up Machine': 'pull',
  'Body Row': 'pull',
  'Bent-Over Row': 'pull',
  'Upper Back Row': 'pull',
  'Seated Cable Row': 'pull',
  'Chest-Supported Row': 'pull',
  'Omni-Grip Lat Pulldown': 'pull',
  'Rope Facepull': 'pull',
  'Incline Dumbbell Shrug': 'pull',
  'Hammer Curl': 'pull',
  'Bicep Curl': 'pull',
  'Pronated Curl': 'pull',
  'Supinated Curl': 'pull',
  'Incline Dumbbell Curl': 'pull',
  'Cable Pullover': 'pull',
  'Squat': 'legs',
  'Romanian Deadlift': 'legs',
  'Deadlift': 'legs',
  'Single Leg Press': 'legs',
  'Leg Extension': 'legs',
  'Seated Leg Curls': 'legs',
  'Single-Leg Calf Raise': 'legs',
  'Hip Abductor': 'legs',
  'Hip Adductor': 'legs',
  'Single-Leg Hip Thrust': 'legs',
  'Weighted L-Sit Hold': 'legs',
  'Hack Squat': 'legs',
  'Abdominal Crunch': 'core',
  'Situps': 'core'
};

function normalizeName(raw) {
  const lower = raw.toLowerCase().trim();
  for (const [alias, canonical] of ALIASES) {
    if (lower === alias) return canonical;
  }
  return null;
}

function shouldSkip(line) {
  for (const p of SKIP_PATTERNS) if (p.test(line)) return true;
  return false;
}

// Splits a `40 - 35 - 30` style list. Only treats a dash as a separator when
// it has whitespace on both sides (or is at the very end of the string) — that
// way negative weights like `-28` aren't shredded into ['', '28'].
function splitValues(s) {
  if (s === undefined || s === null) return [];
  return String(s).split(/\s+-(?:\s+|$)/).map((part) => part.trim());
}

// Picks the value for set index `i` from a list, applying the user's rules:
//   - If fewer values than sets, repeat the last non-empty value.
//   - If a value is empty (e.g. trailing dash), walk backwards to the last
//     non-empty entry.
function pickWithCarry(arr, i) {
  const start = Math.min(i, arr.length - 1);
  for (let j = start; j >= 0; j--) {
    if (arr[j] != null && arr[j] !== '') return arr[j];
  }
  return '';
}

function parseRep(raw) {
  if (!raw) return null;
  const m = raw.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function parseWeight(raw) {
  if (raw === undefined || raw === null || raw === '') return { kg: 0, note: '' };
  const trimmed = String(raw).trim();
  if (trimmed === '' || trimmed === '0') return { kg: 0, note: '' };
  // band colors
  if (/^(g|r|zwart|rood\b.*|groen.*|geel|blauw.*)$/i.test(trimmed)) {
    return { kg: 0, note: trimmed };
  }
  // negative
  const neg = trimmed.match(/^-\s*(\d+(?:\.\d+)?)$/);
  if (neg) return { kg: -parseFloat(neg[1]), note: '' };
  // +5 style
  const plus = trimmed.match(/^\+\s*(\d+(?:\.\d+)?)$/);
  if (plus) return { kg: parseFloat(plus[1]), note: '' };
  // simple positive number
  const num = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (num) return { kg: parseFloat(num[1]), note: '' };
  // machine indicators like "20x2" or "2x25" or "stand 4" or "net boven 2"
  return { kg: 0, note: trimmed };
}

function extractParens(line) {
  const groups = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (c === ')') {
      depth--;
      if (depth === 0 && start >= 0) {
        groups.push({ start: start - 1, end: i + 1, body: line.slice(start, i) });
        start = -1;
      }
    }
  }
  const beforeFirst = groups.length > 0 ? line.slice(0, groups[0].start).trim() : line.trim();
  return { beforeFirst, groups };
}

function inferWorkoutName(exerciseNames) {
  const names = exerciseNames.map((n) => n.toLowerCase());
  const has = (sub) => names.some((n) => n.includes(sub));
  const groups = exerciseNames.map((n) => MUSCLE_GROUP[n]).filter(Boolean);
  const legs = groups.filter((g) => g === 'legs').length;
  const push = groups.filter((g) => g === 'push').length;
  const pull = groups.filter((g) => g === 'pull').length;

  if (legs >= push && legs >= pull && legs > 0) {
    return has('romanian deadlift') ? 'Legs 1' : 'Legs 2';
  }
  if (pull > push && pull > 0) {
    if (has('omni-grip') || has('lat pulldown') || has('chest-supported') || has('shrug') || has('seated cable') || has('pronated') || has('supinated') || has('facepull')) {
      return 'Pull 2';
    }
    return 'Pull 1';
  }
  if (push > 0) {
    if (has('overhead press') || has('close-grip') || has('cable crossover') || has('overhead tricep')) {
      return 'Push 2';
    }
    return 'Push 1';
  }
  return 'Mixed';
}

function parseExerciseLine(line, warnings, dateForWarn) {
  const { beforeFirst, groups } = extractParens(line);
  if (groups.length === 0) {
    // bare exercise name with no rep/weight data — silently skip
    return [];
  }

  // strip leading number (and optional /number for combined rows): "33/27 pronated/supinated curl"
  let nameRaw = beforeFirst.replace(/^\d+(?:\/\d+)?\s+/, '').trim();
  if (!nameRaw) return [];

  // Combined exercise detection: name contains "/" AND first paren has "/"
  const isCombined = nameRaw.includes('/') && groups[0].body.includes('/');

  // Trailing groups beyond [reps, weights] become notes
  const trailingNotes = groups.slice(2).map((g) => g.body).join('; ');

  if (isCombined) {
    // Split name; assume both halves share the suffix from the right.
    // e.g. "pronated/supinated curl" → ["pronated curl", "supinated curl"]
    // e.g. "33/27 pronated/supinated curl" → above (we already stripped leading)
    const slashIdx = nameRaw.indexOf('/');
    // Find the trailing common word(s) after the second name
    // Approach: split nameRaw by spaces, find the slash-containing token, replace.
    const tokens = nameRaw.split(/\s+/);
    const slashTokIdx = tokens.findIndex((t) => t.includes('/'));
    if (slashTokIdx < 0) {
      // fallback to old logic
      const left = nameRaw.slice(0, slashIdx).trim();
      const right = nameRaw.slice(slashIdx + 1).trim();
      return processCombined(left, right, groups, trailingNotes, warnings, dateForWarn);
    }
    const slashTok = tokens[slashTokIdx];
    const [leftBase, rightBase] = slashTok.split('/');
    const suffixTokens = tokens.slice(slashTokIdx + 1);
    const suffix = suffixTokens.join(' ');
    const leftName = `${leftBase} ${suffix}`.trim();
    const rightName = `${rightBase} ${suffix}`.trim();
    return processCombined(leftName, rightName, groups, trailingNotes, warnings, dateForWarn);
  }

  // Single exercise
  const canonical = normalizeName(nameRaw);
  if (!canonical) {
    warnings.push(`${dateForWarn}: unrecognized exercise "${nameRaw}" — line: "${line}"`);
    return [];
  }

  const repsRaw = splitValues(groups[0].body);
  const weightsRaw = groups[1] ? splitValues(groups[1].body) : [];

  const sets = [];
  const setNotes = [];
  for (let i = 0; i < repsRaw.length; i++) {
    const reps = parseRep(repsRaw[i]);
    if (reps == null || reps === 0) continue;
    const wRaw = pickWithCarry(weightsRaw, i);
    const w = parseWeight(wRaw);
    if (w.note) setNotes.push(`set ${sets.length + 1}: ${w.note}`);
    sets.push({ reps, weight: w.kg });
  }
  if (sets.length === 0) return [];

  const notes = [trailingNotes, setNotes.join('; ')].filter(Boolean).join(' · ');
  return [{ name: canonical, sets, notes }];
}

function processCombined(leftName, rightName, groups, trailingNotes, warnings, dateForWarn) {
  const left = normalizeName(leftName);
  const right = normalizeName(rightName);
  if (!left || !right) {
    warnings.push(`${dateForWarn}: combined unrecognized "${leftName}" / "${rightName}"`);
    return [];
  }
  const repsRaw = splitValues(groups[0].body);
  const weightsRaw = groups[1] ? splitValues(groups[1].body) : [];

  const leftSets = [];
  const rightSets = [];
  for (let i = 0; i < repsRaw.length; i++) {
    const [lr, rr] = repsRaw[i].split('/').map((s) => s.trim());
    const wRaw = pickWithCarry(weightsRaw, i) || '0';
    const [lw, rw] = wRaw.split('/').map((s) => s.trim());
    const lReps = parseRep(lr);
    const rReps = parseRep(rr);
    if (lReps != null && lReps > 0) {
      const w = parseWeight(lw ?? '0');
      leftSets.push({ reps: lReps, weight: w.kg });
    }
    if (rReps != null && rReps > 0) {
      const w = parseWeight(rw ?? lw ?? '0');
      rightSets.push({ reps: rReps, weight: w.kg });
    }
  }
  const out = [];
  if (leftSets.length > 0) out.push({ name: left, sets: leftSets, notes: trailingNotes });
  if (rightSets.length > 0) out.push({ name: right, sets: rightSets, notes: trailingNotes });
  return out;
}

function parseDateHeader(line) {
  const m = line.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+(.+))?$/);
  if (!m) return null;
  const [, d, mo, y, rest] = m;
  const year = y.length === 2 ? '20' + y : y;
  const iso = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const out = { date: iso, bodyWeight: null, bodyFat: null, headerNotes: '' };
  if (rest) {
    const bw = rest.match(/(\d+(?:\.\d+)?)\s*kg/i);
    const bf = rest.match(/(\d+(?:\.\d+)?)\s*%/);
    if (bw) out.bodyWeight = parseFloat(bw[1]);
    if (bf) out.bodyFat = parseFloat(bf[1]);
    const note = rest
      .replace(/\d+(?:\.\d+)?\s*kg/gi, '')
      .replace(/\d+(?:\.\d+)?\s*%/g, '')
      .replace(/[()]/g, '')
      .trim();
    if (note) out.headerNotes = note;
  }
  return out;
}

function exercisesEqual(name, list) {
  const idx = list.findIndex((e) => e.name === name);
  return idx;
}

function main() {
  const raw = readFileSync(RAW, 'utf8');
  const lines = raw.split('\n');
  const workouts = [];
  let current = null;
  let warnings = [];
  let seenFirstDate = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === '———————' || /^—+$/.test(line)) continue;

    const header = parseDateHeader(line);
    if (header) {
      if (current && current.exercises.length > 0) workouts.push(finalize(current));
      current = {
        date: header.date,
        bodyWeight: header.bodyWeight,
        bodyFat: header.bodyFat,
        notes: header.headerNotes,
        exercises: []
      };
      seenFirstDate = true;
      continue;
    }

    if (!current) {
      // Orphan "Sporten" prelude. Open a virtual session dated the day before the first real entry.
      if (!seenFirstDate) {
        if (line.toLowerCase() === 'sporten') continue;
        // Lazily create the prelude session
        current = {
          date: '2024-07-14',
          bodyWeight: null,
          bodyFat: null,
          notes: 'Sporten (undated)',
          exercises: []
        };
      } else {
        continue;
      }
    }

    if (shouldSkip(line)) continue;

    const parsed = parseExerciseLine(line, warnings, current.date);
    for (const ex of parsed) {
      const idx = exercisesEqual(ex.name, current.exercises);
      if (idx >= 0) {
        // merge sets if the same exercise repeats in a session
        current.exercises[idx].sets.push(...ex.sets);
        if (ex.notes) {
          current.exercises[idx].notes = [current.exercises[idx].notes, ex.notes].filter(Boolean).join(' · ');
        }
      } else {
        current.exercises.push(ex);
      }
    }
  }
  if (current && current.exercises.length > 0) workouts.push(finalize(current));

  const allExerciseNames = new Set();
  let totalSets = 0;
  for (const w of workouts) {
    for (const ex of w.exercises) {
      allExerciseNames.add(ex.name);
      totalSets += ex.sets.length;
    }
  }

  const payload = { version: 1, generatedAt: new Date().toISOString(), workouts };
  writeFileSync(OUT, JSON.stringify(payload, null, 2));

  console.log(`Parsed ${workouts.length} workouts · ${totalSets} sets · ${allExerciseNames.size} unique exercises`);
  console.log(`Wrote ${OUT}`);
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warnings:`);
    for (const w of warnings) console.log('  - ' + w);
  } else {
    console.log('No warnings.');
  }
}

function finalize(w) {
  const exerciseNames = w.exercises.map((e) => e.name);
  const inferred = inferWorkoutName(exerciseNames);
  const noteBits = [];
  if (w.bodyWeight) noteBits.push(`BW ${w.bodyWeight} kg`);
  if (w.bodyFat) noteBits.push(`${w.bodyFat}% BF`);
  if (w.notes) noteBits.push(w.notes);
  const exerciseNotes = w.exercises.map((e) => e.notes).filter(Boolean);
  if (exerciseNotes.length) noteBits.push(...exerciseNotes);
  return {
    date: w.date,
    name: inferred,
    notes: noteBits.join(' · '),
    bodyWeight: w.bodyWeight,
    bodyFat: w.bodyFat,
    exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets }))
  };
}

main();
