import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { einheitId } = await req.json();
  if (!einheitId) {
    return Response.json({ error: 'einheitId fehlt' }, { status: 400 });
  }

  // 1. Alle Lernpakete dieser Einheit laden
  const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId });
  const paketIds = lernpakete.map(p => p.id);

  // 2. Alle Lernziele dieser Lernpakete laden
  const lernziele = paketIds.length > 0
    ? (await Promise.all(paketIds.map(pid =>
        base44.asServiceRole.entities.Lernziele.filter({ lernpaket_id: pid })
      ))).flat()
    : [];

  // 3. Alle Aufgabenbausteine dieser Lernpakete laden
  const aufgaben = paketIds.length > 0
    ? (await Promise.all(paketIds.map(pid =>
        base44.asServiceRole.entities.Aufgabenbausteine.filter({ lernpaket_id: pid })
      ))).flat()
    : [];
  const aufgabenIds = aufgaben.map(a => a.id);

  // Schritt 1: Mappings löschen (über aufgabe_id)
  if (aufgabenIds.length > 0) {
    const mappings = (await Promise.all(aufgabenIds.map(aid =>
      base44.asServiceRole.entities.MappingAufgabeBasisziel.filter({ aufgabe_id: aid })
    ))).flat();
    await Promise.all(mappings.map(m =>
      base44.asServiceRole.entities.MappingAufgabeBasisziel.delete(m.id)
    ));
  }

  // Schritt 2: Aufgabenbausteine löschen
  await Promise.all(aufgaben.map(a =>
    base44.asServiceRole.entities.Aufgabenbausteine.delete(a.id)
  ));

  // Schritt 3: Lernziele löschen
  await Promise.all(lernziele.map(lz =>
    base44.asServiceRole.entities.Lernziele.delete(lz.id)
  ));

  // Schritt 4: Lernpakete löschen
  await Promise.all(lernpakete.map(p =>
    base44.asServiceRole.entities.Lernpakete.delete(p.id)
  ));

  // Schritt 5: Einheit löschen
  await base44.asServiceRole.entities.Einheiten.delete(einheitId);

  return Response.json({ success: true });
});