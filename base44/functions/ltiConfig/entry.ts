/**
 * ltiConfig — Admin-Endpoint für die Moodle-LTI-1.3-Anbindung (Etappe 1).
 *
 * Aktionen:
 *  - get:  liefert die gespeicherte Plattform-Konfiguration + die Tool-URLs
 *          (für die Einrichtungs-Karte). Erzeugt beim ersten Aufruf automatisch
 *          die internen Schlüssel (Session-Signierschlüssel + RSA-Keypair).
 *  - save: speichert Plattform-ID (issuer), Client-ID, Deployment-ID und
 *          App-Basis-URL (Upsert, genau ein Datensatz).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as jose from 'npm:jose@5.9.6';

const norm = (r) => (r ? { ...r, ...(r.data || {}), id: r.id } : null);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const b = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
      isAdmin = norm(b?.[0])?.rolle === 'Administrator';
    }
    if (!isAdmin) return Response.json({ error: 'Nur Administratoren' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const action = payload.action || 'get';
    const svc = base44.asServiceRole.entities;

    // ── Interne Schlüssel sicherstellen (einmalig, automatisch) ──
    const interna = (await svc.LtiInterna.list()).map(norm);
    const findKey = (k) => interna.find((i) => i.schluessel === k);

    if (!findKey('session_signing_key')) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
      await svc.LtiInterna.create({ schluessel: 'session_signing_key', wert: hex });
    }
    if (!findKey('tool_public_jwk')) {
      const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true });
      const pub = await jose.exportJWK(publicKey);
      const priv = await jose.exportJWK(privateKey);
      const kid = crypto.randomUUID();
      pub.kid = kid;
      pub.alg = 'RS256';
      pub.use = 'sig';
      priv.kid = kid;
      priv.alg = 'RS256';
      await svc.LtiInterna.create({ schluessel: 'tool_public_jwk', wert: JSON.stringify(pub) });
      await svc.LtiInterna.create({ schluessel: 'tool_private_jwk', wert: JSON.stringify(priv) });
    }

    // ── Tool-URLs aus der eigenen Funktions-URL ableiten ──
    const u = new URL(req.url);
    const basePath = u.origin + u.pathname.replace(/ltiConfig\/?$/, '');
    const urls = {
      login_url: basePath + 'ltiLogin',
      launch_url: basePath + 'ltiLaunch',
      jwks_url: basePath + 'ltiJwks',
    };

    const records = (await svc.LtiPlattform.list()).map(norm);
    const existing = records[0] || null;

    if (action === 'save') {
      const { issuer, client_id, deployment_id, app_basis_url } = payload;
      if (!issuer || !client_id || !deployment_id) {
        return Response.json(
          { error: 'Plattform-ID, Client-ID und Deployment-ID sind erforderlich.' },
          { status: 400 }
        );
      }
      const data = {
        issuer: String(issuer).trim().replace(/\/+$/, ''),
        client_id: String(client_id).trim(),
        deployment_id: String(deployment_id).trim(),
        app_basis_url: app_basis_url ? String(app_basis_url).trim().replace(/\/+$/, '') : '',
        ist_aktiv: true,
      };
      const saved = existing
        ? await svc.LtiPlattform.update(existing.id, data)
        : await svc.LtiPlattform.create(data);
      return Response.json({ success: true, config: norm(saved) || data, urls });
    }

    return Response.json({ success: true, config: existing, urls });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});