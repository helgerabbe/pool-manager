/**
 * sektorTemplates.js
 *
 * Single Source of Truth für die Sektor-Vorlagen, die der „+ Sektor
 * hinzufügen"-Button im Lernpfad-Architekt anbietet.
 *
 * Drei Varianten:
 *   - 'erarbeitung' → entspricht Sektor 2 des Minimalist-Templates
 *     (Einführung + ggf. Handlung + Lernpaket-Platzhalter).
 *   - 'zwischentest' → entspricht Sektor 3 des Minimalist-Templates
 *     (Einstiegsseite + Zwischentest-Platzhalter).
 *   - 'leer' → leerer Sektor ohne Items (Fallback / Maximum-Flexibility).
 *
 * Hinweis: Die hier erzeugten Sektoren sind UNNORMALISIERT (statische
 * Demo-Daten). Sie laufen anschließend durch `addSektor`/`createNewSektor`
 * in `lernpfadeUtils`, was die finale `sektor_id`-UUID setzt.
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';

const sys = (refId) => ({ type: ITEM_TYPE.SYSTEM, ref_id: refId });

export const SEKTOR_TEMPLATE_KEYS = Object.freeze({
  ERARBEITUNG: 'erarbeitung',
  ZWISCHENTEST: 'zwischentest',
  LEER: 'leer',
});

/**
 * Liefert die Bausteine eines Sektor-Templates. `createNewSektor` setzt
 * danach die UUID, den Default-Titel kann der Aufrufer überschreiben.
 */
export function getSektorTemplate(key) {
  switch (key) {
    case SEKTOR_TEMPLATE_KEYS.ERARBEITUNG:
      return {
        titel: 'Erarbeitungsphase',
        modus: 'sequenziell',
        items: [
          sys('sys_platzhalter_info'),
          sys('sys_platzhalter_handlung'),
          sys('sys_platzhalter_moodle_buendel'),
        ],
      };
    case SEKTOR_TEMPLATE_KEYS.ZWISCHENTEST:
      return {
        titel: 'Zwischentest',
        modus: 'sequenziell',
        items: [
          sys('sys_platzhalter_info'),
          sys('sys_platzhalter_zwischentest'),
        ],
      };
    case SEKTOR_TEMPLATE_KEYS.LEER:
    default:
      return { titel: 'Neuer Sektor', modus: 'sequenziell', items: [] };
  }
}