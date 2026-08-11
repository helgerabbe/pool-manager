/**
 * integrateLernpaketSecure
 *
 * Übernimmt ein angebotenes PRIVATES Lernpaket als KOPIE in ein Themenfeld
 * einer gemeinschaftlichen Poolzeit-Einheit — oder lehnt das Angebot ab.
 *
 * Sicherheits-/Konsistenz-Regeln:
 *  - nur Admin oder zuständige Fachschaftsleitung der Ziel-Einheit
 *  - Ziel-Einheit darf nicht final freigegeben / im Export sein
 *  - der Aufrufer muss den STRUKTUR-Lock der Ziel-Einheit halten
 *    (Bearbeitungsmodus aktiv) — sonst kollidiert die Übernahme mit
 *    parallelen Struktur-Änderungen
 *  - Dubletten-Schutz über Titel + Themenfeld (mit `force` übersteuerbar)
 *  - die Kopie startet als Entwurf (nicht freigegeben) und als 'new' für Moodle
 *
 * Payload: { lernpaket_id, einheit_id, themenfeld_id, position, force?, aktion? }
 *   aktion: 'integrieren' (Default) | 'ablehnen'
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  listAll, loadProfil, darfIntegrationVerwalten, normalizeTitel,
  copyLernpaketTree, EINHEIT_GESPERRT_LIFECYCLE,
} from '../../shared/lernpaketIntegration.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { lernpaket_id: lernpaketId, einheit_id: einheitId, themenfeld_id: themenfeldId } = payload;
    const aktion = payload?.aktion === 'ablehnen' ? 'ablehnen' : 'integrieren';
    const force = payload?.force === true;
    if (!lernpaketId || !einheitId) {
      return Response.json({ error: 'Missing lernpaket_id oder einheit_id' }, { status: 400 });
    }

    const e = base44.asServiceRole.entities;
    const [einheit, paket] = await Promise.all([
      e.Einheiten.get(einheitId).catch(() => null),
      e.Lernpakete.get(lernpaketId).catch(() => null),
    ]);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (!paket) return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });

    const profil = await loadProfil(e, user.email);
    if (!darfIntegrationVerwalten(user, profil, einheit)) {
      return Response.json(
        { error: 'Nur die zuständige Fachschaftsleitung oder Administratoren dürfen Lernpakete integrieren.' },
        { status: 403 }
      );
    }

    // Angebot muss genau für diese Einheit vorliegen.
    if (paket.integration_status !== 'angeboten' || paket.integration_ziel_einheit_id !== einheitId) {
      return Response.json(
        { error: 'Für dieses Lernpaket liegt kein Integrations-Angebot an diese Einheit vor.', code: 'NO_OFFER' },
        { status: 409 }
      );
    }

    // ── Ablehnen ──
    if (aktion === 'ablehnen') {
      await e.Lernpakete.update(lernpaketId, {
        integration_status: 'keine',
        integration_ziel_einheit_id: null,
      });
      await e.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'Lernpakete',
        resource_id: lernpaketId,
        changes: { action_code: 'REJECT_LERNPAKET_INTEGRATION', einheit_id: einheitId },
        affected_count: 1,
        status: 'success',
      }).catch(() => {});
      return Response.json({ success: true, aktion: 'ablehnen' });
    }

    // ── Integrieren ──
    if (EINHEIT_GESPERRT_LIFECYCLE.includes(einheit.export_lifecycle_status)) {
      return Response.json(
        { error: 'Einheit ist final freigegeben — Struktur gesperrt.', code: 'EINHEIT_FINAL_LOCKED' },
        { status: 423 }
      );
    }
    if (einheit.structural_lock !== user.email) {
      return Response.json(
        {
          error: einheit.structural_lock
            ? `Die Struktur wird gerade von ${einheit.structural_lock} bearbeitet.`
            : 'Bitte zuerst den Bearbeitungsmodus dieser Einheit starten.',
          code: 'STRUCTURAL_LOCK_REQUIRED',
        },
        { status: 409 }
      );
    }

    let zielThemenfeld = null;
    if (themenfeldId) {
      zielThemenfeld = await e.Themenfeld.get(themenfeldId).catch(() => null);
      if (!zielThemenfeld || zielThemenfeld.einheit_id !== einheitId) {
        return Response.json({ error: 'Themenfeld gehört nicht zu dieser Einheit.' }, { status: 400 });
      }
    }

    // Bestehende Pakete des Ziel-Themenfelds (für Dubletten-Check + Reihenfolge)
    const bestehende = (await listAll(e.Lernpakete, themenfeldId
      ? { themenfeld_id: themenfeldId }
      : { einheit_id: einheitId }))
      .filter(p => p.sync_status !== 'to_delete' && (themenfeldId || !p.themenfeld_id))
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

    const dublette = bestehende.find(
      p => normalizeTitel(p.titel_des_pakets) === normalizeTitel(paket.titel_des_pakets)
    );
    if (dublette && !force) {
      return Response.json(
        {
          error: `In diesem Themenfeld existiert bereits ein Lernpaket mit dem Titel „${dublette.titel_des_pakets}".`,
          code: 'DUPLICATE_TITLE',
          existing_id: dublette.id,
        },
        { status: 409 }
      );
    }

    const rawPos = Number.isInteger(payload?.position) ? payload.position : bestehende.length;
    const position = Math.max(0, Math.min(rawPos, bestehende.length));

    const herkunftText = `Aus privatem Lernpaket von ${paket.integration_angeboten_von || 'unbekannt'}`;
    const { neuesPaket, counts } = await copyLernpaketTree(
      e, paket, einheitId, themenfeldId || null, position + 1, herkunftText
    );

    // Reihenfolge im Ziel-Themenfeld neu durchzählen (neues Paket an gewählter Stelle).
    const neueOrdnung = [...bestehende];
    neueOrdnung.splice(position, 0, neuesPaket);
    const renumber = neueOrdnung
      .map((p, i) => ({ id: p.id, reihenfolge_nummer: i + 1 }))
      .filter((p, i) => neueOrdnung[i].reihenfolge_nummer !== i + 1);
    if (renumber.length > 0) await e.Lernpakete.bulkUpdate(renumber);

    // Angebot ist erledigt — Flag am Original entfernen.
    await e.Lernpakete.update(lernpaketId, {
      integration_status: 'keine',
      integration_ziel_einheit_id: null,
    });

    // Die Struktur der Einheit hat sich geändert → Moodle-Sync-Status nachziehen.
    if (einheit.sync_status === 'synced') {
      await e.Einheiten.update(einheitId, { sync_status: 'modified' });
    }

    await e.AuditLog.create({
      user_email: user.email,
      action: 'CREATE',
      resource_type: 'Lernpakete',
      resource_id: neuesPaket.id,
      changes: {
        action_code: 'INTEGRATE_LERNPAKET',
        quell_lernpaket_id: lernpaketId,
        quell_einheit_id: paket.einheit_id,
        einheit_id: einheitId,
        themenfeld_id: themenfeldId || null,
        position: position + 1,
        titel_des_pakets: neuesPaket.titel_des_pakets,
        copied_counts: counts,
      },
      affected_count: 1,
      status: 'success',
    }).catch(() => {});

    return Response.json({
      success: true,
      aktion: 'integrieren',
      neues_lernpaket_id: neuesPaket.id,
      titel: neuesPaket.titel_des_pakets,
      copied_counts: counts,
    });
  } catch (error) {
    console.error('[integrateLernpaketSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}