/**
 * listFachlehrkraefte.js
 *
 * Gibt alle aktiven Benutzer zurück, die in der Benutzer-Entity als
 * 'Fachlehrkraft' eingetragen sind. Wird im Mitarbeiter-Dropdown der
 * EinheitUebersichtTab genutzt.
 *
 * Zugriff: Jeder authentifizierte User (wird für Fachschaftsleitungen benötigt).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;

async function listAll(entity, query = {}) {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, 'user_id', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const benutzerProfiles = await listAll(base44.asServiceRole.entities.Benutzer, {
      rolle: 'Fachlehrkraft',
      ist_aktiv: true,
    });

    const fachlehrkraefte = benutzerProfiles.map((b) => ({
      email: b.user_id,
      full_name: `${b.vorname || ''} ${b.nachname || ''}`.trim() || b.user_id,
      fachbereich: b.fachbereich_zustaendigkeit || [],
    }));

    return Response.json({ fachlehrkraefte });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});