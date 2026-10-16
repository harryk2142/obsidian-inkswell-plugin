/**
 * Number repeated labels by occurrence — `Alice (1)`, `Bob`, `Alice (2)` — so
 * menu items for same-named things stay tellable apart (chapters may share a
 * name, #58). Unique labels pass through unchanged. Pure.
 */
export function numberRepeats(labels: readonly string[]): string[] {
  const total = new Map<string, number>();
  for (const l of labels) total.set(l, (total.get(l) ?? 0) + 1);
  const seen = new Map<string, number>();
  return labels.map((l) => {
    if ((total.get(l) ?? 0) < 2) return l;
    const n = (seen.get(l) ?? 0) + 1;
    seen.set(l, n);
    return `${l} (${n})`;
  });
}
