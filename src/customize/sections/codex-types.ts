/**
 * Customize → Codex types & fields (the flagship section).
 *
 * List page: every type (built-in + custom) with entry counts and where its
 * fields come from. Type page: three cards —
 *   Display  — name / plural / icon (via CategoryModal: explicit Save matters,
 *              because the label is also the template-note lookup key),
 *   Fields   — the list editor over the type's `codex-fields`, written straight
 *              back to the template note (created on first edit),
 *   Starter  — the template note's body, edited in place.
 *
 * Cache-lag rule (AGENTS.md gotcha 18): after writing `codex-fields` we render
 * from the spec we wrote (`pending`), not from the metadata cache, until the
 * cache reports the note re-indexed.
 */

import { Menu, Notice, setIcon } from "obsidian";
import {
  deleteCustomCategory,
  openCategoryEditor,
  saveBuiltinOverride,
} from "../../codex/category-actions";
import { resolveProfileFields } from "../../codex/codex-profile";
import {
  CodexSettings,
  generateCodexTemplates,
  getCodexEntities,
  resolveCodexTemplate,
} from "../../codex/codex-store";
import { ensureCodexTemplate, readTemplateBody, writeTemplateBody } from "../../codex/codex-template-io";
import {
  FIELDS_KEY,
  RESERVED_FIELD_KEYS,
  defaultFieldLabel,
  knownFieldsCatalog,
} from "../../codex/profile-schema";
import {
  CategoryDef,
  allCategories,
  defaultBuiltinDef,
  isBuiltinCategory,
} from "../../codex/types";
import { tryFileOp } from "../../lib/notify";
import { attachRowMenu } from "../../lib/row-menu";
import { openScene } from "../../scenes/scene-actions";
import { resolveTemplateFolder } from "../../settings/folders";
import { FIELD_KINDS } from "../field-spec";
import { renderFieldSpecEditor } from "../field-spec-editor";
import type { CustomizeSection, SectionCtx } from "../section";
import { renderTemplateBodyEditor } from "../template-body-editor";

