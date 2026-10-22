/**
 * Beat-sheet templates. v1 ships the Save the Cat! Writes a Novel 15-beat
 * structure (Jessica Brody) — the project's preferred outlining style. Beat
 * *definitions* (name, blurb, position) live here in code; per-project
 * *assignments* (note, scene link, done) are stored in `inkswell.beats`.
 */

export interface BeatDef {
  id: string;
  name: string;
  /** One-line purpose of the beat. */
  blurb: string;
  /** Representative position in the book, 0–1 (for ordering + a % label). */
  position: number;
}

/** Per-project, per-beat data overlaid on a template definition. */
export interface BeatAssignment {
  /** Scene titles this beat is realized by (a beat may span several scenes). */
  scenes?: string[];
  /** Planning note: what happens at this beat. */
  note?: string;
  /** Marked complete. */
  done?: boolean;
}

export interface BeatSheet {
  template: string;
  assignments: Record<string, BeatAssignment>;
}

export const SAVE_THE_CAT: BeatDef[] = [
  { id: "opening-image", name: "Eröffnungsbild", position: 0.0, blurb: "Eine Momentaufnahme aus dem Leben der Hauptfigur vor Beginn der Geschichte – sie bestimmt Ton und Ausgangspunkt." },
  { id: "theme-stated", name: "Thema wird genannt", position: 0.05, blurb: "Jemand deutet an, worum es in der Geschichte wirklich geht – die Lektion, welche die Hauptfigur lernen muss." },
  { id: "setup", name: "Ausgangslage", position: 0.08, blurb: "Etabliert die gewohnte Welt der Hauptfigur, ihre Schwächen und das, was verändert werden muss." },
  { id: "catalyst", name: "Auslöser", position: 0.1, blurb: "Das auslösende Ereignis durchbricht den bisherigen Zustand." },
  { id: "debate", name: "Zweifel", position: 0.15, blurb: "Die Hauptfigur zögert und widersetzt sich der Veränderung – was soll sie tun?" },
  { id: "break-into-2", name: "Aufbruch in Akt II", position: 0.2, blurb: "Die Hauptfigur trifft eine Entscheidung und betritt die neue Welt (Akt II)." },
  { id: "b-story", name: "B-Handlung", position: 0.22, blurb: "Eine neue Beziehung beginnt, die das Thema der Geschichte trägt." },
  { id: "fun-and-games", name: "Spaß und Spiel", position: 0.35, blurb: "Das Versprechen der Prämisse – Schlüsselszenen erkunden die neue Welt." },
  { id: "midpoint", name: "Mittelpunkt", position: 0.5, blurb: "Ein falscher Sieg oder eine falsche Niederlage; der Einsatz steigt und die Geschichte nimmt eine neue Richtung." },
  { id: "bad-guys-close-in", name: "Die Gegner rücken näher", position: 0.62, blurb: "Der Druck wächst – äußere Gegner und innere Zweifel ziehen sich immer enger zusammen." },
  { id: "all-is-lost", name: "Alles ist verloren", position: 0.75, blurb: "Der Tiefpunkt; die Hauptfigur verliert etwas Entscheidendes und spürt einen Hauch des Todes." },
  { id: "dark-night-of-the-soul", name: "Dunkle Nacht der Seele", position: 0.78, blurb: "Der dunkelste Moment der Verzweiflung vor dem Durchbruch." },
  { id: "break-into-3", name: "Aufbruch in Akt III", position: 0.8, blurb: "Der Aha-Moment – die Hauptfigur findet die Lösung und führt A- und B-Handlung zusammen." },
  { id: "finale", name: "Finale", position: 0.9, blurb: "Die Hauptfigur beweist, dass sie ihre Lektion gelernt hat, und bringt die Welt wieder ins Lot." },
  { id: "final-image", name: "Schlussbild", position: 1.0, blurb: "Eine abschließende Momentaufnahme spiegelt den Anfang und zeigt, wie weit sich die Hauptfigur entwickelt hat." },
];

