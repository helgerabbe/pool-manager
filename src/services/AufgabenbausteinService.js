/**
 * AufgabenbausteinService.js
 *
 * Service-Layer für die Aufgabenbausteine-Entität.
 * Einzige Datei, die base44Client für Aufgabenbausteine importieren darf.
 * Bei einer Migration (z.B. zu Supabase) wird nur diese Datei angepasst.
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle Aufgabenbausteine laden (global, für Workspace-Baum).
 */
export async function getAllAufgabenbausteine() {
  return base44.entities.Aufgabenbausteine.list();
}

/**
 * Alle Aufgabenbausteine eines bestimmten Lernpakets laden.
 */
export async function getAufgabenbausteinByLernpaket(lernpaketId) {
  return base44.entities.Aufgabenbausteine.filter({ lernpaket_id: lernpaketId });
}

/**
 * Alle Klone einer MasterAufgabe laden, sortiert nach klon_index.
 */
export async function getKloneByMaster(masterAufgabeId) {
  const result = await base44.entities.Aufgabenbausteine.filter({ master_aufgabe_id: masterAufgabeId });
  return result.sort((a, b) => (a.klon_index || 0) - (b.klon_index || 0));
}

/**
 * Neuen Aufgabenbaustein anlegen.
 */
export async function createAufgabenbaustein(data) {
  return base44.entities.Aufgabenbausteine.create(data);
}

/**
 * Aufgabenbaustein aktualisieren.
 */
export async function updateAufgabenbaustein(id, data) {
  return base44.entities.Aufgabenbausteine.update(id, data);
}

/**
 * Aufgabenbaustein löschen.
 */
export async function deleteAufgabenbaustein(id) {
  return base44.entities.Aufgabenbausteine.delete(id);
}

/**
 * Reihenfolge mehrerer Aufgabenbausteine aktualisieren.
 * Erwartet ein Array von { id, klon_index }.
 * HINWEIS: Base44 hat keine bulkUpdate-API – wir parallelisieren die Einzelupdates.
 */
export async function reorderAufgabenbausteine(updates) {
  return Promise.all(
    updates.map(({ id, klon_index }) =>
      base44.entities.Aufgabenbausteine.update(id, { klon_index })
    )
  );
}