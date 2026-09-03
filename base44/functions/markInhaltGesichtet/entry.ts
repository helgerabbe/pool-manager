/**
 * markInhaltGesichtet
 *
 * Bestätigt, dass eine Lehrkraft einen KI-erzeugten Inhalt (Snapshot)
 * angesehen hat. Grund: MBK-Meldung „Der Export schreibt mit" (2026-09-01) —
 * Modelltexte landeten ungesehen im Kurs der Klasse.
 *
 * Payload: { snapshotId }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasPruefungLeitungAccess } from '../../shared/pruefungAccess.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const snapshotId = body?.snapshotId;
    if (!snapshotId) return Response.json({ error: 'snapshotId ist erforderlich' }, { status: 400 });

    const snapshot = await base44.asServiceRole.entities.SchuelerInhaltSnapshot.get(snapshotId);
    if (!snapshot) return Response.json({ error: 'Inhalt nicht gefunden' }, { status: 404 });

    const einheit = await base44.asServiceRole.entities.Einheiten.get(snapshot.einheit_id);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (!(await hasPruefungLeitungAccess(base44, user, einheit))) {
      return Response.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await base44.asServiceRole.entities.SchuelerInhaltSnapshot.update(snapshotId, {
      gesichtet_am: new Date().toISOString(),
      gesichtet_von: user.email,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}