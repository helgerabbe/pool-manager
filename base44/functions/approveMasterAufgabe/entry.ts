/**
 * approveMasterAufgabe.js
 *
 * Setzt content_status auf einer MasterAufgabe auf 'approved' oder 'draft'
 * und synchronisiert daraus den Aggregat-Status der übergeordneten
 * `LernpaketPhaseAktivitaet`.
 *
 * Sicherheit & Architektur
 * ────────────────────────
 *  - Tenant-Isolation: Aufgabe → Activity → Lernpaket → Einheit-Kette wird
 *    sequenziell aufgelöst, damit ein Master nicht aus fremden Einheiten
 *    geändert werden kann.
 *  - **RBAC** (entspricht `acquireUnitLockSecure.checkUnifiedPermission`):
 *      Administrator                                   → frei
 *      Fachschaftsleitung MIT Fach in fachbereich_zustaendigkeit   → frei
 *      Sonst: explizite EinheitMembers-Mitgliedschaft (LEITUNG/EDITOR)
 *    Damit können globale Admins/zuständige Fachschaften approven, ohne
 *    in jeder Einheit einzeln Mitglied sein zu müssen.
 *  - Klon-Schutz: Klone (is_master=false) dürfen nicht approved werden.
 *  - Lock-Philosophie: Schreiben ist erlaubt, solange kein FREMDER Lock
 *    aktiv ist. Eigene Schreibrennen werden über `version`-OCC bei den
 *    eigentlichen Locks (acquireLockSecure / acquireUnitLockSecure) abgefangen.
 *  - Sync-Status: Bei `approve` → `sync_status='pending'` (Moodle-Trigger).
 *    Bei `unapprove` bleibt der bisherige sync_status unverändert (z. B.
 *    'synced' bei einem bereits exportierten Master, der nur lokal in
 *    den Entwurfsmodus zurückgesetzt wird).
 *
 * @MIGRATION_NOTE (Supabase) – siehe OPTIMISTIC_LOCKING_VERSION_FIELD.md §11
 *  - Die Wasserfall-Reads (MasterAufgabe → Activity → Lernpaket → Einheit
 *    → EinheitMembers/Benutzer) verschwinden vollständig. RLS-Policies
 *    auf MasterAufgabe + Aggregat-Trigger auf LernpaketPhaseAktivitaet
 *    übernehmen das.
 *  - Schritt 7 (Activity-Aggregat) MUSS in einen
 *    `AFTER UPDATE ON MasterAufgabe`-Trigger wandern, damit das
 *    Aggregat atomar zu jedem einzelnen Master-Update läuft. Bis dahin
 *    bleibt eine Race Condition bestehen, wenn zwei User exakt
 *    gleichzeitig zwei verschiedene Masters approven.
 *
 * Parameter:
 *  - masterId: MasterAufgabe ID
 *  - action:   'approve' | 'unapprove'
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Einheitliche RBAC-Prüfung – konsistent zu acquireUnitLockSecure.
 *   - Admin                                          → erlaubt
 *   - Fachschaftsleitung MIT Fachzuständigkeit       → erlaubt
 *   - Sonst: explizite EinheitMembers-Mitgliedschaft → erlaubt
 */
