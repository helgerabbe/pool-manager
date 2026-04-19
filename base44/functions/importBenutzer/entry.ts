import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * POST /importBenutzer
 *
 * Erwartet JSON-Body:
 * {
 *   rows: Array<{
 *     email:    string,
 *     rolle:    string | null,
 *     faecher:  string[]
 *   }>
 * }
 *
 * Gibt zurück:
 * {
 *   angelegt:    number,
 *   aktualisiert: number,
 *   fehler:      Array<{ zeile: number, email: string, grund: string }>
 * }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Nur Admins dürfen importieren
  // WICHTIG: Die User-Entity (built-in) hat email als ID, wir suchen nach der Custom Benutzer-Entity mit user_id = email
  const adminProfile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
  
  // Fallback: Falls noch keine Benutzer-Record existiert, prüfe die eingebaute User.role
  const rolle = adminProfile[0]?.rolle || user.role;
  
  if (!rolle || rolle !== 'Administrator') {
    return Response.json({ 
      error: `Kein Zugriff. Nur Administratoren dürfen Benutzer importieren. Deine Rolle: ${rolle || 'unbekannt'}, deine E-Mail: ${user.email}`, 
      status: 403 
    }, { status: 403 });
  }

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'Keine Daten übergeben.' }, { status: 400 });
  }

  // Alle existierenden Benutzer laden (für Duplicate-Check)
  const existing = await base44.asServiceRole.entities.Benutzer.list();
  const existingByEmail = {};
  for (const b of existing) {
    if (b.user_id) existingByEmail[b.user_id.toLowerCase()] = b;
  }

  let angelegt = 0;
  let aktualisiert = 0;
  const fehler = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const zeile = i + 2; // 1-basiert, Zeile 1 = Header

    try {
      const email = (row.email || '').trim().toLowerCase();

      // E-Mail-Validierung
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fehler.push({ zeile, email: row.email || '—', grund: 'Ungültige oder fehlende E-Mail-Adresse' });
        continue;
      }

      const rolleWert = row.rolle || 'Fachlehrkraft';
      const gueltigeRollen = ['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft', 'Betrachter', 'Moodle-Designer'];
      const finaleRolle = gueltigeRollen.includes(rolleWert) ? rolleWert : 'Fachlehrkraft';

      const payload = {
        user_id:                  email,
        rolle:                    finaleRolle,
        fachbereich_zustaendigkeit: Array.isArray(row.faecher) ? row.faecher : [],
        ist_aktiv:                true,
      };

      if (existingByEmail[email]) {
        // Upsert: vorhandenen Datensatz aktualisieren
        await base44.asServiceRole.entities.Benutzer.update(existingByEmail[email].id, payload);
        aktualisiert++;
      } else {
        // Neu anlegen
        await base44.asServiceRole.entities.Benutzer.create(payload);
        angelegt++;
      }
    } catch (err) {
      fehler.push({ zeile, email: row.email || '—', grund: err.message || 'Unbekannter Fehler' });
    }
  }

  return Response.json({ angelegt, aktualisiert, fehler });
});