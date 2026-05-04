/**
 * syncLernpfadMembership
 *
 * Idempotente Synchronisation der Junction-Tabelle `LernpfadAufgabeMembership`
 * mit der `lernpfade_konfiguration` einer Einheit.
 *
 * Wird vom Cockpit (Tab 7) nach jedem Save aufgerufen. Hält den `pfad_status`
 * bestehender Einträge stabil (locked_for_export ↔ draft) und legt nur fehlende
 * Memberships als `draft` an. Memberships, deren Aufgabe nicht mehr im Pfad
 * vorkommt, werden gelöscht (CASCADE bei Item-Removal).
 *
 * Payload: { einheitId: string }
 * Auth   : eingeloggter Nutzer (RBAC für Edit kommt aus dem Structural-Lock).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

// ── Phase E.3: Sektor-Signature-Hash (inline) ──────────────────────
// Synchron halten mit src/lib/sektorSignature.js und der Inline-Kopie
// in functions/setLernpfadStatus. Backend-Functions dürfen keine
// lokalen Imports verwenden (siehe Coding-Instruktionen). Änderungen
// IMMER an ALLEN drei Stellen vornehmen, sonst driften die Hashes
// auseinander und alle bestehenden Locks würden False-Positive-Drift
// melden.
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

/**
 * Berechnet den Drift-Report einer kompletten Lernpfad-Konfiguration.
 *
 * Für jeden Sektor wird:
 *  - die aktuelle Signatur berechnet
 *  - mit der `last_export_signature` der Memberships im Sektor verglichen
 *
 * Ergebnis pro Sektor:
 *   - 'clean'         : aktueller Hash == eingefrorene Signatur
 *   - 'drifted'       : eingefrorene Signatur vorhanden, weicht ab
 *   - 'never_locked'  : noch keine Signatur eingefroren (Sektor nie gelockt
 *                       oder Lock vor Phase E vergeben)
 *
 * Signaturen werden pro Membership eingefroren, sind aber pro Sektor
 * identisch. Wir nehmen daher die Signatur des ersten Membership im
 * Sektor als Referenz; gibt es keine Memberships (z. B. Sektor enthält
 * nur System-Bausteine), gilt der Sektor als 'never_locked', solange
 * der pfad_status nicht locked_for_export ist — sonst 'clean' (es gibt
 * keine inhaltlichen Aufgaben, die driften könnten).
 *
 * Format:
 *   { [lerntyp]: { [sektor_id]: 'clean'|'drifted'|'never_locked' } }
 */
