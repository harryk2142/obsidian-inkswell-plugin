/**
 * Judging a data.json payload before trusting it (#61). Pure (no Obsidian
 * import) so the rules are unit-tested.
 *
 * Obsidian's `loadData()` returns `undefined` — after logging "failed to read
 * JSON" — for a missing, empty, truncated or corrupt file. A sync tool can
 * leave data.json in exactly that state for a moment (mid-write, or an iCloud
 * file not downloaded yet). Treating that as "no settings" starts Inkswell on
 * defaults, and its next save writes those defaults over the writer's real
 * settings. So a payload is only USABLE when it is a plain object carrying a
 * `settings` object — the shape `persist` always writes (AGENTS gotcha 6).
 */

export type StoredData = Record<string, unknown> & { settings?: unknown };

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** A data.json payload Inkswell can load or adopt: `{ settings: {…}, … }`. */
export function isUsableData(raw: unknown): raw is StoredData & { settings: Record<string, unknown> } {
  return isPlainObject(raw) && isPlainObject(raw["settings"]);
}

/**
 * One line describing the shape-the-tool settings a backup holds — enough for
 * a writer to recognise the backup from before something went wrong:
 * "3 custom codex types · 2 renamed types · rail arranged". Settings left at
 * their defaults say so.
 */
export function settingsSummary(settings: unknown): string {
  if (!isPlainObject(settings)) return "no settings";
  const parts: string[] = [];
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const customs = Array.isArray(settings["customCategories"]) ? settings["customCategories"].length : 0;
  if (customs) parts.push(count(customs, "custom codex type", "custom codex types"));
  const renamed = isPlainObject(settings["categoryOverrides"]) ? Object.keys(settings["categoryOverrides"]).length : 0;
  if (renamed) parts.push(count(renamed, "renamed type", "renamed types"));
  const templates = Array.isArray(settings["customBeatTemplates"]) ? settings["customBeatTemplates"].length : 0;
  if (templates) parts.push(count(templates, "beat template", "beat templates"));
  const lists = isPlainObject(settings["listOverrides"]) ? Object.keys(settings["listOverrides"]).length : 0;
  if (lists) parts.push(count(lists, "customized list", "customized lists"));
  if (isPlainObject(settings["railLayout"])) parts.push("rail arranged");
  if (isPlainObject(settings["challenge"])) parts.push("writing challenge");
  return parts.length > 0 ? parts.join(" · ") : "default settings";
}
