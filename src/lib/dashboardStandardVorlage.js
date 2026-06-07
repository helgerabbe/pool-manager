/**
 * dashboardStandardVorlage.js
 *
 * Brücke zwischen der admin-editierbaren DB-Vorlage
 * (`DashboardStandardVorlage`) und der hartkodierten Fallback-Vorlage
 * (`DASHBOARD_TEMPLATES` aus lib/dashboardTemplates.js).
 *
 * Architektur (siehe Konzept „Standard-Dashboards in der Verwaltung"):
 *   - Die Hartkodierung bleibt als Seed/Fallback bestehen — sie greift,
 *     wenn ein Lerntyp noch keinen DB-Datensatz hat.
 *   - Sobald ein Admin im Verwaltungs-Tab „Dashboards" eine Vorlage
 *     speichert, hat diese Vorrang.
 *   - WICHTIG: Vorlagen wirken NIE rückwirkend auf bestehende Einheiten.
 *     Sie werden nur beim Lazy-Init und beim manuellen
 *     „Auf Standard zurücksetzen" angewendet.
 *
 * Diese Datei enthält nur reine Helfer (kein React, kein SDK), damit sie
 * sowohl im Frontend als auch in Tests genutzt werden kann.
 */

import { DASHBOARD_TEMPLATES, TEMPLATE_LERN_TYPEN } from '@/lib/dashboardTemplates';

/**
 * Baut aus einer Liste von DashboardStandardVorlage-Records ein
 * Templates-Objekt im Format von DASHBOARD_TEMPLATES
 * ({ minimalist: [...], pragmatiker: [...], ... }).
 *
 * Fehlt für einen Lerntyp ein DB-Datensatz (oder ist dessen `sektoren`-Array
 * leer), wird der hartkodierte Fallback für diesen Lerntyp genutzt.
 *
 * @param {Array} vorlagenRecords - DashboardStandardVorlage-Records aus der DB.
 * @returns {{minimalist:Array, pragmatiker:Array, ehrgeizig:Array, passioniert:Array}}
 */
export function buildEffectiveTemplates(vorlagenRecords) {
  const byLerntyp = new Map();
  (Array.isArray(vorlagenRecords) ? vorlagenRecords : []).forEach((rec) => {
    if (rec?.lerntyp) byLerntyp.set(rec.lerntyp, rec);
  });

  const result = {};
  for (const lerntyp of TEMPLATE_LERN_TYPEN) {
    const rec = byLerntyp.get(lerntyp);
    const dbSektoren = Array.isArray(rec?.sektoren) ? rec.sektoren : null;
    result[lerntyp] =
      dbSektoren && dbSektoren.length > 0
        ? dbSektoren
        : DASHBOARD_TEMPLATES[lerntyp] || [];
  }
  return result;
}

/**
 * Liefert das effektive Template für EINEN Lerntyp (DB-Vorlage > Hardcode).
 */
export function getEffectiveTemplateForLerntyp(vorlagenRecords, lerntyp) {
  return buildEffectiveTemplates(vorlagenRecords)[lerntyp] || [];
}