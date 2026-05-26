import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;
const WRITE_BATCH_SIZE = 50;

async function filterAllRecords(entity, query, sort = 'created_date') {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, sort, PAGE_SIZE, skip);
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

async function runBatchedOperations(operations, label) {
  const results = [];

  for (const chunk of chunkArray(operations, WRITE_BATCH_SIZE)) {
    const settled = await Promise.allSettled(chunk.map((operation) => operation()));
    results.push(...settled);
  }

  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length > 0) {
    throw new Error(`${label}: ${failed.length} Operation(en) fehlgeschlagen.`);
  }

  return results.map((result) => result.value);
}

/**
 * saveEinheitStruktur
 * ─────────────────────────────────────────────────────────────────
 * Speichert die gesamte Struktur (Themenfelder + Lernpakete) einer Einheit.
 *
 * Hinweis: Das Base44-REST-SDK unterstützt hier keine echte Datenbank-Transaktion.
 * Die Operationen werden deshalb defensiv gebündelt und parallelisiert.
 * @MIGRATION_NOTE (Supabase): Später als eine transaktionale PostgreSQL-RPC umsetzen.
 *
 * Payload:
 * {
 *   einheit_id: string,
 *   spalten: [
 *     { id, titel, themenfeldId (neu oder bestehend) },
 *     ...
 *   ],
 *   paketeMap: {
 *     "spalten-id": [
 *       { id, titel_des_pakets, geschaetzte_dauer_minuten, reihenfolge_nummer, isNew? }
 *     ]
 *   }
 * }
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { einheit_id, spalten, paketeMap, modesMap } = body;

    if (!einheit_id || !spalten || !paketeMap) {
      return Response.json(
        { error: 'Missing required fields: einheit_id, spalten, paketeMap' },
        { status: 400 }
      );
    }

    // ── Structural Lock Pflicht-Prüfung ──────────────────────────────────────
    // KEIN User (auch kein Admin) darf speichern, ohne den expliziten Lock zu halten.
    const einheitRecord = await base44.entities.Einheiten.get(einheit_id).catch(() => null);
    if (!einheitRecord) {
      return Response.json({ error: 'Einheit nicht gefunden oder nicht zugänglich' }, { status: 404 });
    }

    // ── Lifecycle Hard-Lock ────────────────────────────────────────────
    // Final freigegebene oder gerade exportierende Einheiten dürfen
    // strukturell nicht mehr verändert werden. Auch nicht von Admins.
    const lifecycleStatus = einheitRecord.export_lifecycle_status || 'draft';
    if (lifecycleStatus === 'final_freigegeben' || lifecycleStatus === 'export_running') {
      return Response.json(
        {
          error:
            'Die Einheit ist final freigegeben und gesperrt. Die Struktur kann erst nach Aufhebung der Freigabe wieder bearbeitet werden.',
          code: 'EINHEIT_FINAL_LOCKED',
          lifecycleStatus,
        },
        { status: 423 }
      );
    }

    const STRUCT_LOCK_TIMEOUT_MS = 60 * 60 * 1000;
    const lockOwner = einheitRecord.structural_lock;
    const lockAt = einheitRecord.structural_locked_at ? new Date(einheitRecord.structural_locked_at).getTime() : 0;
    const lockExpired = Date.now() - lockAt > STRUCT_LOCK_TIMEOUT_MS;

    if (!lockOwner || lockExpired || lockOwner !== user.email) {
      return Response.json(
        {
          error: 'Strukturbearbeitung verweigert: Sie haben keinen aktiven Structural Lock für diese Einheit.',
          code: 'NO_STRUCTURAL_LOCK',
          currentLockOwner: lockOwner || null,
        },
        { status: 423 }
      );
    }

    // ── Optimistic Locking: version-Feld der Einheit hochzählen ──────────────
    // Hintergrund: acquireDashboardLockSecure nutzt seit April 2026 das
    // `version`-Feld als OCC-Signal. Damit der dortige Re-Read andere
    // Schreibzugriffe nicht ignoriert, MUSS jeder Einheiten-Update-Pfad
    // `version` ebenfalls inkrementieren. Da diese Funktion zusätzlich
    // Themenfelder/Lernpakete schreibt (nicht atomar), ist der Bump hier
    // ein bewusst grobes Signal "Struktur dieser Einheit hat sich verändert".
    //
    // @MIGRATION_NOTE (Supabase): Beim Wechsel auf Postgres wird dieses
    // manuelle Inkrement durch einen BEFORE-UPDATE-Trigger auf der
    // einheiten-Tabelle ersetzt — die App-Logik fällt dann weg.
    const currentEinheitVersion = Number.isFinite(einheitRecord?.version) ? einheitRecord.version : 1;
    await base44.entities.Einheiten.update(einheit_id, {
      version: currentEinheitVersion + 1,
    });

    // ── Schritt 1: Themenfelder speichern/aktualisieren ──────────────────────
    const themenfeldMap = {};
    const newSpalten = spalten.filter((spalte) => !spalte.themenfeldId);
    const existingSpalten = spalten.filter((spalte) => !!spalte.themenfeldId);

    const createdThemenfelder = await runBatchedOperations(
      newSpalten.map((spalte) => {
        const index = spalten.findIndex((item) => item.id === spalte.id);
        const bearbeitungsmodus = modesMap?.[spalte.id] || 'offen';
        return () => base44.entities.Themenfeld.create({
          einheit_id,
          titel: spalte.titel,
          reihenfolge: index + 1,
          bearbeitungsmodus,
        });
      }),
      'Themenfelder erstellen'
    );

    newSpalten.forEach((spalte, index) => {
      themenfeldMap[spalte.id] = createdThemenfelder[index].id;
    });

    await runBatchedOperations(
      existingSpalten.map((spalte) => {
        const index = spalten.findIndex((item) => item.id === spalte.id);
        const bearbeitungsmodus = modesMap?.[spalte.id] || 'offen';
        themenfeldMap[spalte.id] = spalte.themenfeldId;
        return () => base44.entities.Themenfeld.update(spalte.themenfeldId, {
          titel: spalte.titel,
          reihenfolge: index + 1,
          bearbeitungsmodus,
        });
      }),
      'Themenfelder aktualisieren'
    );

    // ── Schritt 2: Lernpakete speichern/aktualisieren ──────────────────────
    const SAMMELBECKEN_ID = '__sammelbecken__';
    const existingPackets = await filterAllRecords(base44.entities.Lernpakete, { einheit_id });
    const processedPacketIds = new Set();
    const createPacketOps = [];
    const updatePacketOps = [];

    for (const [spalteId, pakete] of Object.entries(paketeMap)) {
      const themenfeldId = spalteId === SAMMELBECKEN_ID ? null : themenfeldMap[spalteId];

      for (let i = 0; i < pakete.length; i++) {
        const paket = pakete[i];

        if (paket.isNew) {
          createPacketOps.push(() => base44.entities.Lernpakete.create({
            einheit_id,
            themenfeld_id: themenfeldId,
            titel_des_pakets: paket.titel_des_pakets,
            geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten || 45,
            reihenfolge_nummer: i + 1,
          }));
        } else {
          processedPacketIds.add(paket.id);
          updatePacketOps.push(() => base44.entities.Lernpakete.update(paket.id, {
            themenfeld_id: themenfeldId,
            reihenfolge_nummer: i + 1,
          }));
        }
      }
    }

    await runBatchedOperations(createPacketOps, 'Lernpakete erstellen');
    await runBatchedOperations(updatePacketOps, 'Lernpakete aktualisieren');

    // ── Schritt 3: Gelöschte Pakete löschen ──────────────────────────────────
    const deletePacketOps = existingPackets
      .filter((packet) => !processedPacketIds.has(packet.id))
      .map((packet) => () => base44.entities.Lernpakete.delete(packet.id));

    await runBatchedOperations(deletePacketOps, 'Lernpakete löschen');

    return Response.json({
      success: true,
      message: 'Struktur erfolgreich gespeichert',
      themenfeldMap,
    });
  } catch (error) {
    console.error('Error saving structure:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});