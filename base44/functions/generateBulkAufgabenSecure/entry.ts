/**
 * generateBulkAufgabenSecure.js
 *
 * Backend Edge Function für KI-basierte Bulk-Generierung von Aufgabenvarianten.
 * 
 * Empfängt: masterAufgabe, lernziel, fach, jahrgangsstufe, anzahl
 * Ruft InvokeLLM auf mit strukturiertem JSON-Output-Schema
 * Parst Antwort + logged in AuditLog
 * Sendet Array von generierten Aufgaben ans Frontend
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. REQUEST VALIDATION & AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rolle validieren: Nur admin/lehrer dürfen kostintensive KI-Generation nutzen
    if (!['admin', 'Fachlehrkraft', 'Fachschaftsleitung', 'Administrator'].includes(user.role)) {
      return Response.json(
        { error: 'Insufficient permissions for bulk generation' },
        { status: 403 }
      );
    }

    const payload = await req.json();
    const {
      master_aufgabe_text,
      loesung_text,
      lernziel,
      fach,
      jahrgangsstufe,
      anzahl,
    } = payload;

    // Validiere Required Fields
    if (
      !master_aufgabe_text ||
      !loesung_text ||
      !fach ||
      !jahrgangsstufe ||
      !anzahl ||
      anzahl < 1 ||
      anzahl > 20
    ) {
      return Response.json(
        {
          error: 'Invalid payload',
          details: 'Missing or invalid fields (anzahl must be 1-20)',
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. BUILD SYSTEM PROMPT FOR LLM
    // ─────────────────────────────────────────────────────────────────────────

    const systemPrompt = `Du bist ein didaktisch versierter Lehrkraft-Assistent.
Deine Aufgabe: Generiere exakt ${anzahl} didaktisch gleichwertige Varianten einer Übungsaufgabe.

WICHTIG:
- Jede Variante muss das GLEICHE Lernziel adressieren
- Schwierigkeitsgrad sollte ähnlich sein (Basis-Level)
- Nur andere Zahlen, Kontexte oder Formulierungen ändern
- Struktur beibehalten (wenn es eine Textaufgabe ist, bleibe bei Textaufgaben)

MASTER-AUFGABE:
"${master_aufgabe_text}"

MUSTER-LÖSUNG:
"${loesung_text}"

KONTEXT:
- Fach: ${fach}
- Jahrgangsstufe: ${jahrgangsstufe}
- Lernziel: ${lernziel || '(nicht spezifiziert)'}

ANTWORT als JSON, EXAKT dieses Format:
{
  "tasks": [
    { "aufgabentext": "...", "loesung": "..." },
    { "aufgabentext": "...", "loesung": "..." }
  ]
}

WICHTIG: Nur das JSON-Objekt mit tasks-Array, keine weiteren Erklärungen!`;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. INVOKE LLM VIA BASE44 INTEGRATION
    // ─────────────────────────────────────────────────────────────────────────

    let generatedTasks = [];

    try {
      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            tasks: {
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
          required: ['tasks'],
        },
      });

      // Extrahiere tasks direkt aus Schema
      if (!llmResponse.tasks || !Array.isArray(llmResponse.tasks)) {
        throw new Error('LLM response missing tasks array or invalid structure');
      }

      generatedTasks = llmResponse.tasks;

      // Validiere: Mindestens eine Aufgabe
      if (generatedTasks.length === 0) {
        throw new Error('LLM returned empty tasks array');
      }

      // Schneide auf anzahl zu (falls LLM zu viele generierte)
      generatedTasks = generatedTasks.slice(0, anzahl);
    } catch (llmError) {
      console.error('LLM invocation failed:', llmError);
      return Response.json(
        {
          error: 'LLM generation failed',
          details: llmError.message,
        },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. LOG ACTION IN AUDITLOG
    // ─────────────────────────────────────────────────────────────────────────

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'CREATE',
        resource_type: 'Aufgabenvarianten',
        resource_id: 'bulk-generation',
        changes: {
          master_aufgabe_text: master_aufgabe_text.substring(0, 100) + '...',
          anzahl_generiert: generatedTasks.length,
          fach,
          jahrgangsstufe,
        },
        affected_count: generatedTasks.length,
        status: 'success',
      });
    } catch (auditError) {
      console.warn('Failed to log audit:', auditError);
      // Nicht kritisch, fahre fort
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. RETURN RESULT TO FRONTEND
    // ─────────────────────────────────────────────────────────────────────────

    return Response.json({
      success: true,
      generated_tasks: generatedTasks,
      metadata: {
        count: generatedTasks.length,
        fach,
        jahrgangsstufe,
        lernziel: lernziel || null,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('generateBulkAufgabenSecure error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});