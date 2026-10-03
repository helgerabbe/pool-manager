/**
 * Gemeinsamer Recherche-Kern (2026-10-03): die EINE große Websuche zu einem
 * Thema. Genutzt vom Poolzeit-Didaktiker (didaktikerRecherche) und von der
 * Unterrichtsplanung (unterrichtInhalteRecherche). Liefert das "Fundament".
 */
import { unwrapLLM } from './llmUtils.js';

export const FUNDAMENT_SCHEMA = {
  type: 'object',
  properties: {
    leitidee: { type: 'string' },
    kerncurriculum: { type: 'string' },
    zugaenge: {
      type: 'array',
      items: {
        type: 'object',
        properties: { titel: { type: 'string' }, begruendung: { type: 'string' } },
        required: ['titel', 'begruendung'],
      },
    },
    stolpersteine: { type: 'array', items: { type: 'string' } },
    kernbegriffe: { type: 'array', items: { type: 'string' } },
    quellen: {
      type: 'array',
      items: {
        type: 'object',
        properties: { titel: { type: 'string' }, url: { type: 'string' }, erkenntnis: { type: 'string' } },
        required: ['titel', 'url'],
      },
    },
    video_vorschlaege: {
      type: 'array',
      items: {
        type: 'object',
        properties: { titel: { type: 'string' }, url: { type: 'string' }, passt_zu: { type: 'string' } },
        required: ['titel', 'url'],
      },
    },
  },
  required: ['leitidee', 'zugaenge', 'stolpersteine', 'kernbegriffe'],
};

/** zweck: z. B. "für selbstgesteuertes Lernen" oder "für den lehrergesteuerten Klassenunterricht". */
export async function recherchiereFundament(base44, { fach, jahrgangsstufe, thema, vorgaben, zweck }) {
  const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Du bist Fachdidaktikerin für ${fach} an einer Integrierten Gesamtschule in Niedersachsen und bereitest eine Unterrichtseinheit ${zweck} vor.

Thema: ${thema}
Jahrgangsstufe: ${jahrgangsstufe}
${vorgaben ? `Wünsche der Lehrkraft: ${vorgaben}` : ''}

Recherchiere im Internet:
1. Das niedersächsische Kerncurriculum für ${fach} (Integrierte Gesamtschule, Sekundarstufe I): Welche erwarteten Kompetenzen gehören in dieser Jahrgangsstufe zu diesem Thema?
2. Wie man diesen Inhalt Schülern dieser Jahrgangsstufe wirklich gut beibringt — sieh dir an, wie etablierte deutschsprachige Angebote (studyflix.de, öffentlich-rechtliche Bildungsangebote, Lernportale, Fachdidaktik-Veröffentlichungen, Unterrichtsentwürfe) das Thema aufbauen.

Liefere:
- leitidee: In 3–5 Sätzen der didaktische Kern.
- kerncurriculum: 2–5 Sätze, welche Kompetenzen das niedersächsische Kerncurriculum dazu erwartet (mit Kompetenzbereich).
- zugaenge: Die bewährte REIHENFOLGE der Lernschritte (4–10 Einträge), jeweils mit kurzer Begründung.
- stolpersteine: 3–6 typische Fehlvorstellungen und Fehler.
- kernbegriffe: Die Fachbegriffe, die am Ende sitzen müssen.
- quellen: Echte, existierende Adressen mit der jeweiligen Erkenntnis — erfinde nichts.
- video_vorschlaege: Konkrete Lernvideos, bevorzugt auf studyflix.de. Nur echte Adressen.

Antworte auf Deutsch.`,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: FUNDAMENT_SCHEMA,
  });
  const fundament = unwrapLLM(antwort);
  return fundament?.leitidee ? fundament : null;
}