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