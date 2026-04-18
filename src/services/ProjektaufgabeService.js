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