/**
 * cleanupDuplicateUnits.js
 *
 * Löscht leere Duplicate Units und behält die mit Inhalten.
 * Admin-only Funktion.
 *
 * Architektur:
 *   1) Two-Pass: Erst ALLE Units validieren, dann löschen.
 *      Dadurch gibt es keine Teil-Löschung, wenn eine spätere Unit doch Inhalte hat.
 *   2) Vor dem Löschen der Einheit werden administrative Kinddaten entfernt,
 *      damit keine verwaisten Zombie-Records entstehen.
 *
 * @MIGRATION_NOTE Supabase:
 *   In Supabase sollten administrative Kindtabellen wie EinheitMembers und
 *   ExportPrompts per Foreign Key mit ON DELETE CASCADE an Einheiten hängen.
 *   PostgreSQL räumt diese Records dann atomar beim Löschen der Einheit mit auf.
 *   Der Schutz vor dem Löschen voller Einheiten sollte als BEFORE DELETE Trigger
 *   umgesetzt werden, der den Delete abbricht, sobald abhängige Lernpakete,
 *   Themenfelder oder Aufgaben existieren.
 */

async function findBlockingContent(base44, unitId) {
  const [lernpakete, themenfelder, aufgaben] = await Promise.all([
    base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: unitId }),
    base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: unitId }),
    base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id: unitId }),
  ]);

  return {
    unitId,
    lernpakete: lernpakete.length,
    themenfelder: themenfelder.length,
    aufgaben: aufgaben.length,
  };
}

async function deleteRecords(entity, records) {
  await Promise.all(records.map((record) => entity.delete(record.id)));
  return records.length;
}

async function deleteUnitWithMetadata(base44, unitId) {
  const [members, exportPrompts, auditLogs] = await Promise.all([
    base44.asServiceRole.entities.EinheitMembers.filter({ einheit_id: unitId }),
    base44.asServiceRole.entities.ExportPrompts.filter({ einheit_id: unitId }),
    base44.asServiceRole.entities.AuditLog.filter({ resource_type: 'Einheiten', resource_id: unitId }),
  ]);

  const [deletedMembers, deletedExportPrompts, deletedAuditLogs] = await Promise.all([
    deleteRecords(base44.asServiceRole.entities.EinheitMembers, members),
    deleteRecords(base44.asServiceRole.entities.ExportPrompts, exportPrompts),
    deleteRecords(base44.asServiceRole.entities.AuditLog, auditLogs),
  ]);

  await base44.asServiceRole.entities.Einheiten.delete(unitId);

  return {
    unitId,
    deletedMembers,
    deletedExportPrompts,
    deletedAuditLogs,
  };
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const payload = await req.json();
    const { unitIdsToDelete } = payload; // Array von Unit-IDs

    if (!Array.isArray(unitIdsToDelete) || unitIdsToDelete.length === 0) {
      return Response.json({ error: 'unitIdsToDelete must be a non-empty array' }, { status: 400 });
    }

    // Phase 1: Alle Units validieren, bevor irgendetwas gelöscht wird.
    const validationResults = await Promise.all(
      unitIdsToDelete.map((unitId) => findBlockingContent(base44, unitId))
    );

    const blockedUnits = validationResults.filter(
      (result) => result.lernpakete + result.themenfelder + result.aufgaben > 0
    );

    if (blockedUnits.length > 0) {
      return Response.json({
        error: 'Mindestens eine Unit hat noch Inhalte. Es wurde nichts gelöscht.',
        blockedUnits,
      }, { status: 400 });
    }

    // Phase 2: Erst administrative Anhängsel, dann die leeren Units löschen.
    const cleanupResults = await Promise.all(
      unitIdsToDelete.map((unitId) => deleteUnitWithMetadata(base44, unitId))
    );
    const deleted = cleanupResults.map((result) => result.unitId);

    return Response.json({
      success: true,
      deleted,
      count: deleted.length,
      cleanupResults,
    });
  } catch (error) {
    console.error('[CLEANUP_DUPLICATE_ERROR]', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});