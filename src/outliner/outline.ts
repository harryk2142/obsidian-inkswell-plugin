/**
 * The Act › Chapter › Scene outline tree (pure, Obsidian-free, unit-tested).
 *
 * This is the authoritative structural model. The manuscript's flat, ordered
 * scene list (`longform.scenes`) and each scene's `act`/`chapter` strings are
 * DERIVED output that Inkswell writes from this tree — not the source of truth.
 * Compatibility is preserved: `serializeOutline` still yields a valid indented
 * scene list and the StoryLine-compatible scene strings.
 *
 * Identity: acts/chapters by stable `id` (from structure.ts); scenes by `title`
 * (a scene's title is its file basename — unique within a project, as Longform
 * requires). A chapter is a run of consecutive scenes, NOT every scene with its
 * title, so chapters may share a name (#58; see `chapterRuns`). Nesting is
 * optional — a chapter may be act-less (loose) and a scene may be chapter-less
 * (unassigned); those live in dedicated buckets.
 */

import { IndentedScene } from "../projects/types";
import { StructureGroup, newStructureId } from "./structure";

export interface SceneRef {
  title: string;
  path: string | null;
  indent: number;
}
export interface ChapterNode {
  id: string;
  title: string;
  targetWords?: number;
  scenes: SceneRef[];
}
export interface ActNode {
  id: string;
  title: string;
  chapters: ChapterNode[];
}
export interface OutlineTree {
  acts: ActNode[];
  /** Chapters not assigned to any act. */
  looseChapters: ChapterNode[];
  /** Scenes not assigned to any chapter. */
  unassignedScenes: SceneRef[];
}

/** A chapter as it occurs in the manuscript: a run of consecutive scenes. */
export interface ChapterRun {
  /** Stable node id: the paired config entry's id, else derived
   *  (`c:<title>`, then `c:<title>~2`, `~3`… for further runs of that title). */
  id: string;
  title: string;
  /** Manuscript indices of the run's scenes (consecutive, ascending). */
  indices: number[];
  /** The config entry this run is paired with, if any. */
  cfg?: StructureGroup;
}

export interface ChapterRunsResult {
  /** Populated chapters, manuscript order. */
  runs: ChapterRun[];
  /** Config entries no run claimed — planned (empty) chapters, config order. */
  planned: Array<{ id: string; cfg: StructureGroup }>;
  /** Manuscript indices of scenes with no chapter string. */
  unassigned: number[];
}

/**
 * THE chapter model (#58): split the manuscript into chapters and pair each
 * with its config entry. Every chapter surface derives from this (directly or
 * via `buildOutline`) — never group scenes by chapter string with a Map, which
 * merges two chapters that share a name.
 *
 *  - A run is consecutive scenes with the same (trimmed) chapter string. A new
 *    run also starts at a valid ANCHOR — a scene some config entry names as its
 *    `firstScene` whose own chapter string equals that entry's title — so two
 *    same-named chapters side by side stay apart. Blank strings are unassigned
 *    and break runs.
 *  - Pairing: an anchored run takes its anchoring entry; every other run takes
 *    the first unclaimed entry with its title, in config order (projects saved
 *    before anchors existed behave exactly as before); otherwise its id is
 *    derived. Entries no run claims are planned chapters.
 *
 * Pure and deterministic, so it's unit-testable.
 */
