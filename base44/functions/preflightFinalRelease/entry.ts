/**
 * preflightFinalRelease
 *
 * Phase B: Pre-Flight-Check, ob eine Einheit aktuell final freigegeben werden
 * darf. Sammelt ALLE aktiven Bearbeitungs-Locks der Einheit und gibt sie als
 * Liste zurück. Verändert NICHTS — Lese-Endpoint, idempotent.
 *
 * Payload: { einheitId: string }
 *
 * Antwort:
 *   {
 *     ok: boolean,                       // true = keine Live-Edits, Freigabe darf laufen
 *     activeLocks: [
 *       {
 *         scope: 'aufgabe' | 'lernpaket' | 'master_aufgabe' | 'structural',
 *         id: string,
 *         titel: string,
 *         user_email: string,
 *         locked_at: string|null,
 *       },
 *       ...
 *     ],
 *     dashboards: { minimalist, pragmatiker, ehrgeizig, passioniert: boolean },
 *     allDashboardsLocked: boolean,
 *   }
 *
 * RBAC: identisch zu setEinheitFreigabeStatus (Admin oder Fachschaftsleitung
 * im Fach der Einheit), damit der Dialog nur Berechtigte sehen.
 *
 * Lock-Definition (Stale-Schutz): Locks ohne `locked_at` werden ignoriert,
 * Locks älter als 60 Minuten gelten als abgelaufen.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STALE_LOCK_MINUTES = 60;
const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PFAD_LOCKED = 'locked_for_export';
const ROLLEN = { ADMIN: 'Administrator', FACHSCHAFT: 'Fachschaftsleitung' };

function isAdmin(authUser, profil) {
  if (authUser?.role === 'Administrator' || authUser?.role === 'admin') return true;
  return profil?.rolle === ROLLEN.ADMIN;
}
function isFachschaftFuerFach(profil, fach) {
  if (profil?.rolle !== ROLLEN.FACHSCHAFT) return false;
  const faecher = Array.isArray(profil.fachbereich_zustaendigkeit)
    ? profil.fachbereich_zustaendigkeit
    : [];
  return faecher.includes(fach);
}

function isLockActive(lockedAt) {
  if (!lockedAt) return false;
  const ts = new Date(lockedAt).getTime();
  if (isNaN(ts)) return false;
  return Date.now() - ts < STALE_LOCK_MINUTES * 60 * 1000;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { einheitId } = await req.json();
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });

    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // RBAC.
    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profil = profile?.[0] || null;
    const allowed = isAdmin(user, profil) || isFachschaftFuerFach(profil, einheit.fach);
    if (!allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Live-Locks sammeln ────────────────────────────────────────────────
    const activeLocks = [];

    // 1) Aufgaben (AllgemeineAufgabe.locked_by/locked_at).
    const aufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({
      einheit_id: einheitId,
    });
    const aufgabenById = new Map();
    for (const a of aufgaben || []) {
      aufgabenById.set(a.id, a);
      if (a.locked_by && isLockActive(a.locked_at)) {
        activeLocks.push({
          scope: 'aufgabe',
          id: a.id,
          titel: a.titel || '(ohne Titel)',
          user_email: a.locked_by,
          locked_at: a.locked_at || null,
        });
      }
    }

    // 2) Lernpakete (Lernpakete.locked_by_email/locked_at; gefiltert über
    //    die zwei möglichen FK-Pfade — direkt an der Einheit oder via
    //    Themenfeld → Einheit). DB-seitig laden, nicht global per .list().
    const themenfelder = await base44.asServiceRole.entities.Themenfeld.filter({
      einheit_id: einheitId,
    });
    const themenfeldIdsArr = (themenfelder || []).map((t) => t.id);
    const [lpByEinheit, lpByThemenfeld] = await Promise.all([
      base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId }),
      themenfeldIdsArr.length > 0
        ? base44.asServiceRole.entities.Lernpakete.filter({ themenfeld_id: { $in: themenfeldIdsArr } })
        : Promise.resolve([]),
    ]);
    const lernpaketeMap = new Map();
    for (const lp of [...(lpByEinheit || []), ...(lpByThemenfeld || [])]) {
      lernpaketeMap.set(lp.id, lp);
    }
    const lernpakete = Array.from(lernpaketeMap.values());
    const lernpaketIds = new Set(lernpakete.map((lp) => lp.id));
    for (const lp of lernpakete) {
      if (lp.is_locked && lp.locked_by_email && isLockActive(lp.locked_at)) {
        activeLocks.push({
          scope: 'lernpaket',
          id: lp.id,
          titel: lp.titel_des_pakets || '(unbenanntes Paket)',
          user_email: lp.locked_by_email,
          locked_at: lp.locked_at || null,
        });
      }
    }

    // 3) Master-Aufgaben (MasterAufgabe.lock_status + locked_by_user;
    //    DB-seitig auf die Pakete dieser Einheit eingrenzen).
    if (lernpaketIds.size > 0) {
      const masters = await base44.asServiceRole.entities.MasterAufgabe.filter({
        lernpaket_id: { $in: Array.from(lernpaketIds) },
      });
      for (const m of masters || []) {
        if (!m.lock_status || !m.locked_by_user) continue;
        if (!isLockActive(m.locked_at)) continue;
        activeLocks.push({
          scope: 'master_aufgabe',
          id: m.id,
          titel: m.titel || '(Master-Aufgabe)',
          user_email: m.locked_by_user,
          locked_at: m.locked_at || null,
        });
      }
    }

    // 4) Structural Lock (Tab 7 / Struktur).
    if (
      einheit.structural_lock &&
      einheit.structural_lock !== user.email &&
      isLockActive(einheit.structural_locked_at)
    ) {
      activeLocks.push({
        scope: 'structural',
        id: einheit.id,
        titel: 'Strukturbearbeitung der Einheit',
        user_email: einheit.structural_lock,
        locked_at: einheit.structural_locked_at || null,
      });
    }

    // ── Dashboard-Status (für UI-Anzeige im Dialog) ───────────────────────
    const memberships = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
      einheit_id: einheitId,
    });
    const lockedSet = new Set(
      (memberships || []).filter((m) => m.pfad_status === PFAD_LOCKED).map((m) => m.lerntyp)
    );
    const dashboards = VALID_LERNTYPEN.reduce((acc, lt) => {
      acc[lt] = lockedSet.has(lt);
      return acc;
    }, {});
    const allDashboardsLocked = VALID_LERNTYPEN.every((lt) => dashboards[lt]);

    return Response.json({
      ok: activeLocks.length === 0,
      activeLocks,
      dashboards,
      allDashboardsLocked,
    });
  } catch (error) {
    console.error('[preflightFinalRelease] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});