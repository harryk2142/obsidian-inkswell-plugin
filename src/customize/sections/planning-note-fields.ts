/** Customize → Planning-note fields: lossless display overrides only. */

import { PLAN_SECTION_DEFS, planningSections } from "../../plan/sections";
import { SPEC_PLAN_SECTIONS } from "../../settings/overridable-lists";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

export const planningNoteFieldsSection: CustomizeSection = {
  id: "planning-note-fields",

  describe(plugin) {
    const override = plugin.settings.listOverrides["plan.sections"];
    if (!override) return "Alle Felder eingeblendet";
    const parts: string[] = [];
    const hidden = planningSections(override).filter((field) => field.hidden).length;
    const renamed = Object.keys(override.labels ?? {}).length;
    if (hidden) parts.push(`${hidden} ausgeblendet`);
    if (renamed) parts.push(`${renamed} umbenannt`);
    if (override.order?.length) parts.push("neu angeordnet");
    return parts.join(" · ") || "Alle Felder eingeblendet";
  },

  render(host, ctx) {
    renderOverrideEditor(host, ctx, {
      listId: "plan.sections",
      spec: SPEC_PLAN_SECTIONS,
      shipped: PLAN_SECTION_DEFS,
      allowAdd: false,
      noun: "Feld",
      intro:
        "Legen Sie fest, welche Textfelder unter Planen → Übersicht angezeigt werden und in " +
        "welcher Reihenfolge. Ausblenden entfernt weder die Überschrift noch den Text aus der " +
        "Planungsnotiz. Beim erneuten Einblenden ist der vorhandene Inhalt sofort wieder verfügbar.",
    });
  },
};
