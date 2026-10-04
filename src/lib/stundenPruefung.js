import { base44 } from '@/api/base44Client';
import { kontextText, signiereMaterial } from '@/lib/stundenKontext';

const SCHEMA = {
  type: 'object',
  properties: {
    ampel: { type: 'string', enum: ['passt', 'bedingt'] },
    satz: { type: 'string' },
    entscheidungen: {
      type: 'array',
      items: {
        type: 'object',
        properties: { frage: { type: 'string' }, optionen: { type: 'array', items: { type: 'string' } } },
      },
    },
  },
};

/** Ehrliche Plausibilitätsprüfung des Rahmens durch die KI. */
export async function pruefeRahmen(ctx) {
  const file_urls = await signiereMaterial(ctx.rahmen.materialien);
  const prompt = `Du bist erfahrene Fachdidaktikerin und prüfst ehrlich, ob eine geplante Unterrichtsstunde im gegebenen Rahmen realistisch ist.
${kontextText(ctx)}

Antworte mit ampel 'passt', wenn alles realistisch ist (dann entscheidungen leer), sonst 'bedingt'. satz: 1–2 Sätze ehrliche Begründung auf Deutsch, du-Form.
Bei 'bedingt': nur für echte Probleme 1–3 Entscheidungen mit je 2–3 kurzen, konkreten Optionen.`;
  return base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA, file_urls: file_urls.length ? file_urls : undefined });
}