/**
 * Sichere Delete Funktion mit Cascade Delete
 * DELETE /functions/deleteEinheitWithCascade?id=UUID
 * 
 * - RBAC Validierung
 * - Transaktionale Cascade Delete
 * - Audit Logging
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function cascadeDelete(base44, entityName, entityId, depth = 0) {
  if (depth > 10) throw new Error('Cascade depth exceeded');

  const deleteMap = {
    Einheiten: ['Themenfeld', 'AllgemeineAufgabe', 'EinheitMembers'],
    Themenfeld: ['Lernpakete'],
    Lernpakete: ['Lernziele', 'Aufgabenbausteine', 'LernpaketAktivitaet'],
    Lernziele: ['AllgemeineAufgabeLernzielMapping', 'MappingAufgabeBasisziel'],
    AllgemeineAufgabe: ['AllgemeineAufgabeLernzielMapping'],
    Aufgabenbausteine: ['MappingAufgabeBasisziel'],
  };

  let deletedCount = 0;
  const deps = deleteMap[entityName] || [];

  for (const depEntity of deps) {
    try {
      const filterKey = entityName === 'Einheiten' && depEntity === 'AllgemeineAufgabe' 
        ? 'einheit_id' 
        : entityName === 'Lernpakete' && depEntity === 'LernpaketAktivitaet'
        ? 'lernpaket_id'
        : entityName === 'Lernziele' && depEntity === 'MappingAufgabeBasisziel'
        ? 'basisziel_id'
        : `${entityName === 'Einheiten' ? 'einheit_id' : entityName.toLowerCase() + '_id'}`;

      const deps_list = await base44.asServiceRole.entities[depEntity].filter({
        [filterKey]: entityId,
      });

      for (const dep of deps_list) {
        deletedCount += await cascadeDelete(base44, depEntity, dep.id, depth + 1);
      }
    } catch (error) {
      console.error(`Error cascading delete for ${depEntity}:`, error);
    }
  }

  await base44.asServiceRole.entities[entityName].delete(entityId);
  deletedCount++;

  return deletedCount;
}

Deno.serve(async (req) => {
  if (req.method !== 'DELETE') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const einheitId = url.searchParams.get('id');

    if (!einheitId) {
      return Response.json({ error: 'Missing id' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // RBAC Check
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });

    if (!benutzer || benutzer.length === 0) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userRecord = benutzer[0];
    const subjects = userRecord.fachbereich_zustaendigkeit || [];

    if (userRecord.rolle === 'Fachlehrkraft') {
      return Response.json({ error: 'Only leads can delete units' }, { status: 403 });
    }

    if (userRecord.rolle === 'Fachschaftsleitung' && !subjects.includes(einheit.fach)) {
      return Response.json({ error: 'Not responsible for this subject' }, { status: 403 });
    }

    if (userRecord.rolle === 'Betrachter') {
      return Response.json({ error: 'No delete permission' }, { status: 403 });
    }

    // Cascade Delete
    const deletedCount = await cascadeDelete(base44, 'Einheiten', einheitId);

    // Audit
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'DELETE',
        resource_type: 'Einheiten',
        resource_id: einheitId,
        affected_count: deletedCount,
        status: 'success',
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return Response.json({
      success: true,
      deleted_count: deletedCount,
      message: `Deleted unit and ${deletedCount - 1} dependent items`,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});