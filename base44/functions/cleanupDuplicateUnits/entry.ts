/**
 * cleanupDuplicateUnits.js
 *
 * Löscht leere Duplicate Units und behält die mit Inhalten
 * Admin-only Funktion
 */

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

    // Lösche alle angegeben Units
    const deleted = [];
    for (const unitId of unitIdsToDelete) {
      // Prüfe erst: Sind alle Inhalte leer?
      const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: unitId });
      const themenfelder = await base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: unitId });
      const aufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id: unitId });

      if (lernpakete.length + themenfelder.length + aufgaben.length > 0) {
        return Response.json({
          error: `Unit ${unitId} hat noch Inhalte! Nicht gelöscht.`,
        }, { status: 400 });
      }

      // Lösche die Unit selbst
      await base44.asServiceRole.entities.Einheiten.delete(unitId);
      deleted.push(unitId);
    }

    return Response.json({
      success: true,
      deleted,
      count: deleted.length,
    });
  } catch (error) {
    console.error('[CLEANUP_DUPLICATE_ERROR]', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});