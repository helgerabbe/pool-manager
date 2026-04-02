/**
 * createLernpaketWithAutoApproval.js
 * 
 * Erstellt ein Lernpaket mit automatischer content_status='approved'
 * (da es sich nur um einen Container handelt, keine inhaltliche Freigabe nötig)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, themenfeld_id, einheit_id, reihenfolge_nummer } = await req.json();

    if (!title || !einheit_id || reihenfolge_nummer === undefined) {
      return Response.json({ 
        error: 'Missing required fields: title, einheit_id, reihenfolge_nummer' 
      }, { status: 400 });
    }

    // Erstelle das Lernpaket mit Auto-Grün
    const lernpaket = await base44.entities.Lernpakete.create({
      titel_des_pakets: title,
      themenfeld_id: themenfeld_id || null,
      einheit_id,
      reihenfolge_nummer,
      // 2-Signal: Struktur-Container sind immer 'approved' (Auto-Grün)
      content_status: 'approved',
      // Sync-Status: neu erstellt = 'new'
      sync_status: 'new',
    });

    return Response.json({
      success: true,
      lernpaket,
      message: 'Lernpaket erstellt (Auto-Grün für Strukturdaten)',
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});