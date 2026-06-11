/**
 * supabaseAdapter.js — Supabase-Implementierung des Schüler-Service-Layers.
 *
 * Implementiert exakt dieselbe Schnittstelle wie base44Adapter.js, arbeitet
 * aber gegen die Tabellen aus docs/migration/supabase-schema.sql.
 *
 * Daten-Konventionen:
 *  - Inhalts-Tabellen tragen die Kern-Spalten + `daten` (jsonb, kompletter
 *    Original-Datensatz aus Base44). Beim Lesen wird beides gemergt:
 *    { ...daten, ...kernSpalten } → identische Form wie auf Base44.
 *  - Schüler-Tabellen sind per RLS auf den eingeloggten Nutzer beschränkt.
 *    Das Feld `user_email` aus dem Frontend wird beim Schreiben entfernt
 *    (user_id setzt die DB selbst via auth.uid()) und beim Lesen wieder
 *    ergänzt. `created_at` wird als `created_date` gespiegelt.
 *  - KI-/Funktionsaufrufe sind im Supabase-Modus nicht verfügbar
 *    (Snapshot-only-Strategie) und werfen einen freundlichen Fehler.
 */

import { getSupabase } from './supabaseClient';

// ── Helfer ──────────────────────────────────────────────────────────────────

/** Inhalts-Zeile: jsonb-`daten` mit Kern-Spalten zur Base44-Form mergen. */
function mergeContent(row) {
  if (!row) return row;
  const { daten, ...rest } = row;
  return { ...(daten || {}), ...rest };
}

function mergeContentList(rows) {
  return (rows || []).map(mergeContent);
}

/** Schüler-Zeile: created_at → created_date spiegeln, user_email ergänzen. */
function mapStudentRow(row, userEmail) {
  if (!row) return row;
  const out = { ...row };
  if (row.created_at && !out.created_date) out.created_date = row.created_at;
  if (userEmail && !out.user_email) out.user_email = userEmail;
  return out;
}

/** Schreibdaten: user_email entfernen (user_id setzt die DB via auth.uid()). */
function stripUserEmail(data) {
  const { user_email: _ignored, ...rest } = data || {};
  return rest;
}

/** Sortier-String im Base44-Format ('-created_date') auf Supabase übersetzen. */
function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  let column = desc ? sort.slice(1) : sort;
  if (column === 'created_date') column = 'created_at';
  return query.order(column, { ascending: !desc });
}

function throwIfError(error) {
  if (error) throw new Error(error.message || 'Supabase-Fehler');
}

const KI_NICHT_VERFUEGBAR =
  'Diese KI-Funktion ist in der Schüler-Version nicht verfügbar. Die Inhalte werden von deiner Lehrkraft vorbereitet.';

// ── Auth ────────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const { data, error } = await getSupabase().auth.getUser();
  throwIfError(error);
  const user = data?.user;
  if (!user) throw new Error('Nicht eingeloggt.');
  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email,
    role: 'user',
  };
}

// ── Inhalte (read-only) ─────────────────────────────────────────────────────

export async function getEinheit(einheitId) {
  const { data, error } = await getSupabase()
    .from('einheiten').select('*').eq('id', einheitId).single();
  throwIfError(error);
  return mergeContent(data);
}

export async function listEinheiten() {
  const { data, error } = await getSupabase().from('einheiten').select('*');
  throwIfError(error);
  return mergeContentList(data);
}

export async function listSystemBausteine() {
  const { data, error } = await getSupabase().from('system_bausteine').select('*');
  throwIfError(error);
  return mergeContentList(data).sort(
    (a, b) => (a.reihenfolge ?? 100) - (b.reihenfolge ?? 100)
  );
}

export async function listAufgabenByEinheit(einheitId) {
  const { data, error } = await getSupabase()
    .from('allgemeine_aufgaben').select('*').eq('einheit_id', einheitId);
  throwIfError(error);
  return mergeContentList(data);
}

export async function listLernpaketeByEinheit(einheitId) {
  const { data, error } = await getSupabase()
    .from('lernpakete').select('*').eq('einheit_id', einheitId);
  throwIfError(error);
  return mergeContentList(data);
}

export async function getAktivitaetenKatalog() {
  const { data, error } = await getSupabase().from('aktivitaeten_katalog').select('*');
  throwIfError(error);
  return mergeContentList(data);
}

/**
 * Spiegelt die Logik aus services/AktivitaetService.js: Aktivitäten eines
 * Lernpakets laden, Tombstones ausblenden, MasterAufgaben anhängen und
 * field_values ggf. aus der ersten MasterAufgabe übernehmen.
 */
