/**
 * offerLernpaketIntegrationSecure
 *
 * Bietet ein PRIVATES Lernpaket einer gemeinschaftlichen Poolzeit-Einheit
 * zur Integration an — oder zieht das Angebot zurück (ziel_einheit_id = null).
 * Das Lernpaket bleibt dabei unverändert beim Besitzer; die eigentliche
 * Übernahme als Kopie erfolgt später durch die Fachschaftsleitung
 * (integrateLernpaketSecure).
 *
 * Payload: { lernpaket_id, ziel_einheit_id | null }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { loadProfil, EINHEIT_GESPERRT_LIFECYCLE } from '../../shared/lernpaketIntegration.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const lernpaketId = payload?.lernpaket_id;
    const zielEinheitId = payload?.ziel_einheit_id || null;
    if (!lernpaketId) return Response.json({ error: 'Missing lernpaket_id' }, { status: 400 });

    const e = base44.asServiceRole.entities;
    const paket = await e.Lernpakete.get(lernpaketId).catch(() => null);
    if (!paket) return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });

    const quellEinheit = await e.Einheiten.get(paket.einheit_id).catch(() => null);
    if (!quellEinheit) return Response.json({ error: 'Quell-Einheit nicht gefunden' }, { status: 404 });

    const profil = await loadProfil(e, user.email);
    const istAdmin = user.role === 'admin' || profil?.rolle === 'Administrator';

    // Nur der Besitzer der privaten Einheit (oder Admin) darf anbieten.
    if (quellEinheit.sichtbarkeit !== 'privat') {
      return Response.json(
        { error: 'Nur Lernpakete aus einer privaten Einheit können zur Integration angeboten werden.' },
        { status: 400 }
      );
    }
    if (!istAdmin && quellEinheit.besitzer_email !== user.email) {
      return Response.json({ error: 'Nur der Besitzer dieser privaten Einheit darf das Lernpaket anbieten.' }, { status: 403 });
    }

    // ── Angebot zurückziehen ──
    if (!zielEinheitId) {
      await e.Lernpakete.update(lernpaketId, {
        integration_status: 'keine',
        integration_ziel_einheit_id: null,
        integration_angeboten_von: null,
        integration_angeboten_am: null,
      });
      return Response.json({ success: true, integration_status: 'keine' });
    }

    // ── Angebot setzen ──
    const zielEinheit = await e.Einheiten.get(zielEinheitId).catch(() => null);
    if (!zielEinheit) return Response.json({ error: 'Ziel-Einheit nicht gefunden' }, { status: 404 });
    if (zielEinheit.sichtbarkeit !== 'oeffentlich' || zielEinheit.ist_basismodul === true) {
      return Response.json({ error: 'Ziel muss eine gemeinschaftliche Poolzeit-Einheit sein.' }, { status: 400 });
    }
    if (zielEinheit.fach !== quellEinheit.fach) {
      return Response.json({ error: 'Lernpakete können nur innerhalb desselben Fachs angeboten werden.' }, { status: 400 });
    }
    if (EINHEIT_GESPERRT_LIFECYCLE.includes(zielEinheit.export_lifecycle_status)) {
      return Response.json(
        { error: 'Die Ziel-Einheit ist final freigegeben und nimmt gerade keine neuen Lernpakete auf.' },
        { status: 423 }
      );
    }

    await e.Lernpakete.update(lernpaketId, {
      integration_status: 'angeboten',
      integration_ziel_einheit_id: zielEinheitId,
      integration_angeboten_von: user.email,
      integration_angeboten_am: new Date().toISOString(),
    });

    await e.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Lernpakete',
      resource_id: lernpaketId,
      changes: {
        action_code: 'OFFER_LERNPAKET_INTEGRATION',
        ziel_einheit_id: zielEinheitId,
        titel_des_pakets: paket.titel_des_pakets,
      },
      affected_count: 1,
      status: 'success',
    }).catch(() => {});

    return Response.json({
      success: true,
      integration_status: 'angeboten',
      ziel_einheit_titel: zielEinheit.titel_der_einheit,
    });
  } catch (error) {
    console.error('[offerLernpaketIntegrationSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}