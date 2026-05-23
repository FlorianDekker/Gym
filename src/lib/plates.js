const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export function platesPerSide(targetKg, barKg = 20) {
  const perSide = (targetKg - barKg) / 2;
  if (perSide <= 0) return { perSide: 0, plates: [], leftover: 0, valid: targetKg >= barKg };
  let remaining = perSide;
  const used = [];
  for (const p of PLATES) {
    let count = 0;
    while (remaining >= p - 1e-6) {
      remaining -= p;
      count++;
    }
    if (count > 0) used.push({ kg: p, count });
  }
  return {
    perSide,
    plates: used,
    leftover: Math.max(0, remaining),
    valid: targetKg >= barKg
  };
}
