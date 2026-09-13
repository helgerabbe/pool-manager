/**
 * getEinheitStrukturLesend
 *
 * Das Tor nach außen, Teil 2 (lesend): Wie ist eine Einheit aufgebaut?
 * Themenfelder in Reihenfolge, darin die Lernpakete, darin die Aktivitäten je
 * Phase — mit Titeln, Typen, Reihenfolge und Status. Ein Absender braucht diese
 * Auskunft, um einen Auftrag überhaupt zielgerichtet stellen zu können
 * ("in Lernpaket Quadrate, Phase Üben, an 2. Stelle").
 *
 * ZWEI STUFEN (bewusst): Standardmäßig GETRIMMT — Struktur und Metadaten, keine
 * Inhalte. Wer die tatsächlichen Feldwerte einer KONKRETEN Aktivität braucht,
 * fordert sie gezielt an (aktivitaet_detail_id). So bekommt niemand den ganzen
 * Inhaltsbestand ausgeliefert, nur weil er die Struktur wissen wollte.
 *
 * Payload: { einheit_id, aktivitaet_detail_id? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

const PHASEN = ['Input', 'Übung', 'Abschluss'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const einheitId = body?.einheit_id;
    const detailId = body?.aktivitaet_detail_id || null;
    if (!einheitId) return Response.json({ error: 'einheit_id fehlt' }, { status: 400 });

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    const [themenfelder, lernpakete, katalog] = await Promise.all([
      base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: einheitId }),
      base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId }),
      base44.asServiceRole.entities.AktivitaetenKatalog.list(),
    ]);

    const aktivePakete = (lernpakete || []).filter((lp) => lp.sync_status !== 'to_delete');
    const katalogById = new Map((katalog || []).map((k) => [k.id, k]));

    // Aktivitäten aller Pakete in einem Zug holen — pro Paket eine Abfrage
    // wäre bei großen Einheiten eine Anfrage-Lawine.
    const aktivitaetenListen = await Promise.all(
      aktivePakete.map((lp) =>
        base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lp.id })
      )
    );

    const paketeByThemenfeld = new Map();
    aktivePakete
      .slice()
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
      .forEach((lp, idx) => {
        const aktivitaeten = (aktivitaetenListen[aktivePakete.indexOf(lp)] || []).filter(
          (a) => a.sync_status !== 'to_delete'
        );
        const phasen = PHASEN.map((phase) => ({
          phase,
          deaktiviert: lp.phasen_konfiguration?.[phase]?.disabled === true,
          aktivitaeten: aktivitaeten
            .filter((a) => a.phase === phase)
            .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
            .map((a, pos) => ({
              aktivitaet_instanz_id: a.id,
              position: pos,
              aufgabenart_id: a.aktivitaet_id,
              aufgabenart: katalogById.get(a.aktivitaet_id)?.name || 'Unbekannte Aufgabenart',
              erstellungs_modus: a.erstellungs_modus || 'manuell',
              vollstaendig: a.is_complete === true,
              sync_status: a.sync_status || 'new',
            })),
        }));

        const eintrag = {
          lernpaket_id: lp.id,
          titel: lp.titel_des_pakets,
          position: idx,
          reihenfolge_nummer: lp.reihenfolge_nummer || 0,
          freigabe: lp.content_status === 'approved' && !!lp.released_at ? 'freigegeben' : 'entwurf',
          vollstaendig: lp.is_complete === true,
          phasen,
        };
        const key = lp.themenfeld_id || '__ohne__';
        if (!paketeByThemenfeld.has(key)) paketeByThemenfeld.set(key, []);
        paketeByThemenfeld.get(key).push(eintrag);
      });

    const struktur = (themenfelder || [])
      .slice()
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map((tf, idx) => ({
        themenfeld_id: tf.id,
        titel: tf.titel,
        position: idx,
        leitfrage: tf.leitfrage || '',
        bearbeitungsmodus: tf.bearbeitungsmodus || 'offen',
        lernpakete: paketeByThemenfeld.get(tf.id) || [],
      }));

    const ohneThemenfeld = paketeByThemenfeld.get('__ohne__') || [];

    // Stufe 2: die vollen Inhalte EINER angeforderten Aktivität.
    let aktivitaet_detail = null;
    if (detailId) {
      const akt = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(detailId).catch(() => null);
      const paket = akt ? aktivePakete.find((lp) => lp.id === akt.lernpaket_id) : null;
      if (!akt || !paket) {
        return Response.json(
          { error: 'Die angeforderte Aktivität gehört nicht zu dieser Einheit' },
          { status: 404 }
        );
      }
      aktivitaet_detail = {
        aktivitaet_instanz_id: akt.id,
        lernpaket_id: akt.lernpaket_id,
        phase: akt.phase,
        aufgabenart_id: akt.aktivitaet_id,
        aufgabenart: katalogById.get(akt.aktivitaet_id)?.name || '',
        form_schema: katalogById.get(akt.aktivitaet_id)?.form_schema || [],
        erstellungs_modus: akt.erstellungs_modus || 'manuell',
        field_values: akt.field_values || {},
        ki_briefing: akt.ki_briefing || null,
      };
    }

    return Response.json({
      vertrag_version: 'einheit-struktur-1',
      detailstufe: detailId ? 'getrimmt+detail' : 'getrimmt',
      einheit: {
        einheit_id: einheit.id,
        titel: einheit.titel_der_einheit,
        fach: einheit.fach,
        jahrgangsstufe: einheit.jahrgangsstufe,
        sichtbarkeit: einheit.sichtbarkeit || 'oeffentlich',
        format: einheit.format || 'einheit',
        export_lifecycle_status: einheit.export_lifecycle_status || 'draft',
      },
      themenfelder: struktur,
      lernpakete_ohne_themenfeld: ohneThemenfeld,
      aktivitaet_detail,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}