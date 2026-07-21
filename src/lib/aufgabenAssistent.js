import { base44 } from '@/api/base44Client';

/**
 * Aufgaben-Assistent (Ideenkiste, Etappe 2):
 * KI-Dialog, der mit der Lehrkraft eine Aufgaben-Idee erarbeitet —
 * inkl. Analyse hochgeladener Materialien (Screenshot, PDF, Dokument).
 * Ergebnis ist ein Entwurf (Titel, Beschreibung, Aufgabenform-Vorschlag),
 * der in die Ideenkiste übernommen werden kann.
 */

const AUFGABENFORMEN_KONTEXT = `Verfügbare Aufgabenformen der App:
1. LERNPAKET-AKTIVITÄTEN (Ebene 1): kurze, automatisch auswertbare Übungen INNERHALB eines Lernpakets — Lückentext, Begriffe zuordnen, Mini-Quiz, Reihenfolge sortieren, Bildbeschriftung, Text lesen, Video/Audio, KI-Tutor-Gespräch. Geeignet für Basiswissen, Üben, Wiederholen.
2. ALLGEMEINE AUFGABEN (Ebene 2, Transfer): größere, offene Aufgaben auf Einheitenebene, bei denen Schüler:innen Gelerntes auf neue Situationen anwenden (Quelle analysieren, Diagramm auswerten, Erörterung schreiben). Mit KI-Tutor-Begleitung und Erwartungshorizont. Missionen: Problem, Entdeckung, Recherche, Anwendung, Transfer, Kreativität.
3. ANWENDUNGS-/PROJEKTAUFGABEN (Ebene 3): produktorientierte, mehrstündige Aufgaben (Plakat, Podcast, Präsentation, Portfolio) mit Abgabeformaten, Bewertungsrubriken und Projekt-Coach.`;

export async function frageAufgabenAssistent({ einheit, verlauf, fileUrls = [] }) {
  const verlaufText = verlauf
    .map((m) => `${m.rolle === 'user' ? 'LEHRKRAFT' : 'ASSISTENT'}: ${m.text}`)
    .join('\n\n');

  const prompt = `Du bist der "Aufgaben-Assistent" einer Unterrichtsplanungs-App für Lehrkräfte. Eine Lehrkraft hat eine Idee für eine Schüler-Aufgabe (evtl. mit Material als Vorlage) und möchte sie mit dir gemeinsam ausarbeiten.

KONTEXT DER EINHEIT:
- Fach: ${einheit?.fach || 'unbekannt'}
- Jahrgangsstufe: ${einheit?.jahrgangsstufe || 'unbekannt'}
- Titel der Einheit: ${einheit?.titel_der_einheit || 'unbekannt'}

${AUFGABENFORMEN_KONTEXT}

DEINE AUFGABE:
- Falls Material (Bild/PDF/Dokument) angehängt ist: Analysiere es zuerst und beschreibe kurz, was du erkennst.
- Erarbeite im Dialog: Was sollen die Schüler:innen konkret tun? Was sollen sie daran lernen? Mit welchen Inhalten? Welche Aufgabenform der App passt am besten (mit Begründung)?
- Stelle pro Antwort höchstens 2 gezielte Rückfragen. Sei konkret und praxisnah, duze die Lehrkraft nicht (verwende "Sie").
- Sobald genug Klarheit besteht (spätestens nach 2-3 Dialogrunden), formuliere einen fertigen Entwurf im Feld "entwurf". Der Entwurf enthält: einen prägnanten Titel, eine ausformulierte Beschreibung (Aufgabenstellung aus Schülersicht + was daran gelernt wird) und den Aufgabenform-Vorschlag. Solange noch wesentliche Fragen offen sind, lasse "entwurf" leer (null).
- Wenn du einen Entwurf lieferst, weise in "antwort" kurz darauf hin, dass die Lehrkraft ihn rechts übernehmen oder weiter verfeinern kann.

BISHERIGER DIALOG:
${verlaufText || '(noch keine Nachrichten — dies ist der Einstieg)'}

Antworte ausschließlich als JSON.`;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: fileUrls.length > 0 ? fileUrls : null,
    response_json_schema: {
      type: 'object',
      properties: {
        antwort: { type: 'string', description: 'Deine Chat-Antwort an die Lehrkraft (Markdown erlaubt).' },
        entwurf: {
          type: ['object', 'null'],
          properties: {
            titel: { type: 'string' },
            beschreibung: { type: 'string' },
            aufgabentyp_vorschlag: { type: 'string' },
          },
        },
      },
      required: ['antwort'],
    },
  });
  return res;
}