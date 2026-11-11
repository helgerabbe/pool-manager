/**
 * Aufgaben im Lernpaket (2026-11-10): Eine Aufgabe mit `lernpaket_id` gehört
 * zum Teil „Aufgaben" ihres Lernpakets und wird dort bearbeitet — sie ist
 * kein eigener Baustein des Arbeitsplans mehr.
 *
 * Übergang: Aufgaben, die schon VOR dem Umzug einzeln in einem Arbeitsplan
 * standen, bleiben dort stehen und erscheinen dann nicht noch einmal im
 * Lernpaket.
 */

const NIVEAU_LERNTYPEN = {
  G: ['minimalist', 'pragmatiker'],
  E: ['ehrgeizig', 'passioniert'],
};

/** G = Minimalist und Pragmatiker; GE = alle; E = Ehrgeizig und Passioniert. */
export function istNiveauSichtbar(niveau, lerntyp) {
  const erlaubt = NIVEAU_LERNTYPEN[niveau];
  return !erlaubt || erlaubt.includes(lerntyp);
}

/**
 * Aufgaben, die im Arbeitsplan als eigene Bausteine geführt werden: alle ohne
 * Lernpaket — plus Lernpaket-Aufgaben, die bereits in einem Plan stehen.
 */
export function planbareAufgaben(aufgaben = [], konfiguration = null) {
  const planText = JSON.stringify(konfiguration || {});
  return (aufgaben || []).filter((a) => !a.lernpaket_id || planText.includes(a.id));
}

/** Die Aufgaben eines Lernpakets in ihrer Reihenfolge (Aufgabe 1, Aufgabe 2, …). */
export function aufgabenImLernpaket(aufgaben = [], lernpaketId) {
  return (aufgaben || [])
    .filter((a) => a.lernpaket_id === lernpaketId)
    .sort((a, b) => (a.reihenfolge_im_lernpaket ?? 0) - (b.reihenfolge_im_lernpaket ?? 0)
      || String(a.created_date).localeCompare(String(b.created_date)));
}

/** Die Aufgaben eines festen Themenfeld-Platzes (Einstieg / Gesamtaufgabe) in ihrer Reihenfolge. */
export function aufgabenAmPlatz(aufgaben = [], themenfeldId, platzKey) {
  return (aufgaben || [])
    .filter((a) => !a.lernpaket_id && a.themenfeld_id === themenfeldId && a.themenfeld_platz === platzKey)
    .sort((a, b) => (a.reihenfolge_im_lernpaket ?? 0) - (b.reihenfolge_im_lernpaket ?? 0)
      || String(a.created_date).localeCompare(String(b.created_date)));
}

/** Die Aufgaben eines Lernpakets, wie ein Schüler dieses Lerntyps sie sieht. */
export function lernpaketAufgabenFuerSchueler(aufgaben = [], lernpaketId, lerntyp, imPlanIds = new Set()) {
  return (aufgaben || [])
    .filter((a) => a.lernpaket_id === lernpaketId
      && !a._isLernpaket
      && a.sync_status !== 'to_delete'
      && !imPlanIds.has(a.id)
      && istNiveauSichtbar(a.niveau || 'GE', lerntyp))
    .sort((a, b) => (a.reihenfolge_im_lernpaket ?? 0) - (b.reihenfolge_im_lernpaket ?? 0)
      || String(a.created_date).localeCompare(String(b.created_date)));
}