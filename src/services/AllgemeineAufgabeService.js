/**
 * AllgemeineAufgabeService.js
 *
 * Service-Layer für AllgemeineAufgabe und die zugehörige Mapping-Tabelle
 * AllgemeineAufgabeLernzielMapping.
 * Einzige Datei, die base44Client für diese Entitäten importieren darf.
 *
 * MIGRATIONSHINWEIS:
 * - `getAufgabenByEinheit(id)` → supabase.from('allgemeine_aufgaben').select('*').eq('einheit_id', id)
 * - `createAllgemeineAufgabe(data)` → supabase.from('allgemeine_aufgaben').insert(data).select().single()
 * - `updateAllgemeineAufgabe(id, data)` → supabase.from('allgemeine_aufgaben').update(data).eq('id', id)
 * - `deleteAllgemeineAufgabe(id)` → supabase.from('allgemeine_aufgaben').delete().eq('id', id)
 * - `getMappingsByAufgabe(id)` → supabase.from('aufgabe_lernziel_mapping').select('*').eq('aufgabe_id', id)
 * - `createMapping(aufgabeId, lernzielId)` → supabase.from(...).insert({aufgabe_id, lernziel_id})
 * - `deleteMapping(id)` → supabase.from('aufgabe_lernziel_mapping').delete().eq('id', id)
 *
 * SUPABASE-TRANSAKTION:
 * - `createAufgabeMitMappings` kann in Supabase als atomare Transaktion über
 *   eine RPC-Funktion (PostgreSQL-Procedure) implementiert werden:
 *   supabase.rpc('create_aufgabe_mit_mappings', { aufgabe_data, lernziel_ids })
 */

import { base44 } from '@/api/base44Client';

// ── AllgemeineAufgabe ──────────────────────────────────────────────────────────

/**
 * Alle Aufgaben einer Einheit laden.
 */
export async function getAufgabenByEinheit(einheitId) {
  return base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId });
}

/**
 * Neue Aufgabe anlegen.
 */
export async function createAllgemeineAufgabe(data) {
  return base44.entities.AllgemeineAufgabe.create(data);
}

/**
 * Aufgabe aktualisieren.
 */
export async function updateAllgemeineAufgabe(id, data) {
  return base44.entities.AllgemeineAufgabe.update(id, data);
}

/**
 * Aufgabe löschen.
 */
export async function deleteAllgemeineAufgabe(id) {
  return base44.entities.AllgemeineAufgabe.delete(id);
}

// ── AllgemeineAufgabeLernzielMapping ──────────────────────────────────────────

/**
 * Alle Lernziel-Mappings einer Aufgabe laden.
 */
export async function getMappingsByAufgabe(aufgabeId) {
  return base44.entities.AllgemeineAufgabeLernzielMapping.filter({ aufgabe_id: aufgabeId });
}

/**
 * Mapping zwischen Aufgabe und Lernziel anlegen.
 */
export async function createMapping(aufgabeId, lernzielId, reihenfolge = null) {
  return base44.entities.AllgemeineAufgabeLernzielMapping.create({
    aufgabe_id: aufgabeId,
    lernziel_id: lernzielId,
    ...(reihenfolge !== null && { reihenfolge }),
  });
}

/**
 * Mapping löschen.
 */
export async function deleteMapping(mappingId) {
  return base44.entities.AllgemeineAufgabeLernzielMapping.delete(mappingId);
}

// ── Komposit-Operationen (Supabase-Transaktions-Kandidaten) ───────────────────

/**
 * Aufgabe anlegen UND gleichzeitig Lernziele verknüpfen.
 * SUPABASE-HINWEIS: Diese Funktion ist ein expliziter Vorbereitungskandidat
 * für eine atomare PostgreSQL-RPC-Transaktion.
 *
 * @param {object} aufgabeData - Felder für AllgemeineAufgabe
 * @param {string[]} lernzielIds - IDs der zu verknüpfenden Lernziele
 */
// ── AllgemeineAufgabeBasisLernzielMapping ────────────────────────────────────

/**
 * Basis-Lernziel-Mappings einer Aufgabe laden.
 */
export async function getBasisMappingsByAufgabe(aufgabeId) {
  return base44.entities.AllgemeineAufgabeBasisLernzielMapping.filter({ aufgabe_id: aufgabeId });
}

/**
 * Basis-Lernziel-Mapping anlegen.
 */
export async function createBasisMapping(aufgabeId, basisLernzielId) {
  return base44.entities.AllgemeineAufgabeBasisLernzielMapping.create({
    aufgabe_id: aufgabeId,
    basislernziel_id: basisLernzielId,
  });
}

/**
 * Basis-Lernziel-Mapping löschen.
 */
export async function deleteBasisMapping(mappingId) {
  return base44.entities.AllgemeineAufgabeBasisLernzielMapping.delete(mappingId);
}

// ── Komposit-Operationen (Supabase-Transaktions-Kandidaten) ───────────────────

/**
 * Aufgabe anlegen UND gleichzeitig Lernziele verknüpfen.
 * SUPABASE-HINWEIS: Diese Funktion ist ein expliziter Vorbereitungskandidat
 * für eine atomare PostgreSQL-RPC-Transaktion.
 *
 * @param {object} aufgabeData - Felder für AllgemeineAufgabe
 * @param {string[]} lernzielIds - IDs der zu verknüpfenden Lernziele
 */
export async function createAufgabeMitMappings(aufgabeData, lernzielIds = []) {
  const aufgabe = await createAllgemeineAufgabe(aufgabeData);
  if (lernzielIds.length > 0) {
    await Promise.all(
      lernzielIds.map((lzId, idx) => createMapping(aufgabe.id, lzId, idx + 1))
    );
  }
  return aufgabe;
}

/**
 * Aufgabe freigeben (approve).
 * Setzt NUR content_status = 'approved' — sync_status wird NICHT verändert.
 * Die Sync-Status-Verwaltung obliegt ausschließlich dem Export-Cockpit.
 */
export async function approveAufgabe(id) {
  return base44.entities.AllgemeineAufgabe.update(id, { content_status: 'approved' });
}

/**
 * Freigabe einer Aufgabe aufheben.
 * Setzt content_status zurück auf 'draft'.
 */
export async function unapproveAufgabe(id) {
  return base44.entities.AllgemeineAufgabe.update(id, { content_status: 'draft' });
}

// ── Bearbeitungssperre (Locking) ──────────────────────────────────────────────

/**
 * Sperre setzen. Schlägt fehl, wenn bereits von einem anderen Nutzer gesperrt.
 * Auto-Timeout: Sperren älter als 60 Min werden ignoriert.
 */
export async function lockTask(taskId, userEmail) {
  const TIMEOUT_MS = 60 * 60 * 1000;
  const current = await base44.entities.AllgemeineAufgabe.filter({ id: taskId });
  const aufgabe = current[0];
  if (aufgabe?.locked_by && aufgabe.locked_by !== userEmail) {
    const age = Date.now() - new Date(aufgabe.locked_at || 0).getTime();
    if (age < TIMEOUT_MS) {
      throw new Error(`Wird gerade von ${aufgabe.locked_by} bearbeitet.`);
    }
  }
  return base44.entities.AllgemeineAufgabe.update(taskId, {
    locked_by: userEmail,
    locked_at: new Date().toISOString(),
  });
}

/**
 * Sperre aufheben.
 */
export async function unlockTask(taskId) {
  return base44.entities.AllgemeineAufgabe.update(taskId, {
    locked_by: null,
    locked_at: null,
  });
}