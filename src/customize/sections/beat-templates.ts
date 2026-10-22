/**
 * Customize → Beat templates.
 *
 * List page: the eight built-ins (read-only; "Duplicate as custom" is the
 * on-ramp) and the writer's own templates as a reorderable list (their order is
 * the picker order in Plan → Beats). Template page: the beats as editable rows
 * (name / at % / purpose), drag-reorderable, with "Edit as text…" keeping the
 * line grammar as an import/escape hatch. Both paths share one id policy
 * (assignBeatIds), so notes can't cross-wire between them.
 */

import { App, Menu, Notice, Setting } from "obsidian";
import { FormModal } from "../../lib/form-modal";
import { renderListEditor } from "../../lib/list-editor";
import { slugify } from "../../lib/slug";
import { BEAT_TEMPLATES, BeatDef, TEMPLATE_META } from "../../outliner/beat-templates";
import { BeatTemplateModal } from "../../outliner/beat-template-modal";
import {
  BeatTemplateDef,
  allTemplateMeta,
  beatsFromRows,
  parseBeatLines,
  repositionBeat,
  serializeBeatLines,
} from "../../outliner/custom-templates";
import {
  deleteBeatTemplate,
  duplicateAsCustom,
  reorderBeatTemplates,
  saveBeatTemplate,
} from "../../outliner/template-actions";
import { taggedInput } from "../../views/panel-kit";
import type { CustomizeSection, SectionCtx } from "../section";

/** "Save the Cat (15)" → "Save the Cat". */
function builtinName(label: string): string {
  return label.replace(/\s*\(\d+\)\s*$/, "");
}

export const beatTemplatesSection: CustomizeSection = {
  id: "beat-templates",

  describe(plugin) {
    const n = plugin.settings.customBeatTemplates.length;
    return `${TEMPLATE_META.length} mitgeliefert${n > 0 ? ` · ${n} eigene` : ""}`;
  },

  render(host, ctx) {
    if (ctx.target) renderTemplate(host, ctx, ctx.target);
    else renderList(host, ctx);
  },
};

// ---------------------------------------------------------------------------
// List page
// ---------------------------------------------------------------------------

function renderList(host: HTMLElement, ctx: SectionCtx): void {
  const { app, plugin } = ctx;
  host.createEl("p", {
    cls: "inkswell-stats__muted",
    text:
      "Beat-Strukturen für Planen → Beats. Mitgelieferte Vorlagen können nicht geändert werden; " +
      "durch Duplizieren erhalten Sie jedoch eine bearbeitbare Kopie. Ihre Vorlagen erscheinen " +
      "in der unten festgelegten Reihenfolge in der Auswahl.",
  });

  new Setting(host).setName("Mitgeliefert").setHeading();
  const builtins = host.createDiv({ cls: "inkswell-customize__items" });
  for (const meta of TEMPLATE_META) {
    const row = builtins.createDiv({ cls: "inkswell-customize__item is-static" });
    const text = row.createDiv({ cls: "inkswell-customize__text" });
    text.createDiv({ cls: "inkswell-customize__name", text: builtinName(meta.label) });
    text.createDiv({
      cls: "inkswell-customize__desc",
      text: `${BEAT_TEMPLATES[meta.id]?.length ?? 0} Beats · Vorlage: ${meta.id}`,
    });
    const dup = row.createEl("button", { text: "Als eigene Vorlage duplizieren" });
    dup.type = "button";
    dup.onclick = () => void duplicate(ctx, builtinName(meta.label), BEAT_TEMPLATES[meta.id] ?? []);
  }

  new Setting(host).setName("Eigene").setHeading();
  const customs = plugin.settings.customBeatTemplates;
  renderListEditor<BeatTemplateDef>(host, {
    items: customs,
    keyPrefix: "customize:beat-templates",
    dragType: "inkswell/customize-beat-templates",
    emptyText: "Noch keine eigenen Vorlagen – dupliziere eine mitgelieferte oder erstelle eine neue.",
    renderRow(el, tpl) {
      const text = el.createDiv({ cls: "inkswell-customize__text inkswell-customize__clickable" });
      text.createDiv({ cls: "inkswell-customize__name", text: tpl.name });
      text.createDiv({
        cls: "inkswell-customize__desc",
        text: `${tpl.beats.length} Beats · Vorlage: ${tpl.id}`,
      });
      text.onclick = () => ctx.setTarget(tpl.id);
      const edit = el.createEl("button", { text: "Beats bearbeiten" });
      edit.type = "button";
      edit.onclick = () => ctx.setTarget(tpl.id);
    },
    extendMenu(menu: Menu, tpl) {
      menu.addItem((i) =>
        i.setTitle("Beats bearbeiten").setIcon("pencil").onClick(() => ctx.setTarget(tpl.id))
      );
      menu.addItem((i) =>
        i.setTitle("Duplizieren").setIcon("copy").onClick(() => void duplicate(ctx, tpl.name, tpl.beats))
      );
    },
    onReorder: (next) => reorderBeatTemplates(plugin, next).then(() => ctx.rerender()),
    onRemove: (tpl) =>
      deleteBeatTemplate(app, plugin, tpl).then((done) => {
        if (done) ctx.rerender();
      }),
    add: {
      label: "Neue Vorlage…",
      action: () =>
        new BeatTemplateModal(app, {
          existing: null,
          takenIds: allTemplateMeta(plugin.settings.customBeatTemplates).map((m) => m.id),
          onSubmit: async (def) => {
            await saveBeatTemplate(plugin, def);
            ctx.setTarget(def.id);
          },
        }).open(),
    },
  });
}

