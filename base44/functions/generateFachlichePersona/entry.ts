/**
 * generateFachlichePersona.js
 *
 * Erzeugt mit einem LLM-Aufruf den fertig formulierten Text der
 * "Fachlichen Persona" für eine konkrete Einheit (Fach + Jahrgang).
 *
 * Quelle der didaktischen Regeln: MBKGlobalPrompt mit
 * schluessel='persona_generator_anweisung'. Diese Regeln werden 1:1 als
 * Erzeugungs-Anweisung an die KI gegeben — die KI liefert den fertigen
 * Persona-Text zurück, der dann im Pool-Manager-Prompt steht.
 *
 * Anders als die deterministischen Build-Funktionen in
 * lib/exportPromptTemplates.js ist dieser Endpoint NICHT idempotent:
 * jeder Aufruf kostet Integration-Credits und kann leicht abweichende
 * Texte zurückliefern.
 *
 * Body: { einheitId: string }
 * Response: { ok: true, content: string }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { einheitId } = await req.json();
    if (!einheitId) {
      return Response.json({ error: 'einheitId fehlt' }, { status: 400 });
    }

    // Einheit laden (Fach + Jahrgang).
    const einheiten = await base44.asServiceRole.entities.Einheiten.filter({ id: einheitId });
    const einheit = einheiten?.[0];
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    const fach = einheit.fach || '(Fach unbekannt)';
    const jahrgang = einheit.jahrgangsstufe || '(Jahrgang unbekannt)';

    // Generator-Anweisung aus dem MBK-Prompt-Manager laden.
    const globalPrompts = await base44.asServiceRole.entities.MBKGlobalPrompt.filter({
      schluessel: 'persona_generator_anweisung',
    });
    const generatorPrompt = globalPrompts?.[0];
    if (!generatorPrompt || generatorPrompt.ist_aktiv === false || !generatorPrompt.prompt_text) {
      return Response.json({
        error: "Im MBK-Prompt-Manager ist kein aktiver Eintrag mit dem Schlüssel 'persona_generator_anweisung' gepflegt.",
      }, { status: 400 });
    }

    // Prompt für die KI zusammenbauen: Generator-Regeln + konkrete Einheit.
    const fullPrompt = [
      generatorPrompt.prompt_text,
      '',
      '---',
      '',
      `Konkrete Einheit, für die du die Fachliche Persona jetzt vollständig ausformulieren sollst:`,
      `- Fach: ${fach}`,
      `- Jahrgangsstufe: ${jahrgang}`,
      '',
      'Liefere den Persona-Text exakt im oben spezifizierten Markdown-Ausgabeformat. Keine Vorrede, keine Rückfragen, keine Platzhalter — nur den fertigen Persona-Text.',
    ].join('\n');

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: false,
    });

    const content = typeof llmResponse === 'string' ? llmResponse : (llmResponse?.text || '');
    if (!content || !content.trim()) {
      return Response.json({ error: 'Die KI hat keinen Text zurückgeliefert.' }, { status: 502 });
    }

    return Response.json({ ok: true, content: content.trim() });
  } catch (error) {
    console.error('[generateFachlichePersona]', error);
    return Response.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});