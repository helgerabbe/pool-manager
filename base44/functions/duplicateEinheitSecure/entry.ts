/**
 * duplicateEinheitSecure
 *
 * Erstellt eine vollständige, tiefe Kopie einer Einheit als "Sandbox":
 * Themenfelder, Lernpakete, Lernziele, Phasen-Aktivitäten, Master-Aufgaben,
 * Klone (Aufgabenbausteine), Allgemeine Aufgaben, Lernziel-Mappings,
 * Lernpfad-Memberships und Einheit-Mitglieder werden mitkopiert.
 *
 * Die Kopie gilt als KOMPLETT NEU:
 *  - alle sync_status → 'new', keine Export-/Sync-Zeitstempel
 *  - export_lifecycle_status → 'draft', keine Struktur-Locks
 *  - Titel erhält den Zusatz " (Kopie)"
 * Inhaltliche Freigaben (content_status/released_*) bleiben ERHALTEN
 * (Entscheidung 2026-07-13: einmal freigegebene Inhalte sind fachlich ok).
 *
 * ID-Remapping: direkte FKs werden beim Anlegen umgeschrieben; eingebettete
 * Referenzen (lernpfade_konfiguration, verlinkte_*_ids, sequenz_schritte)
 * in einem zweiten Durchgang per globaler ID-Ersetzung.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const PAGE_SIZE = 500;
const CREATE_BATCH = 100;

async function listAll(entity, query) {
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

function uniqueById(records) {
  return Array.from(new Map(records.map(r => [r.id, r])).values());
}

// Built-in-/Meta-Felder entfernen, damit create() saubere neue Datensätze anlegt
function sanitize(record) {
  const copy = { ...record };
  for (const key of ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'updated_by', 'is_sample', 'app_id']) {
    delete copy[key];
  }
  return copy;
}

// Bulk-Create in Batches; Rückgabe-Reihenfolge entspricht der Eingabe-Reihenfolge
async function createMany(entity, records) {
  const created = [];
  for (let i = 0; i < records.length; i += CREATE_BATCH) {
    const batch = records.slice(i, i + CREATE_BATCH);
    const result = await entity.bulkCreate(batch);
    created.push(...(Array.isArray(result) ? result : []));
  }
  return created;
}

// Globale ID-Ersetzung in beliebigen JSON-Strukturen (IDs sind eindeutige Hex-Strings)
function remapJson(value, idMap) {
  if (value === null || value === undefined) return value;
  let text = JSON.stringify(value);
  for (const [oldId, newId] of idMap.entries()) {
    if (text.includes(oldId)) text = text.split(oldId).join(newId);
  }
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const einheitId = payload?.einheit_id;
    if (!einheitId) return Response.json({ error: 'Missing einheit_id' }, { status: 400 });

    const e = base44.asServiceRole.entities;
    const einheit = await e.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // RBAC: Admin, Administrator-Profil, Fachschaftsleitung im Fach oder LEITUNG-Mitglied
    const [benutzer, ownMemberships] = await Promise.all([
      listAll(e.Benutzer, { user_id: user.email }),
      listAll(e.EinheitMembers, { einheit_id: einheitId, user_email: user.email }),
    ]);
    const userRecord = benutzer?.[0];
    const allowed = Boolean(
      user.role === 'admin' ||
      userRecord?.rolle === 'Administrator' ||
      (userRecord?.rolle === 'Fachschaftsleitung' && (userRecord?.fachbereich_zustaendigkeit || []).includes(einheit.fach)) ||
      ownMemberships.some(m => m.unit_role === 'LEITUNG')
    );
    if (!allowed) return Response.json({ error: 'Keine Berechtigung zum Duplizieren' }, { status: 403 });

    // ── Quelle vollständig einsammeln ──
    const [themenfelder, lernpaketeByEinheit, allgemeineAufgaben, members, pfadMemberships] = await Promise.all([
      listAll(e.Themenfeld, { einheit_id: einheitId }),
      listAll(e.Lernpakete, { einheit_id: einheitId }),
      listAll(e.AllgemeineAufgabe, { einheit_id: einheitId }),
      listAll(e.EinheitMembers, { einheit_id: einheitId }),
      listAll(e.LernpfadAufgabeMembership, { einheit_id: einheitId }),
    ]);

    const lernpaketeByTf = await Promise.all(
      themenfelder.map(tf => listAll(e.Lernpakete, { themenfeld_id: tf.id }))
    );
    const lernpakete = uniqueById([...lernpaketeByEinheit, ...lernpaketeByTf.flat()]);

    const [lernzielePages, aktivitaetenPages, masterPages, bausteinePages] = await Promise.all([
      Promise.all(lernpakete.map(p => listAll(e.Lernziele, { lernpaket_id: p.id }))),
      Promise.all(lernpakete.map(p => listAll(e.LernpaketPhaseAktivitaet, { lernpaket_id: p.id }))),
      Promise.all(lernpakete.map(p => listAll(e.MasterAufgabe, { lernpaket_id: p.id }))),
      Promise.all(lernpakete.map(p => listAll(e.Aufgabenbausteine, { lernpaket_id: p.id }))),
    ]);
    const lernziele = lernzielePages.flat();
    const aktivitaeten = aktivitaetenPages.flat();
    const masterAufgaben = masterPages.flat();
    const aufgabenbausteine = bausteinePages.flat();

    const [allgMappingPages, allgBasisMappingPages, bausteinMappingPages] = await Promise.all([
      Promise.all(allgemeineAufgaben.map(a => listAll(e.AllgemeineAufgabeLernzielMapping, { aufgabe_id: a.id }))),
      Promise.all(allgemeineAufgaben.map(a => listAll(e.AllgemeineAufgabeBasisLernzielMapping, { aufgabe_id: a.id }))),
      Promise.all(aufgabenbausteine.map(b => listAll(e.MappingAufgabeBasisziel, { aufgabe_id: b.id }))),
    ]);

    const idMap = new Map();

    // ── 1. Einheit anlegen (Reset aller Export-/Sync-/Lifecycle-Felder) ──
    const einheitCopy = sanitize(einheit);
    einheitCopy.titel_der_einheit = `${einheit.titel_der_einheit} (Kopie)`;
    einheitCopy.sync_status = 'new';
    einheitCopy.export_lifecycle_status = 'draft';
    einheitCopy.freigabe_status = 'Freigegeben für Bearbeitung';
    einheitCopy.version = 1;
    for (const key of [
      'last_synced_at', 'last_exported_at', 'structural_lock', 'structural_locked_at',
      'export_lifecycle_changed_at', 'export_lifecycle_changed_by',
      'export_started_at', 'export_started_by', 'export_published_at', 'export_published_by',
      'update_strategy', 'update_strategy_empfehlung', 'update_strategy_analysis',
      'update_strategy_set_by', 'update_strategy_set_at',
      'update_strategy_override', 'update_strategy_override_by', 'update_strategy_override_at',
      'members',
    ]) delete einheitCopy[key];

    const newEinheit = await e.Einheiten.create(einheitCopy);
    idMap.set(einheit.id, newEinheit.id);

    // ── 2. Themenfelder ──
    const newThemenfelder = await createMany(e.Themenfeld, themenfelder.map(tf => {
      const c = sanitize(tf);
      c.einheit_id = newEinheit.id;
      c.sync_status = 'new';
      delete c.last_synced_at;
      return c;
    }));
    themenfelder.forEach((tf, i) => idMap.set(tf.id, newThemenfelder[i].id));

    // ── 3. Lernpakete ──
    const newLernpakete = await createMany(e.Lernpakete, lernpakete.map(p => {
      const c = sanitize(p);
      c.einheit_id = newEinheit.id;
      if (c.themenfeld_id) c.themenfeld_id = idMap.get(c.themenfeld_id) || c.themenfeld_id;
      c.sync_status = 'new';
      c.export_error = false;
      c.is_locked = false;
      c.version = 1;
      delete c.last_synced_at;
      delete c.locked_by_email;
      delete c.locked_at;
      return c;
    }));
    lernpakete.forEach((p, i) => idMap.set(p.id, newLernpakete[i].id));

    // ── 4. Lernziele + Phasen-Aktivitäten (parallel) ──
    const [newLernziele, newAktivitaeten] = await Promise.all([
      createMany(e.Lernziele, lernziele.map(z => {
        const c = sanitize(z);
        c.lernpaket_id = idMap.get(c.lernpaket_id) || c.lernpaket_id;
        c.sync_status = 'new';
        return c;
      })),
      createMany(e.LernpaketPhaseAktivitaet, aktivitaeten.map(a => {
        const c = sanitize(a);
        c.lernpaket_id = idMap.get(c.lernpaket_id) || c.lernpaket_id;
        c.sync_status = 'new';
        c.export_error = false;
        delete c.last_synced_at;
        return c;
      })),
    ]);
    lernziele.forEach((z, i) => idMap.set(z.id, newLernziele[i].id));
    aktivitaeten.forEach((a, i) => idMap.set(a.id, newAktivitaeten[i].id));

    // ── 5. Master-Aufgaben ──
    const newMaster = await createMany(e.MasterAufgabe, masterAufgaben.map(m => {
      const c = sanitize(m);
      c.activity_id = idMap.get(c.activity_id) || c.activity_id;
      c.lernpaket_id = idMap.get(c.lernpaket_id) || c.lernpaket_id;
      c.sync_status = 'new';
      c.export_error = false;
      c.lock_status = false;
      delete c.last_synced_at;
      delete c.locked_by_user;
      delete c.locked_at;
      return c;
    }));
    masterAufgaben.forEach((m, i) => idMap.set(m.id, newMaster[i].id));

    // ── 6. Aufgabenbausteine (Klone) ──
    const newBausteine = await createMany(e.Aufgabenbausteine, aufgabenbausteine.map(b => {
      const c = sanitize(b);
      c.lernpaket_id = idMap.get(c.lernpaket_id) || c.lernpaket_id;
      if (c.lernziel_id) c.lernziel_id = idMap.get(c.lernziel_id) || c.lernziel_id;
      if (c.master_aufgabe_id) c.master_aufgabe_id = idMap.get(c.master_aufgabe_id) || c.master_aufgabe_id;
      c.sync_status = 'new';
      delete c.last_synced_at;
      return c;
    }));
    aufgabenbausteine.forEach((b, i) => idMap.set(b.id, newBausteine[i].id));

    // ── 7. Allgemeine Aufgaben (Selbst-Referenzen folgen in Pass 2) ──
    const newAllgAufgaben = await createMany(e.AllgemeineAufgabe, allgemeineAufgaben.map(a => {
      const c = sanitize(a);
      c.einheit_id = newEinheit.id;
      if (c.themenfeld_id) c.themenfeld_id = idMap.get(c.themenfeld_id) || c.themenfeld_id;
      if (Array.isArray(c.verlinkte_lernpaket_ids)) {
        c.verlinkte_lernpaket_ids = c.verlinkte_lernpaket_ids.map(id => idMap.get(id) || id);
      }
      c.sync_status = 'new';
      c.moodle_sync_status = 'new';
      c.brian_sync_status = 'new';
      c.export_error = false;
      delete c.last_synced_at;
      delete c.brian_synced_at;
      delete c.locked_by;
      delete c.locked_at;
      return c;
    }));
    allgemeineAufgaben.forEach((a, i) => idMap.set(a.id, newAllgAufgaben[i].id));

    // ── 8. Mappings + Memberships + Mitglieder ──
    await Promise.all([
      createMany(e.AllgemeineAufgabeLernzielMapping, allgMappingPages.flat().map(m => {
        const c = sanitize(m);
        c.aufgabe_id = idMap.get(c.aufgabe_id) || c.aufgabe_id;
        c.lernziel_id = idMap.get(c.lernziel_id) || c.lernziel_id;
        return c;
      })),
      createMany(e.AllgemeineAufgabeBasisLernzielMapping, allgBasisMappingPages.flat().map(m => {
        const c = sanitize(m);
        c.aufgabe_id = idMap.get(c.aufgabe_id) || c.aufgabe_id;
        return c;
      })),
      createMany(e.MappingAufgabeBasisziel, bausteinMappingPages.flat().map(m => {
        const c = sanitize(m);
        c.aufgabe_id = idMap.get(c.aufgabe_id) || c.aufgabe_id;
        c.basisziel_id = idMap.get(c.basisziel_id) || c.basisziel_id;
        return c;
      })),
      createMany(e.LernpfadAufgabeMembership, pfadMemberships.map(m => {
        const c = sanitize(m);
        c.einheit_id = newEinheit.id;
        c.aufgabe_id = idMap.get(c.aufgabe_id) || c.aufgabe_id;
        c.pfad_status = 'draft';
        c.export_error = false;
        delete c.geprueft_at;
        delete c.geprueft_snapshot_updated_date;
        delete c.last_export_signature;
        return c;
      })),
      createMany(e.EinheitMembers, members.map(m => {
        const c = sanitize(m);
        c.einheit_id = newEinheit.id;
        return c;
      })),
    ]);

    // ── 9. Pass 2: eingebettete ID-Referenzen global remappen ──
    // 9a) Lernpfad-Konfiguration der Einheit (ref_ids auf Aufgaben/Lernpakete)
    const updates = [];
    if (einheit.lernpfade_konfiguration) {
      updates.push(e.Einheiten.update(newEinheit.id, {
        lernpfade_konfiguration: remapJson(einheit.lernpfade_konfiguration, idMap),
      }));
    }
    // 9b) Selbst-Referenzen der Allgemeinen Aufgaben (verlinkte Aufgaben/Projekte, Sequenz-Schritte)
    allgemeineAufgaben.forEach((orig, i) => {
      const patch = {};
      for (const field of ['verlinkte_aufgaben_ids', 'verlinkte_projekt_ids', 'sequenz_schritte']) {
        if (orig[field] && JSON.stringify(orig[field]) !== JSON.stringify(remapJson(orig[field], idMap))) {
          patch[field] = remapJson(orig[field], idMap);
        }
      }
      if (Object.keys(patch).length > 0) {
        updates.push(e.AllgemeineAufgabe.update(newAllgAufgaben[i].id, patch));
      }
    });
    await Promise.all(updates);

    await e.AuditLog.create({
      user_email: user.email,
      action: 'CREATE',
      resource_type: 'Einheiten',
      resource_id: newEinheit.id,
      changes: {
        action_code: 'DUPLICATE_UNIT',
        source_einheit_id: einheit.id,
        titel_der_einheit: einheitCopy.titel_der_einheit,
        copied_counts: {
          themenfelder: themenfelder.length,
          lernpakete: lernpakete.length,
          lernziele: lernziele.length,
          aktivitaeten: aktivitaeten.length,
          masterAufgaben: masterAufgaben.length,
          aufgabenbausteine: aufgabenbausteine.length,
          allgemeineAufgaben: allgemeineAufgaben.length,
        },
      },
      affected_count: idMap.size,
      status: 'success',
    });

    return Response.json({
      success: true,
      new_einheit_id: newEinheit.id,
      titel: einheitCopy.titel_der_einheit,
      copied_count: idMap.size,
    });
  } catch (error) {
    console.error('[duplicateEinheitSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});