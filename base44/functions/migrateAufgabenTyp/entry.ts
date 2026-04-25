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

    // Alle Aufgaben laden (Service-Role, damit auch Datensätze ohne RLS-Match erfasst werden)
    const all = await base44.asServiceRole.entities.AllgemeineAufgabe.list();

    // Kandidaten = aufgaben_typ ist leer / nicht gesetzt
    const candidates = all.filter(
      (a) => a.aufgaben_typ === undefined || a.aufgaben_typ === null || a.aufgaben_typ === ''
    );

    const result = {
      total: all.length,
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

    // Batch-Update sequentiell, um Rate-Limits zu schonen.
    for (const aufgabe of candidates) {
      try {
        await base44.asServiceRole.entities.AllgemeineAufgabe.update(aufgabe.id, {
          aufgaben_typ: 'inhalt',
        });
        result.updated++;
      } catch (err) {
        result.failed++;
        result.failures.push({ id: aufgabe.id, error: err?.message || String(err) });
      }
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