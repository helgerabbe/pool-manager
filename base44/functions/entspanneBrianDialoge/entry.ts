/**
 * entspanneBrianDialoge
 *
 * Einmalige Migration (2026-09-15): Entspannt ALLE bestehenden Brian-Dialoge.
 * - Abschlussregel (completion_rule): Strenge-Oeffner und generische
 *   Vollstaendigkeits-Forderungen werden entspannt, aufgabenspezifische
 *   Anteile und der Schluesselcode-Anhang bleiben woertlich stehen.
 * - Betreuungsstil (tutor_persona): auf 'unterstuetzend'.
 * - Zusaetzlich: die beiden globalen MBK-Prompts erhalten einen entspannten
 *   Abschnitt (guardrail_feedback, global_persona).
 *
 * Zwei Orte tragen Brian-Dialoge: die AllgemeineAufgabe selbst (Modus
 * 'einzeln', Felder brian_*) und ihre sequenz_schritte vom Typ 'brian'
 * (Feld schritt.brian). Beide werden erfasst.
 *
 * Payload: { dry_run?: boolean }  — Standard ist der TROCKENLAUF (true).
 * Nur mit dry_run=false wird geschrieben.
 *
 * Idempotent: ein zweiter Lauf aendert bereits entspannte Dialoge nicht.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  PERSONA_ZIEL,
  entspanneCompletionRule,
  GLOBAL_PROMPT_MARKE,
  GLOBAL_PROMPT_ZUSAETZE,
} from '../../shared/brianEntspannung.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur Administratoren dürfen diese Migration ausführen.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;

    const aufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.list('-created_date', 500);

    const protokoll = [];
    const updates = [];
    let dialogeGesamt = 0;
    let geaendert = 0;
    let uebersprungen = 0;
    let mitSchluessel = 0;

    for (const aufgabe of aufgaben) {
      const patch = {};

      // ── Ort 1: Einzelaufgabe (brian_*-Felder an der Aufgabe) ─────────────
      if (aufgabe.brian_completion_rule || aufgabe.brian_dialog_name) {
        dialogeGesamt++;
        const regel = entspanneCompletionRule(aufgabe.brian_completion_rule);
        const personaAlt = aufgabe.tutor_persona || '';
        const personaNeu = personaAlt === PERSONA_ZIEL ? personaAlt : PERSONA_ZIEL;
        if (regel.schluesselErhalten) mitSchluessel++;

        if (regel.geaendert || personaNeu !== personaAlt) {
          geaendert++;
          if (regel.geaendert) patch.brian_completion_rule = regel.text;
          if (personaNeu !== personaAlt) patch.tutor_persona = personaNeu;
          patch.brian_sync_status = 'modified';
          protokoll.push({
            ort: 'einzelaufgabe',
            aufgabe_id: aufgabe.id,
            titel: aufgabe.titel || '(ohne Titel)',
            persona: `${personaAlt || '(leer)'} → ${personaNeu}`,
            oeffner_ersetzt: regel.oeffnerErsetzt,
            wendungen_ersetzt: regel.wendungenErsetzt,
            schluesselcode_erhalten: regel.schluesselErhalten,
            vorher: (aufgabe.brian_completion_rule || '').slice(0, 260),
            nachher: regel.text.slice(0, 320),
          });
        } else {
          uebersprungen++;
        }
      }

      // ── Ort 2: Brian-Schritte innerhalb einer Aufgabensequenz ────────────
      const schritte = Array.isArray(aufgabe.sequenz_schritte) ? aufgabe.sequenz_schritte : [];
      let schritteGeaendert = false;
      const neueSchritte = schritte.map((schritt) => {
        if (schritt?.typ !== 'brian' || !schritt.brian) return schritt;
        dialogeGesamt++;

        const regel = entspanneCompletionRule(schritt.brian.completion_rule);
        const personaAlt = schritt.brian.tutor_persona || '';
        const personaNeu = personaAlt === PERSONA_ZIEL ? personaAlt : PERSONA_ZIEL;
        if (regel.schluesselErhalten) mitSchluessel++;

        if (!regel.geaendert && personaNeu === personaAlt) {
          uebersprungen++;
          return schritt;
        }

        geaendert++;
        schritteGeaendert = true;
        protokoll.push({
          ort: 'sequenz_schritt',
          aufgabe_id: aufgabe.id,
          schritt_id: schritt.id,
          titel: schritt.titel || aufgabe.titel || '(ohne Titel)',
          persona: `${personaAlt || '(leer)'} → ${personaNeu}`,
          oeffner_ersetzt: regel.oeffnerErsetzt,
          wendungen_ersetzt: regel.wendungenErsetzt,
          schluesselcode_erhalten: regel.schluesselErhalten,
          vorher: (schritt.brian.completion_rule || '').slice(0, 260),
          nachher: regel.text.slice(0, 320),
        });

        return {
          ...schritt,
          brian: {
            ...schritt.brian,
            completion_rule: regel.geaendert ? regel.text : schritt.brian.completion_rule,
            tutor_persona: personaNeu,
            sync_status: 'modified',
          },
        };
      });

      if (schritteGeaendert) patch.sequenz_schritte = neueSchritte;
      if (Object.keys(patch).length > 0) updates.push({ id: aufgabe.id, ...patch });
    }

    // ── Globale MBK-Prompts entspannen (idempotent per Marke) ─────────────
    const globalePrompts = [];
    for (const [schluessel, zusatz] of Object.entries(GLOBAL_PROMPT_ZUSAETZE)) {
      const treffer = await base44.asServiceRole.entities.MBKGlobalPrompt.filter({ schluessel });
      const eintrag = treffer?.[0];
      if (!eintrag) {
        globalePrompts.push({ schluessel, status: 'nicht gefunden' });
        continue;
      }
      const text = eintrag.prompt_text || '';
      if (text.includes(GLOBAL_PROMPT_MARKE)) {
        globalePrompts.push({ schluessel, status: 'bereits entspannt' });
        continue;
      }
      const neuerText = `${text.trimEnd()}\n\n---\n\n${zusatz}`;
      globalePrompts.push({ schluessel, status: 'wird entspannt', zusatz_laenge: zusatz.length });
      if (!dryRun) {
        await base44.asServiceRole.entities.MBKGlobalPrompt.update(eintrag.id, { prompt_text: neuerText });
      }
    }

    if (!dryRun && updates.length > 0) {
      // 50 Dialoge passen in einen Batch (Grenze 500).
      await base44.asServiceRole.entities.AllgemeineAufgabe.bulkUpdate(updates);
    }

    return Response.json({
      ok: true,
      trockenlauf: dryRun,
      aufgaben_geprueft: aufgaben.length,
      dialoge_gesamt: dialogeGesamt,
      dialoge_geaendert: geaendert,
      dialoge_uebersprungen: uebersprungen,
      dialoge_mit_schluesselcode: mitSchluessel,
      datensaetze_geschrieben: dryRun ? 0 : updates.length,
      globale_prompts: globalePrompts,
      protokoll,
    });
  } catch (error) {
    console.error('[entspanneBrianDialoge] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}