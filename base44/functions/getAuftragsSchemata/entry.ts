/**
 * getAuftragsSchemata
 *
 * Das Tor nach außen, Teil 1 (lesend): Welche Auftragsarten gibt es, wie muss
 * ein gültiger Auftrag je Art aussehen, und welche Aufgabenarten (Aktivitäten)
 * stehen mit welchen Parametern zur Verfügung?
 *
 * Genau diese Antwort braucht ein Absender, bevor er einen Änderungsauftrag
 * stellt — und dasselbe Ergebnis speist das interne Formular im Import-Center,
 * das seine Felder daraus rendert.
 *
 * Payload: {} (keine Parameter)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { listArten, listSchrittTypen } from '../../shared/importAuftragSchemata.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const [katalog, faecher] = await Promise.all([
      base44.asServiceRole.entities.AktivitaetenKatalog.filter({ is_active: true }),
      base44.asServiceRole.entities.LookupFaecher.filter({ ist_aktiv: true }),
    ]);

    const aufgabenarten = (katalog || [])
      .map((k) => ({
        id: k.id,
        name: k.name,
        phase: k.phase,
        beschreibung: k.beschreibung || '',
        supports_master: k.supports_master === true,
        form_schema: Array.isArray(k.form_schema) ? k.form_schema : [],
      }))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));

    return Response.json({
      vertrag_version: 'import-auftrag-1',
      auftragsarten: listArten(),
      schritt_typen: listSchrittTypen(),
      aufgabenarten,
      faecher: (faecher || []).map((f) => f.name).filter(Boolean).sort(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}