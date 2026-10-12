/**
 * "Export story bible" dialog (#50): pick what goes in — alpha readers and
 * editors want different things (spoilers) — then write one note and open it.
 * The picks are remembered in `settings.storyBible`.
 */

import { App, Notice, Setting } from "obsidian";
import { featureEnabled } from "../features";
import { FormModal } from "../lib/form-modal";
import { tryFileOp } from "../lib/notify";
import { Project, isMultiScene } from "../projects/types";
import { openScene } from "../scenes/scene-actions";
import { STORY_BIBLE_SECTIONS, StoryBibleSection, assembleStoryBible } from "./story-bible";
import { codexGroups, gatherStoryBible, writeStoryBible } from "./story-bible-io";
import type InkswellPlugin from "../../main";

export class StoryBibleModal extends FormModal {
  private sections: Set<StoryBibleSection>;
  private types: Set<string>;
  private readonly available: { id: StoryBibleSection; label: string }[];
  private readonly groups: { id: string; label: string; count: number }[];

  constructor(
    app: App,
    private plugin: InkswellPlugin,
    private project: Project
  ) {
    super(app);
    this.cta = "Export";
    const disabled = plugin.settings.disabledFeatures;
    this.groups = codexGroups(plugin, project).map((g) => ({
      id: g.id,
      label: g.label,
      count: g.entities.length,
    }));
    this.available = STORY_BIBLE_SECTIONS.filter((s) => {
      if (s.id === "beats") return featureEnabled(disabled, "beats");
      if (s.id === "outline") return isMultiScene(project.draft);
      if (s.id === "codex") return this.groups.length > 0;
      return true;
    });
    const remembered = plugin.settings.storyBible;
    this.sections = new Set(
      remembered.sections.filter((s): s is StoryBibleSection =>
        this.available.some((a) => a.id === s)
      )
    );
    this.types = new Set(
      remembered.codexTypes === null
        ? this.groups.map((g) => g.id)
        : remembered.codexTypes.filter((t) => this.groups.some((g) => g.id === t))
    );
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: `Story bible: ${this.project.draft.title}` });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Writes one readable note next to the project, ready to share or export to PDF. " +
        "Pick only what this reader should see — the outline and beat sheet give the story away.",
    });

    const typeRows: Setting[] = [];
    for (const s of this.available) {
      new Setting(contentEl).setName(s.label).addToggle((t) =>
        t.setValue(this.sections.has(s.id)).onChange((on) => {
          if (on) this.sections.add(s.id);
          else this.sections.delete(s.id);
          if (s.id === "codex") for (const r of typeRows) r.setDisabled(!on);
        })
      );
      if (s.id === "codex") {
        for (const g of this.groups) {
          const row = new Setting(contentEl)
            .setName(`${g.label} (${g.count})`)
            .addToggle((t) =>
              t.setValue(this.types.has(g.id)).onChange((on) => {
                if (on) this.types.add(g.id);
                else this.types.delete(g.id);
              })
            );
          row.settingEl.addClass("inkswell-storybible__type");
          row.setDisabled(!this.sections.has("codex"));
          typeRows.push(row);
        }
      }
    }
  }

  protected async submit(): Promise<boolean> {
    if (this.sections.size === 0) {
      new Notice("Pick at least one section.");
      return false;
    }
    const allTypes = this.groups.every((g) => this.types.has(g.id));
    this.plugin.settings.storyBible = {
      sections: STORY_BIBLE_SECTIONS.map((s) => s.id).filter((id) => this.sections.has(id)),
      codexTypes: allTypes ? null : [...this.types],
    };
    void this.plugin.saveSettings();

    const file = await tryFileOp(async () => {
      const input = await gatherStoryBible(this.plugin, this.project, [...this.types]);
      return writeStoryBible(this.app, this.project, assembleStoryBible(input, this.sections));
    }, "Couldn't write the story bible.");
    if (file === null) return false; // failed (already reported) or the writer declined
    new Notice(`Story bible written: ${file.path}`);
    openScene(this.app, file);
    return true;
  }
}
