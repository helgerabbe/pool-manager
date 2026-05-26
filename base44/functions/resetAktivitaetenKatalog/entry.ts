/**
 * resetAktivitaetenKatalog.js
 *
 * Setzt den Aktivitätenkatalog auf die definierten Kernaktivitäten zurück.
 * Entfernt alle obsoleten Aktivitäten und lädt nur die zugelassenen Aktivitäten.
 *
 * Kernaktivitäten nach Phase:
 * - Input: Lehrwerkquelle, Link / URL, Textlesen, Video-Audio
 * - Übung: Begriffe zuordnen, Bildbeschriftung, KI Tutoraufgabe, Lückentext, Miniquiz, Multiple Choice, Offene Aufgabe, Reihenfolge/Sortierung
 * - Abschluss: Test, KI Check, Bearbeitung bestätigen
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Definiere die Kernaktivitäten mit korrekten Feldern
const CORE_ACTIVITIES = [
  // === INPUT PHASE ===
  {
    name: 'Lehrwerkquelle',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'quelle',
        type: 'text',
        label: 'Buchverweis / Quelle',
        required: true,
        placeholder: 'z.B. Schulbuch S. 42-45'
      }
    ]
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
        label: 'URL',
        required: true,
        placeholder: 'https://...'
      },
      {
        field_name: 'beschreibung',
        type: 'text',
        label: 'Beschreibung (optional)',
        placeholder: 'Kurze Beschreibung der Ressource'
      }
    ]
  },
  {
    name: 'Textlesen',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'text',
        type: 'textarea',
        label: 'Text',
        required: true,
        placeholder: 'Geben Sie den Lesetext ein...'
      }
    ]
  },
  {
    name: 'Video-Audio',
    phase: 'Input',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'url',
        type: 'url',
        label: 'Video/Audio-URL',
        required: true,
        placeholder: 'https://youtube.com/... oder Audio-Link'
      },
      {
        field_name: 'medium',
        type: 'select',
        label: 'Medientyp',
        required: true,
        options: [
          { label: 'Video', value: 'video' },
          { label: 'Audio', value: 'audio' }
        ]
      }
    ]
  },

  // === ÜBUNG PHASE ===
  {
    name: 'Begriffe zuordnen',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'instruction',
        type: 'text',
        label: 'Aufgabenstellung',
        required: true,
        placeholder: 'z.B. Ordnen Sie die Begriffe den Definitionen zu'
      },
      {
        field_name: 'pairs',
        type: 'json',
        label: 'Zuordnungspaare',
        required: true
      },
      {
        field_name: 'distractors',
        type: 'json',
        label: 'Distraktoren (falsche Antworten)',
        required: false
      }
    ]
  },
  {
    name: 'Bildbeschriftung',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'instruction',
        type: 'text',
        label: 'Aufgabenstellung',
        required: true,
        placeholder: 'z.B. Beschriften Sie die Teile des Bildes'
      },
      {
        field_name: 'image',
        type: 'image',
        label: 'Bild hochladen',
        required: true
      },
      {
        field_name: 'labels',
        type: 'json',
        label: 'Beschriftungen und Positionen',
        required: true
      }
    ]
  },
  {
    name: 'KI Tutoraufgabe',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'aufgabentext',
        type: 'textarea',
        label: 'Aufgabentext',
        required: true,
        placeholder: 'Beschreiben Sie die Aufgabe für die KI'
      },
      {
        field_name: 'material',
        type: 'textarea',
        label: 'Material/Quelle (optional)',
        required: false,
        placeholder: 'Zusätzliches Material für die KI'
      },
      {
        field_name: 'erwartung',
        type: 'textarea',
        label: 'Erwartungshorizont für KI',
        required: false,
        placeholder: 'Vorgaben für die KI-Bewertung'
      }
    ]
  },
  {
    name: 'Lückentext',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'instruction',
        type: 'text',
        label: 'Aufgabenstellung',
        required: true,
        placeholder: 'z.B. Füllen Sie die Lücken aus'
      },
      {
        field_name: 'text',
        type: 'textarea',
        label: 'Text mit Lücken (in [Klammern])',
        required: true,
        placeholder: 'Dies ist ein [Beispiel] Text'
      }
    ]
  },
  {
    name: 'Miniquiz',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'instruction',
        type: 'text',
        label: 'Aufgabenstellung',
        required: true,
        placeholder: 'z.B. Beantworten Sie die Fragen'
      },
      {
        field_name: 'questions',
        type: 'json',
        label: 'Quiz-Fragen',
        required: true
      }
    ]
  },
  {
    name: 'Multiple Choice',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'instruction',
        type: 'text',
        label: 'Aufgabenstellung',
        required: true,
        placeholder: 'z.B. Wählen Sie die korrekten Antworten'
      },
      {
        field_name: 'mcItems',
        type: 'json',
        label: 'Multiple-Choice Fragen',
        required: true
      },
      {
        field_name: 'displayCount',
        type: 'number',
        label: 'Anzahl angezeigter Fragen (optional)',
        required: false
      }
    ]
  },
  {
    name: 'Reihenfolge/Sortierung',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'instruction',
        type: 'text',
        label: 'Aufgabenstellung',
        required: true,
        placeholder: 'z.B. Bringen Sie die Schritte in die richtige Reihenfolge'
      },
      {
        field_name: 'items',
        type: 'json',
        label: 'Zu sortierende Elemente',
        required: true
      }
    ]
  },
  {
    name: 'Offene Aufgabe',
    phase: 'Übung',
    is_active: true,
    supports_master: true,
    form_schema: [
      {
        field_name: 'description',
        type: 'textarea',
        label: 'Aufgabenbeschreibung',
        required: true,
        placeholder: 'Beschreiben Sie die Aufgabe für die Schüler:innen detailliert...'
      }
    ]
  },

  // === ABSCHLUSS PHASE ===
  {
    name: 'Test',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'instruction',
        type: 'text',
        label: 'Test-Anleitung',
        required: true,
        placeholder: 'Beschreiben Sie die Test-Aufgabe'
      },
      {
        field_name: 'testContent',
        type: 'textarea',
        label: 'Test-Inhalt',
        required: true,
        placeholder: 'Test-Fragen oder Aufgaben'
      }
    ]
  },
  {
    name: 'KI Check',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'aufgabentext',
        type: 'textarea',
        label: 'Aufgabentext für KI-Überprüfung',
        required: true,
        placeholder: 'Was soll die KI überprüfen?'
      },
      {
        field_name: 'bewertungskriterien',
        type: 'textarea',
        label: 'Bewertungskriterien',
        required: false,
        placeholder: 'Kriterien für die KI-Bewertung'
      }
    ]
  },
  {
    name: 'Bearbeitung bestätigen',
    phase: 'Abschluss',
    is_active: true,
    supports_master: false,
    form_schema: [
      {
        field_name: 'message',
        type: 'text',
        label: 'Bestätigungsmeldung',
        required: false,
        placeholder: 'z.B. "Gute Arbeit! Einheit abgeschlossen."'
      }
    ]
  }
];

const PAGE_SIZE = 500;
const WRITE_BATCH_SIZE = 25;

function activityKey(activity) {
  return `${activity.name}::${activity.phase}`;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function listAllRecords(entity, sort = 'created_date') {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.list(sort, PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

async function runInChunks(tasks) {
  const results = [];
  for (const chunk of chunkArray(tasks, WRITE_BATCH_SIZE)) {
    const settled = await Promise.allSettled(chunk.map((task) => task()));
    results.push(...settled);
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Authentifizierung prüfen
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-Rolle prüfen
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email
    });
    const profil = benutzer[0];
    const rolle = profil?.rolle || 'Betrachter';

    if (rolle !== 'Administrator') {
      return Response.json(
        { error: 'Insufficient permissions', code: 'ADMIN_ONLY' },
        { status: 403 }
      );
    }

    // Alle vorhandenen Aktivitäten vollständig paginiert abrufen
    const existingActivities = await listAllRecords(
      base44.asServiceRole.entities.AktivitaetenKatalog
    );

    const coreKeys = new Set(CORE_ACTIVITIES.map(activityKey));
    const existingByKey = new Map();
    for (const activity of existingActivities) {
      const key = activityKey(activity);
      if (!existingByKey.has(key)) existingByKey.set(key, activity);
    }

    // Aktivitäten, die NICHT in CORE_ACTIVITIES sind, deaktivieren
    const deactivateTasks = existingActivities
      .filter((existing) => !coreKeys.has(activityKey(existing)) && existing.is_active !== false)
      .map((existing) => async () => {
        await base44.asServiceRole.entities.AktivitaetenKatalog.update(existing.id, {
          is_active: false,
        });
        console.info(`[resetAktivitaetenKatalog] Deactivated: ${existing.name}`);
      });

    const deactivateResults = await runInChunks(deactivateTasks);
    const deactivatedCount = deactivateResults.filter((result) => result.status === 'fulfilled').length;
    const deactivateFailedCount = deactivateResults.filter((result) => result.status === 'rejected').length;

    // Kern-Aktivitäten einfügen oder aktualisieren
    const updateTasks = [];
    const createTasks = [];

    for (const coreActivity of CORE_ACTIVITIES) {
      const existing = existingByKey.get(activityKey(coreActivity));

      if (existing) {
        updateTasks.push(async () => {
          await base44.asServiceRole.entities.AktivitaetenKatalog.update(existing.id, {
            is_active: coreActivity.is_active,
            supports_master: coreActivity.supports_master,
            form_schema: coreActivity.form_schema,
          });
          console.info(`[resetAktivitaetenKatalog] Updated: ${coreActivity.name}`);
        });
      } else {
        createTasks.push(async () => {
          await base44.asServiceRole.entities.AktivitaetenKatalog.create(coreActivity);
          console.info(`[resetAktivitaetenKatalog] Created: ${coreActivity.name}`);
        });
      }
    }

    const updateResults = await runInChunks(updateTasks);
    const createResults = await runInChunks(createTasks);

    const updatedCount = updateResults.filter((result) => result.status === 'fulfilled').length;
    const createdCount = createResults.filter((result) => result.status === 'fulfilled').length;
    const updateFailedCount = updateResults.filter((result) => result.status === 'rejected').length;
    const createFailedCount = createResults.filter((result) => result.status === 'rejected').length;

    console.info(
      `[resetAktivitaetenKatalog] Reset completed. Created: ${createdCount}, Updated: ${updatedCount}, Deactivated: ${deactivatedCount}`
    );

    return Response.json({
      success: true,
      message: 'Aktivitätenkatalog zurückgesetzt',
      createdCount,
      updatedCount,
      deactivatedCount,
      failedCount: deactivateFailedCount + updateFailedCount + createFailedCount,
      totalCoreActivities: CORE_ACTIVITIES.length
    });
  } catch (error) {
    console.error('[resetAktivitaetenKatalog] Error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
});