export const THREE_ACT: BeatDef[] = [
  { id: "setup", name: "Ausgangslage", position: 0.0, blurb: "Etabliert Hauptfigur, Welt und bisherigen Zustand." },
  { id: "inciting-incident", name: "Auslösendes Ereignis", position: 0.12, blurb: "Das Ereignis, das die Geschichte in Gang setzt." },
  { id: "plot-point-1", name: "Erster Wendepunkt", position: 0.25, blurb: "Die Hauptfigur legt sich fest; Akt II beginnt." },
  { id: "midpoint", name: "Mittelpunkt", position: 0.5, blurb: "Eine Wendung erhöht den Einsatz und verschiebt das Ziel." },
  { id: "plot-point-2", name: "Zweiter Wendepunkt", position: 0.75, blurb: "Tiefpunkt und letzter Anstoß in Richtung Akt III." },
  { id: "climax", name: "Höhepunkt", position: 0.9, blurb: "Die entscheidende Konfrontation." },
  { id: "resolution", name: "Auflösung", position: 1.0, blurb: "Die Folgen und der neue Alltag." },
];

export const HEROS_JOURNEY: BeatDef[] = [
  { id: "ordinary-world", name: "Gewohnte Welt", position: 0.0, blurb: "Das normale Leben der Hauptfigur vor dem Abenteuer." },
  { id: "call-to-adventure", name: "Ruf zum Abenteuer", position: 0.08, blurb: "Ein Problem oder eine Herausforderung taucht auf." },
  { id: "refusal", name: "Weigerung", position: 0.12, blurb: "Die Hauptfigur zögert oder verweigert sich dem Ruf." },
  { id: "meeting-the-mentor", name: "Begegnung mit dem Mentor", position: 0.18, blurb: "Rat und Hilfsmittel für die bevorstehende Reise." },
  { id: "crossing-the-threshold", name: "Überschreiten der Schwelle", position: 0.25, blurb: "Die Hauptfigur entscheidet sich für die besondere Welt." },
  { id: "tests-allies-enemies", name: "Prüfungen, Verbündete und Feinde", position: 0.35, blurb: "Die Regeln werden erlernt und Bindungen entstehen." },
  { id: "approach", name: "Vordringen zur tiefsten Höhle", position: 0.45, blurb: "Vorbereitung auf die zentrale Prüfung." },
  { id: "ordeal", name: "Entscheidende Prüfung", position: 0.5, blurb: "Die größte Angst und eine Begegnung mit dem Tod." },
  { id: "reward", name: "Belohnung", position: 0.6, blurb: "Nach dem Überleben wird der Preis errungen." },
  { id: "the-road-back", name: "Rückweg", position: 0.75, blurb: "Der Drang, die Heimreise zu vollenden." },
  { id: "resurrection", name: "Auferstehung", position: 0.85, blurb: "Die letzte Prüfung beweist die Verwandlung." },
  { id: "return-with-elixir", name: "Rückkehr mit dem Elixier", position: 1.0, blurb: "Verändert kehrt die Hauptfigur mit etwas Wertvollem nach Hause zurück." },
];

export const SEVEN_POINT: BeatDef[] = [
  { id: "hook", name: "Aufhänger", position: 0.0, blurb: "Der Ausgangszustand – das Gegenteil der Auflösung." },
  { id: "plot-turn-1", name: "Erste Wendung", position: 0.15, blurb: "Der Handlungsimpuls führt in Akt II." },
  { id: "pinch-1", name: "Erster Druckpunkt", position: 0.3, blurb: "Der Druck steigt und die Macht des Gegenspielers zeigt sich." },
  { id: "midpoint", name: "Mittelpunkt", position: 0.5, blurb: "Der Wechsel vom Reagieren zum Handeln." },
  { id: "pinch-2", name: "Zweiter Druckpunkt", position: 0.625, blurb: "Der Druck wächst weiter; die Lage scheint aussichtslos." },
  { id: "plot-turn-2", name: "Zweite Wendung", position: 0.75, blurb: "Das letzte zum Sieg benötigte Puzzlestück wird gewonnen." },
  { id: "resolution", name: "Auflösung", position: 1.0, blurb: "Der Endzustand – das Gegenteil des Aufhängers." },
];

