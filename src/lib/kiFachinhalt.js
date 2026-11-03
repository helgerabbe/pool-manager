import { base44 } from '@/api/base44Client';

const SCHEMA = {
  type: 'object',
  properties: {
    kapitel: { type: 'array', items: { type: 'object', properties: {
      titel: { type: 'string' },
      abschnitte: { type: 'array', items: { type: 'object', properties: { titel: { type: 'string' }, text: { type: 'string' } } } },
    } } },
    quellen: { type: 'array', items: { type: 'string' } },
  },
};

/** Ordnet das Rohmaterial in das fachliche Exposé der Einheit ein (ergänzend, nie ersetzend). */
export async function fachinhaltEinordnen({ einheit, planung, quellen, recherche }) {
  const bisher = einheit.fachinhalt?.kapitel?.length ? JSON.stringify(einheit.fachinhalt) : 'noch keiner';
  const roh = quellen.map((q) => `- [${q.art}] ${q.url || ''} ${q.inhalt || ''}`).join('\n') || 'keines';
  const links = quellen.some((q) => q.url);
  const prompt = `Du erstellst das fachliche Exposé einer Unterrichtseinheit (nicht didaktisch, rein fachlich-inhaltlich) für Lehrkräfte.
Einheit: "${einheit.titel}", Fach ${einheit.fach}, Jahrgang ${einheit.jahrgangsstufe}.
${planung?.thema ? `Thema laut Planung: ${planung.thema}` : ''}

Gliedere in Kapitel mit Abschnitten. Typisch: (1) Grundlagen des Unterrichtsgegenstands (z. B. bei einer Ganzschrift: Was ist ein Roman, Prosa, Erzählinstanz, Figuren, Handlungsstränge, Motive …), (2) der konkrete Inhalt (z. B. Handlung, Figuren, Schauplätze, Themen, Sprache, Aufbau), (3) Kontext (Autor, Entstehung, Rezeption), (4) weitere sinnvolle Kapitel. Schreibe sehr ausführlich und fachlich genau, Abschnitttexte in Markdown.

REGELN: Der bisherige Fachinhalt bleibt vollständig erhalten. Ergänze ihn, ordne Neues an der passenden Stelle ein, korrigiere nur nachweislich Falsches. Erfinde nichts. Gib in "quellen" alle genutzten Quellen (Links, "Material der Lehrkraft") an.
${recherche ? 'Recherchiere zusätzlich gründlich im Internet und baue die Ergebnisse ein.' : ''}
${links ? 'Lies die angegebenen Links und nutze ihren Inhalt.' : ''}

BISHERIGER FACHINHALT:
${bisher}

ROHMATERIAL DER LEHRKRAFT:
${roh}`;
  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: SCHEMA,
    ...(recherche || links ? { add_context_from_internet: true, model: 'gemini_3_1_pro' } : {}),
  });
  if (!res?.kapitel?.length) throw new Error('leer');
  await base44.entities.Unterrichtseinheit.update(einheit.id, { fachinhalt: { ...res, aktualisiert_am: new Date().toISOString() } });
  const offen = quellen.filter((q) => !q.eingeordnet);
  if (offen.length) await base44.entities.FachinhaltQuelle.bulkUpdate(offen.map((q) => ({ id: q.id, eingeordnet: true })));
}