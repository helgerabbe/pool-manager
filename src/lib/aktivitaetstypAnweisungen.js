/**
 * aktivitaetstypAnweisungen.js
 *
 * Zentraler Katalog der Render-Anweisungen pro Aktivitätstyp für den
 * Aufgaben-Bauer (Generator 2). Jeder Eintrag beschreibt:
 *
 *   - **schluessel**   — DB-Key in `MBKGlobalPrompt` (Kategorie
 *                        `aktivitaetstyp`). Wird systemweit als
 *                        eindeutiger Lookup verwendet.
 *   - **aktivitaet_name** — exakter Name aus `AktivitaetenKatalog.name`
 *                        (Lehrkraft-sichtbarer Aktivitäts-Titel). Der
 *                        Aufgaben-Bauer matcht Aktivitäten in
 *                        `taskContentPayload` über diesen Namen.
 *   - **anzeigename**  — Label im AufgabenTab-Dialog.
 *   - **prompt_text**  — die eigentliche Render-Anweisung, die in den
 *                        Master-System-Prompt eingewoben wird, sobald
 *                        eine Aktivität dieses Typs im aktuellen
 *                        Aufruf vorkommt.
 *
 * Designprinzip:
 *   - Der Master-System-Prompt (`mbk_aufgaben_system_prompt`) enthält
 *     nur die ALLGEMEINE Hüllen-Logik (HTML-Skelett, Phasenstruktur,
 *     KI-Platzhalter etc.). Pro Aktivitätstyp gibt es einen EIGENEN,
 *     editierbaren Block — das vermeidet einen 2000-Zeilen-Master-
 *     Prompt und erlaubt, einzelne Typen unabhängig anzupassen.
 *   - Beim Generieren einer Aufgaben-Hülle wird dynamisch geprüft,
 *     welche Aktivitätstypen darin tatsächlich vorkommen, und nur
 *     deren Anweisungen werden eingewoben. Das spart Token und hält
 *     den Prompt fokussiert.
 *
 * Neue Typen ergänzen:
 *   1. Eintrag hier in `AKTIVITAETSTYP_ANWEISUNGEN` einfügen.
 *   2. `functions/seedMBKGlobalPrompts` neu ausführen, damit der
 *      DB-Record entsteht (idempotent — bestehende Datensätze werden
 *      nicht überschrieben).
 *   3. Im AufgabenTab → "Payloads anzeigen" pflegen.
 */

export const AKTIVITAETSTYP_ANWEISUNGEN_VERSION = '1.0.0';

/** Präfix für alle DB-Schlüssel dieser Kategorie. */
export const AKTIVITAETSTYP_KEY_PREFIX = 'aktivitaet_';

/**
 * Zentraler Katalog. Reihenfolge bestimmt die Anzeige im AufgabenTab.
 */
