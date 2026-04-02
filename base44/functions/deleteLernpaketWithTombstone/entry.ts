/**
 * deleteLernpaketWithTombstone.js
 * 
 * Soft-Delete für Lernpakete: Setzt sync_status='to_delete' statt echtem Löschen.
 * Dadurch können Export-Routen noch wissen, dass dieses Element gelöscht werden soll.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lernpaket_id } = await req.json();

    if (!lernpaket_id) {
      return Response.json({ error: 'Missing lernpaket_id' }, { status: 400 });
    }

    // TOMBSTONE: UPDATE statt DELETE
    // Markiere das Lernpaket als "zur Löschung vorgesehen"
    const updated = await base44.entities.Lernpakete.update(lernpaket_id, {
      sync_status: 'to_delete',
    });

    return Response.json({
      success: true,
      message: 'Lernpaket als "to_delete" markiert (Tombstone-Prinzip)',
      lernpaket: updated,
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});