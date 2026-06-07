import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * saveDashboardStandardVorlage
 *
 * Admin-only Upsert einer Dashboard-Standard-Vorlage für genau einen Lerntyp.
 * Stellt die Eindeutigkeit (1 Datensatz pro Lerntyp) anwendungsseitig sicher:
 * existiert bereits ein Datensatz, wird er aktualisiert, sonst neu angelegt.
 *
 * Payload: { lerntyp: string, sektoren: Array }
 */
const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { lerntyp, sektoren } = body || {};

    if (!VALID_LERNTYPEN.includes(lerntyp)) {
      return Response.json({ error: 'Ungültiger Lerntyp.' }, { status: 400 });
    }
    if (!Array.isArray(sektoren)) {
      return Response.json({ error: 'sektoren muss ein Array sein.' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.DashboardStandardVorlage.filter({ lerntyp });

    let saved;
    if (existing && existing.length > 0) {
      saved = await base44.asServiceRole.entities.DashboardStandardVorlage.update(existing[0].id, { sektoren });
      // Defensive: etwaige Duplikate (sollte es nicht geben) aufräumen.
      for (let i = 1; i < existing.length; i++) {
        await base44.asServiceRole.entities.DashboardStandardVorlage.delete(existing[i].id);
      }
    } else {
      saved = await base44.asServiceRole.entities.DashboardStandardVorlage.create({ lerntyp, sektoren });
    }

    return Response.json({ ok: true, vorlage: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});