export const STORY_CIRCLE: BeatDef[] = [
  { id: "you", name: "Du", position: 0.0, blurb: "Eine Figur befindet sich in ihrer vertrauten Umgebung." },
  { id: "need", name: "Bedürfnis", position: 0.12, blurb: "Doch sie will etwas." },
  { id: "go", name: "Aufbruch", position: 0.25, blurb: "Sie begibt sich in eine ungewohnte Situation." },
  { id: "search", name: "Suche", position: 0.4, blurb: "Sie passt sich der Situation an." },
  { id: "find", name: "Finden", position: 0.5, blurb: "Sie erhält, was sie wollte." },
  { id: "take", name: "Preis", position: 0.62, blurb: "Dafür zahlt sie einen hohen Preis." },
  { id: "return", name: "Rückkehr", position: 0.8, blurb: "Dann kehrt sie in ihre vertraute Umgebung zurück." },
  { id: "change", name: "Veränderung", position: 1.0, blurb: "Sie hat sich verändert." },
];

export const ROMANCING_THE_BEAT: BeatDef[] = [
  { id: "introduce-leads", name: "Hauptfiguren vorstellen", position: 0.0, blurb: "Beide Hauptfiguren und ihre Schwächen werden etabliert." },
  { id: "meet", name: "Begegnung", position: 0.1, blurb: "Die Hauptfiguren treffen aufeinander; es funkt und reibt sich." },
  { id: "adhesion", name: "Bindung", position: 0.15, blurb: "Ein Grund zwingt sie, zusammenzubleiben." },
  { id: "no-way-1", name: "Keine Chance Nr. 1", position: 0.2, blurb: "Warum diese Beziehung nicht funktionieren kann." },
  { id: "inkling-of-desire", name: "Erste Sehnsucht", position: 0.3, blurb: "Trotz aller Widerstände wird die Anziehung spürbar." },
  { id: "deepening-desire", name: "Wachsende Sehnsucht", position: 0.4, blurb: "Entgegen besserem Wissen verlieben sie sich." },
  { id: "midpoint-of-love", name: "Mittelpunkt der Liebe", position: 0.5, blurb: "Ein Höhepunkt ihrer Verbundenheit." },
  { id: "inkling-of-doubt", name: "Erste Zweifel", position: 0.6, blurb: "Risse zeigen sich erneut und alte Ängste kehren zurück." },
  { id: "retreating", name: "Rückzug", position: 0.7, blurb: "Sie ziehen sich zurück, um sich selbst zu schützen." },
  { id: "breakup", name: "Trennung / Dunkler Moment", position: 0.75, blurb: "Die Beziehung zerbricht." },
  { id: "wallowing", name: "Im Elend versinken", position: 0.82, blurb: "Der gemeinsame Tiefpunkt in der Trennung." },
  { id: "epiphany", name: "Erkenntnis", position: 0.88, blurb: "Sie erkennen, was sich ändern muss." },
  { id: "grand-gesture", name: "Große Geste", position: 0.95, blurb: "Sie beweisen, dass sie ihre Lektion gelernt haben." },
  { id: "happily-ever-after", name: "Glücklich bis ans Ende", position: 1.0, blurb: "Die verdiente Vereinigung und der neue gemeinsame Alltag." },
];

const TWENTY_SEVEN_LABELS = [
  "Einführung", "Auslösendes Ereignis", "Unmittelbare Reaktion", "Reaktion", "Handlung",
  "Folge", "Druck", "Engpass", "Anstoß", "Neue Welt", "Spaß und Spiel",
  "Kontrast zur alten Welt", "Aufbau", "Mittelpunkt", "Umkehr", "Reaktion",
  "Handlung", "Entschlossenheit", "Prüfungen", "Zweiter Engpass", "Dunkelster Moment", "Innere Kraft",
  "Handlung", "Zusammenlaufende Wege", "Kampf", "Höhepunkt", "Auflösung",
];
export const TWENTY_SEVEN_CHAPTER: BeatDef[] = TWENTY_SEVEN_LABELS.map((name, i) => ({
  id: `ch-${i + 1}`,
  name: `${i + 1}. ${name}`,
  position: i / (TWENTY_SEVEN_LABELS.length - 1),
  blurb: "",
}));

