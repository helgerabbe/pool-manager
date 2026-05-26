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

const PAGE_SIZE = 500;
const UPDATE_BATCH_SIZE = 25;

async function listUnmigratedEinheiten(entity) {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter({ export_lifecycle_status: null }, 'created_date', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'Administrator') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const unmigrated = await listUnmigratedEinheiten(base44.asServiceRole.entities.Einheiten);
    let migrated = 0;
    let failed = 0;

    for (const batch of chunkArray(unmigrated, UPDATE_BATCH_SIZE)) {
      const results = await Promise.allSettled(
        batch.map((e) => {
          const isFinal = e.einheit_freigabe_status === 'final_freigegeben';
          return base44.asServiceRole.entities.Einheiten.update(e.id, {
            export_lifecycle_status: isFinal ? 'final_freigegeben' : 'draft',
            export_lifecycle_changed_at: e.einheit_freigegeben_at || null,
            export_lifecycle_changed_by: e.einheit_freigegeben_by || null,
          });
        })
      );

      migrated += results.filter((result) => result.status === 'fulfilled').length;
      failed += results.filter((result) => result.status === 'rejected').length;
    }

    return Response.json({ ok: true, migrated, failed, total: unmigrated.length });
  } catch (error) {
    console.error('[migrateEinheitFreigabeToLifecycle] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});