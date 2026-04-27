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
 * Progress-Regel (vereinfacht):
 *   Prozent = (Anzahl der Einheits-Inhalte, die im Pfad platziert sind)
 *           / (Gesamtzahl der Einheits-Inhalte)
 *
 *   Einheits-Inhalte = Lernpakete (Collection) + AllgemeineAufgabe-Datensätze
 *   (alle Typen außer Tombstones), inkl. Ebene-3-Projekte.
 *
 *   Platziert = die ref_id taucht mindestens einmal in einem Aufgaben-Item
 *   (type='aufgabe') irgendeines Sektors des jeweiligen Lerntyps auf.
 *   System-Bausteine/Platzhalter zählen nicht – nur "echte Inhalte" der Einheit.
 *
 *   Leere Einheit (keine Inhalte) → 0%.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LERN_TYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

// ── Progress-Berechnung pro Lerntyp ──
// Einfache Coverage-Logik: Wie viele der "echten Inhalte" der Einheit
// (Lernpakete + Aufgaben + Projekte, ohne Tombstones) tauchen mindestens
// einmal als Aufgaben-Item in irgendeinem Sektor des Lerntyps auf?
function calcProgressForLerntyp(sektoren, totalContentIds) {
  if (totalContentIds.size === 0) return 0;
  if (!Array.isArray(sektoren) || sektoren.length === 0) return 0;

  const placedIds = new Set();
  for (const sektor of sektoren) {
    const items = Array.isArray(sektor?.items) ? sektor.items : [];
    for (const item of items) {
      if (!item || item.type !== 'aufgabe' || !item.ref_id) continue;
      if (totalContentIds.has(item.ref_id)) placedIds.add(item.ref_id);
    }
  }

  return Math.round((placedIds.size / totalContentIds.size) * 100);
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
      const progress = {};
      for (const lt of LERN_TYPEN) {
        progress[lt] = calcProgressForLerntyp(konfig[lt], totalContentIds);
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