const CARD = { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" };

export const codexTypesSection: CustomizeSection = {
  id: "codex-types",

  describe(plugin) {
    const custom = plugin.settings.customCategories.length;
    const renamed = Object.keys(plugin.settings.categoryOverrides).length;
    const parts = ["7 built-in"];
    if (custom > 0) parts.push(`${custom} custom`);
    if (renamed > 0) parts.push(`${renamed} renamed`);
    return parts.join(" · ");
  },

  render(host, ctx) {
    if (ctx.target) renderType(host, ctx, ctx.target);
    else renderList(host, ctx);
  },
};

function categories(ctx: SectionCtx): CategoryDef[] {
  const s = ctx.plugin.settings;
  return allCategories(s.customCategories, s.categoryOverrides);
}

// ---------------------------------------------------------------------------
// List page
// ---------------------------------------------------------------------------

function renderList(host: HTMLElement, ctx: SectionCtx): void {
  const { app, plugin } = ctx;
  const settings: CodexSettings = plugin.settings;
  host.createEl("p", {
    cls: "inkswell-stats__muted",
    text:
      "Each codex type has a display (name, plural, icon), the fields its entries show in " +
      "the Codex panel, and the starter content a new entry begins with. Fields and starter " +
      "content live in an ordinary template note — editing here edits that note.",
  });

  const counts = new Map<string, number>();
  for (const e of getCodexEntities(app)) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);

  const list = host.createDiv({ cls: "inkswell-customize__items" });
  for (const cat of categories(ctx)) {
    const row = list.createDiv({ cls: "inkswell-customize__item" });
    row.setAttribute("role", "button");
    setIcon(row.createSpan({ cls: "inkswell-customize__icon" }), cat.icon);
    const text = row.createDiv({ cls: "inkswell-customize__text" });
    text.createDiv({ cls: "inkswell-customize__name", text: cat.label });
    const shipped = defaultBuiltinDef(cat.id);
    const renamed = shipped && shipped.label !== cat.label ? ` · renamed from ${shipped.label}` : "";
    text.createDiv({
      cls: "inkswell-customize__desc",
      text: `${cat.plural} · codex: ${cat.id}${renamed}${shipped ? "" : " · custom"}`,
    });
    const chips = row.createDiv({ cls: "inkswell-customize__chips" });
    const n = counts.get(cat.id) ?? 0;
    chips.createSpan({ cls: "inkswell-chip", text: `${n} entr${n === 1 ? "y" : "ies"}` });
    const { template } = resolveProfileFields(app, settings, cat.id);
    chips.createSpan({
      cls: "inkswell-chip",
      text: template ? `Fields: ${template.basename}` : "Fields: shipped",
    });
    row.onclick = () => ctx.setTarget(cat.id);
    attachRowMenu(row, row, () => {
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle("Anzeige bearbeiten…")
          .setIcon("pencil")
          .onClick(() => openCategoryEditor(app, plugin, cat, () => ctx.rerender()))
      );
      if (!isBuiltinCategory(cat.id)) {
        menu.addSeparator();
        menu.addItem((i) =>
          i
            .setTitle("Typ löschen…")
            .setIcon("trash")
            .onClick(() =>
              void deleteCustomCategory(app, plugin, cat).then((done) => {
                if (done) ctx.rerender();
              })
            )
        );
      }
      return menu;
    });
  }

  const foot = host.createDiv({ cls: "inkswell-customize__foot" });
  const add = foot.createEl("button", { cls: "mod-cta", text: "Neuer Typ…" });
  add.type = "button";
  add.onclick = () => openCategoryEditor(app, plugin, null, (def) => ctx.setTarget(def.id));
  const gen = foot.createEl("button", { text: "Alle Startvorlagen erzeugen" });
  gen.type = "button";
  gen.setAttribute(
    "aria-label",
    "Create a template note for every type that lacks one (plus Scene.md and a README)"
  );
  gen.onclick = async () => {
    const folder = resolveTemplateFolder(settings) || "(vault root)";
    const created = await tryFileOp(
      () => generateCodexTemplates(app, settings),
      "Couldn't generate the starter templates."
    );
    if (created === null) return;
    new Notice(
      created.length > 0
        ? `Created ${created.length} template${created.length === 1 ? "" : "s"} in "${folder}".`
        : "Templates already exist — nothing to create."
    );
    ctx.rerender();
  };
}

// ---------------------------------------------------------------------------
// Type page
// ---------------------------------------------------------------------------

function renderType(host: HTMLElement, ctx: SectionCtx, id: string): void {
  const { app, plugin } = ctx;
  const settings: CodexSettings = plugin.settings;

  const back = host.createEl("a", { cls: "inkswell-customize__back", text: "‹ Kodex-Typen" });
  back.onclick = (e) => {
    e.preventDefault();
    ctx.setTarget(null);
  };

  const cat = categories(ctx).find((c) => c.id === id);
  if (!cat) {
    host.createDiv({ cls: "inkswell-stats__muted", text: "Dieser Typ existiert nicht mehr." });
    return;
  }

  const head = host.createDiv({ cls: "inkswell-customize__typehead" });
  setIcon(head.createSpan({ cls: "inkswell-customize__icon" }), cat.icon);
  head.createEl("h4", { text: cat.label });
  head.createSpan({ cls: "inkswell-stats__muted", text: `codex: ${cat.id}` });

  ctx.cards.section(host, "codex-types:display", "Display", (body) => renderDisplay(body, ctx, cat), CARD);
  ctx.cards.section(host, "codex-types:fields", "Fields", (body) => renderFields(body, ctx, cat), CARD);
  ctx.cards.section(
    host,
    "codex-types:starter",
    "Starter content",
    (body) => {
      renderTemplateBodyEditor(body, ctx, {
        file: resolveCodexTemplate(app, settings, cat),
        create: () => ensureCodexTemplate(app, settings, cat),
        fieldKey: `customize:codex:body:${cat.id}`,
        hint:
          "This is what a new entry starts with. {{title}} becomes the entry's name. " +
          "Inkswell adds codex: and the project/series scope itself — don't add a codex: key.",
        noneText: `No template note yet — new ${cat.plural.toLowerCase()} start with a heading only.`,
        read: (f) => readTemplateBody(app, f),
        write: (f, body) => writeTemplateBody(app, f, body),
      });
    },
    CARD
  );
}

