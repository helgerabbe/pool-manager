/**
 * kursStatusDatei.js
 *
 * Kurs-Status im Austauschordner (Format `kurs-status-1`, 2026-09-09).
 *
 * Eine Einheit kann im Export-Center vom Export ausgeschlossen werden: Sie
 * bleibt im Pool-Manager vollständig erhalten, soll aber für Schüler nicht mehr
 * sichtbar sein (veraltet, überarbeitungsbedürftig, vorübergehend gesperrt).
 *
 * Damit der Kursbau das beim nächsten Nachlesen erkennt, liegt neben den
 * Payloads eine kleine Statusdatei:
 *   kurse/<slug>/kurs-status.json
 *
 * Wichtig: Der Bau soll den Kurs NICHT löschen, sondern nur unsichtbar
 * schalten — ein späteres Wiederfreischalten muss ohne Neuaufbau möglich sein.
 * Die Datei wird bei jeder Statusänderung UND bei jedem Payload-Push
 * geschrieben, damit Repo-Stand und Pool-Manager nie auseinanderlaufen.
 */

export const KURS_STATUS_FORMAT = 'kurs-status-1';
export const KURS_STATUS_DATEINAME = 'kurs-status.json';

/**
 * Baut den Inhalt der Statusdatei aus einer Einheit.
 * @param {object} einheit  Einheiten-Datensatz.
 * @param {string} slug     Ordnername im Repository (kurse/<slug>/).
 */
export function buildKursStatus(einheit, slug) {
  // Fehlendes Feld = aktiv (Altbestand vor Einführung des Schalters).
  const aktiv = einheit?.export_aktiv !== false;
  return {
    format: KURS_STATUS_FORMAT,
    erzeugt_am: new Date().toISOString(),
    einheit_id: einheit?.id || null,
    slug,
    titel: einheit?.titel_der_einheit || null,
    fach: einheit?.fach || null,
    jahrgangsstufe: einheit?.jahrgangsstufe || null,
    status: aktiv ? 'aktiv' : 'inaktiv',
    hinweis: aktiv
      ? 'Dieser Kurs ist freigeschaltet und soll für Schüler sichtbar sein.'
      : 'Dieser Kurs ist vorübergehend ausgesetzt. Bitte in Moodle unsichtbar '
        + 'schalten, NICHT löschen — die Fachgruppe kann ihn jederzeit wieder '
        + 'freischalten. Payloads und Materialien bleiben im Repository liegen.',
    deaktiviert_am: aktiv ? null : einheit?.export_deaktiviert_am || null,
    deaktiviert_von: aktiv ? null : einheit?.export_deaktiviert_von || null,
    grund: aktiv ? null : einheit?.export_deaktiviert_grund || null,
  };
}

/**
 * Liefert den Datei-Eintrag für pushFiles ({ path, bytes }).
 */
export function kursStatusFile(einheit, slug) {
  return {
    path: `kurse/${slug}/${KURS_STATUS_DATEINAME}`,
    bytes: new TextEncoder().encode(
      `${JSON.stringify(buildKursStatus(einheit, slug), null, 2)}\n`
    ),
  };
}