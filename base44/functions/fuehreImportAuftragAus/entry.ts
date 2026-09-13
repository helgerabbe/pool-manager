/**
 * fuehreImportAuftragAus
 *
 * DAS FREIGABE-TOR: Erst hier, nach der bewussten Entscheidung einer
 * berechtigten Person, wird aus einem Auftrag eine echte Änderung im Bestand.
 *
 * Die Funktion baut KEINE eigene Fachlogik: Sie schreibt genau die Felder mit
 * genau den Bedeutungen, die auch die bestehenden Secure-Funktionen setzen
 * (Auto-Grün bei Lernpaket-Containern, `field_values` + ehrliches `is_complete`
 * bei Aktivitäten, Grabstein statt Hartlöschung). Sie ruft die
 * Secure-Funktionen bewusst NICHT auf: die verlangen zusätzlich einen
 * Bearbeitungs-Lock der aufrufenden Person auf dem Lernpaket — beim Ausführen
 * eines fremden Auftrags gibt es diesen Lock nicht, der Aufruf müsste also
 * scheitern.
 *
 * Vor jedem Schreibvorgang wird erneut geprüft: Der Auftrag muss 'ausfuehrbar'
 * sein, sonst wäre das Freigabe-Tor umgangen.
 *
 * Payload: { auftrag_id, begruendung? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  pruefeAktivitaetInhalt,
  pruefeSequenzInhalt,
  pruefeMasterVarianten,
} from '../../shared/importAuftragInhalt.js';
import {
  normalisiereSchritte,
  fuegeSchrittEin,
  verschiebeSchritt,
  ersetzeSchritt,
  entferneSchritt,
  beschreibeSchritt,
} from '../../shared/importAuftragSequenz.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

async function logAudit(base44, event) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: 1,
      status: 'success',
    });
  } catch (err) {
    console.error('[fuehreImportAuftragAus][AUDIT_ERROR]', err.message);
  }
}

const SCHRITT_PROTOKOLL = {
  schritt_einfuegen: 'Schritt eingefügt',
  schritt_verschieben: 'Schritt verschoben',
  schritt_aendern: 'Schritt ersetzt',
  schritt_entfernen: 'Schritt entfernt',
};

/** Lädt eine allgemeine Aufgabe und stellt sicher, dass es eine Sequenz ist. */
async function ladeSequenzAufgabe(base44, id) {
  const datensatz = await base44.asServiceRole.entities.AllgemeineAufgabe.get(id).catch(() => null);
  if (!datensatz) {
    return { ok: false, antwort: Response.json({ error: 'Allgemeine Aufgabe nicht gefunden' }, { status: 404 }) };
  }
  if (datensatz.aufgaben_modus !== 'sequenz') {
    return {
      ok: false,
      antwort: Response.json(
        { error: 'Das Import-Center bearbeitet in v1 nur Aufgaben im Modus „Sequenz".' },
        { status: 400 }
      ),
    };
  }
  return { ok: true, datensatz };
}

/**
 * Ehrliches `is_complete` nach jedem Schreibvorgang: gerechnet aus dem
 * TATSÄCHLICHEN Stand der Schrittfolge, nicht aus dem Auftrag — sonst würde
 * eine Aufgabe grün, weil der Auftrag vollständig war, obwohl noch alte
 * unvollständige Schritte darin stehen.
 */
