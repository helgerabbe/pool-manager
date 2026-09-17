/**
 * auftragsSchemataKatalog.js — Der Vertrag des Import-Centers in einer Form,
 * die der Kursbau (MBK) ohne Anmeldung lesen kann.
 *
 * Analog zu bausteinKatalog.js: Der Pool-Manager veröffentlicht im Repository
 * `auftraege/schemata.json` (maschinenlesbar) und `auftraege/README.md`
 * (menschenlesbar). Darin stehen alle Auftragsarten mit ihrem JSON-Schema, die
 * erlaubten Schritt-Arten einer Sequenz, die Aufgabenarten mit ihren Feldern
 * sowie der Eingang (Adresse + Ausweis), über den Aufträge gestellt werden.
 *
 * Wichtig für den Leser: Ein Auftrag verändert NIE von selbst Daten. Er landet
 * im Posteingang des Import-Centers und wird erst nach der Freigabe einer
 * berechtigten Person ausgeführt.
 */

import { listArten, listSchrittTypen } from './importAuftragSchemata.js';

export const AUFTRAEGE_ORDNER = 'auftraege';
export const AUFTRAEGE_FORMAT = 'auftraege-1';
export const EINGANG_URL = 'https://righteous-edu-flow-hub.base44.app/functions/pruefeImportAuftrag';
export const STRUKTUR_URL = 'https://righteous-edu-flow-hub.base44.app/functions/getEinheitStrukturLesend';

/**
 * Die LESENDE Auskunft — Voraussetzung für zielgerichtete Aufträge.
 *
 * Warum sie live abgefragt wird und nicht im Repository liegt: Aktivitäts- und
 * Schritt-IDs ändern sich bei jeder Bearbeitung. Eine Datei im Repository wäre
 * schon veraltet, bevor der Auftrag gestellt ist — und ein Auftrag auf eine
 * veraltete Schritt-ID greift ins Leere.
 */
export const STRUKTUR_LESEN = {
  url: STRUKTUR_URL,
  methode: 'POST',
  ausweis: 'Authorization: Bearer <AUTOMATION_SECRET> — derselbe Schlüssel wie beim Eingang.',
  body: {
    einheit_id: 'Pflicht — die Einheit, deren Aufbau gelesen werden soll',
    aktivitaet_detail_id: 'optional — liefert die field_values GENAU DIESER Aktivität mit',
    schritt_detail_id: 'optional — liefert die Nutzdaten GENAU DIESES Sequenz-Schritts mit',
  },
  antwort: {
    vertrag_version: 'einheit-struktur-2',
    detailstufe: '"getrimmt" oder "getrimmt+detail"',
    einheit: 'titel, fach, jahrgangsstufe, sichtbarkeit, format, export_lifecycle_status',
    themenfelder:
      '[{ themenfeld_id, titel, position, leitfrage, bearbeitungsmodus, lernpakete: [{ lernpaket_id, titel, position, freigabe, vollstaendig, phasen: [{ phase, deaktiviert, aktivitaeten: [{ aktivitaet_instanz_id, position, aufgabenart_id, aufgabenart, vollstaendig, sync_status }] }] }] }]',
    lernpakete_ohne_themenfeld: 'gleiche Form wie lernpakete — verwaiste Pakete',
    allgemeine_aufgaben:
      '[{ aufgabe_id, titel, modus, aufgaben_typ, themenfeld_id, freigabe, schritte: [{ schritt_id, position, typ, titel, aufgabenart, status }] }]',
    aktivitaet_detail: 'nur bei aktivitaet_detail_id — inkl. form_schema und field_values',
    schritt_detail: 'nur bei schritt_detail_id — der vollständige Schritt inkl. form_schema',
  },
  hinweis:
    'Standardmäßig GETRIMMT: Struktur und Metadaten, keine Inhalte. Feldwerte werden gezielt pro Aktivität bzw. Schritt angefordert — so wird nicht der ganze Inhaltsbestand ausgeliefert, nur weil die Struktur gebraucht wurde.',
};

