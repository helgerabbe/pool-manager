/**
 * getLernpfadDriftReport
 *
 * Phase E.3 — Read-only-Endpoint, der den aktuellen Drift-Report einer
 * Einheit zurückliefert, OHNE den Sync-Prozess (Junction-Cleanup) zu
 * triggern. Wird vom Cockpit (Tab 7) und später vom Freigabe-Cockpit
 * (Tab 8) beim Aufmachen aufgerufen, damit Sektor-Badges sofort
 * sichtbar sind, ohne erst einen Save auslösen zu müssen.
 *
 * Vergleichslogik (Single Source of Truth: lib/sektorSignature.js):
 *   - clean         : aktueller Hash == eingefrorene last_export_signature
 *   - drifted       : eingefrorene Signatur vorhanden, weicht ab
 *   - never_locked  : noch keine Signatur eingefroren
 *
 * Payload: { einheitId: string }
 * Auth   : eingeloggter Nutzer (reine Read-Operation, keine Mutation)
 *
 * Response:
 *   { ok: true, drift_report: { [lerntyp]: { [sektor_id]: status } } }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PAGE_SIZE = 500;

async function listAllByFilter(entity, query, sort = 'created_date') {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, sort, PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

// ── Sektor-Signature-Hash (inline) ─────────────────────────────────
// Synchron halten mit src/lib/sektorSignature.js, functions/setLernpfadStatus
// und functions/syncLernpfadMembership. Backend-Functions dürfen keine
// lokalen Imports verwenden (NO LOCAL IMPORTS). Änderungen IMMER an
// allen Stellen vornehmen, sonst driften die Hashes auseinander.
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

function buildDriftReport(konfiguration, memberships) {
  const idx = new Map();
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
      const frozenSig = memb.find((m) => m.last_export_signature)?.last_export_signature || null;
      if (!frozenSig) {
        report[lerntyp][sektor.sektor_id] = 'never_locked';
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

    const body = await req.json().catch(() => ({}));
    const { einheitId } = body;
    if (!einheitId) {
      return Response.json({ error: 'einheitId required' }, { status: 400 });
    }

    const einheit = await base44.entities.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const memberships = await listAllByFilter(
      base44.asServiceRole.entities.LernpfadAufgabeMembership,
      { einheit_id: einheit.id }
    );
    const drift_report = buildDriftReport(einheit.lernpfade_konfiguration || {}, memberships);

    return Response.json({ ok: true, drift_report });
  } catch (error) {
    console.error('[getLernpfadDriftReport] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});