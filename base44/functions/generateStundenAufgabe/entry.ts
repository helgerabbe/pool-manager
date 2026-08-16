/**
 * generateStundenAufgabe (MUG)
 *
 * Erstellt den INHALT einer digitalen Aufgabe EINER Stunden-Phase
 * (StundenSequenz.field_values) mit KI — auf Basis der Bauanleitung des
 * Stunden-Coaches und der zusätzlichen Beschreibung der Lehrkraft.
 *
 * Die Formate der field_values sind identisch zu den Editor-Dialogen des
 * Pool-Managers; die Spezifikationen liegen gemeinsam in
 * base44/shared/aktivitaetInhaltSpecs.js.
 *
 * payload: { stunde_id, phase_id, hinweis? }
 * returns: { success, skipped?, reason?, mode? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { unwrapLLM } from '../../shared/llmUtils.js';
import {
  isEmptyValue,
  MASTER_TYP_SPEZIFIKATIONEN,
  NICHT_BEFUELLBARE_FELDTYPEN,
  JSON_FELD_SPEZIFIKATIONEN,
  TEXT_FELD_REGELN,
  SYSTEM_PROMPT,
  BASIS_REGELN,
} from '../../shared/aktivitaetInhaltSpecs.js';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stunde_id, phase_id, hinweis } = await req.json().catch(() => ({}));
    if (!stunde_id || !phase_id) {
      return Response.json({ error: 'stunde_id und phase_id sind erforderlich.' }, { status: 400 });
    }

    const E = base44.asServiceRole.entities;
    const stunde = await E.Unterrichtsstunde.get(stunde_id).catch(() => null);
    if (!stunde) return Response.json({ error: 'Unterrichtsstunde nicht gefunden.' }, { status: 404 });
    if (stunde.besitzer_email && stunde.besitzer_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Keine Schreibrechte für diese Unterrichtsstunde.' }, { status: 403 });
    }

    const phase = await E.StundenSequenz.get(phase_id).catch(() => null);
    if (!phase || String(phase.stunde_id) !== String(stunde_id)) {
      return Response.json({ error: 'Phase nicht gefunden.' }, { status: 404 });
    }
    if (!phase.aktivitaet_id) {
      return Response.json({ success: false, skipped: true, reason: 'Der Phase ist keine Aufgabenart zugeordnet.' });
    }
    if (!isEmptyValue(phase.field_values)) {
      return Response.json({ success: false, skipped: true, reason: 'Die Aufgabe hat bereits Inhalt — er wird nicht überschrieben.' });
    }

    const katalogEintrag = await E.AktivitaetenKatalog.get(phase.aktivitaet_id).catch(() => null);
    if (!katalogEintrag) return Response.json({ error: 'Aufgabenart nicht gefunden.' }, { status: 404 });

    const kontext = {
      fach: stunde.fach || '',
      jahrgangsstufe: stunde.jahrgangsstufe || '',
      stunde: stunde.arbeitstitel || '',
      stundenziel: stunde.stundenziel || stunde.coach_plan?.steckbrief?.leitziel || '',
      thema: stunde.coach_plan?.steckbrief?.thema || '',
      phase: phase.phasenname || '',
      geplanter_ablauf_der_phase: phase.lehrer_hinweis || '',
      zusatzbeschreibung_der_lehrkraft: String(hinweis || '').trim(),
      didaktische_hinweise: stunde.coach_plan?.didaktische_hinweise || '',
    };
    const aktivitaetInfo = {
      typ: katalogEintrag.name,
      beschreibung: katalogEintrag.beschreibung || '',
    };
    const regeln = [
      ...BASIS_REGELN,
      'Die Aufgabe gehört zu genau dieser Unterrichtsphase — sie muss zum geplanten Ablauf der Phase passen.',
      ...(kontext.zusatzbeschreibung_der_lehrkraft
        ? ['Die zusatzbeschreibung_der_lehrkraft ist verbindlich: setze sie inhaltlich genau um.']
        : []),
    ];

    // ── Masterfähige Typen (Lückentext, Zuordnen, Sortierung, Miniquiz) ──
    if (katalogEintrag.supports_master === true) {
      const spez = MASTER_TYP_SPEZIFIKATIONEN[katalogEintrag.name];
      if (!spez) {
        return Response.json({
          success: false,
          skipped: true,
          reason: `Aufgabenformat „${katalogEintrag.name}" kann noch nicht automatisch erstellt werden.`,
        });
      }
      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: JSON.stringify([
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({ kontext, aktivitaet: aktivitaetInfo, regeln: [...regeln, ...spez.regeln] }),
          },
        ]),
        model: 'claude-sonnet-5',
        response_json_schema: spez.schema,
      });
      const fieldValues = spez.build(unwrapLLM(llmResponse));
      if (!fieldValues) {
        return Response.json({ success: false, error: 'KI-Inhalt unvollständig. Bitte erneut versuchen.' });
      }
      await E.StundenSequenz.update(phase.id, { field_values: fieldValues, is_complete: true });
      return Response.json({ success: true, mode: 'master' });
    }

    // ── Normale Typen: field_values anhand form_schema befüllen ──
    const formSchema = Array.isArray(katalogEintrag.form_schema) ? katalogEintrag.form_schema : [];
    const zuGenerieren = [];
    for (const field of formSchema) {
      if (!field || !field.field_name || field.type === 'info') continue;
      if (field.type === 'url' || NICHT_BEFUELLBARE_FELDTYPEN.has(field.type)) {
        if (field.required) {
          return Response.json({
            success: false,
            skipped: true,
            reason: `Benötigt eigenes Material bzw. einen Link („${field.label || field.field_name}") — bitte im Regieblatt selbst ergänzen.`,
          });
        }
        continue;
      }
      if (field.type === 'json') {
        const spez = JSON_FELD_SPEZIFIKATIONEN[field.field_name];
        if (!spez) {
          if (field.required) {
            return Response.json({
              success: false,
              skipped: true,
              reason: `Aufgabenformat „${katalogEintrag.name}" kann noch nicht automatisch erstellt werden.`,
            });
          }
          continue;
        }
        zuGenerieren.push({ field, schema: spez.schema, regel: spez.regel, validate: spez.validate });
        continue;
      }
      let schema;
      if (field.type === 'number') {
        schema = { type: 'number' };
      } else if (field.type === 'select') {
        const werte = (field.options || []).map((o) => o?.value).filter(Boolean);
        schema = werte.length > 0 ? { type: 'string', enum: werte } : { type: 'string' };
      } else {
        schema = { type: 'string' };
      }
      zuGenerieren.push({
        field,
        schema,
        regel: TEXT_FELD_REGELN[field.field_name] || null,
        validate: (v) => !isEmptyValue(v),
      });
    }

    if (zuGenerieren.length === 0) {
      return Response.json({ success: false, skipped: true, reason: 'Keine automatisch befüllbaren Felder gefunden.' });
    }

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: JSON.stringify([
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            kontext,
            aktivitaet: aktivitaetInfo,
            zu_befuellende_felder: zuGenerieren.map((z) => ({
              field_name: z.field.field_name,
              label: z.field.label,
              hinweis: z.field.placeholder || '',
              regel: z.regel || 'Inhaltlich passend zum Kontext befüllen.',
            })),
            regeln,
          }),
        },
      ]),
      model: 'claude-sonnet-5',
      response_json_schema: {
        type: 'object',
        properties: {
          field_values: {
            type: 'object',
            properties: Object.fromEntries(zuGenerieren.map((z) => [z.field.field_name, z.schema])),
            required: zuGenerieren.map((z) => z.field.field_name),
            additionalProperties: false,
          },
        },
        required: ['field_values'],
      },
    });

    const generated = unwrapLLM(llmResponse)?.field_values || {};
    const merged = {};
    const probleme = [];
    for (const z of zuGenerieren) {
      const val = generated[z.field.field_name];
      if (z.validate(val)) merged[z.field.field_name] = val;
      else if (z.field.required) probleme.push(z.field.label || z.field.field_name);
    }
    if (probleme.length > 0) {
      return Response.json({ success: false, error: `KI-Inhalt unvollständig (${probleme.join(', ')}).` });
    }

    const isComplete = formSchema.every((f) => {
      if (!f || !f.field_name || f.type === 'info' || !f.required) return true;
      const spez = f.type === 'json' ? JSON_FELD_SPEZIFIKATIONEN[f.field_name] : null;
      const v = merged[f.field_name];
      return spez ? !!spez.validate(v) : !isEmptyValue(v);
    });

    await E.StundenSequenz.update(phase.id, { field_values: merged, is_complete: isComplete });
    return Response.json({ success: true, mode: 'fields', is_complete: isComplete });
  } catch (error) {
    console.error('[generateStundenAufgabe] error', error);
    return Response.json({ error: error.message || 'Generierung fehlgeschlagen' }, { status: 500 });
  }
});