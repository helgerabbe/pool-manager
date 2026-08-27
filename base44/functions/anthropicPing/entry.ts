import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * anthropicPing
 *
 * Testet die Verbindung zur Anthropic-API mit dem im Admin-Bereich
 * hinterlegten Schlüssel (Systemeinstellungen, schluessel='anthropic_connector').
 * Fallback: Umgebungsvariable ANTHROPIC_API_KEY.
 *
 * Der Schlüssel wird ausschließlich serverseitig gelesen und NIE an das
 * Frontend zurückgegeben — die Antwort enthält nur Status und Modellantwort.
 *
 * Zugriff: nur Administratoren.
 *
 * Antwort: { ok, modell?, antwort?, tokens?, reason?, error? }
 */

const DEFAULT_MODELL = 'claude-sonnet-5';
const ANTHROPIC_VERSION = '2023-06-01';

async function istAdmin(base44, user) {
  if (user.role === 'admin' || user.role === 'Administrator') return true;
  const profile = await base44.asServiceRole.entities.Benutzer
    .filter({ user_id: user.email })
    .catch(() => []);
  const p = profile?.[0];
  return !!p?.ist_aktiv && p?.rolle === 'Administrator';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    if (!(await istAdmin(base44, user))) {
      return Response.json({ ok: false, error: 'Nur für Administratoren.' }, { status: 403 });
    }

    // ── Schlüssel + Modell laden ───────────────────────────────────────
    const settings = await base44.asServiceRole.entities.Systemeinstellungen
      .filter({ schluessel: 'anthropic_connector' })
      .catch(() => []);
    const record = settings?.[0];

    let cfg = {};
    if (record?.wert_text) {
      try { cfg = JSON.parse(record.wert_text); } catch (_e) { cfg = {}; }
    }

    const apiKey = String(cfg.api_key || '').trim() || Deno.env.get('ANTHROPIC_API_KEY') || '';
    const modell = String(cfg.modell || '').trim() || DEFAULT_MODELL;

    if (!apiKey) {
      return Response.json({ ok: false, reason: 'kein_schluessel' });
    }
    if (cfg.aktiv === false) {
      return Response.json({ ok: false, reason: 'deaktiviert', modell });
    }

    // ── Minimaler Testaufruf ───────────────────────────────────────────
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: modell,
        max_tokens: 64,
        messages: [
          {
            role: 'user',
            content: 'Antworte mit genau einem kurzen deutschen Satz, dass die Verbindung steht.',
          },
        ],
      }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body?.error?.message ? ` ${body.error.message}` : '';
      } catch (_e) { /* ignorieren */ }
      const hinweis = res.status === 401
        ? 'Der Schlüssel wurde abgelehnt — bitte prüfen, ob er vollständig kopiert wurde.'
        : res.status === 400
          ? 'Anfrage abgelehnt — meist ein unbekannter Modellname.'
          : res.status === 429
            ? 'Rate-Limit oder kein Guthaben auf dem Anthropic-Konto.'
            : '';
      return Response.json({
        ok: false,
        reason: 'api_fehler',
        modell,
        error: `HTTP ${res.status}.${detail} ${hinweis}`.trim(),
      });
    }

    const data = await res.json();
    const antwort = (data?.content || [])
      .filter((b) => b?.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();

    return Response.json({
      ok: true,
      modell: data?.model || modell,
      antwort,
      tokens: {
        input: data?.usage?.input_tokens ?? null,
        output: data?.usage?.output_tokens ?? null,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
