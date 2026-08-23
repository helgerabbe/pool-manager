/**
 * docsAssistent.js
 *
 * Der „Pool-Manager-Assistent": ein Chat-Helfer, der Fragen zur App
 * beantwortet — sowohl BEDIENUNG („Wo finde ich das nochmal?", „Wie mache ich
 * das?") als auch DIDAKTIK („Ich habe hier ein Arbeitsblatt, was kann ich
 * damit im Pool-Manager machen?").
 *
 * Arbeitsweise:
 *   1. Lokale Kapitel-Suche (docsSuche.js) liefert die passendsten
 *      Dokumentations-Kapitel im Volltext.
 *   2. Die KI antwortet AUSSCHLIESSLICH auf dieser Grundlage — plus einem
 *      Inhaltsverzeichnis, damit sie auf weitere Kapitel verweisen kann.
 *   3. Rückgabe ist strukturiert: kurze Antwort, konkrete nächste Schritte,
 *      optional eine Rückfrage und die Quellen-Kapitel zum Nachlesen.
 */

import { base44 } from '@/api/base44Client';
import { findeRelevanteKapitel, inhaltsverzeichnisText } from '@/lib/docsSuche';

const ANTWORT_SCHEMA = {
  type: 'object',
  properties: {
    antwort: {
      type: 'string',
      description: 'Die eigentliche Antwort in Du-Form, kurz und konkret (Markdown erlaubt).',
    },
    schritte: {
      type: 'array',
      description: 'Optional: konkrete Klick-Schritte in der richtigen Reihenfolge.',
      items: { type: 'string' },
    },
    rueckfrage: {
      type: ['string', 'null'],
      description: 'Optional: EINE Rückfrage, wenn die Antwort davon abhängt.',
    },
    quellen: {
      type: 'array',
      description: 'Kapitel zum Nachlesen — nur slugs aus dem Inhaltsverzeichnis.',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  },
  required: ['antwort'],
};

/**
 * Stellt eine Frage an den Assistenten.
 * @param {string} frage       Die aktuelle Frage der Lehrkraft.
 * @param {Array}  verlauf     Bisherige Nachrichten [{ role: 'user'|'assistant', content }].
 * @param {Array}  dateiUrls   Optional hochgeladene Bilder/PDFs (z. B. abfotografiertes Arbeitsblatt).
 */
export async function frageAssistenten({ frage, verlauf = [], dateiUrls = [] }) {
  // Für die Kapitel-Suche zählt die aktuelle Frage plus die letzte eigene
  // Frage — so bleiben Nachfragen wie „und wie gebe ich das frei?" im Thema.
  const letzteEigeneFrage = [...verlauf].reverse().find((m) => m.role === 'user')?.content || '';
  const kapitel = findeRelevanteKapitel(`${letzteEigeneFrage} ${frage}`);

  const wissensbasis = kapitel
    .map((k) => `### Kapitel „${k.label}" (slug: ${k.slug})\n${k.inhalt}`)
    .join('\n\n---\n\n');

  const verlaufText = verlauf.length
    ? verlauf
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'LEHRKRAFT' : 'ASSISTENT'}: ${m.content}`)
        .join('\n')
    : '(noch kein Verlauf)';

  const prompt = `Du bist der Assistent des „Pool-Managers" — einer Planungsplattform, mit der Lehrkräfte modularisierte Unterrichtseinheiten für selbstgesteuerte Lernphasen bauen. Du kennst die App in- und auswendig und hilfst Kolleginnen und Kollegen, die schnell etwas wissen wollen, ohne die Dokumentation zu durchsuchen.

DEINE ROLLE
- Du bist eine hilfsbereite Kollegin/ein hilfsbereiter Kollege, keine Suchmaschine. Sprich die Lehrkraft mit „du" an.
- Antworte KURZ und handlungsorientiert: zuerst die Antwort in 1–3 Sätzen, dann bei Bedarf die konkreten Klick-Schritte.
- Zwei Arten von Fragen kommen vor:
  (a) BEDIENUNG: „Wo ist das nochmal?", „Wie mache ich X?" → nenne den konkreten Ort in der App (Tab-Name, Button-Bezeichnung, Symbol).
  (b) DIDAKTIK/INHALT: „Ich habe ein Arbeitsblatt / eine Aufgabe und will X" → empfiehl die passende Ebene (1/2/3) und die konkrete Aufgabenart bzw. den passenden Weg in der App, und begründe kurz warum.
- Sei konkret und vorschlagend: „Du kannst dafür … nutzen" oder „Am schnellsten geht das so: …".
- Wenn die Frage zu unklar ist, um sinnvoll zu antworten, stelle GENAU EINE Rückfrage (Feld rueckfrage) — antworte aber trotzdem so weit, wie es geht.
- Nenne im Feld quellen die Kapitel, in denen die Lehrkraft es genauer nachlesen kann (nur die slugs aus dem Inhaltsverzeichnis, maximal drei).

WICHTIGE REGELN
- Stütze dich AUSSCHLIESSLICH auf die Dokumentation unten. Erfinde keine Buttons, Tabs oder Funktionen.
- Steht die Antwort nicht in der Dokumentation, sage das offen und nenne das Kapitel, das am nächsten dran ist, oder verweise auf den „Problem melden"-Button.
- Keine Fachchinesisch-Erklärungen über Datenbanken, Code oder Technik im Hintergrund.

ALLE VERFÜGBAREN KAPITEL DER DOKUMENTATION:
${inhaltsverzeichnisText()}

RELEVANTE KAPITEL IM VOLLTEXT (deine Wissensbasis):
${wissensbasis}

BISHERIGES GESPRÄCH:
${verlaufText}

NEUE FRAGE DER LEHRKRAFT:
${frage}${dateiUrls.length > 0 ? '\n\n(Die Lehrkraft hat Material angehängt — schau es dir an und beziehe dich konkret darauf, z. B. welche Aufgabenart im Pool-Manager dazu passt.)' : ''}

Antworte ausschließlich als JSON.`;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: dateiUrls.length > 0 ? dateiUrls : null,
    response_json_schema: ANTWORT_SCHEMA,
  });

  return {
    antwort: res?.antwort || 'Dazu habe ich in der Dokumentation nichts gefunden.',
    schritte: Array.isArray(res?.schritte) ? res.schritte : [],
    rueckfrage: res?.rueckfrage || null,
    quellen: Array.isArray(res?.quellen) ? res.quellen.filter((q) => q?.slug) : [],
  };
}

/** Startvorschläge, damit die Lehrkraft nicht vor einem leeren Feld sitzt. */
export const START_FRAGEN = [
  'Wie lege ich eine neue Einheit an?',
  'Ich habe ein Arbeitsblatt abfotografiert — was mache ich damit?',
  'Warum kann ich meine Aufgabe nicht bearbeiten?',
  'Wie kommt meine Einheit zu den Schülern?',
];