async function duplicate(ctx: SectionCtx, name: string, beats: readonly BeatDef[]): Promise<void> {
  const def = duplicateAsCustom(name, beats, ctx.plugin.settings.customBeatTemplates);
  await saveBeatTemplate(ctx.plugin, def);
  new Notice(`„${def.name}“ wurde erstellt.`);
  ctx.setTarget(def.id);
}

// ---------------------------------------------------------------------------
// Template page
// ---------------------------------------------------------------------------

function renderTemplate(host: HTMLElement, ctx: SectionCtx, id: string): void {
  const { app, plugin } = ctx;
  const back = host.createEl("a", { cls: "inkswell-customize__back", text: "‹ Beat-Vorlagen" });
  back.onclick = (e) => {
    e.preventDefault();
    ctx.setTarget(null);
  };

  const tpl = plugin.settings.customBeatTemplates.find((t) => t.id === id);
  if (!tpl) {
    host.createDiv({ cls: "inkswell-stats__muted", text: "Diese Vorlage existiert nicht mehr." });
    return;
  }

  const head = host.createDiv({ cls: "inkswell-customize__typehead" });
  head.createEl("h4", { text: tpl.name });
  head.createSpan({ cls: "inkswell-stats__muted", text: `Vorlage: ${tpl.id}` });
  const rename = head.createEl("button", { text: "Umbenennen…" });
  rename.type = "button";
  rename.onclick = () =>
    new RenameTemplateModal(app, tpl.name, async (name) => {
      await saveBeatTemplate(plugin, { ...tpl, name });
      ctx.rerender();
    }).open();

  host.createEl("p", {
    cls: "inkswell-stats__muted",
    text:
      "Die Beats stehen in der Reihenfolge des Buches. Die Prozentangabe zeigt, wo ein Beat im " +
      "Manuskript liegt. Der Name eines Beats dient als Schlüssel: Beim Umbenennen beginnt er mit " +
      "leeren gespeicherten Notizen; durch Rückbenennen werden diese wiederhergestellt. Reihenfolge " +
      "und Zweck können jederzeit sicher geändert werden.",
  });

  const beats = [...tpl.beats].sort((a, b) => a.position - b.position);
  const save = async (next: BeatDef[]): Promise<void> => {
    await saveBeatTemplate(plugin, { ...tpl, beats: next });
    ctx.rerender();
  };
  /** Re-derive ids from the (possibly renamed) rows through the shared policy. */
  const commitRows = (rows: { name: string; blurb: string; position: number | null }[]): void => {
    const result = beatsFromRows(rows);
    if ("error" in result) {
      new Notice(result.error);
      ctx.rerender();
      return;
    }
    void save(result.beats);
  };
  const prefix = `customize:beats:${tpl.id}`;

  renderListEditor<BeatDef>(host, {
    items: beats,
    keyPrefix: prefix,
    dragType: `inkswell/customize-beats-${tpl.id}`,
    emptyText: "Noch keine Beats.",
    renderRow(el, beat, index) {
      const name = taggedInput(el, `${prefix}:name:${beat.id}`, { type: "text" });
      name.value = beat.name;
      name.placeholder = "Beat-Name";
      name.setAttribute("aria-label", "Beat-Name");
      name.onchange = () =>
        commitRows(beats.map((b, i) => (i === index ? { ...b, name: name.value } : b)));

      const at = taggedInput(el, `${prefix}:at:${beat.id}`, { type: "number", cls: "inkswell-customize__pct" });
      at.min = "0";
      at.max = "100";
      at.step = "1";
      at.value = String(Math.round(beat.position * 1000) / 10);
      at.setAttribute("aria-label", "Position im Buch in Prozent");
      at.onchange = () => {
        const n = Number(at.value);
        const position = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) / 100 : beat.position;
        void save(beats.map((b, i) => (i === index ? { ...b, position } : b)).sort((a, b) => a.position - b.position));
      };
      el.createSpan({ cls: "inkswell-stats__muted", text: "%" });

      const blurb = taggedInput(el, `${prefix}:blurb:${beat.id}`, { type: "text" });
      blurb.value = beat.blurb;
      blurb.placeholder = "Zweck (optional)";
      blurb.setAttribute("aria-label", "Zweck des Beats");
      blurb.onchange = () => void save(beats.map((b, i) => (i === index ? { ...b, blurb: blurb.value } : b)));
    },
    onReorder: (next) => {
      // The list editor hands back the new order; convert it into a position
      // change for the moved beat only (repositionBeat) so pins survive.
      const moved = next.findIndex((b, i) => b.id !== beats[i]?.id);
      if (moved < 0) return;
      const from = beats.findIndex((b) => b.id === next[moved].id);
      // `moved` is the first index that differs: if the beat moved down, that index
      // is where its old successor now sits, so the beat itself landed further on.
      const to = next.findIndex((b) => b.id === beats[from].id);
      return save(repositionBeat(beats, from, to));
    },
    onRemove: (beat) => {
      if (beats.length <= 1) {
        new Notice("Eine Vorlage benötigt mindestens einen Beat.");
        return;
      }
      return save(beats.filter((b) => b.id !== beat.id));
    },
    add: {
      label: "Beat hinzufügen…",
      action: () =>
        new AddBeatModal(app, (name, blurb) =>
          commitRows([...beats, { name, blurb, position: null }])
        ).open(),
    },
  });

  // Escape hatch / import path: the line grammar, applied as a whole.
  const details = host.createEl("details", { cls: "inkswell-customize__card" });
  details.createEl("summary", { text: "Als Text bearbeiten…" });
  const body = details.createDiv({ cls: "inkswell-customize__cardbody" });
  body.createDiv({
    cls: "inkswell-stats__muted",
    text: "Ein Beat pro Zeile: „Name“, „Name | Zweck“ oder „25% | Name | Zweck“. Anwenden ersetzt die obige Liste.",
  });
  const area = body.createEl("textarea", {
    cls: "inkswell-tplbody__text",
    attr: { rows: "10", spellcheck: "false" },
  });
  area.value = serializeBeatLines(beats);
  const actions = body.createDiv({ cls: "inkswell-tplbody__actions" });
  const apply = actions.createEl("button", { cls: "mod-cta", text: "Anwenden" });
  apply.type = "button";
  apply.onclick = () => {
    const parsed = parseBeatLines(area.value);
    if ("error" in parsed) {
      new Notice(parsed.error);
      return;
    }
    void save(parsed.beats);
  };
}

