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

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

Deno.serve(async (req) => {
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

    // Alle vorhandenen Aktivitäten abrufen
    const existingActivities = await base44.asServiceRole.entities.AktivitaetenKatalog.list();

    // Aktivitäten, die NICHT in CORE_ACTIVITIES sind, deaktivieren
    for (const existing of existingActivities) {
      const isCoreActivity = CORE_ACTIVITIES.some(
        core => core.name === existing.name && core.phase === existing.phase
      );
      if (!isCoreActivity) {
        // Statt zu löschen: auf is_active = false setzen
        try {
          await base44.asServiceRole.entities.AktivitaetenKatalog.update(existing.id, {
            is_active: false
          });
          console.info(`[resetAktivitaetenKatalog] Deactivated: ${existing.name}`);
        } catch (err) {
          console.warn(`[resetAktivitaetenKatalog] Failed to deactivate ${existing.name}: ${err.message}`);
        }
      }
    }

    // Kern-Aktivitäten einfügen oder aktualisieren
    let createdCount = 0;
    let updatedCount = 0;

    for (const coreActivity of CORE_ACTIVITIES) {
      // Überprüfe, ob Aktivität bereits existiert
      const existing = existingActivities.find(
        a => a.name === coreActivity.name && a.phase === coreActivity.phase
      );

      if (existing) {
        // Update
        try {
          await base44.asServiceRole.entities.AktivitaetenKatalog.update(existing.id, {
            is_active: coreActivity.is_active,
            supports_master: coreActivity.supports_master,
            form_schema: coreActivity.form_schema
          });
          updatedCount++;
          console.info(`[resetAktivitaetenKatalog] Updated: ${coreActivity.name}`);
        } catch (err) {
          console.error(`[resetAktivitaetenKatalog] Failed to update ${coreActivity.name}: ${err.message}`);
        }
      } else {
        // Create
        try {
          await base44.asServiceRole.entities.AktivitaetenKatalog.create(coreActivity);
          createdCount++;
          console.info(`[resetAktivitaetenKatalog] Created: ${coreActivity.name}`);
        } catch (err) {
          console.error(`[resetAktivitaetenKatalog] Failed to create ${coreActivity.name}: ${err.message}`);
        }
      }
    }

    console.info(
      `[resetAktivitaetenKatalog] Reset completed. Created: ${createdCount}, Updated: ${updatedCount}`
    );

    return Response.json({
      success: true,
      message: 'Aktivitätenkatalog zurückgesetzt',
      createdCount,
      updatedCount,
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