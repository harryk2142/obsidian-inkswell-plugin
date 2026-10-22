/**
 * Optional-feature registry for the feature-toggle system.
 *
 * Most writers won't use every surface, so a handful of optional features can be
 * hidden. This module is the single source of truth for WHICH features are
 * optional; the gating itself lives at each consumption point (a sub-tab, a
 * Structure view, a command, a toolbar group) which reads {@link featureEnabled}.
 *
 * Kept dependency-free (no Obsidian, no settings import) so it stays pure and
 * unit-testable and can be imported from the nav model without a cycle.
 *
 * Storage contract: a feature is ON unless its id is listed in
 * `settings.disabledFeatures`. So new optional features default on with no
 * migration, and toggling only ever gates rendering — never touches stored data,
 * so re-enabling is lossless.
 */

export type FeatureId =
  | "beats"
  | "board"
  | "plot-grid"
  | "audit"
  | "analysis"
  | "checklist"
  | "launch"
  | "prompts"
  | "tracking";

/** Grouping label for the Customize → Features section. */
export type FeatureGroup = "Planen" | "Überarbeiten" | "Veröffentlichen" | "Schreiben";

export interface FeatureDef {
  id: FeatureId;
  /** Display name (also used in the in-app "Hide <label>" menu). */
  label: string;
  group: FeatureGroup;
  /** One-line explanation shown under the Settings toggle. */
  desc: string;
}

/**
 * Every optional feature, in the order (and grouping) the Settings section shows
 * them. Core surfaces (Home, Write, Codex, Search, Help, Customize, Plan →
 * Overview, Structure → Tree, Revise → To-dos, Publish → Compile, ideas) are
 * deliberately absent — they can't be hidden. Track + sprints + goals hide
 * together as one "tracking" feature (a whole destination, gated in the rail,
 * More sheet, status bar, Write toolbar, hero card, and commands).
 */
export const OPTIONAL_FEATURES: FeatureDef[] = [
  {
    id: "beats",
    label: "Beats",
    group: "Planen",
    desc: "Der Beat-Sheet-Planer (Planen → Beats) und seine Szenengerüste.",
  },
  {
    id: "board",
    label: "Board",
    group: "Planen",
    desc: "Die Kanban-Ansicht Ihrer Szenen (Planen → Struktur → Board).",
  },
  {
    id: "plot-grid",
    label: "Plot-Raster",
    group: "Planen",
    desc: "Die Matrix aus Handlungssträngen und Kapiteln (Planen → Struktur → Raster) sowie das Feld „Handlungsstränge“ einer Szene.",
  },
  {
    id: "audit",
    label: "Überarbeitungsprüfung",
    group: "Überarbeiten",
    desc: "Die Überarbeitungschecklisten und die Entwicklungskurven von Figuren (Überarbeiten → Prüfung).",
  },
  {
    id: "analysis",
    label: "Analyse",
    group: "Überarbeiten",
    desc: "Analysen zu Lesbarkeit, Worthäufigkeit und Wortwiederholungen (Überarbeiten → Analyse).",
  },
  {
    id: "checklist",
    label: "Veröffentlichungscheckliste",
    group: "Veröffentlichen",
    desc: "Die Aufgabencheckliste für die Selbstveröffentlichung (Veröffentlichen → Checkliste).",
  },
  {
    id: "launch",
    label: "Veröffentlichungsplaner",
    group: "Veröffentlichen",
    desc: "Der Zeitplan für Vorbestellungen und die Veröffentlichungsübersichten (Veröffentlichen → Veröffentlichung).",
  },
  {
    id: "prompts",
    label: "Schreibimpulse",
    group: "Schreiben",
    desc: "Die Schaltfläche für Schreibimpulse und Ideen in der Werkzeugleiste beim Schreiben.",
  },
  {
    id: "tracking",
    label: "Fortschritt",
    group: "Schreiben",
    desc:
      "Wortziele, Schreibsprints, der Zähler in der Statusleiste und die Fortschrittsübersicht. " +
      "Auch ausgeblendet werden Wörter weiterhin protokolliert; nach dem erneuten Einblenden ist daher der vollständige Verlauf sichtbar.",
  },
];

const OPTIONAL_IDS = new Set<string>(OPTIONAL_FEATURES.map((f) => f.id));

/** Whether `id` names a real optional feature (guards stale/typo'd stored ids). */
export function isOptionalFeature(id: string): id is FeatureId {
  return OPTIONAL_IDS.has(id);
}

/**
 * Whether an optional feature is currently enabled. A feature is on unless its id
 * appears in the caller's `disabledFeatures` list.
 */
export function featureEnabled(disabled: readonly string[], id: FeatureId): boolean {
  return !disabled.includes(id);
}
