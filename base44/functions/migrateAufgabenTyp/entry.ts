/**
 * migrateAufgabenTyp.js
 *
 * Einmalige Admin-Migration: Setzt aufgaben_typ='inhalt' bei allen
 * AllgemeineAufgabe-Datensätzen, deren Feld leer (null/undefined/"") ist.
 *
 * - Admin-only (rolle === 'admin' ODER 'Administrator').
 * - Idempotent: kann mehrfach laufen, bereits gesetzte Werte werden NICHT überschrieben.
 * - Liefert ausführliches Audit-Resultat zurück.
 *
 * Aufruf via test_backend_function('migrateAufgabenTyp', { dryRun: true|false }).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;
const UPDATE_BATCH_SIZE = 25;

async function listAllCandidates(entity) {
  const queries = [
    { aufgaben_typ: null },
    { aufgaben_typ: '' },
  ];
  const byId = new Map();

  for (const query of queries) {
    let skip = 0;
    while (true) {
      const page = await entity.filter(query, 'created_date', PAGE_SIZE, skip);
      if (!page || page.length === 0) break;
      for (const record of page) byId.set(record.id, record);
      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }
  }

  return Array.from(byId.values());
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
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-Rolle prüfen (Basis44-Standard 'admin' ODER projektinternes 'Administrator')
    const isAdmin = user.role === 'admin' || user.role === 'Administrator';
    if (!isAdmin) {
      return Response.json(
        { error: 'Forbidden: Admin-Berechtigung erforderlich' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    // Kandidaten direkt in der DB filtern und vollständig paginiert laden.
    const candidates = await listAllCandidates(base44.asServiceRole.entities.AllgemeineAufgabe);

    const result = {
      total: candidates.length,
      candidates: candidates.length,
      updated: 0,
      failed: 0,
      failures: [],
      dryRun,
    };

    if (dryRun) {
      console.log('[migrateAufgabenTyp] DRY RUN', result);
      return Response.json({ success: true, ...result, mode: 'dry-run' });
    }

    // Updates in kleinen parallelen Batches ausführen, damit die Function nicht in N+1-Latenz läuft.
    for (const batch of chunkArray(candidates, UPDATE_BATCH_SIZE)) {
      const settled = await Promise.allSettled(
        batch.map((aufgabe) =>
          base44.asServiceRole.entities.AllgemeineAufgabe.update(aufgabe.id, {
            aufgaben_typ: 'inhalt',
          })
        )
      );

      settled.forEach((entry, index) => {
        if (entry.status === 'fulfilled') {
          result.updated++;
        } else {
          result.failed++;
          result.failures.push({
            id: batch[index]?.id,
            error: entry.reason?.message || String(entry.reason),
          });
        }
      });
    }

    // Audit-Log (best effort)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'AllgemeineAufgabe',
        resource_id: 'migrateAufgabenTyp',
        changes: {
          field: 'aufgaben_typ',
          new_value: 'inhalt',
          updated: result.updated,
          failed: result.failed,
          total_scanned: result.total,
        },
        affected_count: result.updated,
        status: result.failed === 0 ? 'success' : 'partial',
      });
    } catch (auditErr) {
      console.warn('[migrateAufgabenTyp] Audit-Log fehlgeschlagen:', auditErr?.message);
    }

    console.log('[migrateAufgabenTyp] Done', result);
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('[migrateAufgabenTyp] Fatal:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
});