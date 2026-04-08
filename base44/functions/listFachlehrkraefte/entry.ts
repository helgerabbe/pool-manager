/**
 * listFachlehrkraefte.js
 *
 * Gibt alle Benutzer zurück, die in der Benutzer-Entity als 'Fachlehrkraft'
 * eingetragen sind. Wird im Mitarbeiter-Dropdown der EinheitUebersichtTab genutzt.
 *
 * Zugriff: Jeder authentifizierte User (wird für Fachschaftsleitungen benötigt).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Alle Benutzer-Profile laden
    const benutzerProfiles = await base44.asServiceRole.entities.Benutzer.list();

    // Nur Fachlehrkräfte zurückgeben (nur notwendige Felder – kein Datenleck)
    const fachlehrkraefte = benutzerProfiles
      .filter(b => b.rolle === 'Fachlehrkraft' && b.ist_aktiv !== false)
      .map(b => ({
        email: b.user_id,
        full_name: `${b.vorname || ''} ${b.nachname || ''}`.trim() || b.user_id,
        fachbereich: b.fachbereich_zustaendigkeit || [],
      }));

    return Response.json({ fachlehrkraefte });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});