/**
 * ltiLaunch — LTI-1.3-Launch-Endpoint (Schritt 2 von 2).
 *
 * Moodle POSTet hierher das signierte id_token (JWT) des Schülers plus unseren
 * state. Wir prüfen:
 *  1. state-Signatur + Alter (max. 10 Min) — von uns in ltiLogin erzeugt
 *  2. JWT-Signatur gegen Moodles öffentliches Keyset (certs.php)
 *  3. Issuer, Client-ID (audience), nonce, Deployment-ID
 * Danach: Schülerprofil (MoodleSchueler) anlegen/aktualisieren, eigene
 * signierte Sitzung ausstellen und in die App weiterleiten.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as jose from 'npm:jose@5.9.6';

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
      <h2>Anmeldung über Moodle fehlgeschlagen</h2><p>${msg}</p>
      <p style="color:#94a3b8;font-size:13px">Bitte wende dich an deine Lehrkraft bzw. den Moodle-Administrator.</p>
    </body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const form = await req.formData().catch(() => null);
    const idToken = form ? String(form.get('id_token') || '') : '';
    const state = form ? String(form.get('state') || '') : '';
    if (!idToken || !state) return htmlError('Es fehlen id_token oder state im Aufruf.');

    // Konfiguration + Signierschlüssel laden
    const configs = (await svc.LtiPlattform.list()).map(norm).filter((c) => c.ist_aktiv !== false);
    const cfg = configs[0];
    if (!cfg) return htmlError('Die Moodle-Anbindung ist in der App noch nicht eingerichtet.');

    const interna = (await svc.LtiInterna.list()).map(norm);
    const signingKey = interna.find((i) => i.schluessel === 'session_signing_key');
    if (!signingKey) return htmlError('Die App-Einrichtung ist unvollständig (kein Signierschlüssel).');

    // 1. state prüfen (Signatur + Alter)
    const [statePart, stateSig] = state.split('.');
    if (!statePart || !stateSig) return htmlError('Ungültiger state.');
    const expectedSig = await hmacSign(signingKey.wert, statePart);
    if (expectedSig !== stateSig) return htmlError('Der state ist manipuliert oder abgelaufen (Signatur ungültig).');
    const stateJson = atob(statePart.replace(/-/g, '+').replace(/_/g, '/'));
    const st = JSON.parse(stateJson);
    if (Date.now() - st.iat > 10 * 60 * 1000) return htmlError('Die Anmeldung ist abgelaufen. Bitte in Moodle erneut auf die Aktivität klicken.');

    // 2. + 3. JWT gegen Moodles Keyset prüfen
    const jwks = jose.createRemoteJWKSet(new URL(cfg.issuer + '/mod/lti/certs.php'));
    const { payload: claims } = await jose.jwtVerify(idToken, jwks, {
      issuer: cfg.issuer,
      audience: cfg.client_id,
    });

    if (claims.nonce !== st.n) return htmlError('Sicherheitsprüfung fehlgeschlagen (nonce stimmt nicht überein).');
    const deployment = claims['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
    if (String(deployment) !== String(cfg.deployment_id)) {
      return htmlError(`Unbekannte Deployment-ID (${deployment}). In der App ist "${cfg.deployment_id}" hinterlegt.`);
    }

    // Einheit aus der Tool-URL (?einheit=...) oder Custom-Parametern ermitteln
    const targetUri = claims['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'] || st.t || '';
    const custom = claims['https://purl.imsglobal.org/spec/lti/claim/custom'] || {};
    let einheitId = custom.einheit || custom.einheit_id || '';
    if (!einheitId && targetUri) {
      try {
        einheitId = new URL(targetUri).searchParams.get('einheit') || '';
      } catch (_e) { /* ignorieren */ }
    }

    // Schülerprofil anlegen/aktualisieren (Identitäts-Anker für Fortschritt + Reporting)
    const nowIso = new Date().toISOString();
    const existing = (await svc.MoodleSchueler.filter({ issuer: cfg.issuer, moodle_sub: String(claims.sub) })).map(norm);
    let schueler;
    if (existing.length > 0) {
      schueler = existing[0];
      await svc.MoodleSchueler.update(schueler.id, {
        anzeige_name: claims.name || schueler.anzeige_name || '',
        vorname: claims.given_name || schueler.vorname || '',
        nachname: claims.family_name || schueler.nachname || '',
        email: claims.email || schueler.email || '',
        letzter_login_am: nowIso,
        login_anzahl: (schueler.login_anzahl || 0) + 1,
      });
    } else {
      schueler = norm(
        await svc.MoodleSchueler.create({
          issuer: cfg.issuer,
          moodle_sub: String(claims.sub),
          anzeige_name: claims.name || '',
          vorname: claims.given_name || '',
          nachname: claims.family_name || '',
          email: claims.email || '',
          erster_login_am: nowIso,
          letzter_login_am: nowIso,
          login_anzahl: 1,
        })
      );
    }

    // Eigene signierte Schüler-Sitzung ausstellen (8 Stunden gültig)
    const sessionPayload = {
      sid: schueler.id,
      sub: String(claims.sub),
      name: claims.name || '',
      einheit: einheitId || '',
      exp: Date.now() + 8 * 60 * 60 * 1000,
    };
    const sessionPart = b64url(new TextEncoder().encode(JSON.stringify(sessionPayload)));
    const sessionSig = await hmacSign(signingKey.wert, sessionPart);
    const sessionToken = `${sessionPart}.${sessionSig}`;

    if (!cfg.app_basis_url) {
      return htmlError('In der App ist noch keine App-Basis-URL hinterlegt. Bitte in den Admin-Einstellungen (Moodle-Anbindung) ergänzen.');
    }

    const target = new URL(cfg.app_basis_url + '/lernen/moodle');
    target.searchParams.set('lti', sessionToken);
    if (einheitId) target.searchParams.set('einheit', einheitId);

    return new Response(null, { status: 302, headers: { Location: target.toString() } });
  } catch (error) {
    return htmlError('Die Prüfung der Moodle-Anmeldung ist fehlgeschlagen: ' + error.message);
  }
});