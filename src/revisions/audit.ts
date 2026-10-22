/**
 * Pure revision-checkpoint definitions and progress math (no Obsidian imports —
 * unit-testable). Implements a three-tier revision method, macro→micro: Story →
 * Scene → Prose, each tier a master checklist.
 *
 * - SCENE checkpoints are per-scene state (stored in scene frontmatter; see
 *   `audit-meta.ts`). The 14 checks below are the scene-level pass.
 * - STORY (18) and PROSE (5 grouped categories) checkpoints are project-level state
 *   (stored under `inkswell.revisionChecklist`; see `checklist.ts`). The prose tier
 *   keeps the internal id/const name "page" for back-compat — only its label changed.
 *
 * IDs are stable string constants: stored data keys off them, so labels can be
 * reworded without migrating frontmatter.
 */

import { ListOverride, applyGroupedOverride, visibleItems } from "../lib/list-override";

export interface Checkpoint {
  id: string;
  label: string;
}

export interface CheckpointGroup {
  id: string;
  label: string;
  items: Checkpoint[];
}

// --- Scene-level (14): per-scene checklist ---------------------------------

export type SceneCheckId =
  | "startsRight"
  | "described"
  | "goalConflict"
  | "shift"
  | "purpose"
  | "structure"
  | "tension"
  | "paced"
  | "researched"
  | "endsUncertain"
  | "transitions"
  | "narratorSwitch"
  | "perspective"
  | "consistent";

export const SCENE_CHECKPOINTS: { id: SceneCheckId; label: string }[] = [
  { id: "startsRight", label: "Beginnt an der richtigen Stelle" },
  { id: "described", label: "Anschaulich beschrieben" },
  { id: "goalConflict", label: "Hat ein Ziel und einen Konflikt" },
  { id: "shift", label: "Enthält eine Wendung (etwas verändert sich)" },
  { id: "purpose", label: "Hat einen klaren Zweck" },
  { id: "structure", label: "Hat eine solide Struktur" },
  { id: "tension", label: "Hat genügend Spannung" },
  { id: "paced", label: "Ausgewogen und gut getaktet" },
  { id: "researched", label: "Sorgfältig recherchiert" },
  { id: "endsUncertain", label: "Endet mit einem Gefühl der Ungewissheit" },
  { id: "transitions", label: "Geht nahtlos in die nächste Szene über" },
  { id: "narratorSwitch", label: "Wechselt nahtlos zwischen Erzählperspektiven (mehrere Perspektiven)" },
  { id: "perspective", label: "Wird aus der richtigen Perspektive erzählt (mehrere Perspektiven)" },
  { id: "consistent", label: "Ist konsistent" },
];

export const SCENE_CHECK_IDS: SceneCheckId[] = SCENE_CHECKPOINTS.map((c) => c.id);

// --- Story-level (18): project checklist -----------------------------------

export const STORY_CHECKPOINTS: Checkpoint[] = [
  { id: "structure", label: "Hat eine solide Struktur" },
  { id: "startsRight", label: "Beginnt an der richtigen Stelle" },
  { id: "reveals", label: "Enthüllt Informationen auf fesselnde Weise" },
  { id: "heroGoals", label: "Die Hauptfigur hat durchgehend klare Ziele und glaubwürdige Motive" },
  { id: "conflict", label: "Hat genügend Konflikt" },
  { id: "stakes", label: "Es steht genug auf dem Spiel" },
  { id: "tension", label: "Hat genügend Spannung" },
  { id: "believable", label: "Ist glaubwürdig" },
  { id: "researched", label: "Ist sorgfältig recherchiert" },
  { id: "backstory", label: "Die Hauptfigur hat eine vollständige, fesselnde Vorgeschichte" },
  { id: "heroComplex", label: "Die Hauptfigur ist einzigartig und vielschichtig" },
  { id: "heroTransforms", label: "Die Hauptfigur entwickelt sich" },
  { id: "sideCharsPurpose", label: "Nebenfiguren und Gegenspieler erfüllen einen Zweck" },
  { id: "sideCharsMemorable", label: "Nebenfiguren bleiben im Gedächtnis" },
  { id: "subplots", label: "Nebenhandlungen dienen der Geschichte" },
  { id: "worldFleshed", label: "Die Welt ist vollständig ausgearbeitet" },
  { id: "worldImmersive", label: "Die Welt wirkt immersiv" },
  { id: "consistent", label: "Ist konsistent" },
];

// --- Prose-level (5 grouped categories): project checklist -----------------
// (Const names stay PAGE_* and the stored tier id stays "page" for back-compat.)

