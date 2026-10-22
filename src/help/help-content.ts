/**
 * Central copy for the in-app guidance system. Pure content — no Obsidian view
 * wiring beyond DOM builders — so the same prose feeds both the dismissible
 * per-panel tips (`hint.ts`) and the Help index destination (`help-panel.ts`).
 *
 * Only genuinely non-obvious surfaces get a tip; self-evident phases (Home,
 * Plan→Overview, Track, the Publish checklists) are covered in the Help index
 * prose but show no inline callout.
 */

/** A builder that appends explanatory content into `el`. */
export type Body = (el: HTMLElement) => void;

export interface HintEntry {
  title: string;
  body: Body;
}

/** Append a paragraph of plain text. */
function p(el: HTMLElement, text: string): void {
  el.createEl("p", { text });
}

/** Append a bulleted list. */
function steps(el: HTMLElement, items: string[]): void {
  const ul = el.createEl("ul");
  for (const it of items) ul.createEl("li", { text: it });
}

/** Append an inline example line showing literal marker syntax. */
function examples(el: HTMLElement, codes: string[]): void {
  const wrap = el.createDiv({ cls: "inkswell-hint__examples" });
  for (const c of codes) wrap.createEl("code", { text: c });
}

/**
 * Default sub-tab per destination — mirrors the host's resolution in
 * `inkswell-view.ts` so a tip resolves to the right key when no sub-tab is
 * explicitly selected yet.
 */
const DEFAULT_SUBTAB: Record<string, string> = {
  plan: "overview",
  revise: "audit",
  publish: "compile",
};

/** Registry key for a (mode, subtab) pair, e.g. "plan/beats" or "codex". */
export function hintKey(mode: string, subtab?: string): string {
  const sub = subtab ?? DEFAULT_SUBTAB[mode];
  return sub ? `${mode}/${sub}` : mode;
}

/**
 * Per-surface tips, keyed by the value `hintKey` returns. A missing key means
 * "no tip here" (e.g. "home", "plan/overview").
 */
