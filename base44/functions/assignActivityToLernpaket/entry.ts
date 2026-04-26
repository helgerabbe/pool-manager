/**
 * assignActivityToLernpaket.js
 *
 * Ordnet eine neue Aktivitäts-Hülle (aus dem AktivitaetenKatalog) einem
 * Lernpaket zu. Die Hülle ist inhaltlich leer (`field_values: {}`),
 * deshalb wird sie konsequent als `content_status='draft'` markiert.
 *
 * Sicherheit & Architektur
 * ────────────────────────
 *  - **RBAC (Türsteher):** identisch zu `acquireUnitLockSecure` /
 *    `approveMasterAufgabe` / `approvePackageActivities`:
 *      Administrator                                  → frei
 *      Fachschaftsleitung MIT Fachzuständigkeit       → frei
 *      Sonst: explizite EinheitMembers-Mitgliedschaft → frei
 *    Damit kann KEIN beliebiger eingeloggter Nutzer fremde Lernpakete
 *    mit Aktivitäten zumüllen.
 *  - **Lernpaket-Lock-Schutz:** Hält ein anderer User einen aktiven
 *    (nicht-stale) Lock auf dem Paket → 409 Conflict. Der eigene Lock
 *    oder kein Lock sind erlaubt – konsistent zur Lock-Philosophie aus
 *    §11 (Schreiben darf nicht ÜBER fremden Locks passieren).
 *  - **FK-Existenzprüfung:** `lernpaket_id` und `aktivitaet_id` werden
 *    parallel aus der DB gelesen. Verweise auf nicht existierende
 *    Datensätze brechen mit 400/404 ab, statt einen kaputten Eintrag
 *    zu erzeugen, der später das Frontend zerschießt.
 *  - **Audit-Trail:** Erfolgreiche Zuordnungen landen im AuditLog
 *    (`CREATE`/Aktivitaet) – nachvollziehbar, wer den Lernpfad wann
 *    erweitert hat.
 *
 * @MIGRATION_NOTE (Supabase) – siehe Logbuch §13
 *  - RBAC wandert in eine RLS-Policy auf `lernpaket_phase_aktivitaet`.
 *  - FK-Existenz wird durch `FOREIGN KEY`-Constraints in PostgreSQL
 *    erzwungen – die manuelle Lookup-Schleife entfällt.
 *  - Audit-Eintrag erzeugt ein `AFTER INSERT`-Trigger.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAKET_LOCK_TIMEOUT_MS = 30 * 60 * 1000;
const VALID_PHASES = new Set(['Input', 'Übung', 'Abschluss']);

// ──────────────────────────────────────────────────────────────────────
// Inline-Kopie aus functions/utils/auditLogger.js – Audit darf nie die
// Hauptoperation abbrechen. Bei Änderungen MUSS auditLogger.js
// mitgepflegt werden (NO-LOCAL-IMPORTS-Regel, vgl. §10).
// ──────────────────────────────────────────────────────────────────────
async function logAudit(base44, event) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      status: event.status,
      error_message: event.errorMessage || null,
    });
  } catch (err) {
    console.error('[assignActivityToLernpaket][AUDIT_ERROR]', err.message);
  }
}

/**
 * RBAC – konsistent zu approveMasterAufgabe / approvePackageActivities /
 * acquireUnitLockSecure.
 */
async function checkAssignPermission(base44, user, einheit) {
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

    const { lernpaket_id, aktivitaet_id, phase, reihenfolge } = await req.json();

    if (!lernpaket_id || !aktivitaet_id || !phase) {
      return Response.json(
        { error: 'Missing required fields: lernpaket_id, aktivitaet_id, phase' },
        { status: 400 }
      );
    }
    if (!VALID_PHASES.has(phase)) {
      return Response.json(
        { error: `Invalid phase. Expected one of: ${[...VALID_PHASES].join(', ')}` },
        { status: 400 }
      );
    }

    // ── 1. FK-Existenz parallel prüfen ──────────────────────────────
    const [paket, katalogEntry] = await Promise.all([
      base44.asServiceRole.entities.Lernpakete.get(lernpaket_id),
      base44.asServiceRole.entities.AktivitaetenKatalog.get(aktivitaet_id),
    ]);

    if (!paket) {
      return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
    }
    if (!katalogEntry) {
      return Response.json(
        { error: 'Aktivität nicht im Katalog gefunden' },
        { status: 404 }
      );
    }
    if (!paket.einheit_id) {
      return Response.json({ error: 'Lernpaket hat keine Einheit' }, { status: 400 });
    }

    // ── 2. Einheit für RBAC laden ───────────────────────────────────
    const einheit = await base44.asServiceRole.entities.Einheiten.get(paket.einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    // ── 3. RBAC ─────────────────────────────────────────────────────
    const perm = await checkAssignPermission(base44, user, einheit);
    if (!perm.allowed) {
      return Response.json({ error: perm.reason }, { status: 403 });
    }

    // ── 4. Fremd-Lock-Schutz ────────────────────────────────────────
    const isLocked = !!paket.is_locked;
    const isLockedByOther =
      isLocked && paket.locked_by_email && paket.locked_by_email !== user.email;
    const lockAgeMs = paket.locked_at
      ? Date.now() - new Date(paket.locked_at).getTime()
      : Infinity;
    const lockIsFresh = lockAgeMs < PAKET_LOCK_TIMEOUT_MS;

    if (isLockedByOther && lockIsFresh) {
      return Response.json(
        {
          error: `Lernpaket wird gerade von ${paket.locked_by_email} bearbeitet. Bitte später erneut versuchen.`,
          code: 'LOCKED_BY_OTHER',
          locked_by_email: paket.locked_by_email,
          locked_at: paket.locked_at,
        },
        { status: 409 }
      );
    }

    // ── 5. Aktivitäts-Hülle anlegen ─────────────────────────────────
    const activity = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.create({
      lernpaket_id,
      aktivitaet_id,
      phase,
      reihenfolge: reihenfolge || 0,
      field_values: {},
      is_complete: false,
      content_status: 'draft',
      sync_status: 'new',
    });

    // ── 6. Audit-Trail (non-blocking-semantisch, aber awaited) ──────
    await logAudit(base44, {
      user: user.email,
      action: 'CREATE',
      resource: 'LernpaketPhaseAktivitaet',
      resourceId: activity.id,
      changes: {
        lernpaket_id,
        aktivitaet_id,
        aktivitaet_name: katalogEntry.name,
        phase,
        einheit_id: paket.einheit_id,
      },
      status: 'success',
    });

    return Response.json({
      success: true,
      activity,
      message: 'Aktivität zugeordnet (forced Draft – Inhalt erforderlich)',
    });
  } catch (error) {
    console.error('[assignActivityToLernpaket] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});