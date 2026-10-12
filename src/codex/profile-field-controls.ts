/**
 * Editable controls for one profile field — text, long text, number, list, and
 * codex links (multi, labeled, or single). Shared by the Codex detail pane and
 * the Scene Inspector's writer-defined fields (#52), so both get the same
 * behavior (Android-safe list input, labeled-link prompt, focus tags).
 *
 * The caller owns persistence: `saveValue` for scalars, `updateList` for list
 * and multi-link fields as a transform of the CURRENT stored value (so a scene
 * caller can apply it inside processFrontMatter — gotcha 10).
 */

import { App } from "obsidian";
import { tagField } from "../lib/focus-preserve";
import { autosizeTextarea } from "../lib/form-fields";
import { promptText } from "../scenes/scene-actions";
import { linkAlias, linkTarget, toLink } from "./codex";
import { ProfileField, ProfileValue } from "./profile-schema";

export interface ProfileFieldDeps {
  app: App;
  field: ProfileField;
  value: ProfileValue | undefined;
  /** Link candidates (already scoped; any category — filtered by `linkCategory` here). */
  candidates: () => { name: string; category: string }[];
  /** Display label for a codex type id (the "no entries" message). */
  typeLabel: (id: string) => string;
  /** Focus-tag prefix: `<prefix>:<key>` (`codex`, `scene:x`). */
  tagPrefix: string;
  /**
   * Persist a scalar (text / textarea / number / single link; "" clears).
   * `structural` marks edits other UI shows too (a link), so the caller may
   * re-render more than the field.
   */
  saveValue: (value: ProfileValue, structural: boolean) => void;
  /** Persist a list / multi-link change against the current stored value. */
  updateList: (transform: (current: string[]) => string[]) => void;
}

export function renderProfileFieldControl(control: HTMLElement, deps: ProfileFieldDeps): void {
  const { field, value, tagPrefix } = deps;
  const tag = `${tagPrefix}:${field.key}`;

  if (field.type === "text" || field.type === "image") {
    const t = control.createEl("input", { type: "text" });
    tagField(t, tag);
    t.value = typeof value === "string" ? value : "";
    if (field.placeholder) t.placeholder = field.placeholder;
    t.onchange = () => deps.saveValue(t.value, false);
    return;
  }
  if (field.type === "textarea") {
    const ta = control.createEl("textarea", { cls: "inkswell-inspector__textarea" });
    tagField(ta, tag);
    ta.rows = 4; // prose fields (motivation, arc, voice…) — autosize grows from here
    ta.value = typeof value === "string" ? value : "";
    if (field.placeholder) ta.placeholder = field.placeholder;
    ta.onchange = () => deps.saveValue(ta.value, false);
    autosizeTextarea(ta);
    return;
  }
  if (field.type === "number") {
    // Saved as a JS number → a bare YAML number, so Bases/Dataview can sort and
    // sum it. A non-numeric stored value shows empty and is only overwritten
    // when the user actually edits the field (onchange).
    const t = control.createEl("input", {
      type: "number",
      attr: { step: "any", inputmode: "decimal" },
    });
    tagField(t, tag);
    t.value = typeof value === "number" ? String(value) : "";
    if (field.placeholder) t.placeholder = field.placeholder;
    t.onchange = () => {
      const s = t.value.trim();
      const n = Number(s);
      deps.saveValue(s !== "" && Number.isFinite(n) ? n : "", false);
    };
    return;
  }
  if (field.type === "list") {
    const current = Array.isArray(value) ? value : [];
    const chips = control.createDiv({ cls: "inkswell-inspector__chips" });
    for (const val of current) {
      const chip = chips.createSpan({ cls: "inkswell-chip", text: val });
      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.onclick = () => deps.updateList((cur) => cur.filter((c) => c !== val));
    }
    const addRow = control.createDiv({ cls: "inkswell-inspector__addrow" });
    const input = addRow.createEl("input", { type: "text" });
    tagField(input, `${tag}-add`);
    input.placeholder = field.placeholder ?? "Add…";
    const commit = () => {
      const v = input.value.trim();
      // Clear before the refresh so the focus-preserving rebuild hands back an
      // empty input, ready for the next value.
      input.value = "";
      if (v) deps.updateList((cur) => (cur.includes(v) ? cur : [...cur, v]));
    };
    input.onkeydown = (e) => {
      if (e.key !== "Enter") return;
      commit();
    };
    // Android IMEs often don't deliver an Enter keydown at all (key
    // "Unidentified"/229 while composing) — the button always works.
    const addBtn = addRow.createEl("button", { text: "Add" });
    addBtn.onclick = commit;
    return;
  }
  renderLinkControl(control, deps);
}

