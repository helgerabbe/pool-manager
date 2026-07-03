import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Temporäre Diagnose: Was darf das GITHUB_TICKET_TOKEN?
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const token = Deno.env.get('GITHUB_TICKET_TOKEN');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const whoRes = await fetch('https://api.github.com/user', { headers });
    const who = whoRes.ok ? (await whoRes.json()).login : `HTTP ${whoRes.status}`;

    const repoRes = await fetch('https://api.github.com/repos/IGS-Seevetal/Poolzeit', { headers });
    const repoBody = await repoRes.json().catch(() => ({}));

    const issuesRes = await fetch('https://api.github.com/repos/IGS-Seevetal/Poolzeit/issues?per_page=1', { headers });

    return Response.json({
      token_gehoert_zu: who,
      repo_zugriff_status: repoRes.status,
      repo_permissions: repoBody.permissions || null,
      has_issues: repoBody.has_issues,
      issues_lesen_status: issuesRes.status,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});