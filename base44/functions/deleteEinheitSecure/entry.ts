/**
 * deleteEinheitSecure.js
 *
 * Sichere manuelle DELETE-Operation für Einheiten mit:
 * - RBAC-Validierung
 * - vollständiger, paginierter Batch-Löschkaskade
 * - Audit Logging
 *
 * Supabase-Migrationsnotiz:
 * JavaScript-basiertes Cascade-Delete ist für relationale Datenbanken ein Anti-Pattern.
 * In Supabase/PostgreSQL müssen abhängige Tabellen per Foreign Key mit ON DELETE CASCADE
 * angebunden werden. Der Ausführungsteil reduziert sich dann auf:
 * DELETE FROM einheiten WHERE id = :einheitId;
 * Das Backend bleibt nur noch für RBAC und Audit verantwortlich.
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

async function deleteInBatches(entity, records) {
  let deleted = 0;

  for (let i = 0; i < records.length; i += DELETE_BATCH_SIZE) {
    const batch = records.slice(i, i + DELETE_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(record => entity.delete(record.id)));
    deleted += results.filter(result => result.status === 'fulfilled').length;
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

  const lernziele = lernzielePages.flat();
  const aufgabenbausteine = aufgabenPages.flat();
  const lernpaketAktivitaeten = aktivitaetenPages.flat();
  const masterAufgaben = masterPages.flat();

  const [mappingPages, allgMappingPages] = await Promise.all([
    Promise.all(aufgabenbausteine.map(aufgabe => listAll(e.MappingAufgabeBasisziel, { aufgabe_id: aufgabe.id }))),
    Promise.all(allgemeineAufgaben.map(aufgabe => listAll(e.AllgemeineAufgabeLernzielMapping, { aufgabe_id: aufgabe.id }))),
  ]);

  return {
    oldAuditLogs,
    exportPrompts,
    memberships,
    generatedFiles,
    mappings: mappingPages.flat(),
    allgMappings: allgMappingPages.flat(),
    aufgabenbausteine,
    lernziele,
    masterAufgaben,
    lernpaketAktivitaeten,
    allgemeineAufgaben,
    lernpakete,
    themenfelder,
    members,
  };
}

/**
 * Main Handler
 */