export function chapterRuns(
  scenes: ReadonlyArray<{ title: string; chapter?: string }>,
  chapters: StructureGroup[] | undefined
): ChapterRunsResult {
  const cfgs = (chapters ?? []).filter((c) => c && typeof c.title === "string");
  const labels = scenes.map((s) => (s.chapter ?? "").trim());
  const indexOf = new Map<string, number>();
  scenes.forEach((s, i) => {
    if (!indexOf.has(s.title)) indexOf.set(s.title, i);
  });

  // Valid anchors: scene index → the entry it opens (first entry wins).
  const anchorAt = new Map<number, StructureGroup>();
  for (const c of cfgs) {
    if (typeof c.firstScene !== "string") continue;
    const i = indexOf.get(c.firstScene);
    if (i === undefined || !labels[i] || labels[i] !== c.title || anchorAt.has(i)) continue;
    anchorAt.set(i, c);
  }

  const runs: ChapterRun[] = [];
  const unassigned: number[] = [];
  let cur: ChapterRun | null = null;
  labels.forEach((label, i) => {
    if (!label) {
      unassigned.push(i);
      cur = null;
      return;
    }
    if (cur && cur.title === label && !anchorAt.has(i)) {
      cur.indices.push(i);
      return;
    }
    cur = { id: "", title: label, indices: [i] };
    runs.push(cur);
  });

  // Pair: anchored runs first (exact), then title order for the rest.
  const claimed = new Set<StructureGroup>();
  for (const run of runs) {
    const cfg = anchorAt.get(run.indices[0]);
    if (cfg) {
      run.cfg = cfg;
      claimed.add(cfg);
    }
  }
  for (const run of runs) {
    if (run.cfg) continue;
    const cfg = cfgs.find((c) => c.title === run.title && !claimed.has(c));
    if (cfg) {
      run.cfg = cfg;
      claimed.add(cfg);
    }
  }

  // Ids: config ids win; derived ids are deterministic and never collide. The
  // first run of a title derives `c:<title>`; a later run of the same title
  // (configured or not before it) derives `c:<title>~<n>` — the marker
  // `serializeOutline` uses to drop it once emptied.
  const used = new Set<string>();
  for (const c of cfgs) if (typeof c.id === "string" && c.id) used.add(c.id);
  const derive = (title: string, occurrence: number): string => {
    let n = occurrence;
    let id = n > 1 ? `c:${title}~${n}` : `c:${title}`;
    while (used.has(id)) id = `c:${title}~${++n}`;
    used.add(id);
    return id;
  };
  const taken = new Set<string>();
  const idFor = (cfg: StructureGroup | undefined, title: string, occurrence: number): string => {
    const own = cfg && typeof cfg.id === "string" && cfg.id && !taken.has(cfg.id) ? cfg.id : null;
    const id = own ?? derive(title, occurrence);
    taken.add(id);
    return id;
  };
  const seen = new Map<string, number>();
  for (const run of runs) {
    const occurrence = (seen.get(run.title) ?? 0) + 1;
    seen.set(run.title, occurrence);
    run.id = idFor(run.cfg, run.title, occurrence);
  }
  const planned = cfgs
    .filter((c) => !claimed.has(c))
    .map((cfg) => ({ id: idFor(cfg, cfg.title, 1), cfg }));

  return { runs, planned, unassigned };
}

/** An id `chapterRuns` derived for a second-or-later unconfigured run of a
 *  title — an artifact of the split, dropped once it empties. */
export function isDerivedDuplicateId(id: string): boolean {
  return /^c:.*~\d+$/.test(id);
}

/**
 * Reconstruct the tree from the stored config arrays + the manuscript scenes.
 *
 * Chapters come from {@link chapterRuns}: config is authoritative for
 * id/target/`actId` and for the order of planned entries. Existing projects
 * carry chapter/act *strings* on scenes with little or no config — so a run
 * with no config entry is **adopted** with a derived id, and its act is
 * *inferred* from its scenes' `act` string (a derived act gets id `a:<title>`).
 * This makes the first render mirror the project's current implicit structure;
 * once the user drags or edits, `applyOutline` persists everything explicitly.
 * Deterministic (no random), so it's unit-testable.
 *
 * Ordering: chapters by manuscript position (planned ones last, in config
 * order); acts by config order, then derived acts by first appearance. A scene
 * with no chapter is unassigned.
 */
export function buildOutline(
  acts: StructureGroup[] | undefined,
  chapters: StructureGroup[] | undefined,
  scenes: Array<{ title: string; path: string | null; indent: number; chapter?: string; act?: string }>
): OutlineTree {
  const actCfg = acts ?? [];
  const actCfgById = new Map(actCfg.map((a) => [a.id, a] as const));
  const actCfgByTitle = new Map(actCfg.map((a) => [a.title, a] as const));
  const refs: SceneRef[] = scenes.map((s) => ({ title: s.title, path: s.path, indent: s.indent }));
  const { runs, planned, unassigned } = chapterRuns(scenes, chapters);

  // 1. Each chapter's node + its act id (config wins; else inferred from the
  //    run's scenes' act strings, first non-blank).
  const derivedActId = (title: string) => `a:${title}`;
  const resolved: Array<{ node: ChapterNode; actId: string | null }> = [];
  for (const run of runs) {
    const cfg = run.cfg;
    const actGuess = run.indices.map((i) => (scenes[i].act ?? "").trim()).find((a) => a);
    let actId: string | null = null;
    if (cfg?.actId && actCfgById.has(cfg.actId)) actId = cfg.actId;
    else if (actGuess) actId = actCfgByTitle.get(actGuess)?.id ?? derivedActId(actGuess);
    resolved.push({
      node: {
        id: run.id,
        title: run.title,
        ...(cfg?.targetWords ? { targetWords: cfg.targetWords } : {}),
        scenes: run.indices.map((i) => refs[i]),
      },
      actId,
    });
  }
  for (const { id, cfg } of planned) {
    resolved.push({
      node: { id, title: cfg.title, ...(cfg.targetWords ? { targetWords: cfg.targetWords } : {}), scenes: [] },
      actId: cfg.actId && actCfgById.has(cfg.actId) ? cfg.actId : null,
    });
  }

  // 2. Build the act list: configured acts (array order) + derived acts (by first
  //    appearance among chapters), then attach chapters. Chapters with no act are loose.
  const actNodeById = new Map<string, ActNode>();
  const actOrder: ActNode[] = [];
  const ensureAct = (id: string, title: string) => {
    let node = actNodeById.get(id);
    if (!node) {
      node = { id, title, chapters: [] };
      actNodeById.set(id, node);
      actOrder.push(node);
    }
    return node;
  };
  for (const a of actCfg) ensureAct(a.id, a.title); // configured acts first, in array order
  const looseChapters: ChapterNode[] = [];
  for (const { node, actId } of resolved) {
    if (!actId) {
      looseChapters.push(node);
      continue;
    }
    const actTitle = actCfgById.get(actId)?.title ?? actId.replace(/^a:/, "");
    ensureAct(actId, actTitle).chapters.push(node);
  }

  return { acts: actOrder, looseChapters, unassignedScenes: unassigned.map((i) => refs[i]) };
}

