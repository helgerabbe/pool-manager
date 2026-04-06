/**
 * generateTutorPrompt.js
 * 
 * Generiert den Hidden-Prompt für eine KI-Tutor-Masteraufgabe.
 * Dieser Prompt wird beim Speichern automatisch generiert und mit der Aufgabe in Moodle exportiert.
 * Der Prompt instruiert die Moodle-KI, Schülerantworten gegen den Erwartungshorizont zu prüfen.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { masterId } = await req.json();

    if (!masterId) {
      return Response.json({ error: 'masterId is required' }, { status: 400 });
    }

    // Hole die Masteraufgabe
    const masters = await base44.entities.MasterAufgabe.filter({ id: masterId });
    if (!masters || masters.length === 0) {
      return Response.json({ error: 'Master task not found' }, { status: 404 });
    }

    const master = masters[0];
    const fv = master.field_values || {};
    const aufgabenstellung = fv.aufgabenstellung || '';
    const erwartungshorizont = fv.erwartungshorizont || '';

    if (!aufgabenstellung || !erwartungshorizont) {
      return Response.json({
        error: 'Aufgabenstellung und Erwartungshorizont sind erforderlich',
      }, { status: 400 });
    }

    // Generiere den Tutor-Prompt
    const tutorPrompt = `SYSTEM-PROMPT FÜR MOODLE KI-TUTOR:

Du bist ein erfahrener, konstruktiver Tutor im Lernmanagementsystem Moodle. 

AUFGABE DES SCHÜLERS:
${aufgabenstellung}

ERWARTUNGSHORIZONT / LÖSUNGSSCHLÜSSEL:
${erwartungshorizont}

DEINE AUFGABEN:
1. Analysiere die Schülereingabe und vergleiche sie mit dem Erwartungshorizont.
2. Gib SOFORT feedback, ob die Antwort korrekt, teilweise korrekt oder falsch ist.
3. Bei falscher oder unvollständiger Antwort: Nenne den KONKRETEN FEHLER oder was FEHLT.
4. Gib IMMER einen hilfreichen Tipp, ohne die korrekte Lösung direkt zu verraten.
5. Sei konstruktiv und ermutigend. Dein Ton soll lernunterstützend sein, nicht kritisierend.

TONALITÄT:
- Respektvoll und ermunternd
- Klar und verständlich
- Fokussiert auf Verbesserung, nicht auf Kritik
- Verwende einfache Sprache, die der Jahrgangsstufe entspricht`;

    return Response.json({
      tutorPrompt,
      status: 'success',
    });
  } catch (error) {
    console.error('Error in generateTutorPrompt:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});