export const AKTIVITAETSTYP_ANWEISUNGEN = [
  {
    schluessel: 'aktivitaet_lueckentext',
    aktivitaet_name: 'Lückentext',
    anzeigename: 'Aktivität: Lückentext',
    sort_order: 300,
    prompt_text: [
      '## Lückentext-Aktivität (aktivitaet_name === "Lückentext")',
      '',
      'Statt einer statischen Anzeige rendere NUR diesen Container (die Activity-Runtime macht alles andere):',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="lueckentext"',
      `     data-mbk-config='{"instruction":"…","segments":[{"type":"text","value":"…"},{"type":"gap","answer":"…"},…],"distractors":["…"]}'></div>`,
      '```',
      '',
      'Regeln für die Config:',
      '- `instruction`: die Arbeitsanweisung (aus `field_values.instruction` oder `master_aufgaben[0].field_values.instruction`).',
      '- `segments`: Array aus `text`-Blöcken (`value`) und `gap`-Blöcken (`answer`), in genau der Reihenfolge des Lückentexts. Die Quelldaten findest du in `field_values.lueckentext_data` bzw. den `master_aufgaben[].field_values.lueckentext_data`. Falls dort eine Text-Vorlage mit Platzhaltern wie `{{1}}`, `[Begriff]` oder `____` steht: zerlege sie in die segments-Liste. Falls eine Liste `gaps`/`answers` mitgeliefert ist, nimm diese als Lücken-Antworten in genau der Reihenfolge ihres Auftretens.',
      '- `distractors`: optionale zusätzliche Wörter, die nicht in den Text gehören (aus den Quelldaten, z.B. `distractors`/`falsche_woerter`).',
      '- **JSON muss valide sein**. Anführungszeichen innerhalb von Strings escapen.',
      '- Wenn es **mehrere Master-Aufgaben** für die Lückentext-Aktivität gibt: rendere pro Master einen eigenen Container hintereinander.',
      '',
      'KEINE eigene Wortliste, kein eigener Drag&Drop-Code, KEIN `<script>`, KEIN eigenes CSS für die Lücken — die Runtime macht das alles.',
      '',
      'Beispiel (zur Veranschaulichung, NICHT 1:1 kopieren):',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="lueckentext"',
      `     data-mbk-config='{"instruction":"Fülle die Lücken aus.","segments":[{"type":"text","value":"Bei der relativen "},{"type":"gap","answer":"Häufigkeit"},{"type":"text","value":" vergleicht man, wie oft …"}],"distractors":["Studio"]}'></div>`,
      '```',
    ].join('\n'),
  },

  {
    schluessel: 'aktivitaet_begriffe_zuordnen',
    aktivitaet_name: 'Begriffe zuordnen',
    anzeigename: 'Aktivität: Begriffe zuordnen',
    sort_order: 310,
    prompt_text: [
      '## Begriffe-zuordnen-Aktivität (aktivitaet_name === "Begriffe zuordnen")',
      '',
      'Statt einer statischen Anzeige rendere NUR diesen Container (die Activity-Runtime macht alles andere):',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="match_terms"',
      `     data-mbk-config='{"instruction":"…","pairs":[{"term":"…","definition":"…"},…],"distractors":["…"]}'></div>`,
      '```',
      '',
      'Regeln für die Config:',
      '- `instruction`: die Arbeitsanweisung (aus `field_values.instruction` oder `master_aufgaben[0].field_values.instruction`).',
      '- `pairs`: Array aus `{"term": "…", "definition": "…"}`. Quelle: `field_values.pairs` bzw. `master_aufgaben[].field_values.pairs`. Diese Liste hat im Datenmodell die Schlüssel **`begriff`** und **`definition`** — beim Schreiben der Config heißt das Feld aber **`term`** (Mapping: `begriff` → `term`, `definition` → `definition`). Reihenfolge 1:1 übernehmen.',
      '- `distractors`: optionale zusätzliche Definitionen, die zu keinem Begriff passen. Quelle: `field_values.distractors` (entweder Liste von Strings ODER Liste von Objekten `{value: "…"}` — beides erlaubt, einfach den jeweiligen Text in einen flachen String-Array überführen).',
      '- **JSON muss valide sein**. Anführungszeichen innerhalb von Strings escapen.',
      '- Wenn es **mehrere Master-Aufgaben** gibt: rendere pro Master einen eigenen Container hintereinander.',
      '',
      'KEINE eigene Spalten-Logik, KEIN Drag&Drop-Code, KEIN `<script>`, KEIN eigenes CSS — die Runtime macht das alles (Pool links mit Definitionen, Begriffe rechts mit Drop-Zonen, sofortige Prüfung, SCORM-Completion).',
      '',
      'Beispiel (zur Veranschaulichung, NICHT 1:1 kopieren):',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="match_terms"',
      `     data-mbk-config='{"instruction":"Ordne die Begriffe ihren Definitionen zu.","pairs":[{"term":"Mitose","definition":"Zellteilung mit identischem Erbgut"},{"term":"Meiose","definition":"Reifeteilung der Keimzellen"}],"distractors":["Photosynthese"]}'></div>`,
      '```',
    ].join('\n'),
  },

  {
    schluessel: 'aktivitaet_reihenfolge_sortierung',
    aktivitaet_name: 'Reihenfolge / Sortierung',
    anzeigename: 'Aktivität: Reihenfolge / Sortierung',
    sort_order: 320,
    prompt_text: [
      '## Sortier-Aktivität (aktivitaet_name === "Reihenfolge / Sortierung")',
      '',
      'Rendere NUR diesen Container (die Activity-Runtime mischt die Elemente automatisch und prüft live):',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="sortable"',
      `     data-mbk-config='{"instruction":"…","items":["…","…","…"]}'></div>`,
      '```',
      '',
      'Regeln für die Config:',
      '- `instruction`: Arbeitsanweisung (aus `field_values.instruction` bzw. `master_aufgaben[0].field_values.instruction`).',
      '- `items`: Array von Strings in der **KORREKTEN Reihenfolge**. Die Quelle heißt im Datenmodell **`field_values.orderedItems`** (bzw. `master_aufgaben[].field_values.orderedItems`) — beim Schreiben der Config einfach diese Liste 1:1 als `items` übernehmen, **nicht mischen** (die Runtime mischt deterministisch beim Schüler).',
      '- Mehrere Master → pro Master ein eigener Container nacheinander.',
      '',
      'KEIN eigenes Drag&Drop, KEIN eigenes CSS — die Runtime macht alles.',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_miniquiz',
    aktivitaet_name: 'Miniquiz',
    anzeigename: 'Aktivität: Miniquiz',
    sort_order: 330,
    prompt_text: [
      '## Miniquiz (aktivitaet_name === "Miniquiz")',
      '',
      'Rendere NUR diesen Container (die Activity-Runtime macht Auswahl, Live-Check, Score):',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="quiz"',
      `     data-mbk-config='{"instruction":"…","questions":[{"question":"…","answers":[{"text":"…","isCorrect":true},{"text":"…","isCorrect":false}]}]}'></div>`,
      '```',
      '',
      'Regeln für die Config:',
      '- `instruction`: optionale globale Aufgabenstellung (z.B. aus `field_values.instruction`).',
      '- `questions`: Array von `{ question, answers: [{ text, isCorrect }] }`. Quelle: `field_values.questions` bzw. `master_aufgaben[].field_values.questions` (Datenmodell identisch).',
      '- Single- vs. Multi-Choice ergibt sich automatisch aus der Anzahl der `isCorrect:true`-Antworten — du musst nichts extra setzen.',
      '- Mehrere Master → pro Master ein eigener Container.',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_multiple_choice',
    aktivitaet_name: 'Multiple Choice',
    anzeigename: 'Aktivität: Multiple Choice',
    sort_order: 340,
    prompt_text: [
      '## Multiple Choice (aktivitaet_name === "Multiple Choice")',
      '',
      'Identischer Runtime-Typ wie Miniquiz — nur mit einem anderen Datenmodell-Mapping:',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="quiz"',
      `     data-mbk-config='{"instruction":"…","displayCount":5,"questions":[{"question":"…","answers":[{"text":"…","isCorrect":true}]}]}'></div>`,
      '```',
      '',
      'Regeln für die Config:',
      '- `instruction`: globale Aufgabenstellung (aus `field_values.instruction`).',
      '- `displayCount`: optionale Zahl — wie viele der Fragen werden angezeigt? (aus `field_values.displayCount`). Wenn leer/0/größer als verfügbar → alle Fragen werden gezeigt.',
      '- `questions`: Array von `{ question, answers: [{ text, isCorrect }] }`. Quelle: `field_values.mcItems` mit Feldern **`question`** und **`options`**. Mapping: `options` → `answers` (gleiche Form `{text, isCorrect}`).',
      '- Mehrere Master → pro Master ein eigener Container.',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_bildbeschriftung',
    aktivitaet_name: 'Bildbeschriftung',
    anzeigename: 'Aktivität: Bildbeschriftung',
    sort_order: 350,
    prompt_text: [
      '## Bildbeschriftung (aktivitaet_name === "Bildbeschriftung")',
      '',
      'Rendere NUR diesen Container (die Runtime zeigt das Bild + die Drop-Zonen und macht Drag&Drop):',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="image_labeling"',
      `     data-mbk-config='{"instruction":"…","imageUrl":"https://…","imageAlt":"…","zones":[{"label":"…","x_percent":42,"y_percent":31,"width":150,"height":50}],"distractors":["…"]}'></div>`,
      '```',
      '',
      'Regeln für die Config (Quelle ist `field_values` bzw. `master_aufgaben[].field_values`):',
      '- `instruction` ← `field_values.aufgabenstellung`',
      '- `imageUrl` ← `field_values.backgroundImage` (vollständige URL)',
      '- `imageAlt` ← `alt_text` der Aktivität, sonst `field_values.aufgabenstellung`',
      '- `zones` ← `field_values.dropZones` (Felder 1:1: `label`, `x_percent`, `y_percent`, `width`, `height`).',
      '- `distractors` ← `field_values.distractors` (Strings).',
      '- Mehrere Master → pro Master ein eigener Container.',
      '',
      'Wenn `backgroundImage` leer ist: Container weglassen und stattdessen eine statische Karte mit `aufgabenstellung` rendern (so wie für Aktivitäts-Typen ohne spezifische Anweisung).',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_test',
    aktivitaet_name: 'Test',
    anzeigename: 'Aktivität: Test',
    sort_order: 360,
    prompt_text: [
      '## Test (aktivitaet_name === "Test")',
      '',
      'Abschluss-Test mit globalem Score. Rendere NUR diesen Container:',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="test"',
      `     data-mbk-config='{"instruction":"…","passingThreshold":5,"passFeedback":"…","failFeedback":"…","questions":[{"type":"mc","question":"…","points":2,"options":[{"text":"…","isCorrect":true}]},{"type":"text","question":"…","points":3,"expectedAnswer":"…"}]}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values` bzw. `master_aufgaben[].field_values`):',
      '- `instruction`, `passingThreshold`, `passFeedback`, `failFeedback` ← gleichnamige Felder.',
      '- `questions`: Array, pro Frage `{ type, question, points, options? , expectedAnswer? }`:',
      '  * Wenn `type==="mc"` → `options: [{text, isCorrect}]` aus dem Quell-Objekt übernehmen.',
      '  * Wenn `type==="text"` → `expectedAnswer` 1:1 übernehmen.',
      '  * `points` aus dem Quell-Objekt (Default 1).',
      '- Mehrere Master → pro Master ein eigener Container.',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_link_url',
    aktivitaet_name: 'Link / URL',
    anzeigename: 'Aktivität: Link / URL',
    sort_order: 400,
    prompt_text: [
      '## Link / URL (aktivitaet_name === "Link / URL")',
      '',
      'Rendere NUR diesen Container (die Runtime zeigt einen "Webseite öffnen"-Button + "Gelesen — weiter"):',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="media_link"',
      `     data-mbk-config='{"instruction":"…","url":"https://…","label":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values`):',
      '- `instruction` ← `field_values.aufgabentext` (falls leer: weglassen).',
      '- `url` ← `field_values.url`',
      '- `label` ← `field_values.titel`',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_video',
    aktivitaet_name: 'Video',
    anzeigename: 'Aktivität: Video',
    sort_order: 410,
    prompt_text: [
      '## Video (aktivitaet_name === "Video")',
      '',
      'Rendere NUR diesen Container (die Runtime bettet YouTube/Vimeo automatisch als iframe ein):',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="media_video"',
      `     data-mbk-config='{"instruction":"…","url":"https://…","title":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values`):',
      '- `instruction` ← `field_values.aufgabentext` (falls vorhanden).',
      '- `url` ← `field_values.url` (YouTube-Watch-URL, youtu.be, Vimeo oder direkter Embed).',
      '- `title` ← `field_values.titel`.',
      '- Falls `transkript` der Aktivität gesetzt ist: zusätzlich als `<details><summary>Transkript</summary>…</details>` AUSSERHALB des Runtime-Containers darunter rendern (nicht in die Config schreiben).',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_audio',
    aktivitaet_name: 'Audio',
    anzeigename: 'Aktivität: Audio',
    sort_order: 420,
    prompt_text: [
      '## Audio (aktivitaet_name === "Audio")',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="media_audio"',
      `     data-mbk-config='{"instruction":"…","url":"https://…","title":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values`):',
      '- `instruction` ← `field_values.aufgabentext` (optional).',
      '- `url` ← `field_values.url` oder `field_values.audio_url` (direkte mp3/ogg-URL).',
      '- `title` ← `field_values.titel`.',
      '- Falls `transkript` der Aktivität gesetzt ist: zusätzlich als `<details><summary>Transkript</summary>…</details>` darunter rendern.',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_text_lesen',
    aktivitaet_name: 'Text lesen',
    anzeigename: 'Aktivität: Text lesen',
    sort_order: 430,
    prompt_text: [
      '## Text lesen (aktivitaet_name === "Text lesen")',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="text_read"',
      `     data-mbk-config='{"instruction":"…","title":"…","text":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values`):',
      '- `instruction` ← `field_values.aufgabentext` (optional).',
      '- `title` ← `field_values.titel` (optional).',
      '- `text` ← `field_values.text` (reiner Text, KEIN HTML; Zeilenumbrüche bleiben erhalten).',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_lehrwerk',
    aktivitaet_name: 'Lehrwerk',
    anzeigename: 'Aktivität: Lehrwerk',
    sort_order: 440,
    prompt_text: [
      '## Lehrwerk (aktivitaet_name === "Lehrwerk")',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="textbook"',
      `     data-mbk-config='{"instruction":"…","book":"…","pages":"12-15","task":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values`):',
      '- `instruction` ← `field_values.aufgabentext` (optional).',
      '- `book` ← `field_values.book` oder `field_values.lehrwerk` oder `field_values.titel`.',
      '- `pages` ← `field_values.pages` oder `field_values.seiten`.',
      '- `task` ← `field_values.task` oder `field_values.aufgabe`.',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_bearbeitung_bestaetigen',
    aktivitaet_name: 'Bearbeitung bestätigen',
    anzeigename: 'Aktivität: Bearbeitung bestätigen',
    sort_order: 450,
    prompt_text: [
      '## Bearbeitung bestätigen (aktivitaet_name === "Bearbeitung bestätigen")',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="confirm"',
      `     data-mbk-config='{"instruction":"…","hint":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values`):',
      '- `instruction` ← `field_values.aufgabentext` (optional, oft nicht gesetzt).',
      '- `hint` ← `field_values.hinweis`.',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_ki_tutor',
    aktivitaet_name: 'KI-Tutor Aufgabe',
    anzeigename: 'Aktivität: KI-Tutor Aufgabe',
    sort_order: 460,
    prompt_text: [
      '## KI-Tutor Aufgabe (aktivitaet_name === "KI-Tutor Aufgabe")',
      '',
      'Der KI-Tutor wird im Moodle-Kontext angebunden — wir liefern hier nur die UI-Hülle mit Erledigt-Button:',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="ki_tutor"',
      `     data-mbk-config='{"instruction":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values`):',
      '- `instruction` ← `field_values.instruction` (Aufgabenstellung für die Schüler).',
      '- `field_values.system_prompt` ist **interne Lehrer-Information** und darf NIEMALS in die Config geschrieben werden.',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_ki_check',
    aktivitaet_name: 'KI-Check',
    anzeigename: 'Aktivität: KI-Check',
    sort_order: 470,
    prompt_text: [
      '## KI-Check (aktivitaet_name === "KI-Check")',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="ki_check"',
      `     data-mbk-config='{"instruction":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values`):',
      '- `instruction` ← `field_values.instruction`.',
      '- `field_values.kriterien` ist **interne Lehrer-Information** für die KI und gehört NIEMALS in die Config (Schüler dürfen die Prüfkriterien nicht im Klartext sehen).',
    ].join('\n'),
  },
  {
    schluessel: 'aktivitaet_offene_aufgabe',
    aktivitaet_name: 'Offene Aufgabe',
    anzeigename: 'Aktivität: Offene Aufgabe',
    sort_order: 480,
    prompt_text: [
      '## Offene Aufgabe (aktivitaet_name === "Offene Aufgabe")',
      '',
      '```html',
      '<div class="mbk-activity"',
      '     data-mbk-activity="open_task"',
      `     data-mbk-config='{"instruction":"…","description":"…"}'></div>`,
      '```',
      '',
      'Regeln (Quelle: `field_values` bzw. `master_aufgaben[].field_values`):',
      '- `instruction` ← optionale Arbeitsanweisung, falls vorhanden.',
      '- `description` ← `field_values.description` (Aufgaben-Beschreibung).',
      '- Mehrere Master → pro Master ein eigener Container.',
    ].join('\n'),
  },
];

/**
 * Liefert die Default-Anweisung für einen bestimmten Schlüssel
 * (für Reset-Buttons).
 */
export function getAktivitaetstypDefault(schluessel) {
  return AKTIVITAETSTYP_ANWEISUNGEN.find((e) => e.schluessel === schluessel) || null;
}

/**
 * Liefert die DB-Schlüssel aller bekannten Aktivitätstyp-Anweisungen.
 */
export function getAllAktivitaetstypKeys() {
  return AKTIVITAETSTYP_ANWEISUNGEN.map((e) => e.schluessel);
}

/**
 * Liefert eine Map aktivitaet_name → schluessel, damit der Aufgaben-Bauer
 * pro Aktivität schnell den passenden DB-Schlüssel findet.
 */
export function buildAktivitaetNameToSchluesselMap() {
  const m = new Map();
  for (const e of AKTIVITAETSTYP_ANWEISUNGEN) {
    m.set(e.aktivitaet_name, e.schluessel);
  }
  return m;
}