Deno.serve(async (req) => {
  // Allow OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    // 1. Initialize Base44 Client
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse ID from payload (invoked via base44.functions.invoke)
    const payload = await req.json();
    const einheitId = payload?.einheit_id;

    if (!einheitId) {
      return Response.json({ error: 'Missing einheit_id in payload' }, { status: 400 });
    }

    // 3. Fetch target entity
    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // 4. RBAC Check: Auth-Admin, Profilrolle, Fachzuständigkeit und LEITUNG-Membership sauber kombinieren
    const [benutzerList, membershipList] = await Promise.all([
      listAll(base44.asServiceRole.entities.Benutzer, { user_id: user.email }),
      listAll(base44.asServiceRole.entities.EinheitMembers, { einheit_id: einheitId, user_email: user.email }),
    ]);

    const benutzer = benutzerList?.[0];
    const profilRole = benutzer?.rolle;
    const subjects = benutzer?.fachbereich_zustaendigkeit || [];
    const isAuthAdmin = user.role === 'admin';
    const isProfilAdmin = profilRole === 'Administrator';
    // fach_ausnahmen: eine Fachschaftsleitung kann für einzelne Fächer auf
    // Fachlehrkraft herabgestuft sein — dann gilt sie dort NICHT als Leitung.
    const ausnahme = (benutzer?.fach_ausnahmen || []).find((a) => a?.fach === einheit.fach);
    const effektiveRolle = ausnahme ? ausnahme.rolle : profilRole;
    const isResponsibleLead = effektiveRolle === 'Fachschaftsleitung' && subjects.includes(einheit.fach);
    const isUnitLead = membershipList.some(member => member.unit_role === 'LEITUNG');
    const istPrivat = einheit.sichtbarkeit === 'privat';
    const istPrivatBesitzer = istPrivat && einheit.besitzer_email === user.email;

    // Löschregeln (2026-07-18):
    //  - Wizard-Entwürfe darf der Ersteller selbst löschen (Abbrechen-Flow).
    //  - ÖFFENTLICHE Einheiten: NUR Administratoren und die zuständige
    //    Fachschaftsleitung. Eine Unit-LEITUNG-Mitgliedschaft allein genügt
    //    bei öffentlichen Einheiten ausdrücklich NICHT.
    //  - PRIVATE Einheiten: zusätzlich der Besitzer bzw. die Unit-Leitung.
    const allowed = Boolean(
      (einheit.wizard_status === 'entwurf' && einheit.created_by === user.email) ||
      isAuthAdmin ||
      isProfilAdmin ||
      isResponsibleLead ||
      (istPrivat && (istPrivatBesitzer || isUnitLead))
    );

    const rbacReason = allowed
      ? ''
      : `Keine Löschberechtigung für diese Einheit. Auth-Rolle: ${user.role || 'unbekannt'}, Profilrolle: ${profilRole || 'unbekannt'}`;

    const rbacCheck = { allowed, reason: rbacReason };
    if (!rbacCheck.allowed) {
      // Log failed attempt to AuditLog
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'DELETE',
          resource_type: 'Einheiten',
          resource_id: einheitId,
          status: 'failed',
          error_message: rbacCheck.reason || 'Permission denied',
        });
      } catch (logError) {
        console.error('Audit log error:', logError.message);
      }

      return Response.json(
        { error: rbacCheck.reason || 'Permission denied' },
        {
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 5. Cascade vollständig sammeln und in sicherer Reihenfolge löschen
    const e = base44.asServiceRole.entities;
    const cascade = await collectEinheitCascade(e, einheitId);

    const plannedCounts = Object.fromEntries(
      Object.entries(cascade).map(([key, records]) => [key, records.length])
    );

    console.log('[deleteEinheitSecure] Gefundene abhängige Datensätze:', plannedCounts);

    const deletedCounts = {};
    deletedCounts.oldAuditLogs = await deleteInBatches(e.AuditLog, cascade.oldAuditLogs);
    deletedCounts.exportPrompts = await deleteInBatches(e.ExportPrompts, cascade.exportPrompts);
    deletedCounts.memberships = await deleteInBatches(e.LernpfadAufgabeMembership, cascade.memberships);
    deletedCounts.generatedFiles = await deleteInBatches(e.MBKGeneratedFile, cascade.generatedFiles);
    deletedCounts.mappings = await deleteInBatches(e.MappingAufgabeBasisziel, cascade.mappings);
    deletedCounts.allgMappings = await deleteInBatches(e.AllgemeineAufgabeLernzielMapping, cascade.allgMappings);
    deletedCounts.aufgabenbausteine = await deleteInBatches(e.Aufgabenbausteine, cascade.aufgabenbausteine);
    deletedCounts.lernziele = await deleteInBatches(e.Lernziele, cascade.lernziele);
    deletedCounts.masterAufgaben = await deleteInBatches(e.MasterAufgabe, cascade.masterAufgaben);
    deletedCounts.lernpaketAktivitaeten = await deleteInBatches(e.LernpaketPhaseAktivitaet, cascade.lernpaketAktivitaeten);
    deletedCounts.allgemeineAufgaben = await deleteInBatches(e.AllgemeineAufgabe, cascade.allgemeineAufgaben);
    deletedCounts.lernpakete = await deleteInBatches(e.Lernpakete, cascade.lernpakete);
    deletedCounts.themenfelder = await deleteInBatches(e.Themenfeld, cascade.themenfelder);
    deletedCounts.members = await deleteInBatches(e.EinheitMembers, cascade.members);

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

    // 6. Return Success
    return Response.json(
      {
        success: true,
        deleted_count: totalDeletedBeforeEinheit + 1,
        deleted_counts: deletedCounts,
        message: `Einheit und ${totalDeletedBeforeEinheit} abhängige Datensätze gelöscht`,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[DELETE_EINHEIT_ERROR]', error);

    return Response.json(
      {
        error: error.message || 'Internal server error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  }
});