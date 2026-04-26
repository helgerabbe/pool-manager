/**
 * acquireDashboardLockSecure.js
 *
 * Spezialisierter Lock-Erwerb für Tab 7 (Dashboards / Lernpfad-Architekt).
 *
 * Unterschied zu `acquireStructuralLockSecure`:
 *   Zusätzlich zum Struktur-Lock (Tab 2) werden hier auch alle
 *   *Inhalts-Locks* der Einheit geprüft – konkret:
 *     - Aktive `Lernpakete`-Locks (is_locked + locked_by_email + locked_at < 30 Min)
 *     - Aktive `AllgemeineAufgabe`-Locks (locked_by + locked_at < 60 Min)
 *
 *   Sobald irgendein anderer Nutzer in der Einheit aktiv arbeitet, wird der
 *   Lock-Erwerb verweigert und der konkrete Name (vorname + nachname, Fallback:
 *   E-Mail) zurückgegeben, damit das Frontend eine sinnvolle Meldung anzeigen
 *   kann.
 *
 * Erfolgreich → setzt `structural_lock` + `structural_locked_at` auf der Einheit
 * (gleiche Mechanik wie Struktur-Lock; daher kompatibel zum bestehenden
 * `releaseStructuralLockSecure`).
 *
 * Aufruf:
 *   await base44.functions.invoke('acquireDashboardLockSecure', { einheit_id })
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
    // ignore
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

    // ── 2. Aktive Lernpaket-Locks anderer User ────────────────────────
    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({
      einheit_id,
    });
    const aktivesPaket = (lernpakete || []).find(
      (p) =>
        p.is_locked &&
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
    let aktiveAufgaben = [];
    try {
      aktiveAufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({
        einheit_id,
      });
    } catch (_e) {
      aktiveAufgaben = [];
    }
    const aktiveAufgabe = (aktiveAufgaben || []).find(
      (a) =>
        a.locked_by &&
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

    // ── Lock setzen ───────────────────────────────────────────────────
    const isoNow = new Date().toISOString();
    await base44.entities.Einheiten.update(einheit_id, {
      structural_lock: user.email,
      structural_locked_at: isoNow,
    });

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