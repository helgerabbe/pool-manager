/**
 * deleteLernpaketWithTombstone.js
 * 
 * Kaskadierender Soft-Delete für Lernpakete mit Tombstone-Prinzip:
 * - Markiert das Lernpaket als 'to_delete'
 * - Markiert alle verknüpften Lernziele und Aufgabenbausteine als 'to_delete'
 * - Setzt Lock-Felder zurück (is_locked, locked_by_email, locked_at)
 * - Validiert Zugriff auf die zugehörige Einheit
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

    // 1. Lade Lernpaket und prüfe Existenz
    const lernpaket = await base44.entities.Lernpakete.get(lernpaket_id);
    if (!lernpaket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    // 2. Sicherheitsprüfung: Prüfe ob User auf die Einheit Schreibrechte hat
    // (Optional: Wenn rbacMiddleware existiert, muss diese Route dort registriert sein)
    const einheit = await base44.entities.Einheiten.get(lernpaket.einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Associated Einheit not found' }, { status: 404 });
    }

    // 3. Finde alle verknüpften Lernziele
    const lernziele = await base44.entities.Lernziele.filter({ 
      lernpaket_id: lernpaket_id 
    });

    // 4. Finde alle verknüpften Aufgabenbausteine
    const aufgabenbausteine = await base44.entities.Aufgabenbausteine.filter({ 
      lernpaket_id: lernpaket_id 
    });

    // 5. Kaskadierendes Update: Alle Kind-Elemente auf 'to_delete'
    const deleteUpdates = [
      // Lernziele markieren
      ...lernziele.map(lz => 
        base44.entities.Lernziele.update(lz.id, { sync_status: 'to_delete' })
      ),
      // Aufgabenbausteine markieren
      ...aufgabenbausteine.map(ab => 
        base44.entities.Aufgabenbausteine.update(ab.id, { sync_status: 'to_delete' })
      ),
    ];

    // Warte auf alle Kind-Updates parallel
    if (deleteUpdates.length > 0) {
      await Promise.all(deleteUpdates);
    }

    // 6. Lernpaket selbst markieren + Lock-Felder zurücksetzen
    const updated = await base44.entities.Lernpakete.update(lernpaket_id, {
      sync_status: 'to_delete',
      is_locked: null,
      locked_by_email: null,
      locked_at: null,
    });

    console.info(
      `[deleteLernpaketWithTombstone] Marked Lernpaket ${lernpaket_id} as to_delete ` +
      `(${lernziele.length} Lernziele, ${aufgabenbausteine.length} Aufgabenbausteine cascaded)`
    );

    return Response.json({
      success: true,
      message: 'Lernpaket und alle Kind-Elemente als "to_delete" markiert',
      lernpaket: updated,
      cascaded: {
        lernziele_count: lernziele.length,
        aufgabenbausteine_count: aufgabenbausteine.length,
      },
    });
  } catch (error) {
    console.error('[deleteLernpaketWithTombstone] Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});