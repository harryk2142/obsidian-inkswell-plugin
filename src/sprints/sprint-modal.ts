/**
 * Dialog to start a writing sprint: choose duration (minutes) and an optional
 * word goal.
 */

import { App, Setting } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { SprintController } from "./sprint-controller";

export class SprintModal extends FormModal {
  private sprints: SprintController;
  private minutes: number;
  private goal: number;
  protected cta = "Beginn";

  constructor(
    app: App,
    sprints: SprintController,
    defaultMinutes: number,
    defaultGoal = 0
  ) {
    super(app);
    this.sprints = sprints;
    this.minutes = defaultMinutes;
    this.goal = defaultGoal;
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "Schreibsprint starten" });

    new Setting(contentEl).setName("Dauer (Minuten)").addText((t) =>
      t.setValue(`${this.minutes}`).onChange((v) => {
        const n = Math.floor(Number(v));
        if (Number.isFinite(n) && n > 0) this.minutes = n;
      })
    );

    new Setting(contentEl)
      .setName("Wortziel (optional)")
      .setDesc("Für kein Ziel auf 0 lassen.")
      .addText((t) =>
        t.setValue(`${this.goal}`).onChange((v) => {
          const n = Math.floor(Number(v));
          this.goal = Number.isFinite(n) && n > 0 ? n : 0;
        })
      );
  }

  protected submit(): void {
    this.sprints.start(this.minutes, this.goal > 0 ? this.goal : null);
  }
}
