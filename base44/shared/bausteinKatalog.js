/**
 * bausteinKatalog.js — Was der Pool-Manager an Bausteinen kennt, in einer Form,
 * die der Kursbau lesen kann.
 *
 * WARUM (Meldung der MBK, 2026-09-14): Der Kursbau verzweigt nach Dateimustern.
 * Ein Schritt-Typ oder ein Aktivitätsname, den er nicht kennt, fiel bisher
 * LAUTLOS heraus — beim ersten Deutsch-Export waren das 65 Schritte und zehn
 * Folienstrecken. Damit das nicht wieder passiert, veröffentlicht der
 * Pool-Manager sein Vokabular als Datei im Repository: eine Liste der
 * Schritt-Typen und der komplette Aktivitätenkatalog mit den Feldnamen, die
 * jede Aktivität in `field_values` mitbringt. Der Bau kann dann beim Bauen
 * prüfen, ob er jeden Typ kennt, und melden statt zu schweigen.
 *
 * Die Schritt-Typen stehen hier bewusst als eigene Liste: Backend-Funktionen
 * können nicht aus src/ importieren. Sie spiegelt src/lib/schrittTypen.js —
 * wird dort ein Typ ergänzt, gehört er auch hierher (und in eine Nachricht an
 * den Kursbau).
 */

export const KATALOG_ORDNER = 'bausteine';
export const KATALOG_FORMAT = 'bausteine-1';

export const SCHRITT_TYPEN_EXPORT = [
  {
    id: 'katalog',
    label: 'Format aus dem Katalog',
    datenfeld: null,
    felder: ['aktivitaet_katalog_id', 'aktivitaet_name', 'field_values'],
    hinweis: 'Eine ganze Katalog-Aktivität als Schritt. Welche Felder in field_values stehen, sagt aktivitaeten-katalog.json.',
  },
  {
    id: 'offen',
    label: 'Offene Aufgabe',
    datenfeld: 'offen',
    felder: ['fragment', 'snapshot_html'],
    hinweis: 'fragment ist fertiges, freigegebenes HTML mit eigener Interaktion. Keine KI-Rückmeldung.',
  },
  {
    id: 'brian',
    label: 'Aufgabe mit Brian Tutor',
    datenfeld: 'brian',
    felder: ['dialog_name', 'learner_instruction', 'system_instruction', 'completion_rule', 'url', 'dialog_id'],
    hinweis: 'Ein KI-Tutor-Gespräch pro Schritt. Die Adresse des Dialogs kommt über brian-urls-1 zurück.',
  },
  {
    id: 'abgabe',
    label: 'Ergebnisabgabe',
    datenfeld: 'abgabe',
    felder: ['formate', 'dateiformat', 'custom_format', 'hinweis'],
    hinweis: 'Sagt nur, WAS abgegeben wird. Der Pool-Manager nimmt nichts entgegen — hochgeladen wird in Moodle.',
  },
  {
    id: 'handlung',
    label: 'Handlungsaufgabe',
    datenfeld: 'handlung',
    felder: ['arbeitsauftrag', 'material_hinweis', 'datei_url', 'datei_name', 'bestaetigungstext'],
    hinweis: 'Arbeit an realem Material. Schülerseitig nur ein Bestätigen-Knopf.',
  },
  {
    id: 'extern',
    label: 'Externe Seite',
    datenfeld: 'extern',
    felder: ['url', 'titel', 'hoehe', 'hinweis'],
    hinweis: 'Eingebettete fremde Seite, typischerweise GeoGebra.',
  },
  {
    id: 'material',
    label: 'Material',
    datenfeld: 'material',
    felder: ['material_typ', 'inhalt', 'url', 'datei_url', 'beschreibung', 'transkript'],
    hinweis: 'Reiner Inhalt ohne Aufgabenstellung. material_typ: text | video | audio | bild | pdf | link.',
  },
  {
    id: 'aufgabe',
    label: 'Freitextfrage',
    datenfeld: 'aufgabe',
    felder: ['aufgabenstellung', 'input_erforderlich', 'musterloesung', 'feedback_modus'],
    hinweis: 'Ursprünglicher Aufgabenschritt. Bleibt gültig, wird für Neues nicht mehr angeboten.',
  },
];

/** Jeder Schritt trägt diese Felder, unabhängig vom Typ. */
export const SCHRITT_BASISFELDER = ['id', 'typ', 'reihenfolge', 'titel', 'status'];

/**
 * Baut die Katalog-Datei aus dem AktivitaetenKatalog der Datenbank.
 * `field_values` je Aktivität = die field_names ihres form_schema.
 */
export function baueKatalogDatei(aktivitaeten = [], jetzt = new Date().toISOString()) {
  const aktiv = (aktivitaeten || []).filter((a) => a?.is_active !== false);
  return {
    format: KATALOG_FORMAT,
    erzeugt_am: jetzt,
    schritt_basisfelder: SCHRITT_BASISFELDER,
    schritt_typen: SCHRITT_TYPEN_EXPORT,
    aktivitaeten: aktiv
      .map((a) => ({
        aktivitaet_katalog_id: a.id,
        name: a.name,
        phase: a.phase,
        unterstuetzt_varianten: a.supports_master === true,
        field_values: (Array.isArray(a.form_schema) ? a.form_schema : [])
          .filter((f) => f?.field_name && f.type !== 'info')
          .map((f) => ({
            name: f.field_name,
            typ: f.type,
            label: f.label || '',
            pflicht: f.required === true,
          })),
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'de')),
  };
}

/** Menschenlesbare Fassung derselben Daten — damit man nicht JSON lesen muss. */
export function baueKatalogMarkdown(datei) {
  const zeilen = [
    '# Bausteine des Pool-Managers',
    '',
    `Format \`${datei.format}\` · erzeugt am ${String(datei.erzeugt_am).slice(0, 19)}Z`,
    '',
    'Diese Dateien sagen, welche Schritt-Typen und Aktivitätsnamen im Payload vorkommen',
    'können. Wer beim Bauen einen Typ oder Namen antrifft, der hier nicht steht, soll das',
    'melden statt ihn stillschweigend auszulassen. Neue Bausteine kündigen wir zusätzlich',
    'im Ordner `austausch/` mit einem Beispiel-Payload an.',
    '',
    '## Schritt-Typen einer Aufgabensequenz',
    '',
    `Jeder Schritt trägt: ${datei.schritt_basisfelder.map((f) => `\`${f}\``).join(', ')}.`,
    'Je nach `typ` ist genau EIN Nutzdaten-Block gefüllt:',
    '',
    '| typ | Block | Felder | Hinweis |',
    '|---|---|---|---|',
    ...datei.schritt_typen.map(
      (t) => `| \`${t.id}\` | ${t.datenfeld ? `\`${t.datenfeld}\`` : '— (am Schritt)'} | ${t.felder.map((f) => `\`${f}\``).join(', ')} | ${t.hinweis} |`,
    ),
    '',
    '## Aktivitäten des Katalogs',
    '',
    'Der Name steht im Payload als `aktivitaet_name`, die Kennung als',
    '`aktivitaet_katalog_id`. Die genannten Felder sind die möglichen Schlüssel in',
    '`field_values` (Pflichtfelder mit \\*).',
    '',
    '| Aktivität | Phase | field_values |',
    '|---|---|---|',
    ...datei.aktivitaeten.map(
      (a) => `| ${a.name} | ${a.phase || '—'} | ${a.field_values.map((f) => `\`${f.name}\`${f.pflicht ? '\\*' : ''}`).join(', ') || '—'} |`,
    ),
    '',
  ];
  return zeilen.join('\n');
}