export const PAGE_GROUPS: CheckpointGroup[] = [
  {
    id: "necessity",
    label: "Ist alles notwendig?",
    items: [
      { id: "telling", label: "Erzählen statt zeigen" },
      { id: "overDescribing", label: "Übermäßige Beschreibung" },
      { id: "preempting", label: "Der Handlung vorgreifen" },
      { id: "internalQuestions", label: "Innere Fragen" },
      { id: "adverbs", label: "Adverbien" },
    ],
  },
  {
    id: "paragraphs",
    label: "Sind meine Absätze so stark wie möglich?",
    items: [
      { id: "repetitiveStructure", label: "Wiederholter Satzbau" },
      { id: "overChoreographed", label: "Überinszenierte Handlung" },
      { id: "purpleProse", label: "Schwülstige Prosa" },
      { id: "overusedMetaphor", label: "Überstrapazierte Metaphern / Vergleiche" },
      { id: "passiveVoice", label: "Passiv" },
    ],
  },
  {
    id: "dialogue",
    label: "Ist mein Dialog überzeugend?",
    items: [
      { id: "tagOverload", label: "Zu viele Dialogtags" },
      { id: "repetitiveDialogue", label: "Sich wiederholender Dialog" },
      { id: "flashyTags", label: "Auffällige Dialogtags" },
      { id: "dialogueAdverbs", label: "Zu viele Adverbien" },
      { id: "unrealisticDialogue", label: "Unglaubwürdiger Dialog (Infodump / zu direkt)" },
      { id: "unnecessaryDialogue", label: "Unnötiger Dialog" },
      { id: "disjointedDialogue", label: "Unzusammenhängender Dialog" },
    ],
  },
  {
    id: "words",
    label: "Verwende ich die besten Wörter?",
    items: [
      { id: "overusedWords", label: "Überstrapazierte Wörter" },
      { id: "echoes", label: "Echos" },
      { id: "redundantWords", label: "Redundante Wörter" },
      { id: "intensifiers", label: "Verstärker" },
      { id: "mitigators", label: "Abschwächer" },
      { id: "filterWords", label: "Filterwörter" },
      { id: "weakWords", label: "Schwache Wörter" },
      { id: "nonSpecificWords", label: "Unspezifische Wörter" },
      { id: "cliches", label: "Klischees" },
      { id: "researchWords", label: "Wörter mit Recherchebedarf" },
    ],
  },
  {
    id: "consistency",
    label: "Ist die Prosa konsistent?",
    items: [
      { id: "namesConsistent", label: "Namen" },
      { id: "descriptionsConsistent", label: "Beschreibungen" },
      { id: "actionsConsistent", label: "Handlungen" },
      { id: "referencesConsistent", label: "Verweise" },
      { id: "formattingConsistent", label: "Formatierung" },
    ],
  },
];

/** Flatten the page groups to a single ordered id list (for progress totals). */
export const PAGE_CHECK_IDS: string[] = PAGE_GROUPS.flatMap((g) => g.items.map((i) => i.id));

// --- Effective lists (shipped + the writer's Customize overrides) -----------
// Render from THESE, never from the consts above (AGENTS.md gotcha 17): the
// consts are the frozen shipped lists; a writer may have hidden, renamed,
// reordered, or added checkpoints. Hidden items are simply absent here — their
// stored state is untouched and counts toward nothing.

export function sceneCheckpoints(override?: ListOverride): Checkpoint[] {
  return visibleItems(SCENE_CHECKPOINTS, override).map((i) => ({ id: i.id, label: i.label }));
}
export function sceneCheckIds(override?: ListOverride): string[] {
  return sceneCheckpoints(override).map((c) => c.id);
}
export function storyCheckpoints(override?: ListOverride): Checkpoint[] {
  return visibleItems(STORY_CHECKPOINTS, override).map((i) => ({ id: i.id, label: i.label }));
}
export function pageGroups(override?: ListOverride): CheckpointGroup[] {
  return applyGroupedOverride(PAGE_GROUPS, override)
    .filter((g) => !g.hidden)
    .map((g) => ({
      id: g.id,
      label: g.label,
      items: g.items.filter((i) => !i.hidden).map((i) => ({ id: i.id, label: i.label })),
    }));
}
export function pageCheckIds(override?: ListOverride): string[] {
  return pageGroups(override).flatMap((g) => g.items.map((i) => i.id));
}

// --- Progress math ---------------------------------------------------------

export interface AuditProgress {
  done: number;
  total: number;
}

/** Count how many of `ids` are marked true in `checks`. */
export function auditProgress(
  checks: Partial<Record<string, boolean>> | undefined,
  ids: readonly string[]
): AuditProgress {
  const c = checks ?? {};
  let done = 0;
  for (const id of ids) if (c[id]) done += 1;
  return { done, total: ids.length };
}

export interface SceneAuditRow {
  title: string;
  path: string | null;
  done: number;
  total: number;
  /** True once at least one checkpoint is ticked. */
  audited: boolean;
}

export interface SceneAuditRollup {
  rows: SceneAuditRow[];
  /** Scenes with no checkpoint ticked at all. */
  unaudited: number;
  /** Scenes with every checkpoint ticked. */
  complete: number;
}

/**
 * Summarise per-scene audit state into dashboard rows. Pure: callers read each
 * scene's checks (Obsidian I/O) then pass the plain data in.
 */
export function sceneAuditRollup(
  scenes: { title: string; path: string | null; checks: Partial<Record<string, boolean>> }[],
  /** The effective checkpoint ids (`sceneCheckIds(override)`); shipped by default. */
  ids: readonly string[] = SCENE_CHECK_IDS
): SceneAuditRollup {
  let unaudited = 0;
  let complete = 0;
  const rows: SceneAuditRow[] = scenes.map((s) => {
    const { done, total } = auditProgress(s.checks, ids);
    if (done === 0) unaudited += 1;
    if (done === total) complete += 1;
    return { title: s.title, path: s.path, done, total, audited: done > 0 };
  });
  return { rows, unaudited, complete };
}
