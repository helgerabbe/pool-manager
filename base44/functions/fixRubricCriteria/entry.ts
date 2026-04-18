/**
 * fixRubricCriteria.js
 * 
 * Behebe kaputte rubric_criteria-Felder (Objekte statt Arrays).
 * Ruft nur bei Bedarf auf – konvertiert {good, excellent, sufficient} zu [].
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'Administrator')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Lade alle AllgemeineAufgabe-Einträge
    const aufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.list();
    
    let fixed = 0;
    const errors = [];

    for (const aufgabe of aufgaben) {
      // Prüfe ob rubric_criteria ein Objekt ist (kaputt)
      if (aufgabe.rubric_criteria && typeof aufgabe.rubric_criteria === 'object' && !Array.isArray(aufgabe.rubric_criteria)) {
        console.log(`[FIX] Aufgabe ${aufgabe.id}: rubric_criteria ist Objekt, konvertiere zu []`);
        try {
          await base44.asServiceRole.entities.AllgemeineAufgabe.update(aufgabe.id, {
            rubric_criteria: [], // Konvertiere zu leerem Array
          });
          fixed++;
        } catch (err) {
          errors.push({ id: aufgabe.id, error: err.message });
        }
      }
    }

    return Response.json({
      status: 'success',
      message: `${fixed} Aufgaben repariert`,
      errors,
      totalChecked: aufgaben.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});