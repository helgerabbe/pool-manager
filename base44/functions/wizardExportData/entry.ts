import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { 
      stammdaten,
      structure,
      lernziele,
      phasenKonfiguration,
    } = await req.json();

    if (!stammdaten || !structure) {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }

    // 1. Einheit erstellen
    const einheit = await base44.entities.Einheiten.create({
      fach: stammdaten.fach,
      titel_der_einheit: stammdaten.titel_der_einheit,
      jahrgangsstufe: stammdaten.jahrgangsstufe,
      zeit_phase_id: stammdaten.zeit_phase_id,
      gesamtziel: stammdaten.gesamtziel || '',
      freigabe_status: 'Freigegeben für Bearbeitung',
      content_status: 'draft',
      sync_status: 'new',
    });

    const einheitId = einheit.id;

    // 2. Themenfelder erstellen
    const themenfelderMap = new Map();
    for (const tf of structure.themenfelder || []) {
      const created = await base44.entities.Themenfeld.create({
        einheit_id: einheitId,
        titel: tf.titel,
        beschreibung: tf.beschreibung || '',
        reihenfolge: structure.themenfelder.indexOf(tf),
        bearbeitungsmodus: 'offen',
        content_status: 'approved',
        sync_status: 'new',
      });
      themenfelderMap.set(tf.id, created.id);
    }

    // 3. Lernpakete erstellen
    const lernpaketeMap = new Map();
    for (const lp of structure.lernpakete || []) {
      const themenfeld_id = themenfelderMap.get(lp.themenfeld_id);
      if (!themenfeld_id) continue;

      const created = await base44.entities.Lernpakete.create({
        einheit_id: einheitId,
        themenfeld_id,
        reihenfolge_nummer: (structure.lernpakete.indexOf(lp) + 1),
        titel_des_pakets: lp.titel_des_pakets,
        geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten || 45,
        content_status: 'approved',
        sync_status: 'new',
      });
      lernpaketeMap.set(lp.id, created.id);
    }

    // 4. Lernziele erstellen
    for (const [paketIdOld, lzArray] of Object.entries(lernziele || {})) {
      const paketIdNew = lernpaketeMap.get(paketIdOld);
      if (!paketIdNew || !Array.isArray(lzArray)) continue;

      for (const lz of lzArray) {
        await base44.entities.Lernziele.create({
          lernpaket_id: paketIdNew,
          formulierung_fachsprache: lz.formulierung_fachsprache,
          kategorie: lz.kategorie || 'Fachwissen',
          schueler_uebersetzung: lz.schueler_uebersetzung || '',
          sync_status: 'new',
        });
      }
    }

    // 5. LernpaketPhaseAktivitaet erstellen (Phasen aktivieren)
    for (const [paketIdOld, phasen] of Object.entries(phasenKonfiguration || {})) {
      const paketIdNew = lernpaketeMap.get(paketIdOld);
      if (!paketIdNew) continue;

      // Für jede aktivierte Phase eine Aktivität erstellen
      let reihenfolge = 1;
      for (const [phase, isActive] of Object.entries(phasen)) {
        if (isActive) {
          await base44.entities.LernpaketPhaseAktivitaet.create({
            lernpaket_id: paketIdNew,
            phase,
            aktivitaet_id: '', // Placeholder - würde in echtem Szenario gefüllt
            reihenfolge,
            is_complete: false,
            content_status: 'draft',
            sync_status: 'new',
          });
          reihenfolge++;
        }
      }
    }

    return Response.json({
      success: true,
      einheitId,
      message: 'Einheit erfolgreich exportiert',
    });
  } catch (error) {
    console.error('wizardExportData error:', error);
    return Response.json(
      { error: error.message || 'Export fehlgeschlagen' },
      { status: 500 }
    );
  }
});