export const HINTS: Record<string, HintEntry> = {
  write: {
    title: "So funktionieren Entwurf und Aufgabenmarkierungen",
    body: (el) => {
      p(
        el,
        "Schreiben ist ein konzentrierter Editor: Wählen Sie links eine Szene, schreiben Sie " +
          "in der Mitte und nutzen Sie die rechte Seitenleiste. Dort gibt es zwei Registerkarten: " +
          "Szene zeigt die Metadaten der aktuellen Szene; Überarbeitung zeigt die offenen " +
          "Aufgabenmarkierungen und protokollierten Überarbeitungsentscheidungen dieses Projekts, " +
          "beginnend mit der aktuellen Szene. Klicken Sie auf eine Markierung, um zu ihr zu springen. " +
          "Änderungen werden beim Verlassen des Editors und beim Szenenwechsel gespeichert – niemals mitten im Tippen."
      );
      p(
        el,
        "Unterbrechen Sie den Schreibfluss nicht für Recherchen oder schwierige Stellen. Setzen Sie " +
          "eine Markierung in eckigen Klammern und schreiben Sie weiter. Markierungen werden im Editor " +
          "hervorgehoben und später unter Überarbeiten → Aufgaben gesammelt. Beim Schlüsselwort wird " +
          "die Groß- und Kleinschreibung ignoriert; „: Text“ ist optional."
      );
      examples(el, ["[TODO: ]", "[RESEARCH: ]", "[NOTE: ]", "[DIALOGUE: ]", "[SCENE: ]"]);
      p(el, "Führen Sie „Aufgabenmarkierung einfügen…“ aus, um eine Markierung an der Cursorposition einzusetzen.");
    },
  },
  "track/sync": {
    title: "Auf mehreren Geräten schreiben?",
    body: (el) => {
      p(
        el,
        "Wörter werden auf dem Gerät gezählt, auf dem Sie sie schreiben. Deshalb kennt diese " +
          "Übersicht zunächst nur dieses Gerät. Aktivieren Sie unter Einstellungen → Inkswell " +
          "„Schreibverlauf geräteübergreifend synchronisieren“, damit Serien und Summen alle Geräte " +
          "berücksichtigen. Inkswell führt dann pro Gerät eine kleine Protokollnotiz im Ordner " +
          "„Schreibprotokoll“ unter Ihrem Basisordner und führt sie hier zusammen. Die Synchronisierung " +
          "Ihres Vaults, etwa Obsidian Sync oder iCloud, überträgt diese Notizen."
      );
    },
  },
  "plan/beats": {
    title: "So funktioniert das Beat-Sheet",
    body: (el) => {
      p(
        el,
        "Eine strukturelle Gliederung für das aktive Projekt. Wählen Sie dazu eine Beat-Vorlage " +
          "im Auswahlfeld „Vorlage“. Acht Vorlagen sind enthalten:"
      );
      steps(el, [
        "Save the Cat (15 Beats)",
        "Drei-Akt-Struktur (7)",
        "Heldenreise (12)",
        "Sieben-Punkte-Struktur (7)",
        "Story Circle (8)",
        "Romancing the Beat (14)",
        "27-Kapitel-Methode (27)",
        "Zehn-Punkte-Gliederung (10) – die zehn unverzichtbaren Ereignisse Ihrer Geschichte",
      ]);
      p(
        el,
        "Unter Anpassen → Beat-Vorlagen können Sie außerdem eigene Strukturen hinzufügen. " +
          "Sie erscheinen neben den mitgelieferten Vorlagen in der Auswahl."
      );
      p(
        el,
        "Jeder Beat enthält seinen Zweck, eine Planungsnotiz, eine optional verknüpfte Szene " +
          "und ein Erledigt-Feld. Der Balken am oberen Rand zeigt den Fortschritt. Sie können " +
          "jederzeit die Vorlage wechseln: Jede behält ihre eigenen Notizen und Verknüpfungen, " +
          "sodass beim Zurückwechseln nichts verloren geht."
      );
      steps(el, [
        "Schreiben Sie direkt in die Planungsnotiz eines Beats – sie steht eingebettet und nicht in einer separaten Datei.",
        "Verknüpfen Sie einen Beat mit der Szene, die ihn umsetzt, damit Planung und Manuskript übereinstimmen.",
        "„Gerüst erstellen“ erzeugt in einem Schritt Szenenentwürfe für alle noch nicht verknüpften Beats.",
      ]);
    },
  },
  "plan/board": {
    title: "So funktioniert das Board",
    body: (el) => {
      p(
        el,
        "Eine Kanban-Ansicht Ihrer Szenen. Mit „Gruppieren nach“ ordnen Sie die Spalten nach " +
          "Status, Akt, Kapitel oder Perspektive."
      );
      p(
        el,
        "Ziehen Sie eine Karte in eine andere Spalte, um den Wert der Szene zu ändern, etwa von " +
          "Entwurf zu Überarbeitet. Ein Klick öffnet die Szene. Über einen Rechtsklick oder die " +
          "Schaltfläche ⋯ können Sie sie umbenennen, bearbeiten oder löschen. Die Kartenfarbe stammt " +
          "aus dem Farbfeld der Szene."
      );
    },
  },
  "plan/grid": {
    title: "So funktioniert das Plot-Raster",
    body: (el) => {
      p(
        el,
        "Eine Matrix aus Handlungssträngen und Kapiteln zum Verfolgen von Nebenhandlungen und " +
          "Entwicklungsbögen. Die Spalten sind Ihre Handlungsstränge, die Zeilen Ihre Kapitel. " +
          "Jede Zelle zeigt die Szenen, die den jeweiligen Handlungsstrang dort voranbringen. " +
          "Die Zellen sind Ihre tatsächlichen Szenen: Das Raster wird aus dem Frontmatter der " +
          "Szenen abgeleitet und entspricht daher immer dem Manuskript. Eine längere Lücke in " +
          "einer Spalte ist ein Hinweis auf die Dramaturgie, kein Buchungsfehler."
      );
      p(
        el,
        "Klicken Sie in einer Zelle auf +, um eine vorhandene Szene zuzuordnen oder direkt einen " +
          "Szenenentwurf mit dem Status Idee anzulegen. So planen Sie einen noch nicht geschriebenen " +
          "Beat. Klappen Sie eine Kapitelzeile auf, um die Zugehörigkeit jeder Szene ohne Ziehen zu " +
          "ändern. Ziehen Sie einen Chip in eine andere Zelle, um ihn zwischen Handlungssträngen oder " +
          "Kapiteln zu verschieben. Eine Szene kann mehreren Handlungssträngen zugleich angehören."
      );
      steps(el, [
        "Verwalten Sie Handlungsstränge über die Spaltenüberschriften: umbenennen (aktualisiert alle zugeordneten Szenen), umfärben, neu anordnen, fokussieren oder löschen.",
        "Bei großen Büchern zeigt der Kompaktmodus die Zellen als farbige Punkte; in großen Rastern geschieht dies automatisch. Eingeklappte Aktzeilen zeigen die Anzahl je Spalte.",
        "Tags ohne passenden Handlungsstrang erscheinen als „nicht verfolgt“. Übernehmen Sie sie in Ihre Liste oder entfernen Sie sie aus allen Szenen.",
      ]);
    },
  },
  "plan/outline": {
    title: "So funktioniert die Gliederung",
    body: (el) => {
      p(
        el,
        "Die Baumansicht der Struktur ordnet Ihr Buch in Akte, Kapitel und Szenen. Ziehen Sie " +
          "eine Szene in ein Kapitel oder ein Kapitel in einen Akt. Legen Sie ein Element ober- " +
          "oder unterhalb einer Zeile ab, um die Reihenfolge zu ändern. Dieser Baum ist maßgeblich: " +
          "Seine Anordnung bestimmt auch die Lesereihenfolge des Manuskripts und hält die Szenen " +
          "eines Kapitels zusammen. Board und Raster zeigen dieselben Szenen auf andere Weise."
      );
      p(
        el,
        "Die Struktur steht beim Planen bewusst an letzter Stelle. Üblicherweise skizzieren Sie " +
          "zuerst Ihre Beats, entwickeln daraus Szenen und schreiben diese unter Schreiben. Die " +
          "Struktur kann warten. Sobald echte Szenen vorhanden sind, gruppieren Sie sie hier in " +
          "Akte und Kapitel."
      );
      steps(el, [
        "Die Verschachtelung ist optional: Eine Szene kann außerhalb aller Kapitel und ein Kapitel außerhalb aller Akte liegen. Dafür gibt es die Bereiche „Kapitel ohne Akt“ und „Nicht zugewiesene Szenen“.",
        "Geben Sie einem Kapitel ein Wortziel, um seinen Fortschritt zu verfolgen. Dieselben Ziele erscheinen unter Fortschritt.",
        "Klicken Sie auf eine Szene, um sie unter Schreiben zu öffnen. Über das Menü ⋯ oder einen Rechtsklick können Sie sie umbenennen, verschieben oder löschen.",
      ]);
    },
  },
  codex: {
    title: "So funktioniert der Kodex",
    body: (el) => {
      p(
        el,
        "Ihre Geschichtenbibel: Figuren, Orte, Fraktionen, Gegenstände, Ereignisse und Konzepte. " +
          "Jeder Eintrag besitzt ein strukturiertes Profil, das automatisch im Frontmatter der " +
          "Notiz gespeichert wird."
      );
      p(el, "Jeder Eintrag hat einen Geltungsbereich, der bestimmt, wo er angezeigt wird:");
      steps(el, [
        "Global (Standard) – in jedem Projekt verfügbar.",
        "Projekt – setzen Sie codex-project in der Notiz; dann sieht nur dieses Buch den Eintrag. Klicken Sie unter Geltungsbereich auf Ändern…, wählen Sie Bücher und markieren Sie die gewünschten Bücher, um einen Eintrag nur zwischen bestimmten Büchern einer Reihe zu teilen.",
        "Reihe – setzen Sie codex-series; der Eintrag wird von allen Büchern einer Reihe gemeinsam verwendet.",
      ]);
      p(
        el,
        "Die Liste „Erscheint in“ jedes Eintrags aktualisiert sich selbst. Sie zeigt alle Szenen, " +
          "deren Text den Namen oder einen Alias des Eintrags erwähnt, sowie Szenen, die ihn in " +
          "ihren Metadaten verknüpfen – etwa unter Figuren, Ort oder Perspektive. Das gilt für jede " +
          "Kategorie, sodass ein neuer Eintrag seine Szenen ohne zusätzliches Tagging findet. " +
          "Ausgefüllte Chips stehen für verknüpfte Szenen; umrandete Chips für reine Texterwähnungen. " +
          "Die Zeile je Buch zählt beides sowie Perspektivszenen."
      );
      p(
        el,
        "Ein als Porträt hochgeladenes Bild wird dort gespeichert, wo Obsidian neue Anhänge ablegt " +
          "(Einstellungen → Dateien und Links → Standardspeicherort für neue Anhänge). Wählen Sie " +
          "„In Unterordner des aktuellen Ordners“, um die Bilder eines Eintrags in einem Ordner " +
          "neben ihm aufzubewahren."
      );
    },
  },
  "revise/audit": {
    title: "So funktioniert die Überarbeitungsprüfung",
    body: (el) => {
      p(el, "Eine dreistufige Checkliste, die einen unfertigen Entwurf bis zur Endfassung begleitet:");
      steps(el, [
        "Geschichte – 18 Prüfpunkte für das gesamte Manuskript, gespeichert im Projekt.",
        "Prosa – 32 gruppierte Prüfungen auf Textebene.",
        "Szene – 14 Prüfpunkte je Szene, gespeichert im Frontmatter der Szene.",
      ]);
      p(
        el,
        "Die szenenweise Prüfung klassifiziert jeden Einstieg automatisch als Handlung, Dialog, " +
          "Gedanke oder Reflexion. Ist die Einschätzung falsch, können Sie sie überschreiben. " +
          "Klicken Sie auf eine Szene, um ihre Checkliste direkt aufzuklappen und zu bearbeiten " +
          "oder unter Schreiben zu ihr zu springen."
      );
    },
  },
  "revise/todos": {
    title: "So funktionieren Überarbeitungsaufgaben",
    body: (el) => {
      p(
        el,
        "Alles, was noch überarbeitet werden muss, in einer nach Szenen gruppierten Liste: die beim " +
          "Schreiben gesetzten Markierungen in eckigen Klammern und die protokollierten " +
          "Überarbeitungsentscheidungen. Mit den Chips filtern Sie nach Markierungs- oder Entscheidungstyp."
      );
      examples(el, ["[TODO]", "[RESEARCH: ]", "[NOTE: ]", "[DIALOGUE: ]", "[SCENE: ]"]);
      p(
        el,
        "Klicken Sie auf eine Markierung, um direkt zur betreffenden Stelle unter Schreiben zu " +
          "springen. Sie blinkt kurz auf, damit Sie sie schnell finden. Entfernen Sie die Markierung " +
          "beim Bearbeiten des Textes; beim nächsten Durchlauf wird die Liste aktualisiert."
      );
      p(
        el,
        "Entscheidungen sind Festlegungen für die gesamte Geschichte, etwa „Ab jetzt ist der Bruder " +
          "tot“. Erfassen Sie eine über „Entscheidung protokollieren“, weisen Sie ihr einen Typ zu " +
          "und verankern Sie sie in einer Szene oder im gesamten Projekt. Markieren Sie sie als " +
          "angewendet, sobald die Änderung umgesetzt ist; mit einem Klick auf den Text bearbeiten " +
          "Sie sie. Für Recherchefragen und fehlende Szenen eignen sich [RESEARCH: ]- oder " +
          "[SCENE: ]-Markierungen besser, weil sie die genaue Stelle im Text kennzeichnen."
      );
    },
  },
  search: {
    title: "So funktioniert die Suche",
    body: (el) => {
      p(
        el,
        "Volltextsuche im Text und in den Zusammenfassungen Ihrer Szenen. Wählen Sie einen " +
          "Geltungsbereich – diesen Entwurf, die gesamte Geschichte, die Reihe oder den gesamten " +
          "Vault – und grenzen Sie die Ergebnisse mit Metadatenfiltern wie Status, Perspektive, " +
          "Kapitel, Handlungsstrang und Figur ein."
      );
      p(
        el,
        "Ergebnisse werden nach Szene gruppiert. Klicken Sie auf einen Treffer, um unter Schreiben " +
          "direkt zu ihm zu springen; dort blinkt er kurz auf. Ein Treffer in der Zusammenfassung " +
          "öffnet die Szene ohne Hervorhebung, da die Zusammenfassung nicht zum bearbeitbaren Text " +
          "gehört. Verwenden Sie nur einen Filter ohne Suchbegriff, um alle passenden Szenen als " +
          "schnelle strukturierte Suche aufzulisten."
      );
      p(
        el,
        "Gesucht wird wörtlich, nicht mit Platzhaltern oder regulären Ausdrücken. Optional stehen " +
          "„Groß-/Kleinschreibung beachten“ und „Ganzes Wort“ zur Verfügung. Archivierte Szenen " +
          "werden nur mit „Archivierte einbeziehen“ berücksichtigt."
      );
    },
  },
  "publish/compile": {
    title: "So funktioniert das Kompilieren",
    body: (el) => {
      p(
        el,
        "Fügen Sie die Szenen des aktiven Projekts zu einer Manuskriptdatei zusammen. Wählen Sie " +
          "ein Format – Markdown, HTML oder über Pandoc Word, PDF beziehungsweise EPUB –, legen Sie " +
          "den Ausgabenamen fest und starten Sie die Kompilierung."
      );
      p(
        el,
        "Die Verarbeitung erfolgt in ein- und ausschaltbaren Schritten: Schritte je Szene entfernen " +
          "beispielsweise Aufgabenmarkierungen oder filtern Metadaten; Schritte für das gesamte " +
          "Manuskript erzeugen Überschriften und Seitenumbrüche oder bereinigen Leerzeilen. Ihre " +
          "Auswahl wird für jedes Projekt gespeichert."
      );
    },
  },
  customize: {
    title: "So funktioniert Anpassen",
    body: (el) => {
      p(
        el,
        "Anpassen verändert die Struktur von Inkswell: vorhandene Kodex-Typen und ihre Felder, " +
          "Startinhalte neuer Einträge oder Szenen, Beat-Strukturen, Szenenstatus, Schreibimpulse, " +
          "Überarbeitungs- und Veröffentlichungschecklisten sowie die sichtbaren optionalen " +
          "Funktionen. Persönliche Einstellungen wie Ziele, Editorverhalten und Ordner bleiben " +
          "unter Einstellungen."
      );
      steps(el, [
        "Wählen Sie links einen Bereich und bearbeiten Sie ihn rechts. Änderungen werden fortlaufend gespeichert.",
        "Kodex-Felder und Startinhalte liegen in gewöhnlichen Vorlagennotizen im Ordner „Vorlagen“ Ihres Basisordners. Eine Bearbeitung hier ändert diese Notizen; Sie können sie weiterhin direkt öffnen.",
        "Mitgelieferte Elemente werden nie gelöscht: Ausblenden ist verlustfrei, Umbenennungen behalten die gespeicherte ID und jeder Bereich kann auf die Inkswell-Standards zurückgesetzt werden.",
        "Eigene Elemente wie benutzerdefinierte Typen, Checklistenpunkte oder Schreibimpulse liegen in der data.json des Plugins und werden mit dem Konfigurationsordner Ihres Vaults übertragen.",
      ]);
    },
  },
};

