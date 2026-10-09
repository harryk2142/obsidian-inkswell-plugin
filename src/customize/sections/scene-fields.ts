/**
 * Customize → Scene inspector fields. Two cards:
 *   Layout       — rename, hide, and reorder the inspector rows (built-in fields
 *                  plus the "Your fields" block as one movable row). Display
 *                  only: hiding never touches what scenes store (#47, #49).
 *   Your fields  — the writer's own fields (#52), written to the scene template
 *                  note's `scene-fields` (created on first edit), in the same
 *                  format and editor as a codex type's fields.
 */

import { openScene } from "../../scenes/scene-actions";
import { INSPECTOR_FIELDS, inspectorFields } from "../../scenes/scene-meta";
import { SCENE_FIELDS_KEY, SCENE_RESERVED_KEYS } from "../../scenes/scene-fields";
import {
  ensureSceneTemplate,
  resolveSceneFields,
  resolveVaultSceneTemplate,
} from "../../scenes/scene-template-io";
import { humanizeKey } from "../../codex/profile-schema";
import { SPEC_SCENE_FIELDS } from "../../settings/overridable-lists";
import { FieldKind } from "../field-spec";
import { renderFieldSpecEditor } from "../field-spec-editor";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

const CARD = { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" };

/** Scenes have no portrait, so no image kind. */
const SCENE_FIELD_KINDS: FieldKind[] = ["text", "textarea", "number", "list", "links", "link"];

export const sceneFieldsSection: CustomizeSection = {
  id: "scene-fields",

  describe(plugin, app) {
    const own = resolveSceneFields(app, plugin.settings).length;
    const o = plugin.settings.listOverrides["scene.fields"];
    const parts: string[] = [];
    if (own) parts.push(`${own} of your own`);
    if (o) {
      const hidden = inspectorFields(o).filter((f) => f.hidden).length;
      const renamed = Object.keys(o.labels ?? {}).length;
      if (renamed) parts.push(`${renamed} renamed`);
      if (hidden) parts.push(`${hidden} hidden`);
      if (o.order?.length) parts.push("reordered");
    }
    return parts.join(" · ") || "All fields (defaults)";
  },

  render(host, ctx) {
    const { app, plugin } = ctx;

    ctx.cards.section(host, "scene-fields:layout", "Layout", (body) => {
      renderOverrideEditor(body, ctx, {
        listId: "scene.fields",
        spec: SPEC_SCENE_FIELDS,
        shipped: INSPECTOR_FIELDS,
        allowAdd: false,
        noun: "field",
        intro:
          "Choose which fields the scene inspector shows and in what order. Hide the ones you " +
          "don't use, or move Notes up if you draft against an outline. “Your fields” is the " +
          "block of fields you add below. Hiding a field only hides it here — scenes keep " +
          "whatever they already store, and unhiding brings it straight back.",
      });
    }, CARD);

    ctx.cards.section(host, "scene-fields:own", "Your fields", (body) => {
      const template = resolveVaultSceneTemplate(app, plugin.settings);
      const src = body.createDiv({ cls: "inkswell-stats__muted inkswell-customize__fieldsrc" });
      src.appendText(
        "Add fields for your own process — Story Grid's Five Commandments, a scene's goal and " +
          "disaster — and they appear in every scene's inspector. Each is saved as an ordinary " +
          "property on the scene; removing a field here never deletes what you wrote. "
      );
      if (template) {
        src.appendText("Stored in ");
        const link = src.createEl("a", { text: template.path });
        link.onclick = (e) => {
          e.preventDefault();
          openScene(app, template);
        };
        src.appendText(" (shared by every project).");
      } else {
        src.appendText("Your first field creates the scene template note and records them there.");
      }

      renderFieldSpecEditor(body, ctx, {
        keyPrefix: "customize:scene-fields",
        template,
        fields: resolveSceneFields(app, plugin.settings),
        ensureTemplate: () => ensureSceneTemplate(app, plugin.settings),
        specKey: SCENE_FIELDS_KEY,
        reserved: SCENE_RESERVED_KEYS,
        defaultLabel: humanizeKey,
        kinds: SCENE_FIELD_KINDS,
        emptyText: "No fields of your own yet.",
        reset: {
          label: "Remove all your fields",
          confirm:
            `Remove every field of your own? This deletes the ${SCENE_FIELDS_KEY} property from ` +
            `${template?.basename ?? "the scene template"} — scenes keep the values they already store.`,
        },
        add: { labelDesc: "What the scene inspector shows. The stored property name is derived from it." },
      });
    }, CARD);
  },
};
