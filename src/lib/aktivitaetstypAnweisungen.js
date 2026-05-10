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

  // ── Platzhalter für weitere Typen ──────────────────────────────
  // Sobald wir einen weiteren Typ auf die Activity-Runtime umstellen,
  // kommt hier ein Eintrag analog rein. Bis dahin gilt der Fallback-
  // Hinweis im Master-System-Prompt ("rendere statisch wie bisher").
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