/**
 * SchuelerDataService.js — Zentrale Daten-Fassade des Schülerbereichs.
 *
 * EINZIGER erlaubter Datenzugang für alle Schüler-Seiten, -Komponenten und
 * -Hooks. Kein direkter `base44.`-Import mehr in Schüler-Dateien!
 *
 * Adapter-Wahl:
 *   - supabaseAdapter : statischer Build (VITE_BACKEND=supabase, Build-Zeit)
 *   - ltiAdapter      : Moodle-Schüler OHNE Base44-Login mit gültiger
 *                       LTI-Sitzung (Laufzeit-Entscheidung pro Aufruf)
 *   - base44Adapter   : Default (eingeloggte Base44-Nutzer)
 *
 * Alle Adapter implementieren exakt dieselbe Schnittstelle.
 */

import * as base44Adapter from './adapters/base44Adapter';
import * as supabaseAdapter from './adapters/supabaseAdapter';
import * as ltiAdapter from './adapters/ltiAdapter';
import { getBackendName, isBase44 } from './backend';
import { hatGueltigeLtiSession } from '@/lib/ltiSession';
import { hasToken } from '@/services/AuthService';

const ADAPTERS = {
  base44: base44Adapter,
  supabase: supabaseAdapter,
};

function adapter() {
  // Moodle-Schüler: kein Base44-Token, aber gültige LTI-Sitzung → ltiApi.
  // Eingeloggte Lehrkräfte/Admins behalten immer den normalen Base44-Weg.
  if (isBase44() && !hasToken() && hatGueltigeLtiSession()) return ltiAdapter;
  return ADAPTERS[getBackendName()] || base44Adapter;
}

const wrap = (name) => (...args) => adapter()[name](...args);

// ── Auth ──
export const getCurrentUser = wrap('getCurrentUser');

// ── Inhalte (read-only) ──
export const getEinheit = wrap('getEinheit');
export const listEinheiten = wrap('listEinheiten');
export const listSystemBausteine = wrap('listSystemBausteine');
export const listAufgabenByEinheit = wrap('listAufgabenByEinheit');
export const listLernpaketeByEinheit = wrap('listLernpaketeByEinheit');
export const getAktivitaetenKatalog = wrap('getAktivitaetenKatalog');
export const getAktivitaetenByLernpaket = wrap('getAktivitaetenByLernpaket');
export const listThemenfelderByEinheit = wrap('listThemenfelderByEinheit');
export const listLernzieleByLernpaket = wrap('listLernzieleByLernpaket');
export const listFaecher = wrap('listFaecher');
export const listPhasen = wrap('listPhasen');
export const listInhaltSnapshots = wrap('listInhaltSnapshots');

// ── Schülerdaten: Einheit-Fortschritt ──
export const listEinheitFortschritt = wrap('listEinheitFortschritt');
export const createEinheitFortschritt = wrap('createEinheitFortschritt');
export const updateEinheitFortschritt = wrap('updateEinheitFortschritt');

// ── Schülerdaten: Aktivitäts-Fortschritt ──
export const listAktivitaetFortschritt = wrap('listAktivitaetFortschritt');
export const createAktivitaetFortschritt = wrap('createAktivitaetFortschritt');
export const updateAktivitaetFortschritt = wrap('updateAktivitaetFortschritt');

// ── Schülerdaten: Lernziel-Einschätzungen ──
export const listLernzielEinschaetzungen = wrap('listLernzielEinschaetzungen');
export const createLernzielEinschaetzung = wrap('createLernzielEinschaetzung');
export const updateLernzielEinschaetzung = wrap('updateLernzielEinschaetzung');
export const deleteLernzielEinschaetzung = wrap('deleteLernzielEinschaetzung');

// ── Schülerdaten: Zeit-Logs ──
export const listZeitLogs = wrap('listZeitLogs');
export const createZeitLog = wrap('createZeitLog');
export const updateZeitLog = wrap('updateZeitLog');

// ── Schülerdaten: Merkheft-Notizen ──
export const listNotizen = wrap('listNotizen');
export const createNotiz = wrap('createNotiz');
export const deleteNotiz = wrap('deleteNotiz');

// ── Schülerdaten: Lerntagebuch ──
export const listLerntagebuch = wrap('listLerntagebuch');
export const createLerntagebuchEintrag = wrap('createLerntagebuchEintrag');
export const bulkCreateLerntagebuch = wrap('bulkCreateLerntagebuch');
export const deleteLerntagebuchEintrag = wrap('deleteLerntagebuchEintrag');

// ── Funktionen / KI (Sonderfälle) ──
export const invokeFunction = wrap('invokeFunction');
export const uploadFile = wrap('uploadFile');
export const transcribeAudio = wrap('transcribeAudio');