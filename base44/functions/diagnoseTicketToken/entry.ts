import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Diagnose für den Ticket-Connector: Liest die Verbindung aus den
// Systemeinstellungen (github_ticket_connector), Fallback: GITHUB_TICKET_TOKEN-Secret.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const settings = await base44.asServiceRole.entities.Systemeinstellungen.filter({ schluessel: 'github_ticket_connector' });
    let cfg = { owner: 'IGS-Seevetal', repo: 'Poolzeit', access_token: Deno.env.get('GITHUB_TICKET_TOKEN') || '' };
    if (settings[0]?.wert_text) {
      try {
        const parsed = JSON.parse(settings[0].wert_text);
        if (parsed.owner && parsed.repo && parsed.access_token) cfg = parsed;
      } catch (_e) { /* Fallback auf Secret */ }
    }

    if (!cfg.access_token) return Response.json({ error: 'Kein Token konfiguriert' }, { status: 400 });

    const headers = {
      'Authorization': `Bearer ${cfg.access_token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const repoPath = `${cfg.owner}/${cfg.repo}`;

    const whoRes = await fetch('https://api.github.com/user', { headers });
    const who = whoRes.ok ? (await whoRes.json()).login : `HTTP ${whoRes.status}`;

    const repoRes = await fetch(`https://api.github.com/repos/${repoPath}`, { headers });
    const repoBody = await repoRes.json().catch(() => ({}));

    const issuesRes = await fetch(`https://api.github.com/repos/${repoPath}/issues?per_page=1`, { headers });

    return Response.json({
      token_gehoert_zu: who,
      repo_zugriff_status: repoRes.status,
      repo_permissions: repoBody.permissions || null,
      has_issues: repoBody.has_issues,
      issues_lesen_status: issuesRes.status,
      issues_schreiben_ok: issuesRes.status === 200,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});