import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ROLLEN = {
  ADMIN: 'admin',
  FACHSCHAFT: 'Fachschaftsleitung',
};

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
      console.error('Auth error:', err.message);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User:', JSON.stringify(user, null, 2));

    // RBAC: Nur Admins dürfen löschen
    const userRole = user.role;
    console.log('User role:', userRole);

    if (userRole !== ROLLEN.ADMIN) {
      return Response.json(
        { error: `Nur Administratoren dürfen Einheiten löschen. Ihre Rolle: ${userRole}` },
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

    // ── Cascade Delete ────────────────────────────────────────────────────────

    // 1. Alle Lernpakete dieser Einheit
    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId });
    const paketIds = lernpakete.map(p => p.id);
    console.log(`Gefunden: ${lernpakete.length} Lernpakete`);

    // 2. Alle Lernziele (über Lernpakete)
    const lernziele = paketIds.length > 0
      ? (await Promise.all(paketIds.map(pid =>
          base44.asServiceRole.entities.Lernziele.filter({ lernpaket_id: pid })
        ))).flat()
      : [];
    console.log(`Gefunden: ${lernziele.length} Lernziele`);

    // 3. Alle Aufgabenbausteine (über Lernpakete)
    const aufgaben = paketIds.length > 0
      ? (await Promise.all(paketIds.map(pid =>
          base44.asServiceRole.entities.Aufgabenbausteine.filter({ lernpaket_id: pid })
        ))).flat()
      : [];
    console.log(`Gefunden: ${aufgaben.length} Aufgabenbausteine`);

    // 4. Alle Mappings (über Aufgabenbausteine)
    const aufgabenIds = aufgaben.map(a => a.id);
    let mappings = [];
    if (aufgabenIds.length > 0) {
      mappings = (await Promise.all(aufgabenIds.map(aid =>
        base44.asServiceRole.entities.MappingAufgabeBasisziel.filter({ aufgabe_id: aid })
      ))).flat();
    }
    console.log(`Gefunden: ${mappings.length} Mappings`);

    // 5. Alle Master-Aufgaben (über Lernpakete)
    const masterAufgaben = paketIds.length > 0
      ? (await Promise.all(paketIds.map(pid =>
          base44.asServiceRole.entities.MasterAufgabe.filter({ lernpaket_id: pid })
        ))).flat()
      : [];
    console.log(`Gefunden: ${masterAufgaben.length} Master-Aufgaben`);

    // 6. Alle Lernpaket-Aktivitäten (über Lernpakete)
    const lernpaketAktivitaeten = paketIds.length > 0
      ? (await Promise.all(paketIds.map(pid =>
          base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: pid })
        ))).flat()
      : [];
    console.log(`Gefunden: ${lernpaketAktivitaeten.length} Lernpaket-Aktivitäten`);

    // 7. Alle Themenfelder
    const themenfelder = await base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: einheitId });
    console.log(`Gefunden: ${themenfelder.length} Themenfelder`);

    // ── Löschen in korrekter Reihenfolge (Foreign Keys beachten) ────────────────

    // Schritt 1: Mappings löschen
    if (mappings.length > 0) {
      await Promise.all(mappings.map(m =>
        base44.asServiceRole.entities.MappingAufgabeBasisziel.delete(m.id)
      ));
      console.log(`✓ ${mappings.length} Mappings gelöscht`);
    }

    // Schritt 2: Aufgabenbausteine löschen
    if (aufgaben.length > 0) {
      await Promise.all(aufgaben.map(a =>
        base44.asServiceRole.entities.Aufgabenbausteine.delete(a.id)
      ));
      console.log(`✓ ${aufgaben.length} Aufgabenbausteine gelöscht`);
    }

    // Schritt 3: Lernziele löschen
    if (lernziele.length > 0) {
      await Promise.all(lernziele.map(lz =>
        base44.asServiceRole.entities.Lernziele.delete(lz.id)
      ));
      console.log(`✓ ${lernziele.length} Lernziele gelöscht`);
    }

    // Schritt 4: Master-Aufgaben löschen
    if (masterAufgaben.length > 0) {
      await Promise.all(masterAufgaben.map(ma =>
        base44.asServiceRole.entities.MasterAufgabe.delete(ma.id)
      ));
      console.log(`✓ ${masterAufgaben.length} Master-Aufgaben gelöscht`);
    }

    // Schritt 5: Lernpaket-Aktivitäten löschen
    if (lernpaketAktivitaeten.length > 0) {
      await Promise.all(lernpaketAktivitaeten.map(lpa =>
        base44.asServiceRole.entities.LernpaketPhaseAktivitaet.delete(lpa.id)
      ));
      console.log(`✓ ${lernpaketAktivitaeten.length} Lernpaket-Aktivitäten gelöscht`);
    }

    // Schritt 6: Lernpakete löschen
    if (lernpakete.length > 0) {
      await Promise.all(lernpakete.map(p =>
        base44.asServiceRole.entities.Lernpakete.delete(p.id)
      ));
      console.log(`✓ ${lernpakete.length} Lernpakete gelöscht`);
    }

    // Schritt 7: Themenfelder löschen
    if (themenfelder.length > 0) {
      await Promise.all(themenfelder.map(tf =>
        base44.asServiceRole.entities.Themenfeld.delete(tf.id)
      ));
      console.log(`✓ ${themenfelder.length} Themenfelder gelöscht`);
    }

    // Schritt 8: Einheit löschen
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