export function baueSchemataDatei(aktivitaeten = [], jetzt = new Date().toISOString()) {
  const aktiv = (aktivitaeten || []).filter((a) => a?.is_active !== false);
  return {
    format: AUFTRAEGE_FORMAT,
    erzeugt_am: jetzt,
    eingang: {
      url: EINGANG_URL,
      methode: 'POST',
      ausweis: 'Authorization: Bearer <AUTOMATION_SECRET> — derselbe Schlüssel wie bei den übrigen Automationen.',
      body: {
        auftrags_art: 'eine der Arten aus `arten`',
        titel: 'optional, kurze Bezeichnung für den Posteingang',
        ziel_id: 'ID der Stelle (Einheit / Themenfeld / Lernpaket / Aktivität / Aufgabe) — leer bei ziel_typ "keines"',
        position: 'optional, 0-basiert, nur wenn position_erlaubt',
        parameter: 'Nutzdaten gemäß dem JSON-Schema der Art',
        absender: 'optional, Kennung des Absenders (Standard: "mbk")',
        auftrag_id: 'optional — erneutes Einreichen aktualisiert denselben Auftrag',
      },
      antwort: {
        auftrag: 'der abgelegte Auftrag (inkl. id, status, pruefstatus)',
        ausfuehrbar: 'true = vollständig; false = siehe pruefergebnis',
        pruefergebnis: '[{ fieldName, label, reason }] — was fehlt oder nicht passt',
      },
      hinweis:
        'Der Auftrag wird nur GEPRÜFT und abgelegt (quelle "mbk"). Ausgeführt wird er erst, wenn eine berechtigte Person ihn im Import-Center freigibt.',
    },
    lesen: STRUKTUR_LESEN,
    arten: listArten(),
    schritt_typen: listSchrittTypen(),
    aufgabenarten: aktiv
      .map((a) => ({
        aktivitaet_id: a.id,
        name: a.name,
        phase: a.phase,
        unterstuetzt_varianten: a.supports_master === true,
        field_values: (Array.isArray(a.form_schema) ? a.form_schema : [])
          .filter((f) => f?.field_name && f.type !== 'info')
          .map((f) => ({ name: f.field_name, typ: f.type, label: f.label || '', pflicht: f.required === true })),
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'de')),
  };
}

export function baueSchemataMarkdown(datei) {
  const zeilen = [
    '# Aufträge an den Pool-Manager (Import-Center)',
    '',
    `Format \`${datei.format}\` · erzeugt am ${String(datei.erzeugt_am).slice(0, 19)}Z`,
    '',
    'Über das Import-Center kann der Kursbau Änderungen am Bestand des Pool-Managers',
    'BEANTRAGEN: Einheiten, Themenfelder, Lernpakete, Aktivitäten und Sequenzaufgaben',
    'anlegen, ändern oder entfernen. Jeder Auftrag wird geprüft und landet im',
    'Posteingang — ausgeführt wird er erst nach der Freigabe einer berechtigten Person.',
    'Die vollständigen JSON-Schemata stehen in `schemata.json`.',
    '',
    '## Eingang',
    '',
    `\`POST ${datei.eingang.url}\``,
    '',
    `Ausweis: \`${datei.eingang.ausweis}\``,
    '',
    '```json',
    JSON.stringify(
      {
        auftrags_art: 'lernpaket_anlegen',
        titel: 'Lernpaket „Dezimalzahlen runden"',
        ziel_id: '<themenfeld_id>',
        position: 1,
        parameter: { titel: 'Dezimalzahlen runden', geschaetzte_dauer_minuten: 30 },
        absender: 'mbk',
      },
      null,
      2,
    ),
    '```',
    '',
    'Antwort: `{ auftrag, ausfuehrbar, pruefergebnis }`. Ist `ausfuehrbar` false, sagt',
    '`pruefergebnis` pro Feld, was fehlt; mit `auftrag_id` kann derselbe Auftrag',
    'korrigiert erneut eingereicht werden.',
    '',
    'Ein ungültiger Schlüssel wird mit `401` und',
    '`{"error":"Nicht angemeldet oder ungültiger Automation-Schlüssel."}` beantwortet —',
    'nicht mit einem Serverfehler.',
    '',
    '## Struktur lesen (vor dem Auftrag)',
    '',
    `\`POST ${datei.lesen.url}\``,
    '',
    `Ausweis: \`${datei.lesen.ausweis}\``,
    '',
    'Diese Auskunft liefert die IDs, auf die sich ein Auftrag bezieht:',
    '`themenfeld_id`, `lernpaket_id`, `aktivitaet_instanz_id`, `aufgabe_id` und',
    '`schritt_id`. Sie steht bewusst NICHT als Datei im Repository — die IDs und',
    'Positionen ändern sich bei jeder Bearbeitung, eine Datei wäre bereits veraltet.',
    '',
    '```json',
    JSON.stringify({ einheit_id: '<einheit_id>', schritt_detail_id: '<schritt_id>' }, null, 2),
    '```',
    '',
    `Antwort (\`${datei.lesen.antwort.vertrag_version}\`):`,
    '',
    '| Feld | Inhalt |',
    '|---|---|',
    ...Object.entries(datei.lesen.antwort).map(([k, v]) => `| \`${k}\` | ${v} |`),
    '',
    datei.lesen.hinweis,
    '',
    '## Auftragsarten',
    '',
    '| Art | Ziel | Position | Pflichtfelder in `parameter` | Beschreibung |',
    '|---|---|---|---|---|',
    ...datei.arten.map(
      (a) =>
        `| \`${a.art}\` | ${a.ziel_typ} | ${a.position_erlaubt ? 'ja' : '—'} | ${(a.parameter?.required || []).map((f) => `\`${f}\``).join(', ') || '—'} | ${a.beschreibung} |`,
    ),
    '',
    '## Schritt-Arten einer Sequenzaufgabe',
    '',
    'Ein Schritt ist `{ id?, typ, titel?, <Block> }`; bei `katalog` liegen `aktivitaet_id`',
    'und `field_values` direkt am Schritt.',
    '',
    '| typ | Block | Felder |',
    '|---|---|---|',
    ...datei.schritt_typen.map(
      (t) =>
        `| \`${t.typ}\` | ${t.block ? `\`${t.block}\`` : '— (am Schritt)'} | ${t.felder.map((f) => `\`${f.name}\`${f.pflicht ? '\\*' : ''}`).join(', ')} |`,
    ),
    '',
    '## Aufgabenarten (für `aktivitaet_id`)',
    '',
    '| Aufgabenart | ID | Phase | field_values |',
    '|---|---|---|---|',
    ...datei.aufgabenarten.map(
      (a) =>
        `| ${a.name} | \`${a.aktivitaet_id}\` | ${a.phase || '—'} | ${a.field_values.map((f) => `\`${f.name}\`${f.pflicht ? '\\*' : ''}`).join(', ') || '—'} |`,
    ),
    '',
  ];
  return zeilen.join('\n');
}