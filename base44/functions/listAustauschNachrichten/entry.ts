/**
 * listAustauschNachrichten
 *
 * Der Posteingang für den gemeinsamen Briefkasten `austausch/` im Repository.
 * Liest alle Nachrichten (beide Richtungen) samt Kopf und Text und liefert sie
 * neueste zuerst. Die Wahrheit sind die Dateien — der Index offen.json des
 * Kursbaus wird bewusst NICHT benutzt, er kann veraltet sein.
 *
 * Zugang wie das Import-Center (Administration, Fachschaftsleitung).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { listDirectory, readTextFile } from '../../shared/githubRead.js';
import { AUSTAUSCH_ORDNER, parseNachricht } from '../../shared/austauschNachricht.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'Der GitHub-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    const dateien = (await listDirectory(token, AUSTAUSCH_ORDNER)).filter(
      (d) => d.name.endsWith('.md') && d.name !== 'README.md'
    );

    const nachrichten = await Promise.all(
      dateien.map(async (d) => parseNachricht((await readTextFile(token, d.path)) || '', d.name))
    );

    nachrichten.sort((a, b) => (b.datei > a.datei ? 1 : b.datei < a.datei ? -1 : 0));

    const offenFuerPm = nachrichten.filter((n) => n.an === 'pm' && n.status === 'offen').length;
    const offenFuerMbk = nachrichten.filter((n) => n.an === 'mbk' && n.status === 'offen').length;

    return Response.json({
      ok: true,
      abgerufen_am: new Date().toISOString(),
      offen_fuer_pm: offenFuerPm,
      offen_fuer_mbk: offenFuerMbk,
      zu_sichten: nachrichten.filter((n) => n.an === 'pm' && n.status === 'sichtung').length,
      nachrichten,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}