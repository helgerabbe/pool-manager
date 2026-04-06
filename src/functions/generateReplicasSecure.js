/**
 * generateReplicasSecure.js
 *
 * Phase 6.7: Backend-Funktion für KI-gestützte Replikation von Masteraufgaben
 * 
 * Sammelt Kontext, generiert LLM-Prompt, gibt strukturierte Varianten zurück.
 */

/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// deno-lint-ignore no-undef
if (typeof Deno !== 'undefined') {
  Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const payload = await req.json();
    
    // Validierung der Input-Parameter
    const { master_id, anzahl = 10 } = payload;

    if (!master_id) {
      return new Response(
        JSON.stringify({ error: 'master_id is required' }),
        { status: 400 }
      );
    }

    if (anzahl < 1 || anzahl > 20) {
      return new Response(
        JSON.stringify({ error: 'anzahl must be between 1 and 20' }),
        { status: 400 }
      );
    }

    // Hole die Masteraufgabe
    const masterAufgabe = await base44.asServiceRole.entities.Aufgabenbausteine.get(master_id);

    if (!masterAufgabe || !masterAufgabe.is_master) {
      return new Response(
        JSON.stringify({ error: 'Master task not found or invalid' }),
        { status: 404 }
      );
    }

    // Sammle Kontext: Lernpaket, Lernziel, Aktivitätstyp
    const lernpaket = await base44.asServiceRole.entities.Lernpakete.get(
      masterAufgabe.lernpaket_id
    );
    
    const lernziel = masterAufgabe.lernziel_id
      ? await base44.asServiceRole.entities.Lernziele.get(masterAufgabe.lernziel_id)
      : null;

    // Konstruiere LLM-System-Prompt basierend auf Activity-Type
    const systemPrompt = buildSystemPrompt(
      masterAufgabe,
      lernziel,
      lernpaket
    );

    // Rufe LLM auf
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `
Masteraufgabe:
---
${masterAufgabe.aufgabentext_inhalt}

Erwartungshorizont:
${masterAufgabe.erwartungshorizont_ki_prompt || 'Siehe Aufgabentext'}
---

Generiere ${anzahl} didaktisch gleichwertige Varianten im EXAKTEN FORMAT der Masteraufgabe.
Antworte nur mit einem validen JSON-Array.
      `,
      response_json_schema: {
        type: 'object',
        properties: {
          replicas: {
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
        },
        required: ['replicas'],
      },
    });

    // Extrahiere und validiere die Replikate
    const replicas = llmResponse.replicas || [];

    if (!Array.isArray(replicas) || replicas.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'LLM did not generate valid replicas',
          details: llmResponse,
        }),
        { status: 500 }
      );
    }

    // Audit Logging
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'CREATE',
      resource_type: 'Replikat',
      resource_id: master_id,
      changes: { generated_count: replicas.length },
      affected_count: replicas.length,
      status: 'success',
    });

    return new Response(
      JSON.stringify({
        success: true,
        master_id,
        replicas: replicas.map((r) => ({
          aufgabentext: r.aufgabentext,
          loesung: r.loesung,
          master_id,
        })),
        metadata: {
          count: replicas.length,
          activity_type: masterAufgabe.activity_type,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('generateReplicasSecure error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      { status: 500 }
    );
  }
  });
}

/**
 * Konstruiere den LLM System-Prompt basierend auf Activity-Type
 */
function buildSystemPrompt(masterAufgabe, lernziel, lernpaket) {
  const basePrompt = `Du bist ein erfahrener Pädagoge, spezialisiert auf die Erstellung von didaktisch gleichwertigen Aufgabenvarianten.

KONTEXT:
- Aktivitätstyp: ${masterAufgabe.activity_type}
- Lernziel: ${lernziel?.formulierung_fachsprache || 'Nicht spezifiziert'}
- Lernpaket: ${lernpaket?.titel_des_pakets || 'Nicht spezifiziert'}
- Fach: ${lernpaket?.fach || 'Nicht spezifiziert'}

AUFGABE:
Erstelle Varianten, die:
- GLEICHE Komplexität und Schwierigkeit haben
- UNTERSCHIEDLICHE, aber thematisch ÄQUIVALENTE Kontexte nutzen
- Das GLEICHE FORMAT und die GLEICHE Struktur befolgen
- Die GLEICHEN Kompetenzen testen

Rückgabe: Valides JSON-Array mit \`{aufgabentext, loesung}\` Objekten.`;

  return basePrompt;
}