/**
 * dashboardDriftResolutions.js
 *
 * Etappe 3: Auflösungs-Helfer für die im Drift-Detector erkannten
 * Inkonsistenzen zwischen Strukturdaten und `lernpfade_konfiguration`.
 *
 * Reine, immutable Operationen über die Konfiguration eines Lerntyps.
 * Schreibt NICHT in die DB — der Cockpit-Save-Pfad erledigt Persistenz und
 * Junction-Sync (`syncLernpfadMembership`) wie bei jeder anderen Mutation.
 *
 * Drei Aktionen:
 *
 *   1) addArbeitsphaseSektorForThemenfeld
 *      Legt einen leeren Arbeitsphase-Sektor (sektor_typ='arbeitsphase_themenfeld')
 *      mit themenfeld_id-Bindung an. Wird genutzt, wenn der Drift-Detector
 *      ein Themenfeld ohne zugehörigen Sektor meldet (missing_themenfelder).
 *
 *   2) removeOrphanedSektor
 *      Entfernt einen Sektor komplett. Wird genutzt für orphaned_sektoren
 *      (Themenfeld in DB gelöscht, Sektor blieb stehen).
 *      Aufgaben/Lernpakete in dem Sektor werden NICHT gelöscht — sie tauchen
 *      nach dem Save wieder im Pool auf, weil sie nicht mehr im Pfad referenziert
 *      sind. Ghost-Items im Sektor verschwinden mit dem Sektor; das entspricht
 *      genau dem gewünschten Verhalten.
 *
 *   3) removeGhostItem
 *      Entfernt ein einzelnes Item (per instance_id) aus einem Sektor.
 *      Wenn das Item ein Bündel-Header ist, werden auch alle Children
 *      mit entfernt — analog zu `removeBundleAndCascade`.
 *      Da Ghost-Items per Definition gelöschte ref_ids haben, ist die
 *      Cascade-Frage hier akademisch (ein Ghost-Bündel hätte keine sinnvollen
 *      Children mehr) — wir bleiben aber konsistent zur sonstigen Bündel-Logik.
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';
import { SEKTOR_TYP } from '@/lib/sektorTypen';
import {
  createNewSektor,
  addSektor,
  removeSektor,
} from '@/lib/lernpfadeUtils';
import { getArbeitsphaseDefaultItems } from '@/lib/dashboardTemplates';

/**
 * Aktion 1: Fehlenden Arbeitsphase-Sektor für ein Themenfeld nachziehen.
 *
 * Wird vor dem Aufruf bereits durch den Detector validiert — der Aufrufer
 * hat also garantiert ein existierendes Themenfeld in der Hand.
 *
 * @param {object} konfig
 * @param {string} lernTyp
 * @param {{ id: string, titel: string }} themenfeld
 * @returns {object} neue Konfiguration (immutable)
 */
export function addArbeitsphaseSektorForThemenfeld(konfig, lernTyp, themenfeld) {
  if (!themenfeld?.id) return konfig;
  // Standardraster für diesen Lerntyp übernehmen (Einführung,
  // Handlungs-Platzhalter, Lernpaket-/Brian-Bündel etc.). So bekommt der
  // Drift-„+ Sektor"-Pfad denselben Aufbau wie ein frisch initialisiertes
  // Dashboard – Source of Truth bleibt DASHBOARD_TEMPLATES.
  const sektor = createNewSektor({
    titel: themenfeld.titel || 'Themenfeld',
    items: getArbeitsphaseDefaultItems(lernTyp),
    sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
    themenfeld_id: themenfeld.id,
  });
  return addSektor(konfig, lernTyp, sektor);
}

/**
 * Aktion 2: Verwaisten Sektor entfernen (samt aller darin enthaltenen Items).
 *
 * Aufgaben/Lernpakete werden NICHT gelöscht — sie wandern nur aus dem Pfad
 * raus und erscheinen wieder im Pool (sofern sie noch existieren). Ghost-Items
 * verschwinden ohnehin, weil ihre ref_id ins Leere zeigt.
 *
 * Reiner Wrapper um `removeSektor`, eigener Name dient der Lesbarkeit der
 * Aufrufer-Seite (Drift-Banner).
 */
export function removeOrphanedSektor(konfig, lernTyp, sektorId) {
  return removeSektor(konfig, lernTyp, sektorId);
}

/**
 * Aktion 3: Einzelnes Ghost-Item per instance_id aus einem Sektor entfernen.
 *
 * - Ist das Item ein Bündel-Header (parent für andere Items), werden auch
 *   alle Children mitentfernt (Cascade) — analog zu removeBundleAndCascade,
 *   aber hier inline, weil wir die instance_id direkt haben und keinen
 *   Bundle-Mode-Check brauchen (ein Ghost zeigt per Definition auf ein
 *   gelöschtes Asset; ob es technisch ein Bündel war, ist egal — wir wollen
 *   den Pfad sauber verlassen).
 * - Operiert immutable. No-op, wenn instance_id nicht gefunden wird.
 */
export function removeGhostItem(konfig, lernTyp, sektorId, instanceId) {
  if (!instanceId) return konfig;
  const sektoren = Array.isArray(konfig?.[lernTyp]) ? konfig[lernTyp] : [];
  const next = sektoren.map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const items = (s.items || []).filter(
      (it) =>
        it.instance_id !== instanceId &&
        it.parent_instance_id !== instanceId
    );
    return { ...s, items };
  });
  return { ...konfig, [lernTyp]: next };
}

// Re-Export für Aufrufer, die Item-Type-Prüfungen machen wollen.
export { ITEM_TYPE };