/**
 * Stable planning-note sections and their customizable display layout.
 *
 * `heading` is the on-disk H2 key and must stay stable so existing planning
 * notes continue to resolve. Labels, order, and visibility are UI-only and may
 * be overridden losslessly through Customize.
 */

import { ListOverride, applyOverride } from "../lib/list-override";

export const PLAN_SECTION_DEFS = [
  { id: "synopsis", label: "Zusammenfassung", heading: "Synopsis", rows: 5 },
  {
    id: "plot-groundwork",
    label: "Grundlagen der Handlung",
    heading: "Plot groundwork",
    rows: 5,
  },
  { id: "act-1", label: "Akt I", heading: "Act I", rows: 3 },
  { id: "act-2", label: "Akt II", heading: "Act II", rows: 3 },
  { id: "act-3", label: "Akt III", heading: "Act III", rows: 3 },
] as const;

export type PlanSection = (typeof PLAN_SECTION_DEFS)[number]["heading"];

export const PLAN_SECTIONS: PlanSection[] = PLAN_SECTION_DEFS.map((section) => section.heading);

export interface EffectivePlanSection {
  id: string;
  label: string;
  heading: PlanSection;
  rows: number;
  hidden: boolean;
}

/**
 * Managed planning sections whose H2 headings actually occur in a note.
 * The map value preserves the heading exactly as written for display in the UI.
 */
export function planningSectionHeadings(source: string): Map<PlanSection, string> {
  const known = new Map(
    PLAN_SECTION_DEFS.map((section) => [section.heading.toLowerCase(), section.heading] as const)
  );
  const present = new Map<PlanSection, string>();
  for (const line of source.split(/\r?\n/)) {
    if (!/^##\s+/.test(line)) continue;
    const heading = line.replace(/^##\s+/, "").trim();
    const managed = known.get(heading.toLowerCase());
    if (managed && !present.has(managed)) present.set(managed, heading);
  }
  return present;
}

/** Managed planning sections whose H2 headings actually occur in a note. */
export function presentPlanningSections(source: string): Set<PlanSection> {
  return new Set(planningSectionHeadings(source).keys());
}

/** Every planning-note field in effective order, including hidden fields. */
export function planningSections(override?: ListOverride): EffectivePlanSection[] {
  return applyOverride(PLAN_SECTION_DEFS, override).map((item) => {
    const shipped = PLAN_SECTION_DEFS.find((section) => section.id === item.id);
    // Customs are disabled by the list spec, so normalization guarantees this.
    if (!shipped) throw new Error(`Unknown planning-note section: ${item.id}`);
    return {
      id: item.id,
      label: item.label,
      heading: shipped.heading,
      rows: shipped.rows,
      hidden: item.hidden,
    };
  });
}
