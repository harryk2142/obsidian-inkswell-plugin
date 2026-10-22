/**
 * Plan → Overview: novel-level planning that isn't yet broken into beats/scenes.
 * Short structured fields (logline/theme/genre/audience) persist to the index
 * frontmatter under `inkswell.overview`; long-form prose (synopsis, plot
 * groundwork, 3-act sketch) lives in a dedicated planning note edited via
 * textareas here and openable in the real editor.
 *
 * Autosave fires on `change` (blur), never `input`, so the host's focus-guard
 * (inkswell-view renderActive) never rebuilds the body mid-keystroke.
 */

import { App, TFile } from "obsidian";
import { preserveFocus, tagField } from "../lib/focus-preserve";
import { tryFileOp } from "../lib/notify";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { persistOverview } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { baseDraftFor } from "../projects/stories";
import { Project, ProjectOverview } from "../projects/types";
import { openScene } from "../scenes/scene-actions";
import { renderEmptyStateAction } from "../views/panel-kit";
import {
  ensurePlanningNote,
  findPlanningNote,
  readSection,
  writeSection,
} from "./planning-note";
import {
  EffectivePlanSection,
  PlanSection,
  planningSectionHeadings,
  planningSections,
} from "./sections";
import type InkswellPlugin from "../../main";

export const OVERVIEW_FIELDS: { key: keyof ProjectOverview; label: string; placeholder: string }[] = [
  { key: "logline", label: "Logline", placeholder: "Ein Satz: Wer will was und gegen welche Widerstände…" },
  { key: "theme", label: "Thema", placeholder: "Die tiefere Bedeutung / Lebenslektion…" },
  { key: "genre", label: "Genre", placeholder: "z. B. epische Fantasy" },
  { key: "audience", label: "Zielgruppe", placeholder: "z. B. Erwachsene, Jugendbuch…" },
];

/**
 * Per-section get-started prompts shown as textarea placeholders. Kept
 * method-agnostic on purpose — a single open question, not a plot theory the
 * writer has to delete. Sections without an entry fall back to "<heading>…".
 */
const SECTION_PROMPTS: Partial<Record<PlanSection, string>> = {
  "Plot groundwork":
    "Welche fünf Schlüsselmomente, Szenen oder Ereignisse werden sicher stattfinden? Sie müssen noch weder geordnet noch miteinander verbunden sein.",
};