export interface HelpSection {
  /** Phase label shown as the section heading. */
  phase: string;
  /** Lucide icon name for the section header. */
  icon: string;
  /** Short one-liner under the heading. */
  summary: string;
  /** Detailed body for the index (reuses HINT bodies where one exists). */
  body: Body;
}

/** Ordered phases for the Help index destination. */
export const HELP_SECTIONS: HelpSection[] = [
  {
    phase: "Beginn",
    icon: "home",
    summary: "Ihre Bücher in Regalen, der Szenenbaum eines Buchs und ein Eingang für Geschichtenideen.",
    body: (el) => {
      p(
        el,
        "Ihre Zentrale. „Alle Projekte“ zeigt Ihre Bücher als Karten in Regalen – ein Regal je " +
          "Reihe in Buchreihenfolge sowie eines für Einzelbände. Jede Karte zeigt das Cover oder " +
          "einen erzeugten Platzhalter, die Buchnummer, Szenen und Wörter, den Fortschritt zum Ziel " +
          "und den Zeitpunkt der letzten Bearbeitung. Klicken Sie auf eine Karte, um das Buch zu " +
          "fokussieren. Über das Menü ⋯ – am Desktop beim Darüberfahren, auf Touchgeräten immer " +
          "sichtbar – können Sie es umbenennen, einer Reihe zuordnen oder das Cover ändern."
      );
      p(
        el,
        "Ein fokussiertes Buch zeigt die Hauptkarte mit Cover, Logline, Thema und Ziel, daneben " +
          "die übrigen Cover seiner Reihe zum schnellen Wechseln sowie seinen Szenenbaum. Ziehen " +
          "Sie Szenenzeilen, um sie neu anzuordnen, oder verwenden Sie das Menü ⋯ zum Verschieben, " +
          "Umbenennen und Löschen. Im Inspektor rechts bearbeiten Sie die Metadaten der ausgewählten Szene."
      );
      p(
        el,
        "Halten Sie Geschichtenideen direkt im Eingang unter den Regalen fest und drücken Sie zum " +
          "Speichern die Eingabetaste. Klicken Sie auf eine Idee, um sie an Ort und Stelle zu " +
          "bearbeiten. Über das Menü ⋯ oder einen Rechtsklick können Sie sie kopieren, als Notiz im " +
          "Ordner „Ideen“ Ihres Basisordners speichern und damit aus dem Eingang entfernen, oben " +
          "anheften oder löschen. Klicken Sie auf die Überschrift „Ideen“, um den Bereich einzuklappen."
      );
      el.createEl("h4", { text: "Reihe" });
      p(
        el,
        "Eine Reihe besteht aus Büchern mit einem gemeinsamen Namen. Dafür gibt es keine eigene " +
          "Notiz, sondern nur eine Kennzeichnung an jedem Buch. Ordnen Sie ein Buch über sein Menü ⋯ " +
          "oder den Rechtsklick-Eintrag „Reihe…“ zu. Alternativ klicken Sie auf der Hauptkarte unter " +
          "dem Titel auf die Reihenzeile. Wählen Sie eine vorhandene Reihe oder erstellen Sie eine " +
          "neue und legen Sie die Buchnummer fest; standardmäßig wird der nächste freie Platz gewählt. " +
          "„Neues Projekt“ bietet dieselben Felder, sodass ein Buch direkt in einer Reihe angelegt werden kann."
      );
      p(
        el,
        "Über das Menü ⋯ oder den Rechtsklick auf die Reihenüberschrift verwalten Sie die gesamte " +
          "Reihe: neues Buch in dieser Reihe, vorhandenes Projekt hinzufügen, Reihe umbenennen – " +
          "alle Bücher und reihenweiten Kodex-Einträge werden mitgeführt – sowie Bücher neu anordnen. " +
          "Nach dem Ziehen nummeriert „Speichern“ sie als 1, 2, 3 und so weiter."
      );
    },
  },
  {
    phase: "Planen",
    icon: "compass",
    summary: "Übersichtsfelder, Beat-Sheet und Struktur mit Gliederungsbaum, Board und Plot-Raster.",
    body: (el) => {
      p(
        el,
        "Die Übersicht enthält Felder für den gesamten Roman wie Logline, Thema und Genre sowie " +
          "längere Texte wie Zusammenfassung und Drei-Akt-Skizze. Beats ist das Beat-Sheet. Die " +
          "Struktur vereint Gliederungsbaum, Kanban-Board und Plot-Raster hinter der Umschaltung " +
          "Baum | Board | Raster – drei Ansichten derselben Szenen. Alle werden unten erläutert."
      );
      p(
        el,
        "Übernehmen Sie ein nummeriertes Manuskript, dessen Szenen in falscher Reihenfolge gelandet " +
          "sind? Unter Struktur → Baum gibt es die Schaltfläche „Nach Kapitel sortieren“. Sie ist " +
          "auch im Menü ⋯ eines Buchs auf Beginn und als Befehl „Szenen nach Kapitelnummer sortieren“ " +
          "verfügbar. Die Aktion ordnet das Manuskript einmalig anhand der Ziffer oder ausgeschriebenen " +
          "Zahl in der Kapitelbezeichnung. Unnummerierte Szenen bleiben am Ende in ihrer bisherigen " +
          "Reihenfolge. Es handelt sich nicht um einen Modus; anschließend gilt wieder Ihre Ziehreihenfolge."
      );
      el.createEl("h4", { text: HINTS["plan/beats"].title });
      HINTS["plan/beats"].body(el);
      el.createEl("h4", { text: HINTS["plan/outline"].title });
      HINTS["plan/outline"].body(el);
      el.createEl("h4", { text: HINTS["plan/board"].title });
      HINTS["plan/board"].body(el);
      el.createEl("h4", { text: HINTS["plan/grid"].title });
      HINTS["plan/grid"].body(el);
    },
  },
  {
    phase: "Schreiben",
    icon: "pencil",
    summary: "Der fokussierte Manuskripteditor und Aufgabenmarkierungen.",
    body: HINTS["write"].body,
  },
  {
    phase: "Kodex",
    icon: "book-marked",
    summary: "Ihre Geschichtenbibel mit globalem, projekt- oder reihenweitem Geltungsbereich.",
    body: HINTS["codex"].body,
  },
  {
    phase: "Suche",
    icon: "search",
    summary: "Volltextsuche in Szenen mit Geltungsbereich und Filtern.",
    body: HINTS["search"].body,
  },
  {
    phase: "Fortschritt",
    icon: "bar-chart-3",
    summary: "Wortzahlen, Serien, Tempo, Sprints und Struktur.",
    body: (el) => {
      p(
        el,
        "Eine Übersicht Ihres Schreibfortschritts mit Tages-, Wochen- und Monatszahlen, Serien, " +
          "einer Heatmap über 26 Wochen, dem Sprintverlauf und einer Aufschlüsselung der Szenenstruktur. " +
          "Die Statusleiste unten zeigt den heutigen Fortschritt und einen laufenden Sprint. Klicken " +
          "Sie darauf, um Fortschritt zu öffnen."
      );
      p(
        el,
        "Nur Texte eines Projekts zählen für Ziele, standardmäßig die Manuskriptszenen. Unter " +
          "Einstellungen → Was für Ziele zählt können Sie zusätzlich Planungsnotizen, Kodex-Notizen " +
          "oder andere Projektnotizen einbeziehen. Der übrige Vault wird niemals mitgezählt."
      );
      p(
        el,
        "Starten Sie über die Seitenleiste oder den Befehl „Schreibsprint starten“ einen zeitlich " +
          "begrenzten Sprint, um gegen die Uhr und auf ein Wortziel hin zu schreiben."
      );
      p(
        el,
        "Eine Schreibchallenge – über „Schreibchallenge einrichten“ oder den Link auf der Zielkarte – " +
          "besteht aus einem Zeitraum und einem Wortziel, etwa 50.000 Wörter im November. Sie zählt " +
          "jedes zielrelevante Wort, das Sie in diesem Zeitraum in einem beliebigen Projekt schreiben. " +
          "Angezeigt werden der heutige Sollstand, Ihr Vor- oder Rückstand und das heutige Pensum. " +
          "Klicken Sie auf die Gesamtsumme, um sie für die Website einer Veranstaltung zu kopieren. " +
          "Wenn Sie auf mehreren Geräten schreiben, aktivieren Sie die Verlaufssynchronisierung."
      );
    },
  },
  {
    phase: "Überarbeiten",
    icon: "git-compare",
    summary: "Prüfchecklisten, Überarbeitungsaufgaben und Prosaanalyse.",
    body: (el) => {
      el.createEl("h4", { text: HINTS["revise/audit"].title });
      HINTS["revise/audit"].body(el);
      el.createEl("h4", { text: HINTS["revise/todos"].title });
      HINTS["revise/todos"].body(el);
      el.createEl("h4", { text: "Analyse" });
      p(
        el,
        "Lesbarkeitswerte, Ihre häufigsten Wörter und die Erkennung wiederholter Formulierungen " +
          "im gesamten Manuskript. Starten Sie die Analyse bei Bedarf für einen Stildurchgang."
      );
    },
  },
  {
    phase: "Veröffentlichen",
    icon: "upload",
    summary: "Kompilieren, Selbstveröffentlichungscheckliste und Veröffentlichungsplanung.",
    body: (el) => {
      el.createEl("h4", { text: HINTS["publish/compile"].title });
      HINTS["publish/compile"].body(el);
      el.createEl("h4", { text: "Checkliste & Veröffentlichung" });
      p(
        el,
        "Die Checkliste verfolgt rund 50 Aufgaben zur Selbstveröffentlichung sowie ein Metadatenblatt " +
          "je Format, etwa für ISBN, Klappentext und Schlüsselwörter. Die Veröffentlichung plant " +
          "einen Zeitablauf für Vorbestellungen mit automatisch berechneten Meilensteinen und " +
          "Übersichten für Budget, Cover, Marketing und Vorabrezensionen."
      );
    },
  },
  {
    phase: "Anpassen",
    icon: "sliders-horizontal",
    summary: "Passen Sie Inkswell an Ihren Ablauf an: Typen, Felder, Vorlagen, Strukturen, Checklisten und Impulse.",
    body: HINTS["customize"].body,
  },
  {
    phase: "Ihre Daten und Sicherungen",
    icon: "shield-check",
    summary: "Wo alles gespeichert wird und wie Sie es wiederherstellen.",
    body: (el) => {
      p(
        el,
        "Alles, was Inkswell speichert, ist Klartext. Der Szenentext liegt als gewöhnliche Notizen " +
          "im Szenenordner Ihres Projekts. Planungsdaten – Beats, Gliederungsstruktur, Ziele, " +
          "Überarbeitungsprotokoll, Prüfchecklisten sowie Kompilierungs- und Veröffentlichungseinstellungen – " +
          "liegen im Frontmatter der Projektindexnotiz. Das ist die nach Ihrem Projekt benannte Notiz " +
          "neben den Szenen. Kodex-Einträge sind gewöhnliche Notizen mit einem codex-Schlüssel. " +
          "Plugin-Einstellungen, Schreibverlauf, Sprints und Ideeneingang liegen in der data.json des Plugins."
      );
      p(
        el,
        "Der Schreibverlauf zählt die Wörter, die Sie in Obsidian eingeben – sowohl in dessen Editoren " +
          "als auch unter Schreiben. Wird eine Datei außerhalb von Obsidian geändert oder über die " +
          "Synchronisierung von einem anderen Gerät empfangen, setzt Inkswell lediglich ihren " +
          "Ausgangspunkt neu. Diese Wörter werden niemals als auf diesem Gerät geschrieben protokolliert."
      );
      p(
        el,
        "Aktivieren Sie in den Einstellungen „Schreibverlauf geräteübergreifend synchronisieren“, " +
          "um die Verläufe aller Geräte gemeinsam zu sehen. Jedes Gerät führt dann im Ordner " +
          "„Schreibprotokoll“ unter Ihrem Basisordner eine kleine maschinell erstellte Protokollnotiz " +
          "mit einem inkswell-log-Schlüssel im Frontmatter. Fortschritt führt diese Notizen zusammen. " +
          "Benennen Sie ein Gerät über die Eigenschaft device dieser Notiz um. Wird ein Gerät nicht " +
          "mehr verwendet, löschen Sie seine Notiz."
      );
      el.createEl("h4", { text: "Wenn etwas schiefgeht" });
      p(
        el,
        "Obsidians Dateiwiederherstellung (Einstellungen → Dateiwiederherstellung → Anzeigen) erstellt " +
          "regelmäßig Schnappschüsse jeder geänderten Notiz, auch der von Inkswell geschriebenen. " +
          "Die Suche gleicht Dateinamen ab: Suchen Sie für Planungsdaten nach dem Projektnamen und " +
          "öffnen Sie die Schnappschüsse der Indexnotiz; suchen Sie für Prosatext nach dem Szenennamen."
      );
      p(
        el,
        "Wann immer Inkswell eine Version Ihres Textes verdrängen muss – etwa beim Lösen eines " +
          "Konflikts zwischen Editor und Datenträger oder beim von Ihnen angeforderten Überschreiben " +
          "einer Datei während der Kompilierung –, wird diese Version zuerst im Ordner " +
          "„Inkswell-Konflikte“ gespeichert. Nichts wird unbemerkt verworfen."
      );
      p(
        el,
        "Inkswell bewahrt außerdem tägliche Sicherungen der data.json aus den letzten sieben Tagen " +
          "in einem danebenliegenden Ordner backups auf. Dieser befindet sich im Plugin-Ordner im " +
          "Konfigurationsverzeichnis Ihres Vaults. Um nur Ihre Einstellungen wiederherzustellen – " +
          "etwa eigene oder umbenannte Kodex-Typen, Änderungen unter Anpassen und die Seitenleiste –, " +
          "führen Sie den Befehl „Einstellungen aus einer Sicherung wiederherstellen“ aus und wählen " +
          "Sie einen Tag. Ihr Schreibverlauf bleibt unverändert. Für eine vollständige Wiederherstellung " +
          "deaktivieren Sie Inkswell, kopieren die Sicherung über data.json und aktivieren das Plugin " +
          "erneut. Kann data.json beim Start von Obsidian nicht gelesen werden, lädt Inkswell selbstständig " +
          "die neueste Sicherung und informiert Sie darüber."
      );
    },
  },
];