async function istSequenzVollstaendig(base44, schritte) {
  const brauchtKatalog = (schritte || []).some((s) => s?.typ === 'katalog');
  const katalogById = brauchtKatalog
    ? new Map(((await base44.asServiceRole.entities.AktivitaetenKatalog.list()) || []).map((k) => [k.id, k]))
    : new Map();
  return pruefeSequenzInhalt(schritte, katalogById).isComplete;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const auftragId = body?.auftrag_id;
    if (!auftragId) return Response.json({ error: 'auftrag_id fehlt' }, { status: 400 });

    const auftrag = await base44.asServiceRole.entities.ImportAuftrag.get(auftragId).catch(() => null);
    if (!auftrag) return Response.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    if (auftrag.status === 'ausgefuehrt') {
      return Response.json({ error: 'Dieser Auftrag wurde bereits durchgeführt.' }, { status: 409 });
    }
    if (auftrag.pruefstatus !== 'ausfuehrbar') {
      return Response.json(
        { error: 'Der Auftrag ist noch nicht vollständig geprüft — bitte zuerst die offenen Punkte beheben.' },
        { status: 400 }
      );
    }

    const p = auftrag.parameter || {};
    const protokoll = [];
    let einheitId = auftrag.einheit_id || '';

    switch (auftrag.auftrags_art) {
      case 'einheit_anlegen': {
        const einheit = await base44.asServiceRole.entities.Einheiten.create({
          titel_der_einheit: p.titel_der_einheit,
          fach: p.fach,
          jahrgangsstufe: String(p.jahrgangsstufe),
          sichtbarkeit: p.sichtbarkeit || 'privat',
          besitzer_email: (p.sichtbarkeit || 'privat') === 'privat' ? user.email : '',
          wizard_status: 'aktiv',
        });
        await base44.asServiceRole.entities.EinheitMembers.create({
          einheit_id: einheit.id,
          user_email: user.email,
          unit_role: 'LEITUNG',
        });
        einheitId = einheit.id;
        protokoll.push({
          schritt: 'Einheit angelegt',
          entity: 'Einheiten',
          record_id: einheit.id,
          hinweis: `${p.titel_der_einheit} · ${p.fach} · Jg. ${p.jahrgangsstufe}`,
        });
        break;
      }

      case 'themenfeld_anlegen': {
        const bestand = await base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: auftrag.ziel_id });
        const reihenfolge =
          auftrag.position !== undefined && auftrag.position !== null
            ? Number(auftrag.position)
            : (bestand || []).length;
        const themenfeld = await base44.asServiceRole.entities.Themenfeld.create({
          einheit_id: auftrag.ziel_id,
          titel: p.titel,
          beschreibung: p.beschreibung || '',
          leitfrage: p.leitfrage || '',
          bearbeitungsmodus: p.bearbeitungsmodus || 'offen',
          reihenfolge,
        });
        // Nachrückende Themenfelder verschieben, damit die gewünschte Position
        // wirklich diese Position ist und nicht zwei Felder dieselbe Nummer haben.
        const nachrueckend = (bestand || []).filter((tf) => (tf.reihenfolge || 0) >= reihenfolge);
        if (nachrueckend.length > 0) {
          await base44.asServiceRole.entities.Themenfeld.bulkUpdate(
            nachrueckend.map((tf) => ({ id: tf.id, reihenfolge: (tf.reihenfolge || 0) + 1 }))
          );
        }
        einheitId = auftrag.ziel_id;
        protokoll.push({
          schritt: 'Themenfeld angelegt',
          entity: 'Themenfeld',
          record_id: themenfeld.id,
          hinweis: `${p.titel} (Position ${reihenfolge + 1})`,
        });
        break;
      }

      case 'lernpaket_anlegen': {
        const themenfeld = await base44.asServiceRole.entities.Themenfeld.get(auftrag.ziel_id);
        if (!themenfeld) return Response.json({ error: 'Themenfeld nicht gefunden' }, { status: 404 });
        const bestand = await base44.asServiceRole.entities.Lernpakete.filter({
          themenfeld_id: auftrag.ziel_id,
        });
        const aktiv = (bestand || []).filter((lp) => lp.sync_status !== 'to_delete');
        const reihenfolge =
          auftrag.position !== undefined && auftrag.position !== null
            ? Number(auftrag.position)
            : aktiv.length;
        const lernpaket = await base44.asServiceRole.entities.Lernpakete.create({
          einheit_id: themenfeld.einheit_id,
          themenfeld_id: auftrag.ziel_id,
          titel_des_pakets: p.titel,
          reihenfolge_nummer: reihenfolge,
          geschaetzte_dauer_minuten: p.geschaetzte_dauer_minuten || undefined,
          kernbegriffe: Array.isArray(p.kernbegriffe) ? p.kernbegriffe : [],
          // Struktur-Container: Auto-Grün, aber ohne released_at — also NICHT
          // freigegeben (identisch zu createLernpaketWithAutoApproval).
          content_status: 'approved',
          sync_status: 'new',
        });
        const nachrueckend = aktiv.filter((lp) => (lp.reihenfolge_nummer || 0) >= reihenfolge);
        if (nachrueckend.length > 0) {
          await base44.asServiceRole.entities.Lernpakete.bulkUpdate(
            nachrueckend.map((lp) => ({ id: lp.id, reihenfolge_nummer: (lp.reihenfolge_nummer || 0) + 1 }))
          );
        }
        einheitId = themenfeld.einheit_id;
        protokoll.push({
          schritt: 'Lernpaket angelegt',
          entity: 'Lernpakete',
          record_id: lernpaket.id,
          hinweis: `${p.titel} (Position ${reihenfolge + 1})`,
        });
        break;
      }

      case 'aktivitaet_einfuegen': {
        const [paket, katalog] = await Promise.all([
          base44.asServiceRole.entities.Lernpakete.get(auftrag.ziel_id),
          base44.asServiceRole.entities.AktivitaetenKatalog.get(p.aktivitaet_id),
        ]);
        if (!paket) return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
        if (!katalog) return Response.json({ error: 'Aufgabenart nicht gefunden' }, { status: 404 });

        const bestand = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
          lernpaket_id: auftrag.ziel_id,
        });
        const inPhase = (bestand || [])
          .filter((a) => a.phase === p.phase && a.sync_status !== 'to_delete')
          .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
        const reihenfolge =
          auftrag.position !== undefined && auftrag.position !== null
            ? Number(auftrag.position)
            : inPhase.length;

        const varianten = pruefeMasterVarianten(katalog, p.master_varianten || []).gebaut;
        const hatVarianten = Array.isArray(p.master_varianten) && p.master_varianten.length > 0;
        const inhalt = pruefeAktivitaetInhalt(katalog, p.field_values || {}, p.master_varianten || null);
        const aktivitaet = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.create({
          lernpaket_id: auftrag.ziel_id,
          aktivitaet_id: p.aktivitaet_id,
          phase: p.phase,
          reihenfolge,
          field_values: p.field_values || {},
          erstellungs_modus: 'manuell',
          is_complete: inhalt.isComplete,
          content_status: 'draft',
          sync_status: 'new',
        });
        const nachrueckend = inPhase.filter((a) => (a.reihenfolge || 0) >= reihenfolge);
        if (nachrueckend.length > 0) {
          await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.bulkUpdate(
            nachrueckend.map((a) => ({ id: a.id, reihenfolge: (a.reihenfolge || 0) + 1 }))
          );
        }
        // Varianten-Formate: Der Inhalt lebt in MasterAufgaben — genau die
        // lesen die Schüler-Seiten.
        if (hatVarianten && varianten.length > 0) {
          await base44.asServiceRole.entities.MasterAufgabe.bulkCreate(
            varianten.map((fv, idx) => ({
              activity_id: aktivitaet.id,
              lernpaket_id: auftrag.ziel_id,
              titel: `Variante ${idx + 1}`,
              field_values: fv,
              reihenfolge: idx,
              is_complete: true,
              content_status: 'draft',
              sync_status: 'new',
            }))
          );
          await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(aktivitaet.id, {
            is_complete: true,
          });
        }

        einheitId = paket.einheit_id;
        protokoll.push({
          schritt: 'Aktivität eingefügt',
          entity: 'LernpaketPhaseAktivitaet',
          record_id: aktivitaet.id,
          hinweis: `${katalog.name} · Phase ${p.phase} · Position ${reihenfolge + 1}${
            varianten.length > 0 ? ` · ${varianten.length} Variante(n)` : ''
          }`,
        });
        break;
      }

      case 'aktivitaet_aendern': {
        const aktivitaet = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(auftrag.ziel_id);
        if (!aktivitaet) return Response.json({ error: 'Aktivität nicht gefunden' }, { status: 404 });
        const katalog = await base44.asServiceRole.entities.AktivitaetenKatalog
          .get(aktivitaet.aktivitaet_id)
          .catch(() => null);
        const hatVarianten = Array.isArray(p.master_varianten) && p.master_varianten.length > 0;
        const varianten = hatVarianten ? pruefeMasterVarianten(katalog, p.master_varianten).gebaut : [];
        const inhalt = pruefeAktivitaetInhalt(katalog, p.field_values || {}, p.master_varianten || null);

        // Neue Varianten ERSETZEN die bestehenden: Sonst stünden zwei
        // Fassungen derselben Aufgabe im Kurs nebeneinander.
        if (hatVarianten) {
          const bestand = await base44.asServiceRole.entities.MasterAufgabe
            .filter({ activity_id: auftrag.ziel_id })
            .catch(() => []);
          const lebend = (bestand || []).filter((m) => m.sync_status !== 'to_delete');
          if (lebend.length > 0) {
            await base44.asServiceRole.entities.MasterAufgabe.bulkUpdate(
              lebend.map((m) => ({ id: m.id, sync_status: 'to_delete' }))
            );
          }
          await base44.asServiceRole.entities.MasterAufgabe.bulkCreate(
            varianten.map((fv, idx) => ({
              activity_id: auftrag.ziel_id,
              lernpaket_id: aktivitaet.lernpaket_id,
              titel: `Variante ${idx + 1}`,
              field_values: fv,
              reihenfolge: idx,
              is_complete: true,
              content_status: 'draft',
              sync_status: 'new',
            }))
          );
        }

        await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(auftrag.ziel_id, {
          field_values: p.field_values || {},
          erstellungs_modus: 'manuell',
          ki_briefing: null,
          is_complete: hatVarianten ? varianten.length > 0 : inhalt.isComplete,
          export_error: false,
          sync_status: aktivitaet.sync_status === 'synced' ? 'modified' : aktivitaet.sync_status || 'new',
        });
        protokoll.push({
          schritt: 'Inhalte der Aktivität ersetzt',
          entity: 'LernpaketPhaseAktivitaet',
          record_id: auftrag.ziel_id,
          hinweis: Object.keys(p.field_values || {}).join(', ') || 'keine Felder',
        });
        break;
      }

      case 'aktivitaet_loeschen': {
        const aktivitaet = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(auftrag.ziel_id);
        if (!aktivitaet) return Response.json({ error: 'Aktivität nicht gefunden' }, { status: 404 });
        // Grabstein statt Hartlöschung: Der Kursbau muss die Entfernung sehen.
        await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(auftrag.ziel_id, {
          sync_status: 'to_delete',
        });
        protokoll.push({
          schritt: 'Aktivität zur Entfernung markiert',
          entity: 'LernpaketPhaseAktivitaet',
          record_id: auftrag.ziel_id,
          hinweis: p.grund || '',
        });
        break;
      }

      case 'status_setzen': {
        const paket = await base44.asServiceRole.entities.Lernpakete.get(auftrag.ziel_id);
        if (!paket) return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
        const freigeben = p.content_status === 'approved';
        await base44.asServiceRole.entities.Lernpakete.update(auftrag.ziel_id, {
          content_status: freigeben ? 'approved' : 'draft',
          released_at: freigeben ? new Date().toISOString() : null,
          released_by: freigeben ? user.email : null,
        });
        einheitId = paket.einheit_id;
        protokoll.push({
          schritt: freigeben ? 'Lernpaket freigegeben' : 'Freigabe zurückgenommen',
          entity: 'Lernpakete',
          record_id: auftrag.ziel_id,
          hinweis: paket.titel_des_pakets || '',
        });
        break;
      }

      case 'allgemeine_aufgabe_anlegen': {
        const einheit = await base44.asServiceRole.entities.Einheiten.get(auftrag.ziel_id).catch(() => null);
        if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

        const schritte = normalisiereSchritte(p.sequenz_schritte);
        const vollstaendig = await istSequenzVollstaendig(base44, schritte);
        const aufgabe = await base44.asServiceRole.entities.AllgemeineAufgabe.create({
          einheit_id: auftrag.ziel_id,
          themenfeld_id: p.themenfeld_id || undefined,
          titel: p.titel,
          aufgabenstellung: p.aufgabenstellung || '',
          anforderungsebene: p.anforderungsebene || '1 - Basis',
          aufgaben_typ: 'inhalt',
          aufgaben_modus: 'sequenz',
          mission_type: p.mission_type || undefined,
          schwierigkeitsgrad: p.schwierigkeitsgrad || undefined,
          sequenz_schritte: schritte,
          erstellungs_modus: 'manuell',
          is_complete: vollstaendig,
          content_status: 'draft',
          sync_status: 'new',
        });
        einheitId = auftrag.ziel_id;
        protokoll.push({
          schritt: 'Sequenzaufgabe angelegt',
          entity: 'AllgemeineAufgabe',
          record_id: aufgabe.id,
          hinweis: `${p.titel} · ${schritte.length} Schritt(e)`,
        });
        break;
      }

      case 'allgemeine_aufgabe_aendern': {
        const aufgabe = await ladeSequenzAufgabe(base44, auftrag.ziel_id);
        if (!aufgabe.ok) return aufgabe.antwort;
        const alt = aufgabe.datensatz;

        const schritte = normalisiereSchritte(p.sequenz_schritte);
        const vollstaendig = await istSequenzVollstaendig(base44, schritte);
        await base44.asServiceRole.entities.AllgemeineAufgabe.update(auftrag.ziel_id, {
          titel: p.titel !== undefined ? p.titel : alt.titel,
          aufgabenstellung: p.aufgabenstellung !== undefined ? p.aufgabenstellung : alt.aufgabenstellung,
          mission_type: p.mission_type || alt.mission_type || undefined,
          schwierigkeitsgrad: p.schwierigkeitsgrad || alt.schwierigkeitsgrad || undefined,
          sequenz_schritte: schritte,
          is_complete: vollstaendig,
          export_error: false,
          sync_status: alt.sync_status === 'synced' ? 'modified' : alt.sync_status || 'new',
        });
        einheitId = alt.einheit_id || einheitId;
        protokoll.push({
          schritt: 'Sequenzaufgabe geändert',
          entity: 'AllgemeineAufgabe',
          record_id: auftrag.ziel_id,
          hinweis: `${schritte.length} Schritt(e) übernommen`,
        });
        break;
      }

      case 'allgemeine_aufgabe_loeschen': {
        const aufgabe = await ladeSequenzAufgabe(base44, auftrag.ziel_id);
        if (!aufgabe.ok) return aufgabe.antwort;
        // Grabstein statt Hartlöschung — der Kursbau muss die Entfernung sehen.
        await base44.asServiceRole.entities.AllgemeineAufgabe.update(auftrag.ziel_id, {
          sync_status: 'to_delete',
        });
        einheitId = aufgabe.datensatz.einheit_id || einheitId;
        protokoll.push({
          schritt: 'Sequenzaufgabe zur Entfernung markiert',
          entity: 'AllgemeineAufgabe',
          record_id: auftrag.ziel_id,
          hinweis: p.grund || '',
        });
        break;
      }

      case 'schritt_einfuegen':
      case 'schritt_verschieben':
      case 'schritt_aendern':
      case 'schritt_entfernen': {
        const aufgabe = await ladeSequenzAufgabe(base44, auftrag.ziel_id);
        if (!aufgabe.ok) return aufgabe.antwort;
        const alt = aufgabe.datensatz;
        const bestand = Array.isArray(alt.sequenz_schritte) ? alt.sequenz_schritte : [];

        let ergebnis = null;
        let text = '';
        if (auftrag.auftrags_art === 'schritt_einfuegen') {
          ergebnis = fuegeSchrittEin(bestand, p.schritt || {}, auftrag.position);
          text = `${beschreibeSchritt(p.schritt || {})} an Position ${ergebnis.position + 1}`;
        } else if (auftrag.auftrags_art === 'schritt_verschieben') {
          ergebnis = verschiebeSchritt(bestand, p.schritt_id, auftrag.position);
          if (ergebnis) text = `von Position ${ergebnis.von + 1} auf ${ergebnis.nach + 1}`;
        } else if (auftrag.auftrags_art === 'schritt_aendern') {
          ergebnis = ersetzeSchritt(bestand, p.schritt_id, p.schritt || {});
          if (ergebnis) text = `${beschreibeSchritt(p.schritt || {})} (Position ${ergebnis.position + 1})`;
        } else {
          ergebnis = entferneSchritt(bestand, p.schritt_id);
          if (ergebnis) text = `${beschreibeSchritt(ergebnis.entfernt)} · ${p.grund || ''}`;
        }

        if (!ergebnis) {
          return Response.json(
            { error: 'In dieser Aufgabe gibt es keinen Schritt mit dieser ID.' },
            { status: 404 }
          );
        }

        const vollstaendig = await istSequenzVollstaendig(base44, ergebnis.schritte);
        await base44.asServiceRole.entities.AllgemeineAufgabe.update(auftrag.ziel_id, {
          sequenz_schritte: ergebnis.schritte,
          is_complete: vollstaendig,
          export_error: false,
          sync_status: alt.sync_status === 'synced' ? 'modified' : alt.sync_status || 'new',
        });
        einheitId = alt.einheit_id || einheitId;
        protokoll.push({
          schritt: SCHRITT_PROTOKOLL[auftrag.auftrags_art],
          entity: 'AllgemeineAufgabe',
          record_id: auftrag.ziel_id,
          hinweis: text,
        });
        break;
      }

      default:
        return Response.json({ error: 'Unbekannte Auftragsart' }, { status: 400 });
    }

    const jetzt = new Date().toISOString();
    const aktualisiert = await base44.asServiceRole.entities.ImportAuftrag.update(auftragId, {
      status: 'ausgefuehrt',
      einheit_id: einheitId,
      entscheid_von: user.email,
      entscheid_am: jetzt,
      begruendung: String(body?.begruendung || '').trim() || auftrag.begruendung || '',
      ausfuehrung_protokoll: protokoll,
    });

    await logAudit(base44, {
      user: user.email,
      action: 'CREATE',
      resource: 'ImportAuftrag',
      resourceId: auftragId,
      changes: { auftrags_art: auftrag.auftrags_art, protokoll },
    });

    return Response.json({ auftrag: aktualisiert, protokoll });
  } catch (error) {
    console.error('[fuehreImportAuftragAus]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}