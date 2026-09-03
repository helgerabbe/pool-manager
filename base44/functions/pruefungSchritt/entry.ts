/**
 * pruefungSchritt
 *
 * Arbeitet EINEN Prüfschritt eines laufenden Prüflaufs ab (ein Lernpaket oder
 * eine Allgemeine Aufgabe) und speichert die gefundenen Befunde. Stufe A:
 * mechanische Regeln (shared/pruefungRegeln.js) — die KI-Stufe kommt später
 * dazu und schreibt in denselben Befund-Speicher.
 *
 * Payload: { prueflauf_id, schritt: { typ: 'lernpaket'|'aufgabe', id, titel } }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasPruefungLeitungAccess } from '../../shared/pruefungAccess.js';
import { speichereBefunde, ladeBefunde } from '../../shared/pruefungBefunde.js';
import {
  pruefeAktivitaetMechanisch,
  pruefeMasterMechanisch,
  pruefeAllgemeineAufgabeMechanisch,
} from '../../shared/pruefungRegeln.js';
import { findeFehlendeInterneInhalte } from '../../shared/pruefungInterneInhalte.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const prueflaufId = body?.prueflauf_id;
    const schritt = body?.schritt;
    if (!prueflaufId || !schritt?.typ || !schritt?.id) {
      return Response.json({ error: 'prueflauf_id und schritt sind erforderlich' }, { status: 400 });
    }

    const lauf = await base44.asServiceRole.entities.Prueflauf.get(prueflaufId);
    if (!lauf) return Response.json({ error: 'Prüflauf nicht gefunden' }, { status: 404 });
    const einheit = await base44.asServiceRole.entities.Einheiten.get(lauf.einheit_id);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (!(await hasPruefungLeitungAccess(base44, user, einheit))) {
      return Response.json({ error: 'Keine Berechtigung für die Prüfung' }, { status: 403 });
    }

    const jetzt = new Date().toISOString();
    const vorhandene = await ladeBefunde(base44, lauf.einheit_id);
    const katalog = await base44.asServiceRole.entities.AktivitaetenKatalog.list();
    const katalogById = new Map((katalog || []).map((k) => [k.id, k]));

    let gefunden = 0;
    let erneut = 0;

    const merken = async (ziel, kandidaten) => {
      if (!kandidaten || kandidaten.length === 0) return;
      const res = await speichereBefunde(base44, {
        einheitId: lauf.einheit_id,
        prueflaufId,
        ziel,
        kandidaten,
        vorhandene,
        quelle: 'regel',
        jetzt,
      });
      gefunden += res.fingerprints.length;
      erneut += res.erneut;
    };

    if (schritt.typ === 'lernpaket') {
      const lernpaket = await base44.asServiceRole.entities.Lernpakete.get(schritt.id);
      if (lernpaket) {
        const themenfeld = lernpaket.themenfeld_id
          ? await base44.asServiceRole.entities.Themenfeld.get(lernpaket.themenfeld_id).catch(() => null)
          : null;
        const kontext = {
          lernpaket_id: lernpaket.id,
          lernpaket_titel: lernpaket.titel_des_pakets || '',
          themenfeld_id: lernpaket.themenfeld_id || '',
          themenfeld_titel: themenfeld?.titel || '',
        };

        const [aktivitaeten, master] = await Promise.all([
          base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lernpaket.id }),
          base44.asServiceRole.entities.MasterAufgabe.filter({ lernpaket_id: lernpaket.id }),
        ]);
        const phasenConf = lernpaket.phasen_konfiguration || {};
        const aktiv = (aktivitaeten || []).filter(
          (a) => a.sync_status !== 'to_delete' && phasenConf?.[a.phase]?.disabled !== true
        );
        const masterByActivity = new Map();
        for (const m of master || []) {
          if (m.sync_status === 'to_delete' || !m.activity_id) continue;
          if (!masterByActivity.has(m.activity_id)) masterByActivity.set(m.activity_id, []);
          masterByActivity.get(m.activity_id).push(m);
        }

        for (const a of aktiv) {
          const k = katalogById.get(a.aktivitaet_id) || null;
          const varianten = masterByActivity.get(a.id) || [];
          // Masterfähige Aktivitäten tragen ihre Inhalte in den Varianten —
          // dann wird die Aktivität selbst nicht auf leere Felder geprüft.
          if (varianten.length === 0) {
            await merken(
              { ...kontext, ziel_typ: 'aktivitaet', ziel_id: a.id, ziel_titel: k?.name || 'Aufgabe' },
              pruefeAktivitaetMechanisch(a, k)
            );
          }
          for (const m of varianten) {
            await merken(
              {
                ...kontext,
                ziel_typ: 'master_aufgabe',
                ziel_id: m.id,
                ziel_titel: `${k?.name || 'Aufgabe'} – ${m.titel || 'Variante'}`,
              },
              pruefeMasterMechanisch(m, k)
            );
          }
        }
      }
    } else if (schritt.typ === 'interne_inhalte') {
      const [snapshots, bausteine, themenfelder] = await Promise.all([
        base44.asServiceRole.entities.SchuelerInhaltSnapshot.filter({ einheit_id: lauf.einheit_id }),
        base44.asServiceRole.entities.SystemBausteine.list(),
        base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: lauf.einheit_id }),
      ]);
      const fehlende = findeFehlendeInterneInhalte({
        einheit,
        snapshots: snapshots || [],
        systemBausteine: bausteine || [],
        themenfelder: themenfelder || [],
      });
      for (const f of fehlende) {
        await merken(
          {
            ziel_typ: 'systembaustein',
            ziel_id: f.ziel_id,
            ziel_titel: f.ziel_titel,
            themenfeld_id: f.themenfeld_id,
            themenfeld_titel: f.themenfeld_titel,
          },
          [f.kandidat]
        );
      }
    } else if (schritt.typ === 'aufgabe') {
      const aufgabe = await base44.asServiceRole.entities.AllgemeineAufgabe.get(schritt.id);
      if (aufgabe && aufgabe.sync_status !== 'to_delete') {
        const themenfeld = aufgabe.themenfeld_id
          ? await base44.asServiceRole.entities.Themenfeld.get(aufgabe.themenfeld_id).catch(() => null)
          : null;
        await merken(
          {
            ziel_typ: 'allgemeine_aufgabe',
            ziel_id: aufgabe.id,
            ziel_titel: aufgabe.titel || 'Aufgabe ohne Titel',
            themenfeld_id: aufgabe.themenfeld_id || '',
            themenfeld_titel: themenfeld?.titel || '',
          },
          pruefeAllgemeineAufgabeMechanisch(aufgabe)
        );
      }
    }

    const erledigt = (lauf.schritte_erledigt || 0) + 1;
    await base44.asServiceRole.entities.Prueflauf.update(prueflaufId, {
      schritte_erledigt: erledigt,
      aktueller_schritt: `${schritt.titel || schritt.typ} (${erledigt} von ${lauf.schritte_gesamt || erledigt})`,
    });

    return Response.json({ ok: true, schritte_erledigt: erledigt, gefunden, erneut });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}