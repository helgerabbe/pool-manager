/**
 * validateExportLock.js
 *
 * Zentrale Guard-Funktion für Moodle-Export-Lock-Validierung.
 * Blockiert alle Schreib-Operationen (update/delete) während eines laufenden Exports.
 *
 * KRITISCH: Diese Funktion MUSS vor jeder Änderung an:
 * - LernpaketPhaseAktivitaet
 * - MasterAufgabe
 * - Aufgabenbausteine (Klone)
 * aufgerufen werden.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Validiert, ob ein Lernpaket oder seine übergeordnete Einheit zur Moodle-Synchronisation gesperrt ist.
 *
 * @param {string} lernpaketId - Die ID des Lernpakets
 * @param {Object} base44 - Die Base44-SDK-Instanz
 * @returns {Promise<void>} - Wirft einen Error, wenn Export läuft
 * @throws {Error} HTTP 423 Locked wenn export_locked === true oder moodle_sync_status === 'locked'
 */
export async function validateExportLock(lernpaketId, base44) {
  if (!lernpaketId || !base44) {
    throw new Error('validateExportLock: lernpaketId und base44 sind erforderlich');
  }

  // Lernpaket aus DB laden
  const lernpakete = await base44.entities.Lernpakete.filter({ id: lernpaketId });
  if (!lernpakete || lernpakete.length === 0) {
    throw new Error(`validateExportLock: Lernpaket ${lernpaketId} nicht gefunden`);
  }

  const lernpaket = lernpakete[0];

  // HARTE WEICHE: Export-Lock-Status prüfen
  // Zwei Bedingungen reichen aus, um zu blockieren:
  // 1. export_locked === true (explizit für Moodle-Synchronisation gesperrt)
  // 2. moodle_sync_status === 'locked' (im Sync-Prozess)
  if (lernpaket.export_locked === true || lernpaket.moodle_sync_status === 'locked') {
    throw {
      status: 423,
      code: 'EXPORT_LOCKED',
      message: 'Einheit ist zur Moodle-Synchronisation gesperrt. Bitte versuchen Sie es später erneut.',
      details: {
        lernpaketId,
        export_locked: lernpaket.export_locked,
        moodle_sync_status: lernpaket.moodle_sync_status,
      },
    };
  }
}

/**
 * Helper: Resolve-Funktion – von Activity-ID oder Task-ID zum Lernpaket-ID
 * Falls nur eine Activity/Task-ID bekannt ist, ermittelt diese Funktion das übergeordnete Lernpaket.
 *
 * @param {string} entityId - Die ID der Entity (Activity, Task, etc.)
 * @param {string} entityType - Der Typ ('activity', 'task', 'klon')
 * @param {Object} base44 - Die Base44-SDK-Instanz
 * @returns {Promise<string>} - Die ID des übergeordneten Lernpakets
 */
export async function resolveLernpaketId(entityId, entityType, base44) {
  if (entityType === 'activity') {
    const activities = await base44.entities.LernpaketPhaseAktivitaet.filter({ id: entityId });
    if (activities && activities.length > 0) {
      return activities[0].lernpaket_id;
    }
  } else if (entityType === 'task' || entityType === 'master') {
    const tasks = await base44.entities.MasterAufgabe.filter({ id: entityId });
    if (tasks && tasks.length > 0) {
      return tasks[0].lernpaket_id;
    }
  } else if (entityType === 'klon') {
    const klone = await base44.entities.Aufgabenbausteine.filter({ id: entityId });
    if (klone && klone.length > 0) {
      return klone[0].lernpaket_id;
    }
  }
  throw new Error(`resolveLernpaketId: Konnte Lernpaket-ID nicht ermitteln für ${entityType}:${entityId}`);
}

/**
 * Combined Guard: Validiert Export-Lock und gibt aussagekräftige Error-Response für HTTP-Handler
 *
 * @param {string} lernpaketId - Die ID des Lernpakets
 * @param {Object} base44 - Die Base44-SDK-Instanz
 * @returns {Promise<Response | void>} - Gibt HTTP 423 Response bei Lock, sonst void (OK)
 */
export async function validateExportLockOrRespond(lernpaketId, base44) {
  try {
    await validateExportLock(lernpaketId, base44);
  } catch (err) {
    // Wenn Error ein strukturiertes Lock-Error-Objekt ist, als HTTP-Response zurückgeben
    if (err.status === 423) {
      return Response.json(
        {
          error: err.message,
          code: err.code,
          details: err.details,
        },
        { status: 423, headers: { 'Retry-After': '5' } }
      );
    }
    // Andere Errors durchwerfen
    throw err;
  }
}