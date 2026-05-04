/**
 * dashboardDriftDetector.js
 *
 * Single Source of Truth für die Erkennung von „Drift" zwischen den
 * Strukturdaten einer Einheit (Themenfelder, Lernpakete, Aufgaben) und
 * der `lernpfade_konfiguration` der vier Lerntyp-Dashboards.
 *
 * Hintergrund:
 *   Die Lehrkraft baut die 4 Dashboards manuell auf (Sektoren + Items).
 *   Wenn anschließend Themenfelder, Lernpakete oder Aufgaben angelegt /
 *   gelöscht werden, entstehen Inkonsistenzen, die das System nicht
 *   automatisch heilen darf (sonst gehen didaktische Entscheidungen
 *   verloren). Stattdessen liefern wir eine reine Diagnose-API, die das
 *   UI als „Drift-Banner" über dem Architekt anzeigt.
 *
 * Vier Drift-Klassen pro Lerntyp:
 *   A) missing_themenfelder   – Themenfeld existiert in DB, aber kein
 *                                Arbeitsphase-Sektor referenziert es.
 *   B) orphaned_sektoren      – Sektor referenziert eine themenfeld_id,
 *                                die nicht (mehr) in der DB existiert.
 *   C) ghost_items            – Item zeigt auf eine ref_id (Aufgabe oder
 *                                Lernpaket), die nicht (mehr) existiert.
 *   D) misplaced_aufgaben     – Aufgabe sitzt in einem Arbeitsphase-Sektor,
 *                                gehört aber laut aktueller DB zu einem
 *                                anderen Themenfeld.
 *
 * Wichtig:
 *   - Diese Datei führt KEINE Mutationen aus. Sie ist purely funktional.
 *   - System-Bausteine werden bei Ghost-Item-Detection NICHT geprüft —
 *     ihre ref_ids leben in der SystemBausteine-Entity, nicht hier.
 *   - Items in Bündeln werden gleich behandelt wie Root-Items
 *     (parent_instance_id ist für die Drift-Prüfung irrelevant).
 *
 * Typen (rein zur Lesbarkeit, kein TS):
 *   DriftReport[lerntyp] = {
 *     missing_themenfelder: { id, titel }[],
 *     orphaned_sektoren:    { sektor_id, titel, themenfeld_id }[],
 *     ghost_items:          { sektor_id, sektor_titel, instance_id, ref_id, ref_type }[],
 *     misplaced_aufgaben:   { sektor_id, sektor_titel, instance_id, ref_id,
 *                              current_themenfeld_id, expected_themenfeld_id,
 *                              expected_themenfeld_titel }[],
 *     totalDrifts:          number,
 *   }
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';
import { SEKTOR_TYP } from '@/lib/sektorTypen';

const LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

function emptyLerntypReport() {
  return {
    missing_themenfelder: [],
    orphaned_sektoren: [],
    ghost_items: [],
    misplaced_aufgaben: [],
    totalDrifts: 0,
  };
}

function emptyReport() {
  const r = {};
  for (const lt of LERNTYPEN) r[lt] = emptyLerntypReport();
  r.totalDrifts = 0;
  return r;
}

/**
 * Berechnet alle Drifts einer Einheit.
 *
 * @param {object} args
 * @param {object} args.konfiguration  – lernpfade_konfiguration der Einheit.
 * @param {Array}  args.themenfelder   – Themenfelder der Einheit.
 * @param {Array}  args.aufgaben       – AllgemeineAufgabe der Einheit.
 * @param {Array}  args.lernpakete     – Lernpakete der Einheit (über Themenfelder).
 * @returns {object} DriftReport (siehe Datei-Header).
 */
