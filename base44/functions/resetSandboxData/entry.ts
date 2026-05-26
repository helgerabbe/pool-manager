/**
 * resetSandboxData.js
 * 
 * Factory-Reset Funktion für die Demo-Phase.
 * Löscht alle vom Benutzer erstellten Testdaten, ohne Systemstruktur zu beeinträchtigen.
 * 
 * Geschützt durch:
 * - Admin-Only Authentifizierung
 * - Rate-Limiting (max. 1 Reset pro Minute pro Admin)
 * - Audit-Logging aller Löschvorgänge
 * 
 * Gelöschte Tabellen:
 * - Einheiten
 * - Themenfeld
 * - Lernpakete
 * - LernpaketPhaseAktivitaet
 * - MasterAufgabe
 * - Aufgabenbausteine
 * - Lernziele
 * - EinheitMembers
 * 
 * Geschützte Tabellen (NICHT gelöscht):
 * - Benutzer
 * - Systemeinstellungen
 * - LookupPhasen, LookupFaecher, LookupJahrgaenge
 * - AktivitaetenKatalog
 * - AuditLog
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;
const DELETE_BATCH_SIZE = 50;

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

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function deleteAllRecords(entity, records) {
  let deleted = 0;
  let failed = 0;

  for (const chunk of chunkArray(records, DELETE_BATCH_SIZE)) {
    const results = await Promise.allSettled(chunk.map((record) => entity.delete(record.id)));
    deleted += results.filter((result) => result.status === 'fulfilled').length;
    failed += results.filter((result) => result.status === 'rejected').length;
  }

  if (failed > 0) {
    throw new Error(`${failed} Datensätze konnten nicht gelöscht werden.`);
  }

  return deleted;
}

async function isResetRateLimited(base44, userEmail) {
  const recent = await base44.asServiceRole.entities.AuditLog.filter(
    {
      user_email: userEmail,
      resource_type: 'SYSTEM',
      resource_id: 'FACTORY_RESET',
    },
    '-created_date',
    10
  );
  const oneMinuteAgo = Date.now() - 60000;
  return (recent || []).some((entry) => new Date(entry.created_date).getTime() > oneMinuteAgo);
}

/**
 * Erstellt eine Beispiel-Einheit mit Themenfeld zur Demonstration.
 */
