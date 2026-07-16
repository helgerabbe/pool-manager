/**
 * ltiAdapter.js — Schüler-Service-Adapter für Moodle-LTI-Sitzungen.
 *
 * Wird verwendet, wenn ein Schüler per Moodle (ohne Base44-Konto) in der App
 * ist. Implementiert exakt dieselbe Schnittstelle wie base44Adapter/
 * supabaseAdapter, leitet aber alle Zugriffe an die Backend-Funktion ltiApi
 * weiter, die das signierte Sitzungs-Token prüft und die Schüler-Identität
 * serverseitig durchsetzt.
 */

import { base44 } from '@/api/base44Client';
import { getLtiToken } from '@/lib/ltiSession';

async function call(action, params = {}) {
  const res = await base44.functions.invoke('ltiApi', { token: getLtiToken(), action, params });
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data?.result ?? null;
}

// ── Auth ──
export const getCurrentUser = () => call('getCurrentUser');

// ── Inhalte (read-only) ──
export const getEinheit = (id) => call('getEinheit', { id });
export const listEinheiten = () => call('listEinheiten');
export const listSystemBausteine = () => call('listSystemBausteine');
export const listAufgabenByEinheit = (einheitId) => call('listAufgabenByEinheit', { einheitId });
export const listLernpaketeByEinheit = (einheitId) => call('listLernpaketeByEinheit', { einheitId });
export const getAktivitaetenKatalog = () => call('getAktivitaetenKatalog');
export const getAktivitaetenByLernpaket = (lernpaketId) => call('getAktivitaetenByLernpaket', { lernpaketId });
export const listThemenfelderByEinheit = (einheitId) => call('listThemenfelderByEinheit', { einheitId });
export const listLernzieleByLernpaket = (lernpaketId) => call('listLernzieleByLernpaket', { lernpaketId });
export const listFaecher = () => call('listFaecher');
export const listPhasen = () => call('listPhasen');
export const listInhaltSnapshots = (filter) => call('listInhaltSnapshots', { filter });

// ── Schülerdaten: Einheit-Fortschritt ──
export const listEinheitFortschritt = (_userEmail, einheitId) => call('listEinheitFortschritt', { einheitId });
export const createEinheitFortschritt = (data) => call('createEinheitFortschritt', { data });
export const updateEinheitFortschritt = (id, data) => call('updateEinheitFortschritt', { id, data });

// ── Schülerdaten: Aktivitäts-Fortschritt ──
export const listAktivitaetFortschritt = (_userEmail, einheitId, lerntyp) =>
  call('listAktivitaetFortschritt', { einheitId, lerntyp });
export const createAktivitaetFortschritt = (data) => call('createAktivitaetFortschritt', { data });
export const updateAktivitaetFortschritt = (id, data) => call('updateAktivitaetFortschritt', { id, data });

// ── Schülerdaten: Lernziel-Einschätzungen ──
export const listLernzielEinschaetzungen = (_userEmail, einheitId) =>
  call('listLernzielEinschaetzungen', { einheitId });
export const createLernzielEinschaetzung = (data) => call('createLernzielEinschaetzung', { data });
export const updateLernzielEinschaetzung = (id, data) => call('updateLernzielEinschaetzung', { id, data });
export const deleteLernzielEinschaetzung = (id) => call('deleteLernzielEinschaetzung', { id });

// ── Schülerdaten: Zeit-Logs ──
export const listZeitLogs = (filter) => call('listZeitLogs', { filter });
export const createZeitLog = (data) => call('createZeitLog', { data });
export const updateZeitLog = (id, data) => call('updateZeitLog', { id, data });

// ── Schülerdaten: Merkheft-Notizen ──
export const listNotizen = (filter, sort) => call('listNotizen', { filter, sort });
export const createNotiz = (data) => call('createNotiz', { data });
export const deleteNotiz = (id) => call('deleteNotiz', { id });

// ── Schülerdaten: Lerntagebuch ──
export const listLerntagebuch = (filter, sort, limit) => call('listLerntagebuch', { filter, sort, limit });
export const createLerntagebuchEintrag = (data) => call('createLerntagebuchEintrag', { data });
export const bulkCreateLerntagebuch = (eintraege) => call('bulkCreateLerntagebuch', { eintraege });
export const deleteLerntagebuchEintrag = (id) => call('deleteLerntagebuchEintrag', { id });

// ── Funktionen / KI (Sonderfälle) ──
// Durchreichung wie im Base44-Adapter. Funktionen, die einen eingeloggten
// Base44-Nutzer verlangen, sind für Moodle-Schüler (noch) nicht verfügbar
// und liefern dann eine verständliche Fehlermeldung der jeweiligen Funktion.
export async function invokeFunction(name, payload) {
  const res = await base44.functions.invoke(name, payload);
  return res?.data ?? null;
}

export async function uploadFile(file) {
  return base44.integrations.Core.UploadFile({ file });
}

export async function transcribeAudio(audioUrl) {
  return base44.integrations.Core.TranscribeAudio({ audio_url: audioUrl });
}