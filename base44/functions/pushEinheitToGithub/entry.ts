/**
 * pushEinheitToGithub
 *
 * Schreibt die MBK-Payloads einer Einheit plus alle zugehörigen Materialien
 * in das GitHub-Repository der Schule (IGS-Seevetal/Poolzeit).
 *
 * Zielstruktur im Repo:
 *   kurse/<slug>/payloads/0-ui-config.json … 5-systembausteine.json
 *   kurse/<slug>/payloads/media-manifest.json
 *   kurse/<slug>/material/<datei>
 *
 * Delta: Es werden ausschließlich Dateien geschrieben, die sich gegenüber
 * dem Repo-Stand unterscheiden. Alles landet in EINEM Commit.
 *
 * Payload (vom Export-Center):
 *   { einheitId, slug, payloads: [{ name, content }], media: [{ name, url }] }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { pushFiles } from '../../shared/githubPush.js';

const OWNER = 'IGS-Seevetal';
const REPO = 'Poolzeit';
const BRANCH = 'main';

const ERLAUBTE_ROLLEN = ['Administrator', 'Moodle-Designer', 'Fachschaftsleitung'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet.' }, { status: 401 });

    if (user.role !== 'admin') {
      const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
      const rolle = profile?.[0]?.rolle;
      if (!ERLAUBTE_ROLLEN.includes(rolle)) {
        return Response.json(
          { error: 'Keine Berechtigung für den GitHub-Export.' },
          { status: 403 }
        );
      }
    }

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'GitHub-Token ist nicht hinterlegt.' }, { status: 500 });
    }

    const body = await req.json();
    // modus: 'vorschau' = nur vergleichen (Delta anzeigen, nichts schreiben)
    //        'delta'    = nur geänderte/neue Dateien schreiben (Standard)
    //        'voll'     = alles neu schreiben
    const { einheitId, slug, payloads = [], media = [], modus = 'delta' } = body || {};
    if (!einheitId || !slug || payloads.length === 0) {
      return Response.json(
        { error: 'einheitId, slug und payloads sind erforderlich.' },
        { status: 400 }
      );
    }

    const ordner = `kurse/${slug}`;
    const encoder = new TextEncoder();
    const files = [];

    for (const p of payloads) {
      files.push({
        path: `${ordner}/payloads/${p.name}`,
        bytes: encoder.encode(`${JSON.stringify(p.content, null, 2)}\n`),
      });
    }

    // Materialien serverseitig nachladen — die URLs stehen in den Payloads.
    const medienStatus = [];
    for (const m of media) {
      try {
        const res = await fetch(m.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        files.push({ path: `${ordner}/material/${m.name}`, bytes: buf });
        medienStatus.push({ name: m.name, url: m.url, ok: true });
      } catch (err) {
        medienStatus.push({ name: m.name, url: m.url, ok: false, fehler: err.message });
      }
    }

    files.push({
      path: `${ordner}/payloads/media-manifest.json`,
      bytes: encoder.encode(
        `${JSON.stringify(
          {
            erzeugt_am: new Date().toISOString(),
            hinweis: 'Zuordnung der Original-URL zum Dateipfad im Repository.',
            dateien: medienStatus.map((m) => ({
              url: m.url,
              pfad: `material/${m.name}`,
              vorhanden: m.ok,
            })),
          },
          null,
          2
        )}\n`
      ),
    });

    const ergebnis = await pushFiles({
      token,
      owner: OWNER,
      repo: REPO,
      branch: BRANCH,
      files,
      message: `Export: ${slug} (Pool-Manager, ${new Date().toISOString().slice(0, 16).replace('T', ' ')})`,
      force: modus === 'voll',
      dryRun: modus === 'vorschau',
    });

    // Export-Zeitstempel der Einheit fortschreiben (entkoppelt von der Freigabe).
    // Nur bei echter Übergabe — die Vorschau verändert den Sync-Stand nicht.
    if (modus !== 'vorschau') {
      await base44.asServiceRole.entities.Einheiten.update(einheitId, {
        last_exported_at: new Date().toISOString(),
      });
    }

    const medienFehler = medienStatus.filter((m) => !m.ok);
    return Response.json({
      ok: true,
      modus,
      ordner,
      neu: ergebnis.neu,
      geaendert: ergebnis.geaendert,
      unveraendert: ergebnis.unveraendert,
      repository: `${OWNER}/${REPO}`,
      branch: BRANCH,
      commit_url: ergebnis.commit_url,
      geschrieben: ergebnis.geschrieben,
      anzahl_geschrieben: ergebnis.geschrieben.length,
      anzahl_unveraendert: ergebnis.unveraendert.length,
      medien_fehler: medienFehler,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}