export async function getAktivitaetenByLernpaket(lernpaketId) {
  const sb = getSupabase();
  const [aktRes, masterRes] = await Promise.all([
    sb.from('lernpaket_aktivitaeten').select('*').eq('lernpaket_id', lernpaketId),
    sb.from('master_aufgaben').select('*').eq('lernpaket_id', lernpaketId),
  ]);
  throwIfError(aktRes.error);
  throwIfError(masterRes.error);

  const aktivitaeten = mergeContentList(aktRes.data)
    .filter((a) => a.sync_status !== 'to_delete');
  const masterAufgaben = masterRes.data || [];

  const masterListeByActivity = new Map();
  masterAufgaben
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
    .forEach((m) => {
      if (!masterListeByActivity.has(m.activity_id)) masterListeByActivity.set(m.activity_id, []);
      masterListeByActivity.get(m.activity_id).push(m);
    });

  const angereichert = aktivitaeten.map((akt) => {
    const masterListe = masterListeByActivity.get(akt.id) || [];
    const mitMaster = { ...akt, master_aufgaben: masterListe };
    const eigeneFv = akt.field_values || {};
    if (Object.keys(eigeneFv).length === 0) {
      const ersteMaster = masterListe[0];
      if (ersteMaster?.field_values && Object.keys(ersteMaster.field_values).length > 0) {
        mitMaster.field_values = ersteMaster.field_values;
      }
    }
    return mitMaster;
  });

  return angereichert.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
}

export async function listThemenfelderByEinheit(einheitId) {
  const { data, error } = await getSupabase()
    .from('themenfelder').select('*').eq('einheit_id', einheitId);
  throwIfError(error);
  return mergeContentList(data);
}

export async function listLernzieleByLernpaket(lernpaketId) {
  const { data, error } = await getSupabase()
    .from('lernziele').select('*').eq('lernpaket_id', lernpaketId);
  throwIfError(error);
  return data || [];
}

/**
 * Es gibt keine Fächer-Tabelle in Supabase – die Fächer werden aus den
 * exportierten Einheiten abgeleitet (id = Fach-Name, feste Farbpalette).
 */
const FACH_FARBEN = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export async function listFaecher() {
  const { data, error } = await getSupabase().from('einheiten').select('fach');
  throwIfError(error);
  const namen = [...new Set((data || []).map((e) => e.fach).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'de'));
  return namen.map((name, i) => ({
    id: name,
    name,
    farbe: FACH_FARBEN[i % FACH_FARBEN.length],
    ist_aktiv: true,
    ist_poolzeit_fach: true,
    reihenfolge: i,
  }));
}

export async function listPhasen() {
  // Keine Zeitphasen-Tabelle in Supabase – Anzeige fällt auf '' zurück.
  return [];
}

export async function listInhaltSnapshots(filter) {
  let query = getSupabase().from('inhalt_snapshots').select('*');
  Object.entries(filter || {}).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  const { data, error } = await query;
  throwIfError(error);
  return data || [];
}

// ── Schülerdaten: Einheit-Fortschritt ───────────────────────────────────────

export async function listEinheitFortschritt(userEmail, einheitId) {
  let query = getSupabase().from('einheit_fortschritt').select('*');
  if (einheitId) query = query.eq('einheit_id', einheitId);
  const { data, error } = await query;
  throwIfError(error);
  return (data || []).map((r) => mapStudentRow(r, userEmail));
}

export async function createEinheitFortschritt(data) {
  const { data: row, error } = await getSupabase()
    .from('einheit_fortschritt').insert(stripUserEmail(data)).select().single();
  throwIfError(error);
  return mapStudentRow(row, data?.user_email);
}

export async function updateEinheitFortschritt(id, data) {
  const { data: row, error } = await getSupabase()
    .from('einheit_fortschritt').update(stripUserEmail(data)).eq('id', id).select().single();
  throwIfError(error);
  return mapStudentRow(row);
}

// ── Schülerdaten: Aktivitäts-Fortschritt ────────────────────────────────────

export async function listAktivitaetFortschritt(userEmail, einheitId, lerntyp) {
  const { data, error } = await getSupabase()
    .from('aktivitaet_fortschritt').select('*')
    .eq('einheit_id', einheitId).eq('lerntyp', lerntyp);
  throwIfError(error);
  return (data || []).map((r) => mapStudentRow(r, userEmail));
}

export async function createAktivitaetFortschritt(data) {
  const { data: row, error } = await getSupabase()
    .from('aktivitaet_fortschritt').insert(stripUserEmail(data)).select().single();
  throwIfError(error);
  return mapStudentRow(row, data?.user_email);
}

export async function updateAktivitaetFortschritt(id, data) {
  const { data: row, error } = await getSupabase()
    .from('aktivitaet_fortschritt').update(stripUserEmail(data)).eq('id', id).select().single();
  throwIfError(error);
  return mapStudentRow(row);
}

// ── Schülerdaten: Lernziel-Einschätzungen (Lernlandkarte) ───────────────────

