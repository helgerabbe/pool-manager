import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLLEN = {
  ADMIN: 'admin',
  FACHSCHAFT: 'Fachschaftsleitung',
};

// Löscht ein Array von IDs sequenziell in Batches um Rate-Limits zu vermeiden
async function deleteInBatches(deleteFn, ids, batchSize = 3, delayMs = 300) {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    await Promise.all(batch.map(id => deleteFn(id)));
    deleted += batch.length;
    if (i + batchSize < ids.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return deleted;
}

// Lädt IDs in Batches sequenziell
async function filterInBatches(filterFn, ids, batchSize = 3, delayMs = 200) {
  const results = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(id => filterFn(id)));
    results.push(...batchResults.flat());
    if (i + batchSize < ids.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
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

    // ── Cascade: Daten sammeln ────────────────────────────────────────────────

    // 1. Lernpakete
    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId });
    const paketIds = lernpakete.map(p => p.id);
    console.log(`Gefunden: ${lernpakete.length} Lernpakete`);

    // 2. Lernziele (sequenziell)
    const lernziele = paketIds.length > 0
      ? await filterInBatches(pid => base44.asServiceRole.entities.Lernziele.filter({ lernpaket_id: pid }), paketIds)
      : [];
    console.log(`Gefunden: ${lernziele.length} Lernziele`);

    // 3. Aufgabenbausteine (sequenziell)
    const aufgaben = paketIds.length > 0
      ? await filterInBatches(pid => base44.asServiceRole.entities.Aufgabenbausteine.filter({ lernpaket_id: pid }), paketIds)
      : [];
    console.log(`Gefunden: ${aufgaben.length} Aufgabenbausteine`);

    // 4. Mappings (sequenziell)
    const aufgabenIds = aufgaben.map(a => a.id);
    const mappings = aufgabenIds.length > 0
      ? await filterInBatches(aid => base44.asServiceRole.entities.MappingAufgabeBasisziel.filter({ aufgabe_id: aid }), aufgabenIds)
      : [];
    console.log(`Gefunden: ${mappings.length} Mappings`);

    // 5. Master-Aufgaben (sequenziell)
    const masterAufgaben = paketIds.length > 0
      ? await filterInBatches(pid => base44.asServiceRole.entities.MasterAufgabe.filter({ lernpaket_id: pid }), paketIds)
      : [];
    console.log(`Gefunden: ${masterAufgaben.length} Master-Aufgaben`);

    // 6. Lernpaket-Aktivitäten (sequenziell)
    const lernpaketAktivitaeten = paketIds.length > 0
      ? await filterInBatches(pid => base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: pid }), paketIds)
      : [];
    console.log(`Gefunden: ${lernpaketAktivitaeten.length} Lernpaket-Aktivitäten`);

    // 7. Themenfelder
    const themenfelder = await base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: einheitId });
    console.log(`Gefunden: ${themenfelder.length} Themenfelder`);

    // 8. AllgemeineAufgaben (über einheit_id)
    const allgemeineAufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId });
    console.log(`Gefunden: ${allgemeineAufgaben.length} Allgemeine Aufgaben`);

    // 9. AllgemeineAufgabe Lernziel-Mappings
    const allgAufgabeIds = allgemeineAufgaben.map(a => a.id);
    const allgMappings = allgAufgabeIds.length > 0
      ? await filterInBatches(aid => base44.asServiceRole.entities.AllgemeineAufgabeLernzielMapping.filter({ aufgabe_id: aid }), allgAufgabeIds)
      : [];
    console.log(`Gefunden: ${allgMappings.length} AllgemeineAufgabe-Mappings`);

    // 10. EinheitMembers
    const members = await base44.asServiceRole.entities.EinheitMembers.filter({ einheit_id: einheitId });
    console.log(`Gefunden: ${members.length} EinheitMembers`);

    // ── Löschen in Reihenfolge (Foreign Keys beachten) ───────────────────────

    if (mappings.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.MappingAufgabeBasisziel.delete(id), mappings.map(m => m.id));
      console.log(`✓ ${mappings.length} Mappings gelöscht`);
    }

    if (aufgaben.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.Aufgabenbausteine.delete(id), aufgaben.map(a => a.id));
      console.log(`✓ ${aufgaben.length} Aufgabenbausteine gelöscht`);
    }

    if (lernziele.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.Lernziele.delete(id), lernziele.map(lz => lz.id));
      console.log(`✓ ${lernziele.length} Lernziele gelöscht`);
    }

    if (masterAufgaben.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.MasterAufgabe.delete(id), masterAufgaben.map(ma => ma.id));
      console.log(`✓ ${masterAufgaben.length} Master-Aufgaben gelöscht`);
    }

    if (lernpaketAktivitaeten.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.LernpaketPhaseAktivitaet.delete(id), lernpaketAktivitaeten.map(lpa => lpa.id));
      console.log(`✓ ${lernpaketAktivitaeten.length} Lernpaket-Aktivitäten gelöscht`);
    }

    if (lernpakete.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.Lernpakete.delete(id), paketIds);
      console.log(`✓ ${lernpakete.length} Lernpakete gelöscht`);
    }

    if (themenfelder.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.Themenfeld.delete(id), themenfelder.map(tf => tf.id));
      console.log(`✓ ${themenfelder.length} Themenfelder gelöscht`);
    }

    if (allgMappings.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.AllgemeineAufgabeLernzielMapping.delete(id), allgMappings.map(m => m.id));
      console.log(`✓ ${allgMappings.length} AllgemeineAufgabe-Mappings gelöscht`);
    }

    if (allgemeineAufgaben.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.AllgemeineAufgabe.delete(id), allgAufgabeIds);
      console.log(`✓ ${allgemeineAufgaben.length} Allgemeine Aufgaben gelöscht`);
    }

    if (members.length > 0) {
      await deleteInBatches(id => base44.asServiceRole.entities.EinheitMembers.delete(id), members.map(m => m.id));
      console.log(`✓ ${members.length} EinheitMembers gelöscht`);
    }

    // Einheit selbst löschen
    await base44.asServiceRole.entities.Einheiten.delete(einheitId);
    console.log(`✓ Einheit gelöscht`);

    return Response.json({
      success: true,
      message: `Einheit und alle abhängigen Records wurden gelöscht`,
      deletedCounts: {
        themenfelder: themenfelder.length,
        lernpakete: lernpakete.length,
        lernpaketAktivitaeten: lernpaketAktivitaeten.length,
        lernziele: lernziele.length,
        aufgabenbausteine: aufgaben.length,
        masterAufgaben: masterAufgaben.length,
        mappings: mappings.length,
        allgemeineAufgaben: allgemeineAufgaben.length,
        allgMappings: allgMappings.length,
        members: members.length,
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