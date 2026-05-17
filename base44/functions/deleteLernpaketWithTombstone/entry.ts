/**
 * deleteLernpaketWithTombstone.js
 *
 * Sicherer kaskadierender Soft-Delete für Lernpakete mit Tombstone-Prinzip:
 * - validiert Auth, RBAC, Export-Lock und Struktur-Lock
 * - markiert Lernpaket, Lernziele, Aufgabenbausteine, Aktivitäten und MasterAufgaben als sync_status='to_delete'
 * - entfernt Lernpfad-Referenzen und Memberships paginiert
 * - schreibt ein AuditLog
 *
 * Supabase-Migrationsnotiz:
 * Bei PostgreSQL/Supabase sollte diese Soft-Delete-Kaskade nicht in JavaScript laufen.
 * Ein AFTER UPDATE Trigger auf lernpakete kann bei NEW.sync_status='to_delete' alle Kind-Elemente
 * atomar und transaktionssicher auf sync_status='to_delete' setzen.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;
const STRUCTURAL_LOCK_TIMEOUT_MS = 60 * 60 * 1000;

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

function isStructuralLockActive(einheit) {
  if (!einheit?.structural_lock || !einheit?.structural_locked_at) return false;
  return Date.now() - new Date(einheit.structural_locked_at).getTime() < STRUCTURAL_LOCK_TIMEOUT_MS;
}

function cleanDashboardReferences(konfig, lernpaketId) {
  if (!konfig || typeof konfig !== 'object') {
    return { next: konfig, removedItemCount: 0, changed: false };
  }

  let changed = false;
  let removedItemCount = 0;
  const next = {};

  for (const lt of ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert']) {
    const sektoren = Array.isArray(konfig[lt]) ? konfig[lt] : [];
    next[lt] = sektoren.map((sektor) => {
      const items = Array.isArray(sektor?.items) ? sektor.items : [];
      const filtered = items.filter((item) => {
        if (item?.type === 'aufgabe' && item.ref_id === lernpaketId) {
          removedItemCount += 1;
          return false;
        }
        return true;
      });

      if (filtered.length !== items.length) {
        changed = true;
        return { ...sektor, items: filtered };
      }

      return sektor;
    });
  }

  return { next, removedItemCount, changed };
}

async function updateAllSettled(entity, records, updates, label) {
  if (records.length === 0) return { updated: 0, failed: 0 };

  const results = await Promise.allSettled(
    records.map(record => entity.update(record.id, updates))
  );
  const failed = results.filter(result => result.status === 'rejected').length;

  if (failed > 0) {
    console.warn(`[deleteLernpaketWithTombstone] ${label}: ${failed} Updates fehlgeschlagen`);
  }

  return { updated: results.length - failed, failed };
}

async function deleteAllSettled(entity, records, label) {
  if (records.length === 0) return { deleted: 0, failed: 0 };

  const results = await Promise.allSettled(
    records.map(record => entity.delete(record.id))
  );
  const failed = results.filter(result => result.status === 'rejected').length;

  if (failed > 0) {
    console.warn(`[deleteLernpaketWithTombstone] ${label}: ${failed} Deletes fehlgeschlagen`);
  }

  return { deleted: results.length - failed, failed };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const lernpaketId = body?.lernpaket_id || body?.lernpaketId || body?.paketId;

    if (!lernpaketId) {
      return Response.json({ error: 'Missing lernpaket_id' }, { status: 400 });
    }

    const e = base44.asServiceRole.entities;
    const lernpakete = await e.Lernpakete.filter({ id: lernpaketId });
    const lernpaket = lernpakete?.[0];

    if (!lernpaket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    const einheiten = await e.Einheiten.filter({ id: lernpaket.einheit_id });
    const einheit = einheiten?.[0];

    if (!einheit) {
      return Response.json({ error: 'Associated Einheit not found' }, { status: 404 });
    }

    const [benutzer, unitMemberships] = await Promise.all([
      listAll(e.Benutzer, { user_id: user.email }),
      listAll(e.EinheitMembers, { einheit_id: einheit.id, user_email: user.email }),
    ]);

    const profil = benutzer?.[0];
    const rolle = profil?.rolle || 'Betrachter';
    const faecher = profil?.fachbereich_zustaendigkeit || [];
    const unitRole = unitMemberships?.[0]?.unit_role;
    const canDelete = Boolean(
      user.role === 'admin' ||
      rolle === 'Administrator' ||
      (rolle === 'Fachschaftsleitung' && faecher.includes(einheit.fach)) ||
      ['LEITUNG', 'EDITOR'].includes(unitRole)
    );

    if (!canDelete) {
      return Response.json({ error: 'No delete permission', code: 'INSUFFICIENT_PERMISSION' }, { status: 403 });
    }

    if (
      einheit.export_locked === true ||
      einheit.moodle_sync_status === 'locked' ||
      lernpaket.export_locked === true ||
      lernpaket.moodle_sync_status === 'locked' ||
      ['final_freigegeben', 'export_running', 'published'].includes(einheit.export_lifecycle_status)
    ) {
      return Response.json(
        { error: 'Delete abgelehnt: Einheit ist für Export oder Veröffentlichung gesperrt.', code: 'EXPORT_LOCKED' },
        { status: 423 }
      );
    }

    if (isStructuralLockActive(einheit)) {
      return Response.json(
        { error: 'Delete abgelehnt: Die Struktur dieser Einheit wird gerade bearbeitet.', code: 'STRUCTURAL_LOCKED', locked_by: einheit.structural_lock },
        { status: 409 }
      );
    }

    const [lernziele, aufgabenbausteine, aktivitaeten, masterAufgaben, memberships] = await Promise.all([
      listAll(e.Lernziele, { lernpaket_id: lernpaketId }),
      listAll(e.Aufgabenbausteine, { lernpaket_id: lernpaketId }),
      listAll(e.LernpaketPhaseAktivitaet, { lernpaket_id: lernpaketId }),
      listAll(e.MasterAufgabe, { lernpaket_id: lernpaketId }),
      listAll(e.LernpfadAufgabeMembership, { einheit_id: einheit.id, aufgabe_id: lernpaketId }),
    ]);

    const tombstoneUpdate = { sync_status: 'to_delete' };
    const [lernzieleResult, aufgabenResult, aktivitaetenResult, masterResult] = await Promise.all([
      updateAllSettled(e.Lernziele, lernziele, tombstoneUpdate, 'Lernziele'),
      updateAllSettled(e.Aufgabenbausteine, aufgabenbausteine, tombstoneUpdate, 'Aufgabenbausteine'),
      updateAllSettled(e.LernpaketPhaseAktivitaet, aktivitaeten, tombstoneUpdate, 'LernpaketPhaseAktivitaet'),
      updateAllSettled(e.MasterAufgabe, masterAufgaben, tombstoneUpdate, 'MasterAufgabe'),
    ]);

    const failedChildUpdates = lernzieleResult.failed + aufgabenResult.failed + aktivitaetenResult.failed + masterResult.failed;
    if (failedChildUpdates > 0) {
      await e.AuditLog.create({
        user_email: user.email,
        action: 'DELETE',
        resource_type: 'Lernpakete',
        resource_id: lernpaketId,
        changes: {
          tombstone: true,
          aborted_before_parent_update: true,
          failed_child_updates: failedChildUpdates,
          lernziele: lernzieleResult,
          aufgabenbausteine: aufgabenResult,
          aktivitaeten: aktivitaetenResult,
          master_aufgaben: masterResult,
        },
        affected_count: lernzieleResult.updated + aufgabenResult.updated + aktivitaetenResult.updated + masterResult.updated,
        status: 'failed',
        error_message: `${failedChildUpdates} Kind-Elemente konnten nicht markiert werden`,
      });

      return Response.json(
        { error: 'Tombstone-Kaskade unvollständig; Lernpaket wurde nicht gelöscht.', code: 'CASCADE_FAILED', failed_child_updates: failedChildUpdates },
        { status: 500 }
      );
    }

    const updated = await e.Lernpakete.update(lernpaketId, {
      sync_status: 'to_delete',
      is_locked: null,
      locked_by_email: null,
      locked_at: null,
    });

    const dashboardCleanup = cleanDashboardReferences(einheit.lernpfade_konfiguration, lernpaketId);
    if (dashboardCleanup.changed) {
      await e.Einheiten.update(einheit.id, {
        lernpfade_konfiguration: dashboardCleanup.next,
      });
    }

    const membershipResult = await deleteAllSettled(e.LernpfadAufgabeMembership, memberships, 'LernpfadAufgabeMembership');

    await e.AuditLog.create({
      user_email: user.email,
      action: 'DELETE',
      resource_type: 'Lernpakete',
      resource_id: lernpaketId,
      changes: {
        tombstone: true,
        sync_status: 'to_delete',
        einheit_id: einheit.id,
        granted_by: user.role === 'admin' ? 'auth_admin' : rolle,
        unit_role: unitRole || null,
        lernziele: lernzieleResult,
        aufgabenbausteine: aufgabenResult,
        aktivitaeten: aktivitaetenResult,
        master_aufgaben: masterResult,
        dashboard_items_removed: dashboardCleanup.removedItemCount,
        memberships_deleted: membershipResult.deleted,
        memberships_failed: membershipResult.failed,
      },
      affected_count:
        1 +
        lernzieleResult.updated +
        aufgabenResult.updated +
        aktivitaetenResult.updated +
        masterResult.updated +
        membershipResult.deleted,
      status: membershipResult.failed > 0 ? 'failed' : 'success',
      error_message: membershipResult.failed > 0 ? `${membershipResult.failed} Memberships konnten nicht gelöscht werden` : null,
    });

    console.info(
      `[deleteLernpaketWithTombstone] Lernpaket ${lernpaketId} tombstoned ` +
      `(${lernzieleResult.updated} Lernziele, ${aufgabenResult.updated} Aufgabenbausteine, ` +
      `${aktivitaetenResult.updated} Aktivitäten, ${masterResult.updated} MasterAufgaben)`
    );

    return Response.json({
      success: true,
      message: 'Lernpaket und alle Kind-Elemente als "to_delete" markiert',
      lernpaket: updated,
      cascaded: {
        lernziele_count: lernzieleResult.updated,
        aufgabenbausteine_count: aufgabenResult.updated,
        aktivitaeten_count: aktivitaetenResult.updated,
        master_aufgaben_count: masterResult.updated,
        dashboard_items_removed: dashboardCleanup.removedItemCount,
        memberships_deleted: membershipResult.deleted,
        memberships_failed: membershipResult.failed,
      },
    });
  } catch (error) {
    console.error('[deleteLernpaketWithTombstone] Error:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
});