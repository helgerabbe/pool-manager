/**
 * ltiJwks — Öffentliches Keyset (JWKS) des Tools für die Moodle-LTI-1.3-Anbindung.
 * Moodle verlangt bei der Tool-Registrierung eine "Public keyset URL" — das ist diese.
 * Enthält NUR den öffentlichen Schlüssel; der private bleibt in LtiInterna.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const norm = (r) => (r ? { ...r, ...(r.data || {}), id: r.id } : null);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const interna = (await svc.LtiInterna.list()).map(norm);
    const pub = interna.find((i) => i.schluessel === 'tool_public_jwk');

    if (!pub) {
      return Response.json(
        { error: 'LTI noch nicht initialisiert. Bitte zuerst die Moodle-Anbindung in den Admin-Einstellungen öffnen.' },
        { status: 404 }
      );
    }

    return Response.json(
      { keys: [JSON.parse(pub.wert)] },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});