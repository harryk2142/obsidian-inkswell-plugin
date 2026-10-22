/**
 * A self-publishing master checklist as pure data (no Obsidian
 * imports). Phase + task IDs are STABLE constants — stored state keys off them,
 * so labels can be reworded without migrating frontmatter. `deepLink` points a
 * task at an existing Inkswell surface instead of duplicating it.
 */

import { ListOverride, applyGroupedOverride } from "../lib/list-override";

export interface ChecklistTaskDef {
  id: string;
  label: string;
  /** Optional / skippable task. */
  optional?: boolean;
  /** A surface to jump to (handled by the panel), e.g. "compile". */
  deepLink?: "compile";
}

export interface ChecklistPhaseDef {
  id: string;
  label: string;
  tasks: ChecklistTaskDef[];
}

/** List-specific fields a custom task may carry (see settings/overridable-lists). */
export type PublishingExtra = { optional?: boolean; deepLink?: "compile" };

/**
 * The effective checklist: shipped phases/tasks minus hidden ones, renamed
 * where the writer renamed them, plus custom phases and tasks. Render from this,
 * never from PUBLISHING_CHECKLIST (AGENTS.md gotcha 17). Phases = groups.
 */
export function publishingChecklist(override?: ListOverride<PublishingExtra>): ChecklistPhaseDef[] {
  const shipped = PUBLISHING_CHECKLIST.map((p) => ({ id: p.id, label: p.label, items: p.tasks }));
  return applyGroupedOverride(shipped, override)
    .filter((g) => !g.hidden)
    .map((g) => ({
      id: g.id,
      label: g.label,
      tasks: g.items
        .filter((i) => !i.hidden)
        .map((i) => {
          const task: ChecklistTaskDef = { id: i.id, label: i.label };
          if (i.extra.optional) task.optional = true;
          if (i.extra.deepLink) task.deepLink = i.extra.deepLink;
          return task;
        }),
    }));
}

export const PUBLISHING_CHECKLIST: ChecklistPhaseDef[] = [
  {
    id: "writing",
    label: "Schreiben",
    tasks: [{ id: "draft", label: "Ersten Entwurf schreiben" }],
  },
  {
    id: "editing",
    label: "Überarbeitung",
    tasks: [
      { id: "selfEdit", label: "Eigene Überarbeitung abschließen" },
      { id: "critique", label: "Mit einem Kritikpartner arbeiten", optional: true },
      { id: "beta", label: "Mit Testleser:innen arbeiten", optional: true },
      { id: "preflight", label: "Prüfung vor dem Export ausführen", deepLink: "compile" },
      { id: "hireEditor", label: "Lektorat beauftragen" },
      { id: "incorporate", label: "Lektoratsfeedback einarbeiten" },
    ],
  },
  {
    id: "foundational",
    label: "Grundlegende Entscheidungen",
    tasks: [
      { id: "genre", label: "Genre und Subgenres festlegen" },
      { id: "targetReader", label: "Zielgruppenprofil definieren" },
      { id: "authorName", label: "Autor:innenname wählen (bürgerlicher Name oder Pseudonym)" },
      { id: "business", label: "Autor:innengewerbe einrichten", optional: true },
      { id: "budget", label: "Budget für dieses Buch erstellen" },
    ],
  },
  {
    id: "building",
    label: "Das Buch erstellen",
    tasks: [
      { id: "metadata", label: "Arbeitsblatt für Buchmetadaten ausfüllen" },
      { id: "formats", label: "Formate wählen (E-Book / Taschenbuch / gebundene Ausgabe)" },
      { id: "frontMatter", label: "Titelei erstellen" },
      { id: "backMatter", label: "Anhang erstellen" },
    ],
  },
  {
    id: "cover",
    label: "Covergestaltung",
    tasks: [
      { id: "comps", label: "Vergleichscover recherchieren" },
      { id: "designer", label: "Coverdesigner:in recherchieren und beauftragen" },
      { id: "finalize", label: "Cover für jedes Format fertigstellen" },
    ],
  },
  {
    id: "formatting",
    label: "Formatierung",
    tasks: [
      { id: "method", label: "Formatierungsmethode wählen" },
      { id: "interior", label: "Formatvorlagen für den Buchsatz fertigstellen", deepLink: "compile" },
      { id: "referenceDoc", label: "Referenzdokument erzeugen (Word-Formatierung)", deepLink: "compile" },
      { id: "finalFiles", label: "Endgültige Dateien für jedes Format erzeugen" },
    ],
  },
  {
    id: "prepare",
    label: "Veröffentlichung vorbereiten",
    tasks: [
      { id: "platforms", label: "Veröffentlichungsplattformen wählen" },
      { id: "releaseDate", label: "Veröffentlichungsdatum wählen" },
      { id: "preorder", label: "Über Vorbestellung entscheiden" },
      { id: "pricing", label: "Preis je Format festlegen" },
      { id: "isbns", label: "ISBNs beschaffen" },
      { id: "keywords", label: "Schlagwörter festlegen" },
      { id: "categories", label: "Kategorien festlegen (BISAC)" },
    ],
  },
  {
    id: "publishing",
    label: "Veröffentlichen",
    tasks: [
      { id: "accounts", label: "Plattformkonto/-konten einrichten" },
      { id: "upload", label: "Metadaten, Inhalt, Cover und Dateien hochladen" },
      { id: "proof", label: "Korrekturabzüge prüfen" },
      { id: "approve", label: "Korrekturabzüge freigeben" },
      { id: "submit", label: "Zur Freigabe / Veröffentlichung einreichen" },
    ],
  },
  {
    id: "marketingFoundations",
    label: "Marketing-Grundlagen",
    tasks: [
      { id: "website", label: "Autor:innenwebsite einrichten" },
      { id: "newsletter", label: "Autor:innennewsletter erstellen" },
      { id: "social", label: "Social-Media-Kanäle einrichten" },
      { id: "goodreads", label: "Goodreads-Autor:innenseite einrichten" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    tasks: [
      { id: "arcs", label: "Vorabexemplare verteilen" },
      { id: "preorderCampaign", label: "Vorbestellungskampagne durchführen" },
      { id: "giveaway", label: "Gewinnspiel durchführen", optional: true },
      { id: "coverReveal", label: "Cover-Enthüllung", optional: true },
      { id: "launchParty", label: "Veröffentlichungsfeier / Event", optional: true },
      { id: "pricePromo", label: "Preisaktion", optional: true },
      { id: "bookbub", label: "BookBub-/Deal-Seiten-Werbung", optional: true },
      { id: "ads", label: "Bezahlte Werbung", optional: true },
      { id: "swaps", label: "Newsletter-Tausch", optional: true },
    ],
  },
];
