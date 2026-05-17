/**
 * Sichere manuelle Delete-Funktion mit vollständiger Batch-Kaskade.
 *
 * Supabase-Migrationsnotiz:
 * Die JavaScript-basierte Löschkaskade ist ein Anti-Pattern und entfällt in Supabase.
 * Mit PostgreSQL Foreign Keys und ON DELETE CASCADE reicht künftig ein einziger Befehl:
 * DELETE FROM einheiten WHERE id = :einheitId;
 * Das Backend bleibt dann nur für RBAC und Audit zuständig.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

async function deleteInBatches(entity, records, label) {
  let deleted = 0;

  for (let i = 0; i < records.length; i += DELETE_BATCH_SIZE) {
    const batch = records.slice(i, i + DELETE_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(record => entity.delete(record.id)));
    const failures = results.filter(result => result.status === 'rejected');

    if (failures.length > 0) {
      throw new Error(`${label}: ${failures.length} Datensätze konnten nicht gelöscht werden`);
    }

    deleted += results.length;
  }

  return deleted;
}

async function collectEinheitCascade(e, einheitId) {
  const [themenfelder, lernpaketeByEinheit, allgemeineAufgaben, members, exportPrompts, memberships, generatedFiles, oldAuditLogs] = await Promise.all([
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

  const aufgabenbausteine = aufgabenPages.flat();
  const allgemeineAufgabeIds = allgemeineAufgaben.map(aufgabe => aufgabe.id);

  const [mappingPages, allgMappingPages, basisMappingPages] = await Promise.all([
    Promise.all(aufgabenbausteine.map(aufgabe => listAll(e.MappingAufgabeBasisziel, { aufgabe_id: aufgabe.id }))),
    Promise.all(allgemeineAufgaben.map(aufgabe => listAll(e.AllgemeineAufgabeLernzielMapping, { aufgabe_id: aufgabe.id }))),
    Promise.all(allgemeineAufgabeIds.map(aufgabeId => listAll(e.AllgemeineAufgabeBasisLernzielMapping, { aufgabe_id: aufgabeId }))),
  ]);

  return {
    oldAuditLogs,
    exportPrompts,
    memberships,
    generatedFiles,
    mappings: mappingPages.flat(),
    allgMappings: allgMappingPages.flat(),
    basisMappings: basisMappingPages.flat(),
    aufgabenbausteine,
    lernziele: lernzielePages.flat(),
    masterAufgaben: masterPages.flat(),
    lernpaketAktivitaeten: aktivitaetenPages.flat(),
    allgemeineAufgaben,
    lernpakete,
    themenfelder,
    members,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const einheitId = payload?.einheit_id || payload?.einheitId;

    if (!einheitId) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // RBAC Check: Auth-Admin, Profilrolle, Fachzuständigkeit, Eigentümer-Entwurf und LEITUNG-Membership
    const e = base44.asServiceRole.entities;
    const [benutzer, memberships] = await Promise.all([
      listAll(e.Benutzer, { user_id: user.email }),
      listAll(e.EinheitMembers, { einheit_id: einheitId, user_email: user.email }),
    ]);

    const userRecord = benutzer?.[0];
    const profilRole = userRecord?.rolle;
    const subjects = userRecord?.fachbereich_zustaendigkeit || [];
    const allowed = Boolean(
      user.role === 'admin' ||
      profilRole === 'Administrator' ||
      (einheit.wizard_status === 'entwurf' && einheit.created_by === user.email) ||
      (profilRole === 'Fachschaftsleitung' && subjects.includes(einheit.fach)) ||
      memberships.some(member => member.unit_role === 'LEITUNG')
    );

    if (!allowed) {
      return Response.json({ error: 'No delete permission' }, { status: 403 });
    }

    // Cascade vollständig sammeln und in sicherer Reihenfolge löschen
    const cascade = await collectEinheitCascade(e, einheitId);
    const plannedCounts = Object.fromEntries(
      Object.entries(cascade).map(([key, records]) => [key, records.length])
    );

    console.log('[deleteEinheitWithCascade] Gefundene abhängige Datensätze:', plannedCounts);

    const deletedCounts = {};
    deletedCounts.oldAuditLogs = await deleteInBatches(e.AuditLog, cascade.oldAuditLogs, 'AuditLog');
    deletedCounts.exportPrompts = await deleteInBatches(e.ExportPrompts, cascade.exportPrompts, 'ExportPrompts');
    deletedCounts.memberships = await deleteInBatches(e.LernpfadAufgabeMembership, cascade.memberships, 'LernpfadAufgabeMembership');
    deletedCounts.generatedFiles = await deleteInBatches(e.MBKGeneratedFile, cascade.generatedFiles, 'MBKGeneratedFile');
    deletedCounts.mappings = await deleteInBatches(e.MappingAufgabeBasisziel, cascade.mappings, 'MappingAufgabeBasisziel');
    deletedCounts.allgMappings = await deleteInBatches(e.AllgemeineAufgabeLernzielMapping, cascade.allgMappings, 'AllgemeineAufgabeLernzielMapping');
    deletedCounts.basisMappings = await deleteInBatches(e.AllgemeineAufgabeBasisLernzielMapping, cascade.basisMappings, 'AllgemeineAufgabeBasisLernzielMapping');
    deletedCounts.aufgabenbausteine = await deleteInBatches(e.Aufgabenbausteine, cascade.aufgabenbausteine, 'Aufgabenbausteine');
    deletedCounts.lernziele = await deleteInBatches(e.Lernziele, cascade.lernziele, 'Lernziele');
    deletedCounts.masterAufgaben = await deleteInBatches(e.MasterAufgabe, cascade.masterAufgaben, 'MasterAufgabe');
    deletedCounts.lernpaketAktivitaeten = await deleteInBatches(e.LernpaketPhaseAktivitaet, cascade.lernpaketAktivitaeten, 'LernpaketPhaseAktivitaet');
    deletedCounts.allgemeineAufgaben = await deleteInBatches(e.AllgemeineAufgabe, cascade.allgemeineAufgaben, 'AllgemeineAufgabe');
    deletedCounts.lernpakete = await deleteInBatches(e.Lernpakete, cascade.lernpakete, 'Lernpakete');
    deletedCounts.themenfelder = await deleteInBatches(e.Themenfeld, cascade.themenfelder, 'Themenfeld');
    deletedCounts.members = await deleteInBatches(e.EinheitMembers, cascade.members, 'EinheitMembers');

    const totalDeletedBeforeEinheit = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    await e.AuditLog.create({
      user_email: user.email,
      action: 'DELETE',
      resource_type: 'Einheiten',
      resource_id: einheitId,
      changes: {
        manual_delete: true,
        action_code: 'DELETE_UNIT_MANUAL',
        titel_der_einheit: einheit.titel_der_einheit,
        planned_counts: plannedCounts,
        deleted_counts: deletedCounts,
      },
      affected_count: totalDeletedBeforeEinheit + 1,
      status: 'success',
    });

    await e.Einheiten.delete(einheitId);
    deletedCounts.einheit = 1;

    return Response.json({
      success: true,
      deleted_count: totalDeletedBeforeEinheit + 1,
      deleted_counts: deletedCounts,
      message: `Einheit und ${totalDeletedBeforeEinheit} abhängige Datensätze gelöscht`,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});