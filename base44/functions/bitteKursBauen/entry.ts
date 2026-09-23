/**
 * bitteKursBauen
 *
 * Der Bauauftrag (2026-09-23): „Für diese Einheit gibt es in Moodle noch keinen
 * Kurs — bitte baue ihn."
 *
 * WARUM EIGENSTÄNDIG und nicht über den Kurs-Schalter: `export_aktiv` schaltet
 * einen BESTEHENDEN Kurs sichtbar oder unsichtbar. Der Fall „der Kurs existiert
 * überhaupt noch nicht" ist etwas anderes — er verlangt eine Handlung des
 * Kursbaus, keine Statusänderung. Würde man ihn in die Statusdatei pressen,
 * müsste dort ein dritter Status stehen, den der vereinbarte Vertrag
 * ('kurs-status-1': aktiv | inaktiv) nicht kennt; der Bau würde ihn als
 * unbekannt behandeln und der Auftrag wäre lautlos verloren.
 *
 * Stattdessen geht der Auftrag den Weg, der für Bitten an den Kursbau
 * vorgesehen ist: eine Nachricht im gemeinsamen Briefkasten `austausch/`
 * (Format 'austausch-1'). Zusätzlich wird die Statusdatei des Kurses
 * geschrieben, damit der Bau Titel, Fach und Jahrgang am erwarteten Ort
 * vorfindet, sobald er den Ordner anlegt.
 *
 * Payload: { einheitId, slug, hinweis? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { pushFiles } from '../../shared/githubPush.js';
import { REPO_OWNER, REPO_NAME, REPO_BRANCH } from '../../shared/githubRead.js';
import { kursStatusFile } from '../../shared/kursStatusDatei.js';
import {
  AUSTAUSCH_ORDNER,
  baueDateiname,
  baueNachricht,
} from '../../shared/austauschNachricht.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const { einheitId, slug, hinweis = '' } = (await req.json()) || {};
    if (!einheitId || !slug) {
      return Response.json({ error: 'einheitId und slug sind erforderlich.' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden.' }, { status: 404 });

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'Der GitHub-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    const jetzt = new Date();
    const betreff = `Bitte Kurs bauen: ${einheit.titel_der_einheit} (${einheit.fach} Jg. ${einheit.jahrgangsstufe})`;
    const text = [
      `Für diese Einheit gibt es in Moodle noch keinen Kurs. Bitte legt ihn an.`,
      '',
      `- Einheit: ${einheit.titel_der_einheit}`,
      `- Fach: ${einheit.fach}`,
      `- Jahrgang: ${einheit.jahrgangsstufe}`,
      `- Kursordner: kurse/${slug}/`,
      `- Einheit-ID: ${einheitId}`,
      '',
      `Die Payloads und die Statusdatei kurse/${slug}/kurs-status.json liegen im Repository.`,
      hinweis ? `\nHinweis der Fachgruppe: ${String(hinweis).trim()}` : '',
    ]
      .filter((z) => z !== '')
      .join('\n');

    const dateiname = baueDateiname({
      datum: jetzt.toISOString().slice(0, 10),
      von: 'pm',
      an: 'mbk',
      thema: `kurs-bauen-${slug}`,
    });

    const ergebnis = await pushFiles({
      token,
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch: REPO_BRANCH,
      files: [
        kursStatusFile({ ...einheit, id: einheitId }, slug),
        {
          path: `${AUSTAUSCH_ORDNER}/${dateiname}`,
          bytes: new TextEncoder().encode(
            baueNachricht({
              von: 'pm',
              an: 'mbk',
              betreff,
              erzeugtAm: jetzt.toISOString().slice(0, 19) + 'Z',
              antwortetAuf: null,
              brauchtMalte: false,
              text: `${text}\n\n— ${user.full_name || user.email}, Pool-Manager`,
            })
          ),
        },
      ],
      message: `Bauauftrag: ${slug}`,
    });

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'CREATE',
        resource_type: 'Einheiten',
        resource_id: einheitId,
        changes: { bauauftrag: dateiname, slug },
        status: 'success',
      });
    } catch (_) { /* Audit ist Beiwerk */ }

    return Response.json({ ok: true, datei: dateiname, commit_url: ergebnis.commit_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}