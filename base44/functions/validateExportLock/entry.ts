/**
 * validateExportLock.js
 *
 * Zentrale Guard-Funktion für Moodle-Export-Lock-Validierung.
 * Blockiert alle Schreib-Operationen (update/delete) während eines laufenden Exports.
 *
 * WICHTIG: Diese Funktion ist nur eine Vorab-Prüfung für UI/Handler-Logik.
 * Schreibende Endpunkte müssen unmittelbar vor dem finalen Update weiterhin
 * per Re-Read/OCC prüfen, dass sich Export- und Sync-Status nicht geändert haben.
 *
 * Backend-Hinweis: Base44 Edge-Functions erlauben keine lokalen Imports zwischen
 * Funktionsdateien. Bei Nutzung in anderen Funktionen muss die Logik inline
 * übernommen oder über eine eigene Backend-Funktion aufgerufen werden.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Validiert, ob ein Lernpaket zur Moodle-Synchronisation gesperrt ist.
 *
 * @param {string} lernpaketId - Die ID des Lernpakets
 * @param {Object} base44 - Die Base44-SDK-Instanz
 * @returns {Promise<void>} - Wirft einen Error, wenn Export läuft
 * @throws {Object} Strukturiertes Lock-Error-Objekt mit status 423
 */
export class ExportLockError extends Error {
  constructor(details) {
    super('Einheit ist zur Moodle-Synchronisation gesperrt. Bitte versuchen Sie es später erneut.');
    this.name = 'ExportLockError';
    this.isExportLocked = true;
    this.status = 423;
    this.code = 'EXPORT_LOCKED';
    this.details = details;
  }
}

export async function validateExportLock(lernpaketId, base44) {
  if (!lernpaketId || !base44) {
    throw new Error('validateExportLock: lernpaketId und base44 sind erforderlich');
  }

  // Lernpaket gezielt per Primärschlüssel laden.
  const lernpaket = await base44.entities.Lernpakete.get(lernpaketId).catch(() => null);
  if (!lernpaket) {
    throw new Error(`validateExportLock: Lernpaket ${lernpaketId} nicht gefunden`);
  }

  // HARTE WEICHE: Export-Lock-Status prüfen
  // Blockiert bei:
  // 1. export_locked === true (explizit für Moodle-Synchronisation gesperrt)
  // 2. moodle_sync_status === 'locked' (im Sync-Prozess)
  if (lernpaket.export_locked === true || lernpaket.moodle_sync_status === 'locked') {
    throw new ExportLockError({
      lernpaketId,
      export_locked: lernpaket.export_locked,
      moodle_sync_status: lernpaket.moodle_sync_status,
    });
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
    const activity = await base44.entities.LernpaketPhaseAktivitaet.get(entityId).catch(() => null);
    if (activity) {
      return activity.lernpaket_id;
    }
  } else if (entityType === 'task' || entityType === 'master') {
    const task = await base44.entities.MasterAufgabe.get(entityId).catch(() => null);
    if (task) {
      return task.lernpaket_id;
    }
  } else if (entityType === 'klon') {
    const klon = await base44.entities.Aufgabenbausteine.get(entityId).catch(() => null);
    if (klon) {
      return klon.lernpaket_id;
    }
  }
  throw new Error(`resolveLernpaketId: Konnte Lernpaket-ID nicht ermitteln für ${entityType}:${entityId}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { lernpaketId, entityId, entityType } = payload;
    const resolvedLernpaketId = lernpaketId || (entityId && entityType
      ? await resolveLernpaketId(entityId, entityType, base44)
      : null);

    if (!resolvedLernpaketId) {
      return Response.json({ error: 'lernpaketId oder entityId/entityType erforderlich' }, { status: 400 });
    }

    await validateExportLock(resolvedLernpaketId, base44);
    return Response.json({ ok: true, locked: false });
  } catch (error) {
    if (error?.status === 423) {
      return Response.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 423, headers: { 'Retry-After': '5' } }
      );
    }
    return Response.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});