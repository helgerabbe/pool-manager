/**
 * generateBulkEbene2Secure.js
 *
 * Phase 6.7: KI-Serien-Generator für Ebene 2 (Transfer/Anwendungsaufgaben)
 * 
 * Input:
 *   - master_aufgabe_text: Master-Aufgabe
 *   - loesung_text: Lösungshinweise/Erwartungshorizont
 *   - themenfeld: Übergeordnetes Themenfeld
 *   - kompetenzen: Erwartete Kompetenzen (z.B. "Analysieren", "Bewerten")
 *   - schwierigkeitsgrad: 1-3 Sterne
 *   - fach, jahrgangsstufe, anzahl
 * 
 * Output: [{ aufgabentext, loesung }, ...]
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Validierung der Ebene 2 Payload
 */
function validateEbene2Payload(data) {
  const errors = {};

  if (!data.master_aufgabe_text || typeof data.master_aufgabe_text !== 'string') {
    errors.master_aufgabe_text = 'Master-Aufgabe erforderlich';
  }

  if (!data.loesung_text || typeof data.loesung_text !== 'string') {
    errors.loesung_text = 'Lösungstext erforderlich';
  }

  if (!data.fach) {
    errors.fach = 'Fach erforderlich';
  }

  if (!data.jahrgangsstufe) {
    errors.jahrgangsstufe = 'Jahrgangsstufe erforderlich';
  }

  if (!data.anzahl || data.anzahl < 1 || data.anzahl > 20) {
    errors.anzahl = 'Anzahl muss zwischen 1 und 20 liegen';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * System Prompt für Ebene 2 (Transfer/Anwendungsaufgaben)
 */
function getEbene2SystemPrompt() {
  return `Du bist ein erfahrener Pädagoge, spezialisiert auf die Erstellung von Aufgaben der Ebene 2 (Transfer- und Anwendungsaufgaben).

AUFGABEN DEINER ROLLE:
- Erstelle Aufgabenvarianten, die die GLEICHE Schwierigkeit und Komplexität wie die Master-Aufgabe haben
- Nutze UNTERSCHIEDLICHE, aber thematisch ÄQUIVALENTE Kontexte (z.B. andere historische Ereignisse, andere mathematische Szenarien)
- Achte auf die gleichen kognitiven Operatoren (Analysieren, Bewerten, Synthese, etc.)
- Jede Variante soll Transfer-Fähigkeiten testen, nicht nur Faktenwissen
- Die Lösungen müssen strukturiert und nachvollziehbar sein

AUSGABEFORMAT (STRICTES JSON ARRAY):
[
  {
    "aufgabentext": "Vollständige Aufgabenstellung (min. 80 Zeichen)",
    "loesung": "Strukturierte Lösungsskizze mit Erwartungen (min. 100 Zeichen)"
  }
]

HINWEISE:
- Keine Nummern (#1, #2) in den Aufgabentexten
- Verwende fachliche Begriffe korrekt
- Varianten sollten unterschiedliche Schwerpunkte legen, aber ähnlich komplex sein`;
}

// deno-lint-ignore no-undef
if (typeof Deno !== 'undefined') {
  Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    // 1. Auth
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const payload = await req.json();
    const {
      master_aufgabe_text,
      loesung_text,
      themenfeld,
      kompetenzen,
      schwierigkeitsgrad,
      fach,
      jahrgangsstufe,
      anzahl,
    } = payload;

    // 3. Validate
    const validation = validateEbene2Payload(payload);
    if (!validation.valid) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // 4. Build LLM Prompt
    const userPrompt = `
Erstelle ${anzahl} Aufgabenvarianten der EBENE 2 (Transfer/Anwendung) für den Fach "${fach}" (Jahrgang ${jahrgangsstufe}).

MASTER-AUFGABE:
"${master_aufgabe_text}"

LÖSUNG (REFERENZ):
"${loesung_text}"

KONTEXT:
- Themenfeld: ${themenfeld || 'nicht angegeben'}
- Erforderliche Kompetenzen: ${kompetenzen || 'Transfer, Analysieren, Bewerten'}
- Schwierigkeitsgrad: ${schwierigkeitsgrad || 'mittel'}

ANFORDERUNGEN:
1. Jede Variante muss ÄQUIVALENT zur Master-Aufgabe sein (gleiche Komplexität, gleiche Schwierigkeit)
2. Verwende UNTERSCHIEDLICHE Kontexte und Beispiele
3. Achte auf die GLEICHEN kognitiven Operatoren wie die Master-Aufgabe
4. Die Lösungen sollen strukturiert und nachvollziehbar sein
5. Keine Nummern oder Labels in den Aufgabentexten

Gib die Varianten als striktes JSON-Array zurück:
[{ "aufgabentext": "...", "loesung": "..." }, ...]`;

    // 5. Call LLM
    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: userPrompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            aufgabentext: { type: 'string' },
            loesung: { type: 'string' },
          },
          required: ['aufgabentext', 'loesung'],
        },
      },
    });

    // 6. Parse & Validate LLM Response
    let generatedTasks = [];
    if (Array.isArray(llmResult)) {
      generatedTasks = llmResult;
    } else if (Array.isArray(llmResult.tasks)) {
      generatedTasks = llmResult.tasks;
    }

    // Fallback: Simple string parsing if JSON fails
    if (!Array.isArray(generatedTasks) || generatedTasks.length === 0) {
      return Response.json(
        {
          error: 'LLM response parsing failed',
          details: 'Could not extract valid task array',
        },
        { status: 500 }
      );
    }

    // 7. Log Success
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'CREATE',
        resource_type: 'Aufgabenbausteine',
        resource_id: 'bulk_generate_ebene2',
        status: 'success',
        changes: {
          level: 'ebene2',
          fach,
          jahrgangsstufe,
          anzahl: generatedTasks.length,
        },
      });
    } catch (logError) {
      console.error('Audit log error:', logError.message);
    }

    // 8. Return Success
    return Response.json(
      {
        success: true,
        generated_tasks: generatedTasks,
        metadata: {
          level: 'ebene2',
          fach,
          jahrgangsstufe,
          count: generatedTasks.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GENERATE_BULK_EBENE2_ERROR]', error);

    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
  });
}