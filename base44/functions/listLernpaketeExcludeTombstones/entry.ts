/**
 * listLernpaketeExcludeTombstones.js
 * 
 * Liefert alle Lernpakete, filtert aber Tombstones (sync_status='to_delete') aus.
 * Wird von der UI (Ebene 1-4) verwendet.
 * Das Export-Center ruft direkt die Base44-API auf, um Tombstones zu sehen.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hole alle Lernpakete
    const all = await base44.entities.Lernpakete.list();

    // Filtere Tombstones aus (nur für normale UI)
    const visible = all.filter(lp => lp.sync_status !== 'to_delete');

    return Response.json({
      success: true,
      lernpakete: visible,
      total: visible.length,
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});