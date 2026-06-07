import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * markEinheitStrukturModified
 * ───────────────────────────
 * Setzt den Moodle-Lebenszyklus (`sync_status`) einer Einheit auf 'modified',
 * NACHDEM die Struktur (Themenfelder / Lernpakete) in Tab 2 geändert wurde.
 *
 * Sicherheits-Regel (idempotent, konservativ):
 *   - Nur wenn die Einheit aktuell 'synced' ist → 'modified'.
 *   - 'new'/'pending'/'modified'/'to_delete' bleiben unangetastet:
 *       • 'new'/'pending' = noch nie / gerade im Export → eine Strukturänderung
 *         ändert hier nichts am Zustand "noch nicht draußen".
 *       • 'modified' = bereits als änderungsbedürftig markiert (no-op).
 *       • 'to_delete' = Löschvormerkung, nicht überschreiben.
 *
 * Aufruf vom Frontend nach erfolgreichem Struktur-Speichern.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { einheitId } = body;
    if (!einheitId) {
      return Response.json({ error: 'einheitId required' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const current = einheit.sync_status || 'new';

    // Nur synchronisierte Einheiten werden als "geändert" markiert.
    if (current !== 'synced') {
      return Response.json({ ok: true, changed: false, sync_status: current, noop: true });
    }

    await base44.asServiceRole.entities.Einheiten.update(einheitId, { sync_status: 'modified' });

    return Response.json({ ok: true, changed: true, sync_status: 'modified' });
  } catch (error) {
    console.error('[markEinheitStrukturModified] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});