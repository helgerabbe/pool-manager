import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AKTIVITAETEN_DATEN = [
  // --- PHASE: INPUT ---
  {
    name: "Lehrwerk/Quelle",
    phase: "Input",
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: "lehrwerk", label: "Lehrwerk", type: "text", required: true },
      { field_name: "seite", label: "Seite", type: "text", required: false },
      { field_name: "nummer", label: "Aufgabennummer", type: "text", required: false }
    ]
  },
  {
    name: "Text lesen",
    phase: "Input",
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: "titel", label: "Titel des Textes", type: "text", required: true },
      { field_name: "inhalt", label: "Textinhalt", type: "textarea", required: true }
    ]
  },
  {
    name: "Video / Audio",
    phase: "Input",
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: "url", label: "Link/URL", type: "url", required: true },
      { field_name: "beschreibung", label: "Kurzbeschreibung", type: "textarea", required: false }
    ]
  },
  {
    name: "Link / URL",
    phase: "Input",
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: "url", label: "Webadresse", type: "url", required: true },
      { field_name: "titel", label: "Titel der Webseite", type: "text", required: true }
    ]
  },

  // --- PHASE: ÜBUNG ---
  {
    name: "Begriffe zuordnen",
    phase: "Übung",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "instruction", label: "Arbeitsanweisung", type: "text", required: true },
      { field_name: "match_data", label: "Zuordnungs-Daten", type: "json", required: true }
    ]
  },
  {
    name: "Multiple Choice",
    phase: "Übung",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "instruction", label: "Fragestellung", type: "text", required: true },
      { field_name: "mc_data", label: "Antwort-Optionen", type: "json", required: true }
    ]
  },
  {
    name: "Kurzantwort",
    phase: "Übung",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "instruction", label: "Fragestellung", type: "text", required: true },
      { field_name: "answer_data", label: "Erwartete Antworten", type: "json", required: true }
    ]
  },
  {
    name: "Lückentext",
    phase: "Übung",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "instruction", label: "Arbeitsanweisung", type: "text", required: true },
      { field_name: "lueckentext_data", label: "Text & Lücken", type: "json", required: true }
    ]
  },
  {
    name: "Reihenfolge / Sortierung",
    phase: "Übung",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "instruction", label: "Arbeitsanweisung", type: "text", required: true },
      { field_name: "sort_data", label: "Sortier-Elemente", type: "json", required: true }
    ]
  },
  {
    name: "Bildbeschriftung",
    phase: "Übung",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "instruction", label: "Arbeitsanweisung", type: "text", required: true },
      { field_name: "image_url", label: "Hintergrundbild URL", type: "url", required: true },
      { field_name: "marker_data", label: "Marker & Begriffe", type: "json", required: true }
    ]
  },
  {
    name: "KI-Tutor Aufgabe",
    phase: "Übung",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "instruction", label: "Aufgabenstellung für Schüler", type: "textarea", required: true },
      { field_name: "system_prompt", label: "Erwartungshorizont für KI", type: "textarea", required: true }
    ]
  },

  // --- PHASE: ABSCHLUSS ---
  {
    name: "Bearbeitung bestätigen",
    phase: "Abschluss",
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: "hinweis", label: "Hinweistext", type: "text", required: true }
    ]
  },
  {
    name: "Dokument abgeben",
    phase: "Abschluss",
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: "instruction", label: "Arbeitsanweisung", type: "textarea", required: true },
      { field_name: "formate", label: "Zulässige Dateiformate (z.B. pdf, docx)", type: "text", required: false }
    ]
  },
  {
    name: "KI-Check",
    phase: "Abschluss",
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: "instruction", label: "Anweisung", type: "text", required: true },
      { field_name: "kriterien", label: "Prüfkriterien", type: "textarea", required: true }
    ]
  },
  {
    name: "Quiz",
    phase: "Abschluss",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "titel", label: "Quiz-Titel", type: "text", required: true },
      { field_name: "quiz_data", label: "Quiz-Inhalte", type: "json", required: true }
    ]
  },
  {
    name: "Test",
    phase: "Abschluss",
    is_active: true,
    supports_master: true,
    form_schema: [
      { field_name: "titel", label: "Test-Titel", type: "text", required: true },
      { field_name: "test_data", label: "Test-Inhalte", type: "json", required: true }
    ]
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-Check
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // 1. Alle bestehenden Einträge löschen
    const bestaende = await base44.entities.AktivitaetenKatalog.list();
    let deletedCount = 0;
    for (const eintrag of bestaende) {
      await base44.entities.AktivitaetenKatalog.delete(eintrag.id);
      deletedCount++;
    }

    // 2. Neue Aktivitäten einfügen
    const createdIds = [];
    for (const aktivitaet of AKTIVITAETEN_DATEN) {
      const created = await base44.entities.AktivitaetenKatalog.create(aktivitaet);
      createdIds.push(created.id);
    }

    return Response.json({
      success: true,
      message: `Katalog zurückgesetzt: ${deletedCount} alte Einträge gelöscht, ${createdIds.length} neue Aktivitäten eingefügt.`,
      deletedCount,
      createdCount: createdIds.length,
      createdIds,
    });
  } catch (error) {
    console.error('Reset Fehler:', error);
    return Response.json(
      { error: error.message || 'Unerwarteter Fehler beim Reset' },
      { status: 500 }
    );
  }
});