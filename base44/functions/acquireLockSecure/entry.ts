/**
 * acquireLockSecure.js
 *
 * Sperrt ein Lernpaket mit RBAC-Prüfung und Race-Condition-Schutz (OCC).
 *
 * Hardening-Update (2026-04-26, Review-Feedback):
 *   1. RACE CONDITION → OCC mit `Lernpakete.version` (analog zu
 *      acquireDashboardLockSecure):
 *        READ → BUMP-WRITE → RE-READ → VERIFY auf E-Mail.
 *      Re-Read prüft ausschließlich `verify.locked_by_email === user.email`.
 *      `version` bleibt aktuell nur Forensik-Signal; Verlass-darauf erst
 *      wenn ALLE Schreibpfade auf `Lernpakete` mitziehen (siehe
 *      OPTIMISTIC_LOCKING_VERSION_FIELD.md).
 *
 *   2. RBAC-LOGIK STRENGER:
 *      Fachschaftsleitung darf nur Pakete in IHREN Fächern sperren
 *      (`rolle === 'Fachschaftsleitung' && fachzustaendig`).
 *      Reine Rolle ohne Fachbezug genügt nicht – das passt zur dokumentierten
 *      RBAC-Matrix (BACKEND_SECURITY_ARCHITECTURE.md §1.2:
 *      Fachschaftsleitung → mustOwnSubject: true).
 *
 *   3. PRIVACY: locked_by_email wird NICHT mehr im error-String an das
 *      Frontend geschickt; stattdessen wird (best-effort) ein Anzeigename
 *      aus `Benutzer` aufgelöst. E-Mail liegt weiterhin im strukturierten
 *      Response-Body (locked_by_email) für Admin-Tools/Forensik – das
 *      gerenderte Toast nutzt aber `lockedByName`.
 *
 * @MIGRATION_NOTE (Supabase):
 *   - RBAC-Block wird durch Postgres-RLS-Policies ersetzt; der manuelle
 *     get(Paket) + get(Einheit) + filter(Benutzer) + filter(EinheitMembers)
 *     entfällt komplett. Bis dahin akzeptieren wir die 3–4 Roundtrips.
 *   - Versions-Bump wandert in BEFORE-UPDATE-Trigger.
 *   - `locked_by_email` sollte auf `locked_by_user_id` (UUID) umgestellt
 *     werden – E-Mails sind veränderliche PII und ungeeignet als
 *     Lock-Identifier.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAKET_LOCK_TIMEOUT_MS = 30 * 60 * 1000;

async function resolveDisplayName(base44, email) {
  if (!email) return null;
  try {
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: email });
    const b = benutzer?.[0];
    if (b?.vorname || b?.nachname) {
      return `${b.vorname || ''} ${b.nachname || ''}`.trim();
    }
  } catch (_e) {
    // Display-Name ist nur Kosmetik – Fallback unten greift.
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lernpaketId } = await req.json();

    if (!lernpaketId) {
      return Response.json({ error: 'lernpaketId required' }, { status: 400 });
    }

    // Hole Lernpaket + Einheit
    const paket = await base44.entities.Lernpakete.get(lernpaketId);
    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    const einheit = await base44.entities.Einheiten.get(paket.einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // ── RBAC ──────────────────────────────────────────────────────────
    // Admin → frei. Sonst: Fachschaft NUR mit Fachzuständigkeit ODER
    // Unit-Mitgliedschaft (EinheitMembers) ODER allgemeine Fachzuständigkeit
    // (für Fachlehrkräfte, die das Fach abdecken aber nicht explizit Member sind).
    const istAdmin = user.role === 'admin';

    if (!istAdmin) {
      const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
        user_id: user.email,
      });
      const benutzerRecord = benutzer?.[0];
      const rolle = benutzerRecord?.rolle;
      const fachzustaendig =
        benutzerRecord?.fachbereich_zustaendigkeit?.includes(einheit.fach) || false;

      // Fachschaftsleitung: STRENG verknüpft mit Fachzuständigkeit.
      const istFachschaftFuerFach = rolle === 'Fachschaftsleitung' && fachzustaendig;

      if (!istFachschaftFuerFach && !fachzustaendig) {
        // Letzter Fallback: explizite Mitgliedschaft an der Einheit.
        const members = await base44.asServiceRole.entities.EinheitMembers.filter({
          einheit_id: einheit.id,
          user_email: user.email,
        });
        if (members.length === 0) {
          return Response.json(
            { error: 'Keine Berechtigung für diese Einheit' },
            { status: 403 }
          );
        }
      }
    }

    // ── Bestehenden Lock prüfen ──────────────────────────────────────
    if (paket.is_locked && paket.locked_by_email !== user.email) {
      const lockAge = paket.locked_at
        ? Date.now() - new Date(paket.locked_at).getTime()
        : Infinity;

      if (lockAge < PAKET_LOCK_TIMEOUT_MS) {
        const displayName =
          (await resolveDisplayName(base44, paket.locked_by_email)) || 'einer anderen Lehrkraft';
        const lockDurationSecs = paket.locked_at
          ? Math.round((Date.now() - new Date(paket.locked_at).getTime()) / 1000)
          : 0;
        const timelineMsg =
          lockDurationSecs < 60
            ? 'vor wenigen Sekunden'
            : `vor ${Math.round(lockDurationSecs / 60)} Minuten`;

        return Response.json(
          {
            error: `🔒 Das Lernpaket "${paket.titel_des_pakets}" wird gerade von ${displayName} bearbeitet (${timelineMsg}). Bitte warten Sie, bis die Bearbeitung abgeschlossen ist.`,
            // Strukturierte Felder für Frontend/Admin-Tools – das User-
            // sichtbare Toast nutzt `lockedByName`, nicht die E-Mail.
            lockedByName: displayName,
            locked_by_email: paket.locked_by_email,
            locked_at: paket.locked_at,
            lock_duration_seconds: lockDurationSecs,
            code: 'ALREADY_LOCKED',
          },
          { status: 409 }
        );
      }

      console.log(
        `[acquireLockSecure] Stale lock detected (age: ${Math.round(lockAge / 60 / 1000)}min), overriding`
      );
    }

    // ── Lock setzen + Verify (OCC) ───────────────────────────────────
    // Schritt A: schreiben mit Versions-Bump.
    const currentVersion = Number.isFinite(paket?.version) ? paket.version : 1;
    const nextVersion = currentVersion + 1;
    const isoNow = new Date().toISOString();
    await base44.entities.Lernpakete.update(lernpaketId, {
      is_locked: true,
      locked_by_email: user.email,
      locked_at: isoNow,
      version: nextVersion,
    });

    // Schritt B: frischer Re-Read über Service Role (kein End-User-Cache).
    // Wahrheits-Kriterium ist ausschließlich die E-Mail im Lock-Feld
    // (siehe First-Mover-Disziplin in OPTIMISTIC_LOCKING_VERSION_FIELD.md).
    // Steht eine andere E-Mail dort, hat ein paralleler Request gewonnen –
    // KEIN Rollback (würde den rechtmäßigen Gewinner zerstören).
    const verify = await base44.asServiceRole.entities.Lernpakete.get(lernpaketId);
    if (verify?.locked_by_email !== user.email) {
      const winnerEmail = verify?.locked_by_email || null;
      const displayName =
        (await resolveDisplayName(base44, winnerEmail)) || 'einer anderen Lehrkraft';
      return Response.json(
        {
          error: `🔒 Das Lernpaket "${paket.titel_des_pakets}" wurde im selben Moment von ${displayName} gesperrt. Bitte erneut versuchen.`,
          lockedByName: displayName,
          locked_by_email: winnerEmail,
          code: 'RACE_LOST',
        },
        { status: 409 }
      );
    }

    return Response.json({ success: true, version: nextVersion });
  } catch (error) {
    console.error('[acquireLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});