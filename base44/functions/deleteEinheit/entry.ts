/**
 * Manuelle harte Löschung einer Einheit.
 *
 * Supabase-Migrationsnotiz:
 * Diese JavaScript-Löschkaskade ist in PostgreSQL/Supabase ein Anti-Pattern.
 * Zielarchitektur: alle abhängigen Tabellen erhalten Foreign Keys mit
 * ON DELETE CASCADE. Dann reicht serverseitig ein einziger Befehl:
 * DELETE FROM einheiten WHERE id = :einheitId;
 * PostgreSQL löscht alle abhängigen Datensätze atomar und transaktionssicher.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLLEN = {
  ADMIN: 'admin',
  FACHSCHAFT: 'Fachschaftsleitung',
};

const PAGE_SIZE = 500;
const DELETE_BATCH_SIZE = 25;

function uniqueById(records) {
  return Array.from(new Map(records.map(record => [record.id, record])).values());
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

async function deleteInBatches(entity, records) {
  let deleted = 0;
  for (let i = 0; i < records.length; i += DELETE_BATCH_SIZE) {
    const batch = records.slice(i, i + DELETE_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(record => entity.delete(record.id)));
    deleted += results.filter(result => result.status === 'fulfilled').length;
  }
  return deleted;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { einheitId } = await req.json();

    if (!einheitId) {
      return Response.json({ error: 'einheitId fehlt' }, { status: 400 });
    }

    // Auth prüfen
    let user;
    try {
      user = await base44.auth.me();
    } catch (err) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: Nur Admins dürfen löschen
    if (user.role !== ROLLEN.ADMIN) {
      return Response.json(
        { error: `Nur Administratoren dürfen Einheiten löschen. Ihre Rolle: ${user.role}` },
        { status: 403 }
      );
    }

    // Einheit laden
    const einheitArr = await base44.asServiceRole.entities.Einheiten.filter({ id: einheitId });
    const einheit = einheitArr[0];
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    console.log('Lösche Einheit:', einheit.id, einheit.titel_der_einheit);

    // ── Cascade: Daten vollständig paginiert sammeln ─────────────────────────
    const e = base44.asServiceRole.entities;

    const [themenfelder, lernpaketeByEinheit, allgemeineAufgaben, members, exportPrompts, memberships, generatedFiles, auditLogs] = await Promise.all([
      listAll(e.Themenfeld, { einheit_id: einheitId }),
      listAll(e.Lernpakete, { einheit_id: einheitId }),
      listAll(e.AllgemeineAufgabe, { einheit_id: einheitId }),
      listAll(e.EinheitMembers, { einheit_id: einheitId }),
      listAll(e.ExportPrompts, { einheit_id: einheitId }),
      listAll(e.LernpfadAufgabeMembership, { einheit_id: einheitId }),
      listAll(e.MBKGeneratedFile, { einheit_id: einheitId }),
      listAll(e.AuditLog, { resource_type: 'Einheiten', resource_id: einheitId }),
    ]);

    const lernpaketeByThemenfeldPages = await Promise.all(
      themenfelder.map(themenfeld => listAll(e.Lernpakete, { themenfeld_id: themenfeld.id }))
    );
    const lernpakete = uniqueById([...lernpaketeByEinheit, ...lernpaketeByThemenfeldPages.flat()]);

    const [lernzielePages, aufgabenPages, aktivitaetenPages, masterPages] = await Promise.all([
      Promise.all(lernpakete.map(paket => listAll(e.Lernziele, { lernpaket_id: paket.id }))),
      Promise.all(lernpakete.map(paket => listAll(e.Aufgabenbausteine, { lernpaket_id: paket.id }))),
      Promise.all(lernpakete.map(paket => listAll(e.LernpaketPhaseAktivitaet, { lernpaket_id: paket.id }))),
      Promise.all(lernpakete.map(paket => listAll(e.MasterAufgabe, { lernpaket_id: paket.id }))),
    ]);

    const lernziele = lernzielePages.flat();
    const aufgaben = aufgabenPages.flat();
    const lernpaketAktivitaeten = aktivitaetenPages.flat();
    const masterAufgaben = masterPages.flat();

    const [mappingPages, allgMappingPages] = await Promise.all([
      Promise.all(aufgaben.map(aufgabe => listAll(e.MappingAufgabeBasisziel, { aufgabe_id: aufgabe.id }))),
      Promise.all(allgemeineAufgaben.map(aufgabe => listAll(e.AllgemeineAufgabeLernzielMapping, { aufgabe_id: aufgabe.id }))),
    ]);

    const mappings = mappingPages.flat();
    const allgMappings = allgMappingPages.flat();

    const countsToDelete = {
      auditLogs: auditLogs.length,
      exportPrompts: exportPrompts.length,
      memberships: memberships.length,
      generatedFiles: generatedFiles.length,
      mappings: mappings.length,
      allgMappings: allgMappings.length,
      aufgabenbausteine: aufgaben.length,
      lernziele: lernziele.length,
      masterAufgaben: masterAufgaben.length,
      lernpaketAktivitaeten: lernpaketAktivitaeten.length,
      allgemeineAufgaben: allgemeineAufgaben.length,
      lernpakete: lernpakete.length,
      themenfelder: themenfelder.length,
      members: members.length,
    };

    console.log('[deleteEinheit] Gefundene abhängige Datensätze:', countsToDelete);

    const deletedCounts = {};
    deletedCounts.auditLogs = await deleteInBatches(e.AuditLog, auditLogs);
    deletedCounts.exportPrompts = await deleteInBatches(e.ExportPrompts, exportPrompts);
    deletedCounts.memberships = await deleteInBatches(e.LernpfadAufgabeMembership, memberships);
    deletedCounts.generatedFiles = await deleteInBatches(e.MBKGeneratedFile, generatedFiles);
    deletedCounts.mappings = await deleteInBatches(e.MappingAufgabeBasisziel, mappings);
    deletedCounts.allgMappings = await deleteInBatches(e.AllgemeineAufgabeLernzielMapping, allgMappings);
    deletedCounts.aufgabenbausteine = await deleteInBatches(e.Aufgabenbausteine, aufgaben);
    deletedCounts.lernziele = await deleteInBatches(e.Lernziele, lernziele);
    deletedCounts.masterAufgaben = await deleteInBatches(e.MasterAufgabe, masterAufgaben);
    deletedCounts.lernpaketAktivitaeten = await deleteInBatches(e.LernpaketPhaseAktivitaet, lernpaketAktivitaeten);
    deletedCounts.allgemeineAufgaben = await deleteInBatches(e.AllgemeineAufgabe, allgemeineAufgaben);
    deletedCounts.lernpakete = await deleteInBatches(e.Lernpakete, lernpakete);
    deletedCounts.themenfelder = await deleteInBatches(e.Themenfeld, themenfelder);
    deletedCounts.members = await deleteInBatches(e.EinheitMembers, members);

    const totalDeletedBeforeEinheit = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    try {
      await e.AuditLog.create({
        user_email: user.email,
        action: 'DELETE',
        resource_type: 'Einheiten',
        resource_id: einheitId,
        changes: {
          manual_delete: true,
          action_code: 'DELETE_UNIT_MANUAL',
          titel_der_einheit: einheit.titel_der_einheit,
          planned_counts: countsToDelete,
          deleted_counts: deletedCounts,
        },
        affected_count: totalDeletedBeforeEinheit + 1,
        status: 'success',
      });
    } catch (auditError) {
      console.error('[deleteEinheit] AuditLog konnte vor finalem Delete nicht geschrieben werden:', auditError?.message);
    }

    await e.Einheiten.delete(einheitId);
    console.log(`✓ Einheit gelöscht`);

    return Response.json({
      success: true,
      message: `Einheit und alle abhängigen Records wurden gelöscht`,
      deletedCounts: {
        ...deletedCounts,
        einheit: 1,
      },
    });
  } catch (err) {
    console.error('deleteEinheit error:', err.message, err.stack);
    return Response.json(
      { error: err.message || 'Fehler beim Löschen' },
      { status: 500 }
    );
  }
});