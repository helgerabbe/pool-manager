/**
 * ensureKompaktwissen
 * ───────────────────
 * Jedes Lernpaket enthält verpflichtend genau EINE Kompaktwissen-Aktivität
 * (Wissensspeicher). Diese Funktion legt sie direkt bei der Erstellung des
 * Lernpakets an (Entity-Automation auf Lernpakete → create) und ist
 * idempotent: existiert bereits eine Kompaktwissen-Aktivität, passiert nichts.
 * Zusätzlich werden vorhandene Doppelungen bereinigt (nur die erste bleibt).
 *
 * Kann auch manuell mit { lernpaket_id } aufgerufen werden (Backfill).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const lernpaketId = body?.lernpaket_id || body?.event?.entity_id;

    if (!lernpaketId) {
      return Response.json({ error: 'Missing lernpaket_id' }, { status: 400 });
    }

    const katalog = await base44.asServiceRole.entities.AktivitaetenKatalog.filter({
      name: 'Kompaktwissen',
    });
    if (!katalog || katalog.length === 0) {
      return Response.json({ success: false, reason: 'Kompaktwissen nicht im Katalog' });
    }
    const kwIds = katalog.map((k) => k.id);
    const kwKatalog = katalog.find((k) => k.phase === 'Input') || katalog[0];

    const vorhandene = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
      lernpaket_id: lernpaketId,
      aktivitaet_id: { $in: kwIds },
      sync_status: { $ne: 'to_delete' },
    });

    // Doppelungen bereinigen: nur die älteste Instanz bleibt bestehen.
    if (vorhandene.length > 1) {
      const sortiert = [...vorhandene].sort(
        (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)
      );
      const zuLoeschen = sortiert.slice(1);
      for (const dup of zuLoeschen) {
        await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.delete(dup.id);
      }
      return Response.json({ success: true, action: 'deduped', removed: zuLoeschen.length });
    }

    if (vorhandene.length === 1) {
      return Response.json({ success: true, action: 'already_present' });
    }

    const created = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.create({
      lernpaket_id: lernpaketId,
      phase: kwKatalog.phase,
      aktivitaet_id: kwKatalog.id,
      field_values: {},
      is_complete: false,
      reihenfolge: 0,
    });

    return Response.json({ success: true, action: 'created', id: created?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}