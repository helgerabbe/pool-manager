/**
 * assignActivityToLernpaket.js
 * 
 * Ordnet eine neue Aktivität (aus dem Katalog) einem Lernpaket zu.
 * Da die Aktivität inhaltlich noch leer ist (nur Hülle):
 * - content_status: 'draft' (erzwingt Inhalt-Arbeit)
 * - sync_status: 'new'
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lernpaket_id, aktivitaet_id, phase, reihenfolge } = await req.json();

    if (!lernpaket_id || !aktivitaet_id || !phase) {
      return Response.json({ 
        error: 'Missing required fields: lernpaket_id, aktivitaet_id, phase' 
      }, { status: 400 });
    }

    // Erstelle die Aktivitäts-Hülle
    const activity = await base44.entities.LernpaketPhaseAktivitaet.create({
      lernpaket_id,
      aktivitaet_id,
      phase,
      reihenfolge: reihenfolge || 0,
      field_values: {}, // Leer, wird später ausgefüllt
      is_complete: false,
      // 2-Signal: Neue leere Aktivität = 'draft' (erzwingt Inhalt)
      content_status: 'draft',
      sync_status: 'new',
    });

    return Response.json({
      success: true,
      activity,
      message: 'Aktivität zugeordnet (forced Draft – Inhalt erforderlich)',
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});