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
 * Aufgabe aktualisieren mit Re-Export-Trigger.
 * 
 * CRITICAL: Falls die Aufgabe bereits vollständig exportiert ist (moodle_sync_status === 'synced' UND brian_sync_status === 'synced'),
 * werden beide Sync-Stati auf 'modified' zurückgesetzt, damit das Export-Team sieht, dass eine neue Version vorliegt.
 * 
 * @param {string} id - Aufgaben-ID
 * @param {object} data - Update-Daten
 * @returns {Promise} Updated task
 */
export async function updateAllgemeineAufgabe(id, data) {
  // Aktuelle Aufgabe laden
  const current = await base44.entities.AllgemeineAufgabe.filter({ id });
  const aufgabe = current[0];

  if (!aufgabe) {
    throw new Error(`Aufgabe ${id} nicht gefunden`);
  }

  // Prüfung: Ist die Aufgabe vollständig exportiert?
  const moodleSynced = aufgabe.moodle_sync_status === 'synced' || aufgabe.sync_status === 'synced';
  const brianSynced = aufgabe.brian_sync_status === 'synced';

  if ((moodleSynced || brianSynced) && Object.keys(data).length > 0) {
    // Beide oder eine sind synced → Reset beide auf 'modified'
    data.moodle_sync_status = 'modified';
    data.brian_sync_status = 'modified';
  }

  return base44.entities.AllgemeineAufgabe.update(id, data);
}

/**
 * Aufgabe löschen + Anti-Drift-Cleanup (Etappe 4).
 *
 * Nach dem Delete werden alle Verweise auf die soeben gelöschte Aufgabe aus
 * der `lernpfade_konfiguration` der Einheit entfernt (Items mit
 * ref_id===id, egal ob Root- oder Bündel-Children). Zusätzlich werden
 * passende `LernpfadAufgabeMembership`-Einträge aufgeräumt, damit kein
 * pfad_status='locked_for_export' für ein nicht mehr existierendes Item
 * stehen bleibt.
 *
 * Sektoren bleiben stehen — die invalidieren sich durch ein Aufgaben-Delete
 * nicht. Cleanup-Fehler brechen die Operation nicht ab; das Delete selbst
 * ist die Hauptaktion.
 */
export async function deleteAllgemeineAufgabe(id) {
  // Einheit-ID vor dem Delete merken (sonst nicht mehr abrufbar).
  let einheitId = null;
  try {
    const aufgabe = await base44.entities.AllgemeineAufgabe.get(id);
    einheitId = aufgabe?.einheit_id || null;
  } catch {
    // Aufgabe nicht ladbar → Delete trotzdem versuchen, Cleanup entfällt.
  }

  const result = await base44.entities.AllgemeineAufgabe.delete(id);

  if (einheitId) {
    // Dashboard-Cleanup: Items mit ref_id === id aus allen 4 Lerntypen entfernen.
    try {
      const einheit = await base44.entities.Einheiten.get(einheitId);
      const konfig = einheit?.lernpfade_konfiguration || null;
      if (konfig && typeof konfig === 'object') {
        let changed = false;
        const next = {};
        for (const lt of ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert']) {
          const sektoren = Array.isArray(konfig[lt]) ? konfig[lt] : [];
          next[lt] = sektoren.map((s) => {
            const items = Array.isArray(s?.items) ? s.items : [];
            const filtered = items.filter(
              (it) => !(it?.type === 'aufgabe' && it.ref_id === id)
            );
            if (filtered.length !== items.length) {
              changed = true;
              return { ...s, items: filtered };
            }
            return s;
          });
        }
        if (changed) {
          await base44.entities.Einheiten.update(einheitId, {
            lernpfade_konfiguration: next,
          });
        }
      }
    } catch (err) {
      console.warn('[deleteAllgemeineAufgabe] Dashboard-Cleanup fehlgeschlagen:', err?.message);
    }

    // Junction-Cleanup: alle Memberships zu dieser Aufgabe entfernen.
    try {
      const memberships = await base44.entities.LernpfadAufgabeMembership.filter({
        einheit_id: einheitId,
        aufgabe_id: id,
      });
      if (memberships.length > 0) {
        await Promise.allSettled(
          memberships.map((m) => base44.entities.LernpfadAufgabeMembership.delete(m.id))
        );
      }
    } catch (err) {
      console.warn('[deleteAllgemeineAufgabe] Membership-Cleanup fehlgeschlagen:', err?.message);
    }
  }

  return result;
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

// ── KI-Aufgaben-Assistent ─────────────────────────────────────────────────────

/**
 * KI-Vorschlag für eine Aufgabe generieren.
 */
export async function generateTaskIdea(idee, task_type = 'Allgemeine Aufgabe') {
  const response = await base44.functions.invoke('generateTaskProposal', { idee, task_type });
  return response.data;
}

// ── Bearbeitungssperre (Locking) ──────────────────────────────────────────────

/**
 * Sperre setzen mit RBAC-Prüfung.
 * Schlägt fehl, wenn bereits von einem anderen Nutzer gesperrt oder kein Zugriff.
 */
export async function lockTask(taskId, userEmail) {
  const response = await base44.functions.invoke('lockTaskSecure', { taskId });
  return response.data;
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