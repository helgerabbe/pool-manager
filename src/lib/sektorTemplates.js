/**
 * sektorTemplates.js
 *
 * Single Source of Truth für die Sektor-Vorlagen, die der „+ Sektor
 * hinzufügen"-Button im Lernpfad-Architekt anbietet.
 *
 * Verfügbare Varianten:
 *   - 'erarbeitung'          → Sektor 2 des Minimalist-Templates
 *     (Einführung + ggf. Handlung + Lernpaket-Platzhalter).
 *   - 'erarbeitung_training' → Sektor 2 des Pragmatiker-Templates
 *     (Einführung + ggf. Handlung + Lernpaket + Brian-Bündel).
 *   - 'zwischentest'         → Sektor 3 des Minimalist-Templates
 *     (Einstiegsseite + Zwischentest-Platzhalter).
 *   - 'leer'                 → leerer Sektor ohne Items (Fallback / Maximum-Flexibility).
 *
 * Welche Vorlagen pro Lerntyp angeboten werden, steuert
 * `getSektorTemplateOptionsForLerntyp` weiter unten.
 *
 * Hinweis: Die hier erzeugten Sektoren sind UNNORMALISIERT (statische
 * Demo-Daten). Sie laufen anschließend durch `addSektor`/`createNewSektor`
 * in `lernpfadeUtils`, was die finale `sektor_id`-UUID setzt.
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';

const sys = (refId) => ({ type: ITEM_TYPE.SYSTEM, ref_id: refId });

export const SEKTOR_TEMPLATE_KEYS = Object.freeze({
  ERARBEITUNG: 'erarbeitung',
  ERARBEITUNG_TRAINING: 'erarbeitung_training',
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
    case SEKTOR_TEMPLATE_KEYS.ERARBEITUNG_TRAINING:
      return {
        titel: 'Grundlagen und Training',
        modus: 'sequenziell',
        items: [
          sys('sys_platzhalter_info'),
          sys('sys_platzhalter_handlung'),
          sys('sys_platzhalter_moodle_buendel'),
          sys('sys_platzhalter_brian_buendel'),
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

/**
 * Optionen-Liste für das „+ Sektor hinzufügen"-Dropdown – pro Lerntyp.
 * Jede Option beschreibt nur Metadaten (Key + UI-Texte); die tatsächliche
 * Sektor-Struktur kommt weiterhin aus `getSektorTemplate(key)`.
 *
 * Pragmatiker: nur „Erarbeitungs- und Trainingsphase" + „Leerer Sektor".
 * Andere Lerntypen: Standard-Set (Erarbeitung, Zwischentest, Leer).
 */
export function getSektorTemplateOptionsForLerntyp(lerntyp) {
  if (lerntyp === 'pragmatiker' || lerntyp === 'ehrgeizig') {
    return [
      {
        key: SEKTOR_TEMPLATE_KEYS.ERARBEITUNG_TRAINING,
        label: 'Erarbeitungs- und Trainingsphase',
        hint: 'Einführung · ggf. Handlung · Lernpakete · Brian-Bündel',
        iconKey: 'erarbeitung_training',
      },
      {
        key: SEKTOR_TEMPLATE_KEYS.LEER,
        label: 'Leerer Sektor',
        hint: 'Ohne vordefinierte Platzhalter',
        iconKey: 'leer',
      },
    ];
  }

  return [
    {
      key: SEKTOR_TEMPLATE_KEYS.ERARBEITUNG,
      label: 'Erarbeitungsphase',
      hint: 'Einführung · ggf. Handlung · Lernpakete',
      iconKey: 'erarbeitung',
    },
    {
      key: SEKTOR_TEMPLATE_KEYS.ZWISCHENTEST,
      label: 'Zwischentest',
      hint: 'Einstiegsseite · Zwischentest-Platzhalter',
      iconKey: 'zwischentest',
    },
    {
      key: SEKTOR_TEMPLATE_KEYS.LEER,
      label: 'Leerer Sektor',
      hint: 'Ohne vordefinierte Platzhalter',
      iconKey: 'leer',
    },
  ];
}