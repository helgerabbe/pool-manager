/**
 * generateReplicasSecure.js
 *
 * Sichere KI-Replikation von Masteraufgaben mit:
 * - Authz-Checks (Schreibrechte + struktureller Lock)
 * - Aktivitäts-Verbote (Bildbeschriftung, KI-Tutor)
 * - Dynamische Prompts & JSON-Schemas pro Aktivitätstyp
 * - Kontext-Injektion aus Masteraufgabe
 */

/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Aktivitätstypen, für die Kloning deaktiviert ist
const PROHIBITED_ACTIVITY_TYPES = ['bildbeschriftung', 'bildbeschreibung', 'image labeling', 'ki-tutor', 'ki tutor', 'ki tutoraufgabe'];

// deno-lint-ignore no-undef
if (typeof Deno !== 'undefined') {
  Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const payload = await req.json();
    const { master_id, anzahl = 5, lernpaket_id } = payload;

    if (!master_id) {
      return new Response(
        JSON.stringify({ error: 'master_id is required' }),
        { status: 400 }
      );
    }

    if (anzahl < 1 || anzahl > 20) {
      return new Response(
        JSON.stringify({ error: 'anzahl must be between 1 and 20' }),
        { status: 400 }
      );
    }

    // ── 1. LADE MASTERAUFGABE ────────────────────────────────────────────────────
    const masterAufgabe = await base44.asServiceRole.entities.MasterAufgabe.filter({
      id: master_id,
    });

    if (!masterAufgabe || masterAufgabe.length === 0 || !masterAufgabe[0].is_master) {
      return new Response(
        JSON.stringify({ error: 'Master task not found or invalid' }),
        { status: 404 }
      );
    }

    const master = masterAufgabe[0];

    // ── 2. LADE AKTIVITÄTSTYP & PRÜFE VERBOTE ───────────────────────────────────
    const activity = master.activity_id
      ? await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
          id: master.activity_id,
        })
      : null;

    if (!activity || activity.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Activity not found' }),
        { status: 404 }
      );
    }

    const activityRecord = activity[0];
    const aktivitaetKatalog = await base44.asServiceRole.entities.AktivitaetenKatalog.filter({
      id: activityRecord.aktivitaet_id,
    });

    if (!aktivitaetKatalog || aktivitaetKatalog.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Activity catalog entry not found' }),
        { status: 404 }
      );
    }

    const catalogName = aktivitaetKatalog[0].name.toLowerCase();

    // HARTE WEICHE: Aktivitäts-Verbote
    if (PROHIBITED_ACTIVITY_TYPES.some(type => catalogName.includes(type))) {
      return new Response(
        JSON.stringify({
          error: 'CLONING_DISABLED',
          message: 'Für diesen Aktivitätstyp ist das Klonen deaktiviert',
          activityType: catalogName,
        }),
        { status: 400 }
      );
    }

    // ── 3. AUTORISIERUNG: SCHREIBRECHTE PRÜFEN ───────────────────────────────────
    // Versuche die Lernpaket-Entity im User-Kontext zu laden
    const userLernpaket = await base44.entities.Lernpakete.filter({
      id: lernpaket_id || master.lernpaket_id,
    });

    if (!userLernpaket || userLernpaket.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Zugriff verweigert: Keine Schreibrechte' }),
        { status: 403 }
      );
    }

    // ── 4. STRUKTURELLER LOCK PRÜFEN ──────────────────────────────────────────────
    const lp = userLernpaket[0];
    const hasLock = lp.structural_lock === user.email && lp.structural_locked_at;
    if (!hasLock) {
      return Response.json(
        { error: 'LOCK_REQUIRED', message: 'Keine Bearbeitungsberechtigung (Lock erforderlich)' },
        { status: 403 }
      );
    }

    // ── 5. KONTEXT SAMMELN ───────────────────────────────────────────────────────
    const lernziel = master.lernziel_id
      ? await base44.asServiceRole.entities.Lernziele.filter({
          id: master.lernziel_id,
        })
      : null;

    // ── 6. DYNAMISCHER PROMPT & SCHEMA BASIEREND AUF AKTIVITÄTSTYP ────────────────
    const { userPrompt, responseSchema } = buildDynamicPrompt(
      catalogName,
      master,
      lernziel?.[0],
      lp,
      anzahl
    );

    // ── 7. LLM AUFRUFEN ──────────────────────────────────────────────────────────
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: userPrompt,
      response_json_schema: responseSchema,
    });

    // ── 8. RESPONSE VERARBEITEN ──────────────────────────────────────────────────
    const replicas = extractReplicasFromResponse(llmResponse, catalogName);

    if (!Array.isArray(replicas) || replicas.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'LLM did not generate valid replicas',
          details: llmResponse,
        }),
        { status: 500 }
      );
    }

    // ── 9. AUDIT LOG ─────────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'CREATE',
      resource_type: 'MasterAufgabe_Replika',
      resource_id: master_id,
      changes: { generated_count: replicas.length, activity_type: catalogName },
      affected_count: replicas.length,
      status: 'success',
    });

    return new Response(
      JSON.stringify({
        success: true,
        master_id,
        activity_type: catalogName,
        replicas,
        metadata: {
          count: replicas.length,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('generateReplicasSecure error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      { status: 500 }
    );
  }
  });
}

