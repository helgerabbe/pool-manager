/**
 * announceAirGapSchemaChange
 *
 * Kündigt dem Kursbau eine Schema-Änderung der Air-Gap-Payloads an: legt ein
 * Issue im Ticket-Repository mit den Labels `ticket` und `engine` an, mit einer
 * Stichpunktliste der geänderten Felder.
 *
 * Warum eigenständig und nicht über createTicketIssue: Das ist keine Meldung
 * einer Lehrkraft, sondern eine technische Ankündigung — sie braucht das Label
 * `engine`, eine feste Titelform und keine Fehler-/Wunsch-Einordnung.
 *
 * Bitte der MBK (2026-09-09): Der Umbau der Lernlandkarte hat ihren Bau
 * angehalten, weil er die Änderung erst mit dem Export selbst erfuhr. Die
 * Ankündigung soll EINEN TAG VOR dem ersten Export mit der neuen Version raus.
 *
 * Payload: { version, vorherige_version?, stichpunkte: string[] }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet.' }, { status: 401 });

    const { version, vorherige_version = '', stichpunkte = [] } = (await req.json()) || {};
    if (!version || !Array.isArray(stichpunkte) || stichpunkte.length === 0) {
      return Response.json(
        { error: 'version und mindestens ein Stichpunkt sind erforderlich.' },
        { status: 400 }
      );
    }

    // Verbindung wie bei createTicketIssue: Connector bevorzugt, Secret als Rückfall.
    let owner = 'IGS-Seevetal';
    let repo = 'Poolzeit';
    let token = secrets.get('GITHUB_TICKET_TOKEN') || '';
    const conn = await base44.asServiceRole.entities.Systemeinstellungen.filter({
      schluessel: 'github_ticket_connector',
    });
    if (conn?.[0]?.wert_text) {
      try {
        const cfg = JSON.parse(conn[0].wert_text);
        if (cfg.owner && cfg.repo && cfg.access_token) {
          owner = cfg.owner;
          repo = cfg.repo;
          token = cfg.access_token;
        }
      } catch (_e) { /* Rückfall auf das Secret */ }
    }
    if (!token) {
      return Response.json({ error: 'Der Ticket-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    const body = [
      `### Schema-Änderung der Übergabe-Dateien: ${version}`,
      '',
      vorherige_version ? `Bisher: \`${vorherige_version}\` → neu: \`${version}\`` : '',
      '',
      '### Was sich ändert',
      ...stichpunkte.map((s) => `- ${s}`),
      '',
      '### Wann',
      'Der erste Export mit dieser Version geht frühestens morgen raus.',
      '',
      '### Wo es auch steht',
      'Dieselbe Liste steht ab dieser Version in jedem Payload unter '
      + '`meta.aenderungen` — der Bau kann beim ersten Export mit neuer Version '
      + 'selbst darauf hinweisen.',
      '',
      `_Angekündigt von ${user.full_name || user.email} aus dem Pool-Manager._`,
    ].join('\n');

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[Engine] Schema-Änderung ${version}`,
        body,
        labels: ['ticket', 'engine'],
      }),
    });

    if (res.status !== 201) {
      const text = await res.text();
      return Response.json({ error: `GitHub-Fehler (${res.status}): ${text.slice(0, 300)}` }, { status: 502 });
    }
    const issue = await res.json();
    return Response.json({ ok: true, number: issue.number, html_url: issue.html_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}