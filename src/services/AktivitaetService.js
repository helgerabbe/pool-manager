/**
 * AktivitaetService.js
 *
 * Service-Layer für LernpaketPhaseAktivitaet und AktivitaetenKatalog.
 * Einzige Datei, die base44Client für Aktivitäten importieren darf.
 * Bei einer Migration (z.B. zu Supabase) wird nur diese Datei angepasst.
 */

import { base44 } from '@/api/base44Client';

// ── AktivitaetenKatalog (globale Referenzdaten) ───────────────────────────────

/**
 * Alle Aktivitäten aus dem Katalog laden (Referenzdaten / selten geändert).
 */
export async function getAktivitaetenKatalog() {
  return base44.entities.AktivitaetenKatalog.list();
}

// ── LernpaketPhaseAktivitaet (Instanzen pro Lernpaket) ───────────────────────

/**
 * Alle Phasen-Aktivitäten laden (global, für Workspace-Baum).
 */
export async function getAllLernpaketAktivitaeten() {
  return base44.entities.LernpaketPhaseAktivitaet.list();
}

/**
 * Alle Phasen-Aktivitäten eines bestimmten Lernpakets laden,
 * sortiert nach reihenfolge.
 */
export async function getAktivitaetenByLernpaket(lernpaketId) {
  const result = await base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lernpaketId });
  return result.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
}

/**
 * Neue Phasen-Aktivität anlegen.
 */
export async function createAktivitaet(data) {
  return base44.entities.LernpaketPhaseAktivitaet.create(data);
}

/**
 * Phasen-Aktivität aktualisieren (z.B. field_values, is_complete, content_status).
 */
export async function updateAktivitaet(id, data) {
  return base44.entities.LernpaketPhaseAktivitaet.update(id, data);
}

/**
 * Phasen-Aktivität löschen.
 */
export async function deleteAktivitaet(id) {
  return base44.entities.LernpaketPhaseAktivitaet.delete(id);
}

/**
 * Reihenfolge mehrerer Aktivitäten in einem Lernpaket aktualisieren.
 * Erwartet ein Array von { id, reihenfolge }.
 * HINWEIS: Base44 hat keine bulkUpdate-API – wir parallelisieren die Einzelupdates.
 */
export async function reorderAktivitaeten(updates) {
  return Promise.all(
    updates.map(({ id, reihenfolge }) =>
      base44.entities.LernpaketPhaseAktivitaet.update(id, { reihenfolge })
    )
  );
}