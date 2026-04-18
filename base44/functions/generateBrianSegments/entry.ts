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

  // Automatische Konstruktion der System-Instruction
  const outputFormatsStr = (task.output_formats || []).join(', ') || 'keine spezifischen Formate';
  const systemInstructionAuto = `Du bist ein motivierender, geduldiger GEP-Lerncoach für Jahrgangsstufe ${jahrgang} im Fach ${fach}. 

**Pädagogische Regel**: Du darfst NIEMALS die Lösung direkt verraten. Nutze stattdessen Scaffolding – stelle Denkanstöße und gezielte Rückfragen, die den Schüler zum eigenständigen Nachdenken anregen.

**Interaktion**: Sprich kurz, konversationell und schülergerecht (Du-Form). Sieh Fehler als Lernchance – ermutige den Schüler weiterzumachen und zu reflektieren.

**Aufgabenkontext**:
- Thema: ${aufgabentitel}
- Aufgabe: ${aufgabenstellung}
${materialienStr !== '(keine Materialien)' ? `- Materialien zur Unterstützung:\n${materialienStr}` : ''}

**Lernziele, auf die du dich beziehst**:
${lernzieleStr}

Leite den Schüler durch gezielte Fragen und Impulse, bis er die Aufgabe vollständig und nach den Lernzielen erarbeitet hat.`;

  // Automatische Generierung der Completion-Rule
  const completionRuleAuto = outputFormatsStr !== 'keine spezifischen Formate'
    ? `Beende das Gespräch erst, wenn der Schüler alle wesentlichen inhaltlichen Aspekte für die geforderten Formate (${outputFormatsStr}) erarbeitet und präsentiert hat und die Lernziele sichtbar erreicht wurden.`
    : `Beende das Gespräch erst, wenn der Schüler die Aufgabenstellung vollständig beantwortet hat, die wesentlichen Lernziele erreicht wurden und der Schüler keine weiteren Fragen hat.`;

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
   Nutze diese automatisch konstruierte Vorlage – passe sie nur minimal an, wenn nötig.
   Vorlage: "${systemInstructionAuto}"

4. brian_completion_rule: Wann ist der Dialog beendet? Nutze diese automatisch generierte Abbruchbedingung:
   Vorlage: "${completionRuleAuto}"

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

**WICHTIG**: Verwende die oben angegebenen Vorlagen für brian_system_instruction und brian_completion_rule – fasse sie nur zusammen, optimiere wording oder erweitere bei Bedarf, aber behalte die Struktur und den Kontext bei.
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

  // Rubriken-Mapping: Nutze bestehende Rubriken falls vorhanden, ansonsten KI-Vorschlag
  if (Array.isArray(task.rubric_criteria) && task.rubric_criteria.length > 0) {
    result.rubric_criteria = task.rubric_criteria;
  } else if (!Array.isArray(result.rubric_criteria)) {
    result.rubric_criteria = [];
  }

  return Response.json({ segments: result, status: 'success' });
});