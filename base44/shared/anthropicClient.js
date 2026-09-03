/**
 * shared/anthropicClient.js
 *
 * Zugriff auf den im Admin-Bereich hinterlegten Anthropic-Schlüssel
 * (Systemeinstellungen, schluessel='anthropic_connector'). Der Schlüssel wird
 * ausschließlich serverseitig gelesen und niemals zurückgegeben.
 */

const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODELL = 'claude-sonnet-5';

export async function getAnthropicConfig(base44) {
  const settings = await base44.asServiceRole.entities.Systemeinstellungen
    .filter({ schluessel: 'anthropic_connector' })
    .catch(() => []);
  let cfg = {};
  const record = settings?.[0];
  if (record?.wert_text) {
    try { cfg = JSON.parse(record.wert_text); } catch (_e) { cfg = {}; }
  }
  const apiKey = String(cfg.api_key || '').trim() || Deno.env.get('ANTHROPIC_API_KEY') || '';
  return {
    apiKey,
    modell: String(cfg.modell || '').trim() || DEFAULT_MODELL,
    aktiv: cfg.aktiv !== false && !!apiKey,
  };
}

/**
 * Stellt eine Frage und erwartet reines JSON zurück.
 * @returns {Promise<any|null>} geparstes JSON oder null, wenn nichts brauchbar kam
 */
export async function askAnthropicJson(cfg, { system, prompt, maxTokens = 2000 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: cfg.modell,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Anthropic HTTP ${res.status}. ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data?.content || []).filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (_e) {
    return null;
  }
}