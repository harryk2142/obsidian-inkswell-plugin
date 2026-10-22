/**
 * One-time welcome shown on first launch. Orients the user to the phase pipeline
 * and points at the contextual tips, then sets `welcomeSeen` so it never nags
 * again. Re-armed via Settings → Help → "Reset tips & replay welcome".
 */

import { App, Modal, setIcon } from "obsidian";
import type InkswellPlugin from "../../main";

interface Phase {
  icon: string;
  name: string;
  blurb: string;
}

const PHASES: Phase[] = [
  { icon: "compass", name: "Planen", blurb: "Übersicht, Beat-Sheet und Geschichtenstruktur." },
  { icon: "pencil", name: "Schreiben", blurb: "Fokussierter Editor mit Aufgabenmarkierungen." },
  { icon: "git-compare", name: "Überarbeiten", blurb: "Prüfung, Entscheidungsprotokoll und Durchgänge." },
  { icon: "upload", name: "Veröffentlichen", blurb: "Kompiliere und veröffentliche dein Buch." },
  { icon: "book-marked", name: "Kodex", blurb: "Deine überall verwendete Story-Bibel." },
  { icon: "bar-chart-3", name: "Fortschritt", blurb: "Wortzahlen, Schreibserien und Sprints." },
];

export class WelcomeModal extends Modal {
  constructor(
    app: App,
    private plugin: InkswellPlugin
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("inkswell-welcome");

    contentEl.createEl("h2", { text: "Willkommen bei Inkswell" });
    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        "A complete workbench for novelists — one tab, organised by the phase you're " +
        "in. Switch phases from the icon rail on the left:",
    });

    const grid = contentEl.createDiv({ cls: "inkswell-welcome__grid" });
    for (const phase of PHASES) {
      const card = grid.createDiv({ cls: "inkswell-welcome__card" });
      setIcon(card.createSpan({ cls: "inkswell-welcome__icon" }), phase.icon);
      const text = card.createDiv({ cls: "inkswell-welcome__text" });
      text.createSpan({ cls: "inkswell-welcome__name", text: phase.name });
      text.createSpan({ cls: "inkswell-stats__muted", text: phase.blurb });
    }

    contentEl.createEl("p", {
      text:
        "New to a panel? Look for the “How this works” tip at the top — dismiss it once " +
        "you've got it. The Help tab in the rail keeps the full guide.",
    });

    const actions = contentEl.createDiv({ cls: "inkswell-welcome__actions" });
    const start = actions.createEl("button", { cls: "mod-cta", text: "Loslegen" });
    start.onclick = () => this.close();
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.plugin.settings.welcomeSeen) {
      this.plugin.settings.welcomeSeen = true;
      // Modal.onClose is void; persist without awaiting (fire-and-forget).
      void this.plugin.saveSettings();
    }
  }
}
