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

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAGE_SIZE = 500;
const IN_FILTER_CHUNK_SIZE = 50;

/**
 * withRetry – führt einen async DB-Read mit kurzem Retry aus.
 *
 * Hintergrund (Bug "Grundgerüst/Lernziele mal da, mal weg"):
 * Einzelne Reads gegen die Datenbank können transient (Netzwerk-Hiccup,
 * Kaltstart) fehlschlagen. Ohne Retry liefert die Funktion dann eine
 * scheinbar erfolgreiche, aber leere Antwort, die im Frontend-Cache landet
 * und so tut, als wären die Daten wirklich leer. Mit Retry + hartem Wurf
 * (siehe unten) wird daraus ein echter Fehler, den React Query erneut
 * versucht – statt leere Daten zu cachen.
 */
async function withRetry(fn, label, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
    }
  }
  throw new Error(`[${label}] fehlgeschlagen nach ${attempts} Versuchen: ${lastErr?.message || lastErr}`);
}

const normalizeEntityRecord = (record) => {
  if (!record) return null;
  return {
    ...record,
    ...(record.data || {}),
    id: record.id,
    created_date: record.created_date,
    updated_date: record.updated_date,
    created_by: record.created_by,
  };
};

async function listAllByFilter(entity, query, sort = 'created_date', label = 'filter') {
  const all = [];
  let skip = 0;

  while (true) {
    // Jede einzelne Seite mit Retry – ein transienter Fehler auf Seite 1
    // darf nicht zu einer (fälschlich leeren) Erfolgsantwort führen.
    const currentSkip = skip;
    const page = await withRetry(
      () => entity.filter(query, sort, PAGE_SIZE, currentSkip),
      `${label}@skip=${currentSkip}`
    );
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function listAllByFilterInChunks(entity, fieldName, values, sort = 'created_date') {
  const uniqueValues = [...new Set(values.filter(Boolean))];
  if (uniqueValues.length === 0) return [];

  const pages = await Promise.all(
    chunkArray(uniqueValues, IN_FILTER_CHUNK_SIZE).map((chunk) =>
      listAllByFilter(entity, { [fieldName]: { $in: chunk } }, sort, `${fieldName}-in`)
    )
  );

  return pages.flat();
}

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
    const payload = await req.json().catch(() => ({}));
    const { einheit_id } = payload;

    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }

    // 3. Fetch Einheit via asServiceRole, damit das vollständige Record-Schema
    //    geliefert wird (User-Kontext-SDK droppt teils Felder, die nicht im
    //    Snapshot stehen, z. B. grundgeruest_rohtext). RLS-Check wird durch
    //    die anschließenden Filter (einheit_id) und die EinheitMembers-/Rollen-
    //    Logik im Frontend abgedeckt. Tenant-Isolation: nur eine einzige ID
    //    wird angefragt.
    // WICHTIG: Den Einheit-Read NICHT mit catch(()=>null) verschlucken.
    // Sonst wird ein transienter Read-Fehler fälschlich als "Einheit not found"
    // interpretiert (oder schlimmer: als leeres Grundgerüst angezeigt).
    // withRetry wirft bei echtem Fehler → wird unten zu 500 → React Query
    // versucht erneut. Nur ein echtes `null` (Datensatz existiert nicht) ist 404.
    const rawEinheit = await withRetry(
      () => base44.asServiceRole.entities.Einheiten.get(einheit_id),
      'Einheiten.get'
    );
    const einheit = normalizeEntityRecord(rawEinheit);

    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // 5. Gefilterte, paginierte Queries: nur Daten dieser Einheit laden.
    // WICHTIG (Bug-Fix 2026-06-05, "Lernziele werden nicht angezeigt"):
    // Die asServiceRole-Filter liefern Roh-Records, bei denen die fachlichen
    // Felder im verschachtelten `data`-Objekt stecken (z. B.
    // record.data.lernpaket_id). Ohne Normalisierung ist `lz.lernpaket_id`
    // undefined → die Gruppierung schlägt fehl → alle Pakete zeigen 0 Ziele.
    // Daher JEDEN Record durch normalizeEntityRecord schicken.
    const [rawThemenfelder, rawLernpakete, rawEinheitMembers] = await Promise.all([
      listAllByFilter(base44.asServiceRole.entities.Themenfeld, { einheit_id }, 'created_date', 'Themenfeld'),
      listAllByFilter(base44.asServiceRole.entities.Lernpakete, { einheit_id }, 'created_date', 'Lernpakete'),
      listAllByFilter(base44.asServiceRole.entities.EinheitMembers, { einheit_id }, 'created_date', 'EinheitMembers'),
    ]);

    const themenfelder = rawThemenfelder.map(normalizeEntityRecord);
    const lernpakete = rawLernpakete.map(normalizeEntityRecord);
    const einheitMembers = rawEinheitMembers.map(normalizeEntityRecord);

    // ── Privat-Modus: Zugriffsschutz ────────────────────────────────────────
    // Private Einheiten sind nur für den Besitzer, explizit eingetragene
    // Members und Administratoren sichtbar — auch beim direkten Öffnen per URL.
    if (einheit.sichtbarkeit === 'privat') {
      const isOwner = einheit.besitzer_email === user.email;
      const isMember = einheitMembers.some((m) => m.user_email === user.email);
      let isAdmin = user.role === 'admin';
      if (!isAdmin && !isOwner && !isMember) {
        const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
        isAdmin = normalizeEntityRecord(benutzerList?.[0])?.rolle === 'Administrator';
      }
      if (!isOwner && !isMember && !isAdmin) {
        return Response.json(
          { error: 'Keine Berechtigung: Diese Einheit ist privat.' },
          { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    const lernpaketIds = lernpakete.map((paket) => paket.id).filter(Boolean);
    const rawLernziele = await listAllByFilterInChunks(
      base44.asServiceRole.entities.Lernziele,
      'lernpaket_id',
      lernpaketIds
    );
    const lernziele = rawLernziele.map(normalizeEntityRecord);

    const lernzielIds = lernziele.map((lernziel) => lernziel.id).filter(Boolean);
    const rawAufgaben = await listAllByFilterInChunks(
      base44.asServiceRole.entities.Aufgabenbausteine,
      'lernziel_id',
      lernzielIds
    );
    const aufgaben = rawAufgaben.map(normalizeEntityRecord);

    // ── Lernziel-↔-Aufgabe-Verknüpfungen ermitteln ──────────────────────────
    // Damit die Lehrkraft im Lernziele-Tab (Tab 3) sieht, ob ein Lernziel
    // bereits einer Aufgabe (AllgemeineAufgabe) zugeordnet ist, laden wir die
    // Junction-Table AllgemeineAufgabeLernzielMapping für alle Lernziel-IDs.
    // So lässt sich vor dem versehentlichen Löschen eines verknüpften
    // Lernziels warnen (die Verknüpfung ist die Brücke zum KI-Tutor).
    const rawMappings = await listAllByFilterInChunks(
      base44.asServiceRole.entities.AllgemeineAufgabeLernzielMapping,
      'lernziel_id',
      lernzielIds
    );
    const mappings = rawMappings.map(normalizeEntityRecord);

    // Aufgaben-Titel auflösen (für aussagekräftige Anzeige im Tooltip).
    const mappingAufgabeIds = [...new Set(mappings.map((m) => m.aufgabe_id).filter(Boolean))];
    const rawMappingAufgaben = await listAllByFilterInChunks(
      base44.asServiceRole.entities.AllgemeineAufgabe,
      'id',
      mappingAufgabeIds
    );
    const aufgabenTitelById = {};
    for (const a of rawMappingAufgaben.map(normalizeEntityRecord)) {
      aufgabenTitelById[a.id] = a.titel || 'Aufgabe ohne Titel';
    }

    // Pro Lernziel: Liste der verknüpften Aufgaben-Titel (dedupliziert).
    const verknuepfteAufgabenByLernzielId = {};
    for (const m of mappings) {
      if (!m.lernziel_id) continue;
      if (!verknuepfteAufgabenByLernzielId[m.lernziel_id]) {
        verknuepfteAufgabenByLernzielId[m.lernziel_id] = new Map();
      }
      verknuepfteAufgabenByLernzielId[m.lernziel_id].set(
        m.aufgabe_id,
        aufgabenTitelById[m.aufgabe_id] || 'Aufgabe'
      );
    }

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
      // WICHTIG (Bug-Fix 2026-06-05): `lernpaket_id` MUSS im eingebetteten
      // Lernziel-Objekt enthalten sein. Das Frontend flacht den Baum via
      // flattenWorkspaceTree zu einer Liste ab und gruppiert anschließend
      // wieder über `lz.lernpaket_id` (Strukturboard, Workspace-Filter,
      // LernpaketPanel). Fehlt das Feld, ist die Gruppierung leer → überall
      // "0 Lernziele".
      const paketLernziele = (lernzielByPaketId[paket.id] || []).map((lz) => {
        const verknuepftMap = verknuepfteAufgabenByLernzielId[lz.id];
        const verknuepfteAufgabenTitel = verknuepftMap ? [...verknuepftMap.values()] : [];
        return {
          id: lz.id,
          lernpaket_id: lz.lernpaket_id,
          formulierung_fachsprache: lz.formulierung_fachsprache,
          kategorie: lz.kategorie,
          schueler_uebersetzung: lz.schueler_uebersetzung,
          sync_status: lz.sync_status,
          // Aufgaben für dieses Lernziel
          aufgaben: aufgabenByLernzielId[lz.id] || [],
          // ✅ Verknüpfungs-Info: Ist dieses Lernziel bereits einer
          // AllgemeineAufgabe zugeordnet? (Brücke zum KI-Tutor)
          verknuepfte_aufgaben_count: verknuepfteAufgabenTitel.length,
          verknuepfte_aufgaben_titel: verknuepfteAufgabenTitel,
        };
      });

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
        locked_by_email: paket.locked_by_email,
        sync_status: paket.sync_status,
        // ✅ Freigabe-Status (Phase 3 des Freigabe-Konzepts): Ohne diese Felder
        // weiß Tab 3 nicht, dass ein Lernpaket freigegeben ist → Badge zeigt
        // fälschlich "Vollständig" und der Bearbeiten-Button bleibt aktiv.
        content_status: paket.content_status,
        released_at: paket.released_at,
        released_by: paket.released_by,
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

    // 8. RESPONSE
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
          grundgeruest_rohtext: einheit.grundgeruest_rohtext || '',
          grundgeruest_strukturiert: einheit.grundgeruest_strukturiert || null,
          grundgeruest_status: einheit.grundgeruest_status || (einheit.grundgeruest_rohtext ? 'entwurf' : 'leer'),
          grundgeruest_updated_at: einheit.grundgeruest_updated_at || null,
          wizard_status: einheit.wizard_status,
          // Privat-Modus: Sichtbarkeit + Besitzer für die Workspace-UI.
          sichtbarkeit: einheit.sichtbarkeit || 'oeffentlich',
          besitzer_email: einheit.besitzer_email || null,
          erhalten_von: einheit.erhalten_von || null,
          // Privat-Modus: Lerntypen-Schalter (vier Dashboards vs. ein Dashboard).
          lerntypen_modus: einheit.lerntypen_modus || 'vier',
          freigabe_status: einheit.freigabe_status,
          sync_status: einheit.sync_status,
          last_synced_at: einheit.last_synced_at,
          last_exported_at: einheit.last_exported_at,
          // ✅ KRITISCH (2026-06-07): Export-Lifecycle-Status mitliefern.
          // Tab 1 & Tab 2 (und das Cockpit) leiten den Moodle-Status der
          // Struktur aus export_lifecycle_status ab. Ohne dieses Feld bleibt
          // beim Merge in useWorkspaceData der alte Wert aus der Listen-Query
          // hängen → "Im Export" wird nach "Freigabe aufheben" nicht aktualisiert.
          export_lifecycle_status: einheit.export_lifecycle_status || 'draft',
          export_lifecycle_changed_at: einheit.export_lifecycle_changed_at || null,
          export_lifecycle_changed_by: einheit.export_lifecycle_changed_by || null,
          export_started_at: einheit.export_started_at || null,
          export_published_at: einheit.export_published_at || null,
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
          // Einheits-globale Onboarding-/Orientierungsphase (5. Pill in Tab 8).
          onboarding_konfiguration: einheit.onboarding_konfiguration || null,
          // ✅ Members für Unit-Level RBAC
          members: einheitMembers || [],
        },
        // Hierarchie: Themenfelder → Lernpakete → Lernziele → Aufgaben
        themenfelder: themenfeldWithPakete,
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