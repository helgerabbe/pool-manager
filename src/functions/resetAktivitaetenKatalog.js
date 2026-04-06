/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CORE_ACTIVITIES = [
  // ── Phase 1: Input ──
  {
    name: 'Lehrwerkquelle',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: 'quelle', type: 'text', label: 'Buch/Quelle', required: true },
      { field_name: 'seiten', type: 'text', label: 'Seiten', required: false },
    ],
  },
  {
    name: 'Link / URL',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: 'url', type: 'url', label: 'URL', required: true },
      { field_name: 'beschreibung', type: 'textarea', label: 'Beschreibung', required: false },
    ],
  },
  {
    name: 'Textlesen',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: 'text', type: 'textarea', label: 'Lesetext', required: true },
    ],
  },
  {
    name: 'Video-Audio',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: 'media_url', type: 'url', label: 'Video/Audio URL', required: true },
      { field_name: 'dauer_minuten', type: 'number', label: 'Dauer (min)', required: false },
    ],
  },

  // ── Phase 2: Übung ──
  {
    name: 'Begriffe zuordnen',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [],
  },
  {
    name: 'Bildbeschriftung',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [],
  },
  {
    name: 'KI Tutoraufgabe',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [],
  },
  {
    name: 'Lückentext',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [],
  },
  {
    name: 'Miniquiz',
    phase: 'Übung',
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: 'fragen', type: 'json', label: 'Quiz-Fragen', required: true },
    ],
  },
  {
    name: 'Multiple Choice',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [],
  },
  {
    name: 'Reihenfolge/Sortierung',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [],
  },

  // ── Phase 3: Abschluss ──
  {
    name: 'Test',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: 'beschreibung', type: 'textarea', label: 'Testaufgabe', required: true },
    ],
  },
  {
    name: 'KI Check',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: 'frage', type: 'textarea', label: 'Überprüfungsfrage', required: true },
    ],
  },
  {
    name: 'Bearbeitung bestätigen',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [
      { field_name: 'anweisung', type: 'textarea', label: 'Bestätigungsanweisung', required: true },
    ],
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Lösche alle bestehenden Aktivitäten
    const existing = await base44.entities.AktivitaetenKatalog.list();
    for (const item of existing) {
      await base44.entities.AktivitaetenKatalog.delete(item.id);
    }

    // Erstelle nur die Core-Aktivitäten
    const created = [];
    for (const activity of CORE_ACTIVITIES) {
      const result = await base44.entities.AktivitaetenKatalog.create(activity);
      created.push(result);
    }

    return Response.json({
      success: true,
      createdCount: created.length,
      message: `Katalog zurückgesetzt: ${created.length} Kern-Aktivitäten geladen`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});