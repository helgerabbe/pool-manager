/**
 * Zentrale Logik für „masterfähige" Aktivitäten (Aktivitäten mit ≥1 MasterAufgabe).
 *
 * Drei Modi:
 *   - einzel:      genau 1 MasterAufgabe → wird direkt angezeigt.
 *   - sequenziell: mehrere MasterAufgaben, die der Reihe nach abgearbeitet werden;
 *                  erledigt = ALLE MasterAufgaben gelöst.
 *   - shuffle:     mehrere MasterAufgaben, zufällige Auswahl; erledigt = EINE gelöst.
 *
 * Der Modus wird aus dem Feld `master_anzeige_modus` der Aktivität abgeleitet
 * ('shuffle' | 'alle'); 'alle' wird auf den sequenziellen Modus abgebildet.
 *
 * Fortschritt wird über zusammengesetzte IDs getrackt:
 *   `${lernpaketInstanceId}::${activityId}::${masterId}`
 */

export const MASTER_MODUS = {
  EINZEL: 'einzel',
  SEQUENZIELL: 'sequenziell',
  SHUFFLE: 'shuffle',
};

/** Liefert das Array der MasterAufgaben einer Aktivität (immer ein Array). */
function masterListe(aktivitaet) {
  return Array.isArray(aktivitaet?.master_aufgaben) ? aktivitaet.master_aufgaben : [];
}

/** Zusammengesetzte Fortschritts-ID für eine einzelne MasterAufgabe. */
export function masterCompositeId(lernpaketInstanceId, activityId, masterId) {
  return `${lernpaketInstanceId}::${activityId}::${masterId}`;
}

/** Bestimmt den Master-Modus einer Aktivität. */
export function ermittleMasterModus(aktivitaet) {
  const master = masterListe(aktivitaet);
  if (master.length <= 1) return MASTER_MODUS.EINZEL;
  return aktivitaet?.master_anzeige_modus === 'shuffle'
    ? MASTER_MODUS.SHUFFLE
    : MASTER_MODUS.SEQUENZIELL;
}

/** Fortschritt einer masterfähigen Aktivität: { erledigt, gesamt }. */
export function masterFortschritt(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId) {
  const master = masterListe(aktivitaet);
  const gesamt = master.length;
  const erledigt = master.filter(
    (m) =>
      fortschrittByCompositeId.get(
        masterCompositeId(lernpaketInstanceId, aktivitaet.id, m.id)
      ) === 'erledigt'
  ).length;
  return { erledigt, gesamt };
}

/**
 * Ist die masterfähige Aktivität als Ganzes erledigt?
 *   - sequenziell/einzel: alle MasterAufgaben gelöst.
 *   - shuffle: mindestens eine gelöst.
 * Liefert `null`, wenn die Aktivität NICHT masterfähig ist (keine MasterAufgaben),
 * damit der Aufrufer auf seine klassische Logik zurückfallen kann.
 */
export function istMasterAktivitaetErledigt(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId) {
  const master = masterListe(aktivitaet);
  if (master.length === 0) return null;

  const { erledigt, gesamt } = masterFortschritt(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId);
  const modus = ermittleMasterModus(aktivitaet);
  if (modus === MASTER_MODUS.SHUFFLE) return erledigt >= 1;
  return erledigt >= gesamt;
}

/**
 * Wählt die nächste anzuzeigende MasterAufgabe:
 *   - sequenziell/einzel: erste noch offene (in Reihenfolge), sonst die erste.
 *   - shuffle: zufällige noch offene, sonst eine zufällige.
 */
export function naechsteMasterAufgabe(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId) {
  const master = masterListe(aktivitaet);
  if (master.length === 0) return null;

  const istErledigt = (m) =>
    fortschrittByCompositeId.get(
      masterCompositeId(lernpaketInstanceId, aktivitaet.id, m.id)
    ) === 'erledigt';

  const offen = master.filter((m) => !istErledigt(m));
  const modus = ermittleMasterModus(aktivitaet);

  if (modus === MASTER_MODUS.SHUFFLE) {
    const pool = offen.length > 0 ? offen : master;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return offen.length > 0 ? offen[0] : master[0];
}