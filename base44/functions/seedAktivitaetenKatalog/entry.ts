import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AKTIVITAETEN = [
  // ──── INPUT PHASE ────
  {
    name: 'Text lesen',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'text_content',
        type: 'textarea',
        label: 'Textinhalt',
        required: true,
        placeholder: 'Geben Sie den zu lesenden Text ein...'
      }
    ]
  },
  {
    name: 'Dokument',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'document_file',
        type: 'file',
        label: 'Dokument hochladen (PDF, Word, etc.)',
        required: true
      }
    ]
  },
  {
    name: 'Bild anschauen',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'image_file',
        type: 'image',
        label: 'Bild hochladen',
        required: true
      },
      {
        field_name: 'image_description',
        type: 'textarea',
        label: 'Bildbeschreibung für Schüler',
        required: false
      }
    ]
  },
  {
    name: 'Video anschauen',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'video_url',
        type: 'url',
        label: 'Video-URL (YouTube/Vimeo)',
        required: false,
        placeholder: 'https://youtube.com/watch?v=...'
      },
      {
        field_name: 'video_file',
        type: 'file',
        label: 'oder Video-Datei hochladen',
        required: false
      },
      {
        field_name: 'video_duration_minutes',
        type: 'number',
        label: 'Videolänge (Minuten)',
        required: false
      }
    ]
  },
  {
    name: 'Audio hören',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'audio_file',
        type: 'audio',
        label: 'Audiodatei hochladen (MP3, WAV)',
        required: true
      },
      {
        field_name: 'audio_transcript',
        type: 'textarea',
        label: 'Transkript (optional)',
        required: false
      }
    ]
  },
  {
    name: 'Webseite besuchen',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'website_url',
        type: 'url',
        label: 'Webseiten-URL',
        required: true,
        placeholder: 'https://example.com'
      },
      {
        field_name: 'website_instructions',
        type: 'textarea',
        label: 'Bearbeitungsanleitung für Schüler',
        required: false
      }
    ]
  },
  {
    name: 'Lehrwerk/Quelle',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'source_title',
        type: 'text',
        label: 'Titel des Lehrwerks/der Quelle',
        required: true
      },
      {
        field_name: 'source_page',
        type: 'number',
        label: 'Seitenzahl',
        required: true
      },
      {
        field_name: 'source_chapter',
        type: 'text',
        label: 'Kapitel/Abschnitt',
        required: false
      }
    ]
  },

  // ──── ÜBUNG PHASE ────
  {
    name: 'Fragen beantworten',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'questions_json',
        type: 'json',
        label: 'Fragen und Antworten (JSON)',
        required: true,
        placeholder: '[{"question": "Frage 1?", "answer": "Antwort 1"}]'
      }
    ]
  },
  {
    name: 'Paare finden',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'pairs_json',
        type: 'json',
        label: 'Paare (Schlüssel/Wert als JSON)',
        required: true,
        placeholder: '[{"left": "Begriff A", "right": "Definition A"}]'
      }
    ]
  },
  {
    name: 'Begriffe zuordnen',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'categories_json',
        type: 'json',
        label: 'Kategorien und Begriffe (JSON)',
        required: true,
        placeholder: '[{"category": "Kategorie 1", "items": ["Begriff A", "Begriff B"]}]'
      }
    ]
  },
  {
    name: 'Lückentext ausfüllen',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'gaptext_content',
        type: 'textarea',
        label: 'Text mit Lücken (markieren Sie Lücken mit [LÜCKE])',
        required: true
      },
      {
        field_name: 'gaptext_solutions',
        type: 'json',
        label: 'Lösungen als JSON-Array',
        required: true,
        placeholder: '["Lösung 1", "Lösung 2"]'
      }
    ]
  },
  {
    name: 'Text schreiben',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'writing_prompt',
        type: 'textarea',
        label: 'Schreib-Anleitung',
        required: true
      },
      {
        field_name: 'writing_min_words',
        type: 'number',
        label: 'Mindestanzahl Wörter',
        required: false
      },
      {
        field_name: 'writing_max_words',
        type: 'number',
        label: 'Maximalanzahl Wörter',
        required: false
      }
    ]
  },
  {
    name: 'Aufgabe im Lehrwerk',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'textbook_title',
        type: 'text',
        label: 'Lehrwerk-Titel',
        required: true
      },
      {
        field_name: 'textbook_page',
        type: 'number',
        label: 'Seitenzahl',
        required: true
      },
      {
        field_name: 'textbook_exercise_number',
        type: 'text',
        label: 'Aufgabennummer (z.B. "3.1")',
        required: true
      }
    ]
  },

  // ──── ABSCHLUSS PHASE ────
  {
    name: 'Bearbeitung bestätigen',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [
      {
        field_name: 'confirmation_message',
        type: 'textarea',
        label: 'Bestätigungsmeldung für Schüler',
        required: false,
        placeholder: 'Sie haben alle Aufgaben abgeschlossen!'
      }
    ]
  },
  {
    name: 'Dokument abgeben',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [
      {
        field_name: 'submission_label',
        type: 'info',
        label: 'Info: Schüler reichen hier ihre Lösung ein',
        required: false
      }
    ]
  },
  {
    name: 'Test/Quiz',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [
      {
        field_name: 'quiz_questions',
        type: 'json',
        label: 'Test-Fragen mit Antworten (JSON)',
        required: true,
        placeholder: '[{"question": "Frage 1?", "correct_answer": "A", "options": ["A", "B", "C"]}]'
      },
      {
        field_name: 'quiz_pass_percentage',
        type: 'number',
        label: 'Bestehensquote (%)',
        required: false
      }
    ]
  },
  {
    name: 'KI-Check',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [
      {
        field_name: 'ai_check_criteria',
        type: 'json',
        label: 'KI-Prüfkriterien (verknüpfte Lernziele)',
        required: false,
        placeholder: '[{"criterion": "Kriterium 1", "weight": 1.0}]'
      },
      {
        field_name: 'ai_check_prompt',
        type: 'textarea',
        label: 'KI-Bewertungs-Prompt',
        required: false
      }
    ]
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Existierende Aktivitäten löschen
    const existing = await base44.asServiceRole.entities.AktivitaetenKatalog.list();
    for (const item of existing) {
      await base44.asServiceRole.entities.AktivitaetenKatalog.delete(item.id);
    }

    // Neue Aktivitäten erstellen
    const created = [];
    for (const aktivitaet of AKTIVITAETEN) {
      const result = await base44.asServiceRole.entities.AktivitaetenKatalog.create(aktivitaet);
      created.push(result);
    }

    return Response.json({
      success: true,
      message: `${created.length} Aktivitäten erfolgreich angelegt`,
      count: created.length
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});