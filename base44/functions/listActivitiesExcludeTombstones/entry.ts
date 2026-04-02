/**
 * listActivitiesExcludeTombstones.js
 * 
 * Liefert alle Aktivitäten, filtert aber Tombstones aus.
 * Wird von der UI verwendet, damit gelöschte Aktivitäten unsichtbar sind.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lernpaket_id } = await req.json() || {};

    // Hole alle Aktivitäten
    let activities = await base44.entities.LernpaketPhaseAktivitaet.list();

    // Filtere Tombstones aus
    activities = activities.filter(a => a.sync_status !== 'to_delete');

    // Optional: filtere nach Lernpaket
    if (lernpaket_id) {
      activities = activities.filter(a => a.lernpaket_id === lernpaket_id);
    }

    return Response.json({
      success: true,
      activities,
      total: activities.length,
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});