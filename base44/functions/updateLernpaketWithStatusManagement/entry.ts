/**
 * updateLernpaketWithStatusManagement.js
 * 
 * Aktualisiert ein Lernpaket und managt die Status-Übergänge:
 * - content_status bleibt immer 'approved' (Struktur-Container)
 * - sync_status: 'new' → 'modified' bei Änderung
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lernpaket_id, title, reihenfolge_nummer, themenfeld_id } = await req.json();

    if (!lernpaket_id) {
      return Response.json({ error: 'Missing lernpaket_id' }, { status: 400 });
    }

    // Hole aktuellen Zustand
    const current = await base44.entities.Lernpakete.list()
      .then(all => all.find(lp => lp.id === lernpaket_id));

    if (!current) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    // Berechne neuen sync_status
    let newSyncStatus = current.sync_status || 'new';
    if (newSyncStatus === 'synced') {
      newSyncStatus = 'modified';
    }

    // Update: content_status bleibt immer 'approved' für Struktur-Container
    const updated = await base44.entities.Lernpakete.update(lernpaket_id, {
      ...(title && { titel_des_pakets: title }),
      ...(reihenfolge_nummer !== undefined && { reihenfolge_nummer }),
      ...(themenfeld_id !== undefined && { themenfeld_id }),
      // Struktur-Container: immer 'approved'
      content_status: 'approved',
      sync_status: newSyncStatus,
    });

    return Response.json({
      success: true,
      lernpaket: updated,
      syncStatusChanged: newSyncStatus !== current.sync_status,
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});