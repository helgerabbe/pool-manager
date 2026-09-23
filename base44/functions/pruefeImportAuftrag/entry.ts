/**
 * pruefeImportAuftrag
 *
 * DER EINGANG des Import-Centers. Nimmt einen Auftrag entgegen, prüft ihn
 * zweistufig und legt ihn im Posteingang ab — ausgeführt wird hier NICHTS.
 *
 *  1. Strukturell gegen den Vertrag seiner Auftragsart
 *     (base44/shared/importAuftragSchemata.js).
 *  2. Fachlich: existiert das Ziel überhaupt? Und bei Aktivitäts-Aufträgen —
 *     ergeben die mitgelieferten field_values eine bearbeitbare Aufgabe
 *     (base44/shared/importAuftragInhalt.js)?
 *
 * Was fehlt, kommt als `pruefergebnis` strukturiert zurück, damit das Formular
 * es pro Feld anzeigen kann. Der Auftrag wird trotzdem gespeichert (Status
 * 'eingegangen'/'geprueft') — so bleibt der Korrektur-Umlauf nachvollziehbar.
 *
 * ZWEI AUFRUFWEGE (2026-09-16): Aus dem internen Formular (angemeldete Person
 * mit Import-Center-Zugang, quelle='intern') ODER von außen durch den Kursbau
 * (MBK) mit `Authorization: Bearer <AUTOMATION_SECRET>`, quelle='mbk'. Beide
 * Wege benutzen denselben Vertrag und landen im selben Posteingang — das
 * Freigabe-Tor bleibt unangetastet. Den Vertrag liest die MBK im Repository
 * unter `auftraege/` (pushBausteinKatalog).
 *
 * Payload: { auftrag_id?, auftrags_art, titel?, ziel_typ?, ziel_id?, position?, parameter?, absender? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  istAutomationAufruf,
  holeAngemeldetenNutzer,
  ausweisFehler,
} from '../../shared/automationAuth.js';
import { validiereAuftragStruktur, getSchemaFuerArt, ART_LABELS } from '../../shared/importAuftragSchemata.js';
import {
  pruefeAktivitaetInhalt,
  pruefeSchrittInhalt,
  pruefeSequenzInhalt,
  pruefeFragmentInhalt,
} from '../../shared/importAuftragInhalt.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

/** Lädt das Ziel und liefert die zugehörige Einheit — oder einen Fehlereintrag. */
async function loeseZielAuf(base44, auftrag) {
  const fehler = [];
  let einheitId = '';

  if (auftrag.ziel_typ === 'einheit') {
    const einheit = await base44.asServiceRole.entities.Einheiten.get(auftrag.ziel_id).catch(() => null);
    if (!einheit) fehler.push({ fieldName: 'ziel_id', label: 'Einheit', reason: 'Einheit nicht gefunden' });
    else einheitId = einheit.id;
  } else if (auftrag.ziel_typ === 'themenfeld') {
    const tf = await base44.asServiceRole.entities.Themenfeld.get(auftrag.ziel_id).catch(() => null);
    if (!tf) fehler.push({ fieldName: 'ziel_id', label: 'Themenfeld', reason: 'Themenfeld nicht gefunden' });
    else einheitId = tf.einheit_id || '';
  } else if (auftrag.ziel_typ === 'lernpaket') {
    const lp = await base44.asServiceRole.entities.Lernpakete.get(auftrag.ziel_id).catch(() => null);
    if (!lp) fehler.push({ fieldName: 'ziel_id', label: 'Lernpaket', reason: 'Lernpaket nicht gefunden' });
    else einheitId = lp.einheit_id || '';
  } else if (auftrag.ziel_typ === 'allgemeine_aufgabe') {
    const aufg = await base44.asServiceRole.entities.AllgemeineAufgabe.get(auftrag.ziel_id).catch(() => null);
    if (!aufg) {
      fehler.push({ fieldName: 'ziel_id', label: 'Allgemeine Aufgabe', reason: 'Aufgabe nicht gefunden' });
    } else if (aufg.aufgaben_modus !== 'sequenz') {
      fehler.push({
        fieldName: 'ziel_id',
        label: 'Allgemeine Aufgabe',
        reason: 'Das Import-Center bearbeitet in v1 nur Aufgaben im Modus „Sequenz"',
      });
      einheitId = aufg.einheit_id || '';
    } else {
      einheitId = aufg.einheit_id || '';
    }
  } else if (auftrag.ziel_typ === 'aktivitaet') {
    const akt = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet
      .get(auftrag.ziel_id)
      .catch(() => null);
    if (!akt) {
      fehler.push({ fieldName: 'ziel_id', label: 'Aktivität', reason: 'Aktivität nicht gefunden' });
    } else {
      const lp = await base44.asServiceRole.entities.Lernpakete.get(akt.lernpaket_id).catch(() => null);
      einheitId = lp?.einheit_id || '';
    }
  }

  return { fehler, einheitId };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    let quelle = 'mbk';
    let absender = String(body?.absender || '').trim() || 'mbk';
    if (!istAutomationAufruf(req)) {
      // Weder Sitzung noch passender Schlüssel = Ausweis-Fehler (401). Vorher
      // warf `auth.me()` hier und die Antwort war ein HTTP 500.
      const user = await holeAngemeldetenNutzer(base44);
      if (!user) return ausweisFehler();
      if (!(await hatImportCenterZugang(base44, user))) {
        return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
      }
      quelle = 'intern';
      absender = user.email;
    }
    const art = body?.auftrags_art;
    const schema = getSchemaFuerArt(art);
    if (!schema) return Response.json({ error: 'Unbekannte Auftragsart' }, { status: 400 });

    const entwurf = {
      auftrags_art: art,
      titel: String(body?.titel || '').trim() || ART_LABELS[art] || art,
      ziel_typ: schema.ziel_typ,
      ziel_id: body?.ziel_id || '',
      position:
        schema.position_erlaubt && body?.position !== undefined && body?.position !== null
          ? Number(body.position)
          : undefined,
      parameter: body?.parameter && typeof body.parameter === 'object' ? body.parameter : {},
      quelle,
      absender,
    };

    // ── Stufe 1: Vertrag ───────────────────────────────────────────────
    const struktur = validiereAuftragStruktur(entwurf);
    const befunde = [...struktur.fehler];

    // ── Stufe 2: Ziel + Inhalt ─────────────────────────────────────────
    let einheitId = '';
    if (schema.ziel_typ !== 'keines' && entwurf.ziel_id) {
      const ziel = await loeseZielAuf(base44, entwurf);
      befunde.push(...ziel.fehler);
      einheitId = ziel.einheitId;
    }

    if (art === 'einheit_anlegen' && entwurf.parameter.fach) {
      const faecher = await base44.asServiceRole.entities.LookupFaecher.filter({ ist_aktiv: true });
      if (!(faecher || []).some((f) => f.name === entwurf.parameter.fach)) {
        befunde.push({ fieldName: 'parameter.fach', label: 'Fach', reason: 'Kein aktives Fach der Fächerverwaltung' });
      }
    }

    if (art === 'aktivitaet_einfuegen' || art === 'aktivitaet_aendern') {
      let katalogId = entwurf.parameter.aktivitaet_id || '';
      if (art === 'aktivitaet_aendern' && entwurf.ziel_id) {
        const akt = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet
          .get(entwurf.ziel_id)
          .catch(() => null);
        katalogId = akt?.aktivitaet_id || '';
      }
      const katalog = katalogId
        ? await base44.asServiceRole.entities.AktivitaetenKatalog.get(katalogId).catch(() => null)
        : null;
      if (!katalog) {
        befunde.push({
          fieldName: 'parameter.aktivitaet_id',
          label: 'Aufgabenart',
          reason: 'Aufgabenart nicht im Katalog gefunden',
        });
      } else {
        if (art === 'aktivitaet_einfuegen' && entwurf.parameter.phase && katalog.phase && katalog.phase !== entwurf.parameter.phase) {
          befunde.push({
            fieldName: 'parameter.phase',
            label: 'Phase',
            reason: `Diese Aufgabenart gehört zur Phase "${katalog.phase}"`,
          });
        }
        const inhalt = pruefeAktivitaetInhalt(
          katalog,
          entwurf.parameter.field_values || {},
          entwurf.parameter.master_varianten || null
        );
        befunde.push(...inhalt.missingFields);
      }
    }

    // ── Ebene der allgemeinen Aufgaben (Sequenzaufgaben) ────────────────
    const SEQUENZ_ARTEN = [
      'allgemeine_aufgabe_anlegen',
      'allgemeine_aufgabe_aendern',
      'schritt_einfuegen',
      'schritt_aendern',
    ];
    const SCHRITT_ARTEN = ['schritt_einfuegen', 'schritt_verschieben', 'schritt_aendern', 'schritt_entfernen'];

    if (SEQUENZ_ARTEN.includes(art)) {
      // Der Katalog wird nur geholt, wenn wirklich Schritte daraus vorkommen.
      const katalogListe = await base44.asServiceRole.entities.AktivitaetenKatalog.list();
      const katalogById = new Map((katalogListe || []).map((k) => [k.id, k]));

      if (art === 'allgemeine_aufgabe_anlegen' || art === 'allgemeine_aufgabe_aendern') {
        const res = pruefeSequenzInhalt(entwurf.parameter.sequenz_schritte, katalogById);
        befunde.push(...res.missingFields);
      } else {
        const res = pruefeSchrittInhalt(entwurf.parameter.schritt, katalogById, 'parameter.schritt');
        befunde.push(...res.missingFields);
      }
    }

    // ── Offene Aufgaben: das HTML-Fragment ───────────────────────────────
    if (art === 'offene_aufgabe_anlegen' || art === 'offene_aufgabe_html_ersetzen') {
      befunde.push(...pruefeFragmentInhalt(entwurf.parameter.fragment).missingFields);
    }

    // Beim Ersetzen muss klar sein, WELCHE offene Aufgabe gemeint ist. Ohne
    // diese Auflösung würde erst die Ausführung merken, dass es keinen
    // passenden Schritt gibt — dann steht der Auftrag schon als ausführbar da.
    if (art === 'offene_aufgabe_html_ersetzen' && entwurf.ziel_id) {
      const aufg = await base44.asServiceRole.entities.AllgemeineAufgabe.get(entwurf.ziel_id).catch(() => null);
      const schritte = Array.isArray(aufg?.sequenz_schritte) ? aufg.sequenz_schritte : [];
      const offene = schritte.filter((s) => s?.typ === 'offen');
      if (aufg) {
        if (entwurf.parameter.schritt_id) {
          const treffer = schritte.find((s) => s?.id === entwurf.parameter.schritt_id);
          if (!treffer) {
            befunde.push({
              fieldName: 'parameter.schritt_id',
              label: 'Schritt',
              reason: 'In dieser Aufgabe gibt es keinen Schritt mit dieser ID',
            });
          } else if (treffer.typ !== 'offen') {
            befunde.push({
              fieldName: 'parameter.schritt_id',
              label: 'Schritt',
              reason: `Dieser Schritt ist keine offene Aufgabe (Art: ${treffer.typ || '—'})`,
            });
          }
        } else if (offene.length === 0) {
          befunde.push({
            fieldName: 'ziel_id',
            label: 'Offene Aufgabe',
            reason: 'Diese Aufgabe enthält keinen Schritt vom Typ „offen"',
          });
        } else if (offene.length > 1) {
          befunde.push({
            fieldName: 'parameter.schritt_id',
            label: 'Schritt',
            reason: `Diese Aufgabe hat ${offene.length} offene Schritte — bitte schritt_id angeben`,
          });
        }
      }
    }

    // Ein Themenfeld muss zur Einheit gehören, in der die offene Aufgabe entsteht.
    if (art === 'offene_aufgabe_anlegen' && entwurf.parameter.themenfeld_id) {
      const tf = await base44.asServiceRole.entities.Themenfeld
        .get(entwurf.parameter.themenfeld_id)
        .catch(() => null);
      if (!tf || tf.einheit_id !== entwurf.ziel_id) {
        befunde.push({
          fieldName: 'parameter.themenfeld_id',
          label: 'Themenfeld',
          reason: 'Themenfeld gehört nicht zu dieser Einheit',
        });
      }
    }

    // Bei schrittgenauen Aufträgen muss der benannte Schritt existieren —
    // sonst würde die Ausführung ins Leere greifen.
    if (SCHRITT_ARTEN.includes(art) && entwurf.ziel_id) {
      const aufg = await base44.asServiceRole.entities.AllgemeineAufgabe.get(entwurf.ziel_id).catch(() => null);
      const schritte = Array.isArray(aufg?.sequenz_schritte) ? aufg.sequenz_schritte : [];
      if (aufg && art !== 'schritt_einfuegen') {
        const gefunden = schritte.some((s) => s?.id === entwurf.parameter.schritt_id);
        if (!gefunden) {
          befunde.push({
            fieldName: 'parameter.schritt_id',
            label: 'Schritt',
            reason: 'In dieser Aufgabe gibt es keinen Schritt mit dieser ID',
          });
        }
      }
      if (art === 'schritt_verschieben' && (entwurf.position === undefined || entwurf.position === null)) {
        befunde.push({
          fieldName: 'position',
          label: 'Position',
          reason: 'Beim Verschieben ist die Zielposition Pflicht',
        });
      }
    }

    // Ein Themenfeld muss zur Einheit gehören, in der die Aufgabe entsteht.
    if (art === 'allgemeine_aufgabe_anlegen' && entwurf.parameter.themenfeld_id) {
      const tf = await base44.asServiceRole.entities.Themenfeld
        .get(entwurf.parameter.themenfeld_id)
        .catch(() => null);
      if (!tf || tf.einheit_id !== entwurf.ziel_id) {
        befunde.push({
          fieldName: 'parameter.themenfeld_id',
          label: 'Themenfeld',
          reason: 'Themenfeld gehört nicht zu dieser Einheit',
        });
      }
    }

    const ausfuehrbar = befunde.length === 0;
    const jetzt = new Date().toISOString();
    const datensatz = {
      ...entwurf,
      einheit_id: einheitId,
      pruefstatus: ausfuehrbar ? 'ausfuehrbar' : 'geprueft',
      pruefergebnis: befunde,
      geprueft_am: jetzt,
      status: 'eingegangen',
    };
    if (datensatz.position === undefined) delete datensatz.position;

    // Erneutes Einreichen aktualisiert denselben Auftrag, statt eine zweite
    // Fassung derselben Absicht in den Posteingang zu legen.
    let auftrag;
    if (body?.auftrag_id) {
      const bestand = await base44.asServiceRole.entities.ImportAuftrag.get(body.auftrag_id).catch(() => null);
      if (!bestand) return Response.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
      if (bestand.status === 'ausgefuehrt') {
        return Response.json(
          { error: 'Dieser Auftrag wurde bereits durchgeführt und kann nicht mehr geändert werden.' },
          { status: 409 }
        );
      }
      auftrag = await base44.asServiceRole.entities.ImportAuftrag.update(body.auftrag_id, {
        ...datensatz,
        begruendung: '',
      });
    } else {
      auftrag = await base44.asServiceRole.entities.ImportAuftrag.create(datensatz);
    }

    return Response.json({
      auftrag,
      ausfuehrbar,
      pruefergebnis: befunde,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}