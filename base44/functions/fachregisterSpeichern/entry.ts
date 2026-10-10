import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Speichert eine Fachregister-Einheit. Erlaubt: Admin oder Fachschaftsleitung des Fachs.
const FELDER = ['sachanalyse', 'inhalte', 'lernziele', 'kc_bezuege', 'fachsprache', 'didaktik', 'material', 'lehrwerk_dateien', 'zusatz_materialien'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id, daten } = await req.json();
  const einheit = await base44.asServiceRole.entities.FachregisterEinheit.get(id);
  if (!einheit) return Response.json({ error: 'Nicht gefunden' }, { status: 404 });

  let erlaubt = user.role === 'admin';
  if (!erlaubt) {
    const [profil] = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    erlaubt = profil?.rolle === 'Administrator' ||
      (profil?.rolle === 'Fachschaftsleitung' && (profil.fachbereich_zustaendigkeit || []).includes(einheit.fach));
  }
  if (!erlaubt) return Response.json({ error: 'Keine Berechtigung' }, { status: 403 });

  const update = Object.fromEntries(Object.entries(daten || {}).filter(([k]) => FELDER.includes(k)));
  await base44.asServiceRole.entities.FachregisterEinheit.update(id, update);
  return Response.json({ ok: true });
});