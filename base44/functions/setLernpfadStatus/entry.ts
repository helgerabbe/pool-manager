/**
 * setLernpfadStatus
 *
 * Atomares Lock/Unlock eines Lernpfads (Einheit + Lerntyp).
 *
 * Payload:
 *   { einheitId: string, lerntyp: 'minimalist'|'pragmatiker'|'ehrgeizig'|'passioniert',
 *     newStatus: 'locked_for_export' | 'draft' }
 *
 * Verhalten:
 *   - newStatus === 'locked_for_export':
 *       Erlaubt für Administrator, FACHSCHAFT (im Fach der Einheit),
 *       sowie Unit-LEITUNG. Setzt pfad_status auf 'locked_for_export'
 *       für alle Memberships dieser (einheit, lerntyp).
 *       Voraussetzung clientseitig: Pre-Flight (alle Items grün).
 *       Server validiert die Existenz mindestens eines Memberships nicht
 *       erneut (idempotent: leerer Pfad → 0 Updates, ok).
 *   - newStatus === 'draft':
 *       Entsperren. STRENGER: nur Administrator + FACHSCHAFT (im Fach).
 *       Unit-LEITUNG darf NICHT entsperren.
 *
 * Antwort: { ok: true, updated: number, lerntyp, newStatus }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Inline-Logger (NO LOCAL IMPORTS für Backend-Functions).
 * Schreibt non-blocking ins AuditLog. Bei Fehlern nur console-warn.
 */
async function logAuditEvent(base44, event) {
  try {
    if (!event.user || !event.action || !event.resource || !event.resourceId || !event.status) {
      console.warn('[AUDIT] incomplete event', event);
      return;
    }
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      ip_address: event.ip || null,
      status: event.status,
      error_message: event.errorMessage || null,
    });
    console.log(`[AUDIT] ${event.user} → ${event.action} ${event.resource}:${event.resourceId}`);
  } catch (err) {
    console.error('[AUDIT_ERROR]', err.message);
  }
}

// Synchron halten mit src/lib/pfadStatus.js (NO LOCAL IMPORTS in Backend-Functions).
const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PFAD_STATUS_LOCKED = 'locked_for_export';
const PFAD_STATUS_DRAFT = 'draft';
const VALID_STATUS = [PFAD_STATUS_LOCKED, PFAD_STATUS_DRAFT];

// ── Phase E.1/E.2: Sektor-Signature-Hash (inline) ──────────────────
// Synchron halten mit src/lib/sektorSignature.js. Backend-Functions
// dürfen keine lokalen Imports verwenden (siehe Coding-Instruktionen),
// daher liegt hier eine bewusste Duplikation der Hash-Logik. Änderungen
// IMMER an beiden Stellen vornehmen, sonst driften die Hashes auseinander
// und alle bestehenden Locks würden False-Positive-Drift melden.
function _canonicalize(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(_canonicalize).join(',') + ']';
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + _canonicalize(value[k])).join(',') + '}';
  }
  return 'null';
}
function _fnv1a64Hex(str) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}
function _normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;
  const out = {
    type: item.type ?? null,
    ref_id: item.ref_id ?? null,
    parent_instance_id: item.parent_instance_id ?? null,
  };
  const bc = item.bundle_config;
  if (bc && typeof bc === 'object') {
    const bcOut = {};
    if (typeof bc.erforderliche_anzahl === 'number') bcOut.erforderliche_anzahl = bc.erforderliche_anzahl;
    if (typeof bc.modus === 'string') bcOut.modus = bc.modus;
    if (Object.keys(bcOut).length > 0) out.bundle_config = bcOut;
  }
  return out;
}
function computeSektorSignature(sektor) {
  if (!sektor || typeof sektor !== 'object') return _fnv1a64Hex('null');
  const items = Array.isArray(sektor.items) ? sektor.items : [];
  const normalized = {
    sektor_typ: sektor.sektor_typ ?? null,
    themenfeld_id: sektor.themenfeld_id ?? null,
    items: items.map(_normalizeItem).filter(Boolean),
  };
  return _fnv1a64Hex(_canonicalize(normalized));
}

// In Deno gibt es kein Path-Alias '@/...'. Wir duplizieren die wenigen
// RBAC-Konstanten lokal, damit die Function ohne lokale Imports auskommt
// (siehe Backend-Coding-Instruktionen: NO LOCAL IMPORTS).
const ROLLEN = {
  ADMIN: 'Administrator',
  FACHSCHAFT: 'Fachschaftsleitung',
  LEHRKRAFT: 'Fachlehrkraft',
};

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

