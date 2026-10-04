import { base44 } from '@/api/base44Client';

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
export async function pruefeRahmen({ planung, abschnitt, rahmen, vorherige }) {
  const file_urls = await Promise.all((rahmen.materialien || []).map(async (m) =>
    (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: m.file_uri, expires_in: 600 })).signed_url));
  const verlauf = vorherige.map((a, i) => `- ${a.titel}: ${rahmen.vorherigeStatus?.[i] || 'ja'}`).join('\n');
  const prompt = `Du bist erfahrene Fachdidaktikerin und prüfst ehrlich, ob eine geplante Unterrichtsstunde im gegebenen Rahmen realistisch ist.
Thema der Einheit: ${planung?.thema || ''}
Geplanter Abschnitt: ${abschnitt.titel} (Schwerpunkt ${abschnitt.schwerpunkt || '-'}, Lernziel: ${abschnitt.lernziel || '-'}, vorgesehen ${abschnitt.minuten || '?'} Min.)
Inhalte: ${(abschnitt.inhalte || []).join(', ')}
Verfügbare Zeit: ${rahmen.zeit}
${verlauf ? `Bisherige Abschnitte (ja = wie geplant, anders = anders gelaufen, nein = nicht durchgeführt):\n${verlauf}` : 'Dies ist die erste Stunde der Einheit.'}
Vorwissen/Bisheriges: ${rahmen.vorwissen || '-'}
Sonstiges: ${rahmen.sonstiges || '-'}
${file_urls.length ? 'Die Lehrkraft hat Material angehängt, das sie unbedingt nutzen möchte – prüfe, ob es passt.' : ''}

Antworte mit ampel 'passt', wenn alles realistisch ist (dann entscheidungen leer), sonst 'bedingt'. satz: 1–2 Sätze ehrliche Begründung auf Deutsch, du-Form.
Bei 'bedingt': nur für echte Probleme 1–3 Entscheidungen mit je 2–3 kurzen, konkreten Optionen.`;
  return base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA, file_urls: file_urls.length ? file_urls : undefined });
}