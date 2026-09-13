/**
 * didaktikerAktivitaetBauen
 *
 * SCHRITT 4 des Didaktikers: EINE Aktivität mit Inhalt füllen — und zwar nur
 * VORSCHLAGEN. Hier wird nichts in den Datenbestand geschrieben; die Lehrkraft
 * sieht das Ergebnis erst in der Schüler-Vorschau und übernimmt es dann.
 *
 * Zwei Wege, beide aus shared/didaktikerInhalt.js:
 *  A) Varianten-Formate (Lückentext, Zuordnen, Reihenfolge, Miniquiz, Test):
 *     Der Inhalt gehört in MasterAufgaben — es werden gleich mehrere Varianten
 *     erzeugt, damit nicht alle Schüler an derselben Aufgabe sitzen.
 *  B) Alle übrigen: field_values nach dem form_schema der Aufgabenart. url-Felder
 *     werden per Recherche gefüllt und die Adresse per HTTP geprüft — eine
 *     erfundene Adresse ist im Kurs ein toter Link.
 *
 * Payload: { sitzung_id, lernpaket_id, katalog_id, absicht?, anzahl_varianten? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { unwrapLLM } from '../../shared/llmUtils.js';
import {
  istMasterArt,
  getMasterSpezifikation,
  planeFelder,
  baueFieldValues,
  findeQuelle,
  SYSTEM_PROMPT,
  BASIS_REGELN,
} from '../../shared/didaktikerInhalt.js';
import { baueOffeneAufgabe, fragmentZuDokument } from '../../shared/didaktikerOffeneAufgabe.js';
import {
  ladeSitzung,
  baueKontext,
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
    if (!lernpaketId || !katalogId) {
      return Response.json({ error: 'lernpaket_id und katalog_id sind nötig.' }, { status: 400 });
    }

    const [lernpaket, katalog] = await Promise.all([
      base44.asServiceRole.entities.Lernpakete.get(lernpaketId).catch(() => null),
      base44.asServiceRole.entities.AktivitaetenKatalog.get(katalogId).catch(() => null),
    ]);
    if (!lernpaket || lernpaket.einheit_id !== sitzung.einheit_id) {
      return Response.json({ error: 'Dieses Lernpaket gehört nicht zu dieser Sitzung.' }, { status: 404 });
    }
    if (!katalog) return Response.json({ error: 'Aufgabenart nicht gefunden' }, { status: 404 });

    const lernziele = await base44.asServiceRole.entities.Lernziele.filter({ lernpaket_id: lernpaketId });
    const kontext = baueKontext(sitzung, {
      lernpaket: lernpaket.titel_des_pakets,
      lernziele: (lernziele || []).map((z) => z.formulierung_fachsprache).filter(Boolean),
      kernbegriffe_des_lernpakets: lernpaket.kernbegriffe || [],
      aufgabenart: katalog.name,
      absicht_dieser_aufgabe: String(body?.absicht || ''),
    });

    // ── Weg C: offene Aufgabe — der Regelfall für Übungen ──────────────
    // Hier wird eine eigens entworfene interaktive Aufgabe gebaut, weil nur
    // sie die gedankliche Operation des Lernziels abbilden kann.
    if (katalog.name === 'Offene Aufgabe') {
      const gebaut = await baueOffeneAufgabe(base44, {
        kontext,
        operation: String(body?.operation || ''),
        idee: String(body?.aufgaben_idee || body?.absicht || ''),
      });
      if (!gebaut) {
        return Response.json(
          { error: 'Die Aufgabe wurde nicht vollständig gebaut. Bitte erneut versuchen.' },
          { status: 502 }
        );
      }

      return Response.json({
        aufgabenart: katalog.name,
        phase: katalog.phase,
        katalog_id: katalogId,
        field_values: {
          aufgabentext: gebaut.aufgabentext,
          description: String(body?.aufgaben_idee || body?.absicht || gebaut.aufgabentext),
          approved_snapshot_html: fragmentZuDokument(gebaut.fragment),
        },
        master_varianten: [],
        fragment: gebaut.fragment,
      });
    }

    // ── Weg A: Varianten-Formate ───────────────────────────────────────
    if (istMasterArt(katalog)) {
      const spez = getMasterSpezifikation(katalog);
      const anzahl = Math.min(Math.max(Number(body?.anzahl_varianten) || 2, 1), 4);
      const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: JSON.stringify([
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              kontext,
              auftrag: `Erzeuge ${anzahl} Varianten dieser Aufgabe: gleiches Lernziel, gleiche Schwierigkeit, ANDERE Beispiele und Formulierungen.`,
              format_regeln: spez.regeln,
              regeln: BASIS_REGELN,
            }),
          },
        ]),
        model: 'claude-sonnet-5',
        response_json_schema: {
          type: 'object',
          properties: { varianten: { type: 'array', items: spez.schema } },
          required: ['varianten'],
        },
      });

      const ausgabe = unwrapLLM(antwort) || {};
      const roh = Array.isArray(ausgabe.varianten) ? ausgabe.varianten : [];
      const brauchbar = roh.filter((v) => spez.build(v));
      if (brauchbar.length === 0) {
        return Response.json(
          { error: `Für „${katalog.name}" kam kein brauchbarer Inhalt zurück. Bitte erneut versuchen.` },
          { status: 502 }
        );
      }

      return Response.json({
        aufgabenart: katalog.name,
        phase: katalog.phase,
        katalog_id: katalogId,
        field_values: {},
        master_varianten: brauchbar,
      });
    }

    // ── Weg B: field_values nach form_schema ───────────────────────────
    const plan = planeFelder(katalog);
    if (plan.fehler) return Response.json({ error: plan.fehler }, { status: 400 });

    let urlWert = '';
    if (plan.urlFelder.length > 0) {
      const quelle = await findeQuelle(base44, {
        fach: sitzung.fach,
        jahrgangsstufe: sitzung.jahrgangsstufe,
        thema: sitzung.thema,
        lernpaket: lernpaket.titel_des_pakets,
        vorschlaege: sitzung.fundament?.video_vorschlaege || [],
      });
      if (!quelle && plan.urlFelder.some((f) => f.required)) {
        return Response.json(
          { error: 'Zu diesem Lernpaket wurde kein erreichbares Video gefunden. Bitte diese Zeile abwählen oder die Adresse selbst eintragen.' },
          { status: 404 }
        );
      }
      urlWert = quelle?.url || '';
      kontext.gefundene_quelle = quelle ? { titel: quelle.titel, url: quelle.url, beschreibung: quelle.beschreibung } : null;
    }

    const eigenschaften = {};
    const regeln = [];
    plan.felder.forEach((eintrag) => {
      eigenschaften[eintrag.field.field_name] = eintrag.schema;
      if (eintrag.regel) regeln.push(`${eintrag.field.label || eintrag.field.field_name}: ${eintrag.regel}`);
    });

    if (Object.keys(eigenschaften).length === 0) {
      const { field_values, probleme } = baueFieldValues(plan, {}, urlWert);
      if (probleme.length > 0) {
        return Response.json({ error: `Es fehlt noch: ${probleme.join(', ')}` }, { status: 400 });
      }
      return Response.json({
        aufgabenart: katalog.name,
        phase: katalog.phase,
        katalog_id: katalogId,
        field_values,
        master_varianten: [],
      });
    }

    const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: JSON.stringify([
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            kontext,
            auftrag: `Befülle die Felder der Aufgabenart „${katalog.name}" vollständig und einsatzfertig.`,
            feld_regeln: regeln,
            regeln: BASIS_REGELN,
          }),
        },
      ]),
      model: 'claude-sonnet-5',
      response_json_schema: {
        type: 'object',
        properties: eigenschaften,
        required: plan.felder.filter((e) => e.field.required).map((e) => e.field.field_name),
      },
    });

    const ausgabe = unwrapLLM(antwort) || {};
    const { field_values, probleme } = baueFieldValues(plan, ausgabe, urlWert);
    if (probleme.length > 0) {
      return Response.json(
        { error: `Der Inhalt war unvollständig (${probleme.join(', ')}). Bitte erneut versuchen.` },
        { status: 502 }
      );
    }

    return Response.json({
      aufgabenart: katalog.name,
      phase: katalog.phase,
      katalog_id: katalogId,
      field_values,
      master_varianten: [],
      quelle: kontext.gefundene_quelle || null,
    });
  } catch (error) {
    console.error('[didaktikerAktivitaetBauen]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}