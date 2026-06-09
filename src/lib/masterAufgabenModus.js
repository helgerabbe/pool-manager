/**
 * Zentrale Logik für „masterfähige" Aktivitäten (Aktivitäten mit MasterAufgaben).
 *
 * Drei Modi:
 *   - einzel:      genau eine MasterAufgabe → wird direkt angezeigt.
 *   - sequenziell: mehrere MasterAufgaben, die der Reihe nach abgearbeitet werden.
 *                  Erledigt, wenn ALLE MasterAufgaben gelöst sind.
 *   - shuffle:     mehrere MasterAufgaben, von denen eine zufällige ausgespielt wird.
 *                  Erledigt, sobald EINE gelöst wurde.
 *
 * Der Modus ergibt sich aus `master_anzeige_modus` der Aktivität
 * ('shuffle' | 'alle') in Kombination mit der Anzahl der MasterAufgaben.
 *
 * Fortschritt wird über zusammengesetzte IDs getrackt:
 *   `<lernpaketInstanceId>::<activityId>::<masterId>`
 */

export const MASTER_MODUS = {
  EINZEL: 'einzel',
  SEQUENZIELL: 'sequenziell',
  SHUFFLE: 'shuffle',
};

/** Composite-ID für den Fortschritt einer einzelnen MasterAufgabe. */
export function masterCompositeId(lernpaketInstanceId, activityId, masterId) {
  return `${lernpaketInstanceId}::${activityId}::${masterId}`;
}

/** Liste der MasterAufgaben einer Aktivität (immer ein Array). */
function masterListe(aktivitaet) {
  return Array.isArray(aktivitaet?.master_aufgaben) ? aktivitaet.master_aufgaben : [];
}

/**
 * Ermittelt den Master-Modus einer Aktivität.
 * - 0 MasterAufgaben → null (keine masterfähige Aktivität / klassisch).
 * - 1 MasterAufgabe  → 'einzel'.
 * - ≥2 + Anzeigemodus 'shuffle' → 'shuffle', sonst 'sequenziell' ('alle').
 */
export function ermittleMasterModus(aktivitaet) {
  const liste = masterListe(aktivitaet);
  if (liste.length === 0) return null;
  if (liste.length === 1) return MASTER_MODUS.EINZEL;
  return aktivitaet?.master_anzeige_modus === 'shuffle'
    ? MASTER_MODUS.SHUFFLE
    : MASTER_MODUS.SEQUENZIELL;
}

/** Set der bereits erledigten MasterAufgaben-IDs einer Aktivität. */
function erledigteMasterIds(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId) {
  const ids = new Set();
  masterListe(aktivitaet).forEach((m) => {
    const id = masterCompositeId(lernpaketInstanceId, aktivitaet.id, m.id);
    if (fortschrittByCompositeId.get(id) === 'erledigt') ids.add(m.id);
  });
  return ids;
}

/**
 * Fortschrittszähler: { erledigt, gesamt } über die MasterAufgaben.
 */
export function masterFortschritt(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId) {
  const liste = masterListe(aktivitaet);
  const erledigt = erledigteMasterIds(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId).size;
  return { erledigt, gesamt: liste.length };
}

/**
 * Wählt die nächste anzuzeigende MasterAufgabe.
 * - sequenziell/einzel: erste noch offene (nach Reihenfolge), sonst die erste.
 * - shuffle:            zufällige noch offene, sonst eine zufällige.
 * Gibt null zurück, wenn keine MasterAufgaben existieren.
 */
export function naechsteMasterAufgabe(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId) {
  const liste = [...masterListe(aktivitaet)].sort(
    (a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0)
  );
  if (liste.length === 0) return null;

  const erledigt = erledigteMasterIds(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId);
  const offen = liste.filter((m) => !erledigt.has(m.id));
  const pool = offen.length > 0 ? offen : liste;

  const modus = ermittleMasterModus(aktivitaet);
  if (modus === MASTER_MODUS.SHUFFLE) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return pool[0];
}

/**
 * Ist die Aktivität als Ganzes „erledigt"?
 *   - null  → keine masterfähige Aktivität (Aufrufer soll klassisch prüfen).
 *   - shuffle:      true, sobald ≥1 MasterAufgabe erledigt ist.
 *   - sequenziell/einzel: true, wenn ALLE MasterAufgaben erledigt sind.
 */
export function istMasterAktivitaetErledigt(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId) {
  const modus = ermittleMasterModus(aktivitaet);
  if (modus === null) return null;

  const { erledigt, gesamt } = masterFortschritt(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId);
  if (gesamt === 0) return null;

  if (modus === MASTER_MODUS.SHUFFLE) return erledigt >= 1;
  return erledigt >= gesamt;
}