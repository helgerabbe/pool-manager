/**
 * shared/lernpaketIntegration.js
 *
 * Gemeinsame Logik der Lernpaket-Integration (Konzept 2026-08-11):
 * Eine Lehrkraft baut ein Lernpaket in ihrer PRIVATEN Einheit fertig und
 * bietet es einer gemeinschaftlichen Poolzeit-Einheit zur Integration an.
 * Die Fachschaftsleitung sieht das Angebot im ersten Tab der Ziel-Einheit,
 * prüft es und übernimmt es als KOPIE in ein Themenfeld.
 *
 * Genutzt von offerLernpaketIntegrationSecure, listLernpaketIntegrationAngebote
 * und integrateLernpaketSecure.
 */

const PAGE_SIZE = 500;
const CREATE_BATCH = 100;

// Einheiten-Zustände, in denen keine strukturellen Änderungen erlaubt sind.
export const EINHEIT_GESPERRT_LIFECYCLE = ['final_freigegeben', 'export_running', 'published'];

export async function listAll(entity, query) {
  const all = [];
  let skip = 0;
  while (true) {
    const page = await entity.filter(query, 'created_date', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

export function sanitize(record) {
  const copy = { ...record };
  for (const key of ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'updated_by', 'is_sample', 'app_id']) {
    delete copy[key];
  }
  return copy;
}

export async function createMany(entity, records) {
  const created = [];
  for (let i = 0; i < records.length; i += CREATE_BATCH) {
    const batch = records.slice(i, i + CREATE_BATCH);
    const result = await entity.bulkCreate(batch);
    created.push(...(Array.isArray(result) ? result : []));
  }
  return created;
}

/** Globale ID-Ersetzung in beliebigen JSON-Strukturen (IDs sind eindeutige Hex-Strings). */
export function remapJson(value, idMap) {
  if (value === null || value === undefined) return value;
  let text = JSON.stringify(value);
  for (const [oldId, newId] of idMap.entries()) {
    if (text.includes(oldId)) text = text.split(oldId).join(newId);
  }
  return JSON.parse(text);
}

/** Lädt das Benutzerprofil (Rolle + Fachzuständigkeiten) einer E-Mail. */
export async function loadProfil(e, email) {
  const list = await listAll(e.Benutzer, { user_id: email });
  return list?.[0] || null;
}

/** Darf diese Person Integrations-Angebote der Ziel-Einheit verwalten? */
export function darfIntegrationVerwalten(user, profil, einheit) {
  if (user?.role === 'admin' || profil?.rolle === 'Administrator') return true;
  if (profil?.rolle !== 'Fachschaftsleitung') return false;
  const faecher = Array.isArray(profil.fachbereich_zustaendigkeit) ? profil.fachbereich_zustaendigkeit : [];
  return faecher.includes(einheit?.fach);
}

/** Normalisiert Titel für die Dubletten-Erkennung. */
export function normalizeTitel(titel) {
  return String(titel || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Kopiert ein Lernpaket samt Lernzielen, Phasen-Aktivitäten, Master-Aufgaben
 * und Klonen in eine Ziel-Einheit / ein Ziel-Themenfeld.
 *
 * Die Kopie gilt als KOMPLETT NEU und UNFREIGEGEBEN:
 *  - alle content_status → 'draft', keine released_*-Werte
 *  - alle sync_status → 'new', keine Export-Zeitstempel, keine Locks
 * So muss die Fachschaftsleitung die Inhalte in der Poolzeit-Einheit bewusst
 * prüfen und freigeben.
 */
export async function copyLernpaketTree(e, quellPaket, zielEinheitId, zielThemenfeldId, reihenfolge, herkunftText) {
  const [lernziele, aktivitaeten, masterAufgaben, bausteine] = await Promise.all([
    listAll(e.Lernziele, { lernpaket_id: quellPaket.id }),
    listAll(e.LernpaketPhaseAktivitaet, { lernpaket_id: quellPaket.id }),
    listAll(e.MasterAufgabe, { lernpaket_id: quellPaket.id }),
    listAll(e.Aufgabenbausteine, { lernpaket_id: quellPaket.id }),
  ]);

  const idMap = new Map();

  // ── 1. Lernpaket ──
  const paketCopy = sanitize(quellPaket);
  paketCopy.einheit_id = zielEinheitId;
  paketCopy.themenfeld_id = zielThemenfeldId || null;
  paketCopy.reihenfolge_nummer = reihenfolge;
  paketCopy.sync_status = 'new';
  paketCopy.export_error = false;
  paketCopy.is_locked = false;
  paketCopy.version = 1;
  paketCopy.content_status = 'draft';
  paketCopy.integration_status = 'keine';
  paketCopy.integration_herkunft = herkunftText;
  paketCopy.integration_uebernommen_am = new Date().toISOString();
  for (const key of [
    'released_at', 'released_by', 'last_synced_at', 'locked_by_email', 'locked_at',
    'integration_ziel_einheit_id', 'integration_angeboten_von', 'integration_angeboten_am',
  ]) delete paketCopy[key];

  const neuesPaket = await e.Lernpakete.create(paketCopy);
  idMap.set(quellPaket.id, neuesPaket.id);

  // ── 2. Lernziele + Aktivitäten ──
  const [neueZiele, neueAktivitaeten] = await Promise.all([
    createMany(e.Lernziele, lernziele.map(z => {
      const c = sanitize(z);
      c.lernpaket_id = neuesPaket.id;
      c.sync_status = 'new';
      return c;
    })),
    createMany(e.LernpaketPhaseAktivitaet, aktivitaeten.map(a => {
      const c = sanitize(a);
      c.lernpaket_id = neuesPaket.id;
      c.sync_status = 'new';
      c.export_error = false;
      c.content_status = 'draft';
      delete c.released_at;
      delete c.released_by;
      delete c.last_synced_at;
      return c;
    })),
  ]);
  lernziele.forEach((z, i) => idMap.set(z.id, neueZiele[i].id));
  aktivitaeten.forEach((a, i) => idMap.set(a.id, neueAktivitaeten[i].id));

  // ── 3. Master-Aufgaben ──
  const neueMaster = await createMany(e.MasterAufgabe, masterAufgaben.map(m => {
    const c = sanitize(m);
    c.lernpaket_id = neuesPaket.id;
    c.activity_id = idMap.get(c.activity_id) || c.activity_id;
    c.sync_status = 'new';
    c.export_error = false;
    c.lock_status = false;
    c.content_status = 'draft';
    delete c.last_synced_at;
    delete c.locked_by_user;
    delete c.locked_at;
    return c;
  }));
  masterAufgaben.forEach((m, i) => idMap.set(m.id, neueMaster[i].id));

  // ── 4. Klone (Aufgabenbausteine) ──
  const neueBausteine = await createMany(e.Aufgabenbausteine, bausteine.map(b => {
    const c = sanitize(b);
    c.lernpaket_id = neuesPaket.id;
    if (c.lernziel_id) c.lernziel_id = idMap.get(c.lernziel_id) || c.lernziel_id;
    if (c.master_aufgabe_id) c.master_aufgabe_id = idMap.get(c.master_aufgabe_id) || c.master_aufgabe_id;
    c.sync_status = 'new';
    delete c.last_synced_at;
    return c;
  }));
  bausteine.forEach((b, i) => idMap.set(b.id, neueBausteine[i].id));

  // ── 5. Pass 2: eingebettete ID-Referenzen in den Aktivitäten remappen ──
  const updates = [];
  aktivitaeten.forEach((orig, i) => {
    const patch = {};
    for (const field of ['field_values', 'ki_briefing']) {
      if (orig[field]) {
        const remapped = remapJson(orig[field], idMap);
        if (JSON.stringify(orig[field]) !== JSON.stringify(remapped)) patch[field] = remapped;
      }
    }
    if (Object.keys(patch).length > 0) {
      updates.push(e.LernpaketPhaseAktivitaet.update(neueAktivitaeten[i].id, patch));
    }
  });
  await Promise.all(updates);

  return {
    neuesPaket,
    counts: {
      lernziele: lernziele.length,
      aktivitaeten: aktivitaeten.length,
      masterAufgaben: masterAufgaben.length,
      bausteine: bausteine.length,
    },
  };
}