async function isUnitLeitung(base44, einheitId, userEmail) {
  const members = await base44.asServiceRole.entities.EinheitMembers.filter({
    einheit_id: einheitId,
    user_email: userEmail,
    unit_role: 'LEITUNG',
  });
  return Array.isArray(members) && members.length > 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, lerntyp, newStatus } = await req.json();
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });
    if (!VALID_LERNTYPEN.includes(lerntyp)) {
      return Response.json({ error: 'invalid lerntyp' }, { status: 400 });
    }
    if (!VALID_STATUS.includes(newStatus)) {
      return Response.json({ error: 'invalid newStatus' }, { status: 400 });
    }

    // Einheit laden, um das Fach für RBAC zu kennen.
    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // ── Lifecycle Hard-Lock ────────────────────────────────────────────
    // Sobald die Einheit final freigegeben oder im Export ist, dürfen
    // einzelne Sektor-Pfade nicht mehr ent-/gesperrt werden — sonst
    // entstünden Inkonsistenzen mit dem Einheits-Status (z. B. Aufhebung
    // einzelner Dashboards trotz finaler Freigabe).
    // Synchron halten mit src/lib/exportLifecycle.js#isContentLocked.
    const lifecycleStatus = einheit.export_lifecycle_status || 'draft';
    if (lifecycleStatus === 'final_freigegeben' || lifecycleStatus === 'export_running') {
      return Response.json(
        {
          error:
            'Die Einheit ist final freigegeben und gesperrt. Einzelne Dashboards können nicht entsperrt werden, solange die Einheit-Freigabe aktiv ist.',
          code: 'EINHEIT_FINAL_LOCKED',
          lifecycleStatus,
        },
        { status: 423 }
      );
    }

    // Profil des Users laden (für rolle/faecher).
    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profil = profile?.[0] || null;

    // ── RBAC ────────────────────────────────────────────────────────────
    const fach = einheit.fach;
    const admin = isAdmin(user, profil);
    const fachschaft = isFachschaftFuerFach(profil, fach);
    let allowed = admin || fachschaft;

    if (!allowed && newStatus === PFAD_STATUS_LOCKED) {
      // LEITUNG darf zusätzlich nur LOCK ausführen, nicht UNLOCK.
      allowed = await isUnitLeitung(base44, einheitId, user.email);
    }

    if (!allowed) {
      return Response.json(
        { error: 'Forbidden: nicht berechtigt für diese Aktion' },
        { status: 403 }
      );
    }

    // ── Phase E.2: Sektor-Signaturen für den Lerntyp einfrieren ────────
    // Wir berechnen sie nur beim LOCK-Übergang. Beim UNLOCK bleibt die
    // last_export_signature absichtlich erhalten — sie ist der Anker
    // für den späteren Drift-Vergleich nach erneuter Bearbeitung.
    let sektorSignatureMap = null;
    if (newStatus === PFAD_STATUS_LOCKED) {
      const konfig = einheit.lernpfade_konfiguration || {};
      const sektoren = Array.isArray(konfig[lerntyp]) ? konfig[lerntyp] : [];
      sektorSignatureMap = new Map();
      for (const sektor of sektoren) {
        if (!sektor?.sektor_id) continue;
        sektorSignatureMap.set(sektor.sektor_id, computeSektorSignature(sektor));
      }
    }

    // ── Update ──────────────────────────────────────────────────────────
    const memberships = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
      einheit_id: einheitId,
      lerntyp,
    });

    const nowIso = new Date().toISOString();
    let updated = 0;
    for (const m of memberships || []) {
      const patch = {};
      if (m.pfad_status !== newStatus) {
        patch.pfad_status = newStatus;
      }
      if (newStatus === PFAD_STATUS_LOCKED) {
        // Beim Lock: Signatur des Sektors einfrieren + geprueft_at setzen.
        const sig = sektorSignatureMap?.get(m.sektor_id) || null;
        if (sig && m.last_export_signature !== sig) {
          patch.last_export_signature = sig;
        }
        if (!m.geprueft_at) {
          patch.geprueft_at = nowIso;
        }
      }
      if (Object.keys(patch).length === 0) continue;
      await base44.asServiceRole.entities.LernpfadAufgabeMembership.update(m.id, patch);
      updated += 1;
    }

    // ── Audit Log (non-blocking) ────────────────────────────────────────
    await logAuditEvent(base44, {
      user: user.email,
      action: 'PUBLISH', // semantisch passend für Freigabe-/Entzug-Vorgänge
      resource: 'LernpfadAufgabeMembership',
      resourceId: `${einheitId}:${lerntyp}`,
      changes: {
        event: newStatus === PFAD_STATUS_LOCKED ? 'pfad_locked' : 'pfad_unlocked',
        lerntyp,
        einheit_id: einheitId,
        fach,
        affected_memberships: memberships?.length || 0,
        updated,
      },
      affectedCount: updated,
      status: 'success',
    });

    return Response.json({ ok: true, updated, lerntyp, newStatus });
  } catch (error) {
    console.error('[setLernpfadStatus] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});