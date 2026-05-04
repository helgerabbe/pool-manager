/**
 * migrateEinheitFreigabeToLifecycle
 *
 * Phase-A-Migration: überträgt das alte Feld `einheit_freigabe_status`
 * (Werte: 'draft' | 'final_freigegeben') in das neue Feld
 * `export_lifecycle_status` (Enum mit 4 Werten).
 *
 * Verhalten:
 *   - Liest alle Einheiten ohne `export_lifecycle_status`.
 *   - Mappt 'final_freigegeben' → 'final_freigegeben',
 *           alles andere      → 'draft'.
 *   - Übernimmt zusätzlich `einheit_freigegeben_at`/`einheit_freigegeben_by`
 *     in `export_lifecycle_changed_at`/`export_lifecycle_changed_by`,
 *     damit das Audit-Datum nicht verloren geht.
 *   - Entfernt die Legacy-Felder NICHT (Schema-Update entfernt sie; alte
 *     Werte stören das Frontend nicht, weil dort nur das neue Feld gelesen
 *     wird).
 *
 * Admin-only.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'Administrator') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const all = await base44.asServiceRole.entities.Einheiten.list();
    let migrated = 0;
    let skipped = 0;

    for (const e of all || []) {
      if (e.export_lifecycle_status) {
        skipped += 1;
        continue;
      }
      const isFinal = e.einheit_freigabe_status === 'final_freigegeben';
      const update = {
        export_lifecycle_status: isFinal ? 'final_freigegeben' : 'draft',
        export_lifecycle_changed_at: e.einheit_freigegeben_at || null,
        export_lifecycle_changed_by: e.einheit_freigegeben_by || null,
      };
      await base44.asServiceRole.entities.Einheiten.update(e.id, update);
      migrated += 1;
    }

    return Response.json({ ok: true, migrated, skipped, total: all?.length || 0 });
  } catch (error) {
    console.error('[migrateEinheitFreigabeToLifecycle] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});