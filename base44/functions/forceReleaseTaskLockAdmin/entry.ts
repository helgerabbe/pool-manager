/**
 * forceReleaseTaskLockAdmin.js
 *
 * NOTFALL-Override für die Bearbeitungssperre einer `AllgemeineAufgabe`.
 *
 * Warum dieser Endpunkt existiert (siehe Logbuch §15)
 * ───────────────────────────────────────────────────────────────────────
 * Der Moodle/Brian-Export ist ein MANUELLER Prozess. Es gibt keine
 * Webhooks, die uns zurückmelden, dass der Export beendet wurde.
 * Stattdessen müssen Admins den Status händisch im UI bestätigen.
 *
 * Wenn dieser manuelle Schritt vergessen wird ("Verpennen"), bleibt die
 * Aufgabe für ALLE Lehrkräfte gesperrt – ohne Heilungs-Logik. Dieser
 * Endpunkt ist die kontrollierte Auflösung dieser Situation.
 *
 * BEWUSSTE Trennung von `confirmExportCompletion` / `confirmBrianExport`:
 *   - Reguläre Endpunkte setzen Sync-Status UND lösen ggf. den Lock.
 *   - Dieser Endpunkt löst NUR den Lock und fasst den Sync-Status NICHT
 *     an. Damit verfälschen Notfall-Eingriffe nie die Export-Wahrheit
 *     (eine Aufgabe darf nicht "synced" heißen, nur weil ein Admin den
 *     Lock gebrochen hat).
 *
 * Sicherheit
 *   - Nur globaler Admin (User.role === 'admin' ODER Benutzer.rolle ===
 *     'Administrator'). KEIN Fachschafts-/EinheitMembers-Fallback.
 *   - Pflichtfeld `reason` (Begründung) – landet im Audit-Log.
 *   - Jeder erfolgreiche Override schreibt einen `UPDATE`-AuditLog
 *     mit `force_release: true` + `reason` für Forensik.
 *
 * Stale-Lock-Hinweis (informativ, nicht blockierend)
 *   Das Frontend soll den Button bevorzugt anbieten, wenn der Lock
 *   älter als 24 h ist. Der Server prüft das nicht, weil es legitime
 *   Fälle gibt (z. B. Admin will den Lock direkt nach dem Export
 *   manuell lösen).
 *
 * @MIGRATION_NOTE (Supabase) – siehe Logbuch §15
 *   Bleibt auch nach der Migration nötig, weil der Trigger-basierte
 *   Auto-Release nur greift, wenn `synced` tatsächlich gesetzt wird.
 *   Der Endpunkt wandert in eine `RPC`-Funktion mit
 *   `SECURITY DEFINER` + Admin-RLS-Check.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function isAdmin(base44, user) {
  if (user.role === 'admin') return true;
  const list = await base44.asServiceRole.entities.Benutzer.filter({
    user_id: user.email,
  });
  return list?.[0]?.rolle === 'Administrator';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(base44, user))) {
      return Response.json(
        { error: 'Forbidden: Nur Administratoren dürfen Locks manuell brechen.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { aufgabe_id, reason } = body;
    if (!aufgabe_id) {
      return Response.json({ error: 'aufgabe_id erforderlich' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return Response.json(
        { error: 'reason erforderlich (min. 5 Zeichen). Wird im Audit-Log gespeichert.' },
        { status: 400 }
      );
    }

    const aufgabe = await base44.asServiceRole.entities.AllgemeineAufgabe.get(aufgabe_id);
    if (!aufgabe) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    if (!aufgabe.locked_by) {
      return Response.json({
        success: true,
        already_unlocked: true,
        message: 'Aufgabe war bereits entsperrt – kein Eingriff nötig.',
      });
    }

    const previousLockOwner = aufgabe.locked_by;
    const previousLockedAt = aufgabe.locked_at;
    const lockAgeHours = previousLockedAt
      ? (Date.now() - new Date(previousLockedAt).getTime()) / (1000 * 60 * 60)
      : null;

    // Lock brechen – Sync-Status BEWUSST nicht anfassen.
    await base44.asServiceRole.entities.AllgemeineAufgabe.update(aufgabe_id, {
      locked_by: null,
      locked_at: null,
    });

    // Audit-Log (best effort, blockiert nicht).
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'AllgemeineAufgabe',
        resource_id: aufgabe_id,
        changes: {
          force_release: true,
          reason: reason.trim(),
          previous_locked_by: previousLockOwner,
          previous_locked_at: previousLockedAt,
          lock_age_hours: lockAgeHours,
          moodle_sync_status: aufgabe.moodle_sync_status || aufgabe.sync_status || null,
          brian_sync_status: aufgabe.brian_sync_status || null,
        },
        affected_count: 1,
        status: 'success',
      });
    } catch (auditErr) {
      console.error('[forceReleaseTaskLockAdmin][AUDIT_ERROR]', auditErr.message);
    }

    return Response.json({
      success: true,
      released: true,
      previous_locked_by: previousLockOwner,
      previous_locked_at: previousLockedAt,
      lock_age_hours: lockAgeHours,
    });
  } catch (error) {
    console.error('[forceReleaseTaskLockAdmin] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});