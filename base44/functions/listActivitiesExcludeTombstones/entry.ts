/**
 * listActivitiesExcludeTombstones.js
 * 
 * Liefert Aktivitäten, excl. Tombstones – mit DB-Level Filtering für Performance.
 * 
 * Performance & Sicherheit:
 * - Datenbank-seitiges Filtern (sync_status !== 'to_delete')
 * - Optional: Filterung nach lernpaket_id direkt in der DB-Query
 * - Sicheres Request-Body-Parsing (Fallback bei fehlender/invalider Body)
 * - Verhindert Memory Leaks bei großen Datenmengen
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sicheres Request-Parsing: Fallback bei fehlender/invalider JSON-Body
    const body = await req.json().catch(() => ({}));
    const { lernpaket_id } = body;

    // ─────────────────────────────────────────────────────────────────
    // DB-Level Filtering: Alle Bedingungen direkt an die Abfrage
    // ─────────────────────────────────────────────────────────────────
    const filterQuery = {
      sync_status: { $ne: 'to_delete' }, // Tombstones ausschließen
    };

    // Optional: Filterung nach Lernpaket-ID in die DB-Query aufnehmen
    if (lernpaket_id && lernpaket_id.trim()) {
      filterQuery.lernpaket_id = lernpaket_id;
    }

    // Führe die gefilterte Abfrage auf Datenbankebene aus
    const activities = await base44.entities.LernpaketPhaseAktivitaet.filter(filterQuery);

    return Response.json({
      success: true,
      activities,
      total: activities.length,
    });
  } catch (error) {
    console.error('[listActivitiesExcludeTombstones] Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});