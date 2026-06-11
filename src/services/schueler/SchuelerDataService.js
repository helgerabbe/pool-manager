/**
 * SchuelerDataService.js — Zentrale Daten-Fassade des Schülerbereichs.
 *
 * EINZIGER erlaubter Datenzugang für alle Schüler-Seiten, -Komponenten und
 * -Hooks. Kein direkter `base44.`-Import mehr in Schüler-Dateien!
 *
 * Die Plattform-Weiche (services/schueler/backend.js) entscheidet zur
 * Build-Zeit, welcher Adapter dahinter arbeitet:
 *   - adapters/base44Adapter.js   (Default, heutiger Betrieb)
 *   - adapters/supabaseAdapter.js (Phase 2, statischer Build gegen Supabase)
 *
 * Beide Adapter implementieren exakt dieselbe Schnittstelle.
 */

import * as base44Adapter from './adapters/base44Adapter';
import * as supabaseAdapter from './adapters/supabaseAdapter';
import { getBackendName } from './backend';

const ADAPTERS = {
  base44: base44Adapter,
  supabase: supabaseAdapter,
};

const adapter = ADAPTERS[getBackendName()] || base44Adapter;

// ── Auth ──
export const getCurrentUser = adapter.getCurrentUser;

// ── Inhalte (read-only) ──
export const getEinheit = adapter.getEinheit;
export const listEinheiten = adapter.listEinheiten;
export const listSystemBausteine = adapter.listSystemBausteine;
export const listAufgabenByEinheit = adapter.listAufgabenByEinheit;
export const listLernpaketeByEinheit = adapter.listLernpaketeByEinheit;
export const getAktivitaetenKatalog = adapter.getAktivitaetenKatalog;
export const getAktivitaetenByLernpaket = adapter.getAktivitaetenByLernpaket;
export const listThemenfelderByEinheit = adapter.listThemenfelderByEinheit;
export const listLernzieleByLernpaket = adapter.listLernzieleByLernpaket;
export const listFaecher = adapter.listFaecher;
export const listPhasen = adapter.listPhasen;
export const listInhaltSnapshots = adapter.listInhaltSnapshots;

// ── Schülerdaten: Einheit-Fortschritt ──
export const listEinheitFortschritt = adapter.listEinheitFortschritt;
export const createEinheitFortschritt = adapter.createEinheitFortschritt;
export const updateEinheitFortschritt = adapter.updateEinheitFortschritt;

// ── Schülerdaten: Aktivitäts-Fortschritt ──
export const listAktivitaetFortschritt = adapter.listAktivitaetFortschritt;
export const createAktivitaetFortschritt = adapter.createAktivitaetFortschritt;
export const updateAktivitaetFortschritt = adapter.updateAktivitaetFortschritt;

// ── Schülerdaten: Lernziel-Einschätzungen ──
export const listLernzielEinschaetzungen = adapter.listLernzielEinschaetzungen;
export const createLernzielEinschaetzung = adapter.createLernzielEinschaetzung;
export const updateLernzielEinschaetzung = adapter.updateLernzielEinschaetzung;
export const deleteLernzielEinschaetzung = adapter.deleteLernzielEinschaetzung;

// ── Schülerdaten: Zeit-Logs ──
export const listZeitLogs = adapter.listZeitLogs;
export const createZeitLog = adapter.createZeitLog;
export const updateZeitLog = adapter.updateZeitLog;

// ── Schülerdaten: Merkheft-Notizen ──
export const listNotizen = adapter.listNotizen;
export const createNotiz = adapter.createNotiz;
export const deleteNotiz = adapter.deleteNotiz;

// ── Schülerdaten: Lerntagebuch ──
export const listLerntagebuch = adapter.listLerntagebuch;
export const createLerntagebuchEintrag = adapter.createLerntagebuchEintrag;
export const bulkCreateLerntagebuch = adapter.bulkCreateLerntagebuch;
export const deleteLerntagebuchEintrag = adapter.deleteLerntagebuchEintrag;

// ── Funktionen / KI (Sonderfälle) ──
export const invokeFunction = adapter.invokeFunction;
export const uploadFile = adapter.uploadFile;
export const transcribeAudio = adapter.transcribeAudio;