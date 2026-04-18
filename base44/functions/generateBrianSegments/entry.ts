/**
 * generateBrianSegments.js
 *
 * Generiert die fünf Brian.study-Segmente für eine AllgemeineAufgabe:
 * - brian_dialog_name
 * - brian_learner_instruction
 * - brian_system_instruction
 * - brian_completion_rule
 * - rubric_criteria (falls noch keine vorhanden)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    aufgabe_id,
    aufgabe,   // vollständiges Aufgaben-Objekt (alternativ zu aufgabe_id)
    einheit,   // { fach, jahrgangsstufe, titel_der_einheit }
    lernziele, // Array von { formulierung_fachsprache, schueler_uebersetzung }
    basisLernziele, // Array von { text }
  } = await req.json();

  // Aufgabe laden falls nur ID übergeben
  let task = aufgabe;
  if (!task && aufgabe_id) {
    task = await base44.asServiceRole.entities.AllgemeineAufgabe.read(aufgabe_id).catch(() => null);
    if (!task) return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
  }
  if (!task) return Response.json({ error: 'aufgabe oder aufgabe_id erforderlich' }, { status: 400 });

  const fach = einheit?.fach || 'unbekanntes Fach';
  const jahrgang = einheit?.jahrgangsstufe || 'unbekannte Jahrgangsstufe';
  const einheitTitel = einheit?.titel_der_einheit || '';
  const aufgabentitel = task.titel || 'Aufgabe';
  const aufgabenstellung = task.aufgabenstellung || '';
  const erwartungshorizont = task.erwartungshorizont || task.musterloesung || '';
  const isEbene3 = task.anforderungsebene === '3 - Projekt';

  const lernzieleTexte = [
    ...(lernziele || []).map(lz => lz.schueler_uebersetzung || lz.formulierung_fachsprache),
    ...(basisLernziele || []).map(lz => lz.text),
  ].filter(Boolean);

  const lernzieleStr = lernzieleTexte.length > 0
    ? lernzieleTexte.map(lz => `- ${lz}`).join('\n')
    : '(keine spezifischen Lernziele hinterlegt)';

  const materialienStr = (task.materialien || [])
    .map(m => m.label || m.content || m.url || '')
    .filter(Boolean)
    .map(m => `- ${m}`)
    .join('\n') || '(keine Materialien)';

  const rubrikenStr = (task.rubric_criteria || [])
    .map(r => `- ${r.title} (${r.points} Pkt.): ${r.criteria_text}`)
    .join('\n') || '';

  const prompt = `
Du hilfst mir, fünf Brian.study-Konfigurationsfelder für eine Schulaufgabe zu generieren.

KONTEXT:
Fach: ${fach}
Jahrgangsstufe: ${jahrgang}
Einheit: ${einheitTitel}
Aufgabentitel: ${aufgabentitel}
Aufgabenstellung: ${aufgabenstellung}
Erwartungshorizont: ${erwartungshorizont || '(noch nicht hinterlegt)'}
Lernziele:
${lernzieleStr}
Materialien:
${materialienStr}
${rubrikenStr ? `Bewertungsrubriken:\n${rubrikenStr}` : ''}
Aufgabentyp: ${isEbene3 ? 'Projekt-/Anwendungsaufgabe (Ebene 3)' : 'Transfer-Aufgabe (Ebene 2)'}

AUFGABE:
Erstelle die folgenden fünf Felder für Brian.study. Alle Texte sollen auf Deutsch sein.

1. brian_dialog_name: Ein prägnanter, einprägsamer Dialogname (max. 60 Zeichen). Basis ist der Aufgabentitel, aber sprachlich ansprechend formuliert.

2. brian_learner_instruction: Die Aufgabenstellung so aufbereitet, dass sie ein Schüler direkt versteht. Diese ist SICHTBAR für den Schüler. Formuliere klar, was der Schüler tun soll. Schreibe in der Du-Form. Max. 3-4 Sätze.

3. brian_system_instruction: Die interne Tutor-Persona und Gesprächsführungsregeln (NICHT sichtbar für Schüler). 
   Richtlinien:
   - Du bist ein motivierender, geduldiger Lerncoach für Jahrgangsstufe ${jahrgang} im Fach ${fach}.
   - Führe den Schüler durch Scaffolding und gezielte Rückfragen – verrate NIEMALS die Lösung direkt.
   - Beziehe dich auf den Erwartungshorizont und die Lernziele, um zu beurteilen, ob der Schüler auf dem richtigen Weg ist.
   - Konzentriere dich auf den Gesprächsprozess: ermutigen, nachfragen, Denkimpulse geben.
   - Verwende KEINE starren Feedback-Kategorien mit Symbolen (🌟, 📈 etc.) im Gesprächsverlauf – diese kommen erst am Ende als Abschluss-Feedback über die Rubriken.
   ${isEbene3 ? '- Begleite den Schüler prozessorientiert durch das Projekt. Würdige Zwischenstände.' : '- Gib nach jeder Schülerantwort einen gezielten Denkimpuls.'}
   Schreibe die System-Anweisung als kompakten, klaren Absatz (nicht als Liste).

4. brian_completion_rule: Wann ist der Dialog beendet? Beschreibe die Abbruchbedingung klar und konkret. 
   Beispiel für Ebene 2: "Wenn der Schüler die Aufgabenstellung vollständig und korrekt beantwortet hat und die wesentlichen Lernziele im Gespräch sichtbar erreicht wurden."
   ${isEbene3 ? 'Für Projekte: Wenn die finale Ausarbeitung vorliegt oder der Schüler keine weiteren Fragen hat.' : ''}
   Max. 2-3 Sätze.

${!rubrikenStr ? `5. rubric_criteria: Schlage 2-3 thematische Bewertungskategorien vor (Array von Objekten mit title, points, criteria_text). 
   Die Kategorien sollen inhaltlich zur Aufgabe passen und das Abschluss-Feedback des Tutors strukturieren. 
   Gesamtpunktzahl: 10-15 Punkte. Jede Kategorie beschreibt, was eine gute Antwort ausmacht.` : '5. rubric_criteria: Behalte die vorhandenen Rubriken bei (gib ein leeres Array zurück, da schon vorhanden).'}

Antworte NUR mit validem JSON in diesem Format:
{
  "brian_dialog_name": "...",
  "brian_learner_instruction": "...",
  "brian_system_instruction": "...",
  "brian_completion_rule": "...",
  "rubric_criteria": [{ "title": "...", "points": 5, "criteria_text": "..." }]
}
`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        brian_dialog_name: { type: 'string' },
        brian_learner_instruction: { type: 'string' },
        brian_system_instruction: { type: 'string' },
        brian_completion_rule: { type: 'string' },
        rubric_criteria: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              points: { type: 'number' },
              criteria_text: { type: 'string' },
            },
          },
        },
      },
      required: ['brian_dialog_name', 'brian_learner_instruction', 'brian_system_instruction', 'brian_completion_rule', 'rubric_criteria'],
    },
  });

  // Wenn bereits Rubriken vorhanden, überschreibe sie nicht
  if (rubrikenStr && result.rubric_criteria?.length === 0) {
    result.rubric_criteria = Array.isArray(task.rubric_criteria) ? task.rubric_criteria : [];
  } else if (!Array.isArray(result.rubric_criteria)) {
    result.rubric_criteria = [];
  }

  return Response.json({ segments: result, status: 'success' });
});