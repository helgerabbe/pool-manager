/**
 * setEinheitExportAktivSecure
 *
 * Schaltet eine Einheit im Export-Center aus (`export_aktiv=false`) oder wieder
 * frei (`true`). Die Einheit bleibt im Pool-Manager unverändert bestehen — nur
 * der ausgelieferte Kurs soll für Schüler unsichtbar werden.
 *
 * Damit der Kursbau das beim nächsten Nachlesen erkennt, wird die Statusdatei
 * `kurse/<slug>/kurs-status.json` (Format 'kurs-status-1') sofort ins
 * Repository geschrieben. Schlägt das fehl (z. B. fehlendes Token), bleibt die
 * Änderung im Pool-Manager gespeichert und die Antwort enthält eine Warnung —
 * der nächste Payload-Push schreibt die Datei erneut.
 *
 * Payload: { einheitId, aktiv: boolean, grund?: string, slug: string }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { pushFiles } from '../../shared/githubPush.js';
import { kursStatusFile } from '../../shared/kursStatusDatei.js';

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
          { error: 'Nur Administration, Moodle-Designer oder Fachschaftsleitung dürfen Kurse aussetzen.' },
          { status: 403 }
        );
      }
    }

    const { einheitId, aktiv, grund = '', slug } = (await req.json()) || {};
    if (!einheitId || typeof aktiv !== 'boolean' || !slug) {
      return Response.json(
        { error: 'einheitId, aktiv (boolean) und slug sind erforderlich.' },
        { status: 400 }
      );
    }
    if (!aktiv && !String(grund).trim()) {
      return Response.json(
        { error: 'Bitte eine kurze Begründung angeben, warum der Kurs ausgesetzt wird.' },
        { status: 400 }
      );
    }

    const jetzt = new Date().toISOString();
    const updateData = aktiv
      ? {
          export_aktiv: true,
          export_deaktiviert_am: null,
          export_deaktiviert_von: null,
          export_deaktiviert_grund: null,
        }
      : {
          export_aktiv: false,
          export_deaktiviert_am: jetzt,
          export_deaktiviert_von: user.email,
          export_deaktiviert_grund: String(grund).trim(),
        };

    const einheit = await base44.asServiceRole.entities.Einheiten.update(einheitId, updateData);

    // Statusdatei ins Repository schreiben, damit der Bau es beim nächsten
    // Nachlesen sieht.
    let warnung = null;
    let commitUrl = null;
    try {
      const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
      if (!token) throw new Error('GitHub-Token ist nicht hinterlegt.');
      const ergebnis = await pushFiles({
        token,
        owner: OWNER,
        repo: REPO,
        branch: BRANCH,
        files: [kursStatusFile({ ...einheit, id: einheitId }, slug)],
        message: `Kurs-Status: ${slug} → ${aktiv ? 'aktiv' : 'inaktiv'} (Pool-Manager)`,
      });
      commitUrl = ergebnis.commit_url;
    } catch (err) {
      warnung = `Der Status ist im Pool-Manager gespeichert, konnte aber nicht ins Repository geschrieben werden: ${err.message}`;
    }

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'Einheiten',
        resource_id: einheitId,
        changes: updateData,
        status: 'success',
      });
    } catch (_) { /* Audit ist Beiwerk */ }

    return Response.json({ ok: true, aktiv, commit_url: commitUrl, warnung });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}