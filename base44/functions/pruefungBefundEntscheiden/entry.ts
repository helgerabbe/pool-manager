/**
 * pruefungBefundEntscheiden
 *
 * Setzt die Entscheidung zu EINEM Befund der Export-Vorprüfung:
 *   'behoben' | 'offen'  → jede Person mit Schreibrecht in der Einheit
 *   'bewusst'            → nur Admin, Fachschaftsleitung, Einheits-Leitung
 *                          (Pflichtkommentar, reist im MBK-Payload mit)
 *
 * Payload: { befund_id, entscheidung, kommentar? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasPruefungLeitungAccess, hasPruefungBearbeitenAccess } from '../../shared/pruefungAccess.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const befundId = body?.befund_id;
    const entscheidung = body?.entscheidung;
    const kommentar = typeof body?.kommentar === 'string' ? body.kommentar.trim() : '';
    if (!befundId || !['offen', 'behoben', 'bewusst'].includes(entscheidung)) {
      return Response.json({ error: 'befund_id und gültige entscheidung sind erforderlich' }, { status: 400 });
    }

    const befund = await base44.asServiceRole.entities.Pruefbefund.get(befundId);
    if (!befund) return Response.json({ error: 'Befund nicht gefunden' }, { status: 404 });
    const einheit = await base44.asServiceRole.entities.Einheiten.get(befund.einheit_id);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    if (entscheidung === 'bewusst') {
      if (!kommentar) {
        return Response.json({ error: 'Für „bewusst gelassen" ist ein Kommentar erforderlich.' }, { status: 400 });
      }
      if (!(await hasPruefungLeitungAccess(base44, user, einheit))) {
        return Response.json(
          { error: 'Nur Fachschaftsleitung, Einheits-Leitung oder Administratoren dürfen einen Befund bewusst stehen lassen.' },
          { status: 403 }
        );
      }
    } else if (!(await hasPruefungBearbeitenAccess(base44, user, einheit))) {
      return Response.json({ error: 'Keine Berechtigung in dieser Einheit' }, { status: 403 });
    }

    const updated = await base44.asServiceRole.entities.Pruefbefund.update(befundId, {
      entscheidung,
      kommentar: entscheidung === 'bewusst' ? kommentar : '',
      entschieden_von: user.email,
      entschieden_am: new Date().toISOString(),
      // Der Hinweis „war behoben, kam wieder" gilt nach einer neuen
      // Entscheidung als gelesen.
      erneut_gefunden: false,
    });

    return Response.json({ ok: true, befund: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}