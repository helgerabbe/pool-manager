import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * saveEinheitStruktur
 * ─────────────────────────────────────────────────────────────────
 * Speichert die gesamte Struktur (Themenfelder + Lernpakete) einer Einheit
 * in einer Transaktion.
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

    const body = await req.json();
    const { einheit_id, spalten, paketeMap, modesMap } = body;

    if (!einheit_id || !spalten || !paketeMap) {
      return Response.json(
        { error: 'Missing required fields: einheit_id, spalten, paketeMap' },
        { status: 400 }
      );
    }

    // ── Structural Lock Pflicht-Prüfung ──────────────────────────────────────
    // KEIN User (auch kein Admin) darf speichern, ohne den expliziten Lock zu halten.
    const einheitRecords = await base44.asServiceRole.entities.Einheiten.filter({ id: einheit_id });
    const einheitRecord = einheitRecords[0];
    if (!einheitRecord) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
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
    await base44.asServiceRole.entities.Einheiten.update(einheit_id, {
      version: currentEinheitVersion + 1,
    });

    // ── Schritt 1: Themenfelder speichern/aktualisieren ──────────────────────
    const themenfeldMap = {};

    for (let i = 0; i < spalten.length; i++) {
      const spalte = spalten[i];
      let themenfeldId = spalte.themenfeldId;
      const bearbeitungsmodus = modesMap?.[spalte.id] || 'offen';

      if (!themenfeldId) {
        // Neues Themenfeld erstellen
        const newTf = await base44.entities.Themenfeld.create({
          einheit_id,
          titel: spalte.titel,
          reihenfolge: i + 1,
          bearbeitungsmodus,
        });
        themenfeldId = newTf.id;
      } else {
        // Bestehendes Themenfeld aktualisieren
        await base44.entities.Themenfeld.update(themenfeldId, {
          titel: spalte.titel,
          reihenfolge: i + 1,
          bearbeitungsmodus,
        });
      }

      themenfeldMap[spalte.id] = themenfeldId;
    }

    // ── Schritt 2: Lernpakete speichern/aktualisieren ──────────────────────
    const SAMMELBECKEN_ID = '__sammelbecken__';
    const existingPackets = await base44.entities.Lernpakete.filter({
      einheit_id,
    });

    const processedPacketIds = new Set();

    for (const [spalteId, pakete] of Object.entries(paketeMap)) {
      const themenfeldId =
        spalteId === SAMMELBECKEN_ID ? null : themenfeldMap[spalteId];

      for (let i = 0; i < pakete.length; i++) {
        const paket = pakete[i];
        processedPacketIds.add(paket.id);

        if (paket.isNew) {
          // Neues Lernpaket erstellen
          await base44.entities.Lernpakete.create({
            einheit_id,
            themenfeld_id: themenfeldId,
            titel_des_pakets: paket.titel_des_pakets,
            geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten || 45,
            reihenfolge_nummer: i + 1,
          });
        } else {
          // Bestehendes Lernpaket aktualisieren
          await base44.entities.Lernpakete.update(paket.id, {
            themenfeld_id: themenfeldId,
            reihenfolge_nummer: i + 1,
          });
        }
      }
    }

    // ── Schritt 3: Gelöschte Pakete löschen ──────────────────────────────────
    for (const packet of existingPackets) {
      if (!processedPacketIds.has(packet.id)) {
        await base44.entities.Lernpakete.delete(packet.id);
      }
    }

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