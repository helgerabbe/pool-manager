/**
 * klonPromptSchema.js
 *
 * Baut Prompt + JSON-Schema für KI-Variationen einer Masteraufgabe.
 *
 * Kernregel: Ein Klon muss GENAU dasselbe Format wie die Masteraufgabe haben —
 * nur mit anderen Inhalten. Deshalb wird das Schema aus den vorhandenen
 * `field_values` der Masteraufgabe abgeleitet (questions, pairs, orderedItems,
 * lueckentext). Formate, die hier nicht abgedeckt sind, liefern `null`; der
 * Aufrufer zeigt dann einen Hinweis statt falsch strukturierte Klone anzulegen.
 */

const BASIS_REGELN = `Du bist ein erfahrener Pädagoge. Erstelle didaktisch gleichwertige Varianten einer Aufgabe.
REGELN:
- Behalte Aufgabenformat, Struktur, Anzahl der Elemente und Schwierigkeitsgrad exakt bei.
- Verwende andere Inhalte/Beispiele als das Original.
- Antworte ausschließlich mit gültigem JSON.`;

export function buildKlonPromptSchema(fieldValues = {}, count = 1, hint = '') {
  const fokus = hint ? `\nThematischer Fokus: ${hint}` : '';
  const kopf = `${BASIS_REGELN}\n\nErstelle genau ${count} Variation(en).${fokus}\n`;

  // ── Quiz-Formate (Miniquiz, Multiple-Choice, Test): questions[] ──
  if (Array.isArray(fieldValues.questions)) {
    const fragenAnzahl = fieldValues.questions.length;
    const antwortAnzahl = fieldValues.questions[0]?.answers?.length || 4;
    return {
      prompt: `${kopf}
FORMAT: Jede Variation hat genau ${fragenAnzahl} Frage(n) mit jeweils genau ${antwortAnzahl} Antwortoptionen.
Genau eine Antwort pro Frage ist korrekt (isCorrect: true); variiere die Position der korrekten Antwort.
${fieldValues.instruction ? `Übernimm eine sinngemäß gleiche Arbeitsanweisung wie: "${fieldValues.instruction}"` : ''}

ORIGINAL-AUFGABE:
${JSON.stringify(fieldValues)}

Antworte als JSON mit einem "klone"-Array, jedes Element: { "instruction": string, "questions": [{ "question": string, "answers": [{ "text": string, "isCorrect": boolean }] }] }`,
      schema: {
        type: 'object',
        properties: {
          klone: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instruction: { type: 'string' },
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question: { type: 'string' },
                      answers: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: { text: { type: 'string' }, isCorrect: { type: 'boolean' } },
                          required: ['text', 'isCorrect'],
                        },
                      },
                    },
                    required: ['question', 'answers'],
                  },
                },
              },
              required: ['questions'],
            },
          },
        },
        required: ['klone'],
      },
    };
  }

  // ── Lückentext ──
  if (fieldValues.lueckentext) {
    return {
      prompt: `${kopf}
FORMAT: Lückentext. Die Zielwörter in eckigen Klammern [...] sind UNVERÄNDERBAR und müssen alle in gleicher Form und Reihenfolge im neuen Text vorkommen. Ändere nur Satzbau und Formulierungen drumherum.

ORIGINAL:
${fieldValues.lueckentext}

Antworte als JSON mit einem "klone"-Array, jedes Element: { "lueckentext": string }`,
      schema: {
        type: 'object',
        properties: {
          klone: {
            type: 'array',
            items: { type: 'object', properties: { lueckentext: { type: 'string' } }, required: ['lueckentext'] },
          },
        },
        required: ['klone'],
      },
    };
  }

  // ── Reihenfolge sortieren ──
  if (Array.isArray(fieldValues.orderedItems)) {
    return {
      prompt: `${kopf}
FORMAT: Sortieraufgabe mit genau ${fieldValues.orderedItems.length} Elementen, die bereits in der KORREKTEN Reihenfolge zurückgegeben werden. Elemente kurz halten (3-10 Wörter).

ORIGINAL:
- Anweisung: "${fieldValues.instruction || ''}"
- Elemente: ${JSON.stringify(fieldValues.orderedItems)}

Antworte als JSON mit einem "klone"-Array, jedes Element: { "instruction": string, "orderedItems": [string] }`,
      schema: {
        type: 'object',
        properties: {
          klone: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instruction: { type: 'string' },
                orderedItems: { type: 'array', items: { type: 'string' } },
              },
              required: ['instruction', 'orderedItems'],
            },
          },
        },
        required: ['klone'],
      },
    };
  }

  // ── Begriffe zuordnen ──
  if (Array.isArray(fieldValues.pairs)) {
    return {
      prompt: `${kopf}
FORMAT: Zuordnungsaufgabe mit genau ${fieldValues.pairs.length} Begriffspaaren plus 2-3 Distraktoren (falsche Begriffe ohne Paar).

ORIGINAL:
- Anweisung: "${fieldValues.instruction || ''}"
- Paare: ${JSON.stringify(fieldValues.pairs)}

Antworte als JSON mit einem "klone"-Array, jedes Element: { "instruction": string, "pairs": [{ "left": string, "right": string }], "distractors": [string] }`,
      schema: {
        type: 'object',
        properties: {
          klone: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instruction: { type: 'string' },
                pairs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { left: { type: 'string' }, right: { type: 'string' } },
                    required: ['left', 'right'],
                  },
                },
                distractors: { type: 'array', items: { type: 'string' } },
              },
              required: ['instruction', 'pairs'],
            },
          },
        },
        required: ['klone'],
      },
    };
  }

  return null;
}