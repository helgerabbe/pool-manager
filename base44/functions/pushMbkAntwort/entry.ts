/**
 * pushMbkAntwort
 *
 * Der Rückweg zur MBK: schreibt die Entscheidungen der Fachgruppe zu den
 * gemeldeten Befunden als Antwortdatei ins Repository —
 *   kurse/<slug>/rueckmeldung/<datum>.antwort.json   (Format 'antwort-1')
 *
 * Enthalten ist pro Befund die Entscheidung ('behoben' | 'bewusst' |
 * 'widerspruch') samt Kommentar, dazu das Signal `neu_bauen_erbeten`: Damit
 * weiß der Bau, dass die Einheit eingearbeitet ist und ein neuer Lauf ansteht —
 * ohne dass jemand eine Mail schreiben muss.
 *
 * Payload: { einheit_id, hinweis?, neu_bauen? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { hasPruefungBearbeitenAccess } from '../../shared/pruefungAccess.js';
import { pushFiles } from '../../shared/githubPush.js';
import { REPO_OWNER, REPO_NAME, REPO_BRANCH } from '../../shared/githubRead.js';
import { getKursSlug, getRueckmeldungOrdner } from '../../shared/mbkRueckmeldung.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const einheitId = body?.einheit_id;
    if (!einheitId) return Response.json({ error: 'einheit_id fehlt' }, { status: 400 });

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'Der GitHub-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (!(await hasPruefungBearbeitenAccess(base44, user, einheit))) {
      return Response.json({ error: 'Keine Berechtigung in dieser Einheit' }, { status: 403 });
    }

    const alle = await base44.asServiceRole.entities.Pruefbefund.filter({
      einheit_id: einheitId,
      quelle: 'mbk',
    });
    const entschieden = (alle || []).filter((b) => (b.entscheidung || 'offen') !== 'offen');
    const offen = (alle || []).length - entschieden.length;

    const neuBauen = body?.neu_bauen !== false;
    if (entschieden.length === 0 && !neuBauen) {
      return Response.json({ error: 'Es gibt noch keine Entscheidungen zum Zurückmelden.' }, { status: 400 });
    }

    const jetzt = new Date();
    const slug = getKursSlug(einheit);
    const datum = jetzt.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const pfad = `${getRueckmeldungOrdner(slug)}/${datum}.antwort.json`;

    const inhalt = {
      format: 'antwort-1',
      erzeugt_am: jetzt.toISOString(),
      erzeugt_von: user.email,
      kurs_slug: slug,
      einheit: { id: einheit.id, titel: einheit.titel_der_einheit || '' },
      // Das Signal an den Bau: die Fachgruppe ist durch, ein Lauf darf starten.
      neu_bauen_erbeten: neuBauen,
      hinweis: typeof body?.hinweis === 'string' ? body.hinweis.trim() : '',
      noch_offen: offen,
      antworten: entschieden.map((b) => ({
        id: b.mbk_meldung_id || b.fingerprint,
        entscheidung: b.entscheidung,
        kommentar: b.kommentar || '',
        entschieden_von: b.entschieden_von || '',
        entschieden_am: b.entschieden_am || '',
        kurs_umgehung: b.kurs_umgehung || 'keine',
      })),
    };

    const bytes = new TextEncoder().encode(`${JSON.stringify(inhalt, null, 2)}\n`);
    const ergebnis = await pushFiles({
      token,
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch: REPO_BRANCH,
      files: [{ path: pfad, bytes }],
      message: `Antwort der Fachgruppe: ${einheit.titel_der_einheit || slug}`,
    });

    // Vermerken, dass diese Entscheidungen beim Bau angekommen sind.
    if (entschieden.length > 0) {
      await base44.asServiceRole.entities.Pruefbefund.bulkUpdate(
        entschieden.map((b) => ({ id: b.id, antwort_gesendet_am: jetzt.toISOString() }))
      );
    }

    return Response.json({
      ok: true,
      pfad,
      commit_url: ergebnis.commit_url,
      gesendet: entschieden.length,
      noch_offen: offen,
      neu_bauen_erbeten: neuBauen,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}