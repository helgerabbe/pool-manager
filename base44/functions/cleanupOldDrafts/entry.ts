/**
 * cleanupOldDrafts.js
 *
 * Bereinigt veraltete Wizard-Entwürfe (wizard_status === 'entwurf'),
 * die seit mehr als 30 Tagen nicht mehr bearbeitet wurden.
 *
 * Sicherheit:
 *   Der Endpoint ist für Scheduled Automation gedacht und akzeptiert daher
 *   keine normale User-Session, sondern ausschließlich den Header:
 *   Authorization: Bearer <CLEANUP_OLD_DRAFTS_SECRET>
 *
 * Architektur:
 *   - Kein rekursives JavaScript-Cascade mehr.
 *   - Alle abhängigen Records werden vollständig paginiert geladen.
 *   - Abhängige Reads laufen kontrolliert sequenziell, um Cron-Lastspitzen zu vermeiden.
 *   - Deletes laufen in stabilen Batches statt als lange N+1-Kette.
 *   - AuditLog wird bewusst nicht gelöscht, damit Revisions- und Forensikdaten erhalten bleiben.
 *
 * @MIGRATION_NOTE Supabase:
 *   Das komplette Konstrukt cascadeDelete in JavaScript ist in relationalen
 *   Datenbanken ein Anti-Pattern und wird ersatzlos gestrichen.
 *   Die Tabellen in Supabase erhalten bei den Foreign Keys ON DELETE CASCADE.
 *   Das Skript reduziert sich dann auf eine einzige SQL-Anweisung:
 *   DELETE FROM einheiten
 *   WHERE wizard_status = 'entwurf'
 *     AND updated_date < NOW() - INTERVAL '30 days';
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;
const DELETE_BATCH_SIZE = 25;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function assertCronSecret(req) {
  const expected = Deno.env.get('CLEANUP_OLD_DRAFTS_SECRET');
  const header = req.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!expected || token !== expected) {
    return false;
  }
  return true;
}

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

async function deleteBatch(entity, records) {
  let deleted = 0;

  for (const batch of chunkArray(records, DELETE_BATCH_SIZE)) {
    const outcomes = await Promise.allSettled(
      batch.map((record) => entity.delete(record.id))
    );
    deleted += outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
  }

  return deleted;
}

async function listAllForRecords(records, loadForRecord) {
  const pages = [];

  for (const record of records) {
    pages.push(await loadForRecord(record));
  }

  return pages;
}

async function collectDraftCascadeRecords(base44, einheitId) {
  const e = base44.asServiceRole.entities;

  const [themenfelder, lernpaketeByEinheit, allgemeineAufgaben, einheitMembers, exportPrompts, memberships, generatedFiles] = await Promise.all([
    listAll(e.Themenfeld, { einheit_id: einheitId }),
    listAll(e.Lernpakete, { einheit_id: einheitId }),
    listAll(e.AllgemeineAufgabe, { einheit_id: einheitId }),
    listAll(e.EinheitMembers, { einheit_id: einheitId }),
    listAll(e.ExportPrompts, { einheit_id: einheitId }),
    listAll(e.LernpfadAufgabeMembership, { einheit_id: einheitId }),
    listAll(e.MBKGeneratedFile, { einheit_id: einheitId }),
  ]);

  const lernpaketeByThemenfeldPages = await listAllForRecords(
    themenfelder,
    (themenfeld) => listAll(e.Lernpakete, { themenfeld_id: themenfeld.id })
  );
  const lernpaketeById = new Map();
  [...lernpaketeByEinheit, ...lernpaketeByThemenfeldPages.flat()].forEach((lernpaket) => {
    lernpaketeById.set(lernpaket.id, lernpaket);
  });
  const lernpakete = Array.from(lernpaketeById.values());

  const lernzielePages = await listAllForRecords(
    lernpakete,
    (lernpaket) => listAll(e.Lernziele, { lernpaket_id: lernpaket.id })
  );
  const aufgabenbausteinePages = await listAllForRecords(
    lernpakete,
    (lernpaket) => listAll(e.Aufgabenbausteine, { lernpaket_id: lernpaket.id })
  );
  const aktivitaetenPages = await listAllForRecords(
    lernpakete,
    (lernpaket) => listAll(e.LernpaketPhaseAktivitaet, { lernpaket_id: lernpaket.id })
  );
  const masterAufgabenPages = await listAllForRecords(
    lernpakete,
    (lernpaket) => listAll(e.MasterAufgabe, { lernpaket_id: lernpaket.id })
  );

  const aufgabenbausteine = aufgabenbausteinePages.flat();
  const mappingPages = await listAllForRecords(
    aufgabenbausteine,
    (baustein) => listAll(e.MappingAufgabeBasisziel, { aufgabe_id: baustein.id })
  );

  return {
    MappingAufgabeBasisziel: mappingPages.flat(),
    MasterAufgabe: masterAufgabenPages.flat(),
    LernpaketPhaseAktivitaet: aktivitaetenPages.flat(),
    Aufgabenbausteine: aufgabenbausteine,
    Lernziele: lernzielePages.flat(),
    AllgemeineAufgabe: allgemeineAufgaben,
    LernpfadAufgabeMembership: memberships,
    MBKGeneratedFile: generatedFiles,
    ExportPrompts: exportPrompts,
    EinheitMembers: einheitMembers,
    Lernpakete: lernpakete,
    Themenfeld: themenfelder,
  };
}

async function deleteDraftCascade(base44, einheit) {
  const e = base44.asServiceRole.entities;
  const recordsByEntity = await collectDraftCascadeRecords(base44, einheit.id);
  let totalDeleted = 0;
  const details = {};

  for (const entityName of Object.keys(recordsByEntity)) {
    const count = await deleteBatch(e[entityName], recordsByEntity[entityName]);
    details[entityName] = count;
    totalDeleted += count;
  }

  await e.Einheiten.delete(einheit.id);
  totalDeleted += 1;
  details.Einheiten = 1;

  return { totalDeleted, details };
}

Deno.serve(async (req) => {
  try {
    if (!assertCronSecret(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const allDrafts = await listAll(base44.asServiceRole.entities.Einheiten, {
      wizard_status: 'entwurf',
    });

    const expiredDrafts = allDrafts.filter((einheit) => {
      const lastUpdated = einheit.updated_date || einheit.created_date;
      if (!lastUpdated) return false;

      return new Date(lastUpdated) < cutoffDate;
    });

    console.log(`[cleanupOldDrafts] Gefunden: ${expiredDrafts.length} veraltete Entwürfe.`);

    let totalDeleted = 0;
    const deletedIds = [];
    const errors = [];
    const cleanupDetails = [];

    for (const entwurf of expiredDrafts) {
      try {
        const result = await deleteDraftCascade(base44, entwurf);
        totalDeleted += result.totalDeleted;
        deletedIds.push(entwurf.id);
        cleanupDetails.push({ einheit_id: entwurf.id, ...result });
        console.log(`[cleanupOldDrafts] Gelöscht: Einheit ${entwurf.id} — ${result.totalDeleted} Einträge entfernt.`);
      } catch (err) {
        console.error(`[cleanupOldDrafts] Fehler bei Einheit ${entwurf.id}:`, err.message);
        errors.push({ id: entwurf.id, error: err.message });
      }
    }

    console.log(`[cleanupOldDrafts] Abgeschlossen. ${deletedIds.length} Entwürfe gelöscht, ${totalDeleted} Datensätze entfernt, ${errors.length} Fehler.`);

    return Response.json({
      success: true,
      deleted_drafts: deletedIds.length,
      deleted_ids: deletedIds,
      total_records_deleted: totalDeleted,
      cleanup_details: cleanupDetails,
      errors,
    });
  } catch (error) {
    console.error('[cleanupOldDrafts] Kritischer Fehler:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});