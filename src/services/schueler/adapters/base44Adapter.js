/**
 * base44Adapter.js — Base44-Implementierung des Schüler-Service-Layers.
 *
 * Kapselt ALLE Datenzugriffe des Schülerbereichs 1:1 so, wie sie heute
 * direkt in den Komponenten standen. Verhalten ist absichtlich identisch
 * (gleiche Filter, gleiche Sortierungen, gleiche Rückgabeformen).
 *
 * Der Supabase-Adapter (Phase 2) implementiert exakt dieselbe Schnittstelle.
 */

import { base44 } from '@/api/base44Client';
import {
  getAktivitaetenKatalog as svcKatalog,
  getAktivitaetenByLernpaket as svcAktivitaeten,
} from '@/services/AktivitaetService';
import { getCurrentUser as svcCurrentUser } from '@/services/AuthService';

// ── Auth ────────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  return svcCurrentUser();
}

// ── Inhalte (read-only) ─────────────────────────────────────────────────────

export async function getEinheit(einheitId) {
  return base44.entities.Einheiten.get(einheitId);
}

export async function listEinheiten() {
  return base44.entities.Einheiten.list();
}

export async function listSystemBausteine() {
  return base44.entities.SystemBausteine.list('reihenfolge');
}

export async function listAufgabenByEinheit(einheitId) {
  return base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId });
}

export async function listLernpaketeByEinheit(einheitId) {
  return base44.entities.Lernpakete.filter({ einheit_id: einheitId });
}

export async function getAktivitaetenKatalog() {
  return svcKatalog();
}

export async function getAktivitaetenByLernpaket(lernpaketId) {
  return svcAktivitaeten(lernpaketId);
}

export async function listThemenfelderByEinheit(einheitId) {
  return base44.entities.Themenfeld.filter({ einheit_id: einheitId });
}

export async function listLernzieleByLernpaket(lernpaketId) {
  return base44.entities.Lernziele.filter({ lernpaket_id: lernpaketId });
}

export async function listFaecher() {
  return base44.entities.LookupFaecher.list('reihenfolge');
}

export async function listPhasen() {
  return base44.entities.LookupPhasen.list();
}

export async function listInhaltSnapshots(filter) {
  return base44.entities.SchuelerInhaltSnapshot.filter(filter);
}

// ── Schülerdaten: Einheit-Fortschritt ───────────────────────────────────────

export async function listEinheitFortschritt(userEmail, einheitId) {
  const filter = { user_email: userEmail };
  if (einheitId) filter.einheit_id = einheitId;
  return base44.entities.SchuelerEinheitFortschritt.filter(filter);
}

export async function createEinheitFortschritt(data) {
  return base44.entities.SchuelerEinheitFortschritt.create(data);
}

export async function updateEinheitFortschritt(id, data) {
  return base44.entities.SchuelerEinheitFortschritt.update(id, data);
}

// ── Schülerdaten: Aktivitäts-Fortschritt ────────────────────────────────────

export async function listAktivitaetFortschritt(userEmail, einheitId, lerntyp) {
  return base44.entities.SchuelerAktivitaetFortschritt.filter({
    user_email: userEmail,
    einheit_id: einheitId,
    lerntyp,
  });
}

export async function createAktivitaetFortschritt(data) {
  return base44.entities.SchuelerAktivitaetFortschritt.create(data);
}

export async function updateAktivitaetFortschritt(id, data) {
  return base44.entities.SchuelerAktivitaetFortschritt.update(id, data);
}

// ── Schülerdaten: Lernziel-Einschätzungen (Lernlandkarte) ───────────────────

export async function listLernzielEinschaetzungen(userEmail, einheitId) {
  return base44.entities.SchuelerLernzielEinschaetzung.filter({
    user_email: userEmail,
    einheit_id: einheitId,
  });
}

export async function createLernzielEinschaetzung(data) {
  return base44.entities.SchuelerLernzielEinschaetzung.create(data);
}

export async function updateLernzielEinschaetzung(id, data) {
  return base44.entities.SchuelerLernzielEinschaetzung.update(id, data);
}

export async function deleteLernzielEinschaetzung(id) {
  return base44.entities.SchuelerLernzielEinschaetzung.delete(id);
}

// ── Schülerdaten: Zeit-Logs ─────────────────────────────────────────────────

export async function listZeitLogs(filter) {
  return base44.entities.SchuelerEinheitZeitLog.filter(filter);
}

export async function createZeitLog(data) {
  return base44.entities.SchuelerEinheitZeitLog.create(data);
}

export async function updateZeitLog(id, data) {
  return base44.entities.SchuelerEinheitZeitLog.update(id, data);
}

// ── Schülerdaten: Merkheft-Notizen ──────────────────────────────────────────

export async function listNotizen(filter, sort) {
  return base44.entities.SchuelerEinheitNotiz.filter(filter, sort);
}

export async function createNotiz(data) {
  return base44.entities.SchuelerEinheitNotiz.create(data);
}

export async function deleteNotiz(id) {
  return base44.entities.SchuelerEinheitNotiz.delete(id);
}

// ── Schülerdaten: Lerntagebuch ──────────────────────────────────────────────

export async function listLerntagebuch(filter, sort, limit) {
  return base44.entities.SchuelerLerntagebuchEintrag.filter(filter, sort, limit);
}

export async function createLerntagebuchEintrag(data) {
  return base44.entities.SchuelerLerntagebuchEintrag.create(data);
}

export async function bulkCreateLerntagebuch(eintraege) {
  return base44.entities.SchuelerLerntagebuchEintrag.bulkCreate(eintraege);
}

export async function deleteLerntagebuchEintrag(id) {
  return base44.entities.SchuelerLerntagebuchEintrag.delete(id);
}

// ── Funktionen / KI (Sonderfälle, Base44-spezifisch) ────────────────────────
// Im Supabase-Modus sind diese nicht verfügbar (Snapshot-only-Strategie).
// Der Supabase-Adapter liefert hier definierte Fallbacks.

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