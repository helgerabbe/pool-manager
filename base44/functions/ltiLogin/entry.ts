/**
 * ltiLogin — OIDC Login-Initiierung (LTI 1.3, Schritt 1 von 2).
 *
 * Moodle ruft diese URL auf, wenn ein Schüler auf die "Externes Tool"-Aktivität
 * klickt (GET oder POST-Form). Wir prüfen die Plattform, erzeugen einen signierten
 * state (enthält nonce + Ziel-URL) und leiten zurück zu Moodles auth.php.
 * Kein Nutzer-Login nötig — die Identität kommt erst im Schritt 2 (ltiLaunch).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const norm = (r) => (r ? { ...r, ...(r.data || {}), id: r.id } : null);

const b64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmacSign(hexKey, message) {
  const keyBytes = new Uint8Array(hexKey.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return b64url(new Uint8Array(sig));
}

const htmlError = (msg) =>
  new Response(
    `<!doctype html><html lang="de"><body style="font-family:sans-serif;padding:40px;color:#334155">
      <h2>Verbindung zu Moodle fehlgeschlagen</h2><p>${msg}</p>
      <p style="color:#94a3b8;font-size:13px">Bitte wende dich an deine Lehrkraft bzw. den Moodle-Administrator.</p>
    </body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    // Parameter aus GET-Query oder POST-Form lesen
    const u = new URL(req.url);
    let params = u.searchParams;
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        const body = await req.json().catch(() => ({}));
        params = new URLSearchParams();
        for (const [k, v] of Object.entries(body)) params.set(k, String(v));
      } else {
        const form = await req.formData().catch(() => null);
        if (form) {
          params = new URLSearchParams();
          for (const [k, v] of form.entries()) params.set(k, String(v));
        }
      }
    }

    const iss = (params.get('iss') || '').replace(/\/+$/, '');
    const loginHint = params.get('login_hint');
    const targetLinkUri = params.get('target_link_uri');
    const ltiMessageHint = params.get('lti_message_hint');

    if (!iss || !loginHint || !targetLinkUri) {
      return htmlError('Ungültiger Aufruf: Es fehlen LTI-Parameter (iss / login_hint / target_link_uri).');
    }

    // Plattform-Konfiguration laden und Issuer prüfen
    const configs = (await svc.LtiPlattform.list()).map(norm).filter((c) => c.ist_aktiv !== false);
    const cfg = configs.find((c) => (c.issuer || '').replace(/\/+$/, '') === iss);
    if (!cfg) {
      return htmlError('Diese Moodle-Instanz ist in der App nicht registriert. Bitte die Einrichtung in den Admin-Einstellungen abschließen.');
    }

    const interna = (await svc.LtiInterna.list()).map(norm);
    const signingKey = interna.find((i) => i.schluessel === 'session_signing_key');
    if (!signingKey) {
      return htmlError('Die App-Einrichtung ist unvollständig (kein Signierschlüssel). Bitte die Moodle-Anbindung in den Admin-Einstellungen öffnen.');
    }

    // Signierten state + nonce erzeugen (Schutz gegen Manipulation/Replay)
    const nonce = crypto.randomUUID();
    const statePayload = { n: nonce, t: targetLinkUri, iat: Date.now() };
    const statePart = b64url(new TextEncoder().encode(JSON.stringify(statePayload)));
    const stateSig = await hmacSign(signingKey.wert, statePart);
    const state = `${statePart}.${stateSig}`;

    // Redirect-URI = unsere ltiLaunch-Funktion. WICHTIG: Muss exakt der in Moodle
    // eingetragenen Umleitungs-URI entsprechen — daher aus der gespeicherten
    // App-Adresse ableiten, nicht aus der internen Request-URL (Proxy-Domain).
    const appBase = (cfg.app_basis_url || u.origin).replace(/\/+$/, '');
    const redirectUri = appBase + '/functions/ltiLaunch';

    const authUrl = new URL(cfg.issuer + '/mod/lti/auth.php');
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('response_mode', 'form_post');
    authUrl.searchParams.set('prompt', 'none');
    authUrl.searchParams.set('client_id', params.get('client_id') || cfg.client_id);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('login_hint', loginHint);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    if (ltiMessageHint) authUrl.searchParams.set('lti_message_hint', ltiMessageHint);

    return new Response(null, { status: 302, headers: { Location: authUrl.toString() } });
  } catch (error) {
    return htmlError('Unerwarteter Fehler: ' + error.message);
  }
});