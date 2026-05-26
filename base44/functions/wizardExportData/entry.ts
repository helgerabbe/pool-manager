import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft'];
const ROLLBACK_ORDER = [
  'LernpaketPhaseAktivitaet',
  'Lernziele',
  'Lernpakete',
  'Themenfeld',
  'Einheiten',
];

async function createMany(entity, rows, createdRecords) {
  const results = await Promise.allSettled(rows.map((row) => entity.create(row)));
  const created = [];
  const errors = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      created.push(result.value);
      createdRecords.push({ entityName: entity.entityName, id: result.value.id });
    } else {
      errors.push(result.reason?.message || 'Create failed');
    }
  });

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return created;
}

async function rollbackCreated(base44, createdRecords) {
  for (const entityName of ROLLBACK_ORDER) {
    const records = createdRecords.filter((record) => record.entityName === entityName).reverse();
    await Promise.allSettled(records.map((record) => base44.entities[entityName].delete(record.id)));
  }
}

function trackEntity(entity, entityName) {
  return {
    entityName,
    create: (data) => entity.create(data),
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const createdRecords = [];

  try {
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const {
      stammdaten,
      structure,
      lernziele = {},
      phasenKonfiguration = {},
    } = payload;

    if (!stammdaten || !structure || typeof stammdaten !== 'object' || typeof structure !== 'object') {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }

    if (!stammdaten.fach || !stammdaten.titel_der_einheit || !stammdaten.jahrgangsstufe) {
      return Response.json({ error: 'Fach, Titel und Jahrgangsstufe sind erforderlich' }, { status: 400 });
    }

    const profil = (await base44.entities.Benutzer.filter({ user_id: user.email }))?.[0];
    const rolle = profil?.rolle;
    const faecher = Array.isArray(profil?.fachbereich_zustaendigkeit)
      ? profil.fachbereich_zustaendigkeit
      : [];
    const canCreate =
      user.role === 'admin' ||
      rolle === 'Administrator' ||
      (ALLOWED_ROLES.includes(rolle) && faecher.includes(stammdaten.fach));

    if (!canCreate) {
      return Response.json(
        { error: 'Keine Berechtigung zum Erstellen dieser Einheit' },
        { status: 403 }
      );
    }

    const einheit = await base44.entities.Einheiten.create({
      fach: stammdaten.fach,
      titel_der_einheit: stammdaten.titel_der_einheit,
      jahrgangsstufe: stammdaten.jahrgangsstufe,
      zeit_phase_id: stammdaten.zeit_phase_id,
      gesamtziele: Array.isArray(stammdaten.gesamtziele)
        ? stammdaten.gesamtziele
        : (stammdaten.gesamtziel ? [stammdaten.gesamtziel] : []),
      freigabe_status: 'Freigegeben für Bearbeitung',
      content_status: 'draft',
      sync_status: 'new',
    });
    createdRecords.push({ entityName: 'Einheiten', id: einheit.id });

    const einheitId = einheit.id;
    const themenfelder = Array.isArray(structure.themenfelder) ? structure.themenfelder : [];
    const themenfeldRows = themenfelder.map((tf, index) => ({
      einheit_id: einheitId,
      titel: tf.titel,
      beschreibung: tf.beschreibung || '',
      reihenfolge: index,
      bearbeitungsmodus: 'offen',
      content_status: 'approved',
      sync_status: 'new',
    }));
    const createdThemenfelder = await createMany(
      trackEntity(base44.entities.Themenfeld, 'Themenfeld'),
      themenfeldRows,
      createdRecords
    );

    const themenfelderMap = new Map();
    themenfelder.forEach((tf, index) => {
      if (tf.id && createdThemenfelder[index]?.id) {
        themenfelderMap.set(tf.id, createdThemenfelder[index].id);
      }
    });

    const lernpakete = Array.isArray(structure.lernpakete) ? structure.lernpakete : [];
    const lernpaketSources = lernpakete.filter((lp) => themenfelderMap.get(lp.themenfeld_id));
    const lernpaketRows = lernpaketSources.map((lp, index) => ({
      einheit_id: einheitId,
      themenfeld_id: themenfelderMap.get(lp.themenfeld_id),
      reihenfolge_nummer: index + 1,
      titel_des_pakets: lp.titel_des_pakets,
      geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten || 45,
      content_status: 'approved',
      sync_status: 'new',
    }));
    const createdLernpakete = await createMany(
      trackEntity(base44.entities.Lernpakete, 'Lernpakete'),
      lernpaketRows,
      createdRecords
    );

    const lernpaketeMap = new Map();
    lernpaketSources.forEach((lp, index) => {
      if (lp.id && createdLernpakete[index]?.id) {
        lernpaketeMap.set(lp.id, createdLernpakete[index].id);
      }
    });

    const lernzielRows = Object.entries(lernziele || {}).flatMap(([paketIdOld, lzArray]) => {
      const paketIdNew = lernpaketeMap.get(paketIdOld);
      if (!paketIdNew || !Array.isArray(lzArray)) return [];
      return lzArray.map((lz) => ({
        lernpaket_id: paketIdNew,
        formulierung_fachsprache: lz.formulierung_fachsprache,
        kategorie: lz.kategorie || 'Fachwissen',
        schueler_uebersetzung: lz.schueler_uebersetzung || '',
        sync_status: 'new',
      }));
    });
    await createMany(trackEntity(base44.entities.Lernziele, 'Lernziele'), lernzielRows, createdRecords);

    const aktivitaetRows = Object.entries(phasenKonfiguration || {}).flatMap(([paketIdOld, phasen]) => {
      const paketIdNew = lernpaketeMap.get(paketIdOld);
      if (!paketIdNew || !phasen || typeof phasen !== 'object') return [];
      let reihenfolge = 1;
      return Object.entries(phasen)
        .filter(([, isActive]) => isActive)
        .map(([phase]) => ({
          lernpaket_id: paketIdNew,
          phase,
          aktivitaet_id: '',
          reihenfolge: reihenfolge++,
          is_complete: false,
          content_status: 'draft',
          sync_status: 'new',
        }));
    });
    await createMany(
      trackEntity(base44.entities.LernpaketPhaseAktivitaet, 'LernpaketPhaseAktivitaet'),
      aktivitaetRows,
      createdRecords
    );

    return Response.json({
      success: true,
      einheitId,
      message: 'Einheit erfolgreich exportiert',
    });
  } catch (error) {
    await rollbackCreated(base44, createdRecords);
    console.error('wizardExportData error:', error);
    return Response.json(
      { error: error.message || 'Export fehlgeschlagen', rolledBack: createdRecords.length > 0 },
      { status: 500 }
    );
  }
});