// ---------------------------------------------------------------------------
// Small dialogs
// ---------------------------------------------------------------------------

class AddBeatModal extends FormModal {
  private name = "";
  private blurb = "";
  constructor(
    app: App,
    private onAdd: (name: string, blurb: string) => void
  ) {
    super(app);
    this.cta = "Hinzufügen";
  }
  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "Beat hinzufügen" });
    new Setting(contentEl)
      .setName("Name")
      .setDesc("Wird auch als Schlüssel des Beats verwendet (als Slug).")
      .addText((t) => t.setPlaceholder("z. B. Mittelpunkt").onChange((v) => (this.name = v)));
    new Setting(contentEl)
      .setName("Zweck")
      .addText((t) => t.setPlaceholder("Optionaler Einzeiler").onChange((v) => (this.blurb = v)));
  }
  protected submit(): boolean {
    const name = this.name.trim();
    if (!name) {
      new Notice("Ein Name ist erforderlich.");
      return false;
    }
    if (!slugify(name)) {
      new Notice("Der Name muss Buchstaben oder Ziffern enthalten.");
      return false;
    }
    this.onAdd(name, this.blurb.trim());
    return true;
  }
}

class RenameTemplateModal extends FormModal {
  private name: string;
  constructor(
    app: App,
    current: string,
    private onRename: (name: string) => Promise<void>
  ) {
    super(app);
    this.name = current;
  }
  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "Vorlage umbenennen" });
    new Setting(contentEl)
      .setName("Name")
      .setDesc("Nur der Anzeigename – die Vorlagen-ID und alle Projekte, die sie verwenden, bleiben unverändert.")
      .addText((t) => t.setValue(this.name).onChange((v) => (this.name = v)));
  }
  protected async submit(): Promise<boolean> {
    const name = this.name.trim();
    if (!name) {
      new Notice("Ein Name ist erforderlich.");
      return false;
    }
    await this.onRename(name);
    return true;
  }
}
