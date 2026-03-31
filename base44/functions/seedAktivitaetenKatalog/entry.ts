import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AKTIVITAETEN = [
  // INPUT-PHASE (Erarbeitung)
  {
    name: 'Text lesen',
    phase: 'Input',
    is_active: true,
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
    name: 'Dokument (PDF/Bild)',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'file',
        type: 'file',
        label: 'Datei-Upload',
        required: true,
      },
    ],
  },
  {
    name: 'Bild anschauen',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'image',
        type: 'image',
        label: 'Bild-Upload',
        required: true,
      },
    ],
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
        required: true,
        placeholder: 'https://youtube.com/watch?v=...',
      },
    ],
  },
  {
    name: 'Audio hören',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'audio',
        type: 'audio',
        label: 'Audio-Datei-Upload',
        required: true,
      },
    ],
  },
  {
    name: 'Webseite besuchen',
    phase: 'Input',
    is_active: true,
    form_schema: [
      {
        field_name: 'web_url',
        type: 'url',
        label: 'URL zur Webseite',
        required: true,
        placeholder: 'https://example.com',
      },
    ],
  },
  {
    name: 'Lehrwerk/Quelle',
    phase: 'Input',
    is_active: true,
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

  // ÜBUNGS-PHASE (Übung)
  {
    name: 'Frage(n) beantworten',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'fragen_json',
        type: 'json',
        label: 'Fragen & Antworten',
        required: true,
        placeholder:
          '[{"frage": "Was ist 2+2?", "antwort": "4"}, {"frage": "Was ist die Hauptstadt Deutschlands?", "antwort": "Berlin"}]',
      },
    ],
  },
  {
    name: 'Paare finden',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'paare_json',
        type: 'json',
        label: 'Paare (Links/Rechts)',
        required: true,
        placeholder:
          '[{"links": "Apfel", "rechts": "Obst"}, {"links": "Karotte", "rechts": "Gemüse"}]',
      },
    ],
  },
  {
    name: 'Begriffe zuordnen',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'kategorien_json',
        type: 'json',
        label: 'Kategorien & Begriffe',
        required: true,
        placeholder:
          '{"Obst": ["Apfel", "Banane"], "Gemüse": ["Karotte", "Brokkoli"]}',
      },
    ],
  },
  {
    name: 'Lückentext ausfüllen',
    phase: 'Übung',
    is_active: true,
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
    name: 'Text schreiben',
    phase: 'Übung',
    is_active: true,
    form_schema: [
      {
        field_name: 'konfiguration',
        type: 'text',
        label: 'Länge/Umfang (z.B. "5-10 Sätze")',
        required: false,
      },
    ],
  },
  {
    name: 'Aufgabe im Lehrwerk',
    phase: 'Übung',
    is_active: true,
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
        label: 'Seite',
        required: false,
      },
      {
        field_name: 'nummer',
        type: 'text',
        label: 'Aufgabennummer',
        required: false,
      },
    ],
  },

  // ABSCHLUSS-PHASE
  {
    name: 'Bearbeitung bestätigen',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [
      {
        field_name: 'nachricht',
        type: 'text',
        label: 'Bestätigungs-Nachricht',
        required: false,
        placeholder: 'Geben Sie hier eine optionale Nachricht ein',
      },
    ],
  },
  {
    name: 'Dokument abgeben',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [],
  },
  {
    name: 'Test',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [
      {
        field_name: 'test_json',
        type: 'json',
        label: 'Aufgaben & Antworten',
        required: true,
        placeholder:
          '[{"aufgabe": "Was ist Photosynthese?", "loesung": "Prozess der Energiegewinnung durch Licht"}]',
      },
    ],
  },
  {
    name: 'Quiz',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [
      {
        field_name: 'quiz_json',
        type: 'json',
        label: 'Fragen & Antwortoptionen',
        required: true,
        placeholder:
          '[{"frage": "Was ist 2+2?", "optionen": ["3", "4", "5"], "loesung": "4"}]',
      },
    ],
  },
  {
    name: 'KI-Check',
    phase: 'Abschluss',
    is_active: true,
    form_schema: [
      {
        field_name: 'lernziele_select',
        type: 'text',
        label: 'Zu überprüfende Lernziele (Beschreibung)',
        required: true,
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