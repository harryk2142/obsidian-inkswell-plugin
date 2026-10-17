/**
 * Rolling backups of the plugin's data.json (settings, writing log, sprint
 * history, ideas inbox — everything that does NOT live in vault notes).
 *
 * Why: Obsidian's File Recovery only snapshots VAULT files, so data.json has
 * no safety net at all — a corrupted write, a failed migration, or a bug that
 * resets settings would silently destroy months of writing history. One
 * backup per calendar day is written on plugin load — before the new session
 * writes anything — into `<plugin dir>/backups/`, pruned to the newest KEEP.
 *
 * Restore is manual by design (documented in the README and Help → Your data):
 * disable Inkswell, copy a backup over data.json, re-enable. No UI, no magic —
 * a recovery path that can't itself have bugs that lose data.
 *
 * All I/O goes through `vault.adapter`: the plugin config dir is OUTSIDE the
 * vault's file index, so the Vault API (and trashFile) can't address it — the
 * adapter is the only door. `adapter.remove` here deletes only our own pruned
 * backup files, never user content.
 */

import { App, normalizePath } from "obsidian";
import { StoredData, isUsableData } from "./stored-data";

/** How many daily backups to keep. */
const KEEP = 7;

const BACKUP_RE = /\/data-\d{4}-\d{2}-\d{2}\.json$/;

function two(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar date, e.g. "2026-08-11" (matches the user's day, not UTC). */
function dayStamp(now: Date): string {
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/**
 * Write today's backup of `<pluginDir>/data.json` (skipped when one already
 * exists, the file is missing — fresh install — or its JSON doesn't parse:
 * a corrupt current file must never overwrite the good history), then prune
 * to the newest {@link KEEP}. Never throws — a backup failure must not break
 * plugin load; it logs and moves on.
 */
export async function backupPluginData(
  app: App,
  pluginDir: string,
  now: Date = new Date()
): Promise<void> {
  try {
    const adapter = app.vault.adapter;
    const dataPath = normalizePath(`${pluginDir}/data.json`);
    if (!(await adapter.exists(dataPath))) return;
    const raw = await adapter.read(dataPath);
    if (!raw.trim()) return;
    try {
      JSON.parse(raw);
    } catch {
      console.warn(
        "[Inkswell] data.json doesn't parse — skipping today's backup so the existing backups stay good. " +
          "Restore instructions: README → Backups."
      );
      return;
    }

    const dir = normalizePath(`${pluginDir}/backups`);
    if (!(await adapter.exists(dir))) await adapter.mkdir(dir);
    const target = normalizePath(`${dir}/data-${dayStamp(now)}.json`);
    if (!(await adapter.exists(target))) {
      await adapter.write(target, raw);
    }

    // Prune: date-stamped names sort chronologically, keep the newest KEEP.
    const listing = await adapter.list(dir);
    const backups = listing.files.filter((p) => BACKUP_RE.test(`/${p}`)).sort();
    for (const stale of backups.slice(0, Math.max(0, backups.length - KEEP))) {
      await adapter.remove(stale);
    }
  } catch (e) {
    console.error("[Inkswell] Couldn't write the daily data.json backup", e);
  }
}

/** One readable daily backup. */
export interface BackupSnapshot {
  /** Its calendar day, e.g. "2026-10-15". */
  date: string;
  path: string;
  data: StoredData & { settings: Record<string, unknown> };
}

/**
 * Every usable daily backup (`isUsableData`), newest first. Unparseable or
 * settings-less files are skipped. Never throws — no backups is just [].
 */
export async function listBackups(app: App, pluginDir: string): Promise<BackupSnapshot[]> {
  try {
    const adapter = app.vault.adapter;
    const dir = normalizePath(`${pluginDir}/backups`);
    if (!(await adapter.exists(dir))) return [];
    const files = (await adapter.list(dir)).files.filter((p) => BACKUP_RE.test(`/${p}`)).sort().reverse();
    const out: BackupSnapshot[] = [];
    for (const path of files) {
      try {
        const data: unknown = JSON.parse(await adapter.read(path));
        if (!isUsableData(data)) continue;
        const date = /(\d{4}-\d{2}-\d{2})\.json$/.exec(path)?.[1] ?? path;
        out.push({ date, path, data });
      } catch {
        // An unreadable backup is skipped; the others still count.
      }
    }
    return out;
  } catch (e) {
    console.error("[Inkswell] Couldn't list the data.json backups", e);
    return [];
  }
}

/**
 * Copy the current data.json aside — `<pluginDir>/<prefix>-<stamp>.json` —
 * before Inkswell replaces it (an unreadable file it's about to recover past, or
 * the settings a restore is about to overwrite). The name doesn't match the
 * daily-backup pattern, so pruning never removes it. Returns the copy's path, or
 * null when there was nothing to keep. Never throws.
 */
export async function keepDataCopy(
  app: App,
  pluginDir: string,
  prefix: string,
  now: Date = new Date()
): Promise<string | null> {
  try {
    const adapter = app.vault.adapter;
    const dataPath = normalizePath(`${pluginDir}/data.json`);
    if (!(await adapter.exists(dataPath))) return null;
    const raw = await adapter.read(dataPath);
    if (!raw.trim()) return null;
    const stamp = `${dayStamp(now)}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
    const target = normalizePath(`${pluginDir}/${prefix}-${stamp}.json`);
    await adapter.write(target, raw);
    return target;
  } catch (e) {
    console.error("[Inkswell] Couldn't keep a copy of data.json", e);
    return null;
  }
}
