/**
 * ProjektaufgabeService.js
 *
 * Service-Layer für Anwendungs- und Projektaufgaben (Ebene 3).
 * Alle Datenbankoperationen laufen ausschließlich über diesen Service –
 * keine direkten base44-Aufrufe in UI-Komponenten.
 */

import { base44 } from '@/api/base44Client';
import { invokeFunction } from '@/utils/functionsHelper';

/**
 * Neue Projektaufgabe anlegen.
 */
export async function createProjectTask(einheitId, data) {
  return base44.entities.AllgemeineAufgabe.create({
    einheit_id: einheitId,
    anforderungsebene: '3 - Projekt',
    ...data,
  });
}

/**
 * Bestehende Projektaufgabe aktualisieren mit Re-Export-Trigger.
 * 
 * CRITICAL: Falls die Aufgabe bereits vollständig exportiert ist, 
 * werden beide Sync-Stati auf 'modified' zurückgesetzt.
 */
export async function updateProjectTask(id, data) {
  // Aktuelle Aufgabe laden
  const current = await base44.entities.AllgemeineAufgabe.filter({ id });
  const aufgabe = current[0];

  if (!aufgabe) {
    throw new Error(`Projektaufgabe ${id} nicht gefunden`);
  }

  // Prüfung: Ist die Aufgabe vollständig exportiert?
  const moodleSynced = aufgabe.moodle_sync_status === 'synced' || aufgabe.sync_status === 'synced';
  const brianSynced = aufgabe.brian_sync_status === 'synced';

  if ((moodleSynced || brianSynced) && Object.keys(data).length > 0) {
    // Mindestens eine ist synced → Reset beide auf 'modified'
    data.moodle_sync_status = 'modified';
    data.brian_sync_status = 'modified';
  }

  return base44.entities.AllgemeineAufgabe.update(id, data);
}

/**
 * Rubrik-Kriterien speichern.
 */
export async function saveRubric(id, criteria) {
  return base44.entities.AllgemeineAufgabe.update(id, { rubric_criteria: criteria });
}

/**
 * KI-Vorschlag für Gütekriterien generieren.
 * Sendet die gewählten output_formats und den quality_focus an die Backend-Funktion
 * und erwartet { sufficient, good, excellent } als Rückgabe.
 */
export async function generateRubricProposal(id, { output_formats = [], custom_format = '', quality_focus = '' }) {
  const response = await invokeFunction('generateRubricProposal', {
    aufgabe_id: id,
    output_formats,
    custom_format,
    quality_focus,
  });
  return response.data;
}

/**
 * Datei hochladen und URL zurückgeben.
 */
export async function uploadMaterialFile(file) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

/**
 * Alle Projektaufgaben einer Einheit laden.
 */
export async function getProjectTasksByEinheit(einheitId) {
  const all = await base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId });
  return all.filter(a => a.anforderungsebene === '3 - Projekt');
}

// ── KI-Aufgaben-Assistent ─────────────────────────────────────────────────────

/**
 * KI-Vorschlag für eine Projektaufgabe generieren.
 */
export async function generateProjectTaskIdea(idee, task_type = 'Anwendungsaufgabe / Projektaufgabe') {
  const response = await base44.functions.invoke('generateTaskProposal', { idee, task_type });
  return response.data;
}

// ── Bearbeitungssperre (Locking) ──────────────────────────────────────────────

/**
 * Sperre setzen. Schlägt fehl, wenn bereits von einem anderen Nutzer gesperrt.
 */
export async function lockProjectTask(taskId, userEmail) {
  console.log('[DEBUG-SERVICE] lockProjectTask called with taskId:', taskId, 'userEmail:', userEmail);
  const TIMEOUT_MS = 60 * 60 * 1000;
  
  try {
    const current = await base44.entities.AllgemeineAufgabe.filter({ id: taskId });
    console.log('[DEBUG-SERVICE] Filter result:', current);
    const aufgabe = current[0];
    
    if (!aufgabe) {
      throw new Error(`Aufgabe mit ID ${taskId} nicht gefunden`);
    }
    
    if (aufgabe?.locked_by && aufgabe.locked_by !== userEmail) {
      const age = Date.now() - new Date(aufgabe.locked_at || 0).getTime();
      if (age < TIMEOUT_MS) {
        throw new Error(`Wird gerade von ${aufgabe.locked_by} bearbeitet.`);
      }
    }
    
    // CRITICAL: Nur Lock-Felder updaten + rubric_criteria normalisieren
    // Das verhindert Validierungsfehler bei kaputten Feldern wie rubric_criteria
    const lockData = {
      locked_by: userEmail,
      locked_at: new Date().toISOString(),
    };
    
    // Fallback: rubric_criteria normalisieren falls es ein Objekt ist
    if (aufgabe.rubric_criteria && !Array.isArray(aufgabe.rubric_criteria)) {
      lockData.rubric_criteria = [];
      console.log('[DEBUG-SERVICE] Fixed rubric_criteria from object to array');
    }
    
    console.log('[DEBUG-SERVICE] Updating AllgemeineAufgabe with lock:', lockData);
    const result = await base44.entities.AllgemeineAufgabe.update(taskId, lockData);
    console.log('[DEBUG-SERVICE] Update success:', result);
    return result;
  } catch (err) {
    console.error('[DEBUG-SERVICE] lockProjectTask ERROR:', err.message);
    throw err;
  }
}

/**
 * Sperre aufheben.
 */
export async function unlockProjectTask(taskId) {
  return base44.entities.AllgemeineAufgabe.update(taskId, {
    locked_by: null,
    locked_at: null,
  });
}