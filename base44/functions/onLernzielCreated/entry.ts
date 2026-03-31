import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Entity Automation Hook: onLernzielCreated
 * 
 * Trigger: Lernziele.create
 * 
 * Wenn ein Lernziel der Ebene 1 angelegt wird, generiert dieser Hook
 * automatisch Platzhalter-Aufgabenbausteine basierend auf der Kategorie:
 * 
 * - "Fähigkeit/Fertigkeit" → 4 Bausteine: Input/Erklärung, Infoseite/Cheat-Sheet, Musterlösung, Übungsaufgaben
 * - "Fachwissen"           → 2 Bausteine: Fakten-Input, Drill-Übung
 */

const TEMPLATES = {
  'Fähigkeit/Fertigkeit': [
    'Input/Erklärung',
    'Infoseite/Cheat-Sheet',
    'Musterlösung',
    'Übungsaufgaben',
  ],
  'Fachwissen': [
    'Fakten-Input',
    'Drill-Übung',
  ],
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const { event, data } = body;

  // Nur bei Create-Events reagieren
  if (event?.type !== 'create') {
    return Response.json({ skipped: true, reason: 'not a create event' });
  }

  const lernziel = data;

  // Nur Ebene 1 Basis mit gesetzter Kategorie verarbeiten
  if (
    lernziel?.anforderungsebene !== 'Ebene 1 - Basis' ||
    !lernziel?.kategorie ||
    !TEMPLATES[lernziel.kategorie]
  ) {
    return Response.json({ skipped: true, reason: 'not Ebene 1 or no matching kategorie' });
  }

  const typen = TEMPLATES[lernziel.kategorie];

  // Bausteine parallel erstellen
  const creates = typen.map(typ =>
    base44.asServiceRole.entities.Aufgabenbausteine.create({
      lernpaket_id:           lernziel.lernpaket_id,
      lernziel_id:            lernziel.id,
      baustein_typ:           typ,
      aufgabentext_inhalt:    '',
      is_opt_out:             false,
      lock_status:            false,
    })
  );

  const results = await Promise.allSettled(creates);

  const erfolgreich = results.filter(r => r.status === 'fulfilled').length;
  const fehler      = results.filter(r => r.status === 'rejected').length;

  return Response.json({
    success: true,
    lernziel_id: lernziel.id,
    kategorie:   lernziel.kategorie,
    generiert:   erfolgreich,
    fehler,
  });
});