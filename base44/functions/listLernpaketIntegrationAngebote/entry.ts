/**
 * listLernpaketIntegrationAngebote
 *
 * Liefert alle Lernpakete, die dieser Poolzeit-Einheit zur Integration
 * angeboten wurden — samt Inhalten für die Schüler-Vorschau, damit die
 * Fachschaftsleitung das Paket vor der Übernahme prüfen kann.
 *
 * Payload: { einheit_id }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { listAll, loadProfil, darfIntegrationVerwalten } from '../../shared/lernpaketIntegration.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const einheitId = payload?.einheit_id;
    if (!einheitId) return Response.json({ error: 'Missing einheit_id' }, { status: 400 });

    const e = base44.asServiceRole.entities;
    const einheit = await e.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    const profil = await loadProfil(e, user.email);
    if (!darfIntegrationVerwalten(user, profil, einheit)) {
      return Response.json({ angebote: [], darf_verwalten: false });
    }

    const angebote = await listAll(e.Lernpakete, {
      integration_status: 'angeboten',
      integration_ziel_einheit_id: einheitId,
    });

    const detailliert = await Promise.all(angebote.map(async (paket) => {
      const [quellEinheit, aktivitaeten, masters, lernziele] = await Promise.all([
        e.Einheiten.get(paket.einheit_id).catch(() => null),
        listAll(e.LernpaketPhaseAktivitaet, { lernpaket_id: paket.id }),
        listAll(e.MasterAufgabe, { lernpaket_id: paket.id }),
        listAll(e.Lernziele, { lernpaket_id: paket.id }),
      ]);
      return {
        paket,
        quelle: {
          einheit_id: paket.einheit_id,
          einheit_titel: quellEinheit?.titel_der_einheit || '—',
          besitzer_email: quellEinheit?.besitzer_email || paket.integration_angeboten_von || '',
        },
        aktivitaeten: aktivitaeten.filter(a => a.sync_status !== 'to_delete'),
        masters,
        lernziele,
      };
    }));

    return Response.json({ angebote: detailliert, darf_verwalten: true });
  } catch (error) {
    console.error('[listLernpaketIntegrationAngebote]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}