/**
 * Dynamischer Prompt & Schema Generator basierend auf Aktivitätstyp
 */
function buildDynamicPrompt(catalogName, master, lernziel, lernpaket, anzahl) {
  const baseContext = `Du bist ein erfahrener Pädagoge, spezialisiert auf die Erstellung von didaktisch gleichwertigen Aufgabenvarianten.

KONTEXT:
- Aktivitätstyp: ${catalogName}
- Lernziel: ${lernziel?.formulierung_fachsprache || 'Nicht spezifiziert'}
- Lernpaket: ${lernpaket?.titel_des_pakets || 'Nicht spezifiziert'}
- Fach: ${lernpaket?.fach || 'Nicht spezifiziert'}

MASTERAUFGABE STRUKTUR:
${JSON.stringify(master.field_values || {}, null, 2)}

AUFGABE:
Erstelle ${anzahl} didaktisch gleichwertige Varianten, die:
- GLEICHE Komplexität und Schwierigkeit haben
- UNTERSCHIEDLICHE, aber thematisch ÄQUIVALENTE Kontexte nutzen
- Das GLEICHE FORMAT und die GLEICHE Struktur der Masteraufgabe befolgen
- Die GLEICHEN Kompetenzen testen`;

  // SWITCH-CASE PRO AKTIVITÄTSTYP
  const isLueckentext = catalogName.includes('lückentext') || catalogName.includes('lueckentext') || catalogName.includes('cloze') || catalogName.includes('fill');
  const isMultipleChoice = catalogName.includes('multiple choice') || catalogName.includes('mc-');
  const isSorting = catalogName.includes('reihenfolge') || catalogName.includes('sortierung') || catalogName.includes('sorting');
  const isMatchTerms = catalogName.includes('zuordnen') || catalogName.includes('match terms');
  const isMiniquiz = catalogName.includes('miniquiz') || catalogName.includes('quiz');

  if (isLueckentext) {
    const { lueckentext = '' } = master.field_values || {};
    return {
      userPrompt: `${baseContext}

MASTERTEXT:
${lueckentext}

ZWINGEND:
Du musst exakt dieselben Zielwörter (in eckigen Klammern [...]) im neuen Text UNVERÄNDERT lassen.
Verändere ONLY die Satzstruktur, Formulierungen und Kontext drumherum.
Achte darauf, dass die neuen Lückentexte didaktisch äquivalent sind.

Antworte mit JSON: {"replicas": [{"aufgabentext": "...Text mit [...] Lücken..."}, ...]}`,
      responseSchema: {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                aufgabentext: { type: 'string', description: 'Text mit [...] Lückenmarkierungen' },
              },
              required: ['aufgabentext'],
            },
          },
        },
        required: ['replicas'],
      },
    };
  }

  if (isMultipleChoice) {
    const { mcItems = [] } = master.field_values || {};
    return {
      userPrompt: `${baseContext}

MASTERITEMS:
${JSON.stringify(mcItems, null, 2)}

Generiere neue Multiple-Choice-Fragen mit je 4 Optionen (genau 1 korrekt).
Antworte mit JSON: {"replicas": [{"mcItems": [{"question": "...", "options": [{"text": "...", "isCorrect": bool}, ...]}, ...]}, ...]}`,
      responseSchema: {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                mcItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question: { type: 'string' },
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
                      },
                    },
                    required: ['question', 'options'],
                  },
                },
              },
              required: ['mcItems'],
            },
          },
        },
        required: ['replicas'],
      },
    };
  }

  if (isSorting) {
    const { orderedItems = [], instruction = '' } = master.field_values || {};
    return {
      userPrompt: `${baseContext}

MASTERANWEISUNG:
${instruction}

MEISTERREIHENFOLGE:
${orderedItems.join('\n')}

ZWINGEND:
Gib die Elemente in der korrekten Ziel-Reihenfolge (von oben nach unten) zurück.
Antworte mit JSON: {"replicas": [{"instruction": "...", "orderedItems": ["...", "...", ...]}, ...]}`,
      responseSchema: {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instruction: { type: 'string' },
                orderedItems: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['instruction', 'orderedItems'],
            },
          },
        },
        required: ['replicas'],
      },
    };
  }

  if (isMatchTerms) {
    const { pairs = [], distractors = [], instruction = '' } = master.field_values || {};
    return {
      userPrompt: `${baseContext}

MASTERANWEISUNG:
${instruction}

MASTERPAARE:
${pairs.map(p => `${p.left} → ${p.right}`).join('\n')}

DISTRAKTOREN:
${distractors.join(', ')}

Generiere neue Begriffspaare mit neuen (aber thematisch äquivalenten) Links und Rechts-Termen.
Antworte mit JSON: {"replicas": [{"instruction": "...", "pairs": [{"left": "...", "right": "..."}, ...], "distractors": ["...", ...]}, ...]}`,
      responseSchema: {
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
                },
              },
              required: ['instruction', 'pairs', 'distractors'],
            },
          },
        },
        required: ['replicas'],
      },
    };
  }

  if (isMiniquiz) {
    const { quizItems = [] } = master.field_values || {};
    return {
      userPrompt: `${baseContext}

MASTERQUIZ:
${JSON.stringify(quizItems, null, 2)}

Generiere neue Miniquiz-Fragen (kurze Frage + korrekte Antwort).
Antworte mit JSON: {"replicas": [{"quizItems": [{"question": "...", "correctAnswer": "..."}, ...]}, ...]}`,
      responseSchema: {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                quizItems: {
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
              required: ['quizItems'],
            },
          },
        },
        required: ['replicas'],
      },
    };
  }

  // FALLBACK: Generisches Format
  return {
    userPrompt: `${baseContext}

Antworte mit JSON: {"replicas": [{"aufgabentext": "...", ...}, ...]}`,
    responseSchema: {
      type: 'object',
      properties: {
        replicas: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['replicas'],
    },
  };
}

/**
 * Replicas aus LLM-Response extrahieren (je nach Aktivitätstyp)
 */
function extractReplicasFromResponse(llmResponse, catalogName) {
  if (!llmResponse || !llmResponse.replicas || !Array.isArray(llmResponse.replicas)) {
    return [];
  }
  return llmResponse.replicas.map(replica => ({
    field_values: replica,
    content_status: 'draft',
    sync_status: 'new',
  }));
}