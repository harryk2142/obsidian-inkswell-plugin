/**
 * Analysis panel (Revise → Analysis): readability, most-used words, and echo
 * (repeated-phrase) detection for the selected project's manuscript. Reads scene
 * bodies on demand and runs the pure analyzers in analysis.ts.
 */

import { App, TFile } from "obsidian";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { assembleManuscriptText, findEchoes, readability, wordFrequency } from "./analysis";
import { compositionProfile } from "./composition";

export class AnalysisPanel {
  private app: App;
  private store: ProjectStore;
  private active: ActiveProject;

  constructor(app: App, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.store = store;
    this.active = active;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-analysis");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "Keine Projekte mit mehreren Szenen." });
      return;
    }

    const results = container.createDiv({ cls: "inkswell-analysis__results" });
    results.createDiv({ cls: "inkswell-stats__muted", text: "Manuskript wird analysiert…" });
    void this.analyze(results, project);
  }

  private async analyze(results: HTMLElement, project: Project): Promise<void> {
    const scenes: { title: string; text: string }[] = [];
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (file instanceof TFile) {
        scenes.push({ title: scene.title, text: await this.app.vault.cachedRead(file) });
      }
    }
    // Per-scene frontmatter strip, then join (see assembleManuscriptText).
    const { joined: text, scenes: bodies } = assembleManuscriptText(scenes);
    results.empty();

    if (!text.trim()) {
      results.createDiv({ cls: "inkswell-stats__muted", text: "Kein Szenentext zum Analysieren." });
      return;
    }

    const r = readability(text);
    const read = results.createDiv({ cls: "inkswell-stats__section" });
    read.createEl("h4", { text: "Lesbarkeit" });
    read.createDiv({
      cls: "inkswell-stats__row",
      text: `Grade ${r.grade} · Reading ease ${r.ease}`,
    });
    read.createDiv({
      cls: "inkswell-stats__muted",
      text: `${r.words.toLocaleString()} words · ${r.sentences.toLocaleString()} sentences · ${(r.words / r.sentences).toFixed(1)} words/sentence`,
    });

    const freqSec = results.createDiv({ cls: "inkswell-stats__section" });
    freqSec.createEl("h4", { text: "Häufigste Wörter" });
    const chips = freqSec.createDiv({ cls: "inkswell-analysis__chips" });
    for (const f of wordFrequency(text, 20)) {
      chips.createSpan({ cls: "inkswell-chip", text: `${f.word} ${f.count}` });
    }

    const echoSec = results.createDiv({ cls: "inkswell-stats__section" });
    echoSec.createEl("h4", { text: "Echos (wiederholte Formulierungen)" });
    const echoes = findEchoes(text, 3, 2, 15);
    if (echoes.length === 0) {
      echoSec.createDiv({ cls: "inkswell-stats__muted", text: "Keine wiederholten Dreiwortfolgen gefunden." });
    } else {
      for (const e of echoes) {
        echoSec.createDiv({
          cls: "inkswell-stats__row",
          text: `“${e.phrase}” ×${e.count}`,
        });
      }
    }

    // Composition — paragraph mix + per-scene balance flags. Honest about limits.
    const compSec = results.createDiv({ cls: "inkswell-stats__section" });
    compSec.createEl("h4", { text: "Szenenzusammensetzung" });
    compSec.createDiv({
      cls: "inkswell-stats__muted",
      text: "Heuristik: Absätze werden als Dialog / Innenleben / Erzählung klassifiziert (Beschreibung und Handlung werden gemeinsam gezählt).",
    });
    const overall = compositionProfile(text);
    const pct = (r: number) => `${Math.round(r * 100)}%`;
    compSec.createDiv({
      cls: "inkswell-stats__row",
      text: `Dialogue ${pct(overall.ratios.dialogue)} · Interiority ${pct(overall.ratios.interiority)} · Narration ${pct(overall.ratios.narration)}`,
    });
    const flagged = bodies
      .map((s) => ({ title: s.title, flags: compositionProfile(s.body).flags }))
      .filter((s) => s.flags.length > 0);
    if (flagged.length === 0) {
      compSec.createDiv({ cls: "inkswell-stats__muted", text: "Keine Hinweise auf Ungleichgewichte auf Szenenebene." });
    } else {
      for (const s of flagged) {
        compSec.createDiv({ cls: "inkswell-stats__row", text: `${s.title}: ${s.flags.join(" ")}` });
      }
    }
  }
}
