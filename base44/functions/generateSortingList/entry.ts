/**
 * generateSortingList.js
 *
 * Backend-Funktion zur KI-gestützten Generierung von Sortierlisten.
 * Nutzt InvokeLLM mit robustem JSON-Parsing und Fallbacks.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { thema, kriterium } = body;

    if (!thema?.trim() || !kriterium?.trim()) {
      return Response.json({ error: 'Thema und Kriterium erforderlich' }, { status: 400 });
    }

    // System Prompt mit explizitem JSON-Format
    const systemPrompt = `Du bist ein erfahrener Pädagoge und generierst Sortierlisten für Schüleraufgaben.

Anforderungen für deine Antwort:
1. Generiere 5-8 Listenelemente zum gegebenen Thema.
2. Die Elemente MÜSSEN bereits in der korrekten Reihenfolge sortiert sein.
3. Jedes Element sollte kurz (3-10 Wörter) sein.
4. Nutze altersgerechte und ansprechende Formulierungen.
5. Return ONLY a valid JSON array of strings, representing the correctly ordered items.
6. Do NOT include markdown formatting, conversational text, or numbered lists.
7. Maximum 12 items.
8. Example format: ["Step 1", "Step 2", "Step 3"]`;

    const userPrompt = `Thema: ${thema}
Sortierkriterium: ${kriterium}

Generiere eine korrekt sortierte Sortierliste. Antworte NUR mit dem JSON-Array, ohne weitere Erklärungen.`;

    // Invoke LLM mit JSON Schema (root muss object sein)
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: userPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['items'],
      },
    });

    // Response ist bereits geparst: { items: [...] }
    let items = response?.items || [];

    // Validierung
    if (!Array.isArray(items)) {
      console.error('Invalid response format:', response);
      return Response.json(
        { error: 'KI hat kein gültiges JSON-Array zurückgegeben', details: response },
        { status: 422 }
      );
    }

    if (items.length === 0) {
      return Response.json(
        { error: 'KI hat eine leere Liste generiert' },
        { status: 422 }
      );
    }

    // Typ-Sicherung: Alle Einträge müssen Strings sein
    const validItems = items
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim())
      .slice(0, 12); // Limit auf 12

    if (validItems.length === 0) {
      return Response.json(
        { error: 'Nach Validierung keine gültigen Elemente vorhanden' },
        { status: 422 }
      );
    }

    return Response.json({ items: validItems });
  } catch (error) {
    console.error('generateSortingList error:', error);
    return Response.json(
      { error: error.message || 'Fehler bei der KI-Generierung' },
      { status: 500 }
    );
  }
});