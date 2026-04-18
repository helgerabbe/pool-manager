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
 * Bestehende Projektaufgabe aktualisieren.
 */
export async function updateProjectTask(id, data) {
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
  const TIMEOUT_MS = 60 * 60 * 1000;
  const current = await base44.entities.AllgemeineAufgabe.filter({ id: taskId });
  const aufgabe = current[0];
  if (aufgabe?.locked_by && aufgabe.locked_by !== userEmail) {
    const age = Date.now() - new Date(aufgabe.locked_at || 0).getTime();
    if (age < TIMEOUT_MS) {
      throw new Error(`Wird gerade von ${aufgabe.locked_by} bearbeitet.`);
    }
  }
  return base44.entities.AllgemeineAufgabe.update(taskId, {
    locked_by: userEmail,
    locked_at: new Date().toISOString(),
  });
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