function buildDriftReport(konfiguration, memberships) {
  // Index Memberships für O(1)-Lookup pro (lerntyp, sektor_id).
  const idx = new Map(); // key: `${lerntyp}::${sektor_id}` → array<membership>
  for (const m of memberships || []) {
    const key = `${m.lerntyp}::${m.sektor_id}`;
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(m);
  }

  const report = {};
  for (const lerntyp of VALID_LERNTYPEN) {
    const sektoren = Array.isArray(konfiguration?.[lerntyp]) ? konfiguration[lerntyp] : [];
    report[lerntyp] = {};
    for (const sektor of sektoren) {
      if (!sektor?.sektor_id) continue;
      const currentSig = computeSektorSignature(sektor);
      const memb = idx.get(`${lerntyp}::${sektor.sektor_id}`) || [];
      // Repräsentative Signatur aus den Memberships (alle gleich pro Sektor).
      const frozenSig = memb.find((m) => m.last_export_signature)?.last_export_signature || null;
      const isLocked = memb.some((m) => m.pfad_status === 'locked_for_export');

      if (!frozenSig) {
        // Keine eingefrorene Signatur. Bei locked_for_export ohne Hash
        // (Legacy-Locks aus der Zeit vor Phase E) weisen wir 'never_locked'
        // aus — das nächste setLernpfadStatus beim erneuten Lock befüllt
        // dann den Hash nach.
        report[lerntyp][sektor.sektor_id] = isLocked ? 'never_locked' : 'never_locked';
        continue;
      }
      report[lerntyp][sektor.sektor_id] = currentSig === frozenSig ? 'clean' : 'drifted';
    }
  }
  return report;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId } = await req.json();
    if (!einheitId) {
      return Response.json({ error: 'einheitId required' }, { status: 400 });
    }

    // Aktuellen Stand der Einheit laden (asServiceRole, damit auch ohne RLS-Zugriff
    // gelesen werden kann – die Schreibrechte werden ohnehin clientseitig durchs Lock geprüft).
    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const konfig = einheit.lernpfade_konfiguration || {};

    // SOLL-Zustand aus der konfiguration ableiten:
    // Map<aufgabe_id, Map<lerntyp, sektor_id>>
    const desired = new Map();
    for (const lerntyp of VALID_LERNTYPEN) {
      const sektoren = Array.isArray(konfig[lerntyp]) ? konfig[lerntyp] : [];
      for (const sektor of sektoren) {
        const items = Array.isArray(sektor?.items) ? sektor.items : [];
        for (const item of items) {
          if (!item || item.type !== 'aufgabe' || !item.ref_id) continue;
          if (!desired.has(item.ref_id)) desired.set(item.ref_id, new Map());
          desired.get(item.ref_id).set(lerntyp, sektor.sektor_id);
        }
      }
    }

    // IST-Zustand: alle Memberships dieser Einheit laden.
    const existing = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
      einheit_id: einheitId,
    });

    const summary = { created: 0, updated: 0, deleted: 0 };

    // 1. Bestehende durchgehen → entweder behalten/aktualisieren oder löschen.
    for (const m of existing || []) {
      const desiredForAufgabe = desired.get(m.aufgabe_id);
      const desiredSektor = desiredForAufgabe?.get(m.lerntyp);

      if (!desiredSektor) {
        // Aufgabe ist in diesem Lerntyp nicht mehr enthalten → löschen.
        await base44.asServiceRole.entities.LernpfadAufgabeMembership.delete(m.id);
        summary.deleted += 1;
        continue;
      }

      // Eintrag bleibt – ggf. sektor_id anpassen, pfad_status NIEMALS verändern.
      // Phase G: Wenn die Aufgabe in einen anderen Sektor wandert, gilt das
      // als "Lehrkraft hat den Pfad überarbeitet" → export_error zurücksetzen.
      if (m.sektor_id !== desiredSektor) {
        await base44.asServiceRole.entities.LernpfadAufgabeMembership.update(m.id, {
          sektor_id: desiredSektor,
          export_error: false,
        });
        summary.updated += 1;
      }

      // Aus desired entfernen, damit am Ende nur noch fehlende übrig bleiben.
      desiredForAufgabe.delete(m.lerntyp);
      if (desiredForAufgabe.size === 0) desired.delete(m.aufgabe_id);
    }

    // 2. Restliche desired-Einträge sind neu anzulegen (immer als 'draft').
    for (const [aufgabe_id, lerntypMap] of desired.entries()) {
      for (const [lerntyp, sektor_id] of lerntypMap.entries()) {
        await base44.asServiceRole.entities.LernpfadAufgabeMembership.create({
          einheit_id: einheitId,
          aufgabe_id,
          lerntyp,
          sektor_id,
          pfad_status: 'draft',
        });
        summary.created += 1;
      }
    }

    // ── Phase E.3: Drift-Report ableiten ──────────────────────────────
    // Wir laden die Memberships nach dem Sync neu, damit auch frisch
    // angelegte Einträge im Report auftauchen. Reine Read-Operation,
    // keine zusätzlichen Mutationen.
    const refreshedMemberships = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
      einheit_id: einheitId,
    });
    const drift_report = buildDriftReport(konfig, refreshedMemberships);

    return Response.json({ ok: true, summary, drift_report });
  } catch (error) {
    console.error('[syncLernpfadMembership] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});