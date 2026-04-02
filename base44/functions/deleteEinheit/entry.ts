import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ROLLEN = {
  ADMIN: 'Administrator',
  FACHSCHAFT: 'Fachschaftsleitung',
};

async function checkRole(base44, allowedRollen, einheitFach = null) {
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Nutzer-Rolle vom User-Objekt selbst (von Base44 Auth)
    const userRole = user.role || user.rolle;
    
    if (!allowedRollen.includes(userRole)) {
      return Response.json(
        { error: `Keine Berechtigung. Erforderlich: ${allowedRollen.join(' oder ')}. Ihre Rolle: ${userRole}` },
        { status: 403 }
      );
    }

    // Fachzuständigkeit prüfen (nur für Nicht-Admins)
    if (einheitFach && userRole !== ROLLEN.ADMIN) {
      // Versuche Benutzerprofil zu laden, aber nicht required
      try {
        const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
        const profil = profile[0];
        if (profil) {
          const faecher = profil.fachbereich_zustaendigkeit || [];
          if (!faecher.includes(einheitFach)) {
            return Response.json(
              { error: `Keine Zuständigkeit für das Fach "${einheitFach}"` },
              { status: 403 }
            );
          }
        }
      } catch {
        // Profil konnte nicht geladen werden, aber nicht kritisch
      }
    }

    return null;
  } catch (err) {
    console.error('checkRole error:', err.message);
    return Response.json({ error: 'Fehler beim Prüfen der Berechtigung: ' + err.message }, { status: 500 });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (err) {
      console.error('Auth error:', err.message);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { einheitId } = await req.json();
    if (!einheitId) {
      return Response.json({ error: 'einheitId fehlt' }, { status: 400 });
    }

    const einheitArr = await base44.asServiceRole.entities.Einheiten.filter({ id: einheitId });
    const einheit = einheitArr[0];
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    const roleError = await checkRole(base44, [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT], einheit.fach);
    if (roleError) return roleError;

    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId });
    const paketIds = lernpakete.map(p => p.id);

    const lernziele = paketIds.length > 0
      ? (await Promise.all(paketIds.map(pid =>
          base44.asServiceRole.entities.Lernziele.filter({ lernpaket_id: pid })
        ))).flat()
      : [];

    const aufgaben = paketIds.length > 0
      ? (await Promise.all(paketIds.map(pid =>
          base44.asServiceRole.entities.Aufgabenbausteine.filter({ lernpaket_id: pid })
        ))).flat()
      : [];
    const aufgabenIds = aufgaben.map(a => a.id);

    if (aufgabenIds.length > 0) {
      const mappings = (await Promise.all(aufgabenIds.map(aid =>
        base44.asServiceRole.entities.MappingAufgabeBasisziel.filter({ aufgabe_id: aid })
      ))).flat();
      await Promise.all(mappings.map(m =>
        base44.asServiceRole.entities.MappingAufgabeBasisziel.delete(m.id)
      ));
    }

    await Promise.all(aufgaben.map(a =>
      base44.asServiceRole.entities.Aufgabenbausteine.delete(a.id)
    ));

    await Promise.all(lernziele.map(lz =>
      base44.asServiceRole.entities.Lernziele.delete(lz.id)
    ));

    await Promise.all(lernpakete.map(p =>
      base44.asServiceRole.entities.Lernpakete.delete(p.id)
    ));

    const themenfelder = await base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: einheitId });
    await Promise.all(themenfelder.map(tf => base44.asServiceRole.entities.Themenfeld.delete(tf.id)));

    await base44.asServiceRole.entities.Einheiten.delete(einheitId);

    return Response.json({ success: true });
  } catch (err) {
    console.error('deleteEinheit error:', err.message);
    return Response.json({ error: err.message || 'Fehler beim Löschen' }, { status: 500 });
  }
});