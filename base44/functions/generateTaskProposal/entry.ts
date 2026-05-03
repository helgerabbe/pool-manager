import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Spiegel der Mission-Definitionen aus lib/missionen.js — bei Änderungen
// dort bitte hier synchron halten. Wir referenzieren sie im Prompt nur,
// wenn die Lehrkraft im Wizard eine Mission gewählt hat.
const MISSIONS = {
  problem:     { label: 'Den Funken zünden',     hint: 'Alltagsbezug & Motivation — eine konkrete, lebensnahe Problemstellung als Aufhänger.' },
  entdeckung:  { label: 'Selber rausfinden lassen', hint: 'Induktion & Regelbildung — die Schüler sollen Muster/Regeln selbst entdecken, NICHT vorab erklärt bekommen.' },
  recherche:   { label: 'Informationen checken', hint: 'Informationsbeschaffung & Quellenarbeit — die Schüler recherchieren oder vergleichen Quellen.' },
  anwendung:   { label: 'Zeigen, was man kann',   hint: 'Wissen im bekannten Kontext festigen — typische Übungs-/Anwendungsaufgabe.' },
  transfer:    { label: 'In neue Welten übertragen', hint: 'Wissen im neuen Kontext anwenden — Transfer-Aufgabe.' },
  kreativitaet:{ label: 'Etwas Eigenes erschaffen', hint: 'Schöpferische Gestaltung & Deep Dive — offenes Produkt/Output.' },
};

const MATERIAL_HINTS = {
  0: 'Kein Material — rein kognitiv (Denken, Sprechen, Schreiben). Kein Verweis auf Gegenstände.',
  1: 'Minimal — nur Stift & Heft / 1–2 alltägliche Dinge.',
  2: 'Moderat — mehrere Schul-/Haushaltsmaterialien, ein wenig Vorbereitung.',
  3: 'Aufwändig — mehrteiliger Versuchsaufbau, klassenraum-tauglich.',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { idee, task_type, mission_type, material_level } = await req.json();

    if (!idee?.trim()) {
      return Response.json({ error: 'Idee ist erforderlich.' }, { status: 400 });
    }

    const missionInfo = mission_type && MISSIONS[mission_type] ? MISSIONS[mission_type] : null;
    const matLevel = Number.isInteger(material_level) ? material_level : null;
    const matHint = matLevel !== null ? MATERIAL_HINTS[matLevel] : null;

    const briefingLines = [
      `Aufgabentyp: ${task_type || 'Allgemeine Aufgabe'}`,
      missionInfo ? `Mission: ${missionInfo.label} — ${missionInfo.hint}` : null,
      matHint ? `Material-Einsatz: ${matHint}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Du bist ein erfahrener Didaktiker und hilfst Lehrkräften, Aufgaben für den Unterricht zu entwickeln.

${briefingLines}

Die Lehrkraft hat folgende grobe Idee eingegeben:
"${idee}"

Erstelle daraus einen vollständigen Aufgabenentwurf, der zur gewählten Mission und zum Material-Einsatz passt:
1. Einem prägnanten Titel (max. 80 Zeichen)
2. Einer klar formulierten, vollständigen Aufgabenstellung (2-5 Sätze, direkt an Schüler gerichtet)
3. 3-5 Kompetenz-Schlagworten (z.B. "Analyse", "Vergleich", "Argumentation", "Kreativität")
4. Falls oben keine Mission vorgegeben wurde: schlage eine passende Mission vor (einer der Slugs: problem, entdeckung, recherche, anwendung, transfer, kreativitaet). Falls eine Mission vorgegeben war, gib genau diese zurück.

Antworte ausschließlich im folgenden JSON-Format, ohne Markdown oder weitere Erklärungen:
{
  "titel": "...",
  "aufgabenstellung": "...",
  "kompetenzen": ["...", "...", "..."],
  "mission_type": "..."
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          titel: { type: 'string' },
          aufgabenstellung: { type: 'string' },
          kompetenzen: { type: 'array', items: { type: 'string' } },
          mission_type: { type: 'string' },
        },
        required: ['titel', 'aufgabenstellung', 'kompetenzen'],
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});