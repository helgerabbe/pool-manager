import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Legt aus einer Lehrkraft-Meldung ein GitHub-Issue im Repo IGS-Seevetal/Poolzeit an.
// Ticket-Format gemäß Spec 2026-07-03 (Base44 → GitHub Tickets aus dem PoolManager).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Verbindung: bevorzugt aus den globalen Systemeinstellungen (Ticket-Connector),
    // Fallback: GITHUB_TICKET_TOKEN-Secret mit fest verdrahtetem Repo.
    let ghOwner = 'IGS-Seevetal';
    let ghRepo = 'Poolzeit';
    let token = Deno.env.get('GITHUB_TICKET_TOKEN') || '';
    const connSettings = await base44.asServiceRole.entities.Systemeinstellungen.filter({ schluessel: 'github_ticket_connector' });
    if (connSettings[0]?.wert_text) {
      try {
        const cfg = JSON.parse(connSettings[0].wert_text);
        if (cfg.owner && cfg.repo && cfg.access_token) {
          ghOwner = cfg.owner;
          ghRepo = cfg.repo;
          token = cfg.access_token;
        }
      } catch (_e) { /* Fallback auf Secret */ }
    }
    if (!token) return Response.json({ error: 'Ticket-Connector ist nicht konfiguriert' }, { status: 500 });

    const {
      art,            // 'Fehler' | 'Änderungswunsch'
      betrifft,       // 'Portal' | 'Einheit / Lernmodul' | 'Coach-Dashboard' | 'Aufgabengalerie / PoolManager-Connector' | 'Sonstiges'
      wo_genau,       // Freitext
      was_ist,        // Freitext
      was_soll,       // Freitext
      prioritaet,     // 'hoch' | 'mittel' | 'niedrig'
      titel,          // kurzer Titel (ohne Präfix)
      einheit_id,     // optional, automatisch aus Kontext
      einheit_titel,  // optional, für "Wo genau?"
      activity_id,    // optional
    } = await req.json();

    if (!art || !betrifft || !titel || !was_ist) {
      return Response.json({ error: 'Pflichtfelder fehlen (Art, Betrifft, Titel, Was ist jetzt?)' }, { status: 400 });
    }

    // Labels: immer 'ticket', dazu Bereich + Art (alle existieren im Repo)
    const bereichLabelMap = {
      'Portal': 'portal',
      'Einheit / Lernmodul': 'einheit',
      'Coach-Dashboard': 'coach-dashboard',
      'Aufgabengalerie / PoolManager-Connector': 'galerie',
    };
    const labels = ['ticket'];
    if (bereichLabelMap[betrifft]) labels.push(bereichLabelMap[betrifft]);
    labels.push(art === 'Fehler' ? 'bug' : 'wunsch');

    // Titel mit Bereichs-Präfix
    const praefixMap = {
      'Portal': '[Portal]',
      'Einheit / Lernmodul': '[Einheit]',
      'Coach-Dashboard': '[Coach-Dashboard]',
      'Aufgabengalerie / PoolManager-Connector': '[Galerie]',
      'Sonstiges': '[Sonstiges]',
    };
    const title = `${praefixMap[betrifft] || ''} ${titel}`.trim();

    // Kontext-Zeilen
    const kontextLines = [`- gemeldet von: ${user.full_name || 'unbekannt'} (${user.email})`];
    if (einheit_id) kontextLines.push(`- einheit_id: ${einheit_id}`);
    if (activity_id) kontextLines.push(`- activity_id: ${activity_id}`);

    const woGenauText = wo_genau || (einheit_titel ? `Einheit "${einheit_titel}"` : '—');

    const body = [
      '### Art',
      art,
      '',
      '### Betrifft',
      betrifft,
      '',
      '### Wo genau?',
      woGenauText,
      '',
      '### Kontext (automatisch von Base44 befüllt)',
      ...kontextLines,
      '',
      '### Was ist jetzt?',
      was_ist,
      '',
      '### Was soll stattdessen sein?',
      was_soll || '—',
      '',
      '### Priorität',
      prioritaet || 'mittel',
    ].join('\n');

    const ghRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body, labels }),
    });

    if (ghRes.status !== 201) {
      const errText = await ghRes.text();
      console.error('[createTicketIssue] GitHub-Fehler', ghRes.status, errText);
      let detail = '';
      try { detail = JSON.parse(errText)?.message || ''; } catch (_e) { /* Rohtext ignorieren */ }
      const hinweis = ghRes.status === 403 && detail.includes('not accessible')
        ? ' – Das hinterlegte GitHub-Token hat keine Berechtigung, Issues anzulegen (Issues: Read and write für das Repo erforderlich).'
        : detail ? ` – ${detail}` : '';
      return Response.json({ error: `GitHub-API-Fehler (${ghRes.status})${hinweis}` }, { status: 502 });
    }

    const issue = await ghRes.json();
    return Response.json({ number: issue.number, html_url: issue.html_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});