export interface OutlineWrites {
  /** New manuscript order (flattened tree). */
  order: IndentedScene[];
  /** sceneTitle → chapter string to write ("" clears). */
  sceneChapter: Map<string, string>;
  /** sceneTitle → act string to write ("" clears). */
  sceneAct: Map<string, string>;
  /** Rebuilt acts config array (order preserved). */
  acts: StructureGroup[];
  /** Rebuilt chapters config array (order = acts' chapters then loose; actId set). */
  chapters: StructureGroup[];
}

/**
 * Flatten the tree back into the derived writes. Manuscript order is
 * act→chapter→scene, then loose chapters' scenes, then unassigned scenes. Each
 * scene keeps its own `indent`. Scene strings are denormalized: a scene's
 * `chapter` = its chapter title, its `act` = that chapter's act title (blank when
 * loose/unassigned). Each populated chapter records its `firstScene`, which is
 * what keeps two same-named chapters apart on the next build.
 */
export function serializeOutline(tree: OutlineTree): OutlineWrites {
  const order: IndentedScene[] = [];
  const sceneChapter = new Map<string, string>();
  const sceneAct = new Map<string, string>();
  const acts: StructureGroup[] = [];
  const chapters: StructureGroup[] = [];

  const emitChapter = (c: ChapterNode, actTitle: string, actId: string | undefined) => {
    // A second same-named run the build split off, now emptied (its scenes were
    // dragged back where they belong): nothing to keep.
    if (c.scenes.length === 0 && isDerivedDuplicateId(c.id)) return;
    chapters.push({
      id: c.id,
      title: c.title,
      ...(c.targetWords ? { targetWords: c.targetWords } : {}),
      ...(actId ? { actId } : {}),
      ...(c.scenes.length > 0 ? { firstScene: c.scenes[0].title } : {}),
    });
    for (const s of c.scenes) {
      order.push({ title: s.title, indent: s.indent });
      sceneChapter.set(s.title, c.title);
      sceneAct.set(s.title, actTitle);
    }
  };

  for (const a of tree.acts) {
    acts.push({ id: a.id, title: a.title });
    for (const c of a.chapters) emitChapter(c, a.title, a.id);
  }
  for (const c of tree.looseChapters) emitChapter(c, "", undefined);
  for (const s of tree.unassignedScenes) {
    order.push({ title: s.title, indent: s.indent });
    sceneChapter.set(s.title, "");
    sceneAct.set(s.title, "");
  }

  return { order, sceneChapter, sceneAct, acts, chapters };
}

// --- Tree transforms (pure; each returns a new tree) ------------------------

/** All chapter nodes across acts + loose, in display order. */
function allChapters(tree: OutlineTree): ChapterNode[] {
  return [...tree.acts.flatMap((a) => a.chapters), ...tree.looseChapters];
}

/** Deep-ish clone so callers can treat transforms as immutable. */
function clone(tree: OutlineTree): OutlineTree {
  return {
    acts: tree.acts.map((a) => ({ ...a, chapters: a.chapters.map((c) => ({ ...c, scenes: [...c.scenes] })) })),
    looseChapters: tree.looseChapters.map((c) => ({ ...c, scenes: [...c.scenes] })),
    unassignedScenes: [...tree.unassignedScenes],
  };
}

/** Remove a scene from wherever it lives; returns [tree, removedRef|null]. */
function detachScene(tree: OutlineTree, title: string): SceneRef | null {
  let found: SceneRef | null = null;
  const pull = (list: SceneRef[]) => {
    const i = list.findIndex((s) => s.title === title);
    if (i >= 0) {
      found = list[i];
      list.splice(i, 1);
    }
  };
  for (const a of tree.acts) for (const c of a.chapters) pull(c.scenes);
  for (const c of tree.looseChapters) pull(c.scenes);
  pull(tree.unassignedScenes);
  return found;
}

