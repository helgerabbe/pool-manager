/**
 * getEinheitenMetricsSecure.js
 *
 * Liefert pro Einheit die Volumen-Metriken und die 4 Dashboard-Fortschritte
 * für die Kachel-Übersicht. Read-Time-Berechnung mit Bulk-Fetch:
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
 *         progress: { minimalist, pragmatiker, ehrgeizig, passioniert }  // 0..100
 *       }
 *     }
 *   }
 *
 * Punkte-Regeln (Workstream 3 – verschärft):
 *   - System-Baustein, der KEIN Platzhalter ist        → 1 Punkt
 *   - Platzhalter (sys_platzhalter_*)                  → 0 Punkte
 *   - Aufgaben-Item mit Ampel GREEN UND Export-freigegeben (sync_status === 'synced')
 *                                                       → 1 Punkt
 *   - Alle anderen Aufgaben-Items                      → 0 Punkte
 *   - Leeres Sektor-Array                              → 0%
 *
 * "Export-freigegeben" = sync_status, moodle_sync_status oder brian_sync_status
 * der Aufgabe steht auf 'synced' (= bereits live in Moodle/Brian).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLATZHALTER_PREFIX = 'sys_platzhalter_';
const LERN_TYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

// ── Ampel-Logik (gespiegelt von lib/ampelLogic.js, da functions keine lokalen Imports erlauben) ──
const AMPEL_GREEN = 'green';
const AMPEL_YELLOW = 'yellow';
const AMPEL_RED = 'red';
const RANK = { red: 0, yellow: 1, green: 2 };
const minStatus = (a, b) => (RANK[a] <= RANK[b] ? a : b);

function aggregateMin(statuses, fallback = AMPEL_GREEN) {
  if (!statuses || statuses.length === 0) return fallback;
  return statuses.reduce((acc, s) => minStatus(acc, s), AMPEL_GREEN);
}

function aggregateAtLeastNGreen(statuses, requiredGreen) {
  if (!Number.isFinite(requiredGreen) || requiredGreen <= 0) {
    return aggregateMin(statuses, AMPEL_RED);
  }
  if (!statuses || statuses.length === 0) return AMPEL_RED;
  let green = 0;
  let yellow = 0;
  for (const s of statuses) {
    if (s === AMPEL_GREEN) green += 1;
    else if (s === AMPEL_YELLOW) yellow += 1;
  }
  if (green >= requiredGreen) return AMPEL_GREEN;
  if (green + yellow >= requiredGreen) return AMPEL_YELLOW;
  return AMPEL_RED;
}

function getFlatAufgabeStatus(aufgabe) {
  if (!aufgabe) return AMPEL_RED;
  if (aufgabe.content_status !== 'approved') return AMPEL_RED;
  const isModified =
    aufgabe.moodle_sync_status === 'modified' ||
    aufgabe.brian_sync_status === 'modified' ||
    aufgabe.sync_status === 'modified';
  return isModified ? AMPEL_YELLOW : AMPEL_GREEN;
}

function getFlatLernpaketStatus(lp) {
  if (!lp) return AMPEL_RED;
  if (lp.sync_status === 'modified') return AMPEL_YELLOW;
  if (lp.content_status === 'approved' || !lp.content_status) return AMPEL_GREEN;
  return AMPEL_RED;
}

function getAmpelForAufgabe(aufgabe, ctx, visitedIds = new Set()) {
  if (!aufgabe) return AMPEL_RED;
  if (visitedIds.has(aufgabe.id)) return AMPEL_RED;
  const next = new Set(visitedIds);
  next.add(aufgabe.id);

  const typ = aufgabe.aufgaben_typ || 'inhalt';
  if (typ === 'inhalt' || typ === 'prozess' || typ === 'handlung') {
    return getFlatAufgabeStatus(aufgabe);
  }
  if (typ === 'buendel') {
    const ids = aufgabe.verlinkte_lernpaket_ids || [];
    if (ids.length === 0) return AMPEL_RED;
    const childStatuses = ids.map((id) => getFlatLernpaketStatus(ctx.lernpaketeById.get(id)));
    return minStatus(getFlatAufgabeStatus(aufgabe), aggregateMin(childStatuses));
  }
  if (typ === 'auswahl_buendel') {
    const ids = aufgabe.verlinkte_aufgaben_ids || [];
    if (ids.length === 0) return AMPEL_RED;
    const required = Number.isFinite(aufgabe.erforderliche_anzahl) ? aufgabe.erforderliche_anzahl : 0;
    const childStatuses = ids.map((id) => {
      if (next.has(id)) return AMPEL_RED;
      return getFlatAufgabeStatus(ctx.aufgabenById.get(id));
    });
    return minStatus(getFlatAufgabeStatus(aufgabe), aggregateAtLeastNGreen(childStatuses, required));
  }
  if (typ === 'projekt_anker') {
    const ids = aufgabe.verlinkte_projekt_ids || [];
    if (ids.length === 0) return AMPEL_RED;
    const childStatuses = ids.map((id) => {
      if (next.has(id)) return AMPEL_RED;
      return getFlatAufgabeStatus(ctx.aufgabenById.get(id));
    });
    return minStatus(getFlatAufgabeStatus(aufgabe), aggregateMin(childStatuses));
  }
  return getFlatAufgabeStatus(aufgabe);
}

// ── Progress-Berechnung pro Lerntyp ──
function calcProgressForLerntyp(sektoren, ctx) {
  if (!Array.isArray(sektoren) || sektoren.length === 0) return 0;

  let totalItems = 0;
  let earned = 0;

  for (const sektor of sektoren) {
    const items = Array.isArray(sektor?.items) ? sektor.items : [];
    for (const item of items) {
      if (!item || !item.ref_id) continue;
      totalItems += 1;

      if (item.type === 'system') {
        // Platzhalter zählen nicht.
        if (typeof item.ref_id === 'string' && item.ref_id.startsWith(PLATZHALTER_PREFIX)) {
          continue;
        }
        earned += 1;
        continue;
      }

      // Aufgabe → Ampel auswerten + Export-Freigabe prüfen.
      // Nur wenn BEIDE Bedingungen erfüllt sind, gibt es 1 Punkt.
      const aufgabe = ctx.aufgabenById.get(item.ref_id);
      if (!aufgabe) continue; // unbekannt → 0
      const ampel = getAmpelForAufgabe(aufgabe, ctx);
      const exportReady =
        aufgabe.moodle_sync_status === 'synced' ||
        aufgabe.brian_sync_status === 'synced' ||
        aufgabe.sync_status === 'synced';
      if (ampel === AMPEL_GREEN && exportReady) earned += 1;
    }
  }

  if (totalItems === 0) return 0;
  return Math.round((earned / totalItems) * 100);
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
    const einheitIds = Array.isArray(payload?.einheitIds) ? payload.einheitIds.filter(Boolean) : [];
    if (einheitIds.length === 0) {
      return Response.json({ success: true, metrics: {} }, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Bulk-Fetch in Parallel.
    const [einheiten, themenfelder, lernpakete, allgemeineAufgaben] = await Promise.all([
      base44.asServiceRole.entities.Einheiten.filter({ id: { $in: einheitIds } }),
      base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: { $in: einheitIds } }),
      base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: { $in: einheitIds } }),
      base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id: { $in: einheitIds } }),
    ]);

    // Aktivitäten werden über die Lernpakete dieser Einheiten gezogen.
    const lernpaketIds = lernpakete.map((lp) => lp.id);
    const aktivitaeten = lernpaketIds.length > 0
      ? await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
          lernpaket_id: { $in: lernpaketIds },
        })
      : [];

    // Gruppieren pro Einheit.
    const themenfelderByEinheit = new Map();
    const lernpaketeByEinheit = new Map();
    const aufgabenByEinheit = new Map();
    const aktivitaetenByEinheit = new Map();
    for (const id of einheitIds) {
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

      const ctx = {
        aufgabenById: new Map(aufs.map((a) => [a.id, a])),
        lernpaketeById: new Map(lps.map((p) => [p.id, p])),
      };

      const konfig = einheit.lernpfade_konfiguration || {};
      const progress = {};
      for (const lt of LERN_TYPEN) {
        progress[lt] = calcProgressForLerntyp(konfig[lt], ctx);
      }

      const volume = calcVolume(tfs, lps, aufs);
      volume.aktivitaeten = aktivitaetenByEinheit.get(id) || 0;
      metrics[id] = { volume, progress };
    }

    // Für nicht aufgelöste IDs (z.B. RBAC-blockiert) leere Metrik liefern.
    for (const id of einheitIds) {
      if (!metrics[id]) {
        metrics[id] = {
          volume: { themenfelder: 0, lernpakete: 0, aktivitaeten: 0, level2: 0, level3: 0 },
          progress: { minimalist: 0, pragmatiker: 0, ehrgeizig: 0, passioniert: 0 },
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