export function detectDashboardDrift({
  konfiguration,
  themenfelder = [],
  aufgaben = [],
  lernpakete = [],
} = {}) {
  const report = emptyReport();
  if (!konfiguration || typeof konfiguration !== 'object') return report;

  // Lookup-Maps für O(1)-Zugriffe.
  const themenfeldById = new Map();
  for (const tf of themenfelder || []) {
    if (tf?.id) themenfeldById.set(tf.id, tf);
  }
  const aufgabeById = new Map();
  for (const a of aufgaben || []) {
    if (a?.id) aufgabeById.set(a.id, a);
  }
  const lernpaketById = new Map();
  for (const lp of lernpakete || []) {
    if (lp?.id) lernpaketById.set(lp.id, lp);
  }

  let total = 0;

  for (const lt of LERNTYPEN) {
    const sektoren = Array.isArray(konfiguration[lt]) ? konfiguration[lt] : [];
    const lerntypReport = report[lt];

    // ── A) missing_themenfelder ────────────────────────────────────────
    // Welche Themenfelder sind in den Arbeitsphase-Sektoren bereits
    // referenziert?
    const usedThemenfeldIds = new Set();
    for (const s of sektoren) {
      if (s?.sektor_typ === SEKTOR_TYP.ARBEITSPHASE && s?.themenfeld_id) {
        usedThemenfeldIds.add(s.themenfeld_id);
      }
    }
    for (const tf of themenfelder || []) {
      if (!tf?.id) continue;
      if (!usedThemenfeldIds.has(tf.id)) {
        lerntypReport.missing_themenfelder.push({ id: tf.id, titel: tf.titel || '(unbenannt)' });
      }
    }

    // ── B) orphaned_sektoren ───────────────────────────────────────────
    for (const s of sektoren) {
      if (s?.sektor_typ !== SEKTOR_TYP.ARBEITSPHASE) continue;
      if (!s.themenfeld_id) continue; // Arbeitsphase ohne TF-Bindung gibt's nicht im Soll-Modell, aber wir ignorieren defensiv.
      if (!themenfeldById.has(s.themenfeld_id)) {
        lerntypReport.orphaned_sektoren.push({
          sektor_id: s.sektor_id,
          titel: s.titel_snapshot || s.titel || '(unbenannt)',
          themenfeld_id: s.themenfeld_id,
        });
      }
    }

    // ── C) ghost_items + D) misplaced_aufgaben ──────────────────────────
    for (const s of sektoren) {
      const items = Array.isArray(s?.items) ? s.items : [];
      for (const it of items) {
        if (!it || it.type !== ITEM_TYPE.AUFGABE || !it.ref_id) continue;

        // Ist die ref_id eine bekannte Aufgabe?
        const aufgabe = aufgabeById.get(it.ref_id);
        if (aufgabe) {
          // D) Sitzt die Aufgabe im richtigen Arbeitsphase-Sektor?
          if (s?.sektor_typ === SEKTOR_TYP.ARBEITSPHASE && s.themenfeld_id) {
            const expectedTfId = aufgabe.themenfeld_id || null;
            if (expectedTfId && expectedTfId !== s.themenfeld_id) {
              const expectedTf = themenfeldById.get(expectedTfId);
              lerntypReport.misplaced_aufgaben.push({
                sektor_id: s.sektor_id,
                sektor_titel: s.titel_snapshot || s.titel || '(unbenannt)',
                instance_id: it.instance_id || null,
                ref_id: it.ref_id,
                current_themenfeld_id: s.themenfeld_id,
                expected_themenfeld_id: expectedTfId,
                expected_themenfeld_titel: expectedTf?.titel || '(unbekannt)',
              });
            }
          }
          continue;
        }

        // Nicht als Aufgabe gefunden → vielleicht ein Lernpaket?
        if (lernpaketById.has(it.ref_id)) {
          continue; // Lernpakete sind valide Aufgaben-Items (siehe lernpaketAdapter).
        }

        // C) Weder Aufgabe noch Lernpaket → Ghost.
        lerntypReport.ghost_items.push({
          sektor_id: s.sektor_id,
          sektor_titel: s.titel_snapshot || s.titel || '(unbenannt)',
          instance_id: it.instance_id || null,
          ref_id: it.ref_id,
          ref_type: 'unknown',
        });
      }
    }

    lerntypReport.totalDrifts =
      lerntypReport.missing_themenfelder.length +
      lerntypReport.orphaned_sektoren.length +
      lerntypReport.ghost_items.length +
      lerntypReport.misplaced_aufgaben.length;
    total += lerntypReport.totalDrifts;
  }

  report.totalDrifts = total;
  return report;
}

/**
 * Convenience-Helper: liefert den Drift-Report für einen einzelnen Lerntyp.
 */
export function getDriftForLerntyp(report, lerntyp) {
  if (!report || !lerntyp) return emptyLerntypReport();
  return report[lerntyp] || emptyLerntypReport();
}

export const DRIFT_LERNTYPEN = LERNTYPEN;