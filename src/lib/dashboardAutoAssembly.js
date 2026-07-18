/**
 * dashboardAutoAssembly.js
 *
 * Auto-Assembly (Etappe 1, 2026-07-18): Dashboards werden nicht mehr manuell
 * „zusammengepuzzelt", sondern automatisch aus der Einheiten-Struktur
 * (Themenfelder, Lernpakete, Aufgaben, Projekte) + der Standardvorlage pro
 * Lerntyp abgeleitet:
 *   1. applyDashboardTemplate klont Arbeitsphase-Sektoren pro Themenfeld.
 *   2. fillAllBundles befüllt alle Bündel (Lernpakete-/Aufgaben-/Projekt-
 *      Bündel) mit den passenden Inhalten der Einheit
 *      (Regeln: getAutoFillCandidates in lernpfadeUtils — Lernpakete und
 *      Aufgaben nach themenfeld_id des Sektors, Projekte themenfeld-frei).
 *
 * Status-Modell (Einheiten.dashboards_auto_status[lerntyp]):
 *   - 'auto'       = automatisch erstellt, noch nicht bestätigt.
 *   - 'bestaetigt' = von der Fachschaftsleitung übernommen/bestätigt
 *                    (explizit per „Übernehmen" oder implizit über
 *                    „Dashboard als geprüft markieren").
 *   - fehlend      = Bestand / manuell gebaut.
 *
 * Reine Helfer (kein React, kein SDK) — nutzbar in Frontend und Tests.
 */

import {
  applyDashboardTemplate,
  getUsedAufgabenIds,
  getAutoFillCandidates,
  bulkAddItemsToBundle,
} from '@/lib/lernpfadeUtils';
import { getBundleKindByAcceptedTypes } from '@/lib/sektorTypen';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';
import { TEMPLATE_LERN_TYPEN } from '@/lib/dashboardTemplates';

export const AUTO_DASHBOARD_STATUS = Object.freeze({
  AUTO: 'auto',
  BESTAETIGT: 'bestaetigt',
});

/**
 * Befüllt ALLE Bündel eines Lerntyps mit den passenden Inhalten der Einheit.
 * Additiv und idempotent: bereits platzierte Aufgaben werden nie doppelt
 * eingefügt (Anti-Duplikat über getUsedAufgabenIds/bulkAddItemsToBundle).
 *
 * @param {object} konfig  lernpfade_konfiguration
 * @param {string} lerntyp
 * @param {object} ctx     { aufgaben, lernpakete, systemBausteineById }
 * @returns {object} neue Konfiguration (immutable)
 */
export function fillAllBundles(konfig, lerntyp, ctx) {
  const { aufgaben = [], lernpakete = [], systemBausteineById } = ctx || {};
  let next = konfig || {};
  const sektoren = Array.isArray(next?.[lerntyp]) ? next[lerntyp] : [];

  for (const sektor of sektoren) {
    const items = Array.isArray(sektor?.items) ? sektor.items : [];
    for (const item of items) {
      if (!item || item.type !== ITEM_TYPE.SYSTEM || !item.instance_id) continue;
      const baustein = systemBausteineById?.get?.(item.ref_id);
      const isBundle =
        baustein?.typ === 'buendel' || baustein?.baustein_modus === 'bundle_1ton';
      if (!isBundle) continue;

      const bundleKind = getBundleKindByAcceptedTypes(baustein?.accepted_types);
      if (!bundleKind) continue;

      const candidates = getAutoFillCandidates({
        bundleKind,
        themenfeldId: sektor.themenfeld_id || null,
        aufgaben,
        lernpakete,
        usedAufgabenIds: getUsedAufgabenIds(next, lerntyp),
      });
      if (candidates.length === 0) continue;

      const result = bulkAddItemsToBundle(
        next,
        lerntyp,
        sektor.sektor_id,
        item.instance_id,
        candidates
      );
      next = result.konfig;
    }
  }
  return next;
}

/**
 * Baut das Dashboard EINES Lerntyps komplett automatisch auf:
 * Vorlage anwenden (Arbeitsphase pro Themenfeld geklont) + Bündel befüllen.
 */
export function autoAssembleLerntyp(konfig, lerntyp, template, themenfelder, ctx) {
  const applied = applyDashboardTemplate(konfig || {}, lerntyp, template, themenfelder);
  return fillAllBundles(applied, lerntyp, ctx);
}

/**
 * Baut ALLE vier Lerntyp-Dashboards automatisch auf (Lazy-Init-Pfad).
 *
 * @param {object} args
 * @param {object} args.templates            Effektive Templates pro Lerntyp
 *                                           (buildEffectiveTemplates).
 * @param {Array}  args.themenfelder         Themenfelder der Einheit.
 * @param {Array}  args.aufgaben             AllgemeineAufgabe-Records.
 * @param {Array}  args.lernpakete           Lernpakete-Records.
 * @param {Map}    args.systemBausteineById  Map<baustein_id, SystemBaustein>.
 * @returns {object} Komplette lernpfade_konfiguration.
 */
export function autoAssembleAllDashboards({
  templates,
  themenfelder,
  aufgaben,
  lernpakete,
  systemBausteineById,
}) {
  const ctx = { aufgaben, lernpakete, systemBausteineById };
  let next = {};
  for (const lerntyp of TEMPLATE_LERN_TYPEN) {
    if (!Array.isArray(templates?.[lerntyp])) continue;
    next = autoAssembleLerntyp(next, lerntyp, templates[lerntyp], themenfelder, ctx);
  }
  return next;
}