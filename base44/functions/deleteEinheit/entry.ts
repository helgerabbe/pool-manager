import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── RBAC-Rollen (spiegelt lib/rbac.js) ──────────────────────────────────────
const ROLLEN = {
  ADMIN: 'admin',
  FACHSCHAFT: 'Fachschaftsleitung',
};

/**
 * checkRole — API-Shield Middleware
 * Prüft ob der anfragende Nutzer eine der erlaubten Rollen besitzt.
 * Berücksichtigt Fachzuständigkeit wenn `einheitFach` übergeben wird.
 * @returns {Response|null} null = Zugriff OK, Response = Fehler zurückgeben
 */
async function checkRole(base44, allowedRollen, einheitFach = null) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
  const profil = profile[0];
  if (!profil) return Response.json({ error: 'Kein Benutzerprofil gefunden' }, { status: 403 });

  const rolle = profil.rolle;
  if (!allowedRollen.includes(rolle)) {
    return Response.json(
      { error: `Keine Berechtigung. Erforderlich: ${allowedRollen.join(' oder ')}. Ihre Rolle: ${rolle}` },
      { status: 403 }
    );
  }

  // Fachzuständigkeit prüfen (nur für nicht-Admins)
  if (einheitFach && rolle !== ROLLEN.ADMIN) {
    const faecher = profil.fachbereich_zustaendigkeit || [];
    if (!faecher.includes(einheitFach)) {
      return Response.json(
        { error: `Keine Zuständigkeit für das Fach "${einheitFach}"` },
        { status: 403 }
      );
    }
  }

  return null; // Zugriff OK
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Auth prüfen bevor Body gelesen wird
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { einheitId } = await req.json();
  if (!einheitId) {
    return Response.json({ error: 'einheitId fehlt' }, { status: 400 });
  }

  // ── RBAC: Nur ADMIN und FACHSCHAFTSLEITUNG dürfen Einheiten löschen ────────
  // Fach der Einheit laden für Zuständigkeitsprüfung
  const einheitArr = await base44.asServiceRole.entities.Einheiten.filter({ id: einheitId });
  const einheit = einheitArr[0];
  if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

  const roleError = await checkRole(base44, [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT], einheit.fach);
  if (roleError) return roleError;

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

  // Schritt 5: Themenfelder löschen
  const themenfelder = await base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: einheitId });
  await Promise.all(themenfelder.map(tf => base44.asServiceRole.entities.Themenfeld.delete(tf.id)));

  // Schritt 6: Einheit löschen
  await base44.asServiceRole.entities.Einheiten.delete(einheitId);

  return Response.json({ success: true });
});