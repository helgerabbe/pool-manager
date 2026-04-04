/**
 * cleanupOldDrafts.js
 *
 * Bereinigt veraltete Wizard-Entwürfe (wizard_status === 'entwurf'),
 * die seit mehr als 30 Tagen nicht mehr bearbeitet wurden.
 *
 * Wird als geplante Automation (täglich) ausgeführt.
 * Nutzt Service-Role, da benutzerübergreifend.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function cascadeDelete(base44, entityName, id, currentDepth = 0) {
  if (currentDepth >= 10) return 0;

  const dependencyMap = {
    Einheiten: [
      { entity: 'Themenfeld',     fk: 'einheit_id' },
      { entity: 'Lernpakete',     fk: 'einheit_id' },
      { entity: 'EinheitMembers', fk: 'einheit_id' },
    ],
    Themenfeld: [
      { entity: 'Lernpakete', fk: 'themenfeld_id' },
    ],
    Lernpakete: [
      { entity: 'Lernziele',            fk: 'lernpaket_id' },
      { entity: 'Aufgabenbausteine',     fk: 'lernpaket_id' },
      { entity: 'LernpaketAktivitaet',   fk: 'lernpaket_id' },
    ],
    Lernziele: [],
    Aufgabenbausteine: [
      { entity: 'MappingAufgabeBasisziel', fk: 'aufgabe_id' },
    ],
  };

  let totalDeleted = 1;
  const dependencies = dependencyMap[entityName] || [];

  for (const dep of dependencies) {
    const children = await base44.asServiceRole.entities[dep.entity].filter({ [dep.fk]: id });
    for (const child of children) {
      totalDeleted += await cascadeDelete(base44, dep.entity, child.id, currentDepth + 1);
    }
  }

  await base44.asServiceRole.entities[entityName].delete(id);
  return totalDeleted;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Service-Role-Zugriff: kein User-Auth erforderlich (Scheduled Automation)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffIso = cutoffDate.toISOString();

    // Alle Entwürfe laden
    const allEinheiten = await base44.asServiceRole.entities.Einheiten.filter({
      wizard_status: 'entwurf',
    });

    // Filtern: updated_date (built-in) älter als 30 Tage
    const expiredDrafts = allEinheiten.filter(e => {
      const lastUpdated = e.updated_date || e.created_date;
      return lastUpdated < cutoffIso;
    });

    console.log(`[cleanupOldDrafts] Gefunden: ${expiredDrafts.length} veraltete Entwürfe (älter als 30 Tage).`);

    let totalDeleted = 0;
    let deletedIds = [];
    let errors = [];

    for (const entwurf of expiredDrafts) {
      try {
        const count = await cascadeDelete(base44, 'Einheiten', entwurf.id);
        totalDeleted += count;
        deletedIds.push(entwurf.id);
        console.log(`[cleanupOldDrafts] Gelöscht: Einheit ${entwurf.id} ("${entwurf.titel_der_einheit}") — ${count} Einträge entfernt.`);

        // Audit-Log
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: 'system@cleanup',
          action: 'DELETE',
          resource_type: 'Einheiten',
          resource_id: entwurf.id,
          affected_count: count,
          status: 'success',
          changes: { reason: 'Automatische Bereinigung: Entwurf älter als 30 Tage' },
        });
      } catch (err) {
        console.error(`[cleanupOldDrafts] Fehler bei Einheit ${entwurf.id}:`, err.message);
        errors.push({ id: entwurf.id, error: err.message });
      }
    }

    console.log(`[cleanupOldDrafts] Abgeschlossen. ${deletedIds.length} Entwürfe gelöscht, ${totalDeleted} Datensätze entfernt, ${errors.length} Fehler.`);

    return Response.json({
      success: true,
      deleted_drafts: deletedIds.length,
      total_records_deleted: totalDeleted,
      errors,
    });
  } catch (error) {
    console.error('[cleanupOldDrafts] Kritischer Fehler:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});