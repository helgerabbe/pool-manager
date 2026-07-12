import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getExternesCss
 *
 * Liest die zentrale CSS/Theme-Datei aus dem per Systemeinstellungen
 * (schluessel='github_css_connector') konfigurierten GitHub-Repository.
 * Wird von Schüleransicht und Vorschau verwendet: Ist der Connector
 * konfiguriert UND aktiviert, überschreibt dieses CSS das lokale Layout.
 *
 * Antwort: { enabled: boolean, css?: string, error?: string }
 * Das Access Token bleibt ausschließlich serverseitig.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await base44.asServiceRole.entities.Systemeinstellungen.filter({
      schluessel: 'github_css_connector',
    });
    const record = settings && settings[0];
    if (!record || !record.wert_text) {
      return Response.json({ enabled: false, reason: 'nicht_konfiguriert' });
    }

    const cfg = JSON.parse(record.wert_text);
    if (!cfg.owner || !cfg.repo || !cfg.file_path || !cfg.access_token) {
      return Response.json({ enabled: false, reason: 'unvollstaendig' });
    }
    if (cfg.aktiv !== true) {
      return Response.json({ enabled: false, reason: 'deaktiviert' });
    }

    const branch = cfg.branch || 'main';
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.file_path}?ref=${branch}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cfg.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      return Response.json({ enabled: false, reason: 'fetch_fehler', error: `CSS-Datei nicht erreichbar (HTTP ${res.status}).` });
    }
    const file = await res.json();
    const b64 = String(file.content || '').replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const css = new TextDecoder('utf-8').decode(bytes);

    return Response.json({ enabled: true, css });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});