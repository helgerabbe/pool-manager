/**
 * austauschStatusSetzen
 *
 * Setzt den Status EINER Nachricht im Briefkasten `austausch/` von Hand.
 *
 * WARUM: Manche Nachrichten des Kursbaus sind für die Fachgruppe schlicht
 * nicht wichtig, nicht gewollt oder wurden längst auf anderem Weg beantwortet.
 * Ohne diesen Weg blieben sie für immer im Bereich „Muss gesichtet werden"
 * liegen und verdeckten die Nachrichten, die wirklich eine Entscheidung
 * brauchen.
 *
 * Geändert wird ausschließlich der Kopf (Status, ggf. Sichtungsgrund) — der
 * Fließtext einer abgelegten Nachricht bleibt nach den Spielregeln des Ordners
 * unangetastet.
 *
 * Payload: { datei, status: 'erledigt' | 'beantwortet' | 'sichtung' | 'offen', notiz? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { pushFiles } from '../../shared/githubPush.js';
import { REPO_OWNER, REPO_NAME, REPO_BRANCH, readTextFile } from '../../shared/githubRead.js';
import { AUSTAUSCH_ORDNER, setzeStatus, setzeKopfFeld } from '../../shared/austauschNachricht.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

const ERLAUBT = ['offen', 'beantwortet', 'erledigt', 'sichtung'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const datei = String(body?.datei || '').trim();
    const status = String(body?.status || '').trim();
    const notiz = String(body?.notiz || '').trim();

    if (!/^[\w.-]+\.md$/.test(datei)) {
      return Response.json({ error: 'Ungültiger Dateiname.' }, { status: 400 });
    }
    if (!ERLAUBT.includes(status)) {
      return Response.json({ error: `Status muss einer von ${ERLAUBT.join(', ')} sein.` }, { status: 400 });
    }

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'Der GitHub-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    const pfad = `${AUSTAUSCH_ORDNER}/${datei}`;
    const original = await readTextFile(token, pfad);
    if (!original) {
      return Response.json({ error: `Die Nachricht ${datei} gibt es nicht.` }, { status: 404 });
    }

    let neu = setzeStatus(original, status);
    if (status === 'sichtung') {
      if (notiz) neu = setzeKopfFeld(neu, 'sichtung_grund', notiz);
    } else {
      // Der Sichtungsgrund gehört zum Zustand „liegt zur Entscheidung" — ist
      // die Nachricht abgehakt, hat der Hinweis keine Bedeutung mehr.
      neu = setzeKopfFeld(neu, 'sichtung_grund', notiz);
    }

    const ergebnis = await pushFiles({
      token,
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch: REPO_BRANCH,
      files: [{ path: pfad, bytes: new TextEncoder().encode(neu) }],
      message: `Austausch: ${datei} → ${status}`,
    });

    return Response.json({ ok: true, datei, status, commit_url: ergebnis.commit_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}