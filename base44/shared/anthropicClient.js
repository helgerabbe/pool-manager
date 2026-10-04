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
 * Stellt eine Frage und gibt den reinen Text zurück.
 *
 * Für Aufträge, deren Ergebnis selbst Code ist (HTML-Fragmente): In JSON
 * verpackt müsste jedes Anführungszeichen und jeder Umbruch maskiert werden —
 * ein einziger Fehler darin macht die ganze Antwort unlesbar.
 *
 * @returns {Promise<{ text: string, abgeschnitten: boolean }>}
 */
/**
 * Gleiche Signatur wie Core.InvokeLLM, läuft aber über den eigenen
 * Anthropic-Schlüssel (Modell aus den Admin-Einstellungen), sobald er
 * hinterlegt ist. Internetsuche und Dateianhänge bleiben bei der Plattform-KI.
 */
export async function kiAufruf(base44, params) {
  const cfg = await getAnthropicConfig(base44);
  const brauchtPlattform = params.add_context_from_internet || (params.file_urls && params.file_urls.length);
  if (!cfg.aktiv || brauchtPlattform) return base44.asServiceRole.integrations.Core.InvokeLLM(params);
  if (!params.response_json_schema) {
    const { text } = await askAnthropicText(cfg, { system: undefined, prompt: params.prompt });
    return text;
  }
  const json = await askAnthropicJson(cfg, {
    system: `Antworte ausschließlich mit validem JSON nach diesem Schema:\n${JSON.stringify(params.response_json_schema)}`,
    prompt: params.prompt,
    maxTokens: 16000,
  });
  if (!json) throw new Error('Die KI hat kein lesbares JSON geliefert.');
  return json;
}

/** Eingebaute Plattform-KI statt eigenem Anthropic-Schlüssel. */
export function plattformConfig(base44) {
  return { aktiv: true, plattform: true, base44 };
}

async function plattformText(cfg, system, prompt) {
  const text = await cfg.base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `${system}\n\n${prompt}`,
    model: 'claude_sonnet_4_6',
  });
  return typeof text === 'string' ? text : JSON.stringify(text);
}

export async function askAnthropicText(cfg, { system, prompt, maxTokens = 20000 }) {
  if (cfg.plattform) return { text: await plattformText(cfg, system, prompt), abgeschnitten: false };
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
  return { text, abgeschnitten: data?.stop_reason === 'max_tokens' };
}

/**
 * Stellt eine Frage und erwartet reines JSON zurück.
 * @returns {Promise<any|null>} geparstes JSON oder null, wenn nichts brauchbar kam
 */
export async function askAnthropicJson(cfg, { system, prompt, maxTokens = 2000 }) {
  if (cfg.plattform) {
    const t = await plattformText(cfg, system, prompt);
    const s = t.indexOf('{'), e = t.lastIndexOf('}');
    if (s === -1 || e <= s) return null;
    try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
  }
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