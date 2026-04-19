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

  // Berechtigung prüfen: Nur Administratoren (oder "Admin" als Alias) dürfen importieren
  // WICHTIG: E-Mail normalisieren (toLowerCase) für konsistenten DB-Vergleich
  const benutzerProfile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email.toLowerCase() });
  const benutzerRolle = benutzerProfile[0]?.rolle;
  const userRolle = user.role;
  
  console.log('DEBUG: user.email=', user.email, 'user.role=', userRolle, 'benutzer.rolle=', benutzerRolle);
  
  const istAdmin = 
    benutzerRolle === 'Administrator' || 
    benutzerRolle === 'Admin' || 
    userRolle === 'Administrator' || 
    userRolle === 'Admin' ||
    userRolle === 'admin';  // lowercase variant
  
  if (!benutzerRolle && !userRolle) {
    return Response.json({ 
      error: `Kein Zugriff. Keine Rolle gefunden. Deine E-Mail: ${user.email}`, 
      status: 403 
    }, { status: 403 });
  }
  
  if (!istAdmin) {
    return Response.json({ 
      error: `Kein Zugriff. Nur Administratoren dürfen Benutzer importieren. Benutzer-Rolle: ${benutzerRolle || 'nicht gesetzt'}, User-Rolle: ${userRolle || 'nicht gesetzt'}, E-Mail: ${user.email}`, 
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

  // Verarbeitung in Chunks für Progress-Updates (alle 10 Datensätze)
  const CHUNK_SIZE = 10;
  const totalRows = rows.length;
  let processedCount = 0;
  
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const chunkPromises = [];
    
    for (let j = 0; j < chunk.length; j++) {
      const row = chunk[j];
      const zeile = i + j + 2; // 1-basiert, Zeile 1 = Header

      try {
        const email = (row.email || '').trim().toLowerCase();

        // E-Mail-Validierung
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          fehler.push({ zeile, email: row.email || '—', grund: 'Ungültige oder fehlende E-Mail-Adresse' });
          processedCount++;
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
          chunkPromises.push(
            base44.asServiceRole.entities.Benutzer.update(existingByEmail[email].id, payload)
              .then(() => {
                aktualisiert++;
                processedCount++;
              })
              .catch(err => {
                fehler.push({ zeile, email, grund: err.message || 'Update fehlgeschlagen' });
                processedCount++;
              })
          );
        } else {
          // Neu anlegen
          chunkPromises.push(
            base44.asServiceRole.entities.Benutzer.create(payload)
              .then(() => {
                angelegt++;
                processedCount++;
              })
              .catch(err => {
                fehler.push({ zeile, email, grund: err.message || 'Create fehlgeschlagen' });
                processedCount++;
              })
          );
        }
      } catch (err) {
        fehler.push({ zeile, email: row.email || '—', grund: err.message || 'Unbekannter Fehler' });
        processedCount++;
      }
    }
    
    // Warte auf Chunk-Abschluss und sende Progress
    await Promise.all(chunkPromises);
    const progress = Math.round((processedCount / totalRows) * 100);
    console.log(`PROGRESS: ${progress}% (${processedCount}/${totalRows}) - angelegt: ${angelegt}, aktualisiert: ${aktualisiert}`);
  }

  return Response.json({ angelegt, aktualisiert, fehler });
});