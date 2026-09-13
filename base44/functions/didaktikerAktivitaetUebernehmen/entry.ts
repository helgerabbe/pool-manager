/**
 * didaktikerAktivitaetUebernehmen
 *
 * SCHRITT 5 des Didaktikers: Die von der Lehrkraft gesichtete Aktivität wandert
 * in das Lernpaket — als Auftrag durch das Freigabe-Tor des Import-Centers.
 *
 * Damit gilt für den Assistenten dieselbe Messlatte wie für einen Auftrag von
 * außen: Erkennt die Prüfung den Inhalt als unvollständig, kommt er NICHT in den
 * Bestand, und die Lehrkraft sieht, was fehlt. Der Baustand wird an der Sitzung
 * vermerkt, damit nach einer Unterbrechung klar ist, was schon steht.
 *
 * Payload: { sitzung_id, lernpaket_id, katalog_id, phase, schluessel?,
 *            field_values?, master_varianten? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  ladeSitzung,
  fuehreAuftragAus,
  neueId,
  hatImportCenterZugang,
  ZUGANG_FEHLER,
} from '../../shared/didaktikerSitzung.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const geladen = await ladeSitzung(base44, user, body?.sitzung_id);
    if (!geladen.ok) return geladen.antwort;
    const sitzung = geladen.sitzung;

    const lernpaketId = String(body?.lernpaket_id || '').trim();
    const katalogId = String(body?.katalog_id || '').trim();
    const phase = String(body?.phase || '').trim();
    if (!lernpaketId || !katalogId || !phase) {
      return Response.json({ error: 'lernpaket_id, katalog_id und phase sind nötig.' }, { status: 400 });
    }

    const lernpaket = await base44.asServiceRole.entities.Lernpakete.get(lernpaketId).catch(() => null);
    if (!lernpaket || lernpaket.einheit_id !== sitzung.einheit_id) {
      return Response.json({ error: 'Dieses Lernpaket gehört nicht zu dieser Sitzung.' }, { status: 404 });
    }

    const varianten = Array.isArray(body?.master_varianten) ? body.master_varianten : [];
    const parameter = {
      aktivitaet_id: katalogId,
      phase,
      field_values: body?.field_values && typeof body.field_values === 'object' ? body.field_values : {},
      ...(varianten.length > 0 ? { master_varianten: varianten } : {}),
    };

    const ergebnis = await fuehreAuftragAus(base44, {
      auftrags_art: 'aktivitaet_einfuegen',
      titel: `Didaktiker: ${lernpaket.titel_des_pakets} · ${phase}`,
      ziel_typ: 'lernpaket',
      ziel_id: lernpaketId,
      einheit_id: sitzung.einheit_id,
      parameter,
    });

    if (!ergebnis.ok) {
      return Response.json(
        {
          error: 'Die Prüfung hat den Inhalt als unvollständig zurückgewiesen.',
          pruefergebnis: ergebnis.pruefergebnis,
          auftrag_id: ergebnis.auftrag_id,
        },
        { status: 400 }
      );
    }

    const stand = { ...(sitzung.lernpaket_stand || {}) };
    const vorher = stand[lernpaketId] || { plan: null, gebaut: [], fertig: false };
    stand[lernpaketId] = {
      ...vorher,
      gebaut: [
        ...(Array.isArray(vorher.gebaut) ? vorher.gebaut : []),
        {
          schluessel: String(body?.schluessel || ''),
          katalog_id: katalogId,
          phase,
          aktivitaet_instanz_id: neueId(ergebnis),
        },
      ],
    };

    const aktualisiert = await base44.asServiceRole.entities.DidaktikerSitzung.update(sitzung.id, {
      lernpaket_stand: stand,
      aktuelles_lernpaket_id: lernpaketId,
    });

    return Response.json({ sitzung: aktualisiert, protokoll: ergebnis.protokoll });
  } catch (error) {
    console.error('[didaktikerAktivitaetUebernehmen]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}