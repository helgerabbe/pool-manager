/**
 * shared/importAuftragSequenz.js
 *
 * Das Rechnen an einer Schrittfolge: IDs vergeben, Reihenfolge sauber halten,
 * einfügen, verschieben, ersetzen, entfernen.
 *
 * Bewusst hier und nicht in der Funktion: Die Ausführung eines Auftrags und die
 * Prüfung müssen dieselbe Vorstellung davon haben, was "an Position 2" heißt —
 * sonst zeigt der Posteingang etwas anderes, als hinterher im Bestand steht.
 *
 * Reine Funktionen, keine I/O.
 */

/** Stabile ID für einen Schritt, der noch keine hat. */
export function neueSchrittId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Sortiert nach reihenfolge und schreibt sie lückenlos neu (0, 1, 2 …). */
export function normalisiereSchritte(schritte = []) {
  return (Array.isArray(schritte) ? schritte : [])
    .slice()
    .sort((a, b) => (a?.reihenfolge || 0) - (b?.reihenfolge || 0))
    .map((s, idx) => ({
      ...s,
      id: s?.id || neueSchrittId(),
      reihenfolge: idx,
      status: s?.status || 'uebernommen',
    }));
}

/** Fügt einen Schritt an `position` ein (undefined = hinten anhängen). */
export function fuegeSchrittEin(schritte = [], schritt = {}, position) {
  const liste = normalisiereSchritte(schritte);
  const ziel =
    position === undefined || position === null
      ? liste.length
      : Math.max(0, Math.min(Number(position), liste.length));
  liste.splice(ziel, 0, { ...schritt, id: schritt.id || neueSchrittId(), status: schritt.status || 'uebernommen' });
  return { schritte: normalisiereSchritte(liste), position: ziel };
}

/** Verschiebt den Schritt mit `schrittId` an `position`. */
export function verschiebeSchritt(schritte = [], schrittId, position) {
  const liste = normalisiereSchritte(schritte);
  const idx = liste.findIndex((s) => s.id === schrittId);
  if (idx === -1) return null;
  const ziel = Math.max(0, Math.min(Number(position), liste.length - 1));
  const [schritt] = liste.splice(idx, 1);
  liste.splice(ziel, 0, schritt);
  return { schritte: normalisiereSchritte(liste), von: idx, nach: ziel };
}

/** Ersetzt den Schritt mit `schrittId` durch `neu` (id und Position bleiben). */
export function ersetzeSchritt(schritte = [], schrittId, neu = {}) {
  const liste = normalisiereSchritte(schritte);
  const idx = liste.findIndex((s) => s.id === schrittId);
  if (idx === -1) return null;
  liste[idx] = {
    ...neu,
    id: schrittId,
    reihenfolge: liste[idx].reihenfolge,
    status: neu.status || 'uebernommen',
  };
  return { schritte: normalisiereSchritte(liste), position: idx };
}

/** Entfernt den Schritt mit `schrittId`. */
export function entferneSchritt(schritte = [], schrittId) {
  const liste = normalisiereSchritte(schritte);
  const idx = liste.findIndex((s) => s.id === schrittId);
  if (idx === -1) return null;
  const [entfernt] = liste.splice(idx, 1);
  return { schritte: normalisiereSchritte(liste), entfernt };
}

/**
 * Kurzbeschreibung eines Schritts für Protokoll und Posteingang —
 * damit im Nachvollzug nicht nur "Schritt geändert" steht.
 */
export function beschreibeSchritt(schritt = {}) {
  const titel = String(schritt.titel || '').trim();
  return titel ? `${schritt.typ || '?'} · ${titel}` : String(schritt.typ || '?');
}