async function createSampleUnit(base44) {
  try {
    const sampleUnit = await base44.asServiceRole.entities.Einheiten.create({
      fach: 'Deutsch',
      titel_der_einheit: 'Beispiel-Einheit: Textanalyse',
      gesamtziel: 'Schüler lernen, literarische Texte zu analysieren.',
      jahrgangsstufe: '10',
      freigabe_status: 'Freigegeben für Bearbeitung',
      content_status: 'approved',
      sync_status: 'new'
    });

    // Erstelle ein Themenfeld
    await base44.asServiceRole.entities.Themenfeld.create({
      einheit_id: sampleUnit.id,
      titel: 'Einführung in die Textanalyse',
      beschreibung: 'Grundlagen und Methoden der literarischen Textanalyse',
      reihenfolge: 1,
      bearbeitungsmodus: 'offen',
      content_status: 'approved',
      sync_status: 'new'
    });

    console.info(`[resetSandboxData] Sample unit created: ${sampleUnit.id}`);
    return { success: true, sampleUnitId: sampleUnit.id };
  } catch (err) {
    console.error('[resetSandboxData] Error creating sample unit:', err);
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // 1. Authentifizierung prüfen
    if (!user) {
      console.warn('[resetSandboxData] Unauthorized access attempt');
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Admin-Rolle prüfen
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email
    });
    const profil = benutzer[0];
    const rolle = profil?.rolle || 'Betrachter';

    if (rolle !== 'Administrator') {
      console.warn(
        `[resetSandboxData] DENIED - ${user.email} (role: ${rolle}) ` +
        `attempted factory reset without admin privileges`
      );
      return Response.json(
        {
          error: 'Insufficient permissions',
          code: 'ADMIN_ONLY',
          details: { userRole: rolle }
        },
        { status: 403 }
      );
    }

    // 3. Rate-Limiting prüfen (persistenter AuditLog-basierter DB-Check)
    if (await isResetRateLimited(base44, user.email)) {
      console.warn(
        `[resetSandboxData] Rate limit exceeded for ${user.email}`
      );
      return Response.json(
        {
          error: 'Too many reset requests',
          code: 'RATE_LIMITED',
          message: 'Bitte warten Sie mindestens 1 Minute vor dem nächsten Reset.'
        },
        { status: 429 }
      );
    }

    // 4. Bestätigung vom Request-Body prüfen (Doppel-Sicherheit)
    const body = await req.json().catch(() => ({}));
    const { confirmReset } = body;
    if (confirmReset !== true) {
      return Response.json(
        {
          error: 'Reset not confirmed',
          code: 'CONFIRMATION_REQUIRED',
          message: 'Set confirmReset: true to proceed'
        },
        { status: 400 }
      );
    }

    console.info(
      `[resetSandboxData] Starting factory reset for admin ${user.email}`
    );

    // 5. Daten in der richtigen Reihenfolge löschen (Foreign Keys beachten)
    const deleteCounts = {
      einheitMembers: 0,
      lernziele: 0,
      aufgabenbausteine: 0,
      masterAufgaben: 0,
      lernpaketPhaseAktivitaet: 0,
      lernpakete: 0,
      themenfeldData: 0,
      einheiten: 0
    };

    try {
      // Löschen in Reihenfolge: Blätter zuerst, dann Wurzeln

      const deletePlan = [
        ['einheitMembers', base44.asServiceRole.entities.EinheitMembers],
        ['masterAufgaben', base44.asServiceRole.entities.MasterAufgabe],
        ['lernpaketPhaseAktivitaet', base44.asServiceRole.entities.LernpaketPhaseAktivitaet],
        ['lernziele', base44.asServiceRole.entities.Lernziele],
        ['aufgabenbausteine', base44.asServiceRole.entities.Aufgabenbausteine],
        ['lernpakete', base44.asServiceRole.entities.Lernpakete],
        ['themenfeldData', base44.asServiceRole.entities.Themenfeld],
        ['einheiten', base44.asServiceRole.entities.Einheiten],
      ];

      for (const [countKey, entity] of deletePlan) {
        const records = await listAllRecords(entity);
        deleteCounts[countKey] = await deleteAllRecords(entity, records);
        console.info(`[resetSandboxData] Deleted ${deleteCounts[countKey]} records from ${countKey}`);
      }

    } catch (deleteErr) {
      console.error('[resetSandboxData] Error during deletion:', deleteErr);
      
      // Audit-Log für partiellen Fehler
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'PUBLISH',
          resource_type: 'SYSTEM',
          resource_id: 'FACTORY_RESET',
          changes: {
            action: 'factory_reset',
            partialDeletion: true,
            deleteCounts: deleteCounts,
            error: deleteErr.message
          },
          affected_count: Object.values(deleteCounts).reduce((a, b) => a + b, 0),
          status: 'failed',
          error_message: deleteErr.message
        });
      } catch (auditErr) {
        console.error('[resetSandboxData] Failed to log error:', auditErr);
      }

      return Response.json(
        {
          error: 'Factory reset partially failed',
          code: 'PARTIAL_FAILURE',
          deleteCounts,
          message: deleteErr.message
        },
        { status: 500 }
      );
    }

    // 6. Beispiel-Einheit erstellen (optional)
    const sampleResult = await createSampleUnit(base44);

    // 7. Audit-Log schreiben (SUCCESS)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'PUBLISH',
        resource_type: 'SYSTEM',
        resource_id: 'FACTORY_RESET',
        changes: {
          action: 'factory_reset',
          timestamp: new Date().toISOString(),
          deleteCounts: deleteCounts,
          sampleUnitCreated: sampleResult.success ? sampleResult.sampleUnitId : null
        },
        affected_count: Object.values(deleteCounts).reduce((a, b) => a + b, 0),
        status: 'success'
      });
    } catch (auditErr) {
      console.error('[resetSandboxData] Failed to write audit log:', auditErr);
    }

    console.info(
      `[resetSandboxData] SUCCESS - ${user.email} completed factory reset. ` +
      `Deleted: ${JSON.stringify(deleteCounts)}`
    );

    return Response.json({
      success: true,
      message: 'Factory reset completed successfully',
      deleteCounts,
      sampleUnitCreated: sampleResult.success
    });

  } catch (error) {
    console.error('[resetSandboxData] Unexpected error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      { status: 500 }
    );
  }
});