export async function listLernzielEinschaetzungen(userEmail, einheitId) {
  const { data, error } = await getSupabase()
    .from('lernziel_einschaetzungen').select('*').eq('einheit_id', einheitId);
  throwIfError(error);
  return (data || []).map((r) => mapStudentRow(r, userEmail));
}

export async function createLernzielEinschaetzung(data) {
  const { data: row, error } = await getSupabase()
    .from('lernziel_einschaetzungen').insert(stripUserEmail(data)).select().single();
  throwIfError(error);
  return mapStudentRow(row, data?.user_email);
}

export async function updateLernzielEinschaetzung(id, data) {
  const { data: row, error } = await getSupabase()
    .from('lernziel_einschaetzungen').update(stripUserEmail(data)).eq('id', id).select().single();
  throwIfError(error);
  return mapStudentRow(row);
}

export async function deleteLernzielEinschaetzung(id) {
  const { error } = await getSupabase()
    .from('lernziel_einschaetzungen').delete().eq('id', id);
  throwIfError(error);
}

// ── Schülerdaten: Zeit-Logs ─────────────────────────────────────────────────

export async function listZeitLogs(filter) {
  let query = getSupabase().from('zeit_logs').select('*');
  Object.entries(filter || {}).forEach(([key, value]) => {
    if (key === 'user_email') return; // RLS übernimmt die Nutzer-Isolation
    query = query.eq(key, value);
  });
  const { data, error } = await query;
  throwIfError(error);
  return (data || []).map((r) => mapStudentRow(r, filter?.user_email));
}

export async function createZeitLog(data) {
  const { data: row, error } = await getSupabase()
    .from('zeit_logs').insert(stripUserEmail(data)).select().single();
  throwIfError(error);
  return mapStudentRow(row, data?.user_email);
}

export async function updateZeitLog(id, data) {
  const { data: row, error } = await getSupabase()
    .from('zeit_logs').update(stripUserEmail(data)).eq('id', id).select().single();
  throwIfError(error);
  return mapStudentRow(row);
}

// ── Schülerdaten: Merkheft-Notizen ──────────────────────────────────────────

export async function listNotizen(filter, sort) {
  let query = getSupabase().from('einheit_notizen').select('*');
  Object.entries(filter || {}).forEach(([key, value]) => {
    if (key === 'user_email') return;
    query = query.eq(key, value);
  });
  query = applySort(query, sort);
  const { data, error } = await query;
  throwIfError(error);
  return (data || []).map((r) => mapStudentRow(r, filter?.user_email));
}

export async function createNotiz(data) {
  const { data: row, error } = await getSupabase()
    .from('einheit_notizen').insert(stripUserEmail(data)).select().single();
  throwIfError(error);
  return mapStudentRow(row, data?.user_email);
}

export async function deleteNotiz(id) {
  const { error } = await getSupabase().from('einheit_notizen').delete().eq('id', id);
  throwIfError(error);
}

// ── Schülerdaten: Lerntagebuch ──────────────────────────────────────────────

export async function listLerntagebuch(filter, sort, limit) {
  let query = getSupabase().from('lerntagebuch_eintraege').select('*');
  Object.entries(filter || {}).forEach(([key, value]) => {
    if (key === 'user_email') return;
    query = query.eq(key, value);
  });
  query = applySort(query, sort);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  throwIfError(error);
  return (data || []).map((r) => mapStudentRow(r, filter?.user_email));
}

export async function createLerntagebuchEintrag(data) {
  const { data: row, error } = await getSupabase()
    .from('lerntagebuch_eintraege').insert(stripUserEmail(data)).select().single();
  throwIfError(error);
  return mapStudentRow(row, data?.user_email);
}

export async function bulkCreateLerntagebuch(eintraege) {
  const { data, error } = await getSupabase()
    .from('lerntagebuch_eintraege')
    .insert((eintraege || []).map(stripUserEmail))
    .select();
  throwIfError(error);
  return (data || []).map((r) => mapStudentRow(r));
}

export async function deleteLerntagebuchEintrag(id) {
  const { error } = await getSupabase().from('lerntagebuch_eintraege').delete().eq('id', id);
  throwIfError(error);
}

// ── Funktionen / KI (im Supabase-Modus nicht verfügbar) ─────────────────────
// Snapshot-only-Strategie: KI-Inhalte werden im Autoren-System generiert und
// per Export als inhalt_snapshots bereitgestellt. Live-KI gibt es hier nicht.

export async function invokeFunction(_name, _payload) {
  throw new Error(KI_NICHT_VERFUEGBAR);
}

export async function uploadFile(_file) {
  throw new Error(KI_NICHT_VERFUEGBAR);
}

export async function transcribeAudio(_audioUrl) {
  throw new Error(KI_NICHT_VERFUEGBAR);
}