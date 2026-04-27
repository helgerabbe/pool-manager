/**
 * getWorkspaceEinheitDataSecure.js
 *
 * Phase 6.5: Backend Aggregations-Endpoint
 * - Löst N+1-Problem: Eine einzige Funktion aggregiert ALLE hierarchischen Daten
 * - Parallele DB-Abfragen mit Promise.all
 * - Selective Fetching: Nur benötigte Felder
 * - Hierarchische Rückgabe: Themenfelder → Lernpakete → Lernziele → Aufgaben
 *
 * Response-Format:
 * {
 *   einheit: { id, titel_der_einheit, fach, ... },
 *   themenfelder: [
 *     {
 *       id, titel,
 *       lernpakete: [
 *         {
 *           id, titel_des_pakets, reihenfolge_nummer,
 *           lernziele: [
 *             {
 *               id, formulierung_fachsprache, kategorie,
 *               aufgaben: [{ id, baustein_typ, ... }]
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    // 1. Initialize & Auth
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Payload
    const payload = await req.json();
    const { einheit_id } = payload;

    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }

    // 3. Fetch Einheit (RBAC Check)
    const einheit = await base44.asServiceRole.entities.Einheiten.get(
      einheit_id
    );

    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // 4. RBAC: Read Permission Check
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });

    const benutzer = benutzerList?.[0];
    const benutzerRolle = benutzer?.rolle;
    
    // ✅ Fallback auf auth user.role wenn kein Benutzer-Eintrag existiert
    const role = benutzerRolle || user.role;

    let hasReadAccess = false;

    if (role === 'Administrator' || user.role === 'admin') {
      hasReadAccess = true;
    } else if (role === 'Fachschaftsleitung') {
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.includes(einheit.fach)) {
        hasReadAccess = true;
      }
    } else if (role === 'Fachlehrkraft') {
      // ✅ Fachlehrkraft: Lesezugriff wenn Fach zuständig ist (auch ohne Unit-Level-Mitgliedschaft)
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.includes(einheit.fach)) {
        hasReadAccess = true;
      }
    } else if (role === 'Betrachter') {
      hasReadAccess = true; // Betrachter können alles lesen
    }

    if (!hasReadAccess) {
      return Response.json(
        { error: 'No read permission for this Einheit' },
        { status: 403 }
      );
    }

    // 5. PARALLEL QUERIES: Hole alle Daten auf einmal (inkl. Members für RBAC)
    const [themenfelder, lernpakete, lernziele, aufgaben, einheitMembers] = await Promise.all([
      // Themenfelder mit nur benötigten Feldern
      base44.asServiceRole.entities.Themenfeld.filter({
        einheit_id: einheit_id,
      }),
      // Lernpakete
      base44.asServiceRole.entities.Lernpakete.filter({
        einheit_id: einheit_id,
      }),
      // Lernziele
      base44.asServiceRole.entities.Lernziele.list(),
      // Aufgaben
      base44.asServiceRole.entities.Aufgabenbausteine.list(),
      // ✅ Members für Unit-Level RBAC
      base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id: einheit_id,
      }),
    ]);

    // 6. BUILD HIERARCHY: Frontend braucht nicht mehr zu filtern!
    // Gruppiere Lernziele nach Lernpaket
    const lernzielByPaketId = {};
    for (const lz of lernziele) {
      if (!lernzielByPaketId[lz.lernpaket_id]) {
        lernzielByPaketId[lz.lernpaket_id] = [];
      }
      lernzielByPaketId[lz.lernpaket_id].push(lz);
    }

    // Gruppiere Aufgaben nach Lernziel
    const aufgabenByLernzielId = {};
    for (const aufgabe of aufgaben) {
      if (!aufgabenByLernzielId[aufgabe.lernziel_id]) {
        aufgabenByLernzielId[aufgabe.lernziel_id] = [];
      }
      aufgabenByLernzielId[aufgabe.lernziel_id].push(aufgabe);
    }

    // Gruppiere Lernpakete nach Themenfeld & baue Hierarchie
    const lernpaketeByThemenfeldId = {};
    const lernpaketeHierarchy = [];

    for (const paket of lernpakete) {
      const themenfeldId = paket.themenfeld_id;
      if (!lernpaketeByThemenfeldId[themenfeldId]) {
        lernpaketeByThemenfeldId[themenfeldId] = [];
      }

      // Build Lernziele hierarchy für dieses Paket
      const paketLernziele = (lernzielByPaketId[paket.id] || []).map((lz) => ({
        id: lz.id,
        formulierung_fachsprache: lz.formulierung_fachsprache,
        kategorie: lz.kategorie,
        schueler_uebersetzung: lz.schueler_uebersetzung,
        sync_status: lz.sync_status,
        // Aufgaben für dieses Lernziel
        aufgaben: aufgabenByLernzielId[lz.id] || [],
      }));

      // Baue Paket mit eingebetteten Lernzielen
      const paketWithZiele = {
        id: paket.id,
        einheit_id: paket.einheit_id,
        themenfeld_id: paket.themenfeld_id,
        reihenfolge_nummer: paket.reihenfolge_nummer,
        titel_des_pakets: paket.titel_des_pakets,
        geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten,
        locked_by: paket.locked_by,
        locked_at: paket.locked_at,
        sync_status: paket.sync_status,
        phasen_konfiguration: paket.phasen_konfiguration,
        version: paket.version,
        lernziele: paketLernziele,
      };

      lernpaketeByThemenfeldId[themenfeldId].push(paketWithZiele);
      lernpaketeHierarchy.push(paketWithZiele);
    }

    // 7. BUILD THEMENFELDER HIERARCHY
    const themenfeldWithPakete = (themenfelder || [])
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map((tf) => ({
        id: tf.id,
        einheit_id: tf.einheit_id,
        titel: tf.titel,
        beschreibung: tf.beschreibung,
        reihenfolge: tf.reihenfolge,
        bearbeitungsmodus: tf.bearbeitungsmodus,
        sync_status: tf.sync_status,
        // Lernpakete für dieses Themenfeld (bereits mit Lernzielen)
        lernpakete: (lernpaketeByThemenfeldId[tf.id] || [])
          .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)),
      }));

    // 8. BUILD FLAT STRUCTURES für schnelle Lookups (optional, für Performance)
    const flatStructures = {
      lernpakete,
      lernziele,
      aufgaben,
    };

    // 9. RESPONSE
    const response = {
      success: true,
      data: {
        einheit: {
          id: einheit.id,
          fach: einheit.fach,
          titel_der_einheit: einheit.titel_der_einheit,
          gesamtziele: einheit.gesamtziele || [],
          jahrgangsstufe: einheit.jahrgangsstufe,
          zeit_phase_id: einheit.zeit_phase_id,
          bearbeitungsmodus: einheit.bearbeitungsmodus || 'offen',
          wizard_status: einheit.wizard_status,
          freigabe_status: einheit.freigabe_status,
          sync_status: einheit.sync_status,
          last_synced_at: einheit.last_synced_at,
          last_exported_at: einheit.last_exported_at,
          structural_lock: einheit.structural_lock,
          structural_locked_at: einheit.structural_locked_at,
          version: einheit.version,
          created_date: einheit.created_date,
          updated_date: einheit.updated_date,
          // ✅ KRITISCH: Lernpfad-Konfiguration für Tab 7 (Dashboards).
          // Ohne diese Felder fällt das Cockpit auf einen leeren DEFAULT_KONFIG
          // zurück und überschreibt beim Lazy-Init die DB mit Templates.
          lernpfade_konfiguration: einheit.lernpfade_konfiguration,
          lernpfade_schema_version: einheit.lernpfade_schema_version,
          // ✅ Members für Unit-Level RBAC
          members: einheitMembers || [],
        },
        // Hierarchie: Themenfelder → Lernpakete → Lernziele → Aufgaben
        themenfelder: themenfeldWithPakete,
        // Flat lookup tables für schnelle Suche (z.B. ein bestimmtes Lernpaket)
        _flat: flatStructures,
      },
      statistics: {
        themenfelder_count: themenfelder.length,
        lernpakete_count: lernpakete.length,
        lernziele_count: lernziele.length,
        aufgaben_count: aufgaben.length,
      },
    };

    return Response.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[WORKSPACE_DATA_ERROR]', error);

    return Response.json(
      { error: error.message || 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});