async function checkApprovalPermission(base44, user, einheit) {
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

  // Fallback: jede Form von Mitgliedschaft (LEITUNG oder EDITOR).
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

    const { masterId, action = 'approve' } = await req.json();

    if (!masterId) {
      return Response.json({ error: 'Missing masterId' }, { status: 400 });
    }

    if (!['approve', 'unapprove'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ── 1. MasterAufgabe auslesen ──────────────────────────────────────────────
    const aufgabe = await base44.asServiceRole.entities.MasterAufgabe.read(masterId);

    if (!aufgabe) {
      return Response.json({ error: 'MasterAufgabe nicht gefunden' }, { status: 404 });
    }

    // ── 2. Klon-Schutz ─────────────────────────────────────────────────────────
    if (aufgabe.is_master === false) {
      return Response.json(
        { error: 'Klone können nicht direkt approved werden. Befördern Sie den Klon zuerst zur Masteraufgabe.' },
        { status: 400 }
      );
    }

    // ── 3. Activity auslesen (für Lock-Prüfung + Aggregat) ─────────────────────
    if (!aufgabe.activity_id) {
      return Response.json(
        { error: 'MasterAufgabe hat keine verknüpfte Activity' },
        { status: 400 }
      );
    }

    const activity = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.read(aufgabe.activity_id);
    if (!activity) {
      return Response.json({ error: 'Activity nicht gefunden' }, { status: 404 });
    }

    const lernpaketId = activity.lernpaket_id;
    if (!lernpaketId) {
      return Response.json({ error: 'Lernpaket-Referenz fehlt' }, { status: 400 });
    }

    // ── 4. Fremd-Lock-Prüfung ──────────────────────────────────────────────────
    // Architektur-Entscheidung: Schreiben ist erlaubt, solange kein
    // FREMDER Lock aktiv ist. Eigene Race-Conditions werden über das
    // version-OCC der zugrunde liegenden Lock-Endpunkte abgefangen.
    const lernpaket = await base44.asServiceRole.entities.Lernpakete.read(lernpaketId);
    if (!lernpaket) {
      return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
    }

    const isLocked = !!lernpaket.is_locked;
    const isLockedByUser = lernpaket.locked_by_email === user.email;

    if (isLocked && !isLockedByUser) {
      return Response.json(
        { error: `Lernpaket ist durch ${lernpaket.locked_by_email} gesperrt. Sie können keine Änderungen vornehmen.` },
        { status: 403 }
      );
    }

    // ⛔ Export-Lock-Enforcement
    if (lernpaket.export_locked === true || lernpaket.moodle_sync_status === 'locked') {
      console.warn(
        `[approveMasterAufgabe] BLOCKED by export lock - ${user.email} tried to update ${masterId} ` +
        `but export is in progress (export_locked=${lernpaket.export_locked}, moodle_sync_status=${lernpaket.moodle_sync_status})`
      );
      return Response.json(
        {
          error: 'Update abgelehnt: Einheit ist zur Moodle-Synchronisation gesperrt. Bitte versuchen Sie es später erneut.',
          code: 'EXPORT_LOCKED',
          details: {
            export_locked: lernpaket.export_locked,
            moodle_sync_status: lernpaket.moodle_sync_status,
            lernpaketId: lernpaket.id,
          },
        },
        { status: 423, headers: { 'Retry-After': '5' } }
      );
    }

    // ── 5. Einheit + RBAC ─────────────────────────────────────────────────────
    if (!lernpaket.einheit_id) {
      return Response.json({ error: 'Lernpaket hat keine Einheit' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.read(lernpaket.einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const perm = await checkApprovalPermission(base44, user, einheit);
    if (!perm.allowed) {
      return Response.json({ error: perm.reason }, { status: 403 });
    }

    // ── 6. content_status + sync_status aktualisieren ─────────────────────────
    // Bei 'approve': sync_status auf 'pending' setzen, damit der
    // Moodle-Export-Pfad erkennt, dass dieser Master neu/geändert
    // exportiert werden muss. Bei 'unapprove' lassen wir den
    // bisherigen sync_status bewusst unangetastet – ein bereits
    // synchronisierter Master, der temporär in den Entwurf zurück
    // geht, soll nicht fälschlich als „pending" markiert werden.
    const newContentStatus = action === 'approve' ? 'approved' : 'draft';
    const masterUpdate = { content_status: newContentStatus };
    if (action === 'approve') {
      masterUpdate.sync_status = 'pending';
    }

    await base44.asServiceRole.entities.MasterAufgabe.update(masterId, masterUpdate);

    // ── 7. Activity-Aggregat synchronisieren ──────────────────────────────────
    // ACHTUNG (siehe Logbuch §11): Read-then-write Race Condition möglich,
    // wenn zwei User gleichzeitig zwei verschiedene Masters derselben
    // Activity approven. Migration → DB-Trigger.
    const allMasters = await base44.asServiceRole.entities.MasterAufgabe.filter({
      activity_id: aufgabe.activity_id,
    });

    const allApproved = allMasters.every((m) =>
      m.id === masterId ? newContentStatus === 'approved' : m.content_status === 'approved'
    );

    const activityContentStatus = allApproved ? 'approved' : 'draft';
    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(aufgabe.activity_id, {
      content_status: activityContentStatus,
    });

    // ── 8. Roll-up auf `Lernpakete.is_complete` (siehe Logbuch §17) ──
    // DoD-Korrektur 2026-04-27: Master-Approval ist KEINE Bedingung
    // mehr für die Lernpaket-Vollständigkeit (siehe §17). Approve/
    // Unapprove eines Masters ändert das Paket-Aggregat damit nicht
    // direkt – das `LernpaketPhaseAktivitaet.is_complete`-Aggregat
    // (wird in updateActivitySecure gepflegt) bleibt die einzige Quelle.
    // Diese Funktion belässt den Roll-up bewusst leer.

    return Response.json({
      success: true,
      masterId,
      newContentStatus,
      newSyncStatus: masterUpdate.sync_status || aufgabe.sync_status || null,
      activityContentStatus,
      message:
        action === 'approve'
          ? 'MasterAufgabe freigegeben'
          : 'MasterAufgabe zu Entwurf zurückgesetzt',
    });
  } catch (error) {
    console.error('[approveMasterAufgabe] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});