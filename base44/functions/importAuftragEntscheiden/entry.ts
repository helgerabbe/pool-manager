/**
 * importAuftragEntscheiden
 *
 * Die Ablehnungs-Seite des Freigabe-Tors: Ein Auftrag wird bewusst NICHT
 * durchgeführt — mit Pflichtbegründung, damit später nachvollziehbar bleibt,
 * warum. Ein abgelehnter Auftrag kann außerdem wieder geöffnet werden, wenn er
 * korrigiert erneut eingereicht werden soll.
 *
 * Payload: { auftrag_id, entscheidung: 'abgelehnt' | 'wieder_oeffnen', begruendung? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const auftragId = body?.auftrag_id;
    const entscheidung = body?.entscheidung;
    if (!auftragId) return Response.json({ error: 'auftrag_id fehlt' }, { status: 400 });

    const auftrag = await base44.asServiceRole.entities.ImportAuftrag.get(auftragId).catch(() => null);
    if (!auftrag) return Response.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    if (auftrag.status === 'ausgefuehrt') {
      return Response.json({ error: 'Ein durchgeführter Auftrag kann nicht mehr entschieden werden.' }, { status: 409 });
    }

    if (entscheidung === 'abgelehnt') {
      const begruendung = String(body?.begruendung || '').trim();
      if (!begruendung) {
        return Response.json({ error: 'Bitte eine Begründung für die Ablehnung angeben.' }, { status: 400 });
      }
      const aktualisiert = await base44.asServiceRole.entities.ImportAuftrag.update(auftragId, {
        status: 'abgelehnt',
        entscheid_von: user.email,
        entscheid_am: new Date().toISOString(),
        begruendung,
      });
      return Response.json({ auftrag: aktualisiert });
    }

    if (entscheidung === 'wieder_oeffnen') {
      const aktualisiert = await base44.asServiceRole.entities.ImportAuftrag.update(auftragId, {
        status: 'eingegangen',
        entscheid_von: '',
        entscheid_am: null,
      });
      return Response.json({ auftrag: aktualisiert });
    }

    return Response.json({ error: 'Unbekannte Entscheidung' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}