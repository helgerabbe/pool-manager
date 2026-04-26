/**
 * acquireDashboardLockSecure.js
 *
 * Spezialisierter Lock-Erwerb für Tab 7 (Dashboards / Lernpfad-Architekt).
 *
 * Unterschied zu `acquireStructuralLockSecure`:
 *   Zusätzlich zum Struktur-Lock (Tab 2) werden hier auch alle
 *   *Inhalts-Locks* der Einheit geprüft – konkret:
 *     - Aktive `Lernpakete`-Locks  (is_locked + locked_by_email + locked_at < 30 Min)
 *     - Aktive `AllgemeineAufgabe`-Locks (locked_by + locked_at < 60 Min)
 *
 *   Sobald irgendein anderer Nutzer in der Einheit aktiv arbeitet, wird der
 *   Lock-Erwerb verweigert und der konkrete Name (vorname + nachname, Fallback:
 *   E-Mail) zurückgegeben.
 *
 * Erfolgreich → setzt `structural_lock` + `structural_locked_at` auf der Einheit.
 *
 * Race-Condition-Schutz (siehe Review §2):
 *   Da das Base44-SDK kein konditionales Update kennt, nutzen wir
 *   "optimistic verify": Wir lesen die Einheit, prüfen, schreiben den Lock
 *   und LESEN ihn unmittelbar danach erneut. Steht dort jetzt eine andere
 *   E-Mail (paralleler Konkurrent war schneller), brechen wir mit 409 ab
 *   und überschreiben den Sieger NICHT erneut.
 *
 * Performance (siehe Review §1):
 *   Lernpaket- und Aufgaben-Locks werden DB-seitig vorgefiltert
 *   (`is_locked: true` bzw. nur Inhaber-Felder), nicht mehr per
 *   In-Memory-`.find()` über alle Datensätze der Einheit.
 *
 * Fail-Safe (siehe Review §3):
 *   Datenbank-Fehler bei der Lock-Prüfung führen zu 500 – niemals zur
 *   stillen Lock-Vergabe trotz aktiver Bearbeitung.
 *
 * @MIGRATION_NOTE (Supabase, Review §4):
 *   `structural_lock` / `locked_by` halten aktuell user.email. Bei der
 *   Supabase-Migration zwingend auf user_id (UUID) als FK umstellen –
 *   E-Mails sind veränderliche PII und ungeeignet als Lock-Identifier.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STRUCT_LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Min
const PAKET_LOCK_TIMEOUT_MS = 30 * 60 * 1000;  // 30 Min
const AUFGABE_LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Min

async function resolveDisplayName(base44, email) {
  if (!email) return null;
  try {
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: email });
    const b = benutzer?.[0];
    if (b?.vorname || b?.nachname) {
      return `${b.vorname || ''} ${b.nachname || ''}`.trim();
    }
  } catch (_e) {
    // Display-Name ist nur Kosmetik; bei Fehler weiterhin E-Mail liefern.
  }
  return email;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheit_id } = await req.json();
    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }

    // ── RBAC: gleiche Regeln wie Struktur-Lock ─────────────────────────
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    const benutzer = benutzerList?.[0];
    const role = user.role === 'admin' ? 'Administrator' : (benutzer?.rolle || 'Betrachter');
    const istAdmin = role === 'Administrator';
    const istFachschaft = role === 'Fachschaftsleitung';

    if (!istAdmin && !istFachschaft) {
      const members = await base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id,
        user_email: user.email,
        unit_role: 'LEITUNG',
      });
      if (members.length === 0) {
        return Response.json(
          { error: 'Keine Berechtigung für Dashboard-Bearbeitung' },
          { status: 403 }
        );
      }
    }

    // ── Einheit laden ─────────────────────────────────────────────────
    const einheit = await base44.entities.Einheiten.get(einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    const now = Date.now();

    // ── 1. Struktur-Lock (Tab 2 / Tab 7) ──────────────────────────────
    if (einheit.structural_lock && einheit.structural_lock !== user.email) {
      const lockAge = einheit.structural_locked_at
        ? now - new Date(einheit.structural_locked_at).getTime()
        : Infinity;
      if (lockAge < STRUCT_LOCK_TIMEOUT_MS) {
        const displayName = await resolveDisplayName(base44, einheit.structural_lock);
        return Response.json(
          {
            success: false,
            reason: 'unit_busy',
            scope: 'struktur',
            lockedByEmail: einheit.structural_lock,
            lockedByName: displayName,
          },
          { status: 409 }
        );
      }
    }

    // ── 2. Aktive Lernpaket-Locks anderer User (DB-seitig gefiltert) ──
    // FAIL-SAFE: Bei DB-Fehler propagieren wir den Fehler nach außen –
    // niemals leeres Array → falscher "alles frei"-Schluss.
    const aktiveLernpakete = await base44.asServiceRole.entities.Lernpakete.filter({
      einheit_id,
      is_locked: true,
    });
    const aktivesPaket = (aktiveLernpakete || []).find(
      (p) =>
        p.locked_by_email &&
        p.locked_by_email !== user.email &&
        p.locked_at &&
        now - new Date(p.locked_at).getTime() < PAKET_LOCK_TIMEOUT_MS
    );
    if (aktivesPaket) {
      const displayName = await resolveDisplayName(base44, aktivesPaket.locked_by_email);
      return Response.json(
        {
          success: false,
          reason: 'unit_busy',
          scope: 'lernpaket',
          lockedByEmail: aktivesPaket.locked_by_email,
          lockedByName: displayName,
        },
        { status: 409 }
      );
    }

    // ── 3. Aktive AllgemeineAufgabe-Locks anderer User ────────────────
    // Wir filtern DB-seitig auf "locked_by gesetzt UND nicht ich selbst".
    // Falls das SDK den $ne-Operator hier nicht unterstützt, erkennt der
    // try/catch das und wir fallen auf das Inhaber-Filter zurück + filtern
    // den eigenen User in JS heraus. KEIN stilles Verschlucken: bei
    // Datenbank-Fehlern werfen wir nach außen (Fail-Safe).
    let aktiveAufgaben;
    try {
      aktiveAufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({
        einheit_id,
        locked_by: { $ne: null },
      });
    } catch (_e) {
      // Fallback ohne $ne-Operator – immer noch DB-seitig stark eingeschränkt
      // gegenüber dem alten "alle Aufgaben der Einheit laden".
      aktiveAufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({
        einheit_id,
      });
      aktiveAufgaben = (aktiveAufgaben || []).filter((a) => !!a.locked_by);
    }
    const aktiveAufgabe = (aktiveAufgaben || []).find(
      (a) =>
        a.locked_by !== user.email &&
        a.locked_at &&
        now - new Date(a.locked_at).getTime() < AUFGABE_LOCK_TIMEOUT_MS
    );
    if (aktiveAufgabe) {
      const displayName = await resolveDisplayName(base44, aktiveAufgabe.locked_by);
      return Response.json(
        {
          success: false,
          reason: 'unit_busy',
          scope: 'aufgabe',
          lockedByEmail: aktiveAufgabe.locked_by,
          lockedByName: displayName,
        },
        { status: 409 }
      );
    }

    // ── Lock setzen + Verify (Race-Condition-Schutz) ──────────────────
    // Schritt A: schreiben.
    const isoNow = new Date().toISOString();
    await base44.entities.Einheiten.update(einheit_id, {
      structural_lock: user.email,
      structural_locked_at: isoNow,
    });

    // Schritt B: sofort re-readen. Falls in der Zwischenzeit ein paralleler
    // Konkurrent gewonnen hat (anderer Wert in structural_lock), brechen
    // wir hier ab. Wir überschreiben den Gewinner NICHT zurück, weil das
    // gerade dessen Lock kaputt machen würde.
    const verify = await base44.asServiceRole.entities.Einheiten.get(einheit_id);
    if (verify?.structural_lock !== user.email) {
      const winnerEmail = verify?.structural_lock || null;
      const displayName = await resolveDisplayName(base44, winnerEmail);
      return Response.json(
        {
          success: false,
          reason: 'race_lost',
          scope: 'struktur',
          lockedByEmail: winnerEmail,
          lockedByName: displayName,
        },
        { status: 409 }
      );
    }

    return Response.json({
      success: true,
      lockedBy: user.email,
      lockedAt: isoNow,
    });
  } catch (error) {
    console.error('[acquireDashboardLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});