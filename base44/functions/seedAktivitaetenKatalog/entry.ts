import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AKTIVITAETEN = [
  // INPUT-PHASE (Erarbeitung) — supports_master: false
  {
    name: 'Lehrwerk/Quelle',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'lehrwerk',
        type: 'text',
        label: 'Lehrwerk',
        required: true,
      },
      {
        field_name: 'seite',
        type: 'text',
        label: 'Seite/Aufgabe',
        required: false,
      },
    ],
  },
  {
    name: 'Text lesen',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'text',
        type: 'textarea',
        label: 'Text eingeben',
        required: true,
      },
    ],
  },
  {
    name: 'Video / Audio',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'media_url',
        type: 'url',
        label: 'Video- oder Audio-URL',
        required: true,
        placeholder: 'https://youtube.com/watch?v=... oder https://example.com/audio.mp3',
      },
    ],
  },
  {
    name: 'Link / URL',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'url',
        type: 'url',
        label: 'Link zur Webseite',
        required: true,
        placeholder: 'https://example.com',
      },
    ],
  },

  // ÜBUNGS-PHASE (Übung) — supports_master: true
  {
    name: 'Begriffe zuordnen',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'instruction',
        type: 'textarea',
        label: 'Arbeitsanweisung',
        required: true,
      },
      {
        field_name: 'pairs',
        type: 'json',
        label: 'Begriffspaare (JSON)',
        required: true,
        placeholder: '[{"left": "Begriff A", "right": "Definition A"}, ...]',
      },
      {
        field_name: 'distractors',
        type: 'json',
        label: 'Distraktoren (optional, JSON-Array)',
        required: false,
        placeholder: '["Ablenkung 1", "Ablenkung 2", ...]',
      },
    ],
  },
  {
    name: 'Multiple Choice',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'fragen_json',
        type: 'json',
        label: 'Fragen mit Optionen',
        required: true,
        placeholder:
          '[{"frage": "Frage?", "optionen": ["A", "B", "C"], "loesung": "A"}, ...]',
      },
    ],
  },
  {
    name: 'Kurzantwort',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'fragen_json',
        type: 'json',
        label: 'Fragen & Antworten',
        required: true,
        placeholder: '[{"frage": "Was ist...?", "antwort": "..."}, ...]',
      },
    ],
  },
  {
    name: 'Lückentext',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'lueckentext',
        type: 'textarea',
        label: 'Text mit Lücken (nutze ___ für Lücken)',
        required: true,
      },
    ],
  },
  {
    name: 'Reihenfolge / Sortierung',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'items_json',
        type: 'json',
        label: 'Elemente in korrekter Reihenfolge',
        required: true,
        placeholder: '["Element 1", "Element 2", "Element 3", ...]',
      },
    ],
  },
  {
    name: 'Bildbeschriftung',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'bild_url',
        type: 'url',
        label: 'Bild-URL',
        required: true,
      },
      {
        field_name: 'beschriftungen_json',
        type: 'json',
        label: 'Beschriftungsaufgaben',
        required: true,
        placeholder: '[{"bereich": "Bereich 1", "beschriftung": "Label"}, ...]',
      },
    ],
  },
  {
    name: 'KI-Tutor Aufgabe',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'aufgabenstellung',
        type: 'textarea',
        label: 'Aufgabenstellung',
        required: true,
      },
      {
        field_name: 'lernziele',
        type: 'text',
        label: 'Zu überprüfende Lernziele',
        required: false,
      },
    ],
  },

  // ABSCHLUSS-PHASE — gemischte supports_master-Werte
  // Ohne Master (supports_master: false)
  {
    name: 'Bearbeitung bestätigen',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'nachricht',
        type: 'text',
        label: 'Bestätigungs-Nachricht',
        required: false,
        placeholder: 'Optional: Feedback oder Gratulation',
      },
    ],
  },
  {
    name: 'Dokument abgeben',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [],
  },
  {
    name: 'KI-Check',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'lernziele_select',
        type: 'text',
        label: 'Zu überprüfende Lernziele (Beschreibung)',
        required: true,
      },
    ],
  },
  // Mit Master (supports_master: true)
  {
    name: 'Quiz',
    phase: 'Abschluss',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'quiz_json',
        type: 'json',
        label: 'Fragen & Antwortoptionen',
        required: true,
        placeholder:
          '[{"frage": "Was ist 2+2?", "optionen": ["3", "4", "5"], "loesung": "4"}, ...]',
      },
    ],
  },
  {
    name: 'Test',
    phase: 'Abschluss',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'test_json',
        type: 'json',
        label: 'Aufgaben & Lösungen',
        required: true,
        placeholder:
          '[{"aufgabe": "Frage?", "loesung": "Antwort"}, ...]',
      },
    ],
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Nur Admins dürfen seeden
    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Leere die bestehende Tabelle
    const existierende = await base44.asServiceRole.entities.AktivitaetenKatalog.list();
    for (const akt of existierende) {
      await base44.asServiceRole.entities.AktivitaetenKatalog.delete(akt.id);
    }

    // Füge die neuen Aktivitäten ein
    const erstellte = [];
    for (const aktivitaet of AKTIVITAETEN) {
      const result = await base44.asServiceRole.entities.AktivitaetenKatalog.create(
        aktivitaet
      );
      erstellte.push(result);
    }

    return Response.json({
      success: true,
      message: `${erstellte.length} Aktivitäten erfolgreich seeded`,
      count: erstellte.length,
      aktivitaeten: erstellte,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});