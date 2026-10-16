import { base44 } from '@/api/base44Client';
import { kiAnfrage } from '@/lib/kiAnfrage';
import { INDUKTIVE_VARIANTEN } from '@/lib/induktiveVarianten';

/** Ruft je nach gewähltem Assistenten die Plattform-KI oder Anthropic auf. */
export const kiAufruf = (assistent, prompt, response_json_schema) => (assistent === 'anthropic'
  ? kiAnfrage({ prompt, response_json_schema })
  : base44.integrations.Core.InvokeLLM({ prompt, response_json_schema }));

const stundeText = ({ stunde, fach, jahrgang }) => `Fach: ${fach}, Jahrgang ${jahrgang}, Gesamtschule
Unterrichtseinheit: ${stunde.einheit}
Geplante Stunde: ${stunde.titel || 'freie Stunde (Thema aus der Einheit ableiten)'}${stunde.lernziel ? `\nLernziel laut Einheitenverlauf: ${stunde.lernziel}` : ''}${stunde.inhalte?.length ? `\nInhalte: ${stunde.inhalte.join('; ')}` : ''}${stunde.vorschlag ? `\nIdee aus dem Verlauf: ${stunde.vorschlag}` : ''}`;

const korrekturText = (bisher, korrektur) => (korrektur ? `\n\nBisheriger Vorschlag: ${JSON.stringify(bisher)}\nKorrektur der Lehrkraft: "${korrektur}" – richte dich danach.` : '');

/** Inhaltsanalyse: 3–4 kurze Kernaspekte + ausführliche Sachanalyse. */
export async function kiInhaltsanalyse({ assistent, bisher, korrektur, ...k }) {
  return kiAufruf(assistent, `Du bist erfahrener Fachdidaktiker. Erstelle eine knappe Inhaltsanalyse für die folgende Unterrichtsstunde.
${stundeText(k)}

- "aspekte": 3–4 kurze, prägnante Sätze: worum es inhaltlich geht und was fachlich entscheidend ist.
- "sachanalyse": ein Absatz (6–10 Sätze) fachliche Sachanalyse für die Lehrkraft, mit didaktischem Schwerpunkt für diesen Jahrgang.${korrekturText(bisher, korrektur)}`, {
    type: 'object',
    properties: { aspekte: { type: 'array', items: { type: 'string' } }, sachanalyse: { type: 'string' } },
    required: ['aspekte', 'sachanalyse'],
  });
}

/** Stundentyp: passendes Stundenmodell + Begründung + 3 Alternativen mit „Wann“. */
export async function kiStundentyp({ assistent, analyse, modelle, ...k }) {
  const keys = modelle.map((m) => m.key);
  return kiAufruf(assistent, `Du bist erfahrener Fachdidaktiker. Wähle den passenden Stundentyp für diese Stunde.
${stundeText(k)}
Inhaltsanalyse: ${analyse.aspekte.join(' ')}

Verfügbare Stundenmodelle (key: Name – Phasen):
${modelle.map((m) => `- ${m.key}: ${m.name} – ${m.phasen.join(' → ')}`).join('\n')}

- "vorschlag": key des am besten passenden Modells.
- "begruendung": 1–2 einfache Sätze für die Lehrkraft, warum dieser Aufbau hier passt.
- "alternativen": 3 andere sinnvolle Modelle, je mit "wann": ein Satz, wann dieses Modell besser wäre.
- "variante": Falls induktiv erarbeitet wird, welche Variante passt am besten?
${INDUKTIVE_VARIANTEN.map((v) => `  - ${v.key}: ${v.prompt}`).join('\n')}
- "variante_begruendung": ein einfacher Satz, warum diese Variante hier passt.`, {
    type: 'object',
    properties: {
      vorschlag: { type: 'string', enum: keys },
      begruendung: { type: 'string' },
      alternativen: { type: 'array', items: { type: 'object', properties: { key: { type: 'string', enum: keys }, wann: { type: 'string' } }, required: ['key', 'wann'] } },
      variante: { type: 'string', enum: INDUKTIVE_VARIANTEN.map((v) => v.key) },
      variante_begruendung: { type: 'string' },
    },
    required: ['vorschlag', 'begruendung', 'alternativen', 'variante', 'variante_begruendung'],
  });
}

/** Stundenziel: ein überprüfbares Hauptziel + 3 Alternativen. */
export async function kiStundenziel({ assistent, analyse, bisher, korrektur, ...k }) {
  return kiAufruf(assistent, `Du bist erfahrener Fachdidaktiker. Formuliere das Stundenziel für diese Stunde.
${stundeText(k)}
Inhaltsanalyse: ${analyse.aspekte.join(' ')}

- "haupt": EIN Stundenziel, schülerbezogen und überprüfbar ("Die Schüler ..." + Operator), in einer Einzelstunde erreichbar.
- "alternativen": 3 andere sinnvolle Zielrichtungen in derselben Form.${korrekturText(bisher, korrektur)}`, {
    type: 'object',
    properties: { haupt: { type: 'string' }, alternativen: { type: 'array', items: { type: 'string' } } },
    required: ['haupt', 'alternativen'],
  });
}