export class OverviewPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;
  private container: HTMLElement | null = null;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.active = active;
  }

  /** Re-render in place after a notify caused by our own field writes (marked
   *  as self-writes), so the host's `.inkswell-content` scroller — and the
   *  field being edited — survive instead of a full body teardown. */
  softRefresh(): void {
    if (this.container?.isConnected) {
      preserveFocus(this.container, () => this.render(this.container as HTMLElement));
    }
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-overview");

    const active = resolveActive(this.store.getProjects(), this.active.get());
    if (!active) {
      renderEmptyStateAction(container, "Noch keine Projekte – ein Projekt enthält Ihre Szenen, Ihre Planung und Ihre Ziele.", [
        { label: "Projekt erstellen", cta: true, onClick: () => this.plugin.newProject() },
      ]);
      return;
    }
    // Overview + planning note are story-level — always read/write the base draft
    // so all drafts of a story share them (matches the Home hero card).
    const project = baseDraftFor(this.store.getProjects(), active);

    this.renderFields(container, project);
    this.renderProse(container, project);
  }

  /** Short, single-line fields → inkswell.overview frontmatter. */
  private renderFields(root: HTMLElement, project: Project): void {
    const overview = project.inkswell?.overview ?? {};
    const indexFile = this.indexFile(project);
    const grid = root.createDiv({ cls: "inkswell-overview__fields" });
    for (const f of OVERVIEW_FIELDS) {
      const row = grid.createDiv({ cls: "inkswell-overview__field" });
      row.createDiv({ cls: "inkswell-overview__label", text: f.label });
      const input = row.createEl("input", { type: "text", cls: "inkswell-overview__input" });
      tagField(input, `overview:${f.key}`);
      input.placeholder = f.placeholder;
      input.value = (overview[f.key] as string) ?? "";
      input.onchange = () => {
        if (indexFile) {
          this.plugin.selfWrites.mark(indexFile.path);
          void tryFileOp(
            () => persistOverview(this.app, indexFile, { [f.key]: input.value.trim() }),
            `${f.label} konnte nicht gespeichert werden.`
          );
        }
      };
    }
  }

  /** Long-form prose → the project's planning note, one textarea per H2 section. */
  private renderProse(root: HTMLElement, project: Project): void {
    const sec = root.createDiv({ cls: "inkswell-overview__prose" });
    const head = sec.createDiv({ cls: "inkswell-overview__prosehead" });
    head.createSpan({ cls: "inkswell-overview__prosetitle", text: "Planungsnotiz" });
    const open = head.createEl("button", { text: "Planungsnotiz öffnen" });
    open.setAttribute("aria-label", "Planungsnotiz in einer Editor-Registerkarte öffnen");
    open.onclick = async () => {
      const file = await tryFileOp(async () => {
        const f = await ensurePlanningNote(this.app, project);
        await this.rememberNote(project, f);
        return f;
      }, "Die Planungsnotiz konnte nicht geöffnet werden.");
      if (file) openScene(this.app, file);
    };

    const fields = planningSections(this.plugin.settings.listOverrides["plan.sections"])
      .filter((field) => !field.hidden);
    const fieldsRoot = sec.createDiv({ cls: "inkswell-overview__prosefields" });
    const file = findPlanningNote(this.app, project);
    if (!file) {
      this.renderProseEditors(fieldsRoot, project, fields);
      return;
    }

    // An existing planning note is authoritative for which managed fields it
    // contains. Removing an H2 therefore removes its editor without deleting
    // or rewriting anything else in the note.
    void this.loadProse(project, file, fieldsRoot, fields);
  }

  private renderProseEditors(
    root: HTMLElement,
    project: Project,
    fields: EffectivePlanSection[],
    source?: string
  ): void {
    for (const field of fields) {
      const { heading } = field;
      const block = root.createDiv({ cls: "inkswell-overview__section" });
      block.createDiv({ cls: "inkswell-overview__label", text: field.label });
      const ta = block.createEl("textarea", { cls: "inkswell-overview__textarea" });
      tagField(ta, `overview:section:${field.id}`);
      ta.rows = field.rows;
      ta.placeholder = SECTION_PROMPTS[heading] ?? `${field.label}…`;
      if (source !== undefined) ta.value = readSection(source, heading);
      ta.onchange = () => void this.saveSection(project, heading, ta.value);
    }
  }

  private async loadProse(
    project: Project,
    file: TFile,
    root: HTMLElement,
    fields: EffectivePlanSection[]
  ): Promise<void> {
    // Found via fallback (stale pointer after a rename)? Heal the pointer now so
    // later saves and the tracker's classifier agree on which note this is.
    await this.rememberNote(project, file);
    const source = await this.app.vault.read(file);
    if (!root.isConnected) return;
    const noteHeadings = planningSectionHeadings(source);
    this.renderProseEditors(
      root,
      project,
      fields
        .filter((field) => noteHeadings.has(field.heading))
        .map((field) => ({
          ...field,
          label: noteHeadings.get(field.heading) ?? field.label,
        })),
      source
    );
  }

  private async saveSection(project: Project, heading: PlanSection, text: string): Promise<void> {
    await tryFileOp(async () => {
      const file = await ensurePlanningNote(this.app, project);
      await this.rememberNote(project, file);
      await writeSection(this.app, file, heading, text);
    }, "Die Planungsnotiz konnte nicht gespeichert werden.");
  }

  /** Persist the planning-note path the first time we create/use it. */
  private async rememberNote(project: Project, file: TFile): Promise<void> {
    if (project.inkswell?.overview?.planningNote === file.path) return;
    const indexFile = this.indexFile(project);
    if (indexFile) {
      // Mark only the index write — the planning note itself carries no
      // `longform` key, so the store never fingerprints it into a notify.
      this.plugin.selfWrites.mark(indexFile.path);
      await persistOverview(this.app, indexFile, { planningNote: file.path });
    }
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
