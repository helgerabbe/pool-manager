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

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Rate-Limiter für Factory Resets
const resetLog = new Map();

function isResetRateLimited(userEmail, maxPerMinute = 1) {
  const key = `reset_${userEmail}`;
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  if (!resetLog.has(key)) {
    resetLog.set(key, []);
  }

  const timestamps = resetLog.get(key);
  const recentResets = timestamps.filter(ts => ts > oneMinuteAgo);
  resetLog.set(key, recentResets);

  if (recentResets.length >= maxPerMinute) {
    return true;
  }

  recentResets.push(now);
  resetLog.set(key, recentResets);
  return false;
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

    // 3. Rate-Limiting prüfen
    if (isResetRateLimited(user.email, 1)) {
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
    const { confirmReset } = await req.json();
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

      // 1. EinheitMembers (FK zu Einheiten)
      const members = await base44.asServiceRole.entities.EinheitMembers.list();
      for (const member of members) {
        await base44.asServiceRole.entities.EinheitMembers.delete(member.id);
        deleteCounts.einheitMembers++;
      }

      // 2. Lernziele (FK zu Lernpakete)
      const lernziele = await base44.asServiceRole.entities.Lernziele.list();
      for (const ziel of lernziele) {
        await base44.asServiceRole.entities.Lernziele.delete(ziel.id);
        deleteCounts.lernziele++;
      }

      // 3. Aufgabenbausteine (FK zu Lernpakete)
      const aufgaben = await base44.asServiceRole.entities.Aufgabenbausteine.list();
      for (const auf of aufgaben) {
        await base44.asServiceRole.entities.Aufgabenbausteine.delete(auf.id);
        deleteCounts.aufgabenbausteine++;
      }

      // 4. MasterAufgabe (FK zu LernpaketPhaseAktivitaet)
      const masters = await base44.asServiceRole.entities.MasterAufgabe.list();
      for (const master of masters) {
        await base44.asServiceRole.entities.MasterAufgabe.delete(master.id);
        deleteCounts.masterAufgaben++;
      }

      // 5. LernpaketPhaseAktivitaet (FK zu Lernpakete)
      const aktivitaeten = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list();
      for (const akt of aktivitaeten) {
        await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.delete(akt.id);
        deleteCounts.lernpaketPhaseAktivitaet++;
      }

      // 6. Lernpakete (FK zu Einheiten)
      const lernpakete = await base44.asServiceRole.entities.Lernpakete.list();
      for (const lp of lernpakete) {
        await base44.asServiceRole.entities.Lernpakete.delete(lp.id);
        deleteCounts.lernpakete++;
      }

      // 7. Themenfeld (FK zu Einheiten)
      const themenfeldData = await base44.asServiceRole.entities.Themenfeld.list();
      for (const tf of themenfeldData) {
        await base44.asServiceRole.entities.Themenfeld.delete(tf.id);
        deleteCounts.themenfeldData++;
      }

      // 8. Einheiten (Root Entity)
      const einheiten = await base44.asServiceRole.entities.Einheiten.list();
      for (const einheit of einheiten) {
        await base44.asServiceRole.entities.Einheiten.delete(einheit.id);
        deleteCounts.einheiten++;
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