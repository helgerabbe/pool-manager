/**
 * ltiApi — Daten-API für Moodle-Schüler (LTI, Etappe 2).
 *
 * Moodle-Schüler haben KEIN Base44-Konto. Jede Anfrage trägt das signierte
 * Sitzungs-Token aus ltiLaunch. Wir prüfen die HMAC-Signatur + Ablaufzeit,
 * ermitteln daraus den MoodleSchueler und führen dann NUR die hier
 * freigeschalteten Aktionen per Service-Role aus. Die Schüler-Identität
 * (user_email) wird IMMER serverseitig aus dem Token abgeleitet — Werte aus
 * dem Client werden überschrieben, Updates/Deletes nur auf eigene Datensätze.
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

// Update-Daten dürfen die Identität nie umschreiben
const ohneUserEmail = (data) => {
  const d = { ...(data || {}) };
  delete d.user_email;
  return d;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const E = base44.asServiceRole.entities;

    const body = await req.json().catch(() => ({}));
    const { token, action } = body;
    const params = body.params || {};
    if (!token || !action) return Response.json({ error: 'token und action sind erforderlich.' }, { status: 400 });

    // ── Token prüfen ──
    const interna = (await E.LtiInterna.list()).map(norm);
    const signingKey = interna.find((i) => i.schluessel === 'session_signing_key');
    if (!signingKey) return Response.json({ error: 'App-Einrichtung unvollständig (kein Signierschlüssel).' }, { status: 500 });

    const [part, sig] = String(token).split('.');
    if (!part || !sig || (await hmacSign(signingKey.wert, part)) !== sig) {
      return Response.json({ error: 'Ungültige Sitzung. Bitte in Moodle erneut auf die Aktivität klicken.' }, { status: 401 });
    }
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp || payload.exp < Date.now()) {
      return Response.json({ error: 'Deine Sitzung ist abgelaufen. Bitte in Moodle erneut auf die Aktivität klicken.' }, { status: 401 });
    }

    let schueler = null;
    try {
      schueler = norm(await E.MoodleSchueler.get(payload.sid));
    } catch (_e) { /* unten behandelt */ }
    if (!schueler) return Response.json({ error: 'Schülerprofil nicht gefunden. Bitte in Moodle erneut einsteigen.' }, { status: 401 });

    const userEmail = (schueler.email || '').trim() || `moodle-${schueler.id}@lti.local`;

    // Eigentums-Prüfung für Updates/Deletes auf Schüler-Datensätzen
    const owned = async (entity, id) => {
      const rec = norm(await entity.get(id));
      if (!rec || rec.user_email !== userEmail) throw new Error('Kein Zugriff auf diesen Datensatz.');
      return rec;
    };

    let result = null;
    switch (action) {
      // ── Identität ──
      case 'getCurrentUser':
        result = {
          email: userEmail,
          full_name: schueler.anzeige_name || `${schueler.vorname || ''} ${schueler.nachname || ''}`.trim(),
          ist_moodle_schueler: true,
        };
        break;

      // ── Inhalte (read-only) ──
      case 'getEinheit':
        result = norm(await E.Einheiten.get(params.id));
        break;
      case 'listEinheiten':
        result = (await E.Einheiten.list()).map(norm).filter((e) => e.sichtbarkeit !== 'privat');
        break;
      case 'listSystemBausteine':
        result = (await E.SystemBausteine.list('reihenfolge')).map(norm);
        break;
      case 'listAufgabenByEinheit':
        result = (await E.AllgemeineAufgabe.filter({ einheit_id: params.einheitId })).map(norm);
        break;
      case 'listLernpaketeByEinheit':
        result = (await E.Lernpakete.filter({ einheit_id: params.einheitId })).map(norm);
        break;
      case 'getAktivitaetenKatalog':
        result = (await E.AktivitaetenKatalog.list()).map(norm);
        break;
      case 'getAktivitaetenByLernpaket': {
        // Gleiche Logik wie AktivitaetService.getAktivitaetenByLernpaket:
        // Tombstones ausblenden + MasterAufgaben anhängen/mergen.
        const [aktRaw, master] = await Promise.all([
          E.LernpaketPhaseAktivitaet.filter({ lernpaket_id: params.lernpaketId }),
          E.MasterAufgabe.filter({ lernpaket_id: params.lernpaketId }),
        ]);
        const aktivitaeten = aktRaw.map(norm).filter((a) => a.sync_status !== 'to_delete');
        const masterByActivity = new Map();
        master.map(norm)
          .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
          .forEach((m) => {
            if (!masterByActivity.has(m.activity_id)) masterByActivity.set(m.activity_id, []);
            masterByActivity.get(m.activity_id).push(m);
          });
        result = aktivitaeten
          .map((akt) => {
            const masterListe = masterByActivity.get(akt.id) || [];
            const mitMaster = { ...akt, master_aufgaben: masterListe };
            const eigeneFv = akt.field_values || {};
            if (Object.keys(eigeneFv).length === 0) {
              const erste = masterListe[0];
              if (erste?.field_values && Object.keys(erste.field_values).length > 0) {
                mitMaster.field_values = erste.field_values;
              }
            }
            return mitMaster;
          })
          .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
        break;
      }
      case 'listThemenfelderByEinheit':
        result = (await E.Themenfeld.filter({ einheit_id: params.einheitId })).map(norm);
        break;
      case 'listLernzieleByLernpaket':
        result = (await E.Lernziele.filter({ lernpaket_id: params.lernpaketId })).map(norm);
        break;
      case 'listFaecher':
        result = (await E.LookupFaecher.list('reihenfolge')).map(norm);
        break;
      case 'listPhasen':
        result = (await E.LookupPhasen.list()).map(norm);
        break;
      case 'listInhaltSnapshots':
        result = (await E.SchuelerInhaltSnapshot.filter(params.filter || {})).map(norm);
        break;

      // ── Schülerdaten: Einheit-Fortschritt ──
      case 'listEinheitFortschritt': {
        const f = { user_email: userEmail };
        if (params.einheitId) f.einheit_id = params.einheitId;
        result = (await E.SchuelerEinheitFortschritt.filter(f)).map(norm);
        break;
      }
      case 'createEinheitFortschritt':
        result = norm(await E.SchuelerEinheitFortschritt.create({ ...ohneUserEmail(params.data), user_email: userEmail }));
        break;
      case 'updateEinheitFortschritt':
        await owned(E.SchuelerEinheitFortschritt, params.id);
        result = norm(await E.SchuelerEinheitFortschritt.update(params.id, ohneUserEmail(params.data)));
        break;

      // ── Schülerdaten: Aktivitäts-Fortschritt ──
      case 'listAktivitaetFortschritt':
        result = (await E.SchuelerAktivitaetFortschritt.filter({
          user_email: userEmail,
          einheit_id: params.einheitId,
          lerntyp: params.lerntyp,
        })).map(norm);
        break;
      case 'createAktivitaetFortschritt':
        result = norm(await E.SchuelerAktivitaetFortschritt.create({ ...ohneUserEmail(params.data), user_email: userEmail }));
        break;
      case 'updateAktivitaetFortschritt':
        await owned(E.SchuelerAktivitaetFortschritt, params.id);
        result = norm(await E.SchuelerAktivitaetFortschritt.update(params.id, ohneUserEmail(params.data)));
        break;

      // ── Schülerdaten: Lernziel-Einschätzungen ──
      case 'listLernzielEinschaetzungen':
        result = (await E.SchuelerLernzielEinschaetzung.filter({ user_email: userEmail, einheit_id: params.einheitId })).map(norm);
        break;
      case 'createLernzielEinschaetzung':
        result = norm(await E.SchuelerLernzielEinschaetzung.create({ ...ohneUserEmail(params.data), user_email: userEmail }));
        break;
      case 'updateLernzielEinschaetzung':
        await owned(E.SchuelerLernzielEinschaetzung, params.id);
        result = norm(await E.SchuelerLernzielEinschaetzung.update(params.id, ohneUserEmail(params.data)));
        break;
      case 'deleteLernzielEinschaetzung':
        await owned(E.SchuelerLernzielEinschaetzung, params.id);
        result = await E.SchuelerLernzielEinschaetzung.delete(params.id);
        break;

      // ── Schülerdaten: Zeit-Logs ──
      case 'listZeitLogs':
        result = (await E.SchuelerEinheitZeitLog.filter({ ...(params.filter || {}), user_email: userEmail })).map(norm);
        break;
      case 'createZeitLog':
        result = norm(await E.SchuelerEinheitZeitLog.create({ ...ohneUserEmail(params.data), user_email: userEmail }));
        break;
      case 'updateZeitLog':
        await owned(E.SchuelerEinheitZeitLog, params.id);
        result = norm(await E.SchuelerEinheitZeitLog.update(params.id, ohneUserEmail(params.data)));
        break;

      // ── Schülerdaten: Merkheft-Notizen ──
      case 'listNotizen':
        result = (await E.SchuelerEinheitNotiz.filter({ ...(params.filter || {}), user_email: userEmail }, params.sort)).map(norm);
        break;
      case 'createNotiz':
        result = norm(await E.SchuelerEinheitNotiz.create({ ...ohneUserEmail(params.data), user_email: userEmail }));
        break;
      case 'deleteNotiz':
        await owned(E.SchuelerEinheitNotiz, params.id);
        result = await E.SchuelerEinheitNotiz.delete(params.id);
        break;

      // ── Schülerdaten: Lerntagebuch ──
      case 'listLerntagebuch':
        result = (await E.SchuelerLerntagebuchEintrag.filter({ ...(params.filter || {}), user_email: userEmail }, params.sort, params.limit)).map(norm);
        break;
      case 'createLerntagebuchEintrag':
        result = norm(await E.SchuelerLerntagebuchEintrag.create({ ...ohneUserEmail(params.data), user_email: userEmail }));
        break;
      case 'bulkCreateLerntagebuch':
        result = await E.SchuelerLerntagebuchEintrag.bulkCreate(
          (params.eintraege || []).map((e) => ({ ...ohneUserEmail(e), user_email: userEmail }))
        );
        break;
      case 'deleteLerntagebuchEintrag':
        await owned(E.SchuelerLerntagebuchEintrag, params.id);
        result = await E.SchuelerLerntagebuchEintrag.delete(params.id);
        break;

      default:
        return Response.json({ error: `Unbekannte Aktion: ${action}` }, { status: 400 });
    }

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});