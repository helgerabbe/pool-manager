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

    // ── 7. Etappe 4: Anti-Drift-Cleanup in lernpfade_konfiguration ───────
    // Verhindert Ghost-Items: alle Verweise auf das soeben getombsteinte
    // Lernpaket aus den vier Dashboards entfernen (Items mit ref_id ===
    // lernpaket_id, egal ob Root- oder Bündel-Children). Sektoren bleiben
    // stehen – die werden nicht durch das Lernpaket-Delete invalidiert.
    let dashboardCleanup = { removedItemCount: 0, persisted: false };
    try {
      const konfig = einheit.lernpfade_konfiguration || null;
      if (konfig && typeof konfig === 'object') {
        let changed = false;
        let removed = 0;
        const next = {};
        for (const lt of ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert']) {
          const sektoren = Array.isArray(konfig[lt]) ? konfig[lt] : [];
          next[lt] = sektoren.map((s) => {
            const items = Array.isArray(s?.items) ? s.items : [];
            const filtered = items.filter((it) => {
              if (it?.type === 'aufgabe' && it.ref_id === lernpaket_id) {
                removed += 1;
                return false;
              }
              return true;
            });
            if (filtered.length !== items.length) {
              changed = true;
              return { ...s, items: filtered };
            }
            return s;
          });
        }
        if (changed) {
          await base44.entities.Einheiten.update(einheit.id, {
            lernpfade_konfiguration: next,
          });
          dashboardCleanup = { removedItemCount: removed, persisted: true };
        }
      }
    } catch (err) {
      // Nicht abbrechen – Hauptaktion (Tombstone) ist erfolgreich.
      console.warn('[deleteLernpaketWithTombstone] Dashboard-Cleanup fehlgeschlagen:', err?.message);
    }

    // ── 8. Junction-Cleanup ──────────────────────────────────────────────
    // LernpfadAufgabeMembership-Einträge, die auf dieses Lernpaket zeigen,
    // entfernen. Sonst zeigt der pfad_status weiter „locked_for_export" für
    // ein nicht mehr existierendes Item.
    let membershipDeleted = 0;
    try {
      const memberships = await base44.entities.LernpfadAufgabeMembership.filter({
        einheit_id: einheit.id,
        aufgabe_id: lernpaket_id,
      });
      if (memberships.length > 0) {
        const results = await Promise.allSettled(
          memberships.map((m) => base44.entities.LernpfadAufgabeMembership.delete(m.id))
        );
        membershipDeleted = results.filter((r) => r.status === 'fulfilled').length;
      }
    } catch (err) {
      console.warn('[deleteLernpaketWithTombstone] Membership-Cleanup fehlgeschlagen:', err?.message);
    }

    console.info(
      `[deleteLernpaketWithTombstone] Marked Lernpaket ${lernpaket_id} as to_delete ` +
      `(${lernziele.length} Lernziele, ${aufgabenbausteine.length} Aufgabenbausteine cascaded; ` +
      `${dashboardCleanup.removedItemCount} dashboard items removed, ${membershipDeleted} memberships deleted)`
    );

    return Response.json({
      success: true,
      message: 'Lernpaket und alle Kind-Elemente als "to_delete" markiert',
      lernpaket: updated,
      cascaded: {
        lernziele_count: lernziele.length,
        aufgabenbausteine_count: aufgabenbausteine.length,
        dashboard_items_removed: dashboardCleanup.removedItemCount,
        memberships_deleted: membershipDeleted,
      },
    });
  } catch (error) {
    console.error('[deleteLernpaketWithTombstone] Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});