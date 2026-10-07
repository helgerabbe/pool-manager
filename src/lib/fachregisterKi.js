import { base44 } from '@/api/base44Client';

const kontext = (e) => `Fach: ${e.fach}, Jahrgang ${e.jahrgangsstufe}, Kurs: ${(e.kurse || []).join(', ') || 'alle'}, Einheit: „${e.titel}“.
Schulform: Integrierte Gesamtschule in Niedersachsen, Grundlage ist das Kerncurriculum IGS.
Kursmodell: „Blick A“ = im Kern G-Kurs mit sinnvollen additiven E-Inhalten (nicht alle E-Inhalte); „Blick O“ = im Kern E-Kurs, für G-Lernende wird sinnvoll reduziert. Beide müssen nicht deckungsgleich sein.`;

const signiert = (dateien) => Promise.all((dateien || []).map(async (d) =>
  (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: d.file_uri, expires_in: 900 })).signed_url));

const KEYS = ['sachanalyse', 'inhalte', 'lernziele', 'kc_bezuege', 'fachsprache', 'material'];

/** Entwurf der fachlichen Abschnitte aus den hochgeladenen Lehrwerksseiten. */
export async function entwurfAusLehrwerk(einheit) {
  const file_urls = await signiert(einheit.lehrwerk_dateien);
  return base44.integrations.Core.InvokeLLM({
    prompt: `Du bist Fachdidaktiker und erstellst einen schuleigenen Arbeitsplan.\n${kontext(einheit)}
Grundlage sind die beigefügten Lehrwerksseiten (Inhaltsverzeichnis, Merkseiten, Tests). Erstelle in gutem Deutsch, als Markdown (Überschriften, Listen):
- sachanalyse: fundierte fachliche Sachanalyse.
- inhalte: Inhalte, getrennt in „Gemeinsamer Kern“ und „Differenzierung“ passend zum Kursmodell.
- lernziele: „Die Schülerinnen und Schüler können …“, getrennt nach Kern und Differenzierung.
- kc_bezuege: zugeordnete Kompetenzen des KC IGS Mathematik (inhalts- und prozessbezogen), markiere schulische Ergänzungen und benenne Lücken zwischen Lehrwerk und KC.
- fachsprache: verbindliche Fachbegriffe mit kurzer Erklärung und Schreibweisen.
- material: Lehrwerksverweise mit Seitenzahlen.`,
    file_urls,
    response_json_schema: { type: 'object', properties: Object.fromEntries(KEYS.map((k) => [k, { type: 'string' }])) },
  });
}

/** Didaktische Hinweise per Internetrecherche (Stolpersteine, Zugänge, Tipps). */
export async function didaktikRecherche(einheit) {
  const res = await base44.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    add_context_from_internet: true,
    prompt: `Recherchiere im Internet (Fachdidaktik, NIBIS, Lehrerportale, schulinterne Arbeitspläne, Lernplattformen) zur Unterrichtseinheit.\n${kontext(einheit)}
Bisherige Sachanalyse: ${einheit.sachanalyse || '–'}
Erstelle einen möglichst umfassenden didaktischen Wissens- und Ideenspeicher als Markdown mit diesen Überschriften:
## Lernvoraussetzungen
## Grundvorstellungen
## Typische Fehler und Stolpersteine (jeweils mit Hinweis zur Vorbeugung)
## Bewährte Zugänge und Einstiege
## Handlungsorientierte Ideen
## Tipps für die Differenzierung (Kursmodell beachten)
## Digitale Werkzeuge
## Quellen (mit Link)`,
    response_json_schema: { type: 'object', properties: { didaktik: { type: 'string' } } },
  });
  return res.didaktik;
}