/**
 * Diane Duane's ten-point outline: list the ten things that MUST happen in the
 * story, then break each down. The method is content-agnostic, so the beats are
 * generic numbered points — the user's "thing" goes in each beat's note.
 */
export const TEN_POINT: BeatDef[] = Array.from({ length: 10 }, (_, i) => ({
  id: `point-${i + 1}`,
  name: `Punkt ${i + 1}`,
  position: i / 9,
  blurb:
    i === 0
      ? "Das erste unverzichtbare Ereignis – hier beginnt die Geschichte."
      : i === 9
        ? "Das letzte unverzichtbare Ereignis – hier kommt die Geschichte an."
        : "",
}));

export const BEAT_TEMPLATES: Record<string, BeatDef[]> = {
  "save-the-cat": SAVE_THE_CAT,
  "three-act": THREE_ACT,
  "heros-journey": HEROS_JOURNEY,
  "seven-point": SEVEN_POINT,
  "story-circle": STORY_CIRCLE,
  "romancing-the-beat": ROMANCING_THE_BEAT,
  "twenty-seven-chapter": TWENTY_SEVEN_CHAPTER,
  "ten-point": TEN_POINT,
};

/** Built-in templates for the picker, in display order (customs are appended
 *  at render time via allTemplateMeta — see custom-templates.ts). */
export const TEMPLATE_META: { id: string; label: string }[] = [
  { id: "save-the-cat", label: "Save the Cat (15)" },
  { id: "three-act", label: "Drei-Akt-Struktur (7)" },
  { id: "heros-journey", label: "Heldenreise (12)" },
  { id: "seven-point", label: "Sieben-Punkte-Struktur (7)" },
  { id: "story-circle", label: "Story Circle (8)" },
  { id: "romancing-the-beat", label: "Romancing the Beat (14)" },
  { id: "twenty-seven-chapter", label: "27-Kapitel-Methode (27)" },
  { id: "ten-point", label: "Zehn-Punkte-Gliederung (10)" },
];

export const DEFAULT_TEMPLATE = "save-the-cat";

/**
 * An act (or named part) a template divides the book into, for structure
 * scaffolding. A beat belongs to the LAST act whose `from` ≤ its `position`
 * (i.e. `from` is the inclusive start of the act's position range).
 */
export interface TemplateAct {
  title: string;
  from: number;
}

const THREE_ACTS = (act2From: number, act3From: number): TemplateAct[] => [
  { title: "Akt I", from: 0 },
  { title: "Akt II", from: act2From },
  { title: "Akt III", from: act3From },
];

/**
 * Per-template act boundaries, editorially matched to each structure: Save the
 * Cat's Break Into Two/Three *start* their acts (Brody's sheet); the 27-chapter
 * method is literally 3 acts × 9 chapters; Romancing the Beat divides into Gwen
 * Hayes' four named parts rather than numbered acts.
 */
export const TEMPLATE_ACTS: Record<string, TemplateAct[]> = {
  "save-the-cat": THREE_ACTS(0.2, 0.8),
  "three-act": THREE_ACTS(0.25, 0.9),
  "heros-journey": THREE_ACTS(0.25, 0.75),
  "seven-point": THREE_ACTS(0.15, 0.9),
  "story-circle": THREE_ACTS(0.25, 0.8),
  "romancing-the-beat": [
    { title: "Ausgangslage", from: 0 },
    { title: "Verlieben", from: 0.3 },
    { title: "Rückzug", from: 0.6 },
    { title: "Kampf um die Liebe", from: 0.88 },
  ],
  "twenty-seven-chapter": THREE_ACTS(9 / 26, 18 / 26),
  "ten-point": THREE_ACTS(0.25, 0.75), // points 1–3 / 4–7 / 8–10
};

/** Act definitions for a template id. Unknown ids (including custom templates,
 *  which have no act config) fall back to a generic Act I/II/III split. */
export function templateActs(id: string | undefined): TemplateAct[] {
  return (id && TEMPLATE_ACTS[id]) || THREE_ACTS(0.25, 0.75);
}
