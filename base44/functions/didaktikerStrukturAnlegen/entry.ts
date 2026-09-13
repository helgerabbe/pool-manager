/**
 * didaktikerStrukturAnlegen
 *
 * SCHRITT 2 des Didaktikers: Aus dem bestätigten Entwurf wird echte Struktur —
 * Einheit, Themenfelder, Lernpakete. Zusätzlich werden die Lernziele der
 * Lernpakete angelegt, damit die späteren Inhalts-Generatoren wissen, worauf
 * eine Aufgabe hinauslaufen soll.
 *
 * JEDER Schreibvorgang läuft durch das Freigabe-Tor des Import-Centers. Das ist
 * kein Umweg, sondern der Sinn der Sache: Derselbe Vertrag, dieselbe Prüfung,
 * dasselbe Protokoll wie bei einem Auftrag von außen. Scheitert ein Teilschritt
 * an der Prüfung, bricht der Aufbau ab und meldet, was fehlt — statt eine halb
 * gebaute Einheit stehen zu lassen, deren Zustand niemand kennt.
 *
 * Die Einheit entsteht PRIVAT: Ein KI-erzeugtes Basispaket gehört zunächst der
 * Lehrkraft, die es gebaut hat. Der Weg in die Poolzeit läuft wie immer über die
 * Fachschaftsleitung.
 *
 * Payload: { sitzung_id, struktur }   // struktur = die bearbeitete Fassung
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

    if (sitzung.einheit_id) {
      return Response.json({ error: 'Für diese Sitzung wurde die Einheit schon angelegt.' }, { status: 409 });
    }

    const struktur = body?.struktur && typeof body.struktur === 'object' ? body.struktur : sitzung.struktur_vorschlag;
    const themenfelder = (Array.isArray(struktur?.themenfelder) ? struktur.themenfelder : []).filter(
      (tf) => tf && String(tf.titel || '').trim()
    );
    if (themenfelder.length === 0) {
      return Response.json({ error: 'Der Entwurf enthält kein Themenfeld.' }, { status: 400 });
    }

    const einheitTitel = String(struktur?.titel || sitzung.thema || '').trim();

    // ── Einheit ────────────────────────────────────────────────────────
    const einheitErgebnis = await fuehreAuftragAus(base44, {
      auftrags_art: 'einheit_anlegen',
      titel: `Didaktiker: ${einheitTitel}`,
      parameter: {
        titel_der_einheit: einheitTitel,
        fach: sitzung.fach,
        jahrgangsstufe: String(sitzung.jahrgangsstufe),
        sichtbarkeit: 'privat',
      },
    });
    if (!einheitErgebnis.ok) {
      return Response.json(
        { error: 'Die Einheit konnte nicht angelegt werden.', pruefergebnis: einheitErgebnis.pruefergebnis },
        { status: 400 }
      );
    }
    const einheitId = neueId(einheitErgebnis);

    // ── Themenfelder, Lernpakete, Lernziele ────────────────────────────
    const angelegt = [];
    for (let tfIdx = 0; tfIdx < themenfelder.length; tfIdx += 1) {
      const tf = themenfelder[tfIdx];
      const tfErgebnis = await fuehreAuftragAus(base44, {
        auftrags_art: 'themenfeld_anlegen',
        titel: `Themenfeld: ${tf.titel}`,
        ziel_id: einheitId,
        position: tfIdx,
        parameter: {
          titel: String(tf.titel).trim(),
          leitfrage: String(tf.leitfrage || '').trim(),
          bearbeitungsmodus: 'offen',
        },
      });
      if (!tfErgebnis.ok) {
        return Response.json(
          {
            error: `Das Themenfeld „${tf.titel}" wurde von der Prüfung abgelehnt.`,
            pruefergebnis: tfErgebnis.pruefergebnis,
            einheit_id: einheitId,
          },
          { status: 400 }
        );
      }
      const themenfeldId = neueId(tfErgebnis);
      const pakete = (Array.isArray(tf.lernpakete) ? tf.lernpakete : []).filter(
        (lp) => lp && String(lp.titel || '').trim()
      );

      for (let lpIdx = 0; lpIdx < pakete.length; lpIdx += 1) {
        const lp = pakete[lpIdx];
        const lpErgebnis = await fuehreAuftragAus(base44, {
          auftrags_art: 'lernpaket_anlegen',
          titel: `Lernpaket: ${lp.titel}`,
          ziel_id: themenfeldId,
          position: lpIdx,
          parameter: {
            titel: String(lp.titel).trim(),
            geschaetzte_dauer_minuten: Number(lp.dauer_minuten) > 0 ? Number(lp.dauer_minuten) : 45,
            kernbegriffe: (Array.isArray(lp.kernbegriffe) ? lp.kernbegriffe : [])
              .map((k) => String(k || '').trim())
              .filter(Boolean),
          },
        });
        if (!lpErgebnis.ok) {
          return Response.json(
            {
              error: `Das Lernpaket „${lp.titel}" wurde von der Prüfung abgelehnt.`,
              pruefergebnis: lpErgebnis.pruefergebnis,
              einheit_id: einheitId,
            },
            { status: 400 }
          );
        }
        const lernpaketId = neueId(lpErgebnis);

        // Lernziele: Sie haben keine eigene Auftragsart im Vertrag des
        // Import-Centers (sie sind Beschreibung, keine Schüler-Aufgabe) und
        // werden deshalb direkt angelegt — mit denselben Feldern, die die
        // Lernziel-Werkstatt schreibt.
        const ziele = (Array.isArray(lp.lernziele) ? lp.lernziele : [])
          .map((z) => String(z || '').trim())
          .filter(Boolean);
        if (ziele.length > 0) {
          await base44.asServiceRole.entities.Lernziele.bulkCreate(
            ziele.map((z) => ({
              lernpaket_id: lernpaketId,
              formulierung_fachsprache: z,
              schueler_uebersetzung: z,
            }))
          ).catch((err) => console.warn('[didaktikerStrukturAnlegen] Lernziele', err.message));
        }

        angelegt.push({ lernpaket_id: lernpaketId, titel: String(lp.titel).trim(), themenfeld: String(tf.titel).trim() });
      }
    }

    if (angelegt.length === 0) {
      return Response.json(
        { error: 'Der Entwurf enthält kein Lernpaket.', einheit_id: einheitId },
        { status: 400 }
      );
    }

    const stand = {};
    angelegt.forEach((lp) => {
      stand[lp.lernpaket_id] = { plan: null, gebaut: [], fertig: false };
    });

    const aktualisiert = await base44.asServiceRole.entities.DidaktikerSitzung.update(sitzung.id, {
      einheit_id: einheitId,
      struktur_vorschlag: { ...(struktur || {}), titel: einheitTitel, themenfelder },
      schritt: 'lernpakete',
      aktuelles_lernpaket_id: angelegt[0].lernpaket_id,
      lernpaket_stand: stand,
    });

    return Response.json({ sitzung: aktualisiert, einheit_id: einheitId, lernpakete: angelegt });
  } catch (error) {
    console.error('[didaktikerStrukturAnlegen]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}