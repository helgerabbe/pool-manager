/**
 * shared/galerieManifest.js
 *
 * Lädt die Aktivitäten-Galerie (Manifest `aktivitaeten.json`) aus dem per
 * Systemeinstellungen (schluessel='github_connector') konfigurierten
 * GitHub-Repository — als schlanke Ideen-Liste für KI-Planungs-Prompts.
 *
 * Fail-soft: Ist der Connector nicht konfiguriert oder das Repo nicht
 * erreichbar, wird [] zurückgegeben — die aufrufende Pipeline läuft weiter.
 */

/**
 * @returns {Promise<Array<{id: string, name: string, kurzbeschreibung: string, uebergabe_beschreibung: string}>>}
 *   Nur galerie_sichtbare Einträge, sortiert nach reihenfolge/Name.
 */
export async function loadGalerieIdeen(base44) {
  try {
    const settings = await base44.asServiceRole.entities.Systemeinstellungen.filter({
      schluessel: 'github_connector',
    });
    const record = settings && settings[0];
    if (!record || !record.wert_text) return [];
    const cfg = JSON.parse(record.wert_text);
    if (!cfg.owner || !cfg.repo || !cfg.access_token || !cfg.file_path) return [];

    const branch = cfg.branch || 'main';
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.file_path}?ref=${branch}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cfg.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) return [];
    const file = await res.json();
    const b64 = String(file.content || '').replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const manifest = JSON.parse(new TextDecoder('utf-8').decode(bytes));

    const aktivitaeten = Array.isArray(manifest.aktivitaeten) ? manifest.aktivitaeten : [];
    return aktivitaeten
      .filter((a) => a && a.galerie_sichtbar === true && a.id)
      .sort((a, b) => {
        const ra = typeof a.reihenfolge === 'number' ? a.reihenfolge : Infinity;
        const rb = typeof b.reihenfolge === 'number' ? b.reihenfolge : Infinity;
        if (ra !== rb) return ra - rb;
        return String(a.name || '').localeCompare(String(b.name || ''));
      })
      .map((a) => ({
        id: String(a.id),
        name: String(a.name || a.id),
        kurzbeschreibung: String(a.kurzbeschreibung || ''),
        uebergabe_beschreibung: String(a.uebergabe_beschreibung || ''),
      }));
  } catch (err) {
    console.warn('[galerieManifest] Manifest nicht ladbar — Galerie-Ideen werden übersprungen.', err?.message);
    return [];
  }
}