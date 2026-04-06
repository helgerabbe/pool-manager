import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * generateReplicasSecure.js
 *
 * Generiert KI-basierte Aufgabenvarianten mit typspezifischen Schemas
 *
 * Sicherheit & Architektur:
 * - Autorisierungs- und Lock-Prüfung vor LLM-Aufruf
 * - Klon-Verbot für nicht unterstützte Aktivitätstypen
 * - Dynamische Prompts und JSON-Schemas je Aktivitätstyp
 * - Strukturelle Daten als Kontext für KI-Generierung
 */

// Aktivitätstypen, für die Klonen NICHT erlaubt ist
const CLONING_FORBIDDEN_TYPES = [
  'Bildbeschriftung',
  'KI Tutoraufgabe',
];

/**
 * Generiert typspezifischen Prompt und JSON-Schema
 */
function getPromptAndSchemaForType(aktivitaetstyp, masterText, masterData) {
  switch (aktivitaetstyp) {
    case 'Lückentext': {
      const promptAddition = `Du musst zwingend exakt dieselben Zielwörter (in eckigen Klammern [...]) in den neuen Text einbauen. Verändere nur die Satzstruktur und Formulierungen drumherum.`;
      const schema = {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                aufgabentext: { type: 'string', description: 'Text mit Lücken in [...] notiert' },
              },
              required: ['aufgabentext'],
            },
          },
        },
        required: ['replicas'],
      };
      return { promptAddition, schema };
    }

    case 'Multiple-Choice': {
      const promptAddition = `Erstelle Multiple-Choice-Fragen mit exakt 4 Antwortoptionen pro Frage. Genau eine Option muss korrekt sein. Variere die Position der korrekten Antwort.`;
      const schema = {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fragen: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string', description: 'Frage' },
                      options: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            text: { type: 'string' },
                            isCorrect: { type: 'boolean' },
                          },
                          required: ['text', 'isCorrect'],
                        },
                        minItems: 4,
                        maxItems: 4,
                      },
                    },
                    required: ['text', 'options'],
                  },
                },
              },
              required: ['fragen'],
            },
          },
        },
        required: ['replicas'],
      };
      return { promptAddition, schema };
    }

    case 'Miniquiz': {
      const promptAddition = `Erstelle Miniquiz-Fragen mit jeweils einer prägnanten Frage und einer korrekten Antwort. Halte die Antworten prägnant (1-2 Sätze max).`;
      const schema = {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fragen: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question: { type: 'string' },
                      correctAnswer: { type: 'string' },
                    },
                    required: ['question', 'correctAnswer'],
                  },
                },
              },
              required: ['fragen'],
            },
          },
        },
        required: ['replicas'],
      };
      return { promptAddition, schema };
    }

    case 'Reihenfolge':
    case 'Sortierung': {
      const promptAddition = `Gib die Elemente zwingend in der korrekten Ziel-Reihenfolge (von oben nach unten) zurück. Benenne die Anweisung um, aber halte die Aufgabenlogik identisch.`;
      const schema = {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instruction: { type: 'string', description: 'Aufgabenanweisung' },
                orderedItems: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Elemente in korrekter Reihenfolge',
                },
              },
              required: ['instruction', 'orderedItems'],
            },
          },
        },
        required: ['replicas'],
      };
      return { promptAddition, schema };
    }

    case 'Begriffe zuordnen': {
      const promptAddition = `Erstelle Paare von linken und rechten Begriffen, die zugeordnet werden müssen. Generiere auch 2-3 Distraktoren (falsche Begriffe), die zu keinem Paar gehören.`;
      const schema = {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instruction: { type: 'string' },
                pairs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      left: { type: 'string' },
                      right: { type: 'string' },
                    },
                    required: ['left', 'right'],
                  },
                },
                distractors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Falsche Zuordnungsoptionen',
                },
              },
              required: ['instruction', 'pairs', 'distractors'],
            },
          },
        },
        required: ['replicas'],
      };
      return { promptAddition, schema };
    }

    default: {
      // Fallback: generischer Typ
      const schema = {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                aufgabentext: { type: 'string' },
                loesung: { type: 'string' },
              },
              required: ['aufgabentext', 'loesung'],
            },
          },
        },
        required: ['replicas'],
      };
      return { promptAddition: '', schema };
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ─────────────────────────────────────────────────────────────────
    // 1. Authentifizierung
    // ─────────────────────────────────────────────────────────────────
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { master_id, anzahl = 5, zusatz_hinweise = '' } = body;

    if (!master_id) {
      return Response.json({ error: 'master_id ist erforderlich' }, { status: 400 });
    }
    if (anzahl < 1 || anzahl > 20) {
      return Response.json({ error: 'Anzahl muss zwischen 1 und 20 liegen' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. Masteraufgabe laden
    // ─────────────────────────────────────────────────────────────────
    const master = await base44.asServiceRole.entities.Aufgabenbausteine.read(master_id);
    if (!master) {
      return Response.json({ error: 'Masteraufgabe nicht gefunden' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. Klon-Verbot für spezifische Aktivitätstypen
    // ─────────────────────────────────────────────────────────────────
    const aktivitaetstyp = master.baustein_typ || 'Übung';
    if (CLONING_FORBIDDEN_TYPES.includes(aktivitaetstyp)) {
      return Response.json(
        {
          error: `Für den Aktivitätstyp "${aktivitaetstyp}" ist das Klonen deaktiviert.`,
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. Autorisierung: Schreibrechte auf Lernpaket prüfen
    // ─────────────────────────────────────────────────────────────────
    if (!master.lernpaket_id) {
      return Response.json(
        { error: 'Masteraufgabe hat kein zugeordnetes Lernpaket' },
        { status: 400 }
      );
    }

    // Versuch, das Lernpaket im User-Kontext zu lesen (Autorisierungsprüfung)
    let lernpaket = null;
    try {
      lernpaket = await base44.entities.Lernpakete.read(master.lernpaket_id);
    } catch {
      return Response.json(
        { error: 'Forbidden: Sie haben keine Schreibrechte für dieses Lernpaket' },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. Lock-Prüfung: User muss strukturellen Lock halten
    // ─────────────────────────────────────────────────────────────────
    const isLockedByUser = lernpaket.locked_by_email === user.email && lernpaket.is_locked;
    if (!isLockedByUser) {
      return Response.json(
        {
          error: 'Forbidden: Sie müssen einen Bearbeitungs-Lock auf diesem Lernpaket halten',
          currentLock: lernpaket.locked_by_email || null,
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // 6. Lernpaket-, Einheits- und Lernzieldaten laden
    // ─────────────────────────────────────────────────────────────────
    const einheit = lernpaket?.einheit_id
      ? await base44.asServiceRole.entities.Einheiten.read(lernpaket.einheit_id).catch(() => null)
      : null;

    const lernziel = master.lernziel_id
      ? await base44.asServiceRole.entities.Lernziele.read(master.lernziel_id).catch(() => null)
      : null;

    const fach = einheit?.fach || 'unbekanntes Fach';
    const jahrgangsstufe = einheit?.jahrgangsstufe || 'unbekannte Jahrgangsstufe';
    const gesamtziel = einheit?.gesamtziele?.[0] || '';
    const lernzielText = lernziel?.formulierung_fachsprache || '';
    const paketTitel = lernpaket?.titel_des_pakets || '';
    const masterText = master.aufgabentext_inhalt || '';
    const masterLoesung = master.erwartungshorizont_ki_prompt || '';

    // ─────────────────────────────────────────────────────────────────
    // 7. Typspezifischen Prompt und Schema generieren
    // ─────────────────────────────────────────────────────────────────
    const { promptAddition, schema } = getPromptAndSchemaForType(aktivitaetstyp, masterText, master);

    const systemPrompt = `Du bist ein erfahrener Pädagoge aus Norddeutschland, spezialisiert auf die Erstellung differenzierter Unterrichtsmaterialien.
Deine Aufgabe: Erstelle didaktisch gleichwertige Varianten einer vorhandenen Masteraufgabe.

WICHTIGE REGELN:
- Behalte den Schwierigkeitsgrad und die Kompetenzanforderungen exakt bei.
- Verwende andere Beispiele, Texte oder Zahlen als die Masteraufgabe, aber das gleiche Aufgabenformat.
- Passe die Aufgaben an den norddeutschen Schulkontext an (wenn sinnvoll).
- Antworte ausschließlich mit gültigem JSON.`;

    const userPrompt = `Kontext:
- Fach: ${fach}
- Jahrgangsstufe: ${jahrgangsstufe}
- Region: Norddeutschland
- Gesamtziel der Einheit: ${gesamtziel || '(nicht angegeben)'}
- Lernpaket: ${paketTitel || '(nicht angegeben)'}
- Lernziel: ${lernzielText || '(nicht angegeben)'}
- Aktivitätstyp: ${aktivitaetstyp}

MASTERAUFGABE:
"""${masterText}"""

ERWARTETE LÖSUNG DER MASTERAUFGABE:
"""${masterLoesung}"""

${promptAddition ? `SPEZIFISCHE ANFORDERUNG:\n${promptAddition}\n` : ''}

${zusatz_hinweise ? `ZUSÄTZLICHE HINWEISE DES LEHRERS:\n"""${zusatz_hinweise}"""\n` : ''}

Erstelle jetzt genau ${anzahl} Aufgabenvariante(n), die didaktisch gleichwertig zur Masteraufgabe sind, aber andere Inhalte/Beispiele verwenden.`;

    // ─────────────────────────────────────────────────────────────────
    // 8. LLM-Aufruf mit typspezifischem Schema
    // ─────────────────────────────────────────────────────────────────
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: userPrompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: schema,
    });

    const replicas = result?.replicas || [];

    return Response.json({
      success: true,
      replicas,
      metadata: {
        master_id,
        anzahl_generiert: replicas.length,
        aktivitaetstyp,
        fach,
        jahrgangsstufe,
      },
    });
  } catch (error) {
    console.error('[generateReplicasSecure] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});