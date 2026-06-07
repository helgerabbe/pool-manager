/**
 * getEinheitenMetricsSecure.js
 *
 * Liefert pro Einheit die Volumen-Metriken und den Dashboard-Bearbeitungs-
 * status der 4 Lerntypen für die Kachel-Übersicht. Read-Time-Berechnung
 * mit Bulk-Fetch:
 * - 1× Themenfeld.list   (alle Einheiten)
 * - 1× Lernpakete.list   (alle Einheiten)
 * - 1× AllgemeineAufgabe.list (alle Einheiten)
 * - 1× Einheiten.list    (für lernpfade_konfiguration der angefragten Einheiten)
 *
 * Reihenfolge skaliert in N(entitäten) — NICHT in N(einheiten) × ... .
 *
 * Payload:
 *   { einheitIds: string[] }
 *
 * Response:
 *   {
 *     success: true,
 *     metrics: {
 *       <einheitId>: {
 *         volume: { themenfelder, lernpakete, level2, level3 },
 *         dashboardStatus: { minimalist, pragmatiker, ehrgeizig, passioniert }
 *           // jeweils 'vorlage' | 'bearbeitet' | 'fertig'
 *       }
 *     }
 *   }
 *
 * Status-Regel pro Lerntyp:
 *   1. 'fertig': Pfad formal freigegeben (alle Memberships in
 *      LernpfadAufgabeMembership für diese (einheit_id, lerntyp) haben
 *      pfad_status='locked_for_export' UND es gibt mindestens eine).
 *   2. 'bearbeitet': mindestens ein echter Einheits-Inhalt (Lernpaket oder
 *      AllgemeineAufgabe, ohne Tombstones) ist als Aufgaben-Item in einem
 *      Sektor platziert.
 *   3. 'vorlage': sonst (leer / Standard-Vorlage, noch nicht bearbeitet).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LERN_TYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PAGE_SIZE = 500;
const MAX_EINHEIT_IDS = 100;

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

function createEmptyVolume() {
  return { themenfelder: 0, lernpakete: 0, aktivitaeten: 0, level2: 0, level3: 0 };
}

// ── Status-Ableitung pro Lerntyp ──
// Drei Zustände für die Kachel-Badges:
//   'vorlage'    = noch unbearbeitet (Standard-Vorlage, keine echten Inhalte
//                  im Pfad platziert).
//   'bearbeitet' = es wurde bereits am Dashboard gearbeitet (mindestens ein
//                  echter Einheits-Inhalt im Pfad platziert), aber noch nicht
//                  freigegeben.
//   'fertig'     = Pfad formal freigegeben (wird im Aufrufer über die
//                  Membership-Locks gesetzt).
function calcDashboardStatusForLerntyp(sektoren, totalContentIds) {
  if (!Array.isArray(sektoren) || sektoren.length === 0) return 'vorlage';

  // Signal 1: Mindestens ein echter Einheits-Inhalt (Lernpaket/Aufgabe) ist
  // als Item in einem Sektor platziert.
  if (totalContentIds.size > 0) {
    for (const sektor of sektoren) {
      const items = Array.isArray(sektor?.items) ? sektor.items : [];
      for (const item of items) {
        if (!item || item.type !== 'aufgabe' || !item.ref_id) continue;
        if (totalContentIds.has(item.ref_id)) return 'bearbeitet';
      }
    }
  }

  // Signal 2: Die Lehrkraft hat das Dashboard strukturell an die Einheit
  // angepasst. Die reine Standard-Vorlage enthält nur einen *Muster*-
  // Arbeitsphase-Sektor OHNE Themenfeld-Bindung. Sobald ein Arbeitsphase-
  // Sektor an ein konkretes Themenfeld gebunden ist (themenfeld_id gesetzt),
  // wurde die Vorlage bewusst auf diese Einheit angewendet/bearbeitet —
  // auch wenn noch keine echte Aufgabe platziert ist.
  for (const sektor of sektoren) {
    if (sektor?.sektor_typ === 'arbeitsphase_themenfeld' && sektor?.themenfeld_id) {
      return 'bearbeitet';
    }
  }

  return 'vorlage';
}

// ── Volumen-Metriken pro Einheit ──
function calcVolume(themenfelderForEinheit, lernpaketeForEinheit, aufgabenForEinheit) {
  // Level 3: projekt_anker ODER anforderungsebene='3 - Projekt'
  // Level 2: alle anderen sichtbaren Aufgaben (inhalt, handlung, auswahl_buendel, buendel)
  let level2 = 0;
  let level3 = 0;
  for (const a of aufgabenForEinheit) {
    if (a.sync_status === 'to_delete') continue;
    const typ = a.aufgaben_typ || 'inhalt';
    const isProjekt = typ === 'projekt_anker' || a.anforderungsebene === '3 - Projekt';
    if (isProjekt) {
      level3 += 1;
    } else if (typ === 'inhalt' || typ === 'handlung' || typ === 'auswahl_buendel') {
      level2 += 1;
    }
  }
  return {
    themenfelder: themenfelderForEinheit.length,
    lernpakete: lernpaketeForEinheit.length,
    level2,
    level3,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const einheitIds = Array.isArray(payload?.einheitIds)
      ? [...new Set(payload.einheitIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))].slice(0, MAX_EINHEIT_IDS)
      : [];
    if (einheitIds.length === 0) {
      return Response.json({ success: true, metrics: {} }, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Einheiten zuerst im User-Kontext laden: RLS filtert unautorisierte IDs heraus.
    const einheiten = await listAllByFilter(
      base44.entities.Einheiten,
      { id: { $in: einheitIds } }
    );
    const authorizedEinheitIds = einheiten.map((einheit) => einheit.id);

    if (authorizedEinheitIds.length === 0) {
      const metrics = {};
      for (const id of einheitIds) {
        metrics[id] = {
          volume: createEmptyVolume(),
          dashboardStatus: { minimalist: 'vorlage', pragmatiker: 'vorlage', ehrgeizig: 'vorlage', passioniert: 'vorlage' },
        };
      }
      return Response.json({ success: true, metrics }, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    // Folgeabfragen nur für bereits autorisierte Einheiten; vollständig paginiert.
    const [themenfelder, lernpakete, allgemeineAufgaben, memberships] = await Promise.all([
      listAllByFilter(base44.asServiceRole.entities.Themenfeld, { einheit_id: { $in: authorizedEinheitIds } }),
      listAllByFilter(base44.asServiceRole.entities.Lernpakete, { einheit_id: { $in: authorizedEinheitIds } }),
      listAllByFilter(base44.asServiceRole.entities.AllgemeineAufgabe, { einheit_id: { $in: authorizedEinheitIds } }),
      listAllByFilter(base44.asServiceRole.entities.LernpfadAufgabeMembership, { einheit_id: { $in: authorizedEinheitIds } }),
    ]);

    // Aktivitäten werden über die Lernpakete dieser autorisierten Einheiten gezogen.
    const lernpaketIds = lernpakete.map((lp) => lp.id);
    const aktivitaeten = lernpaketIds.length > 0
      ? await listAllByFilter(
          base44.asServiceRole.entities.LernpaketPhaseAktivitaet,
          { lernpaket_id: { $in: lernpaketIds } }
        )
      : [];

    // Aggregat: hat jede (einheit_id, lerntyp)-Kombi mind. 1 Membership UND
    // sind ALLE auf 'locked_for_export'? Wenn ja → Pfad ist freigegeben.
    // Map<einheitId, Map<lerntyp, { total, locked }>>
    const lockedPathsByEinheit = new Map();
    for (const id of authorizedEinheitIds) {
      lockedPathsByEinheit.set(id, new Map());
    }
    for (const m of memberships) {
      const map = lockedPathsByEinheit.get(m.einheit_id);
      if (!map) continue;
      const cur = map.get(m.lerntyp) || { total: 0, locked: 0 };
      cur.total += 1;
      if (m.pfad_status === 'locked_for_export') cur.locked += 1;
      map.set(m.lerntyp, cur);
    }

    // Gruppieren pro Einheit.
    const themenfelderByEinheit = new Map();
    const lernpaketeByEinheit = new Map();
    const aufgabenByEinheit = new Map();
    const aktivitaetenByEinheit = new Map();
    for (const id of authorizedEinheitIds) {
      themenfelderByEinheit.set(id, []);
      lernpaketeByEinheit.set(id, []);
      aufgabenByEinheit.set(id, []);
      aktivitaetenByEinheit.set(id, 0);
    }
    for (const t of themenfelder) {
      const arr = themenfelderByEinheit.get(t.einheit_id);
      if (arr) arr.push(t);
    }
    // Lookup: lernpaket_id → einheit_id
    const lernpaketToEinheit = new Map();
    for (const lp of lernpakete) {
      const arr = lernpaketeByEinheit.get(lp.einheit_id);
      if (arr) arr.push(lp);
      lernpaketToEinheit.set(lp.id, lp.einheit_id);
    }
    for (const a of allgemeineAufgaben) {
      const arr = aufgabenByEinheit.get(a.einheit_id);
      if (arr) arr.push(a);
    }
    for (const akt of aktivitaeten) {
      if (akt.sync_status === 'to_delete') continue;
      const einheitId = lernpaketToEinheit.get(akt.lernpaket_id);
      if (einheitId && aktivitaetenByEinheit.has(einheitId)) {
        aktivitaetenByEinheit.set(einheitId, aktivitaetenByEinheit.get(einheitId) + 1);
      }
    }

    // Pro Einheit Metriken berechnen.
    const metrics = {};
    for (const einheit of einheiten) {
      const id = einheit.id;
      const tfs = themenfelderByEinheit.get(id) || [];
      const lps = lernpaketeByEinheit.get(id) || [];
      const aufs = aufgabenByEinheit.get(id) || [];

      // Set aller "echten Inhalte" der Einheit (Lernpakete + Aufgaben),
      // gegen das wir die Pfad-Items abgleichen. Tombstones zählen nicht.
      const totalContentIds = new Set();
      for (const lp of lps) {
        if (lp.sync_status === 'to_delete') continue;
        totalContentIds.add(lp.id);
      }
      for (const a of aufs) {
        if (a.sync_status === 'to_delete') continue;
        totalContentIds.add(a.id);
      }

      const konfig = einheit.lernpfade_konfiguration || {};
      const lockedMap = lockedPathsByEinheit.get(id) || new Map();
      const dashboardStatus = {};
      for (const lt of LERN_TYPEN) {
        // Regel 1: Pfad formal freigegeben → 'fertig'.
        const lock = lockedMap.get(lt);
        const isPathLocked = lock && lock.total > 0 && lock.locked === lock.total;
        if (isPathLocked) {
          dashboardStatus[lt] = 'fertig';
          continue;
        }
        // Regel 2: 'vorlage' (unbearbeitet) oder 'bearbeitet'.
        dashboardStatus[lt] = calcDashboardStatusForLerntyp(konfig[lt], totalContentIds);
      }

      const volume = calcVolume(tfs, lps, aufs);
      volume.aktivitaeten = aktivitaetenByEinheit.get(id) || 0;
      metrics[id] = { volume, dashboardStatus };
    }

    // Für nicht aufgelöste IDs (z.B. RBAC-blockiert) leere Metrik liefern.
    for (const id of einheitIds) {
      if (!metrics[id]) {
        metrics[id] = {
          volume: createEmptyVolume(),
          dashboardStatus: { minimalist: 'vorlage', pragmatiker: 'vorlage', ehrgeizig: 'vorlage', passioniert: 'vorlage' },
        };
      }
    }

    return Response.json({ success: true, metrics }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('[getEinheitenMetricsSecure] error:', err);
    return Response.json(
      { error: err?.message || 'Internal server error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});