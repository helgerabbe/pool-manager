import { base44 } from '@/api/base44Client';

const TEXT = { type: 'string' };

/** Gesprochene Bauplan-Eingaben sprachlich glätten und eine Übersicht ableiten. */
export async function strukturiereBauplan(methode, felder) {
  const eingaben = felder.map(([k, titel]) => `## ${titel} (${k})\n${methode[k] || '-'}`).join('\n\n');
  const prompt = `Du bist erfahrene Fachdidaktikerin. Eine Lehrkraft hat den Bauplan der Unterrichtsmethode "${methode.name}" per Spracheingabe beschrieben. Die Texte sind umgangssprachlich und teils durcheinander.
Formuliere jedes Feld professionell, knapp und sachlich neu. Ordne Aussagen, die im falschen Feld stehen, dem richtigen Feld zu. Erfinde nichts Neues dazu; leere Felder bleiben leer.
Listenfelder (pflicht_material, optional_material, assistent_fragen) schreibst du als eine Zeile je Punkt, ohne Aufzählungszeichen.
Erstelle außerdem eine Übersicht: gehoert_dazu = was diese Methode ausmacht (Kernmerkmale), gehoert_nicht_dazu = was ausdrücklich nicht dazugehört oder wovon sie sich abgrenzt (nur, was sich aus den Eingaben ergibt). Je Punkt ein kurzer Satz.

${eingaben}`;
  return base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        ...Object.fromEntries(felder.map(([k]) => [k, TEXT])),
        gehoert_dazu: { type: 'array', items: TEXT },
        gehoert_nicht_dazu: { type: 'array', items: TEXT },
      },
    },
  });
}