/**
 * Move a scene into a chapter (`targetChapterId`) or the unassigned bucket
 * (null), placing it relative to `anchorTitle` — before it, or after it when
 * `after` is true. Appended when the anchor is null/absent.
 */
export function moveScene(
  tree: OutlineTree,
  sceneTitle: string,
  targetChapterId: string | null,
  anchorTitle: string | null = null,
  after = false
): OutlineTree {
  const next = clone(tree);
  const ref = detachScene(next, sceneTitle);
  if (!ref) return tree;
  const dest =
    targetChapterId === null
      ? next.unassignedScenes
      : allChapters(next).find((c) => c.id === targetChapterId)?.scenes;
  if (!dest) return tree;
  insertRelative(dest, ref, (s) => s.title === anchorTitle, after);
  return next;
}

/** Move a chapter into an act (`targetActId`) or the loose bucket (null). */
export function moveChapter(
  tree: OutlineTree,
  chapterId: string,
  targetActId: string | null,
  anchorChapterId: string | null = null,
  after = false
): OutlineTree {
  const next = clone(tree);
  let moved: ChapterNode | null = null;
  const pull = (list: ChapterNode[]) => {
    const i = list.findIndex((c) => c.id === chapterId);
    if (i >= 0) {
      moved = list[i];
      list.splice(i, 1);
    }
  };
  for (const a of next.acts) pull(a.chapters);
  pull(next.looseChapters);
  if (!moved) return tree;
  const dest =
    targetActId === null ? next.looseChapters : next.acts.find((a) => a.id === targetActId)?.chapters;
  if (!dest) return tree;
  insertRelative(dest, moved, (c) => c.id === anchorChapterId, after);
  return next;
}

/** Reorder an act relative to `anchorActId` (before, or after when `after`). */
export function moveAct(
  tree: OutlineTree,
  actId: string,
  anchorActId: string | null = null,
  after = false
): OutlineTree {
  const next = clone(tree);
  const i = next.acts.findIndex((a) => a.id === actId);
  if (i < 0) return tree;
  const [moved] = next.acts.splice(i, 1);
  insertRelative(next.acts, moved, (a) => a.id === anchorActId, after);
  return next;
}

/** Insert `item` before (or after) the first anchor match; append if no match. */
function insertRelative<T>(list: T[], item: T, isAnchor: (x: T) => boolean, after: boolean): void {
  const i = list.findIndex(isAnchor);
  if (i < 0) list.push(item);
  else list.splice(after ? i + 1 : i, 0, item);
}

/**
 * Rebase a desired manuscript order onto the CURRENT stored scene list, so an
 * outline computed from a (possibly stale) tree can never lose scenes created
 * or resurrect scenes deleted while the user was dragging:
 *  - desired entries whose title no longer exists are dropped (concurrently
 *    deleted — a reorder must not re-add them);
 *  - current entries the desired order doesn't know are appended at the end,
 *    keeping their stored indent (concurrently created — they survive, showing
 *    up as loose scenes for the next render to place).
 */
export function rebaseSceneOrder(
  desired: IndentedScene[],
  current: IndentedScene[]
): IndentedScene[] {
  const currentTitles = new Set(current.map((s) => s.title));
  const desiredTitles = new Set(desired.map((s) => s.title));
  const kept = desired.filter((s) => currentTitles.has(s.title));
  const appended = current.filter((s) => !desiredTitles.has(s.title));
  return [...kept, ...appended];
}

/**
 * Where a new scene for chapter `chapterId` belongs in the manuscript: after
 * the chapter's own last scene, else after the last scene of any chapter shown
 * before it (the order `serializeOutline` writes). `undefined` = nothing comes
 * before it, so the caller appends. Pair with an anchor write when the chapter
 * is empty — its first scene then can't fold into a same-named chapter just
 * before it.
 */
export function sceneSlotForChapter(tree: OutlineTree, chapterId: string): string | undefined {
  let last: string | undefined;
  for (const c of allChapters(tree)) {
    if (c.scenes.length > 0) last = c.scenes[c.scenes.length - 1].title;
    if (c.id === chapterId) return last;
  }
  return undefined;
}

/** A fresh empty chapter node (for "+ Add chapter"). */
export function newChapterNode(title: string): ChapterNode {
  return { id: newStructureId(), title, scenes: [] };
}
/** A fresh empty act node (for "+ Add act"). */
export function newActNode(title: string): ActNode {
  return { id: newStructureId(), title, chapters: [] };
}
