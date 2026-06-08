/**
 * sektorTemplates.js
 *
 * Single Source of Truth für die inhaltlichen Sektor-Vorlagen, die vom
 * Lernpfad-Cockpit beim Anlegen eines Sektors mit fest definiertem Typ
 * (z. B. Zwischentest) verwendet werden.
 *
 * ── Cleanup-Hinweis (Phase E) ──────────────────────────────────────────
 * Das alte „pro-Lerntyp dynamische Dropdown" (`getSektorTemplateOptions...`)
 * ist durch das neue, statische Drei-Optionen-Menü im LernpfadeArchitekt
 * ersetzt worden. Die UI bietet jetzt:
 *   • Arbeitsphase Themenfeld   → kein Template, Modal-Flow
 *   • Zwischentest              → nutzt SEKTOR_TEMPLATES.zwischentest hier
 *   • Leerer Sektor             → kein Template
 * Die zusätzlichen, lerntyp-spezifischen Erarbeitungs-Templates wurden
 * entfernt; sie wurden durch das neue Phase-B-Modell überflüssig.
 *
 * Hinweis: Die hier erzeugten Sektoren sind UNNORMALISIERT (statische
 * Demo-Daten). Sie laufen anschließend durch `addSektor`/`createNewSektor`
 * in `lernpfadeUtils`, was die finale `sektor_id`-UUID setzt.
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';

const sys = (refId) => ({ type: ITEM_TYPE.SYSTEM, ref_id: refId });

export const SEKTOR_TEMPLATE_KEYS = Object.freeze({
  ZWISCHENTEST: 'zwischentest',
  LEER: 'leer',
});

/**
 * Inhaltliche Vorlagen, die das Cockpit beim Anlegen eines getypten
 * Sektors (z. B. Zwischentest) als Startbestückung verwendet.
 */
export const SEKTOR_TEMPLATES = Object.freeze({
  [SEKTOR_TEMPLATE_KEYS.ZWISCHENTEST]: {
    titel: 'Zwischentest',
    modus: 'sequenziell',
    items: [
      sys('sys_themenfeld_intro'),
    ],
  },
});

/**
 * Liefert die Bausteine eines Sektor-Templates. `createNewSektor` setzt
 * danach die UUID, den Default-Titel kann der Aufrufer überschreiben.
 * Fällt für unbekannte Keys auf einen leeren Sektor zurück.
 */
export function getSektorTemplate(key) {
  return (
    SEKTOR_TEMPLATES[key] || {
      titel: 'Neuer Sektor',
      modus: 'sequenziell',
      items: [],
    }
  );
}