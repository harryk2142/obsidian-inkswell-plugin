/**
 * Calendar dates as `YYYY-MM-DD` keys — the format Obsidian's own date
 * properties and `<input type="date">` use. Pure (no Obsidian import), and
 * plain arithmetic rather than `Date`, so years below 100 aren't remapped to
 * the 1900s (an in-story date can be year 0042).
 */

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isLeap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30 and year 0000). */
export function isDateKey(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = KEY_RE.exec(v);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1 || mo < 1 || mo > 12 || d < 1) return false;
  const days = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return d <= days;
}

/**
 * A stored frontmatter value as a `YYYY-MM-DD` key, or null when it isn't a
 * calendar date. Accepts the key itself, an ISO date-time (keeps the date —
 * what an Obsidian "Date & time" property holds), or a `Date` (a YAML parser
 * that types timestamps; date-only YAML timestamps are UTC midnight).
 */
export function normalizeDate(raw: unknown): string | null {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const pad = (n: number, w = 2) => String(n).padStart(w, "0");
    const key = `${pad(raw.getUTCFullYear(), 4)}-${pad(raw.getUTCMonth() + 1)}-${pad(raw.getUTCDate())}`;
    return isDateKey(key) ? key : null;
  }
  if (typeof raw !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(raw.trim());
  return m && isDateKey(m[1]) ? m[1] : null;
}
