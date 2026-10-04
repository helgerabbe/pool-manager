import { base44 } from '@/api/base44Client';

const TEXT = { type: 'string' };

/** Gesprochene Bauplan-Eingaben sprachlich glätten und eine Übersicht ableiten. */
export async function strukturiereBauplan(methode, rohtext, felder) {
  const zielfelder = felder.map(([k, titel]) => `- ${k}: ${titel}`).join('\n');
  const prompt = `Du bist erfahrene Fachdidaktikerin. Eine Lehrkraft hat die Unterrichtsmethode "${methode.name}" in EINEM freien, oft gesprochenen Text beschrieben. Der Text ist umgangssprachlich und teils durcheinander.
Verteile die Aussagen auf die folgenden Felder und formuliere sie professionell, knapp und sachlich. Erfinde nichts Neues dazu; wozu nichts gesagt wurde, bleibt das Feld leer.
FELDER:
${zielfelder}
Listenfelder (pflicht_material, optional_material, assistent_fragen) schreibst du als eine Zeile je Punkt, ohne Aufzählungszeichen.
Erstelle außerdem eine Übersicht: gehoert_dazu = was diese Methode ausmacht (Kernmerkmale), gehoert_nicht_dazu = was ausdrücklich nicht dazugehört oder wovon sie sich abgrenzt (nur, was sich aus den Eingaben ergibt). Je Punkt ein kurzer Satz.

TEXT DER LEHRKRAFT:
${rohtext}`;
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