/**
 * pushAustauschAntwort
 *
 * Schreibt eine Nachricht des Pool-Managers in den Briefkasten `austausch/`:
 * IMMER als neue Datei. Antwortet sie auf eine MBK-Nachricht, wird deren Kopf
 * (nur die Status-Zeile) auf `beantwortet` gesetzt — so, wie es das README des
 * Ordners vorsieht. Ein Commit für beides.
 *
 * Payload: { betreff, text, antwortet_auf?, braucht_malte? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { pushFiles } from '../../shared/githubPush.js';
import { REPO_OWNER, REPO_NAME, REPO_BRANCH, readTextFile } from '../../shared/githubRead.js';
import {
  AUSTAUSCH_ORDNER,
  baueDateiname,
  baueNachricht,
  parseNachricht,
  setzeStatus,
} from '../../shared/austauschNachricht.js';
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
    const betreff = String(body?.betreff || '').trim();
    const text = String(body?.text || '').trim();
    if (!betreff || !text) {
      return Response.json({ error: 'Betreff und Text sind nötig.' }, { status: 400 });
    }

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'Der GitHub-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    const jetzt = new Date();
    const datum = jetzt.toISOString().slice(0, 10);
    const antwortetAuf = String(body?.antwortet_auf || '').trim() || null;
    const enc = new TextEncoder();
    const files = [];

    if (antwortetAuf) {
      if (!/^[\w.-]+\.md$/.test(antwortetAuf)) {
        return Response.json({ error: 'Ungültiger Dateiname in antwortet_auf.' }, { status: 400 });
      }
      const originalPfad = `${AUSTAUSCH_ORDNER}/${antwortetAuf}`;
      const original = await readTextFile(token, originalPfad);
      if (!original) {
        return Response.json({ error: `Die Nachricht ${antwortetAuf} gibt es nicht.` }, { status: 404 });
      }
      const kopf = parseNachricht(original, antwortetAuf);
      if (kopf.an === 'pm' && kopf.status === 'offen') {
        files.push({ path: originalPfad, bytes: enc.encode(setzeStatus(original, 'beantwortet')) });
      }
    }

    const dateiname = baueDateiname({ datum, von: 'pm', an: 'mbk', thema: betreff });
    const inhalt = baueNachricht({
      von: 'pm',
      an: 'mbk',
      betreff,
      erzeugtAm: jetzt.toISOString().slice(0, 19) + 'Z',
      antwortetAuf,
      brauchtMalte: body?.braucht_malte === true,
      text: `${text}\n\n— ${user.full_name || user.email}, Pool-Manager`,
    });
    files.push({ path: `${AUSTAUSCH_ORDNER}/${dateiname}`, bytes: enc.encode(inhalt) });

    const ergebnis = await pushFiles({
      token,
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch: REPO_BRANCH,
      files,
      message: `Austausch: ${betreff}`,
    });

    return Response.json({ ok: true, datei: dateiname, commit_url: ergebnis.commit_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}