/**
 * onboardingSnapshots.js
 *
 * Helfer für die vier einheits-GLOBALEN Onboarding-Inhalte in der Single
 * Source of Truth (Entity SchuelerInhaltSnapshot, geltungsbereich='einheit').
 *
 * Onboarding gilt VOR der Dashboard-Wahl – daher kein Lerntyp und keine
 * instance_id. Eindeutigkeit pro (einheit_id, baustein_id). Die vier Elemente:
 *   onboarding_einfuehrung | onboarding_fragenblock |
 *   onboarding_einstiegsdiagnose | onboarding_lerntyp_diagnose
 *
 * Beide Speicherwege (Lehrer-Vorschau-Modals + Schüleransicht) nutzen diese
 * Funktionen, damit es genau EINEN Lese-/Schreibpfad gibt.
 */
import { base44 } from '@/api/base44Client';

// UI-Schlüssel (im Cockpit/Schüler-Quiz) → baustein_id in der SSOT-Tabelle.
export const ONBOARDING_BAUSTEIN_IDS = {
  einfuehrung: 'onboarding_einfuehrung',
  fragenblock: 'onboarding_fragenblock',
  einstiegsdiagnose: 'onboarding_einstiegsdiagnose',
  lerntyp_diagnose: 'onboarding_lerntyp_diagnose',
};

/**
 * Liest alle vier Onboarding-Snapshots einer Einheit und liefert sie als
 * Objekt im selben Shape wie das frühere `onboarding_konfiguration`:
 *   { einfuehrung, fragenblock, einstiegsdiagnose, lerntyp_diagnose }
 * Fehlende Elemente sind null.
 */
export async function ladeOnboardingSnapshots(einheitId) {
  const result = {
    einfuehrung: null,
    fragenblock: null,
    einstiegsdiagnose: null,
    lerntyp_diagnose: null,
  };
  if (!einheitId) return result;
  const list = await base44.entities.SchuelerInhaltSnapshot.filter({
    einheit_id: einheitId,
    geltungsbereich: 'einheit',
  });
  const byBaustein = new Map((list || []).map((s) => [s.baustein_id, s]));
  for (const [key, bausteinId] of Object.entries(ONBOARDING_BAUSTEIN_IDS)) {
    const snap = byBaustein.get(bausteinId);
    if (snap?.inhalt) result[key] = snap.inhalt;
  }
  return result;
}

/**
 * Upsert eines einzelnen Onboarding-Elements (überschreibt vorhandenen
 * Snapshot). `key` ist der UI-Schlüssel (einfuehrung | fragenblock | …).
 */
export async function speichereOnboardingSnapshot(einheitId, key, inhalt, generiertVon) {
  const bausteinId = ONBOARDING_BAUSTEIN_IDS[key];
  if (!einheitId || !bausteinId) throw new Error('Unbekanntes Onboarding-Element.');

  const vorhandene = await base44.entities.SchuelerInhaltSnapshot.filter({
    einheit_id: einheitId,
    geltungsbereich: 'einheit',
    baustein_id: bausteinId,
  });
  const existing = Array.isArray(vorhandene) ? vorhandene[0] : null;
  const payload = {
    einheit_id: einheitId,
    geltungsbereich: 'einheit',
    baustein_id: bausteinId,
    inhalt,
    generiert_am: new Date().toISOString(),
    generiert_von: generiertVon || 'lehrer_tool',
  };
  if (existing) {
    await base44.entities.SchuelerInhaltSnapshot.update(existing.id, payload);
  } else {
    await base44.entities.SchuelerInhaltSnapshot.create(payload);
  }
}