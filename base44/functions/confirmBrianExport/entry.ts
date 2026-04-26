/**
 * confirmBrianExport.js
 *
 * Setzt `brian_sync_status='synced'` (+ `brian_synced_at`) auf einer
 * `AllgemeineAufgabe` und löst im SELBEN Update den Dual-Lock auf,
 * sobald auch der Moodle-Export fertig ist
 * (`moodle_sync_status === 'synced'` ODER legacy `sync_status === 'synced'`).
 *
 * Hintergrund (siehe Logbuch §14)
 * ───────────────────────────────────────────────────────────────────────
 * Vorher hat das Frontend (`BrianExportCockpitView`) zwei separate
 * Calls abgesetzt:
 *   1) `entities.AllgemeineAufgabe.update({ brian_sync_status: 'synced' })`
 *   2) `functions.invoke('checkAndReleaseDualLock', …)`
 *
 * Bricht die Verbindung zwischen Schritt 1 und 2 ab (Tab geschlossen,
 * Network-Glitch), entsteht ein "Zombie-Lock". Diese Funktion fasst
 * beide Schritte zu EINEM atomaren Server-Update zusammen.
 *
 * Sicherheit:
 *   - Auth: jeder eingeloggte User darf grundsätzlich Aufgaben in
 *     "seiner" Einheit auf Brian-synced setzen, deshalb wird hier die
 *     gleiche RBAC-Prüfung wie in approveMasterAufgabe /
 *     approvePackageActivities angewendet (Admin / Fachschaft mit
 *     Fachzuständigkeit / EinheitMembers).
 *   - Tenant-Isolation: Aufgabe → Einheit-Auflösung ist Pflicht.
 *
 * @MIGRATION_NOTE (Supabase) – siehe Logbuch §14
 *   Der inline-Dual-Lock-Release wird durch einen
 *   `AFTER UPDATE ON allgemeine_aufgabe`-Trigger ersetzt.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function checkAufgabePermission(base44, user, einheit) {
  if (user.role === 'admin') return { allowed: true };

  const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
    user_id: user.email,
  });
  const benutzer = benutzerList?.[0];
  const rolle = benutzer?.rolle;

  if (rolle === 'Administrator') return { allowed: true };

  if (rolle === 'Fachschaftsleitung') {
    const fachzustaendig =
      benutzer?.fachbereich_zustaendigkeit?.includes(einheit.fach) || false;
    if (fachzustaendig) return { allowed: true };
  }

  const members = await base44.asServiceRole.entities.EinheitMembers.filter({
    einheit_id: einheit.id,
    user_email: user.email,
  });
  if (members.length > 0) return { allowed: true };

  return { allowed: false, reason: 'Sie haben keinen Zugriff auf diese Einheit' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { aufgabe_id } = await req.json();
    if (!aufgabe_id) {
      return Response.json({ error: 'aufgabe_id erforderlich' }, { status: 400 });
    }

    // ── 1. Aufgabe + Einheit laden ────────────────────────────────────
    const aufgabe = await base44.asServiceRole.entities.AllgemeineAufgabe.read(aufgabe_id);
    if (!aufgabe) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }
    if (!aufgabe.einheit_id) {
      return Response.json({ error: 'Aufgabe hat keine Einheit' }, { status: 400 });
    }
    const einheit = await base44.asServiceRole.entities.Einheiten.read(aufgabe.einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    // ── 2. RBAC ───────────────────────────────────────────────────────
    const perm = await checkAufgabePermission(base44, user, einheit);
    if (!perm.allowed) {
      return Response.json({ error: perm.reason }, { status: 403 });
    }

    // ── 3. Atomarer Update mit eingebauter Dual-Lock-Auflösung ────────
    const now = new Date().toISOString();
    const moodleAlreadySynced =
      aufgabe.moodle_sync_status === 'synced' || aufgabe.sync_status === 'synced';

    const updatePayload = {
      brian_sync_status: 'synced',
      brian_synced_at: now,
    };
    let lockReleased = false;
    if (moodleAlreadySynced) {
      updatePayload.locked_by = null;
      updatePayload.locked_at = null;
      lockReleased = true;
    }

    await base44.asServiceRole.entities.AllgemeineAufgabe.update(aufgabe_id, updatePayload);

    // Audit-Trail bei automatischem Dual-Lock-Release (siehe Logbuch §15).
    if (lockReleased) {
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'UPDATE',
          resource_type: 'AllgemeineAufgabe',
          resource_id: aufgabe_id,
          changes: { dual_lock_released: true, trigger: 'confirmBrianExport' },
          affected_count: 1,
          status: 'success',
        });
      } catch (auditErr) {
        console.error('[confirmBrianExport][AUDIT_ERROR]', auditErr.message);
      }
    }

    return Response.json({
      success: true,
      lock_released: lockReleased,
      moodle_synced: moodleAlreadySynced,
      brian_synced: true,
      timestamp: now,
    });
  } catch (error) {
    console.error('[confirmBrianExport] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});