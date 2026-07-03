import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getAktivitaetenGalerie
 *
 * Liest die Aktivitäten-Galerie aus dem per Systemeinstellungen
 * (schluessel='github_connector') konfigurierten GitHub-Repository.
 *
 * Modi:
 *  - { mode: 'list' }                       → Manifest (aktivitaeten.json)
 *  - { mode: 'demo', demo_path: '...' }     → HTML einer Demo-Datei aus dem Repo
 *
 * Das Access Token bleibt ausschließlich serverseitig.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'list';

    const settings = await base44.asServiceRole.entities.Systemeinstellungen.filter({
      schluessel: 'github_connector',
    });
    const record = settings && settings[0];
    if (!record || !record.wert_text) {
      return Response.json({ error: 'GitHub-Connector ist nicht konfiguriert.' }, { status: 400 });
    }
    const cfg = JSON.parse(record.wert_text);
    if (!cfg.owner || !cfg.repo || !cfg.access_token) {
      return Response.json({ error: 'GitHub-Connector ist unvollständig konfiguriert.' }, { status: 400 });
    }

    const branch = cfg.branch || 'main';
    const headers = {
      Authorization: `Bearer ${cfg.access_token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const fetchFileContent = async (path) => {
      const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${branch}`;
      const res = await fetch(url, { headers });
      if (!res.ok) return { error: res.status };
      const file = await res.json();
      const b64 = String(file.content || '').replace(/\s/g, '');
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return { content: new TextDecoder('utf-8').decode(bytes) };
    };

    if (mode === 'demo') {
      const demoPath = String(body.demo_path || '');
      // Nur Pfade innerhalb des Repos zulassen (kein Traversal, keine absolute URL)
      if (!demoPath || demoPath.includes('..') || demoPath.startsWith('http')) {
        return Response.json({ error: 'Ungültiger Demo-Pfad.' }, { status: 400 });
      }
      const result = await fetchFileContent(demoPath);
      if (result.error) {
        return Response.json({ error: `Demo-Datei nicht gefunden (HTTP ${result.error}).` }, { status: 404 });
      }
      return Response.json({ html: result.content });
    }

    // mode === 'list'
    const result = await fetchFileContent(cfg.file_path);
    if (result.error) {
      return Response.json({ error: `Galerie-Manifest nicht erreichbar (HTTP ${result.error}).` }, { status: 502 });
    }
    const manifest = JSON.parse(result.content);
    return Response.json({
      version: manifest.version ?? null,
      stand: manifest.stand ?? null,
      aktivitaeten: Array.isArray(manifest.aktivitaeten) ? manifest.aktivitaeten : [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});