function renderDisplay(body: HTMLElement, ctx: SectionCtx, cat: CategoryDef): void {
  const { app, plugin } = ctx;
  const shipped = defaultBuiltinDef(cat.id);
  const kv = body.createDiv({ cls: "inkswell-customize__kv" });
  // Key and value are direct grid cells (no wrapper row — `display: contents`
  // is only partially supported by the review bot's baseline).
  const line = (k: string, v: string): void => {
    kv.createSpan({ cls: "inkswell-customize__kvkey", text: k });
    kv.createSpan({ text: v });
  };
  line("Name", cat.label);
  line("Plural", cat.plural);
  line("Icon", cat.icon);
  const overridden =
    shipped && (shipped.label !== cat.label || shipped.plural !== cat.plural || shipped.icon !== cat.icon);
  if (overridden && shipped) {
    body.createDiv({
      cls: "inkswell-stats__muted",
      text: `Shipped as ${shipped.label} / ${shipped.plural} / ${shipped.icon}. Entries keep codex: ${cat.id}.`,
    });
  }
  const actions = body.createDiv({ cls: "inkswell-customize__actions" });
  const edit = actions.createEl("button", { text: "Bearbeiten…" });
  edit.type = "button";
  edit.onclick = () => openCategoryEditor(app, plugin, cat, () => ctx.rerender());
  if (overridden && shipped && isBuiltinCategory(cat.id)) {
    const reset = actions.createEl("button", { text: "Auf Standard zurücksetzen" });
    reset.type = "button";
    const builtinId = cat.id;
    reset.onclick = () =>
      void saveBuiltinOverride(plugin, builtinId, shipped).then(() => ctx.rerender());
  }
}

function renderFields(body: HTMLElement, ctx: SectionCtx, cat: CategoryDef): void {
  const { app, plugin } = ctx;
  const settings: CodexSettings = plugin.settings;
  const { fields, template } = resolveProfileFields(app, settings, cat.id);

  const src = body.createDiv({ cls: "inkswell-stats__muted inkswell-customize__fieldsrc" });
  if (template) {
    src.appendText("Fields from ");
    const link = src.createEl("a", { text: template.path });
    link.onclick = (e) => {
      e.preventDefault();
      openScene(app, template);
    };
    src.appendText(". Aliases always comes first.");
  } else {
    src.setText(
      "Using Inkswell's shipped fields. Your first change creates a template note for this " +
        "type and records the fields there. Aliases always comes first."
    );
  }

  const typeLabels: Record<string, string> = Object.fromEntries(categories(ctx).map((c) => [c.id, c.label]));
  renderFieldSpecEditor(body, ctx, {
    keyPrefix: `customize:fields:${cat.id}`,
    template,
    fields,
    ensureTemplate: () => ensureCodexTemplate(app, settings, cat),
    specKey: FIELDS_KEY,
    reserved: RESERVED_FIELD_KEYS,
    defaultLabel: (key) => defaultFieldLabel(cat.id, key),
    kinds: FIELD_KINDS,
    emptyText: "Noch keine Felder – füge unten eines hinzu.",
    reset: {
      label: "Auf mitgelieferte Felder zurücksetzen",
      confirm:
        `Use Inkswell's shipped fields for ${cat.label}? This removes the codex-fields ` +
        `property from ${template?.basename ?? "the template"} — existing entries keep their frontmatter.`,
    },
    add: {
      labelDesc: "What the Codex panel shows. The stored key is derived from it.",
      catalog: (taken) =>
        knownFieldsCatalog()
          .filter(({ field }) => !taken.has(field.key))
          .map(({ field, source }) => ({
            value: `${source}|${field.key}`,
            label:
              field.label +
              (source === "all" ? "" : source === "generic" ? " (custom types)" : ` (${typeLabels[source] ?? source})`),
            field,
          })),
    },
  });
}
