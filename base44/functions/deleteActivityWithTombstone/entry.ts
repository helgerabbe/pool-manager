/**
 * deleteActivityWithTombstone.js
 * 
 * Soft-Delete für Aktivitäten: Setzt sync_status='to_delete' statt echtem Löschen.
 * UI filtert diese automatisch aus, Export-Center kann sie noch abrufen.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activity_id } = await req.json();

    if (!activity_id) {
      return Response.json({ error: 'Missing activity_id' }, { status: 400 });
    }

    // TOMBSTONE: UPDATE statt DELETE
    const updated = await base44.entities.LernpaketPhaseAktivitaet.update(activity_id, {
      sync_status: 'to_delete',
    });

    return Response.json({
      success: true,
      message: 'Aktivität als "to_delete" markiert (Tombstone-Prinzip)',
      activity: updated,
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});