function renderLinkControl(control: HTMLElement, deps: ProfileFieldDeps): void {
  const { field, value, tagPrefix } = deps;
  const tag = `${tagPrefix}:${field.key}`;
  const candidates = deps
    .candidates()
    .filter((e) => !field.linkCategory || e.category === field.linkCategory);

  if (field.single) {
    const cur = typeof value === "string" && value ? linkTarget(value) : "";
    const sel = control.createEl("select", { cls: "dropdown" });
    tagField(sel, tag);
    sel.createEl("option", { text: "— none —", value: "" });
    for (const c of candidates) sel.createEl("option", { text: c.name, value: c.name });
    sel.value = candidates.some((c) => c.name === cur) ? cur : "";
    sel.onchange = () => deps.saveValue(sel.value ? toLink(sel.value) : "", true);
    return;
  }

  const current = Array.isArray(value) ? value : [];
  const chips = control.createDiv({ cls: "inkswell-inspector__chips" });
  for (const link of current) {
    const target = linkTarget(link);
    const chip = chips.createSpan({ cls: "inkswell-chip" });
    chip.createSpan({ cls: "inkswell-codex__linktarget", text: target });
    if (field.labeled) {
      // The label lives in the wikilink alias ([[Anna|sister]]). Edited via a
      // prompt rather than an inline input: the chip is rebuilt on save, and a
      // modal sidesteps both focus-preservation and Android IME Enter quirks.
      const alias = linkAlias(link);
      const lab = chip.createSpan({
        cls: "inkswell-codex__linklabel",
        text: alias ? `· ${alias}` : "+ label",
      });
      if (!alias) lab.addClass("is-empty");
      lab.setAttribute("aria-label", alias ? `Change the “${alias}” label` : "Add a label");
      lab.onclick = () => {
        void (async () => {
          const v = await promptText(deps.app, {
            title: `Relationship to ${target}`,
            value: alias ?? "",
            multiline: false,
            cta: "Save",
          });
          if (v === null) return; // cancelled; "" clears the label
          deps.updateList((cur) => cur.map((c) => (c === link ? toLink(target, v) : c)));
        })();
      };
    }
    const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
    x.onclick = () => deps.updateList((cur) => cur.filter((c) => c !== link));
  }
  const remaining = candidates.filter((c) => !current.some((link) => linkTarget(link) === c.name));
  if (remaining.length > 0) {
    const add = control.createEl("select", { cls: "dropdown" });
    tagField(add, `${tag}-add`);
    add.createEl("option", { text: `+ add ${field.label.toLowerCase()}`, value: "" });
    for (const c of remaining) add.createEl("option", { text: c.name, value: c.name });
    add.value = "";
    add.onchange = () => {
      const name = add.value;
      if (!name) return;
      deps.updateList((cur) => (cur.some((l) => linkTarget(l) === name) ? cur : [...cur, toLink(name)]));
    };
  } else if (candidates.length === 0) {
    const cat = field.linkCategory ? deps.typeLabel(field.linkCategory).toLowerCase() : "entity";
    control.createSpan({ cls: "inkswell-stats__muted", text: `No ${cat} entries in codex.` });
  }
}
