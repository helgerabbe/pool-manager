/**
 * lernpfadeUtils.js
 *
 * Reine Helfer für das Lernpfad-Cockpit (Tab 7).
 * Single Source of Truth für die "ist Aufgabe bereits in einem Pfad?"-Logik.
 *
 * Datenstruktur (lernpfade_konfiguration[lernTyp]):
 *   [
 *     { sektor_id, titel, modus, aufgaben_ids: ["task_1", "task_2", ...] },
 *     ...
 *   ]
 */

/**
 * Liefert ein Set aller aufgaben_ids, die im angegebenen Lerntyp bereits
 * in irgendeinem Sektor verwendet werden.
 */
export function getUsedAufgabenIds(konfiguration, lernTyp) {
  const sektoren = konfiguration?.[lernTyp] || [];
  const used = new Set();
  for (const s of sektoren) {
    for (const id of s?.aufgaben_ids || []) {
      if (id) used.add(id);
    }
  }
  return used;
}

/**
 * Convenience-Check: Ist die Aufgabe bereits im aktuellen Pfad?
 */
export function isAufgabeInLernpfad(konfiguration, lernTyp, aufgabeId) {
  return getUsedAufgabenIds(konfiguration, lernTyp).has(aufgabeId);
}